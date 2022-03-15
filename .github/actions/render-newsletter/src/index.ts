import * as fs from 'fs';
import * as path from 'path';
import { EOL } from 'os';
import { promisify } from 'util';
import * as gm from 'gray-matter';
import * as hb from 'handlebars';
import * as marked from 'marked';
import * as yaml from 'js-yaml';
import fetch from 'node-fetch';

import * as SG from './sendgrid';

import { setTime, parseTimeSpec, TimeSpec } from './util';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);


function escapeData(s: string): string {
  return s
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A')
}

function setOutput(key: string, val: string) {
  process.stdout.write(`::set-output name=${key}::${escapeData(val)}${EOL}`);
}

async function postToSlack(slackUrl: string, url: string) {
  await fetch(slackUrl, {
    method: 'POST',
    headers: {
      'Content-type': 'application/json',
    },
    body: JSON.stringify({
      text: "SendGrid single send created for newsletter",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Newsletter: <${url}|Single Send> created.`
          }
        }
      ]
    })
  });
}

type Options = {
  apiKey?: string,
  filePath: string,
  output?: string,
  template?: string,
  context?: any,
  listId?: string,
  senderId?: number,
  suppressionGroupId?: number,
  siteYaml?: string,
  subject?: string,
  slackUrl?: string,
  index?: SG.SingleSendIndex,
  sendAt?: TimeSpec,
};

async function loadTemplate(path?: string, options?: CompileOptions) {
  const data = path ? await readFile(path) : '{{{ content }}}';
  return hb.compile(data.toString(), options);
}

function splitTitleFromName(basename: string) {
  const m = basename.match(/^([^.]*)/);

  return [m[0], basename.slice(m[0].length)];
}

type PathContext = ReturnType<typeof contextFromPath>;
function contextFromPath(filepath: string) {
  const basename = path.basename(filepath);
  const [title, ext] = splitTitleFromName(basename);
  const m = title.match(/(\d{4})-(\d\d?)-(\d\d?)-/);

  const slug = m ? title.slice(m.index + m[0].length) : title;
  const date = m ?
    new Date(parseInt(m[1]), parseInt(m[2])-1, parseInt(m[3]))
    : new Date();

  return {
    title,
    slug,
    ext,
    basename,
    date,
    year: date.getFullYear(),
    month: date.getMonth()+1,
    day: date.getDate(),
  };
}

function postUrl(post: PathContext, site: any) {
  const siteUrl = site.url;
  const basePath = site.baseurl ?? '';
  const m = `${post.month}`.padStart(2, '0');
  const d = `${post.day}`.padStart(2, '0');

  return `${siteUrl}${basePath}/${post.year}/${m}/${d}/${post.slug}.html`;
}

type PostContext = PathContext &
  { url: string } &
  { [k in string]: any };

function postContext(data: any, path: string, site?: any) {
  const post = contextFromPath(path);

  return Object.assign({ url: site ? postUrl(post, site) : '' },
                       post, data) as PostContext;
}

type TemplateContext = {
  content: string,
  post: PostContext,
  site: { [k in string]: any },
} & { [k in string]: any };

async function siteContext(path?: string): Promise<{ [k in string]: any }> {
  if (!path)
    return {};

  const contents = await readFile(path);
  return await yaml.load(contents.toString());
}

async function render(opts: Options) {
  const pFile = readFile(opts.filePath);
  const pTemplate = loadTemplate(opts.template);
  const site = await siteContext(opts.siteYaml);

  // if ()

  const raw = await pFile;
  const { content, data } = gm(raw.toString('utf8'));

  const rendered = marked(content, {
    headerPrefix: 'heading-',
    gfm: true,
  });

  const template = await pTemplate;
  const context: TemplateContext = Object.assign({
    content: rendered,
    post: postContext(data, opts.filePath, site),
    site,
  }, opts.context);
  const text = template(context);

  return {
    text,
    context
  };
}

const dateStr =
  (d: Date | string) => ((typeof d === 'string' ? d : d.toISOString()).split('T', 1)[0]);

const getSendDate = (c: TemplateContext, timeSpec?: TimeSpec) =>
  setTime(c.post.date, timeSpec);


function singleSendId(context: TemplateContext, index?: SG.SingleSendIndex) {
  if (!index)
    return undefined;

  const date = dateStr(context.post.date);

  for (const ss of Object.values(index.byId)) {
    if (dateStr(ss.send_at) === date)
      return ss.id;

    if (ss.name.includes(context.post.title))
      return ss.id;
  }
}

async function run(options: Options) {
  const { text, context } = await render(options);

  if (options.output) {
    await writeFile(options.output, text);
  } else if (options.apiKey) {
    const sendAt = getSendDate(context, options.sendAt);
    const id = singleSendId(context, options.index);

    if (id)
      console.log(`Updating existing Single Send ${id}`);

    const response = await SG.singleSend({
      html: text,
      listId: options.listId,
      suppressionGroup: options.suppressionGroupId,
      token: options.apiKey,
      sendAt,
      subject: (options.subject ?? '%s').replace('%s', context.post.title),
      categories: ['newsletter'],
      id,
      senderId: options.senderId,
    });

    const url = response.headers.get('location');

    if (response.ok) {
      const ssend: SG.ScheduledSend = await response.json();
      console.log('Single send created', ssend);

      if (ssend.status === 'draft') {
        console.log('Scheduling');
        await SG.scheduleSingleSend({
          id: ssend.id,
          sendAt,
          token: options.apiKey,
        });
      }

      setOutput('send_date', sendAt.toISOString());
      setOutput('single_send_url', url);

      return {
        sendAt,
        url
      };
    } else {
      console.error(response.status, response.statusText, response.headers, await response.text());
      throw new Error('Could not create newsletter');
    }
  } else {
    console.log(text);
  }
}

type PathFilter = (path: string) => boolean;
type RunOptions = Omit<Options, 'filePath'> & {
  source: { file: string } | { dir: string },
  filter?: PathFilter,
};


/**
 * @param timeSpec Set the time on the date parsed from the file name
 */
function dateFilter(after: number, timeSpec?: TimeSpec) {
  return (path: string) => {
    const ctx = contextFromPath(path);
    return setTime(ctx.date, timeSpec).getTime() >= after;
  };
}

async function toFileList(source: RunOptions['source'], filter?: PathFilter) {
  if ('file' in source)
    return [source.file];

  const paths = await readdir(source.dir)
    .then(names => names.map(n => path.join(source.dir, n)));

  return filter ?
    paths.filter(filter) : paths;
}

async function runAll(options: RunOptions) {
  const posts = await toFileList(options.source, options.filter);
  const urls: string[] = [];
  const promises: Promise<any>[] = [];

  if (!posts.length) {
    console.log('No posts to send.');
    return;
  }

  const index = await SG.indexSingleSends({ token: options.apiKey });

  for (const post of posts) {
    const result = await run({
      ...options,
      filePath: post,
      index,
    });

    if (result?.url && options.slackUrl) {
      promises.push(postToSlack(options.slackUrl, result.url));
    }
    urls.push(result.url);
  }

  await Promise.all(urls);
}

async function runAction() {
  const {
    INPUT_SENDGRID_LIST_ID: listId,
    INPUT_SENDGRID_API_KEY: apiKey,
    INPUT_SENDGRID_SENDER_ID: senderId,

    INPUT_TEMPLATE_PATH: template,
    INPUT_TEXT_PATH: path,
    INPUT_CONTEXT: context,
    INPUT_OUT_PATH: outPath,
    INPUT_SUPPRESSION_GROUP_ID: suppressionGroupId,
    INPUT_SITE_YAML: siteYaml,
    INPUT_SUBJECT_FORMAT: subject = '%s',
    INPUT_POSTS_DIR: postsDir,
    INPUT_SLACK_URL: slackUrl,
    INPUT_AFTER_DATE: today,
    INPUT_SEND_AT: sendAtRaw,
  } = process.env;

  if (!(path || postsDir)) {
    console.error(
      'Either INPUT_TEXT_PATH or INPUT_POSTS_DIR must be non-empty'
    );
    process.exit(1);
  }

  const timeSpec = parseTimeSpec(sendAtRaw);

  await runAll({
    apiKey,
    source: path ? { file: path } : { dir: postsDir },
    template,
    output: outPath,
    context: context ? JSON.parse(context) : {},
    listId: listId,
    senderId: senderId ? parseInt(senderId) : undefined,
    suppressionGroupId: suppressionGroupId ? parseInt(suppressionGroupId) : undefined,
    siteYaml,
    subject,
    slackUrl,
    // Filter out posts from before this date.
    filter: dateFilter(today ? new Date(today).getTime() : Date.now(), timeSpec),
    sendAt: timeSpec,
  });
}

async function testRun() {
  process.env['INPUT_SENDGRID_LIST_ID'] =  "559adb5e-7164-4ac8-bbb5-1398d4ff0df9";
  // process.env['INPUT_SENDGRID_API_KEY'] = apiKey;
  // process.env['INPUT_TEXT_PATH'] = __dirname + '/../../../../_posts/2021-11-16-communications-lead.md';
  process.env['INPUT_POSTS_DIR'] = __dirname + '/../../../../_posts';
  process.env['INPUT_TEMPLATE_PATH'] = __dirname + '/../../../workflows/newsletter_template.html';
  process.env['INPUT_CONTEXT'] = `{}`;
  process.env['INPUT_SUPPRESSION_GROUP_ID'] = '17889';
  process.env['INPUT_SITE_YAML'] = __dirname + '/../../../../_config.yml';
  process.env['INPUT_SEND_AT'] = '10:00-0500';


  await runAction();
}


if (process.env['NODE_ENV'] === 'test')
  testRun();
else
  runAction();


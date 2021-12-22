import * as fs from 'fs';
import * as path from 'path';
import { EOL } from 'os';
import { promisify } from 'util';
import * as gm from 'gray-matter';
import * as hb from 'handlebars';
import * as marked from 'marked';
import * as yaml from 'js-yaml';
import fetch from 'node-fetch';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);


function escapeData(s: string): string {
  return s
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A')
}

function setOutput(key: string, val: string) {
  process.stdout.write(`::set-output name=${key}::${escapeData(val)}${EOL}`);
}

const API_BASE = 'https://api.sendgrid.com/v3';
type SingleSendParams = {
  html: string,
  listId: string,
  suppressionGroup: number,
  token: string,
  sendAt?: Date,
  subject: string,
};
async function singleSend(params: SingleSendParams) {
  return await fetch(`${API_BASE}/marketing/singlesends`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${params.token}`,
      'Content-type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Test Send',
      send_at: params.sendAt?.toISOString(),
      send_to: {
        list_ids: [params.listId]
      },
      email_config: {
        subject: params.subject,
        html_content: params.html,
        suppression_group_id: params.suppressionGroup
      }
    })
  });
}


type Options = {
  apiKey?: string,
  path: string,
  output?: string,
  template?: string,
  context?: any,
  listId?: string,
  suppressionGroupId?: number,
  siteYaml?: string,
  subject?: string,
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

  return `${siteUrl}${basePath}/${post.year}/${post.month}/${post.day}/${post.slug}.html`;
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
  const pFile = readFile(opts.path);
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
    post: postContext(data, opts.path, site),
    site,
  }, opts.context);
  const text = template(context);

  return {
    text,
    context
  };
}

function getSendDate(c: TemplateContext) {
  let date = c.post.date;
  if (date.getTime() <= Date.now()) {
    const today = new Date();
    date = new Date(today.getFullYear(),
                    today.getMonth(),
                    today.getDate()+1);
  }

  date.setHours(15);
  return date;
}

async function run(options: Options) {
  const { text, context } = await render(options);
  // console.log(context);

  if (options.output) {
    await writeFile(options.output, text);
  } else if (options.apiKey) {
    const sendAt = getSendDate(context);
    const response = await singleSend({
      html: text,
      listId: options.listId,
      suppressionGroup: options.suppressionGroupId,
      token: options.apiKey,
      sendAt,
      subject: (options.subject ?? '%s').replace('%s', context.post.title),
    });

    const url = response.headers.get('location');
    console.log(response.status, response.statusText, response.headers, await response.text());

    setOutput('send_date', sendAt.toISOString());
    setOutput('single_send_url', url);
  } else {
    console.log(text);
  }
}

async function runAction() {
  const {
    INPUT_SENDGRID_LIST_ID: listId,
    INPUT_SENDGRID_API_KEY: apiKey,
    INPUT_TEMPLATE_PATH: template,
    INPUT_TEXT_PATH: path,
    INPUT_CONTEXT: context,
    INPUT_OUT_PATH: outPath,
    INPUT_SUPPRESSION_GROUP_ID: suppressionGroupId,
    INPUT_SITE_YAML: siteYaml,
    INPUT_SUBJECT_FORMAT: subject = '%s',
  } = process.env;

  if (!path) {
    console.error(
      'Missing required environment variable INPUT_TEXT_PATH'
    );
    process.exit(1);
  }

  await run({
    apiKey,
    path,
    template,
    output: outPath,
    context: context ? JSON.parse(context) : {},
    listId: listId,
    suppressionGroupId: suppressionGroupId ? parseInt(suppressionGroupId) : undefined,
    siteYaml,
    subject,
  });
}

async function testRun() {
  process.env['INPUT_SENDGRID_LIST_ID'] =  "559adb5e-7164-4ac8-bbb5-1398d4ff0df9";
  // process.env['INPUT_SENDGRID_API_KEY'] = apiKey;
  process.env['INPUT_TEXT_PATH'] = __dirname + '/../../../../_posts/2021-11-16-communications-lead.md';
  process.env['INPUT_TEMPLATE_PATH'] = __dirname + '/../../../workflows/newsletter_template.html';
  process.env['INPUT_CONTEXT'] = `{}`;
  process.env['INPUT_SUPPRESSION_GROUP_ID'] = '17889';
  process.env['INPUT_SITE_YAML'] = __dirname + '/../../../../_config.yml';

  await runAction();
}

runAction();

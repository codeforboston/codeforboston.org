import fetch from 'node-fetch';

export type ScheduledSend = {
  id: string,
  name: string,
  status: string,
  categories: string[],
  send_at: string,
  created_at: string,
  updated_at: string,
  is_abtest: boolean,
};

const API_BASE = 'https://api.sendgrid.com/v3';
type SingleSendParams = {
  html: string,
  listId: string,
  suppressionGroup: number,
  token: string,
  sendAt?: Date,
  subject: string,
  categories?: string[],
  id?: string,
};
export async function singleSend(params: SingleSendParams) {
  const url = `${API_BASE}/marketing/singlesends` +
    (params.id ? `/${params.id}` : '');
  return await fetch(url, {
    method: params.id ? 'PATCH' : 'POST',
    headers: {
      'Authorization': `Bearer ${params.token}`,
      'Content-type': 'application/json',
    },
    body: JSON.stringify({
      name: `Newsletter: ${params.subject}`,
      send_at: params.sendAt?.toISOString(),
      send_to: {
        list_ids: [params.listId]
      },
      categories: params.categories,
      email_config: {
        subject: params.subject,
        html_content: params.html,
        suppression_group_id: params.suppressionGroup
      }
    })
  });
}

type GetSingleSendsParams = {
  token: string,
};

export async function *getSingleSends(params: GetSingleSendsParams) {
  let url = `${API_BASE}/marketing/singlesends/search`;
  while (url) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${params.token}`,
        'Content-type': 'application/json',
      },
      body: JSON.stringify({
        status: ['scheduled', 'draft'],
        // categories: ['newsletter']
      })
    });

    const { result, _metadata: meta } = await response.json();
    yield *(result as ScheduledSend[]);
    url = meta.next;
  }
}

export type SingleSendIndex = {
  byId: Record<string, ScheduledSend>,
  byName: Record<string, string>,
  byDate: Record<string, string[]>,
}
export async function indexSingleSends(params: GetSingleSendsParams) {
  const idx: SingleSendIndex = { byId: {}, byName: {}, byDate: {}, };

  for await (const ss of getSingleSends(params)) {
    const { id } = ss;

    idx.byId[id] = ss;
    idx.byName[ss.name] = id;

    const date = ss.send_at.split('T', 1)[0];
    if (!idx.byDate[date])
      idx.byDate[date] = [];
    idx.byDate[date].push(id);
  }

  return idx;
}

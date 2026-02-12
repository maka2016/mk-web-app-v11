import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import * as querystring from 'querystring';

function getQueryParams(url: string): Record<string, string> {
  const queryIndex = url.indexOf('?');
  if (queryIndex === -1) {
    return {};
  }

  const queryString = url.slice(queryIndex + 1);
  return querystring.parse(queryString) as Record<string, string>;
}

export default async function Page() {
  const head = await headers();
  const referer = head.get('referer') || '';
  const queryObj = getQueryParams(referer);
  const appid = queryObj.appid || '';

  switch (appid) {
    case 'education':
    case 'xueji':
      redirect('/home-pages/xueji/index.html');
    case 'maka':
      redirect('/maka/mobile/home');
    case 'jiantie':
    default:
      redirect('/mobile/home');
  }
}

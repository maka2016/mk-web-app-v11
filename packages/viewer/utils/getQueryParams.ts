import * as querystring from 'querystring';

export function getQueryParams(url: string): Record<string, string> {
  const queryIndex = url.indexOf('?');
  if (queryIndex === -1) {
    return {};
  }

  const queryString = url.slice(queryIndex + 1);
  return querystring.parse(queryString) as Record<string, string>;
}

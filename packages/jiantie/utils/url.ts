export type IObject<T = any> = Record<string, T>;

/**
 * 查询参数转对象
 */
export const queryToObj = (str?: string): IObject => {
  let url = str || (typeof window !== 'undefined' ? window.location.href : '');
  url = url.split('#')[0];
  const result: IObject = {};
  if (url.includes('?')) {
    const urlSplit = url.split('?');
    const len = urlSplit.length - 1;
    const queryParam = urlSplit[len] || '';
    queryParam
      .split('&')
      .filter(str => str !== '')
      .forEach(str => {
        const [key, value] = str.split('=');
        result[key] = value;
      });
    return result;
  }
  return result;
};

/**
 * 对象转url查询参数字符串
 */
export const objToQuery = (obj: Record<string, any>) => {
  const result: string[] = [];
  Object.entries(obj).forEach(entries => {
    const [key, value] = entries;
    const value_ = value as string;
    result.push(`${key}=${encodeURIComponent(value_)}`);
  });
  return result.join('&');
};

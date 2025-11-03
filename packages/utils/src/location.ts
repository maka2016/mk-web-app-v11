export interface WrapUrlParamsOptions {
  url?: string;
  params?: Record<string, any>;
  toBase64?: boolean;
}

/**
 * 把 base64 字符串转成普通字符串
 *
 * @export
 * @param {string} str base64 字符串
 * @returns {string} 普通字符串
 */
export function fromBase64Str(str: string) {
  try {
    return decodeURIComponent(escape(atob(str)));
  } catch (e) {
    return str;
  }
}

/**
 * 判断是否有值，如果为 0 则返回 true，其他按照 js 的解析逻辑返回
 */
export function HasValue(val: any): boolean {
  if (val === 0) return true;
  return !!val;
}

type UrlParamsRes = Record<string, any>;

interface GetUrlParamsOptions {
  /** 需要获取的 key */
  target?: string;
  /** 解析的 href，默认是 localhost.href */
  href?: string;
  /** 是否需要从 base64 格式转换 */
  fromBase64?: boolean;
}

/**
 * 解析并获取浏览器路由的参数
 * @returns {string} 返回获取的结果
 */
export function getUrlSearchParams(options?: GetUrlParamsOptions) {
  const { target, href, fromBase64 } = options || {};
  const _href = href || (window ? window.location.href : '');
  if (!_href) {
    return {};
  }

  const searchs = _href.split('?')[1];
  const resultObj: UrlParamsRes = {};
  if (searchs) {
    const params = searchs.split(/&/);
    // let parentKey: string | null = null
    params.forEach(item => {
      // eslint-disable-next-line prefer-const
      let [key, val] = item.split('=');
      if (!key) return;
      if (fromBase64) val = fromBase64Str(val);
      // if (val === undefined && parentKey) {
      //   resultObj[parentKey] = `${resultObj[parentKey]}&${key}`
      //   parentKey = null
      //   return
      // }
      // parentKey = key
      resultObj[key] = val;
    });
  }
  if (target) {
    return resultObj[target];
  }
  return resultObj;
}

export function hasUrlParam(key: string) {
  const queryParams = getUrlSearchParams();
  return key in queryParams;
  // return has(queryParams, key)
}

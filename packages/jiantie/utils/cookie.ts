export const getCookie = (key: string) => {
  if (typeof window === 'undefined') {
    return '';
  }
  const reKey = new RegExp(`(?:^|; )${key}(?:=([^;]*))?(?:;|$)`);
  const match = reKey.exec(document.cookie);
  return match ? match[1] : null;
};

export const setCookie = (key: string, val: string) => {
  if (typeof window === 'undefined') {
    return `服务器不支持cookie`;
  }
  const expires = new Date(Date.now() + 86400 * 1000).toUTCString();
  document.cookie = `${key}=${val}; expires=${expires};path=/;`;
};

/**
 *
 * @param key key
 * @param val 值
 * @param expire 过期时间毫秒
 */
export const setCookieExpire = (
  key: string,
  val: string,
  expire = 365 * 24 * 60 * 60 * 1000
) => {
  if (typeof window === 'undefined') {
    return `服务器不支持cookie`;
  }
  const exp = new Date();
  exp.setTime(exp.getTime() + expire);
  document.cookie = `${key}=${val}; expires=${exp.toUTCString()};path=/`;
};
export const delCookie = (key: string) => {
  if (typeof window === 'undefined') {
    return;
  }
  document.cookie = `${key}=;expires=${new Date(0).toUTCString()}`;
  document.cookie = `${key}=;expires=${new Date(0).toUTCString()};path=/`;
  document.cookie = `${key}=;expires=${new Date(0).toUTCString()};path=/;domain=.maka.im`;
  document.cookie = `${key}=;expires=${new Date(0).toUTCString()};path=/;domain=${window.location.host}`;
};

export const removeCookie = delCookie;

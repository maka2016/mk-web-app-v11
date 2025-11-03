import { getCookie, queryToObj } from '@mk/utils';

export const getAppId = () => {
  const params = queryToObj();
  if (params && params.appid) {
    return params.appid;
  }
  return process.env.APP_ID || '';
};

export const getToken2 = () => {
  const params = queryToObj();
  if (params && params.token) {
    return params.token;
  }

  const appid = getAppId();
  const key = `${appid}_token`;
  const sessionToken = getCookie(key);
  if (sessionToken) {
    return sessionToken;
  }

  return '';
};

export const getUid2 = () => {
  const params = queryToObj();
  if (params && params.uid) {
    return params.uid;
  }

  const appid = getAppId();
  const key = `${appid}_uid`;

  const sessionUid = getCookie(key);
  if (sessionUid) {
    return sessionUid;
  }

  return '';
};

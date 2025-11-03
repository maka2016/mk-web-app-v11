import axios, { AxiosRequestConfig } from 'axios';
import { getCookie, isIOS, isAndroid, isPc } from '@mk/utils';
import { getPermissionData } from './permission-helper';
import { getToken2, getUid2 } from './env';

export const getToken = () => {
  const params = getPermissionData();
  const token2 = getToken2();
  if (token2) {
    return token2;
  }
  if (params && params.token) {
    return params.token;
  }
  const sessionToken = sessionStorage.getItem('editor_token');
  if (sessionToken) {
    return sessionToken;
  }
  const cookieToken = getCookie('token');
  if (cookieToken) {
    return cookieToken;
  }
  if (params.logMode) {
    console.error(
      '环境中找不到 token，可以通过 sessionStorage.editor_token 或者 url 的 token=xx 来设置'
    );
  }
  return '';
};

const requestInstance = axios.create({
  timeout: 15000,
});

const requestInstance2 = axios.create({
  timeout: 15000,
});

export const getUid = () => {
  const pData = getPermissionData();
  return (
    getUid2() ||
    pData.uid ||
    sessionStorage.getItem('editor_uid') ||
    sessionStorage.getItem('Makauid') ||
    getCookie('Makauid') ||
    ''
  );
};

export const getRequestCommonConfig = (config: any) => {
  if (typeof window === 'undefined') {
    return config;
  }
  let device = 'wap';
  if (isIOS()) {
    device = 'ios';
  } else if (isAndroid()) {
    device = 'android';
  } else if (isPc()) {
    device = 'web';
  }
  const header = { ...config.headers };
  config.headers = {
    token: getToken(),
    uid: getUid(),
    device,
    ...header,
  };
  return config;
};

requestInstance.interceptors.request.use(config => {
  return getRequestCommonConfig(config);
});

requestInstance.interceptors.response.use(response => {
  const { data } = response;
  return data;
});

requestInstance2.interceptors.request.use(config => {
  return getRequestCommonConfig(config);
});

export interface IResponse<T> {
  code: number;
  msg: string;
  data: T;
}

export const setBaseUrl = (baseURL: string) => {
  if (baseURL) {
    requestInstance.defaults.baseURL = baseURL;
  }
};

export const request = requestInstance;

export const request2 = requestInstance2;

export default requestInstance;

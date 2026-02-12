import Loggerv7 from '@/services/loggerv7';
import APPBridge from '@/store/app-bridge';
import { getCookie, isMakaAppAndroid, isMakaAppIOS, isPc, queryToObj } from '@/utils';
import axios, { AxiosError, AxiosResponse } from 'axios';
import toast from 'react-hot-toast';

export const delCookie = (key: string): any => {
  if (typeof window === 'undefined') {
    return `服务器不支持cookie`;
  }
  document.cookie = `${key}=;expires=${new Date(0).toUTCString()};path=/`;
  document.cookie = `${key}=;expires=${new Date(0).toUTCString()}`;
};

export const getAppId = () => {
  const params = queryToObj();
  if (params && params.appid) {
    return params.appid;
  }
  return process.env.APP_ID || '';
};

export const getToken = () => {
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

export const getUid = () => {
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

export const getOpenId = () => {
  const params = queryToObj();
  if (params && params.open_id) {
    return params.open_id;
  }
  const appid = getAppId();
  return getCookie(`${appid}_openid`);
};

export const getLocale = () => {
  const params = queryToObj();
  if (params && params.lang) {
    return params.lang;
  }

  const sessionLocale = getCookie('NEXT_LOCALE');
  if (sessionLocale) {
    return sessionLocale;
  }

  return 'zh-CN';
};

export const getIsOverSeas = () => {
  const params = queryToObj();
  if (params && params.is_overseas) {
    return params.is_overseas === '1';
  }

  const sessionArea = getCookie('IS_OVERSEAS');
  if (sessionArea) {
    return sessionArea === '1';
  }

  return getAppId() === 'makaai';
};

export const clearUserCookie = () => {
  const appid = getAppId();

  delCookie(`${appid}_uid`);
  delCookie(`${appid}_token`);
};

// 检查uid和token是否正确
export function checkToken(response: AxiosResponse) {
  // if (response.data && response.data.code === 10005) {
  //   // 用户名或密码错误
  //   return false
  // }
  // console.log(response.data)
  if (
    response.data &&
    response.data.code === 0 &&
    response.data.success === false &&
    response.data.message === 'tokenError'
  ) {
    // token 错误
    return false;
  }
  if (response.data.error === 'tokenError') {
    return false;
  }
  return true;
}

const requestInstance = axios.create({
  baseURL: '',
  timeout: 15000,
});

export const getPlatform = () => {
  if (isPc()) {
    return 'web';
  } else if (isMakaAppAndroid()) {
    return 'android';
  } else if (isMakaAppIOS()) {
    return 'ios';
  } else {
    return 'wap';
  }
};

requestInstance.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    config.headers = Object.assign(config.headers, {
      token: getToken(),
      uid: getUid(),
      device: getPlatform(),
      version: '7.0.0',
      distinct_id: Loggerv7.getTraceInfo()?.distinct_id ?? '',
      distinctId: Loggerv7.getTraceInfo()?.distinct_id ?? '',
      appid: getAppId(),
      'accept-language': getLocale(),
      ...config.headers,
    });
  }

  return config;
});

requestInstance.interceptors.response.use(
  response => {
    const { data } = response;
    if (!checkToken(response)) {
      // 清除cookie, 刷新页面
      toast.error('用户状态过期，请重新登录!');
      clearUserCookie();
      if (APPBridge.judgeIsInApp()) {
        APPBridge.appCall({
          type: 'MKLogOut',
          jsCbFnName: '', // 回传方法 Json值：
        });
      } else {
        import('@/store').then(({ useStore }) => {
          const { setLoginShow } = useStore();
          setLoginShow(true);
        });
      }
      // location.reload()
      return false;
    }
    return data;
  },
  (error: AxiosError) => {
    console.error('request_v1_error', error);
    const rawMsg = error.message;
    error.message = (error?.response?.data as any)?.message || rawMsg;
    // import("react-hot-toast").then(({ toast }) => {
    //   toast.error(error.message);
    // });
    throw error;
  }
);

export const request = requestInstance;

export default requestInstance;

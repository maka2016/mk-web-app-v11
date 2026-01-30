import Loggerv7 from '@/services/loggerv7';
import APPBridge from '@/store/app-bridge';
import { getCookie, isMakaAppAndroid, isMakaAppIOS, isPc, queryToObj, setCookie } from '@/utils';
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import toast from 'react-hot-toast';

/**
 * 从当前域名提取根域名（如从 web.xx.com 提取 xx.com）
 */
const getRootDomain = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const hostname = window.location.hostname;

  // 处理本地开发环境（localhost, 127.0.0.1 等）
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
    return null;
  }

  // 处理 IP 地址
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return null;
  }

  // 提取根域名：取最后两部分（如 web.xx.com -> xx.com）
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }

  return null;
};

export const delCookie = (key: string): any => {
  if (typeof window === 'undefined') {
    return `服务器不支持cookie`;
  }

  // 删除当前域的 cookie（path=/）
  document.cookie = `${key}=;expires=${new Date(0).toUTCString()};path=/`;

  // 删除当前域的 cookie（无 path）
  document.cookie = `${key}=;expires=${new Date(0).toUTCString()}`;

  // 尝试删除根域的 cookie（如 .xx.com）
  const rootDomain = getRootDomain();
  if (rootDomain) {
    // 删除根域的 cookie（path=/）
    document.cookie = `${key}=;expires=${new Date(0).toUTCString()};path=/;domain=.${rootDomain}`;

    // 删除根域的 cookie（无 path）
    document.cookie = `${key}=;expires=${new Date(0).toUTCString()};domain=.${rootDomain}`;
  }
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

  const tokenLegacy = sessionStorage.getItem('editor_token') || getCookie('token');
  if (tokenLegacy) {
    return tokenLegacy;
  }

  return '';
};

export const getUid = () => {
  if (typeof window === 'undefined') {
    return '';
  }
  initMiniPUserInfoFromUrl();
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

  const uidLegacy = sessionStorage.getItem('editor_uid') || sessionStorage.getItem('Makauid') || getCookie('Makauid');

  if (uidLegacy) {
    return uidLegacy;
  }

  return '';
};

export const initMiniPUserInfoFromUrl = () => {
  if (!APPBridge.judgeIsInMiniP()) {
    return;
  }

  const params = queryToObj();
  const { uid, token } = params;
  const appid = getAppId();

  if (uid && token) {
    const uidKey = `${appid}_uid`;
    const tokenKey = `${appid}_token`;
    setCookie(uidKey, uid);
    setCookie(tokenKey, token);
    console.log('initMiniPUserInfoFromUrl sucsss', params);
  }
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
  console.log('sessionLocale', sessionLocale);
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

  const appid = getAppId();
  return appid === 'makaai' || appid === 'avite' || appid === 'jasti';
};

export const clearUserCookie = () => {
  const appid = getAppId();

  delCookie(`${appid}_uid`);
  delCookie(`${appid}_token`);
  delCookie(`Makauid`);
  delCookie(`editor_uid`);
  delCookie(`editor_token`);
  delCookie(`token`);
  delCookie(`uid`);
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

// 自定义类型：拦截器返回 data 而不是 AxiosResponse
// 注意：当 token 验证失败时，拦截器会返回 false，但通常此时会触发登录流程
interface CustomAxiosInstance extends Omit<AxiosInstance, 'get' | 'post' | 'put' | 'delete' | 'patch' | 'request'> {
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T = any>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  put<T = any>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
  patch<T = any>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  request<T = any>(config: AxiosRequestConfig): Promise<T>;
}

const requestInstance = axios.create({
  baseURL: '',
  timeout: 15000,
}) as unknown as CustomAxiosInstance;

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

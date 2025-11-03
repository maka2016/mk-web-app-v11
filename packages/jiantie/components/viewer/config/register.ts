import {
  EnvConfig,
  APIMapping,
  APIEnvMapping,
  envFilter,
  API,
} from '@mk/services';
import { getUrlSearchParams } from '@mk/utils';
import { setBaseUrl } from '@mk/services';

// interface EnvConfigItem {
//     api: string
//     widgetApi: string
// }
/** 设置 base url */
setBaseUrl(API('根域名'));

interface IEnvConfig {
  /** 配置的版本 */
  _version: number;
  /** 离线开发时使用 */
  _offline: boolean;
  /** 是否开发模式 */
  _on: boolean;
  /** 应用版本号 */
  appVersion: string;
  /** 构建时间 */
  buildTime: string;
  /** 环境配置 */
  env: APIEnvMapping;
  /** 当前环境 */
  currEnv: string;
}

interface IAppConfig extends IEnvConfig {
  currEnv: string;
  currEnvConfig: APIMapping;
}

declare global {
  interface Window {
    /** 环境配置 */
    $EnvConfig: IEnvConfig;
    /** 应用运行时的配置 */
    $AppConfig: IAppConfig;
    /** API 配置 */
    $API: APIMapping;
    /** 数据转换器 */
    DATA_CONVERT: {
      default: any;
    };
    CORE_VENDOR: {
      React: any;
      ReactDOM: any;
      Axios: any;
    };
    $Shell: any;
    $PosterInfo: any;
  }
}

/**
 * 设置应用配置
 */
export function initAppConfig(env: string) {
  const defaultPageID = getUrlSearchParams({ target: 'dev_mode' });
  const currEnv = envFilter(env);
  window.$EnvConfig = {
    ...(EnvConfig as any),
    _on: !!defaultPageID,
    currEnv,
  };
  window.$AppConfig = {
    ...(EnvConfig as any),
    currEnv,
    currEnvConfig: (EnvConfig as any)[currEnv],
  };
  // window.$API = (EnvConfig as any)[currEnv];
  // console.log(
  //   "当前环境配置\n\n",
  //   window.$EnvConfig,
  //   "\n\n",
  //   window.$AppConfig,
  //   "\n----------------环境读取"
  // );
}

import { getAppId, getPlatform, getToken, getUid } from '@/services';
import { trpc } from '@/utils/trpc';
import APPBridge from '@mk/app-bridge';
import { API } from '@mk/services';
import { IWorksAPI, WorksStore, WorksStoreConfig } from '@mk/works-store/store';
// import "@mk/ui/style/index.scss";
import { worksApi2 } from './works2';

const getCDNUrl = () => {
  return 'https://res.maka.im';
};

export const getRequestCommonConfig = (config: any) => {
  if (typeof window !== 'undefined') {
    config.headers = {
      token: getToken(),
      uid: getUid(),
      device: getPlatform(),
      version: '7.0.0',
      appid: getAppId(),
      ...config.headers,
    };
  }
  return config;
};

export const initWidgetEnv = async () => {
  const MKUI = {};
  /**
   * 准备组件需要的运行时环境
   */
  Object.assign(window, {
    APPBridge: APPBridge,
  });
};

/**
 * 创建基于 tRPC 的 API 实现
 */
const createTRPCAPI = (): IWorksAPI => ({
  updateWorksDetail: async ({ id, data }) => {
    // 过滤掉 null 值，tRPC update 不接受 null
    const cleanData: Record<string, any> = {};
    Object.keys(data).forEach(key => {
      const value = (data as any)[key];
      if (value !== null && value !== undefined) {
        cleanData[key] = value;
      }
    });
    return trpc.works.update.mutate({
      id,
      ...cleanData,
    }) as any;
  },
  saveWorksContent: async ({ id, content, isBackup }) => {
    return trpc.works.saveWorksContent.mutate({ id, content, isBackup });
  },
  saveTemplateContent: async ({ id, content, isBackup }) => {
    return trpc.template.saveTemplateContent.mutate({ id, content, isBackup });
  },
  getWorksData: async ({ id, version }) => {
    return trpc.works.getWorksData.query({ id, version }) as any;
  },
  getTemplateData: async ({ id }) => {
    return trpc.template.getTemplateData.query({ id }) as any;
  },
});

export const createWorksStore = (config: Partial<WorksStoreConfig>) => {
  const {
    worksId,
    appMode = 'editor-web',
    autoSaveFreq = 2,
    noSave = false,
    isTemplate = false,
    apiVersion = 'v2',
    widgetResourceCdn = () => getCDNUrl(),
  } = config;
  const worksServer = () => {
    if (apiVersion === 'v1') {
      return API('工具服务');
    } else {
      return worksApi2();
    }
  };
  const widgetServer = () => API('工具服务', '/widgets');

  const worksStore = new WorksStore({
    apiVersion,
    requestInterceptors: config => {
      return getRequestCommonConfig(config);
    },
    userId: getUid,
    worksId: worksId || (() => ''),
    worksServer,
    widgetServer,
    widgetResourceCdn,
    onGetWorksError: () => {},
    // v2 使用 tRPC API 实现
    api: apiVersion === 'v2' ? createTRPCAPI() : undefined,
    autoSaveFreq,
    noSave: noSave,
    isTemplate,
    appMode: appMode as any,
  });
  return worksStore;
};

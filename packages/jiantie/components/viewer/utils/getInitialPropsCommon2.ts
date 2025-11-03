import { API, setEnv } from '@mk/services';
import { WorksStore } from '@mk/works-store/store';
import { IWorksData } from '@mk/works-store/types';
import { toJS } from 'mobx';
import { AppContext } from '../types';

export interface IGetInitialPropsCommonAppRouter {
  userAgent: string;
  pathname: string;
  query: AppContext['query'];
  websiteControl: {
    isTempLink: boolean;
    isExpire: boolean;
    viewMode?: 'viewer' | 'preview' | 'store';
    trialExpired?: boolean;
    brandLogoUrl?: string;
    brandText?: string;
    showWatermark?: boolean;
    floatAD?: boolean;
  };
  permissionData?: Record<string, string>;
  worksDetail: any;
  worksData: IWorksData;
  widgetMetadatas: any;
}

const getUserPermissionList = async ({
  uid,
  appid = 'jiantie',
  worksId,
}: {
  uid: string | number;
  appid?: string;
  worksId: string;
}) => {
  const isTWorksId = /^T_/.test(worksId);
  if (isTWorksId) {
    return {};
  }
  const permissionRawData = await fetch(
    API('apiv10', `/user-permissions/${appid}/${uid}`),
    {
      method: 'GET',
    }
  );

  const res = await permissionRawData.json();
  if (res.permissions) {
    const ret: Record<string, any> = {};
    res.permissions.forEach((item: any) => {
      ret[item.alias] = item.value || 'true';
    });
    return ret;
  } else {
    return {};
  }
};

export const getInitialPropsCommonAppRouter = async ({
  headers,
  pathname,
  query,
  isTemplate = false,
  apiVersion = 'v2',
}: {
  headers: {
    'user-agent': string;
    // referer: string;
    host: string;
  };
  pathname: string;
  query: {
    uid?: string;
    worksId: string;
    screenshot?: string;
    page?: string;
    canvasScale?: string;
    flatPageRenderMode?: string;
    env?: any;
    appid?: string;
    __watermark__?: string;
    type?: string;
    version?: string;
    preview_mode?: string;
    back_door?: string;
    inviteId?: string;
  };
  isTemplate?: boolean;
  apiVersion?: 'v1' | 'v2';
}): Promise<IGetInitialPropsCommonAppRouter> => {
  isTemplate = isTemplate || /^T_/.test(query.worksId);
  const userAgent = headers['user-agent'];
  // const referer = headers.referer || "https://maka.im";
  // const pathname = new url.URL(referer).pathname;
  if (query.env) {
    setEnv(query.env);
  }
  const result: IGetInitialPropsCommonAppRouter = {
    userAgent,
    pathname,
    query: {
      uid: query.uid || '',
      screenshot: query.screenshot || '',
      worksId: query.worksId,
      host: headers.host,
      page: query.page,
      canvasScale: query.canvasScale,
      flatPageRenderMode: query.flatPageRenderMode,
      env: query.env,
      appid: query.appid,
      // __watermark__: query.__watermark,
      type: query.type || '',
      version: query.version || '',
      back_door: query.back_door || '',
      backDoor: query.back_door || '',
      inviteId: query.inviteId || '',
    },
    websiteControl: {
      isTempLink: false,
      isExpire: false,
    },
    worksDetail: {},
    worksData: {} as IWorksData,
    widgetMetadatas: {},
  };
  try {
    const now = Date.now();
    const serverUrl =
      apiVersion === 'v1' ? API('工具服务') : 'https://works-server-v2.maka.im';
    console.time(`get_render_resources_${now}_${query.worksId}`);
    const store = new WorksStore({
      apiVersion,
      requestInterceptors: config => config,
      userId: () => query.uid || '',
      // worksId: query.worksId,
      worksId: () => query.worksId,
      worksServer: () => serverUrl,
      widgetServer: () => API('工具服务', '/widgets'),
      widgetResourceCdn: () => 'https://res.maka.im',
      onGetWorksError: error => {
        console.log('onGetWorksError', error);
      },
      autoSaveFreq: -1,
      noSave: true,
      isTemplate,
      appMode: 'viewer',
    });

    const worksData = await store.prepareData();
    let worksDetail = toJS(store.worksDetail);
    console.timeEnd(`get_render_resources_${now}_${query.worksId}`);
    result.worksDetail = worksDetail;
    if (
      isTemplate ||
      /mk_false|false/gi.test(query.__watermark__ || '') ||
      query.preview_mode === 'true' ||
      query.back_door === 'true'
    ) {
      result.websiteControl.isExpire = false;
      result.websiteControl.isTempLink = false;
    }
    const permissionData = await getUserPermissionList({
      uid: worksDetail.uid || '',
      worksId: query.worksId,
      appid: query.appid,
    });
    result.permissionData = permissionData;

    result.worksData = toJS(worksData);
    result.widgetMetadatas = Object.values(
      toJS(store?.widgetMetadataColl || {})
    );
  } catch (err) {
    console.error('getInitialPropsCommon err', err);
  }
  return result as IGetInitialPropsCommonAppRouter;
};

import { IWorksData } from '@/components/GridEditorV3/works-store/types';
import { API } from '@/services';
import Loggerv7 from '@/services/loggerv7';
import APPBridge from '@/store/app-bridge';
import { queryToObj } from '@/utils';
import { SerializedWorksEntity, trpc } from '@/utils/trpc';
import type { WorksEntity } from '@mk/jiantie/v11-database/generated/client/client';
import axios, { AxiosError } from 'axios';
import request, { checkToken, clearUserCookie, getAppId, getLocale, getPlatform, getToken, getUid } from './request';

export interface WorksEntity2 {
  id: string;
  title: string;
  desc: string;
  cover: string;
  deleted: boolean;
  deleted_confirmed: boolean;
  create_time: string;
  update_time: string;
  custom_time: string;
  version: number;
  child_works_id: string | null;
  template_id: string;
  uid: string;
  is_folder: boolean;
  offline: boolean;
  is_paied: boolean;
  folder_id: string | null;
  is_title_desc_modified: boolean;
}

export interface WorksItem extends WorksEntity2 {
  editor_version: number;
  spec: {
    id: string;
    name: string;
    width: number;
    height: number;
  };
  analytics: Array<{
    data: string;
    text: string;
    url: string;
  }>;
  bulletScreenTotal?: number;
  huiZhiTotal?: number;
  thumb?: string;
  pv?: number; // 累计访问量
  uv?: number; // 累计访问人数
}

export const worksApi2 = () => {
  if (queryToObj().dev_host) {
    return 'http://localhost:9990';
  }
  const env = process.env.ENV;
  if (env === 'prod') {
    return 'https://works-server-v2.maka.im';
  }
  return 'https://staging-works-server-v2.maka.im';
};

const request2 = axios.create({
  baseURL: '',
  timeout: 15000,
});

request2.interceptors.request.use(config => {
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

request2.interceptors.response.use(
  response => {
    if (!checkToken(response)) {
      // 清除cookie, 刷新页面
      import('react-hot-toast').then(({ toast }) => {
        toast.error('用户状态过期，请重新登录!');
      });
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
      return response;
    }
    return response;
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

export interface ListRes<T> {
  list: T[];
  total: number;
}

export const getWorkDetail2 = async (id: string) => {
  const res = await trpc.works.findById.query({ id });
  return res as unknown as SerializedWorksEntity;
};

export const getWorkData2 = async (id: string) => {
  const res = await trpc.works.getWorksData.query({ id });
  return res as unknown as {
    work_data: IWorksData;
    detail: SerializedWorksEntity;
  };
};

export const deleteWork2 = async (worksId: string) => {
  const res = await trpc.works.delete.mutate({ id: worksId });
  return res;
};

export const duplicateWork2 = async (worksId: string) => {
  const res = await trpc.works.duplicate.mutate({ id: worksId });
  return res;
};

/**
 * 更新作品detail信息
 */
export const updateWorksDetail2 = async (
  workId: string,
  data: Partial<Omit<WorksEntity, 'create_time' | 'update_time' | 'custom_time'>>
) => {
  const res = await trpc.works.update.mutate({ id: workId, ...(data as any) });
  return res;
};

export const getWorksMaka = async ({
  page = 1,
  size = 10,
  worksIds,
  keyword,
  template_id,
  incSpecs,
  exSpecs,
  incAnalytics = false,
}: {
  page?: number;
  size?: number;
  worksIds?: string[];
  keyword?: string;
  template_id?: string;
  incSpecs?: string;
  exSpecs?: string;
  incAnalytics?: boolean;
}) => {
  const uid = getUid();
  if (!uid) {
    throw new Error('uid is required');
  }

  const res = await request2.get<ListRes<WorksEntity2>>(`${worksApi2()}/works-maka`, {
    params: {
      uid,
      page: page,
      pageSize: size,
      order: 'desc',
      ids: worksIds?.join(','),
      keyword: keyword,
      template_id: template_id,
      incSpecs: incSpecs,
      exSpecs: exSpecs,
      incAnalytics: incAnalytics,
    },
  });
  return res.data;
};

/**
 * 获取作品数据
 */
export const getWorksData = async (
  pageId: string,
  uid: string,
  params?: {
    version?: string;
    mode?: string;
  }
) => {
  const mode = params?.mode || (/^T_/.test(pageId) ? 'template' : undefined);
  const version = params?.version || queryToObj().version;
  try {
    // await worksStoreServiceApi.getWorks(pageId, +uid, undefined, {
    const res = await request.get(API('工具服务', `/works-store/v7/works/${uid}/${pageId}`), {
      params: {
        version,
        mode,
      },
    });
    return res;
  } catch (e: any) {
    console.log('getWorksDataErr', e);
  }
};

export const getPageId = (): string => {
  const queryParams = queryToObj();
  if (queryParams) {
    return queryParams.works_id || queryParams.page_id || queryParams.id;
  }
  console.error('找不到作品id');
  return '';
};
export const getWorksId = getPageId;

export const createWork = (data: any) => {
  return request.post(`${API('主服务API')}/works/index/add`, data);
};

/**
 * @deprecated
 * 更新作品detail信息
 * @param data
 * @returns
 */
export const updateWorksDetal = (uid: number, workId: string, data: any) => {
  return request.put(`${API('工具服务')}/works-store/v7/deteil/${uid}/${workId}`, data);
};

/**
 * @deprecated
 */
export const getWorksDetail = (uid: number, works_id: string) => {
  return request.post(`${API('主服务API')}/works/works/detail`, {
    uid,
    works_id,
  });
};

/**
 * 删除作品
 * @deprecated
 * @param uid
 * @param works_id
 * @returns
 */
export const deleteWork = (uid: number, works_id: string) => {
  return request.post(`${API('主服务API')}/works/works/delete`, {
    uid,
    works_id,
  });
};

/**
 * 复制作品
 * @deprecated
 * @param works_id
 * @returns
 */
export const copyWork = (works_id: string) => {
  return request.post(`${API('主服务API')}/works/${works_id}/action/copy`);
};

/**
 * 更新作品
 * @deprecated
 * @param data
 * @returns
 */
export const updateWorks = (data: any) => {
  return request.post(`${API('主服务API')}/works/works/edit`, data);
};

/**
 * 风控检查
 * @deprecated
 * @param data
 * @returns
 */
export const riskCheck = (data: any) => {
  return request.post(`${API('主服务API')}/works/works/risk_check`, data);
};

export const getStoreCategories = () => {
  return request.get(`${API('主服务API')}/store/categories`);
};

export const searchWorks = (params: any) => {
  return request.post(`${API('主服务API')}/works/works/list`, params);
};

/**
 * 收藏模板列表
 * @param data
 * @returns
 */
export const getCollectTemplates = (data: any) => {
  return request.post(`${API('主服务API')}/template/template/collect_list`, data);
};

/**
 * 用户已购模板
 * @param data
 * @returns
 */
export const getUserTemplates = (data: any) => {
  return request.post(`${API('主服务API')}/user/template/index`, data);
};

/**
 * 作品回收站
 * @param params
 * @returns
 */
export const getRecycleBin = (params: any) => {
  return request.get(`${API('主服务API')}/works/recycle_bin`, {
    params,
  });
};

/**
 * 删除回收站作品
 * @param works_ids
 * @returns
 */
export const deleteRecycleBin = (works_ids: string[]) => {
  return request.delete(`${API('主服务API')}/works/recycle_bin`, {
    data: {
      type: 'multi',
      works_ids,
    },
  });
};

/**
 * 恢复回收站作品
 * @param works_ids
 * @returns
 */
export const moveRecycleBin = (works_ids: string[]) => {
  return request.post(`${API('主服务API')}/works/recycle_bin:move`, {
    type: 'multi',
    works_ids,
  });
};

/**
 * 获取 2025 版本的模板数据
 * @param templateId 模板ID
 * @returns 返回包含 work_data: IWorksData2025 的数据
 */
export const getTemplate2025Data = async (templateId: string) => {
  const token = getToken();
  const url = `https://www.maka.im/mk-fe-node/works-template/v2/${templateId}`;

  try {
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        token: token || '',
      },
    });

    return response.data;
  } catch (error: any) {
    throw error;
  }
};

import { trpc } from '@/utils/trpc';
import APPBridge from '@mk/app-bridge';
import Loggerv7 from '@mk/loggerv7';
import { isMakaAppAndroid, isMakaAppIOS, isPc, queryToObj } from '@mk/utils';
import { IWorksData } from '@mk/works-store/types';
import type {
  WorksEntity,
  WorksSpecEntity,
} from '@workspace/database/generated/client';
import axios, { AxiosError } from 'axios';
import {
  checkToken,
  clearUserCookie,
  getAppId,
  getLocale,
  getToken,
  getUid,
} from './request';

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

type SerializedWorksEntity = Omit<
  WorksEntity,
  'create_time' | 'update_time' | 'custom_time'
> & {
  create_time: string;
  update_time: string;
  custom_time: string | null;
  specInfo: WorksSpecEntity;
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
  data: Partial<
    Omit<WorksEntity, 'create_time' | 'update_time' | 'custom_time'>
  >
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

  const res = await request2.get<ListRes<WorksEntity2>>(
    `${worksApi2()}/works-maka`,
    {
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
    }
  );
  return res.data;
};

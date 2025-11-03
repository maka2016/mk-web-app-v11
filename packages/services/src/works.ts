import { queryToObj } from '@mk/utils';
import { API } from './apis';
import request from './request';

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
  const mode = params?.mode || (/T_/.test(pageId) ? 'template' : undefined);
  const version = params?.version || queryToObj().version;
  try {
    // await worksStoreServiceApi.getWorks(pageId, +uid, undefined, {
    const res = await request.get(
      API('工具服务', `/works-store/v7/works/${uid}/${pageId}`),
      {
        params: {
          version,
          mode,
        },
      }
    );
    return res;
  } catch (e: any) {
    console.log('getWorksDataErr', e);
  }
};

import { API } from '@mk/services';
import request from './request';

export const createWork = (data: any) => {
  return request.post(`${API('主服务API')}/works/index/add`, data);
};

/**
 *
 * @param data 创建作品V7
 * @returns
 */
export const createWorkV7 = (data: any) => {
  // return request.post(`${API('主服务API')}/works/index/add`, data)
  return request.post(`${API('工具服务')}/works-store/v7/item`, data);
};

/**
 * 更新作品detail信息
 * @param data
 * @returns
 */
export const updateWorksDetal = (uid: number, workId: string, data: any) => {
  return request.put(
    `${API('工具服务')}/works-store/v7/deteil/${uid}/${workId}`,
    data
  );
};

/**
 * 更新作品detail信息
 * @param data
 * @returns
 */
export const getWorksDetailV7 = (uid: number, workId: string) => {
  return request.get(
    `${API('工具服务')}/works-store/v7/detail/${uid}/${workId}`
  );
};

export const worksData = (uid: number, workId: string) => {
  return request.get(
    `${API('工具服务')}/works-store/v7/works/${uid}/${workId}`
  );
};

export const getWorksDetail = (uid: number, works_id: string) => {
  return request.post(`${API('主服务API')}/works/works/detail`, {
    uid,
    works_id,
  });
};

/**
 * 删除作品
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
 * @param works_id
 * @returns
 */
export const copyWork = (works_id: string) => {
  return request.post(`${API('主服务API')}/works/${works_id}/action/copy`);
};

export const updateWorks = (data: any) => {
  return request.post(`${API('主服务API')}/works/works/edit`, data);
};

/** 风控检查 */
export const riskCheck = (data: any) => {
  return request.post(`${API('主服务API')}/works/works/risk_check`, data);
};

export const worksList = (uid: number, params: any) => {
  return request.get(`${API('工具服务')}/works-store/v7/items/${uid}`, {
    params,
  });
};

export const worksPublishedCount = (uid: number) => {
  return request.get(
    `${API('工具服务')}/works-store/v7/works/published-count?uid=${uid}&startDate=2025-03-10T00:00:00Z&endDate=${new Date().toISOString()}`
  );
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
  return request.post(
    `${API('主服务API')}/template/template/collect_list`,
    data
  );
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

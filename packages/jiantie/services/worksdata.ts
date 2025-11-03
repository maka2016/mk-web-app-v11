import { API } from '@mk/services';
import request from './request';

/**
 * 活动列表
 * @param uid
 * @param params
 * @returns
 */
export const getActivityList = (uid: number, params: any) => {
  return request.get(`${API('工具服务')}/works-activity/v1/list/${uid}`, {
    params,
  });
};

/**
 * 作品活动数据统计
 * @param uid
 * @param works_id
 * @returns
 */
export const getWorksOverview = (uid: number, works_id: string) => {
  return request.get(
    `${API('营销助手服务API')}/data/users/${uid}/works/${works_id}/overview`
  );
};

/**
 * 作品停留时长
 * @param uid
 * @param works_id
 * @returns
 */
export const getWorksStay = (uid: number, works_id: string) => {
  return request.get(
    `${API('营销助手服务API')}/data/users/${uid}/works/${works_id}/stay`
  );
};

/**
 * 作品传播数据走势(pv,uv,share)
 * @param uid
 * @param works_id
 * @param kind
 * @returns
 */
export const getWorksPeriod = (uid: number, works_id: string, kind: number) => {
  return request.get(
    `${API('营销助手服务API')}/data/users/${uid}/works/${works_id}/period?kind=${kind}`
  );
};

/**
 * 获取作品访问来源
 * @param uid
 * @param works_id
 * @returns
 */
export const getWorksSource = (uid: number, works_id: string) => {
  return request.get(
    `${API('营销助手服务API')}/data/users/${uid}/works/${works_id}/source`
  );
};

/**
 * 获取作品表单提交数
 * @param worksId
 * @returns
 */
export const getFormSubmitNum = (worksId: string) => {
  return request.get(
    `${API('表单API')}/form-report/v1/app-daily-report/${worksId}`
  );
};

/** 获取投票排行榜 */
export const fetchVoteRankList = (uid: string, formId: string) => {
  return request.get(`${API('api_v7')}/vote/v1/rank/${uid}/${formId}`);
};

/** 获取作品的所有投票数据概览 */
export const fetchVoteOverview = (uid: string, worksId: string) => {
  return request.get(`${API('api_v7')}/vote/v1/overview/${uid}/${worksId}`);
};

/** 获取拼团概览 */
export const fetchGroupBuyData = (id: string, uid: number) => {
  return request.get(
    `${API('api_v7')}/shopping/v1/groupbuy/statistic/${uid}/${id}`
  );
};

export const getWorkVisitors = (params: any) => {
  return request.get(`${API('营销助手服务API')}/event/search`, {
    params,
  });
};

export const getWorkSpread = (params: any) => {
  return request.get(`${API('营销助手服务API')}/event/top`, {
    params,
  });
};

export const getEventCollect = (uid: number) => {
  return request.get(`${API('营销助手服务API')}/event/collect?work_uid=${uid}`);
};

/**
 * 导出表单数据
 * @param formId
 * @returns
 */
export const exportSubmitData = (formId: string) => {
  return request.get(
    `${API('表单API')}/form-report/v1/export-submit-data/${formId}`
  );
};

export const getGroupBuyData = async (id: string, uid: number) => {
  return await request.get(
    `${API('api_v7')}/shopping/v1/groupbuy/statistic/${uid}/${id}`
  );
};

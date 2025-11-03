import { API } from '@mk/services';
import request from './request';

export const receviceCoupon = (params: any) => {
  return request.post(`${API('卡劵服务API')}/api/receive`, params);
};

export const couponList = () => {
  return request.get(`${API('卡劵服务API')}/api/list`);
};

export const getChannelResources = async (params: any) => {
  return request.get(
    `${API('资源位服务API')}/marketing/activity/resource_position/getResourceDetail`,
    { params }
  );
};

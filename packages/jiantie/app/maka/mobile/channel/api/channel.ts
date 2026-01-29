import { API, request } from '@/services';

/**
 * 频道资源位
 * @param group_id
 */
export const getResourceDetail = (group_id: string) => {
  return request.get(
    `${API('资源位服务API')}/marketing/activity/resource_position/getResourceDetail?group_type=site&group_id=${group_id}`
  );
};

/**
 * 获取频道楼层
 * @param floorId
 * @returns
 */
export const getSiteFloors = (floorId: string, params: any) => {
  return request.get(
    `${API('主服务API')}/mengine/store/v1/site/${floorId}/floors`,
    {
      params,
    }
  );
};

/**
 * 热词楼层模版获取
 * @param floorId
 * @param filterId
 * @returns
 */
export const getTemplatesByFilterId = (
  floorId: number,
  filterId: number,
  params: any
) => {
  return request.get(
    `${API('主服务API')}/mengine/store/v1/floor/${floorId}/templates/search/${filterId}`,
    {
      params,
    }
  );
};

/**
 * 检查模板收藏状态
 * @param data
 * @returns
 */
export const checkCollect = (data: any) => {
  return request.post(`${API('主服务API')}/floor/template/collected`, data);
};

export const getSiteInfo = (alias: string) => {
  console.log('first', `${API('主服务API')}/mengine/store/v1/site/${alias}`);
  return request.get(`${API('主服务API')}/mengine/store/v1/site/${alias}`);
};

export const getChannelResources = async (params: any) => {
  return request.get(
    `${API('资源位服务API')}/marketing/activity/resource_position/getResourceDetail`,
    { params }
  );
};

export const getHotwordDetail = async (id: number) => {
  return request.get(`${API('主服务API')}/mengine/store/v1/hot-word/${id}`);
};

export const getTemplatesByTag = (floorId: number, params: any) => {
  return request.get(
    `${API('主服务API')}/mengine/store/v1/floor/${floorId}/templates`,
    {
      params,
    }
  );
};

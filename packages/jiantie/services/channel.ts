import { API } from '@/services';
import qs from 'qs';
import { getCmsApiHost, requestCMS } from './prompt';
import request from './request';

/**
 * Channel 接口 - 支持多级嵌套结构
 *
 * 数据层级结构：
 * - 一级：应用根频道
 * - 二级：频道分类
 * - 三级：热词（Hotword）
 * - 四级：楼层（Floor）
 * - 五级：集合（Collection）
 *
 * 通过递归的 children 属性实现多级嵌套
 */
export interface Channel {
  documentId: string;
  id: number;

  name: string;
  filters: any;
  online?: boolean;
  sort?: number;

  icon?: {
    url: string;
  };
  children: Channel[];
  config?: {
    topTids?: string[];
  };
}

/**
 * 模版详情
 */
export const getTemplateDetail = (templateId: string) => {
  return request.get(`${API('主服务API')}/api/plat/v1/store/${templateId}`);
};

/**
 * 检查编辑器类型
 * @param type
 * @param id
 * @returns
 */
export const getEditorInfo = (type: string, id: string) => {
  return request.get(
    `${API('主服务API')}/v2/works/getEditorInfo?type=${type}&id=${id}`
  );
};

export const getTopTemplates = async (activeChannel: any, limit = 6) => {
  console.log('get 3 top activeChannel?.config?.topTids', activeChannel);

  if (!activeChannel?.config?.topTids?.[0]) {
    return [];
  }
  const topQuery = qs.stringify(
    {
      populate: {
        cover: {
          populate: '*',
        },
      },
      filters: {
        template_id: {
          $in: activeChannel?.config?.topTids,
        },
      },
      pagination: {
        pageSize: limit,
        page: 1,
      },
    },
    { encodeValuesOnly: true }
  );
  const topRes = await requestCMS.get(
    `${getCmsApiHost()}/api/template-items?${topQuery}`
  );

  //按照activeChannel?.config?.topTids数组中排序
  const sortedTopRes = topRes?.data?.data?.sort((a: any, b: any) => {
    return (
      activeChannel?.config?.topTids?.indexOf(a.template_id) -
      activeChannel?.config?.topTids?.indexOf(b.template_id)
    );
  });

  return sortedTopRes;
};

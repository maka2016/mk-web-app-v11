import qs from 'qs';
import { requestCMS } from '../services';

const limit = 60;

export interface Floor {
  id: number;
  name: string;
}

export interface MaterialItem {
  id: number;
  documentId: string;
  name: string;
  content: any;
  cover: {
    url: string;
  };
  url: {
    url: string;
  };
}

// 获取素材楼层
export const getFloorData = async (): Promise<Floor[]> => {
  const query = qs.stringify(
    {
      populate: 'material_tags',
      filters: {
        documentId: {
          // 简帖音乐的id
          $eq: 'tlljh8cexlk80g74cz3uisxg',
        },
      },
    },
    { encodeValuesOnly: true }
  );

  const promptGroupRes = (await requestCMS.get(`/material-classes?${query}`))
    .data.data?.[0]?.material_tags;

  console.log('promptGroupRes', promptGroupRes);
  if (promptGroupRes.length > 0) {
    return [{ id: -1, name: '全部' }, ...promptGroupRes];
  }
  return [];
};

// 获取所有素材
export const getAllMaterials = async (
  page: number
): Promise<{
  data: MaterialItem[];
  finished: boolean;
}> => {
  const query = qs.stringify(
    {
      populate: {
        cover: {
          populate: '*',
        },
        url: {
          populate: '*',
        },
        material_floors: {
          populate: {
            material_class: {
              populate: '*',
            },
          },
        },
      },

      filters: {
        material_floors: {
          material_class: {
            name: {
              $eq: '简帖音乐',
            },
          },
        },
      },
      pagination: {
        pageSize: limit,
        page: page,
      },
    },
    { encodeValuesOnly: true }
  );

  const res = await requestCMS.get(`/material-musics?${query}`);
  if (res?.data?.data) {
    return {
      data: res.data.data,
      finished: res.data.data.length < limit,
    };
  }
  return { data: [], finished: true };
};

// 获取指定楼层的素材
export const getMaterials = async (
  activeFloorId: number,
  page: number
): Promise<{
  data: MaterialItem[];
  finished: boolean;
}> => {
  const query = qs.stringify(
    {
      populate: {
        cover: {
          populate: '*',
        },
        url: {
          populate: '*',
        },
      },

      filters: {
        material_floors: {
          id: {
            $eq: activeFloorId && activeFloorId > -1 ? activeFloorId : '',
          },
        },
      },
      pagination: {
        pageSize: limit,
        page: page,
      },
    },
    { encodeValuesOnly: true }
  );

  const res = await requestCMS.get(
    `/material-musics?${query}&populate=material_floors`
  );
  if (res?.data?.data) {
    return {
      data: res.data.data,
      finished: res.data.data.length < limit,
    };
  }
  return { data: [], finished: true };
};

// 搜索素材
export const searchMaterials = async (
  keyword: string,
  page: number
): Promise<{
  data: MaterialItem[];
  finished: boolean;
}> => {
  const query = qs.stringify(
    {
      populate: {
        cover: {
          populate: '*',
        },
        url: {
          populate: '*',
        },
      },
      filters: {
        name: {
          $contains: keyword,
        },
      },
      pagination: {
        pageSize: limit,
        page: page,
      },
    },
    { encodeValuesOnly: true }
  );

  const res = await requestCMS.get(`/material-musics?${query}`);
  if (res?.data?.data) {
    return {
      data: res.data.data,
      finished: res.data.data.length < limit,
    };
  }
  return { data: [], finished: true };
};

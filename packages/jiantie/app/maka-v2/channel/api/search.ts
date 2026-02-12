import { API, getPlatform, request } from '@/services';
export const SEARCH_PAGESIZE = 100;

/**
 * 模版详情
 */
export const getHotSearchWords = () => {
  return request.get(`${API('主服务API')}/hot-search-keywords`);
};

export const searchTemplate = async (params = {}) => {
  return request.get(`${API('主服务API')}/store/open-search/template`, {
    params,
  });
};

export enum FreeType {
  free = 1,
  vipfree = 0,
  undefined = -1,
}

export enum OrderType {
  sv = 'sv',
  times = 'time',
  undefined = '',
}

export interface filter {
  industry_tag?: string;
  style_tag?: string;
  category?: string;
  scene_tag?: string;
  spec?: string;
  color_tag?: string;
  ex_category?: string;
}

export interface sParamType {
  id?: string;
  queryWord: string;
  cWord?: string;
  filter: filter | undefined;
  orderBy?: OrderType;
  isFree?: FreeType;
  pageNum: number;
  type: 'word' | 'id';
  channel?: string;
  appid?: string;
}

//ids查搜索词
export const getSearchWordByIds = (IdArrString: string) => {
  //读取
  return [
    {
      name: '哈哈',
    },
  ];
};

//id换搜索词
export const getSearchWordByWords = (wordArrString: string) => {
  //读取
  return [
    {
      id: 1,
    },
  ];
};

interface searchParams {
  q?: string;
  u: string;
  oq?: string;
  p: number;
  orderBy?: string;
  isFree?: string;
  category?: string;
  spec?: string;
  style?: string;
  scene?: string;
  industry?: string;
  color?: string;
}
export const getSearchMuban = async (params: searchParams) => {
  const defaut_Config = {
    cli_rev: '1.0',
    platform: getPlatform(),
    n: SEARCH_PAGESIZE,
    p: 1,
  };
  let data = (await request.get(`${API('apiv10')}/templates/search`, {
    params: { ...defaut_Config, ...params },
  })) as any;

  //H5默认排最前面
  data?.result?.facets?.category?.sort((a: any, b: any) => {
    if (a.id === 'interactive') {
      return -1;
    } else if (b.id === 'interactive') {
      return 1;
    } else {
      return -a.cnt + b.cnt;
    }
  });

  //互动网页改名H5
  for (let i in data.result.facets.category) {
    if (data.result.facets.category[i].id === 'interactive') {
      data.result.facets.category[i].name = 'H5';
    }
  }

  return data;
};

interface userInfo {
  u: string;
  dinstinct_id?: string;
  cli_rev?: string;
}

export const getSearchMubanBySparam = async (
  sParam: sParamType,
  userInfo?: userInfo
) => {
  console.log('sParam.cWord==>>>', `${sParam.queryWord} ${sParam.cWord ?? ''}`);
  console.log('getSearchMubanBySparam', userInfo);
  const query = {
    q: sParam.cWord
      ? `${sParam.queryWord}${sParam.cWord ?? ''}`
      : `${sParam.queryWord}`,
    oq: sParam.cWord ? sParam.queryWord : '',
    p: sParam.pageNum,
    orderby: sParam.orderBy,
    free: sParam.isFree === FreeType.undefined ? '' : (sParam.isFree as any),
    category: sParam.filter?.category ?? '',
    spec: sParam.filter?.spec ?? '',
    style: sParam.filter?.style_tag ?? '',
    scene: sParam.filter?.scene_tag ?? '',
    industry: sParam.filter?.industry_tag ?? '',
    ex_category: sParam.filter?.ex_category || '',
    color: sParam.filter?.color_tag || '',
    channel: decodeURIComponent(sParam.channel || ''),
    appid: sParam.appid || '',
    u: userInfo?.u ?? '',
    ...userInfo,
  };
  let rawData = (await getSearchMuban(query)) as any;
  return rawData;
};

export const checkSearchTopic = (word: string) => {
  return request.get(
    `${API('主服务API')}/mengine/store/v1/hot-words/latest?hot_word_tag=${word}`
  );
};

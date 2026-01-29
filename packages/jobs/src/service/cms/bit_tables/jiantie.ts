import {
  DatasheetItem,
  bitFileRaw,
  bitFindRaw,
  bitRecRef,
  bitTextRaw,
  bitTextRef,
  bitUseraw,
} from './types';

type BitTables = Record<string, DatasheetItem>;

export const JTBitTables: BitTables = {
  // https://www.feishu.cn/wiki/SKy7wPvIFiA8sokZTC1ccdbfnHf?base_hp_from=larktab&table=tblHMx8F5LPM6y7k&view=vewkBW3EJf
  '一级-栏目': {
    name: '一级-栏目',
    baseId: 'SKy7wPvIFiA8sokZTC1ccdbfnHf',
    tableId: 'tblHMx8F5LPM6y7k',
    viewId: 'vewkBW3EJf',
  },
  // https://www.feishu.cn/wiki/SKy7wPvIFiA8sokZTC1ccdbfnHf?base_hp_from=larktab&table=tblhgLqZCWDPL86v&view=vewkBW3EJf
  '二级-频道': {
    name: '主题生产',
    baseId: 'SKy7wPvIFiA8sokZTC1ccdbfnHf',
    tableId: 'tblhgLqZCWDPL86v',
    viewId: 'vewkBW3EJf',
  },
  // https://www.feishu.cn/wiki/SKy7wPvIFiA8sokZTC1ccdbfnHf?base_hp_from=larktab&table=tbltVajOKeVz853Z&view=vewkBW3EJf
  '三级-热词': {
    name: '三级-热词',
    baseId: 'SKy7wPvIFiA8sokZTC1ccdbfnHf',
    tableId: 'tbltVajOKeVz853Z',
    viewId: 'vewkBW3EJf',
  },
  // https://www.feishu.cn/wiki/SKy7wPvIFiA8sokZTC1ccdbfnHf?base_hp_from=larktab&table=tbldiS12dLzHYpTu&view=vewkBW3EJf
  模板筛选器: {
    name: '模板筛选器',
    baseId: 'SKy7wPvIFiA8sokZTC1ccdbfnHf',
    tableId: 'tbldiS12dLzHYpTu',
    viewId: 'vewkBW3EJf',
  },

  //四级标签https://www.feishu.cn/wiki/SKy7wPvIFiA8sokZTC1ccdbfnHf?base_hp_from=larktab&table=tblWMSnuf6OyILeV&view=vewkBW3EJf
  '四级-标签': {
    name: '四级-标签',
    baseId: 'SKy7wPvIFiA8sokZTC1ccdbfnHf',
    tableId: 'tblWMSnuf6OyILeV',
    viewId: 'vewkBW3EJf',
  },

  // https://www.feishu.cn/wiki/SKy7wPvIFiA8sokZTC1ccdbfnHf?base_hp_from=larktab&table=tblIAzooWiAC7uVj&view=vewkBW3EJf
  // '五级-集合': {
  //   name: '五级-集合',
  //   baseId: 'SKy7wPvIFiA8sokZTC1ccdbfnHf',
  //   tableId: 'tblIAzooWiAC7uVj',
  //   viewId: 'vewkBW3EJf',
  // },

  // https://www.feishu.cn/wiki/SKy7wPvIFiA8sokZTC1ccdbfnHf?base_hp_from=larktab&table=tblQHmefOcyLQ9Mg&view=vewnxG8K7a
  模版生产: {
    name: '模版生产',
    baseId: 'SKy7wPvIFiA8sokZTC1ccdbfnHf',
    tableId: 'tblQHmefOcyLQ9Mg',
    viewId: 'vewnxG8K7a',
  },
  // https://www.feishu.cn/wiki/SKy7wPvIFiA8sokZTC1ccdbfnHf?base_hp_from=larktab&table=tbl2E4wrRD4Wrls7&view=vew8cki19S
  模板标签: {
    name: '模板标签',
    baseId: 'SKy7wPvIFiA8sokZTC1ccdbfnHf',
    tableId: 'tbl2E4wrRD4Wrls7',
    viewId: 'vew8cki19S',
  },
};

export interface BitChannelItem {
  fields: {
    alias: bitTextRef;
    显示名: bitTextRaw[];
    内部名称: bitTextRaw[];
    封面: bitFileRaw[];
    封面url: bitTextRaw[];
    语言: string;
    子级: bitRecRef;
    父级?: bitRecRef;
    包含模版?: bitRecRef;
    状态: string;
    id: bitTextRaw[];
    上线: string;
    模板标签V3?: bitRecRef;
    模板筛选器?: bitRecRef;
    排序权重: number;
    appid: bitTextRef;
  };
  record_id: string;
}

export interface TemplateChannelItem {
  fields: {
    任务模板ID: bitTextRaw[];
    作品id: bitTextRef;
    状态: string;
    封面类型: bitFindRaw;
    模板标签V3?: bitRecRef;
    模板筛选器?: bitRecRef;
    appid: bitTextRef;
  };
  record_id: string;
}

export interface TagItem {
  fields: {
    名称: bitTextRaw[];
    类型: bitTextRaw[];
    同步状态: string;
    id: bitTextRaw[];
  };
  record_id: string;
}

export interface BitTempalteFilterItem {
  fields: {
    alias: bitTextRef;
    // 显示名: bitTextRaw[];
    内部名称: bitTextRaw[];

    语言: string;
    父级?: bitRecRef;
    包含模版?: bitRecRef;
    // 状态: string;
    id: bitTextRaw[];
    // 上线: string;
    模板标签V3选项?: bitRecRef;
  };
  record_id: string;
}

export interface BitTemplateItem {
  fields: {
    任务模板ID: bitTextRaw[];
    作品id: bitTextRef;
    主题包链接: bitTextRef;
    主题作者: bitUseraw;
    真实作者UID: bitTextRef;
  };
  record_id: string;
}

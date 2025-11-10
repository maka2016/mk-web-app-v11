import {
  DatasheetItem,
  bitFileRaw,
  bitFindRaw,
  bitRecRef,
  bitTextRaw,
  bitTextRef,
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
  '四级-楼层': {
    name: '四级-楼层',
    baseId: 'SKy7wPvIFiA8sokZTC1ccdbfnHf',
    tableId: 'tbldiS12dLzHYpTu',
    viewId: 'vewkBW3EJf',
  },

  // https://www.feishu.cn/wiki/SKy7wPvIFiA8sokZTC1ccdbfnHf?base_hp_from=larktab&table=tblIAzooWiAC7uVj&view=vewkBW3EJf
  '五级-集合': {
    name: '五级-集合',
    baseId: 'SKy7wPvIFiA8sokZTC1ccdbfnHf',
    tableId: 'tblIAzooWiAC7uVj',
    viewId: 'vewkBW3EJf',
  },

  // https://www.feishu.cn/wiki/SKy7wPvIFiA8sokZTC1ccdbfnHf?base_hp_from=larktab&table=tblQHmefOcyLQ9Mg&view=vewnxG8K7a
  模版生产: {
    name: '模版生产',
    baseId: 'SKy7wPvIFiA8sokZTC1ccdbfnHf',
    tableId: 'tblQHmefOcyLQ9Mg',
    viewId: 'vewnxG8K7a',
  },
};

export interface BitChannelItem {
  fields: {
    alias: bitTextRef;
    显示名: bitTextRaw[];
    封面: bitFileRaw[];
    封面url: bitTextRaw[];
    语言: string;
    子级: bitRecRef;
    父级?: bitRecRef;
    包含模版?: bitRecRef;
    状态: string;
    id: bitTextRaw[];
    上线: string;
  };
  record_id: string;
}

export interface TemplateChannelItem {
  fields: {
    任务模板ID: bitTextRaw[];
    作品id: bitTextRef;
    状态: string;
    封面类型: bitFindRaw;
  };
  record_id: string;
}

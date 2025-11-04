import { bitItem, bitTextRaw } from '.';
import { DatasheetItem } from './types';

type BitTables = {
  标签: DatasheetItem;
  练习题: DatasheetItem;
  // 试卷: DatasheetItem;
};

export const sgbBitTables: BitTables = {
  标签: {
    name: '标签',
    baseId: 'JAa9wHgVRinfP0kjeoZcCTnMnhg',
    tableId: 'tblHntS6sLRKCSe9',
    viewId: 'vew22Gtznw',
  },
  练习题: {
    name: '练习题',
    baseId: 'JAa9wHgVRinfP0kjeoZcCTnMnhg',
    tableId: 'tblNZ86RoRfU1VNW',
    viewId: 'vewg1gs8rm',
  },
  // 试卷: {
  //   name: "标签",
  //   baseId: "JAa9wHgVRinfP0kjeoZcCTnMnhg",
  //   tableId: "tblHntS6sLRKCSe9",
  //   viewId: "vew22Gtznw",
  // },
};

export type TagItem = {
  名称: bitTextRaw[];
  类型: string;
  cmsId: string;
};

export interface bitExerciseItem
  extends bitItem<{
    题目: bitTextRaw[];
    材料: bitTextRaw[];
    参考答案: bitTextRaw[];
    解题思路: bitTextRaw[];
    一级类型: bitTextRaw[];
    二级类型: bitTextRaw[];
    一级标签cmsId: bitTextRaw[];
    二级标签cmsId: bitTextRaw[];
    来源材料cmsId: bitTextRaw[];
    来源试卷名称: bitTextRaw[];
    来源试卷cmsId: bitTextRaw[];
    最大字数: number;
    分值: number;
    题目质量: bitTextRaw[];
    判断原因: bitTextRaw[];
    cmsID?: bitTextRaw[];
    同步状态: bitTextRaw[];
  }> {}

export type ExerciseItem = {
  题目: string;
  材料: string;
  参考答案: string;
  解题思路: string;
  一级类型: string;
  二级类型: string;
  一级标签cmsId?: string;
  二级标签cmsId?: string;
  来源材料cmsId: string;
  来源试卷名称: string;
  来源试卷cmsId: string;
  最大字数: number;
  分值: number;
  题目质量: string;
  判断原因: string;
};

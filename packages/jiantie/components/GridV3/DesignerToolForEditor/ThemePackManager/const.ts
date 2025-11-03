import { IPositionLink, LayerElemItem } from '@mk/works-store/types';
import { getTagsByElementRef } from '../../shared/gridTag';
import { BackgroundGroupType2, GridRow } from '../../shared/types';

export interface ThemeItem {
  tag: string;
  name: string;
  elementRef: string;
  attrs: any;
  body?: ThemeItem[];
}

const textItems = getTagsByElementRef('Text');
const pictureItems = getTagsByElementRef('Picture');

const baseTextItems = [...textItems].map(item => ({
  ...item,
  tag: item.value,
  attrs: {
    ...item.defaultProps,
    text: item.name,
  },
}));

const basePictureItems = [...pictureItems].map(item => ({
  ...item,
  tag: item.value,
  attrs: {
    ...item.defaultProps,
  },
}));

const baseLayoutItems = [
  {
    elementRef: 'Container',
    tag: 'container1',
    name: '1图-上文下图',
    body: [baseTextItems[2], basePictureItems[0]],
    attrs: {
      layout: 'vertical',
    },
  },
  {
    elementRef: 'Container',
    tag: 'container2',
    name: '1图-上图下文',
    body: [basePictureItems[0], baseTextItems[2]],
    attrs: {
      layout: 'vertical',
    },
  },
];

interface LayoutData {
  row: GridRow;
  name: string;
  cover_url: string;
  elemComps: LayerElemItem[];
  positionLink: Record<string, IPositionLink>;
}

export interface ThemeSchema2 {
  version: number;
  widgets: ThemeItem[];
  // 存储documentId[]
  layoutDatas: string[];
  backgroundGroupClass: {
    name: string;
    backgroundGroup: BackgroundGroupType2;
  }[];
  puzzleGroups: {
    name: string;
    templateId: string;
    documentId: string;
    cover_url: string;
  }[];
}

export const defaultThemableItems: ThemeSchema2 = {
  version: 1,
  widgets: [],
  layoutDatas: [],
  // widgets: [...baseTextItems, ...basePictureItems, ...baseLayoutItems],
  backgroundGroupClass: [],
  puzzleGroups: [],
};

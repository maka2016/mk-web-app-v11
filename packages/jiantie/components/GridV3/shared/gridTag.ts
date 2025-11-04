export interface TagItemType {
  name: string;
  value: string;
  tag: string;
  form: string;
  elementRef: string;
  defaultProps?: any;
}

export const cardTags = [
  {
    name: 'Head',
    value: 'head_card',
    tag: 'head_card',
    form: 'GridForm',
    elementRef: 'GridV2',
  },
  {
    name: 'Card',
    value: 'detail_card',
    tag: 'detail_card',
    form: 'GridForm',
    elementRef: 'GridV2',
  },
];

const getTextDefaultProps = (other = {}) => ({
  // fontFamily: defaultFontFamily,
  ...other,
});

const rowTags = [
  {
    name: '布局行',
    value: 'default_row',
    tag: 'default_row',
    form: 'GridForm',
    elementRef: 'Grid_Row',
  },
];

const titleItem = {
  name: '标题',
  value: 'title',
  tag: 'title',
  form: 'TextForm',
  elementRef: 'Text',
  defaultProps: getTextDefaultProps({
    fontSize: 24,
    lineHeight: '1.2',
  }),
};

const subTitleItem = {
  name: '副标题',
  value: 'sub_title',
  tag: 'sub_title',
  form: 'TextForm',
  elementRef: 'Text',
  defaultProps: getTextDefaultProps({
    fontSize: 20,
    lineHeight: '1.2',
  }),
};

const textItem = {
  name: '正文',
  value: 'text',
  tag: 'text',
  form: 'TextForm',
  elementRef: 'Text',
  defaultProps: getTextDefaultProps({
    fontSize: 16,
    lineHeight: '1.5',
  }),
};

const cardItem = {
  name: '卡片',
  value: 'grid_style',
  tag: 'grid_style',
  form: 'GridForm',
  elementRef: 'GridV2',
  defaultProps: {
    padding: 0,
    gap: 0,
  },
};
const layoutItem = {
  name: '布局',
  value: 'row_style',
  tag: 'row_style',
  form: 'GridForm',
  elementRef: 'GridV2',
  defaultProps: {
    padding: 0,
    gap: 0,
  },
};
const cellItem = {
  name: '格子',
  value: 'cell_style',
  tag: 'cell_style',
  form: 'GridForm',
  elementRef: 'GridV2',
  defaultProps: {
    padding: 0,
    gap: 0,
  },
};

export const elemTags = [
  cardItem,
  layoutItem,
  cellItem,
  titleItem,
  subTitleItem,
  textItem,
];

export const pictureTags = [
  {
    name: '默认图片',
    value: 'default_picture',
    tag: 'default_picture',
    form: 'PictureForm',
    elementRef: 'Picture',
    defaultProps: {
      ossPath:
        '/eagle_prod/20230410_120559/LFHXS9JMCX4NU_海浪.jpg?x-oss-process=image%2Fresize%2Cw_288',
    },
  },
];

export const pageTags = [
  {
    name: '页面',
    value: 'page',
    tag: 'page',
    form: 'GridForm',
    elementRef: 'Page',
  },
];

export const gridTag = [
  ...elemTags,
  ...pictureTags,
  ...pageTags,
] as TagItemType[];

export const getTagsByElementRef = (elementRef: string) => {
  return gridTag.filter(item => item.elementRef === elementRef);
};

export const getTagByValue = (value: string) => {
  return gridTag.find(item => item.value === value);
};

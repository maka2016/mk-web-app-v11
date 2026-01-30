import { ThemeConfigV2 } from '../types';

export interface IAddItem {
  title: string;
  attrs: any;
  elementRef: string;
  displayStyle?: React.CSSProperties;
  link: {
    tag: string;
  };
}

export const getAddContainerThemeConfig = (
  themeConfig: ThemeConfigV2
): IAddItem[] => {
  return [
    {
      title: '容器（默认）',
      elementRef: 'Grid',
      attrs: {
        tag: 'grid_root',
        style: {
          display: 'flex',
          flexDirection: 'column',
        },
        childrenIds: [],
        alias: 'Grid',
        cells: [
          {
            childrenIds: [],
          },
        ],
      },
      displayStyle: themeConfig.grid_root,
      link: {
        tag: 'grid_root',
      },
    },
    {
      title: '容器头部（上）',
      elementRef: 'Grid',
      attrs: {
        tag: 'grid_root_head',
        style: {
          display: 'flex',
          flexDirection: 'column',
        },
        childrenIds: [],
        alias: 'Box',
        cells: [
          {
            childrenIds: [],
          },
        ],
      },
      displayStyle: themeConfig.grid_root_head,
      link: {
        tag: 'grid_root_head',
      },
    },
    {
      title: '容器内容（中）',
      elementRef: 'Grid',
      attrs: {
        tag: 'grid_root_content',
        style: {
          display: 'flex',
          flexDirection: 'column',
        },
        childrenIds: [],
        alias: 'Box',
        cells: [
          {
            childrenIds: [],
          },
        ],
      },
      displayStyle: themeConfig.grid_root_content,
      link: {
        tag: 'grid_root_content',
      },
    },
    {
      title: '容器底部（下）',
      elementRef: 'Grid',
      attrs: {
        tag: 'grid_root_footer',
        style: {
          display: 'flex',
          flexDirection: 'column',
        },
        childrenIds: [],
        alias: 'Box',
        cells: [
          {
            childrenIds: [],
          },
        ],
      },
      displayStyle: themeConfig.grid_root_footer,
      link: {
        tag: 'grid_root_footer',
      },
    },
  ];
};

export const getAddItemsByThemeConfig = (
  themeConfig: ThemeConfigV2
): IAddItem[] => {
  return [
    {
      title: getElementDisplayName('text_free'),
      elementRef: 'Text',
      attrs: {
        text: '默认文字',
        lineHeight: 1.5,
      },
      displayStyle: themeConfig.text_free,
      link: {
        tag: 'text_free',
      },
    },
    {
      title: getElementDisplayName('text_heading1'),
      elementRef: 'Text',
      attrs: {
        text: '大标题',
        lineHeight: 1.5,
      },
      displayStyle: themeConfig.text_heading1,
      link: {
        tag: 'text_heading1',
      },
    },
    {
      title: getElementDisplayName('text_heading2'),
      elementRef: 'Text',
      attrs: {
        text: '副标题',
        lineHeight: 1.5,
      },
      displayStyle: themeConfig.text_heading2,
      link: {
        tag: 'text_heading2',
      },
    },
    // {
    //   title: getElementDisplayName('text_heading3'),
    //   elementRef: 'Text',
    //   attrs: {
    //     text: '小标题',
    //     lineHeight: 1.5,
    //   },
    //   displayStyle: themeConfig.text_heading3,
    //   link: {
    //     tag: 'text_heading3',
    //   },
    // },
    {
      title: getElementDisplayName('text_body'),
      elementRef: 'Text',
      attrs: {
        text: '正文',
        lineHeight: 1.5,
      },
      displayStyle: themeConfig.text_body,
      link: {
        tag: 'text_body',
      },
    },
    {
      title: getElementDisplayName('text_desc'),
      elementRef: 'Text',
      attrs: {
        text: '描述',
        lineHeight: 1.5,
      },
      displayStyle: themeConfig.text_desc,
      link: {
        tag: 'text_desc',
      },
    },
    {
      title: getElementDisplayName('photo1'),
      elementRef: 'Picture',
      attrs: {},
      displayStyle: themeConfig.photo1,
      link: {
        tag: 'photo1',
      },
    },
    {
      title: getElementDisplayName('photo2'),
      elementRef: 'Picture',
      attrs: {},
      displayStyle: themeConfig.photo2,
      link: {
        tag: 'photo2',
      },
    },
    // {
    //   title: getElementDisplayName('photo3'),
    //   elementRef: 'Picture',
    //   attrs: {},
    //   displayStyle: themeConfig.photo3,
    //   link: {
    //     tag: 'photo3',
    //   },
    // },
    {
      title: getElementDisplayName('photo4'),
      elementRef: 'Picture',
      attrs: {},
      displayStyle: themeConfig.photo4,
      link: {
        tag: 'photo4',
      },
    },
  ];
};

export const getDefaultTheme2 = (): ThemeConfigV2 => {
  return {
    text_free: {},
    text_heading1: {
      fontSize: 32,
      lineHeight: 1.2,
      letterSpacing: 0,
    },
    text_heading2: {
      fontSize: 24,
      lineHeight: 1.3,
      letterSpacing: 0,
    },
    text_heading3: {
      fontSize: 20,
      lineHeight: 1.4,
      letterSpacing: 0,
    },
    text_body: {
      fontSize: 16,
      lineHeight: 1.5,
      letterSpacing: 0,
    },
    text_desc: {
      fontSize: 14,
      lineHeight: 1.4,
      letterSpacing: 0,
    },
    photo1: {},
    photo2: {},
    photo3: {},
    photo4: {},
    block: {},
    grid_root: {},
    grid_root_head: {},
    grid_root_content: {},
    grid_root_footer: {},
    grid_cell_root: {},
    grid_cell_2: {},
    list_root: {},
    list_cell_root: {},
    page: {},
    grid_main: {},
    grid_sub: {},
    grid_strong: {},
    grid_info: {},
    grid_free: {},
  };
};

export const getContainerTags = () => {
  return {
    page: '作品',
    block: '画布（Block）',
    grid_root: '容器（默认）',
    grid_main: '容器（主要）',
    grid_sub: '容器（次要）',
    grid_strong: '容器（强调）',
    grid_info: '容器（提示）',
    grid_free: '容器（自定义）',
    list_root: '容器（列表）-d',
    grid_root_head: '容器头部（上）-d',
    grid_root_content: '容器内容（中）-d',
    grid_root_footer: '容器底部（下）-d',
    grid_cell_root: '容器单元-d',
    grid_cell_2: '强调单元-d',
    list_cell_root: '列表单元-d',
  };
};

export const getTextElementTags = () => {
  return {
    text_free: '自定义文字',
    text_heading1: '大标题',
    text_heading2: '副标题',
    text_heading3: '小标题',
    text_body: '正文',
    text_desc: '描述文字',
  };
};

export const getPictureElementTags = () => {
  return {
    photo1: '图片强调',
    photo2: '图片次要',
    // photo3: '图片提示',
    photo4: '图片自定义(无样式)',
  };
};

export const getElementTags = () => {
  return {
    ...getTextElementTags(),
    ...getPictureElementTags(),
  };
};

// 获取元素显示名称
export const getElementDisplayName = (
  elementType: keyof ThemeConfigV2
): string => {
  const names = {
    ...getTextElementTags(),
    ...getPictureElementTags(),
    ...getContainerTags(),
  } as any;
  const res = names[elementType];
  if (res?.includes('-d')) {
    return res.replace('-d', '-已废弃，请更新');
  }
  return res || elementType || '无标签';
};

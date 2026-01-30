import { random } from '@/utils';
import { toast } from 'react-hot-toast';
import { getElementDisplayName } from '../../utils/const';
import { GridState, ThemeConfigV2 } from '../../types';
import { AddComponentParams } from '../../works-store/types';
import { GridRow } from '../../types';
import { demoPicUrl } from '../DesignerOperatorV2/const';
import GridTemplateFactory from './GridTemplate';

export interface IAddItem {
  title: string;
  icon?: React.ReactNode;
  attrs: any;
  elementRef: string;
  displayStyle?: React.CSSProperties;
  link: {
    tag: string;
  };
  action?: (item: IAddItem) => void;
  Component?: React.ComponentType<any>;
}

/**
 * 添加组件配置的上下文参数
 */
export interface AddConfigContext {
  /** 添加组件到画布 */
  addComponentV2: (params: {
    layer: AddComponentParams;
    toIndex?: number;
  }) => string | undefined;
  /** 添加行到根节点 */
  addRowToRootV2: (rows: GridRow[] | GridRow) => number[];
  /** 添加行到子节点 */
  addRowToRowChildV2: (rows: GridRow[] | GridRow) => number[] | undefined;
  /** 当前组件状态 */
  widgetStateV2: GridState;
  /** 设置组件状态 */
  setWidgetStateV2: (state: Partial<GridState>) => void;
}

/**
 * 添加项分类配置
 */
export interface AddCategory {
  title: string;
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  childrenFactory: () => IAddItem[];
  onAction: (item: IAddItem) => void;
}

/**
 * 创建添加配置的 handlers
 */
export const createAddHandlers = (context: AddConfigContext) => {
  const {
    addComponentV2,
    widgetStateV2,
    addRowToRowChildV2,
    setWidgetStateV2,
  } = context;

  return {
    // 基础元素处理器
    handleBasicElement: (addItem: IAddItem) => {
      if (
        !widgetStateV2.activeRowDepth ||
        widgetStateV2.activeRowDepth.length <= 1
      ) {
        toast.error('不能直接添加元素到画布');
        return;
      }
      if (addItem.elementRef === 'Text') {
        const compId = addComponentV2({
          layer: {
            elementRef: addItem.elementRef,
            attrs: {
              text: 'H1',
              ...addItem.attrs,
            },
            tag: addItem.link.tag,
          },
        });
        return compId;
      } else if (addItem.elementRef === 'Picture') {
        addComponentV2({
          layer: {
            elementRef: addItem.elementRef,
            attrs: {
              ...addItem.attrs,
              ossPath: demoPicUrl,
            },
            tag: addItem.link.tag,
          },
        });
        return;
      }
    },

    // 布局容器处理器
    handleLayoutContainer: (addItem: IAddItem) => {
      const newRowId = random();
      const newRowDepth = addRowToRowChildV2({
        ...addItem.attrs,
        id: newRowId,
        tag: addItem.link.tag as any,
        childrenIds: [],
        cells: [],
        children: addItem.attrs.children,
      });
      if (newRowDepth) {
        setWidgetStateV2({
          activeRowDepth: newRowDepth,
          editingElemId: undefined,
        });
      }
    },

    // 互动组件处理器
    handleInteractiveComponent: async (component: any) => {
      const elemId = addComponentV2({
        layer: {
          elementRef: component.elementRef,
          attrs: {
            ...component.attrs,
          },
        },
      });
      console.log('elemId', elemId);

      const timer = setInterval(() => {
        const hasComp = !!(window as any)[component.elementRef]?.$$typeof;
        if (hasComp) {
          clearInterval(timer);
          setWidgetStateV2({
            editingElemId: elemId,
          });
        }
      }, 100);
    },
  };
};

/**
 * 获取互动组件列表
 */
export const getInteractiveComponents = (
  handleInteractiveComponent: (component: any) => Promise<void>
): IAddItem[] => {
  const interactiveComponents = [
    // {
    //   title: '轮播图',
    //   elementRef: 'MkImageGroup_v2',
    //   attrs: {
    //     imageDataList: [],
    //     type: 'tiled',
    //     autoFlip: true,
    //     carouselType: 'default',
    //     flipFeq: 5000,
    //     editing: true,
    //   },
    //   link: {
    //     tag: 'interactive',
    //   },
    // },
    // {
    //   title: '回执(已废弃，请使用RSVP组件)',
    //   elementRef: 'MkHuiZhi',
    //   attrs: {
    //     inLayout: true,
    //     show: true,
    //   },
    //   formContent: {
    //     formName: '回执',
    //     fields: [
    //       {
    //         label: '姓名',
    //         id: 'name',
    //       },
    //       {
    //         label: '出席人数',
    //         id: 'guestCount',
    //       },
    //     ],
    //   },
    //   link: {
    //     tag: 'interactive',
    //   },
    // },
    {
      title: 'RSVP组件',
      elementRef: 'RSVP1',
      attrs: {},
      link: {
        tag: 'interactive',
      },
    },
    {
      title: '接力',
      elementRef: 'Relay',
      attrs: {},
      link: {
        tag: 'interactive',
      },
    },
    // {
    //   title: '弹幕',
    //   elementRef: 'MkBulletScreen_v2',
    //   attrs: {},
    //   link: {
    //     tag: 'interactive',
    //   },
    // },
    {
      title: '地图',
      elementRef: 'MkMapV4',
      attrs: {},
      link: {
        tag: 'interactive',
      },
    },
    {
      title: '日历',
      elementRef: 'MkCalendarV3',
      attrs: {},
      link: {
        tag: 'interactive',
      },
    },
  ];

  return interactiveComponents.map(component => ({
    ...component,
    action: () => handleInteractiveComponent(component),
  })) as IAddItem[];
};

export const getAddContainerThemeConfig = (
  themeConfig: ThemeConfigV2
): IAddItem[] => {
  return [
    ...GridTemplateFactory(themeConfig, {
      isRepeatList: false,
      labelPrefix: '容器',
    }),
    // ...GridTemplateFactory(themeConfig, {
    //   isRepeatList: true,
    //   labelPrefix: "列表",
    // }),
  ];
};

export const getAddPictureItemsByThemeConfig = (
  themeConfig: ThemeConfigV2
): IAddItem[] => {
  return [
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
    {
      title: getElementDisplayName('photo3'),
      elementRef: 'Picture',
      attrs: {},
      displayStyle: themeConfig.photo3,
      link: {
        tag: 'photo3',
      },
    },
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

export const getAddTextsByThemeConfig = (
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
  ];
};

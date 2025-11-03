import { formEntityServiceApi, getPageId, getUid } from '@mk/services';
import { random } from '@mk/utils';
import { Image, LayoutGrid, MessageCircle, Type } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ThemeConfigV2 } from '../../shared/types';
import { getElementDisplayName } from '../AddCompHelper/const';
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
}

// 统一的添加配置工厂函数
export const createAddConfigFactory = (
  themeConfig: ThemeConfigV2,
  context: any
) => {
  const {
    addComponentV2,
    editorCtx,
    widgetStateV2,
    addRowToRowChildV2,
    setWidgetStateV2,
  } = context;

  // 组件处理器实现
  const handlers = {
    // 基础元素处理器
    handleBasicElement: (addItem: IAddItem) => {
      if (widgetStateV2.activeRowDepth?.length <= 1) {
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
          },
          link: addItem.link,
        });
        return compId;
      } else if (addItem.elementRef === 'Picture') {
        editorCtx?.utils.showSelector({
          onSelected: (params: any) => {
            const { url, type, ossPath } = params;
            const compId = addComponentV2({
              layer: {
                elementRef: addItem.elementRef,
                attrs: {
                  ...addItem.attrs,
                  ossPath,
                },
              },
              link: addItem.link,
            });
            return compId;
          },
          type: 'picture',
        } as any);
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
      setWidgetStateV2({
        activeRowDepth: newRowDepth,
        editingElemId: undefined,
      });
    },

    // 互动组件处理器
    handleInteractiveComponent: async (component: any) => {
      let formRefId = '';

      if (component.formContent) {
        const res = await formEntityServiceApi.create({
          uid: +getUid(),
          works_id: getPageId(),
          type: component.elementRef,
          content: component.formContent,
        });

        if (res.data.formId) {
          formRefId = res.data.formId;
        }
      }

      const elemId = addComponentV2({
        layer: {
          elementRef: component.elementRef,
          attrs: {
            ...component.attrs,
            formRefId,
          },
        },
      });

      const timer = setInterval(() => {
        const hasComp = !!(window as any)[component.elementRef]?.$$typeof;
        if (hasComp) {
          clearInterval(timer);
          setWidgetStateV2({
            activeCellId: widgetStateV2.activeCellId,
            activeRowId: widgetStateV2.activeRowId,
            editingElemId: elemId,
          });
        }
      }, 100);
    },
  };

  // 返回完整的配置数组
  return [
    {
      title: '文字',
      icon: Type,
      childrenFactory: () =>
        getAddTextsByThemeConfig(themeConfig || ({} as any)),
      onAction: handlers.handleBasicElement,
    },
    {
      title: '图片',
      icon: Image,
      childrenFactory: () =>
        getAddPictureItemsByThemeConfig(themeConfig || ({} as any)),
      onAction: handlers.handleBasicElement,
    },
    {
      title: '布局',
      icon: LayoutGrid,
      childrenFactory: () => [
        ...getAddContainerThemeConfig(themeConfig || ({} as any)),
      ],
      onAction: handlers.handleLayoutContainer,
    },
    {
      title: '互动组件',
      icon: MessageCircle,
      childrenFactory: () => {
        const interactiveComponents = [
          {
            title: '轮播图',
            elementRef: 'MkImageGroup_v2',
            attrs: {
              imageDataList: [],
              type: 'tiled',
              autoFlip: true,
              carouselType: 'default',
              flipFeq: 5000,
              editing: true,
            },
          },
          {
            title: '回执',
            elementRef: 'MkHuiZhi',
            attrs: {
              inLayout: true,
              show: true,
            },
            formContent: {
              formName: '回执',
              fields: [
                {
                  label: '姓名',
                  id: 'name',
                },
                {
                  label: '出席人数',
                  id: 'guestCount',
                },
              ],
            },
          },
          {
            title: '弹幕',
            elementRef: 'MkBulletScreen_v2',
            attrs: {},
          },
          {
            title: '地图',
            elementRef: 'MkMapV4',
            attrs: {},
          },
          {
            title: '日历',
            elementRef: 'MkCalendarV3',
            attrs: {},
          },
        ];

        return interactiveComponents.map(component => ({
          ...component,
          action: () => handlers.handleInteractiveComponent(component),
        })) as any;
      },
    },
  ];
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
    {
      title: getElementDisplayName('text_heading3'),
      elementRef: 'Text',
      attrs: {
        text: '小标题',
        lineHeight: 1.5,
      },
      displayStyle: themeConfig.text_heading3,
      link: {
        tag: 'text_heading3',
      },
    },
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

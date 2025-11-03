import React, { useEffect } from 'react';
import { ThemeConfigV2 } from '../../shared/types';
import { ScrollArea } from '@workspace/ui/components/scroll-area';
import { SelectableElement } from './types';
import { blockStyleFilter } from '../../shared/styleHelper';
import {
  takeBgAttrs,
  takeInnerStyle,
  takeLayoutWrapperStyle,
  WidgetItemRenderer,
} from '../../comp/WidgetItemRendererV1';
import ContainerWithBg from '../../comp/ContainerWithBg';
import {
  getElementDisplayName,
  getAddItemsByThemeConfig,
} from '../AddCompHelper/const';
import { LayerElemItem } from '@mk/works-store/types';

const demoImg = `/cdn/jiantie/works-resources/605188792/works/ZO0ORP6A_605188792/98248398365956_b8094d.png?x-oss-process=image%2Fresize%2Cm_lfit%2Cw_1200%2Cimage%2Fformat%2Cwebp`;

interface ThemePreviewProps {
  theme: ThemeConfigV2;
  onElementSelect?: (element: SelectableElement) => void;
  selectedElement?: SelectableElement;
}

// 创建可点击的元素包装器
const ClickableElement = ({
  selectedElement,
  onElementSelect,
  elementType,
  children,
  className = '',
  style = {},
}: {
  selectedElement?: SelectableElement;
  onElementSelect?: (element: SelectableElement) => void;
  elementType: SelectableElement;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) => {
  const isSelected = selectedElement === elementType;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡
    onElementSelect?.(elementType);
  };

  return (
    <div
      className={`cursor-pointer hover:ring-1 hover:ring-blue-500 ${
        isSelected ? 'ring-1 ring-blue-700' : ''
      } ${className}`}
      style={style}
      onClick={handleClick}
      title={`点击编辑 ${getElementDisplayName(elementType)}`}
    >
      {children}
    </div>
  );
};

export default function ThemePreview({
  theme,
  onElementSelect,
  selectedElement,
}: ThemePreviewProps) {
  useEffect(() => {
    console.log('theme', theme);
  }, [theme]);

  const addItems = getAddItemsByThemeConfig(theme);
  const textItems = addItems.filter(item => item.elementRef === 'Text');
  const pictureItems = addItems.filter(item => item.elementRef === 'Picture');

  return (
    <div className='w-full flex flex-col h-full'>
      {/* 固定标题区域 */}
      <div className='flex-shrink-0 p-2 border-b border-gray-200 bg-white'>
        <div className='flex items-center gap-2'>
          <h2 className='text-base font-semibold text-gray-900'>风格预览</h2>
          <span className='text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded'>
            {selectedElement
              ? `已选择: ${getElementDisplayName(selectedElement)}`
              : '未选择'}
          </span>
        </div>
      </div>

      {/* 可滚动预览区域 */}
      <ScrollArea className='flex-1 overflow-y-auto min-h-0 bg-gray-50'>
        <ContainerWithBg
          className='preview-container'
          style={blockStyleFilter({
            ...theme.page,
            margin: '0 auto',
            width: 375,
            minHeight: 500,
            padding: 0.1,
            boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.05)',
          })}
        >
          <ContainerWithBg
            className='Block_DEMO relative'
            style={{
              ...blockStyleFilter({
                ...theme.block,
              }),
            }}
          >
            <span className='text-sm text-gray-500'>Block 1 基础元素</span>
            <ContainerWithBg
              className='Row_DEMO'
              style={{
                ...blockStyleFilter({
                  ...theme.grid_root,
                }),
              }}
            >
              <div className='Grid_DEMO text-sm text-gray-500'>Grid1</div>
              {textItems.map(item => {
                const currThemeStyle = theme[
                  item.link.tag as keyof ThemeConfigV2
                ] as any;
                return (
                  <ClickableElement
                    selectedElement={selectedElement}
                    onElementSelect={onElementSelect}
                    elementType={item.link.tag as SelectableElement}
                    key={item.link.tag}
                  >
                    <WidgetItemRenderer
                      layer={{
                        elementRef: item.elementRef,
                        elemId: item.link.tag,
                        type: 'element',
                        attrs: {
                          ...item.attrs,
                          ...currThemeStyle,
                          layoutStyle: {
                            ...takeInnerStyle(currThemeStyle),
                            ...takeLayoutWrapperStyle(currThemeStyle),
                            ...takeBgAttrs(currThemeStyle),
                          },
                        } as any,
                      }}
                      elemId={item.link.tag}
                      readonly={true}
                    />
                  </ClickableElement>
                );
              })}
            </ContainerWithBg>

            <ContainerWithBg
              className='Row_DEMO'
              style={{
                ...blockStyleFilter({
                  ...theme.grid_root,
                }),
              }}
            >
              <div className='Grid_DEMO text-sm text-gray-500'>Grid2</div>
              {/* 图片预览 */}
              <div className='flex gap-2'>
                {pictureItems.map(item => {
                  const currThemeStyle = theme[
                    item.link.tag as keyof ThemeConfigV2
                  ] as any;
                  const layerAttrs = {
                    elementRef: 'Picture',
                    elemId: item.link.tag,
                    type: 'element',
                    attrs: {
                      ossPath: demoImg,
                      ...item.attrs,
                      layoutStyle: {
                        ...takeInnerStyle(currThemeStyle),
                        ...takeLayoutWrapperStyle(currThemeStyle),
                        ...takeBgAttrs(currThemeStyle),
                      },
                    },
                  } as LayerElemItem;
                  return (
                    <div className='flex flex-col' key={item.link.tag}>
                      <ClickableElement
                        selectedElement={selectedElement}
                        onElementSelect={onElementSelect}
                        elementType={item.link.tag as SelectableElement}
                      >
                        <WidgetItemRenderer
                          layer={layerAttrs}
                          elemId={item.link.tag}
                          readonly={true}
                        />
                      </ClickableElement>
                      <span className='text-sm text-gray-500'>
                        {item.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </ContainerWithBg>
          </ContainerWithBg>
          <ContainerWithBg
            className='Block_DEMO relative'
            style={{
              ...blockStyleFilter({
                ...theme.block,
              }),
            }}
          >
            <span className='text-sm text-gray-500 relative z-10'>
              Block 2 网格布局
            </span>
            <div
              className='Row_DEMO relative z-10'
              style={{
                ...blockStyleFilter({
                  ...theme.grid_root,
                }),
              }}
            >
              <span className='text-sm text-gray-500'>1xN 网格</span>
              <div
                className='Cell_DEMO'
                style={{
                  ...blockStyleFilter({
                    ...theme.grid_cell_root,
                  }),
                }}
              >
                <span>网格单元1</span>
                <span>网格单元2</span>
              </div>
              <div
                className='Cell_DEMO'
                style={{
                  ...blockStyleFilter({
                    ...theme.grid_cell_root,
                  }),
                }}
              >
                <span>网格单元3</span>
                <span>网格单元4</span>
              </div>
            </div>
          </ContainerWithBg>
          <ContainerWithBg
            className='Block_DEMO relative'
            style={{
              ...blockStyleFilter({
                ...theme.block,
              }),
            }}
          >
            <span className='text-sm text-gray-500 relative z-10'>
              Block 3 列表布局
            </span>
            <div
              className='List_DEMO relative z-10'
              style={{
                ...blockStyleFilter({
                  ...theme.list_root,
                }),
              }}
            >
              <span className='text-sm text-gray-500'>1xN 列表</span>
              <div
                className='Cell_DEMO'
                style={{
                  ...blockStyleFilter({
                    ...theme.list_cell_root,
                  }),
                }}
              >
                <span>列表单元1</span>
                <span>列表单元2</span>
              </div>
              <div
                className='Cell_DEMO'
                style={{
                  ...blockStyleFilter({
                    ...theme.list_cell_root,
                  }),
                }}
              >
                <span>列表单元1</span>
                <span>列表单元2</span>
              </div>
            </div>
          </ContainerWithBg>
          <ContainerWithBg
            className='Block_DEMO relative'
            style={{
              ...blockStyleFilter({
                ...theme.block,
              }),
            }}
          >
            <span className='text-sm text-gray-500 relative z-10'>
              Block 4 布局拼装
            </span>
            <div
              className='Grid_DEMO relative z-10'
              style={{
                ...blockStyleFilter({
                  ...theme.grid_root_head,
                }),
              }}
            >
              <span className='text-sm text-gray-500'>通用网格头部</span>
              <div
                className='Cell_DEMO'
                style={{
                  ...blockStyleFilter({
                    ...theme.grid_cell_root,
                  }),
                }}
              >
                <span>通用网格头部单元1</span>
              </div>
            </div>
            <div
              className='List_DEMO relative z-10'
              style={{
                ...blockStyleFilter({
                  ...theme.grid_root_content,
                }),
              }}
            >
              <div
                className='Cell_DEMO'
                style={{
                  ...blockStyleFilter({
                    ...theme.grid_cell_root,
                  }),
                }}
              >
                <span>通用网格内容</span>
              </div>
            </div>
            <div
              className='List_DEMO relative z-10'
              style={{
                ...blockStyleFilter({
                  ...theme.grid_root_footer,
                }),
              }}
            >
              <div
                className='Cell_DEMO'
                style={{
                  ...blockStyleFilter({
                    ...theme.grid_cell_root,
                  }),
                }}
              >
                <span>通用网格底部</span>
              </div>
            </div>
          </ContainerWithBg>
        </ContainerWithBg>
      </ScrollArea>
    </div>
  );
}

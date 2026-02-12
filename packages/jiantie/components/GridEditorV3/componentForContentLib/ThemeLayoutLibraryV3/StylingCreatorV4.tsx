import { LayerElemItem } from '@/components/GridEditorV3/works-store/types';
import { deepClone } from '@/utils';
import { Button } from '@workspace/ui/components/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { ScrollArea } from '@workspace/ui/components/scroll-area';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@workspace/ui/components/tabs';
import { observer } from 'mobx-react';
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import ContainerWithBgV2 from '../../AppV2/ContainerWithBgV2';
import WidgetItemRendererV2, {
  takeInnerStyle,
  takeLayoutWrapperStyle,
  takeTextStyle,
} from '../../AppV2/WidgetItemRendererV2';
import PictureSetting from '../../components/Picture/PictureSetting';
import TextSettingForDesigner from '../../components/Text/TextSettingForDesigner';
import StyleCustomSetting from '../../componentsForEditor/ElementAttrsEditorV2/StyleSetting';
import { SelectableElement } from '../../componentsForEditor/types';
import { mergeDeep2 } from '../../provider/utils';
import { GridRow, noTakeTag, ThemeConfigV2 } from '../../types';
import {
  getAddItemsByThemeConfig,
  getContainerTags,
  getDefaultTheme2,
  getElementDisplayName,
} from '../../utils/const';
import { blockStyleFilter } from '../../utils/styleHelper';
import { useWorksStore } from '../../works-store/store/hook';
import { MaterialItem } from '../MaterialResourceManager/services';

const demoImg = `/cdn/jiantie/works-resources/605188792/works/ZO0ORP6A_605188792/98248398365956_b8094d.png?x-oss-process=image%2Fresize%2Cm_lfit%2Cw_1200%2Cimage%2Fformat%2Cwebp`;

interface StylingCreatorProps {
  themeItem?: MaterialItem<ThemeConfigV2>;
  onSave?: (theme: ThemeConfigV2, saveAsNew?: boolean) => void;
  onCancel?: () => void;
}

interface ClickableElementProps {
  selectedElement?: SelectableElement;
  onElementSelect?: (element: SelectableElement) => void;
  elementType: SelectableElement;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  currentTheme: ThemeConfigV2;
  updateElemStyle: (type: SelectableElement, updates: any) => void;
  selectedGridType: string;
}

// 独立的 ClickableElement 组件
const ClickableElement = ({
  selectedElement,
  onElementSelect,
  elementType,
  children,
  className = '',
  style = {},
  currentTheme,
  updateElemStyle,
  selectedGridType,
}: ClickableElementProps) => {
  const isSelected = selectedElement === elementType;
  const [open, setOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(true);
    onElementSelect?.(elementType);
  };

  const createElemAttrs = (type: SelectableElement) => {
    const textConfig = currentTheme[type as keyof ThemeConfigV2] as any;
    return textConfig || {};
  };

  const renderElemSettingPanel = (type: SelectableElement) => {
    const themeStyle = currentTheme[type as keyof ThemeConfigV2] as any;
    if (/text/gi.test(type)) {
      return (
        <>
          <TextSettingForDesigner
            attrs={createElemAttrs(type)}
            onChange={nextVal => {
              console.log('type', type);
              console.log('nextVal', nextVal);
              updateElemStyle(type as any, nextVal);
            }}
          />
          <StyleCustomSetting
            useFrontground={false}
            useTransform={false}
            key={`text_${type}`}
            style={{
              ...(themeStyle.layoutStyle || {}),
            }}
            onChange={nextVal => {
              console.log('nextVal', nextVal);
              updateElemStyle(type as any, {
                layoutStyle: {
                  ...(themeStyle.layoutStyle || {}),
                  ...nextVal,
                },
              });
            }}
          />
        </>
      );
    } else if (/photo/gi.test(type)) {
      return (
        <>
          <PictureSetting
            attrs={createElemAttrs(type)}
            elemId={selectedElement as string}
            canChangeImage={false}
            onChange={nextVal => {
              updateElemStyle(type as any, {
                layoutStyle: {
                  ...(themeStyle.layoutStyle || {}),
                  ...nextVal,
                },
              });
            }}
          />
          <StyleCustomSetting
            useFrontground={true}
            useTransform={false}
            key={`photo_${type}`}
            style={{
              ...(themeStyle.layoutStyle || {}),
            }}
            onChange={nextVal => {
              updateElemStyle(type as any, {
                layoutStyle: {
                  ...(themeStyle.layoutStyle || {}),
                  ...nextVal,
                },
              });
            }}
          />
        </>
      );
    } else {
      return (
        <>
          <StyleCustomSetting
            useFrontground={true}
            useTransform={false}
            key={`container_${selectedGridType}`}
            style={currentTheme[selectedGridType as keyof ThemeConfigV2] || {}}
            onChange={nextVal => {
              console.log('nextVal', nextVal);
              updateElemStyle(selectedGridType as any, {
                ...nextVal,
              });
            }}
          />
        </>
      );
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className={`cursor-pointer hover:ring-1 hover:ring-blue-500 ${isSelected ? 'ring-1 ring-blue-700' : ''
            } ${className}`}
          style={style}
          onClick={handleClick}
          title={`点击编辑 ${getElementDisplayName(elementType)}`}
        >
          {children}
        </div>
      </PopoverTrigger>
      <PopoverContent align='center' side='right' className='p-2'>
        <div className='max-h-[80vh] overflow-y-auto'>
          {open && renderElemSettingPanel(elementType)}
        </div>
      </PopoverContent>
    </Popover>
  );
};

function StylingCreatorV4({
  themeItem: themeItemProp,
  onSave,
  onCancel,
}: StylingCreatorProps) {
  const worksStore = useWorksStore();
  const { worksData, getStyleByTag2 } = worksStore;
  const { gridProps } = worksData;
  const { gridsData } = gridProps;
  const themeConfig = gridProps.themeConfig2;

  const { getActiveRootRow } = worksStore.gridPropsOperator;
  const themeContent = themeItemProp?.content || themeConfig;
  const [currentTheme, setCurrentTheme] = useState<ThemeConfigV2>(
    mergeDeep2(getDefaultTheme2(), themeContent)
  );
  const containerTags = getContainerTags();
  const [selectedElement, setSelectedElement] =
    useState<SelectableElement>('text_heading1');
  const [selectedGridType, setSelectedGridType] =
    useState<keyof typeof containerTags>('grid_root');
  const [selectedTab, setSelectedTab] = useState<
    'element' | 'container' | 'color'
  >('element');

  const takeStyle = (): ThemeConfigV2 => {
    const styleRes = {
      page: gridProps.style || {},
    } as ThemeConfigV2;
    const defaultStyle = getDefaultTheme2();
    const breadthFirstTakeStyle = (rootRow: GridRow) => {
      // 广度优先递归，优先提取同级Grid的样式
      const queue: GridRow[] = [rootRow];

      while (queue.length > 0) {
        const currentRow = queue.shift()!;
        const rowTag = currentRow.tag as keyof ThemeConfigV2;

        // 处理当前节点的样式
        if (
          !styleRes[rowTag] &&
          currentRow.style &&
          Object.values(currentRow.style).length > 0 &&
          rowTag &&
          !noTakeTag.includes(rowTag)
        ) {
          styleRes[rowTag] = {
            ...getStyleByTag2(rowTag),
            ...(currentRow.style || {}),
          };
          delete (styleRes[rowTag] as any)?.alignItems;
          delete (styleRes[rowTag] as any)?.justifyContent;
          delete (styleRes[rowTag] as any)?.display;
          delete (styleRes[rowTag] as any)?.flexDirection;
          delete (styleRes[rowTag] as any)?.height;
          delete (styleRes[rowTag] as any)?.width;
        }

        // 将直接子节点加入队列
        if (currentRow.children?.length) {
          queue.push(...currentRow.children);
        }

        // 处理 childrenIds 中的节点
        if (currentRow.childrenIds?.length) {
          for (const childId of currentRow.childrenIds) {
            const layer = worksStore.getLayer(childId);
            const layerTag = layer?.tag as keyof ThemeConfigV2;
            if (
              !styleRes[layerTag] &&
              layer &&
              !layer.attrs.disabledToEdit &&
              layerTag &&
              !noTakeTag.includes(layerTag)
            ) {
              styleRes[layerTag] = {
                ...getStyleByTag2(layerTag),
                ...(takeLayoutWrapperStyle(layer.attrs as any) || {}),
                ...(takeInnerStyle(layer.attrs as any) || {}),
                ...(takeTextStyle(layer.attrs as any) || {}),
                layoutStyle: {
                  ...takeLayoutWrapperStyle(layer.attrs.layoutStyle || {}),
                  ...takeInnerStyle(layer.attrs.layoutStyle || {}),
                  ...takeTextStyle(layer.attrs.layoutStyle || {}),
                  width: 'auto',
                  height: 'auto',
                },
              };
            }
          }
        }
      }
    };
    const activeRootRow = getActiveRootRow();
    if (activeRootRow) {
      breadthFirstTakeStyle(activeRootRow);
      toast.success(`提取了画布${activeRootRow.name}的样式`);
    } else {
      gridsData.forEach(grid => {
        breadthFirstTakeStyle(grid);
      });
      toast.success(`提取了所有画布的样式`);
    }
    return mergeDeep2({}, defaultStyle, styleRes);
  };

  // 更新文本样式
  const updateElemStyle = (type: SelectableElement, updates: any) => {
    console.log('updateElemStyle', type, updates);
    // 直接更新主题，让blockStyleFilter来处理单位
    const newTheme = {
      ...currentTheme,
      [type]: { ...currentTheme[type], ...updates },
    };
    setCurrentTheme(newTheme);
  };

  // 保存主题
  const handleSave = async () => {
    // onSave?.(currentTheme, false);
    const saveTheme = {
      ...themeContent,
      ...deepClone(currentTheme),
    };
    setCurrentTheme(saveTheme);
    worksStore.setGridProps({
      themeConfig2: saveTheme,
      _updateVersion: (gridProps._updateVersion || 0) + 1,
    });
    worksStore.themePackV3Operator.syncContentToMaterialItem();
    onSave?.(currentTheme, false);
  };

  // 取消编辑
  const handleCancel = () => {
    setCurrentTheme(themeContent as ThemeConfigV2);
    onCancel?.();
  };

  const renderPreviewPanel = () => {
    const addItems = getAddItemsByThemeConfig(currentTheme);
    const textItems = addItems.filter(item => item.elementRef === 'Text');
    const pictureItems = addItems.filter(item => item.elementRef === 'Picture');
    const containerTags = getContainerTags();
    return (
      <Tabs
        value={selectedTab}
        // className='h-full overflow-hidden flex justify-start'
        onValueChange={value => {
          setSelectedTab(value as 'element' | 'container');
        }}
      >
        <TabsList>
          <TabsTrigger value='element' className='flex-1'>
            元素
          </TabsTrigger>
          <TabsTrigger value='container' className='flex-1'>
            容器
          </TabsTrigger>
        </TabsList>
        <TabsContent value='element' className='flex-1 overflow-hidden'>
          <ScrollArea className='flex-1 overflow-y-auto min-h-0 bg-gray-50 max-h-[70vh]'>
            <ContainerWithBgV2
              className='preview-container'
              style={blockStyleFilter({
                ...currentTheme.page,
                margin: '12px auto',
                width: '100%',
                minHeight: 500,
                padding: '0.1',
                boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.05)',
              })}
            >
              <ContainerWithBgV2
                className='Block_DEMO relative gap-2'
                style={{
                  ...blockStyleFilter({
                    ...currentTheme.block,
                  }),
                }}
              >
                <ContainerWithBgV2
                  className='Row_DEMO gap-2'
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    margin: 20,
                  }}
                >
                  {textItems.map(item => {
                    const currThemeStyle = currentTheme[
                      item.link.tag as keyof ThemeConfigV2
                    ] as any;
                    const layer = {
                      elementRef: item.elementRef,
                      elemId: item.link.tag,
                      type: 'element',
                      attrs: {
                        _v: Math.random(),
                        ...item.attrs,
                        ...currThemeStyle,
                        ...takeTextStyle(currThemeStyle),
                        layoutStyle: {
                          ...takeInnerStyle(currThemeStyle.layoutStyle),
                          ...takeLayoutWrapperStyle(currThemeStyle.layoutStyle),
                        },
                      } as any,
                    } as LayerElemItem;
                    return (
                      <ClickableElement
                        selectedElement={selectedElement}
                        onElementSelect={(element: SelectableElement) =>
                          setSelectedElement(element)
                        }
                        elementType={item.link.tag as SelectableElement}
                        key={item.link.tag}
                        currentTheme={currentTheme}
                        updateElemStyle={updateElemStyle}
                        selectedGridType={selectedGridType}
                      >
                        <WidgetItemRendererV2 layer={layer} readonly={true} />
                      </ClickableElement>
                    );
                  })}
                </ContainerWithBgV2>

                <ContainerWithBgV2
                  className='Row_DEMO'
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 20,
                    margin: 20,
                  }}
                >
                  <div className='Grid_DEMO text-sm text-gray-500'>
                    图片设置
                  </div>
                  {/* 图片预览 */}
                  <div className='grid grid-cols-2 gap-2'>
                    {pictureItems.map(item => {
                      const currThemeStyle = currentTheme[
                        item.link.tag as keyof ThemeConfigV2
                      ] as any;
                      const layerAttrs = {
                        elementRef: 'Picture',
                        elemId: item.link.tag,
                        type: 'element',
                        attrs: {
                          ossPath: demoImg,
                          ...item.attrs,
                          _v: Math.random(),
                          layoutStyle: {
                            ...takeInnerStyle(currThemeStyle.layoutStyle),
                            ...takeLayoutWrapperStyle(
                              currThemeStyle.layoutStyle
                            ),
                          },
                        },
                      } as LayerElemItem;
                      return (
                        <div className='flex flex-col' key={item.link.tag}>
                          <ClickableElement
                            selectedElement={selectedElement}
                            onElementSelect={(element: SelectableElement) =>
                              setSelectedElement(element)
                            }
                            elementType={item.link.tag as SelectableElement}
                            currentTheme={currentTheme}
                            updateElemStyle={updateElemStyle}
                            selectedGridType={selectedGridType}
                          >
                            <WidgetItemRendererV2
                              layer={layerAttrs}
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
                </ContainerWithBgV2>
              </ContainerWithBgV2>
            </ContainerWithBgV2>
          </ScrollArea>
        </TabsContent>
        <TabsContent value='container' className='flex-1 overflow-hidden m-0'>
          <ScrollArea className='h-full overflow-y-auto min-h-0 bg-gray-50'>
            <ContainerWithBgV2
              className='preview-container'
              style={blockStyleFilter({
                ...currentTheme.page,
                margin: '0 auto',
                width: '100%',
                minHeight: 500,
                padding: `20px 0`,
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 20,
              })}
            >
              {Object.keys(containerTags).map(tag => {
                const tagName =
                  containerTags[tag as keyof typeof containerTags];
                if (tagName.includes('-d')) {
                  return null;
                }
                const isActive = selectedGridType === tag;
                return (
                  <ClickableElement
                    selectedElement={selectedElement}
                    onElementSelect={(element: SelectableElement) =>
                      setSelectedElement(element)
                    }
                    elementType={tag as SelectableElement}
                    currentTheme={currentTheme}
                    updateElemStyle={updateElemStyle}
                    selectedGridType={selectedGridType}
                    style={{
                      margin: 20,
                    }}
                    key={tag}
                  >
                    <ContainerWithBgV2
                      className='Block_DEMO relative hover:ring-1 hover:ring-blue-500 cursor-pointer'
                      style={{
                        ...blockStyleFilter({
                          ...(currentTheme[tag as keyof ThemeConfigV2] as any),
                        }),
                        outline: isActive ? '2px solid #3383f3' : 'none',
                        height: '100px',
                        minHeight: '100px',
                        width: '100px',
                        padding: 4,
                      }}
                      onClick={() => {
                        setSelectedGridType(tag as any);
                      }}
                    >
                      <div className='text-black font-bold px-2 mb-2 relative z-10'>
                        {tagName}
                      </div>
                    </ContainerWithBgV2>
                  </ClickableElement>
                );
              })}
            </ContainerWithBgV2>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    );
  };

  return (
    <div className='flex flex-col max-h-full'>
      <div className='flex flex-1 overflow-auto' title='预览面板'>
        {/* 左侧预览面板 */}
        {renderPreviewPanel()}
      </div>
      {/* 底部按钮区域 */}
      <div className='flex-shrink-0 p-3 border-t border-gray-200 bg-white sticky bottom-0 z-10'>
        <div className='flex items-center justify-end gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              setCurrentTheme(getDefaultTheme2());
            }}
            className='text-sm'
          >
            恢复默认
          </Button>
          <Button
            className='trggier px-2'
            size='sm'
            variant='outline'
            style={{
              pointerEvents: 'auto',
            }}
            onClick={e => {
              const style = takeStyle();
              console.log('提取风格V4', style);
              setCurrentTheme(style);
            }}
          >
            提取风格
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={handleCancel}
            className='text-sm'
          >
            取消
          </Button>
          <Button size='sm' onClick={handleSave} className='text-sm'>
            保存
          </Button>
        </div>
      </div>
    </div>
  );
}
export default observer(StylingCreatorV4);

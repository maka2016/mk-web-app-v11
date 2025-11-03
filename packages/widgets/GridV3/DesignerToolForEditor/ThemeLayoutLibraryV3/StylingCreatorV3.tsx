import { deepClone } from '@mk/utils';
import { LayerElemItem } from '@mk/works-store/types';
import { Button } from '@workspace/ui/components/button';
import { Label } from '@workspace/ui/components/label';
import {
  RadioGroup,
  RadioGroupItem,
} from '@workspace/ui/components/radio-group';
import { ScrollArea } from '@workspace/ui/components/scroll-area';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@workspace/ui/components/tabs';
import React, { useState } from 'react';
import ContainerWithBgV2 from '../../comp/ContainerWithBgV2';
import { useGridContext } from '../../comp/provider';
import { mergeDeep2 } from '../../comp/provider/utils';
import WidgetItemRendererV2, {
  takeInnerStyle,
  takeLayoutWrapperStyle,
  takeTextStyle,
} from '../../comp/WidgetItemRendererV2';
import ColorSetting from '../../shared/ColorPicker/ColorSetting';
import { blockStyleFilter } from '../../shared/styleHelper';
import { GridRow, noTakeTag, ThemeConfigV2 } from '../../shared/types';
import {
  getAddItemsByThemeConfig,
  getContainerTags,
  getDefaultTheme2,
  getElementDisplayName,
} from '../AddCompHelper/const';
import PictureSetting from '../ElementAttrsEditorV2/PictureSetting';
import StyleCustomSetting from '../ElementAttrsEditorV2/StyleSetting';
import TextSetting from '../ElementAttrsEditorV2/TextSetting';
import { MaterialItem } from '../MaterialResourceManager/services';
import { SelectableElement } from '../StylingManager/types';

const demoImg = `/cdn/jiantie/works-resources/605188792/works/ZO0ORP6A_605188792/98248398365956_b8094d.png?x-oss-process=image%2Fresize%2Cm_lfit%2Cw_1200%2Cimage%2Fformat%2Cwebp`;

interface StylingCreatorProps {
  themeItem?: MaterialItem<ThemeConfigV2>;
  onSave?: (theme: ThemeConfigV2, saveAsNew?: boolean) => void;
  onCancel?: () => void;
}

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

export default function StylingCreatorV3({
  themeItem: themeItemProp,
  onSave,
  onCancel,
}: StylingCreatorProps) {
  const { editorSDK, themeConfig, gridProps, gridsData, getStyleByTag2 } =
    useGridContext();
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
  // 更新主题配置
  const updateTheme = (updates: Partial<ThemeConfigV2>) => {
    const newTheme = { ...currentTheme, ...updates };
    setCurrentTheme(newTheme);
  };

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
        }

        // 将直接子节点加入队列
        if (currentRow.children?.length) {
          queue.push(...currentRow.children);
        }

        // 处理 childrenIds 中的节点
        if (currentRow.childrenIds?.length) {
          for (const childId of currentRow.childrenIds) {
            const layerLink = editorSDK?.getLink(childId);
            const layer = editorSDK?.getLayer(childId);
            const layerTag = layerLink?.tag as keyof ThemeConfigV2;
            if (
              !styleRes[layerTag] &&
              layer &&
              !layer.attrs.disabledToEdit &&
              layerLink &&
              layerTag &&
              !noTakeTag.includes(layerTag)
            ) {
              styleRes[layerTag] = {
                ...getStyleByTag2(layerTag),
                ...(takeLayoutWrapperStyle(layer.attrs) || {}),
                ...(takeInnerStyle(layer.attrs) || {}),
                ...(takeTextStyle(layer.attrs) || {}),
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
    gridsData.forEach(grid => {
      breadthFirstTakeStyle(grid);
    });
    return mergeDeep2({}, defaultStyle, styleRes);
  };

  // 更新文本样式
  const updateElemStyle = (type: SelectableElement, updates: any) => {
    // 直接更新主题，让blockStyleFilter来处理单位
    updateTheme({
      [type]: { ...currentTheme[type], ...updates },
    });
  };

  // 保存主题
  const handleSave = async () => {
    // onSave?.(currentTheme, false);
    const saveTheme = {
      ...themeContent,
      ...deepClone(currentTheme),
    };
    setCurrentTheme(saveTheme);
    editorSDK?.onFormValueChange({
      themeConfig2: saveTheme,
    });
    onSave?.(currentTheme, false);
  };

  // 取消编辑
  const handleCancel = () => {
    setCurrentTheme(themeContent);
    onCancel?.();
  };

  const createElemAttrs = (type: SelectableElement) => {
    const textConfig = currentTheme[type as keyof ThemeConfigV2] as any;

    // 直接返回文字配置
    return textConfig || {};
  };

  const renderElemSettingPanel = (type: SelectableElement) => {
    const isPhoto = /photo/gi.test(type);
    return (
      <div key={`TextSetting_${type}`} className='flex-1 overflow-hidden'>
        <Tabs
          value={selectedTab}
          className='h-full flex flex-col'
          onValueChange={value => {
            console.log('value', value);
            setSelectedTab(value as 'element' | 'container' | 'color');
          }}
        >
          <div className='flex-1 overflow-y-auto'>
            <TabsContent value='element'>
              {isPhoto ? (
                <PictureSetting
                  attrs={(currentTheme[type] || {}) as any}
                  onChange={nextVal => {
                    updateTheme({
                      [type]: {
                        ...currentTheme[type],
                        ...nextVal,
                      },
                    });
                  }}
                />
              ) : (
                <TextSetting
                  attrs={createElemAttrs(type)}
                  onChange={nextVal => {
                    updateElemStyle(type as any, nextVal);
                  }}
                />
              )}
              <StyleCustomSetting
                useFrontground={false}
                showAutoLayout={false}
                showPositioning={true}
                style={(currentTheme[type] as any)?.layoutStyle || {}}
                onChange={nextVal => {
                  updateElemStyle(type, {
                    ...(currentTheme[type] as any)?.layoutStyle,
                    ...nextVal,
                  });
                }}
              />
            </TabsContent>
            <TabsContent value='container'>
              <div className='flex flex-col gap-2 p-2'>
                <Label>选择网格类型</Label>
                <RadioGroup
                  value={selectedGridType}
                  onValueChange={value => setSelectedGridType(value as any)}
                  className='flex-1 flex flex-wrap gap-2'
                >
                  {(() => {
                    return Object.keys(containerTags)
                      .filter(
                        item =>
                          !containerTags[
                            item as keyof typeof containerTags
                          ].includes('-d')
                      )
                      .map(item => {
                        const name =
                          containerTags[item as keyof typeof containerTags];
                        return (
                          <div className='flex items-center gap-1' key={item}>
                            <RadioGroupItem value={item} id={item} />
                            <Label htmlFor={item}>{name}</Label>
                          </div>
                        );
                      });
                  })()}
                </RadioGroup>
              </div>
              <StyleCustomSetting
                useFrontground={true}
                key={`${selectedGridType}`}
                style={currentTheme[selectedGridType] || {}}
                onChange={nextVal => {
                  console.log('nextVal', nextVal);
                  updateTheme({
                    [selectedGridType]: {
                      ...currentTheme[selectedGridType],
                      ...nextVal,
                    },
                  });
                }}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    );
  };

  const renderPreviewPanel = () => {
    const addItems = getAddItemsByThemeConfig(currentTheme);
    const textItems = addItems.filter(item => item.elementRef === 'Text');
    const pictureItems = addItems.filter(item => item.elementRef === 'Picture');
    const containerTags = getContainerTags();
    return (
      <Tabs
        value={selectedTab}
        className='h-full overflow-hidden flex justify-start'
        onValueChange={value => {
          setSelectedTab(value as 'element' | 'container' | 'color');
        }}
      >
        <TabsList className='flex flex-col h-auto justify-start self-start gap-2 py-1 m-1 items-stretch'>
          <TabsTrigger value='element' className='flex-1'>
            元素
          </TabsTrigger>
          <TabsTrigger value='container' className='flex-1'>
            容器
          </TabsTrigger>
          <TabsTrigger value='color' className='flex-1'>
            颜色
          </TabsTrigger>
        </TabsList>
        <TabsContent value='element' className='flex-1 overflow-hidden'>
          <ScrollArea className='flex-1 overflow-y-auto min-h-0 bg-gray-50'>
            <ContainerWithBgV2
              className='preview-container'
              style={blockStyleFilter({
                ...currentTheme.page,
                margin: '0 auto',
                width: 375,
                minHeight: 500,
                padding: 0.1,
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
                    marginBottom: 20,
                  }}
                >
                  {textItems.map(item => {
                    const currThemeStyle = currentTheme[
                      item.link.tag as keyof ThemeConfigV2
                    ] as any;
                    return (
                      <ClickableElement
                        selectedElement={selectedElement}
                        onElementSelect={(element: SelectableElement) =>
                          setSelectedElement(element)
                        }
                        elementType={item.link.tag as SelectableElement}
                        key={item.link.tag}
                      >
                        <WidgetItemRendererV2
                          layer={{
                            elementRef: item.elementRef,
                            elemId: item.link.tag,
                            type: 'element',
                            attrs: {
                              ...item.attrs,
                              ...currThemeStyle,
                              ...takeTextStyle(currThemeStyle),
                              layoutStyle: {
                                ...takeInnerStyle(currThemeStyle.layoutStyle),
                                ...takeLayoutWrapperStyle(
                                  currThemeStyle.layoutStyle
                                ),
                              },
                            } as any,
                          }}
                          elemId={item.link.tag}
                          readonly={true}
                        />
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
                          >
                            <WidgetItemRendererV2
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
                width: 600,
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
                  <ContainerWithBgV2
                    key={tag}
                    className='Block_DEMO relative hover:ring-1 hover:ring-blue-500 cursor-pointer'
                    style={{
                      ...blockStyleFilter({
                        ...(currentTheme[tag as keyof ThemeConfigV2] as any),
                      }),
                      outline: isActive ? '2px solid #3383f3' : 'none',
                      aspectRatio: '4/3',
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
                );
              })}
            </ContainerWithBgV2>
          </ScrollArea>
        </TabsContent>
        <TabsContent value='color' className='flex-1 overflow-hidden m-0'>
          <ScrollArea className='h-full overflow-y-auto min-h-0 bg-gray-50'>
            <ColorSetting />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    );
  };

  return (
    <div className='flex flex-col h-[80vh]'>
      <div className='flex flex-1 overflow-hidden'>
        {/* 左侧预览面板 */}
        <div className='flex-1 flex flex-col h-full'>
          {renderPreviewPanel()}
        </div>

        {/* 右侧属性面板 */}
        <div className='w-[320px] flex flex-col border-l border-gray-200 h-full overflow-hidden'>
          {/* 设置内容区域 */}
          {renderElemSettingPanel(selectedElement)}
        </div>
      </div>
      {/* 底部按钮区域 */}
      <div className='flex-shrink-0 p-3 border-t border-gray-200 bg-white sticky bottom-0'>
        <div className='flex items-center justify-end gap-2'>
          <Button
            className='trggier px-2'
            size='sm'
            variant='outline'
            style={{
              pointerEvents: 'auto',
            }}
            onClick={e => {
              const style = takeStyle();
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

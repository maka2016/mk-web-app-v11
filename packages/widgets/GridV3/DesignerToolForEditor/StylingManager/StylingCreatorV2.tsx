import { deepClone } from '@mk/utils';
import { LayerElemItem } from '@mk/works-store/types';
import { Button } from '@workspace/ui/components/button';
import { Label } from '@workspace/ui/components/label';
import {
  RadioGroup,
  RadioGroupItem,
} from '@workspace/ui/components/radio-group';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
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
import { ThemeConfigV2 } from '../../shared/types';
import {
  getAddItemsByThemeConfig,
  getContainerTags,
  getDefaultTheme2,
  getElementDisplayName,
} from '../AddCompHelper/const';
import PictureSetting from '../ElementAttrsEditorV2/PictureSetting';
import StyleCustomSetting from '../ElementAttrsEditorV2/StyleSetting';
import TextSetting from '../ElementAttrsEditorV2/TextSetting';
import {
  MaterialFloor,
  MaterialItem,
} from '../MaterialResourceManager/services';
import UpdateMaterialItemForm from '../MaterialResourceManager/UpdateMaterialItemForm';
import { stylingCateId, stylingManager } from './services';
import { SelectableElement } from './types';

const demoImg = `/cdn/jiantie/works-resources/605188792/works/ZO0ORP6A_605188792/98248398365956_b8094d.png?x-oss-process=image%2Fresize%2Cm_lfit%2Cw_1200%2Cimage%2Fformat%2Cwebp`;

interface StylingCreatorProps {
  themeItem?: MaterialItem<ThemeConfigV2>;
  onSave?: (theme: ThemeConfigV2, saveAsNew?: boolean) => void;
  onCancel?: () => void;
  categories?: MaterialFloor[];
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

export default function StylingCreator({
  themeItem: themeItemProp,
  onSave,
  onCancel,
  categories,
}: StylingCreatorProps) {
  const { editorSDK, themeConfig, gridProps } = useGridContext();
  const themeContent = themeItemProp?.content || themeConfig;
  const { stylePackV2 } = gridProps;
  const themeItem = themeItemProp || stylePackV2;
  const selectedCategory = themeItem?.material_tags?.[0]?.documentId;
  const [currentTheme, setCurrentTheme] = useState<ThemeConfigV2>(
    mergeDeep2(getDefaultTheme2(), themeContent)
  );
  const containerTags = getContainerTags();
  const [selectedElement, setSelectedElement] =
    useState<SelectableElement>('text_heading1');
  const [selectedGridType, setSelectedGridType] =
    useState<keyof typeof containerTags>('grid_root');
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<
    'element' | 'container' | 'color'
  >('element');
  // 更新主题配置
  const updateTheme = (updates: Partial<ThemeConfigV2>) => {
    const newTheme = { ...currentTheme, ...updates };
    setCurrentTheme(newTheme);
  };

  // 更新文本样式
  const updateElemStyle = (type: SelectableElement, updates: any) => {
    // 直接更新主题，让blockStyleFilter来处理单位
    updateTheme({
      [type]: { ...currentTheme[type], ...updates },
    });
  };

  // 保存主题
  const handleSave = async (submitData: any) => {
    // onSave?.(currentTheme, false);
    const saveTheme = {
      ...themeContent,
      ...deepClone(currentTheme),
    };

    let documentId = themeItem?.documentId;

    if (themeItem?.documentId) {
      await stylingManager.updateItem(themeItem.documentId, {
        ...submitData,
      });
      documentId = themeItem.documentId;
    } else {
      const createRes = await stylingManager.createItem({
        ...submitData,
        material_class: {
          set: [stylingCateId],
        },
      });
      documentId = createRes.data.documentId;
    }
    setIsSaveDialogOpen(false);
    onSave?.(currentTheme, true);
    setCurrentTheme(saveTheme);
    editorSDK?.onFormValueChange({
      themeConfig2: saveTheme,
      stylePackV2: {
        ...themeItem,
        author: submitData.author,
        name: submitData.name,
        documentId: documentId,
      },
    });
    onSave?.(currentTheme, false);
  };

  const handleSaveAsNew = () => {
    setIsSaveDialogOpen(true);
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
          {themeItem?.documentId ? (
            <span className='text-xs'>「{themeItem.name}」修改中</span>
          ) : (
            <span className='text-xs'>风格未保存</span>
          )}
          <Button
            variant='outline'
            size='sm'
            onClick={handleCancel}
            className='text-sm'
          >
            取消
          </Button>
          <Button size='sm' onClick={handleSaveAsNew} className='text-sm'>
            {themeItem?.documentId ? '另存为' : '保存为新风格'}
          </Button>
          {themeItem?.documentId && (
            <Button
              size='sm'
              onClick={() => {
                setIsSaveDialogOpen(true);
              }}
              className='text-sm'
            >
              更新
            </Button>
            // <AlertHelper
            //   trigger={
            //   }
            //   title={`即将更新风格 ${themeItem.name}`}
            //   content="更新后将覆盖当前风格，确保与作者沟通好后再操作，确定要更新吗？"
            //   onConfirm={() => {
            //     setIsSaveDialogOpen(true);
            //   }}
            //   onCancel={() => {}}
            //   confirmText="更新"
            //   cancelText="取消"
            // />
          )}
        </div>
      </div>
      <ResponsiveDialog
        isOpen={isSaveDialogOpen}
        onOpenChange={setIsSaveDialogOpen}
        title='另存为新风格'
      >
        <UpdateMaterialItemForm
          selectedCategory={selectedCategory}
          msg={themeItem ? '请与作者沟通无误后再操作' : undefined}
          materialItem={
            themeItem
              ? ({
                  ...themeItem,
                  content: currentTheme,
                } as any)
              : {
                  content: currentTheme,
                }
          }
          categories={categories || []}
          onClose={() => {
            setIsSaveDialogOpen(false);
          }}
          onSubmit={async submitData => {
            handleSave(submitData);
          }}
        />
      </ResponsiveDialog>
    </div>
  );
}

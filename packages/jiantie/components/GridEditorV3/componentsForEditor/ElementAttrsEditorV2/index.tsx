import { deepClone, mergeDeep } from '@/utils';
import styled from '@emotion/styled';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@workspace/ui/components/tabs';
import { useEffect, useState } from 'react';

import AnimationSetting2 from '../animation2/AnimationSetting2';
import AnimationSetting from './AnimationSetting';
import StyleCustomSetting from './StyleSetting';

import { Button } from '@workspace/ui/components/button';
import { Label } from '@workspace/ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import { Separator } from '@workspace/ui/components/separator';
import { Switch } from '@workspace/ui/components/switch';
import { cn } from '@workspace/ui/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { observer } from 'mobx-react';
import { toast } from 'react-hot-toast';
import RSVPThemeSetting from '../../../RSVP/ThemeSetting';
import RelayDesignerSetting from '../../../Relay/RelayDesignerSetting';
import {
  takeBlockStyle,
  takeRowStyle,
} from '../../AppV2/RowRendererV2/LongPageRowEditorV2';
import {
  takePictureAttrs,
  takeTextStyle,
} from '../../AppV2/WidgetItemRendererV2';
import CalendarV3DesignerSetting from '../../components/CalendarV3/CalendarV3DesignerSetting';
import PictureSetting from '../../components/Picture/PictureSetting';
import TextSettingForDesigner from '../../components/Text/TextSettingForDesigner';
import { useWorksStore } from '../../works-store/store/hook';
import AnimationTemplates from '../animation2/AnimationTemplates';
import PageFlipEffectManager from './PageFlipEffectManager';

const SideContainer = styled.div<{ $isCollapsed: boolean }>`
  width: ${props => (props.$isCollapsed ? '0px' : '288px')};
  background-color: #fff;
  overflow: ${props => (props.$isCollapsed ? 'hidden' : 'auto')};
  z-index: 10;
  box-shadow: -4px 0 4px rgba(0, 0, 0, 0.1);
  user-select: none;
  transition: width 0.3s ease;
`;

const PanelWrapper = styled.div`
  display: flex;
  position: relative;
`;

const ToggleButton = styled.button`
  position: absolute;
  left: -22px;
  top: 0;
  /* transform: translateY(-50%); */
  width: 22px;
  height: 24px;
  background-color: #fff;
  border: 1px solid #e5e7eb;
  border-right: none;
  border-radius: 4px 0 0 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 11;
  box-shadow: -2px 0 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;

  &:hover {
    background-color: #f3f4f6;
  }

  &:active {
    background-color: #e5e7eb;
  }
`;

const mergeStyle = (style1: any, style2: any) => {
  const result = { ...style1 };

  // 检查值是否为零值（0, "0", "0px", "0.00px" 等）
  const isZeroValue = (val: any): boolean => {
    if (val === undefined || val === null) {
      return false;
    }
    if (val === 0 || val === '0') {
      return true;
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      // 匹配 "0px", "0.00px", "0.0px" 等格式
      return /^0(\.0+)?px$/i.test(trimmed);
    }
    return false;
  };

  Object.keys(style2).forEach(key => {
    const value2 = style2[key];

    // style2 覆盖 style1，但如果 style2 的值是零值，则不覆盖
    if (!isZeroValue(value2)) {
      result[key] = value2;
    }
  });

  return result;
};

function ElementAttrsEditorV2() {
  const worksStore = useWorksStore();
  const gridsData = worksStore?.worksData.gridProps.gridsData || [];
  const gridProps = worksStore?.worksData.gridProps;
  const pageStyle = gridProps?.style;
  const { widgetStateV2, setWidgetStateV2, getStyleByTag2 } = worksStore;
  const { getActiveRow, setRowAttrsV2, getActiveRootRow } =
    worksStore.gridPropsOperator;
  const activeRow = getActiveRow();
  const activeRowId = activeRow?.id;
  const isFlipPage = worksStore?.worksDetail.specInfo.is_flip_page;
  const isFlatPage = worksStore?.worksDetail.specInfo.is_flat_page;
  const { editingElemId, activeRowDepth } = widgetStateV2;
  const [subTabValue, setSubTabValue] = useState('style');
  const firstPageCover = gridProps?.firstPageCover;
  // const isThemeMode = gridProps.worksCate === 'theme';
  const isThemeMode = true;
  const [isCollapsed, setIsCollapsed] = useState(!isThemeMode);

  // 新增：智能tab状态管理
  const [currentTabValue, setCurrentTabValue] = useState('page');
  const [availableTabs, setAvailableTabs] = useState<
    Array<{ value: string; label: string; condition: boolean }>
  >([]);

  const layer = editingElemId ? worksStore?.getLayer(editingElemId) : null;
  const isRepeatList = activeRow?.isRepeatList;

  // 新增：动态生成可用tab列表
  const generateAvailableTabs = () => {
    const tabs = [];

    // Element tab - 当有编辑元素时显示
    if (editingElemId) {
      const elementLabel = layer?.elementRef === 'Picture' ? '图片' : '文字';
      tabs.push({
        value: 'element',
        label: elementLabel,
        condition: true,
      });
    } else if (activeRowId) {
      let label = 'Grid';
      if (activeRowDepth?.length === 1) {
        label = 'Block';
      } else if (activeRowDepth?.length && activeRowDepth?.length > 2) {
        label = 'Cell';
      } else if (isRepeatList) {
        label = 'List';
      }
      tabs.push({
        value: 'row',
        label: label,
        condition: true,
      });
    }

    // Page tab - 始终显示
    tabs.push({
      value: 'page',
      label: '作品',
      condition: true,
    });

    // FlipPage tab - 当启用翻页动画时显示
    if (isFlipPage || !!firstPageCover) {
      tabs.push({
        value: 'flipPage',
        label: '翻页动画',
        condition: true,
      });
    }

    return tabs;
  };

  // 新增：根据状态变化自动切换tab - 简化版本
  useEffect(() => {
    const newAvailableTabs = generateAvailableTabs();
    setAvailableTabs(newAvailableTabs);

    // 简单的自动切换逻辑
    if (editingElemId && currentTabValue !== 'element') {
      setCurrentTabValue('element');
    } else if (!editingElemId && activeRowDepth) {
      setCurrentTabValue('row');
    }
  }, [editingElemId, JSON.stringify(activeRowDepth)]);

  useEffect(() => {
    const deleteErrorDataRec = () => {
      // 递归删除坏数据的函数
      const cleanRowData = (row: any) => {
        // 删除当前行的坏数据
        delete (row.style as any)?.cells;
        delete (row.style as any)?.style;

        // 递归处理 children
        if (row.children && Array.isArray(row.children)) {
          row.children.forEach((child: any) => {
            cleanRowData(child);
          });
        }
      };

      // 删除坏数据
      const newGridData = deepClone(gridsData);
      newGridData.forEach(row => {
        cleanRowData(row);
      });

      // 更新 gridsData
      worksStore?.setGridProps({
        gridsData: newGridData,
      });
    };
    deleteErrorDataRec();
  }, []);

  const elemLayer = worksStore?.getLayer(editingElemId || '');

  const handleClearStyle = () => {
    if (typeof editingElemId !== 'undefined') {
      worksStore?.changeCompAttr(editingElemId, {
        layoutStyle: {},
        lineHeight: undefined,
        letterSpacing: undefined,
        fontFamily: undefined,
        fontUrl: undefined,
        fontSize: undefined,
        fontWeight: undefined,
        fontStyle: undefined,
        textDecoration: undefined,
        textTransform: undefined,
        textAlign: undefined,
        color: undefined,
        WebkitTextStroke: undefined,
        WebkitTextStrokeColor: undefined,
        WebkitTextStrokeWidth: undefined,
        isList: undefined,
        listStyle: undefined,
        textShadow: undefined,
      });
    }
  };

  const subTabs = [
    {
      label: '样式',
      value: 'style',
    },
    {
      label: '动画2',
      value: 'animate2',
    },
    {
      label: '批量动画',
      value: 'batchAnimate',
    },
    {
      label: '动画1(废弃)',
      value: 'animate',
    },
  ];

  const renderRowEditor = () => {
    const isBlock = activeRowDepth?.length === 1;
    const editStyle = isBlock
      ? takeBlockStyle(activeRow?.style)
      : takeRowStyle(activeRow?.style, {
          isList: isRepeatList,
        });
    const themeStyle = getStyleByTag2(activeRow?.tag || ('' as any));
    return (
      <div style={{ height: '100%', overflow: 'auto' }}>
        <StyleCustomSetting
          isList={isRepeatList}
          useFrontground={true}
          showAutoLayout={true}
          useTransform={true}
          style={mergeStyle(themeStyle, editStyle)}
          onChange={nextVal => {
            setRowAttrsV2({
              style: nextVal,
            });
          }}
        />
      </div>
    );
  };

  return (
    <PanelWrapper>
      <ToggleButton
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? '展开面板' : '收起面板'}
      >
        {isCollapsed ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </ToggleButton>
      <SideContainer
        key={JSON.stringify(widgetStateV2)}
        $isCollapsed={isCollapsed}
      >
        <div
          style={{
            height: 'calc(100vh - 56px)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            paddingBottom: '24px',
          }}
        >
          <Tabs
            value={currentTabValue}
            className='flex flex-col overflow-auto'
            onValueChange={setCurrentTabValue}
          >
            <div className='flex gap-2 w-full overflow-hidden'>
              <TabsList className='m-2 w-full flex p-1 h-auto'>
                {availableTabs.map(tab => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className='flex-1 p-1'
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <div className='flex-1 overflow-auto'>
              <TabsContent value='element'>
                {(() => {
                  if (!editingElemId) return null;
                  const layer = worksStore?.getLayer(editingElemId);
                  const themeStyle = getStyleByTag2(layer?.tag || ('' as any));
                  // 样式规则有2层：1、主题风格样式 2、自定义样式。自定义样式会覆盖主题风格样式
                  const textStyle = takeTextStyle(layer?.attrs as any);
                  const picStyle = takePictureAttrs(layer?.attrs as any);
                  const isCustomStyle =
                    Object.keys(textStyle).length > 0 ||
                    Object.keys(picStyle).length > 0;
                  const layoutStyle = layer?.attrs.layoutStyle;
                  const parentStyle = activeRow?.style;
                  const animateQueue =
                    elemLayer?.animateQueue || elemLayer?.attrs.animateQueue;
                  const animateQueue2 = elemLayer?.animateQueue2;
                  const usePadding = true;
                  const renderElemSetting = () => {
                    if (!editingElemId) {
                      return null;
                    }
                    console.log('layer?.elementRef', layer?.elementRef);
                    switch (layer?.elementRef) {
                      case 'Text':
                        return (
                          <TextSettingForDesigner
                            attrs={{
                              ...themeStyle,
                              ...(elemLayer?.attrs || {}),
                            }}
                            onChange={nextVal => {
                              worksStore?.changeCompAttr(editingElemId, {
                                // 不需要带上elemLayer?.attrs，函数会自动合并
                                ...nextVal,
                              });
                            }}
                          />
                        );
                      case 'Picture':
                        return (
                          <PictureSetting
                            elemId={editingElemId}
                            attrs={{
                              ...themeStyle,
                              ...(elemLayer?.attrs || {}),
                            }}
                            onChange={nextVal => {
                              worksStore?.changeCompAttr(editingElemId, {
                                ...nextVal,
                              });
                            }}
                          />
                        );
                      case 'RSVP1':
                        return (
                          <RSVPThemeSetting
                            onFormValueChange={values => {
                              worksStore?.changeCompAttr(editingElemId, {
                                // ...elemLayer?.attrs,
                                ...values,
                              });
                            }}
                            formControledValues={
                              elemLayer?.attrs || ({} as any)
                            }
                          />
                        );
                      case 'MkCalendarV3':
                        return (
                          <CalendarV3DesignerSetting
                            elemId={editingElemId}
                            onFormValueChange={values => {
                              worksStore?.changeCompAttr(editingElemId, {
                                // ...elemLayer?.attrs,
                                ...values,
                              });
                            }}
                            formControledValues={
                              elemLayer?.attrs || ({} as any)
                            }
                          />
                        );
                      case 'Relay':
                        return (
                          <RelayDesignerSetting
                            elemId={editingElemId}
                            onFormValueChange={values => {
                              worksStore?.changeCompAttr(editingElemId, {
                                // ...elemLayer?.attrs,
                                ...values,
                              });
                            }}
                            formControledValues={
                              elemLayer?.attrs || ({} as any)
                            }
                          />
                        );
                      default:
                        return null;
                    }
                  };
                  const layoutStyle2 = mergeDeep(
                    {},
                    themeStyle?.layoutStyle || {},
                    layoutStyle
                  );
                  return (
                    <div style={{ height: '100%', overflow: 'auto' }}>
                      <Tabs value={subTabValue} onValueChange={setSubTabValue}>
                        <TabsList className='mx-2'>
                          {subTabs.map(item => (
                            <TabsTrigger key={item.value} value={item.value}>
                              <span className='text-xs'>{item.label}</span>
                            </TabsTrigger>
                          ))}
                        </TabsList>
                        <TabsContent value='style'>
                          <>
                            <Button
                              size='xs'
                              className='mx-2 mt-2'
                              variant='outline'
                              onClick={() => {
                                handleClearStyle();
                              }}
                            >
                              重置样式
                            </Button>
                            <Button
                              size='xs'
                              className={cn(
                                'mx-2 mt-2 text-white',
                                isCustomStyle
                                  ? 'bg-green-500 hover:bg-green-600'
                                  : 'bg-red-500 hover:bg-red-600'
                              )}
                            >
                              {isCustomStyle ? '自定义了样式' : '未自定义样式'}
                            </Button>
                            {renderElemSetting()}
                            <StyleCustomSetting
                              useFrontground={false}
                              showAutoLayout={false}
                              showPositioning={true}
                              usePadding={usePadding}
                              reverse={
                                typeof parentStyle?.flexDirection ===
                                  'string' &&
                                parentStyle?.flexDirection.includes('column')
                              }
                              style={layoutStyle2}
                              onChange={nextVal => {
                                const commitStyle = {
                                  layoutStyle: {
                                    ...(layoutStyle || {}),
                                    ...nextVal,
                                  },
                                };
                                console.log('nextVal', layer?.elemId, nextVal);
                                console.log('commitStyle', commitStyle);
                                worksStore?.changeCompAttr(
                                  editingElemId,
                                  commitStyle
                                );
                              }}
                            />
                          </>
                        </TabsContent>
                        <TabsContent value='animate'>
                          <>
                            <AnimationSetting
                              targetId={`layer_root_${widgetStateV2.editingElemId}`}
                              value={animateQueue}
                              onChange={nextVal => {
                                if (elemLayer?.elemId) {
                                  worksStore?.setLayer(elemLayer?.elemId, {
                                    animateQueue: nextVal,
                                  });
                                }
                              }}
                            />
                          </>
                        </TabsContent>
                        <TabsContent value='batchAnimate'>
                          <>
                            <AnimationTemplates elemId={editingElemId} />
                          </>
                        </TabsContent>
                        <TabsContent value='animate2'>
                          <>
                            <Button
                              size='xs'
                              className='mx-2 mt-2'
                              variant='outline'
                              onClick={() => {
                                setWidgetStateV2({
                                  playAnimationInEditor:
                                    !widgetStateV2.playAnimationInEditor,
                                });
                              }}
                            >
                              {widgetStateV2.playAnimationInEditor
                                ? '停止动画'
                                : '播放动画'}
                            </Button>
                            <AnimationSetting2
                              elementRef={layer?.elementRef}
                              targetId={`${widgetStateV2.editingElemId}`}
                              value={animateQueue2}
                              onChange={nextVal => {
                                if (elemLayer?.elemId) {
                                  worksStore?.setLayer(elemLayer?.elemId, {
                                    animateQueue2: nextVal,
                                  });
                                }
                              }}
                            />
                          </>
                        </TabsContent>
                      </Tabs>
                    </div>
                  );
                })()}
              </TabsContent>
              <TabsContent value='row'>{renderRowEditor()}</TabsContent>
              <TabsContent value='page'>
                {(() => {
                  const themeStyle = getStyleByTag2('page');
                  return (
                    <div style={{ height: '100%', overflow: 'auto' }}>
                      <div className='flex flex-wrap p-2 pt-0 gap-1'>
                        {isFlatPage && (
                          <div className='flex items-center gap-1'>
                            <Switch
                              id='first_page_cover'
                              defaultChecked={!!firstPageCover}
                              onCheckedChange={checked => {
                                worksStore?.setGridProps({
                                  firstPageCover: checked,
                                });
                              }}
                            />
                            <Label htmlFor='first_page_cover'>第一页封面</Label>
                          </div>
                        )}
                        <div className='paiban_items'>
                          <Button
                            className='paiban_item px-2'
                            size='xs'
                            variant='outline'
                            onClick={() => {
                              setRowAttrsV2({
                                style: {},
                              });
                            }}
                          >
                            重置
                          </Button>
                        </div>
                        <div className='paiban_items'>
                          <Button
                            className='trggier px-2'
                            size='xs'
                            variant='outline'
                            style={{
                              pointerEvents: 'auto',
                            }}
                            onClick={() => {
                              const { showMobilePreviewLine = true } =
                                widgetStateV2;
                              setWidgetStateV2({
                                showMobilePreviewLine: !showMobilePreviewLine,
                              });
                            }}
                          >
                            辅助线开关
                          </Button>
                        </div>

                        <div className='paiban_items parallax_scroll_bg_btn flex items-center gap-1'>
                          <Switch
                            id='parallax_scroll_bg_btn'
                            defaultChecked={!!gridProps?.parallaxScrollBgConfig}
                            onCheckedChange={checked => {
                              worksStore?.setGridProps({
                                parallaxScrollBgConfig: checked
                                  ? {
                                      coefficient: 0.2,
                                    }
                                  : undefined,
                              } as any);
                            }}
                            title='视差背景'
                          />
                          <Label htmlFor='parallax_scroll_bg_btn'>
                            视差背景
                          </Label>
                          <Select
                            value={gridProps?.parallaxScrollBgConfig?.coefficient?.toString()}
                            onValueChange={value => {
                              worksStore?.setGridProps({
                                parallaxScrollBgConfig: {
                                  coefficient: Number(value),
                                },
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder='选择速度' />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='0.2'>慢 0.2</SelectItem>
                              <SelectItem value='0.4'>中 0.4</SelectItem>
                              <SelectItem value='0.8'>快 0.8</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Separator />
                      <StyleCustomSetting
                        useFrontground={true}
                        useLayoutGroup={false}
                        style={{
                          ...themeStyle,
                          ...(pageStyle || {}),
                        }}
                        onChange={nextStyle => {
                          worksStore?.setGridProps({
                            style: {
                              ...pageStyle,
                              ...nextStyle,
                            },
                          });
                        }}
                      />
                    </div>
                  );
                })()}
              </TabsContent>
              <TabsContent value='flipPage'>
                {(() => {
                  const activeRootRow = getActiveRootRow({
                    activeRowDepth: [activeRowDepth?.[0] || 0],
                  });
                  const animationType = activeRootRow?.animationType;
                  return (
                    <>
                      <div className='p-4'>
                        <PageFlipEffectManager
                          value={animationType}
                          onChange={payload => {
                            console.log('payload', payload);
                            setRowAttrsV2(
                              {
                                animationType: payload,
                              },
                              {
                                activeRowDepth: [activeRowDepth?.[0] || 0],
                              }
                            );
                          }}
                        />
                        <Button
                          className='my-2'
                          onClick={() => {
                            if (!animationType) {
                              toast.error('请先选择动画类型');
                              return;
                            }
                            const nextGridData = deepClone(gridsData);
                            nextGridData.forEach((row, idx) => {
                              nextGridData[idx] = {
                                ...row,
                                animationType: animationType,
                              };
                            });

                            // 更新 gridsData
                            worksStore?.setGridProps({
                              gridsData: nextGridData,
                            });
                            toast('设置成功');
                          }}
                        >
                          <span>应用到全部页面</span>
                        </Button>
                      </div>
                    </>
                  );
                })()}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </SideContainer>
    </PanelWrapper>
  );
}
export default observer(ElementAttrsEditorV2);

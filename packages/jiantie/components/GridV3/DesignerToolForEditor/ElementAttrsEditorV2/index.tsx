import styled from '@emotion/styled';
import { deepClone } from '@mk/utils';
import MkCalendarV3ColorSetting from '@mk/widgets/MkCalendarV3/form/colorSetting';
import MkHuiZhiColorSetting from '@mk/widgets/MkHuiZhi/form/colorSetting';
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
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import { Separator } from '@workspace/ui/components/separator';
import { Switch } from '@workspace/ui/components/switch';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import RSVPThemeSetting from '../../../RSVP/ThemeSetting';
import {
  takeBlockStyle,
  takeRowStyle,
} from '../../comp/components/RowRendererV2/LongPageRowEditorV2';
import { useGridContext } from '../../comp/provider';
import CoverAnimationManager from '../CoverAnimateLibrary/CoverAnimationManager';
import LottieSetting from './LottieSetting';
import PageFlipEffectManager from './PageFlipEffectManager';
import PictureSetting from './PictureSetting';
import TextSetting from './TextSetting';

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

export const CoverAnimateManagerHelperForPage = () => {
  const { editorCtx, gridProps, editorSDK } = useGridContext();
  const [showLayoutForm, setShowLayoutForm] = useState(false);

  return (
    <>
      <Button
        className='trggier px-2'
        size='xs'
        variant='outline'
        style={{
          pointerEvents: 'auto',
        }}
        onClick={() => {
          setShowLayoutForm(true);
        }}
      >
        开幕设置
      </Button>
      <ResponsiveDialog
        isOpen={showLayoutForm}
        onOpenChange={setShowLayoutForm}
        title={'编辑'}
      >
        <CoverAnimationManager
          editorCtx={editorCtx}
          value={gridProps.coverAnimation}
          onChange={async payload => {
            editorSDK?.onFormValueChange({
              coverAnimation: {
                ...payload,
              },
            });
            setShowLayoutForm(false);
          }}
          onRemove={() => {
            editorSDK?.onFormValueChange({
              coverAnimation: undefined,
            });
            setShowLayoutForm(false);
            toast.success('删除成功');
          }}
        />
      </ResponsiveDialog>
    </>
  );
};

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

export default function ElementAttrsEditorV2() {
  const {
    gridId,
    gridsData,
    getActiveRow,
    setRowAttrsV2,
    gridStyle: pageStyle,
    editorSDK,
    gridProps,
    widgetStateV2,
    getStyleByTag2,
    setWidgetStateV2,
  } = useGridContext();
  const activeRow = getActiveRow();
  const activeRowId = activeRow?.id;
  const isFlipPage = editorSDK?.fullSDK.worksDetail.specInfo.is_flip_page;
  const { editingElemId, activeRowDepth } = widgetStateV2;
  const [subTabValue, setSubTabValue] = useState('style');
  const isThemeMode = gridProps.worksCate === 'theme';
  const [isCollapsed, setIsCollapsed] = useState(!isThemeMode);

  // 新增：智能tab状态管理
  const [currentTabValue, setCurrentTabValue] = useState('page');
  const [availableTabs, setAvailableTabs] = useState<
    Array<{ value: string; label: string; condition: boolean }>
  >([]);

  const layer = editingElemId ? editorSDK?.getLayer(editingElemId) : null;
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
    if (isFlipPage) {
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
      editorSDK?.onFormValueChange({
        gridsData: newGridData,
      });
    };
    deleteErrorDataRec();
  }, []);

  const elemLayer = editorSDK?.getLayer(editingElemId || '');
  const elemLink = editorSDK?.getLink(editingElemId || '');

  const handleClearStyle = () => {
    if (typeof editingElemId !== 'undefined') {
      editorSDK?.changeCompAttr(editingElemId, {
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
      label: '动画1(即将废弃)',
      value: 'animate',
    },
  ];

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
                  const layerLink = editorSDK?.getLink(editingElemId);
                  const layer = editorSDK?.getLayer(editingElemId);
                  const themeStyle = getStyleByTag2(
                    layerLink?.tag || ('' as any)
                  );
                  const editStyle = layer?.attrs.layoutStyle;
                  const parentStyle = activeRow?.style;
                  const animateQueue =
                    elemLink?.animateQueue || elemLayer?.attrs.animateQueue;
                  const animateQueue2 = elemLink?.animateQueue2;
                  const usePadding = true;
                  // const usePadding = layer?.elementRef !== "Picture";
                  return (
                    <div style={{ height: '100%', overflow: 'auto' }}>
                      <div className='flex gap-1 flex-wrap px-2'>
                        {subTabs.map(item => (
                          <Button
                            key={item.value}
                            size='xs'
                            variant={
                              subTabValue === item.value ? 'default' : 'outline'
                            }
                            onClick={() => {
                              setSubTabValue(item.value);
                            }}
                          >
                            {item.label}
                          </Button>
                        ))}
                      </div>

                      {subTabValue === 'style' && (
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
                          {(() => {
                            if (editingElemId) {
                              switch (layer?.elementRef) {
                                case 'Text':
                                  return (
                                    <TextSetting
                                      attrs={{
                                        ...themeStyle,
                                        ...(elemLayer?.attrs || {}),
                                      }}
                                      onChange={nextVal => {
                                        // console.log('nextVal', editingElemId, nextVal);
                                        editorSDK?.changeCompAttr(
                                          editingElemId,
                                          {
                                            // 不需要带上elemLayer?.attrs，函数会自动合并
                                            // ...elemLayer?.attrs,
                                            ...nextVal,
                                          }
                                        );
                                      }}
                                    />
                                  );
                                case 'Picture':
                                  return (
                                    <PictureSetting
                                      attrs={{
                                        ...themeStyle,
                                        ...(elemLayer?.attrs || {}),
                                      }}
                                      onChange={nextVal => {
                                        // console.log('PictureSetting onChange', nextVal);
                                        editorSDK?.changeCompAttr(
                                          editingElemId,
                                          {
                                            // ...elemLayer?.attrs,
                                            ...nextVal,
                                          }
                                        );
                                      }}
                                    />
                                  );
                                case 'MkHuiZhi':
                                  return (
                                    <MkHuiZhiColorSetting
                                      onFormValueChange={values => {
                                        editorSDK?.changeCompAttr(
                                          editingElemId,
                                          {
                                            // ...elemLayer?.attrs,
                                            ...values,
                                          }
                                        );
                                      }}
                                      formControledValues={
                                        elemLayer?.attrs || ({} as any)
                                      }
                                    />
                                  );
                                case 'MkCalendarV3':
                                  return (
                                    <MkCalendarV3ColorSetting
                                      onFormValueChange={values => {
                                        editorSDK?.changeCompAttr(
                                          editingElemId,
                                          {
                                            // ...elemLayer?.attrs,
                                            ...values,
                                          }
                                        );
                                      }}
                                      formControledValues={
                                        elemLayer?.attrs || ({} as any)
                                      }
                                    />
                                  );
                                case 'RSVP1':
                                  return (
                                    <RSVPThemeSetting
                                      onFormValueChange={values => {
                                        editorSDK?.changeCompAttr(
                                          editingElemId,
                                          {
                                            // ...elemLayer?.attrs,
                                            ...values,
                                          }
                                        );
                                      }}
                                      formControledValues={
                                        elemLayer?.attrs || ({} as any)
                                      }
                                    />
                                  );
                                default:
                                  return null;
                              }
                            }
                          })()}
                          <StyleCustomSetting
                            useFrontground={false}
                            showAutoLayout={false}
                            showPositioning={true}
                            usePadding={usePadding}
                            reverse={
                              typeof parentStyle?.flexDirection === 'string' &&
                              parentStyle?.flexDirection.includes('column')
                            }
                            style={{
                              ...themeStyle,
                              ...(editStyle || {}),
                            }}
                            onChange={nextVal => {
                              editorSDK?.changeCompAttr(editingElemId, {
                                layoutStyle: {
                                  ...elemLayer?.attrs.layoutStyle,
                                  ...nextVal,
                                },
                              });
                            }}
                          />
                        </>
                      )}
                      {subTabValue === 'animate' && (
                        <>
                          <AnimationSetting
                            targetId={`layer_root_${widgetStateV2.editingElemId}`}
                            value={animateQueue}
                            onChange={nextVal => {
                              if (elemLayer?.elemId) {
                                editorSDK?.fullSDK.setLink(elemLayer?.elemId, {
                                  animateQueue: nextVal,
                                });

                                // 强制更新
                                editorSDK?.changeCompAttr(elemLayer?.elemId, {
                                  // ...elemLayer?.attrs,
                                  animateQueue: undefined,
                                });
                              }
                            }}
                          />
                        </>
                      )}
                      {subTabValue === 'animate2' && (
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
                                editorSDK?.fullSDK.setLink(elemLayer?.elemId, {
                                  animateQueue2: nextVal,
                                });
                              }
                            }}
                          />
                        </>
                      )}
                    </div>
                  );
                })()}
              </TabsContent>
              <TabsContent value='row'>
                {(() => {
                  const isBlock = activeRowDepth?.length === 1;
                  const editStyle = isBlock
                    ? takeBlockStyle(activeRow?.style)
                    : takeRowStyle(activeRow?.style, {
                        isList: isRepeatList,
                      });
                  const themeStyle = getStyleByTag2(
                    activeRow?.tag || ('' as any)
                  );
                  return (
                    <div style={{ height: '100%', overflow: 'auto' }}>
                      <div className='paiban_items parallax_scroll_bg_btn flex items-center gap-1'>
                        <LottieSetting
                          lottieBgConfig={activeRow?.lottieBgConfig}
                          lottieFgConfig={activeRow?.lottieFgConfig}
                          onChangeBg={lottieBgConfig => {
                            setRowAttrsV2({
                              lottieBgConfig,
                            });
                          }}
                          onChangeFg={lottieFgConfig => {
                            setRowAttrsV2({
                              lottieFgConfig,
                            });
                          }}
                        />
                      </div>
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
                })()}
              </TabsContent>
              <TabsContent value='page' key={gridId}>
                {(() => {
                  const themeStyle = getStyleByTag2('page');
                  return (
                    <div style={{ height: '100%', overflow: 'auto' }}>
                      <div className='flex flex-wrap p-2 pt-0 gap-1'>
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
                        <div className='paiban_items'>
                          <CoverAnimateManagerHelperForPage />
                        </div>

                        <div className='paiban_items parallax_scroll_bg_btn flex items-center gap-1'>
                          <Switch
                            id='parallax_scroll_bg_btn'
                            defaultChecked={!!gridProps.parallaxScrollBgConfig}
                            onCheckedChange={checked => {
                              editorSDK?.onFormValueChange({
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
                            value={gridProps.parallaxScrollBgConfig?.coefficient?.toString()}
                            onValueChange={value => {
                              editorSDK?.onFormValueChange({
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
                          editorSDK?.changeCompAttr(gridId, {
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
                  const animationType = activeRow?.animationType;
                  return (
                    <>
                      <div className='p-4'>
                        <PageFlipEffectManager
                          value={animationType}
                          onChange={payload => {
                            console.log('payload', payload);
                            setRowAttrsV2({
                              animationType: payload,
                            });
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
                            editorSDK?.onFormValueChange({
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

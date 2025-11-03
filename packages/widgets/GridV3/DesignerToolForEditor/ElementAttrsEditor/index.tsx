import styled from '@emotion/styled';
import { deepClone } from '@mk/utils';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@workspace/ui/components/tabs';
import { useEffect, useState } from 'react';
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
import { toast } from 'react-hot-toast';
import { useGridContext } from '../../comp/provider';
import { GridState } from '../../shared';
import AnimationSetting2 from '../animation2/AnimationSetting2';
import CoverAnimationManager from '../CoverAnimateLibrary/CoverAnimationManager';
import LottieSetting from './LottieSetting';
import PageFlipEffectManager from './PageFlipEffectManager';
import PictureSetting from './PictureSetting';
import TextSetting from './TextSetting';

const SideContainer = styled.div`
  width: 288px;
  background-color: #fff;
  overflow: auto;
  z-index: 10;
  box-shadow: -4px 0 4px rgba(0, 0, 0, 0.1);
  user-select: none;
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
          value={
            gridProps.coverAnimation || {
              type: 'page_flip',
              coverUrl: ['', ''],
              duration: 1000,
              delay: 0,
              easing: 'ease-in-out',
              name: '',
              author: '',
            }
          }
          onChange={async payload => {
            editorSDK?.onFormValueChange({
              coverAnimation: {
                ...payload,
              },
            });
            setShowLayoutForm(false);
          }}
        />
      </ResponsiveDialog>
    </>
  );
};

export default function ElementAttrsEditor() {
  const {
    gridId,
    cellsMap,
    rowsGroup,
    gridStyle: pageStyle,
    editorSDK,
    editorCtx,
    getWorksData,
    gridProps,
    widgetState,
    changeCellAttrs,
    changeRowAttrs,
  } = useGridContext();
  const activeRow = cellsMap.find(row => row.id === widgetState.activeRowId);
  const isFlipPage = editorSDK?.fullSDK.worksDetail.specInfo.is_flip_page;
  const useAnimation = editorSDK?.fullSDK.worksDetail.specInfo.use_animation;
  const { editingElemId, activeCellId, activeRowId } = widgetState;
  const [tabValue, setTabValue] = useState('page');
  const [subTabValue, setSubTabValue] = useState('style');

  const layer = editingElemId ? editorSDK?.getLayer(editingElemId) : null;
  const isRepeatList = activeRow?.isRepeatList;

  useEffect(() => {
    // 删除坏数据
    const newCellsMap = deepClone(cellsMap);
    newCellsMap.forEach((row, rIdx) => {
      delete (newCellsMap[rIdx].style as any)?.cells;
      delete (newCellsMap[rIdx].style as any)?.style;
      row.cells.forEach((cell, cIdx) => {
        delete (newCellsMap[rIdx]?.cells[cIdx]?.style as any)?.cells;
        delete (newCellsMap[rIdx]?.cells[cIdx]?.style as any)?.style;
      });
    });
    editorSDK?.changeCompAttr(gridId, {
      cellsMap: newCellsMap,
    });
  }, []);

  useEffect(() => {
    if (editingElemId) {
      setTabValue('element');
    } else if (activeCellId) {
      setTabValue('cell');
    } else if (activeRowId) {
      setTabValue('row');
    } else {
      setTabValue('page');
    }
  }, [activeCellId, activeRowId, editingElemId]);

  const getEditStyle = (_widgetState: GridState) => {
    const { editingElemId, activeCellId, activeRowId } = _widgetState;
    if (editingElemId) {
      return editorSDK?.getLayer(editingElemId)?.attrs.layoutStyle;
    } else if (activeCellId && activeRowId) {
      const currRow = cellsMap.find(row => row.id === activeRowId);
      if (currRow?.isRepeatList) {
        return currRow.repeatItemTemplate?.style || {};
      } else {
        return currRow?.cells.find(cell => cell.id === activeCellId)?.style;
      }
    } else if (activeRowId) {
      return cellsMap.find(row => row.id === activeRowId)?.style;
    } else {
      return pageStyle;
    }
  };

  const elemLayer = editorSDK?.getLayer(editingElemId || '');
  const elemLink = editorSDK?.getLink(editingElemId || '');

  const handleChangeStyle = (_widgetState: GridState, nextStyle: any) => {
    const { editingElemId, activeCellId, activeRowId } = _widgetState;
    // 修复坏数据
    delete nextStyle.cells;
    if (editingElemId) {
      editorSDK?.changeCompAttr(editingElemId, {
        layoutStyle: {
          ...elemLayer?.attrs.layoutStyle,
          ...nextStyle,
        },
      });
    } else if (activeCellId && activeRowId) {
      if (activeRow?.isRepeatList) {
        changeRowAttrs(
          {
            repeatItemTemplate: {
              style: {
                ...(activeRow?.repeatItemTemplate?.style || {}),
                ...nextStyle,
              },
            },
          },
          _widgetState
        );
      } else {
        changeCellAttrs(
          {
            style: nextStyle,
          },
          _widgetState
        );
      }
    } else if (activeRowId) {
      changeRowAttrs(
        {
          style: nextStyle,
        },
        _widgetState
      );
    } else {
      editorSDK?.changeCompAttr(gridId, {
        style: {
          ...pageStyle,
          ...nextStyle,
        },
      });
    }
  };

  const handleClearStyle = () => {
    if (typeof widgetState.editingElemId !== 'undefined') {
      editorSDK?.changeCompAttr(widgetState.editingElemId, {
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
      });
    } else if (typeof widgetState.activeCellId !== 'undefined') {
      changeCellAttrs({
        style: {},
      });
    } else if (typeof widgetState.activeRowId !== 'undefined') {
      changeRowAttrs({
        style: {},
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
    <SideContainer key={JSON.stringify(widgetState)}>
      <div
        style={{
          height: 'calc(100vh - 56px)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Tabs
          value={tabValue}
          className='flex flex-col overflow-auto'
          onValueChange={val => {
            setTabValue(val);
          }}
        >
          <div className='flex gap-2 w-full overflow-hidden'>
            <TabsList className='m-2 w-full flex p-1 h-auto'>
              {editingElemId && (
                <TabsTrigger value='element' className='flex-1 p-1'>
                  {(() => {
                    if (layer?.elementRef === 'Picture') {
                      return '图片';
                    }
                    return '文字';
                  })()}
                </TabsTrigger>
              )}
              {activeCellId && (
                <TabsTrigger value='cell' className='flex-1 p-1'>
                  {isRepeatList ? 'Item' : 'Cell'}
                </TabsTrigger>
              )}
              {activeRowId && (
                <>
                  <TabsTrigger value='row' className='flex-1 p-1'>
                    {isRepeatList ? 'List' : 'Grid'}
                  </TabsTrigger>
                  <TabsTrigger value='block' className='flex-1 p-1'>
                    Block
                  </TabsTrigger>
                </>
              )}
              <TabsTrigger value='page' className='flex-1 p-1'>
                作品
              </TabsTrigger>
              {isFlipPage && activeRowId && (
                <TabsTrigger value='flipPage' className='flex-1 p-1'>
                  翻页动画
                </TabsTrigger>
              )}
            </TabsList>
          </div>
          <div className='flex-1 overflow-auto'>
            <TabsContent value='element'>
              {(() => {
                const editStyle = getEditStyle({
                  editingElemId,
                });
                const parentStyle = getEditStyle({
                  activeCellId,
                  activeRowId,
                });
                const animateQueue =
                  elemLink?.animateQueue || elemLayer?.attrs.animateQueue;
                const animateQueue2 = elemLink?.animateQueue2;
                return (
                  <div style={{ height: '100%', overflow: 'auto' }}>
                    <div className='flex gap-1 flex-wrap px-2'>
                      {subTabs.map(item => {
                        if (
                          !useAnimation &&
                          item.value.indexOf('animate') > -1
                        ) {
                          return null;
                        }

                        return (
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
                        );
                      })}
                    </div>

                    {subTabValue === 'style' && (
                      <>
                        <Button
                          size='xs'
                          variant='outline'
                          className='mx-2 mt-2'
                          onClick={() => {
                            handleClearStyle();
                          }}
                        >
                          清除样式
                        </Button>
                        {editingElemId && layer?.elementRef === 'Text' && (
                          <TextSetting
                            attrs={{
                              ...(elemLayer?.attrs || {}),
                            }}
                            onChange={nextVal => {
                              editorSDK?.changeCompAttr(editingElemId, {
                                ...elemLayer?.attrs,
                                ...nextVal,
                              });
                            }}
                          />
                        )}
                        {editingElemId && layer?.elementRef === 'Picture' && (
                          <PictureSetting
                            attrs={{
                              ...(elemLayer?.attrs || {}),
                            }}
                            onChange={nextVal => {
                              editorSDK?.changeCompAttr(editingElemId, {
                                ...elemLayer?.attrs,
                                ...nextVal,
                              });
                            }}
                          />
                        )}
                        <StyleCustomSetting
                          useFrontground={false}
                          showAutoLayout={false}
                          showPositioning={true}
                          reverse={
                            typeof parentStyle?.flexDirection === 'string' &&
                            parentStyle?.flexDirection.includes('column')
                          }
                          style={editStyle || {}}
                          onChange={nextVal => {
                            // 自由元素：仅通过设置绝对容器的 left/top（相对父容器尺寸计算），不修改 right/bottom/transform
                            // if (
                            //   elemLayer?.attrs?.absoluteElem &&
                            //   editingElemId
                            // ) {
                            //   const layerRoot = document.getElementById(
                            //     `layer_root_${editingElemId}`
                            //   );
                            //   const absoluteElemContainer =
                            //     layerRoot?.parentElement as HTMLElement | null;
                            //   const parentContainer =
                            //     absoluteElemContainer?.parentElement || null;
                            //   if (!absoluteElemContainer || !parentContainer) {
                            //     return;
                            //   }
                            //   const parentRect =
                            //     parentContainer.getBoundingClientRect();
                            //   const containerRect =
                            //     absoluteElemContainer.getBoundingClientRect();

                            //   const newPosition: any = {
                            //     ...(elemLayer?.attrs?.position || {}),
                            //   };

                            //   // 水平对齐：使用 left 数值
                            //   if (typeof nextVal.justifySelf !== "undefined") {
                            //     if (nextVal.justifySelf === "center") {
                            //       newPosition.left = Math.round(
                            //         (parentRect.width - containerRect.width) / 2
                            //       );
                            //     } else if (nextVal.justifySelf === "flex-end") {
                            //       newPosition.left = Math.max(
                            //         0,
                            //         parentRect.width - containerRect.width
                            //       );
                            //     } else if (
                            //       nextVal.justifySelf === "flex-start"
                            //     ) {
                            //       newPosition.left = 0;
                            //     } else if (nextVal.justifySelf === "stretch") {
                            //       // 简化：不改变尺寸，仅贴左侧
                            //       newPosition.left = 0;
                            //     }
                            //   }

                            //   // 垂直对齐：使用 top 数值
                            //   if (typeof nextVal.alignSelf !== "undefined") {
                            //     if (nextVal.alignSelf === "center") {
                            //       newPosition.top = Math.round(
                            //         (parentRect.height - containerRect.height) /
                            //           2
                            //       );
                            //     } else if (nextVal.alignSelf === "flex-end") {
                            //       newPosition.top = Math.max(
                            //         0,
                            //         parentRect.height - containerRect.height
                            //       );
                            //     } else if (nextVal.alignSelf === "flex-start") {
                            //       newPosition.top = 0;
                            //     } else if (nextVal.alignSelf === "stretch") {
                            //       // 简化：不改变尺寸，仅贴顶部
                            //       newPosition.top = 0;
                            //     }
                            //   }
                            //   console.log("newPosition", newPosition);

                            //   editorSDK?.changeCompAttr(editingElemId, {
                            //     position: newPosition,
                            //     _v: (elemLayer?.attrs._v || 0) + 1,
                            //   });
                            //   return;
                            // }
                            handleChangeStyle(
                              {
                                editingElemId,
                              },
                              nextVal
                            );
                          }}
                        />
                      </>
                    )}
                    {subTabValue === 'animate' && (
                      <>
                        <AnimationSetting
                          targetId={`layer_root_${widgetState.editingElemId}`}
                          value={animateQueue}
                          onChange={nextVal => {
                            if (elemLayer?.elemId) {
                              editorSDK?.fullSDK.setLink(elemLayer?.elemId, {
                                animateQueue: nextVal,
                              });

                              // 强制更新
                              editorSDK?.changeCompAttr(elemLayer?.elemId, {
                                ...elemLayer?.attrs,
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
                            editorSDK?.changeWidgetState({
                              playAnimationInEditor:
                                !widgetState.playAnimationInEditor,
                            });
                          }}
                        >
                          {widgetState.playAnimationInEditor
                            ? '停止动画'
                            : '播放动画'}
                        </Button>
                        <AnimationSetting2
                          elementRef={layer?.elementRef}
                          targetId={`${widgetState.editingElemId}`}
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
            <TabsContent value='cell'>
              {(() => {
                const editStyle = getEditStyle({
                  activeCellId,
                  activeRowId,
                });
                return (
                  <div style={{ height: '100%', overflow: 'auto' }}>
                    <StyleCustomSetting
                      useFrontground={false}
                      showAutoLayout={true}
                      showPositioning={true}
                      style={editStyle || {}}
                      onChange={nextVal => {
                        handleChangeStyle(
                          {
                            activeCellId,
                            activeRowId,
                          },
                          nextVal
                        );
                      }}
                    />
                  </div>
                );
              })()}
            </TabsContent>
            <TabsContent value='row'>
              {(() => {
                const editStyle = getEditStyle({
                  activeRowId,
                });
                return (
                  <div style={{ height: '100%', overflow: 'auto' }}>
                    <StyleCustomSetting
                      useFrontground={true}
                      showAutoLayout={true}
                      showPositioning={false}
                      style={editStyle || {}}
                      onChange={nextVal => {
                        handleChangeStyle(
                          {
                            activeRowId,
                          },
                          nextVal
                        );
                      }}
                    />
                  </div>
                );
              })()}
            </TabsContent>
            <TabsContent value='block'>
              {(() => {
                const currBlock = rowsGroup.find(group =>
                  group.rowIds.includes(activeRowId || '')
                );
                if (!currBlock) return null;
                const editStyle = cellsMap.find(
                  row => row.id === currBlock.groupId
                )?.groupStyle;
                const currRow = cellsMap.find(
                  row => row.id === currBlock.groupId
                );
                return (
                  <div style={{ height: '100%', overflow: 'auto' }}>
                    <div className='paiban_items parallax_scroll_bg_btn flex items-center gap-1'>
                      <LottieSetting
                        lottieBgConfig={currRow?.lottieBgConfig}
                        lottieFgConfig={currRow?.lottieFgConfig}
                        onChangeBg={lottieBgConfig => {
                          changeRowAttrs({
                            lottieBgConfig,
                          });
                        }}
                        onChangeFg={lottieFgConfig => {
                          changeRowAttrs({
                            lottieFgConfig,
                          });
                        }}
                      />
                    </div>
                    <StyleCustomSetting
                      useFrontground={true}
                      style={editStyle || {}}
                      onChange={nextVal => {
                        changeRowAttrs(
                          {
                            groupStyle: nextVal,
                          },
                          {
                            activeRowId: currBlock.groupId,
                          }
                        );
                      }}
                    />
                  </div>
                );
              })()}
            </TabsContent>
            <TabsContent value='page' key={gridId}>
              {(() => {
                return (
                  <div style={{ height: '100%', overflow: 'auto' }}>
                    <div className='flex flex-wrap p-2 pt-0 gap-1'>
                      <div className='paiban_items'>
                        <Button
                          className='paiban_item px-2'
                          size='xs'
                          variant='outline'
                          onClick={() => {
                            handleClearStyle();
                          }}
                        >
                          清空样式
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
                              widgetState;
                            editorSDK?.changeWidgetState({
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
                        <Label htmlFor='parallax_scroll_bg_btn'>视差背景</Label>
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
                      style={pageStyle || {}}
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
                          changeRowAttrs({
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
                          const nextCellMap = deepClone(cellsMap);
                          nextCellMap.forEach((row, idx) => {
                            nextCellMap[idx] = {
                              ...row,
                              animationType: animationType,
                            };
                          });
                          editorSDK?.changeCompAttr(gridId, {
                            cellsMap: nextCellMap,
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
  );
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PlatformCompProps } from '@mk/widgets-bridge-sdk';
import ReactDOM from 'react-dom';
import {
  EventEmitter,
  DebounceClass,
  mergeDeep,
  queryToObj,
  isAndroid,
  isPc,
} from '@mk/utils';
import clas from 'classnames';
import { getPermissionData, getWorksDetailStatic } from '@mk/services';
import { GridCell, GridProps, GridState } from '../shared';
import { deepClone, blockStyleFilter } from '../shared/utils';
import Indicator from './components/Indicator';
import './index.scss';
import './lib/animate.css';
import { handleWidgetDidLoaded, getAllLayers } from './utils';
import i18nModule from '../shared/i18n';
import { WidgetItemRenderer } from './WidgetItemRendererV1';
import RowRender from './components/RowRenderer';
import LongPageRowEditor from './components/RowRenderer/LongPageRowEditor';
import AnimateCover, { AnimateCoverRef } from './components/AnimateCover';
import { useAutoScroll } from './hooks/autoScroll';
import { useGlobalTypingStatus } from './hooks/useGlobalTypingStatus';
import DesignerOperatorV1 from '../DesignerToolForEditor/DesignerOperator';
import { useGridContext } from './provider';
import EditFormForCopyableCellWrapper from '../UserForm/Setting/EditFormForRepeatList';
import ContainerWithBg from './ContainerWithBg';
import AddContent from './components/AddContent';
import SettingWidget from '../UserForm/Setting/SettingWidget';
import WidgetLoader from './WidgetLoader';
import { countChild, getCanvaInfo2, getLink } from './provider/utils';
import { isPictureUserEditable } from './components/ImgLiteCompV2';

const didLoadedDebounce = new DebounceClass();
const debounce = new DebounceClass();

/**
 * 网格v1，2025年8月14日已归档，不再修改
 * @deprecated
 */
export const GridCompV1: React.FC<
  PlatformCompProps<GridProps, GridState>
> = props => {
  const {
    lifecycle: { didMount, didLoaded: _didLoaded },
    controledValues,
    readonly = true,
    editorSDK,
    containerInfo,
    pageInfo,
    id,
    getWorksData,
    widgetState,
    isActivePage,
    viewerSDK,
  } = props;
  const {
    cellsMap,
    gridsData,
    gridStyle,
    gridProps,
    deleteCell,
    deleteComp,
    getStyleByTag2,
  } = useGridContext();
  const worksDetail = getWorksDetailStatic();
  const canvaInfo = getCanvaInfo2();
  const [isAnimationCoverEnd, setIsAnimationCoverEnd] = useState(
    !gridProps.coverAnimation || !!editorSDK
  );
  const isDesignerEditorV2 = queryToObj().designer_tool === '2';
  const isTyping = useGlobalTypingStatus();
  const [isReadyToPlayAnimation, setIsReadyToPlayAnimation] =
    useState(isAnimationCoverEnd);
  const isScreenshot = !!queryToObj().screenshot;

  const isExportVideo = !!queryToObj().exportVideo;
  const IndicatorActiveRef = useRef<typeof Indicator>(null);
  const AddContentActiveRef = useRef<typeof AddContent>(null);
  const GridRef = useRef<HTMLDivElement>(null);
  const animateCoverRef = useRef<AnimateCoverRef>(null);
  const editable = !!editorSDK && !readonly;
  const worksData = getWorksData();
  const worksStore = editorSDK?.fullSDK;
  const childCount = useRef<number>(countChild(cellsMap, worksData));
  // const childCountV2 = useRef<number>(getChildCountV2(gridsData, worksData));
  const { activeCellId, activeRowId, editingElemId } = widgetState || {};
  const { pageIndex } = pageInfo;
  const fullStack = getPermissionData().materialProduct;
  const isFlipPage = worksDetail?.specInfo?.is_flip_page;
  const { isWebsite } = canvaInfo;

  const supportAutoScroll = useMemo(() => {
    return (
      isWebsite &&
      worksDetail?.specInfo?.interactive_features?.includes('zidong_gundong')
    );
  }, [worksDetail, isWebsite]);

  const { startAutoScroll, stopAutoScroll } = useAutoScroll({
    speed: 80,
    supportAutoScroll,
  });

  const onSetAutoScroll = (value: boolean) => {
    if (!supportAutoScroll) {
      return;
    }
    if (value) {
      startAutoScroll();
    } else {
      stopAutoScroll();
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    EventEmitter.on('autoScroll', onSetAutoScroll);
    return () => {
      EventEmitter.rm('autoScroll', onSetAutoScroll);
    };
  }, [typeof window]);

  // 国际化
  const [initialized, setInitialized] = useState(false);
  const initI18n = async () => {
    if (initialized) {
      return;
    }
    await i18nModule.init();
    setInitialized(true);
  };
  const allLayerMap = getAllLayers(worksData);
  const getLayer = (elemId: string) => {
    const layer = allLayerMap[elemId];
    // if (!layer) {
    //   console.log("elemIdNotFound", elemId)
    // }
    return layer;
  };

  const didLoaded = () => {
    const startAnimation = () => {
      setTimeout(() => {
        animateCoverRef.current?.startAnimation();
        setTimeout(() => {
          setIsReadyToPlayAnimation(true);

          //视频导出强制自动滚动
          if (isExportVideo) {
            startAutoScroll();
          }

          if (!isPc() && !isScreenshot) {
            setTimeout(() => {
              startAutoScroll();
            }, 1000);
          }

          EventEmitter.emit('viewer-ready', true);
        }, 1000);
      }, 800);
    };
    setTimeout(() => {
      _didLoaded?.();
      startAnimation();
    }, 800);
  };

  /** 设置当前元素 */
  useEffect(() => {
    function setActiveIndicator() {
      // 获取data-selected的元素的data-hover-domid
      const activeDomId = document
        .querySelector('[data-actived=true]')
        ?.getAttribute('data-hover-domid');
      (IndicatorActiveRef.current as any)?.setDomID(activeDomId, '当前元素');
    }

    function setActiveAddContent() {
      // 获取data-selected的元素的data-hover-domid
      const activeDomId = document
        .querySelector('[data-actived=true]')
        ?.getAttribute('data-hover-domid');
      (AddContentActiveRef.current as any)?.setDomID(activeDomId, '当前元素');
    }
    if (IndicatorActiveRef.current) {
      setActiveIndicator();
    }
    if (AddContentActiveRef.current) {
      setActiveAddContent();
    }
  }, [activeCellId, activeRowId, editingElemId]);

  useEffect(() => {
    console.log('worksData', deepClone(worksData));
    console.log('worksDetail', deepClone(worksDetail));
    console.log('cellsMap', cellsMap);
    console.log('gridsData', gridsData);
    initI18n();

    return () => {};
  }, []);

  useEffect(() => {
    /** 安卓手机上，当焦点在编辑器内时，隐藏底部栏 */
    const handleFocusIn = () => {
      if (isAndroid()) {
        document.body.classList.add('android_focus_in');
      }
    };
    const handleFocusOut = () => {
      if (isAndroid()) {
        document.body.classList.remove('android_focus_in');
      }
    };
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, [document.activeElement]);

  useEffect(() => {
    /** 快捷键绑定 */
    function KeyCheck(event: KeyboardEvent) {
      const k = event.key;
      const deleteElemMonitor = () => {
        if (!fullStack || isTyping) {
          return;
        }
        if (k === 'Backspace') {
          if (!editorSDK) {
            return;
          }
          if (editingElemId) {
            event.preventDefault();
            event.stopPropagation();
            deleteComp();
          } else if (
            typeof activeRowId !== 'undefined' &&
            typeof activeCellId !== 'undefined' &&
            !editingElemId
          ) {
            event.preventDefault();
            event.stopPropagation();
            deleteCell();
          }
        }
      };
      deleteElemMonitor();
      const undoRedoMonitor = () => {
        // Cmd/Ctrl + Z 撤销；Shift+Cmd/Ctrl+Z 或 Ctrl+Y 重做
        const isCommand = event.metaKey || event.ctrlKey;
        const keyLower = (event.key || '').toLowerCase();
        if (!editorSDK) return;
        // 避免在输入状态触发全局撤销/重做
        if (isTyping) return;

        if (isCommand && keyLower === 'z') {
          event.preventDefault();
          event.stopPropagation();
          if (event.shiftKey) {
            worksStore?.redo?.();
          } else {
            worksStore?.undo?.();
          }
          return;
        }
        // Windows 常用 Ctrl+Y 作为重做
        if ((event.ctrlKey || event.metaKey) && keyLower === 'y') {
          event.preventDefault();
          event.stopPropagation();
          worksStore?.redo?.();
          return;
        }
      };
      undoRedoMonitor();
      const toDesignerMode = () => {
        /** 切换到设计师模式 */
        const isCommand = event.metaKey || event.ctrlKey;
        if (isCommand && event.key === 'k') {
          event.preventDefault();

          // 跳转到设计师模式，带上已有的参数，路径是 /editor-designer?{已有的参数}
          const url = new URL(window.location.href);
          url.searchParams.set('designer_tool', '2');
          url.pathname = '/editor-designer';
          const newUrl = url.toString();
          window.location.href = newUrl;
        }
        if (isCommand && event.key === 'j') {
          /** 切换到开发者模式 */
          const isDev = window.location.hostname === 'localhost';
          event.preventDefault();

          // 跳转到开发者模式，带上已有的参数，路径是 /editor-designer?{已有的参数}
          const url = new URL(window.location.href);
          url.hostname = isDev ? 'jiantieapp.com' : 'localhost';
          url.protocol = isDev ? 'https' : 'http';
          url.port = isDev ? '' : '3000';
          const newUrl = url.toString();
          window.location.href = newUrl;
        }
      };
      toDesignerMode();
    }
    document.addEventListener('keydown', KeyCheck);

    return () => {
      document.removeEventListener('keydown', KeyCheck);
    };
  }, [activeCellId, activeRowId, editingElemId, isTyping]);

  // 监听 GridRef 高度变化
  // useEffect(() => {
  //   if (!GridRef.current || !editorSDK) {
  //     return;
  //   }
  //   const { canvaScale } = canvaInfo;

  //   const calcViewerHeight = () => {
  //     let totalHeight = 0;
  //     const blockItems = GridRef.current?.querySelectorAll<HTMLDivElement>(
  //       ".editor_row_wrapper"
  //     );
  //     if (!blockItems) {
  //       return null;
  //     }
  //     Array.from(blockItems).forEach((item) => {
  //       if (item) {
  //         // const height = item.clientHeight / canvaScale;
  //         const height =
  //           (item.getBoundingClientRect()?.height || 1) / canvaScale;
  //         totalHeight += height;
  //       }
  //     });
  //     return totalHeight;
  //   };

  //   const resizeObserver = new ResizeObserver((entries) => {
  //     debounce.exec(() => {
  //       for (const entry of entries) {
  //         const height = calcViewerHeight();
  //         // console.log("canvaInfo.canvaH", canvaInfo.canvaH);
  //         // console.log("height", height);
  //         if (height && height !== canvaInfo.canvaH) {
  //           console.log("nextHeight", height);
  //           // console.log("_canvaInfo", _canvaInfo);
  //           // console.log("height", height);
  //           editorSDK.fullSDK.setPageCanvaHeight(pageIndex, height);
  //         }
  //       }
  //     }, 2000);
  //   });

  //   resizeObserver.observe(GridRef.current);

  //   return () => {
  //     resizeObserver.disconnect();
  //   };
  // }, [GridRef.current, editorSDK]);

  /** 用于在编辑器内挂载完成的回调 */
  useEffect(() => {
    const handleCancelChoose = () => {
      editorSDK?.changeWidgetState({
        editingElemId: undefined,
        activeCellId: undefined,
        activeRowId: undefined,
      });
    };
    const currLink = getLink(worksData, id);

    EventEmitter.on('clearWidgetActiveStatus', handleCancelChoose);

    didMount({
      boxInfo: {
        width: canvaInfo.canvaW,
        height: currLink?.height || 300,
      },
      data: mergeDeep(
        {
          cellsMap: [
            {
              cells: [{}, {}],
              style: {},
            },
          ] as any[],
        },
        { cellsMap }
      ),
    });

    /** 用于在 viewer 广播的组件加载完成事件 */
    didLoadedDebounce.exec(() => {
      console.log('onGridAllWidgetLoadedTimeout', pageIndex);
      didLoaded();
    }, 3000);

    return () => {
      EventEmitter.rm('clearWidgetActiveStatus', handleCancelChoose);
    };
  }, []);

  useEffect(() => {
    /** 初始化设置 */
    // const setLayerInGridDisabled = () => {
    //   /** 将子元素全部设置为 disabled 状态 */
    //   if (editable) {
    //     const allLayerIds: Array<{
    //       compEntityId: string;
    //       option: { disabled: boolean };
    //     }> = [];

    //     const processChildrenRecursively = (rows: GridProps["gridsData"]) => {
    //       rows?.forEach((rowItem) => {
    //         // 处理当前行的 childrenIds（如果存在）
    //         rowItem.childrenIds?.forEach((childId) => {
    //           if (!getLink(worksData, childId)?.disabled) {
    //             allLayerIds.push({
    //               compEntityId: childId,
    //               option: {
    //                 disabled: true,
    //               },
    //             });
    //           }
    //         });

    //         // 递归处理嵌套的 children
    //         if (rowItem.children && rowItem.children.length > 0) {
    //           processChildrenRecursively(rowItem.children);
    //         }
    //       });
    //     };

    //     // 使用递归函数处理 gridsData
    //     processChildrenRecursively(gridsData);

    //     // console.log('allLayerIds', allLayerIds)
    //     if (allLayerIds.length > 0) {
    //       editorSDK?.setLayerDisableStateBatch(allLayerIds);
    //     }
    //   }
    // };
    // setLayerInGridDisabled();
    // cleanLayerInGrid()

    return () => {};
  }, []);

  const renderElems = ({
    elemId,
    rowId,
    cellId,
    renderAbsoluteElem = false,
    isCellActive,
  }: {
    elemId: string;
    rowId: string;
    cellId: string;
    renderAbsoluteElem?: boolean;
    isCellActive: boolean;
  }) => {
    const layer = getLayer(elemId);
    const { editingElemId } = widgetState;
    const layerLink = getLink(worksData, elemId);
    if (!layer || !layerLink) {
      // console.log("layer", layer)
      // console.log("layerLink", layerLink)
      return (
        <span
          data-log={`没有元素: ${elemId}`}
          key={`empty_elem_${elemId}`}
        ></span>
      );
    }
    const isAbsoluteElem = layer.attrs?.absoluteElem;
    const focusToEdit = !!layer.attrs?.focusToEdit;
    const disabledToEdit = !!layer.attrs?.disabledToEdit;

    if (isAbsoluteElem && !renderAbsoluteElem) {
      return null;
    }
    const isActiveElem = isCellActive || editingElemId === elemId;

    const isTextElem = /text/gi.test(layer.elementRef);
    let elemEditable = true;
    if (viewerSDK) {
      elemEditable = false;
    } else if (fullStack || focusToEdit) {
      elemEditable = true;
    } else if (isAbsoluteElem) {
      if (isTextElem) {
        elemEditable = !disabledToEdit;
      } else {
        elemEditable =
          isPictureUserEditable({
            aspectRatio: layer.attrs.baseW / layer.attrs.baseH,
            imgWidth: layer.attrs.baseW,
          }) ||
          (!disabledToEdit && focusToEdit);
      }
    } else if (!isAbsoluteElem) {
      elemEditable = !disabledToEdit;
    }
    const itemDOM = (
      <WidgetItemRenderer
        key={`${elemId}`}
        {...{
          readyToPlayAnimation: true,
          editable: elemEditable,
          isAbsoluteElem,
          layer,
          fullStack,
          isActive: isActiveElem,
          layerLink,
          elemId,
          readonly,
          editorSDK,
          canvaInfo,
          pageInfo,
          viewerSDK,
          containerInfo,
          onElemClick: (e, { targetElemId }) => {
            e.preventDefault();
            e.stopPropagation();
            if (!elemEditable) {
              return;
            }
            // if (!fullStack && isAbsoluteElem) {
            //   return;
            // }
            if (!isActivePage) {
              editorSDK?.setActivePageIdx(pageIndex);
            }
            if (editingElemId === targetElemId) {
              return;
            }
            if (!fullStack && layer.attrs?.disabledToEdit) {
              return;
            }
            editorSDK?.changeWidgetState({
              editingElemId: targetElemId,
              activeRowId: rowId,
              activeCellId: cellId,
            });
          },
          didLoaded: compId => {
            handleWidgetDidLoaded({
              pageIndex,
              compId,
              shouldLoadedCount: childCount.current,
              onAllWidgetLoaded: () => {
                console.log('onGridElemAllWidgetLoaded', pageIndex, id);
                didLoaded();
                didLoadedDebounce.cancel();
              },
            });
          },
        }}
      />
    );
    return itemDOM;
  };

  const renderCells2 = (currCol: GridCell, rowId: string) => {
    const cellId = currCol.id;
    const isSelectedCell = activeCellId === cellId;
    const isActiveCell = fullStack && isSelectedCell && !editingElemId;
    const currCellStyle = currCol.style || {};
    const currCellChildrenIds = (currCol.childrenIds || [])?.filter(id => {
      const layer = getLayer(id);
      return !layer?.attrs?.absoluteElem;
    });
    const currRow = cellsMap.find(row => row.id === rowId);

    if (currCellChildrenIds.length === 0) {
      return null;
    }

    const cellItem = (
      <ContainerWithBg
        needBg={false}
        className={clas(
          'Cell',
          isActiveCell && 'active',
          isSelectedCell && 'selected',
          'hover_elem_v1',
          `cell_${cellId}`
        )}
        data-tag={currCol.tag}
        id={`editor_cell_${cellId}`}
        style={(() => {
          let styleTemplate: any = {};
          if (currRow?.isRepeatList) {
            styleTemplate = currRow.repeatItemTemplate?.style || {};
          }
          const styleFromTag = getStyleByTag2(currCol.tag as any);
          const hasDisplay = currCellStyle.display || styleFromTag.display;
          const cellStyle = blockStyleFilter({
            gridTemplateColumns: `1fr`,
            // width: "100%",
            zIndex: 1,
            ...styleFromTag,
            ...currCellStyle,
            display: hasDisplay || 'flex',
            flexDirection:
              typeof hasDisplay === 'undefined'
                ? 'column'
                : currCellStyle.flexDirection || styleFromTag.flexDirection,
            writingMode: 'unset',
            ...styleTemplate,
          });
          return cellStyle;
        })()}
        data-id={cellId}
        key={`cell_${cellId}`}
        data-hover-title='单元格'
        data-hover-domid={`#editor_cell_${cellId}`}
        data-actived={isActiveCell}
        onClick={e => {
          // 非设计师不可选
          if (!editorSDK || !fullStack) return;
          e.preventDefault();
          e.stopPropagation();

          editorSDK?.changeWidgetState({
            activeRowId: rowId,
            activeCellId: cellId,
            editingElemId: undefined,
          });
        }}
      >
        {currCellChildrenIds.map((elemId, index) => {
          if (!elemId) {
            return (
              <div data-tip='empty_elem' key={`empty_elem_${index}`}></div>
            );
          }
          const isCellActive = fullStack && isSelectedCell && !editingElemId;
          // const isCellActive =
          //   (fullStack || isCellCopyable) &&
          //   isSelectedCell &&
          //   (!editingElemId || isCellCopyable);
          return renderElems({
            elemId,
            rowId,
            cellId,
            isCellActive: !!isCellActive,
            renderAbsoluteElem: false,
          });
        })}
      </ContainerWithBg>
    );

    return cellItem;
  };

  const renderRow = () => {
    if (editorSDK) {
      return (
        <LongPageRowEditor
          id={id}
          worksData={worksData}
          readonly={readonly}
          onRenderCell={renderCells2}
          onRenderElem={renderElems}
          fullStack={fullStack}
          canvaInfo={canvaInfo}
          containerInfo={containerInfo}
        />
      );
    }
    return (
      <RowRender
        id={id}
        worksData={worksData}
        readonly={readonly}
        onRenderCell={renderCells2}
        onRenderElem={renderElems}
        fullStack={fullStack}
        canvaInfo={canvaInfo}
        containerInfo={containerInfo}
        isPlayFlipPage={isAnimationCoverEnd}
        isFlipPage={isFlipPage}
      />
    );
  };

  const renderWidgetSetting = () => {
    if (isScreenshot || !editorSDK) {
      return null;
    }
    const dom = <SettingWidget worksData={worksData} />;
    if (fullStack) {
      return dom;
    }
    return ReactDOM.createPortal(
      dom,
      document.querySelector('#editor_container') || document.body
    );
  };

  return (
    <>
      {editable && !isDesignerEditorV2 && (
        <Indicator ref={IndicatorActiveRef as any} />
      )}
      {/* {editable && !isDesignerEditorV2 && (
        <AddContent
          ref={AddContentActiveRef as any}
          editorCtx={editorCtx}
          editorSDK={editorSDK}
        />
      )} */}
      {editable && fullStack && isDesignerEditorV2 && <DesignerOperatorV1 />}
      <div
        className={clas('Grid_container', editable && 'editor_container')}
        ref={GridRef}
        id={`Grid_${id}`}
        key={editorSDK?.fullSDK?.focusUpdateVersion}
        data-hover-title='网格容器'
        data-hover-domid={`#Grid_${id}`}
        data-actived={false}
        style={{
          display: 'block',
          position: 'relative',
          width: fullStack ? `${canvaInfo.canvaW}px` : '100%',
          // transform: `scale(${canvaInfo.scaleRate})`,
          // transformOrigin: "top",
        }}
        onClick={e => {
          if (!editorSDK) return;
          // Check if clicking on the container itself
          if (e.target !== e.currentTarget) return;
          e.preventDefault();
          e.stopPropagation();
          console.log('点击了容器，取消所有选中状态');
          editorSDK.changeWidgetState({
            activeRowId: undefined,
            activeCellId: undefined,
            editingElemId: undefined,
          });
        }}
      >
        <ContainerWithBg
          className={clas(
            'GridV2Comp',
            fullStack && 'full_editing',
            editable && 'interactive'
          )}
          id={id}
          parallaxScrollBgConfig={gridProps.parallaxScrollBgConfig}
          lottieBgConfig={gridProps.lottieBgConfig}
          style={(() => {
            const styleData = blockStyleFilter({
              // background: "unset",
              ...getStyleByTag2('page', gridStyle),
              placeItems: 'stretch',
              // display: "grid",
              position: 'relative',
              zIndex: 2,
              // gridTemplateColumns: `repeat(1fr)`,
              display: 'flex',
              flexDirection: 'column',
              ...(isFlipPage && {
                gap: 0,
                height: '100%',
              }),
            });
            return styleData;
          })()}
        >
          {renderRow()}
        </ContainerWithBg>
      </div>

      {editorSDK && (
        <>
          <EditFormForCopyableCellWrapper />
        </>
      )}
      {!editable && !isScreenshot && (
        <AnimateCover
          coverAnimation={controledValues.coverAnimation}
          ref={animateCoverRef}
          onComplete={() => {
            setIsAnimationCoverEnd(true);
          }}
        />
      )}
      {renderWidgetSetting()}
      {isWebsite && !isExportVideo && !isScreenshot && viewerSDK && (
        <WidgetLoader worksData={worksData} viewewSDK={viewerSDK} />
      )}
    </>
  );
};

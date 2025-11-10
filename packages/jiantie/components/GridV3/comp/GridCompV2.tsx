import { getPermissionData, getWorksDetailStatic } from '@mk/services';
import {
  DebounceClass,
  EventEmitter,
  isAndroid,
  isPc,
  queryToObj,
} from '@mk/utils';
import { PlatformCompProps } from '@mk/widgets-bridge-sdk';
import clas from 'classnames';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import DesignerOperatorV2 from '../DesignerToolForEditor/DesignerOperatorV2';
import SettingWidgetV3 from '../UserForm/Setting/SettingWidgetV3';
import { GridProps, GridRow, GridState } from '../shared';
import i18nModule from '../shared/i18n';
import { blockStyleFilter, setSystemThemeColor } from '../shared/utils';
import ContainerWithBgV2 from './ContainerWithBgV2';
import AnimateCover, { AnimateCoverRef } from './components/AnimateCover';
import RowRendererV2 from './components/RowRendererV2';
import LongPageRowEditorV2 from './components/RowRendererV2/LongPageRowEditorV2';
import ShortcutHelp from './components/ShortcutHelp';
import { useAutoScroll } from './hooks/autoScroll';
import { useShortcut } from './hooks/useShortcut';
import './index.scss';
import './lib/animate.css';
import { useGridContext } from './provider';
import { getCanvaInfo2 } from './provider/utils';
import { calcBlockHeight2, getAllLayers } from './utils';

const debounce = new DebounceClass();

export const GridCompV2: React.FC<
  PlatformCompProps<GridProps, GridState>
> = props => {
  const {
    lifecycle: { didMount, didLoaded: _didLoaded },
    controledValues,
    readonly = true,
    editorSDK,
    pageInfo,
    id,
    getWorksData,
    viewerSDK,
  } = props;
  // console.count(`GridCompV2_${id}`);
  const {
    gridsData,
    widgetStateV2,
    gridProps,
    themeConfig,
    getStyleByTag2,
    getActiveRootRow,
    setRowAttrsV2,
    gridStyle,
  } = useGridContext();
  useShortcut();
  const currBlock = getActiveRootRow();
  const worksDetail = getWorksDetailStatic();
  const canvaInfo = getCanvaInfo2();
  const { isWebsite, isFixedHeight, maxPageCount } = canvaInfo;
  const [isAnimationCoverEnd, setIsAnimationCoverEnd] = useState(
    !gridProps.coverAnimation || !!editorSDK
  );
  const [isReadyToPlayAnimation, setIsReadyToPlayAnimation] =
    useState(isAnimationCoverEnd);
  const isScreenshot = !!queryToObj().screenshot;

  function waitAllAnimations() {
    return new Promise(resolve => {
      let running = 0;

      function check() {
        if (running === 0) {
          resolve(void 0);
        }
      }

      document.addEventListener('animationstart', () => {
        running++;
      });

      document.addEventListener('transitionstart', () => {
        running++;
      });

      document.addEventListener('animationend', () => {
        running--;
        check();
      });

      document.addEventListener('transitionend', () => {
        running--;
        check();
      });
    });
  }

  const isExportVideo = !!queryToObj().exportVideo;
  const GridRef = useRef<HTMLDivElement>(null);
  const animateCoverRef = useRef<AnimateCoverRef>(null);
  const editable = !!editorSDK && !readonly;
  const worksData = getWorksData();
  const fullStack = getPermissionData().materialProduct;
  const isFlipPage = worksDetail?.specInfo?.is_flip_page;

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

  useEffect(() => {
    const clearNoneRefElem = () => {
      // 清除V2中没有被引用的Elem
      if (!editorSDK) return;
      const layers = getAllLayers(getWorksData());
      const allElemIdsInGrid: string[] = [];
      const willRemoveElemIds: string[] = [];
      const takeChildRecursively = (row: GridRow[]) => {
        row.forEach(row => {
          allElemIdsInGrid.push(...(row.childrenIds || []));
          if (row.children) {
            for (let i = 0; i < row.children?.length; i++) {
              takeChildRecursively(row.children);
            }
          }
        });
      };
      takeChildRecursively(gridsData);
      Object.values(layers)?.forEach(layer => {
        // 删除图片或文字
        if (
          /text|picture/gi.test(layer.elementRef) &&
          !allElemIdsInGrid.includes(layer.elemId)
        ) {
          willRemoveElemIds.push(layer.elemId);
        }
      });
      // console.log("allElemIdsInGrid", allElemIdsInGrid);
      // console.log("willRemoveElemIds", willRemoveElemIds);
      if (willRemoveElemIds.length > 0) {
        editorSDK.deleteCompEntity(willRemoveElemIds);
      }
    };
    clearNoneRefElem();
  }, []);

  useEffect(() => {
    const setThemeColor = () => {
      const themeColors = themeConfig.themeColors;
      if (themeColors) {
        setSystemThemeColor(themeColors);
      }
    };
    setThemeColor();
  }, [JSON.stringify(themeConfig.themeColors)]);

  // 国际化
  const [initialized, setInitialized] = useState(false);
  const initI18n = async () => {
    if (initialized) {
      return;
    }
    await i18nModule.init();
    setInitialized(true);
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

  useEffect(() => {
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
    // 监听每一个block的高度变化
    if (!GridRef.current || !editorSDK) {
      return;
    }

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (currBlock) {
          const blockHeight = calcBlockHeight2();
          const height = blockHeight[currBlock?.id || ''];
          if (
            height &&
            Math.abs(height - (currBlock.canvasHeight || 0)) > 2 &&
            widgetStateV2.activeRowDepth?.[0] !== undefined
          ) {
            // 误差小于1
            setRowAttrsV2(
              {
                canvasHeight: height,
              },
              {
                activeRowDepth: [widgetStateV2.activeRowDepth?.[0]],
              }
            );
          }
        }
      }
    });

    resizeObserver.observe(GridRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [widgetStateV2.activeRowDepth, editorSDK, currBlock, setRowAttrsV2]);

  const renderRow = () => {
    if (editorSDK) {
      return (
        <LongPageRowEditorV2
          didLoaded={didLoaded}
          readonly={readonly}
          activeRowDepth={widgetStateV2.activeRowDepth || []}
          onlyRenderActiveBlock={widgetStateV2.onlyRenderActiveBlock || false}
        />
      );
    }
    return (
      <RowRendererV2
        didLoaded={didLoaded}
        readonly={readonly}
        isPlayFlipPage={isAnimationCoverEnd}
        isFlipPage={worksDetail?.specInfo?.is_flip_page}
        activeRowDepth={widgetStateV2.activeRowDepth || []}
        onlyRenderActiveBlock={widgetStateV2.onlyRenderActiveBlock || false}
      />
    );
  };

  const renderWidgetSetting = () => {
    let dom = null;
    if (!canvaInfo.isWebsite || isScreenshot || !editorSDK) {
      return dom;
    }
    // dom = <SettingWidgetV3 worksData={worksData} />;
    dom = (
      <SettingWidgetV3 worksData={worksData} />
      // <>
      //   {gridProps.themePackV3RefId?.version === 'v3' ||
      //   gridProps.themePackV3?.content?.worksId ? (
      //     <SettingWidgetV3 worksData={worksData} />
      //   ) : (
      //     <SettingWidgetV2 worksData={worksData} />
      //   )}
      // </>
    );
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
      {editable && <DesignerOperatorV2 />}
      <div
        className={clas('Grid_container', editable && 'editor_container')}
        ref={GridRef}
        id={`Grid_${id}`}
        key={editorSDK?.fullSDK?.focusUpdateVersion}
        data-hover-title='网格容器'
        data-hover-domid={`#Grid_${id}`}
        data-actived={false}
        style={{
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          width: fullStack ? `${canvaInfo.canvaW}px` : '100%',
          ...(isFixedHeight &&
            !isWebsite && {
              justifyContent: 'center',
            }),
        }}
      >
        <ContainerWithBgV2
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
              // placeItems: 'stretch',
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
        </ContainerWithBgV2>
      </div>

      {!editable && !isScreenshot && (
        <AnimateCover
          coverAnimation={controledValues.coverAnimation}
          ref={animateCoverRef}
          onComplete={() => {
            setIsAnimationCoverEnd(true);
          }}
        />
      )}
      {/* 用户的组件设置 */}
      {renderWidgetSetting()}

      {/* 快捷键说明组件 - 外挂到designer_scroll_container */}
      {fullStack && (
        <>
          <ShortcutHelp targetContainer='#designer_scroll_container' />
        </>
      )}
    </>
  );
};

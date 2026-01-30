import { LayerElemItem } from '@/components/GridEditorV3/works-store/types';
import RSVPComp from '@/components/RSVP/comp';
import { getAppId } from '@/services';
import { EventEmitter, isAndroid, isPc, queryToObj } from '@/utils';
import { cn } from '@workspace/ui/lib/utils';
import clas from 'classnames';
import { observer } from 'mobx-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import DesignerOperatorV2 from '../componentsForEditor/DesignerOperatorV2';
import { useAutoScroll } from '../hooks/autoScroll';
import { useShortcut } from '../hooks/useShortcut';
import { GridRow } from '../utils';
import i18nModule from '../utils/i18n';
import { blockStyleFilter } from '../utils/utils1';
import { useWorksStore } from '../works-store/store/hook';
import AnimateCover, { AnimateCoverRef } from './AnimateCover';
import ContainerWithBgV2 from './ContainerWithBgV2';
import GlobalSetting from './Export/GlobalSetting';
import RowRendererV2 from './RowRendererV2';
import { LongPageRowEditorObserver } from './RowRendererV2/LongPageRowEditorV2';

export const GridCompV2 = () => {
  const worksStore = useWorksStore();
  const { getStyleByTag2 } = worksStore;
  const {
    worksData,
    gridPropsOperator,
    worksDetail,
    widgetStateV2,
    getCanvaInfo,
    fullStack,
    config: { readonly },
  } = worksStore;
  const { gridProps } = worksData;
  const { gridsData } = gridProps;
  const { getActiveRootRow } = gridPropsOperator;

  // 国际化
  const [initialized, setInitialized] = useState(false);

  useShortcut(); // 快捷键

  const currBlock = getActiveRootRow();
  const canvaInfo = getCanvaInfo();
  const { isWebsite, isFixedHeight, viewportScale } = canvaInfo;
  const [isAnimationCoverEnd, setIsAnimationCoverEnd] = useState(
    !gridProps.coverAnimation || !!readonly
  );
  const [isReadyToPlayAnimation, setIsReadyToPlayAnimation] =
    useState(isAnimationCoverEnd);
  const isScreenshot = !!queryToObj().screenshot;

  const isExportVideo = !!queryToObj().exportVideo;
  const GridRef = useRef<HTMLDivElement>(null);
  const animateCoverRef = useRef<AnimateCoverRef>(null);
  const editable = !readonly;
  const firstPageCover = gridProps.firstPageCover;
  const isFlipPage =
    worksDetail?.specInfo?.is_flip_page || firstPageCover || false;

  const supportAutoScroll = useMemo(() => {
    return (
      isWebsite &&
      worksDetail?.specInfo?.interactive_features?.includes('zidong_gundong') &&
      !worksDetail.envelope_config
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
    // 设置 viewportScale 到 body 的 CSS 变量
    if (typeof document !== 'undefined' && typeof viewportScale === 'number') {
      document.body.style.setProperty(
        '--website-viewport-scale',
        String(viewportScale)
      );
    }
    return () => {
      EventEmitter.rm('autoScroll', onSetAutoScroll);
    };
  }, [typeof window]);

  useEffect(() => {
    // const activeTopImg = () => {
    //   const images = document.querySelectorAll('[data-image-editable="true"]');
    //   if (images.length === 0) return;
    //   let topImage: HTMLElement | null = null;
    //   Array.from(images).forEach(image => {
    //     // 找到所有image中，top最小的那个
    //     const top = image.getBoundingClientRect().top;
    //     if (top < (topImage?.getBoundingClientRect().top || Infinity)) {
    //       topImage = image as HTMLElement;
    //     }
    //   });
    //   if (topImage) {
    //     console.log('topImage', topImage);
    //   }
    // };
    // activeTopImg();

    const clearNoneRefElem = () => {
      // 清除V2中没有被引用的Elem
      if (readonly) return;
      const layers = worksData.layersMap;
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
        worksStore.deleteCompEntity(willRemoveElemIds);
      }
    };
    clearNoneRefElem();
  }, []);

  useEffect(() => {
    const initI18n = async () => {
      if (initialized) {
        return;
      }
      await i18nModule.init();
      setInitialized(true);
    };
    initI18n();

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
        startAnimation();
      }, 800);
    };

    setTimeout(() => {
      didLoaded();
    }, 2000);

    return () => { };
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

  const renderRow = () => {
    if (!readonly) {
      return (
        <LongPageRowEditorObserver
          readonly={readonly}
          activeRowDepth={widgetStateV2.activeRowDepth || []}
          onlyRenderActiveBlock={widgetStateV2.onlyRenderActiveBlock || false}
        />
      );
    }
    return (
      <RowRendererV2
        firstPageCover={gridProps.firstPageCover}
        readonly={readonly}
        isPlayFlipPage={isAnimationCoverEnd}
        isFlipPage={isFlipPage}
        activeRowDepth={widgetStateV2.activeRowDepth || []}
        onlyRenderActiveBlock={widgetStateV2.onlyRenderActiveBlock || false}
      />
    );
  };

  // 检查是否需要自动渲染 RSVP 触发按钮
  const shouldAutoRenderRSVP =
    isWebsite && worksDetail?.rsvp_form_config?.enabled;

  // 创建虚拟的 RSVP layer 对象
  const autoRSVPLayer = useMemo<LayerElemItem | null>(() => {
    if (!shouldAutoRenderRSVP) {
      return null;
    }
    return {
      type: 'element',
      elemId: 'auto_rsvp_trigger',
      elementRef: 'rsvp1',
      attrs: {
        displayMode: 'canvas_trigger',
        worksId: worksDetail?.id,
      },
    } as LayerElemItem;
  }, [shouldAutoRenderRSVP]);

  const hasRsvpLayer = useMemo(() => {
    return Object.values(worksData.layersMap).some(layer =>
      /RSVP1/gi.test(layer.elementRef)
    );
  }, [worksData]);

  return (
    <>
      {editable && (
        <>
          <DesignerOperatorV2 />
          <GlobalSetting />
        </>
      )}
      <div
        className={cn('Grid_container', editable && 'editor_container')}
        ref={GridRef}
        id={`Grid_${worksDetail.id}`}
        // key={worksStore.focusUpdateVersion}
        data-hover-title='网格容器'
        data-hover-domid={`#Grid_${worksDetail.id}`}
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
          id={worksDetail.id}
          parallaxScrollBgConfig={gridProps.parallaxScrollBgConfig}
          lottieBgConfig={gridProps.lottieBgConfig}
          style={(() => {
            const styleData = blockStyleFilter({
              // background: "unset",
              ...getStyleByTag2('page', gridProps.style),
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
        {worksDetail?.specInfo?.is_flat_page &&
          !isScreenshot &&
          !/^T_/gi.test(worksDetail?.id) &&
          readonly &&
          getAppId() === 'jiantie' && (
            <div
              onClick={() => {
                if (!readonly) {
                  // 编辑器内不跳转
                  return;
                }
                // router.push('/mobile/channel2/homev2/appDownload');
                window.location.replace('/mobile/channel2/homev2/appDownload');
              }}
              className='absolute bottom-0 left-0 w-full z-10 flex justify-center items-center gap-2 text-[11px] font-medium uppercase tracking-[0.32em] text-white/80'
            >
              <img
                src='https://res.maka.im/assets/jiantie/Frame%201321318475.png'
                alt='logo'
                className='w-full'
              />
            </div>
          )}
      </div>

      {!editable && !isScreenshot && (
        <AnimateCover
          coverAnimation={gridProps.coverAnimation}
          ref={animateCoverRef}
          onComplete={() => {
            setIsAnimationCoverEnd(true);
          }}
        />
      )}
      {/* 自动渲染 RSVP 触发按钮 */}
      {!hasRsvpLayer && autoRSVPLayer && worksDetail?.id && !isScreenshot && (
        <RSVPComp
          worksId={worksDetail.id}
          canCreate={!readonly}
          theme={(autoRSVPLayer.attrs as any)?.theme}
        />
      )}
    </>
  );
};

export default observer(GridCompV2);

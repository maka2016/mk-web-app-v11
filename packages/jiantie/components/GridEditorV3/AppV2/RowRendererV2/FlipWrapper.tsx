import styled from '@emotion/styled';
import { AnimatePresence, motion, Transition } from 'motion/react';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { queryToObj } from '../../../../utils';
import { PageAnimationConfig } from '../../utils';
import { useWorksStore } from '../../works-store/store/hook';
import FlipIndicator from './FlipIndicator';
import PageIndicator from './PageIndicator';

interface FlipPageContentProps {
  direction: 'left' | 'right' | 'center';
  isCurrent: boolean;
  isNext: boolean;
  offsetTop: number;
  offsetLeft: number;
}

const FlipPageContent = styled(motion.div) <FlipPageContentProps>`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  overflow: hidden;
  transform-origin: ${props => `${props.direction || 'center'} center`};
  backface-visibility: hidden;
  transform-style: preserve-3d;
  perspective: 1000px;
`;

const FlipPageRoot = styled.div`
  perspective: 1000px;
`;

interface FlipWrapperProps {
  children: React.ReactNode[];
  onPageChange?: (pageIndex: number) => void;
}

// 暴露给外部的方法接口
export interface FlipWrapperRef {
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (pageIndex: number) => void;
  /** 下一页；若已在最后一页则回到第一页（预览区循环播放用） */
  nextPageOrGoToFirst: () => void;
  startAutoPlay: (interval?: number) => void;
  stopAutoPlay: () => void;
  isAnimating: boolean;
  currentPage: number;
}

// 动画配置
const getAnimationProps = ({
  isCurrent,
  isNext,
  animationType,
}: {
  isCurrent: boolean;
  isNext: boolean;
  animationType: PageAnimationConfig | undefined;
}) => {
  // 获取动画配置，处理所有可能的值类型
  const getAnimationConfig = () => {
    // 如果没有配置，使用默认值
    if (!animationType || !animationType.type) {
      return {
        type: 'slide' as const,
        duration: 0.5,
        delay: 0,
        easing: 'easeInOut',
      };
    }

    // 如果是字符串类型，使用基础配置
    if (typeof animationType === 'string') {
      return {
        type: animationType,
        duration: 0.5,
        delay: 0,
        easing: 'easeInOut',
      };
    }

    // 如果是对象类型，使用完整配置
    return {
      type: animationType.type,
      duration: animationType.duration ?? 0.5,
      delay: animationType.delay ?? 0,
      easing: animationType.easing ?? 'easeInOut',
    };
  };

  const config = getAnimationConfig();

  // 创建基础过渡配置
  const createTransition = (
    type: 'spring' | 'tween' = 'tween',
    customConfig = {}
  ): Transition => {
    if (type === 'spring') {
      return {
        type: 'spring',
        delay: config.delay,
        duration: config.duration,
        stiffness: 300,
        damping: 30,
        ...customConfig,
      };
    }

    return {
      duration: config.duration,
      delay: config.delay,
      ease:
        config.easing === '[0.25, 0.1, 0.25, 1]'
          ? [0.25, 0.1, 0.25, 1]
          : (config.easing as any),
      ...customConfig,
    };
  };

  switch (config.type) {
    case 'book':
      return {
        initial: {
          x: 0,
          rotateY: 0,
          opacity: 1,
        },
        animate: {
          x: 0,
          rotateY: isCurrent ? 0 : isNext ? 125 : -30,
          opacity: isCurrent ? 1 : 0,
        },
        transition: createTransition('tween'),
      };
    case 'fade':
      return {
        initial: {
          opacity: 0,
          scale: 0.95,
        },
        animate: {
          opacity: isCurrent ? 1 : 0,
          scale: isCurrent ? 1 : 0.95,
        },
        transition: createTransition('tween'),
      };
    case 'scale':
      return {
        initial: {
          scale: 0.1,
          opacity: 0,
        },
        animate: {
          scale: isCurrent ? 1 : 0.1,
          opacity: isCurrent ? 1 : 0,
        },
        transition: createTransition('tween'),
      };
    // return {
    //   initial: {
    //     scale: 0.8,
    //     opacity: 0,
    //   },
    //   animate: {
    //     scale: isCurrent ? 1 : 0.8,
    //     opacity: isCurrent ? 1 : 0,
    //   },
    //   transition: createTransition('tween'),
    // };
    case 'flip':
      return {
        initial: {
          rotateX: isNext ? -90 : 90,
          opacity: 0,
        },
        animate: {
          rotateX: isCurrent ? 0 : isNext ? -90 : 90,
          opacity: isCurrent ? 1 : 0,
        },
        transition: createTransition('tween'),
      };
    case 'rotate':
      return {
        initial: {
          rotate: isNext ? 30 : -30,
          opacity: 0,
          scale: 0.8,
        },
        animate: {
          rotate: isCurrent ? 0 : isNext ? 30 : -30,
          opacity: isCurrent ? 1 : 0,
          scale: isCurrent ? 1 : 0.8,
        },
        transition: createTransition('tween'),
      };
    case 'slide2':
      return {
        initial: {
          y: 0,
          scale: 0.1,
          opacity: 0,
        },
        animate: {
          y: isCurrent ? 0 : isNext ? '100%' : '-100%',
          scale: isCurrent ? 1 : isNext ? 1 : 0.1,
          opacity: isCurrent ? 1 : 0,
        },
        transition: createTransition('tween'),
      };
    case 'slide':
    case 'none':
    default:
      return {};
  }
};

const FlipWrapper = forwardRef<FlipWrapperRef, FlipWrapperProps>(
  ({ children, onPageChange }, ref) => {
    const worksStore = useWorksStore();
    const { getRowByDepth } = worksStore.gridPropsOperator;
    const inViewer = worksStore.inViewer;
    const totalPages = React.Children.count(children);
    const isScreenshot = !!queryToObj().screenshot;

    // 从 URL 参数获取初始页面
    const getInitialPage = (): number => {
      if (typeof window === 'undefined') return 0;
      try {
        const query = queryToObj();
        const pageParam = query.page;
        if (pageParam) {
          const page = parseInt(pageParam, 10);
          // 确保页面索引有效（在初始化时可能 totalPages 还未准备好，所以只做基本验证）
          if (!isNaN(page) && page >= 0) {
            return page;
          }
        }
      } catch (error) {
        console.error('读取 URL 页面参数失败:', error);
      }
      return 0;
    };

    // 更新 URL 参数
    const updateUrlPage = (page: number) => {
      if (typeof window === 'undefined') return;
      try {
        const url = new URL(window.location.href);
        if (page === 0) {
          // 如果是第一页，移除 page 参数
          url.searchParams.delete('page');
        } else {
          url.searchParams.set('page', page.toString());
        }
        window.history.replaceState({}, '', url.toString());
      } catch (error) {
        console.error('更新 URL 参数失败:', error);
      }
    };

    const initialPage = getInitialPage();
    const [currentPage, _setCurrentPage] = useState(initialPage);
    const [visiblePages, setVisiblePages] = useState<number[]>([initialPage]);
    const [isAnimating, setIsAnimating] = useState(false);
    const [autoPlayEnabled, setAutoPlayEnabled] = useState(false);
    const defaultAutoPlayInterval = getRowByDepth([currentPage]);
    const [autoPlayInterval, setAutoPlayInterval] = useState(
      defaultAutoPlayInterval?.animationType?.autoplayInterval || 15
    );
    const timeoutRef = useRef<any>(null);
    const isInitializedRef = useRef(false);

    const setCurrentPage = (nextPage: number) => {
      _setCurrentPage(nextPage);
      const defaultAutoPlayInterval = getRowByDepth([nextPage]);
      setAutoPlayInterval(
        defaultAutoPlayInterval?.animationType?.autoplayInterval || 15
      );
    };

    // 初始化时从 URL 恢复页面，并验证页面索引有效性
    useEffect(() => {
      if (!isInitializedRef.current && totalPages > 0) {
        const urlPage = getInitialPage();
        // 验证并修正页面索引
        if (urlPage >= 0 && urlPage < totalPages) {
          if (urlPage !== currentPage) {
            _setCurrentPage(urlPage);
            setVisiblePages([urlPage]);
            // 更新自动播放间隔
            const defaultAutoPlayInterval = getRowByDepth([urlPage]);
            setAutoPlayInterval(
              defaultAutoPlayInterval?.animationType?.autoplayInterval || 15
            );
          }
        } else if (urlPage >= totalPages) {
          // 如果 URL 中的页面超出范围，重置为第一页并更新 URL
          _setCurrentPage(0);
          setVisiblePages([0]);
          updateUrlPage(0);
        }
        isInitializedRef.current = true;
      }
    }, [totalPages, getRowByDepth, currentPage]);

    // 监听页面变化，更新 URL 参数
    useEffect(() => {
      if (isInitializedRef.current && typeof window !== 'undefined') {
        updateUrlPage(currentPage);
      }
    }, [currentPage]);

    // 清理定时器
    const clearAutoplayTimeout = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        (timeoutRef.current as any) = null;
      }
    };

    // 设置下一次自动播放
    const scheduleNextAutoplay = (interval: number) => {
      clearAutoplayTimeout();
      timeoutRef.current = setTimeout(() => {
        const nextPage = currentPage + 1;
        if (nextPage >= React.Children.count(children)) {
          console.log('onPlayEnd');
          //pup结束录屏
          (window as any)?.onPlayEnd?.();
          // 循环到第一页
          const newPage = 0;
          setCurrentPage(newPage);
          setVisiblePages([currentPage, newPage]);
          onPageChange?.(newPage);
        } else {
          setCurrentPage(nextPage);
          setVisiblePages([currentPage, nextPage]);
          onPageChange?.(nextPage);
        }
      }, interval * 1000);
    };

    // 暴露方法给外部调用
    useImperativeHandle(
      ref,
      () => ({
        nextPage: () => {
          if (
            currentPage < React.Children.count(children) - 1 &&
            !isAnimating
          ) {
            const nextPage = currentPage + 1;
            setCurrentPage(nextPage);
            setVisiblePages([currentPage, nextPage]);
            onPageChange?.(nextPage);
          }
        },
        prevPage: () => {
          if (currentPage > 0 && !isAnimating) {
            const prevPage = currentPage - 1;
            setCurrentPage(prevPage);
            setVisiblePages([currentPage, prevPage]);
            onPageChange?.(prevPage);
          }
        },
        goToPage: (pageIndex: number) => {
          if (
            pageIndex >= 0 &&
            pageIndex < React.Children.count(children) &&
            !isAnimating
          ) {
            setCurrentPage(pageIndex);
            setVisiblePages([currentPage, pageIndex]);
            onPageChange?.(pageIndex);
          }
        },
        nextPageOrGoToFirst: () => {
          const totalPages = React.Children.count(children);
          if (totalPages <= 0 || isAnimating) return;
          if (currentPage < totalPages - 1) {
            const nextPage = currentPage + 1;
            setCurrentPage(nextPage);
            setVisiblePages([currentPage, nextPage]);
            onPageChange?.(nextPage);
          } else {
            setCurrentPage(0);
            setVisiblePages([currentPage, 0]);
            onPageChange?.(0);
          }
        },
        startAutoPlay: (interval = autoPlayInterval) => {
          clearAutoplayTimeout();
          setAutoPlayEnabled(true);
          setAutoPlayInterval(interval);
          // 立即设置第一次定时器
          scheduleNextAutoplay(interval);
        },
        stopAutoPlay: () => {
          clearAutoplayTimeout();
          setAutoPlayEnabled(false);
        },
        isAnimating,
        currentPage,
      }),
      [
        currentPage,
        isAnimating,
        children,
        onPageChange,
        autoPlayInterval,
        setCurrentPage,
        scheduleNextAutoplay,
      ]
    );

    // 处理拖拽结束
    const handleDragEnd = async (
      event: any,
      info: any,
      dragDirection: 'x' | 'y'
    ) => {
      clearAutoplayTimeout(); // 用户交互时清除自动播放定时器
      const threshold = 50;
      const isHorizontal = dragDirection === 'x';
      const velocity = isHorizontal ? info.velocity.x : info.velocity.y;
      const offset = isHorizontal ? info.offset.x : info.offset.y;

      if (Math.abs(velocity) > 500 || Math.abs(offset) > threshold) {
        if (velocity > 0 || offset > 0) {
          // 向前翻页
          if (currentPage > 0 && !isAnimating) {
            const prevPage = currentPage - 1;
            setCurrentPage(prevPage);
            setVisiblePages([currentPage, prevPage]);
            onPageChange?.(prevPage);
          }
        } else {
          // 向后翻页
          if (
            currentPage < React.Children.count(children) - 1 &&
            !isAnimating
          ) {
            const nextPage = currentPage + 1;
            setCurrentPage(nextPage);
            setVisiblePages([currentPage, nextPage]);
            onPageChange?.(nextPage);
          }
        }
      }
    };

    const offsetTop = (window.innerHeight - 768) / 2;

    const renderPageIndicators = () => {
      // 获取当前页面的动画类型
      const currentChild = React.Children.toArray(children)[currentPage];
      const animationTypeStr = (currentChild as any)?.props?.[
        'data-animation'
      ];
      const animationType = (() => {
        try {
          return JSON.parse(animationTypeStr || '{}');
        } catch {
          return {
            type: animationTypeStr,
          };
        }
      })();

      // 如果是左右翻页（book类型），指示器指向左边
      const indicatorDirection = ['book'].includes(animationType.type)
        ? 'left'
        : 'down';

      return (
        <>
          <FlipIndicator direction={indicatorDirection} />
          <PageIndicator
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(pageIndex) => {
              if (
                pageIndex >= 0 &&
                pageIndex < totalPages &&
                !isAnimating
              ) {
                setCurrentPage(pageIndex);
                setVisiblePages([currentPage, pageIndex]);
                onPageChange?.(pageIndex);
              }
            }}
          />
        </>
      );
    }
    return (
      <FlipPageRoot className='relative w-full h-full overflow-hidden z-10 flip_page_row_render'>
        <AnimatePresence
          mode="sync"
          propagate={true}
        // onExitComplete={() => {
        //   console.log('onExitComplete', currentPage);
        //   setVisiblePages([currentPage]);
        //   setIsAnimating(false); // 动画结束
        // }}
        >
          {React.Children.map(children, (child, index) => {
            const animationTypeStr = (child as any)?.props['data-animation'];
            const animationType = (() => {
              try {
                return JSON.parse(animationTypeStr || '{}');
              } catch {
                return {
                  type: animationTypeStr,
                };
              }
            })();
            const direction = ['book'].includes(animationType.type)
              ? 'right'
              : 'center';
            const dragDirection = ['book'].includes(animationType.type)
              ? 'x'
              : 'y';
            const isPrev = index - currentPage === -1;
            const isNextItem = index - currentPage === 1;
            const isCurrent = index === currentPage;
            const isNext = index > currentPage;
            const dontRenderChild = !isPrev && !isNextItem && !isCurrent;

            const animationProps = getAnimationProps({
              isCurrent,
              isNext,
              animationType,
            });

            return (
              <FlipPageContent
                key={index}
                data-tip={'FlipPageContent'}
                offsetTop={offsetTop}
                offsetLeft={0}
                direction={direction}
                isCurrent={isCurrent}
                isNext={isNext}
                {...animationProps}
                drag={dragDirection}
                dragConstraints={{
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                }}
                dragElastic={0.05}
                onDragEnd={(e, info) => handleDragEnd(e, info, dragDirection)}
                onAnimationStart={() => {
                  setIsAnimating(true); // 动画开始
                  clearAutoplayTimeout(); // 清除之前的定时器
                  // 设置全局标志，通知所有元素动画暂停
                  (window as any).__isFlipPageAnimating = true;
                  // 触发自定义事件，通知所有元素动画暂停
                  window.dispatchEvent(new CustomEvent('flip-page-animating-start'));
                }}
                onAnimationComplete={() => {
                  if (isCurrent) {
                    setVisiblePages([index]);
                    setIsAnimating(false); // 动画结束
                    // 清除全局标志，允许元素动画恢复
                    (window as any).__isFlipPageAnimating = false;
                    // 触发自定义事件，通知所有元素动画可以恢复
                    window.dispatchEvent(new CustomEvent('flip-page-animating-end'));
                    // 如果启用了自动播放，在动画完成后重新设置定时器
                    if (autoPlayEnabled) {
                      scheduleNextAutoplay(autoPlayInterval);
                    }
                  }
                }}
                style={{
                  pointerEvents: index === currentPage ? 'auto' : 'none',
                  zIndex: index,
                  display: visiblePages.includes(index) ? 'block' : 'none',
                }}
              >
                {dontRenderChild ? <div></div> : child}
                {/* {child} */}
              </FlipPageContent>
            );
          })}
        </AnimatePresence>
        {inViewer && !isScreenshot && renderPageIndicators()}
      </FlipPageRoot>
    );
  }
);

FlipWrapper.displayName = 'FlipWrapper';

export default FlipWrapper;

import styled from '@emotion/styled';
import { AnimatePresence, motion } from 'motion/react';
import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { PageAnimationConfig } from '../../../shared';
import { useGridContext } from '../../provider';

interface FlipPageContentProps {
  direction: 'left' | 'right' | 'center';
  isCurrent: boolean;
  isNext: boolean;
  offsetTop: number;
  offsetLeft: number;
}

const FlipPageContent = styled(motion.div)<FlipPageContentProps>`
  position: absolute;
  top: 0;
  left: 0;
  /* top: ${props => props.offsetTop || 0}px;
  left: ${props => props.offsetLeft || 0}px; */
  width: 100%;
  height: 100%;
  /* min-height: 768px;
  height: auto;
  max-height: 100vh;
  max-height: 100dvh; */
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
  ) => {
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
          : config.easing,
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
          scale: 0.8,
          opacity: 0,
        },
        animate: {
          scale: isCurrent ? 1 : 0.8,
          opacity: isCurrent ? 1 : 0,
        },
        transition: createTransition('tween'),
      };
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
          rotate: isNext ? 90 : -90,
          opacity: 0,
          scale: 0.8,
        },
        animate: {
          rotate: isCurrent ? 0 : isNext ? 90 : -90,
          opacity: isCurrent ? 1 : 0,
          scale: isCurrent ? 1 : 0.8,
        },
        transition: createTransition('tween'),
      };
    case 'slide':
    default:
      return {
        initial: {
          y: 0,
          scale: 0.1,
          opacity: 1,
        },
        animate: {
          y: isCurrent ? 0 : isNext ? '100%' : '0',
          scale: isCurrent ? 1 : isNext ? 1 : 0.1,
          opacity: isCurrent ? 1 : 0,
        },
        transition: createTransition('tween'),
      };
  }
};

const FlipWrapper = forwardRef<FlipWrapperRef, FlipWrapperProps>(
  ({ children, onPageChange }, ref) => {
    const { getRowByDepth } = useGridContext();
    const [currentPage, _setCurrentPage] = useState(0);
    const [visiblePages, setVisiblePages] = useState<number[]>([0]);
    const [isAnimating, setIsAnimating] = useState(false);
    const [autoPlayEnabled, setAutoPlayEnabled] = useState(false);
    const defaultAutoPlayInterval = getRowByDepth([0]);
    const [autoPlayInterval, setAutoPlayInterval] = useState(
      defaultAutoPlayInterval?.animationType?.autoplayInterval || 3
    );
    const timeoutRef = useRef<any>(null);

    const setCurrentPage = (nextPage: number) => {
      _setCurrentPage(nextPage);
      const defaultAutoPlayInterval = getRowByDepth([nextPage]);
      setAutoPlayInterval(
        defaultAutoPlayInterval?.animationType?.autoplayInterval || 3
      );
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
        autoPlayEnabled,
        autoPlayInterval,
      ]
    );

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

    return (
      <FlipPageRoot className='relative w-full h-full flex-1 overflow-hidden flipWrapper z-10 flip_page_row_render'>
        <AnimatePresence
          mode='wait'
          propagate={true}
          onExitComplete={() => {
            console.log('onExitComplete', currentPage);
            setVisiblePages([currentPage]);
            setIsAnimating(false); // 动画结束
          }}
        >
          {React.Children.map(children, (child, index) => {
            const animationTypeStr = (child as any)?.props['data-animation'];
            const animationType = (() => {
              try {
                return JSON.parse(animationTypeStr || '{}');
              } catch (e) {
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
            const isCurrent = index === currentPage;
            const isNext = index > currentPage;

            const animationProps = getAnimationProps({
              isCurrent,
              isNext,
              animationType,
            });

            return (
              <FlipPageContent
                key={index}
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
                }}
                onAnimationComplete={() => {
                  if (isCurrent) {
                    setVisiblePages([index]);
                    setIsAnimating(false); // 动画结束
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
                {child}
              </FlipPageContent>
            );
          })}
        </AnimatePresence>
      </FlipPageRoot>
    );
  }
);

FlipWrapper.displayName = 'FlipWrapper';

export default FlipWrapper;

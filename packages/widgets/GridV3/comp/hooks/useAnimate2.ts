import { useEffect, useState, useRef, useCallback } from 'react';
import { AnimateQueue2, AnimationState } from '@mk/works-store/types/animate2';
import { createTimeline, stagger, text, Timeline } from 'animejs';
import { getWorksDetailStatic } from '@mk/services';
import { useGridContext } from '../provider';

function observeVisibility(
  element: HTMLElement,
  callback: (
    isVisible: boolean,
    entry: IntersectionObserverEntry | undefined
  ) => void
) {
  if (!element) {
    return;
  }

  const observer = new IntersectionObserver(
    ([entry]) => {
      callback(entry?.isIntersecting ?? false, entry);
    },
    {
      root: null,
      threshold: 0,
    }
  );

  observer.observe(element);

  return observer;
}

interface UseAnimateProps {
  elemId: string;
  animateQueue?: AnimateQueue2;
  autoPlay?: boolean;
  hasPlayedOnce?: boolean;
  onAnimationComplete?: () => void;
  containerRef: React.RefObject<HTMLDivElement> | null;
}

export const useAppAnimate2 = ({
  elemId,
  animateQueue = {},
  autoPlay = true,
  hasPlayedOnce = true,
  containerRef,
  onAnimationComplete,
}: UseAnimateProps) => {
  const hasAnimation = Object.keys(animateQueue).length > 0;
  const [isVisible, setIsVisible] = useState(false);
  const [shouldPlay, setShouldPlay] = useState(false);
  // const [hasPlayedOnce, setHasPlayedOnce] = useState(false);
  const charsRef = useRef<any[]>([]);

  const tlMainRef = useRef<Timeline>(null);

  const resetStatus = () => {
    // 重置动画时间轴
    if (tlMainRef.current) {
      tlMainRef.current.complete();
      tlMainRef.current = null;
    }

    // 重置状态变量
    setIsVisible(false);
    setShouldPlay(false);

    // 重置文本字符样式
    if (charsRef.current.length > 0) {
      charsRef.current.forEach(char => {
        if (char && char.style) {
          char.style.opacity = '';
        }
      });
      charsRef.current = [];

      // 重置容器样式
      if (containerRef && containerRef?.current?.style.opacity !== '') {
        containerRef.current.style.opacity = '';
      }
    }
  };

  // const worksDetail = getWorksDetailStatic();
  // const isFlipPage = worksDetail?.specInfo?.is_flip_page;

  // 初始化动画队列
  useEffect(() => {
    if (!containerRef?.current) return;
    if (!hasAnimation) {
      return;
    }
    if (!autoPlay) {
      return;
    }

    let charsRef: any[] = [];

    let tlEmphasis: Timeline | null = null;
    let tlEntrance: Timeline | null = null;
    let tlExit: Timeline | null = null;
    if (animateQueue.emphasis && animateQueue.emphasis.length > 0) {
      const timeline = createTimeline({
        autoplay: false, // 👈 禁止自动播放
      });
      animateQueue.emphasis.forEach(item => {
        timeline.add(
          containerRef.current,
          {
            ...item.parameters,
          },
          0
        );
      });

      tlEmphasis = timeline;
    }

    if (animateQueue?.entrance && animateQueue.entrance.length > 0) {
      const timeline = createTimeline({
        autoplay: false,
      });
      if (animateQueue.entrance.some(item => item.type === 'text')) {
        const { chars } = text.split(containerRef?.current, {
          chars: true,
        });
        chars.forEach(c => {
          c.style.opacity = 0;
        });
        charsRef = chars;
      }
      animateQueue.entrance.forEach(item => {
        if (item.type === 'text') {
          timeline.add(
            charsRef,
            {
              ...item.parameters,
            },
            stagger(item.delay || 0)
          );
        } else {
          if (item.parameters.opacity) {
            const fromOpacity = Array.isArray(item.parameters.opacity)
              ? item.parameters.opacity[0]
              : (item.parameters.opacity.from ?? 0);
            containerRef.current.style.opacity = String(fromOpacity);
          }
          timeline.add(containerRef.current, {
            ...item.parameters,
          });
        }
      }, stagger(100));

      tlEntrance = timeline;
    }

    if (animateQueue?.exit && animateQueue.exit.length > 0) {
      const timeline = createTimeline({
        autoplay: false, // 👈 禁止自动播放
      });
      if (animateQueue.exit.some(item => item.type === 'text') && !charsRef) {
        const { chars } = text.split(containerRef?.current, {
          chars: { wrap: 'clip' },
        });
        charsRef = chars;
      }
      animateQueue.exit.forEach(item => {
        if (item.type === 'text') {
          timeline.add(
            charsRef,
            {
              ...item.parameters,
            },
            stagger(item.delay || 0)
          );
        } else {
          timeline.add(containerRef.current, {
            ...item.parameters,
          });
        }
      }, stagger(100));

      tlExit = timeline;
    }

    const tlMain = createTimeline({
      autoplay: false, // 👈 禁止自动播放
    });
    if (tlEntrance) {
      tlMain.sync(tlEntrance);
    }
    if (tlEmphasis) {
      tlMain.sync(tlEmphasis);
    }
    if (tlExit) {
      tlMain.sync(tlExit);
    }

    tlMainRef.current = tlMain;
  }, [animateQueue, autoPlay, containerRef, hasAnimation]);

  // 处理可见性观察
  useEffect(() => {
    // TODO: 先监听父级元素确保触发动画
    const element =
      containerRef?.current?.parentElement || containerRef?.current;
    if (!element || !hasAnimation) return;
    if (!autoPlay) return;

    const observer = observeVisibility(element, (isVisible, entry) => {
      if (isVisible && autoPlay) {
        setIsVisible(true);
        // 如果是翻页模式或者动画还没播放过，才允许播放
        setShouldPlay(true);
      }
      if (!isVisible) {
        setIsVisible(false);
        // 当元素不可见时，重置播放状态
        if (!hasPlayedOnce) {
          setShouldPlay(false);
        }
      }
    });

    const handleScroll = () => {
      if (!shouldPlay && isVisible && autoPlay) {
        // 如果是翻页模式或者动画还没播放过，才允许播放
        if (!hasPlayedOnce) {
          setShouldPlay(true);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      observer?.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [autoPlay, shouldPlay, hasAnimation, containerRef, isVisible]);

  useEffect(() => {
    if (!tlMainRef.current) return;

    if (!shouldPlay) {
      tlMainRef.current?.pause();
      tlMainRef.current?.seek(0);
      return;
    }

    tlMainRef.current.pause();
    tlMainRef.current.seek(0);
    tlMainRef.current.play().then(() => {
      if (elemId === 'iBhRZjoPxG') {
        console.log('动画播放完成');
      }
    });
  }, [shouldPlay]);

  useEffect(() => {
    if (!autoPlay) {
      resetStatus();
      return;
    }
  }, [autoPlay]);
};

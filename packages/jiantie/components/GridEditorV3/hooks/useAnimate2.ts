import { AnimateQueue2 } from '@/components/GridEditorV3/works-store/types/animate2';
import { createTimeline, stagger, text, Timeline } from 'animejs';
import { useCallback, useEffect, useRef, useState } from 'react';

// 全局标志：表示加载页已完全消失，可以播放动画
const ANIMATION_READY_EVENT = 'animation-ready-to-play';

// 根据 elemId 获取对应的 DOM 元素 id
function getElementId(elemId: string): string {
  return `elem_wrapper_${elemId}`;
}

// 查找 DOM 元素
function findElementById(elemId: string): HTMLDivElement | null {
  const id = getElementId(elemId);
  return document.getElementById(id) as HTMLDivElement | null;
}

function observeVisibility(
  element: HTMLElement,
  callback: (isVisible: boolean, entry: IntersectionObserverEntry | undefined) => void
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
  onAnimationStart?: () => void;
  onAnimationComplete?: () => void;
}

export const useAppAnimate2 = ({
  elemId,
  animateQueue = {},
  autoPlay = true,
  hasPlayedOnce = true,
  onAnimationStart,
  onAnimationComplete,
}: UseAnimateProps) => {
  // 内部维护的 ref，通过 id 查找元素并自动更新
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(null);
  const hasAnimation = Object.keys(animateQueue).length > 0;
  const [isVisible, setIsVisible] = useState(false);
  const [shouldPlay, setShouldPlay] = useState(false);
  const [canPlayAnimation, setCanPlayAnimation] = useState(false);
  const charsRef = useRef<any[]>([]);
  const tlMainRef = useRef<Timeline>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const checkIntervalRef = useRef<number | null>(null);

  // 查找并设置容器元素
  const updateContainerElement = useCallback((): boolean => {
    const element = findElementById(elemId);
    if (element && element !== containerElement) {
      containerRef.current = element;
      setContainerElement(element);
      return true;
    }
    return false;
  }, [elemId, containerElement]);

  // 监听 DOM 挂载：使用 MutationObserver + 定时轮询的组合方案
  useEffect(() => {
    if (!hasAnimation || !autoPlay) {
      return;
    }

    let isMounted = true;
    let observer: MutationObserver | null = null;
    let intervalId: number | null = null;
    let timeoutId: number | null = null;

    // 延迟尝试查找元素，避免在 effect 中同步调用 setState
    requestAnimationFrame(() => {
      if (!isMounted) return;

      // 立即尝试查找元素
      if (updateContainerElement()) {
        return;
      }

      // 如果元素不存在，使用 MutationObserver 监听 DOM 变化
      observer = new MutationObserver(() => {
        if (!isMounted) return;
        if (updateContainerElement()) {
          observer?.disconnect();
          if (intervalId !== null) {
            clearInterval(intervalId);
            intervalId = null;
            checkIntervalRef.current = null;
          }
        }
      });

      // 开始观察整个文档树
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      observerRef.current = observer;

      // 同时使用定时轮询作为备用方案（处理 MutationObserver 可能遗漏的情况）
      intervalId = window.setInterval(() => {
        if (!isMounted) return;
        if (updateContainerElement()) {
          observer?.disconnect();
          if (intervalId !== null) {
            clearInterval(intervalId);
            intervalId = null;
            checkIntervalRef.current = null;
          }
        }
      }, 100);

      checkIntervalRef.current = intervalId;

      // 设置最大检查时间（避免无限轮询）
      const maxCheckTime = 5000; // 5秒
      timeoutId = window.setTimeout(() => {
        if (!isMounted) return;
        if (intervalId !== null) {
          clearInterval(intervalId);
          intervalId = null;
          checkIntervalRef.current = null;
        }
        observer?.disconnect();
      }, maxCheckTime);
    });

    return () => {
      isMounted = false;
      if (observer) {
        observer.disconnect();
        observerRef.current = null;
      }
      if (intervalId !== null) {
        clearInterval(intervalId);
        checkIntervalRef.current = null;
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [elemId, hasAnimation, autoPlay, updateContainerElement]);

  // 监听全局动画就绪事件（只在有动画时监听）
  useEffect(() => {
    // 如果没有动画，不需要监听全局事件
    if (!hasAnimation) {
      return;
    }

    // 检查是否已经可以播放（用于首次加载时的情况）
    const checkAnimationReady = () => {
      const isReady = (window as any).__animationReadyToPlay === true;
      if (isReady) {
        setCanPlayAnimation(true);
      }
    };

    // 立即检查一次
    checkAnimationReady();

    // 监听动画就绪事件
    const handleAnimationReady = () => {
      setCanPlayAnimation(true);
    };

    window.addEventListener(ANIMATION_READY_EVENT, handleAnimationReady);

    return () => {
      window.removeEventListener(ANIMATION_READY_EVENT, handleAnimationReady);
    };
  }, [elemId, hasAnimation]);

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
      if (containerRef.current && containerRef.current.style.opacity !== '') {
        containerRef.current.style.opacity = '';
      }
    }
  };

  // const worksDetail = getWorksDetailStatic();
  // const isFlipPage = worksDetail?.specInfo?.is_flip_page;

  // 初始化动画队列
  useEffect(() => {
    if (!containerElement) return;
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
          containerElement,
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
        const { chars } = text.splitText(containerElement, {
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
            containerElement.style.opacity = String(fromOpacity);
          }
          timeline.add(containerElement, {
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
        const { chars } = text.splitText(containerElement, {
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
          timeline.add(containerElement, {
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
  }, [animateQueue, autoPlay, containerElement, hasAnimation]);

  // 处理可见性观察
  useEffect(() => {
    // TODO: 先监听父级元素确保触发动画
    const element = containerElement?.parentElement || containerElement;
    if (!element || !hasAnimation) return;
    if (!autoPlay) return;

    // 检查元素是否已经在视口中（用于首次加载时的情况）
    const checkInitialVisibility = (): void => {
      const rect = element.getBoundingClientRect();
      const isInViewport =
        rect.top < window.innerHeight && rect.bottom > 0 && rect.left < window.innerWidth && rect.right > 0;

      if (isInViewport && autoPlay) {
        setIsVisible(true);
        setShouldPlay(true);
      }
    };

    // 延迟检查，确保 DOM 已经渲染完成
    const timeoutId = setTimeout(checkInitialVisibility, 100);

    const observer = observeVisibility(element, isVisible => {
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
      clearTimeout(timeoutId);
      observer?.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [autoPlay, shouldPlay, hasAnimation, containerElement, isVisible, hasPlayedOnce]);

  useEffect(() => {
    if (!tlMainRef.current) return;

    // 检查是否正在翻页动画中
    const isFlipPageAnimating = (window as any).__isFlipPageAnimating === true;

    // 只有当 shouldPlay 为 true 且 canPlayAnimation 为 true 且不在翻页动画中时才播放动画
    if (!shouldPlay || !canPlayAnimation || isFlipPageAnimating) {
      tlMainRef.current?.pause();
      if (isFlipPageAnimating) {
        // 翻页动画进行中，保持当前进度但不播放
        return;
      }
      tlMainRef.current?.seek(0);
      return;
    }

    // 动画开始播放
    onAnimationStart?.();

    tlMainRef.current.pause();
    tlMainRef.current.seek(0);
    tlMainRef.current.play().then(() => {
      // 动画播放完成
      onAnimationComplete?.();
    });
  }, [shouldPlay, canPlayAnimation, elemId, onAnimationStart, onAnimationComplete]);

  // 监听翻页动画状态变化，实时暂停/恢复元素动画
  useEffect(() => {
    if (!tlMainRef.current || !autoPlay || !hasAnimation) return;

    const handleFlipPageAnimatingStart = () => {
      // 翻页动画开始，暂停元素动画
      if (tlMainRef.current) {
        tlMainRef.current.pause();
      }
    };

    const handleFlipPageAnimatingEnd = () => {
      // 翻页动画结束，如果满足播放条件则恢复播放
      if (shouldPlay && canPlayAnimation && tlMainRef.current) {
        if (tlMainRef.current.progress === 0) {
          // 如果动画还没开始，从头播放
          onAnimationStart?.();
          tlMainRef.current.play().then(() => {
            onAnimationComplete?.();
          });
        } else {
          // 如果动画已经部分播放，继续播放
          tlMainRef.current.play();
        }
      }
    };

    // 监听翻页动画事件
    window.addEventListener('flip-page-animating-start', handleFlipPageAnimatingStart);
    window.addEventListener('flip-page-animating-end', handleFlipPageAnimatingEnd);

    // 初始化时检查是否正在翻页动画中
    const isFlipPageAnimating = (window as any).__isFlipPageAnimating === true;
    if (isFlipPageAnimating) {
      handleFlipPageAnimatingStart();
    }

    return () => {
      window.removeEventListener('flip-page-animating-start', handleFlipPageAnimatingStart);
      window.removeEventListener('flip-page-animating-end', handleFlipPageAnimatingEnd);
    };
  }, [autoPlay, hasAnimation, shouldPlay, canPlayAnimation, onAnimationStart, onAnimationComplete]);

  useEffect(() => {
    if (!autoPlay) {
      // 使用 setTimeout 避免在 effect 中同步调用 setState
      setTimeout(() => {
        resetStatus();
      }, 0);
      return;
    }

    // 当 autoPlay 变为 true 时，检查元素是否已经在视口中
    // 如果是，立即触发动画（解决首次加载时不播放动画的问题）
    if (autoPlay && hasAnimation && containerElement) {
      const element = containerElement.parentElement || containerElement;
      if (element) {
        // 使用 requestAnimationFrame 确保 DOM 已更新
        requestAnimationFrame(() => {
          const rect = element.getBoundingClientRect();
          const isInViewport =
            rect.top < window.innerHeight && rect.bottom > 0 && rect.left < window.innerWidth && rect.right > 0;

          if (isInViewport && !shouldPlay) {
            setIsVisible(true);
            setShouldPlay(true);
          }
        });
      }
    }
  }, [autoPlay, hasAnimation, containerElement, shouldPlay]);

  // 返回兼容的 ref 对象，保持与旧 API 的兼容性
  // 直接返回 containerRef，它会在元素挂载后自动更新
  return { containerRef };
};

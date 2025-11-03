import { useEffect, useRef, useState } from 'react';

interface UseHideOnScrollOptions {
  /** 停止滚动多少毫秒后认为滚动结束，默认 200ms */
  delay?: number;
  /** 滚动容器，默认为 window */
  scrollContainer?: HTMLElement | Window | null;
  /** 长滚动触发的阈值（像素），默认为半个屏幕高度 */
  longScrollThreshold?: number;
  /** 长滚动回调，当滚动距离超过阈值时触发（每次滚动只触发一次） */
  onLongScroll?: () => void;
}

/**
 * 监听滚动事件，滚动时返回 true，停止滚动后返回 false
 * 用于在滚动时隐藏 Popover 等浮层组件，优化性能和用户体验
 * 支持长滚动检测和回调
 */
export function useHideOnScroll(
  delayOrOptions?: number | UseHideOnScrollOptions,
  scrollContainer?: HTMLElement | Window | null
) {
  const options: UseHideOnScrollOptions =
    typeof delayOrOptions === 'number'
      ? { delay: delayOrOptions, scrollContainer }
      : delayOrOptions || {};

  const {
    delay = 200,
    scrollContainer: container,
    longScrollThreshold = typeof window !== 'undefined'
      ? window.innerHeight
      : 0,
    onLongScroll,
  } = options;

  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const startScrollPosRef = useRef<number>(0);
  const hasTriggeredLongScrollRef = useRef<boolean>(false);

  // 检查是否正在输入文字
  const isTyping = (): boolean => {
    const activeElement = document.activeElement;
    if (!activeElement) return false;

    const tagName = activeElement.tagName.toLowerCase();
    const isInput = tagName === 'input' || tagName === 'textarea';
    const isContentEditable =
      activeElement.getAttribute('contenteditable') === 'true';

    return isInput || isContentEditable;
  };

  useEffect(() => {
    const target = container || window;

    const getScrollTop = (el: HTMLElement | Window): number => {
      if (el === window) {
        return window.pageYOffset || document.documentElement.scrollTop;
      }
      return (el as HTMLElement).scrollTop;
    };

    const handleScroll = () => {
      // 如果正在输入文字，则不执行任何滚动监听逻辑
      if (isTyping()) {
        return;
      }

      const currentScrollTop = getScrollTop(target);

      // 如果是新的滚动开始，记录起始位置
      if (!isScrolling) {
        startScrollPosRef.current = currentScrollTop;
        hasTriggeredLongScrollRef.current = false;
      }

      // 滚动时立即设置为 true
      setIsScrolling(true);

      // 检测长滚动
      if (
        onLongScroll &&
        !hasTriggeredLongScrollRef.current &&
        longScrollThreshold > 0
      ) {
        const scrollDistance = Math.abs(
          currentScrollTop - startScrollPosRef.current
        );
        if (scrollDistance >= longScrollThreshold) {
          hasTriggeredLongScrollRef.current = true;
          onLongScroll();
        }
      }

      // 清除之前的定时器
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }

      // 停止滚动 delay 毫秒后重新显示
      scrollTimerRef.current = setTimeout(() => {
        setIsScrolling(false);
        // 滚动停止后重置状态，为下次滚动做准备
        startScrollPosRef.current = getScrollTop(target);
        hasTriggeredLongScrollRef.current = false;
      }, delay);
    };

    target.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      target.removeEventListener('scroll', handleScroll);
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
    };
  }, [delay, container, longScrollThreshold, onLongScroll, isScrolling]);

  // 如果用户正在输入，总是返回 false（不隐藏 Popover）
  return isTyping() ? false : isScrolling;
}

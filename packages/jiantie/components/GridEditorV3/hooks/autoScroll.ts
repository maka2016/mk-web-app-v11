import { DebounceClass } from '@/utils';
import { useEffect, useRef } from 'react';

interface UseAutoScrollOptions {
  speed?: number;
  containerId?: string;
  supportAutoScroll?: boolean;
}

const debounce = new DebounceClass();

export const useAutoScroll = ({
  speed = 60,
  supportAutoScroll = true,
  containerId = 'auto-scroll-container',
}: UseAutoScrollOptions = {}) => {
  const isAutoScrollingRef = useRef(false);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollYRef = useRef(0);
  const animationFrameIdRef = useRef<number>(0);
  const lastScrollTopRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);
  const scrollRootRef = useRef<HTMLElement | null>(null);
  const autoScrollStepRef = useRef<(() => void) | null>(null);

  const startAutoScroll = () => {
    if (!scrollRootRef.current || !autoScrollStepRef.current) return;

    isAutoScrollingRef.current = true;
    scrollYRef.current = scrollRootRef.current.scrollTop;
    autoScrollStepRef.current();
  };

  const stopAutoScroll = () => {
    cancelAnimationFrame(animationFrameIdRef.current!);
    isAutoScrollingRef.current = false;
    if (scrollRootRef.current) {
      scrollRootRef.current.scrollTo({
        top: scrollRootRef.current.scrollTop,
      });
    }
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
  };

  useEffect(() => {
    // 只在客户端执行
    if (
      typeof window === 'undefined' ||
      typeof document === 'undefined' ||
      !supportAutoScroll
    ) {
      return;
    }

    const scrollRoot = (document.getElementById(containerId) ||
      document.scrollingElement ||
      document.documentElement) as HTMLElement;
    scrollRootRef.current = scrollRoot;
    scrollYRef.current = scrollRoot.scrollTop;
    lastScrollTopRef.current = scrollYRef.current;

    const autoScrollStep = () => {
      if (!isAutoScrollingRef.current) return;

      scrollYRef.current += speed / 60;
      scrollRoot.scrollTop = scrollYRef.current;

      const maxScroll = scrollRoot.scrollHeight - window.innerHeight;
      if (scrollYRef.current < maxScroll) {
        animationFrameIdRef.current = requestAnimationFrame(autoScrollStep);
      }

      //视频导出结束
      if (
        scrollYRef.current >=
        scrollRoot.scrollHeight - scrollRoot.clientHeight
      ) {
        setTimeout(() => {
          (window as any)?.onPlayEnd?.();
        }, 1000);
      }
    };

    autoScrollStepRef.current = autoScrollStep;

    const onTouchStart = (e: TouchEvent) => {
      if (!supportAutoScroll) return;
      stopAutoScroll();
      debounce.cancel();
      touchStartYRef.current = e.touches[0].clientY;
    };

    const onTouchEnd = (e: TouchEvent) => {
      /** 不再自动滚动 */
      // if (touchStartYRef.current === null) return;
      // const touchEndY = e.changedTouches[0].clientY;
      // const deltaY = touchEndY - touchStartYRef.current;
      // if (deltaY < -20) {
      //   // 向下滑：延迟恢复
      //   debounce.exec(() => {
      //     isAutoScrollingRef.current = true;
      //     scrollYRef.current = scrollRoot.scrollTop;
      //     autoScrollStep();
      //   }, 1000);
      // } else {
      //   debounce.cancel();
      // }
      // // 向上滑 deltaY < -10，不自动恢复
      // touchStartYRef.current = null;
    };

    scrollRoot.addEventListener('touchstart', onTouchStart, { passive: true });
    scrollRoot.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      cancelAnimationFrame(animationFrameIdRef.current!);
      scrollRoot.removeEventListener('touchstart', onTouchStart);
      scrollRoot.removeEventListener('touchend', onTouchEnd);
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    };
  }, [speed, supportAutoScroll, containerId]);

  return {
    startAutoScroll,
    stopAutoScroll,
  };
};

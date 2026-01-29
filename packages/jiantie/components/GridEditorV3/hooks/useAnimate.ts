import { useEffect, useRef, useState } from 'react';
import { AnimateQueue, AnimationState } from '../utils/animate';

export const generateAnimationClasses = (state?: AnimationState, animationType?: 'entrance' | 'emphasis' | 'exit') => {
  if (!state?.type) return '';
  const classes: string[] = ['animate__animated'];

  if (state.type) {
    classes.push(`animate__${state.type}`);
  }

  if (state.duration) {
    const durationMap: Record<string, string> = {
      '0.5s': 'faster',
      '1s': 'fast',
      '1.5s': 'slow',
      '2s': 'slower',
      '3s': 'slower',
    };
    const durationClass = durationMap[state.duration];
    if (durationClass) {
      classes.push(`animate__${durationClass}`);
    }
  }

  if (state.delay) {
    const delaySeconds = parseFloat(state.delay);
    if (!Number.isNaN(delaySeconds) && delaySeconds >= 1 && delaySeconds <= 5) {
      classes.push(`animate__delay-${Math.floor(delaySeconds)}s`);
    }
  }

  if (
    (state.infinite && state.type.startsWith('pulse')) ||
    state.type.startsWith('swing') ||
    state.type.startsWith('rotate') ||
    state.type.startsWith('flash') ||
    state.type.startsWith('bounce') ||
    state.type.startsWith('shake')
  ) {
    if (animationType === 'emphasis') {
      classes.push('animate__infinite');
    }
  }

  if (state.alternate) {
    classes.push('animate__alternate');
  }

  return classes.join(' ');
};

export const getAnimationType = (
  animation: AnimationState | undefined,
  animateQueue: AnimateQueue
): 'entrance' | 'emphasis' | 'exit' | undefined => {
  if (!animation) return undefined;
  if (animateQueue.entrance?.includes(animation)) return 'entrance';
  if (animateQueue.emphasis?.includes(animation)) return 'emphasis';
  if (animateQueue.exit?.includes(animation)) return 'exit';
  return undefined;
};

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
      threshold: 0.01,
    }
  );

  observer.observe(element);

  return observer;
}

interface UseAnimateProps {
  animateQueue?: AnimateQueue;
  autoPlay?: boolean;
  onAnimationComplete?: () => void;
  containerRef: React.RefObject<HTMLDivElement | null> | null;
}

interface UseAnimateReturn {
  isVisible: boolean;
  shouldPlay: boolean;
  currentAnimation: AnimationState | undefined;
  animationClassName: string;
  animationStyle: React.CSSProperties;
  dataVisible: boolean;
}

export const useAppAnimate = ({
  animateQueue = {},
  autoPlay = true,
  onAnimationComplete,
  containerRef,
}: UseAnimateProps): UseAnimateReturn => {
  const hasAnimation = Object.keys(animateQueue).length > 0;
  const [currentAnimation, setCurrentAnimation] = useState<AnimationState | undefined>(undefined);
  const [isVisible, setIsVisible] = useState(true);
  const [shouldPlay, setShouldPlay] = useState(false);
  const queueRef = useRef<AnimationState[]>([]);
  const emphasisTimerRef = useRef<number>(0);

  // 初始化动画队列
  useEffect(() => {
    const queue: AnimationState[] = [];
    if (animateQueue.entrance?.length) queue.push(...animateQueue.entrance);
    if (animateQueue.emphasis?.length) queue.push(...animateQueue.emphasis);
    if (animateQueue.exit?.length) queue.push(...animateQueue.exit);

    if (queue.length === 0) return;

    queueRef.current = queue;
  }, [animateQueue]);

  // 处理可见性观察
  useEffect(() => {
    const element = containerRef?.current;
    if (!element || !hasAnimation) return;

    const observer = observeVisibility(element, (isVisible, entry) => {
      if (isVisible && autoPlay) {
        setShouldPlay(true);
        setCurrentAnimation(queueRef.current[0]);
        observer?.disconnect();
      }
    });

    const handleScroll = () => {
      if (!shouldPlay && isVisible && autoPlay) {
        setShouldPlay(true);
        setCurrentAnimation(queueRef.current[0]);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      observer?.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [autoPlay, shouldPlay, hasAnimation, containerRef]);

  // 处理动画结束
  useEffect(() => {
    const element = containerRef?.current;
    if (!element || !currentAnimation || !hasAnimation) return;

    const handleAnimationEnd = () => {
      queueRef.current.shift();

      if (queueRef.current.length > 0) {
        setCurrentAnimation(queueRef.current[0]);
      } else {
        if (animateQueue.exit?.includes(currentAnimation)) {
          setIsVisible(false);
        }
        onAnimationComplete?.();
      }
    };

    if (currentAnimation.infinite && currentAnimation.emphasisDuration) {
      const duration = parseFloat(currentAnimation.emphasisDuration) * 1000;
      emphasisTimerRef.current = window.setTimeout(() => {
        queueRef.current.shift();

        if (queueRef.current.length > 0) {
          setCurrentAnimation(queueRef.current[0]);
        } else {
          if (animateQueue.exit?.includes(currentAnimation)) {
            setIsVisible(false);
          }
          onAnimationComplete?.();
        }
      }, duration);
    }

    if (!currentAnimation.infinite) {
      element.addEventListener('animationend', handleAnimationEnd);
      element.addEventListener('webkitAnimationEnd', handleAnimationEnd);
    }

    return () => {
      if (!currentAnimation.infinite) {
        element.removeEventListener('animationend', handleAnimationEnd);
        element.removeEventListener('webkitAnimationEnd', handleAnimationEnd);
      }
      if (emphasisTimerRef.current) {
        window.clearTimeout(emphasisTimerRef.current);
      }
    };
  }, [currentAnimation, animateQueue.exit, onAnimationComplete, hasAnimation, containerRef]);

  // 生成动画相关的 className 和 style
  const animationClassName = shouldPlay
    ? generateAnimationClasses(currentAnimation, getAnimationType(currentAnimation, animateQueue))
    : '';

  const animationStyle: React.CSSProperties = {
    WebkitAnimationFillMode: 'both',
    animationFillMode: 'both',
    animationTimingFunction: currentAnimation?.timing || 'ease',
  };

  return {
    isVisible,
    shouldPlay,
    currentAnimation,
    animationClassName,
    animationStyle,
    dataVisible: isVisible,
  };
};

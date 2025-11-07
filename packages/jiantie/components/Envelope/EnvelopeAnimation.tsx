import styled from '@emotion/styled';
import { AnimatePresence, motion } from 'motion/react';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import { EnvelopeConfig } from './types';

/**
 * 将字符串格式的 easing 转换为 Framer Motion 支持的数组格式
 */
function parseEasing(easing?: string): [number, number, number, number] {
  switch (easing) {
    case 'ease-in-out':
      return [0.4, 0, 0.2, 1];
    case 'ease-in':
      return [0.4, 0, 1, 1];
    case 'ease-out':
      return [0, 0, 0.2, 1];
    case 'ease':
      return [0.25, 0.1, 0.25, 1];
    case 'linear':
      return [0, 0, 1, 1];
    default:
      return [0.4, 0, 0.2, 1]; // 默认 ease-in-out
  }
}

const Container = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  overflow: hidden;
  pointer-events: none;
`;

const BackgroundLayer = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
`;

const EnvelopeLayer = styled(motion.div)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90vw;
  max-width: 600px;
  height: auto;
  aspect-ratio: 3 / 2;
  perspective: 1000px;
  transform-style: preserve-3d;
`;

const EnvelopeImage = styled(motion.img)`
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: contain;
  will-change: transform, opacity;
`;

export interface EnvelopeAnimationRef {
  startAnimation: () => void;
  resetAnimation: () => void;
}

interface EnvelopeAnimationProps {
  config?: EnvelopeConfig;
  onComplete?: () => void;
  children?: React.ReactNode;
}

const EnvelopeAnimation = forwardRef<
  EnvelopeAnimationRef,
  EnvelopeAnimationProps
>(({ config, onComplete, children }, ref) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<
    'idle' | 'opening' | 'complete'
  >('idle');

  // 如果没有配置或配置不完整，直接显示内容
  const hasValidConfig =
    config &&
    config.backgroundImage &&
    config.envelopeFrontImage &&
    config.envelopeLeftImage &&
    config.envelopeRightImage &&
    config.envelopeInnerImage &&
    config.envelopeSealImage;

  const duration = config?.duration || 2000;
  const delay = config?.delay || 500;
  const easing = parseEasing(config?.easing);

  useImperativeHandle(ref, () => ({
    startAnimation: () => {
      // 先重置状态，确保动画可以重新触发
      setIsAnimating(false);
      setAnimationPhase('idle');
      // 使用 setTimeout 确保状态重置后再开始动画
      setTimeout(() => {
        setIsAnimating(true);
      }, 0);
    },
    resetAnimation: () => {
      setIsAnimating(false);
      setAnimationPhase('idle');
    },
  }));

  useEffect(() => {
    if (!isAnimating) return;

    // 动画时序
    const timer1 = setTimeout(() => {
      setAnimationPhase('opening');
    }, delay);

    const timer2 = setTimeout(() => {
      setAnimationPhase('complete');
    }, delay + duration);

    const timer3 = setTimeout(
      () => {
        setIsAnimating(false);
        onComplete?.();
      },
      delay + duration + 500
    );

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isAnimating, delay, duration, onComplete]);

  // 如果没有有效配置或动画未开始，直接显示内容
  if (!hasValidConfig || !isAnimating) return <>{children}</>;

  return (
    <>
      <Container>
        <AnimatePresence>
          {/* 背景层 */}
          <BackgroundLayer
            key='background'
            style={{
              backgroundImage: `url(${config?.backgroundImage})`,
            }}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />

          {/* 信封层 */}
          {animationPhase !== 'complete' && (
            <EnvelopeLayer key='envelope-container'>
              {/* 信封内页（最底层） */}
              <EnvelopeImage
                src={config?.envelopeInnerImage || ''}
                alt='envelope-inner'
                style={{ zIndex: 1 }}
                initial={{ opacity: 0 }}
                animate={{
                  opacity: animationPhase === 'opening' ? 1 : 0,
                }}
                transition={{
                  duration: (duration / 1000) * 0.3,
                  delay: (duration / 1000) * 0.5,
                  ease: easing,
                }}
              />

              {/* 信封左侧 */}
              <EnvelopeImage
                src={config?.envelopeLeftImage || ''}
                alt='envelope-left'
                style={{
                  zIndex: 2,
                  transformOrigin: 'left center',
                  backfaceVisibility: 'hidden',
                }}
                initial={{ rotateY: 0 }}
                animate={
                  animationPhase === 'opening'
                    ? { rotateY: -90 }
                    : { rotateY: 0 }
                }
                transition={{
                  duration: duration / 1000,
                  ease: easing,
                }}
              />

              {/* 信封右侧 */}
              <EnvelopeImage
                src={config?.envelopeRightImage || ''}
                alt='envelope-right'
                style={{
                  zIndex: 2,
                  transformOrigin: 'right center',
                  backfaceVisibility: 'hidden',
                }}
                initial={{ rotateY: 0 }}
                animate={
                  animationPhase === 'opening'
                    ? { rotateY: 90 }
                    : { rotateY: 0 }
                }
                transition={{
                  duration: duration / 1000,
                  ease: easing,
                }}
              />

              {/* 信封正面 */}
              <EnvelopeImage
                src={config?.envelopeFrontImage || ''}
                alt='envelope-front'
                style={{ zIndex: 3 }}
                initial={{ opacity: 1 }}
                animate={{
                  opacity: animationPhase === 'opening' ? 0 : 1,
                }}
                transition={{
                  duration: (duration / 1000) * 0.2,
                  ease: easing,
                }}
              />

              {/* 信封印章 */}
              <EnvelopeImage
                src={config?.envelopeSealImage || ''}
                alt='envelope-seal'
                style={{ zIndex: 4 }}
                initial={{ opacity: 1, scale: 1 }}
                animate={
                  animationPhase === 'opening'
                    ? { opacity: 0, scale: 0.8 }
                    : { opacity: 1, scale: 1 }
                }
                transition={{
                  duration: (duration / 1000) * 0.3,
                  ease: easing,
                }}
              />
            </EnvelopeLayer>
          )}
        </AnimatePresence>
      </Container>
      {/* 内容层 */}
      <div
        style={{
          opacity: animationPhase === 'complete' ? 1 : 0,
          transition: 'opacity 0.5s ease-in-out',
        }}
      >
        {children}
      </div>
    </>
  );
});

EnvelopeAnimation.displayName = 'EnvelopeAnimation';

export default EnvelopeAnimation;

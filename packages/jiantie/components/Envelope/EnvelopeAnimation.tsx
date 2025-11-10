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
  background-size: auto;
  background-repeat: repeat;
  background-position: center;
`;

const EnvelopeWrapper = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80vw;
  aspect-ratio: 114 / 162;
`;

const EnvelopeLayer = styled(motion.div)`
  position: relative;
  width: 100%;
  height: 100%;
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

const InvitationContentLayer = styled(motion.div)`
  position: absolute;
  width: calc(100% - 48px);
  height: calc(100% - 48px);
  top: 24px;
  left: 24px;
  overflow: hidden;
  border-radius: 4px;
  will-change: transform, opacity;
  z-index: 2;
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
  const leftOpeningImage =
    config?.envelopeLeftOpeningImage || config?.envelopeLeftImage;
  const rightOpeningImage =
    config?.envelopeRightOpeningImage || config?.envelopeRightImage;

  const hasValidConfig =
    config &&
    config.backgroundImage &&
    leftOpeningImage &&
    rightOpeningImage &&
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
            <EnvelopeWrapper>
              <EnvelopeLayer key='envelope-container'>
                {/* 信封内页（最底层） */}
                <EnvelopeImage
                  src={config?.envelopeInnerImage || ''}
                  alt='envelope-inner'
                  style={{ zIndex: 1 }}
                />

                <InvitationContentLayer
                  initial={{ opacity: 1, scale: 0.7 }}
                  animate={{
                    scale: animationPhase === 'opening' ? 1 : 0.7,
                  }}
                  transition={{
                    duration: (duration / 1000) * 0.6,
                    delay: (duration / 1000) * 0.4,
                    ease: easing,
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background:
                        'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#6b7280',
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    邀请函内容预览
                  </div>
                </InvitationContentLayer>

                {/* 信封左侧 */}
                <EnvelopeImage
                  src={leftOpeningImage || ''}
                  alt='envelope-left-opening'
                  style={{
                    zIndex: 3,
                    transformOrigin: 'left center',
                    backfaceVisibility: 'hidden',
                    objectPosition: 'left center',
                  }}
                  initial={{ rotateY: 0 }}
                  animate={
                    animationPhase === 'opening'
                      ? { rotateY: -180 }
                      : { rotateY: 0 }
                  }
                  transition={{
                    duration: duration / 1000,
                    ease: easing,
                  }}
                />

                {/* 信封右侧 */}
                <EnvelopeImage
                  src={rightOpeningImage || ''}
                  alt='envelope-right-opening'
                  style={{
                    zIndex: 2,
                    transformOrigin: 'right center',
                    backfaceVisibility: 'hidden',
                    objectPosition: 'right center',
                  }}
                  initial={{ rotateY: 0 }}
                  animate={
                    animationPhase === 'opening'
                      ? { rotateY: 180 }
                      : { rotateY: 0 }
                  }
                  transition={{
                    duration: duration / 1000,
                    ease: easing,
                  }}
                />

                {/* 信封印章 */}
                <EnvelopeImage
                  src={config?.envelopeSealImage || ''}
                  alt='envelope-seal'
                  style={{ zIndex: 3 }}
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
            </EnvelopeWrapper>
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

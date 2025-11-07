'use client';

import styled from '@emotion/styled';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { EnvelopeConfig } from './types';

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
`;

const EnvelopeImage = styled(motion.img)`
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: contain;
  will-change: transform, opacity;
`;

interface EnvelopeClientAnimationProps {
  config?: EnvelopeConfig;
  onComplete?: () => void;
}

/**
 * 客户端信封动画组件
 * 在客户端接管服务端渲染的信封 loading，并播放动画
 */
export default function EnvelopeClientAnimation({
  config,
  onComplete,
}: EnvelopeClientAnimationProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<
    'idle' | 'opening' | 'complete'
  >('idle');
  const hasStarted = useRef(false);

  // 检查是否有有效配置
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
  const easing = config?.easing || 'ease-in-out';

  useEffect(() => {
    // 如果没有有效配置，不播放动画
    if (!hasValidConfig) {
      // 隐藏服务端渲染的 loading
      const loadingEl = document.getElementById('envelope-loading');
      if (loadingEl) {
        loadingEl.style.display = 'none';
      }
      onComplete?.();
      return;
    }

    // 客户端挂载后，接管服务端渲染的元素并开始动画
    if (!hasStarted.current) {
      hasStarted.current = true;

      // 延迟一点确保页面已经渲染
      const initTimer = setTimeout(() => {
        // 隐藏服务端渲染的静态 loading
        const loadingEl = document.getElementById('envelope-loading');
        if (loadingEl) {
          loadingEl.style.display = 'none';
        }

        // 开始客户端动画
        setIsAnimating(true);

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
      }, 100);

      return () => clearTimeout(initTimer);
    }
  }, [hasValidConfig, delay, duration, onComplete]);

  if (!hasValidConfig || !isAnimating) {
    return null;
  }

  return (
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
                transformOrigin: 'center left',
              }}
              initial={{ rotateY: 0, x: 0 }}
              animate={
                animationPhase === 'opening'
                  ? { rotateY: -90, x: '-30%' }
                  : { rotateY: 0, x: 0 }
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
                transformOrigin: 'center right',
              }}
              initial={{ rotateY: 0, x: 0 }}
              animate={
                animationPhase === 'opening'
                  ? { rotateY: 90, x: '30%' }
                  : { rotateY: 0, x: 0 }
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
  );
}

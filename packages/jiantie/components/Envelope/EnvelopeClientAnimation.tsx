'use client';

import styled from '@emotion/styled';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
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

const Container = styled.div<{ $clickable: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  overflow: hidden;
  pointer-events: ${props => (props.$clickable ? 'auto' : 'none')};
`;

const BackgroundLayer = styled(motion.div)<{ $bgImage: string }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: ${props => `url(${props.$bgImage})`};
  background-repeat: repeat;
  background-size: auto;
  background-position: center;
`;

const VideoBackground = styled.video`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
`;

const EnvelopeLayer = styled(motion.div)<{ $width: number; $height: number }>`
  position: absolute;
  top: 50%;
  left: 50%;
  width: ${props => props.$width}px;
  height: ${props => props.$height}px;
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

/**
 * 邀请函内容预览层
 * 位于内页与外折叠页之间，比例 9:16，距离信封有 24px 内边距
 */
const InvitationContentLayer = styled(motion.div)`
  position: absolute;
  width: calc(100% - 48px);
  height: calc(100% - 48px);
  top: 24px;
  left: 24px;
  overflow: hidden;
  border-radius: 4px;
  will-change: transform, opacity;
`;

interface EnvelopeClientAnimationProps {
  config?: EnvelopeConfig;
  onComplete?: () => void;
}

/**
 * 动画阶段定义
 */
type AnimationPhase =
  | 'idle' // 初始状态，等待点击
  | 'seal-disappearing' // 印章消失
  | 'left-opening' // 左侧打开
  | 'right-opening' // 右侧打开
  | 'content-expanding' // 内容铺满
  | 'complete'; // 完成

/**
 * 客户端信封动画组件
 * 在客户端接管服务端渲染的信封 loading，并播放动画
 */
export default function EnvelopeClientAnimation({
  config,
  onComplete,
}: EnvelopeClientAnimationProps) {
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>('idle');
  const [isReady, setIsReady] = useState(false);
  const [envelopeSize, setEnvelopeSize] = useState({ width: 0, height: 0 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const contentShownRef = useRef(false); // 跟踪内容是否已经显示过

  // 检查是否有有效配置
  const hasValidConfig =
    config &&
    config.backgroundImage &&
    config.envelopeFrontImage &&
    config.envelopeLeftImage &&
    config.envelopeRightImage &&
    config.envelopeInnerImage &&
    config.envelopeSealImage;

  const easing = parseEasing(config?.easing);

  // 动画时序配置（毫秒）
  const SEAL_DISAPPEAR_DURATION = 300;
  const LEFT_OPEN_DURATION = 1200;
  const RIGHT_OPEN_DURATION = 1200;
  const CONTENT_EXPAND_DURATION = 1000;

  const LEFT_OPEN_DELAY = 300; // 印章消失后开始
  const RIGHT_OPEN_DELAY = 800; // 左侧打开中途开始
  const CONTENT_EXPAND_DELAY = 1500; // 左右打开后开始

  // 计算信封尺寸（基于设备宽度）
  useEffect(() => {
    const calculateEnvelopeSize = () => {
      if (typeof window === 'undefined') return;

      // 获取设备宽度
      const deviceWidth =
        window.innerWidth ||
        document.documentElement.clientWidth ||
        document.body.clientWidth;

      // 信封宽高比 9:16（竖版）
      const aspectRatio = 9 / 16;

      // 根据设备宽度计算，最大不超过 90% 的视口宽度
      const maxWidth = Math.min(deviceWidth * 0.9, 400);
      const width = maxWidth;
      const height = width / aspectRatio;

      // 如果高度超过视口高度的 90%，则按高度计算
      const maxHeight = Math.min(window.innerHeight * 0.9, 600);
      if (height > maxHeight) {
        const adjustedHeight = maxHeight;
        const adjustedWidth = adjustedHeight * aspectRatio;
        setEnvelopeSize({ width: adjustedWidth, height: adjustedHeight });
      } else {
        setEnvelopeSize({ width, height });
      }
    };

    calculateEnvelopeSize();

    // 监听窗口大小变化
    window.addEventListener('resize', calculateEnvelopeSize);
    return () => window.removeEventListener('resize', calculateEnvelopeSize);
  }, []);

  // 确保尺寸计算完成后再显示
  useEffect(() => {
    if (envelopeSize.width > 0 && !isReady && hasValidConfig) {
      setTimeout(() => {
        setIsReady(true);
        console.log('[EnvelopeClientAnimation] 组件已就绪，等待用户点击');
      }, 0);
    }
  }, [envelopeSize, isReady, hasValidConfig]);

  // 初始化：隐藏 loading 和内容容器（只执行一次）
  useEffect(() => {
    if (!hasValidConfig) {
      console.log('[EnvelopeClientAnimation] 无有效信封配置，直接完成');
      const loadingEl = document.getElementById('envelope-loading');
      if (loadingEl) {
        loadingEl.style.display = 'none';
      }
      const contentEl = document.getElementById('auto-scroll-container');
      if (contentEl && !contentShownRef.current) {
        contentEl.style.opacity = '1';
        contentEl.style.pointerEvents = 'auto';
        contentShownRef.current = true;
      }
      onComplete?.();
      return;
    }

    // 隐藏服务端渲染的静态 loading
    const loadingEl = document.getElementById('envelope-loading');
    if (loadingEl) {
      loadingEl.style.display = 'none';
    }

    // 初始隐藏内容容器（只在动画未开始时隐藏，且未显示过）
    const contentEl = document.getElementById('auto-scroll-container');
    if (contentEl && !contentShownRef.current && animationPhase === 'idle') {
      contentEl.style.opacity = '0';
      contentEl.style.pointerEvents = 'none';
    }

    console.log('[EnvelopeClientAnimation] 组件初始化完成，等待尺寸计算');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasValidConfig, animationPhase]); // 添加 animationPhase 依赖，但只在 idle 时执行隐藏逻辑

  // 处理点击/触摸事件
  const handleStartAnimation = () => {
    if (animationPhase !== 'idle') return;

    console.log('[EnvelopeClientAnimation] 用户点击，开始动画');
    setAnimationPhase('seal-disappearing');

    // 播放视频背景
    if (config?.videoBgConfig?.videoUrl && videoRef.current) {
      videoRef.current.play().catch(err => {
        console.warn('视频播放失败:', err);
      });
    }
  };

  // 动画时序控制
  useEffect(() => {
    if (animationPhase === 'idle') return;

    const timers: NodeJS.Timeout[] = [];

    if (animationPhase === 'seal-disappearing') {
      // 印章消失后，开始左侧打开
      const timer = setTimeout(() => {
        setAnimationPhase('left-opening');
      }, SEAL_DISAPPEAR_DURATION);
      timers.push(timer);
    }

    if (animationPhase === 'left-opening') {
      // 左侧打开中途（800ms - 300ms = 500ms后），开始右侧打开
      const timer = setTimeout(() => {
        setAnimationPhase('right-opening');
      }, RIGHT_OPEN_DELAY - LEFT_OPEN_DELAY);
      timers.push(timer);
    }

    if (animationPhase === 'right-opening') {
      // 右侧打开后（1500ms - 800ms = 700ms后），开始内容铺满
      // 注意：右侧打开在 800ms 开始，持续 1200ms，所以到 2000ms 才完成
      // 但脚本要求在 1500ms 开始内容铺满，所以需要在 1500ms - 800ms = 700ms 后触发
      const timer = setTimeout(() => {
        setAnimationPhase('content-expanding');
      }, CONTENT_EXPAND_DELAY - RIGHT_OPEN_DELAY);
      timers.push(timer);
    }

    if (animationPhase === 'content-expanding') {
      // 内容铺满完成后，结束动画
      const timer = setTimeout(() => {
        setAnimationPhase('complete');
        setIsReady(false);
        onComplete?.();
      }, CONTENT_EXPAND_DURATION);
      timers.push(timer);
    }

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [animationPhase, onComplete]);

  // 控制内容容器的显示和邀请函预览
  useEffect(() => {
    const contentEl = document.getElementById('auto-scroll-container');
    const previewEl = document.getElementById('envelope-invitation-preview');

    if (
      animationPhase === 'right-opening' ||
      animationPhase === 'content-expanding'
    ) {
      // 在右侧打开时，开始显示邀请函预览
      // 使用内容容器的截图或克隆作为预览
      if (previewEl && contentEl) {
        // 创建一个预览，显示内容容器的缩放版本
        // 由于内容容器可能还未完全加载，这里使用一个占位效果
        // 实际实现中可以根据需要替换为截图或克隆
        previewEl.style.background =
          'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)';
        previewEl.style.display = 'flex';
        previewEl.style.alignItems = 'center';
        previewEl.style.justifyContent = 'center';

        // 如果内容容器已加载，可以尝试克隆其内容（简化版）
        // 注意：这里只是占位，实际预览内容需要根据业务需求实现
        const placeholder = document.createElement('div');
        placeholder.style.width = '80%';
        placeholder.style.height = '80%';
        placeholder.style.background = 'rgba(255, 255, 255, 0.9)';
        placeholder.style.borderRadius = '8px';
        placeholder.style.display = 'flex';
        placeholder.style.alignItems = 'center';
        placeholder.style.justifyContent = 'center';
        placeholder.style.fontSize = '14px';
        placeholder.style.color = '#666';
        placeholder.textContent = '邀请函内容';

        if (previewEl.children.length === 0) {
          previewEl.appendChild(placeholder);
        }
      }
    }

    // 只在 content-expanding 阶段显示内容，避免重复设置
    if (animationPhase === 'content-expanding' && !contentShownRef.current) {
      // 内容开始显示（只设置一次）
      if (contentEl) {
        contentShownRef.current = true;
        contentEl.style.opacity = '1';
        contentEl.style.pointerEvents = 'auto';
        contentEl.style.transition = `opacity ${CONTENT_EXPAND_DURATION / 1000}s ease-in-out`;
      }
    }
  }, [animationPhase]);

  if (!hasValidConfig || !isReady) {
    return null;
  }

  const isClickable = animationPhase === 'idle';
  const showEnvelope = animationPhase !== 'complete';

  return (
    <Container
      $clickable={isClickable}
      onClick={isClickable ? handleStartAnimation : undefined}
      onTouchStart={isClickable ? handleStartAnimation : undefined}
    >
      {/* 背景层 - 重复铺满 */}
      <BackgroundLayer
        key='background'
        $bgImage={config?.backgroundImage || ''}
        initial={{ opacity: 1 }}
        animate={{
          opacity: showEnvelope ? 1 : 0,
        }}
        transition={{ duration: 0.5, delay: CONTENT_EXPAND_DELAY / 1000 }}
      />

      {/* 视频背景 */}
      {config?.videoBgConfig?.videoUrl && (
        <VideoBackground
          ref={videoRef}
          src={config.videoBgConfig.videoUrl}
          loop={config.videoBgConfig.loop !== false}
          muted={config.videoBgConfig.muted !== false}
          playsInline
          style={{
            opacity:
              animationPhase === 'idle' ? 0 : config.videoBgConfig.opacity || 1,
            objectFit: config.videoBgConfig.objectFit || 'cover',
            transition: 'opacity 0.5s ease-in-out',
          }}
        />
      )}

      {/* 信封层 */}
      {showEnvelope && envelopeSize.width > 0 && (
        <EnvelopeLayer
          key='envelope-container'
          $width={envelopeSize.width}
          $height={envelopeSize.height}
          initial={{ scale: 1, opacity: 1, x: '-50%', y: '-50%' }}
          animate={{
            scale: animationPhase === 'content-expanding' ? [1, 1.2, 2] : 1,
            opacity: animationPhase === 'content-expanding' ? 0 : 1,
            x: '-50%',
            y: '-50%',
          }}
          transition={{
            scale: {
              duration: CONTENT_EXPAND_DURATION / 1000,
              times: [0, 0.5, 1],
              ease: easing,
            },
            opacity: {
              duration: CONTENT_EXPAND_DURATION / 1000,
              ease: easing,
            },
            x: {
              duration: 0,
            },
            y: {
              duration: 0,
            },
          }}
        >
          {/* 信封内页（最底层） */}
          <EnvelopeImage
            src={config?.envelopeInnerImage || ''}
            alt='envelope-inner'
            style={{ zIndex: 1 }}
            initial={{ opacity: 0 }}
            animate={{
              opacity:
                animationPhase === 'right-opening' ||
                animationPhase === 'content-expanding'
                  ? 1
                  : 0,
            }}
            transition={{
              duration: 0.5,
              delay: RIGHT_OPEN_DELAY / 1000,
              ease: easing,
            }}
          />

          {/* 邀请函内容预览层（位于内页与外折叠页之间） */}
          <InvitationContentLayer
            style={{ zIndex: 1.5 }}
            initial={{ opacity: 0 }}
            animate={{
              opacity:
                animationPhase === 'right-opening' ||
                animationPhase === 'content-expanding'
                  ? 1
                  : 0,
            }}
            transition={{
              duration: 0.5,
              delay: RIGHT_OPEN_DELAY / 1000,
              ease: easing,
            }}
          >
            {/* 这里显示邀请函内容的预览（通过 iframe 或截图） */}
            <div
              id='envelope-invitation-preview'
              style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
              }}
            />
          </InvitationContentLayer>

          {/* 信封右侧（在左侧下方） */}
          <EnvelopeImage
            src={config?.envelopeRightImage || ''}
            alt='envelope-right'
            style={{
              zIndex: 2,
              transformOrigin: 'right center',
              backfaceVisibility: 'hidden',
            }}
            initial={{ rotateY: 0 }}
            animate={{
              rotateY:
                animationPhase === 'right-opening' ||
                animationPhase === 'content-expanding'
                  ? 180
                  : 0,
            }}
            transition={{
              duration: RIGHT_OPEN_DURATION / 1000,
              delay: RIGHT_OPEN_DELAY / 1000,
              ease: easing,
            }}
          />

          {/* 信封左侧（覆盖右侧） */}
          <EnvelopeImage
            src={config?.envelopeLeftImage || ''}
            alt='envelope-left'
            style={{
              zIndex: 3,
              transformOrigin: 'left center',
              backfaceVisibility: 'hidden',
            }}
            initial={{ rotateY: 0 }}
            animate={{
              rotateY:
                animationPhase === 'left-opening' ||
                animationPhase === 'right-opening' ||
                animationPhase === 'content-expanding'
                  ? -180
                  : 0,
            }}
            transition={{
              duration: LEFT_OPEN_DURATION / 1000,
              delay: LEFT_OPEN_DELAY / 1000,
              ease: easing,
            }}
          />

          {/* 信封正面（初始显示） */}
          <EnvelopeImage
            src={config?.envelopeFrontImage || ''}
            alt='envelope-front'
            style={{ zIndex: 4 }}
            initial={{ opacity: 1 }}
            animate={{
              opacity:
                animationPhase === 'seal-disappearing' ||
                animationPhase === 'left-opening' ||
                animationPhase === 'right-opening' ||
                animationPhase === 'content-expanding'
                  ? 0
                  : 1,
            }}
            transition={{
              duration: 0.3,
              delay: LEFT_OPEN_DELAY / 1000,
              ease: easing,
            }}
          />

          {/* 信封印章（可点击） */}
          <EnvelopeImage
            src={config?.envelopeSealImage || ''}
            alt='envelope-seal'
            style={{
              zIndex: 5,
              cursor: isClickable ? 'pointer' : 'default',
            }}
            initial={{ opacity: 1, scale: 1 }}
            animate={{
              opacity:
                animationPhase === 'seal-disappearing' ||
                animationPhase === 'left-opening' ||
                animationPhase === 'right-opening' ||
                animationPhase === 'content-expanding'
                  ? 0
                  : 1,
              scale:
                animationPhase === 'seal-disappearing' ||
                animationPhase === 'left-opening' ||
                animationPhase === 'right-opening' ||
                animationPhase === 'content-expanding'
                  ? 0.8
                  : 1,
            }}
            transition={{
              duration: SEAL_DISAPPEAR_DURATION / 1000,
              ease: easing,
            }}
            onClick={isClickable ? handleStartAnimation : undefined}
          />
        </EnvelopeLayer>
      )}
    </Container>
  );
}

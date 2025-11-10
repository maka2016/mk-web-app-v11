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
  /* max-width: unset; */
  height: 100%;
  object-fit: contain;
  will-change: transform, opacity;
`;

/**
 * 邀请函内容预览层
 * 位于内页与开口之间，保持 24px 内边距
 */
const InvitationContentLayer = styled(motion.div)`
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
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

const PHASE_SEQUENCE: AnimationPhase[] = [
  'idle',
  'seal-disappearing',
  'left-opening',
  'right-opening',
  'content-expanding',
  'complete',
];

const phaseIndexMap = PHASE_SEQUENCE.reduce<Record<AnimationPhase, number>>(
  (acc, phase, index) => {
    acc[phase] = index;
    return acc;
  },
  {} as Record<AnimationPhase, number>
);

/**
 * 客户端信封动画组件
 * 在客户端接管服务端渲染的信封 loading，并播放动画
 */
export default function EnvelopeClientAnimation({
  config,
  onComplete,
}: EnvelopeClientAnimationProps) {
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>('idle');
  const videoRef = useRef<HTMLVideoElement>(null);
  const contentShownRef = useRef(false); // 跟踪内容是否已经显示过

  // 检查是否有有效配置
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

  const easing = parseEasing(config?.easing);

  // 动画时序配置（毫秒）
  const SEAL_DISAPPEAR_DURATION = 300;
  const LEFT_OPEN_DURATION = 1200;
  const RIGHT_OPEN_DURATION = 1200;
  const CONTENT_EXPAND_DURATION = 1000;

  const LEFT_OPEN_DELAY = 300; // 印章消失后开始
  const RIGHT_OPEN_DELAY = 800; // 左侧打开中途开始
  const CONTENT_EXPAND_DELAY = 1500; // 左右打开后开始

  // 初始化：隐藏 loading 和内容容器（只执行一次）
  useEffect(() => {
    if (!hasValidConfig) {
      console.log('[EnvelopeClientAnimation] 无有效信封配置，直接完成');
      const loadingEl = document.getElementById('envelope-loading');
      if (loadingEl) {
        loadingEl.style.display = 'none';
      }
      // const contentEl = document
      //   .getElementById('auto-scroll-container')
      //   ?.cloneNode(true);
      // if (
      //   contentEl &&
      //   !contentShownRef.current &&
      //   contentEl instanceof HTMLElement
      // ) {
      //   contentEl.style.opacity = '1';
      //   contentEl.style.pointerEvents = 'auto';
      //   contentShownRef.current = true;
      // }
      onComplete?.();
      return;
    }

    // 隐藏服务端渲染的静态 loading
    const loadingEl = document.getElementById('envelope-loading');
    if (loadingEl) {
      loadingEl.style.display = 'none';
    }

    // 初始隐藏内容容器（只在动画未开始时隐藏，且未显示过）
    // const contentEl = document.getElementById('auto-scroll-container');
    // if (contentEl && !contentShownRef.current && animationPhase === 'idle') {
    //   contentEl.style.opacity = '0';
    //   contentEl.style.pointerEvents = 'none';
    //   contentEl.style.transform = 'scale(0.7)';
    //   contentEl.style.transformOrigin = 'center';
    //   contentEl.style.transition = 'transform 0.3s ease-in-out';
    // }

    console.log('[EnvelopeClientAnimation] 组件初始化完成，等待用户交互');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasValidConfig, animationPhase]); // 添加 animationPhase 依赖，但只在 idle 时执行隐藏逻辑

  // 处理点击/触摸事件
  const handleStartAnimation = () => {
    const currentIndex = PHASE_SEQUENCE.indexOf(animationPhase);
    if (currentIndex === -1 || currentIndex === PHASE_SEQUENCE.length - 1) {
      return;
    }

    const nextPhase = PHASE_SEQUENCE[currentIndex + 1];

    console.log(
      `[EnvelopeClientAnimation] 手动调试，阶段 ${animationPhase} → ${nextPhase}`
    );

    setAnimationPhase(nextPhase);

    // 首次进入动画时播放视频背景
    if (
      animationPhase === 'idle' &&
      config?.videoBgConfig?.videoUrl &&
      videoRef.current
    ) {
      videoRef.current.play().catch(err => {
        console.warn('视频播放失败:', err);
      });
    }
  };

  const handlePrevPhase = () => {
    const currentIndex = PHASE_SEQUENCE.indexOf(animationPhase);
    if (currentIndex <= 0) {
      return;
    }

    const prevPhase = PHASE_SEQUENCE[currentIndex - 1];
    console.log(
      `[EnvelopeClientAnimation] 手动调试，阶段 ${animationPhase} → ${prevPhase}`
    );
    setAnimationPhase(prevPhase);
  };

  useEffect(() => {
    if (animationPhase === 'complete') {
      console.log('[EnvelopeClientAnimation] 手动调试完成');
      onComplete?.();
    }
  }, [animationPhase, onComplete]);

  // 控制内容容器的显示和邀请函预览
  useEffect(() => {
    const sourceContent = document.getElementById('auto-scroll-container');
    const previewEl = document.getElementById('envelope-invitation-preview');

    if (animationPhase === 'left-opening') {
      // 在右侧打开时，开始显示邀请函预览
      // 使用内容容器的截图或克隆作为预览
      if (previewEl && sourceContent && previewEl.childElementCount === 0) {
        const cloned = sourceContent.cloneNode(true) as HTMLElement;
        cloned.removeAttribute('id');
        cloned.style.pointerEvents = 'none';
        previewEl.appendChild(cloned);
        // 内容开始显示（只设置一次）
        if (sourceContent) {
          contentShownRef.current = true;
        }
      }
    }
  }, [animationPhase]);

  if (!hasValidConfig) {
    return null;
  }

  const currentPhaseIndex = phaseIndexMap[animationPhase] ?? 0;
  const isClickable = animationPhase !== 'complete';
  const showEnvelope = animationPhase !== 'complete';

  const hasLeftOpened =
    currentPhaseIndex >= phaseIndexMap['left-opening'] &&
    animationPhase !== 'idle';
  const hasRightOpened =
    currentPhaseIndex >= phaseIndexMap['right-opening'] &&
    animationPhase !== 'idle';
  const hasSealDisappeared =
    currentPhaseIndex >= phaseIndexMap['seal-disappearing'] &&
    animationPhase !== 'idle';
  const isContentExpanding =
    animationPhase === 'content-expanding' ||
    currentPhaseIndex >= phaseIndexMap['content-expanding'];

  const renderDebugControls = () => {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 12,
          zIndex: 10000,
        }}
      >
        <button
          type='button'
          onClick={handlePrevPhase}
          disabled={animationPhase === 'idle'}
          style={{
            padding: '8px 16px',
            borderRadius: 999,
            border: '1px solid #cbd5f5',
            background: animationPhase === 'idle' ? '#edf2fe' : '#fff',
            color: '#3b82f6',
            fontSize: 14,
            cursor: animationPhase === 'idle' ? 'not-allowed' : 'pointer',
            opacity: animationPhase === 'idle' ? 0.6 : 1,
            transition: 'background 0.2s ease',
          }}
        >
          上一阶段
        </button>
        <button
          type='button'
          onClick={handleStartAnimation}
          disabled={animationPhase === 'complete'}
          style={{
            padding: '8px 16px',
            borderRadius: 999,
            border: '1px solid #2563eb',
            background: animationPhase === 'complete' ? '#bfdbfe' : '#3b82f6',
            color: '#fff',
            fontSize: 14,
            cursor: animationPhase === 'complete' ? 'not-allowed' : 'pointer',
            opacity: animationPhase === 'complete' ? 0.7 : 1,
            transition: 'background 0.2s ease',
          }}
        >
          下一阶段
        </button>
      </div>
    );
  };

  if (!showEnvelope) {
    return null;
  }

  return (
    <>
      <Container
        $clickable={isClickable}
        title='信封动画容器'
        // onClick 来自 debug 按钮控制，为避免误触关闭默认点击
        // onTouchStart={isClickable ? handleStartAnimation : undefined}
      >
        {/* 背景层 - 重复铺满 */}
        <BackgroundLayer
          key='background'
          title='背景层'
          $bgImage={config?.backgroundImage || ''}
          initial={{ opacity: 1 }}
          animate={{
            opacity: showEnvelope ? 1 : 0,
          }}
          transition={{ duration: 0.5 }}
        />

        {/* 邀请函内容预览层（位于内页与外折叠页之间） */}
        <InvitationContentLayer
          style={{ zIndex: 2 }}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{
            scale: isContentExpanding ? 1 : 0.7,
            opacity:
              isContentExpanding || animationPhase === 'right-opening' ? 1 : 0,
          }}
          title='邀请函内容预览层'
          transition={{
            duration: animationPhase === 'content-expanding' ? 0.6 : 0,
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

        <EnvelopeWrapper title='信封层容器'>
          <EnvelopeLayer
            key='envelope-container'
            title='信封层'
            initial={{ scale: 1, opacity: 1 }}
            // animate={{
            //   opacity: animationPhase === 'content-expanding' ? 0 : 1,
            // }}
            transition={{
              opacity: {
                duration: CONTENT_EXPAND_DURATION / 1000,
                ease: easing,
              },
            }}
          >
            {/* 信封内页（最底层） */}
            <EnvelopeImage
              src={config?.envelopeInnerImage || ''}
              alt='envelope-inner'
              style={{
                zIndex: 1,
                width: '300%',
                maxWidth: 'unset',
                transform: 'translateX(-25%)',
              }}
            />

            {/* 信封右侧（在左侧下方） */}
            <EnvelopeImage
              src={rightOpeningImage || ''}
              alt='envelope-right-opening'
              style={{
                zIndex: 3,
                transformOrigin: 'right center',
                backfaceVisibility: 'hidden',
                objectPosition: 'right center',
              }}
              initial={{ rotateY: 0 }}
              animate={{
                rotateY: hasRightOpened ? 180 : 0,
              }}
              transition={{
                duration:
                  animationPhase === 'right-opening'
                    ? RIGHT_OPEN_DURATION / 1000
                    : 0,
                delay:
                  animationPhase === 'right-opening'
                    ? RIGHT_OPEN_DELAY / 1000
                    : 0,
                ease: easing,
              }}
            />

            {/* 信封左侧（覆盖右侧） */}
            <EnvelopeImage
              src={leftOpeningImage || ''}
              alt='envelope-left-opening'
              style={{
                zIndex: 4,
                transformOrigin: 'left center',
                backfaceVisibility: 'hidden',
                objectPosition: 'left center',
              }}
              initial={{ rotateY: 0 }}
              animate={{
                rotateY: hasLeftOpened ? -180 : 0,
              }}
              transition={{
                duration:
                  animationPhase === 'left-opening'
                    ? LEFT_OPEN_DURATION / 1000
                    : 0,
                delay:
                  animationPhase === 'left-opening'
                    ? LEFT_OPEN_DELAY / 1000
                    : 0,
                ease: easing,
              }}
            />

            {/* 信封印章（可点击） */}
            <EnvelopeImage
              src={config?.envelopeSealImage || ''}
              alt='envelope-seal'
              style={{
                zIndex: 5,
                cursor:
                  isClickable && animationPhase === 'idle'
                    ? 'pointer'
                    : 'default',
              }}
              initial={{ opacity: 1, scale: 1 }}
              animate={{
                opacity: hasSealDisappeared ? 0 : 1,
                scale: hasSealDisappeared ? 0.8 : 1,
              }}
              transition={{
                duration:
                  animationPhase === 'seal-disappearing'
                    ? SEAL_DISAPPEAR_DURATION / 1000
                    : 0,
                ease: easing,
              }}
              onClick={isClickable ? handleStartAnimation : undefined}
            />
          </EnvelopeLayer>
        </EnvelopeWrapper>
      </Container>
      {renderDebugControls()}
    </>
  );
}

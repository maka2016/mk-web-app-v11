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

/**
 * 邀请函内容预览层
 * 位于内页与开口之间，保持 24px 内边距
 */
const InvitationContentLayer = styled(motion.div)`
  position: absolute;
  top: 24px;
  left: 24px;
  width: calc(100% - 48px);
  height: calc(100% - 48px);
  overflow: hidden;
  border-radius: 6px;
  will-change: transform, opacity;
  pointer-events: none;
  transform-origin: center;
  z-index: 3;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.24);
`;

const InvitationContentInner = styled.div`
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
  border-radius: 6px;
`;

const LeftFlap = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transform-origin: left center;
  z-index: 4;
`;

const LeftFlapSide = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform-origin: left center;
  transform-style: preserve-3d;
  will-change: transform, opacity;
`;

const FlapSide = styled(motion.img)`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  backface-visibility: hidden;
  will-change: transform, opacity;
`;

const RightFlap = styled(motion.img)`
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: contain;
  transform-origin: right center;
  backface-visibility: hidden;
  z-index: 2;
`;

const SealImage = styled(motion.img)`
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: contain;
  z-index: 5;
  cursor: pointer;
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
  | 'content-expanding' // 内容铺满
  | 'complete'; // 完成

const PHASE_SEQUENCE: AnimationPhase[] = [
  'idle',
  'seal-disappearing',
  'left-opening',
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
export function EnvelopeClientAnimation({
  config,
  onComplete,
}: EnvelopeClientAnimationProps) {
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>('idle');
  const contentShownRef = useRef(false); // 跟踪内容是否已经显示过

  // 检查是否有有效配置
  const leftOpeningImage = config?.envelopeLeftOpeningImage;
  const leftInnerImage = config?.envelopeLeftInnerImage;

  const hasValidConfig =
    config &&
    config.backgroundImage &&
    leftOpeningImage &&
    leftInnerImage &&
    config.envelopeInnerImage &&
    config.envelopeSealImage;

  const easing = parseEasing(config?.easing);

  // 动画时序配置（毫秒）
  const SEAL_DISAPPEAR_DURATION = 300;
  const LEFT_OPEN_DURATION = 3200;
  const CONTENT_EXPAND_DURATION = 1000;

  const LEFT_OPEN_DELAY = 300; // 印章消失后开始
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

  const hasLeftOpened = currentPhaseIndex >= phaseIndexMap['left-opening'];
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
            <InvitationContentLayer
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{
                scale: isContentExpanding ? 1 : 0.7,
                opacity: isContentExpanding ? 1 : 0,
              }}
              transition={{
                duration: isContentExpanding
                  ? CONTENT_EXPAND_DURATION / 1000
                  : 0,
                ease: easing,
              }}
            >
              <InvitationContentInner>
                <div
                  id='envelope-invitation-preview'
                  style={{
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                />
              </InvitationContentInner>
            </InvitationContentLayer>

            <LeftFlap title='左侧开口'>
              <LeftFlapSide
                initial={{ rotateY: 0 }}
                animate={{ rotateY: hasLeftOpened ? -180 : 0 }}
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
              >
                <FlapSide
                  src={leftOpeningImage || ''}
                  alt='envelope-left-outer'
                  style={{
                    objectPosition: 'left center',
                    transformOrigin: 'left center',
                    transform: 'rotateY(0deg) translateZ(0.01px)',
                  }}
                />
                <FlapSide
                  src={leftInnerImage || leftOpeningImage || ''}
                  alt='envelope-left-inner'
                  style={{
                    objectPosition: 'left center',
                    transformOrigin: 'left center',
                    transform: 'rotateY(180deg) translateZ(0.01px)',
                  }}
                />
              </LeftFlapSide>
            </LeftFlap>

            <RightFlap
              src={config?.envelopeInnerImage || ''}
              alt='信封右开口，不做动画'
            ></RightFlap>

            <SealImage
              src={config?.envelopeSealImage || ''}
              alt='envelope-seal'
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
              style={{
                cursor:
                  isClickable && animationPhase === 'idle'
                    ? 'pointer'
                    : 'default',
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

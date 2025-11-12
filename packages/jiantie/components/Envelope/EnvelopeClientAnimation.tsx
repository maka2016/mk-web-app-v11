'use client';

import styled from '@emotion/styled';
import { cdnApi } from '@mk/services';
import { AnimatePresence, motion } from 'motion/react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ENVELOPE_MASKS, EnvelopeConfig } from './types';

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
  position: absolute;
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

const EnvelopeWrapper = styled(motion.div)`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 80vw;
  aspect-ratio: 1 / 2;
  z-index: 8;
  /* box-shadow: 5px 5px 10px 0 rgba(0, 0, 0, 0.3); */
  filter: drop-shadow(10px 10px 6px rgba(0, 0, 0, 0.2));
`;

const GuestNameText = styled(motion.div)`
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  font-size: 24px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  letter-spacing: 2px;
  z-index: 10001;

  @media (max-width: 768px) {
    font-size: 18px;
  }
`;

const ClickHintText = styled(motion.div)`
  position: fixed;
  transform: translate(0, -50%);
  font-size: 20px;
  font-weight: 400;
  color: #666;
  white-space: nowrap;
  letter-spacing: 1px;
  z-index: 10001;

  @media (max-width: 768px) {
    font-size: 16px;
  }

  img {
    width: auto;
    height: 100px;

    @media (max-width: 768px) {
      height: 80px;
    }
  }
`;

const EnvelopeLayer = styled(motion.div)`
  position: relative;
  width: 100%;
  height: 100%;
  perspective: 1000px;
  transform-style: preserve-3d;
`;

/**
 * 信封背景层 - 内侧材质贴纸
 */
const InvitationContentBg = styled(motion.div)<{
  $texture?: string;
  $mask?: string;
}>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: ${props =>
    props.$texture ? `url(${props.$texture})` : 'none'};
  background-repeat: repeat;
  background-size: auto;
  background-position: center;
  mask-image: ${props => (props.$mask ? `url(${props.$mask})` : 'none')};
  mask-size: contain;
  mask-repeat: no-repeat;
  mask-position: center;
`;

/**
 * 邀请函内容预览层
 * 位于内页与开口之间，初始时与信封居中对齐
 */
const InvitationContentLayer = styled(motion.div)`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 6px;
  will-change: transform, opacity;
  pointer-events: none;
  transform-origin: center;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.24);
`;

const InvitationContentInner = styled.div`
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

// 左侧翻转卡片容器 - 提供 perspective
const LeftFlapCard = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9;
  perspective: 1000px;
  filter: drop-shadow(3px 0 2px rgba(0, 0, 0, 0.2));
`;

// 左侧翻转内层 - 执行旋转动画
const LeftFlapInner = styled(motion.div)`
  position: relative;
  width: 100%;
  height: 100%;
  transform-origin: left center;
  transform-style: preserve-3d;
`;

// 翻转卡片的两面 - 使用背景图平铺，用蒙版裁切
const FlapSide = styled.div<{
  $texture?: string;
  $mask?: string;
}>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  background-image: ${props =>
    props.$texture ? `url(${props.$texture})` : 'none'};
  background-repeat: repeat;
  background-size: auto;
  mask-image: ${props => (props.$mask ? `url(${props.$mask})` : 'none')};
  mask-size: contain;
  mask-repeat: no-repeat;

  &.left {
    mask-position: left center;
    background-position: left center;
  }

  &.right {
    mask-position: right center;
    background-position: right center;
  }

  &.back {
    transform: rotateY(-180deg) rotateZ(180deg);
  }
`;

// 渐变质感层 - 从上到下白黑渐变
const GradientOverlay = styled.div<{
  $mask?: string;
}>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(to bottom, #d9d9d9 0%, #000000 100%);
  mask-image: ${props => (props.$mask ? `url(${props.$mask})` : 'none')};
  mask-size: contain;
  mask-repeat: no-repeat;
  pointer-events: none;
  mix-blend-mode: soft-light;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;

  &.left {
    mask-position: left center;
  }

  &.right {
    mask-position: right center;
  }

  &.back {
    transform: rotateY(-180deg) rotateZ(180deg);
  }
`;

// 右侧翻转卡片容器 - 提供 perspective
const RightFlapCard = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 3;
  perspective: 1000px;
  filter: drop-shadow(-3px 0 2px rgba(0, 0, 0, 0.3));
`;

// 右侧翻转内层 - 执行旋转动画
const RightFlapInner = styled(motion.div)`
  position: relative;
  width: 100%;
  height: 100%;
  transform-origin: right center;
  transform-style: preserve-3d;
`;

const SealImageContainer = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const SealImage = styled.img`
  position: absolute;
  right: 8%;
  top: 50%;
  transform: translateY(-50%);
  width: auto;
  height: 18%;
  object-fit: contain;
  z-index: 11;
  cursor: pointer;

  @media (max-width: 768px) {
    right: 5%;
    height: 16%;
  }
`;

interface EnvelopeClientAnimationProps {
  config?: EnvelopeConfig;
  onComplete?: () => void;
}

/**
 * 动画阶段定义
 * 使用 enum 自动获得数字索引，便于阶段比较
 */
enum AnimationPhase {
  Idle = 0, // 初始状态，等待点击
  SealDisappearing = 1, // 印章消失
  Opening = 2, // 信封打开（左右同时，右侧延迟开始）
  ContentExpanding = 3, // 内容铺满
  Complete = 4, // 完成
}

// 动画时序配置（秒）
const SEAL_DISAPPEAR_DURATION = 0.3; // 印章消失持续时间
const FLAP_OPEN_START_DELAY = 0.3; // 印章消失后，开口动画开始的延迟
const LEFT_FLAP_DURATION = 2.2; // 左侧开口打开持续时间
const RIGHT_FLAP_DELAY = 1.1; // 右侧相对左侧的延迟（左侧打开到一半时右侧开始）
const RIGHT_FLAP_DURATION = 2.2; // 右侧开口打开持续时间
const CONTENT_EXPAND_DURATION = 1.2; // 内容展开持续时间

// Opening 阶段的总持续时间 = 左侧延迟 + max(左侧持续时间, 右侧延迟 + 右侧持续时间)
const OPENING_TOTAL_DURATION =
  FLAP_OPEN_START_DELAY +
  Math.max(LEFT_FLAP_DURATION, RIGHT_FLAP_DELAY + RIGHT_FLAP_DURATION);

/**
 * 客户端信封动画组件
 * 在客户端接管服务端渲染的信封 loading，并播放动画
 */
export function EnvelopeClientAnimation({
  config,
  onComplete,
}: EnvelopeClientAnimationProps) {
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>(
    AnimationPhase.Idle
  );
  const contentShownRef = useRef(false); // 跟踪内容是否已经显示过
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);

  // 在客户端挂载后才读取 URL 参数，避免 hydration 不匹配
  useEffect(() => {
    // eslint-disable-next-line
    setMounted(true);
  }, []);

  // 只在客户端挂载后读取 URL 参数
  const rsvp_invitee = mounted ? searchParams.get('rsvp_invitee') || '' : '';
  const isDebugMode = mounted
    ? searchParams.get('envelope_debug') === 'true'
    : false;

  const hasValidConfig = !!config;

  const easing = parseEasing(config?.easing);

  // 使用 cdnApi 处理图片资源，转换为 webp 格式
  const processedImages = useMemo(() => {
    if (!config) {
      return {
        backgroundImage: '',
        innerTexture: '',
        outerTexture: '',
        envelopeSealImage: '',
      };
    }

    return {
      backgroundImage: config.backgroundImage
        ? cdnApi(config.backgroundImage, { format: 'webp' })
        : '',
      innerTexture: config.innerTexture
        ? cdnApi(config.innerTexture, { format: 'webp' })
        : '',
      outerTexture: config.outerTexture
        ? cdnApi(config.outerTexture, { format: 'webp' })
        : '',
      envelopeSealImage: config.envelopeSealImage
        ? cdnApi(config.envelopeSealImage, { format: 'webp' })
        : '',
    };
  }, [config]);

  // 处理点击/触摸事件
  const handleStartAnimation = () => {
    if (isDebugMode) {
      // 调试模式：手动切换到下一个阶段
      if (animationPhase >= AnimationPhase.Complete) {
        return;
      }

      const nextPhase = animationPhase + 1;
      console.log(
        `[EnvelopeClientAnimation] 手动调试，阶段 ${AnimationPhase[animationPhase]} → ${AnimationPhase[nextPhase]}`
      );
      setAnimationPhase(nextPhase);
    } else {
      // 正常模式：从 idle 开始自动播放完整动画
      if (animationPhase === AnimationPhase.Idle) {
        console.log('[EnvelopeClientAnimation] 开始播放动画');
        setAnimationPhase(AnimationPhase.SealDisappearing);
      }
    }
  };

  const handlePrevPhase = () => {
    if (animationPhase <= AnimationPhase.Idle) {
      return;
    }

    const prevPhase = animationPhase - 1;
    console.log(
      `[EnvelopeClientAnimation] 手动调试，阶段 ${AnimationPhase[animationPhase]} → ${AnimationPhase[prevPhase]}`
    );
    setAnimationPhase(prevPhase);
  };

  // 自动播放逻辑：在非调试模式下，每个阶段结束后自动进入下一个阶段
  useEffect(() => {
    if (
      isDebugMode ||
      animationPhase === AnimationPhase.Idle ||
      animationPhase === AnimationPhase.Complete
    ) {
      return;
    }

    let timer: NodeJS.Timeout;

    // 根据当前阶段设置延迟时间，然后自动进入下一个阶段
    // 注意：setTimeout 需要毫秒，所以要乘以 1000
    if (animationPhase === AnimationPhase.SealDisappearing) {
      timer = setTimeout(() => {
        console.log('[EnvelopeClientAnimation] 自动进入：Opening');
        setAnimationPhase(AnimationPhase.Opening);
      }, SEAL_DISAPPEAR_DURATION * 1000);
    } else if (animationPhase === AnimationPhase.Opening) {
      timer = setTimeout(() => {
        console.log('[EnvelopeClientAnimation] 自动进入：ContentExpanding');
        setAnimationPhase(AnimationPhase.ContentExpanding);
      }, OPENING_TOTAL_DURATION * 1000);
    } else if (animationPhase === AnimationPhase.ContentExpanding) {
      timer = setTimeout(() => {
        console.log('[EnvelopeClientAnimation] 自动进入：Complete');
        setAnimationPhase(AnimationPhase.Complete);
      }, CONTENT_EXPAND_DURATION * 1000);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [animationPhase, isDebugMode]);

  // 动画完成回调
  useEffect(() => {
    if (animationPhase === AnimationPhase.Complete) {
      console.log('[EnvelopeClientAnimation] 动画完成');
      onComplete?.();
    }
  }, [animationPhase, onComplete]);

  // 控制内容容器的显示和邀请函预览
  useEffect(() => {
    const initContent = () => {
      const sourceContent = document.getElementById('auto-scroll-container');
      const previewEl = document.getElementById('envelope-invitation-preview');

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
    };
    setTimeout(() => {
      requestAnimationFrame(() => {
        initContent();
      });
    }, 500);
  }, []);

  if (!hasValidConfig) {
    return null;
  }

  const isClickable = animationPhase !== AnimationPhase.Complete;
  const showEnvelope = animationPhase !== AnimationPhase.Complete;
  const isComplete = animationPhase === AnimationPhase.Complete;

  // 左右开口在 Opening 阶段开始打开
  const hasOpening = animationPhase >= AnimationPhase.Opening;
  const hasSealDisappeared =
    animationPhase >= AnimationPhase.SealDisappearing &&
    animationPhase !== AnimationPhase.Idle;

  // 内容展开铺满阶段
  const isContentExpanding = animationPhase >= AnimationPhase.ContentExpanding;

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
          disabled={animationPhase === AnimationPhase.Idle}
          style={{
            padding: '8px 16px',
            borderRadius: 999,
            border: '1px solid #cbd5f5',
            background:
              animationPhase === AnimationPhase.Idle ? '#edf2fe' : '#fff',
            color: '#3b82f6',
            fontSize: 14,
            cursor:
              animationPhase === AnimationPhase.Idle
                ? 'not-allowed'
                : 'pointer',
            opacity: animationPhase === AnimationPhase.Idle ? 0.6 : 1,
            transition: 'background 0.2s ease',
          }}
        >
          上一阶段
        </button>
        <button
          type='button'
          onClick={handleStartAnimation}
          disabled={animationPhase === AnimationPhase.Complete}
          style={{
            padding: '8px 16px',
            borderRadius: 999,
            border: '1px solid #2563eb',
            background:
              animationPhase === AnimationPhase.Complete
                ? '#bfdbfe'
                : '#3b82f6',
            color: '#fff',
            fontSize: 14,
            cursor:
              animationPhase === AnimationPhase.Complete
                ? 'not-allowed'
                : 'pointer',
            opacity: animationPhase === AnimationPhase.Complete ? 0.7 : 1,
            transition: 'background 0.2s ease',
          }}
        >
          下一阶段
        </button>
      </div>
    );
  };

  return (
    <>
      {/* 动画完成后整个容器退出画布 */}
      {!isComplete && (
        <Container
          $clickable={isClickable}
          title='信封动画容器'
          onClick={
            !isDebugMode && isClickable ? handleStartAnimation : undefined
          }
          onTouchStart={
            !isDebugMode && isClickable ? handleStartAnimation : undefined
          }
        >
          {/* 背景层 - 重复铺满 */}
          <BackgroundLayer
            key='background'
            title='作品背景层'
            $bgImage={processedImages.backgroundImage}
            initial={{ opacity: 1 }}
            animate={{
              opacity: showEnvelope ? 1 : 0,
            }}
            transition={{ duration: 0.5 }}
          />

          {/* 信封层：完成后完全退出画布 */}
          <AnimatePresence>
            {!isComplete && (
              <EnvelopeWrapper
                key='envelope-wrapper'
                title='信封层容器'
                initial={{ left: '50%', x: '-50%', y: '-50%', opacity: 1 }}
                animate={{
                  left: '50%', // 初始：中心
                  x: '-50%',
                  y: '-50%',
                }}
                exit={{
                  opacity: 0,
                  transition: { duration: 0 },
                }}
                transition={{
                  height: {
                    duration: CONTENT_EXPAND_DURATION,
                    ease: easing,
                  },
                  width: {
                    duration: CONTENT_EXPAND_DURATION,
                    ease: easing,
                  },
                }}
                style={{
                  pointerEvents: isClickable ? 'auto' : 'none',
                }}
              >
                <EnvelopeLayer
                  key='envelope-container'
                  title='信封层'
                  initial={{ scale: 1, opacity: 1 }}
                  transition={{
                    opacity: {
                      duration: CONTENT_EXPAND_DURATION,
                      ease: easing,
                    },
                  }}
                >
                  <InvitationContentBg
                    title='邀请函内容背景层'
                    $texture={processedImages.innerTexture}
                    $mask={ENVELOPE_MASKS.inner}
                  />

                  <InvitationContentLayer
                    title='邀请函内容预览层'
                    initial={{ left: '50%', x: '-50%', y: '-50%' }}
                    animate={{
                      height: isContentExpanding ? '100vh' : 'calc(70vw * 2)',
                      width: isContentExpanding ? '100vw' : '70vw',
                    }}
                    transition={{
                      height: {
                        duration: CONTENT_EXPAND_DURATION,
                        ease: easing,
                      },
                      width: {
                        duration: CONTENT_EXPAND_DURATION,
                        ease: easing,
                      },
                      scale: {
                        duration: CONTENT_EXPAND_DURATION,
                        ease: easing,
                      },
                    }}
                    style={{
                      zIndex: isContentExpanding ? 10000 : 3,
                    }}
                  >
                    <InvitationContentInner>
                      <div
                        id='envelope-invitation-preview'
                        style={{
                          width: '100%',
                          height: '100%',
                          position: 'relative',
                          // overflow: 'hidden',
                          // aspectRatio: '3/4',
                        }}
                      />
                    </InvitationContentInner>
                  </InvitationContentLayer>

                  {/* 右侧翻转卡片 */}
                  <RightFlapCard title='右侧翻转卡片'>
                    <RightFlapInner
                      initial={{ rotateY: 0 }}
                      animate={{ rotateY: hasOpening ? 180 : 0 }}
                      transition={{
                        duration:
                          animationPhase === AnimationPhase.Opening
                            ? RIGHT_FLAP_DURATION
                            : 0,
                        delay:
                          animationPhase === AnimationPhase.Opening
                            ? FLAP_OPEN_START_DELAY + RIGHT_FLAP_DELAY
                            : 0,
                        ease: easing,
                      }}
                      style={{
                        transformStyle: 'preserve-3d',
                      }}
                    >
                      {/* 正面 - 右侧开口外侧 */}
                      <FlapSide
                        className='right'
                        $texture={processedImages.outerTexture}
                        $mask={ENVELOPE_MASKS.rightFlap}
                      />
                      {/* 正面渐变质感层 */}
                      <GradientOverlay
                        className='right'
                        $mask={ENVELOPE_MASKS.rightFlap}
                      />
                      {/* 背面 - 右侧开口内侧 */}
                      <FlapSide
                        className='right back'
                        $texture={processedImages.innerTexture}
                        $mask={ENVELOPE_MASKS.rightFlap}
                      />
                      {/* 背面渐变质感层 */}
                      <GradientOverlay
                        className='right back'
                        $mask={ENVELOPE_MASKS.rightFlap}
                      />
                    </RightFlapInner>
                  </RightFlapCard>

                  {/* 左侧翻转卡片 */}
                  <LeftFlapCard title='左侧翻转卡片'>
                    <LeftFlapInner
                      initial={{ rotateY: 0 }}
                      animate={{ rotateY: hasOpening ? -180 : 0 }}
                      transition={{
                        duration:
                          animationPhase === AnimationPhase.Opening
                            ? LEFT_FLAP_DURATION
                            : 0,
                        delay:
                          animationPhase === AnimationPhase.Opening
                            ? FLAP_OPEN_START_DELAY
                            : 0,
                        ease: easing,
                      }}
                    >
                      {/* 正面 - 左侧开口外侧 */}
                      <FlapSide
                        className='left'
                        $texture={processedImages.outerTexture}
                        $mask={ENVELOPE_MASKS.leftFlap}
                      />
                      {/* 正面渐变质感层 */}
                      <GradientOverlay
                        className='left'
                        $mask={ENVELOPE_MASKS.leftFlap}
                      />
                      {/* 背面 - 左侧开口内侧 */}
                      <FlapSide
                        className='left back'
                        $texture={processedImages.innerTexture}
                        $mask={ENVELOPE_MASKS.leftFlap}
                      />
                      {/* 背面渐变质感层 */}
                      <GradientOverlay
                        className='left back'
                        $mask={ENVELOPE_MASKS.leftFlap}
                      />
                    </LeftFlapInner>
                  </LeftFlapCard>

                  <SealImageContainer
                    title='信封印章'
                    initial={{ opacity: 1, scale: 1 }}
                    animate={{
                      opacity: hasSealDisappeared ? 0 : 1,
                      scale: hasSealDisappeared ? 0.6 : 1,
                    }}
                    transition={{
                      duration:
                        animationPhase === AnimationPhase.SealDisappearing
                          ? SEAL_DISAPPEAR_DURATION
                          : 0,
                      ease: easing,
                    }}
                    style={{
                      cursor:
                        isClickable && animationPhase === AnimationPhase.Idle
                          ? 'pointer'
                          : 'default',
                    }}
                    onClick={
                      isDebugMode && isClickable
                        ? handleStartAnimation
                        : undefined
                    }
                  >
                    <SealImage
                      src={processedImages.envelopeSealImage}
                      alt='envelope-seal'
                    />
                  </SealImageContainer>
                </EnvelopeLayer>
              </EnvelopeWrapper>
            )}
          </AnimatePresence>

          {/* 左侧：嘉宾名称 - 相对于屏幕固定定位 */}
          <AnimatePresence mode='wait'>
            {animationPhase === AnimationPhase.Idle && (
              <GuestNameText
                key='guest-name'
                initial={{ opacity: 0, left: '0' }}
                animate={{ opacity: 1, left: '15vw' }}
                exit={{
                  opacity: 0,
                  left: '0',
                  transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
                }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <p className='text-sm'>诚邀</p>
                {rsvp_invitee && (
                  <p>{decodeURIComponent(rsvp_invitee || '')}</p>
                )}
              </GuestNameText>
            )}
          </AnimatePresence>

          {/* 右侧：点击提示 - 相对于屏幕固定定位 */}
          <AnimatePresence mode='wait'>
            {animationPhase === AnimationPhase.Idle && (
              <ClickHintText
                key='click-hint'
                initial={{ opacity: 0, right: '0', top: '50%' }}
                animate={{
                  opacity: [0, 1, 0.6, 1],
                  right: '8vw',
                  top: '56%',
                }}
                exit={{
                  opacity: 0,
                  right: '0',
                  transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
                }}
                transition={{
                  duration: 0.6,
                  delay: 0.5,
                  opacity: {
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  },
                }}
              >
                <img src='/assets/envelope/open-geust.svg' alt='点击开启' />
              </ClickHintText>
            )}
          </AnimatePresence>
        </Container>
      )}
      {isDebugMode && renderDebugControls()}
    </>
  );
}

'use client';

import styled from '@emotion/styled';
import { AnimatePresence, motion } from 'motion/react';
import { useSearchParams } from 'next/navigation';
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
  aspect-ratio: 114 / 162;
  z-index: 8;
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
  top: 50%;
  transform: translateY(-50%);
  font-size: 20px;
  font-weight: 400;
  color: #666;
  white-space: nowrap;
  letter-spacing: 1px;
  z-index: 10001;

  @media (max-width: 768px) {
    font-size: 16px;
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
 * 信封背景层
 */
const InvitationContentBg = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
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
`;

// 左侧翻转内层 - 执行旋转动画
const LeftFlapInner = styled(motion.div)`
  position: relative;
  width: 100%;
  height: 100%;
  transform-origin: left center;
  transform-style: preserve-3d;
`;

// 翻转卡片的两面
const FlapSide = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: left center;
  }

  &.back {
    transform: rotateY(-180deg);
    img {
      object-position: right center;
    }
  }
`;

const RightFlap = styled(motion.img)`
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform-origin: right center;
  backface-visibility: hidden;
  z-index: 3;
`;

const SealImage = styled(motion.img)`
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: contain;
  z-index: 11;
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
  | 'content-separating' // 内容和信封分离
  | 'content-expanding' // 内容铺满
  | 'complete'; // 完成

const PHASE_SEQUENCE: AnimationPhase[] = [
  'idle',
  'seal-disappearing',
  'left-opening',
  'content-separating',
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
  const searchParams = useSearchParams();
  const [rsvp_invitee] = useState(searchParams.get('rsvp_invitee') || '');

  // 通过 URL 参数控制调试模式：?envelope_debug=true
  const isDebugMode = searchParams.get('envelope_debug') === 'true';

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
  const LEFT_OPEN_DURATION = 1200;
  const CONTENT_SEPARATE_DURATION = 800; // 内容和信封分离的时长
  const CONTENT_EXPAND_DURATION = 1600;

  const LEFT_OPEN_DELAY = 300; // 印章消失后开始

  // 处理点击/触摸事件
  const handleStartAnimation = () => {
    if (isDebugMode) {
      // 调试模式：手动切换到下一个阶段
      const currentIndex = PHASE_SEQUENCE.indexOf(animationPhase);
      if (currentIndex === -1 || currentIndex === PHASE_SEQUENCE.length - 1) {
        return;
      }

      const nextPhase = PHASE_SEQUENCE[currentIndex + 1];
      console.log(
        `[EnvelopeClientAnimation] 手动调试，阶段 ${animationPhase} → ${nextPhase}`
      );
      setAnimationPhase(nextPhase);
    } else {
      // 正常模式：从 idle 开始自动播放完整动画
      if (animationPhase === 'idle') {
        console.log('[EnvelopeClientAnimation] 开始播放动画');
        setAnimationPhase('seal-disappearing');
      }
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

  // 自动播放逻辑：在非调试模式下，每个阶段结束后自动进入下一个阶段
  useEffect(() => {
    if (
      isDebugMode ||
      animationPhase === 'idle' ||
      animationPhase === 'complete'
    ) {
      return;
    }

    let timer: NodeJS.Timeout;

    // 根据当前阶段设置延迟时间，然后自动进入下一个阶段
    if (animationPhase === 'seal-disappearing') {
      timer = setTimeout(() => {
        console.log('[EnvelopeClientAnimation] 自动进入：left-opening');
        setAnimationPhase('left-opening');
      }, SEAL_DISAPPEAR_DURATION);
    } else if (animationPhase === 'left-opening') {
      timer = setTimeout(() => {
        console.log('[EnvelopeClientAnimation] 自动进入：content-separating');
        setAnimationPhase('content-separating');
      }, LEFT_OPEN_DELAY + LEFT_OPEN_DURATION);
    } else if (animationPhase === 'content-separating') {
      timer = setTimeout(() => {
        console.log('[EnvelopeClientAnimation] 自动进入：content-expanding');
        setAnimationPhase('content-expanding');
      }, CONTENT_SEPARATE_DURATION);
    } else if (animationPhase === 'content-expanding') {
      timer = setTimeout(() => {
        console.log('[EnvelopeClientAnimation] 自动进入：complete');
        setAnimationPhase('complete');
      }, CONTENT_EXPAND_DURATION);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [animationPhase, isDebugMode]);

  // 动画完成回调
  useEffect(() => {
    if (animationPhase === 'complete') {
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

  const currentPhaseIndex = phaseIndexMap[animationPhase] ?? 0;
  const isClickable = animationPhase !== 'complete';
  const showEnvelope = animationPhase !== 'complete';
  const isComplete = animationPhase === 'complete';

  const hasLeftOpened = currentPhaseIndex >= phaseIndexMap['left-opening'];
  const hasSealDisappeared =
    currentPhaseIndex >= phaseIndexMap['seal-disappearing'] &&
    animationPhase !== 'idle';

  // 内容和信封分离阶段
  const isContentSeparating =
    animationPhase === 'content-separating' ||
    currentPhaseIndex >= phaseIndexMap['content-separating'];

  // 内容展开铺满阶段
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
            $bgImage={config?.backgroundImage || ''}
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
                  x: isContentSeparating ? '75%' : '-50%',
                  y: '-50%',
                  height: isContentExpanding
                    ? '100%'
                    : 'calc(80vw * 162 / 114)',
                  width: isContentExpanding ? '100%' : '80vw',
                  scale: animationPhase === 'content-separating' ? 1 : 1,
                  // opacity: isContentExpanding ? 0 : 1, // expanding 阶段淡出
                }}
                exit={{
                  opacity: 0,
                  transition: { duration: 0 },
                }}
                transition={{
                  height: {
                    duration:
                      animationPhase === 'content-separating'
                        ? CONTENT_SEPARATE_DURATION / 1000
                        : animationPhase === 'content-expanding'
                          ? CONTENT_EXPAND_DURATION / 1000
                          : 0,
                    ease: easing,
                  },
                  width: {
                    duration:
                      animationPhase === 'content-separating'
                        ? CONTENT_SEPARATE_DURATION / 1000
                        : animationPhase === 'content-expanding'
                          ? CONTENT_EXPAND_DURATION / 1000
                          : 0,
                    ease: easing,
                  },
                  x: {
                    duration:
                      animationPhase === 'content-separating'
                        ? CONTENT_SEPARATE_DURATION / 1000
                        : animationPhase === 'content-expanding'
                          ? CONTENT_EXPAND_DURATION / 1000
                          : 0,
                    ease:
                      animationPhase === 'content-separating'
                        ? [0, 0, 1, 1] // linear
                        : easing, // ease-in-out
                  },
                  left: {
                    duration:
                      animationPhase === 'content-separating'
                        ? CONTENT_SEPARATE_DURATION / 1000
                        : animationPhase === 'content-expanding'
                          ? CONTENT_EXPAND_DURATION / 1000
                          : 0,
                    ease:
                      animationPhase === 'content-separating'
                        ? [0, 0, 1, 1] // linear
                        : easing, // ease-in-out
                  },
                  opacity: {
                    duration:
                      animationPhase === 'content-expanding'
                        ? CONTENT_EXPAND_DURATION / 1000
                        : 0,
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
                      duration: CONTENT_EXPAND_DURATION / 1000,
                      ease: easing,
                    },
                  }}
                >
                  <InvitationContentBg
                    title='邀请函内容背景层'
                    style={{
                      backgroundImage: `url(${config?.envelopeInnerImage || ''})`,
                      backgroundPosition: 'center',
                      backgroundRepeat: 'repeat',
                    }}
                  ></InvitationContentBg>

                  <InvitationContentLayer
                    title='邀请函内容预览层'
                    initial={{ left: '50%', scale: 0.9, x: '-50%', y: '-50%' }}
                    animate={{
                      left: '50%', // 初始：中心
                      scale: isContentExpanding ? 1 : 0.9,
                      x: isContentSeparating ? '-175%' : '-50%',
                      y: '-50%',
                    }}
                    transition={{
                      x: {
                        duration:
                          animationPhase === 'content-separating'
                            ? CONTENT_SEPARATE_DURATION / 1000
                            : animationPhase === 'content-expanding'
                              ? CONTENT_EXPAND_DURATION / 1000
                              : 0,
                        ease:
                          animationPhase === 'content-separating'
                            ? [0, 0, 1, 1] // linear
                            : easing, // ease-in-out
                      },
                      left: {
                        duration:
                          animationPhase === 'content-separating'
                            ? CONTENT_SEPARATE_DURATION / 1000
                            : animationPhase === 'content-expanding'
                              ? CONTENT_EXPAND_DURATION / 1000
                              : 0,
                        ease:
                          animationPhase === 'content-separating'
                            ? [0, 0, 1, 1] // linear
                            : [0.4, 0, 0.2, 1], // ease-in-out
                      },
                      scale: {
                        duration:
                          animationPhase === 'content-expanding'
                            ? CONTENT_EXPAND_DURATION / 1000
                            : 0,
                        ease: [0.4, 0, 0.2, 1],
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
                  {/* 左侧翻转卡片 */}
                  <LeftFlapCard title='左侧翻转卡片'>
                    <LeftFlapInner
                      initial={{ rotateY: 0 }}
                      animate={{ rotateY: hasLeftOpened ? -260 : 0 }}
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
                      style={{
                        transformStyle: 'preserve-3d',
                      }}
                    >
                      {/* 正面 - 左侧开口外侧 */}
                      <FlapSide>
                        <img
                          src={leftOpeningImage || ''}
                          alt='envelope-left-outer'
                        />
                      </FlapSide>
                      {/* 背面 - 左侧开口内侧 */}
                      <FlapSide className='back'>
                        <img
                          src={leftInnerImage || leftOpeningImage || ''}
                          alt='envelope-left-inner'
                        />
                      </FlapSide>
                    </LeftFlapInner>
                  </LeftFlapCard>

                  <RightFlap
                    title='信封右开口，不做动画'
                    src={config?.envelopeRightOpeningImage || ''}
                    alt='信封右开口'
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
                    onClick={
                      isDebugMode && isClickable
                        ? handleStartAnimation
                        : undefined
                    }
                  />
                </EnvelopeLayer>
              </EnvelopeWrapper>
            )}
          </AnimatePresence>

          {/* 左侧：嘉宾名称 - 相对于屏幕固定定位 */}
          <AnimatePresence mode='wait'>
            {rsvp_invitee && animationPhase === 'idle' && (
              <GuestNameText
                key='guest-name'
                initial={{ opacity: 0, left: '0' }}
                animate={{ opacity: 1, left: '5vw' }}
                exit={{
                  opacity: 0,
                  left: '0',
                  transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
                }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <p className='text-sm'>诚邀</p>
                <p>{decodeURIComponent(rsvp_invitee || '')}</p>
              </GuestNameText>
            )}
          </AnimatePresence>

          {/* 右侧：点击提示 - 相对于屏幕固定定位 */}
          <AnimatePresence mode='wait'>
            {animationPhase === 'idle' && (
              <ClickHintText
                key='click-hint'
                initial={{ opacity: 0, right: '0' }}
                animate={{
                  opacity: [0, 1, 0.6, 1],
                  right: '5vw',
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
                点击开启
              </ClickHintText>
            )}
          </AnimatePresence>
        </Container>
      )}
      {isDebugMode && renderDebugControls()}
    </>
  );
}

'use client';

import { cdnApi } from '@/services';
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { AnimatePresence, motion } from 'motion/react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ClickHintMotion } from './ClickHintMotion';
import ConfettiPlayer, { type ConfettiRef } from './Confetti';
import {
  EnvelopeConfig,
  getDefaultTiming,
  normalizeConfettiSettings,
} from './types';

const scale = 0.7;

const envelopeRatio = '9/16';

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

const Container = styled(motion.div)<{ $clickable: boolean }>`
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
  background-size: cover;
  background-position: center;
`;

const EnvelopeContentWrapper = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
`;

const EnvelopeContentFadeIn = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  filter: drop-shadow(8px 8px 6px rgba(0, 0, 0, 0.3));
`;

const EnvelopeWrapper = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: ${scale * 100}vw;
  transform: translate(-50%, -50%);
  aspect-ratio: ${envelopeRatio};
  z-index: 8;
  &.shadow {
    box-shadow: 12px 12px 6px rgba(15, 23, 42, 0.24);
  }
`;

const GuestNameText = styled(motion.div)<{
  $fontSize?: number;
  $color?: string;
}>`
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  font-size: ${props => props.$fontSize ?? 24}px;
  font-weight: 500;
  color: ${props => props.$color ?? '#333'};
  white-space: nowrap;
  letter-spacing: 2px;
  z-index: 10001;

  @media (max-width: 768px) {
    font-size: ${props => Math.max(12, (props.$fontSize ?? 24) * 0.75)}px;
  }
`;

const ClickHintText = styled(motion.div)`
  position: fixed;
  transform: translate(0, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  top: 56%;
  right: 28vw;
  font-size: 18px;
  font-weight: 500;
  color: #f5f5f5;
  letter-spacing: 2px;
  z-index: 10001;

  @media (max-width: 768px) {
    font-size: 16px;
    gap: 12px;
  }
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
  background-size: cover;
  background-position: center;
  mask-image: ${props => (props.$mask ? `url(${props.$mask})` : 'none')};
  mask-size: contain;
  mask-repeat: no-repeat;
  mask-position: center;
  mask-mode: alpha;
`;

/**
 * 邀请函内容预览层
 * 位于内页与开口之间，初始时与信封居中对齐
 */
const InvitationContentLayer = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  will-change: transform, opacity;
  pointer-events: none;
  transform-origin: center center;
  z-index: 2;
`;

const InvitationContentInner = styled.div`
  width: 100%;
  height: 100%;
  pointer-events: none;
  * {
    pointer-events: none !important;
  }
  /* display: flex;
  align-items: center;
  justify-content: center; */
  /* .inner {
    overflow: hidden;
    border-radius: 6px;
    box-shadow: 0 12px 24px rgba(15, 23, 42, 0.24);
  } */
`;

const FlapShadow1 = styled.div<{
  $mask?: string;
  direction?: 'left' | 'right';
}>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  ${props =>
    props.direction === 'left'
      ? css`
          filter: drop-shadow(3px 0 2px rgba(0, 0, 0, 0.3));
        `
      : css`
          filter: drop-shadow(-3px 0 2px rgba(0, 0, 0, 0.3));
        `}
  .mask {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    mask-image: ${props => (props.$mask ? `url(${props.$mask})` : 'none')};
    mask-size: contain;
    mask-repeat: no-repeat;
    ${props =>
      props.direction === 'left'
        ? css`
            mask-position: left center;
          `
        : css`
            mask-position: right center;
          `}
    background: #eee;
  }
`;

const FlapShadow = ({
  $mask,
  direction,
  title,
}: {
  $mask?: string;
  direction?: 'left' | 'right';
  title?: string;
}) => {
  return (
    <FlapShadow1 $mask={$mask} direction={direction} title={title}>
      <div className='mask'></div>
    </FlapShadow1>
  );
};

// 左侧翻转卡片容器 - 提供 perspective
const LeftFlapCard = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9;
  perspective: 1000px;
  /* filter: drop-shadow(2px 0 1px rgba(0, 0, 0, 0.2)); */
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
  $fit?: 'cover' | 'contain';
  $repeat?: 'repeat' | 'no-repeat';
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
  background-repeat: ${props => props.$repeat ?? 'repeat'};
  background-size: ${props => props.$fit ?? 'cover'};
  background-position: center;
  mask-image: ${props => (props.$mask ? `url(${props.$mask})` : 'none')};
  mask-size: contain;
  mask-repeat: no-repeat;
  mask-position: center;
  mask-mode: alpha;

  &.left {
    background-position: left center;
    mask-position: left center;
  }

  &.right {
    background-position: right center;
    mask-position: right center;
  }

  &.back {
    transform: rotateY(-180deg) rotateZ(180deg);
    &.left {
      background-position: right center;
    }

    &.right {
      background-position: left center;
    }
  }
`;

// 渐变质感层 - 从上到下白黑渐变
const GradientOverlay = styled.div<{
  $mask?: string;
  direction?: 'top2bottom' | 'left2right' | 'right2left' | 'between2sides';
}>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  ${props => {
    const { direction = 'top2bottom' } = props;
    if (direction === 'top2bottom') {
      return css`
        background: linear-gradient(169deg, #d9d9d9 1.36%, #000 102.29%);
      `;
    }
    if (direction === 'left2right') {
      return css`
        background: linear-gradient(
          87deg,
          rgba(222, 222, 222, 0) 0.22%,
          #000 96.17%
        );
      `;
    }
    if (direction === 'right2left') {
      return css`
        background: linear-gradient(
          270deg,
          rgba(255, 255, 255, 0) 0%,
          #000 100%
        );
      `;
    }
    if (direction === 'between2sides') {
      return css`
        background: linear-gradient(
          270deg,
          #333 0%,
          rgba(51, 51, 51, 0) 50%,
          #333 100%
        );
      `;
    }
  }}
  mix-blend-mode: soft-light;
  /* background: linear-gradient(to bottom, #fff 0%, #444 100%); */
  mask-image: ${props => (props.$mask ? `url(${props.$mask})` : 'none')};
  mask-size: contain;
  mask-repeat: no-repeat;
  mask-position: center;
  mask-mode: alpha;
  pointer-events: none;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;

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

// 右侧翻转卡片容器 - 提供 perspective
const RightFlapCard = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 3;
  perspective: 1000px;
`;

// 右侧翻转内层 - 执行旋转动画
const RightFlapInner = styled(motion.div)`
  position: relative;
  width: 100%;
  height: 100%;
  transform-origin: right center;
  transform-style: preserve-3d;
`;

const SealImageContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const SealImage = styled(motion.img)`
  position: absolute;
  right: 12px;
  width: auto;
  height: 18%;
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
 * 使用 enum 自动获得数字索引，便于阶段比较
 */
enum AnimationPhase {
  Idle = 0, // 初始状态，等待点击
  SealDisappearing = 1, // 印章消失
  Opening = 2, // 信封打开（左右同时，右侧延迟开始）
  ContentExpanding = 3, // 内容铺满
  Complete = 4, // 完成
}

/**
 * 从配置中获取动画时序参数（秒）
 */
const getAnimationTiming = (config: EnvelopeConfig = getDefaultTiming()) => {
  // 配置值已经是秒，直接使用
  const SEAL_DISAPPEAR_DURATION = config?.sealDisappearDuration ?? 0.3;
  const FLAP_OPEN_START_DELAY = config?.flapOpenStartDelay ?? 0.3;
  const LEFT_FLAP_DURATION = config?.leftFlapDuration ?? 2.0;
  const RIGHT_FLAP_DELAY = config?.rightFlapDelay ?? 0.6;
  const RIGHT_FLAP_DURATION = config?.rightFlapDuration ?? 2.0;
  const CONTENT_EXPAND_DURATION = config?.contentExpandDuration ?? 1.2;

  // Opening 阶段的总持续时间 = 左侧延迟 + max(左侧持续时间, 右侧延迟 + 右侧持续时间)
  const OPENING_TOTAL_DURATION =
    FLAP_OPEN_START_DELAY +
    Math.max(LEFT_FLAP_DURATION, RIGHT_FLAP_DELAY + RIGHT_FLAP_DURATION);

  return {
    SEAL_DISAPPEAR_DURATION,
    FLAP_OPEN_START_DELAY,
    LEFT_FLAP_DURATION,
    RIGHT_FLAP_DELAY,
    RIGHT_FLAP_DURATION,
    CONTENT_EXPAND_DURATION,
    OPENING_TOTAL_DURATION,
  };
};

const schedulePhaseAutoPlay = (
  phase: AnimationPhase,
  timing: ReturnType<typeof getAnimationTiming>,
  setPhase: (next: AnimationPhase) => void
): number | undefined => {
  let timer: number | undefined;

  if (phase === AnimationPhase.Idle) {
    console.log('[EnvelopeClientAnimation] 开始播放动画');
    setPhase(AnimationPhase.SealDisappearing);
  } else if (phase === AnimationPhase.SealDisappearing) {
    timer = window.setTimeout(() => {
      console.log('[EnvelopeClientAnimation] 自动进入：Opening');
      setPhase(AnimationPhase.Opening);
    }, timing.SEAL_DISAPPEAR_DURATION * 1000);
  } else if (phase === AnimationPhase.Opening) {
    timer = window.setTimeout(() => {
      console.log('[EnvelopeClientAnimation] 自动进入：ContentExpanding');
      setPhase(AnimationPhase.ContentExpanding);
    }, timing.OPENING_TOTAL_DURATION * 1000);
  } else if (phase === AnimationPhase.ContentExpanding) {
    timer = window.setTimeout(() => {
      console.log('[EnvelopeClientAnimation] 自动进入：Complete');
      setPhase(AnimationPhase.Complete);
    }, timing.CONTENT_EXPAND_DURATION * 1000);
  }

  return timer;
};

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
  const sourceContentRef = useRef<HTMLElement | null>(null);
  const sourcePlaceholderRef = useRef<HTMLElement | null>(null);
  const sourceOriginalStyleRef = useRef<string | null>(null);
  const confettiTriggeredRef = useRef(false); // 跟踪撒花是否已触发
  const isAttachingRef = useRef(false); // 防止并发执行 attachSourceContent
  const confettiRef = useRef<ConfettiRef | null>(null); // 撒花组件引用

  const attachSourceContent = () => {
    // 如果已经在执行或已经附加过，直接返回
    if (isAttachingRef.current || sourceContentRef.current) {
      return true;
    }

    // 设置锁
    isAttachingRef.current = true;

    try {
      const sourceContent = document.getElementById(
        'auto-scroll-container'
      ) as HTMLElement | null;
      const previewEl = document.getElementById('envelope-invitation-preview');

      if (!sourceContent || !previewEl) {
        return false;
      }

      // 检查 sourceContent 是否已经在 previewEl 中（可能已经被移动过）
      const isAlreadyInPreview = sourceContent.parentNode === previewEl;

      if (!sourcePlaceholderRef.current && !isAlreadyInPreview) {
        // 只有在 sourceContent 还在原始位置时才创建 placeholder
        const parentNode = sourceContent.parentNode;

        // 验证 parentNode 存在且 sourceContent 确实是它的子节点
        if (parentNode && parentNode.contains(sourceContent)) {
          const placeholder = document.createElement('div');
          placeholder.setAttribute('data-envelope-placeholder', 'true');
          placeholder.style.display = 'block';
          placeholder.style.width = '100%';
          placeholder.style.minHeight = `${sourceContent.getBoundingClientRect().height}px`;
          placeholder.style.pointerEvents = 'none';
          placeholder.style.visibility = 'hidden';

          // 再次验证 sourceContent 仍然是 parentNode 的子节点（防止竞态条件）
          if (parentNode === sourceContent.parentNode) {
            try {
              parentNode.insertBefore(placeholder, sourceContent);
              sourcePlaceholderRef.current = placeholder;
            } catch (error) {
              console.warn(
                '[EnvelopeClientAnimation] Failed to insert placeholder:',
                error
              );
              // 如果插入失败，清理 placeholder
              // placeholder 还没有被添加到 DOM，所以不需要移除
            }
          }
        }
      }

      sourceOriginalStyleRef.current = sourceContent.getAttribute('style');
      sourceContentRef.current = sourceContent;

      if (previewEl.childElementCount > 0) {
        Array.from(previewEl.children).forEach(child => {
          if (child !== sourceContent) {
            previewEl.removeChild(child);
          }
        });
      }

      // 只有在 sourceContent 不在 previewEl 中时才移动
      if (!isAlreadyInPreview) {
        previewEl.appendChild(sourceContent);
      }
      sourceContent.dataset.envelopePreview = 'active';
      sourceContent.style.position = 'absolute';
      sourceContent.style.top = '0';
      sourceContent.style.right = '0';
      sourceContent.style.bottom = '0';
      sourceContent.style.left = '0';
      sourceContent.style.width = '100%';
      sourceContent.style.height = '100%';
      sourceContent.style.pointerEvents = 'none';
      sourceContent.style.overflow = 'hidden';
      sourceContent.style.willChange = 'transform, opacity';

      contentShownRef.current = true;
      return true;
    } finally {
      // 释放锁
      isAttachingRef.current = false;
    }
  };

  const restoreSourceContent = () => {
    const sourceContent = sourceContentRef.current;
    const placeholder = sourcePlaceholderRef.current;

    if (!sourceContent && !placeholder) {
      return;
    }

    if (sourceContent) {
      delete sourceContent.dataset.envelopePreview;

      if (sourceOriginalStyleRef.current === null) {
        sourceContent.removeAttribute('style');
      } else {
        sourceContent.setAttribute('style', sourceOriginalStyleRef.current);
      }

      // 如果 placeholder 存在，用 sourceContent 替换它
      if (placeholder && placeholder.parentNode) {
        try {
          // 如果 sourceContent 已经在 DOM 中，replaceWith 会先将其移除，然后替换 placeholder
          placeholder.replaceWith(sourceContent);
          // replaceWith 已经将 placeholder 从 DOM 中移除，不需要再手动移除
        } catch (error) {
          console.warn(
            '[EnvelopeClientAnimation] Failed to replace placeholder:',
            error
          );
          // 如果 replaceWith 失败，尝试手动处理
          if (placeholder.parentNode) {
            placeholder.parentNode.removeChild(placeholder);
          }
        }
      } else {
        // 如果 placeholder 不存在，检查 sourceContent 是否在 previewEl 中
        const previewEl = document.getElementById(
          'envelope-invitation-preview'
        );
        if (previewEl && sourceContent.parentNode === previewEl) {
          // 如果 sourceContent 在 previewEl 中，将其移除
          // 注意：由于没有 placeholder，我们不知道原位置，所以只能移除
          previewEl.removeChild(sourceContent);
        }
      }
    } else if (placeholder && placeholder.parentNode) {
      // 如果 sourceContent 不存在，但 placeholder 还在，需要移除 placeholder
      placeholder.parentNode.removeChild(placeholder);
    }

    sourceContentRef.current = null;
    sourcePlaceholderRef.current = null;
    sourceOriginalStyleRef.current = null;
  };
  const searchParams = useSearchParams();
  const [imagesLoaded, setImagesLoaded] = useState(false); // 图片加载状态
  const [rsvp_invitee] = useState(searchParams.get('rsvp_invitee') || '');
  const [isDebugMode] = useState(searchParams.get('envelope_debug') === 'true');

  const hasValidConfig = !!config;

  const easing = parseEasing(config?.easing);

  // 获取动画时序参数
  const timing = useMemo(() => getAnimationTiming(config), [config]);

  // 使用 cdnApi 处理图片资源，转换为 webp 格式
  const processedImages = useMemo(() => {
    if (!config) {
      return {
        backgroundImage: '',
        innerTexture: '',
        leftFlapOuterImage: '',
        rightFlapOuterImage: '',
        envelopeSealImage: '',
      };
    }

    return {
      backgroundImage: cdnApi(config.backgroundImage),
      innerTexture: cdnApi(config.innerTexture),
      leftFlapOuterImage: cdnApi(config.leftFlapOuterImage),
      rightFlapOuterImage: cdnApi(config.rightFlapOuterImage),
      envelopeSealImage: cdnApi(config.envelopeSealImage),
    };
  }, [config]);

  // 预加载信封所需的图片（不包括背景图）
  useEffect(() => {
    if (!hasValidConfig) {
      return;
    }

    // 当配置变化时，重置加载状态
    setImagesLoaded(false);

    const imagesToLoad: string[] = [];

    // 收集需要加载的图片
    if (processedImages.innerTexture) {
      imagesToLoad.push(processedImages.innerTexture);
    }
    if (processedImages.leftFlapOuterImage) {
      imagesToLoad.push(processedImages.leftFlapOuterImage);
    }
    if (processedImages.rightFlapOuterImage) {
      imagesToLoad.push(processedImages.rightFlapOuterImage);
    }
    if (processedImages.envelopeSealImage) {
      imagesToLoad.push(processedImages.envelopeSealImage);
    }

    // 如果没有需要加载的图片，直接设置为已加载
    if (imagesToLoad.length === 0) {
      setImagesLoaded(true);
      return;
    }

    // 预加载所有图片
    let loadedCount = 0;
    let errorCount = 0;
    let isCancelled = false;

    const checkAllLoaded = () => {
      // 如果组件已卸载或配置已变化，不再更新状态
      if (isCancelled) {
        return;
      }
      // 如果所有图片都加载完成（成功或失败），则显示信封
      if (loadedCount + errorCount >= imagesToLoad.length) {
        console.log('[EnvelopeClientAnimation] 所有图片加载完成');
        setImagesLoaded(true);
      }
    };

    imagesToLoad.forEach(imageUrl => {
      const img = new Image();
      img.onload = () => {
        if (!isCancelled) {
          loadedCount++;
          checkAllLoaded();
        }
      };
      img.onerror = () => {
        if (!isCancelled) {
          errorCount++;
          console.warn(`[EnvelopeClientAnimation] 图片加载失败: ${imageUrl}`);
          checkAllLoaded();
        }
      };
      img.src = imageUrl;
    });

    // 清理函数：当配置变化时，取消之前的加载
    return () => {
      isCancelled = true;
    };
  }, [
    hasValidConfig,
    processedImages.innerTexture,
    processedImages.leftFlapOuterImage,
    processedImages.rightFlapOuterImage,
    processedImages.envelopeSealImage,
  ]);

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
      console.log('animationPhase', animationPhase);
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

  const handlePlayTotal = () =>
    schedulePhaseAutoPlay(animationPhase, timing, value =>
      setAnimationPhase(value)
    );

  // 自动播放逻辑：在非调试模式下，每个阶段结束后自动进入下一个阶段
  useEffect(() => {
    if (
      isDebugMode ||
      animationPhase === AnimationPhase.Idle ||
      animationPhase === AnimationPhase.Complete
    ) {
      return;
    }
    const timer = schedulePhaseAutoPlay(animationPhase, timing, value =>
      setAnimationPhase(value)
    );
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [animationPhase, isDebugMode, timing]);

  // 动画完成回调
  useEffect(() => {
    if (animationPhase === AnimationPhase.Complete) {
      console.log('[EnvelopeClientAnimation] 动画完成');
      onComplete?.();
    }
  }, [animationPhase, onComplete]);

  // 控制内容容器的显示和邀请函预览
  useEffect(() => {
    let retryTimer: number | undefined;

    const cleanupTimer = () => {
      if (retryTimer) {
        window.clearTimeout(retryTimer);
        retryTimer = undefined;
      }
    };

    const tryAttach = () => {
      if (attachSourceContent()) {
        cleanupTimer();
        return;
      }

      cleanupTimer();
      retryTimer = window.setTimeout(() => {
        requestAnimationFrame(tryAttach);
      }, 200);
    };

    retryTimer = window.setTimeout(() => {
      requestAnimationFrame(tryAttach);
    }, 500);

    return () => {
      cleanupTimer();
    };
  }, []);

  // 内容展开阶段的撒花效果
  useEffect(() => {
    // 当阶段不是 ContentExpanding 时，重置触发标志（用于调试模式）
    if (animationPhase !== AnimationPhase.Opening) {
      confettiTriggeredRef.current = false;
      return;
    }

    const confettiSettings = normalizeConfettiSettings(config);
    if (!confettiSettings.enabled) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (!confettiTriggeredRef.current && confettiRef.current) {
        console.log('[EnvelopeClientAnimation] 开始播放撒花效果');
        confettiTriggeredRef.current = true;

        confettiRef.current.playWithContent({
          effect: confettiSettings.effect,
          shapeSource: confettiSettings.shapeSource,
          shape: confettiSettings.shape,
          emoji: confettiSettings.emoji,
          customShapePath: confettiSettings.customShapePath,
          colors: confettiSettings.colors,
          repeatCount: confettiSettings.repeatCount,
          durationMs: confettiSettings.durationSeconds * 1000,
          intervalMs: confettiSettings.intervalSeconds * 1000,
          scalar: confettiSettings.scalar,
        });
      }
    }, timing.RIGHT_FLAP_DURATION * 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [animationPhase, config, timing.RIGHT_FLAP_DURATION]);

  useEffect(() => {
    if (animationPhase === AnimationPhase.Complete) {
      return;
    }

    if (sourceContentRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      requestAnimationFrame(() => {
        attachSourceContent();
      });
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [animationPhase]);

  useLayoutEffect(() => {
    if (animationPhase !== AnimationPhase.Complete) {
      return;
    }

    restoreSourceContent();
  }, [animationPhase]);

  useEffect(() => {
    return () => {
      restoreSourceContent();
    };
  }, []);

  if (!hasValidConfig) {
    return null;
  }

  const isClickable = animationPhase !== AnimationPhase.Complete;
  const showEnvelope = animationPhase !== AnimationPhase.Complete;
  const isComplete = animationPhase === AnimationPhase.Complete;
  const leftFlapMask = processedImages.leftFlapOuterImage;
  const rightFlapMask = processedImages.rightFlapOuterImage;

  // 左右开口在 Opening 阶段开始打开
  const hasOpening = animationPhase >= AnimationPhase.Opening;
  const hasSealDisappeared = animationPhase >= AnimationPhase.SealDisappearing;

  // 内容展开铺满阶段
  const isContentExpanding = animationPhase >= AnimationPhase.ContentExpanding;

  const renderDebugControls = () => {
    if (!isDebugMode) return null;
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          left: 0,
          right: 0,
          justifyContent: 'center',
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
        <button
          type='button'
          onClick={handlePlayTotal}
          style={{
            padding: '8px 16px',
            borderRadius: 999,
            border: '1px solid #2563eb',
          }}
        >
          播放完整动画
        </button>
      </div>
    );
  };

  return (
    <>
      {/* 撒花组件 */}
      <ConfettiPlayer ref={confettiRef} />
      {/* 动画完成后整个容器退出画布 */}
      <AnimatePresence>
        {!isComplete && (
          <Container
            $clickable={isClickable}
            title='信封动画容器'
            onClick={handleStartAnimation}
            exit={{
              opacity: 0,
              transition: { duration: 0 },
            }}
            transition={{ duration: 0.5 }}
          >
            {/* 背景层 - 重复铺满，立即显示 */}
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

            {/* 信封内容 - 等待图片加载完成后淡入 */}
            <EnvelopeContentFadeIn
              initial={{ opacity: 0 }}
              animate={{
                opacity: imagesLoaded ? 1 : 0,
              }}
              transition={{
                duration: 0.6,
                ease: parseEasing('linear'),
              }}
            >
              <EnvelopeContentWrapper title='背景容器'>
                <EnvelopeWrapper
                  style={{
                    zIndex: 1,
                  }}
                >
                  <InvitationContentBg
                    title='邀请函内容背景层'
                    $texture={processedImages.innerTexture}
                    // $mask={ENVELOPE_MASKS.inner}
                  />
                  <GradientOverlay
                    direction='between2sides'
                    // $mask={ENVELOPE_MASKS.inner}
                  />
                </EnvelopeWrapper>
              </EnvelopeContentWrapper>

              <EnvelopeContentWrapper
                title='内容容器'
                style={{
                  zIndex:
                    animationPhase >= AnimationPhase.ContentExpanding ? 10 : 3,
                }}
              >
                <InvitationContentLayer
                  title='邀请函内容预览层'
                  initial={{ scale: scale - 0.2 }}
                  animate={{
                    scale: isContentExpanding ? 1 : scale - 0.2,
                  }}
                  transition={{
                    scale: {
                      duration: timing.CONTENT_EXPAND_DURATION,
                      ease: parseEasing('ease-in-out'),
                    },
                  }}
                >
                  <InvitationContentInner>
                    <div
                      id='envelope-invitation-preview'
                      className='inner'
                    ></div>
                  </InvitationContentInner>
                </InvitationContentLayer>
              </EnvelopeContentWrapper>

              <EnvelopeWrapper title='信封开口容器'>
                <RightFlapCard title='右侧翻转卡片'>
                  <RightFlapInner
                    title='右侧翻转内层'
                    initial={{ rotateY: 0 }}
                    animate={{ rotateY: hasOpening ? 150 : 0 }}
                    transition={{
                      rotateY: {
                        duration:
                          animationPhase === AnimationPhase.Opening
                            ? timing.RIGHT_FLAP_DURATION
                            : 0,
                        delay:
                          animationPhase === AnimationPhase.Opening
                            ? timing.FLAP_OPEN_START_DELAY +
                              timing.RIGHT_FLAP_DELAY
                            : 0,
                        ease: parseEasing('linear'),
                      },
                    }}
                    style={{
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    {/* 正面 - 右侧开口外侧 */}
                    <FlapSide
                      className='right'
                      $texture={processedImages.rightFlapOuterImage}
                      $mask={rightFlapMask}
                      $repeat='no-repeat'
                      $fit='contain'
                      title='右侧开口外侧'
                    />
                    {/* 正面渐变质感层 */}
                    {/* <GradientOverlay
                      className='right'
                      $mask={rightFlapMask}
                      title='右侧开口渐变质感层'
                    /> */}
                    {/* 背面 - 右侧开口内侧 */}
                    <FlapSide
                      className='right back'
                      $texture={processedImages.innerTexture + '/rotate,180'}
                      $mask={rightFlapMask}
                      title='右侧开口内侧'
                    />
                    {/* 正面渐变质感层 */}
                    <GradientOverlay
                      className='right back'
                      direction='left2right'
                      $mask={rightFlapMask}
                      title='右侧开口内侧质感'
                    />
                    <FlapShadow
                      $mask={rightFlapMask}
                      direction='right'
                      title='右侧开口阴影'
                    />
                  </RightFlapInner>
                </RightFlapCard>

                <LeftFlapCard title='左侧翻转卡片'>
                  <LeftFlapInner
                    data-timing={timing.LEFT_FLAP_DURATION}
                    title='左侧翻转内层'
                    initial={{ rotateY: 0 }}
                    animate={{
                      rotateY: hasOpening ? -150 : 0,
                    }}
                    transition={{
                      duration:
                        animationPhase === AnimationPhase.Opening
                          ? timing.LEFT_FLAP_DURATION
                          : 0,
                      delay:
                        animationPhase === AnimationPhase.Opening
                          ? timing.FLAP_OPEN_START_DELAY
                          : 0,
                      ease: parseEasing('linear'),
                    }}
                  >
                    {/* 正面 - 左侧开口外侧 */}
                    <FlapSide
                      className='left'
                      $texture={processedImages.leftFlapOuterImage}
                      $mask={leftFlapMask}
                      $repeat='no-repeat'
                      $fit='contain'
                      title='左侧开口外侧'
                    >
                      <GuestNameText
                        key='guest-name'
                        $fontSize={config?.guestNameFontSize}
                        $color={config?.guestNameColor}
                        initial={{ opacity: 0, left: '0' }}
                        animate={{ opacity: 1, left: '15vw' }}
                        exit={{
                          opacity: 0,
                          left: '0',
                          transition: {
                            duration: 0.4,
                            ease: [0.4, 0, 0.2, 1],
                          },
                        }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                      >
                        <p className='text-sm'>诚邀</p>
                        {rsvp_invitee && (
                          <p>{decodeURIComponent(rsvp_invitee || '')}</p>
                        )}
                      </GuestNameText>
                    </FlapSide>
                    {/* 正面渐变质感层 */}
                    {/* <GradientOverlay
                      className='left'
                      $mask={leftFlapMask}
                      title='左侧开口渐变质感层'
                    /> */}
                    {/* 背面 - 左侧开口内侧 */}
                    <FlapSide
                      className='left back'
                      $texture={processedImages.innerTexture + '/rotate,180'}
                      $mask={leftFlapMask}
                      title='左侧开口内侧'
                    />
                    {/* 正面渐变质感层 */}
                    <GradientOverlay
                      className='left back'
                      direction='right2left'
                      $mask={leftFlapMask}
                      title='左侧开口内侧质感'
                    />
                    <FlapShadow
                      $mask={leftFlapMask}
                      direction='left'
                      title='左侧开口阴影'
                    />
                  </LeftFlapInner>
                </LeftFlapCard>

                <SealImageContainer title='信封印章'>
                  <SealImage
                    initial={{ opacity: 1, scale: 1 }}
                    animate={{
                      opacity: hasSealDisappeared ? 0 : 1,
                      scale: hasSealDisappeared ? 0.6 : 1,
                    }}
                    transition={{
                      opacity: {
                        duration: hasSealDisappeared
                          ? timing.SEAL_DISAPPEAR_DURATION
                          : 0,
                        ease: easing,
                      },
                      scale: {
                        duration: hasSealDisappeared
                          ? timing.SEAL_DISAPPEAR_DURATION
                          : 0,
                        ease: easing,
                      },
                    }}
                    src={processedImages.envelopeSealImage}
                    alt='envelope-seal'
                  />
                </SealImageContainer>
              </EnvelopeWrapper>

              {/* 右侧：点击提示 - 相对于屏幕固定定位 */}
              <AnimatePresence mode='wait'>
                {animationPhase === AnimationPhase.Idle && imagesLoaded && (
                  <ClickHintText
                    key='click-hint'
                    exit={{
                      opacity: 0,
                      transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
                    }}
                  >
                    <ClickHintMotion />
                    {/* <ClickHintLabel
                      initial={{ opacity: 0.75 }}
                      animate={{ opacity: [0.6, 1, 0.6], scale: [1, 0.95, 1] }}
                      transition={{
                        duration: 2.4,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        times: [0, 0.5, 1],
                      }}
                    >
                      <MousePointerClick size={18} strokeWidth={1.5} />
                      点击开启
                    </ClickHintLabel> */}
                  </ClickHintText>
                )}
              </AnimatePresence>
            </EnvelopeContentFadeIn>
          </Container>
        )}
      </AnimatePresence>
      {renderDebugControls()}
    </>
  );
}

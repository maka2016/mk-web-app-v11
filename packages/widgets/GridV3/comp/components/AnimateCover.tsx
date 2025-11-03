import { CoverAnimationConfig } from '../../shared/types';
import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import styled from '@emotion/styled';

const AnimateCoverRoot = styled.div`
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
`;

export interface AnimateCoverRef {
  startAnimation: () => void;
  resetAnimation: () => void;
}

interface AnimateCoverProps {
  coverAnimation?: CoverAnimationConfig;
  children?: React.ReactNode;
  onPlay?: () => void;
  onComplete?: () => void;
  style?: React.CSSProperties;
}

const AnimateCover = forwardRef<AnimateCoverRef, AnimateCoverProps>(
  (props, ref) => {
    const [isAnimating, setIsAnimating] = useState(false);
    const [isAnimatingEnd, setIsAnimatingEnd] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout>(null);
    const animationTimeoutRef = useRef<NodeJS.Timeout>(null);

    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        if (animationTimeoutRef.current) {
          clearTimeout(animationTimeoutRef.current);
        }
      };
    }, []);

    // 重置动画的函数
    const resetAnimation = () => {
      // 清除所有定时器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }

      // 重置所有状态
      setIsAnimating(false);
      setIsAnimatingEnd(false);
      setHasStarted(false);
    };

    // 开始动画的函数
    const startAnimation = () => {
      if (!props.coverAnimation) {
        return;
      }

      // 如果已经播放过，不再重复播放
      if (hasStarted) {
        return;
      }

      const { duration = 1000, delay = 0 } = props.coverAnimation;

      setHasStarted(true);
      props.onPlay?.();

      // 延迟开始动画
      timeoutRef.current = setTimeout(() => {
        setIsAnimating(true);

        // 动画结束后保持最终状态
        animationTimeoutRef.current = setTimeout(() => {
          setIsAnimating(false);
          setIsAnimatingEnd(true);
          props.onComplete?.();
        }, duration);
      }, delay);
    };

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      startAnimation,
      resetAnimation,
    }));

    if (!props.coverAnimation || isAnimatingEnd) {
      return <>{props.children}</>;
    }

    const { coverAnimation } = props;
    const {
      coverUrl,
      type = 'page_flip',
      duration = 1000,
      delay = 0,
      easing = 'ease-in-out',
    } = coverAnimation;

    // 转换easing函数为motion格式
    const getEasing = (easing: string) => {
      switch (easing) {
        case 'ease-in-out':
          return 'ease-in-out';
        case 'ease-in':
          return 'ease-in';
        case 'ease-out':
          return 'ease-out';
        case 'linear':
          return 'linear';
        case 'cubic-bezier(0.68, -0.55, 0.265, 1.55)':
          return [0.68, -0.55, 0.265, 1.55];
        default:
          return 'ease-in-out';
      }
    };

    // 渲染页面翻转动画
    const renderPageFlipAnimation = () => (
      <div className='absolute inset-0 w-full h-full z-10'>
        {/* 左边的图 - 从中间开始，往左移动退出画布 */}
        <motion.div
          className='absolute left-0 top-0 h-full origin-right z-10'
          initial={{ x: '0%' }}
          animate={isAnimating ? { x: '-100%' } : { x: '0%' }}
          transition={{
            duration: duration / 1000,
            easing: getEasing(easing),
          }}
          style={{
            width: '100%',
          }}
          onAnimationComplete={() => {
            if (isAnimating) {
              setIsAnimatingEnd(true);
            }
          }}
        >
          {coverUrl[0] ? (
            <img
              src={coverUrl[0]}
              alt='信封左半部分'
              className='w-full h-full object-cover object-left-top'
            />
          ) : (
            <div className='w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center'>
              <div className='text-center text-blue-600'>
                <div className='text-4xl mb-2'>📮</div>
                <div className='text-sm'>左半部分</div>
              </div>
            </div>
          )}
        </motion.div>

        {/* 右边的图 - 从中间开始，向右旋转退出画布，z-index更高 */}
        <motion.div
          className='absolute left-0 top-0 h-full origin-left z-20'
          initial={{ x: 0, rotateY: 0 }}
          animate={
            isAnimating ? { x: '100%', rotateY: 90 } : { x: 0, rotateY: 0 }
          }
          transition={{
            duration: duration / 1000,
            easing: getEasing(easing),
          }}
          style={{
            transformStyle: 'preserve-3d',
            width: '100%',
          }}
        >
          {coverUrl[1] ? (
            <img
              src={coverUrl[1]}
              alt='信封右半部分'
              className='w-full h-full object-cover object-right-top'
            />
          ) : (
            <div className='w-full h-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center'>
              <div className='text-center text-green-600'>
                <div className='text-4xl mb-2'>✉️</div>
                <div className='text-sm'>右半部分</div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );

    // 渲染上下分割动画
    const renderVerticalSplitAnimation = () => (
      <div className='absolute inset-0 w-full h-full z-10'>
        {/* 上半部分 - 从中间开始，向上移动退出画布 */}
        <motion.div
          className='absolute left-0 top-0 w-full origin-bottom z-10'
          initial={{ y: '0%' }}
          animate={isAnimating ? { y: '-100%' } : { y: '0%' }}
          transition={{
            duration: duration / 1000,
            easing: getEasing(easing),
          }}
          style={{
            height: '100%',
          }}
          onAnimationComplete={() => {
            if (isAnimating) {
              setIsAnimatingEnd(true);
            }
          }}
        >
          {coverUrl[0] ? (
            <img
              src={coverUrl[0]}
              alt='上半部分'
              className='w-full h-full object-cover object-top z-20'
            />
          ) : (
            <div className='w-full h-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center'>
              <div className='text-center text-purple-600'>
                <div className='text-4xl mb-2'>☁️</div>
                <div className='text-sm'>上半部分</div>
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          className='absolute left-0 top-0 w-full origin-top'
          initial={{ y: 0, rotateX: 0 }}
          animate={
            isAnimating ? { y: '100%', rotateX: 90 } : { y: 0, rotateX: 0 }
          }
          transition={{
            duration: duration / 1000,
            easing: getEasing(easing),
          }}
          style={{
            transformStyle: 'preserve-3d',
            height: '100%',
          }}
        >
          {coverUrl[1] ? (
            <img
              src={coverUrl[1]}
              alt='下半部分'
              className='w-full h-full object-cover object-bottom'
            />
          ) : (
            <div className='w-full h-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center'>
              <div className='text-center text-orange-600'>
                <div className='text-4xl mb-2'>🌊</div>
                <div className='text-sm'>下半部分</div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );

    return (
      <AnimateCoverRoot
        className='relative z-10 AnimateCoverRoot'
        style={props.style}
      >
        {/* 根据动画类型渲染不同的动画效果 */}
        {type === 'page_flip' && renderPageFlipAnimation()}
        {type === 'vertical_split' && renderVerticalSplitAnimation()}

        {props.children}
      </AnimateCoverRoot>
    );
  }
);

AnimateCover.displayName = 'AnimateCover';

export default AnimateCover;

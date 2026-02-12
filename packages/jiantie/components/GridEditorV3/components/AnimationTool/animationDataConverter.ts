/**
 * 动画数据格式转换工具
 * 用于在编辑器加载时将 anime.js 格式的动画数据转换为 GSAP 格式
 */
import type { AnimateQueue2, AnimationState } from '@/components/GridEditorV3/works-store/types/animate2';
import { convertAnimationStateToGsap, isGsapFormat } from '../AnimationTool/gsapHelpers';

/**
 * 转换单个 AnimationState 为 GSAP 格式
 */
function convertAnimationState(state: AnimationState): AnimationState {
  // 如果已经是 GSAP 格式，直接返回
  if (isGsapFormat(state.parameters)) {
    return state;
  }

  // 转换为 GSAP 格式
  return convertAnimationStateToGsap(state);
}

/**
 * 转换 AnimateQueue2 为 GSAP 格式
 */
export function convertAnimateQueueToGsap(queue: AnimateQueue2 | undefined): AnimateQueue2 | undefined {
  if (!queue) return queue;

  const result: AnimateQueue2 = {};

  // 转换 entrance
  if (queue.entrance && queue.entrance.length > 0) {
    result.entrance = queue.entrance.map(convertAnimationState);
  }

  // 转换 emphasis
  if (queue.emphasis && queue.emphasis.length > 0) {
    result.emphasis = queue.emphasis.map(convertAnimationState);
  }

  // 转换 exit
  if (queue.exit && queue.exit.length > 0) {
    result.exit = queue.exit.map(convertAnimationState);
  }

  return result;
}

/**
 * 检查 AnimateQueue2 是否已经是 GSAP 格式
 */
export function isAnimateQueueGsapFormat(queue: AnimateQueue2 | undefined): boolean {
  if (!queue) return true; // 空队列视为已转换

  const checkStates = (states: AnimationState[] | undefined): boolean => {
    if (!states || states.length === 0) return true;
    return states.every(state => isGsapFormat(state.parameters));
  };

  return (
    checkStates(queue.entrance) &&
    checkStates(queue.emphasis) &&
    checkStates(queue.exit)
  );
}

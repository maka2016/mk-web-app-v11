/**
 * GSAP 工具函数：anime.js 参数转换与 GSAP 辅助
 */
import type { AnimationState } from '@/components/GridEditorV3/works-store/types/animate2';

/**
 * 动画可能修改的属性列表，用于清理时只清理这些属性，保留元素原有样式
 * 包含所有 GSAP/transform 相关属性
 */
export const ANIMATION_CLEAR_PROPS = 'x,y,scale,scaleX,scaleY,rotate,rotateX,rotateY,rotateZ,skewX,skewY,opacity,filter,transform,clipPath,-webkit-mask-image,webkitMaskImage,maskImage,-webkit-mask-size,webkitMaskSize,maskSize,-webkit-mask-position,webkitMaskPosition,maskPosition,-webkit-mask-repeat,webkitMaskRepeat,maskRepeat';

// 缓动函数映射表：anime.js / 简写 -> GSAP（GSAP 需要 powerN.out 等完整格式，单独 "out" 会报 _ease is not a function）
const EASE_MAP: Record<string, string> = {
  linear: 'none',
  inOut: 'power2.inOut',
  out: 'power2.out', // 日志证实数据中存在 ease:"out"，必须映射为合法 GSAP 格式
  in: 'power2.in',
  outQuad: 'power2.out',
  inQuad: 'power2.in',
  inOutQuad: 'power2.inOut',
  outBack: 'back.out',
  inBack: 'back.in',
  outElastic: 'elastic.out',
  inElastic: 'elastic.in',
  inOutElastic: 'elastic.inOut',
  outBounce: 'bounce.out',
  inBounce: 'bounce.in',
  inOutBounce: 'bounce.inOut',
  inOutBack: 'back.inOut',
};

/**
 * 转换时间单位（ms -> s）
 */
export function msToSeconds(ms: number | undefined): number {
  if (ms === undefined || ms === null) return 0;
  return ms / 1000;
}

/**
 * 转换缓动函数名称
 * 仅接受字符串，否则返回默认值，避免 GSAP 收到非字符串导致 _ease is not a function
 */
function convertEase(ease: string | undefined): string {
  if (ease == null || typeof ease !== 'string' || ease === '') {
    return 'power2.out'; // GSAP 默认
  }
  const mapped = EASE_MAP[ease];
  // 若未映射且非 GSAP 格式（如 "power2.out" 含点），则用默认值，避免 GSAP 解析失败导致 _ease is not a function
  return mapped ?? (ease.includes('.') ? ease : 'power2.out');
}

/**
 * 检测参数值是否为数组（from/to 格式）
 */
function isFromToArray(value: unknown): value is [unknown, unknown] | unknown[] {
  return Array.isArray(value) && value.length >= 2;
}

/**
 * 解析数组格式的属性值（anime.js 支持 [from, to] 或复杂关键帧数组）
 */
function parseArrayValue(value: unknown[]): {
  from: unknown;
  to: unknown;
  keyframes?: unknown[];
  isKeyframes: boolean;
} {
  if (value.length === 2) {
    // 简单的 [from, to] 格式
    return { from: value[0], to: value[1], isKeyframes: false };
  }
  
  // 多个关键帧：anime.js 支持 [v1, v2, v3, v4]
  // GSAP 使用 keyframes 数组格式
  return {
    from: value[0],
    to: value[value.length - 1],
    keyframes: value.slice(1), // 去掉第一个值（from 已设置），其余作为 keyframes
    isKeyframes: true
  };
}

/**
 * 处理对象格式的属性值（anime.js 支持 { from: x, to: y, duration: z }）
 */
function parseObjectValue(value: Record<string, unknown>): {
  from: unknown;
  to: unknown;
} {
  if ('from' in value && 'to' in value) {
    return { from: value.from, to: value.to };
  }
  if ('to' in value) {
    return { from: undefined, to: value.to };
  }
  // 如果只有其他属性，返回 undefined
  return { from: undefined, to: undefined };
}

/**
 * 转换 anime.js 参数为 GSAP fromTo 格式
 * 
 * anime.js 支持多种参数格式：
 * 1. 简单值：opacity: 1
 * 2. 数组：opacity: [0, 1] 或 y: ['-100%', '0%', '100%']
 * 3. 对象：opacity: { from: 0, to: 1, duration: 500 }
 * 4. 函数：opacity: (el, i) => i * 10
 * 
 * GSAP 使用 fromTo 格式：
 * gsap.fromTo(target, { opacity: 0 }, { opacity: 1, duration: 0.5 })
 */
export function convertAnimeParamsToGsap(params: Record<string, unknown>): {
  from: Record<string, unknown>;
  to: Record<string, unknown>;
} {
  const from: Record<string, unknown> = {};
  const to: Record<string, unknown> = {};
  const keyframesProps: Record<string, unknown[]> = {}; // 收集需要使用 keyframes 的属性

  // 保留的 GSAP 配置属性（不需要转换）
  const configKeys = new Set([
    'duration',
    'delay',
    'ease',
    'loop',
    'repeat',
    'yoyo',
    'amplitude', // 摇曳动画幅度，仅用于 UI，实际动画用 parameters.rotate
    'onComplete',
    'onStart',
    'onUpdate',
    'onPause',
    'onRepeat',
    'stagger',
  ]);

  Object.keys(params).forEach(key => {
    const value = params[key];

    // 跳过函数类型（GSAP 回调保持不变）
    if (typeof value === 'function') {
      to[key] = value;
      return;
    }

    // 处理配置属性
    if (configKeys.has(key)) {
      if (key === 'duration') {
        to.duration = msToSeconds(value as number);
      } else if (key === 'delay') {
        to.delay = msToSeconds(value as number);
      } else if (key === 'ease') {
        to.ease = convertEase(value as string);
      } else if (key === 'loop') {
        // anime.js: loop: true 或 loop: 3
        // GSAP: repeat: -1 或 repeat: 2（表示播放 3 次）
        if (value === true) {
          to.repeat = -1;
        } else if (typeof value === 'number' && value > 0) {
          to.repeat = value - 1; // GSAP repeat 表示额外次数
        }
      } else if (key !== 'amplitude') {
        // 其他配置直接传递（amplitude 仅用于 UI，不传给 GSAP）
        to[key] = value;
      }
      return;
    }

    // 处理动画属性
    if (isFromToArray(value)) {
      // 数组格式：[from, to] 或 [v1, v2, v3, ...]
      const parsed = parseArrayValue(value as unknown[]);
      if (parsed.from !== undefined) {
        from[key] = parsed.from;
      }
      
      // 如果是多关键帧，使用 GSAP keyframes
      if (parsed.isKeyframes && parsed.keyframes) {
        keyframesProps[key] = parsed.keyframes;
      } else {
        to[key] = parsed.to;
      }
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      // 对象格式：{ from: x, to: y, duration: z }
      const parsed = parseObjectValue(value as Record<string, unknown>);
      if (parsed.from !== undefined) {
        from[key] = parsed.from;
      }
      if (parsed.to !== undefined) {
        to[key] = parsed.to;
      }

      // 处理对象中的其他配置（如 duration）
      const objValue = value as Record<string, unknown>;
      if (objValue.duration) {
        to.duration = msToSeconds(objValue.duration as number);
      }
    } else {
      // 简单值：直接作为 to 值
      to[key] = value;
    }
  });

  // 如果有 keyframes 属性，转换为 GSAP keyframes 格式
  if (Object.keys(keyframesProps).length > 0) {
    // GSAP keyframes 格式：keyframes: [{ y: '0%' }, { y: '100%' }, { y: '0%' }]
    const keyframesArray = [];
    const maxLength = Math.max(...Object.values(keyframesProps).map(arr => arr.length));
    
    for (let i = 0; i < maxLength; i++) {
      const keyframe: Record<string, unknown> = {};
      Object.keys(keyframesProps).forEach(key => {
        const values = keyframesProps[key];
        if (i < values.length) {
          keyframe[key] = values[i];
        }
      });
      if (Object.keys(keyframe).length > 0) {
        keyframesArray.push(keyframe);
      }
    }
    
    if (keyframesArray.length > 0) {
      to.keyframes = keyframesArray;
    }
  }

  // 如果没有 duration，设置默认值
  if (!to.duration) {
    to.duration = 0.5; // GSAP 默认 500ms
  }

  // 如果没有 ease，设置默认值
  if (!to.ease) {
    to.ease = 'power2.out';
  }

  return { from, to };
}

/**
 * 转换 AnimationState 为 GSAP 格式
 * 用于在编辑器打开时转换数据
 */
export function convertAnimationStateToGsap(state: AnimationState): AnimationState {
  // 如果已经是 GSAP 格式，直接返回
  if (state.parameters._gsapFormat) {
    return state;
  }

  const { from, to } = convertAnimeParamsToGsap(state.parameters);

  return {
    ...state,
    parameters: {
      ...from,
      ...to,
      _gsapFormat: true, // 标记为已转换
    },
  };
}

/**
 * 检测是否为 GSAP 格式
 */
export function isGsapFormat(params: Record<string, unknown>): boolean {
  return params._gsapFormat === true;
}

/**
 * 转换 stagger 值（anime.js 使用 ms，GSAP 使用 s）
 */
export function convertStagger(
  staggerMs: number | undefined
): number | { each: number } | undefined {
  if (staggerMs === undefined) return undefined;
  const seconds = msToSeconds(staggerMs);
  return seconds;
}

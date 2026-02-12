/** 场景分组：用于场景式批量赋值 */
export type AnimationScene = 'basic' | 'wedding' | 'business' | 'conversion' | 'physics';

/** 动画方向 */
export type Direction = 'up' | 'down' | 'left' | 'right';

/** 缓动选项配置 */
export const easingOptions = [
  { value: 'linear', label: '线性' },
  { value: 'outQuad', label: '缓出' },
  { value: 'inOutQuad', label: '缓入缓出' },
  { value: 'outBack', label: '回弹' },
  { value: 'outElastic', label: '弹性' },
] as const;

/** 动画幅度配置（用于设置面板） */
export interface AnimationAmplitudeConfig {
  min: number;
  max: number;
  step: number;
  unit: string;
  /** 提示：幅度影响哪个变化属性 */
  hint?: string;
}

/** @deprecated 使用 AnimationAmplitudeConfig 代替 */
export type EmphasisAmplitudeConfig = AnimationAmplitudeConfig;

/** 动画预设项，支持方向性和支点配置 */
export interface AnimationPresetItem {
  id?: string;
  name: string;
  scene?: AnimationScene;
  parameters: Record<string, unknown>;
  delay?: number;
  type?: string;
  /** 是否支持方向配置 */
  directional?: boolean;
  /** 方向参数映射（当 directional 为 true 时使用） */
  directionParams?: Record<Direction, Record<string, unknown>>;
  /** 是否支持变换支点配置 */
  supportTransformOrigin?: boolean;
  /** 强调动画幅度配置（仅 emphasis 使用） */
  amplitudeConfig?: EmphasisAmplitudeConfig;
}

/** 反转数组值（用于生成退场动画） */
function reverseArrayOrValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    // 对于数组，反转元素顺序
    return [...value].reverse();
  }
  return value;
}

/** 反转旋转值 */
function reverseRotation(value: unknown): unknown {
  if (typeof value === 'string') {
    // 处理如 '90deg' 或 '1turn' 这样的字符串
    if (value.includes('deg')) {
      const match = value.match(/(-?\d+(?:\.\d+)?)deg/);
      if (match) {
        const num = parseFloat(match[1]);
        return `${-num}deg`;
      }
    }
    if (value === '1turn') return '-1turn';
    if (value === '-1turn') return '1turn';
  }
  if (Array.isArray(value)) {
    return value.map(v => reverseRotation(v));
  }
  return value;
}

/** 生成退场动画参数（进场动画的反向） */
export function reverseAnimationParameters(params: Record<string, any>): Record<string, any> {
  const reversed: Record<string, any> = { ...params };

  // 反转位移
  if (params.x !== undefined) {
    reversed.x = reverseArrayOrValue(params.x);
  }
  if (params.y !== undefined) {
    reversed.y = reverseArrayOrValue(params.y);
  }

  // 反转透明度
  if (params.opacity !== undefined) {
    reversed.opacity = reverseArrayOrValue(params.opacity);
  }

  // 反转缩放
  if (params.scale !== undefined) {
    reversed.scale = reverseArrayOrValue(params.scale);
  }
  if (params.scaleX !== undefined) {
    reversed.scaleX = reverseArrayOrValue(params.scaleX);
  }
  if (params.scaleY !== undefined) {
    reversed.scaleY = reverseArrayOrValue(params.scaleY);
  }

  // 反转旋转
  if (params.rotate !== undefined) {
    reversed.rotate = reverseRotation(params.rotate);
  }
  if (params.rotateX !== undefined) {
    reversed.rotateX = reverseRotation(params.rotateX);
  }
  if (params.rotateY !== undefined) {
    reversed.rotateY = reverseRotation(params.rotateY);
  }
  if (params.rotateZ !== undefined) {
    reversed.rotateZ = reverseRotation(params.rotateZ);
  }

  // 反转滤镜（如模糊）
  if (params.filter !== undefined) {
    reversed.filter = reverseArrayOrValue(params.filter);
  }

  // 反转 mask-image
  if (params['-webkit-mask-image'] !== undefined) {
    reversed['-webkit-mask-image'] = reverseArrayOrValue(params['-webkit-mask-image']);
  }

  // 反转 clipPath
  if (params.clipPath !== undefined) {
    reversed.clipPath = reverseArrayOrValue(params.clipPath);
  }

  return reversed;
}

/** 变换支点映射 */
export const transformOriginMap: Record<string, string> = {
  'top-left': 'left top',
  'top-center': 'center top',
  'top-right': 'right top',
  'center-left': 'left center',
  'center-center': 'center center',
  'center-right': 'right center',
  'bottom-left': 'left bottom',
  'bottom-center': 'center bottom',
  'bottom-right': 'right bottom',
};


export const animation2Data = {
  text: {
    entrance: [
      {
        id: 'text-entrance-print',
        name: '印刷',
        parameters: {
          opacity: { from: 0, to: 1, duration: 100 },
        },
        delay: 100,
        type: 'text',
      },
      {
        id: 'text-entrance-rise',
        name: '上升',
        parameters: {
          y: ['100%', '0%'],
          opacity: [0, 1],
          ease: 'inOut',
        },
        delay: 100,
        type: 'text',
      },
      {
        id: 'text-entrance-shift',
        name: '移位',
        parameters: {
          y: ['-100%', '0%'],
          opacity: [0, 1],

          ease: 'inBack',
        },
        delay: 100,
        type: 'text',
      },
      {
        id: 'text-entrance-burst',
        name: '爆裂',
        parameters: {
          scale: [1, 1.25, 1],
          opacity: [0, 0.5, 1],
        },
        delay: 100,
        type: 'text',
      },
      {
        id: 'text-entrance-bounce',
        name: '弹跳',
        parameters: {
          y: ['0%', '-30%', '-15%', '0%', '-4%', '0%'],
          scaleY: [1, 1.1, 1.05, 0.95, 1.02, 1],
          opacity: [0, 1],
          ease: 'inOut',
        },
        delay: 100,
        type: 'text',
      },
      {
        id: 'text-entrance-flip',
        name: '翻转',
        parameters: {
          y: [
            { to: '-100%', duration: 100 },
            { to: '0%', duration: 100 },
            { to: '100%', duration: 50 },
            { to: '0%', duration: 100 },
          ],
          opacity: [0, 1],
          ease: 'outQuad',
        },
        delay: 100,
        type: 'text',
      },
      {
        id: 'text-entrance-slide',
        name: '滑动',
        parameters: {
          x: ['100%', '0%'],
          y: ['-50%', '0'],
          rotate: ['-45deg', '0deg'],
          opacity: [0, 1],
        },
        delay: 50,
        type: 'text',
      },
    ],
    emphasis: [],
    exit: [
      {
        id: 'text-exit-print',
        name: '印刷',
        parameters: {
          opacity: [1, 0],
          duration: 1,
        },
        delay: 100,
        type: 'text',
      },
      {
        id: 'text-exit-rise',
        name: '上升',
        parameters: {
          y: ['0%', '-150%'],
          opacity: [1, 0],
          ease: 'inOut',
        },
        delay: 100,
        type: 'text',
      },
      {
        id: 'text-exit-shift',
        name: '移位',
        parameters: {
          y: ['0', '100%'],
          opacity: [1, 0],
          ease: 'inBack',
        },
        delay: 100,
        type: 'text',
      },
      {
        id: 'text-exit-burst',
        name: '爆裂',
        parameters: {
          scale: [1, 1.25, 1],
          opacity: [1, 0.5, 0],
        },
        delay: 100,
        type: 'text',
      },
      {
        id: 'text-exit-bounce',
        name: '弹跳',
        parameters: {
          y: ['0%', '-30%', '-15%', '0%', '-4%', '0%'],
          scaleY: [1, 1.1, 1.05, 0.95, 1.02, 1],
          opacity: [1, 0],
          ease: 'inOut',
        },
        delay: 100,
        type: 'text',
      },
      {
        id: 'text-exit-flip',
        name: '翻转',
        parameters: {
          y: [
            { to: '-100%', duration: 100 },
            { to: '0%', duration: 100 },
            { to: '100%', duration: 50 },
            { to: '0%', duration: 100 },
          ],
          opacity: [1, 0.2, 0, 0],
        },
        delay: 100,
        type: 'text',
      },
    ],
  },
  common: {
    entrance: [
      {
        id: 'common-entrance-slide',
        name: '位移',
        scene: 'basic' as AnimationScene,
        directional: true,
        amplitudeConfig: { min: 10, max: 200, step: 10, unit: '%', hint: '位移距离' },
        directionParams: {
          up: {
            opacity: [0, 1],
            y: ['100%', '0%'],
            duration: 500,
            ease: 'outQuad',
            amplitude: 100,
          },
          down: {
            opacity: [0, 1],
            y: ['-100%', '0%'],
            duration: 500,
            ease: 'outQuad',
            amplitude: 100,
          },
          left: {
            opacity: [0, 1],
            x: ['100%', '0%'],
            duration: 500,
            ease: 'outQuad',
            amplitude: 100,
          },
          right: {
            opacity: [0, 1],
            x: ['-100%', '0%'],
            duration: 500,
            ease: 'outQuad',
            amplitude: 100,
          },
        },
        parameters: {
          opacity: [0, 1],
          y: ['100%', '0%'],
          duration: 500,
          ease: 'outQuad',
          amplitude: 100,
        },
      },
      {
        id: 'common-entrance-fade',
        name: '淡入',
        scene: 'basic' as AnimationScene,
        parameters: {
          opacity: [0, 1],
          duration: 800,
          ease: 'outQuad',
        },
      },
      {
        id: 'common-entrance-pop',
        name: '弹出',
        scene: 'basic' as AnimationScene,
        supportTransformOrigin: true,
        amplitudeConfig: { min: 5, max: 50, step: 5, unit: '%', hint: '弹出缩放强度' },
        parameters: {
          opacity: [0, 1],
          scale: [0, 1.1, 0.9, 1],
          ease: 'outBack',
          duration: 600,
          amplitude: 10,
        },
      },
      {
        id: 'common-entrance-wipe',
        name: '擦除',
        scene: 'basic' as AnimationScene,
        directional: true,
        directionParams: {
          left: {
            opacity: [0, 1],
            '-webkit-mask-image': [
              'linear-gradient(to right, black 0%, transparent 0%)',
              'linear-gradient(to right, black 100%, transparent 100%)',
            ],
            duration: 1000,
            ease: 'outQuad',
          },
          right: {
            opacity: [0, 1],
            '-webkit-mask-image': [
              'linear-gradient(to left, black 0%, transparent 0%)',
              'linear-gradient(to left, black 100%, transparent 100%)',
            ],
            duration: 1000,
            ease: 'outQuad',
          },
          up: {
            opacity: [0, 1],
            '-webkit-mask-image': [
              'linear-gradient(to bottom, black 0%, transparent 0%)',
              'linear-gradient(to bottom, black 100%, transparent 100%)',
            ],
            duration: 1000,
            ease: 'outQuad',
          },
          down: {
            opacity: [0, 1],
            '-webkit-mask-image': [
              'linear-gradient(to top, black 0%, transparent 0%)',
              'linear-gradient(to top, black 100%, transparent 100%)',
            ],
            duration: 1000,
            ease: 'outQuad',
          },
        },
        parameters: {
          opacity: [0, 1],
          '-webkit-mask-image': [
            'linear-gradient(to right, black 0%, transparent 0%)',
            'linear-gradient(to right, black 100%, transparent 100%)',
          ],
          duration: 1000,
          ease: 'outQuad',
        },
      },
      {
        id: 'common-entrance-blur',
        name: '模糊',
        scene: 'wedding' as AnimationScene,
        amplitudeConfig: { min: 4, max: 30, step: 2, unit: 'px', hint: '模糊程度' },
        parameters: {
          opacity: [0, 1],
          filter: ['blur(12px)', 'blur(0px)'],
          ease: 'outQuad',
          duration: 1200,
          amplitude: 12,
        },
      },
      {
        name: '弹入',
        id: 'common-entrance-pop-slide',
        scene: 'basic' as AnimationScene,
        directional: true,
        amplitudeConfig: { min: 10, max: 150, step: 10, unit: '%', hint: '位移距离' },
        directionParams: {
          up: {
            opacity: [0, 1],
            y: ['90%', '0%'],
            duration: 500,
            '-webkit-mask-image': [
              'linear-gradient(black 0%, transparent 0%)',
              'linear-gradient(black 100%, transparent 100%)',
            ],
            ease: 'outBack',
            amplitude: 90,
          },
          down: {
            opacity: [0, 1],
            y: ['-90%', '0%'],
            duration: 500,
            '-webkit-mask-image': [
              'linear-gradient(black 0%, transparent 0%)',
              'linear-gradient(black 100%, transparent 100%)',
            ],
            ease: 'outBack',
            amplitude: 90,
          },
          left: {
            opacity: [0, 1],
            x: ['90%', '0%'],
            duration: 500,
            '-webkit-mask-image': [
              'linear-gradient(to right, black 0%, transparent 0%)',
              'linear-gradient(to right, black 100%, transparent 100%)',
            ],
            ease: 'outBack',
            amplitude: 90,
          },
          right: {
            opacity: [0, 1],
            x: ['-90%', '0%'],
            duration: 500,
            '-webkit-mask-image': [
              'linear-gradient(to left, black 0%, transparent 0%)',
              'linear-gradient(to left, black 100%, transparent 100%)',
            ],
            ease: 'outBack',
            amplitude: 90,
          },
        },
        parameters: {
          opacity: [0, 1],
          y: ['90%', '0%'],
          duration: 500,
          '-webkit-mask-image': [
            'linear-gradient(black 0%, transparent 0%)',
            'linear-gradient(black 100%, transparent 100%)',
          ],
          ease: 'outBack',
          amplitude: 90,
        },
      },
      {
        id: 'common-entrance-roll',
        name: '滚入',
        scene: 'physics' as AnimationScene,
        directional: true,
        supportTransformOrigin: true,
        amplitudeConfig: { min: 15, max: 180, step: 15, unit: '度', hint: '旋转角度' },
        directionParams: {
          left: {
            opacity: [0, 1],
            x: ['200%', '0%'],
            rotate: ['90deg', '0deg'],
            duration: 800,
            ease: 'outQuad',
            amplitude: 90,
          },
          right: {
            opacity: [0, 1],
            x: ['-200%', '0%'],
            rotate: ['-90deg', '0deg'],
            duration: 800,
            ease: 'outQuad',
            amplitude: 90,
          },
          up: {
            opacity: [0, 1],
            y: ['200%', '0%'],
            rotate: ['90deg', '0deg'],
            duration: 800,
            ease: 'outQuad',
            amplitude: 90,
          },
          down: {
            opacity: [0, 1],
            y: ['-200%', '0%'],
            rotate: ['-90deg', '0deg'],
            duration: 800,
            ease: 'outQuad',
            amplitude: 90,
          },
        },
        parameters: {
          opacity: [0, 1],
          x: ['200%', '0%'],
          rotate: ['90deg', '0deg'],
          duration: 800,
          ease: 'outQuad',
          amplitude: 90,
        },
      },
      {
        id: 'common-entrance-scale',
        name: '缩放',
        scene: 'basic' as AnimationScene,
        supportTransformOrigin: true,
        // 缩放动画使用 scaleFrom/scaleTo 参数，不使用通用 amplitudeConfig
        parameters: {
          opacity: [0, 1],
          scale: [0, 1],
          duration: 600,
          ease: 'outQuad',
          scaleFrom: 0,
          scaleTo: 100,
        },
      },
      {
        id: 'common-entrance-3d-flip',
        name: '3D翻转落下',
        scene: 'wedding' as AnimationScene,
        supportTransformOrigin: true,
        amplitudeConfig: { min: 15, max: 180, step: 15, unit: '度', hint: '翻转角度' },
        parameters: {
          opacity: [0, 1],
          rotateX: ['-90deg', '0deg'],
          y: ['-30%', '0%'],
          duration: 800,
          ease: 'outBack',
          amplitude: 90,
        },
      },
      {
        id: 'common-entrance-bounce-in',
        name: '弹跳掉落',
        scene: 'physics' as AnimationScene,
        amplitudeConfig: { min: 20, max: 150, step: 10, unit: '%', hint: '弹跳高度' },
        parameters: {
          opacity: [0, 1],
          y: ['-80%', '10%', '-15%', '5%', '0%'],
          scale: [0.8, 1.1, 0.95, 1.02, 1],
          duration: 1000,
          ease: 'outQuad',
          amplitude: 80,
        },
      },
      {
        id: 'common-entrance-rise',
        name: '上升',
        scene: 'basic' as AnimationScene,
        amplitudeConfig: { min: 10, max: 200, step: 10, unit: '%', hint: '位移距离' },
        parameters: {
          opacity: [0, 1],
          y: ['100%', '0%'],
          duration: 500,
          ease: 'outQuad',
          amplitude: 100,
        },
      },
      {
        id: 'common-entrance-rise-linear',
        name: '上升（线性）',
        scene: 'basic' as AnimationScene,
        amplitudeConfig: { min: 10, max: 200, step: 10, unit: '%', hint: '位移距离' },
        parameters: {
          opacity: [0, 1],
          y: ['100%', '0%'],
          duration: 500,
          ease: 'linear',
          amplitude: 100,
        },
      },
      {
        id: 'common-entrance-slide-left',
        name: '左平移',
        scene: 'basic' as AnimationScene,
        amplitudeConfig: { min: 10, max: 200, step: 10, unit: '%', hint: '位移距离' },
        parameters: {
          opacity: [0, 1],
          x: ['100%', '0%'],
          duration: 500,
          ease: 'outQuad',
          amplitude: 100,
        },
      },
      {
        id: 'common-entrance-slide-right',
        name: '右平移',
        scene: 'basic' as AnimationScene,
        amplitudeConfig: { min: 10, max: 200, step: 10, unit: '%', hint: '位移距离' },
        parameters: {
          opacity: [0, 1],
          x: ['-100%', '0%'],
          duration: 500,
          ease: 'outQuad',
          amplitude: 100,
        },
      },
      {
        id: 'common-entrance-pop-bottom',
        name: '底部弹出',
        scene: 'basic' as AnimationScene,
        amplitudeConfig: { min: 10, max: 150, step: 10, unit: '%', hint: '位移距离' },
        parameters: {
          opacity: [0, 1],
          y: ['90%', '0%'],
          duration: 500,
          '-webkit-mask-image': [
            'linear-gradient(black 0%, transparent 0%)',
            'linear-gradient(black 100%, transparent 100%)',
          ],
          ease: 'outBack',
          amplitude: 90,
        },
      },
      {
        id: 'common-entrance-fall',
        name: '落下',
        scene: 'basic' as AnimationScene,
        amplitudeConfig: { min: 10, max: 200, step: 10, unit: '%', hint: '位移距离' },
        parameters: {
          opacity: [0, 1],
          y: ['-100%', '0%'],
          duration: 500,
          ease: 'outQuad',
          amplitude: 100,
        },
      },
      {
        id: 'common-entrance-brush-zigzag',
        name: '笔刷(Z形)',
        scene: 'basic' as AnimationScene,
        // 特殊标记：使用 DrawSVGPlugin 笔刷动画
        type: 'brush',
        parameters: {
          brushPathType: 'zigzag',
          strokeWidth: 20, // 配合密集路径，确保完全覆盖
          duration: 1200,
          ease: 'outQuad',
        },
      },
      {
        id: 'common-entrance-brush-horizontal',
        name: '笔刷(横向)',
        scene: 'basic' as AnimationScene,
        type: 'brush',
        parameters: {
          brushPathType: 'horizontal',
          strokeWidth: 15, // 配合密集横线，确保完全覆盖
          duration: 1000,
          ease: 'outQuad',
        },
      },
      {
        id: 'common-entrance-brush-spiral',
        name: '笔刷(螺旋)',
        scene: 'basic' as AnimationScene,
        type: 'brush',
        parameters: {
          brushPathType: 'spiral',
          strokeWidth: 15, // 配合密集螺旋，确保完全覆盖
          duration: 1500,
          ease: 'linear',
        },
      },
    ],
    emphasis: [
      {
        id: 'common-emphasis-rotate',
        name: '旋转',
        scene: 'basic' as AnimationScene,
        supportTransformOrigin: true,
        amplitudeConfig: { min: 1, max: 5, step: 1, unit: '圈', hint: '旋转圈数' },
        parameters: {
          rotate: '1turn',
          duration: 1000,
          loop: true,
          ease: 'linear',
          amplitude: 1,
        },
      },
      {
        id: 'common-emphasis-blink',
        name: '闪烁',
        scene: 'basic' as AnimationScene,
        amplitudeConfig: { min: 1, max: 100, step: 1, unit: '%', hint: '最低透明度' },
        parameters: {
          opacity: ['1', '0.2', '1'],
          duration: 1000,
          loop: true,
          ease: 'inOutQuad',
          amplitude: 20,
        },
      },
      {
        id: 'common-emphasis-beat',
        name: '律动',
        scene: 'conversion' as AnimationScene,
        supportTransformOrigin: true,
        amplitudeConfig: { min: 1, max: 30, step: 1, unit: '%', hint: '缩放强度' },
        parameters: {
          scale: [1, 1.1, 0.9],
          duration: 1000,
          loop: true,
          ease: 'inOutQuad',
          amplitude: 10,
        },
      },
      {
        id: 'common-emphasis-shake',
        name: '摇摆',
        scene: 'conversion' as AnimationScene,
        amplitudeConfig: { min: 1, max: 30, step: 1, unit: '%', hint: '位移距离' },
        parameters: {
          x: ['-10%', '10%', '10%', '-10%', '-10%'],
          y: ['-10%', '10%', '-10%', '10%', '-10%'],
          duration: 2000,
          loop: true,
          ease: 'inOutQuad',
          amplitude: 10,
        },
      },
      {
        id: 'common-emphasis-sway',
        name: '摇曳',
        scene: 'basic' as AnimationScene,
        supportTransformOrigin: true,
        amplitudeConfig: { min: 1, max: 45, step: 1, unit: '度', hint: '旋转角度' },
        parameters: {
          rotate: ['-8deg', '8deg', '-8deg'],
          amplitude: 8,
          transformOrigin: 'bottom center',
          duration: 2000,
          loop: true,
          ease: 'inOutQuad',
        },
      },
      {
        id: 'common-emphasis-pulse',
        name: '缩放',
        scene: 'basic' as AnimationScene,
        supportTransformOrigin: true,
        amplitudeConfig: { min: 1, max: 30, step: 1, unit: '%', hint: '缩放强度' },
        parameters: {
          scale: [1, 1.05, 1],
          duration: 1000,
          loop: true,
          ease: 'inOutQuad',
          amplitude: 5,
        },
      },
      {
        id: 'common-emphasis-float',
        name: '优雅漂浮',
        scene: 'wedding' as AnimationScene,
        amplitudeConfig: { min: 1, max: 20, step: 1, unit: '%', hint: '上下位移' },
        parameters: {
          y: ['0%', '-8%', '0%', '6%', '0%'],
          duration: 3000,
          loop: true,
          ease: 'inOutQuad',
          amplitude: 8,
        },
      },
      {
        id: 'common-emphasis-heartbeat',
        name: '心跳',
        scene: 'wedding' as AnimationScene,
        supportTransformOrigin: true,
        amplitudeConfig: { min: 1, max: 30, step: 1, unit: '%', hint: '缩放强度' },
        parameters: {
          scale: [1, 1.15, 1.05, 1.1, 1],
          duration: 1500,
          loop: true,
          ease: 'outQuad',
          amplitude: 15,
        },
      },
      {
        id: 'common-emphasis-jelly',
        name: '果冻弹跳',
        scene: 'conversion' as AnimationScene,
        supportTransformOrigin: true,
        amplitudeConfig: { min: 1, max: 20, step: 1, unit: '%', hint: '缩放强度' },
        parameters: {
          scale: [1, 1.08, 0.95, 1.03, 1],
          scaleX: [1, 1.1, 0.9, 1.05, 1],
          scaleY: [1, 0.9, 1.1, 0.98, 1],
          duration: 1000,
          loop: true,
          ease: 'outElastic',
          amplitude: 8,
        },
      },
      {
        id: 'common-emphasis-pop',
        name: '强调放大',
        scene: 'conversion' as AnimationScene,
        supportTransformOrigin: true,
        amplitudeConfig: { min: 1, max: 50, step: 1, unit: '%', hint: '缩放强度' },
        parameters: {
          scale: [1, 1.2, 1],
          duration: 800,
          loop: true,
          ease: 'outBack',
          amplitude: 20,
        },
      },
    ],
    exit: [],
  },
};


/** 从 animation2Data 中按 id 查找动画预设，返回完整 AnimationState（含 type） */
function findInList(
  list: AnimationPresetItem[],
  id: string,
  typeTag: string
): { 
  id: string; 
  name: string; 
  parameters: Record<string, unknown>; 
  delay?: number; 
  type: string;
  directional?: boolean;
  directionParams?: Record<Direction, Record<string, unknown>>;
  supportTransformOrigin?: boolean;
} | null {
  const item = list.find(x => (x.id ?? '') === id);
  if (!item) return null;
  return {
    id: item.id ?? id,
    name: item.name,
    parameters: { ...item.parameters },
    delay: item.delay,
    type: item.type ?? typeTag,
    directional: item.directional,
    directionParams: item.directionParams,
    supportTransformOrigin: item.supportTransformOrigin,
  };
}

/** 根据动画 id 从预设库解析出 AnimationState（用于场景模板） */
export function getAnimationById(
  id: string
): { 
  id: string; 
  name: string; 
  parameters: Record<string, unknown>; 
  delay?: number; 
  type: string;
  directional?: boolean;
  directionParams?: Record<Direction, Record<string, unknown>>;
  supportTransformOrigin?: boolean;
} | null {
  if (id.startsWith('text-')) {
    const t = animation2Data.text;
    return findInList(t.entrance, id, 'text') ?? findInList(t.exit, id, 'text') ?? null;
  }
  const c = animation2Data.common;
  return (
    findInList(c.entrance, id, 'common') ??
    findInList(c.emphasis, id, 'common') ??
    findInList(c.exit, id, 'common') ??
    null
  );
}

/** 与「位移」「弹入」等方向等效的进场动画 id，选择器中不展示避免重复 */
const ENTRANCE_DEDUPE_IDS = [
  'common-entrance-rise', // 与 位移-上 相同
  'common-entrance-rise-linear', // 与 位移-上+线性 相同
  'common-entrance-slide-left', // 与 位移-左 相同
  'common-entrance-slide-right', // 与 位移-右 相同
  'common-entrance-fall', // 与 位移-下 相同
  'common-entrance-pop-bottom', // 与 弹入-上 相同
];

/** 进场动画列表（去重后供选择器使用，已有内容仍可通过 getAnimationById 解析） */
export const commonEntranceForSelector = animation2Data.common.entrance.filter(
  (item) => !ENTRANCE_DEDUPE_IDS.includes(item.id ?? '')
);

/** 与「缩放」等效的强调动画 id，选择器中不展示避免重复 */
const EMPHASIS_DEDUPE_IDS = ['common-emphasis-beat'];

/** 强调动画列表（去重后供选择器使用） */
export const commonEmphasisForSelector = animation2Data.common.emphasis.filter(
  (item) => !EMPHASIS_DEDUPE_IDS.includes(item.id ?? '')
);

const DEFAULT_AMPLITUDE_CONFIG: EmphasisAmplitudeConfig = { min: 1, max: 30, step: 1, unit: '%' };

/** 根据强调动画 id 获取幅度配置（来自预设） */
export function getEmphasisAmplitudeConfig(id: string): EmphasisAmplitudeConfig {
  const item = animation2Data.common.emphasis.find((x) => (x.id ?? '') === id);
  return item?.amplitudeConfig ?? DEFAULT_AMPLITUDE_CONFIG;
}

/** 从 parameters 读取幅度值（摇曳可从 rotate 解析） */
export function getEmphasisAmplitudeValue(id: string, parameters: Record<string, unknown>): number {
  const amp = parameters.amplitude;
  if (typeof amp === 'number') return amp;
  if (id === 'common-emphasis-sway' && Array.isArray(parameters.rotate) && parameters.rotate[1] != null) {
    const match = String(parameters.rotate[1]).match(/^(-?\d+(?:\.\d+)?)/);
    return match ? Math.min(45, Math.max(1, Math.abs(Number(match[1])))) : 8;
  }
  return 8;
}

/** 强调动画方向配置项 */
export interface EmphasisDirectionOption {
  value: Direction;
  label: string;
}

/** 强调动画方向配置 */
export interface EmphasisDirectionConfig {
  options: EmphasisDirectionOption[];
  default: Direction;
}

/** 支持方向设置的强调动画配置表 */
export const emphasisDirectionConfigs: Record<string, EmphasisDirectionConfig> = {
  'common-emphasis-rotate': {
    options: [
      { value: 'right', label: '顺时针' },
      { value: 'left', label: '逆时针' },
    ],
    default: 'right',
  },
  'common-emphasis-sway': {
    options: [
      { value: 'left', label: '左起' },
      { value: 'right', label: '右起' },
    ],
    default: 'left',
  },
};

/** 根据强调动画 id 获取方向配置（无方向支持时返回 null） */
export function getEmphasisDirectionConfig(id: string): EmphasisDirectionConfig | null {
  return emphasisDirectionConfigs[id] ?? null;
}

/** 从 parameters 推断强调动画当前方向 */
export function getEmphasisDirection(id: string, parameters: Record<string, unknown>): Direction {
  const config = emphasisDirectionConfigs[id];
  if (!config) return 'right';

  if (id === 'common-emphasis-rotate') {
    const r = String(parameters.rotate ?? '');
    return r.startsWith('-') ? 'left' : 'right';
  }

  if (id === 'common-emphasis-sway') {
    if (Array.isArray(parameters.rotate) && parameters.rotate[0] != null) {
      const first = String(parameters.rotate[0]);
      return first.startsWith('-') ? 'left' : 'right';
    }
    return 'left';
  }

  return config.default;
}

/** 将幅度写入 parameters（按 id 推导关键帧），由数据层统一维护 */
export type EmphasisAmplitudeApplier = (params: Record<string, unknown>, value: number, direction?: Direction) => void;

export const emphasisAmplitudeAppliers: Record<string, EmphasisAmplitudeApplier> = {
  'common-emphasis-sway': (p, v, direction) => {
    p.amplitude = v;
    if (direction === 'right') {
      p.rotate = [`${v}deg`, `-${v}deg`, `${v}deg`];
    } else {
      p.rotate = [`-${v}deg`, `${v}deg`, `-${v}deg`];
    }
  },
  'common-emphasis-rotate': (p, v, direction) => {
    p.amplitude = v;
    if (direction === 'left') {
      p.rotate = `-${v}turn`;
    } else {
      p.rotate = `${v}turn`;
    }
  },
  'common-emphasis-blink': (p, v) => {
    p.amplitude = v;
    p.opacity = ['1', `${v / 100}`, '1'];
  },
  'common-emphasis-beat': (p, v) => {
    p.amplitude = v;
    p.scale = [1, 1 + v / 100, 1 - v / 100];
  },
  'common-emphasis-shake': (p, v) => {
    const s = `${v}%`;
    p.amplitude = v;
    p.x = [`-${s}`, s, s, `-${s}`, `-${s}`];
    p.y = [`-${s}`, s, `-${s}`, s, `-${s}`];
  },
  'common-emphasis-pulse': (p, v) => {
    p.amplitude = v;
    p.scale = [1, 1 + v / 100, 1];
  },
  'common-emphasis-float': (p, v) => {
    p.amplitude = v;
    p.y = ['0%', `-${v}%`, '0%', `${v * 0.75}%`, '0%'];
  },
  'common-emphasis-heartbeat': (p, v) => {
    p.amplitude = v;
    p.scale = [1, 1 + v / 100, 1.05, 1.05 + v / 200, 1];
  },
  'common-emphasis-jelly': (p, v) => {
    p.amplitude = v;
    p.scale = [1, 1 + v / 100, 1 - v / 100, 1 + v / 300, 1];
    p.scaleX = [1, 1 + v / 100, 1 - v / 100, 1 + v / 200, 1];
    p.scaleY = [1, 1 - v / 100, 1 + v / 100, 1 - v / 500, 1];
  },
  'common-emphasis-pop': (p, v) => {
    p.amplitude = v;
    p.scale = [1, 1 + v / 100, 1];
  },
};

/** 根据进场动画 id 获取幅度配置（来自预设） */
export function getEntranceAmplitudeConfig(id: string): AnimationAmplitudeConfig | null {
  const item = animation2Data.common.entrance.find((x) => (x.id ?? '') === id);
  return item?.amplitudeConfig ?? null;
}

/** 根据退场动画 id 获取幅度配置（来自预设，复用进场动画配置） */
export function getExitAmplitudeConfig(id: string): AnimationAmplitudeConfig | null {
  // 退场动画 id 通常与进场动画对应，直接查找进场动画配置
  const item = animation2Data.common.entrance.find((x) => (x.id ?? '') === id);
  return item?.amplitudeConfig ?? null;
}

/** 从 parameters 读取进场/退场动画的幅度值 */
export function getEntranceExitAmplitudeValue(id: string, parameters: Record<string, unknown>): number {
  const amp = parameters.amplitude;
  if (typeof amp === 'number') return amp;
  // 尝试从具体属性推断
  if (id.includes('slide') || id.includes('rise') || id.includes('fall') || id.includes('pop-slide') || id.includes('pop-bottom')) {
    // 位移类动画，从 x 或 y 解析
    const yArr = parameters.y;
    const xArr = parameters.x;
    if (Array.isArray(yArr) && yArr[0] != null) {
      const match = String(yArr[0]).match(/^(-?\d+(?:\.\d+)?)/);
      if (match) return Math.abs(Number(match[1]));
    }
    if (Array.isArray(xArr) && xArr[0] != null) {
      const match = String(xArr[0]).match(/^(-?\d+(?:\.\d+)?)/);
      if (match) return Math.abs(Number(match[1]));
    }
    return 100;
  }
  if (id.includes('pop') && !id.includes('slide') && !id.includes('bottom')) {
    // 弹出动画，从 scale 解析
    const scaleArr = parameters.scale;
    if (Array.isArray(scaleArr) && scaleArr.length >= 2) {
      const maxScale = Math.max(...scaleArr.filter((s): s is number => typeof s === 'number'));
      return Math.round((maxScale - 1) * 100);
    }
    return 10;
  }
  if (id.includes('blur')) {
    const filterArr = parameters.filter;
    if (Array.isArray(filterArr) && filterArr[0] != null) {
      const match = String(filterArr[0]).match(/blur\((\d+(?:\.\d+)?)px\)/);
      if (match) return Number(match[1]);
    }
    return 12;
  }
  if (id.includes('roll') || id.includes('3d-flip')) {
    const rotateArr = parameters.rotate ?? parameters.rotateX;
    if (Array.isArray(rotateArr) && rotateArr[0] != null) {
      const match = String(rotateArr[0]).match(/^(-?\d+(?:\.\d+)?)deg/);
      if (match) return Math.abs(Number(match[1]));
    }
    return 90;
  }
  if (id.includes('scale')) {
    const scaleArr = parameters.scale;
    if (Array.isArray(scaleArr) && scaleArr[0] != null) {
      return Math.round(Number(scaleArr[0]) * 100);
    }
    return 0;
  }
  if (id.includes('bounce')) {
    const yArr = parameters.y;
    if (Array.isArray(yArr) && yArr[0] != null) {
      const match = String(yArr[0]).match(/^(-?\d+(?:\.\d+)?)/);
      if (match) return Math.abs(Number(match[1]));
    }
    return 80;
  }
  return 100;
}

/** 将幅度写入进场动画 parameters */
export type EntranceAmplitudeApplier = (params: Record<string, unknown>, value: number, direction?: Direction) => void;

export const entranceAmplitudeAppliers: Record<string, EntranceAmplitudeApplier> = {
  'common-entrance-slide': (p, v, dir) => {
    p.amplitude = v;
    if (dir === 'up') {
      p.y = [`${v}%`, '0%'];
    } else if (dir === 'down') {
      p.y = [`-${v}%`, '0%'];
    } else if (dir === 'left') {
      p.x = [`${v}%`, '0%'];
    } else if (dir === 'right') {
      p.x = [`-${v}%`, '0%'];
    } else {
      p.y = [`${v}%`, '0%'];
    }
  },
  'common-entrance-pop': (p, v) => {
    p.amplitude = v;
    const peak = 1 + v / 100;
    const dip = 1 - v / 200;
    p.scale = [0, peak, dip, 1];
  },
  'common-entrance-blur': (p, v) => {
    p.amplitude = v;
    p.filter = [`blur(${v}px)`, 'blur(0px)'];
  },
  'common-entrance-pop-slide': (p, v, dir) => {
    p.amplitude = v;
    if (dir === 'up') {
      p.y = [`${v}%`, '0%'];
    } else if (dir === 'down') {
      p.y = [`-${v}%`, '0%'];
    } else if (dir === 'left') {
      p.x = [`${v}%`, '0%'];
    } else if (dir === 'right') {
      p.x = [`-${v}%`, '0%'];
    } else {
      p.y = [`${v}%`, '0%'];
    }
  },
  'common-entrance-roll': (p, v, dir) => {
    p.amplitude = v;
    if (dir === 'left') {
      p.rotate = [`${v}deg`, '0deg'];
    } else if (dir === 'right') {
      p.rotate = [`-${v}deg`, '0deg'];
    } else if (dir === 'up') {
      p.rotate = [`${v}deg`, '0deg'];
    } else if (dir === 'down') {
      p.rotate = [`-${v}deg`, '0deg'];
    } else {
      p.rotate = [`${v}deg`, '0deg'];
    }
  },
  'common-entrance-scale': (p, v) => {
    // 缩放动画特殊处理：v 作为 scaleFrom，保持 scaleTo 不变
    const scaleTo = typeof p.scaleTo === 'number' ? p.scaleTo : 100;
    p.scaleFrom = v;
    p.scale = [v / 100, scaleTo / 100];
  },
  'common-entrance-3d-flip': (p, v) => {
    p.amplitude = v;
    p.rotateX = [`-${v}deg`, '0deg'];
    p.y = [`-${Math.round(v / 3)}%`, '0%'];
  },
  'common-entrance-bounce-in': (p, v) => {
    p.amplitude = v;
    const h = v;
    p.y = [`-${h}%`, `${Math.round(h * 0.125)}%`, `-${Math.round(h * 0.1875)}%`, `${Math.round(h * 0.0625)}%`, '0%'];
    p.scale = [0.8, 1 + v / 1000, 0.95, 1.02, 1];
  },
  'common-entrance-rise': (p, v) => {
    p.amplitude = v;
    p.y = [`${v}%`, '0%'];
  },
  'common-entrance-rise-linear': (p, v) => {
    p.amplitude = v;
    p.y = [`${v}%`, '0%'];
  },
  'common-entrance-slide-left': (p, v) => {
    p.amplitude = v;
    p.x = [`${v}%`, '0%'];
  },
  'common-entrance-slide-right': (p, v) => {
    p.amplitude = v;
    p.x = [`-${v}%`, '0%'];
  },
  'common-entrance-pop-bottom': (p, v) => {
    p.amplitude = v;
    p.y = [`${v}%`, '0%'];
  },
  'common-entrance-fall': (p, v) => {
    p.amplitude = v;
    p.y = [`-${v}%`, '0%'];
  },
};

/** 缩放动画快捷选项 */
export type ScalePreset = 'zoomIn' | 'zoomOut';

/** 获取缩放动画的 from/to 值 */
export function getScaleFromTo(parameters: Record<string, unknown>): { from: number; to: number } {
  const scaleFrom = typeof parameters.scaleFrom === 'number' ? parameters.scaleFrom : 0;
  const scaleTo = typeof parameters.scaleTo === 'number' ? parameters.scaleTo : 100;
  // 兼容旧数据：如果没有 scaleFrom/scaleTo，从 scale 数组解析
  if (parameters.scaleFrom === undefined && parameters.scaleTo === undefined) {
    const scaleArr = parameters.scale;
    if (Array.isArray(scaleArr) && scaleArr.length >= 2) {
      const from = typeof scaleArr[0] === 'number' ? Math.round(scaleArr[0] * 100) : 0;
      const to = typeof scaleArr[scaleArr.length - 1] === 'number' ? Math.round(scaleArr[scaleArr.length - 1] * 100) : 100;
      return { from, to };
    }
  }
  return { from: scaleFrom, to: scaleTo };
}

/** 应用缩放动画的 from/to 值 */
export function applyScaleFromTo(
  parameters: Record<string, unknown>,
  from: number,
  to: number
): void {
  parameters.scaleFrom = from;
  parameters.scaleTo = to;
  parameters.scale = [from / 100, to / 100];
}

/** 应用缩放动画快捷预设 */
export function applyScalePreset(
  parameters: Record<string, unknown>,
  preset: ScalePreset
): void {
  if (preset === 'zoomIn') {
    // 放大：从 0% 到 100%
    applyScaleFromTo(parameters, 0, 100);
  } else if (preset === 'zoomOut') {
    // 缩小：从 150% 到 100%
    applyScaleFromTo(parameters, 150, 100);
  }
}

/** 将幅度写入退场动画 parameters（退场是进场的反向，先应用进场再反转） */
export function applyExitAmplitude(
  id: string,
  params: Record<string, unknown>,
  value: number,
  direction?: Direction
): void {
  const applier = entranceAmplitudeAppliers[id];
  if (applier) {
    // 创建临时进场参数
    const tempParams: Record<string, unknown> = { ...params };
    applier(tempParams, value, direction);
    // 将进场参数反转为退场参数
    const reversed = reverseAnimationParameters(tempParams as Record<string, unknown>);
    Object.assign(params, reversed);
  }
}

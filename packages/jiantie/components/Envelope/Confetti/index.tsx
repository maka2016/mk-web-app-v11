'use client';

import { default as confetti, type CreateTypes } from 'canvas-confetti';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type {
  ConfettiBuiltinShape,
  ConfettiEffectType,
  ConfettiShapeSource,
} from '../types';
import {
  CONFETTI_REPEAT_MAX,
  CONFETTI_REPEAT_MIN,
  DEFAULT_CONFETTI_COLORS,
  DEFAULT_CONFETTI_EMOJI,
} from '../types';

export interface ConfettiPlayWithContentOptions {
  effect?: ConfettiEffectType;
  shapeSource?: ConfettiShapeSource;
  shape?: ConfettiBuiltinShape;
  emoji?: string;
  customShapePath?: string;
  colors?: string[];
  durationMs?: number;
  repeatCount?: number;
  intervalMs?: number;
  scalar?: number;
}

export interface ConfettiRef {
  /**
   * 根据播放效果 + 内容形态一次性触发撒花
   */
  playWithContent: (options?: ConfettiPlayWithContentOptions) => void;
}

export interface ConfettiProps {
  /**
   * 是否使用自定义 canvas
   * 如果提供，将使用该 canvas 而不是创建新的
   */
  canvas?: HTMLCanvasElement;
  /**
   * 是否自动调整 canvas 大小
   * @default true
   */
  resize?: boolean;
  /**
   * 是否使用 Web Worker 渲染
   * @default true
   */
  useWorker?: boolean;
  /**
   * 是否禁用减少动画（尊重用户的减少动画偏好）
   * @default false
   */
  disableForReducedMotion?: boolean;
}

const HEART_PATH =
  'M167 72c19,-38 37,-56 75,-56 42,0 76,33 76,75 0,76 -76,151 -151,227 -76,-76 -151,-151 -151,-227 0,-42 33,-75 75,-75 38,0 57,18 76,56z';

const RIBBON_PATH =
  'M10 70 C80 10, 220 10, 300 70 C380 130, 520 130, 590 70 L590 95 C520 155,380 155,300 95 C220 35,80 35,10 95 Z';

const DEFAULT_REPEAT_DELAY = 900;
const EMOJI_SCALAR = 2;

type EmitFn = (options: confetti.Options) => void;
type RegisterIntervalFn = (intervalId: number) => void;

const getTrimmed = (value?: string) => value?.trim() ?? '';

const sanitizeColors = (colors?: string[]) => {
  const sanitized = (colors ?? [])
    .map(color => getTrimmed(color))
    .filter(Boolean) as string[];
  return sanitized.length > 0 ? sanitized : [...DEFAULT_CONFETTI_COLORS];
};

const clampRepeatCount = (value?: number) => {
  if (!Number.isFinite(value)) {
    return CONFETTI_REPEAT_MIN;
  }
  const rounded = Math.round(value as number);
  if (!rounded) {
    return CONFETTI_REPEAT_MIN;
  }
  return Math.min(Math.max(rounded, CONFETTI_REPEAT_MIN), CONFETTI_REPEAT_MAX);
};

const playWedding = (emit: EmitFn) => {
  emit({
    particleCount: 60,
    angle: 60,
    spread: 55,
    origin: { x: 0, y: 0.75 },
  });
  emit({
    particleCount: 60,
    angle: 120,
    spread: 55,
    origin: { x: 1, y: 0.75 },
  });
};

const playExplosion = (emit: EmitFn) => {
  emit({
    particleCount: 120,
    spread: 360,
    startVelocity: 55,
    origin: { x: 0.5, y: 0.6 },
    decay: 0.92,
  });
  emit({
    particleCount: 60,
    spread: 80,
    startVelocity: 30,
    gravity: 0.8,
    origin: { x: 0.5, y: 0.4 },
  });
};

const randomInRange = (min: number, max: number) => {
  return Math.random() * (max - min) + min;
};

const playFireworks = (
  emit: EmitFn,
  durationMs: number,
  registerInterval: RegisterIntervalFn
) => {
  const animationEnd = Date.now() + durationMs;
  const defaults = {
    startVelocity: 30,
    spread: 360,
    ticks: 60,
    zIndex: 0,
  };

  const interval = window.setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return window.clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / durationMs);
    // since particles fall down, start a bit higher than random
    emit({
      ...defaults,
      particleCount,
      origin: {
        x: randomInRange(0.1, 0.3),
        y: Math.random() - 0.2,
      },
    });
    emit({
      ...defaults,
      particleCount,
      origin: {
        x: randomInRange(0.7, 0.9),
        y: Math.random() - 0.2,
      },
    });
  }, 250);

  registerInterval(interval);
};

const playShower = (emit: EmitFn) => {
  const defaults = {
    spread: 180,
    particleCount: 30,
    origin: { y: -0.1 },
    startVelocity: -35,
  };

  emit({
    ...defaults,
  });

  emit({
    ...defaults,
  });

  emit({
    ...defaults,
  });
};

const playCelebration = (emit: EmitFn) => {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
  };

  const fire = (particleRatio: number, opts: confetti.Options) => {
    emit({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  };

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  });
  fire(0.2, {
    spread: 60,
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
};

type RegisterAnimationFrameFn = (frameId: number) => void;

const playHeartRain = (
  emit: EmitFn,
  durationMs: number,
  registerAnimationFrame: RegisterAnimationFrameFn
) => {
  const animationEnd = Date.now() + durationMs;

  const frame = () => {
    emit({
      particleCount: 2,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      gravity: 0.6,
      drift: 1,
    });
    emit({
      particleCount: 2,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      gravity: 0.6,
      drift: -1,
    });

    if (Date.now() < animationEnd) {
      const frameId = requestAnimationFrame(frame);
      registerAnimationFrame(frameId);
    }
  };

  frame();
};

const ConfettiPlayer = forwardRef<ConfettiRef, ConfettiProps>(
  (
    {
      canvas: customCanvas,
      resize = true,
      useWorker = true,
      disableForReducedMotion = false,
    },
    ref
  ) => {
    const confettiInstanceRef = useRef<CreateTypes | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const durationTimeoutRef = useRef<number | null>(null);
    const shapeCacheRef = useRef<Record<string, confetti.Shape>>({});
    const scheduledTimersRef = useRef<number[]>([]);
    const intervalsRef = useRef<number[]>([]);
    const animationFramesRef = useRef<number[]>([]);

    const clearDurationTimeout = () => {
      if (durationTimeoutRef.current) {
        window.clearTimeout(durationTimeoutRef.current);
        durationTimeoutRef.current = null;
      }
    };

    const clearScheduledAnimations = () => {
      if (scheduledTimersRef.current.length === 0) return;
      scheduledTimersRef.current.forEach(id => {
        window.clearTimeout(id);
      });
      scheduledTimersRef.current = [];
    };

    const clearIntervals = () => {
      if (intervalsRef.current.length === 0) return;
      intervalsRef.current.forEach(id => {
        window.clearInterval(id);
      });
      intervalsRef.current = [];
    };

    const clearAnimationFrames = () => {
      if (animationFramesRef.current.length === 0) return;
      animationFramesRef.current.forEach(id => {
        window.cancelAnimationFrame(id);
      });
      animationFramesRef.current = [];
    };

    const schedule = (cb: () => void, delay = 0) => {
      const timeoutId = window.setTimeout(() => {
        scheduledTimersRef.current = scheduledTimersRef.current.filter(
          id => id !== timeoutId
        );
        cb();
      }, delay);
      scheduledTimersRef.current.push(timeoutId);
      return timeoutId;
    };

    // 初始化 confetti 实例
    useEffect(() => {
      let canvas: HTMLCanvasElement;

      if (customCanvas) {
        canvas = customCanvas;
        canvasRef.current = canvas;
      } else {
        canvas = document.createElement('canvas');
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '9999';
        document.body.appendChild(canvas);
        canvasRef.current = canvas;
      }

      confettiInstanceRef.current = confetti.create(canvas, {
        resize,
        useWorker,
        disableForReducedMotion,
      });

      return () => {
        if (confettiInstanceRef.current) {
          confettiInstanceRef.current.reset();
          confettiInstanceRef.current = null;
        }
        clearDurationTimeout();
        if (!customCanvas && canvas && canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
        canvasRef.current = null;
      };
    }, [customCanvas, resize, useWorker, disableForReducedMotion]);

    useEffect(() => {
      return () => {
        clearDurationTimeout();
        clearScheduledAnimations();
        clearIntervals();
        clearAnimationFrames();
      };
    }, []);

    const getCachedShape = (
      key: string,
      factory: () => confetti.Shape | undefined
    ) => {
      if (!shapeCacheRef.current[key]) {
        const shape = factory();
        if (!shape) {
          return undefined;
        }
        shapeCacheRef.current[key] = shape;
      }
      return shapeCacheRef.current[key];
    };

    const resolveBuiltinShape = (
      shape?: ConfettiBuiltinShape
    ): confetti.Shape | string => {
      if (
        !shape ||
        shape === 'circle' ||
        shape === 'square' ||
        shape === 'star'
      )
        return shape ?? 'circle';

      const cacheKey = `builtin:${shape}`;
      const path = shape === 'heart' ? HEART_PATH : RIBBON_PATH;
      const cached = getCachedShape(cacheKey, () =>
        confetti.shapeFromPath({ path })
      );
      return cached ?? 'circle';
    };

    const resolveCustomShape = (path?: string) => {
      const trimmed = getTrimmed(path);
      if (!trimmed) return undefined;
      return getCachedShape(`custom:${trimmed}`, () =>
        confetti.shapeFromPath({ path: trimmed })
      );
    };

    const resolveEmojiShape = (emoji?: string) => {
      const text = emoji?.trim() || DEFAULT_CONFETTI_EMOJI;
      return getCachedShape(`emoji:${text}`, () =>
        confetti.shapeFromText({
          text,
          scalar: EMOJI_SCALAR,
        })
      );
    };

    const resolveShapePayload = (
      options?: Pick<
        ConfettiPlayWithContentOptions,
        'shapeSource' | 'shape' | 'emoji' | 'customShapePath'
      >
    ): { shapes: (confetti.Shape | string)[]; scalar?: number } => {
      const source = options?.shapeSource ?? 'builtin';
      if (source === 'emoji') {
        const emojiShape = resolveEmojiShape(options?.emoji);
        if (emojiShape) {
          return { shapes: [emojiShape], scalar: EMOJI_SCALAR };
        }
      }

      if (source === 'custom') {
        const customShape = resolveCustomShape(options?.customShapePath);
        if (customShape) {
          return { shapes: [customShape] };
        }
      }

      const builtinShape = resolveBuiltinShape(options?.shape);
      return { shapes: [builtinShape] };
    };

    // 停止所有效果
    const reset = () => {
      clearDurationTimeout();
      clearScheduledAnimations();
      clearIntervals();
      clearAnimationFrames();
      if (confettiInstanceRef.current) {
        confettiInstanceRef.current.reset();
      }
    };

    const playWithContent = (options?: ConfettiPlayWithContentOptions) => {
      if (!confettiInstanceRef.current) return;

      clearScheduledAnimations();
      clearDurationTimeout();
      clearIntervals();
      clearAnimationFrames();

      const colors = sanitizeColors(options?.colors);
      const shapePayload = resolveShapePayload({
        shapeSource: options?.shapeSource,
        shape: options?.shape,
        emoji: options?.emoji,
        customShapePath: options?.customShapePath,
      });

      const shapes =
        shapePayload.shapes && shapePayload.shapes.length > 0
          ? shapePayload.shapes
          : ['circle'];

      const scalar = options?.scalar ?? shapePayload.scalar ?? 2;

      const baseOptions: confetti.Options = {
        shapes: shapes as confetti.Shape[],
        scalar,
        colors,
      };

      const emit: EmitFn = (overrides: confetti.Options = {}) => {
        if (!confettiInstanceRef.current) return;
        confettiInstanceRef.current({
          ...baseOptions,
          ...overrides,
        });
      };

      const effect = options?.effect ?? 'wedding';
      const durationMs = options?.durationMs ?? 0;

      const registerInterval = (intervalId: number) => {
        intervalsRef.current.push(intervalId);
      };

      const registerAnimationFrame = (frameId: number) => {
        animationFramesRef.current.push(frameId);
      };

      const launchEffect = () => {
        switch (effect) {
          case 'fireworks':
            if (durationMs > 0) {
              playFireworks(emit, durationMs, registerInterval);
            } else {
              // 如果没有设置 duration，使用原来的方式（向后兼容）
              const bursts = 4;
              for (let i = 0; i < bursts; i += 1) {
                schedule(() => {
                  emit({
                    particleCount: 45,
                    spread: 60,
                    startVelocity: 60,
                    decay: 0.9,
                    origin: {
                      x: Math.random() * 0.8 + 0.1,
                      y: Math.random() * 0.3 + 0.1,
                    },
                    gravity: 0.9,
                  });
                }, i * 250);
              }
            }
            break;
          case 'shower':
            playShower(emit);
            break;
          case 'explosion':
            playExplosion(emit);
            break;
          case 'celebration':
            playCelebration(emit);
            break;
          case 'heartRain':
            if (durationMs > 0) {
              playHeartRain(emit, durationMs, registerAnimationFrame);
            } else {
              // 如果没有设置 duration，默认使用 3 秒
              playHeartRain(emit, 3000, registerAnimationFrame);
            }
            break;
          case 'wedding':
          default:
            playWedding(emit);
            break;
        }
      };

      // 对于 fireworks 和 heartRain 效果，如果设置了 durationMs，只启动一次持续发射
      if (
        (effect === 'fireworks' || effect === 'heartRain') &&
        durationMs > 0
      ) {
        launchEffect();
      } else {
        const repeatCount = clampRepeatCount(options?.repeatCount ?? 1);
        const intervalMs = options?.intervalMs ?? DEFAULT_REPEAT_DELAY;
        for (let i = 0; i < repeatCount; i += 1) {
          schedule(launchEffect, i * intervalMs);
        }
      }

      if (options?.durationMs && options.durationMs > 0) {
        durationTimeoutRef.current = window.setTimeout(() => {
          reset();
        }, options.durationMs);
      }
    };

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      playWithContent,
    }));

    // 组件不渲染任何内容，只提供控制方法
    return null;
  }
);

ConfettiPlayer.displayName = 'ConfettiPlayer';

export default ConfettiPlayer;

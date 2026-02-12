/**
 * 信封开口阴影配置
 */
export interface FlapShadow {
  /** 水平偏移（px） */
  offsetX?: number;
  /** 垂直偏移（px） */
  offsetY?: number;
  /** 模糊半径（px） */
  blur?: number;
  /** 阴影颜色 */
  color?: string;
}

/**
 * 信封功能完整配置
 * 包含信封图片与动画相关参数
 */
export type ConfettiEffectType =
  | 'wedding'
  | 'fireworks'
  | 'shower'
  | 'explosion'
  | 'celebration'
  | 'heartRain';

export type ConfettiShapeSource = 'builtin' | 'emoji' | 'custom';

export type ConfettiBuiltinShape =
  | 'circle'
  | 'square'
  | 'star'
  | 'heart'
  | 'ribbon';

export const DEFAULT_CONFETTI_COLORS = [
  '#FDE68A',
  '#FCA5A5',
  '#BFDBFE',
  '#C4B5FD',
] as const;

export const DEFAULT_CONFETTI_EMOJI = '🎉';

export const CONFETTI_REPEAT_MIN = 1;
export const CONFETTI_REPEAT_MAX = 5;

export interface EnvelopeConfig {
  /** 作品背景图（作为整个加载页面的背景） */
  backgroundImage?: string;
  /** 左侧开口外侧图（固定形状，不再平铺） */
  leftFlapOuterImage?: string;
  /** 右侧开口外侧图（固定形状，不再平铺） */
  rightFlapOuterImage?: string;
  /** 内侧材质贴纸图（用于左右开口的内侧和信封内页背景，平铺重复） */
  innerTexture?: string;
  /** 信封印章图 */
  envelopeSealImage?: string;
  /** 缓动函数（默认 ease-in-out） */
  easing?: string;
  /** 左侧开口阴影配置 */
  leftFlapShadow?: FlapShadow;
  /** 右侧开口阴影配置 */
  rightFlapShadow?: FlapShadow;

  // 细化的动画时序参数（秒）
  /** 印章消失持续时间（秒，默认 0.3） */
  sealDisappearDuration?: number;
  /** 印章消失后，开口动画开始的延迟（秒，默认 0.3） */
  flapOpenStartDelay?: number;
  /** 左侧开口打开持续时间（秒，默认 2.2） */
  leftFlapDuration?: number;
  /** 右侧相对左侧的延迟（秒，默认 1.1） */
  rightFlapDelay?: number;
  /** 右侧开口打开持续时间（秒，默认 2.2） */
  rightFlapDuration?: number;
  /** 内容展开持续时间（秒，默认 1.2） */
  contentExpandDuration?: number;

  // 嘉宾文字样式配置
  /** 嘉宾字号（px，默认 24） */
  guestNameFontSize?: number;
  /** 嘉宾字体颜色（默认 #333） */
  guestNameColor?: string;

  // 撒花动画配置
  /** 是否启用撒花动画（默认 true） */
  enableConfetti?: boolean;
  /** @deprecated 旧版撒花动画类型（兼容老数据） */
  confettiType?:
    | 'basic'
    | 'random'
    | 'realistic'
    | 'fireworks'
    | 'stars'
    | 'snow'
    | 'emoji'
    | 'custom';
  /** 统一的撒花动画类型 */
  confettiEffect?: ConfettiEffectType;
  /** 撒花内置 / 自定义形状 */
  confettiShape?: ConfettiBuiltinShape | 'custom';
  /** 形状来源（内置 / Emoji / 自定义路径） */
  confettiShapeSource?: ConfettiShapeSource;
  /** 通过 SVG 解析得到的自定义路径 */
  confettiCustomShapePath?: string;
  /** Emoji 撒花文本（仅当类型为 emoji 时生效） */
  confettiEmoji?: string;
  /** @deprecated 旧版撒花内容模式（兼容老数据） */
  confettiContentMode?: 'shape' | 'emoji' | 'mixed';
  /** 撒花持续时间（秒，默认 20 秒） */
  confettiDuration?: number;
  /** 撒花颜色列表 */
  confettiColors?: string[];
  /** 撒花播放次数 */
  confettiRepeatCount?: number;
  /** 撒花每次播放间隔（秒，默认 0.9 秒） */
  confettiInterval?: number;
  /** 撒花大小（默认 2） */
  confettiScalar?: number;
}

export const getDefaultTiming = (): EnvelopeConfig => {
  return {
    sealDisappearDuration: 0.3,
    flapOpenStartDelay: 0.3,
    leftFlapDuration: 1.5,
    rightFlapDelay: 0.5,
    rightFlapDuration: 1.5,
    contentExpandDuration: 1,
  };
};

export interface NormalizedConfettiSettings {
  enabled: boolean;
  effect: ConfettiEffectType;
  shapeSource: ConfettiShapeSource;
  shape: ConfettiBuiltinShape;
  emoji: string;
  customShapePath?: string;
  colors: string[];
  durationSeconds: number;
  repeatCount: number;
  intervalSeconds: number;
  scalar: number;
}

const mapLegacyTypeToEffect = (
  legacyType?: EnvelopeConfig['confettiType']
): ConfettiEffectType => {
  switch (legacyType) {
    case 'fireworks':
      return 'fireworks';
    case 'snow':
    case 'stars':
      return 'shower';
    case 'random':
    case 'basic':
    case 'realistic':
    case 'emoji':
    case 'custom':
      return 'explosion';
    default:
      return 'wedding';
  }
};

const clampNumber = (value: number, min: number, max: number) => {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
};

const deriveShapeSource = (
  config?: EnvelopeConfig,
  customShapePath?: string
): ConfettiShapeSource => {
  if (config?.confettiShapeSource) {
    return config.confettiShapeSource;
  }

  if (
    (config?.confettiShape === 'custom' && customShapePath) ||
    customShapePath
  ) {
    return 'custom';
  }

  if (
    config?.confettiContentMode === 'emoji' ||
    config?.confettiType === 'emoji'
  ) {
    return 'emoji';
  }

  return 'builtin';
};

export const normalizeConfettiSettings = (
  config?: EnvelopeConfig
): NormalizedConfettiSettings => {
  const enabled = config?.enableConfetti ?? true;
  const customShapePath = config?.confettiCustomShapePath?.trim();
  const effect =
    config?.confettiEffect ?? mapLegacyTypeToEffect(config?.confettiType);
  const shapeSource = deriveShapeSource(config, customShapePath);

  const shape = (
    config?.confettiShape && config.confettiShape !== 'custom'
      ? config.confettiShape
      : 'circle'
  ) as ConfettiBuiltinShape;

  const emoji = config?.confettiEmoji?.trim() || DEFAULT_CONFETTI_EMOJI;

  const sanitizedColors = (config?.confettiColors ?? [])
    .map(color => color?.trim())
    .filter((value): value is string => Boolean(value))
    .map(color => color.toUpperCase());
  const uniqueColors = Array.from(new Set(sanitizedColors));
  const colors =
    uniqueColors.length > 0 ? uniqueColors : [...DEFAULT_CONFETTI_COLORS];

  const durationValue = Number(config?.confettiDuration ?? 20);
  const durationSeconds = durationValue > 0 ? Math.max(durationValue, 0.5) : 20;

  const repeatValue = Number(config?.confettiRepeatCount ?? 1);
  const repeatCount = clampNumber(
    Math.round(repeatValue || 1),
    CONFETTI_REPEAT_MIN,
    CONFETTI_REPEAT_MAX
  );

  const intervalValue = Number(config?.confettiInterval ?? 0.9);
  const intervalSeconds =
    intervalValue > 0 ? Math.max(intervalValue, 0.1) : 0.9;

  const scalarValue = Number(config?.confettiScalar ?? 2);
  const scalar = scalarValue > 0 ? Math.max(scalarValue, 0.1) : 2;

  return {
    enabled,
    effect,
    shapeSource,
    shape,
    emoji,
    customShapePath: customShapePath || undefined,
    colors,
    durationSeconds,
    repeatCount,
    intervalSeconds,
    scalar,
  };
};

/**
 * 固定的形状蒙版路径
 * 这些图片定义了信封的形状，用于裁切材质贴纸
 */
export const ENVELOPE_MASKS = {
  inner: '/assets/envelope/inner.svg',
} as const;

/**
 * 检查信封配置是否完整（是否包含所有必需的5张图片）
 */
export function isEnvelopeConfigComplete(config?: EnvelopeConfig): boolean {
  if (!config) return false;
  return !!(
    config.backgroundImage &&
    config.leftFlapOuterImage &&
    config.rightFlapOuterImage &&
    config.innerTexture &&
    config.envelopeSealImage
  );
}

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
export interface EnvelopeConfig {
  /** 作品背景图（作为整个加载页面的背景） */
  backgroundImage?: string;
  /** 外侧材质贴纸图（用于左右开口的外侧，平铺重复） */
  outerTexture?: string;
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
}

export const getDefaultTiming = (): EnvelopeConfig => {
  return {
    sealDisappearDuration: 0.3,
    flapOpenStartDelay: 0.3,
    leftFlapDuration: 2.2,
    rightFlapDelay: 0.6,
    rightFlapDuration: 2.2,
    contentExpandDuration: 1.2,
  };
};

/**
 * 固定的形状蒙版路径
 * 这些图片定义了信封的形状，用于裁切材质贴纸
 */
export const ENVELOPE_MASKS = {
  leftFlap: '/assets/envelope/left-open.svg',
  rightFlap: '/assets/envelope/right-open.svg',
  inner: '/assets/envelope/inner.svg',
} as const;

/**
 * 检查信封配置是否完整（是否包含所有必需的4张图片）
 */
export function isEnvelopeConfigComplete(config?: EnvelopeConfig): boolean {
  if (!config) return false;
  return !!(
    config.backgroundImage &&
    config.outerTexture &&
    config.innerTexture &&
    config.envelopeSealImage
  );
}

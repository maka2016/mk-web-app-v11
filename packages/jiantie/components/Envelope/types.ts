/**
 * 视频背景配置类型定义
 */
export interface VideoBgConfig {
  /** 视频 URL */
  videoUrl: string;
  /** 对象适应方式（默认 cover） */
  objectFit?: 'cover' | 'contain' | 'fill';
  /** 是否循环播放（默认 true） */
  loop?: boolean;
  /** 是否静音（默认 true） */
  muted?: boolean;
  /** 不透明度（0-1，默认 1） */
  opacity?: number;
}

/**
 * 信封功能完整配置
 * 包含信封图片、动画参数、视频背景等所有配置
 */
export interface EnvelopeConfig {
  /** 加载页背景图 */
  backgroundImage?: string;
  /** 信封正面图 */
  envelopeFrontImage?: string;
  /** 信封左侧图 */
  envelopeLeftImage?: string;
  /** 信封右侧图 */
  envelopeRightImage?: string;
  /** 信封内页图 */
  envelopeInnerImage?: string;
  /** 信封印章图 */
  envelopeSealImage?: string;
  /** 动画持续时间（毫秒，默认 2000） */
  duration?: number;
  /** 延迟时间（毫秒，默认 500） */
  delay?: number;
  /** 缓动函数（默认 ease-in-out） */
  easing?: string;
  /** 视频背景配置 */
  videoBgConfig?: VideoBgConfig;
}

/**
 * 检查信封配置是否完整（是否包含所有必需的6张图片）
 */
export function isEnvelopeConfigComplete(config?: EnvelopeConfig): boolean {
  if (!config) return false;
  return !!(
    config.backgroundImage &&
    config.envelopeFrontImage &&
    config.envelopeLeftImage &&
    config.envelopeRightImage &&
    config.envelopeInnerImage &&
    config.envelopeSealImage
  );
}

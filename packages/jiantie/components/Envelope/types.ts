/**
 * 信封功能完整配置
 * 包含信封图片与动画相关参数
 */
export interface EnvelopeConfig {
  /** 信封底图（完全展开状态的底层图） */
  backgroundImage?: string;
  /** 信封左开口外页图（正面） */
  envelopeLeftOpeningImage?: string;
  /** 信封左开口内页图（反面） */
  envelopeLeftInnerImage?: string;
  /** 信封右开口图 */
  envelopeRightOpeningImage?: string;
  /** 信封内页图（完整邀请函纸张） */
  envelopeInnerImage?: string;
  /** 信封印章图 */
  envelopeSealImage?: string;
  /** 动画持续时间（毫秒，默认 2000） */
  duration?: number;
  /** 延迟时间（毫秒，默认 500） */
  delay?: number;
  /** 缓动函数（默认 ease-in-out） */
  easing?: string;
}

/**
 * 检查信封配置是否完整（是否包含所有必需的6张图片）
 */
export function isEnvelopeConfigComplete(config?: EnvelopeConfig): boolean {
  if (!config) return false;
  return !!(
    config.backgroundImage &&
    config.envelopeLeftOpeningImage &&
    config.envelopeLeftInnerImage &&
    config.envelopeRightOpeningImage &&
    config.envelopeInnerImage &&
    config.envelopeSealImage
  );
}

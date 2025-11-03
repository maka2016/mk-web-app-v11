/**
 * 组件的通用属性
 */

export interface FillEffectItemCommon {
  /** 值 */
  value: string;
  /** 不透明 */
  opacity: number;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
  a: number;
}
export interface GradientPoint {
  rgb: RGB;
  position: number;
}
export interface GradientColors {
  degress: number;
  points: GradientPoint[];
}
export interface FillEffectItemColor extends FillEffectItemCommon {
  /** 纯色 */
  hex: string;
  rgb: RGB;
  type: 'color';
}
export interface FillEffectItemGradient extends FillEffectItemCommon {
  /** 渐变 */
  colors: GradientColors;
  type: 'gradient';
}
export interface FillEffectItemPicture extends FillEffectItemCommon {
  /** 图片 */
  type: 'picture';
}

/** 填充类型 */
export type FillEffectItem =
  | FillEffectItemColor
  | FillEffectItemGradient
  | FillEffectItemPicture;

export interface StrokeEffectItem {
  /** 描边位置 */
  boxSize: 'inner' | 'center' | 'outline';
  /** 值 */
  value: string | number;
  /** 描边颜色 */
  color: string;
  gradient?: GradientColors;
}

export interface ShadowEffectItem {
  /** X偏移 */
  offsetX: number;
  /** Y偏移 */
  offsetY: number;
  /** 模糊 */
  blur: number;
  /** 扩散 */
  spread: number;
  /** 颜色 */
  color: string;
}

export interface WidgetCommonAttrs {
  /** 特效 */
  effects?: {
    /** 选择预设 */
    preset?: Preset;
    /** 填充 */
    fill?: FillEffectItem[];
    /** 描边 */
    stroke?: StrokeEffectItem[];
    /** 阴影 */
    shadow?: ShadowEffectItem[];
  };
  bg?: {
    left: string;
    mid: string;
    right: string;
  };
  link?: {
    enable: boolean;
    type: 'link' | 'page' | 'tel' | 'sms';
    value: string;
  };
}

export interface DisableValues {
  fill?: {
    disable?: boolean;
    disableMultiple?: boolean;
    disableGradient?: boolean;
    opacity?: boolean;
  };
  shadow?: {
    disable?: boolean;
    disableMultiple?: boolean;
    blur?: boolean;
    offsetX?: boolean;
    offsetY?: boolean;
    spread?: boolean;
  };
  stroke?: {
    disable?: boolean;
    disableMultiple?: boolean;
    disableGradient?: boolean;
    boxSize?: boolean;
    value?: boolean;
  };
}

export interface Preset {
  name: string;
  preview: string;
  contentId: string;
}

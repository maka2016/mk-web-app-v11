export interface PictureData {
  version?: number;
  layoutStyle?: React.CSSProperties;
  type: 'image' | 'video' | 'qrcode_link';
  ossPath: string;
  /** 第一张图片 */
  originOssPath: string;
  /** @deprecated */
  lockRatio: string | number;
  lockRatioV2: string | number;
  orgHeight: number;
  orgWidth: number;
  originBaseH: number;
  originBaseW: number;
  runH: number;
  runW: number;
  borderRadius: number;
  flipVertical?: boolean;
  flipHorizontal?: boolean;
  /** @deprecated */
  baseW: number;
  /** @deprecated */
  baseH: number;
  aspectRatio?: string | number;
  // 对于basew,basH的裁剪
  cropData: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  mask?: {
    content: string;
    name: string;
  };
  shadow?: {
    enable: boolean;
    blur: number;
    direction: number;
    color: string;
  };
  // [propsName: string]: any
  description: string;
  fontSize?: number | string;
  textAlign?: string;
  color?: string;
  textDecoration?: string;
  fontStyle?: string;
  textIndent?: number | string;
  fontWeight?: number | string;
  objectPosition: {
    x: number;
    y: number;
    size: string;
  };
  strokeStyle?: {
    value: string;
    type: string;
    color: string;
  };
  filter?: string;
  rotate?: number;
  crop?: boolean;
  /**
   * 自由元素下用户是否可替换
   * @deprecated
   * 废弃字段，统一使用disabledToEdit字段
   */
  focusToEdit?: boolean;
  /** 非自由元素下用户是否不可替换 */
  disabledToEdit?: boolean;
}

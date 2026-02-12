import { VideoBgConfig } from '../VideoBg/types';

export interface PictureData {
  version?: number;
  layoutStyle?: React.CSSProperties;
  type: 'image' | 'video' | 'qrcode_link';
  ossPath: string;
  originBaseH: number;
  originBaseW: number;
  flipVertical?: boolean;
  flipHorizontal?: boolean;
  aspectRatio?: string | number;
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
    // 百分比
    x: number;
    // 百分比
    y: number;
    size: string;
  };
  strokeStyle?: {
    value: string;
    type: string;
    color: string;
    size: number;
    position: {
      x: number;
      y: number;
    };
  };
  filter?: string;
  rotate?: number;
  /** 非自由元素下用户是否不可替换 */
  disabledToEdit?: boolean;
  /** 视频背景配置 */
  videoBgConfig?: VideoBgConfig;
  /** 背景模式：'image' 图片模式，'video' 视频模式 */
  bgMode?: 'image' | 'video';
}

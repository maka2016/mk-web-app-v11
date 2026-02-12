/**
 * 对应 elementRef: MkPicture 的数据结构
 */
export interface MkPictureData {
  maskImage?: string;
  version: number;
  ossPath: string;
  binaryData?: string;
  materialId?: string;
  isDragUpload?: boolean;
  // picid?: string
  orgHeight: number;
  orgWidth: number;
  borderRadius: number;
  flipVertical?: boolean;
  flipHorizontal?: boolean;
  baseW: number;
  baseH: number;
  // 对于basew,basH的裁剪
  cropData: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  mask?: {
    materialId: string;
    content: string;
    name: string;
    type: string;
  };
  shadow?: {
    enable: boolean;
    blur: number;
    direction: number;
    color: string;
  };
  effects?: any;
  // [propsName: string]: any
}

/**
 * 内联字体样式
 */
export interface InlineStyleProps {
  color: string;
  fontSize: number;
  fontWeight: number;
  textDecoration: string;
}

/**
 * 对应 elementRef: MkText 的数据结构
 */
export interface TextProps extends InlineStyleProps {
  /** 文字被编辑输入的次数，通过每一次 onBlur 记录 */
  version?: number;
  textScale?: number;
  useEffectForm?: boolean;
  flowMode?: boolean;
  margin?: string;
  background?: string;
  borderColor?: string;
  borderWidth?: string;
  boxShadow?: string;
  borderStyle?: string;
  border?: string;
  backgroundGroup: {
    type: '3' | '9';
    items: string[];
    layout?: 'column' | 'row';
  };
  borderRadius?: number;
  padding?: string | number;
  originContent: string;
  text: string;
  activiteContainerSelector?: string;
  textCrop: {
    content: string;
    fontFamily: string;
  };
  writingMode: 'horizontal-tb' | 'vertical-rl' | 'vertical-lr';
  colorRaw: {
    colors: string[];
    hex: string;
    rgb: {
      r: number;
      g: number;
      b: number;
      a: number;
    };
  };
  planText: string;
  /** 文字容器的原始宽高 */
  originBoxInfo: {
    width: number;
    height: number;
  };
  lineHeight: number;
  letterSpacing: number;
  listStyle: string;
  fontUrl: string;
  fontFamily: string;
  textDirection: string;
  hasChangedWidth: boolean;
  fontStyle: string;
  textShadowConfig: {
    enable: boolean;
    blur: number;
    direction: number;
    color: string;
  };
  arcRadius?: number;
}

export interface TextState {
  isEditing: boolean;
}

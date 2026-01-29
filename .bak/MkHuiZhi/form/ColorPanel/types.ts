export interface RGB {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface ColorPoint {
  rgb: RGB;
  position: number;
}

export interface Colors {
  degress: number; // 渐变角度 0-360
  points: ColorPoint[]; // 渐变色相关颜色值数据
}

export interface Color {
  colors?: Colors | null; // 渐变颜色数据
  colorRefId?: string; // 颜色引用id
  hex: string; // hex颜色值
  rgb: RGB; // rgb数据对象
  type: string; // 颜色类型"color" | "gradient"，是纯色还是渐变，仅作用于支持渐变的元素
  value: string; // 颜色值，有可能是 hex / rgba() / linear-gradient
  opacity?: number; // 用于特效的不透明度
  elementId: string; // 组件id
  elementRef: string; // 组件类型，比如MkPicture/MkText等
  colorType?: string; // 颜色类型，推荐还是预设
  name?: string; // 颜色名称
}

// 颜色项Props接口
export interface ColorItemProps {
  /** 颜色对象 */
  color: string;
  /** 是否激活状态 */
  isActive: boolean;
  /** 点击回调 */
  onClick?: (color: string) => void;
  /** 自定义样式 */
}

// 颜色列表Props接口
export interface ColorItemsProps {
  /** 颜色列表 */
  colorList: string[];
  /** 当前选中的颜色 */
  selectedColor?: string;
  /** 点击回调 */
  onClick: (color: string) => void;
}

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

// 颜色选择器变更值接口
export interface ColorPickerChangeValue {
  colors: Colors | null;
  type: 'color' | 'gradient';
  hex: string;
  rgb?: RGB;
  value: string;
  valueRgba?: string;
  colorRefId?: string;
  opacity?: number;
}

// 主题颜色类型
export interface ThemeColorType {
  colorId: string;
  tag: 'primary' | 'custom' | 'secondary';
  type: 'color' | 'gradient';
  name: string;
  value: string;
}

// 颜色选择器主要Props接口
export interface ColorPickerProps {
  /** 当前选中的颜色值，支持string（包括JSON.stringify后的值） */
  value: string;
  /** 颜色变更回调 */
  onChange: (value?: ColorPickerChangeValue) => void;
  /** 是否禁用渐变功能 */
  disableGradient?: boolean;
  /** 是否禁用透明度 */
  disableAlpha?: boolean;
  /** 是否禁用图片功能 */
  disablePicture?: boolean;
  /** 是否使用主题颜色 */
  useThemeColor?: boolean;
  /** 主题颜色列表 */
  themeColors?: ThemeColorType[];
  /** 自定义类名 */
  className?: string;
  /** 是否显示清除按钮 */
  showRemoveButton?: boolean;
  /** 清除按钮文字 */
  removeButtonText?: string;
  /** 清除颜色回调 */
  onRemove?: () => void;
  /** 自定义触发器包装器 */
  wrapper?: (children: React.ReactNode) => React.ReactNode;
}

// 颜色面板Props接口
export interface ColorPanelProps {
  /** 当前选中的颜色值，支持string（包括JSON.stringify后的值） */
  value: string;
  /** 颜色变更回调 */
  onChange: (value: ColorPickerChangeValue) => void;
  /** 是否禁用渐变功能 */
  disableGradient?: boolean;
  /** 是否禁用透明度 */
  disableAlpha?: boolean;
  /** 主题颜色列表 */
  /** 自定义类名 */
  className?: string;
}

// 颜色项Props接口
export interface ColorItemProps {
  /** 颜色对象 */
  color: Color;
  /** 是否激活状态 */
  isActive: boolean;
  /** 点击回调 */
  onClick?: (color: Color) => void;
  /** 自定义样式 */
  itemStyle?: React.CSSProperties;
}

// 颜色列表Props接口
export interface ColorItemsProps {
  /** 颜色列表 */
  colorList: Color[];
  /** 当前选中的颜色 */
  selectedColor?: Color;
  /** 点击回调 */
  onClick: (color: Color) => void;
  /** 自定义样式 */
  itemStyle?: React.CSSProperties;
}

export interface FormItemCommon {
  /** id */
  id: string;
  /** 是否必填 */
  required?: boolean;
  /** 表单 label */
  label?: string;
  /** 描述 */
  desc?: string;
  /** 多项按FormValueSeparator分割 */
  value?: string;
}

/**
 * 选择器基类
 */
export interface FormItemSelector<T = EnumOptionItem> {
  /** 选项 */
  options: T[];
  /** 每行展示N项 */
  columnCount: number;
}

/**
 * 枚举类型
 */
export type EnumOptionItem = {
  /** 类型 */
  type: 'text' | 'picture' | 'other';
  /** label */
  label: string;
  /** if type === picture 时需要 */
  url?: string;
  /** if type === other 时需要 */
  otherVal?: string;
};

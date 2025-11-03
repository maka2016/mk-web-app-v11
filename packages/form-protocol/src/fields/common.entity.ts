export class FormItemCommon {
  /** id */
  id!: string;
  /** 约束用户必填是否必填 */
  required?: boolean;
  /** 表单 label */
  label?: string;
  title?: string;
  /** 描述 */
  desc?: string;
  /** 值 */
  value?: any;
  /** 校验规则 */
  validate?: string;
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * 选择器基类
 */
export class FormItemSelector<T = EnumOptionItem> extends FormItemCommon {
  /** 选项 */
  options!: T[];
  /** 每行展示N项 */
  columnCount!: number;
}

/**
 * 枚举类型
 */
export type EnumOptionItem = {
  /** 类型 */
  type: 'text' | 'picture' | 'other';
  /** label */
  label: string;
  name: string;
  /** if type === picture 时需要 */
  url?: string;
  /** if type === other 时需要 */
  otherVal?: string;
};

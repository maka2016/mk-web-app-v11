/**
 * 模版表单字段类型
 */
export type TemplateFormFieldType =
  | 'text'
  | 'textarea'
  | 'date'
  | 'number'
  | 'list';

/**
 * 列表项内的字段定义（只支持文本类型）
 */
export interface ListItemField {
  key: string; // 字段标识
  label: string; // 字段标签
  type: 'text' | 'textarea'; // 字段类型（列表项内只支持文本）
  required: boolean; // 是否必填
  placeholder?: string; // 占位符
  description?: string; // 字段说明
  defaultValue?: string; // 从模版中提取的默认值
}

/**
 * 列表表单字段定义
 */
export interface ListFormField {
  key: string; // 列表字段标识
  label: string; // 列表标签
  type: 'list'; // 固定为 'list'
  required: boolean; // 是否必填
  description?: string; // 列表说明
  itemFields: ListItemField[]; // 列表项内的字段数组
  defaultItemCount: number; // 默认列表项数量
  minItems?: number; // 最小列表项数量（默认1）
  maxItems?: number; // 最大列表项数量（可选）
}

/**
 * 模版表单字段定义
 */
export interface TemplateFormField {
  key: string; // 字段标识
  label: string; // 字段标签
  type: TemplateFormFieldType; // 字段类型
  required: boolean; // 是否必填
  placeholder?: string; // 占位符
  description?: string; // 字段说明
  defaultValue?: string | number; // 从模版中提取的默认值
  // 列表类型字段的额外属性
  itemFields?: ListItemField[]; // 列表项内的字段数组（当type为'list'时）
  defaultItemCount?: number; // 默认列表项数量（当type为'list'时）
  minItems?: number; // 最小列表项数量（当type为'list'时）
  maxItems?: number; // 最大列表项数量（当type为'list'时）
  defaultItems?: Array<Record<string, string>>; // 每个列表项的默认值（当type为'list'时）
}

/**
 * 列表项数据
 */
export interface ListItemData {
  [fieldKey: string]: string | undefined;
}

/**
 * 表单数据（键值对）
 * 普通字段：string | number | undefined
 * 列表字段：Array<ListItemData>
 */
export interface TemplateFormData {
  [key: string]: string | number | undefined | Array<ListItemData>;
}

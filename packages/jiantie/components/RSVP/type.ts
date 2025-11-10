import {
  Prisma,
  RsvpFormConfigEntity,
} from '@workspace/database/generated/client';

export interface RSVPAttrs {
  formConfigId: string;
  /** 用于校准表单关联的作品id，如果作品是从别的作品复制来的，attrs.worksId与作品id不一致时，需要重新创建自身的表单配置，并且正确关联到作品 */
  worksId: string;
  /** 主题设置 */
  theme?: RSVPTheme;
}

export type FieldType = 'text' | 'radio' | 'checkbox' | 'guest_count';

export interface RSVPFieldOption {
  label: string;
  value: string;
}

export interface RSVPField {
  id: string;
  type: FieldType;
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: RSVPFieldOption[]; // for radio/checkbox
  defaultValue?: any;
  splitAdultChild?: boolean; // for guest_count: 是否划分大人和小孩
  enabled?: boolean; // 是否开启该字段
  isSystem?: boolean; // 是否为系统字段（系统字段不允许删除）
}

/**
 * RSVP 表单字段的数据结构定义
 * 这个类型明确描述了 form_fields 在数据库中的 JSON 结构
 */
export interface RSVPFormFields {
  fields: RSVPField[];
}

/**
 * 类型安全的 form_fields 解析函数
 * 从 Prisma.JsonValue 安全地解析为 RSVPFormFields
 * 避免 "excessively deep and possibly infinite" 类型推断错误
 *
 * 关键点：函数参数接受 any 类型，避免在调用处触发深度类型推断
 */
export function parseRSVPFormFields(jsonValue: any): RSVPField[] {
  // 进行运行时类型检查
  if (
    jsonValue &&
    typeof jsonValue === 'object' &&
    jsonValue !== null &&
    'fields' in jsonValue &&
    Array.isArray(jsonValue.fields)
  ) {
    return jsonValue.fields as RSVPField[];
  }

  return [];
}

/**
 * 将 RSVPFormFields 转换为 Prisma.JsonValue
 * 用于保存到数据库
 */
export function toRSVPFormFieldsJson(
  fields: RSVPField[]
): Prisma.InputJsonValue {
  return {
    fields,
  } as unknown as Prisma.InputJsonValue;
}

/**
 * 获取默认的表单字段
 */
export function getDefaultFields(): RSVPField[] {
  return [
    {
      id: 'guest_count',
      type: 'guest_count',
      label: '访客',
      required: true,
      enabled: true,
      splitAdultChild: false,
      isSystem: true, // 系统字段，不允许删除
    },
    {
      id: 'phone',
      type: 'text',
      label: '手机',
      required: false,
      enabled: true,
      placeholder: '请输入手机号码',
      isSystem: true, // 系统字段，不允许删除
    },
    {
      id: 'email',
      type: 'text',
      label: 'email',
      required: false,
      enabled: false,
      placeholder: '请输入邮箱地址',
      isSystem: true, // 系统字段，不允许删除
    },
    {
      id: 'remark',
      type: 'text',
      label: '留言备注',
      required: false,
      enabled: false,
      placeholder: '请输入留言备注',
      isSystem: true, // 系统字段，不允许删除
    },
  ];
}

export interface RsvpFormConfigEntityForUi
  extends Partial<
    Omit<
      RsvpFormConfigEntity,
      'form_fields' | 'create_time' | 'update_time' | 'submit_deadline'
    >
  > {
  form_fields: RSVPFormFields;
  submit_deadline: string | null;
  collect_form?: boolean; // 是否收集表单
}

/**
 * RSVP 主题设置
 */
export interface RSVPTheme {
  // 背景相关
  backgroundColor?: string; // 表单背景颜色
  borderRadius?: number; // 圆角大小（px）
  borderColor?: string; // 边框颜色
  borderWidth?: number; // 边框宽度（px）
  boxShadow?: string; // 阴影
  backdropFilter?: string; // 背景虚化（完整的 backdrop-filter 值，如 "blur(16px) saturate(180%)"）
  controlFontSize?: number; // 控件字体大小（px）
  controlPadding?: number; // 控件内间距（px）

  // 按钮相关
  primaryButtonColor?: string; // 主要按钮背景色（参加、确认按钮）
  primaryButtonTextColor?: string; // 主要按钮文字颜色
  secondaryButtonColor?: string; // 次要按钮背景色（不参加按钮）
  secondaryButtonTextColor?: string; // 次要按钮文字颜色
  secondaryButtonBorderColor?: string; // 次要按钮边框颜色

  // 输入框相关
  inputBackgroundColor?: string; // 输入框背景颜色
  inputBorderColor?: string; // 输入框边框颜色
  inputTextColor?: string; // 输入框文字颜色
  inputPlaceholderColor?: string; // 输入框占位符颜色

  // 文字相关
  textColor?: string; // 主要文字颜色
  labelColor?: string; // 标签文字颜色
}

/**
 * 默认主题设置
 */
export const DEFAULT_RSVP_THEME: RSVPTheme = {
  backgroundColor: '#ffffff',
  borderRadius: 14,
  borderColor: '#e5e7ec',
  borderWidth: 1,
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  backdropFilter: 'none',
  controlFontSize: 14,
  controlPadding: 12,
  primaryButtonColor: '#09090B',
  primaryButtonTextColor: '#ffffff',
  secondaryButtonColor: '#ffffff',
  secondaryButtonTextColor: '#09090B',
  secondaryButtonBorderColor: '#09090B',
  inputBackgroundColor: '#f9fafb',
  inputBorderColor: '#f3f4f6',
  inputTextColor: '#09090B',
  inputPlaceholderColor: '#9ca3af',
  textColor: '#09090B',
  labelColor: '#4b5563',
};

/**
 * 预设配色方案
 */
export const RSVP_THEME_PRESETS: Record<string, RSVPTheme> = {
  white: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderColor: '#e5e7ec',
    borderWidth: 1,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    backdropFilter: 'none',
    controlFontSize: 14,
    controlPadding: 12,
    primaryButtonColor: '#09090B',
    primaryButtonTextColor: '#ffffff',
    secondaryButtonColor: '#ffffff',
    secondaryButtonTextColor: '#09090B',
    secondaryButtonBorderColor: '#09090B',
    inputBackgroundColor: '#f9fafb',
    inputBorderColor: '#f3f4f6',
    inputTextColor: '#09090B',
    inputPlaceholderColor: '#9ca3af',
    textColor: '#09090B',
    labelColor: '#4b5563',
  },
  glass: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 20,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    boxShadow:
      '0 4px 20px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(0, 0, 0, 0.04)',
    backdropFilter: 'blur(16px) saturate(180%)',
    controlFontSize: 14,
    controlPadding: 12,
    primaryButtonColor: 'rgba(0, 122, 255, 0.9)',
    primaryButtonTextColor: '#ffffff',
    secondaryButtonColor: 'rgba(255, 255, 255, 0.5)',
    secondaryButtonTextColor: '#1d1d1f',
    secondaryButtonBorderColor: 'rgba(0, 0, 0, 0.1)',
    inputBackgroundColor: 'rgba(255, 255, 255, 0.65)',
    inputBorderColor: 'rgba(0, 0, 0, 0.08)',
    inputTextColor: '#1d1d1f',
    inputPlaceholderColor: 'rgba(0, 0, 0, 0.4)',
    textColor: '#1d1d1f',
    labelColor: 'rgba(0, 0, 0, 0.6)',
  },
  black: {
    backgroundColor: '#09090B',
    borderRadius: 14,
    borderColor: '#27272a',
    borderWidth: 1,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
    backdropFilter: 'none',
    controlFontSize: 14,
    controlPadding: 12,
    primaryButtonColor: '#ffffff',
    primaryButtonTextColor: '#09090B',
    secondaryButtonColor: '#27272a',
    secondaryButtonTextColor: '#ffffff',
    secondaryButtonBorderColor: '#ffffff',
    inputBackgroundColor: '#18181b',
    inputBorderColor: '#27272a',
    inputTextColor: '#ffffff',
    inputPlaceholderColor: '#71717a',
    textColor: '#ffffff',
    labelColor: '#a1a1aa',
  },
};

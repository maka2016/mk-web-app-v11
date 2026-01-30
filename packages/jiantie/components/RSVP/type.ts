import {
  Prisma,
  RsvpFormConfigEntity,
} from '@mk/jiantie/v11-database/generated/client/client';

export type RSVPDisplayMode = 'canvas_trigger' | 'inline';

export const DEFAULT_RSVP_DISPLAY_MODE: RSVPDisplayMode = 'canvas_trigger';
/** 旧组件在 attrs 中没有 displayMode 时的回退显示模式 */
export const LEGACY_RSVP_DISPLAY_MODE: RSVPDisplayMode = 'inline';

export interface RSVPAttrs {
  /** RSVP表单配置ID（可选，如果不提供则通过worksId查询） */
  formConfigId?: string;
  /**
   * 关联的作品ID（可选，如果不提供则从当前页面获取）
   * 注意：RSVP配置现在直接关联到作品，不再依赖画布数据
   * 如果作品是从别的作品复制来的，系统会自动为当前作品创建新的RSVP配置
   */
  worksId?: string;
  /** 主题设置 */
  theme?: RSVPTheme;
  /**
   * 表单呈现模式：
   * - canvas_trigger：以画布触发按钮形式浮层展示
   * - inline：直接在画布内嵌展示
   */
  displayMode?: RSVPDisplayMode;
}

export type FieldType =
  | 'text'
  | 'radio'
  | 'checkbox'
  | 'guest_count'
  | 'address'
  | 'attachment';

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
  /** 附件字段：最大文件数量 */
  maxFiles?: number;
  /** 附件字段：单个文件最大大小（MB） */
  maxSizeMB?: number;
  /** 附件字段：允许的 MIME 类型，例如 ['image/*', 'application/pdf'] */
  accept?: string[];
}

/**
 * RSVP 提交数据中的附件项
 */
export interface RSVPAttachmentItem {
  url: string; // OSS 中的访问路径（相对或绝对）
  name: string; // 显示给用户的文件名
  size: number; // 文件大小（字节）
  mimeType?: string; // MIME 类型
}

/**
 * RSVP 表单字段的数据结构定义
 * 这个类型明确描述了 form_fields 在数据库中的 JSON 结构
 */
export interface RSVPFormFields {
  fields: RSVPField[];
}

/**
 * 提交成功反馈配置
 */
export interface RSVPSuccessFeedbackConfig {
  success_message?: string | null; // 提交成功提示文字
  success_image?: string | null; // 提交成功提示图片URL
  enable_image?: boolean; // 是否启用提示图片
}

/**
 * 模版RSVP配置（用于TemplateEntity.rsvp_config字段）
 * 参考RsvpFormConfigEntity的字段，但排除动态字段（如id、works_id、create_time等）
 */
export interface TemplateRsvpConfig {
  title: string; // 表单标题
  desc?: string | null; // 表单描述
  form_fields: RSVPFormFields; // 表单字段配置
  success_feedback_config?: RSVPSuccessFeedbackConfig | null; // 提交成功反馈配置
  enabled?: boolean; // 是否启用（默认false）
  collect_form?: boolean; // 是否收集表单信息（默认false）
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
  data: RSVPField[] | RSVPFormFields
): Prisma.InputJsonValue {
  // 如果传入的是数组，转换为对象格式
  if (Array.isArray(data)) {
    return {
      fields: data,
    } as unknown as Prisma.InputJsonValue;
  }
  // 如果传入的是对象，直接返回
  return data as unknown as Prisma.InputJsonValue;
}

/**
 * 将 RSVPSuccessFeedbackConfig 转换为 Prisma.JsonValue
 * 用于保存到数据库
 */
export function toRSVPSuccessFeedbackConfigJson(
  config: RSVPSuccessFeedbackConfig | null | undefined
): Prisma.InputJsonValue | null {
  if (!config) return null;
  return config as unknown as Prisma.InputJsonValue;
}

/**
 * 从 Prisma.JsonValue 解析 RSVPSuccessFeedbackConfig
 */
export function parseRSVPSuccessFeedbackConfig(
  jsonValue: any
): RSVPSuccessFeedbackConfig | null {
  if (!jsonValue || typeof jsonValue !== 'object') {
    return null;
  }
  return {
    success_message: jsonValue.success_message ?? null,
    success_image: jsonValue.success_image ?? null,
    enable_image: jsonValue.enable_image ?? true, // 默认启用
  };
}

/**
 * 获取默认的表单字段
 */
export function getDefaultFields(): RSVPField[] {
  return [
    {
      id: 'name',
      type: 'text',
      label: '姓名',
      required: true,
      enabled: true,
      placeholder: '请输入您的姓名',
      isSystem: true, // 系统字段，不允许删除
    },
    {
      id: 'phone',
      type: 'text',
      label: '手机号',
      required: false,
      enabled: true,
      placeholder: '请输入手机号码',
      isSystem: true, // 系统字段，不允许删除
    },
    {
      id: 'email',
      type: 'text',
      label: '电子邮箱',
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
    {
      id: 'ask_will_attend',
      type: 'radio',
      label: '是否出席',
      required: false,
      enabled: false, // 默认不开启
      options: [
        { label: '出席', value: 'true' },
        { label: '不出席', value: 'false' },
      ],
      isSystem: true, // 系统字段，不允许删除
    },
    {
      id: 'guest_count',
      type: 'guest_count',
      label: '出席人数',
      required: false,
      enabled: false,
      splitAdultChild: false,
      isSystem: true, // 系统字段，不允许删除
    },
    {
      id: 'address',
      type: 'address',
      label: '地址选择',
      required: false,
      enabled: false,
      placeholder: '请输入地址',
      isSystem: true, // 系统字段，不允许删除
    },
    {
      id: 'attachment',
      type: 'attachment',
      label: '上传附件',
      required: false,
      enabled: false,
      isSystem: true, // 系统字段，不允许删除
      maxFiles: 3,
      maxSizeMB: 10,
      accept: ['image/*', 'application/pdf'],
    },
  ];
}

export interface RsvpFormConfigEntityForUi
  extends Partial<
    Omit<
      RsvpFormConfigEntity,
      | 'form_fields'
      | 'success_feedback_config'
      | 'create_time'
      | 'update_time'
      | 'submit_deadline'
    >
  > {
  form_fields: RSVPFormFields;
  submit_deadline: string | null;
  collect_form?: boolean; // 是否收集表单
  ask_will_attend?: boolean; // 是否询问是否出席
  success_feedback_config?: RSVPSuccessFeedbackConfig | null; // 提交成功反馈配置
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
  headerPadding?: string; // 头部垂直方向内间距（px）
  contentPadding?: string; // 内容区域内间距（px）

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
  headerPadding: '8 16',
  contentPadding: '16',
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
    headerPadding: '8 16',
    contentPadding: '16',
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
    headerPadding: '8 16',
    contentPadding: '16',
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
    headerPadding: '8 16',
    contentPadding: '16',
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

/**
 * RSVP 提交数据中的系统字段
 */
export interface RSVPSubmissionSystemFields {
  _inviteeInfo?: {
    isGuest: false;
    inviteeName: string;
    inviteeEmail?: string;
    inviteePhone?: string;
  };
  _guestInfo?: {
    isGuest: true;
    guestName: string;
  };
}

/**
 * RSVP 提交记录
 */
export interface RSVPSubmission {
  id: string;
  form_config_id: string;
  contact_id: string;
  submission_group_id: string;
  will_attend: boolean;
  submission_data: Record<string, any> & RSVPSubmissionSystemFields;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_time: string | null;
  reject_reason: string | null;
  changed_fields: Record<string, any> | null;
  operator_type: string | null;
  operator_id: string | null;
  operator_name: string | null;
  remark: string | null;
  deleted: boolean;
  create_time: string;
}

/**
 * getInviteeSubmissions 返回类型
 */
export interface RSVPInviteeSubmissionsResponse {
  result: {
    data: RSVPSubmission[];
  };
}

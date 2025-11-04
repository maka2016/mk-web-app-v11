import {
  Prisma,
  RsvpFormConfigEntity,
} from '@workspace/database/generated/client';

export interface RSVPAttrs {
  formConfigId: string;
  /** 用于校准表单关联的作品id，如果作品是从别的作品复制来的，attrs.worksId与作品id不一致时，需要重新创建自身的表单配置，并且正确关联到作品 */
  worksId: string;
}

export type FieldType = 'text' | 'number' | 'textarea' | 'radio' | 'checkbox';

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

export interface RsvpFormConfigEntityForUi
  extends Partial<
    Omit<
      RsvpFormConfigEntity,
      'form_fields' | 'create_time' | 'update_time' | 'submit_deadline'
    >
  > {
  form_fields: RSVPFormFields;
  submit_deadline: string | null;
}

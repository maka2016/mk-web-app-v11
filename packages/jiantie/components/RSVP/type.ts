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

export interface RsvpFormConfigEntity {
  id: string;
  works_id: string;
  title: string;
  desc?: string | null;
  form_fields: { fields: RSVPField[] } | null;
  allow_multiple_submit?: boolean | null;
  require_approval?: boolean | null;
  max_submit_count?: number | null;
  submit_deadline?: string | Date | null;
  enabled?: boolean | null;
}

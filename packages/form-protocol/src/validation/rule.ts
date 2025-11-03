import { FormFieldItem } from '../form';

export interface RuleItem {
  required: boolean;
  validateRule: string;
}

export type FieldInputRuleMap = Record<string, RuleItem>;

/**
 * 从 form meta 数据中提取输入规则
 */
export const takeInputRuleFromFormMeta = (formFields: FormFieldItem[]) => {
  const res: FieldInputRuleMap = {};
  formFields.forEach(field => {
    res[field.type] = {
      required: field.required as any,
      validateRule: field.validate as any,
    };
  });
  return res;
};

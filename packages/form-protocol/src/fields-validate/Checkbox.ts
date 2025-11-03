import { EnumOptionItem, FormItemSelector } from './common';

export type CheckboxOption = EnumOptionItem;

export interface FormFieldCheckbox extends FormItemSelector<CheckboxOption> {
  type: 'Checkbox';
}

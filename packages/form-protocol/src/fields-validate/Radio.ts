import { EnumOptionItem, FormItemSelector } from './common';

export type RadioOption = EnumOptionItem;

export interface FormFieldRadio extends FormItemSelector<RadioOption> {
  type: 'Radio';
}

import { FormItemCommon } from './common';

export interface FormFieldInput extends FormItemCommon {
  type: 'Input';
  inputType: 'string' | 'number';
  placeholder?: string;
  validate?: 'phone' | 'email';
}

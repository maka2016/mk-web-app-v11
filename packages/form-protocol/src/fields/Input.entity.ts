import { FormItemCommon } from './common.entity';

export class FormFieldInput extends FormItemCommon {
  type!: 'Input';
  inputType!: 'string' | 'number';
  placeholder?: string;
  validate?: 'phone' | 'email';
}

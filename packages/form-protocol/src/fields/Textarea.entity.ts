import { FormItemCommon } from './common.entity';

export class FormFieldTextarea extends FormItemCommon {
  type!: 'Textarea';
  placeholder?: string;
}

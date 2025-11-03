import { EnumOptionItem, FormItemSelector } from './common.entity';

export type RadioOption = EnumOptionItem;

export class FormFieldRadio extends FormItemSelector<RadioOption> {
  type!: 'Radio';
}

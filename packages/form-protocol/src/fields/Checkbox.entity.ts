import { EnumOptionItem, FormItemSelector } from './common.entity';

export type CheckboxOption = EnumOptionItem;

export class FormFieldCheckbox extends FormItemSelector<CheckboxOption> {
  type!: 'Checkbox';
}

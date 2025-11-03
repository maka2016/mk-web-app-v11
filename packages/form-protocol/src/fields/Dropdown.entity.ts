import { FormItemCommon } from './common.entity';

export class DropdownOption {
  type!: 'text';
  label!: string;
}

export class FormFieldDropdown extends FormItemCommon {
  type!: 'Dropdown';
  options!: DropdownOption[];
}

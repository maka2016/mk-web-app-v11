import { FormItemCommon } from './common';

export interface DropdownOption {
  type: 'text';
  label: string;
}

export interface FormFieldDropdown extends FormItemCommon {
  type: 'Dropdown';
  options: DropdownOption[];
}

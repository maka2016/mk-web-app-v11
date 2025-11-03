import { FormItemCommon } from './common';

export interface FormFieldAddress extends FormItemCommon {
  type: 'Address';
  province: string;
  city: string;
  county: string;
  detailAddress?: string;
}

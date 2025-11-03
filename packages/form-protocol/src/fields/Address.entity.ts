import { FormItemCommon } from './common.entity';

export class FormFieldAddress extends FormItemCommon {
  type!: 'Address';
  province!: string;
  city!: string;
  county!: string;
  detailAddress?: string;
}

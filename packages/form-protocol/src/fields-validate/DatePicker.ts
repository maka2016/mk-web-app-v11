import { FormItemCommon } from './common';

export interface FormFieldDatePicker extends FormItemCommon {
  type: 'DatePicker';
  // ms时间戳,-1为没有
  rangeStart?: number;
  // ms时间戳,-1为没有
  rangeEnd?: number;
  /** 是否启用开始时间 */
  enableStart?: boolean;
  /** 是否启用结束时间 */
  enableEnd?: boolean;
}

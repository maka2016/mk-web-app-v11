/**
 * 检查表单 metadata 是否合规
 */

import { FormDataProtocol } from '../form';

export const checkFormMetadata = (formData: FormDataProtocol) => {
  return formData.fields && Array.isArray(formData.fields);
};

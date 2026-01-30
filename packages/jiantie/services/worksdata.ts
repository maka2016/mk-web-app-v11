import { API } from '@/services';
import request from './request';

/**
 * 导出表单数据
 * @param formId
 * @returns
 */
export const exportSubmitData = (formId: string) => {
  return request.get(
    `${API('表单API')}/form-report/v1/export-submit-data/${formId}`
  );
};

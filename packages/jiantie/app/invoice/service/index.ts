import { API } from '@/services';

export const InvoiceServerAPI = () => {
  return API('主服务API');
};

export interface APIResponse<T> {
  code: number | 200;
  data?: T;
  message: string;
  success: boolean;
}

export interface Pagination {
  page: number;
  pageSize: number;
}

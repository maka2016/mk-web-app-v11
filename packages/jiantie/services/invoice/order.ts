import { request } from './request';
import { APIResponse, InvoiceServerAPI, Pagination } from '.';
import { getUid } from './request';
import { Order } from '@/types/invoice/order';

// 每次请求最多给20条数据
export const getOrderList = (
  page: number = 1
): Promise<
  APIResponse<{
    dataList: Order[];
    meta: {
      page: number;
      pageCount: number;
      pageSize: number;
      total: number;
    };
    pageNumber: number;
    perPage: number;
  }>
> => {
  return request.get(
    `${InvoiceServerAPI()}/api/plat/v1/users/${getUid()}/orders?page=${page}`
  );
};

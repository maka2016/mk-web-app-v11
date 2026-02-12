import { Order } from '@/app/invoice/types/order';
import { APIResponse, InvoiceServerAPI } from '.';
import { getUid, request } from './request';

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

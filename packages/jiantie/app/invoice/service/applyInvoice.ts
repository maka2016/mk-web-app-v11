import {
  AddApplyInvoiceInfo,
  ApplyInvoiceInfo,
  Order,
  UpdateApplyInvoiceInfo,
} from '@/app/invoice/types/order';
import { APIResponse, InvoiceServerAPI } from '.';
import request, { getUid } from './request';

export const applyInvoice = (
  data: AddApplyInvoiceInfo
): Promise<APIResponse<any>> => {
  return request.post(
    `${InvoiceServerAPI()}/api/plat/v1/users/${getUid()}/invoices`,
    data
  );
};

export const getApplyInvoiceInfo = (
  id: number
): Promise<APIResponse<ApplyInvoiceInfo>> => {
  return request.get(
    `${InvoiceServerAPI()}/api/plat/v1/users/${getUid()}/invoices/${id}?deliver_type=electron&invoice_type=1`
  );
};

/** 获取开票记录关联订单 */
export const getApplyInvoiceInfoOrders = (
  id: number
): Promise<APIResponse<Order[]>> => {
  return request.get(
    `${InvoiceServerAPI()}/api/plat/v1/users/${getUid()}/invoices/order/${id}`
  );
};

export const updateApplyInvoiceInfo = (
  data: UpdateApplyInvoiceInfo
): Promise<APIResponse<ApplyInvoiceInfo>> => {
  return request.put(
    `${InvoiceServerAPI()}/api/plat/v1/users/${getUid()}/invoices/${data.id}`,
    data
  );
};

export const getApplyInvoiceList = (
  page: number = 1
): Promise<APIResponse<ApplyInvoiceInfo[]>> => {
  return request.get(
    `${InvoiceServerAPI()}/api/plat/v1/users/${getUid()}/invoices?page=${page}`
  );
};

export const getApplyInvoiceListPageNum = (): Promise<
  APIResponse<{ page_num: number }>
> => {
  return request.get(
    `${InvoiceServerAPI()}/api/plat/v1/users/${getUid()}/invoices_page`
  );
};

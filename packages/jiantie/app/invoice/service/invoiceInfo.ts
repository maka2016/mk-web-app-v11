import {
  AddInvoiceInfo,
  InvoiceInfo,
  UpdateInvoiceInfo,
} from '@/app/invoice/types';
import { APIResponse, InvoiceServerAPI } from '.';
import { getUid, request } from './request';

export const addInvoiceInfo = (
  data: AddInvoiceInfo
): Promise<APIResponse<InvoiceInfo>> => {
  return request.post(
    `${InvoiceServerAPI()}/api/plat/v1/users/${getUid()}/user_invoices`,
    data
  );
};

export const updateInvoiceInfo = (
  data: UpdateInvoiceInfo
): Promise<APIResponse<InvoiceInfo>> => {
  return request.put(
    `${InvoiceServerAPI()}/api/plat/v1/users/${getUid()}/user_invoices/${data.id}`,
    data
  );
};

export const getInvoiceInfo = (
  id: number
): Promise<APIResponse<InvoiceInfo>> => {
  return request.get(
    `${InvoiceServerAPI()}/api/plat/v1/users/${getUid()}/user_invoices/${id}`
  );
};

// 每次请求最多给20条数据
export const getInvoiceInfoList = (
  page: number = 1
): Promise<APIResponse<InvoiceInfo[]>> => {
  return request.get(
    `${InvoiceServerAPI()}/api/plat/v1/users/${getUid()}/user_invoices?page=${page}`
  );
};

export const getInvoiceInfoListPageNum = (): Promise<
  APIResponse<{ page_num: number }>
> => {
  return request.get(
    `${InvoiceServerAPI()}/api/plat/v1/users/${getUid()}/user_invoices_page`
  );
};

export const deleteInvoiceInfo = (
  id: number
): Promise<APIResponse<boolean>> => {
  return request.delete(
    `${InvoiceServerAPI()}/api/plat/v1/users/${getUid()}/user_invoices/${id}`
  );
};

export const invoiceInfoSetDefault = (
  data: InvoiceInfo
): Promise<APIResponse<string>> => {
  return request.put(
    `${InvoiceServerAPI()}/api/plat/v1/users/${getUid()}/user_invoices/list/setdefault/${data.id}`,
    {
      invoice_type: data.invoice_type,
    }
  );
};

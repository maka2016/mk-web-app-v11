export enum InvoiceType {
  /** 普通发票 */
  '普通' = 'common',
  /** 专用发票 */
  '专用' = 'special',
}

export enum UserInvoiceType {
  /** 个人 */
  '个人' = 'person',
  /** 单位 */
  '单位' = 'company',
}

export type ResInvoiceType = InvoiceType | UserInvoiceType;

export enum InvoiceStatus {
  /** 通过 */
  'PASS' = 1,
  /** 待审核 */
  'PROCESS' = 0,
  /** 失败 */
  'REJECT' = -1,

  /** 已删除 */
  'DELETED' = -2,
}

export interface InvoiceInfo {
  id: number;

  /** 发票抬头 */
  invoice_title: string;
  /** 发票类型 */
  invoice_type: ResInvoiceType;

  /** 普通发票类型 */
  user_invoice_type?: UserInvoiceType;

  /** 税号 */
  tax_no: string;

  /** 是否默认，0 或 1 */
  is_default: number;

  /** 状态 */
  status: InvoiceStatus;

  /** 公司注册地址 */
  address?: string;

  /** 公司注册电话 */
  phone?: string;

  /** 开户银行名称 */
  bank_name?: string;

  /** 银行账户 */
  bank_account?: string;

  /** 营业执照 img url */
  business_license?: string;

  /** 纳税人资格证 img url */
  certificate?: string;

  /** 开户许可 img url */
  account_license?: string;

  /** 联系电话 */
  contact?: string;

  /** 联系人 */
  contact_name?: string;

  reason?: string;
}

export interface AddInvoiceInfo
  extends Omit<InvoiceInfo, 'is_default' | 'id' | 'status'> {}

export interface UpdateInvoiceInfo extends Partial<InvoiceInfo> {
  id: number;
}

export const getInvoiceTypeShow = (type: ResInvoiceType) => {
  if (type === InvoiceType.专用) return '专用发票';
  else return '普通发票';
};

export const getUserInvoiceTypeShow = (type: ResInvoiceType) => {
  if (type === UserInvoiceType.单位) return '单位';
  else return '个人';
};

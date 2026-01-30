export interface Order {
  id: string;

  /** 账单id */
  order_id: string;

  /** 事项 */
  type_name: string;

  pay_date: string;

  /** 日期 */
  datetime: string;

  /** 计费，单位 元 */
  amount: number;

  /** 价格 字符串字数，单位 分 */
  price: string;

  /** 是否已开票 */
  is_invoice: boolean;

  /** 是否能够索要发票 */
  can_request_invoice: boolean;

  /** 总价，单位 分 */
  total: string | number;

  name?: string;
}

export enum InvoiceContent {
  '软件服务费' = 'service',

  '软件制作费' = 'development',

  '技术服务费' = 'technique',

  '设计服务费' = 'design',
}

export interface ApplyInvoiceInfo {
  id: number;
  /** 申请发票类型 */
  apply_type: 'common' | 'special';

  /** 发送方式 */
  deliver_type: 'electron';

  /** 申请订单id列表 */

  order_product_id: string[];

  /** 用户发票信息id */
  user_invoice_id: number;

  /** 发票内容 */
  content: InvoiceContent;

  /** 发送邮箱 */
  email: string;

  /** 联系方式，手机号 */
  contact: string;

  /** 联系人 */
  contact_name: string;

  /** 创建时间 */
  created_at?: string;

  status?: ApplyInvoiceInfoStatus;

  /** 发票金额 */
  total?: number;

  /** 原因 */
  reason?: string;
}

export interface UpdateApplyInvoiceInfo extends Partial<ApplyInvoiceInfo> {
  id: number;
}

export interface AddApplyInvoiceInfo
  extends Omit<ApplyInvoiceInfo, 'id' | 'created_at' | 'status' | 'total'> {}

export enum ApplyInvoiceInfoStatus {
  '不通过' = -1,

  '待审核' = 0,

  /** 通过但还没发送 */
  '待发送' = 1,

  '已发送' = 2,
}

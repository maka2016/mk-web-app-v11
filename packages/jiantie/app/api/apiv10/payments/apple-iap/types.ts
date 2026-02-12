/**
 * Apple IAP 支付相关类型定义
 */

/**
 * 订单追踪元数据
 */
export interface OrderTraceMetadata {
  fromWhere?: string;
  forwardModule?: string;
  forwardPageName?: string;
  refPageType?: string;
  refPageId?: string;
  refPageInstId?: string;
  refPageviewEventId?: string;
  refObjectType?: string;
  refObjectId?: string;
  refObjectInstId?: string;
  refEventId?: string;
  workId?: string;
}

/**
 * 订单 UTM 元数据
 */
export interface OrderUtmMetadata {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

/**
 * 订单设备标识
 */
export interface OrderDeviceIdentifiers {
  idfa?: string;
  idfv?: string;
  deviceId?: string;
}

/**
 * 订单扩展信息
 */
export interface OrderExtraInfoDto {
  /** 语言区域，如 zh-CN、en-US */
  locale: string;
  /** 设备类型，如 ios、android */
  device: string;
  /** 应用版本 */
  version?: string;
  /** 包ID，如 com.example.app */
  bundleId?: string;
  /** 客户端 IP */
  ip?: string;
  /** 请求头信息 */
  headerInfo?: string;
  /** 渠道ID */
  channelId?: string;
  /** UTM 元数据 */
  utmMetadata?: OrderUtmMetadata;
  /** 设备标识信息 */
  deviceIdentifiers?: OrderDeviceIdentifiers;
  /** 追踪元数据 */
  traceMetadata?: OrderTraceMetadata;
}

/**
 * Apple IAP 请求体 DTO
 */
export interface AppleIapBodyDto {
  /** Base64 编码的苹果支付凭证 */
  receipt: string;
  /** 用户ID */
  uid: number;
  /** 应用ID，如 jiantie、maka */
  traceMetadata: OrderTraceMetadata;
}

/**
 * 苹果 Receipt 验证响应中的 in_app 项
 */
export interface AppleReceiptInAppItem {
  quantity: string;
  product_id: string;
  transaction_id: string;
  original_transaction_id: string;
  purchase_date: string;
  purchase_date_ms: string;
  purchase_date_pst: string;
  original_purchase_date: string;
  original_purchase_date_ms: string;
  original_purchase_date_pst: string;
  expires_date?: string;
  expires_date_ms?: string;
  expires_date_pst?: string;
  is_trial_period?: string;
  is_in_intro_offer_period?: string;
  cancellation_date?: string;
  cancellation_date_ms?: string;
  cancellation_reason?: string;
}

/**
 * 苹果 Receipt 验证响应
 */
export interface AppleReceiptVerifyResponse {
  status: number;
  environment?: 'Sandbox' | 'Production';
  receipt?: {
    bundle_id: string;
    application_version: string;
    receipt_creation_date: string;
    receipt_creation_date_ms: string;
    in_app: AppleReceiptInAppItem[];
  };
  latest_receipt_info?: AppleReceiptInAppItem[];
  pending_renewal_info?: Array<{
    auto_renew_product_id: string;
    auto_renew_status: string;
    original_transaction_id: string;
  }>;
  'is-retryable'?: boolean;
}

/**
 * Apple IAP 处理结果
 */
export interface AppleIapResult {
  success: boolean;
  message: string;
  data?: {
    order_no: string;
    transaction_id: string;
    product_id: string;
    amount: number;
    currency: string;
    shipped: boolean;
  };
  error?: string;
}

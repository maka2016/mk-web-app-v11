/**
 * Apple IAP 支付工具函数
 */

import type { Prisma, Product } from '@mk/jiantie/v11-database/generated/client/client';

/**
 * 生成订单号
 * 格式: A{时间戳}{随机数} (总长度不超过 30 个字符)
 * A 前缀表示 Apple IAP 订单
 */
export function generateOrderNo(): string {
  const timestamp = Date.now().toString(36).toUpperCase(); // 时间戳转 36 进制
  const random = Math.random().toString(36).substring(2, 8).toUpperCase(); // 6位随机数
  return `A${timestamp}${random}`;
}

/**
 * 通过苹果 product_id 查找商品
 * 在 third_product_meta.appleid 字段中匹配
 *
 * @param prisma Prisma 客户端
 * @param appleProductId 苹果商品 ID
 * @param appid 应用 ID（可选）
 * @returns 商品信息，未找到返回 null
 */
export async function findProductByAppleId(
  prisma: {
    product: {
      findMany: (args: {
        where: {
          appid?: string;
          status: string;
          third_product_meta: { path: string[]; equals: string };
        };
      }) => Promise<Product[]>;
    };
  },
  appleProductId: string,
  appid?: string
): Promise<Product | null> {
  // 使用 Prisma 的 JSON 查询功能
  // third_product_meta 结构: { appleid: "com.xxx.product" }
  const products = await prisma.product.findMany({
    where: {
      ...(appid ? { appid } : {}),
      status: 'active',
      third_product_meta: {
        path: ['appleid'],
        equals: appleProductId,
      },
    },
  });

  if (products.length === 0) {
    return null;
  }

  // 如果找到多个，取第一个（理论上 appleid 应该唯一）
  return products[0];
}

/**
 * 检查交易是否已处理过（幂等检查）
 * 通过 transaction_id 查询 PaymentTokenLog 表
 *
 * @param prisma Prisma 客户端
 * @param transactionId 苹果交易 ID
 * @returns 如果已处理过返回订单号，否则返回 null
 */
export async function checkTransactionProcessed(
  prisma: {
    paymentTokenLog: {
      findFirst: (args: {
        where: {
          payment_method: string;
          token_data: { path: string[]; equals: string };
        };
        select: { order_no: true };
      }) => Promise<{ order_no: string } | null>;
    };
  },
  transactionId: string
): Promise<string | null> {
  const existingLog = await prisma.paymentTokenLog.findFirst({
    where: {
      payment_method: 'apple_iap',
      token_data: {
        path: ['transaction_id'],
        equals: transactionId,
      },
    },
    select: {
      order_no: true,
    },
  });

  return existingLog?.order_no ?? null;
}

/**
 * 构建订单 meta 数据
 */
export function buildOrderMeta(extraInfo: {
  locale?: string;
  device?: string;
  version?: string;
  bundleId?: string;
  ip?: string;
  headerInfo?: string;
  channelId?: string;
  utmMetadata?: Record<string, unknown>;
  deviceIdentifiers?: Record<string, unknown>;
  traceMetadata?: Record<string, unknown>;
}): Prisma.JsonObject {
  return {
    device: extraInfo.device ?? 'ios',
    version: extraInfo.version ?? undefined,
    bundle_id: extraInfo.bundleId ?? undefined,
    ip: extraInfo.ip ?? undefined,
    header_info: extraInfo.headerInfo ?? undefined,
    channel_id: extraInfo.channelId ?? undefined,
    utm_metadata: extraInfo.utmMetadata ?? undefined,
    device_identifiers: extraInfo.deviceIdentifiers ?? undefined,
    trace_metadata: extraInfo.traceMetadata ?? undefined,
    locale: extraInfo.locale ?? 'en-US',
  } as Prisma.JsonObject;
}

/**
 * 验证请求体参数
 */
export function validateAppleIapBody(body: unknown): {
  valid: boolean;
  error?: string;
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: '请求体必须是 JSON 对象' };
  }

  const data = body as Record<string, unknown>;

  // 检查必需字段
  if (!data.receipt || typeof data.receipt !== 'string') {
    return { valid: false, error: 'receipt 不能为空且必须是字符串' };
  }

  if (!data.uid || typeof data.uid !== 'number' || data.uid <= 0) {
    return { valid: false, error: 'uid 必须为正整数' };
  }

  if (!data.appid || typeof data.appid !== 'string') {
    return { valid: false, error: 'appid 不能为空且必须是字符串' };
  }

  // 检查 extraInfo
  if (!data.extraInfo || typeof data.extraInfo !== 'object') {
    return { valid: false, error: 'extraInfo 不能为空且必须是对象' };
  }

  const extraInfo = data.extraInfo as Record<string, unknown>;

  if (!extraInfo.locale || typeof extraInfo.locale !== 'string') {
    return { valid: false, error: 'extraInfo.locale 不能为空' };
  }

  if (!extraInfo.device || typeof extraInfo.device !== 'string') {
    return { valid: false, error: 'extraInfo.device 不能为空' };
  }

  return { valid: true };
}

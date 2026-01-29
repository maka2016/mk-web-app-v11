/**
 * 苹果 IAP Receipt 验证服务
 */

import { log } from '@/server/logger';
import type { AppleReceiptVerifyResponse } from './types';

// 苹果验证服务器地址
const APPLE_VERIFY_URL_PRODUCTION = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_VERIFY_URL_SANDBOX = 'https://sandbox.itunes.apple.com/verifyReceipt';

// Receipt 验证状态码
const APPLE_STATUS = {
  SUCCESS: 0,
  SANDBOX_RECEIPT_ON_PRODUCTION: 21007, // Sandbox 票据发到了生产环境
  PRODUCTION_RECEIPT_ON_SANDBOX: 21008, // 生产票据发到了 Sandbox 环境
} as const;

/**
 * 获取苹果共享密钥
 * 根据 bundleId 返回对应的密钥
 */
function getAppleSharedSecret(bundleId?: string): string {
  // 从环境变量获取对应的共享密钥
  // 支持多应用配置，格式: APPLE_SHARED_SECRET_<BUNDLE_ID_SUFFIX>
  if (bundleId) {
    // 尝试获取特定应用的密钥
    const bundleSuffix = bundleId.split('.').join('_').toUpperCase();
    log.info({ bundleSuffix: bundleSuffix }, 'bundleSuffix--');
    if (bundleSuffix) {
      const specificSecret = process.env[`APPLE_SHARED_SECRET_${bundleSuffix}`];
      if (specificSecret) {
        return specificSecret;
      }
    }
  }

  // 回退到通用密钥
  const defaultSecret = process.env.APPLE_SHARED_SECRET;
  if (!defaultSecret) {
    throw new Error('缺少苹果共享密钥配置 (APPLE_SHARED_SECRET)');
  }
  return defaultSecret;
}

/**
 * 调用苹果服务器验证 Receipt
 */
async function callAppleVerify(
  url: string,
  receiptData: string,
  password: string
): Promise<AppleReceiptVerifyResponse> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      'receipt-data': receiptData,
      password: password,
      'exclude-old-transactions': true, // 只返回最新的交易
    }),
  });

  if (!response.ok) {
    throw new Error(`苹果验证服务器响应错误: ${response.status}`);
  }

  return response.json();
}

/**
 * 验证苹果 IAP Receipt
 * 会先尝试生产环境，如果返回 21007 则自动重试 Sandbox 环境
 *
 * @param receiptData Base64 编码的 receipt 数据
 * @param bundleId 可选的 bundleId，用于获取对应的共享密钥
 * @returns 验证结果
 */
export async function verifyAppleReceipt(
  receiptData: string,
  bundleId?: string
): Promise<{
  success: boolean;
  data?: AppleReceiptVerifyResponse;
  error?: string;
  environment?: 'Production' | 'Sandbox';
}> {
  try {
    log.info({ bundleId: bundleId }, 'bundleId--');
    const password = getAppleSharedSecret(bundleId);

    log.info({ password: password }, 'password--');
    // 先尝试生产环境
    let result = await callAppleVerify(APPLE_VERIFY_URL_PRODUCTION, receiptData, password);

    // 如果是 Sandbox 票据发到了生产环境，自动切换到 Sandbox 验证
    if (result.status === APPLE_STATUS.SANDBOX_RECEIPT_ON_PRODUCTION) {
      console.log('[Apple IAP] 检测到 Sandbox receipt，切换到 Sandbox 环境验证');
      result = await callAppleVerify(APPLE_VERIFY_URL_SANDBOX, receiptData, password);
    }

    // 检查验证状态
    if (result.status !== APPLE_STATUS.SUCCESS) {
      return {
        success: false,
        error: `苹果验证失败，状态码: ${result.status}`,
        data: result,
      };
    }

    return {
      success: true,
      data: result,
      environment: result.environment,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Apple IAP] 验证 receipt 失败:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * 从 Receipt 验证结果中提取最新的交易信息
 * 优先使用 latest_receipt_info，否则使用 receipt.in_app
 */
export function extractLatestTransaction(verifyResult: AppleReceiptVerifyResponse): {
  transaction_id: string;
  original_transaction_id: string;
  product_id: string;
  purchase_date_ms: string;
  expires_date_ms?: string;
  is_trial_period?: boolean;
} | null {
  // 优先使用 latest_receipt_info（订阅类商品会有此字段）
  const transactions = verifyResult.latest_receipt_info || verifyResult.receipt?.in_app || [];

  if (transactions.length === 0) {
    return null;
  }

  // 按购买时间降序排序，取最新的
  const sorted = [...transactions].sort((a, b) => parseInt(b.purchase_date_ms, 10) - parseInt(a.purchase_date_ms, 10));

  const latest = sorted[0];

  return {
    transaction_id: latest.transaction_id,
    original_transaction_id: latest.original_transaction_id,
    product_id: latest.product_id,
    purchase_date_ms: latest.purchase_date_ms,
    expires_date_ms: latest.expires_date_ms,
    is_trial_period: latest.is_trial_period === 'true',
  };
}

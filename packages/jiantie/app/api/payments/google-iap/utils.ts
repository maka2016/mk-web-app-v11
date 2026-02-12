/**
 * Google IAP 支付工具函数
 */

import { log } from '@/server/logger';
import type { Product } from '@mk/jiantie/v11-database/generated/client/client';
import { google } from 'googleapis';

/**
 * Google Play 购买验证结果
 */
export interface GooglePlayVerifyResult {
  valid: boolean;
  error?: string;
  raw?: unknown;
}

/**
 * Service Account 凭据类型
 */
interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
}

/**
 * 解析 Service Account JSON（Base64 编码）
 */
function parseServiceAccountJson(base64Json: string): ServiceAccountCredentials {
  const decoded = Buffer.from(base64Json, 'base64').toString('utf-8');
  return JSON.parse(decoded) as ServiceAccountCredentials;
}

/**
 * 创建 JWT 客户端
 */
function createJwtClient(credentials: ServiceAccountCredentials) {
  return new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
}

/**
 * 将 packageName 转换为环境变量后缀
 * 例如：com.example.app -> com_example_app
 */
function packageNameToEnvSuffix(packageName: string): string {
  return packageName.replace(/\./g, '_');
}

/**
 * 获取 Google Play API 客户端（使用 Service Account 认证）
 *
 * 环境变量格式：GOOGLE_SERVICE_ACCOUNT_JSON_{PACKAGE_NAME}
 * - packageName 中的 . 替换为 _
 * - 示例：com.example.app -> GOOGLE_SERVICE_ACCOUNT_JSON_com_example_app
 * - 值为 Base64 编码的 Service Account JSON
 *
 * @param packageName 应用包名，用于匹配对应的 Service Account
 */
function getGoogleAuthClient(packageName: string) {
  const envSuffix = packageNameToEnvSuffix(packageName);
  const envKey = `GOOGLE_SERVICE_ACCOUNT_JSON_${envSuffix}`;

  console.log('envKey', envKey);
  const serviceAccountJson = process.env[envKey];

  if (!serviceAccountJson) {
    throw new Error(`未配置 Google Service Account 凭据，请设置环境变量 ${envKey}`);
  }

  try {
    log.info({ packageName, envKey }, '[Google IAP] 加载 Service Account 配置');
    const credentials = parseServiceAccountJson(serviceAccountJson);
    return createJwtClient(credentials);
  } catch (error) {
    log.error({ error, envKey }, '[Google IAP] 解析 Service Account JSON 失败');
    throw new Error(`${envKey} 配置格式错误`);
  }
}

/**
 * 调用 Google Play Developer API 校验 purchaseToken 是否有效
 *
 * 使用 Service Account 进行 OAuth 2.0 认证
 * 当前实现针对一次性商品（products），如需支持订阅可扩展为 subscriptions
 */
export async function verifyGooglePurchase(
  packageName: string,
  productId: string,
  purchaseToken: string
): Promise<GooglePlayVerifyResult> {
  try {
    const authClient = getGoogleAuthClient(packageName);
    await authClient.authorize();

    const androidPublisher = google.androidpublisher({
      version: 'v3',
      auth: authClient,
    });

    const response = await androidPublisher.purchases.products.get({
      packageName,
      productId,
      token: purchaseToken,
    });

    const data = response.data;

    log.info(
      {
        packageName,
        productId,
        purchaseState: data.purchaseState,
        consumptionState: data.consumptionState,
        acknowledgementState: data.acknowledgementState,
      },
      '[Google IAP] Google Play API 返回'
    );

    // purchaseState: 0=已购买, 1=已取消, 2=待处理
    if (data.purchaseState !== 0) {
      return {
        valid: false,
        error: `Google Play 返回 purchaseState=${String(data.purchaseState ?? 'unknown')}`,
        raw: data,
      };
    }

    return {
      valid: true,
      raw: data,
    };
  } catch (error) {
    log.error({ error }, '[Google IAP] 请求 Google Play 校验失败');
    const message = error instanceof Error ? error.message : String(error);
    return {
      valid: false,
      error: message,
    };
  }
}

/**
 * 生成 Google IAP 订单号
 * 格式: G{时间戳}{随机数} (总长度不超过 30 个字符)
 * G 前缀表示 Google IAP 订单
 */
export function generateGoogleOrderNo(): string {
  const timestamp = Date.now().toString(36).toUpperCase(); // 时间戳转 36 进制
  const random = Math.random().toString(36).substring(2, 8).toUpperCase(); // 6 位随机数
  return `G${timestamp}${random}`;
}

/**
 * 通过 Google productId 查找商品
 * 在 third_product_meta.googleid 字段中匹配
 *
 * @param prisma Prisma 客户端
 * @param googleProductId Google Play 商品 ID
 * @param appid 应用 ID（可选）
 * @returns 商品信息，未找到返回 null
 */
export async function findProductByGoogleId(
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
  googleProductId: string,
  appid?: string
): Promise<Product | null> {
  const products = await prisma.product.findMany({
    where: {
      ...(appid ? { appid } : {}),
      status: 'active',
      third_product_meta: {
        path: ['googleid'],
        equals: googleProductId,
      },
    },
  });

  if (products.length === 0) {
    return null;
  }

  // 如果找到多个，取第一个（理论上 googleid 应该唯一）
  return products[0];
}

/**
 * 检查 Google IAP 购买是否已处理过（幂等检查）
 * 通过 purchaseToken 查询 PaymentTokenLog 表
 *
 * @param prisma Prisma 客户端
 * @param purchaseToken Google Play purchase token
 * @returns 如果已处理过返回订单号，否则返回 null
 */
export async function checkGooglePurchaseProcessed(
  prisma: {
    paymentTokenLog: {
      findFirst: (args: {
        where: {
          payment_method: string;
          token: string;
        };
        select: { order_no: true };
      }) => Promise<{ order_no: string } | null>;
    };
  },
  purchaseToken: string
): Promise<string | null> {
  const existingLog = await prisma.paymentTokenLog.findFirst({
    where: {
      payment_method: 'google_iap',
      token: purchaseToken,
    },
    select: {
      order_no: true,
    },
  });

  return existingLog?.order_no ?? null;
}

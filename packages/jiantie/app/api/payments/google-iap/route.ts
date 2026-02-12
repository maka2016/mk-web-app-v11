/**
 * Google IAP 支付接口
 *
 * POST /api/payments/google-iap
 *
 * 处理流程：
 * 1. 从 header 中解析 token，获取 uid/appid
 * 2. 解析并校验请求体参数
 * 3. 调用 Google Play Developer API 验证 purchaseToken（使用 Service Account 认证）
 * 4. 创建订单、支付记录
 * 5. 执行发货
 *
 * 环境变量配置：
 * - GOOGLE_SERVICE_ACCOUNT_JSON_{PACKAGE_NAME}: packageName 中的 . 替换为 _
 *   示例：GOOGLE_SERVICE_ACCOUNT_JSON_com_example_app
 *   值为 Base64 编码的 Service Account JSON
 */

import { log } from '@/server/logger';
import { prisma } from '@mk/jiantie/v11-database';
import { NextRequest, NextResponse } from 'next/server';
import { tokenToUid } from '../../../../server/auth/token-validator';
import { shipOrder } from '../../../../services/shipment';
import {
  checkGooglePurchaseProcessed,
  findProductByGoogleId,
  generateGoogleOrderNo,
  verifyGooglePurchase,
} from './utils';

/**
 * Google IAP 请求体 DTO
 * 与 Apple IAP 保持统一格式
 */
interface GoogleIapBodyDto {
  /**
   * Google Play 返回的 purchase token（与 purchaseToken 相同，兼容字段）
   */
  receipt: string;
  /**
   * 支付类型
   */
  type: 'apple-iap' | 'google-iap';
  /**
   * 应用包名
   */
  packageName: string;
  /**
   * 商品 ID（Google Play 中的 productId）
   */
  productId: string;
  /**
   * Google Play 返回的 purchase token
   */
  purchaseToken: string;
  /**
   * Google Play 订单 ID（如 GPA.3385-1234-5678-90123）
   */
  orderId: string;
  /**
   * 购买时间戳（毫秒）
   */
  purchaseTime: number;
  /**
   * 透传埋点等调试信息
   */
  traceMetadata: {
    workId: string;
    uid?: string;
  };
}

interface GoogleIapResult {
  success: boolean;
  message: string;
  error?: string;
  data?: {
    uid: number;
    appid: string;
    purchaseToken: string;
    productId: string;
    packageName?: string;
    orderNo?: string;
    amount?: number;
    currency?: string;
    shipped?: boolean;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<GoogleIapResult>> {
  // 1. 解析 header 中的 token / bundleid，获取 uid/appid
  const token = request.headers.get('token');
  const bundleId = request.headers.get('bundleid') ?? '';
  log.info({ bundleId }, '[Google IAP] bundleId from header');
  console.log('token---', token);
  console.log('bundleId---', bundleId);

  // return NextResponse.json(
  //   {
  //     success: true,
  //     message: '测试订单处理成功',
  //     data: {
  //       uid: 0,
  //       appid: 'com.example.app',
  //       purchaseToken: 'test_purchase_token',
  //       productId: 'test_product_id',
  //       packageName: 'com.example.app',
  //     },
  //   },
  //   { status: 201 }
  // );

  // 2. 解析请求体
  let body: GoogleIapBodyDto;
  try {
    body = (await request.json()) as GoogleIapBodyDto;
    console.log('[Google IAP]body---', body);
    log.info({ body }, '[Google IAP] body');
  } catch (error) {
    log.error(error, '[Google IAP] 解析请求体失败');
    return NextResponse.json(
      {
        success: false,
        message: '请求体格式错误',
        error: '请求体必须是有效的 JSON',
      },
      { status: 400 }
    );
  }

  // 从 body 中获取字段，purchaseToken 优先使用 body.purchaseToken，兼容 body.receipt
  const purchaseToken = body.purchaseToken || body.receipt;
  const productId = body.productId;
  const packageName = body.packageName || bundleId || undefined;
  const orderId = body.orderId;
  const purchaseTime = body.purchaseTime;

  // 特殊处理：productId 中含有 TEST 的直接返回成功（用于测试环境）
  // if (productId && productId.toUpperCase().includes('TEST')) {
  //   log.info(
  //     {
  //       productId,
  //       purchaseToken: purchaseToken?.substring(0, 50),
  //       packageName,
  //     },
  //     '[Google IAP] 检测到测试商品 ID，跳过验证直接返回成功'
  //   );

  //   return NextResponse.json(
  //     {
  //       success: true,
  //       message: '测试订单处理成功',
  //       data: {
  //         uid: 0,
  //         appid: packageName || bundleId || 'test',
  //         purchaseToken,
  //         productId,
  //         packageName,
  //       },
  //     },
  //     { status: 201 }
  //   );
  // }

  // 将 header 转成普通对象方便查看（排除 token，避免日志中出现敏感信息）
  const headersObject = Object.fromEntries(
    Array.from(request.headers.entries()).filter(([key]) => key.toLowerCase() !== 'token')
  );

  // 3. 立即记录回调日志（确保任何情况下都有记录）
  let callbackLog = await prisma.paymentCallbackLog.create({
    data: {
      order_no: null, // 订单号在后续生成
      appid: packageName || bundleId || 'unknown',
      payment_method: 'google_iap',
      callback_type: 'google_iap',
      raw_data: JSON.stringify(body), // 完整原始请求体
      parsed_data: {
        headers: headersObject,
        purchase_token: purchaseToken,
        product_id: productId,
        package_name: packageName,
        order_id: orderId,
        purchase_time: purchaseTime,
      } as any,
      status: 'pending',
    },
  });

  // 4. 校验必填参数
  if (!purchaseToken || !productId) {
    // 更新回调日志状态为失败
    await prisma.paymentCallbackLog.update({
      where: { id: callbackLog.id },
      data: {
        status: 'failed',
        error_message: 'receipt 中的 purchaseToken、productId 为必填字段',
        process_time: new Date(),
      },
    });

    return NextResponse.json(
      {
        success: false,
        message: '参数缺失',
        error: 'receipt 中的 purchaseToken、productId 为必填字段',
      },
      { status: 400 }
    );
  }

  // 5. 尝试解析 token 获取 uid/appid（非必须）
  let uid = 0;
  let appid = packageName || bundleId || 'unknown';
  if (token) {
    try {
      const tokenResult = await tokenToUid(token);
      if (tokenResult.uid && tokenResult.appid) {
        uid = tokenResult.uid;
        appid = tokenResult.appid;
      }
    } catch (tokenError) {
      log.warn({ error: tokenError }, '[Google IAP] token 解析失败，使用默认值');
    }
  }

  // 6. 打日志，便于联调
  log.info(
    {
      uid,
      appid,
      headers: headersObject,
      body,
    },
    '[Google IAP] 收到请求'
  );

  console.log('[Google IAP] uid/appid:', { uid, appid });
  console.log('[Google IAP] headers (without token):', headersObject);
  console.log('[Google IAP] body:', body);

  const traceMetadata = body.traceMetadata ?? { workId: '' };

  try {
    // 1. 调用 Google Play API / 校验 purchaseToken 是否有效
    const verifyResult = await verifyGooglePurchase(bundleId, productId, purchaseToken);

    if (!verifyResult.valid) {
      log.error(
        {
          uid,
          appid,
          purchaseToken,
          productId,
          packageName,
          error: verifyResult.error,
        },
        '[Google IAP] purchaseToken 验证失败'
      );

      // 更新回调日志状态
      await prisma.paymentCallbackLog.update({
        where: { id: callbackLog.id },
        data: {
          status: 'failed',
          error_message: verifyResult.error ?? 'Google Play 返回无效购买信息',
          process_time: new Date(),
          parsed_data: {
            ...(callbackLog.parsed_data as object),
            uid,
            appid,
            verify_result: verifyResult,
          } as any,
        },
      });

      return NextResponse.json(
        {
          success: false,
          message: 'Google Play 验证失败',
          error: verifyResult.error ?? 'Google Play 返回无效购买信息',
        },
        { status: 400 }
      );
    }

    log.info(
      {
        uid,
        appid,
        purchaseToken,
        productId,
        packageName,
      },
      '[Google IAP] purchaseToken 验证通过'
    );

    // 2. 检查交易是否已处理（幂等）
    const existingOrderNo = await checkGooglePurchaseProcessed(prisma, purchaseToken);
    if (existingOrderNo) {
      console.log('[Google IAP] 交易已处理, 订单号:', existingOrderNo);

      // 更新回调日志（已处理的交易也记录）
      await prisma.paymentCallbackLog.update({
        where: { id: callbackLog.id },
        data: {
          order_no: existingOrderNo,
          status: 'success',
          error_message: '交易已处理（幂等）',
          process_time: new Date(),
          parsed_data: {
            ...(callbackLog.parsed_data as object),
            uid,
            appid,
            existing_order_no: existingOrderNo,
          } as any,
        },
      });

      return NextResponse.json(
        {
          success: true,
          message: '交易已处理',
          data: {
            uid,
            appid,
            purchaseToken,
            productId,
            packageName,
          },
        },
        { status: 201 }
      );
    }

    // 3. 查找商品
    const product = await findProductByGoogleId(prisma, productId, appid);
    if (!product) {
      console.error('[Google IAP] 未找到商品, google_product_id:', productId);

      // 更新回调日志状态
      await prisma.paymentCallbackLog.update({
        where: { id: callbackLog.id },
        data: {
          status: 'failed',
          error_message: `未找到对应的商品: ${productId}`,
          process_time: new Date(),
          parsed_data: {
            ...(callbackLog.parsed_data as object),
            uid,
            appid,
          } as any,
        },
      });

      return NextResponse.json(
        {
          success: false,
          message: '商品不存在',
          error: `未找到对应的商品: ${productId}`,
        },
        { status: 404 }
      );
    }

    console.log('[Google IAP] 找到商品:', {
      alias: product.alias,
      name: product.name,
      price: product.price,
    });

    // 4. 开启事务：创建订单、支付记录、Token 日志、发货
    const orderNo = generateGoogleOrderNo();
    const now = new Date();

    const result = await prisma.$transaction(async tx => {
      // 4.0 更新回调日志的 order_no
      await tx.paymentCallbackLog.update({
        where: { id: callbackLog.id },
        data: {
          order_no: orderNo,
          appid,
          parsed_data: {
            ...(callbackLog.parsed_data as object),
            uid,
            appid,
            trace_metadata: traceMetadata,
            verify_result: verifyResult,
          } as any,
        },
      });

      // 4.1 创建订单
      const order = await tx.order.create({
        data: {
          order_no: orderNo,
          appid,
          uid,
          amount: product.price,
          currency: product.currency,
          order_status: 'paid', // Google IAP 成功验证即视为已支付
          product_alias: product.alias,
          meta: {
            trace_metadata: traceMetadata,
            header_info: headersObject,
            body,
          } as any,
          create_time: now,
        },
      });

      console.log('[Google IAP] 订单创建成功:', order.order_no);

      // 4.2 创建支付记录
      const payment = await tx.payment.create({
        data: {
          order_no: orderNo,
          appid,
          uid,
          payment_method: 'google_iap',
          payment_type: product.is_subscription ? 'subscription' : 'normal',
          transaction_id: orderId || purchaseToken, // 优先使用 Google Play 订单 ID
          amount: product.price,
          currency: product.currency,
          payment_status: 'success',
          raw_response: JSON.stringify({
            purchaseToken,
            productId,
            packageName,
            orderId,
            purchaseTime,
          }),
          paid_at: purchaseTime ? new Date(purchaseTime) : now,
        },
      });

      console.log('[Google IAP] 支付记录创建成功:', payment.id);

      // 4.3 创建 PaymentTokenLog（用于幂等检查和订阅管理）
      await tx.paymentTokenLog.create({
        data: {
          order_no: orderNo,
          appid,
          uid,
          payment_method: 'google_iap',
          token: purchaseToken.substring(0, 10000),
          token_data: {
            purchase_token: purchaseToken,
            product_id: productId,
            package_name: packageName,
            order_id: orderId,
            purchase_time: purchaseTime,
            verified_at: now.toISOString(),
          },
          expires_at: null,
        },
      });

      // 4.4 执行发货
      const shipmentResult = await shipOrder(tx, {
        uid,
        meta: order.meta,
        appid,
        product,
        shipped_at: now,
        order_no: orderNo,
        shipping_type: 'google_iap',
        source: 'api',
        shipping_data: {
          purchase_token: purchaseToken,
          product_id: productId,
        },
      });

      log.info({ shipmentResult }, 'Google IAP shipmentResult');
      if (!shipmentResult.success) {
        log.error(shipmentResult.error, '[Google IAP] 发货失败');
      } else {
        log.info(
          { roles_shipped: shipmentResult.rolesShipped, resources_shipped: shipmentResult.resourcesShipped },
          '[Google IAP] 发货成功'
        );
      }

      // 4.5 更新回调日志状态
      callbackLog = await tx.paymentCallbackLog.update({
        where: { id: callbackLog.id },
        data: {
          status: shipmentResult.success ? 'success' : 'failed',
          error_message: shipmentResult.success ? null : shipmentResult.error,
          process_time: new Date(),
        },
      });

      return {
        order,
        payment,
        shipmentResult,
        callbackLog,
      };
    });

    const shipped = result.shipmentResult.success;
    return NextResponse.json(
      {
        success: shipped,
        message: shipped ? '支付成功，已完成发货' : `支付成功，但发货失败: ${result.shipmentResult.error}`,
        data: {
          uid,
          appid,
          purchaseToken,
          productId,
          packageName,
          orderNo: result.order.order_no,
          amount: result.order.amount,
          currency: result.order.currency,
          shipped,
        },
      },
      { status: shipped ? 201 : 500 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Google IAP] 处理失败:', errorMessage, error);

    // 更新回调日志状态
    try {
      await prisma.paymentCallbackLog.update({
        where: { id: callbackLog.id },
        data: {
          status: 'failed',
          error_message: errorMessage,
          process_time: new Date(),
        },
      });
    } catch (logError) {
      console.error('[Google IAP] 更新回调日志失败:', logError);
    }

    return NextResponse.json(
      {
        success: false,
        message: '处理失败',
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

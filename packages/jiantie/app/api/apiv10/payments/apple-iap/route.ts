/**
 * Apple IAP 支付接口
 *
 * POST /api/apiv10/payments/apple-iap
 *
 * 处理流程：
 * 1. 验证请求参数
 * 2. 验证苹果 receipt
 * 3. 检查交易是否已处理（幂等）
 * 4. 查找对应商品
 * 5. 创建订单
 * 6. 处理发货
 */

import { log } from '@/server/logger';
import { prisma } from '@mk/jiantie/v11-database';
import { NextRequest, NextResponse } from 'next/server';
import { tokenToUid } from '../../../../../server/auth/token-validator';
import { shipOrder } from '../../../../../services/shipment';
import { extractLatestTransaction, verifyAppleReceipt } from './apple-verify';
import type { AppleIapBodyDto, AppleIapResult } from './types';
import { checkTransactionProcessed, findProductByAppleId, generateOrderNo } from './utils';

export async function POST(request: NextRequest): Promise<NextResponse<AppleIapResult>> {
  let body: AppleIapBodyDto;

  //解析header的token获取uid
  const token = request.headers.get('token');
  const bundleId = request.headers.get('bundleid') ?? '';
  log.info({ bundleId: bundleId }, 'bundleId');
  if (!token) {
    return NextResponse.json(
      {
        success: false,
        message: 'token 无效',
      },
      { status: 401 }
    );
  }
  const { uid, appid } = await tokenToUid(token);

  if (!uid || !appid) {
    return NextResponse.json(
      {
        success: false,
        message: 'uid or token 无效',
      },
      { status: 401 }
    );
  }
  console.log('request:', request);
  // 1. 解析请求体
  log.info('解析请求体');
  try {
    body = (await request.json()) as AppleIapBodyDto;
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: '请求体格式错误',
        error: '请求体必须是有效的 JSON',
      },
      { status: 400 }
    );
  }

  log.info('验证请求参数');

  const { receipt, traceMetadata = {} } = body;

  try {
    log.info('验证苹果 receipt');
    // 3. 验证苹果 receipt
    console.log('[Apple IAP] 开始验证 receipt, uid:', uid, 'appid:', appid);

    const verifyResult = await verifyAppleReceipt(receipt, bundleId);

    log.info({ verifyResult: verifyResult }, 'verifyResult');
    if (!verifyResult.success || !verifyResult.data) {
      console.error('[Apple IAP] Receipt 验证失败:', verifyResult.error);
      return NextResponse.json(
        {
          success: false,
          message: 'Receipt 验证失败',
          error: verifyResult.error || '苹果服务器验证失败',
        },
        { status: 400 }
      );
    }

    console.log('[Apple IAP] Receipt 验证成功, 环境:', verifyResult.environment);

    // 4. 提取交易信息
    const transaction = extractLatestTransaction(verifyResult.data);

    if (!transaction) {
      console.error('[Apple IAP] 无法从 receipt 中提取交易信息');
      return NextResponse.json(
        {
          success: false,
          message: '交易信息解析失败',
          error: '无法从 receipt 中提取有效的交易信息',
        },
        { status: 400 }
      );
    }

    console.log('[Apple IAP] 交易信息:', {
      transaction_id: transaction.transaction_id,
      product_id: transaction.product_id,
      is_trial: transaction.is_trial_period,
    });

    // 5. 检查交易是否已处理（幂等）
    const existingOrderNo = await checkTransactionProcessed(prisma, transaction.transaction_id);

    if (existingOrderNo) {
      console.log('[Apple IAP] 交易已处理, 订单号:', existingOrderNo);
      // 返回已处理的订单信息
      return NextResponse.json(
        {
          success: true,
          message: '交易已处理',
          data: {
            order_no: existingOrderNo,
            transaction_id: transaction.transaction_id,
            product_id: transaction.product_id,
            amount: 0, // 已处理的订单不重复返回金额
            currency: 'CNY',
            shipped: true,
          },
        },
        {
          status: 201,
        }
      );
    }

    // 6. 查找商品
    const product = await findProductByAppleId(prisma, transaction.product_id, appid);

    if (!product) {
      console.error('[Apple IAP] 未找到商品, apple_product_id:', transaction.product_id);
      return NextResponse.json(
        {
          success: false,
          message: '商品不存在',
          error: `未找到对应的商品: ${transaction.product_id}`,
        },
        { status: 404 }
      );
    }

    console.log('[Apple IAP] 找到商品:', {
      alias: product.alias,
      name: product.name,
      price: product.price,
    });

    // 7. 开启事务：创建订单、支付记录、Token 日志、发货
    const orderNo = generateOrderNo();
    const now = new Date();
    const purchaseDate = new Date(parseInt(transaction.purchase_date_ms, 10));
    const expiresDate = transaction.expires_date_ms ? new Date(parseInt(transaction.expires_date_ms, 10)) : null;

    const result = await prisma.$transaction(async tx => {
      // 7.1 创建订单
      const order = await tx.order.create({
        data: {
          order_no: orderNo,
          appid: appid,
          uid: uid,
          amount: product.price,
          currency: product.currency,
          order_status: 'paid', // Apple IAP 成功验证即已支付
          product_alias: product.alias,
          // 将请求头序列化成普通对象，避免 Prisma 在写入 JSON 字段时报
          // "Invalid value for argument `append`: We could not serialize [object Function] value" 错误
          meta: {
            trace_metadata: traceMetadata,
            header_info: Object.fromEntries(request.headers.entries()),
            body: body,
          } as any,
          create_time: now,
        },
      });

      console.log('[Apple IAP] 订单创建成功:', order.order_no);

      // 7.2 创建支付记录
      const payment = await tx.payment.create({
        data: {
          order_no: orderNo,
          appid: appid,
          uid: uid,
          payment_method: 'apple_iap',
          payment_type: product.is_subscription ? 'subscription' : 'normal',
          transaction_id: transaction.transaction_id,
          amount: product.price,
          currency: product.currency,
          payment_status: 'success',
          raw_response: JSON.stringify(verifyResult.data),
          paid_at: purchaseDate,
        },
      });

      console.log('[Apple IAP] 支付记录创建成功:', payment.id);

      // 7.3 创建 PaymentTokenLog（用于幂等检查和订阅管理）
      await tx.paymentTokenLog.create({
        data: {
          order_no: orderNo,
          appid: appid,
          uid: uid,
          payment_method: 'apple_iap',
          token: receipt.substring(0, 10000), // 存储部分 receipt（避免太长）
          token_data: {
            transaction_id: transaction.transaction_id,
            original_transaction_id: transaction.original_transaction_id,
            product_id: transaction.product_id,
            purchase_date_ms: transaction.purchase_date_ms,
            expires_date_ms: transaction.expires_date_ms,
            is_trial_period: transaction.is_trial_period,
            environment: verifyResult.environment,
            verified_at: now.toISOString(),
          },
          expires_at: expiresDate,
        },
      });

      // 7.4 执行发货（context 带 order_no/shipping_type/source 时 shipOrder 内部会写发货日志）
      const shipmentResult = await shipOrder(tx, {
        uid,
        meta: order.meta,
        appid,
        product,
        shipped_at: now,
        order_no: orderNo,
        shipping_type: 'apple_iap',
        source: 'api',
        shipping_data: {
          transaction_id: transaction.transaction_id,
          product_id: transaction.product_id,
          is_subscription: product.is_subscription,
        },
      });
      log.info({ shipmentResult }, 'shipmentResult');
      if (!shipmentResult.success) {
        log.error(shipmentResult.error, '[Apple IAP] 发货失败');
      } else {
        log.info(
          { roles_shipped: shipmentResult.rolesShipped, resources_shipped: shipmentResult.resourcesShipped },
          '[Apple IAP] 发货成功'
        );
      }

      return {
        order,
        payment,
        shipmentResult,
      };
    });

    // 8. 返回响应：发货失败时接口视为失败（success: false），便于调用方区分
    const shipped = result.shipmentResult.success;
    return NextResponse.json(
      {
        success: shipped,
        message: shipped ? '支付成功，已完成发货' : `支付成功，但发货失败: ${result.shipmentResult.error}`,
        data: {
          order_no: result.order.order_no,
          transaction_id: transaction.transaction_id,
          product_id: transaction.product_id,
          amount: result.order.amount,
          currency: result.order.currency,
          shipped,
        },
      },
      { status: shipped ? 201 : 500 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Apple IAP] 处理失败:', errorMessage, error);

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

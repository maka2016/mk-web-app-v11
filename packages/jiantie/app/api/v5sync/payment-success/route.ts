import { prisma } from '@mk/jiantie/v11-database';
import { NextRequest, NextResponse } from 'next/server';
import { shipOrder } from '../../../../services/shipment';
import { logV5SyncApi } from '../utils/log';

interface PaymentSuccessRequest {
  order_no: string; // 必需：订单号
  appid: string; // 必需：应用ID
  uid: number; // 必需：用户ID
  payment_method: string; // 必需：支付方式：wechat、alipay、apple_iap 等

  payment_type?: string; // 可选：支付类型（如 normal、renew 等）
  transaction_id?: string; // 可选：三方支付交易号
  amount: number; // 必需：支付金额（分）
  currency?: string; // 可选：货币类型，默认 CNY

  // 支付结果
  payment_status?: string; // 可选：支付状态，默认 success（pending、success、failed、cancelled）
  paid_at?: string; // 可选：支付完成时间，ISO 8601

  // 三方回调相关原始数据（来自旧系统整理后的数据）
  callback_type?: string; // 可选：回调类型：wechat、alipay 等
  callback_raw?: any; // 可选：原始回调数据（字符串或对象）
  callback_parsed?: any; // 可选：已解析的数据（对象）

  // 苹果 IAP 专用字段
  receipt_data?: string; // 可选：Base64 编码的苹果支付凭证
  original_transaction_id?: string; // 可选：原始交易ID（用于续订等场景）
  product_id?: string; // 可选：苹果商品ID

  // 额外扩展字段（预留）
  extra?: Record<string, any>;
}

interface TransactionResult {
  callbackLog: any;
  payment: any;
  order: any;
  shippingLog: any;
  shipmentError: string | undefined;
  validationError: { message: string; statusCode: number } | null;
}

export async function POST(request: NextRequest) {
  let body: PaymentSuccessRequest;

  // 解析请求体
  try {
    body = (await request.json()) as PaymentSuccessRequest;
  } catch {
    const errorResponse = NextResponse.json(
      { success: false, error: '请求体格式错误，必须是有效的 JSON' },
      { status: 400 }
    );
    await logV5SyncApi(
      'payment-success',
      null,
      { success: false, error: '请求体格式错误，必须是有效的 JSON' },
      'failed',
      400,
      '请求体格式错误，必须是有效的 JSON'
    );
    return errorResponse;
  }

  try {
    // 基础参数校验
    if (!body || !body.order_no || typeof body.order_no !== 'string') {
      const errorResponse = NextResponse.json(
        { success: false, error: 'order_no 是必需的且必须为字符串' },
        { status: 400 }
      );
      await logV5SyncApi(
        'payment-success',
        body,
        { success: false, error: 'order_no 是必需的且必须为字符串' },
        'failed',
        400,
        'order_no 是必需的且必须为字符串'
      );
      return errorResponse;
    }

    if (!body.appid || typeof body.appid !== 'string') {
      const errorResponse = NextResponse.json(
        { success: false, error: 'appid 是必需的且必须为字符串' },
        { status: 400 }
      );
      await logV5SyncApi(
        'payment-success',
        body,
        { success: false, error: 'appid 是必需的且必须为字符串' },
        'failed',
        400,
        'appid 是必需的且必须为字符串'
      );
      return errorResponse;
    }

    if (!body.uid || typeof body.uid !== 'number') {
      const errorResponse = NextResponse.json(
        { success: false, error: 'uid 是必需的且必须为数字' },
        { status: 400 }
      );
      await logV5SyncApi(
        'payment-success',
        body,
        { success: false, error: 'uid 是必需的且必须为数字' },
        'failed',
        400,
        'uid 是必需的且必须为数字'
      );
      return errorResponse;
    }

    if (!body.payment_method || typeof body.payment_method !== 'string') {
      const errorResponse = NextResponse.json(
        { success: false, error: 'payment_method 是必需的且必须为字符串' },
        { status: 400 }
      );
      await logV5SyncApi(
        'payment-success',
        body,
        { success: false, error: 'payment_method 是必需的且必须为字符串' },
        'failed',
        400,
        'payment_method 是必需的且必须为字符串'
      );
      return errorResponse;
    }

    if (!body.amount || typeof body.amount !== 'number') {
      const errorResponse = NextResponse.json(
        { success: false, error: 'amount 是必需的且必须为数字（单位：分）' },
        { status: 400 }
      );
      await logV5SyncApi(
        'payment-success',
        body,
        { success: false, error: 'amount 是必需的且必须为数字（单位：分）' },
        'failed',
        400,
        'amount 是必需的且必须为数字（单位：分）'
      );
      return errorResponse;
    }

    // 验证订单号长度
    if (body.order_no.length > 30) {
      const errorResponse = NextResponse.json(
        { success: false, error: 'order_no 长度不能超过 30 个字符' },
        { status: 400 }
      );
      await logV5SyncApi(
        'payment-success',
        body,
        { success: false, error: 'order_no 长度不能超过 30 个字符' },
        'failed',
        400,
        'order_no 长度不能超过 30 个字符'
      );
      return errorResponse;
    }

    const currency = body.currency || 'CNY';
    const paymentStatus = body.payment_status || 'success';
    const paidAt =
      paymentStatus === 'success'
        ? body.paid_at
          ? new Date(body.paid_at)
          : new Date()
        : null;

    // 处理竞态条件：如果订单不存在，等待一段时间后重试
    // 场景：订单同步请求可能还在处理中，支付同步请求先到达
    // 在事务外等待，避免长时间阻塞事务
    let order = await prisma.order.findUnique({
      where: { order_no: body.order_no },
    });

    if (!order) {
      const maxWaitTime = 10000; // 最多等待 5 秒
      const retryInterval = 1000; // 每 500ms 重试一次
      const maxRetries = Math.floor(maxWaitTime / retryInterval);
      let retryCount = 0;

      while (!order && retryCount < maxRetries) {
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, retryInterval));
        order = await prisma.order.findUnique({
          where: { order_no: body.order_no },
        });
        retryCount++;
      }

      // 如果仍然不存在，提前返回错误（避免进入事务）
      if (!order) {
        const errorMsg = `订单 order_no=${body.order_no} 不存在（已等待 ${maxWaitTime}ms）`;
        const errorResponse = NextResponse.json(
          {
            success: false,
            error: errorMsg,
          },
          { status: 404 }
        );

        // 记录回调日志（即使订单不存在也要记录）
        try {
          const callbackRaw =
            body.callback_raw !== undefined ? body.callback_raw : body;
          const callbackParsed =
            body.callback_parsed !== undefined ? body.callback_parsed : body;

          await prisma.paymentCallbackLog.create({
            data: {
              order_no: body.order_no,
              appid: body.appid,
              payment_method: body.payment_method,
              callback_type: body.callback_type || body.payment_method,
              raw_data:
                typeof callbackRaw === 'string'
                  ? callbackRaw
                  : JSON.stringify(callbackRaw),
              parsed_data: callbackParsed,
              status: 'failed',
              error_message: errorMsg,
              process_time: new Date(),
            },
          });
        } catch (logError) {
          console.error('[V5Sync Payment Success] 记录回调日志失败:', logError);
        }

        await logV5SyncApi(
          'payment-success',
          body,
          {
            success: false,
            error: errorMsg,
          },
          'failed',
          404,
          errorMsg
        );

        return errorResponse;
      }
    }

    // 回调日志、支付记录、订单状态、发货在同一个事务中处理（除日志状态更新外）
    const result: TransactionResult = await prisma.$transaction(async tx => {
      let validationError: {
        message: string;
        statusCode: number;
      } | null = null;
      let shipmentError: string | undefined;
      // 1. 先记录回调日志（无论后续是否成功，都要有记录）
      const callbackRaw =
        body.callback_raw !== undefined ? body.callback_raw : body;
      const callbackParsed =
        body.callback_parsed !== undefined ? body.callback_parsed : body;

      let callbackLog = await (tx as typeof prisma).paymentCallbackLog.create({
        data: {
          order_no: body.order_no,
          appid: body.appid,
          payment_method: body.payment_method,
          callback_type: body.callback_type || body.payment_method,
          raw_data:
            typeof callbackRaw === 'string'
              ? callbackRaw
              : JSON.stringify(callbackRaw),
          parsed_data: callbackParsed,
          status: 'pending',
        },
      });

      // 2. 再次查询订单（在事务内，确保数据一致性）
      const orderInTx = await (tx as typeof prisma).order.findUnique({
        where: { order_no: body.order_no },
      });

      if (!orderInTx) {
        const errorMsg = `订单 order_no=${body.order_no} 不存在（事务内查询）`;
        validationError = { message: errorMsg, statusCode: 404 };
        callbackLog = await (tx as typeof prisma).paymentCallbackLog.update({
          where: { id: callbackLog.id },
          data: {
            status: 'failed',
            error_message: errorMsg,
            process_time: new Date(),
          },
        });

        return {
          callbackLog,
          payment: null,
          order: null,
          shippingLog: null,
          shipmentError: errorMsg,
          validationError,
        };
      }

      if (orderInTx.appid !== body.appid || orderInTx.uid !== body.uid) {
        const errorMsg = '订单的 appid 或 uid 不匹配';
        validationError = { message: errorMsg, statusCode: 400 };
        callbackLog = await (tx as typeof prisma).paymentCallbackLog.update({
          where: { id: callbackLog.id },
          data: {
            status: 'failed',
            error_message: errorMsg,
            process_time: new Date(),
          },
        });

        return {
          callbackLog,
          payment: null,
          order: null,
          shippingLog: null,
          shipmentError: errorMsg,
          validationError,
        };
      }

      // 3. 写入 / 更新支付记录（基于 order_no + payment_method + transaction_id 做幂等）
      const existingPayment =
        body.transaction_id && body.transaction_id.length > 0
          ? await (tx as typeof prisma).payment.findFirst({
              where: {
                order_no: body.order_no,
                payment_method: body.payment_method,
                transaction_id: body.transaction_id,
              },
            })
          : null;

      const paymentData = {
        order_no: body.order_no,
        appid: body.appid,
        uid: body.uid,
        payment_method: body.payment_method,
        payment_type: body.payment_type || 'normal',
        transaction_id: body.transaction_id || null,
        amount: body.amount,
        currency,
        payment_status: paymentStatus,
        raw_response:
          typeof callbackRaw === 'string'
            ? callbackRaw
            : JSON.stringify(callbackRaw),
        paid_at: paidAt,
      };

      const payment = existingPayment
        ? await (tx as typeof prisma).payment.update({
            where: { id: existingPayment.id },
            data: paymentData,
          })
        : await (tx as typeof prisma).payment.create({
            data: paymentData,
          });

      // 4. 更新订单状态（仅在支付成功时）
      let updatedOrder = orderInTx;
      if (paymentStatus === 'success' && orderInTx.order_status !== 'paid') {
        updatedOrder = await (tx as typeof prisma).order.update({
          where: { order_no: orderInTx.order_no },
          data: {
            order_status: 'paid',
          },
        });
      }

      // 5. 苹果 IAP：保存 receipt 到 PaymentTokenLog
      if (body.payment_method === 'apple_iap' && body.receipt_data) {
        await (tx as typeof prisma).paymentTokenLog.create({
          data: {
            order_no: body.order_no,
            appid: body.appid,
            uid: body.uid,
            payment_method: 'apple_iap',
            token: body.receipt_data, // Base64 编码的 receipt
            token_data: {
              transaction_id: body.transaction_id,
              original_transaction_id: body.original_transaction_id,
              product_id: body.product_id,
              receipt_verified: true,
              verified_at: new Date(),
              receipt_info: callbackParsed || {},
              source: 'v5_api',
              ...(body.extra || {}),
            },
            // 如果是订阅，设置过期时间
            expires_at: callbackParsed?.expires_date_ms
              ? new Date(parseInt(callbackParsed.expires_date_ms))
              : null,
          },
        });
      }

      // 6. 支付成功时自动触发发货（幂等：依赖发货逻辑覆盖有效期）
      let shippingLog: any = null;
      if (paymentStatus === 'success') {
        // 计算发货时间：如果支付时间与当前时间差异过大（支付时间早30秒以上），使用当前时间
        const now = new Date();
        let shippedAt: Date;
        if (paidAt) {
          const timeDiff = now.getTime() - paidAt.getTime();
          // 如果支付时间早于当前时间30秒以上，使用当前时间作为有效期计算依据
          if (timeDiff > 15000) {
            shippedAt = now;
          } else {
            shippedAt = paidAt;
          }
        } else {
          shippedAt = now;
        }

        // 先创建发货日志
        shippingLog = await (tx as typeof prisma).shippingLog.create({
          data: {
            order_no: body.order_no,
            appid: body.appid,
            uid: body.uid,
            shipping_type: body.payment_method,
            shipping_data: {
              source: 'v5_payment_success',
              payment_id: payment.id,
              transaction_id: body.transaction_id,
            },
            status: 'pending',
            shipped_at: shippedAt,
            source: 'v5_api',
          },
        });

        // 通过 product_alias 查找商品并执行发货
        const product = updatedOrder.product_alias
          ? await (tx as typeof prisma).product.findUnique({
              where: {
                alias: updatedOrder.product_alias,
              },
            })
          : null;

        if (!product) {
          const errorMsg = '订单没有关联商品，无法发货';
          shipmentError = errorMsg;
          shippingLog = await (tx as typeof prisma).shippingLog.update({
            where: { id: shippingLog.id },
            data: {
              status: 'failed',
              error_message: errorMsg,
            },
          });
        } else {
          const shipmentResult = await shipOrder(tx, {
            uid: updatedOrder.uid,
            meta: updatedOrder.meta,
            appid: updatedOrder.appid,
            product,
            shipped_at: shippedAt,
          });

          if (!shipmentResult.success) {
            shipmentError = shipmentResult.error || '发货失败';
            shippingLog = await (tx as typeof prisma).shippingLog.update({
              where: { id: shippingLog.id },
              data: {
                status: 'failed',
                error_message: shipmentError,
              },
            });
          } else {
            const updatedShippingData = {
              ...(shippingLog.shipping_data as any),
              shipment_result: {
                roles_shipped: shipmentResult.rolesShipped || 0,
                resources_shipped: shipmentResult.resourcesShipped || 0,
              },
            };
            shippingLog = await (tx as typeof prisma).shippingLog.update({
              where: { id: shippingLog.id },
              data: {
                status: 'success',
                shipping_data: updatedShippingData,
              },
            });
          }
        }
      }

      // 7. 更新回调日志状态
      callbackLog = await (tx as typeof prisma).paymentCallbackLog.update({
        where: { id: callbackLog.id },
        data: {
          status: shipmentError ? 'failed' : 'success',
          error_message: shipmentError,
          process_time: new Date(),
        },
      });

      return {
        callbackLog,
        payment,
        order: updatedOrder,
        shippingLog,
        shipmentError,
        validationError,
      };
    });

    // 参数校验失败时的响应（日志已写入）
    if (result.validationError) {
      const ve = result.validationError;
      const response = NextResponse.json(
        {
          success: false,
          error: ve.message,
          callback_log_id: result.callbackLog?.id,
        },
        { status: ve.statusCode }
      );

      await logV5SyncApi(
        'payment-success',
        body,
        {
          success: false,
          error: ve.message,
          callback_log_id: result.callbackLog?.id,
        },
        'failed',
        ve.statusCode,
        ve.message
      );

      return response;
    }

    const responseMessage = result.shipmentError
      ? `支付信息已同步，但发货失败: ${result.shipmentError}`
      : '支付信息及发货已成功同步';

    const success = !result.shipmentError;

    const response = NextResponse.json({
      success,
      message: responseMessage,
      data: {
        order_no: result.order?.order_no,
        order_status: result.order?.order_status,
        payment_id: result.payment?.id,
        payment_status: result.payment?.payment_status,
        callback_log_id: result.callbackLog?.id,
        shipping_log_id: result.shippingLog?.id ?? null,
        shipment_error: result.shipmentError || undefined,
      },
    });

    await logV5SyncApi(
      'payment-success',
      body,
      {
        success,
        message: responseMessage,
        order_no: result.order?.order_no,
        order_status: result.order?.order_status,
        payment_id: result.payment?.id,
        payment_status: result.payment?.payment_status,
        callback_log_id: result.callbackLog?.id,
        shipping_log_id: result.shippingLog?.id ?? null,
        shipment_error: result.shipmentError || undefined,
      },
      success ? 'success' : 'failed',
      200,
      result.shipmentError
    );

    return response;
  } catch (error: any) {
    console.error('[V5Sync Payment Success] 处理失败:', error);

    const errorMessage = error?.message || '同步支付信息失败';

    const errorResponse = NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );

    await logV5SyncApi(
      'payment-success',
      body,
      {
        success: false,
        error: errorMessage,
      },
      'failed',
      500,
      errorMessage
    );

    return errorResponse;
  }
}

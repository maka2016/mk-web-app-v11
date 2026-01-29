import { prisma } from '@mk/jiantie/v11-database';
import { NextRequest, NextResponse } from 'next/server';
import { shipOrder } from '../../../../services/shipment';

/**
 * V5 发货双写接口
 *
 * 用于旧系统在发货后，将发货信息同步到新系统（v11数据库）
 * 详细的调用方法和示例请参考：/api/v5sync/README.md
 */

interface ShippingData {
  [key: string]: any;
}

interface ShipOrderRequest {
  order_no: string; // 必需：订单号
  appid: string; // 必需：应用ID（不再限制必须为 "maka" 或 "jiantie"）
  uid: number; // 必需：用户ID
  shipping_type: string; // 必需：发货类型：apple_iap、wechat、alipay等
  shipping_data?: ShippingData; // 可选：发货数据
  status?: string; // 可选：发货状态，默认为 "success"
  error_message?: string; // 可选：错误信息
  shipped_at?: string; // 可选：发货时间，ISO 8601格式，默认为当前时间
  source?: string; // 可选：发货来源，默认为 "v5_api"
}

export async function POST(request: NextRequest) {
  console.log('[V5Sync Order Ship] 收到发货请求');
  let body: ShipOrderRequest;
  try {
    body = await request.json();
    console.log('[V5Sync Order Ship] 请求参数:', {
      order_no: body?.order_no,
      appid: body?.appid,
      uid: body?.uid,
      shipping_type: body?.shipping_type,
      status: body?.status,
    });
  } catch {
    console.error('[V5Sync Order Ship] 请求体解析失败: 不是有效的 JSON');
    return NextResponse.json(
      { success: false, error: '请求体格式错误，必须是有效的 JSON' },
      { status: 400 }
    );
  }

  try {
    // 验证必需字段
    if (!body || !body.order_no || typeof body.order_no !== 'string') {
      console.error('[V5Sync Order Ship] 参数验证失败: order_no 无效');
      return NextResponse.json(
        { success: false, error: 'order_no 是必需的且必须为字符串' },
        { status: 400 }
      );
    }

    if (!body.appid || typeof body.appid !== 'string') {
      console.error('[V5Sync Order Ship] 参数验证失败: appid 无效', body.appid);
      return NextResponse.json(
        { success: false, error: 'appid 是必需的且必须为字符串' },
        { status: 400 }
      );
    }

    if (!body.uid || typeof body.uid !== 'number') {
      console.error('[V5Sync Order Ship] 参数验证失败: uid 无效', body.uid);
      return NextResponse.json(
        { success: false, error: 'uid 是必需的且必须为数字' },
        { status: 400 }
      );
    }

    if (!body.shipping_type || typeof body.shipping_type !== 'string') {
      console.error('[V5Sync Order Ship] 参数验证失败: shipping_type 无效');
      return NextResponse.json(
        { success: false, error: 'shipping_type 是必需的且必须为字符串' },
        { status: 400 }
      );
    }

    // 验证订单号长度
    if (body.order_no.length > 30) {
      console.error(
        '[V5Sync Order Ship] 参数验证失败: order_no 长度超过限制',
        body.order_no.length
      );
      return NextResponse.json(
        { success: false, error: 'order_no 长度不能超过 30 个字符' },
        { status: 400 }
      );
    }

    console.log('[V5Sync Order Ship] 参数验证通过');

    // 解析发货时间
    const shippedAt = body.shipped_at ? new Date(body.shipped_at) : new Date();
    const status = body.status || 'success';
    const shippingData = body.shipping_data || {};
    const source = body.source || 'v5_api'; // 默认来源为 v5_api（旧API）

    // 使用事务确保数据一致性
    console.log('[V5Sync Order Ship] 开始事务处理');
    let orderValidationError: { message: string; statusCode: number } | null =
      null;
    const result = await prisma.$transaction(async tx => {
      // 先创建发货记录（无论后续验证是否通过，都要记录）
      console.log('[V5Sync Order Ship] 创建发货日志记录');
      let shippingLog = await (tx as typeof prisma).shippingLog.create({
        data: {
          order_no: body.order_no,
          appid: body.appid,
          uid: body.uid,
          shipping_type: body.shipping_type,
          shipping_data: shippingData,
          status: status,
          error_message: body.error_message || undefined,
          shipped_at: shippedAt,
          source: source,
        },
      });
      console.log(
        '[V5Sync Order Ship] 发货日志已创建, log_id:',
        shippingLog.id
      );

      // 检查订单是否存在
      console.log('[V5Sync Order Ship] 查找订单:', body.order_no);
      const order = await (tx as typeof prisma).order.findUnique({
        where: { order_no: body.order_no },
      });

      // 如果订单不存在，记录错误（不抛出错误，避免回滚）
      if (!order) {
        const errorMsg = `订单 order_no=${body.order_no} 不存在`;
        console.error('[V5Sync Order Ship] 订单不存在:', body.order_no);
        orderValidationError = { message: errorMsg, statusCode: 404 };
        shippingLog = await (tx as typeof prisma).shippingLog.update({
          where: { id: shippingLog.id },
          data: {
            status: 'failed',
            error_message: errorMsg,
            source: source,
          },
        });
        return {
          shippingLog,
          shipmentError: errorMsg,
        };
      }

      console.log('[V5Sync Order Ship] 订单已找到:', {
        order_id: order.id,
        order_appid: order.appid,
        order_uid: order.uid,
        product_alias: order.product_alias,
      });

      // 验证订单的 appid 和 uid 是否匹配
      if (order.appid !== body.appid || order.uid !== body.uid) {
        const errorMsg = '订单的 appid 或 uid 不匹配';
        console.error('[V5Sync Order Ship] 订单验证失败:', {
          expected_appid: body.appid,
          actual_appid: order.appid,
          expected_uid: body.uid,
          actual_uid: order.uid,
        });
        orderValidationError = { message: errorMsg, statusCode: 400 };
        shippingLog = await (tx as typeof prisma).shippingLog.update({
          where: { id: shippingLog.id },
          data: {
            status: 'failed',
            error_message: errorMsg,
            source: source,
          },
        });
        return {
          shippingLog,
          shipmentError: errorMsg,
        };
      }

      console.log('[V5Sync Order Ship] 订单验证通过');

      // 执行实际发货逻辑（发放角色或资源）
      // 如果发货失败，不影响发货日志的创建，但会在日志中记录错误信息
      let shipmentError: string | undefined = undefined;

      // 如果状态是 success，通过 product_alias 查找商品
      if (status === 'success') {
        let product = order.product_alias
          ? await (tx as typeof prisma).product.findUnique({
              where: {
                alias: order.product_alias,
              },
            })
          : null;

        if (product) {
          console.log(
            '[V5Sync Order Ship] 通过 product_alias 找到商品:',
            product.alias
          );
        } else {
          console.error(
            '[V5Sync Order Ship] 通过 product_alias 未找到商品:',
            order.product_alias
          );
        }

        // 如果仍然没有商品，报错
        if (!product) {
          const errorMsg = '订单没有关联商品，无法发货';
          shipmentError = errorMsg;
          console.error('[V5Sync Order Ship] 发货失败: 订单没有关联商品');
          shippingLog = await (tx as typeof prisma).shippingLog.update({
            where: { id: shippingLog.id },
            data: {
              error_message: errorMsg,
              status: 'failed',
              source: source,
            },
          });
        } else {
          console.log('[V5Sync Order Ship] 开始执行发货逻辑:', {
            uid: order.uid,
            product_alias: order.product_alias || product.alias,
            shipped_at: shippedAt.toISOString(),
          });
          try {
            const shipmentResult = await shipOrder(tx, {
              uid: order.uid,
              meta: order.meta,
              appid: order.appid,
              product,
              shipped_at: shippedAt,
            });

            if (!shipmentResult.success) {
              shipmentError = shipmentResult.error || '发货失败';
              console.error('[V5Sync Order Ship] 发货失败:', shipmentError);
              // 更新发货日志的错误信息
              shippingLog = await (tx as typeof prisma).shippingLog.update({
                where: { id: shippingLog.id },
                data: {
                  error_message: shipmentError,
                  status: 'failed',
                  source: source,
                },
              });
            } else {
              console.log('[V5Sync Order Ship] 发货成功:', {
                roles_shipped: shipmentResult.rolesShipped || 0,
                resources_shipped: shipmentResult.resourcesShipped || 0,
              });
              // 发货成功，记录发货详情到 shipping_data 中
              const updatedShippingData = {
                ...shippingData,
                shipment_result: {
                  roles_shipped: shipmentResult.rolesShipped || 0,
                  resources_shipped: shipmentResult.resourcesShipped || 0,
                },
              };
              shippingLog = await (tx as typeof prisma).shippingLog.update({
                where: { id: shippingLog.id },
                data: {
                  shipping_data: updatedShippingData,
                  source: source,
                },
              });
            }
          } catch (error) {
            // 发货过程出错，记录错误但不影响发货日志的创建
            shipmentError =
              error instanceof Error ? error.message : String(error);
            console.error(
              '[V5Sync Order Ship] 发货过程异常:',
              shipmentError,
              error
            );
            shippingLog = await (tx as typeof prisma).shippingLog.update({
              where: { id: shippingLog.id },
              data: {
                error_message: shipmentError,
                status: 'failed',
                source: source,
              },
            });
          }
        }
      } else {
        // 状态不是 success，跳过发货
        if (status !== 'success') {
          console.log('[V5Sync Order Ship] 跳过发货: 状态不是 success', status);
        }
      }

      return {
        shippingLog,
        shipmentError,
      };
    });

    console.log('[V5Sync Order Ship] 事务处理完成');

    // 如果订单验证失败，返回错误响应（但日志已记录）
    if (orderValidationError !== null) {
      const validationError = orderValidationError as {
        message: string;
        statusCode: number;
      };
      console.log('[V5Sync Order Ship] 返回验证失败响应:', {
        status: validationError.statusCode,
        error: validationError.message,
        log_id: result.shippingLog.id,
      });
      return NextResponse.json(
        {
          success: false,
          error: validationError.message,
          // 即使验证失败，日志也已记录
          log_id: result.shippingLog.id,
        },
        { status: validationError.statusCode }
      );
    }

    // 如果发货失败，返回警告信息（但日志已记录）
    const responseMessage = result.shipmentError
      ? `发货信息已同步，但实际发货失败: ${result.shipmentError}`
      : '发货信息已成功同步';

    console.log('[V5Sync Order Ship] 返回成功响应:', {
      success: !result.shipmentError,
      log_id: result.shippingLog.id,
      order_no: result.shippingLog.order_no,
      status: result.shippingLog.status,
      has_shipment_error: !!result.shipmentError,
    });

    return NextResponse.json({
      success: result.shipmentError ? false : true,
      message: responseMessage,
      data: {
        id: result.shippingLog.id,
        order_no: result.shippingLog.order_no,
        shipping_type: result.shippingLog.shipping_type,
        status: result.shippingLog.status,
        shipped_at: result.shippingLog.shipped_at,
        shipment_error: result.shipmentError || undefined,
      },
    });
  } catch (error: any) {
    console.error('[V5Sync Order Ship] 同步失败:', error);

    // 处理订单不存在的情况
    if (error.message && error.message.includes('不存在')) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 404 }
      );
    }

    // 处理订单不匹配的情况
    if (error.message && error.message.includes('不匹配')) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || '同步发货信息失败',
      },
      { status: 500 }
    );
  }
}

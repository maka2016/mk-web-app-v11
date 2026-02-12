import { prisma } from '@mk/jiantie/v11-database';
import { NextRequest, NextResponse } from 'next/server';
import { logV5SyncApi } from '../utils/log';

/**
 * V5 创建订单双写接口
 *
 * 用于旧系统在创建订单后，将订单信息同步到新系统（v11数据库）
 * 详细的调用方法和示例请参考：/api/v5sync/README.md
 */

interface OrderMeta {
  device?: string;
  version?: string;
  bundle_id?: string;
  ip?: string;
  header_info?: Record<string, any>;
  channel_id?: string;
  device_identifiers?: Record<string, any>;
  utm_metadata?: Record<string, any>;
  trace_metadata?: Record<string, any>;
  [key: string]: any;
}

interface CreateOrderRequest {
  order_no: string; // 必需：业务唯一订单号
  appid: string; // 必需：应用ID（不再限制必须为 "maka" 或 "jiantie"）
  uid: number; // 必需：用户ID
  amount: number; // 必需：订单金额（分）
  currency?: string; // 可选：货币类型，默认为 "CNY"
  order_status?: string; // 可选：订单状态，默认为 "created"
  product_id?: string; // 可选：商品ID
  product_alias?: string; // 可选：商品别名
  meta?: OrderMeta; // 可选：订单扩展信息
  create_time?: string; // 可选：创建时间，ISO 8601格式，默认为当前时间
}

export async function POST(request: NextRequest) {
  let body: CreateOrderRequest;
  try {
    body = await request.json();
  } catch {
    const errorResponse = NextResponse.json(
      { success: false, error: '请求体格式错误，必须是有效的 JSON' },
      { status: 400 }
    );
    // 记录失败日志
    await logV5SyncApi(
      'order-create',
      null,
      { success: false, error: '请求体格式错误，必须是有效的 JSON' },
      'failed',
      400,
      '请求体格式错误，必须是有效的 JSON'
    );
    return errorResponse;
  }

  try {
    // 验证必需字段
    if (!body || !body.order_no || typeof body.order_no !== 'string') {
      const errorResponse = NextResponse.json(
        { success: false, error: 'order_no 是必需的且必须为字符串' },
        { status: 400 }
      );
      // 记录失败日志
      await logV5SyncApi(
        'order-create',
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
      // 记录失败日志
      await logV5SyncApi(
        'order-create',
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
      // 记录失败日志
      await logV5SyncApi(
        'order-create',
        body,
        { success: false, error: 'uid 是必需的且必须为数字' },
        'failed',
        400,
        'uid 是必需的且必须为数字'
      );
      return errorResponse;
    }

    if (!body.amount || typeof body.amount !== 'number') {
      const errorResponse = NextResponse.json(
        { success: false, error: 'amount 是必需的且必须为数字（单位：分）' },
        { status: 400 }
      );
      // 记录失败日志
      await logV5SyncApi(
        'order-create',
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
      // 记录失败日志
      await logV5SyncApi(
        'order-create',
        body,
        { success: false, error: 'order_no 长度不能超过 30 个字符' },
        'failed',
        400,
        'order_no 长度不能超过 30 个字符'
      );
      return errorResponse;
    }

    // 解析创建时间
    const createTime = body.create_time
      ? new Date(body.create_time)
      : new Date();
    const currency = body.currency || 'CNY';
    const orderStatus = body.order_status || 'created';
    const meta = body.meta || {};

    // 检查订单是否已存在
    const existingOrder = await prisma.order.findUnique({
      where: { order_no: body.order_no },
    });

    const isUpdate = !!existingOrder;

    // 使用事务确保数据一致性
    const result = await prisma.$transaction(async tx => {
      if (existingOrder) {
        // 如果订单已存在，更新订单信息
        const updatedOrder = await (tx as typeof prisma).order.update({
          where: { order_no: body.order_no },
          data: {
            appid: body.appid,
            uid: body.uid,
            amount: body.amount,
            currency: currency,
            order_status: orderStatus,
            product_alias: body.product_alias || undefined,
            meta: meta,
            update_time: new Date(),
          },
        });
        return updatedOrder;
      } else {
        // 创建新订单
        const newOrder = await (tx as typeof prisma).order.create({
          data: {
            order_no: body.order_no,
            appid: body.appid,
            uid: body.uid,
            amount: body.amount,
            currency: currency,
            order_status: orderStatus,
            product_alias: body.product_alias || undefined,
            meta: meta,
            create_time: createTime,
          },
        });
        return newOrder;
      }
    });

    const response = NextResponse.json({
      success: true,
      message: isUpdate ? '订单信息已更新' : '订单创建成功',
      data: {
        order_no: result.order_no,
        appid: result.appid,
        uid: result.uid,
        amount: result.amount,
        order_status: result.order_status,
      },
    });

    // 记录成功日志
    await logV5SyncApi(
      'order-create',
      body,
      {
        success: true,
        order_no: result.order_no,
        appid: result.appid,
        uid: result.uid,
        amount: result.amount,
        order_status: result.order_status,
      },
      'success',
      200
    );

    return response;
  } catch (error: any) {
    console.error('[V5Sync Order Create] 同步失败:', error);

    // 处理唯一约束冲突（订单号已存在）
    if (error.code === 'P2002') {
      const errorResponse = NextResponse.json(
        {
          success: false,
          error: `订单号 order_no=${body?.order_no || 'unknown'} 已存在`,
        },
        { status: 409 }
      );
      // 记录失败日志
      await logV5SyncApi(
        'order-create',
        body,
        {
          success: false,
          error: `订单号 order_no=${body?.order_no || 'unknown'} 已存在`,
        },
        'failed',
        409,
        `订单号 order_no=${body?.order_no || 'unknown'} 已存在`
      );
      return errorResponse;
    }

    const errorResponse = NextResponse.json(
      {
        success: false,
        error: error.message || '同步订单信息失败',
      },
      { status: 500 }
    );
    // 记录失败日志
    await logV5SyncApi(
      'order-create',
      body,
      {
        success: false,
        error: error.message || '同步订单信息失败',
      },
      'failed',
      500,
      error.message || '同步订单信息失败'
    );
    return errorResponse;
  }
}

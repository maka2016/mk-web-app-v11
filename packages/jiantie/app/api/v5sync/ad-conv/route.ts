import { prisma } from '@mk/jiantie/v11-database';
import { NextRequest, NextResponse } from 'next/server';
import { logV5SyncApi } from '../utils/log';

/**
 * V5 广告转化事件数据同步接口
 *
 * 用于旧系统将广告转化事件数据同步到新系统（v11数据库）
 * 写入新表 ADV2ConversionEventEntity
 * 详细的调用方法和示例请参考：/api/v5sync/README.md
 */

interface AdConvRequest {
  event: string; // 必需：事件名，例如 register、login、pay_success 等
  uid: number; // 必需：业务 UID（用户 ID）
  data?: Record<string, any>; // 可选：事件参数（JSON格式）
  platform?: string; // 可选：广告平台标识，例如 gdt、toutiao 等
  appid?: string; // 可选：应用ID
  create_time?: string; // 可选：创建时间，ISO 8601格式，默认为当前时间
}

export async function POST(request: NextRequest) {
  let body: AdConvRequest;
  try {
    body = await request.json();
  } catch {
    const errorResponse = NextResponse.json(
      { success: false, error: '请求体格式错误，必须是有效的 JSON' },
      { status: 400 }
    );
    // 记录失败日志
    await logV5SyncApi(
      'adconv',
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
    if (!body || !body.event || typeof body.event !== 'string') {
      const errorResponse = NextResponse.json(
        { success: false, error: 'event 是必需的且必须为字符串' },
        { status: 400 }
      );
      // 记录失败日志
      await logV5SyncApi(
        'adconv',
        body,
        { success: false, error: 'event 是必需的且必须为字符串' },
        'failed',
        400,
        'event 是必需的且必须为字符串'
      );
      return errorResponse;
    }

    if (typeof body.uid !== 'number' || !Number.isFinite(body.uid)) {
      const errorResponse = NextResponse.json(
        { success: false, error: 'uid 是必需的且必须为数字' },
        { status: 400 }
      );
      // 记录失败日志
      await logV5SyncApi(
        'adconv',
        body,
        { success: false, error: 'uid 是必需的且必须为数字' },
        'failed',
        400,
        'uid 是必需的且必须为数字'
      );
      return errorResponse;
    }

    // 解析创建时间
    const createTime = body.create_time ? new Date(body.create_time) : new Date();

    // 写入新表 ADV2ConversionEventEntity
    const result = await prisma.aDV2ConversionEventEntity.create({
      data: {
        event: body.event,
        uid: body.uid,
        data: body.data || {},
        platform: body.platform || null,
        appid: body.appid || null,
        attribution_status: 'pending', // 新表使用 attribution_status，默认为 pending
        create_time: createTime,
      },
    });

    const responseData = {
      id: result.id,
      event: result.event,
      uid: result.uid,
    };

    const response = NextResponse.json({
      success: true,
      message: '广告转化事件数据已成功同步',
      data: responseData,
    });

    // 记录成功日志
    await logV5SyncApi(
      'adconv',
      body,
      {
        success: true,
        ...responseData,
      },
      'success',
      200
    );

    return response;
  } catch (error: any) {
    console.error('[V5Sync AdConv] 同步失败:', error);

    // 处理唯一约束冲突
    if (error.code === 'P2002') {
      const errorResponse = NextResponse.json(
        {
          success: false,
          error: `广告转化事件记录已存在，但更新失败`,
        },
        { status: 409 }
      );
      // 记录失败日志
      await logV5SyncApi(
        'adconv',
        body,
        {
          success: false,
          error: `广告转化事件记录已存在，但更新失败`,
        },
        'failed',
        409,
        `广告转化事件记录已存在，但更新失败`
      );
      return errorResponse;
    }

    const errorResponse = NextResponse.json(
      {
        success: false,
        error: error.message || '同步广告转化事件数据失败',
      },
      { status: 500 }
    );
    // 记录失败日志
    await logV5SyncApi(
      'adconv',
      body,
      {
        success: false,
        error: error.message || '同步广告转化事件数据失败',
      },
      'failed',
      500,
      error.message || '同步广告转化事件数据失败'
    );
    return errorResponse;
  }
}

import { prisma } from '@mk/jiantie/v11-database';
import { NextRequest, NextResponse } from 'next/server';
import { logV5SyncApi } from '../utils/log';

/**
 * V5 广告归因结果数据同步接口
 *
 * 用于旧系统将广告归因结果数据同步到新系统（v11数据库）
 * 写入新表 ADV2AttributionResultEntity
 * 详细的调用方法和示例请参考：/api/v5sync/README.md
 */

interface AdAttrRequest {
  // 归因结果数据
  attribution_data: Record<string, any>; // 必需：归因数据（JSON格式），包含归因后的完整信息
  attribution_type: string; // 必需：归因来源类型，例如 event、third_party 等

  // 转化事件关联信息（用于和转化事件关联）
  // 方式1：直接提供转化事件ID
  conversion_event_id?: string; // 可选：转化事件ID（如果已知）
  // 方式2：提供转化事件标识信息（用于查找转化事件）
  conversion_event?: {
    event: string; // 事件名，例如 register、login、pay_success 等
    uid: number; // 业务 UID（用户 ID）
    create_time?: string; // 可选：创建时间，ISO 8601格式，用于精确匹配
  };

  // 其他可选字段
  click_callback_flow_id?: string; // 可选：关联的点击回调数据ID
  uid?: number; // 可选：用户 ID（如果没有提供 conversion_event，可以单独提供）
  platform?: string; // 可选：广告平台标识，例如 gdt、toutiao 等
  appid?: string; // 可选：应用ID
  create_time?: string; // 可选：创建时间，ISO 8601格式，默认为当前时间
}

export async function POST(request: NextRequest) {
  let body: AdAttrRequest;
  try {
    body = await request.json();
  } catch {
    const errorResponse = NextResponse.json(
      { success: false, error: '请求体格式错误，必须是有效的 JSON' },
      { status: 400 }
    );
    // 记录失败日志
    await logV5SyncApi(
      'adattr',
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
    if (!body || !body.attribution_data || typeof body.attribution_data !== 'object') {
      const errorResponse = NextResponse.json(
        { success: false, error: 'attribution_data 是必需的且必须为对象' },
        { status: 400 }
      );
      // 记录失败日志
      await logV5SyncApi(
        'adattr',
        body,
        { success: false, error: 'attribution_data 是必需的且必须为对象' },
        'failed',
        400,
        'attribution_data 是必需的且必须为对象'
      );
      return errorResponse;
    }

    if (!body.attribution_type || typeof body.attribution_type !== 'string') {
      const errorResponse = NextResponse.json(
        { success: false, error: 'attribution_type 是必需的且必须为字符串' },
        { status: 400 }
      );
      // 记录失败日志
      await logV5SyncApi(
        'adattr',
        body,
        { success: false, error: 'attribution_type 是必需的且必须为字符串' },
        'failed',
        400,
        'attribution_type 是必需的且必须为字符串'
      );
      return errorResponse;
    }

    // 验证转化事件关联信息
    if (!body.conversion_event_id && !body.conversion_event) {
      const errorResponse = NextResponse.json(
        {
          success: false,
          error: '必须提供 conversion_event_id 或 conversion_event 用于关联转化事件',
        },
        { status: 400 }
      );
      // 记录失败日志
      await logV5SyncApi(
        'adattr',
        body,
        {
          success: false,
          error: '必须提供 conversion_event_id 或 conversion_event 用于关联转化事件',
        },
        'failed',
        400,
        '必须提供 conversion_event_id 或 conversion_event 用于关联转化事件'
      );
      return errorResponse;
    }

    // 查找或验证转化事件ID
    let conversionEventId: string | null = null;
    let finalUid: number | null = null;

    if (body.conversion_event_id) {
      // 方式1：直接使用提供的转化事件ID
      conversionEventId = body.conversion_event_id;

      // 验证转化事件是否存在，并获取 uid
      const conversionEvent = await prisma.aDV2ConversionEventEntity.findUnique({
        where: { id: conversionEventId },
        select: { id: true, uid: true },
      });

      if (!conversionEvent) {
        const errorResponse = NextResponse.json(
          {
            success: false,
            error: `转化事件不存在：conversion_event_id=${conversionEventId}`,
          },
          { status: 404 }
        );
        // 记录失败日志
        await logV5SyncApi(
          'adattr',
          body,
          {
            success: false,
            error: `转化事件不存在：conversion_event_id=${conversionEventId}`,
          },
          'failed',
          404,
          `转化事件不存在：conversion_event_id=${conversionEventId}`
        );
        return errorResponse;
      }

      finalUid = conversionEvent.uid;
    } else if (body.conversion_event) {
      // 方式2：通过转化事件标识信息查找
      const { event, uid, create_time } = body.conversion_event;

      if (!event || typeof event !== 'string') {
        const errorResponse = NextResponse.json(
          { success: false, error: 'conversion_event.event 是必需的且必须为字符串' },
          { status: 400 }
        );
        await logV5SyncApi(
          'adattr',
          body,
          { success: false, error: 'conversion_event.event 是必需的且必须为字符串' },
          'failed',
          400,
          'conversion_event.event 是必需的且必须为字符串'
        );
        return errorResponse;
      }

      if (typeof uid !== 'number' || !Number.isFinite(uid)) {
        const errorResponse = NextResponse.json(
          { success: false, error: 'conversion_event.uid 是必需的且必须为数字' },
          { status: 400 }
        );
        await logV5SyncApi(
          'adattr',
          body,
          { success: false, error: 'conversion_event.uid 是必需的且必须为数字' },
          'failed',
          400,
          'conversion_event.uid 是必需的且必须为数字'
        );
        return errorResponse;
      }

      // 构建查询条件
      const where: any = {
        event: event,
        uid: uid,
      };

      // 如果提供了创建时间，用于精确匹配
      if (create_time) {
        const createTime = new Date(create_time);
        // 使用时间范围查询（前后1秒内）
        where.create_time = {
          gte: new Date(createTime.getTime() - 1000),
          lte: new Date(createTime.getTime() + 1000),
        };
      }

      // 查找转化事件（按创建时间倒序，取最新的）
      const conversionEvent = await prisma.aDV2ConversionEventEntity.findFirst({
        where,
        orderBy: { create_time: 'desc' },
        select: { id: true, uid: true },
      });

      if (!conversionEvent) {
        const errorResponse = NextResponse.json(
          {
            success: false,
            error: `未找到匹配的转化事件：event=${event}, uid=${uid}`,
          },
          { status: 404 }
        );
        await logV5SyncApi(
          'adattr',
          body,
          {
            success: false,
            error: `未找到匹配的转化事件：event=${event}, uid=${uid}`,
          },
          'failed',
          404,
          `未找到匹配的转化事件：event=${event}, uid=${uid}`
        );
        return errorResponse;
      }

      conversionEventId = conversionEvent.id;
      finalUid = conversionEvent.uid;
    }

    // 如果单独提供了 uid，使用提供的 uid（优先级高于从转化事件获取的）
    if (body.uid !== undefined) {
      finalUid = body.uid;
    }

    // 解析创建时间
    const createTime = body.create_time ? new Date(body.create_time) : new Date();

    // 构建 update 对象，只包含用户明确提供的字段
    const updateData: any = {
      attribution_data: body.attribution_data,
      attribution_type: body.attribution_type,
    };

    if (body.click_callback_flow_id !== undefined) {
      updateData.click_callback_flow_id = body.click_callback_flow_id || null;
    }
    if (body.uid !== undefined) {
      updateData.uid = body.uid;
    }
    if (body.platform !== undefined) {
      updateData.platform = body.platform || null;
    }
    if (body.appid !== undefined) {
      updateData.appid = body.appid || null;
    }

    // 写入新表 ADV2AttributionResultEntity
    // 使用 upsert 实现去重（基于 conversion_event_id 的唯一约束）
    const result = await prisma.aDV2AttributionResultEntity.upsert({
      where: {
        conversion_event_id: conversionEventId!,
      },
      create: {
        attribution_data: body.attribution_data,
        attribution_type: body.attribution_type,
        conversion_event_id: conversionEventId!,
        click_callback_flow_id: body.click_callback_flow_id || null,
        uid: finalUid,
        platform: body.platform || null,
        appid: body.appid || null,
        create_time: createTime,
      },
      update: updateData,
    });

    const responseData = {
      id: result.id,
      conversion_event_id: result.conversion_event_id,
      attribution_type: result.attribution_type,
    };

    const response = NextResponse.json({
      success: true,
      message: '广告归因结果数据已成功同步',
      data: responseData,
    });

    // 记录成功日志
    await logV5SyncApi(
      'adattr',
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
    console.error('[V5Sync AdAttr] 同步失败:', error);

    // 处理唯一约束冲突
    if (error.code === 'P2002') {
      const errorResponse = NextResponse.json(
        {
          success: false,
          error: `广告归因结果记录已存在，但更新失败`,
        },
        { status: 409 }
      );
      // 记录失败日志
      await logV5SyncApi(
        'adattr',
        body,
        {
          success: false,
          error: `广告归因结果记录已存在，但更新失败`,
        },
        'failed',
        409,
        `广告归因结果记录已存在，但更新失败`
      );
      return errorResponse;
    }

    const errorResponse = NextResponse.json(
      {
        success: false,
        error: error.message || '同步广告归因结果数据失败',
      },
      { status: 500 }
    );
    // 记录失败日志
    await logV5SyncApi(
      'adattr',
      body,
      {
        success: false,
        error: error.message || '同步广告归因结果数据失败',
      },
      'failed',
      500,
      error.message || '同步广告归因结果数据失败'
    );
    return errorResponse;
  }
}

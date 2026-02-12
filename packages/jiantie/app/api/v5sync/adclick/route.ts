import { prisma } from '@mk/jiantie/v11-database';
import { NextRequest, NextResponse } from 'next/server';
import { logV5SyncApi } from '../utils/log';

/**
 * V5 广告点击数据同步接口
 *
 * 用于旧系统将广告点击回调数据同步到新系统（v11数据库）
 * 详细的调用方法和示例请参考：/api/v5sync/README.md
 */

interface AdClickRequest {
  platform: string; // 必需：广告平台标识，如 "gdt"、"bytedance"、"tencent" 等
  click_id: string; // 必需：点击ID
  impression_id?: string; // 可选：曝光ID
  callback?: string; // 可选：回调参数
  attribution_data?: Record<string, any>; // 可选：归因数据（JSON格式，如抖音 App / Apple ASA 归因结果）
  data?: Record<string, any>; // 可选：其他回调数据（JSON格式）
  raw_query?: string; // 可选：原始URL查询字符串
  create_time?: string; // 可选：创建时间，ISO 8601格式，默认为当前时间
  appid?: string; // 可选：应用ID
}

export async function POST(request: NextRequest) {
  let body: AdClickRequest;
  try {
    body = await request.json();
  } catch {
    const errorResponse = NextResponse.json(
      { success: false, error: '请求体格式错误，必须是有效的 JSON' },
      { status: 400 }
    );
    // 记录失败日志
    await logV5SyncApi(
      'adclick',
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
    if (!body || !body.platform || typeof body.platform !== 'string') {
      const errorResponse = NextResponse.json(
        { success: false, error: 'platform 是必需的且必须为字符串' },
        { status: 400 }
      );
      // 记录失败日志
      await logV5SyncApi(
        'adclick',
        body,
        { success: false, error: 'platform 是必需的且必须为字符串' },
        'failed',
        400,
        'platform 是必需的且必须为字符串'
      );
      return errorResponse;
    }

    if (!body.click_id || typeof body.click_id !== 'string') {
      const errorResponse = NextResponse.json(
        { success: false, error: 'click_id 是必需的且必须为字符串' },
        { status: 400 }
      );
      // 记录失败日志
      await logV5SyncApi(
        'adclick',
        body,
        { success: false, error: 'click_id 是必需的且必须为字符串' },
        'failed',
        400,
        'click_id 是必需的且必须为字符串'
      );
      return errorResponse;
    }

    // 解析创建时间
    const createTime = body.create_time ? new Date(body.create_time) : new Date();

    // 写入adv2表 - 使用 upsert 实现去重
    const result = await prisma.aDV2ClickCallbackFlowEntity.upsert({
      where: {
        platform_click_id: {
          platform: body.platform,
          click_id: body.click_id,
        },
      },
      create: {
        platform: body.platform,
        click_id: body.click_id,
        impression_id: body.impression_id || null,
        appid: body.appid || null,
        data: body.data || {},
        raw_query: body.raw_query || '',
        source: 'v5sync', // 标记来源为 v5sync
        create_time: createTime,
      },
      update: {
        impression_id: body.impression_id !== undefined ? body.impression_id : undefined,
        appid: body.appid !== undefined ? body.appid : undefined,
        data: body.data !== undefined ? (body.data as any) : undefined,
        raw_query: body.raw_query !== undefined ? body.raw_query : undefined,
        source: 'v5sync', // 更新来源为 v5sync
      },
    });

    const response = NextResponse.json({
      success: true,
      message: '广告点击数据已成功同步',
      data: {
        id: result.id,
        platform: result.platform,
        click_id: result.click_id,
      },
    });

    // 记录成功日志
    await logV5SyncApi(
      'adclick',
      body,
      {
        success: true,
        id: result.id,
        platform: result.platform,
        click_id: result.click_id,
      },
      'success',
      200
    );

    return response;
  } catch (error: any) {
    console.error('[V5Sync AdClick] 同步失败:', error);

    // 处理唯一约束冲突
    if (error.code === 'P2002') {
      const errorResponse = NextResponse.json(
        {
          success: false,
          error: `广告点击记录已存在，但更新失败`,
        },
        { status: 409 }
      );
      // 记录失败日志
      await logV5SyncApi(
        'adclick',
        body,
        {
          success: false,
          error: `广告点击记录已存在，但更新失败`,
        },
        'failed',
        409,
        `广告点击记录已存在，但更新失败`
      );
      return errorResponse;
    }

    const errorResponse = NextResponse.json(
      {
        success: false,
        error: error.message || '同步广告点击数据失败',
      },
      { status: 500 }
    );
    // 记录失败日志
    await logV5SyncApi(
      'adclick',
      body,
      {
        success: false,
        error: error.message || '同步广告点击数据失败',
      },
      'failed',
      500,
      error.message || '同步广告点击数据失败'
    );
    return errorResponse;
  }
}

import { prisma } from '@mk/jiantie/v11-database';
import { NextRequest, NextResponse } from 'next/server';

// 强制动态渲染，禁用所有缓存
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET 方法 - 接收广告平台点击回调数据
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> | { platform: string } }
) {
  try {
    // 获取 platform 参数（兼容同步和异步 params）
    const resolvedParams = params instanceof Promise ? await params : params;
    const platform = resolvedParams.platform;

    if (!platform) {
      return NextResponse.json(
        { error: 'Platform parameter is required' },
        {
          status: 400,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        }
      );
    }

    // 获取原始URL查询字符串
    const rawQuery = request.nextUrl.search;

    // 获取所有 URL 查询参数
    const searchParams = request.nextUrl.searchParams;

    // 必需字段验证
    const clickId = searchParams.get('click_id');

    if (!clickId) {
      return NextResponse.json(
        { error: 'click_id is required' },
        {
          status: 400,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        }
      );
    }

    // 获取关键字段
    const callback = searchParams.get('callback');
    const impressionId = searchParams.get('impression_id');
    const appid = searchParams.get('appid');

    // 构建其他数据对象（排除关键字段）
    const data: Record<string, any> = {};

    // 遍历所有参数，排除关键字段（这些字段单独建列）
    searchParams.forEach((value, key) => {
      data[key] = value;
    });

    // 往adv2双写 - 使用事务确保数据一致性
    await prisma.$transaction(async (tx: any) => {
      // 写入旧表
      await tx.adClickCallbackEntity.create({
        data: {
          platform,
          click_id: clickId,
          impression_id: impressionId || null,
          callback: callback || null,
          appid: appid || null,
          data: data,
          raw_query: rawQuery || '',
        },
      });

      // 写入adv2表 - 使用 upsert 实现去重
      await tx.aDV2ClickCallbackFlowEntity.upsert({
        where: {
          platform_click_id: {
            platform,
            click_id: clickId,
          },
        },
        create: {
          platform,
          click_id: clickId,
          impression_id: impressionId || null,
          appid: appid || null,
          data: data,
          raw_query: rawQuery || '',
          source: 'api', // 标记来源为 API
        },
        update: {
          impression_id: impressionId !== null ? impressionId : undefined,
          appid: appid !== null ? appid : undefined,
          data: data,
          raw_query: rawQuery || undefined,
          source: 'api', // 更新来源为 API
        },
      });
    });

    return NextResponse.json(
      { success: true },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('存储广告点击回调数据失败:', error);
    return NextResponse.json(
      {
        error: '存储失败',
        message: error instanceof Error ? error.message : '未知错误',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  }
}

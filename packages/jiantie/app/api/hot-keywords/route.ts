import { prisma } from '@mk/jiantie/v11-database';
import { NextRequest, NextResponse } from 'next/server';

// 强制动态渲染，禁用所有缓存
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// CORS 响应头
function getCorsHeaders(origin?: string | null) {
  // 如果提供了 origin，使用它；否则允许所有来源
  const allowOrigin = origin || '*';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Max-Age': '86400', // 24小时
    // 确保 nginx 不会覆盖这些头部
    Vary: 'Origin',
  };
}

/**
 * GET 方法 - 获取搜索热词列表
 *
 * 查询参数：
 * - appid: 应用ID筛选（可选）
 * - online: 是否上线（可选，true/false）
 * - keyword: 关键词搜索（可选，模糊匹配）
 * - skip: 跳过数量（可选，默认0）
 * - take: 获取数量（可选，默认20，最大100）
 *
 * 示例：
 * GET /api/hot-keywords?appid=maka&online=true&skip=0&take=20
 */
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  try {
    const searchParams = request.nextUrl.searchParams;
    const appid = searchParams.get('appid');
    const online = searchParams.get('online');
    const keyword = searchParams.get('keyword');
    const skip = searchParams.get('skip');
    const take = searchParams.get('take');

    // 构建查询条件
    const where: any = {
      deleted: false,
    };

    // 应用ID筛选
    if (appid) {
      where.appid = appid;
    }

    // 上线状态筛选
    if (online !== null) {
      where.online = online === 'true';
    }

    // 关键词模糊搜索
    if (keyword) {
      where.keyword = { contains: keyword, mode: 'insensitive' };
    }

    // 分页参数
    const skipNum = skip ? parseInt(skip, 10) : 0;
    const takeNum = take ? Math.min(parseInt(take, 10), 100) : 20;

    // 验证分页参数
    if (isNaN(skipNum) || skipNum < 0) {
      return NextResponse.json(
        { error: 'skip 参数无效，必须是非负整数' },
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Cache-Control':
              'no-store, no-cache, must-revalidate, proxy-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        }
      );
    }

    if (isNaN(takeNum) || takeNum < 1) {
      return NextResponse.json(
        { error: 'take 参数无效，必须是1-100之间的整数' },
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Cache-Control':
              'no-store, no-cache, must-revalidate, proxy-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        }
      );
    }

    // 并行查询数据和总数
    const [data, total] = await Promise.all([
      prisma.searchHotKeywordEntity.findMany({
        where,
        skip: skipNum,
        take: takeNum,
        orderBy: [{ sort_order: 'desc' }, { create_time: 'desc' }],
      }),
      prisma.searchHotKeywordEntity.count({ where }),
    ]);

    return NextResponse.json(
      {
        data,
        total,
      },
      {
        headers: {
          ...corsHeaders,
          'Cache-Control':
            'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('[Hot Keywords API] 获取热词列表失败:', error);
    return NextResponse.json(
      {
        error: '获取热词列表失败',
        message: error instanceof Error ? error.message : '未知错误',
      },
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Cache-Control':
            'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  }
}

/**
 * OPTIONS 方法 - 处理 CORS 预检请求
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(origin),
  });
}

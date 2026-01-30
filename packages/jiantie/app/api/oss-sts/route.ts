import {
  authenticateRequest,
  getSTSToken,
  loadAliCloudConfigFromEnv,
} from '@/server';
import { NextRequest, NextResponse } from 'next/server';

// 强制动态渲染，禁用所有缓存
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * 基于 worksId + clientFeatureId 生成稳定的访客 uid（仅用于 STS 路径隔离）
 * - 纯前端可见参数的简单哈希，不依赖用户中心
 * - 生成结果是一个正整数，范围控制在 1e7 ~ 2^31-1 之间，避免与真实用户 uid 冲突概率
 */
function generateGuestUid(worksId: string, clientFeatureId: string): number {
  const input = `${worksId}:${clientFeatureId}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  const base = 10_000_000;
  const max = 2_147_483_647;
  const range = max - base;
  const offset = hash % range;
  return base + offset;
}

/**
 * 获取OSS STS临时凭证
 * @param request - The incoming request
 * @returns STS临时凭证信息
 */
export async function GET(request: NextRequest) {
  try {
    // 从URL查询参数中获取appid和uid
    const { searchParams } = new URL(request.url);
    const appid = searchParams.get('appid');
    const uidParam = searchParams.get('uid');
    const durationParam = searchParams.get('duration');

    // 验证必要参数
    if (!appid || !uidParam) {
      return NextResponse.json(
        { error: 'Missing required parameters: appid and uid' },
        {
          status: 400,
          headers: {
            'Cache-Control':
              'no-store, no-cache, must-revalidate, proxy-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        }
      );
    }

    const uid = parseInt(uidParam, 10);
    if (isNaN(uid)) {
      return NextResponse.json(
        { error: 'Invalid uid parameter' },
        {
          status: 400,
          headers: {
            'Cache-Control':
              'no-store, no-cache, must-revalidate, proxy-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        }
      );
    }

    // 验证用户权限
    const authResult = await authenticateRequest(
      {
        headers: request.headers,
        url: request.url,
      },
      { uid, appid }
    );

    if (!authResult.isValid) {
      return NextResponse.json(
        {
          error: 'Authentication failed',
          message: authResult.error || 'Unauthorized',
        },
        {
          status: 401,
          headers: {
            'Cache-Control':
              'no-store, no-cache, must-revalidate, proxy-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        }
      );
    }

    // 解析duration参数（可选，默认3600秒）
    const duration = durationParam ? parseInt(durationParam, 10) : 3600;

    // 从环境变量加载阿里云配置
    const config = loadAliCloudConfigFromEnv();

    // 获取STS临时凭证
    const stsToken = await getSTSToken(config, appid, uid, duration);

    return NextResponse.json(stsToken, {
      headers: {
        'Cache-Control':
          'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('Error getting STS token:', error);
    return NextResponse.json(
      {
        error: 'Failed to get STS token',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 500,
        headers: {
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
 * POST方法支持 - 从请求体中获取参数
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      appid,
      uid,
      duration = 3600,
      // 访客场景专用参数：基于客户端特征 ID + worksId 生成临时 uid
      worksId,
      clientFeatureId,
    } = body;

    // ========= 访客 / 公共场景：基于 worksId + clientFeatureId 生成 uid，跳过用户中心鉴权 =========
    if (appid && worksId && clientFeatureId && !uid) {
      const guestUid = generateGuestUid(
        String(worksId),
        String(clientFeatureId)
      );

      const config = loadAliCloudConfigFromEnv();
      const stsToken = await getSTSToken(
        config,
        appid,
        guestUid,
        typeof duration === 'number' ? duration : 3600
      );

      return NextResponse.json(stsToken, {
        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });
    }

    // 验证必要参数
    if (!appid || !uid) {
      return NextResponse.json(
        { error: 'Missing required parameters: appid and uid' },
        {
          status: 400,
          headers: {
            'Cache-Control':
              'no-store, no-cache, must-revalidate, proxy-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        }
      );
    }

    // 验证用户权限
    const authResult = await authenticateRequest(
      {
        headers: request.headers,
        url: request.url,
        body,
      },
      { uid, appid }
    );

    if (!authResult.isValid) {
      return NextResponse.json(
        {
          error: 'Authentication failed',
          message: authResult.error || 'Unauthorized',
        },
        {
          status: 401,
          headers: {
            'Cache-Control':
              'no-store, no-cache, must-revalidate, proxy-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        }
      );
    }

    // 从环境变量加载阿里云配置
    const config = loadAliCloudConfigFromEnv();

    // 获取STS临时凭证
    const stsToken = await getSTSToken(config, appid, uid, duration);

    return NextResponse.json(stsToken, {
      headers: {
        'Cache-Control':
          'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('Error getting STS token:', error);
    return NextResponse.json(
      {
        error: 'Failed to get STS token',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 500,
        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  }
}

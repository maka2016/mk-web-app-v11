import {
  authenticateRequest,
  getSTSToken,
  loadAliCloudConfigFromEnv,
} from '@workspace/server';
import { NextRequest, NextResponse } from 'next/server';

// 强制动态渲染，禁用所有缓存
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    const { appid, uid, duration = 3600 } = body;

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

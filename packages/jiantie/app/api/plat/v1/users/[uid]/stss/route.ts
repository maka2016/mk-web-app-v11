import {
  getSTSToken,
  loadAliCloudConfigFromEnv,
} from '@workspace/server/src/oss/oss-client';
import { NextRequest, NextResponse } from 'next/server';

// 强制动态渲染，禁用所有缓存
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * 获取 OSS STS 临时访问凭证
 * @param request - The incoming request
 * @param params - 路由参数，包含 uid
 * @returns STS 临时访问凭证
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    // 从路由参数中获取 uid
    const { uid: uidStr } = await params;
    const uid = parseInt(uidStr, 10);
    const appid = 'jiantie';

    // 验证 uid
    if (!uid || isNaN(uid)) {
      return NextResponse.json(
        { error: 'Invalid user ID', message: 'tokenError' },
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

    // 从环境变量加载阿里云配置
    const config = loadAliCloudConfigFromEnv();

    // 获取临时凭证，默认有效期 3600 秒（1 小时）
    const stsResponse = await getSTSToken(config, appid, uid, 3600);

    // 返回 STS 凭证
    return NextResponse.json(
      {
        code: 0,
        data: stsResponse,
        message: 'success',
      },
      {
        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('STS token generation error:', error);

    // 返回错误信息
    return NextResponse.json(
      {
        error: 'Failed to generate STS token',
        message: 'tokenError',
        details: error instanceof Error ? error.message : String(error),
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

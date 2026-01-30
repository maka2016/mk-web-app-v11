import { createHmac } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

// 强制动态渲染，禁用所有缓存
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Base64url 编码函数
 */
function base64url(source: string | Buffer): string {
  let base64;
  if (typeof source === 'string') {
    base64 = Buffer.from(source).toString('base64');
  } else {
    base64 = source.toString('base64');
  }
  return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * 生成临时 JWT Token
 */
function generateTempToken(appid: string, uid: string | number): string {
  // 创建 payload
  const payload = {
    sub: appid + uid,
    uid: uid.toString(),
    appid: appid,
    username: 'TEST',
    exp: Math.floor(Date.now() / 1000) + 86400, // 1天后过期
  };

  // JWT header
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const headerEncoded = base64url(JSON.stringify(header));
  const payloadEncoded = base64url(JSON.stringify(payload));
  const unsignedToken = `${headerEncoded}.${payloadEncoded}`;

  const secret = 'moriJwtSecret240829';

  // 使用 Node.js crypto 进行 HMAC-SHA256 签名
  const signature = createHmac('sha256', secret).update(unsignedToken).digest();
  const signatureEncoded = base64url(signature);

  return `${unsignedToken}.${signatureEncoded}`;
}

/**
 * POST 方法 - 生成临时 token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appid, uid } = body;

    // 验证必要参数
    if (!appid || !uid) {
      return NextResponse.json(
        { error: '缺少必要参数: appid 和 uid' },
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

    // 生成临时 token
    const token = generateTempToken(appid, uid);

    return NextResponse.json(
      { token },
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
    console.error('生成临时 token 失败:', error);
    return NextResponse.json(
      {
        error: '生成临时 token 失败',
        message: error instanceof Error ? error.message : '未知错误',
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
 * GET 方法 - 支持通过 URL 参数生成临时 token
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const appid = searchParams.get('appid');
    const uid = searchParams.get('uid');

    // 验证必要参数
    if (!appid || !uid) {
      return NextResponse.json(
        { error: '缺少必要参数: appid 和 uid' },
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

    // 生成临时 token
    const token = generateTempToken(appid, uid);

    return NextResponse.json(
      { token },
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
    console.error('生成临时 token 失败:', error);
    return NextResponse.json(
      {
        error: '生成临时 token 失败',
        message: error instanceof Error ? error.message : '未知错误',
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

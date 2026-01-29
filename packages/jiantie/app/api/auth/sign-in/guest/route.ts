import {
  findOrCreateGuestUser,
  generateGuestId,
  generateToken,
} from '@/server/auth/social-auth';
import { log } from '@/server/logger';
import { prisma } from '@mk/jiantie/v11-database';
import { NextRequest, NextResponse } from 'next/server';

// 强制动态渲染，禁用所有缓存
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface GuestSignInRequest {
  appid: string; // 应用ID
}

interface HeaderData {
  appid: string | null;
  device: string | null;
  version: string | null;
  bundleid: string | null;
  idfa: string | null;
  oaid: string | null;
  idfv: string | null;
  androidid: string | null;
}

/**
 * 提取请求的 header 信息
 */
function extractHeaderData(request: NextRequest, body: GuestSignInRequest): HeaderData {
  const headers = request.headers;
  return {
    appid: headers.get('appid') || body.appid || null,
    device: headers.get('device') || null,
    version: headers.get('version') || null,
    bundleid: headers.get('bundleid') || headers.get('bundle-id') || null,
    idfa: headers.get('idfa') || null,
    oaid: headers.get('oaid') || null,
    idfv: headers.get('idfv') || null,
    androidid: headers.get('androidid') || null,
  };
}

/**
 * 记录登录日志
 */
async function logUserLogin(
  uid: number,
  appid: string,
  loginType: string,
  headerData: HeaderData,
  token: string,
  request: NextRequest
): Promise<void> {
  try {
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || null;
    const userAgent = request.headers.get('user-agent') || null;

    const loginHeaderData = {
      ...headerData,
      uid: uid.toString(),
      token: token,
    };

    prisma.userLoginLog
      .create({
        data: {
          uid,
          appid,
          login_type: loginType,
          header_data: loginHeaderData,
          ip_address: ipAddress,
          user_agent: userAgent,
        },
      })
      .catch(error => {
        log.error({ error }, '记录登录日志失败');
      });
  } catch (logError) {
    log.error({ logError }, '记录登录日志异常');
  }
}

/**
 * POST 方法 - 游客登录
 */
export async function POST(request: NextRequest) {
  try {
    const body: GuestSignInRequest = await request.json();

    // 提取 header 信息
    const headerData = extractHeaderData(request, body);
    log.info({ headerData }, '游客登录 headerData');

    // 验证必需字段
    const appId = headerData.appid || body.appid;
    if (!appId) {
      return NextResponse.json({ success: false, error: 'appid 是必需的' }, { status: 400 });
    }

    // 生成游客唯一标识
    const guestId = generateGuestId(headerData);
    log.info({ guestId }, '生成的游客ID');

    // 查找或创建游客用户
    const { uid, isNewUser } = await findOrCreateGuestUser(appId, guestId, headerData);

    // 从数据库获取用户信息（用于生成 token）
    const user = await prisma.user.findUnique({
      where: { uid },
      select: {
        uid: true,
        username: true,
        appid: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 });
    }

    // 生成 token
    const token = generateToken(user.appid, user.uid, user.username);

    log.info({ user, isNewUser }, '游客登录成功');

    // 记录登录日志
    await logUserLogin(user.uid, user.appid, 'guest', headerData, token, request);

    // 返回结果
    return NextResponse.json(
      {
        success: true,
        data: {
          token,
          uid: user.uid,
          appid: user.appid,
          info: {
            username: user.username,
          },
          isNewUser,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error: unknown) {
    log.error({ error }, '[Guest Sign In] 游客登录失败');

    const message = error instanceof Error ? error.message : '游客登录失败';
    return NextResponse.json(
      {
        success: false,
        error: message,
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

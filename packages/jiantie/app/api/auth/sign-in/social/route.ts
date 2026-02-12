import {
  findOrCreateUser,
  generateToken,
  verifyAppleIdentityToken,
  verifyGoogleIdentityToken,
} from '@/server/auth/social-auth';
import { log } from '@/server/logger';
import { prisma } from '@mk/jiantie/v11-database';
import { NextRequest, NextResponse } from 'next/server';

// 强制动态渲染，禁用所有缓存
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface SocialSignInRequest {
  provider: 'apple' | 'google' | 'wechat' | 'qq';
  identityToken: string; // 社交登录的 identity token（Apple 或 Google）
  authorizationCode?: string; // 苹果登录的 authorization code（可选）
  appid: string; // 应用ID
  bundleId?: string; // 应用的 bundle ID（Apple 需要）
  email?: string; // 用户邮箱（苹果可能不返回，需要客户端传递）
  fullName?: {
    givenName?: string;
    familyName?: string;
  }; // 用户全名（苹果可能不返回）
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
function extractHeaderData(request: NextRequest, body: SocialSignInRequest): HeaderData {
  const headers = request.headers;
  return {
    appid: headers.get('appid') || body.appid || null,
    device: headers.get('device') || null,
    version: headers.get('version') || null,
    bundleid: headers.get('bundleid') || headers.get('bundle-id') || body.bundleId || null,
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
 * 处理 Apple 登录
 */
async function handleAppleLogin(
  body: SocialSignInRequest,
  headerData: HeaderData,
  request: NextRequest
): Promise<NextResponse> {
  const appId = headerData.appid ?? '';
  const bundleId = headerData.bundleid ?? '';

  if (!body.identityToken) {
    return NextResponse.json({ success: false, error: 'identityToken 是必需的' }, { status: 400 });
  }

  if (!bundleId) {
    return NextResponse.json({ success: false, error: 'bundleId 是必需的（Apple 登录）' }, { status: 400 });
  }

  // 1. 验证苹果 identity token
  const appleClaims = await verifyAppleIdentityToken(body.identityToken, bundleId);

  if (!appleClaims || !appleClaims.sub) {
    return NextResponse.json({ success: false, error: '无效的苹果登录 token' }, { status: 401 });
  }

  // 2. 查找或创建用户
  const { uid, isNewUser } = await findOrCreateUser(
    appId,
    'apple',
    appleClaims.sub,
    appleClaims.email || body.email,
    body.fullName
  );

  // 3. 从数据库获取用户信息（用于生成 token）
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

  // 4. 生成 token
  const token = generateToken(user.appid, user.uid, user.username);

  log.info({ user }, 'Apple 登录成功');

  // 5. 记录登录日志
  await logUserLogin(user.uid, user.appid, 'apple', headerData, token, request);

  // 6. 返回结果
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
}

/**
 * 根据 appid 获取对应的 Google Web Client ID
 */
function getGoogleWebClientId(appid: string): string | null {
  // 优先从环境变量读取（格式：GOOGLE_WEB_CLIENT_ID_<APPID>）
  const envKey = `GOOGLE_WEB_CLIENT_ID_${appid.toUpperCase()}`;
  const envClientId = process.env[envKey];

  console.log('envClientId', envClientId);
  if (envClientId) {
    return envClientId;
  }

  log.error({ appid }, '未找到 appid 对应的 Google Web Client ID 配置');
  return null;
}

/**
 * 处理 Google 登录
 */
async function handleGoogleLogin(
  body: SocialSignInRequest,
  headerData: HeaderData,
  request: NextRequest
): Promise<NextResponse> {
  const appId = headerData.appid ?? '';

  log.info({ body }, 'body');
  if (!body.identityToken) {
    return NextResponse.json({ success: false, error: 'identityToken 是必需的' }, { status: 400 });
  }

  // 根据 appid 获取对应的 Google Web Client ID
  const webClientId = getGoogleWebClientId(appId);
  if (!webClientId) {
    return NextResponse.json(
      { success: false, error: `未找到 appid "${appId}" 对应的 Google Web Client ID 配置` },
      { status: 400 }
    );
  }

  // 1. 验证 Google identity token
  const googleClaims = await verifyGoogleIdentityToken(body.identityToken, webClientId);

  log.info({ googleClaims }, 'googleClaims');
  if (!googleClaims || !googleClaims.sub) {
    return NextResponse.json({ success: false, error: '无效的 Google 登录 token' }, { status: 401 });
  }

  // googleClaims: {
  //   "sub": "117502127330848415134",
  //   "email": "wsyulinli@gmail.com",
  //   "email_verified": true,
  //   "name": "li li",
  //   "given_name": "li",
  //   "family_name": "li",
  //   "picture": "https://lh3.googleusercontent.com/a/ACg8ocL7RpTue4jA10AZaeHFCrHnWowjQjgHN-pCh3nTiVqIN2MhIw=s96-c"
  // }
  // 2. 查找或创建用户
  const { uid, isNewUser } = await findOrCreateUser(
    appId,
    'google',
    googleClaims.sub,
    googleClaims.email,
    {
      givenName: googleClaims.given_name,
      familyName: googleClaims.family_name,
    },
    googleClaims.picture
  );

  // 3. 从数据库获取用户信息（用于生成 token）
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

  // 4. 生成 token
  const token = generateToken(user.appid, user.uid, user.username);

  log.info({ user }, 'Google 登录成功');

  // 5. 记录登录日志
  await logUserLogin(user.uid, user.appid, 'google', headerData, token, request);

  // 6. 返回结果
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
}

/**
 * POST 方法 - 社交登录（支持 Apple 和 Google）
 */
export async function POST(request: NextRequest) {
  try {
    const body: SocialSignInRequest = await request.json();

    // 提取 header 信息
    const headerData = extractHeaderData(request, body);
    log.info({ headerData }, 'headerData');

    // 验证必需字段
    if (!body.provider) {
      return NextResponse.json({ success: false, error: 'provider 是必需的' }, { status: 400 });
    }

    // 根据 provider 路由到对应的 handler
    switch (body.provider) {
      case 'apple':
        return await handleAppleLogin(body, headerData, request);
      case 'google':
        return await handleGoogleLogin(body, headerData, request);
      case 'wechat':
      case 'qq':
        return NextResponse.json({ success: false, error: `暂不支持 ${body.provider} 登录` }, { status: 400 });
      default:
        return NextResponse.json({ success: false, error: `不支持的 provider: ${body.provider}` }, { status: 400 });
    }
  } catch (error: unknown) {
    log.error({ error }, '[Social Sign In] 登录失败');

    const message = error instanceof Error ? error.message : '社交登录失败';
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

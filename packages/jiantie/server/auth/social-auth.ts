import { prisma } from '@mk/jiantie/v11-database';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import verifyAppleToken from 'verify-apple-id-token';
import { log } from '../logger';

/**
 * 创建 JwtService 实例（用于 Next.js 环境，不依赖 NestJS DI）
 */
const jwtService = new JwtService({
  secret: process.env.JWT_SECRET || 'moriJwtSecret240829',
  signOptions: {
    algorithm: 'HS256',
    expiresIn: '180d', // 365天后过期
  },
});

/** generateToken 产出的 JWT payload 结构 */
interface JwtPayload {
  sub: string;
  uid: string;
  appid: string;
  username: string;
  exp: number;
}

/**
 * 生成 JWT Token
 */
export function generateToken(appid: string, uid: string | number, username: string): string {
  log.info({ appid, uid, username }, 'generateToken');
  const payload = {
    sub: appid + uid,
    uid: uid.toString(),
    appid: appid,
    username: username,
  };

  return jwtService.sign(payload);
}

/**
 * 验证 auth 生成的 JWT，解析出 uid、appid。
 * 与 generateToken 使用相同 secret 与算法（HS256）。
 */
export function verifyToken(token: string): { uid: number; appid: string } | null {
  try {
    const payload = jwtService.verify<JwtPayload>(token);
    if (!payload.uid || !payload.appid) return null;

    const uid = parseInt(payload.uid, 10);
    if (Number.isNaN(uid)) return null;

    return { uid, appid: payload.appid };
  } catch {
    return null;
  }
}

/**
 * 验证苹果登录的 identity token
 */
export async function verifyAppleIdentityToken(
  identityToken: string,
  clientId: string
): Promise<{
  sub: string; // 用户唯一标识
  email?: string;
  email_verified?: boolean;
} | null> {
  try {
    if (!clientId) {
      log.error('Apple Client ID 未配置');
      return null;
    }

    // 使用 verify-apple-id-token 库验证 token
    const jwtClaims = await verifyAppleToken({
      idToken: identityToken,
      clientId: clientId,
    });

    return {
      sub: jwtClaims.sub,
      email: jwtClaims.email,
      email_verified: jwtClaims.email_verified || false,
    };
  } catch (error) {
    log.error({ error }, '验证苹果 identity token 失败');
    return null;
  }
}

/**
 * 验证 Google 登录的 ID token
 */
export async function verifyGoogleIdentityToken(
  idToken: string,
  clientId?: string
): Promise<{
  sub: string; // 用户唯一标识
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
} | null> {
  try {
    // 如果没有提供 clientId，尝试从环境变量获取
    const googleClientId = clientId || process.env.GOOGLE_CLIENT_ID;

    if (!googleClientId) {
      log.error('Google Client ID 未配置');
      return null;
    }

    const client = new OAuth2Client(googleClientId);

    // 验证 token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.sub) {
      log.error('Google token payload 无效');
      return null;
    }

    return {
      sub: payload.sub,
      email: payload.email,
      email_verified: payload.email_verified || false,
      name: payload.name,
      given_name: payload.given_name,
      family_name: payload.family_name,
      picture: payload.picture,
    };
  } catch (error) {
    log.error({ error }, '验证 Google identity token 失败');
    return null;
  }
}

/**
 * 查找或创建用户
 */
export async function findOrCreateUser(
  appid: string,
  oauthProvider: string,
  oauthId: string,
  email?: string,
  fullName?: { givenName?: string; familyName?: string },
  avatar?: string
): Promise<{ uid: number; isNewUser: boolean }> {
  // 先尝试查找已存在的认证记录（在事务外，减少事务持有时间）
  const existingAuth = await prisma.userAuth.findFirst({
    where: {
      appid,
      auth_type: 'oauth',
      oauth_provider: oauthProvider,
      oauth_id: oauthId,
    },
    include: {
      user: true,
    },
  });

  if (existingAuth) {
    // 用户已存在，更新最后登录时间（使用简单更新，不需要事务）
    await prisma.userAuth
      .update({
        where: { id: existingAuth.id },
        data: {
          last_login: new Date(),
          update_time: new Date(),
        },
      })
      .catch(error => {
        // 如果更新失败，记录错误但不影响返回
        log.error({ error }, '[findOrCreateUser] 更新登录时间失败');
      });

    return {
      uid: existingAuth.uid,
      isNewUser: false,
    };
  }

  // 用户不存在，使用事务创建新用户和认证记录
  // 设置超时时间：maxWait=5秒（等待锁），timeout=10秒（事务执行）
  const result = await prisma.$transaction(
    async (tx: any) => {
      // 再次检查（防止并发创建）
      const duplicateCheck = await tx.userAuth.findFirst({
        where: {
          appid,
          auth_type: 'oauth',
          oauth_provider: oauthProvider,
          oauth_id: oauthId,
        },
      });

      if (duplicateCheck) {
        // 如果并发创建了，返回已存在的用户
        return {
          uid: duplicateCheck.uid,
          isNewUser: false,
        };
      }

      // 生成用户名
      const username =
        fullName && (fullName.givenName || fullName.familyName)
          ? `${fullName.familyName || ''}${fullName.givenName || ''}`.trim() || `用户${Date.now()}`
          : email
            ? email.split('@')[0]
            : `用户${Date.now()}`;

      // 创建用户
      const newUser = await tx.user.create({
        data: {
          appid,
          username,
          avatar: avatar || '',
          status: 0,
          is_team: 0,
        },
      });

      // 创建认证记录
      await tx.userAuth.create({
        data: {
          uid: newUser.uid,
          appid,
          auth_type: 'oauth',
          auth_value: oauthId,
          oauth_provider: oauthProvider,
          oauth_id: oauthId,
          oauth_platform_data: {
            email,
            fullName,
            provider: oauthProvider,
          },
          is_verified: false,
          last_login: new Date(),
        },
      });

      return {
        uid: newUser.uid,
        isNewUser: true,
      };
    },
    {
      maxWait: 5000, // 等待获取事务锁的最大时间（5秒）
      timeout: 10000, // 事务执行的最大时间（10秒）
    }
  );

  return result;
}

/**
 * 基于设备特征生成游客唯一标识
 * 优先使用设备唯一标识（idfa/idfv/androidid/oaid），确保同一设备能识别为同一游客
 */
function generateGuestId(headerData: {
  idfa?: string | null;
  idfv?: string | null;
  androidid?: string | null;
  oaid?: string | null;
  device?: string | null;
  bundleid?: string | null;
}): string {
  // 优先使用设备唯一标识（按优先级顺序）
  const deviceId = headerData.idfa || headerData.idfv || headerData.androidid || headerData.oaid;

  if (deviceId) {
    return `guest_${deviceId}`;
  }

  // 如果没有设备ID，使用设备类型 + bundleid 组合（作为最后的 fallback）
  // 注意：这种情况下无法稳定识别同一游客，但可以保证基本功能
  const fallbackId = `${headerData.device || 'unknown'}_${headerData.bundleid || 'unknown'}`;
  // 对 fallbackId 进行简单哈希，避免过长
  let hash = 0;
  for (let i = 0; i < fallbackId.length; i++) {
    hash = (hash * 31 + fallbackId.charCodeAt(i)) >>> 0;
  }
  return `guest_fallback_${hash}`;
}

/**
 * 查找或创建游客用户
 */
export async function findOrCreateGuestUser(
  appid: string,
  guestId: string,
  headerData: {
    idfa?: string | null;
    idfv?: string | null;
    androidid?: string | null;
    oaid?: string | null;
    device?: string | null;
    bundleid?: string | null;
  }
): Promise<{ uid: number; isNewUser: boolean }> {
  // 先尝试查找已存在的游客认证记录
  const existingAuth = await prisma.userAuth.findFirst({
    where: {
      appid,
      auth_type: 'guest',
      auth_value: guestId,
    },
    include: {
      user: true,
    },
  });

  if (existingAuth) {
    // 游客已存在，更新最后登录时间
    await prisma.userAuth
      .update({
        where: { id: existingAuth.id },
        data: {
          last_login: new Date(),
          update_time: new Date(),
        },
      })
      .catch(error => {
        log.error({ error }, '[findOrCreateGuestUser] 更新登录时间失败');
      });

    return {
      uid: existingAuth.uid,
      isNewUser: false,
    };
  }

  // 游客不存在，使用事务创建新用户和认证记录
  const result = await prisma.$transaction(
    async (tx: any) => {
      // 再次检查（防止并发创建）
      const duplicateCheck = await tx.userAuth.findFirst({
        where: {
          appid,
          auth_type: 'guest',
          auth_value: guestId,
        },
      });

      if (duplicateCheck) {
        return {
          uid: duplicateCheck.uid,
          isNewUser: false,
        };
      }

      // 生成游客用户名
      const username = `${guestId}`;

      // 创建用户
      const newUser = await tx.user.create({
        data: {
          appid,
          username,
          avatar: '',
          status: 0,
          is_team: 0,
        },
      });

      // 创建游客认证记录
      await tx.userAuth.create({
        data: {
          uid: newUser.uid,
          appid,
          auth_type: 'guest',
          auth_value: guestId,
          oauth_platform_data: {
            device: headerData.device,
            bundleid: headerData.bundleid,
            idfa: headerData.idfa,
            idfv: headerData.idfv,
            androidid: headerData.androidid,
            oaid: headerData.oaid,
          },
          is_verified: false,
          last_login: new Date(),
        },
      });

      return {
        uid: newUser.uid,
        isNewUser: true,
      };
    },
    {
      maxWait: 5000,
      timeout: 10000,
    }
  );

  return result;
}

/**
 * 导出 generateGuestId 供外部使用
 */
export { generateGuestId };

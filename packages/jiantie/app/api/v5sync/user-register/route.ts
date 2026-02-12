import { prisma } from '@mk/jiantie/v11-database';
import { NextRequest, NextResponse } from 'next/server';
import { logV5SyncApi } from '../utils/log';

/**
 * V5 用户注册双写接口
 *
 * 用于旧系统在用户注册成功后，将用户信息同步到新系统（v11数据库）
 * 详细的调用方法和示例请参考：/api/v5sync/README.md
 */

interface AuthInfo {
  auth_type: string;
  auth_value: string;
  password_hash?: string;
  oauth_provider?: string;
  oauth_id?: string;
  oauth_platform_data?: any; // JSON 对象
  is_verified?: boolean;
}

interface SourceInfo {
  bundleid?: string;
  device?: string;
  market?: string;
  channelid?: string;
  deviceid?: string;
  idfa?: string;
  version?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_term?: string;
  utm_content?: string;
  utm_campaign?: string;
}

interface RegisterRequest {
  uid: number;
  appid: string;
  username?: string;
  avatar?: string;
  reg_date?: string;
  status?: number;
  is_team?: number;
  auths?: AuthInfo[];
  source?: SourceInfo;
}

export async function POST(request: NextRequest) {
  let body: RegisterRequest;
  try {
    body = await request.json();
  } catch {
    const errorResponse = NextResponse.json(
      { success: false, error: '请求体格式错误，必须是有效的 JSON' },
      { status: 400 }
    );
    // 记录失败日志
    await logV5SyncApi(
      'user-register',
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
    if (!body || !body.uid || typeof body.uid !== 'number') {
      const errorResponse = NextResponse.json(
        { success: false, error: 'uid 是必需的且必须为数字' },
        { status: 400 }
      );
      // 记录失败日志
      await logV5SyncApi(
        'user-register',
        body,
        { success: false, error: 'uid 是必需的且必须为数字' },
        'failed',
        400,
        'uid 是必需的且必须为数字'
      );
      return errorResponse;
    }

    if (!body.appid) {
      const errorResponse = NextResponse.json(
        { success: false, error: 'appid 是必需' },
        { status: 400 }
      );
      // 记录失败日志
      await logV5SyncApi(
        'user-register',
        body,
        { success: false, error: 'appid 是必需' },
        'failed',
        400,
        'appid 是必需'
      );
      return errorResponse;
    }

    // 解析注册日期
    const regDate = body.reg_date ? new Date(body.reg_date) : new Date();

    // 使用事务确保数据一致性
    // 设置超时时间：maxWait=5秒（等待锁），timeout=10秒（事务执行）
    const result = await prisma.$transaction(
      async (tx: any) => {
        // 1. 创建或更新用户基本信息
        const user = await tx.user.upsert({
          where: { uid: body.uid },
          update: {
            appid: body.appid,
            username: body.username || '',
            avatar: body.avatar || undefined,
            reg_date: regDate,
            status: body.status ?? 0,
            is_team: body.is_team ?? 0,
            update_time: new Date(),
          },
          create: {
            uid: body.uid,
            appid: body.appid,
            username: body.username || '',
            avatar: body.avatar || undefined,
            reg_date: regDate,
            status: body.status ?? 0,
            is_team: body.is_team ?? 0,
          },
        });

        console.log('2处理认证信息');
        // 2. 处理认证信息
        if (body.auths && body.auths.length > 0) {
          for (const auth of body.auths) {
            if (!auth.auth_type || !auth.auth_value) {
              continue; // 跳过无效的认证信息
            }

            // 如果未提供 oauth_provider，根据 auth_type 设置默认值
            // phone 和 email 的 provider 是 "self"
            const oauthProvider =
              auth.oauth_provider ||
              (auth.auth_type === 'phone' || auth.auth_type === 'email'
                ? 'self'
                : undefined);

            if (!oauthProvider) {
              console.warn(
                `警告: auth_type=${auth.auth_type} 未提供 oauth_provider，跳过此认证信息`
              );
              continue;
            }

            await tx.userAuth.upsert({
              where: {
                uid_appid_auth_type_oauth_provider: {
                  uid: body.uid,
                  appid: body.appid,
                  auth_type: auth.auth_type,
                  oauth_provider: oauthProvider,
                },
              },
              update: {
                auth_value: auth.auth_value,
                password_hash: auth.password_hash || undefined,
                oauth_provider: oauthProvider,
                oauth_id: auth.oauth_id || undefined,
                oauth_platform_data: auth.oauth_platform_data || undefined,
                is_verified: auth.is_verified ?? false,
                update_time: new Date(),
              },
              create: {
                uid: body.uid,
                appid: body.appid,
                auth_type: auth.auth_type,
                auth_value: auth.auth_value,
                password_hash: auth.password_hash || undefined,
                oauth_provider: oauthProvider,
                oauth_id: auth.oauth_id || undefined,
                oauth_platform_data: auth.oauth_platform_data || undefined,
                is_verified: auth.is_verified ?? false,
              },
            });
          }
        }
        console.log('3处理来源信息');
        // 3. 处理来源信息
        if (body.source) {
          await tx.userSource.upsert({
            where: { uid: body.uid },
            update: {
              appid: body.appid,
              bundleid: body.source.bundleid || '',
              device: body.source.device || '',
              market: body.source.market || undefined,
              channelid: body.source.channelid || undefined,
              deviceid: body.source.deviceid || undefined,
              idfa: body.source.idfa || undefined,
              version: body.source.version || undefined,
              utm_source: body.source.utm_source || undefined,
              utm_medium: body.source.utm_medium || undefined,
              utm_term: body.source.utm_term || undefined,
              utm_content: body.source.utm_content || undefined,
              utm_campaign: body.source.utm_campaign || undefined,
              update_time: new Date(),
            },
            create: {
              uid: body.uid,
              appid: body.appid,
              bundleid: body.source.bundleid || '',
              device: body.source.device || '',
              market: body.source.market || undefined,
              channelid: body.source.channelid || undefined,
              deviceid: body.source.deviceid || undefined,
              idfa: body.source.idfa || undefined,
              version: body.source.version || undefined,
              utm_source: body.source.utm_source || undefined,
              utm_medium: body.source.utm_medium || undefined,
              utm_term: body.source.utm_term || undefined,
              utm_content: body.source.utm_content || undefined,
              utm_campaign: body.source.utm_campaign || undefined,
            },
          });
        }

        return user;
      },
      {
        maxWait: 5000, // 等待获取事务锁的最大时间（5秒）
        timeout: 10000, // 事务执行的最大时间（10秒）
      }
    );

    const response = NextResponse.json({
      success: true,
      message: '用户注册信息已成功同步',
      data: {
        uid: result.uid,
        appid: result.appid,
      },
    });

    // 记录成功日志
    await logV5SyncApi(
      'user-register',
      body,
      {
        success: true,
        uid: result.uid,
        appid: result.appid,
      },
      'success',
      200
    );

    return response;
  } catch (error: any) {
    console.error('[V5Sync User Register] 同步失败:', error);

    // 处理唯一约束冲突（用户已存在）
    if (error.code === 'P2002') {
      const errorResponse = NextResponse.json(
        {
          success: false,
          error: `用户 uid=${body?.uid || 'unknown'} 已存在，但更新失败`,
        },
        { status: 409 }
      );
      // 记录失败日志
      await logV5SyncApi(
        'user-register',
        body,
        {
          success: false,
          error: `用户 uid=${body?.uid || 'unknown'} 已存在，但更新失败`,
        },
        'failed',
        409,
        `用户 uid=${body?.uid || 'unknown'} 已存在，但更新失败`
      );
      return errorResponse;
    }

    const errorResponse = NextResponse.json(
      {
        success: false,
        error: error.message || '同步用户注册信息失败',
      },
      { status: 500 }
    );
    // 记录失败日志
    await logV5SyncApi(
      'user-register',
      body,
      {
        success: false,
        error: error.message || '同步用户注册信息失败',
      },
      'failed',
      500,
      error.message || '同步用户注册信息失败'
    );
    return errorResponse;
  }
}

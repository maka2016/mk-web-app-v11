import { prisma } from '@mk/jiantie/v11-database';
import { NextRequest, NextResponse } from 'next/server';
import { logV5SyncApi } from '../utils/log';

/**
 * V5 用户登录双写接口
 *
 * 用于旧系统在用户登录成功后，将登录时间同步到新系统（v11数据库）
 * 详细的调用方法和示例请参考：/api/v5sync/README.md
 */

interface LoginRequest {
  uid: number;
  appid: string;
  auth_type?: string;
  auth_value?: string;
  login_time?: string; // ISO 8601格式，默认为当前时间
}

export async function POST(request: NextRequest) {
  let body: LoginRequest;
  try {
    body = await request.json();
  } catch {
    const errorResponse = NextResponse.json(
      { success: false, error: '请求体格式错误，必须是有效的 JSON' },
      { status: 400 }
    );
    // 记录失败日志
    await logV5SyncApi(
      'user-login',
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
        'user-login',
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
        { success: false, error: 'appid 是必需的' },
        { status: 400 }
      );
      // 记录失败日志
      await logV5SyncApi(
        'user-login',
        body,
        { success: false, error: 'appid 是必需的' },
        'failed',
        400,
        'appid 是必需的'
      );
      return errorResponse;
    }

    // 验证 appid
    // if (body.appid !== 'maka' && body.appid !== 'jiantie') {
    //   return NextResponse.json(
    //     { success: false, error: 'appid 的值只能是 "maka" 或 "jiantie"' },
    //     { status: 400 }
    //   );
    // }

    // 解析登录时间
    const loginTime = body.login_time ? new Date(body.login_time) : new Date();

    // 使用事务确保数据一致性
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. 检查用户是否存在
      const user = await tx.user.findUnique({
        where: { uid: body.uid },
      });

      if (!user) {
        return NextResponse.json({
          success: true,
          message: `用户 uid=${body.uid} 不存在`,
        });
        // throw new Error(`用户 uid=${body.uid} 不存在`);
      }

      // 2. 如果提供了 auth_type，使用唯一约束更新对应的认证记录的 last_login
      if (body.auth_type) {
        // 根据唯一约束 [uid, appid, auth_type] 来定位记录
        const updatedAuth = await tx.userAuth.updateMany({
          where: {
            uid: body.uid,
            appid: body.appid,
            auth_type: body.auth_type,
            // auth_value 作为可选的额外过滤条件（不参与唯一约束）
            ...(body.auth_value ? { auth_value: body.auth_value } : {}),
          },
          data: {
            last_login: loginTime,
            update_time: new Date(),
          },
        });

        if (updatedAuth.count === 0) {
          // 如果认证记录不存在，可以选择创建或跳过
          // 这里选择跳过，因为认证信息应该在注册时创建
          console.warn(
            `认证记录不存在: uid=${body.uid}, appid=${body.appid}, auth_type=${body.auth_type}${body.auth_value ? `, auth_value=${body.auth_value}` : ''}`
          );
        }

        return {
          uid: body.uid,
          appid: body.appid,
          auth_type: body.auth_type,
          ...(body.auth_value ? { auth_value: body.auth_value } : {}),
          last_login: loginTime,
        };
      } else {
        // 3. 如果没有提供 auth_type 和 auth_value，更新该用户下所有认证记录的 last_login
        const updatedAuths = await tx.userAuth.updateMany({
          where: {
            uid: body.uid,
            appid: body.appid,
          },
          data: {
            last_login: loginTime,
            update_time: new Date(),
          },
        });

        return {
          uid: body.uid,
          appid: body.appid,
          updated_count: updatedAuths.count,
          last_login: loginTime,
        };
      }
    });

    const response = NextResponse.json({
      success: true,
      message: '登录时间已成功同步',
      data: result,
    });

    // 记录成功日志
    await logV5SyncApi(
      'user-login',
      body,
      {
        success: true,
        ...result,
      },
      'success',
      200
    );

    return response;
  } catch (error: any) {
    console.error('[V5Sync User Login] 同步失败:', error);

    // 处理用户不存在的情况
    if (error.message && error.message.includes('不存在')) {
      const errorResponse = NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 404 }
      );
      // 记录失败日志
      await logV5SyncApi(
        'user-login',
        body,
        {
          success: false,
          error: error.message,
        },
        'failed',
        404,
        error.message
      );
      return errorResponse;
    }

    const errorResponse = NextResponse.json(
      {
        success: false,
        error: error.message || '同步登录时间失败',
      },
      { status: 500 }
    );
    // 记录失败日志
    await logV5SyncApi(
      'user-login',
      body,
      {
        success: false,
        error: error.message || '同步登录时间失败',
      },
      'failed',
      500,
      error.message || '同步登录时间失败'
    );
    return errorResponse;
  }
}

import { prisma } from '@mk/jiantie/v11-database';
import { initTRPC, TRPCError } from '@trpc/server';
import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import superjson from 'superjson';
import { tokenToUid } from './auth/token-validator';
import {
  createAdminAuthProcedure,
  createAdminGroupPermissionProcedure,
  createAdminPermissionProcedure,
} from './middleware/adminAuth';

// Context 定义
export const createContext = (opts?: FetchCreateContextFnOptions) => {
  // 从请求头中提取用户信息
  const uid = opts?.req.headers.get('x-uid');
  const token = opts?.req.headers.get('x-token');
  const appid = opts?.req.headers.get('x-appid');

  return {
    prisma,
    req: opts?.req,
    // 用户信息
    uid: uid ? Number(uid) : undefined,
    token: token || undefined,
    appid: appid || undefined,
  };
};

export type Context = ReturnType<typeof createContext>;

// 初始化 tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    // 在开发环境返回完整错误信息，生产环境隐藏敏感信息
    const isDev = process.env.NODE_ENV === 'development';

    return {
      ...shape,
      // 确保 message 是字符串类型
      message: String(shape.message || '未知错误'),
      data: {
        ...shape.data,
        // 生产环境不返回堆栈信息
        stack: isDev ? shape.data.stack : undefined,
      },
    };
  },
});

export const router = t.router;

// 公开的 procedure（不需要认证）
export const publicProcedure = t.procedure;

// 需要认证的 procedure
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  // 检查是否有 token
  if (!ctx.token) {
    console.error('[Auth] Missing token in request');
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: '请先登录',
    });
  }

  // 检查是否有 uid（客户端传递的）
  if (!ctx.uid) {
    console.error('[Auth] Missing uid in request');
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: '请先登录',
    });
  }

  // 后门，用于开发测试
  if (/backdoor/gi.test(ctx.token)) {
    return next({
      ctx: {
        ...ctx,
        // 使用客户端传递的 uid（开发测试模式）
        uid: ctx.uid,
      },
    });
  }

  // 验证 token 并获取用户信息
  const { uid: tokenUid, appid: tokenAppid } = await tokenToUid(ctx.token);

  // 检查 token 是否有效
  if (!tokenUid) {
    console.error('[Auth] Invalid token, unable to get uid');
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: '登录已过期，请重新登录',
    });
  }

  // 验证客户端传递的 uid 是否与 token 中的 uid 匹配
  if (String(ctx.uid) !== String(tokenUid)) {
    console.error('[Auth] UID mismatch:', {
      requestUid: ctx.uid,
      tokenUid,
    });
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: '认证失败，请重新登录',
    });
  }

  // 如果提供了 appid，验证 appid 是否匹配
  if (ctx.appid && tokenAppid && String(ctx.appid) !== String(tokenAppid)) {
    console.error('[Auth] APPID mismatch:', {
      requestAppid: ctx.appid,
      tokenAppid,
    });
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: '认证失败，请重新登录',
    });
  }

  // 使用 token 验证后的 uid 和 appid（更安全，不信任客户端传递的值）
  return next({
    ctx: {
      ...ctx,
      // 使用从 token 验证后的 uid 和 appid
      uid: tokenUid,
      appid: tokenAppid || ctx.appid,
    },
  });
});

// 管理员认证相关的 procedure，暂时不用
export const adminAuthProcedure = createAdminAuthProcedure(publicProcedure);
export const adminPermissionProcedure = createAdminPermissionProcedure(publicProcedure);
export const adminGroupPermissionProcedure = createAdminGroupPermissionProcedure(publicProcedure);

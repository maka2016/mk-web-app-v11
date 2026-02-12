import { TRPCError } from '@trpc/server';
import type { Context } from '../trpc';
import { checkRoutePermission, checkGroupPermission } from '../utils/permission';

/**
 * 从请求头中获取管理员用户ID
 */
function getAdminUserIdFromHeaders(ctx: Context): string | null {
  // 从请求头中获取管理员ID（可以通过 cookie 或 header 传递）
  const adminUserId = ctx.req?.headers.get('x-admin-user-id');
  return adminUserId || null;
}

/**
 * 创建需要管理员登录的 procedure
 * 验证管理员是否已登录
 */
export function createAdminAuthProcedure(
  procedure: typeof import('../trpc').publicProcedure
) {
  return procedure.use(async ({ ctx, next }) => {
    const adminUserId = getAdminUserIdFromHeaders(ctx);

    if (!adminUserId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: '请先登录管理员账号',
      });
    }

    // 验证管理员是否存在且状态正常
    const adminUser = await ctx.prisma.adminUser.findUnique({
      where: { id: adminUserId },
    });

    if (!adminUser) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: '管理员账号不存在',
      });
    }

    if (adminUser.status !== 0) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: '管理员账号已被禁用',
      });
    }

    return next({
      ctx: {
        ...ctx,
        adminUserId,
        adminUser,
      },
    });
  });
}

/**
 * 创建需要特定路由权限的 procedure
 * 接收路由路径参数，检查用户是否有访问该路由的权限
 */
export function createAdminPermissionProcedure(
  procedure: typeof import('../trpc').publicProcedure
) {
  return createAdminAuthProcedure(procedure).use(async ({ ctx, next, input }) => {
    // 从 input 中获取路由路径，如果没有则从请求头获取
    const safeInput = input as unknown as { route?: string };
    const route =
      safeInput.route ||
      ctx.req?.headers.get('x-route') ||
      ctx.req?.url ||
      '';

    if (!route) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: '缺少路由路径参数',
      });
    }

    const hasPermission = await checkRoutePermission(
      ctx.prisma,
      ctx.adminUserId,
      route
    );

    if (!hasPermission) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: '您没有权限访问此页面',
      });
    }

    return next({
      ctx: {
        ...ctx,
        route,
      },
    });
  });
}

/**
 * 创建需要特定菜单分组权限的 procedure
 * 接收菜单分组标识，检查用户是否有该分组的权限
 */
export function createAdminGroupPermissionProcedure(
  procedure: typeof import('../trpc').publicProcedure
) {
  return createAdminAuthProcedure(procedure).use(async ({ ctx, next, input }) => {
    // 从 input 中获取菜单分组标识
    const safeInput = input as unknown as { menuGroup?: string };
    const menuGroup = safeInput.menuGroup;

    if (!menuGroup) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: '缺少菜单分组参数',
      });
    }

    const hasPermission = await checkGroupPermission(
      ctx.prisma,
      ctx.adminUserId,
      menuGroup
    );

    if (!hasPermission) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `您没有权限访问"${menuGroup}"`,
      });
    }

    return next({
      ctx: {
        ...ctx,
        menuGroup,
      },
    });
  });
}

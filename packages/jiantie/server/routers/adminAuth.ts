import { z } from 'zod';
import { publicProcedure, adminAuthProcedure, router } from '../trpc';
import { verifyPassword } from '../utils/password';
import { getUserPermissions, checkGroupPermission } from '../utils/permission';

// AdminAuth Router
export const adminAuthRouter = router({
  // 管理员登录
  login: publicProcedure
    .input(
      z.object({
        username: z.string().min(1, '用户名不能为空'),
        password: z.string().min(1, '密码不能为空'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 查找管理员
      const adminUser = await ctx.prisma.adminUser.findUnique({
        where: { username: input.username },
      });

      if (!adminUser) {
        throw new Error('用户名或密码错误');
      }

      // 检查账号状态
      if (adminUser.status !== 0) {
        throw new Error('账号已被禁用');
      }

      // 验证密码
      const isValid = verifyPassword(input.password, adminUser.password_hash);
      if (!isValid) {
        throw new Error('用户名或密码错误');
      }

      // 返回管理员信息（不包含密码）
      return {
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email,
        status: adminUser.status,
      };
    }),

  // 登出（客户端处理，这里只是占位）
  logout: adminAuthProcedure.mutation(async () => {
    return { success: true };
  }),

  // 获取当前登录的管理员信息（包含角色和权限）
  getCurrentUser: adminAuthProcedure.query(async ({ ctx }) => {
    const adminUser = await ctx.prisma.adminUser.findUnique({
      where: { id: ctx.adminUserId },
      select: {
        id: true,
        username: true,
        email: true,
        status: true,
        create_time: true,
        update_time: true,
        adminUserRoles: {
          select: {
            id: true,
            admin_role_id: true,
            menu_groups: true,
            start_at: true,
            expires_at: true,
          },
        },
      },
    });

    if (!adminUser) {
      throw new Error('管理员不存在');
    }

    // 获取用户的所有权限（菜单分组标识列表）
    const permissions = await getUserPermissions(ctx.prisma, ctx.adminUserId);

    return {
      ...adminUser,
      permissions,
    };
  }),

  // 检查当前用户是否有访问某个菜单分组的权限
  checkGroupPermission: adminAuthProcedure
    .input(
      z.object({
        menuGroup: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const hasPermission = await checkGroupPermission(
        ctx.prisma,
        ctx.adminUserId,
        input.menuGroup
      );
      return { hasPermission };
    }),

  // 获取用户有权限访问的菜单分组列表
  getUserMenuGroups: adminAuthProcedure.query(async ({ ctx }) => {
    const permissions = await getUserPermissions(ctx.prisma, ctx.adminUserId);
    return permissions;
  }),
});

import { z } from 'zod';
import { adminAuthProcedure, router } from '../trpc';

// AdminRole CRUD Router
export const adminRoleRouter = router({
  // 创建角色
  create: adminAuthProcedure
    .input(
      z.object({
        name: z.string().min(1, '角色名称不能为空'),
        alias: z.string().optional(),
        description: z.string().optional(),
        menuGroups: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { menuGroups, ...rest } = input;
      return ctx.prisma.adminRole.create({
        data: {
          ...rest,
          menu_groups: menuGroups ?? [],
        },
      });
    }),

  // 查询列表
  findMany: adminAuthProcedure
    .input(
      z
        .object({
          name: z.string().optional(), // 名称模糊搜索
          skip: z.number().optional(),
          take: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};

      if (input?.name) {
        where.name = {
          contains: input.name,
        };
      }

      const roles = await ctx.prisma.adminRole.findMany({
        where,
        skip: input?.skip,
        take: input?.take,
        orderBy: { create_time: 'desc' },
        select: {
          id: true,
          name: true,
          alias: true,
          description: true,
          menu_groups: true,
          create_time: true,
          update_time: true,
        },
      });

      const roleIds = roles.map(r => r.id);
      const counts = roleIds.length
        ? await ctx.prisma.adminUserRole.groupBy({
            by: ['admin_role_id'],
            where: { admin_role_id: { in: roleIds } },
            _count: { admin_role_id: true },
          })
        : [];

      const countByRoleId = new Map<string, number>(
        (
          counts as Array<{
            admin_role_id: string;
            _count: { admin_role_id: number };
          }>
        ).map(c => [c.admin_role_id, c._count.admin_role_id])
      );

      return roles.map(r => ({
        ...r,
        _count: { adminUserRoles: countByRoleId.get(r.id) ?? 0 },
      }));
    }),

  // 统计数量
  count: adminAuthProcedure
    .input(
      z
        .object({
          name: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};

      if (input?.name) {
        where.name = {
          contains: input.name,
        };
      }

      return ctx.prisma.adminRole.count({ where });
    }),

  // 根据ID查询（包含权限列表）
  findById: adminAuthProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const role = await ctx.prisma.adminRole.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          alias: true,
          description: true,
          menu_groups: true,
          create_time: true,
          update_time: true,
        },
      });

      if (!role) return null;

      const adminUserRolesCount = await ctx.prisma.adminUserRole.count({
        where: { admin_role_id: input.id },
      });

      return { ...role, _count: { adminUserRoles: adminUserRolesCount } };
    }),

  // 更新角色信息
  update: adminAuthProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, '角色名称不能为空').optional(),
        alias: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.adminRole.update({
        where: { id },
        data,
      });
    }),

  // 删除角色
  delete: adminAuthProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 检查是否有管理员使用此角色
      const adminUserRolesCount = await ctx.prisma.adminUserRole.count({
        where: { admin_role_id: input.id },
      });

      if (adminUserRolesCount > 0) {
        throw new Error('该角色正在被使用，无法删除');
      }

      // 删除角色
      return ctx.prisma.adminRole.delete({
        where: { id: input.id },
      });
    }),

  // 为角色分配权限（菜单分组）
  assignPermissions: adminAuthProcedure
    .input(
      z.object({
        roleId: z.string(),
        menuGroups: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { roleId, menuGroups } = input;

      // 更新 AdminRole.menu_groups
      const role = await ctx.prisma.adminRole.update({
        where: { id: roleId },
        data: { menu_groups: menuGroups },
      });

      // 同步更新已分配到用户的 AdminUserRole 权限快照（满足 permission 写在 AdminUserRole）
      await ctx.prisma.adminUserRole.updateMany({
        where: { admin_role_id: roleId },
        data: { menu_groups: menuGroups },
      });

      return role;
    }),

  // 获取所有可用的权限（菜单分组）——不复用 Permission 表，直接返回固定分组列表
  getAllMenuGroups: adminAuthProcedure.query(async () => {
    return [
      '基础数据管理',
      'BI报表',
      '业务报表（废弃）',
      '风控管理',
      '权限管理',
    ];
  }),
});

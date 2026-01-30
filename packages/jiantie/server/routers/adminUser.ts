import { z } from 'zod';
import { adminAuthProcedure, router } from '../trpc';
import { hashPassword } from '../utils/password';

type RoleLite = {
  id: string;
  name: string;
  alias: string | null;
  description: string | null;
  menu_groups: unknown | null;
};

type AdminUserRoleRow = {
  id: string;
  admin_role_id: string;
  menu_groups: unknown | null;
  start_at: Date | null;
  expires_at: Date | null;
};

function attachRolesToUserRoles(
  userRoles: AdminUserRoleRow[],
  roleById: Map<string, RoleLite>
) {
  return userRoles.map(ur => ({
    ...ur,
    role: roleById.get(ur.admin_role_id) ?? null,
  }));
}

// AdminUser CRUD Router
export const adminUserRouter = router({
  // 创建管理员账号
  create: adminAuthProcedure
    .input(
      z.object({
        username: z.string().min(1, '用户名不能为空'),
        email: z.string().email('邮箱格式不正确').optional().or(z.literal('')),
        password: z.string().min(6, '密码至少6位'),
        status: z.number().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { password, ...rest } = input;

      // 检查用户名是否已存在
      const existingUser = await ctx.prisma.adminUser.findUnique({
        where: { username: rest.username },
      });

      if (existingUser) {
        throw new Error('用户名已存在');
      }

      // 加密密码
      const password_hash = hashPassword(password);

      return ctx.prisma.adminUser.create({
        data: {
          ...rest,
          password_hash,
          email: rest.email || null,
        },
      });
    }),

  // 查询列表
  findMany: adminAuthProcedure
    .input(
      z
        .object({
          status: z.number().optional(),
          username: z.string().optional(), // 用户名模糊搜索
          email: z.string().optional(), // 邮箱模糊搜索
          skip: z.number().optional(),
          take: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};

      if (input?.status !== undefined) where.status = input.status;
      if (input?.username) {
        where.username = {
          contains: input.username,
        };
      }
      if (input?.email) {
        where.email = {
          contains: input.email,
        };
      }

      const users = await ctx.prisma.adminUser.findMany({
        where,
        skip: input?.skip,
        take: input?.take,
        orderBy: { create_time: 'desc' },
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

      const roleIds = Array.from(
        new Set(
          users
            .flatMap(u => u.adminUserRoles.map(r => r.admin_role_id))
            .filter(Boolean)
        )
      );

      const roles = roleIds.length
        ? await ctx.prisma.adminRole.findMany({
            where: { id: { in: roleIds } },
            select: {
              id: true,
              name: true,
              alias: true,
              description: true,
              menu_groups: true,
            },
          })
        : [];

      const roleById = new Map<string, RoleLite>(roles.map(r => [r.id, r]));

      return users.map(u => ({
        ...u,
        adminUserRoles: attachRolesToUserRoles(
          u.adminUserRoles as AdminUserRoleRow[],
          roleById
        ),
      }));
    }),

  // 统计数量
  count: adminAuthProcedure
    .input(
      z
        .object({
          status: z.number().optional(),
          username: z.string().optional(),
          email: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};

      if (input?.status !== undefined) where.status = input.status;
      if (input?.username) {
        where.username = {
          contains: input.username,
        };
      }
      if (input?.email) {
        where.email = {
          contains: input.email,
        };
      }

      return ctx.prisma.adminUser.count({ where });
    }),

  // 根据ID查询
  findById: adminAuthProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.adminUser.findUnique({
        where: { id: input.id },
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

      if (!user) return null;

      const roleIds = Array.from(
        new Set(user.adminUserRoles.map(r => r.admin_role_id).filter(Boolean))
      );

      const roles = roleIds.length
        ? await ctx.prisma.adminRole.findMany({
            where: { id: { in: roleIds } },
            select: {
              id: true,
              name: true,
              alias: true,
              description: true,
              menu_groups: true,
            },
          })
        : [];
      const roleById = new Map<string, RoleLite>(roles.map(r => [r.id, r]));

      return {
        ...user,
        adminUserRoles: attachRolesToUserRoles(
          user.adminUserRoles as AdminUserRoleRow[],
          roleById
        ),
      };
    }),

  // 更新管理员信息
  update: adminAuthProcedure
    .input(
      z.object({
        id: z.string(),
        username: z.string().min(1, '用户名不能为空').optional(),
        email: z.string().email('邮箱格式不正确').optional().or(z.literal('')),
        password: z.string().min(6, '密码至少6位').optional(),
        status: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, password, ...rest } = input;

      // 如果更新用户名，检查是否已存在
      if (rest.username) {
        const existingUser = await ctx.prisma.adminUser.findFirst({
          where: {
            username: rest.username,
            NOT: { id },
          },
        });

        if (existingUser) {
          throw new Error('用户名已存在');
        }
      }

      const updateData: Record<string, unknown> = { ...rest };
      if (rest.email === '') {
        updateData.email = null;
      }

      // 如果提供了新密码，加密并更新
      if (password) {
        updateData.password_hash = hashPassword(password);
      }

      return ctx.prisma.adminUser.update({
        where: { id },
        data: updateData,
      });
    }),

  // 删除管理员（软删除）
  delete: adminAuthProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.adminUser.update({
        where: { id: input.id },
        data: { status: -1 },
      });
    }),

  // 为管理员分配角色
  assignRoles: adminAuthProcedure
    .input(
      z.object({
        adminUserId: z.string(),
        roleIds: z.array(z.string()),
        startAt: z.date().optional(),
        expiresAt: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { adminUserId, roleIds, startAt, expiresAt } = input;

      // 先删除该管理员的所有角色
      await ctx.prisma.adminUserRole.deleteMany({
        where: { admin_user_id: adminUserId },
      });

      // 创建新的角色关联
      if (roleIds.length > 0) {
        const roles = await ctx.prisma.adminRole.findMany({
          where: { id: { in: roleIds } },
          select: { id: true, menu_groups: true },
        });
        const roleMenuGroups = new Map<string, unknown | null>(
          roles.map(r => [r.id, r.menu_groups])
        );

        await ctx.prisma.adminUserRole.createMany({
          data: roleIds.map(roleId => ({
            admin_user_id: adminUserId,
            admin_role_id: roleId,
            // 权限快照写在 AdminUserRole
            menu_groups: roleMenuGroups.get(roleId) ?? [],
            start_at: startAt || null,
            expires_at: expiresAt || null,
          })),
        });
      }

      // 返回更新后的管理员信息（手动拼 role）
      const user = await ctx.prisma.adminUser.findUnique({
        where: { id: adminUserId },
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

      if (!user) return null;

      const roleIdsUniq = Array.from(
        new Set(user.adminUserRoles.map(r => r.admin_role_id).filter(Boolean))
      );
      const roles = roleIdsUniq.length
        ? await ctx.prisma.adminRole.findMany({
            where: { id: { in: roleIdsUniq } },
            select: {
              id: true,
              name: true,
              alias: true,
              description: true,
              menu_groups: true,
            },
          })
        : [];
      const roleById = new Map<string, RoleLite>(roles.map(r => [r.id, r]));

      return {
        ...user,
        adminUserRoles: attachRolesToUserRoles(
          user.adminUserRoles as AdminUserRoleRow[],
          roleById
        ),
      };
    }),

  // 获取管理员的所有角色
  getRoles: adminAuthProcedure
    .input(
      z.object({
        adminUserId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const adminUserRoles = await ctx.prisma.adminUserRole.findMany({
        where: {
          admin_user_id: input.adminUserId,
        },
        select: {
          admin_role_id: true,
          menu_groups: true,
          start_at: true,
          expires_at: true,
        },
      });

      const roleIds = Array.from(
        new Set(adminUserRoles.map(r => r.admin_role_id).filter(Boolean))
      );
      const roles = roleIds.length
        ? await ctx.prisma.adminRole.findMany({
            where: { id: { in: roleIds } },
            select: {
              id: true,
              name: true,
              alias: true,
              description: true,
              menu_groups: true,
            },
          })
        : [];
      const roleById = new Map<string, RoleLite>(roles.map(r => [r.id, r]));

      return adminUserRoles.map(ur => ({
        ...(roleById.get(ur.admin_role_id) ?? null),
        menu_groups:
          ur.menu_groups ?? roleById.get(ur.admin_role_id)?.menu_groups ?? [],
        start_at: ur.start_at,
        expires_at: ur.expires_at,
      }));
    }),
});

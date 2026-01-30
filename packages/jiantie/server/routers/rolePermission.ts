import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';

export const rolePermissionRouter = router({
  // --------- 角色管理（前台用户角色 Role） ---------
  roleFindMany: protectedProcedure
    .input(
      z
        .object({
          appid: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};

      if (input?.appid) {
        where.appid = input.appid;
      }

      const roles = await ctx.prisma.role.findMany({
        where,
        orderBy: [{ appid: 'asc' }, { id: 'asc' }],
        include: {
          rolePermissions: {
            include: {
              permission: {
                select: {
                  id: true,
                  action_url: true,
                  alias: true,
                  description: true,
                  value: true,
                },
              },
            },
          },
          userRoles: {
            select: {
              uid: true,
            },
          },
        },
      });

      return roles;
    }),

  roleCreate: protectedProcedure
    .input(
      z.object({
        appid: z.string(),
        name: z.string().optional().nullable(),
        alias: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.role.create({
        data: {
          appid: input.appid,
          name: input.name ?? null,
          alias: input.alias ?? null,
          description: input.description ?? null,
        },
      });
    }),

  roleUpdate: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional().nullable(),
        alias: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      return ctx.prisma.role.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.alias !== undefined && { alias: data.alias }),
          ...(data.description !== undefined && { description: data.description }),
        },
      });
    }),

  roleDelete: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userRolesCount = await ctx.prisma.userRole.count({
        where: { role_id: input.id },
      });

      if (userRolesCount > 0) {
        throw new Error('该角色已被用户使用，无法删除');
      }

      // 删除角色权限关系
      await ctx.prisma.rolePermission.deleteMany({
        where: { role_id: input.id },
      });

      return ctx.prisma.role.delete({
        where: { id: input.id },
      });
    }),

  // --------- 权限管理（Permission） ---------
  permissionFindMany: protectedProcedure
    .input(
      z
        .object({
          keyword: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};

      if (input?.keyword) {
        const keyword = input.keyword;
        where.OR = [
          {
            action_url: {
              contains: keyword,
            },
          },
          {
            alias: {
              contains: keyword,
            },
          },
          {
            description: {
              contains: keyword,
            },
          },
        ];
      }

      return ctx.prisma.permission.findMany({
        where,
        orderBy: [{ id: 'asc' }],
      });
    }),

  permissionCreate: protectedProcedure
    .input(
      z.object({
        action_url: z.string().min(1, '权限动作URL不能为空'),
        alias: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        value: z.number().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.permission.create({
        data: {
          action_url: input.action_url,
          alias: input.alias ?? null,
          description: input.description ?? null,
          value: input.value ?? null,
        },
      });
    }),

  permissionUpdate: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        action_url: z.string().optional(),
        alias: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        value: z.number().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      return ctx.prisma.permission.update({
        where: { id },
        data: {
          ...(data.action_url !== undefined && { action_url: data.action_url }),
          ...(data.alias !== undefined && { alias: data.alias }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.value !== undefined && { value: data.value }),
        },
      });
    }),

  permissionDelete: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const rolePermissionCount = await ctx.prisma.rolePermission.count({
        where: { permission_id: input.id },
      });

      const userResourceCount = await ctx.prisma.userResource.count({
        where: { permission_id: input.id },
      });

      if (rolePermissionCount > 0 || userResourceCount > 0) {
        throw new Error('该权限已被使用，无法删除');
      }

      return ctx.prisma.permission.delete({
        where: { id: input.id },
      });
    }),

  // --------- 角色权限关系管理（RolePermission） ---------
  assignRolePermissions: protectedProcedure
    .input(
      z.object({
        roleId: z.number(),
        permissionIds: z.array(z.number()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { roleId, permissionIds } = input;

      // 先清空原有关系
      await ctx.prisma.rolePermission.deleteMany({
        where: { role_id: roleId },
      });

      if (permissionIds.length > 0) {
        await ctx.prisma.rolePermission.createMany({
          data: permissionIds.map(permissionId => ({
            role_id: roleId,
            permission_id: permissionId,
          })),
        });
      }

      // 返回最新的角色信息（包含权限列表）
      const role = await ctx.prisma.role.findUnique({
        where: { id: roleId },
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
          userRoles: true,
        },
      });

      return role;
    }),
});

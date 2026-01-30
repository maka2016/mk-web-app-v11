import { z } from 'zod';
import { publicProcedure, router } from '../trpc';

// UserResource 查询 Router
export const userResourceRouter = router({
  // 查询已购作品列表（用于替换 apiv10 的 user-resources 接口）
  getPurchased: publicProcedure
    .input(
      z.object({
        uid: z.number(), // 用户ID
        resourceIds: z.array(z.string()), // 作品ID列表
        resourceType: z.string().optional().default('works'), // 资源类型，默认为 works
      })
    )
    .query(async ({ ctx, input }) => {
      if (input.resourceIds.length === 0) {
        return [];
      }

      const now = new Date();

      const userResources = await ctx.prisma.userResource.findMany({
        where: {
          uid: input.uid,
          resource_id: {
            in: input.resourceIds,
          },
          resource_type: input.resourceType,
          // 只返回未过期或没有过期时间的资源
          OR: [
            { expires_at: null },
            { expires_at: { gt: now } },
          ],
        },
        select: {
          resource_id: true,
          expires_at: true,
        },
      });

      return userResources.map(resource => ({
        resourceId: resource.resource_id || '',
        expiryDate: resource.expires_at ? resource.expires_at.toISOString() : null,
      }));
    }),

  // 查询用户资源列表
  findMany: publicProcedure
    .input(
      z
        .object({
          uid: z.number().optional(), // 用户ID
          resourceId: z.string().optional(), // 资源ID
          resourceType: z.string().optional(), // 资源类型
          permissionId: z.number().optional(), // 权限ID
          includeExpired: z.boolean().optional().default(false), // 是否包含已过期的资源
          skip: z.number().optional().default(0),
          take: z.number().optional().default(20),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};
      const now = new Date();

      if (input?.uid) {
        where.uid = input.uid;
      }

      if (input?.resourceId) {
        where.resource_id = input.resourceId;
      }

      if (input?.resourceType) {
        where.resource_type = input.resourceType;
      }

      if (input?.permissionId) {
        where.permission_id = input.permissionId;
      }

      // 如果不包含已过期的资源，添加过期时间过滤
      if (!input?.includeExpired) {
        where.OR = [
          { expires_at: null },
          { expires_at: { gt: now } },
        ];
      }

      return ctx.prisma.userResource.findMany({
        where,
        skip: input?.skip,
        take: input?.take,
        orderBy: { create_time: 'desc' },
        select: {
          id: true,
          uid: true,
          resource_id: true,
          resource_type: true,
          permission_id: true,
          action_url: true,
          val: true,
          start_at: true,
          expires_at: true,
          create_time: true,
          update_time: true,
        },
      });
    }),

  // 统计用户资源数量
  count: publicProcedure
    .input(
      z
        .object({
          uid: z.number().optional(),
          resourceId: z.string().optional(),
          resourceType: z.string().optional(),
          permissionId: z.number().optional(),
          includeExpired: z.boolean().optional().default(false),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};
      const now = new Date();

      if (input?.uid) {
        where.uid = input.uid;
      }

      if (input?.resourceId) {
        where.resource_id = input.resourceId;
      }

      if (input?.resourceType) {
        where.resource_type = input.resourceType;
      }

      if (input?.permissionId) {
        where.permission_id = input.permissionId;
      }

      // 如果不包含已过期的资源，添加过期时间过滤
      if (!input?.includeExpired) {
        where.OR = [
          { expires_at: null },
          { expires_at: { gt: now } },
        ];
      }

      return ctx.prisma.userResource.count({ where });
    }),

  // 根据 ID 查询单个用户资源
  findById: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.userResource.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          uid: true,
          resource_id: true,
          resource_type: true,
          permission_id: true,
          action_url: true,
          val: true,
          start_at: true,
          expires_at: true,
          create_time: true,
          update_time: true,
        },
      });
    }),
});

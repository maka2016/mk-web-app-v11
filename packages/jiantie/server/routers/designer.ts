import { z } from 'zod';
import { publicProcedure, router } from '../trpc';

// DesignerEntity CRUD Router
export const designerRouter = router({
  // 创建设计师
  create: publicProcedure
    .input(
      z.object({
        name: z.string(),
        desc: z.string().optional(),
        avatar: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        uid: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.designerEntity.create({
        data: input,
      });
    }),

  // 查询列表
  findMany: publicProcedure
    .input(
      z
        .object({
          deleted: z.boolean().optional(),
          name: z.string().optional(), // 名称模糊搜索
          skip: z.number().optional(),
          take: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};

      if (input?.deleted !== undefined) where.deleted = input.deleted;
      if (input?.name) {
        where.name = {
          contains: input.name,
        };
      }

      return ctx.prisma.designerEntity.findMany({
        where,
        skip: input?.skip,
        take: input?.take,
        orderBy: { update_time: 'desc' },
        include: {
          _count: {
            select: {
              templates: true,
            },
          },
        },
      });
    }),

  // 统计数量
  count: publicProcedure
    .input(
      z
        .object({
          deleted: z.boolean().optional(),
          name: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};

      if (input?.deleted !== undefined) where.deleted = input.deleted;
      if (input?.name) {
        where.name = {
          contains: input.name,
        };
      }

      return ctx.prisma.designerEntity.count({ where });
    }),

  // 根据ID查询
  findById: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.designerEntity.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: {
              templates: true,
            },
          },
        },
      });
    }),

  // 根据UID查询
  findByUid: publicProcedure
    .input(
      z.object({
        uid: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.designerEntity.findUnique({
        where: { uid: input.uid },
        include: {
          _count: {
            select: {
              templates: true,
            },
          },
        },
      });
    }),

  // 更新设计师
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        desc: z.string().optional(),
        avatar: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.designerEntity.update({
        where: { id },
        data,
      });
    }),

  // 删除设计师（软删除）
  delete: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.designerEntity.update({
        where: { id: input.id },
        data: { deleted: true },
      });
    }),

  // 恢复设计师
  recover: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.designerEntity.update({
        where: { id: input.id },
        data: { deleted: false },
      });
    }),
});

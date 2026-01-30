import crypto from 'crypto';
import { z } from 'zod';
import { publicProcedure, router } from '../trpc';

/**
 * 生成 MD5 哈希
 */
function md5Hash(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex');
}

// WorksSpecEntity 的单位枚举
const WorksSpecUnitEnum = z.enum(['px', 'mm', 'cm', 'in', 'pt', 'pc']);

// WorksSpecEntity CRUD Router
export const worksSpecRouter = router({
  // 创建规格（如果已存在则更新）
  create: publicProcedure
    .input(
      z.object({
        name: z.string(),
        alias: z.string(),
        desc: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        max_page_count: z.number().optional(),
        is_flip_page: z.boolean().optional(),
        use_animation: z.boolean().optional(),
        offline: z.boolean().optional(),
        appid: z.string().optional(),
        is_flat_page: z.boolean().optional(),
        unit: WorksSpecUnitEnum.optional(),
        interactive_features: z.string().optional(),
        display_name: z.string().optional(),
        viewport_width: z.number().optional(),
        fixed_height: z.boolean().optional(),
        export_format: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 使用 name 的 MD5 作为 ID（与原实现保持一致）
      const documentId = md5Hash(input.name);

      // 检查是否已存在
      const exists = await ctx.prisma.worksSpecEntity.findUnique({
        where: { id: documentId },
      });

      if (exists) {
        // 已存在则更新
        await ctx.prisma.worksSpecEntity.update({
          where: { id: documentId },
          data: input,
        });
        return ctx.prisma.worksSpecEntity.findUnique({
          where: { id: documentId },
        });
      }

      // 不存在则创建
      return ctx.prisma.worksSpecEntity.create({
        data: {
          ...input,
          id: documentId,
        },
      });
    }),

  // 查询列表
  findMany: publicProcedure
    .input(
      z
        .object({
          alias: z.string().optional(),
          deleted: z.boolean().optional(),
          appid: z.string().optional(),
          skip: z.number().optional(),
          take: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};

      if (input?.alias !== undefined) where.alias = input.alias;
      if (input?.deleted !== undefined) where.deleted = input.deleted;
      if (input?.appid !== undefined) where.appid = input.appid;

      return ctx.prisma.worksSpecEntity.findMany({
        where,
        skip: input?.skip,
        take: input?.take,
        orderBy: { update_time: 'desc' },
      });
    }),

  // 查询规格列表（包含作品统计信息，用于前端展示）
  findManyWithStats: publicProcedure
    .input(
      z
        .object({
          uid: z.number().optional(), // 用户ID，用于统计该用户的作品
          deleted: z.boolean().optional(),
          appid: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const specWhere: any = {};
      if (input?.deleted !== undefined) specWhere.deleted = input.deleted;
      if (input?.appid !== undefined) specWhere.appid = input.appid;

      // 如果没有提供 uid，返回规格列表但不统计作品数
      if (!input?.uid) {
        const specs = await ctx.prisma.worksSpecEntity.findMany({
          where: specWhere,
          orderBy: { update_time: 'desc' },
        });

        return {
          specs: specs.map(spec => ({
            id: spec.id,
            name: spec.name,
            alias: spec.alias,
            display_name: spec.display_name,
            count: 0,
          })),
          totalWorksCount: 0,
        };
      }

      const worksWhere: any = {
        uid: input.uid,
        deleted: false,
        is_folder: false,
      };

      // 并行查询：规格列表（带作品统计）+ 总作品数
      const [specs, totalWorksCount] = await Promise.all([
        // 查询规格列表，使用 _count 统计每个规格的作品数
        ctx.prisma.worksSpecEntity.findMany({
          where: specWhere,
          orderBy: { update_time: 'desc' },
          include: {
            _count: {
              select: {
                works: {
                  where: worksWhere,
                },
              },
            },
          },
        }),
        // 查询总作品数
        ctx.prisma.worksEntity.count({
          where: worksWhere,
        }),
      ]);

      // 转换返回格式
      const specsWithCount = specs.map(spec => ({
        id: spec.id,
        name: spec.name,
        alias: spec.alias,
        display_name: spec.display_name,
        count: spec._count.works,
      }));

      return {
        specs: specsWithCount,
        totalWorksCount,
      };
    }),

  // 查询列表（带总数）- 对应原来的 /v1/list
  findManyWithCount: publicProcedure
    .input(
      z
        .object({
          alias: z.string().optional(),
          deleted: z.boolean().optional(),
          appid: z.string().optional(),
          skip: z.number().optional(),
          take: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};

      if (input?.alias !== undefined) where.alias = input.alias;
      if (input?.deleted !== undefined) where.deleted = input.deleted;
      if (input?.appid !== undefined) where.appid = input.appid;

      const [list, total] = await Promise.all([
        ctx.prisma.worksSpecEntity.findMany({
          where,
          skip: input?.skip,
          take: input?.take,
          orderBy: { update_time: 'desc' },
        }),
        ctx.prisma.worksSpecEntity.count({ where }),
      ]);

      return {
        list,
        total,
      };
    }),

  // 根据ID查询
  findById: publicProcedure
    .input(
      z.object({
        id: z.string(),
        fields: z.array(z.string()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // 如果指定了字段，则只查询这些字段
      if (input.fields && input.fields.length > 0) {
        const select: any = {};
        input.fields.forEach(field => {
          select[field] = true;
        });

        return ctx.prisma.worksSpecEntity.findUnique({
          where: { id: input.id },
          select,
        });
      }

      // 否则查询所有字段
      return ctx.prisma.worksSpecEntity.findUnique({
        where: { id: input.id },
      });
    }),

  // 根据别名查询
  findByAlias: publicProcedure
    .input(z.object({ alias: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.worksSpecEntity.findFirst({
        where: {
          alias: input.alias,
          deleted: false,
        },
      });
    }),

  // 根据名称查询（对应 getSpecBySpacName）
  findByName: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.worksSpecEntity.findFirst({
        where: {
          name: input.name,
        },
      });
    }),

  // 更新规格
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        alias: z.string().optional(),
        desc: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        display_name: z.string().optional(),
        offline: z.boolean().optional(),
        deleted: z.boolean().optional(),
        export_format: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.worksSpecEntity.update({
        where: { id },
        data,
      });
    }),

  // 删除规格（软删除）
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.worksSpecEntity.update({
        where: { id: input.id },
        data: { deleted: true },
      });
    }),

  // 统计数量
  count: publicProcedure
    .input(
      z
        .object({
          deleted: z.boolean().optional(),
          appid: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};

      if (input?.deleted !== undefined) where.deleted = input.deleted;
      if (input?.appid !== undefined) where.appid = input.appid;

      return ctx.prisma.worksSpecEntity.count({ where });
    }),
});

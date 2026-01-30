import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import {
  SearchParams,
  searchTemplates,
  SpecStat,
  ExtendedSearchResult,
} from '../../../search/src/service/searchV1';
// 搜索 Router
export const searchRouter = router({
  // 获取热词列表
  listHotKeywords: publicProcedure
    .input(
      z.object({
        // 搜索关键词
        keyword: z.string().optional(),
        // 应用ID筛选
        appid: z.string().optional(),
        // 上线状态筛选
        online: z.boolean().optional(),
        // 分页
        skip: z.number().int().min(0).default(0),
        take: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const where: any = {
          deleted: false,
        };

        if (input.keyword) {
          where.keyword = { contains: input.keyword, mode: 'insensitive' };
        }

        if (input.appid) {
          where.appid = input.appid;
        }

        if (input.online !== undefined) {
          where.online = input.online;
        }

        const [data, total] = await Promise.all([
          ctx.prisma.searchHotKeywordEntity.findMany({
            where,
            skip: input.skip,
            take: input.take,
            orderBy: [{ sort_order: 'desc' }, { create_time: 'desc' }],
          }),
          ctx.prisma.searchHotKeywordEntity.count({ where }),
        ]);

        return {
          data,
          total,
        };
      } catch (error) {
        console.error('[Search Router] 获取热词列表失败:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '获取热词列表失败',
        });
      }
    }),

  // 创建热词
  createHotKeyword: publicProcedure
    .input(
      z.object({
        keyword: z.string().min(1, '热词不能为空'),
        appid: z.string().min(1, '应用ID不能为空'),
        sort_order: z.number().int().default(0),
        online: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // 检查是否已存在相同的热词和应用ID组合
        const existing = await ctx.prisma.searchHotKeywordEntity.findFirst({
          where: {
            keyword: input.keyword,
            appid: input.appid,
            deleted: false,
          },
        });

        if (existing) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: '该应用下已存在相同的热词',
          });
        }

        const result = await ctx.prisma.searchHotKeywordEntity.create({
          data: {
            keyword: input.keyword.trim(),
            appid: input.appid,
            sort_order: input.sort_order,
            online: input.online,
          },
        });

        return { success: true, data: result };
      } catch (error: any) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error('[Search Router] 创建热词失败:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || '创建热词失败',
        });
      }
    }),

  // 更新热词
  updateHotKeyword: publicProcedure
    .input(
      z.object({
        id: z.string(),
        keyword: z.string().min(1, '热词不能为空').optional(),
        appid: z.string().optional(),
        sort_order: z.number().int().optional(),
        online: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...updateData } = input;

        // 如果更新 keyword 或 appid，检查是否与其他记录冲突
        if (updateData.keyword || updateData.appid) {
          const existing = await ctx.prisma.searchHotKeywordEntity.findFirst({
            where: {
              keyword: updateData.keyword,
              appid: updateData.appid,
              deleted: false,
              id: { not: id },
            },
          });

          if (existing) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: '该应用下已存在相同的热词',
            });
          }
        }

        const result = await ctx.prisma.searchHotKeywordEntity.update({
          where: { id },
          data: updateData,
        });

        return { success: true, data: result };
      } catch (error: any) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error('[Search Router] 更新热词失败:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || '更新热词失败',
        });
      }
    }),

  // 删除热词（软删除）
  deleteHotKeyword: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.prisma.searchHotKeywordEntity.update({
          where: { id: input.id },
          data: { deleted: true },
        });

        return { success: true };
      } catch (error) {
        console.error('[Search Router] 删除热词失败:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '删除热词失败',
        });
      }
    }),

  // 搜索模板
  searchTemplates: publicProcedure
    .input(
      z.object({
        query: z.string().min(1, '搜索词不能为空'),
        page: z.number().int().positive().default(1),
        page_size: z.number().int().positive().default(30),
        sort: z
          .enum(['composite', 'latest', 'bestseller'])
          .default('composite'),
        appid: z.string().optional(),
        spec_id: z.string().optional(),
        facet_mode: z.enum(['0', '1']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const isFacetOnlyMode = input.facet_mode === '1';

      // 构建搜索参数
      const searchParamsObj: SearchParams = {
        query: input.query.trim(),
        page: input.page,
        page_size: input.page_size,
        sort: input.sort,
        filter: {},
      };

      // 添加过滤器
      if (input.appid) {
        searchParamsObj.filter!.appid = input.appid;
      }
      if (input.spec_id) {
        searchParamsObj.filter!.spec_id = input.spec_id;
      }

      console.log('调用搜索服务', searchParamsObj, { isFacetOnlyMode });
      // 调用搜索服务
      const result = await searchTemplates(searchParamsObj, isFacetOnlyMode);

      // 获取规格ID列表并查询规格详情
      const specIds = result.specs?.map((spec: SpecStat) => spec.spec_id) || [];
      const specEntities =
        specIds.length > 0
          ? await ctx.prisma.worksSpecEntity.findMany({
              where: {
                id: { in: specIds },
                deleted: false,
              },
              select: {
                id: true,
                name: true,
                alias: true,
                display_name: true,
              },
            })
          : [];

      // 构建规格数据映射
      const specMap = new Map(specEntities.map(spec => [spec.id, spec]));

      // 拼装规格信息（包含统计数量和详情）
      const specs = (result.specs || []).map((specStat: SpecStat) => {
        const specEntity = specMap.get(specStat.spec_id);
        return {
          id: specStat.spec_id,
          name: specEntity?.name || '',
          alias: specEntity?.alias || '',
          display_name:
            specEntity?.display_name ||
            specEntity?.name ||
            specEntity?.alias ||
            '',
          count: specStat.count,
        };
      });

      // 仅标签模式：只返回规格数据，不返回模板列表
      if (isFacetOnlyMode) {
        return {
          result: {
            template_list: [],
            specs,
            total: result.total,
          },
        };
      }

      // 获取模板ID列表
      const templateIds = result.templates.map(
        (t: ExtendedSearchResult) => t.template_id
      );

      // 从数据库批量获取模板的 coverV3 和 cover 数据
      const templateEntities = await ctx.prisma.templateEntity.findMany({
        where: {
          id: { in: templateIds },
          deleted: false,
        },
        select: {
          id: true,
          coverV3: true,
        },
      });

      // 构建模板数据映射
      const templateMap = new Map(templateEntities.map(t => [t.id, t]));

      return {
        result: {
          template_list: result.templates.map(
            (template: ExtendedSearchResult) => {
              const templateEntity = templateMap.get(template.template_id);
              const coverUrl = (templateEntity?.coverV3 as { url: string; width: number; height: number } | null)?.url || '';

              return {
                template: template.template_id,
                name: template.title || '',
                preview_image_url: coverUrl,
                cover: coverUrl,
                coverV3: templateEntity?.coverV3 || null,
                sort_score: template.sort_score,
                sort_factors: template.sort_factors,
              };
            }
          ),
          total: result.total,
          page: result.page,
          total_pages: result.total_pages,
          specs,
        },
      };
    }),
});

import mysql from 'mysql2/promise';
import { z } from 'zod';
import { publicProcedure, router } from '../trpc';

// 订单中心库（MySQL）连接池：用于读取订单金额
const orderPool = mysql.createPool({
  host: 'rdsa2uaava2uaav413.mysql.rds.aliyuncs.com',
  user: 'query_prod',
  password: 'jCItnVtI0k67RBrt',
  database: 'mk_order_center',
});

// 频道栏目 Router
export const channelRouter = router({
  // 查询频道栏目（一级-栏目及其下级二级-频道）
  getChannels: publicProcedure
    .input(
      z.object({
        env: z.string().default('production'),
        appid: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // 构建查询条件
      const where: any = {
        class: '一级栏目',
        env: input.env,
        online: true,
      };

      // appid 筛选
      if (input.appid) {
        where.appid = input.appid;
      }

      // 构建子频道查询条件
      const childrenWhere: any = {
        class: '二级频道',
        online: true,
      };

      // 子频道也添加 appid 筛选
      if (input.appid) {
        childrenWhere.appid = input.appid;
      }

      // 查询"一级-栏目"
      const channels = await ctx.prisma.templateMarketChannelEntity.findMany({
        where,
        include: {
          children: {
            where: childrenWhere,
            orderBy: {
              sort_weight: 'desc',
            },
          },
        },
        orderBy: {
          id: 'asc',
        },
      });

      return channels;
    }),

  // 获取二级频道详情（包含三级热词）
  getChannelDetail: publicProcedure
    .input(
      z.object({
        id: z.number(),
        // locale: z.string().default('zh-CN'),
      })
    )
    .query(async ({ ctx, input }) => {
      const channel = await ctx.prisma.templateMarketChannelEntity.findUnique({
        where: {
          id: input.id,
        },
        include: {
          children: {
            where: {
              class: '三级热词',
              // locale: input.locale,
              online: true,
            },
            include: {
              filter: {
                select: {
                  alias: true,
                  templateIds: true,
                  config: true,
                },
              },
              children: {
                where: {
                  class: '四级标签',
                  // locale: input.locale,
                  online: true,
                },
                orderBy: {
                  sort_weight: 'desc',
                },
              },
            },
            orderBy: {
              sort_weight: 'desc',
            },
          },
        },
      });

      return channel;
    }),

  // 根据三级热词的 filter alias 获取模板列表
  getTemplatesByFilter: publicProcedure
    .input(
      z.object({
        filterAlias: z.string(), // TemplateFilterEntity 的 alias
        skip: z.number().default(0),
        take: z.number().default(20),
        tagId: z.string().optional(), // 可选的标签ID，用于筛选模板
        sortBy: z.enum(['default', 'time', 'hot']).optional().default('default'), // 排序方式：综合、最新、最热
      })
    )
    .query(async ({ ctx, input }) => {
      // 1. 根据 alias 获取 TemplateFilterEntity
      const filter = await ctx.prisma.templateFilterEntity.findUnique({
        where: {
          alias: input.filterAlias,
        },
      });

      if (!filter || !filter.templateIds || filter.templateIds.length === 0) {
        return {
          templates: [],
          total: 0,
        };
      }

      // 2. 如果提供了 tagId，先筛选出包含该标签的模板ID
      let filteredTemplateIds = filter.templateIds;
      if (input.tagId) {
        const templatesWithTag = await ctx.prisma.templateEntity.findMany({
          where: {
            id: { in: filter.templateIds },
            deleted: false,
            tags: {
              some: {
                id: input.tagId,
              },
            },
          },
          select: {
            id: true,
          },
        });
        filteredTemplateIds = templatesWithTag.map(t => t.id);
      }

      if (filteredTemplateIds.length === 0) {
        return {
          templates: [],
          total: 0,
        };
      }

      // 3. 根据排序方式处理模板ID列表
      let finalTemplateIds = filteredTemplateIds;
      if (input.sortBy === 'hot') {
        // 最热：按照排序要素表中的购买量（sales_count）降序排序
        const sortMetrics = await ctx.prisma.templateSortMetricsEntity.findMany({
          where: {
            template_id: { in: filteredTemplateIds },
          },
          select: {
            template_id: true,
            sales_count: true,
          },
        });

        // 创建购买量映射表，没有数据的默认为0
        const salesCountMap = new Map(sortMetrics.map(m => [m.template_id, m.sales_count]));

        // 按照购买量降序排序
        finalTemplateIds = [...filteredTemplateIds].sort((a, b) => {
          const salesA = salesCountMap.get(a) ?? 0;
          const salesB = salesCountMap.get(b) ?? 0;
          return salesB - salesA; // 降序
        });
      } else if (input.sortBy === 'default') {
        // 综合：按照排序要素表中的综合排序分（composite_score）降序排序
        const sortMetrics = await ctx.prisma.templateSortMetricsEntity.findMany({
          where: {
            template_id: { in: filteredTemplateIds },
          },
          select: {
            template_id: true,
            composite_score: true,
          },
        });

        // 创建综合排序分映射表，没有数据的默认为0
        const compositeScoreMap = new Map(sortMetrics.map(m => [m.template_id, m.composite_score]));

        // 按照综合排序分降序排序
        finalTemplateIds = [...filteredTemplateIds].sort((a, b) => {
          const scoreA = compositeScoreMap.get(a) ?? 0;
          const scoreB = compositeScoreMap.get(b) ?? 0;
          return scoreB - scoreA; // 降序
        });
      }

      // 4. 根据筛选后的 templateIds 获取模板列表
      let orderBy: { create_time?: 'desc' | 'asc'; custom_time?: 'desc' | 'asc' } | undefined;
      if (input.sortBy === 'time') {
        // 最新：按创建时间倒序
        orderBy = { create_time: 'desc' };
      }
      // 综合和最热：不设置 orderBy，使用 ID 顺序（已按排序要素表排序）

      // 根据排序方式决定查询方式
      let templates;
      if (input.sortBy === 'hot' || input.sortBy === 'default') {
        // 最热和综合：按照排序后的 ID 顺序查询
        const paginatedIds = finalTemplateIds.slice(input.skip, input.skip + input.take);
        templates = await ctx.prisma.templateEntity.findMany({
          where: {
            id: { in: paginatedIds },
            deleted: false,
          },
          select: {
            id: true,
            title: true,
            desc: true,
            coverV3: true,
            spec_id: true,
            create_time: true,
            update_time: true,
            custom_time: true,
          },
        });
        // 按照 paginatedIds 的顺序排序，保持排序顺序
        const idOrderMap = new Map(paginatedIds.map((id, index) => [id, index]));
        templates.sort((a, b) => {
          const orderA = idOrderMap.get(a.id) ?? Infinity;
          const orderB = idOrderMap.get(b.id) ?? Infinity;
          return orderA - orderB;
        });
      } else {
        // 最新：使用正常的排序查询
        templates = await ctx.prisma.templateEntity.findMany({
          where: {
            id: { in: filteredTemplateIds },
            deleted: false,
          },
          select: {
            id: true,
            title: true,
            desc: true,
            coverV3: true,
            spec_id: true,
            create_time: true,
            update_time: true,
            custom_time: true,
          },
          skip: input.skip,
          take: input.take,
          orderBy,
        });
      }

      // 3. 获取规格信息
      const specIds = templates.map(t => t.spec_id).filter(Boolean) as string[];

      const specs =
        specIds.length > 0
          ? await ctx.prisma.worksSpecEntity.findMany({
              where: {
                id: { in: specIds },
              },
              select: {
                id: true,
                preview_width: true,
                preview_height: true,
              },
            })
          : [];

      const specMap = new Map(specs.map(s => [s.id, s]));

      // 4. 合并规格数据
      const templatesWithSpec = templates.map(template => ({
        ...template,
        spec: template.spec_id ? specMap.get(template.spec_id) : null,
      }));

      return {
        templates: templatesWithSpec,
        total: filteredTemplateIds.length,
      };
    }),

  // 根据四级标签的 channelId 获取模板列表
  getTemplatesByChannelId: publicProcedure
    .input(
      z.object({
        channelId: z.number(), // 四级标签的 channel id
        skip: z.number().default(0),
        take: z.number().default(20),
        sortBy: z.enum(['default', 'time', 'hot']).optional().default('default'), // 排序方式：综合、最新、最热
      })
    )
    .query(async ({ ctx, input }) => {
      // 1. 根据 channelId 获取四级标签
      const channel = await ctx.prisma.templateMarketChannelEntity.findUnique({
        where: {
          id: input.channelId,
        },
        select: {
          template_ids: true,
        },
      });

      if (!channel || !channel.template_ids || channel.template_ids.length === 0) {
        return {
          templates: [],
          total: 0,
        };
      }

      const templateIds = channel.template_ids;

      // 2. 根据排序方式处理模板ID列表
      let finalTemplateIds = templateIds;
      console.log('input.sortBy', templateIds.length);
      if (input.sortBy === 'hot') {
        // 最热：按照排序要素表中的购买量（sales_count）降序排序
        const sortMetrics = await ctx.prisma.templateSortMetricsEntity.findMany({
          where: {
            template_id: { in: templateIds },
          },
          select: {
            template_id: true,
            sales_count: true,
          },
        });

        // 创建购买量映射表，没有数据的默认为0
        const salesCountMap = new Map(sortMetrics.map(m => [m.template_id, m.sales_count]));

        // 按照购买量降序排序
        finalTemplateIds = [...templateIds].sort((a, b) => {
          const salesA = salesCountMap.get(a) ?? 0;
          const salesB = salesCountMap.get(b) ?? 0;
          return salesB - salesA; // 降序
        });
      } else if (input.sortBy === 'default') {
        // 综合：按照排序要素表中的综合排序分（composite_score）降序排序
        const sortMetrics = await ctx.prisma.templateSortMetricsEntity.findMany({
          where: {
            template_id: { in: templateIds },
          },
          select: {
            template_id: true,
            composite_score: true,
          },
        });

        // 创建综合排序分映射表，没有数据的默认为0
        const compositeScoreMap = new Map(sortMetrics.map(m => [m.template_id, m.composite_score]));

        // 按照综合排序分降序排序
        finalTemplateIds = [...templateIds].sort((a, b) => {
          const scoreA = compositeScoreMap.get(a) ?? 0;
          const scoreB = compositeScoreMap.get(b) ?? 0;
          return scoreB - scoreA; // 降序
        });
      }

      // 3. 根据筛选后的 templateIds 获取模板列表
      let orderBy: { create_time?: 'desc' | 'asc'; custom_time?: 'desc' | 'asc' } | undefined;
      if (input.sortBy === 'time') {
        // 最新：按创建时间倒序
        orderBy = { create_time: 'desc' };
      }
      // 综合和最热：不设置 orderBy，使用 ID 顺序（已按排序要素表排序）

      // 根据排序方式决定查询方式
      let templates;
      if (input.sortBy === 'hot' || input.sortBy === 'default') {
        // 最热和综合：按照排序后的 ID 顺序查询
        const paginatedIds = finalTemplateIds.slice(input.skip, input.skip + input.take);
        console.log('paginatedIds', paginatedIds);
        templates = await ctx.prisma.templateEntity.findMany({
          where: {
            id: { in: paginatedIds },
            deleted: false,
          },
          select: {
            id: true,
            title: true,
            desc: true,
            coverV3: true,
            spec_id: true,
            create_time: true,
            update_time: true,
            custom_time: true,
          },
        });

        console.log('templates', templates.length);
        // 按照 paginatedIds 的顺序排序，保持排序顺序
        const idOrderMap = new Map(paginatedIds.map((id, index) => [id, index]));
        templates.sort((a, b) => {
          const orderA = idOrderMap.get(a.id) ?? Infinity;
          const orderB = idOrderMap.get(b.id) ?? Infinity;
          return orderA - orderB;
        });
      } else {
        // 最新：使用正常的排序查询
        templates = await ctx.prisma.templateEntity.findMany({
          where: {
            id: { in: templateIds },
            deleted: false,
          },
          select: {
            id: true,
            title: true,
            desc: true,
            coverV3: true,
            spec_id: true,
            create_time: true,
            update_time: true,
            custom_time: true,
          },
          skip: input.skip,
          take: input.take,
          orderBy,
        });
      }

      // 4. 获取规格信息
      const specIds = templates.map(t => t.spec_id).filter(Boolean) as string[];

      const specs =
        specIds.length > 0
          ? await ctx.prisma.worksSpecEntity.findMany({
              where: {
                id: { in: specIds },
              },
              select: {
                id: true,
                preview_width: true,
                preview_height: true,
              },
            })
          : [];

      const specMap = new Map(specs.map(s => [s.id, s]));

      // 5. 合并规格数据
      const templatesWithSpec = templates.map(template => ({
        ...template,
        spec: template.spec_id ? specMap.get(template.spec_id) : null,
      }));

      return {
        templates: templatesWithSpec,
        total: templateIds.length,
      };
    }),

  // 获取筛选器下所有模板的排序要素数据
  getTemplateSortMetricsByFilter: publicProcedure
    .input(
      z.object({
        filterAlias: z.string(), // TemplateFilterEntity 的 alias
      })
    )
    .query(async ({ ctx, input }) => {
      // 1. 根据 alias 获取 TemplateFilterEntity
      const filter = await ctx.prisma.templateFilterEntity.findUnique({
        where: {
          alias: input.filterAlias,
        },
      });

      if (!filter || !filter.templateIds || filter.templateIds.length === 0) {
        return {
          templates: [],
        };
      }

      // 2. 获取所有模板的基本信息
      const templates = await ctx.prisma.templateEntity.findMany({
        where: {
          id: { in: filter.templateIds },
          deleted: false,
        },
        select: {
          id: true,
          title: true,
          desc: true,
          coverV3: true,
        },
      });

      // 3. 获取所有模板的排序要素数据
      const sortMetrics = await ctx.prisma.templateSortMetricsEntity.findMany({
        where: {
          template_id: { in: filter.templateIds },
        },
        select: {
          template_id: true,
          sales_count: true,
          creation_count: true,
          composite_score: true,
          data: true,
          publish_time: true,
          pin_weight: true,
        },
      });

      // 4. 创建排序要素数据映射表
      const sortMetricsMap = new Map(sortMetrics.map(m => [m.template_id, m]));

      // 5. 合并模板信息和排序要素数据
      const templatesWithMetrics = templates.map(template => {
        const metrics = sortMetricsMap.get(template.id);
        return {
          ...template,
          sortMetrics: metrics
            ? {
                sales_count: metrics.sales_count,
                creation_count: metrics.creation_count,
                composite_score: metrics.composite_score,
                data: metrics.data as Record<string, any> | null,
                publish_time: metrics.publish_time,
                pin_weight: metrics.pin_weight,
              }
            : null,
        };
      });

      // 6. 按照综合排序分降序排序
      templatesWithMetrics.sort((a, b) => {
        const scoreA = a.sortMetrics?.composite_score ?? 0;
        const scoreB = b.sortMetrics?.composite_score ?? 0;
        return scoreB - scoreA;
      });

      return {
        templates: templatesWithMetrics,
      };
    }),

  // 获取频道统计数据
  getChannelStatistics: publicProcedure
    .input(
      z.object({
        channelIds: z.array(z.number()).optional(), // 可选的频道ID列表，不传则查询所有三级热词
        dateFrom: z.string().optional(), // 日期范围开始 (YYYY-MM-DD)
        dateTo: z.string().optional(), // 日期范围结束 (YYYY-MM-DD)
        device: z.enum(['all', 'web', 'ios', 'android', 'wap', 'other']).optional().default('all'), // 设备类型筛选
      })
    )
    .query(async ({ ctx, input }) => {
      // 构建查询条件
      const where: any = {};

      // 频道ID筛选
      if (input.channelIds && input.channelIds.length > 0) {
        where.channel_id = { in: input.channelIds };
      } else {
        // 如果没有指定频道ID，查询所有四级标签频道
        const level4TagChannels = await ctx.prisma.templateMarketChannelEntity.findMany({
          where: {
            class: '四级标签',
            online: true,
          },
          select: {
            id: true,
          },
        });
        where.channel_id = { in: level4TagChannels.map(c => c.id) };
      }

      // 日期范围筛选
      if (input.dateFrom || input.dateTo) {
        where.date = {};
        if (input.dateFrom) {
          where.date.gte = new Date(input.dateFrom);
        }
        if (input.dateTo) {
          const dateTo = new Date(input.dateTo);
          dateTo.setHours(23, 59, 59, 999);
          where.date.lt = dateTo;
        }
      }

      // 设备类型筛选
      if (input.device && input.device !== 'all') {
        where.device = input.device;
      }

      // 查询统计数据
      const statistics = await ctx.prisma.channelDailyStatisticsEntity.findMany({
        where,
        include: {
          channel: {
            select: {
              id: true,
              display_name: true,
              alias: true,
              parent_id: true,
              class: true,
              sort_weight: true,
              parent: {
                select: {
                  id: true,
                  display_name: true,
                  alias: true,
                  class: true,
                  sort_weight: true,
                  parent: {
                    select: {
                      id: true,
                      display_name: true,
                      alias: true,
                      class: true,
                      sort_weight: true,
                      parent: {
                        select: {
                          id: true,
                          display_name: true,
                          alias: true,
                          class: true,
                          sort_weight: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: [{ date: 'desc' }, { channel_id: 'asc' }, { device: 'asc' }],
      });

      return statistics;
    }),

  // 获取频道统计数据汇总（按频道聚合）
  getChannelStatisticsSummary: publicProcedure
    .input(
      z.object({
        channelIds: z.array(z.number()).optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        device: z.enum(['all', 'web', 'ios', 'android', 'wap', 'other']).optional().default('all'),
      })
    )
    .query(async ({ ctx, input }) => {
      // 构建查询条件
      const where: any = {};

      if (input.channelIds && input.channelIds.length > 0) {
        where.channel_id = { in: input.channelIds };
      } else {
        const level4TagChannels = await ctx.prisma.templateMarketChannelEntity.findMany({
          where: {
            class: '四级标签',
            online: true,
          },
          select: {
            id: true,
          },
        });
        where.channel_id = { in: level4TagChannels.map(c => c.id) };
      }

      if (input.dateFrom || input.dateTo) {
        where.date = {};
        if (input.dateFrom) {
          where.date.gte = new Date(input.dateFrom);
        }
        if (input.dateTo) {
          const dateTo = new Date(input.dateTo);
          dateTo.setHours(23, 59, 59, 999);
          where.date.lt = dateTo;
        }
      }

      if (input.device && input.device !== 'all') {
        where.device = input.device;
      }

      // 查询统计数据并按频道聚合
      const statistics = await ctx.prisma.channelDailyStatisticsEntity.findMany({
        where,
        include: {
          channel: {
            select: {
              id: true,
              display_name: true,
              alias: true,
              parent_id: true,
              class: true,
              sort_weight: true,
              parent: {
                select: {
                  id: true,
                  display_name: true,
                  alias: true,
                  class: true,
                  sort_weight: true,
                  parent: {
                    select: {
                      id: true,
                      display_name: true,
                      alias: true,
                      class: true,
                      sort_weight: true,
                      parent: {
                        select: {
                          id: true,
                          display_name: true,
                          alias: true,
                          class: true,
                          sort_weight: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      // 按频道ID聚合数据
      const summaryMap = new Map<
        number,
        {
          channel_id: number;
          channel: any;
          view_pv: number;
          view_uv: number;
          click_pv: number;
          click_uv: number;
          creation_pv: number;
          creation_uv: number;
          intercept_pv: number;
          intercept_uv: number;
          order_count: number;
          transaction_amount: number;
        }
      >();

      for (const stat of statistics) {
        const channelId = stat.channel_id;
        if (!summaryMap.has(channelId)) {
          summaryMap.set(channelId, {
            channel_id: channelId,
            channel: stat.channel,
            view_pv: 0,
            view_uv: 0,
            click_pv: 0,
            click_uv: 0,
            creation_pv: 0,
            creation_uv: 0,
            intercept_pv: 0,
            intercept_uv: 0,
            order_count: 0,
            transaction_amount: 0,
          });
        }

        const summary = summaryMap.get(channelId)!;
        summary.view_pv += stat.view_pv;
        summary.view_uv += stat.view_uv;
        summary.click_pv += stat.click_pv;
        summary.click_uv += stat.click_uv;
        summary.creation_pv += stat.creation_pv;
        summary.creation_uv += stat.creation_uv;
        summary.intercept_pv += stat.intercept_pv;
        summary.intercept_uv += stat.intercept_uv;
        summary.order_count += stat.order_count;
        summary.transaction_amount += Number(stat.transaction_amount);
      }

      return Array.from(summaryMap.values());
    }),

  // 获取二级频道列表（用于排名页面第一层选择）
  getSecondaryChannels: publicProcedure
    .input(
      z.object({
        locale: z.string().optional().default('zh-CN'),
        env: z.string().optional().default('production'),
      })
    )
    .query(async ({ ctx, input }) => {
      const channels = await ctx.prisma.templateMarketChannelEntity.findMany({
        where: {
          class: '二级频道',
          locale: input.locale,
          env: input.env,
          online: true,
        },
        select: {
          id: true,
          alias: true,
          display_name: true,
          sort_weight: true,
          thumb_path: true,
          parent_id: true,
        },
        orderBy: {
          sort_weight: 'desc',
        },
      });

      return channels;
    }),

  // 根据二级频道获取三级热词列表（用于排名页面第二层选择）
  getHotWordsByChannel: publicProcedure
    .input(
      z.object({
        channelId: z.number(), // 二级频道ID
        locale: z.string().optional().default('zh-CN'),
      })
    )
    .query(async ({ ctx, input }) => {
      const channel = await ctx.prisma.templateMarketChannelEntity.findUnique({
        where: {
          id: input.channelId,
        },
        include: {
          children: {
            where: {
              class: '三级热词',
              locale: input.locale,
              online: true,
            },
            select: {
              id: true,
              alias: true,
              display_name: true,
              sort_weight: true,
              filter: {
                select: {
                  alias: true,
                },
              },
            },
            orderBy: {
              sort_weight: 'desc',
            },
          },
        },
      });

      return channel?.children || [];
    }),

  // 根据三级热词ID获取其所属的二级频道ID
  getChannelByHotWord: publicProcedure
    .input(
      z.object({
        hotWordId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const hotWord = await ctx.prisma.templateMarketChannelEntity.findUnique({
        where: {
          id: input.hotWordId,
        },
        select: {
          parent_id: true,
        },
      });

      return hotWord?.parent_id || null;
    }),

  // 批量根据三级热词ID列表获取热词信息
  getHotWordsByIds: publicProcedure
    .input(
      z.object({
        ids: z.array(z.number()),
      })
    )
    .query(async ({ ctx, input }) => {
      if (input.ids.length === 0) {
        return [];
      }

      const hotWords = await ctx.prisma.templateMarketChannelEntity.findMany({
        where: {
          id: {
            in: input.ids,
          },
          class: '三级热词',
        },
        select: {
          id: true,
          display_name: true,
          alias: true,
        },
      });

      return hotWords;
    }),

  // 根据三级热词获取其下的四级标签楼层列表（用于模板排名楼层选择）
  getFloorsByHotWord: publicProcedure
    .input(
      z.object({
        hotWordId: z.number(), // 三级热词ID
        locale: z.string().optional().default('zh-CN'),
      })
    )
    .query(async ({ ctx, input }) => {
      const floors = await ctx.prisma.templateMarketChannelEntity.findMany({
        where: {
          parent_id: input.hotWordId,
          class: '四级标签',
          locale: input.locale,
          online: true,
        },
        select: {
          id: true,
          alias: true,
          display_name: true,
          sort_weight: true,
        },
        orderBy: {
          sort_weight: 'desc',
        },
      });

      return floors;
    }),

  // 获取模板排名数据
  // 数据源说明（更新后）：
  // - 第一层频道选择为 template_market_channel_entity 的 class 为「二级频道」的数据
  // - 第二层频道选择为 template_market_channel_entity 的 class 为「三级热词」的数据
  // - 三级热词下面挂载的「四级标签」作为楼层，每个四级标签在 template_market_channel_entity.template_ids 中维护模板列表
  // - 模板集合不再依赖 template_filter_entity，而是从四级标签楼层收集 template_ids
  // - 统计指标仍然来自 template_daily_statistics_entity
  getTemplateRanking: publicProcedure
    .input(
      z.object({
        hotWordId: z.number().optional(), // 三级热词ID（用于从其子级四级标签汇总模板）
        channelId: z.number().optional(), // 四级标签ID（直接从该楼层获取模板）
        device: z.enum(['all', 'web', 'ios', 'android', 'wap', 'other']).optional().default('all'), // 设备类型筛选
        timeRange: z.enum(['today', 'yesterday', '7days', '14days', 'history']).optional().default('14days'), // 时间范围：今天、昨天、近7天、14天或历史
        limit: z.number().optional().default(100), // 返回数量限制
      })
    )
    .query(async ({ ctx, input }) => {
      // 计算日期范围
      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      let dateFrom: Date;
      let dateTo: Date;

      if (input.timeRange === 'today') {
        // 今天：从今天0点开始到23:59:59
        dateFrom = new Date(today);
        dateTo = new Date(today);
        dateTo.setHours(23, 59, 59, 999);
      } else if (input.timeRange === 'yesterday') {
        // 昨天：昨天0点到23:59:59
        dateFrom = new Date(today);
        dateFrom.setDate(dateFrom.getDate() - 1);
        dateTo = new Date(dateFrom);
        dateTo.setHours(23, 59, 59, 999);
      } else if (input.timeRange === '7days') {
        // 近7天：从7天前0点开始到今天23:59:59
        dateFrom = new Date(today);
        dateFrom.setDate(dateFrom.getDate() - 7);
        dateTo = new Date(today);
        dateTo.setHours(23, 59, 59, 999);
      } else if (input.timeRange === '14days') {
        // 14天：近14天，从14天前0点开始到今天23:59:59
        dateFrom = new Date(today);
        dateFrom.setDate(dateFrom.getDate() - 14);
        dateTo = new Date(today);
        dateTo.setHours(23, 59, 59, 999);
      } else {
        // 历史：从最早的数据开始到今天23:59:59
        dateFrom = new Date(0); // 1970-01-01
        dateTo = new Date(today);
        dateTo.setHours(23, 59, 59, 999);
      }

      // 1. 如果既没有提供 hotWordId 也没有提供 channelId，返回空数组
      if (!input.hotWordId && !input.channelId) {
        return [];
      }

      // 2. 计算模板ID集合（优先使用四级标签 channelId，其次使用三级热词下所有四级标签的模板合集）
      let templateIds: string[] = [];

      if (input.channelId) {
        // 2.1 从指定四级标签楼层直接读取模板ID
        const level4Channel = await ctx.prisma.templateMarketChannelEntity.findUnique({
          where: {
            id: input.channelId,
          },
          select: {
            class: true,
            template_ids: true,
          },
        });

        if (
          !level4Channel ||
          level4Channel.class !== '四级标签' ||
          !level4Channel.template_ids ||
          level4Channel.template_ids.length === 0
        ) {
          return [];
        }

        templateIds = level4Channel.template_ids.filter(Boolean);
      } else if (input.hotWordId) {
        // 2.2 没有指定四级标签时，通过三级热词聚合其下所有四级标签的模板ID
        const level4Channels = await ctx.prisma.templateMarketChannelEntity.findMany({
          where: {
            parent_id: input.hotWordId,
            class: '四级标签',
            online: true,
          },
          select: {
            template_ids: true,
          },
        });

        const idsSet = new Set<string>();
        for (const ch of level4Channels) {
          if (ch.template_ids && ch.template_ids.length > 0) {
            for (const id of ch.template_ids) {
              if (id) {
                idsSet.add(id);
              }
            }
          }
        }

        if (idsSet.size === 0) {
          return [];
        }

        templateIds = Array.from(idsSet);
      }

      if (!templateIds || templateIds.length === 0) {
        return [];
      }

      // 3. 获取模板基本信息
      const templates = await ctx.prisma.templateEntity.findMany({
        where: {
          id: { in: templateIds },
          deleted: false,
        },
        select: {
          id: true,
          title: true,
          coverV3: true,
          designer_uid: true,
          tags: {
            select: {
              name: true,
            },
          },
        },
      });

      if (templates.length === 0) {
        return [];
      }

      // 4. 获取近3个月的每日统计数据
      const whereDailyStats: any = {
        template_id: { in: templateIds },
        date: {
          gte: dateFrom,
          lt: dateTo,
        },
      };

      if (input.device && input.device !== 'all') {
        whereDailyStats.device = input.device;
      }

      const dailyStats = await ctx.prisma.templateDailyStatisticsEntity.findMany({
        where: whereDailyStats,
        select: {
          template_id: true,
          view_pv: true,
          view_uv: true,
          click_pv: true,
          click_uv: true,
          creation_pv: true,
          creation_uv: true,
          intercept_pv: true,
          intercept_uv: true,
          success_pv: true,
          success_uv: true,
          order_count: true,
          transaction_amount: true,
        },
      });

      // 5. 获取排序要素数据
      const sortMetrics = await ctx.prisma.templateSortMetricsEntity.findMany({
        where: {
          template_id: { in: templateIds },
        },
        select: {
          template_id: true,
          sales_count: true,
          creation_count: true,
          composite_score: true,
          data: true,
        },
      });

      // 6. 获取设计师信息
      const designerUids = Array.from(
        new Set(templates.map(t => t.designer_uid).filter((uid): uid is number => uid !== null && uid !== undefined))
      );
      const designers = await ctx.prisma.designerEntity.findMany({
        where: {
          uid: { in: designerUids },
          deleted: false,
        },
        select: {
          uid: true,
          name: true,
        },
      });

      const designerMap = new Map(designers.map(d => [d.uid, d.name]));

      // 7. 聚合每日统计数据
      const statsMap = new Map<string, any>();

      for (const stat of dailyStats) {
        if (!statsMap.has(stat.template_id)) {
          statsMap.set(stat.template_id, {
            // 曝光pvuv
            view_pv: 0,
            view_uv: 0,
            // 点击pvuv
            click_pv: 0,
            click_uv: 0,
            // 创作量pvuv
            creation_pv: 0,
            creation_uv: 0,
            // 拦截量pvuv
            intercept_pv: 0,
            intercept_uv: 0,
            // 成功量pvuv
            success_pv: 0,
            success_uv: 0,
            // 付费量
            order_count: 0,
            // 付费金额
            transaction_amount: 0,
          });
        }

        const templateStats = statsMap.get(stat.template_id)!;
        // 曝光pvuv
        templateStats.view_pv += stat.view_pv;
        templateStats.view_uv += stat.view_uv;
        // 点击pvuv
        templateStats.click_pv += stat.click_pv;
        templateStats.click_uv += stat.click_uv;
        // 创作量pvuv
        templateStats.creation_pv += stat.creation_pv;
        templateStats.creation_uv += stat.creation_uv;
        // 拦截量pvuv
        templateStats.intercept_pv += stat.intercept_pv;
        templateStats.intercept_uv += stat.intercept_uv;
        // 成功量pvuv
        templateStats.success_pv += stat.success_pv;
        templateStats.success_uv += stat.success_uv;
        // 付费量
        templateStats.order_count += stat.order_count;
        // 付费金额
        templateStats.transaction_amount += Number(stat.transaction_amount);
      }

      // 8. 合并数据并计算指标
      const templatesWithMetrics = templates
        .map(template => {
          const stats = statsMap.get(template.id) || {
            view_pv: 0,
            view_uv: 0,
            click_pv: 0,
            click_uv: 0,
            creation_pv: 0,
            creation_uv: 0,
            intercept_pv: 0,
            intercept_uv: 0,
            success_pv: 0,
            success_uv: 0,
            order_count: 0,
            transaction_amount: 0,
          };

          const sortMetric = sortMetrics.find(m => m.template_id === template.id);

          // 从上架天数字段获取上架天数
          const publishDays =
            sortMetric?.data && typeof sortMetric.data === 'object' && '上架天数' in sortMetric.data
              ? (sortMetric.data as any)['上架天数']
              : null;

          return {
            id: template.id,
            title: template.title,
            code: template.id,
            designer:
              template.designer_uid !== null && template.designer_uid !== undefined
                ? designerMap.get(template.designer_uid) || '未知设计师'
                : '未知设计师',
            image: (template.coverV3 as { url: string; width: number; height: number } | null)?.url || '',
            tags: template.tags.map(t => t.name),
            publish_days: typeof publishDays === 'number' ? publishDays : null,
            metrics: {
              // 曝光pvuv
              view_pv: stats.view_pv,
              view_uv: stats.view_uv,
              // 点击pvuv
              click_pv: stats.click_pv,
              click_uv: stats.click_uv,
              // 创作量pvuv
              creation_pv: stats.creation_pv,
              creation_uv: stats.creation_uv,
              // 拦截量pvuv
              intercept_pv: stats.intercept_pv,
              intercept_uv: stats.intercept_uv,
              // 成功量pvuv
              success_pv: stats.success_pv,
              success_uv: stats.success_uv,
              // 付费量
              order_count: stats.order_count,
              // 付费金额
              transaction_amount: Math.round(stats.transaction_amount * 100) / 100,
              // 综合分
              composite_score: sortMetric?.composite_score ?? 0,
            },
            sortMetrics: sortMetric
              ? {
                  sales_count: sortMetric.sales_count,
                  creation_count: sortMetric.creation_count,
                  composite_score: sortMetric.composite_score,
                }
              : null,
          };
        })
        .sort((a, b) => {
          // 默认按照综合分降序排序，前端可以根据选择的排序指标进行排序
          return b.metrics.composite_score - a.metrics.composite_score;
        })
        .map((item, index) => ({
          ...item,
          rank: index + 1,
        }))
        .slice(0, input.limit);

      return templatesWithMetrics;
    }),

  // 获取最后一条频道统计数据的更新时间
  getLatestUpdateTime: publicProcedure.query(async ({ ctx }) => {
    const latestRecord = await ctx.prisma.channelDailyStatisticsEntity.findFirst({
      orderBy: {
        update_time: 'desc',
      },
      select: {
        update_time: true,
      },
    });

    return latestRecord?.update_time || null;
  }),

  // 获取设计师统计数据（按设计师聚合模板数据）
  getCreatorStatistics: publicProcedure
    .input(
      z.object({
        mode: z.enum(['current_month', 'last_month', 'current_quarter', 'last_quarter', 'total']),
        device: z.enum(['all', 'ios', 'android', 'web', 'wap', 'other']).optional().default('all'),
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      let dateFrom: Date;
      let dateTo: Date;
      let compareDateFrom: Date | null = null;
      let compareDateTo: Date | null = null;

      // 计算日期范围
      if (input.mode === 'current_month') {
        // 本月
        dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFrom.setHours(0, 0, 0, 0);
        dateTo = new Date(now);
        dateTo.setHours(23, 59, 59, 999);

        // 上月（用于环比）
        compareDateFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        compareDateFrom.setHours(0, 0, 0, 0);
        compareDateTo = new Date(now.getFullYear(), now.getMonth(), 0);
        compareDateTo.setHours(23, 59, 59, 999);
      } else if (input.mode === 'last_month') {
        // 上月
        dateFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        dateFrom.setHours(0, 0, 0, 0);
        dateTo = new Date(now.getFullYear(), now.getMonth(), 0);
        dateTo.setHours(23, 59, 59, 999);

        // 上上月（用于环比）
        compareDateFrom = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        compareDateFrom.setHours(0, 0, 0, 0);
        compareDateTo = new Date(now.getFullYear(), now.getMonth() - 1, 0);
        compareDateTo.setHours(23, 59, 59, 999);
      } else if (input.mode === 'current_quarter') {
        // 本季
        const currentQuarter = Math.floor(now.getMonth() / 3);
        dateFrom = new Date(now.getFullYear(), currentQuarter * 3, 1);
        dateFrom.setHours(0, 0, 0, 0);
        dateTo = new Date(now);
        dateTo.setHours(23, 59, 59, 999);

        // 上季（用于环比）
        const lastQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
        const lastQuarterYear = currentQuarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
        compareDateFrom = new Date(lastQuarterYear, lastQuarter * 3, 1);
        compareDateFrom.setHours(0, 0, 0, 0);
        compareDateTo = new Date(now.getFullYear(), currentQuarter * 3, 0);
        compareDateTo.setHours(23, 59, 59, 999);
      } else if (input.mode === 'last_quarter') {
        // 上季
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const lastQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
        const lastQuarterYear = currentQuarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
        dateFrom = new Date(lastQuarterYear, lastQuarter * 3, 1);
        dateFrom.setHours(0, 0, 0, 0);
        dateTo = new Date(now.getFullYear(), currentQuarter * 3, 0);
        dateTo.setHours(23, 59, 59, 999);

        // 上上季（用于环比）
        const lastLastQuarter = lastQuarter === 0 ? 3 : lastQuarter - 1;
        const lastLastQuarterYear = lastQuarter === 0 ? lastQuarterYear - 1 : lastQuarterYear;
        compareDateFrom = new Date(lastLastQuarterYear, lastLastQuarter * 3, 1);
        compareDateFrom.setHours(0, 0, 0, 0);
        compareDateTo = new Date(lastQuarterYear, lastQuarter * 3, 0);
        compareDateTo.setHours(23, 59, 59, 999);
      } else {
        // 累计（全部历史数据）
        dateFrom = new Date(0); // 最早日期
        dateTo = new Date(now);
        dateTo.setHours(23, 59, 59, 999);
      }

      // 1. 获取所有未删除的设计师
      const designers = await ctx.prisma.designerEntity.findMany({
        where: {
          deleted: false,
        },
        select: {
          uid: true,
          name: true,
          avatar: true,
        },
      });

      if (designers.length === 0) {
        return [];
      }

      const designerUids = designers.map(d => d.uid);
      const designerMap = new Map(designers.map(d => [d.uid, { name: d.name, avatar: d.avatar }]));

      // 2. 获取设计师的模板（查询所有模板，不按创建时间筛选）
      const templateWhere: any = {
        designer_uid: { in: designerUids },
        deleted: false,
      };

      // 本月和上月模式：查询所有模板，但日期范围仅用于计算新品和统计数据
      // 累计模式：查询所有模板
      const templates = await ctx.prisma.templateEntity.findMany({
        where: templateWhere,
        select: {
          id: true,
          designer_uid: true,
          create_time: true,
        },
      });

      // 3. 获取模板统计数据
      const templateIds = templates.map(t => t.id);
      if (templateIds.length === 0) {
        return [];
      }

      const deviceFilter = input.device === 'all' ? undefined : { device: input.device };

      const statsWhere: any = {
        template_id: { in: templateIds },
        date: {
          gte: dateFrom,
          lt: dateTo,
        },
        ...(deviceFilter && { device: deviceFilter.device }),
      };

      const dailyStats = await ctx.prisma.templateDailyStatisticsEntity.findMany({
        where: statsWhere,
        select: {
          template_id: true,
          order_count: true,
          transaction_amount: true,
          view_pv: true,
        },
      });

      // 4. 获取对比期的统计数据（用于计算环比）
      // 对比期统计所有模板在对比期内的GMV（不限制模板创建时间）
      let compareStats: typeof dailyStats = [];
      if (compareDateFrom && compareDateTo && input.mode !== 'total') {
        // 使用所有模板ID，不限制创建时间
        const compareTemplateIds = templateIds;

        if (compareTemplateIds.length > 0) {
          const compareStatsWhere: any = {
            template_id: { in: compareTemplateIds },
            date: {
              gte: compareDateFrom,
              lt: compareDateTo,
            },
            ...(deviceFilter && { device: deviceFilter.device }),
          };

          compareStats = await ctx.prisma.templateDailyStatisticsEntity.findMany({
            where: compareStatsWhere,
            select: {
              template_id: true,
              order_count: true,
              transaction_amount: true,
              view_pv: true,
            },
          });
        }
      }

      // 5. 按 designer_uid 聚合数据
      const creatorStatsMap = new Map<
        number,
        {
          designer_uid: number;
          gmv: number;
          sales: number;
          templateCount: number;
          newTemplateSales: number; // 新模板销量（周期内创建的模板的销量）
          newTemplateGmv: number; // 新模板销售额（周期内创建的模板的销售额）
          compareGmv: number;
          compareSales: number;
        }
      >();

      // 初始化所有设计师
      for (const designer of designers) {
        creatorStatsMap.set(designer.uid, {
          designer_uid: designer.uid,
          gmv: 0,
          sales: 0,
          templateCount: 0,
          newTemplateSales: 0,
          newTemplateGmv: 0,
          compareGmv: 0,
          compareSales: 0,
        });
      }

      // 聚合当前期数据
      const templateToDesignerMap = new Map(templates.map(t => [t.id, t.designer_uid]));

      // 创建新模板ID集合（周期内创建的模板）
      const newTemplateIds = new Set<string>();
      if (input.mode !== 'total') {
        for (const template of templates) {
          const createTime = new Date(template.create_time);
          if (createTime >= dateFrom && createTime < dateTo) {
            newTemplateIds.add(template.id);
          }
        }
      }

      for (const stat of dailyStats) {
        const designerUid = templateToDesignerMap.get(stat.template_id);
        if (!designerUid) continue;

        const stats = creatorStatsMap.get(designerUid);
        if (stats) {
          stats.gmv += Number(stat.transaction_amount);
          stats.sales += stat.order_count;

          // 如果是新模板（周期内创建的），累加新模板的销量和销售额
          if (newTemplateIds.has(stat.template_id)) {
            stats.newTemplateSales += stat.order_count;
            stats.newTemplateGmv += Number(stat.transaction_amount);
          }
        }
      }

      // 统计每个设计师的模板数量（新品：create_time在周期内的模板）
      for (const template of templates) {
        if (!template.designer_uid) continue;

        const stats = creatorStatsMap.get(template.designer_uid);
        if (!stats) continue;

        // 如果是累计模式，统计所有模板；否则只统计周期内的新品
        if (input.mode === 'total') {
          stats.templateCount += 1;
        } else {
          // 本月/上月模式：只统计创建时间在周期内的模板作为新品
          const createTime = new Date(template.create_time);
          if (createTime >= dateFrom && createTime < dateTo) {
            stats.templateCount += 1;
          }
        }
      }

      // 聚合对比期数据
      // 对比期使用所有模板的统计数据（不限制模板创建时间）
      if (compareStats.length > 0) {
        // 使用所有模板的映射，不限制创建时间
        const compareTemplateToDesignerMap = templateToDesignerMap;

        for (const stat of compareStats) {
          const designerUid = compareTemplateToDesignerMap.get(stat.template_id);
          if (!designerUid) continue;

          const stats = creatorStatsMap.get(designerUid);
          if (stats) {
            stats.compareGmv += Number(stat.transaction_amount);
            stats.compareSales += stat.order_count;
          }
        }
      }

      // 6. 转换为数组并计算环比
      const result = Array.from(creatorStatsMap.values())
        .map(stats => {
          const designer = designerMap.get(stats.designer_uid);
          let trend = 0;

          // 计算环比增长（仅本月和上月模式）
          if (input.mode !== 'total' && stats.compareGmv > 0) {
            trend = ((stats.gmv - stats.compareGmv) / stats.compareGmv) * 100;
          }

          return {
            id: stats.designer_uid.toString(),
            designer_uid: stats.designer_uid,
            name: designer?.name || '未知设计师',
            avatar: designer?.avatar || null,
            gmv: stats.gmv,
            sales: stats.sales,
            templateCount: stats.templateCount,
            newTemplateSales: stats.newTemplateSales,
            newTemplateGmv: stats.newTemplateGmv,
            score: 0, // 综合评分暂时为0
            trend: Math.round(trend * 100) / 100, // 保留两位小数
          };
        })
        .filter(item => item.gmv > 0 || item.sales > 0 || item.templateCount > 0) // 过滤掉没有数据的设计师
        .sort((a, b) => {
          // 按GMV降序排序
          return b.gmv - a.gmv;
        })
        .map((item, index) => ({
          ...item,
          rank: index + 1,
        }));

      return result;
    }),

  // 获取新品爬坡监控数据（近14天的新模板）
  getNewWorksMonitor: publicProcedure
    .input(
      z.object({
        device: z.enum(['all', 'ios', 'android', 'web', 'wap', 'other']).optional().default('all'),
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const dateFrom = new Date(now);
      dateFrom.setDate(dateFrom.getDate() - 14);
      dateFrom.setHours(0, 0, 0, 0);
      const dateTo = new Date(now);
      dateTo.setHours(23, 59, 59, 999);

      // 1. 获取近14天内创建的模板
      const templates = await ctx.prisma.templateEntity.findMany({
        where: {
          deleted: false,
          create_time: {
            gte: dateFrom,
            lt: dateTo,
          },
          designer_uid: {
            not: null,
          },
        },
        select: {
          id: true,
          title: true,
          coverV3: true,
          designer_uid: true,
          create_time: true,
        },
        orderBy: {
          create_time: 'desc',
        },
        take: 50, // 限制返回数量
      });

      if (templates.length === 0) {
        return [];
      }

      const templateIds = templates.map(t => t.id);
      const designerUids = Array.from(
        new Set(templates.map(t => t.designer_uid).filter((uid): uid is number => uid !== null && uid !== undefined))
      );

      // 2. 获取设计师信息
      const designers = await ctx.prisma.designerEntity.findMany({
        where: {
          uid: { in: designerUids },
          deleted: false,
        },
        select: {
          uid: true,
          name: true,
        },
      });

      // 创建 uid 到设计师名称的映射
      const designerMap = new Map<number, string>();
      for (const designer of designers) {
        designerMap.set(designer.uid, designer.name);
      }

      // 3. 获取模板统计数据
      const deviceFilter = input.device === 'all' ? undefined : { device: input.device };

      const statsWhere: any = {
        template_id: { in: templateIds },
        date: {
          gte: dateFrom,
          lt: dateTo,
        },
        ...(deviceFilter && { device: deviceFilter.device }),
      };

      const dailyStats = await ctx.prisma.templateDailyStatisticsEntity.findMany({
        where: statsWhere,
        select: {
          template_id: true,
          date: true,
          view_pv: true,
          click_pv: true,
          creation_pv: true,
          order_count: true,
          transaction_amount: true,
        },
      });

      // 4. 获取综合评分和上线时间
      const sortMetrics = await ctx.prisma.templateSortMetricsEntity.findMany({
        where: {
          template_id: { in: templateIds },
        },
        select: {
          template_id: true,
          composite_score: true,
          publish_time: true,
        },
      });

      const scoreMap = new Map(sortMetrics.map(m => [m.template_id, m.composite_score]));
      const publishTimeMap = new Map(sortMetrics.map(m => [m.template_id, m.publish_time]));

      // 5. 聚合每个模板的数据
      const statsMap = new Map<string, any>();

      for (const stat of dailyStats) {
        if (!statsMap.has(stat.template_id)) {
          statsMap.set(stat.template_id, {
            view_pv: 0,
            click_pv: 0,
            creation_pv: 0,
            order_count: 0,
            transaction_amount: 0,
          });
        }

        const templateStats = statsMap.get(stat.template_id)!;
        templateStats.view_pv += stat.view_pv;
        templateStats.click_pv += stat.click_pv;
        templateStats.creation_pv += stat.creation_pv;
        templateStats.order_count += stat.order_count;
        templateStats.transaction_amount += Number(stat.transaction_amount);
      }

      // 6. 计算每个模板的阶段和指标
      const result = templates.map(template => {
        const stats = statsMap.get(template.id) || {
          view_pv: 0,
          click_pv: 0,
          creation_pv: 0,
          order_count: 0,
          transaction_amount: 0,
        };

        const createTime = new Date(template.create_time);
        const publishTime = publishTimeMap.get(template.id);
        // 计算上线天数：如果有上线时间则用上线时间，否则用创建时间
        const onlineTime = publishTime ? new Date(publishTime) : createTime;
        const timeDiffMs = now.getTime() - onlineTime.getTime();
        const daysSinceOnline = Math.floor(timeDiffMs / (1000 * 60 * 60 * 24));
        const hoursSinceOnline = Math.floor((timeDiffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const creationTimeDiffMs = now.getTime() - createTime.getTime();
        const daysSinceCreation = Math.floor(creationTimeDiffMs / (1000 * 60 * 60 * 24));
        const hoursSinceCreation = Math.floor((creationTimeDiffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        // 判断阶段
        let stage: 'cold_start' | 'climbing' | 'explosive' | 'normal' = 'normal';
        const avgDailySales = daysSinceCreation > 0 ? stats.order_count / daysSinceCreation : 0;
        const score = scoreMap.get(template.id) || 0;

        if (daysSinceCreation <= 3 && stats.view_pv < 500) {
          stage = 'cold_start'; // 冷启动期
        } else if (daysSinceCreation > 3 && daysSinceCreation <= 7) {
          stage = 'climbing'; // 爬坡期
        } else if (daysSinceCreation <= 14 && (avgDailySales > 50 || score > 9.0)) {
          stage = 'explosive'; // 爆发期
        }

        // 计算转化率
        const ctr = stats.view_pv > 0 ? (stats.click_pv / stats.view_pv) * 100 : 0;
        const creationRate = stats.view_pv > 0 ? (stats.creation_pv / stats.view_pv) * 100 : 0;

        return {
          id: template.id,
          title: template.title,
          cover: (template.coverV3 as { url: string; width: number; height: number } | null)?.url || '',
          designer_uid: template.designer_uid,
          designer_name: template.designer_uid ? designerMap.get(template.designer_uid) || '未知设计师' : '未知设计师',
          create_time: template.create_time,
          publish_time: publishTime,
          daysSinceCreation,
          hoursSinceCreation,
          daysSinceOnline,
          hoursSinceOnline,
          stage,
          metrics: {
            view_pv: stats.view_pv,
            click_pv: stats.click_pv,
            creation_pv: stats.creation_pv,
            order_count: stats.order_count,
            transaction_amount: stats.transaction_amount,
            ctr: Math.round(ctr * 100) / 100,
            creation_rate: Math.round(creationRate * 100) / 100,
            avg_daily_sales: Math.round(avgDailySales * 100) / 100,
            score,
          },
        };
      });

      // 按创建时间倒序排序
      return result.sort((a, b) => new Date(b.create_time).getTime() - new Date(a.create_time).getTime());
    }),

  // 获取订单列表
  getOrderList: publicProcedure
    .input(
      z.object({
        dateFrom: z.string().optional(), // 日期范围开始 (YYYY-MM-DD)
        dateTo: z.string().optional(), // 日期范围结束 (YYYY-MM-DD)
        skip: z.number().default(0),
        take: z.number().default(50),
        appid: z.string().optional(), // 应用ID，用于区分 maka|jiantie
        level2ChannelId: z.number().optional(), // 二级频道ID筛选
        level3ChannelId: z.number().optional(), // 三级频道ID筛选
        level4ChannelId: z.number().optional(), // 四级频道ID筛选
        refPageType: z.string().optional(), // 来源类型筛选：tag_channel | search_page_mix
        searchTerm: z.string().optional(), // 搜索词筛选
        paymentType: z.string().optional(), // 支付渠道筛选
        templateId: z.string().optional(), // 模板ID筛选
      })
    )
    .query(async ({ ctx, input }) => {
      // 构建查询条件
      const where: any = {
        deleted: false,
      };

      // appid 筛选
      if (input.appid) {
        where.appid = input.appid;
      }

      // 日期范围筛选
      if (input.dateFrom || input.dateTo) {
        console.log('input.dateFrom', input.dateFrom);
        console.log('input.dateTo', input.dateTo);
        where.date = {};
        if (input.dateFrom) {
          const dateFrom = new Date(input.dateFrom);
          dateFrom.setHours(0, 0, 0, 0);
          where.date.gt = dateFrom;
        }
        if (input.dateTo) {
          const dateTo = new Date(input.dateTo);
          dateTo.setHours(0, 0, 0, 0);
          where.date.lte = dateTo;
        }
      }

      // 支付渠道筛选
      if (input.paymentType) {
        where.payment_type = input.paymentType;
      }

      // 来源类型筛选（如果同时有频道或搜索词筛选，则会被覆盖）
      if (
        input.refPageType &&
        !input.searchTerm &&
        !input.level2ChannelId &&
        !input.level3ChannelId &&
        !input.level4ChannelId
      ) {
        where.ref_page_type = input.refPageType;
      }

      // 频道筛选：需要先查询频道信息，获取符合条件的频道ID列表
      let channelFilterIds: number[] | null = null;
      if (input.level2ChannelId || input.level3ChannelId || input.level4ChannelId) {
        // 查询所有相关频道
        const channelWhere: any = {
          online: true,
        };
        if (input.appid) {
          channelWhere.appid = input.appid;
        }

        const allChannels = await ctx.prisma.templateMarketChannelEntity.findMany({
          where: channelWhere,
          include: {
            parent: {
              include: {
                parent: true,
              },
            },
          },
        });

        // 根据筛选条件找到符合条件的四级频道ID
        const validChannelIds = new Set<number>();
        for (const channel of allChannels) {
          let level2Id: number | null = null;
          let level3Id: number | null = null;
          let level4Id: number | null = null;

          // 判断频道层级
          if (channel.class === '四级标签' || channel.class === 'level_4') {
            level4Id = channel.id;
            level3Id = channel.parent_id;
            level2Id = channel.parent?.parent_id || null;
          } else if (channel.class === '三级热词' || channel.class === 'level_3') {
            level3Id = channel.id;
            level2Id = channel.parent_id;
          } else if (channel.class === '二级频道' || channel.class === 'level_2') {
            level2Id = channel.id;
          }

          // 检查是否符合筛选条件
          let match = true;
          if (input.level4ChannelId && level4Id !== input.level4ChannelId) {
            match = false;
          }
          if (input.level3ChannelId && level3Id !== input.level3ChannelId) {
            match = false;
          }
          if (input.level2ChannelId && level2Id !== input.level2ChannelId) {
            match = false;
          }

          if (match && level4Id) {
            // 符合条件的四级频道ID
            validChannelIds.add(level4Id);
          }
        }

        channelFilterIds = Array.from(validChannelIds);
      }

      // 搜索词筛选：需要筛选 ref_page_type='search_page_mix' 且 ref_page_id 包含搜索词
      if (input.searchTerm) {
        where.ref_page_type = 'search_page_mix';
        where.ref_page_id = {
          contains: input.searchTerm,
        };
      }

      // 如果频道筛选没有结果，直接返回空
      if (channelFilterIds !== null && channelFilterIds.length === 0) {
        return {
          orders: [],
          total: 0,
        };
      }

      // 频道筛选：筛选 ref_page_type='tag_channel' 且 ref_page_id 在符合条件的频道ID列表中
      if (channelFilterIds && channelFilterIds.length > 0) {
        where.ref_page_type = 'tag_channel';
        where.ref_page_id = {
          in: channelFilterIds.map(id => id.toString()),
        };
      }

      // 模板ID筛选：需要先查询符合条件的作品ID
      if (input.templateId) {
        const works = await ctx.prisma.worksEntity.findMany({
          where: {
            template_id: input.templateId,
          },
          select: {
            id: true,
          },
        });

        const workIds = works.map(w => w.id);

        // 如果没有找到符合条件的作品，直接返回空
        if (workIds.length === 0) {
          return {
            orders: [],
            total: 0,
          };
        }

        // 添加作品ID筛选条件
        where.work_id = {
          in: workIds,
        };
      }

      // 查询符合条件的订单记录总数
      const total = await ctx.prisma.orderRecordEntity.count({ where });

      // 查询符合条件的订单记录（分页）
      const orders = await ctx.prisma.orderRecordEntity.findMany({
        where,
        select: {
          id: true,
          uid: true,
          order_id: true,
          create_time: true,
          payment_type: true,
          payment_time: true,
          work_id: true,
          work_type: true,
          ref_page_type: true,
          ref_page_id: true,
          date: true,
        },
        orderBy: {
          payment_time: 'desc',
        },
        skip: input.skip,
        take: input.take,
      });

      // 获取所有用户ID和作品ID
      const uids = Array.from(new Set(orders.map(o => o.uid)));
      const workIds = orders.map(o => o.work_id).filter((id): id is string => !!id);

      // 查询用户信息（注册时间和注册渠道）
      const userInfos = await ctx.prisma.userInfoEntity.findMany({
        where: {
          uid: { in: uids },
        },
        select: {
          uid: true,
          register_date: true,
          register_source: true,
        },
      });

      const userInfoMap = new Map(
        userInfos.map(u => [
          u.uid,
          {
            register_date: u.register_date,
            register_source: u.register_source,
          },
        ])
      );

      // 查询作品信息（用于获取作品标题、模板ID和封面）
      const works = await ctx.prisma.worksEntity.findMany({
        where: {
          id: { in: workIds },
        },
        select: {
          id: true,
          title: true,
          template_id: true,
          cover: true,
        },
      });

      const workMap = new Map(works.map(w => [w.id, w]));

      // 从订单记录的 ref_page_type 和 ref_page_id 获取频道ID
      // 当 ref_page_type 为 tag_channel 时，ref_page_id 是四级频道id
      const channelIds = new Set<number>();
      for (const order of orders) {
        if (order.ref_page_type === 'tag_channel' && order.ref_page_id) {
          const channelId = parseInt(order.ref_page_id, 10);
          if (!isNaN(channelId)) {
            channelIds.add(channelId);
          }
        }
      }

      // 查询频道信息（包括父级频道）
      const channels = await ctx.prisma.templateMarketChannelEntity.findMany({
        where: {
          id: { in: Array.from(channelIds) },
        },
        include: {
          parent: {
            include: {
              parent: {
                include: {
                  parent: true,
                },
              },
            },
          },
        },
      });

      const channelMap = new Map(channels.map(c => [c.id, c]));

      // 从原始订单表查询订单金额
      const orderIds = orders.map(o => o.order_id);
      const orderAmountMap = new Map<string, number>();

      if (orderIds.length > 0) {
        try {
          const placeholders = orderIds.map(() => '?').join(',');
          const orderAmountSql = `
            SELECT order_no, amount
            FROM orders
            WHERE order_no IN (${placeholders})
              AND order_status = 'paid'
          `;

          const [orderAmountRows] = (await orderPool.execute(orderAmountSql, orderIds)) as unknown as [
            { order_no: string; amount: number }[],
          ];

          if (Array.isArray(orderAmountRows)) {
            for (const row of orderAmountRows) {
              orderAmountMap.set(row.order_no, row.amount);
            }
          }
        } catch (error) {
          console.error('查询订单金额失败:', error);
          // 如果查询失败，继续执行，金额字段将为null
        }
      }

      // 构建返回数据
      const result = orders.map(order => {
        const userInfo = userInfoMap.get(order.uid);
        const userRegisterDate = userInfo?.register_date || null;
        const userRegisterSource = userInfo?.register_source || null;
        const work = order.work_id ? workMap.get(order.work_id) : null;

        // 从订单记录的 ref_page_type 和 ref_page_id 提取频道信息
        let level2Channel: any = null;
        let level3Channel: any = null;
        let level4Channel: any = null;
        let searchTerm: string | null = null;

        if (order.ref_page_type === 'tag_channel' && order.ref_page_id) {
          // 频道类型：ref_page_id 是四级频道id
          const channelId = parseInt(order.ref_page_id, 10);
          if (!isNaN(channelId)) {
            const channel = channelMap.get(channelId);
            if (channel) {
              // 判断是几级频道，并获取父级频道
              if (channel.class === '四级标签' || channel.class === 'level_4') {
                level4Channel = channel;
                level3Channel = channel.parent;
                level2Channel = channel.parent?.parent;
              } else if (channel.class === '三级热词' || channel.class === 'level_3') {
                level3Channel = channel;
                level2Channel = channel.parent;
              } else if (channel.class === '二级频道' || channel.class === 'level_2') {
                level2Channel = channel;
              }
            }
          }
        } else if (order.ref_page_type === 'search_page_mix' && order.ref_page_id) {
          // 搜索类型：ref_page_id 是搜索词
          searchTerm = order.ref_page_id;
        }

        return {
          id: order.id,
          order_id: order.order_id,
          uid: order.uid,
          order_time: order.create_time,
          payment_type: order.payment_type,
          work_id: order.work_id,
          work_type: order.work_type,
          work_title: work?.title || null,
          work_cover: work?.cover || null,
          template_id: work?.template_id || null,
          level2_channel_id: level2Channel?.id || null,
          level2_channel_name: level2Channel?.display_name || null,
          level3_channel_id: level3Channel?.id || null,
          level3_channel_name: level3Channel?.display_name || null,
          level4_channel_id: level4Channel?.id || null,
          level4_channel_name: level4Channel?.display_name || null,
          search_term: searchTerm,
          ref_page_type: order.ref_page_type,
          user_register_date: userRegisterDate || null,
          user_register_source: userRegisterSource || null,
          payment_time: order.payment_time,
          amount: orderAmountMap.get(order.order_id) || null,
        };
      });

      return {
        orders: result,
        total,
      };
    }),

  // 获取市场渠道统计数据（按注册渠道和日期）
  getMarketChannelStatistics: publicProcedure
    .input(
      z.object({
        dateFrom: z.string().optional(), // 日期范围开始 (YYYY-MM-DD)
        dateTo: z.string().optional(), // 日期范围结束 (YYYY-MM-DD)
        device: z.enum(['all', 'web', 'ios', 'android', 'wap', 'other']).optional().default('all'), // 设备类型筛选
        appid: z.string().optional(), // 应用ID，用于区分 maka|jiantie
      })
    )
    .query(async ({ ctx, input }) => {
      // 计算日期范围
      const dateFrom = input.dateFrom ? new Date(input.dateFrom) : new Date(0);
      dateFrom.setHours(0, 0, 0, 0);
      const dateTo = input.dateTo ? new Date(input.dateTo) : new Date();
      // 使用 lt 时，dateTo 应该是下一天的0点
      dateTo.setDate(dateTo.getDate() + 1);
      dateTo.setHours(0, 0, 0, 0);

      // 构建用户查询条件
      const userWhere: any = {
        deleted: false,
        register_date: {
          gte: dateFrom,
          lt: dateTo,
        },
      };

      if (input.appid) {
        userWhere.appid = input.appid;
      }

      // 1. 获取注册用户数据（按注册渠道和日期分组）
      const users = await ctx.prisma.userInfoEntity.findMany({
        where: userWhere,
        select: {
          uid: true,
          register_date: true,
          register_source: true,
          register_device: true,
        },
      });

      // 2. 按注册渠道和日期分组统计注册量
      const registerStatsMap = new Map<
        string,
        {
          register_source: string | null;
          date: string;
          register_count: number;
        }
      >();

      for (const user of users) {
        const dateStr = user.register_date.toISOString().split('T')[0];
        const key = `${user.register_source || 'unknown'}_${dateStr}`;

        if (!registerStatsMap.has(key)) {
          registerStatsMap.set(key, {
            register_source: user.register_source,
            date: dateStr,
            register_count: 0,
          });
        }

        const stats = registerStatsMap.get(key)!;
        stats.register_count++;
      }

      // 3. 获取所有相关用户的UID
      const uids = users.map(u => u.uid);
      if (uids.length === 0) {
        return [];
      }

      // 4. 获取作品数据（用于统计创作pvuv）
      const worksWhere: any = {
        uid: { in: uids },
        deleted: false,
      };

      if (input.device && input.device !== 'all') {
        // 需要根据用户的注册设备筛选
        const usersByDevice = users.filter(u => normalizeDevice(u.register_device) === input.device);
        const uidsByDevice = usersByDevice.map(u => u.uid);
        if (uidsByDevice.length > 0) {
          worksWhere.uid = { in: uidsByDevice };
        } else {
          return [];
        }
      }

      const works = await ctx.prisma.worksEntity.findMany({
        where: worksWhere,
        select: {
          id: true,
          uid: true,
          create_time: true,
        },
      });

      // 5. 获取作品每日统计数据（用于统计创作pvuv和拦截pvuv）
      const workIds = works.map(w => w.id);
      const worksDailyStatsWhere: any = {
        works_id: { in: workIds },
        date: {
          gte: dateFrom,
          lt: dateTo,
        },
      };

      const worksDailyStats =
        workIds.length > 0
          ? await ctx.prisma.worksDailyStatisticsEntity.findMany({
              where: worksDailyStatsWhere,
              select: {
                works_id: true,
                date: true,
                viewer_pv: true,
                viewer_uv: true,
                vip_inter_count: true,
              },
            })
          : [];

      // 6. 获取订单数据（用于统计订单量和GMV）
      const ordersWhere: any = {
        uid: { in: uids },
        deleted: false,
        date: {
          gte: dateFrom,
          lt: dateTo,
        },
      };

      if (input.device && input.device !== 'all') {
        const usersByDevice = users.filter(u => normalizeDevice(u.register_device) === input.device);
        const uidsByDevice = usersByDevice.map(u => u.uid);
        if (uidsByDevice.length > 0) {
          ordersWhere.uid = { in: uidsByDevice };
        } else {
          // 如果没有匹配的用户,订单数据为空
        }
      }

      const orders = await ctx.prisma.orderRecordEntity.findMany({
        where: ordersWhere,
        select: {
          uid: true,
          date: true,
          payment_time: true,
        },
      });

      // 7. 建立用户到注册渠道的映射
      const userToSourceMap = new Map<number, string | null>();
      const userToRegisterDateMap = new Map<number, Date>();
      for (const user of users) {
        userToSourceMap.set(user.uid, user.register_source);
        userToRegisterDateMap.set(user.uid, user.register_date);
      }

      // 8. 建立作品到用户的映射
      const workToUserMap = new Map<string, number>();
      for (const work of works) {
        workToUserMap.set(work.id, work.uid);
      }

      // 9. 按注册渠道和日期聚合数据
      const statsMap = new Map<
        string,
        {
          register_source: string | null;
          date: string;
          register_count: number;
          creation_pv: number;
          creation_uv: number;
          intercept_pv: number;
          intercept_uv: number;
          order_count: number;
          gmv: number;
          ltv: number;
          ltv7: number;
        }
      >();

      // 初始化所有注册渠道的统计数据
      for (const [key, registerStat] of registerStatsMap.entries()) {
        statsMap.set(key, {
          ...registerStat,
          creation_pv: 0,
          creation_uv: 0,
          intercept_pv: 0,
          intercept_uv: 0,
          order_count: 0,
          gmv: 0,
          ltv: 0,
          ltv7: 0,
        });
      }

      // 统计创作pvuv（按注册渠道和日期）
      const creationUvBySourceDate = new Map<string, Set<number>>();
      for (const stat of worksDailyStats) {
        const workUid = workToUserMap.get(stat.works_id);
        if (!workUid) continue;

        const registerSource = userToSourceMap.get(workUid);
        const dateStr = stat.date.toISOString().split('T')[0];
        const key = `${registerSource || 'unknown'}_${dateStr}`;

        if (!statsMap.has(key)) {
          statsMap.set(key, {
            register_source: registerSource ?? null,
            date: dateStr,
            register_count: 0,
            creation_pv: 0,
            creation_uv: 0,
            intercept_pv: 0,
            intercept_uv: 0,
            order_count: 0,
            gmv: 0,
            ltv: 0,
            ltv7: 0,
          });
        }

        const stats = statsMap.get(key)!;
        stats.creation_pv += stat.viewer_pv || 0;

        // 统计创作UV（需要去重）
        if (!creationUvBySourceDate.has(key)) {
          creationUvBySourceDate.set(key, new Set());
        }
        creationUvBySourceDate.get(key)!.add(workUid);
      }

      // 更新创作UV
      for (const [key, uvSet] of creationUvBySourceDate.entries()) {
        if (statsMap.has(key)) {
          statsMap.get(key)!.creation_uv = uvSet.size;
        }
      }

      // 统计拦截pvuv（按注册渠道和日期）
      const interceptUvBySourceDate = new Map<string, Set<number>>();
      for (const stat of worksDailyStats) {
        const workUid = workToUserMap.get(stat.works_id);
        if (!workUid) continue;

        const registerSource = userToSourceMap.get(workUid);
        const dateStr = stat.date.toISOString().split('T')[0];
        const key = `${registerSource || 'unknown'}_${dateStr}`;

        if (!statsMap.has(key)) {
          statsMap.set(key, {
            register_source: registerSource ?? null,
            date: dateStr,
            register_count: 0,
            creation_pv: 0,
            creation_uv: 0,
            intercept_pv: 0,
            intercept_uv: 0,
            order_count: 0,
            gmv: 0,
            ltv: 0,
            ltv7: 0,
          });
        }

        const stats = statsMap.get(key)!;
        stats.intercept_pv += stat.vip_inter_count || 0;

        // 统计拦截UV（需要去重）
        if (!interceptUvBySourceDate.has(key)) {
          interceptUvBySourceDate.set(key, new Set());
        }
        interceptUvBySourceDate.get(key)!.add(workUid);
      }

      // 更新拦截UV
      for (const [key, uvSet] of interceptUvBySourceDate.entries()) {
        if (statsMap.has(key)) {
          statsMap.get(key)!.intercept_uv = uvSet.size;
        }
      }

      // 统计订单量和GMV（按注册渠道和注册日期）
      // 注意: GMV指的是这批注册的人在查询日期范围内产生的GMV
      // 注意: OrderRecordEntity没有金额字段,这里使用订单数*平均金额估算GMV
      // 实际GMV需要从订单数据库(orderDB)查询获取
      const avgOrderAmount = 10; // 假设平均订单金额为10元,实际需要从数据源获取
      const orderUvBySourceDate = new Map<string, Set<number>>();
      for (const order of orders) {
        const registerSource = userToSourceMap.get(order.uid);
        const registerDate = userToRegisterDateMap.get(order.uid);
        if (!registerDate) continue;

        // 按注册日期统计，而不是按订单日期
        const dateStr = registerDate.toISOString().split('T')[0];
        const key = `${registerSource || 'unknown'}_${dateStr}`;

        if (!statsMap.has(key)) {
          statsMap.set(key, {
            register_source: registerSource ?? null,
            date: dateStr,
            register_count: 0,
            creation_pv: 0,
            creation_uv: 0,
            intercept_pv: 0,
            intercept_uv: 0,
            order_count: 0,
            gmv: 0,
            ltv: 0,
            ltv7: 0,
          });
        }

        const stats = statsMap.get(key)!;
        stats.order_count++;
        stats.gmv += avgOrderAmount; // 使用平均金额估算GMV

        // 统计订单UV（需要去重）
        if (!orderUvBySourceDate.has(key)) {
          orderUvBySourceDate.set(key, new Set());
        }
        orderUvBySourceDate.get(key)!.add(order.uid);
      }

      // 10. 计算LTV和LTV7天
      // LTV: 用户生命周期价值,需要计算每个用户在注册后的所有订单累计金额（不限制订单日期）
      // LTV7: 用户注册后7天内的累计GMV
      const userLtvMap = new Map<number, number>();
      const userLtv7Map = new Map<number, number>();

      // 为LTV单独查询这批注册用户的所有订单（不限制订单日期范围）
      const allOrdersWhere: any = {
        uid: { in: uids },
        deleted: false,
        // 不限制订单日期，查询所有订单
      };

      if (input.device && input.device !== 'all') {
        const usersByDevice = users.filter(u => normalizeDevice(u.register_device) === input.device);
        const uidsByDevice = usersByDevice.map(u => u.uid);
        if (uidsByDevice.length > 0) {
          allOrdersWhere.uid = { in: uidsByDevice };
        } else {
          // 如果没有匹配的用户,订单数据为空
        }
      }

      const allOrders = await ctx.prisma.orderRecordEntity.findMany({
        where: allOrdersWhere,
        select: {
          uid: true,
          date: true,
          payment_time: true,
        },
      });

      // 按用户聚合所有订单数据（用于计算LTV）
      const userOrdersMap = new Map<number, Array<{ date: Date }>>();
      for (const order of allOrders) {
        if (!userOrdersMap.has(order.uid)) {
          userOrdersMap.set(order.uid, []);
        }
        userOrdersMap.get(order.uid)!.push({ date: order.date });
      }

      // 计算每个用户的LTV和LTV7
      for (const [uid, orderList] of userOrdersMap.entries()) {
        const registerDate = userToRegisterDateMap.get(uid);
        if (!registerDate) continue;

        // 计算LTV（注册后的所有订单,这里假设每个订单金额相同,实际需要从订单金额字段获取）
        // 由于OrderRecordEntity没有金额字段,这里暂时用订单数*平均金额估算
        // 实际应该从订单数据库查询金额
        // 只统计注册日期之后的订单
        const ltvOrders = orderList.filter(o => o.date >= registerDate);
        userLtvMap.set(uid, ltvOrders.length * avgOrderAmount);

        // 计算LTV7（注册后7天内的订单）
        const ltv7Date = new Date(registerDate);
        ltv7Date.setDate(ltv7Date.getDate() + 7);
        const ltv7Orders = orderList.filter(o => o.date >= registerDate && o.date < ltv7Date);
        userLtv7Map.set(uid, ltv7Orders.length * avgOrderAmount);
      }

      // 按注册渠道和日期聚合LTV和LTV7
      for (const [uid, ltv] of userLtvMap.entries()) {
        const registerSource = userToSourceMap.get(uid);
        const registerDate = userToRegisterDateMap.get(uid);
        if (!registerDate) continue;

        const dateStr = registerDate.toISOString().split('T')[0];
        const key = `${registerSource || 'unknown'}_${dateStr}`;

        if (statsMap.has(key)) {
          statsMap.get(key)!.ltv += ltv;
        }
      }

      for (const [uid, ltv7] of userLtv7Map.entries()) {
        const registerSource = userToSourceMap.get(uid);
        const registerDate = userToRegisterDateMap.get(uid);
        if (!registerDate) continue;

        const dateStr = registerDate.toISOString().split('T')[0];
        const key = `${registerSource || 'unknown'}_${dateStr}`;

        if (statsMap.has(key)) {
          statsMap.get(key)!.ltv7 += ltv7;
        }
      }

      // 11. 转换为数组并排序
      const result = Array.from(statsMap.values())
        .map(stat => ({
          register_source: stat.register_source || '未知渠道',
          date: stat.date,
          register_count: stat.register_count,
          creation_pv: stat.creation_pv,
          creation_uv: stat.creation_uv,
          intercept_pv: stat.intercept_pv,
          intercept_uv: stat.intercept_uv,
          order_count: stat.order_count,
          gmv: stat.gmv,
          ltv: stat.ltv,
          ltv7: stat.ltv7,
        }))
        .sort((a, b) => {
          // 先按日期排序,再按注册渠道排序
          if (a.date !== b.date) {
            return a.date.localeCompare(b.date);
          }
          return (a.register_source || '').localeCompare(b.register_source || '');
        });

      return result;
    }),
});

// 辅助函数: 标准化设备类型
function normalizeDevice(device: string | null): string {
  if (!device) return 'other';
  const d = device.toLowerCase();
  if (d.includes('ios') || d.includes('iphone') || d.includes('ipad')) {
    return 'ios';
  }
  if (d.includes('android')) {
    return 'android';
  }
  if (d.includes('web')) {
    return 'web';
  }
  if (d.includes('wap')) {
    return 'wap';
  }
  return 'other';
}

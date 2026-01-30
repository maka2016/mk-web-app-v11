import { z } from 'zod';
import { publicProcedure, router } from '../trpc';

// 管理员作品查询 Router
export const adminWorksRouter = router({
  // 根据模板ID查询作品列表（支持时间和支付状态筛选）
  getWorksByTemplate: publicProcedure
    .input(
      z.object({
        template_id: z.string(), // 模板ID
        time_period: z.enum(['today', 'yesterday', 'near7', 'history']), // 时间筛选：今天、昨天、近7天、历史
        is_paid: z.enum(['all', 'paid', 'unpaid']).default('all'), // 支付状态：全部、已付费、未付费
        payment_time_period: z
          .enum(['all', 'today', 'yesterday', 'near7', 'history'])
          .optional()
          .default('all'), // 支付时间筛选：全部、今天、昨天、近7天、历史
        skip: z.number().optional().default(0),
        take: z.number().optional().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const {
        template_id,
        time_period,
        is_paid,
        payment_time_period,
        skip,
        take,
      } = input;

      // 计算时间范围
      const getDateRange = () => {
        const today = new Date();
        const dateTo = new Date(today);
        dateTo.setHours(23, 59, 59, 999);

        let dateFrom: Date | null = null;

        switch (time_period) {
          case 'today':
            dateFrom = new Date(today);
            dateFrom.setHours(0, 0, 0, 0);
            break;
          case 'yesterday':
            dateFrom = new Date(today);
            dateFrom.setDate(dateFrom.getDate() - 1);
            dateFrom.setHours(0, 0, 0, 0);
            dateTo.setDate(dateTo.getDate() - 1);
            dateTo.setHours(23, 59, 59, 999);
            break;
          case 'near7':
            dateFrom = new Date(today);
            dateFrom.setDate(dateFrom.getDate() - 7);
            dateFrom.setHours(0, 0, 0, 0);
            break;
          case 'history':
            // 历史：不限制开始时间，只限制结束时间为昨天23:59:59
            dateTo.setDate(dateTo.getDate() - 1);
            dateTo.setHours(23, 59, 59, 999);
            break;
        }

        return { dateFrom, dateTo };
      };

      // 计算支付时间范围
      const getPaymentDateRange = () => {
        if (payment_time_period === 'all') {
          return { dateFrom: null, dateTo: null };
        }

        const today = new Date();
        const dateTo = new Date(today);
        dateTo.setHours(23, 59, 59, 999);

        let dateFrom: Date | null = null;

        switch (payment_time_period) {
          case 'today':
            dateFrom = new Date(today);
            dateFrom.setHours(0, 0, 0, 0);
            break;
          case 'yesterday':
            dateFrom = new Date(today);
            dateFrom.setDate(dateFrom.getDate() - 1);
            dateFrom.setHours(0, 0, 0, 0);
            dateTo.setDate(dateTo.getDate() - 1);
            dateTo.setHours(23, 59, 59, 999);
            break;
          case 'near7':
            dateFrom = new Date(today);
            dateFrom.setDate(dateFrom.getDate() - 7);
            dateFrom.setHours(0, 0, 0, 0);
            break;
          case 'history':
            // 历史：不限制开始时间，只限制结束时间为昨天23:59:59
            dateTo.setDate(dateTo.getDate() - 1);
            dateTo.setHours(23, 59, 59, 999);
            break;
        }

        return { dateFrom, dateTo };
      };

      const { dateFrom, dateTo } = getDateRange();

      // 构建查询条件
      const where: any = {
        template_id,
        deleted: false,
      };

      // 时间筛选
      if (dateFrom) {
        where.create_time = {
          gte: dateFrom,
          lte: dateTo,
        };
      } else {
        // 历史：只限制结束时间
        where.create_time = {
          lte: dateTo,
        };
      }

      // 查询作品
      const works = await ctx.prisma.worksEntity.findMany({
        where,
        skip,
        take,
        orderBy: { create_time: 'desc' },
        select: {
          id: true,
          title: true,
          desc: true,
          cover: true,
          uid: true,
          create_time: true,
          update_time: true,
          template_id: true,
          version: true,
          metadata: true,
          appid: true,
        },
      });

      // 如果需要按支付状态筛选，先查询所有符合条件的作品ID
      if (is_paid !== 'all') {
        // 先查询所有符合条件的作品ID（不分页）
        const allWorks = await ctx.prisma.worksEntity.findMany({
          where,
          select: {
            id: true,
          },
        });

        const allWorkIds = allWorks.map(w => w.id);

        // 如果没有作品，直接返回
        if (allWorkIds.length === 0) {
          return {
            works: [],
            total: 0,
          };
        }

        // 计算支付时间范围
        const paymentDateRange = getPaymentDateRange();

        // 构建订单查询条件
        const orderWhere: any = {
          work_id: { in: allWorkIds },
          deleted: false,
          payment_type: {
            not: '', // payment_type 不为空表示已支付
          },
        };

        // 添加支付时间筛选
        if (paymentDateRange.dateFrom && paymentDateRange.dateTo) {
          orderWhere.payment_time = {
            gte: paymentDateRange.dateFrom,
            lte: paymentDateRange.dateTo,
          };
        } else if (paymentDateRange.dateTo) {
          // 历史：只限制结束时间
          orderWhere.payment_time = {
            lte: paymentDateRange.dateTo,
          };
        }

        // 查询所有相关的订单记录
        const orderRecords = await ctx.prisma.orderRecordEntity.findMany({
          where: orderWhere,
          select: {
            work_id: true,
            payment_time: true,
          },
          orderBy: {
            payment_time: 'desc',
          },
        });

        // 构建已付费的作品ID集合和支付时间映射（每个作品取最新的支付时间）
        const paidWorkIds = new Set(
          orderRecords.map(r => r.work_id).filter((id): id is string => !!id)
        );
        const orderTimeMap = new Map<string, Date>();
        for (const record of orderRecords) {
          if (record.work_id && record.payment_time) {
            const existingTime = orderTimeMap.get(record.work_id);
            if (!existingTime || record.payment_time > existingTime) {
              orderTimeMap.set(record.work_id, record.payment_time);
            }
          }
        }

        // 根据支付状态筛选作品ID
        let filteredWorkIds: string[] = [];
        if (is_paid === 'paid') {
          filteredWorkIds = allWorkIds.filter(w => paidWorkIds.has(w));
        } else if (is_paid === 'unpaid') {
          filteredWorkIds = allWorkIds.filter(w => !paidWorkIds.has(w));
        }

        const total = filteredWorkIds.length;

        // 需要先查询所有筛选后的作品，按时间排序，然后分页
        const allFilteredWorks = await ctx.prisma.worksEntity.findMany({
          where: {
            id: { in: filteredWorkIds },
          },
          orderBy: { create_time: 'desc' },
          select: {
            id: true,
            title: true,
            desc: true,
            cover: true,
            uid: true,
            create_time: true,
            update_time: true,
            template_id: true,
            version: true,
            metadata: true,
            appid: true,
          },
        });

        // 在内存中分页
        const paginatedWorks = allFilteredWorks.slice(skip, skip + take);

        // 为每个作品添加支付状态和支付时间
        const worksWithPaymentStatus = paginatedWorks.map(work => ({
          ...work,
          is_paid: paidWorkIds.has(work.id),
          order_time: orderTimeMap.get(work.id) || null,
        }));

        // 为每个作品聚合行为统计数据（来自 works_daily_statistics_entity）
        const workIdsForStats = worksWithPaymentStatus.map(work => work.id);
        let statsMap = new Map<
          string,
          {
            publish_count: number;
            viewer_pv: number;
            viewer_uv: number;
            vip_inter_count: number;
            share_count: number;
          }
        >();

        if (workIdsForStats.length > 0) {
          const statsRows =
            await ctx.prisma.worksDailyStatisticsEntity.findMany({
              where: {
                works_id: { in: workIdsForStats },
              },
              select: {
                works_id: true,
                publish_count: true,
                viewer_pv: true,
                viewer_uv: true,
                vip_inter_count: true,
                share_count: true,
              },
            });

          statsMap = new Map();
          for (const row of statsRows) {
            if (!row.works_id) continue;
            const key = row.works_id;
            const existing = statsMap.get(key) || {
              publish_count: 0,
              viewer_pv: 0,
              viewer_uv: 0,
              vip_inter_count: 0,
              share_count: 0,
            };
            statsMap.set(key, {
              publish_count: existing.publish_count + (row.publish_count || 0),
              viewer_pv: existing.viewer_pv + (row.viewer_pv || 0),
              viewer_uv: existing.viewer_uv + (row.viewer_uv || 0),
              vip_inter_count:
                existing.vip_inter_count + (row.vip_inter_count || 0),
              share_count: existing.share_count + (row.share_count || 0),
            });
          }
        }

        const worksWithStats = worksWithPaymentStatus.map(work => {
          const stat = statsMap.get(work.id);
          return {
            ...work,
            stat_publish_count: stat?.publish_count ?? 0,
            stat_viewer_pv: stat?.viewer_pv ?? 0,
            stat_viewer_uv: stat?.viewer_uv ?? 0,
            stat_vip_inter_count: stat?.vip_inter_count ?? 0,
            stat_share_count: stat?.share_count ?? 0,
          };
        });

        return {
          works: worksWithStats,
          total,
        };
      }

      // 如果不需要按支付状态筛选，仍然需要查询并添加支付状态信息
      const workIds = works.map(w => w.id);

      // 计算支付时间范围
      const paymentDateRange = getPaymentDateRange();

      // 构建订单查询条件
      const orderWhere: any = {
        work_id: { in: workIds },
        deleted: false,
        payment_type: {
          not: '',
        },
      };

      // 添加支付时间筛选
      if (paymentDateRange.dateFrom && paymentDateRange.dateTo) {
        orderWhere.payment_time = {
          gte: paymentDateRange.dateFrom,
          lte: paymentDateRange.dateTo,
        };
      } else if (paymentDateRange.dateTo) {
        // 历史：只限制结束时间
        orderWhere.payment_time = {
          lte: paymentDateRange.dateTo,
        };
      }

      const orderRecords = await ctx.prisma.orderRecordEntity.findMany({
        where: orderWhere,
        select: {
          work_id: true,
          payment_time: true,
        },
        orderBy: {
          payment_time: 'desc',
        },
      });

      const paidWorkIds = new Set(
        orderRecords.map(r => r.work_id).filter((id): id is string => !!id)
      );

      // 构建支付时间映射（每个作品取最新的支付时间）
      const orderTimeMap = new Map<string, Date>();
      for (const record of orderRecords) {
        if (record.work_id && record.payment_time) {
          const existingTime = orderTimeMap.get(record.work_id);
          if (!existingTime || record.payment_time > existingTime) {
            orderTimeMap.set(record.work_id, record.payment_time);
          }
        }
      }

      const worksWithPaymentStatus = works.map(work => ({
        ...work,
        is_paid: paidWorkIds.has(work.id),
        order_time: orderTimeMap.get(work.id) || null,
      }));

      // 为每个作品聚合行为统计数据（来自 works_daily_statistics_entity）
      const workIdsForStats = worksWithPaymentStatus.map(work => work.id);
      let statsMap = new Map<
        string,
        {
          publish_count: number;
          viewer_pv: number;
          viewer_uv: number;
          vip_inter_count: number;
          share_count: number;
        }
      >();

      if (workIdsForStats.length > 0) {
        const statsRows = await ctx.prisma.worksDailyStatisticsEntity.findMany({
          where: {
            works_id: { in: workIdsForStats },
          },
          select: {
            works_id: true,
            publish_count: true,
            viewer_pv: true,
            viewer_uv: true,
            vip_inter_count: true,
            share_count: true,
          },
        });

        statsMap = new Map();
        for (const row of statsRows) {
          if (!row.works_id) continue;
          const key = row.works_id;
          const existing = statsMap.get(key) || {
            publish_count: 0,
            viewer_pv: 0,
            viewer_uv: 0,
            vip_inter_count: 0,
            share_count: 0,
          };
          statsMap.set(key, {
            publish_count: existing.publish_count + (row.publish_count || 0),
            viewer_pv: existing.viewer_pv + (row.viewer_pv || 0),
            viewer_uv: existing.viewer_uv + (row.viewer_uv || 0),
            vip_inter_count:
              existing.vip_inter_count + (row.vip_inter_count || 0),
            share_count: existing.share_count + (row.share_count || 0),
          });
        }
      }

      const worksWithStats = worksWithPaymentStatus.map(work => {
        const stat = statsMap.get(work.id);
        return {
          ...work,
          stat_publish_count: stat?.publish_count ?? 0,
          stat_viewer_pv: stat?.viewer_pv ?? 0,
          stat_viewer_uv: stat?.viewer_uv ?? 0,
          stat_vip_inter_count: stat?.vip_inter_count ?? 0,
          stat_share_count: stat?.share_count ?? 0,
        };
      });

      // 查询总数
      const total = await ctx.prisma.worksEntity.count({
        where,
      });

      return {
        works: worksWithStats,
        total,
      };
    }),

  // 根据用户ID查询作品列表（支持时间和支付状态筛选）
  getWorksByUser: publicProcedure
    .input(
      z.object({
        uid: z.number(), // 用户ID
        time_period: z
          .enum(['today', 'yesterday', 'near7', 'history', 'all'])
          .default('all'), // 时间筛选：今天、昨天、近7天、历史、全部
        is_paid: z.enum(['all', 'paid', 'unpaid']).default('all'), // 支付状态：全部、已付费、未付费
        skip: z.number().optional().default(0),
        take: z.number().optional().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { uid, time_period, is_paid, skip, take } = input;

      // 查询用户信息中间表数据（user_info_entity）
      const userInfo = await ctx.prisma.userInfoEntity.findFirst({
        where: {
          uid,
          deleted: false,
        },
        select: {
          uid: true,
          register_date: true,
          register_device: true,
          register_source: true,
          ad_plan_id: true,
          appid: true,
        },
      });

      // 计算时间范围
      const getDateRange = () => {
        const today = new Date();
        const dateTo = new Date(today);
        dateTo.setHours(23, 59, 59, 999);

        let dateFrom: Date | null = null;

        switch (time_period) {
          case 'today':
            dateFrom = new Date(today);
            dateFrom.setHours(0, 0, 0, 0);
            break;
          case 'yesterday':
            dateFrom = new Date(today);
            dateFrom.setDate(dateFrom.getDate() - 1);
            dateFrom.setHours(0, 0, 0, 0);
            dateTo.setDate(dateTo.getDate() - 1);
            dateTo.setHours(23, 59, 59, 999);
            break;
          case 'near7':
            dateFrom = new Date(today);
            dateFrom.setDate(dateFrom.getDate() - 7);
            dateFrom.setHours(0, 0, 0, 0);
            break;
          case 'history':
            // 历史：不限制开始时间，只限制结束时间为昨天23:59:59
            dateTo.setDate(dateTo.getDate() - 1);
            dateTo.setHours(23, 59, 59, 999);
            break;
          case 'all':
            // 全部：不限制时间范围
            return { dateFrom: null, dateTo: null };
        }

        return { dateFrom, dateTo };
      };

      const { dateFrom, dateTo } = getDateRange();

      // 构建查询条件
      const where: any = {
        uid,
        deleted: false,
      };

      // 时间筛选
      if (dateFrom !== null && dateTo !== null) {
        if (dateFrom) {
          where.create_time = {
            gte: dateFrom,
            lte: dateTo,
          };
        } else {
          // 历史：只限制结束时间
          where.create_time = {
            lte: dateTo,
          };
        }
      }
      // all 情况：不添加时间筛选条件

      // 如果需要按支付状态筛选，先查询所有符合条件的作品ID
      if (is_paid !== 'all') {
        // 先查询所有符合条件的作品ID（不分页）
        const allWorks = await ctx.prisma.worksEntity.findMany({
          where,
          select: {
            id: true,
          },
        });

        const allWorkIds = allWorks.map(w => w.id);

        // 如果没有作品，直接返回
        if (allWorkIds.length === 0) {
          return {
            works: [],
            total: 0,
            userInfo,
          };
        }

        // 查询所有相关的订单记录
        const orderRecords = await ctx.prisma.orderRecordEntity.findMany({
          where: {
            work_id: { in: allWorkIds },
            deleted: false,
            payment_type: {
              not: '', // payment_type 不为空表示已支付
            },
          },
          select: {
            work_id: true,
            payment_time: true,
            order_id: true,
            order_amount: true,
          },
          orderBy: {
            payment_time: 'desc',
          },
        });

        // 按作品汇总付费金额（order_amount单位为分，转换为元）
        const workAmountMap = new Map<string, number>();
        for (const record of orderRecords) {
          if (record.work_id) {
            const amount = record.order_amount ? record.order_amount / 100 : 0;
            workAmountMap.set(
              record.work_id,
              (workAmountMap.get(record.work_id) || 0) + amount
            );
          }
        }

        // 构建已付费的作品ID集合和支付时间映射（每个作品取最新的支付时间）
        const paidWorkIds = new Set(
          orderRecords.map(r => r.work_id).filter((id): id is string => !!id)
        );
        const orderTimeMap = new Map<string, Date>();
        for (const record of orderRecords) {
          if (record.work_id && record.payment_time) {
            const existingTime = orderTimeMap.get(record.work_id);
            if (!existingTime || record.payment_time > existingTime) {
              orderTimeMap.set(record.work_id, record.payment_time);
            }
          }
        }

        // 根据支付状态筛选作品ID
        let filteredWorkIds: string[] = [];
        if (is_paid === 'paid') {
          filteredWorkIds = allWorkIds.filter(w => paidWorkIds.has(w));
        } else if (is_paid === 'unpaid') {
          filteredWorkIds = allWorkIds.filter(w => !paidWorkIds.has(w));
        }

        const total = filteredWorkIds.length;

        // 需要先查询所有筛选后的作品，按时间排序，然后分页
        const allFilteredWorks = await ctx.prisma.worksEntity.findMany({
          where: {
            id: { in: filteredWorkIds },
          },
          orderBy: { create_time: 'desc' },
          select: {
            id: true,
            title: true,
            desc: true,
            cover: true,
            uid: true,
            create_time: true,
            update_time: true,
            template_id: true,
            version: true,
            metadata: true,
            appid: true,
          },
        });

        // 在内存中分页
        const paginatedWorks = allFilteredWorks.slice(skip, skip + take);

        // 为每个作品添加支付状态、支付时间和付费金额
        const worksWithPaymentStatus = paginatedWorks.map(work => ({
          ...work,
          is_paid: paidWorkIds.has(work.id),
          order_time: orderTimeMap.get(work.id) || null,
          payment_amount: workAmountMap.get(work.id) || 0,
        }));

        return {
          works: worksWithPaymentStatus,
          total,
          userInfo,
        };
      }

      // 查询作品
      const works = await ctx.prisma.worksEntity.findMany({
        where,
        skip,
        take,
        orderBy: { create_time: 'desc' },
        select: {
          id: true,
          title: true,
          desc: true,
          cover: true,
          uid: true,
          create_time: true,
          update_time: true,
          template_id: true,
          version: true,
          metadata: true,
          appid: true,
        },
      });

      // 如果不需要按支付状态筛选，仍然需要查询并添加支付状态信息
      const workIds = works.map(w => w.id);
      const orderRecords = await ctx.prisma.orderRecordEntity.findMany({
        where: {
          work_id: { in: workIds },
          deleted: false,
          payment_type: {
            not: '',
          },
        },
        select: {
          work_id: true,
          payment_time: true,
          order_id: true,
          order_amount: true,
        },
        orderBy: {
          payment_time: 'desc',
        },
      });

      // 按作品汇总付费金额（order_amount单位为分，转换为元）
      const workAmountMap = new Map<string, number>();
      for (const record of orderRecords) {
        if (record.work_id) {
          const amount = record.order_amount ? record.order_amount / 100 : 0;
          workAmountMap.set(
            record.work_id,
            (workAmountMap.get(record.work_id) || 0) + amount
          );
        }
      }

      const paidWorkIds = new Set(
        orderRecords.map(r => r.work_id).filter((id): id is string => !!id)
      );

      // 构建支付时间映射（每个作品取最新的支付时间）
      const orderTimeMap = new Map<string, Date>();
      for (const record of orderRecords) {
        if (record.work_id && record.payment_time) {
          const existingTime = orderTimeMap.get(record.work_id);
          if (!existingTime || record.payment_time > existingTime) {
            orderTimeMap.set(record.work_id, record.payment_time);
          }
        }
      }

      const worksWithPaymentStatus = works.map(work => ({
        ...work,
        is_paid: paidWorkIds.has(work.id),
        order_time: orderTimeMap.get(work.id) || null,
        payment_amount: workAmountMap.get(work.id) || 0,
      }));

      // 查询总数
      const total = await ctx.prisma.worksEntity.count({
        where,
      });

      return {
        works: worksWithPaymentStatus,
        total,
        userInfo,
      };
    }),

  // 根据设计师UID查询模板列表（包含统计数据）
  getTemplatesByDesigner: publicProcedure
    .input(
      z.object({
        designer_uid: z.number(), // 设计师UID
        skip: z.number().optional().default(0),
        take: z.number().optional().default(20),
        recent_days: z.number().optional(), // 筛选最近N天内的模板，不传则返回所有
      })
    )
    .query(async ({ ctx, input }) => {
      const { designer_uid, skip, take, recent_days } = input;

      // 构建时间筛选条件
      const timeFilter: any = {};
      if (recent_days) {
        const now = new Date();
        const daysAgo = new Date(now);
        daysAgo.setDate(daysAgo.getDate() - recent_days);
        daysAgo.setHours(0, 0, 0, 0);
        timeFilter.custom_time = {
          gte: daysAgo,
        };
      }

      // 1. 先获取所有模板ID（用于统计和排序）
      const allTemplates = await ctx.prisma.templateEntity.findMany({
        where: {
          designer_uid,
          deleted: false,
          ...timeFilter,
        },
        select: {
          id: true,
        },
      });

      const total = allTemplates.length;

      if (allTemplates.length === 0) {
        return {
          templates: [],
          total: 0,
        };
      }

      const templateIds = allTemplates.map(t => t.id);

      // 2. 获取模板的排序指标（综合分）
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

      const sortMetricsMap = new Map(sortMetrics.map(m => [m.template_id, m]));

      // 3. 计算历史统计数据（所有时间）
      const allTimeStats =
        await ctx.prisma.templateDailyStatisticsEntity.findMany({
          where: {
            template_id: { in: templateIds },
          },
          select: {
            template_id: true,
            order_count: true,
            transaction_amount: true,
            click_pv: true,
            creation_pv: true,
          },
        });

      // 手动聚合历史统计数据
      const allTimeStatsMap = new Map<
        string,
        {
          totalSales: number;
          totalGmv: number;
          totalClicks: number;
          totalCreations: number;
        }
      >();
      for (const stat of allTimeStats) {
        const existing = allTimeStatsMap.get(stat.template_id) || {
          totalSales: 0,
          totalGmv: 0,
          totalClicks: 0,
          totalCreations: 0,
        };
        allTimeStatsMap.set(stat.template_id, {
          totalSales: existing.totalSales + (stat.order_count || 0),
          totalGmv: existing.totalGmv + Number(stat.transaction_amount || 0),
          totalClicks: existing.totalClicks + (stat.click_pv || 0),
          totalCreations: existing.totalCreations + (stat.creation_pv || 0),
        });
      }

      // 4. 计算近30天统计数据
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      const recent30DaysStats =
        await ctx.prisma.templateDailyStatisticsEntity.findMany({
          where: {
            template_id: { in: templateIds },
            date: {
              gte: thirtyDaysAgo,
            },
          },
          select: {
            template_id: true,
            order_count: true,
            transaction_amount: true,
          },
        });

      // 手动聚合近30天统计数据
      const recent30DaysStatsMap = new Map<
        string,
        { sales30d: number; gmv30d: number }
      >();
      for (const stat of recent30DaysStats) {
        const existing = recent30DaysStatsMap.get(stat.template_id) || {
          sales30d: 0,
          gmv30d: 0,
        };
        recent30DaysStatsMap.set(stat.template_id, {
          sales30d: existing.sales30d + (stat.order_count || 0),
          gmv30d: existing.gmv30d + Number(stat.transaction_amount || 0),
        });
      }

      // 5. 获取模板详情（包含 tags）
      const templates = await ctx.prisma.templateEntity.findMany({
        where: {
          id: { in: templateIds },
        },
        select: {
          id: true,
          title: true,
          desc: true,
          coverV3: true,
          create_time: true,
          custom_time: true,
          tags: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      });

      const templatesMap = new Map(templates.map(t => [t.id, t]));

      // 6. 合并数据并按历史销量排序
      const templatesWithStats = templateIds
        .map(templateId => {
          const template = templatesMap.get(templateId);
          if (!template) return null;

          const metrics = sortMetricsMap.get(templateId);
          const allTime = allTimeStatsMap.get(templateId);
          const recent30d = recent30DaysStatsMap.get(templateId);

          // 上架日期：优先使用 publish_time，其次使用 custom_time，最后使用 create_time
          const publishDate =
            metrics?.publish_time ||
            template.custom_time ||
            template.create_time;

          return {
            ...template,
            // 标签名称列表
            tag_names: template.tags.map(t => t.name),
            // 上架日期
            publish_date: publishDate,
            // 综合分
            composite_score: metrics?.composite_score || 0,
            // 历史销量
            total_sales: allTime?.totalSales || 0,
            // 历史GMV
            total_gmv: allTime?.totalGmv || 0,
            // 历史点击量
            total_clicks: allTime?.totalClicks || 0,
            // 历史创作量
            total_creations: allTime?.totalCreations || 0,
            // 近30天销量
            sales_30d: recent30d?.sales30d || 0,
            // 近30天销售额
            gmv_30d: recent30d?.gmv30d || 0,
          };
        })
        .filter((t): t is NonNullable<typeof t> => t !== null)
        .sort((a, b) => (b.total_sales || 0) - (a.total_sales || 0));

      // 7. 分页
      const paginatedTemplates = templatesWithStats.slice(skip, skip + take);

      return {
        templates: paginatedTemplates,
        total,
      };
    }),
});

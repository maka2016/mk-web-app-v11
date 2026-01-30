import { z } from 'zod';
import { publicProcedure, router } from '../trpc';

// 搜索数据 Router
export const adminSearchRouter = router({
  // 获取 MixSearch 按天聚合统计数据（按日期维度汇总所有搜索词）
  getMixSearchDailyStatisticsByDate: publicProcedure
    .input(
      z.object({
        appid: z.enum(['jiantie', 'maka']),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        appid: input.appid,
      };

      if (input.dateFrom || input.dateTo) {
        where.date = {};
        if (input.dateFrom) {
          where.date.gte = new Date(input.dateFrom);
        }
        if (input.dateTo) {
          const dateTo = new Date(input.dateTo);
          dateTo.setHours(23, 59, 59, 999);
          where.date.lte = dateTo;
        }
      }

      const statistics =
        await ctx.prisma.mixSearchDailyStatisticsEntity.findMany({
          where,
          orderBy: {
            date: 'asc',
          },
        });

      // 按日期聚合（因为一条记录是按搜索词 + 日期唯一）
      const aggregatedMap = new Map<
        string,
        {
          date: string;
          search_pv: number;
          search_uv: number;
          click_pv: number;
          click_uv: number;
          old_click_pv: number;
          old_click_uv: number;
          creation_pv: number;
          creation_uv: number;
          vip_intercept_pv: number;
          vip_intercept_uv: number;
          success_pv: number;
          success_uv: number;
          result_count_sum: number;
          old_result_count_sum: number;
          term_count: number;
        }
      >();

      for (const stat of statistics) {
        const dateKey = stat.date.toISOString().split('T')[0];
        if (!aggregatedMap.has(dateKey)) {
          aggregatedMap.set(dateKey, {
            date: dateKey,
            search_pv: 0,
            search_uv: 0,
            click_pv: 0,
            click_uv: 0,
            old_click_pv: 0,
            old_click_uv: 0,
            creation_pv: 0,
            creation_uv: 0,
            vip_intercept_pv: 0,
            vip_intercept_uv: 0,
            success_pv: 0,
            success_uv: 0,
            result_count_sum: 0,
            old_result_count_sum: 0,
            term_count: 0,
          });
        }

        const aggregated = aggregatedMap.get(dateKey)!;
        aggregated.search_pv += stat.search_pv;
        aggregated.search_uv += stat.search_uv;
        aggregated.click_pv += stat.click_pv;
        aggregated.click_uv += stat.click_uv;
        aggregated.old_click_pv += stat.old_click_pv;
        aggregated.old_click_uv += stat.old_click_uv;
        aggregated.creation_pv += stat.creation_pv;
        aggregated.creation_uv += stat.creation_uv;
        aggregated.vip_intercept_pv += stat.vip_intercept_pv;
        aggregated.vip_intercept_uv += stat.vip_intercept_uv;
        aggregated.success_pv += stat.success_pv;
        aggregated.success_uv += stat.success_uv;
        aggregated.result_count_sum += stat.result_count;
        aggregated.old_result_count_sum += stat.old_result_count;
        aggregated.term_count += 1;
      }

      const result = Array.from(aggregatedMap.values()).map(item => ({
        date: item.date,
        search_pv: item.search_pv,
        search_uv: item.search_uv,
        click_pv: item.click_pv,
        click_uv: item.click_uv,
        old_click_pv: item.old_click_pv,
        old_click_uv: item.old_click_uv,
        creation_pv: item.creation_pv,
        creation_uv: item.creation_uv,
        vip_intercept_pv: item.vip_intercept_pv,
        vip_intercept_uv: item.vip_intercept_uv,
        success_pv: item.success_pv,
        success_uv: item.success_uv,
        // 平均搜索结果数量
        result_count:
          item.term_count > 0
            ? Math.round(item.result_count_sum / item.term_count)
            : 0,
        old_result_count:
          item.term_count > 0
            ? Math.round(item.old_result_count_sum / item.term_count)
            : 0,
      }));

      // 按日期升序
      result.sort((a, b) => (a.date > b.date ? 1 : -1));

      return result;
    }),

  // 获取 MixSearch 汇总统计（选定日期范围内）
  getMixSearchDailyStatisticsSummary: publicProcedure
    .input(
      z.object({
        appid: z.enum(['jiantie', 'maka']),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        appid: input.appid,
      };

      if (input.dateFrom || input.dateTo) {
        where.date = {};
        if (input.dateFrom) {
          // 前端会传入带时间的 UTC ISO 字符串，这里直接用作下界
          where.date.gte = new Date(input.dateFrom);
        }
        if (input.dateTo) {
          // 如果是仅日期字符串（兼容老调用），补齐到当天 23:59:59.999；否则直接使用传入时间
          const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(input.dateTo);
          const dateTo = new Date(input.dateTo);

          where.date.lt = dateTo;
        }
      }

      const statistics =
        await ctx.prisma.mixSearchDailyStatisticsEntity.findMany({
          where,
        });

      if (statistics.length === 0) {
        return {
          search_pv: 0,
          search_uv: 0,
          click_pv: 0,
          click_uv: 0,
          old_click_pv: 0,
          old_click_uv: 0,
          creation_pv: 0,
          creation_uv: 0,
          vip_intercept_pv: 0,
          vip_intercept_uv: 0,
          success_pv: 0,
          success_uv: 0,
          result_count: 0,
          old_result_count: 0,
        };
      }

      let search_pv = 0;
      let search_uv = 0;
      let click_pv = 0;
      let click_uv = 0;
      let old_click_pv = 0;
      let old_click_uv = 0;
      let creation_pv = 0;
      let creation_uv = 0;
      let vip_intercept_pv = 0;
      let vip_intercept_uv = 0;
      let success_pv = 0;
      let success_uv = 0;
      let result_count_sum = 0;
      let old_result_count_sum = 0;

      for (const stat of statistics) {
        search_pv += stat.search_pv;
        search_uv += stat.search_uv;
        click_pv += stat.click_pv;
        click_uv += stat.click_uv;
        old_click_pv += stat.old_click_pv;
        old_click_uv += stat.old_click_uv;
        creation_pv += stat.creation_pv;
        creation_uv += stat.creation_uv;
        vip_intercept_pv += stat.vip_intercept_pv;
        vip_intercept_uv += stat.vip_intercept_uv;
        success_pv += stat.success_pv;
        success_uv += stat.success_uv;
        result_count_sum += stat.result_count;
        old_result_count_sum += stat.old_result_count;
      }

      const count = statistics.length;

      return {
        search_pv,
        search_uv,
        click_pv,
        click_uv,
        old_click_pv,
        old_click_uv,
        creation_pv,
        creation_uv,
        vip_intercept_pv,
        vip_intercept_uv,
        success_pv,
        success_uv,
        result_count: count > 0 ? Math.round(result_count_sum / count) : 0,
        old_result_count:
          count > 0 ? Math.round(old_result_count_sum / count) : 0,
      };
    }),

  // 获取 MixSearch 按搜索词聚合统计数据（在指定日期范围内，把所有天的数据按搜索词汇总）
  getMixSearchStatisticsByTerm: publicProcedure
    .input(
      z.object({
        appid: z.enum(['jiantie', 'maka']),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        appid: input.appid,
      };

      if (input.dateFrom || input.dateTo) {
        where.date = {};
        if (input.dateFrom) {
          where.date.gte = new Date(input.dateFrom);
        }
        if (input.dateTo) {
          const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(input.dateTo);
          const dateTo = new Date(input.dateTo);
          if (isDateOnly) {
            dateTo.setHours(23, 59, 59, 999);
          }
          where.date.lt = dateTo;
        }
      }

      const statistics =
        await ctx.prisma.mixSearchDailyStatisticsEntity.findMany({
          where,
        });

      const aggregatedMap = new Map<
        string,
        {
          search_term: string;
          search_pv: number;
          search_uv: number;
          click_pv: number;
          click_uv: number;
          old_click_pv: number;
          old_click_uv: number;
          creation_pv: number;
          creation_uv: number;
          vip_intercept_pv: number;
          vip_intercept_uv: number;
          success_pv: number;
          success_uv: number;
          result_count_sum: number;
          old_result_count_sum: number;
          day_count: number;
        }
      >();

      for (const stat of statistics) {
        const key = stat.search_term;
        if (!aggregatedMap.has(key)) {
          aggregatedMap.set(key, {
            search_term: stat.search_term,
            search_pv: 0,
            search_uv: 0,
            click_pv: 0,
            click_uv: 0,
            old_click_pv: 0,
            old_click_uv: 0,
            creation_pv: 0,
            creation_uv: 0,
            vip_intercept_pv: 0,
            vip_intercept_uv: 0,
            success_pv: 0,
            success_uv: 0,
            result_count_sum: 0,
            old_result_count_sum: 0,
            day_count: 0,
          });
        }

        const aggregated = aggregatedMap.get(key)!;
        aggregated.search_pv += stat.search_pv;
        aggregated.search_uv += stat.search_uv;
        aggregated.click_pv += stat.click_pv;
        aggregated.click_uv += stat.click_uv;
        aggregated.old_click_pv += stat.old_click_pv;
        aggregated.old_click_uv += stat.old_click_uv;
        aggregated.creation_pv += stat.creation_pv;
        aggregated.creation_uv += stat.creation_uv;
        aggregated.vip_intercept_pv += stat.vip_intercept_pv;
        aggregated.vip_intercept_uv += stat.vip_intercept_uv;
        aggregated.success_pv += stat.success_pv;
        aggregated.success_uv += stat.success_uv;
        aggregated.result_count_sum += stat.result_count;
        aggregated.old_result_count_sum += stat.old_result_count;
        aggregated.day_count += 1;
      }

      const result = Array.from(aggregatedMap.values()).map(item => ({
        search_term: item.search_term,
        search_pv: item.search_pv,
        search_uv: item.search_uv,
        click_pv: item.click_pv,
        click_uv: item.click_uv,
        old_click_pv: item.old_click_pv,
        old_click_uv: item.old_click_uv,
        creation_pv: item.creation_pv,
        creation_uv: item.creation_uv,
        vip_intercept_pv: item.vip_intercept_pv,
        vip_intercept_uv: item.vip_intercept_uv,
        success_pv: item.success_pv,
        success_uv: item.success_uv,
        result_count:
          item.day_count > 0
            ? Math.round(item.result_count_sum / item.day_count)
            : 0,
        old_result_count:
          item.day_count > 0
            ? Math.round(item.old_result_count_sum / item.day_count)
            : 0,
      }));

      // 默认按搜索量 PV 降序
      result.sort((a, b) => b.search_pv - a.search_pv);

      return result;
    }),

  // 获取搜索词统计数据
  getSearchTermStatistics: publicProcedure
    .input(
      z.object({
        appid: z.enum(['jiantie', 'maka']), // 必填
        dateFrom: z.string().optional(), // 日期范围开始 (YYYY-MM-DD)
        dateTo: z.string().optional(), // 日期范围结束 (YYYY-MM-DD)
        searchTerm: z.string().optional(), // 搜索词关键词搜索
        sortBy: z
          .enum([
            'search_pv',
            'search_uv',
            'click_pv',
            'click_uv',
            'creation_pv',
            'creation_uv',
            'order_count',
            'transaction_amount',
          ])
          .optional()
          .default('search_pv'), // 排序字段
        sortOrder: z.enum(['asc', 'desc']).optional().default('desc'), // 排序方向
      })
    )
    .query(async ({ ctx, input }) => {
      // 构建查询条件
      const where: any = {
        appid: input.appid,
      };

      // 日期范围筛选
      if (input.dateFrom || input.dateTo) {
        where.date = {};
        if (input.dateFrom) {
          where.date.gte = new Date(input.dateFrom);
        }
        if (input.dateTo) {
          const dateTo = new Date(input.dateTo);
          dateTo.setHours(23, 59, 59, 999);
          where.date.lte = dateTo;
        }
      }

      // 搜索词关键词搜索
      if (input.searchTerm && input.searchTerm.trim()) {
        where.search_term = {
          contains: input.searchTerm.trim(),
        };
      }

      // 构建排序
      const orderBy: any = {};
      orderBy[input.sortBy] = input.sortOrder;

      // 查询统计数据
      const statistics =
        await ctx.prisma.searchTermDailyStatisticsEntity.findMany({
          where,
          orderBy,
        });

      // 如果指定了日期范围，需要按搜索词聚合
      if (input.dateFrom || input.dateTo) {
        const aggregatedMap = new Map<
          string,
          {
            appid: string;
            search_term: string;
            search_pv: number;
            search_uv: number;
            click_pv: number;
            click_uv: number;
            creation_pv: number;
            creation_uv: number;
            vip_intercept_pv: number;
            vip_intercept_uv: number;
            success_pv: number;
            success_uv: number;
            order_count: number;
            transaction_amount: number;
            result_count: number;
          }
        >();

        for (const stat of statistics) {
          const key = stat.search_term;
          if (!aggregatedMap.has(key)) {
            aggregatedMap.set(key, {
              appid: stat.appid,
              search_term: stat.search_term,
              search_pv: 0,
              search_uv: 0,
              click_pv: 0,
              click_uv: 0,
              creation_pv: 0,
              creation_uv: 0,
              vip_intercept_pv: 0,
              vip_intercept_uv: 0,
              success_pv: 0,
              success_uv: 0,
              order_count: 0,
              transaction_amount: 0,
              result_count: 0,
            });
          }

          const aggregated = aggregatedMap.get(key)!;
          aggregated.search_pv += stat.search_pv;
          aggregated.search_uv += stat.search_uv;
          aggregated.click_pv += stat.click_pv;
          aggregated.click_uv += stat.click_uv;
          aggregated.creation_pv += stat.creation_pv;
          aggregated.creation_uv += stat.creation_uv;
          aggregated.vip_intercept_pv += stat.vip_intercept_pv;
          aggregated.vip_intercept_uv += stat.vip_intercept_uv;
          aggregated.success_pv += stat.success_pv;
          aggregated.success_uv += stat.success_uv;
          aggregated.order_count += stat.order_count;
          aggregated.transaction_amount += Number(stat.transaction_amount);
          // result_count 取平均值
          aggregated.result_count = Math.round(
            (aggregated.result_count + stat.result_count) / 2
          );
        }

        // 转换为数组并排序
        let result = Array.from(aggregatedMap.values());
        result.sort((a, b) => {
          const aVal = a[input.sortBy as keyof typeof a] as number;
          const bVal = b[input.sortBy as keyof typeof b] as number;
          return input.sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
        });

        return result;
      }

      // 如果没有日期范围，直接返回（按日期倒序）
      return statistics.map(stat => ({
        appid: stat.appid,
        search_term: stat.search_term,
        search_pv: stat.search_pv,
        search_uv: stat.search_uv,
        click_pv: stat.click_pv,
        click_uv: stat.click_uv,
        creation_pv: stat.creation_pv,
        creation_uv: stat.creation_uv,
        vip_intercept_pv: stat.vip_intercept_pv,
        vip_intercept_uv: stat.vip_intercept_uv,
        success_pv: stat.success_pv,
        success_uv: stat.success_uv,
        order_count: stat.order_count,
        transaction_amount: Number(stat.transaction_amount),
        result_count: stat.result_count,
      }));
    }),

  // 获取搜索词统计汇总
  getSearchTermStatisticsSummary: publicProcedure
    .input(
      z.object({
        appid: z.enum(['jiantie', 'maka']), // 必填
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        searchTerm: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        appid: input.appid,
      };

      if (input.dateFrom || input.dateTo) {
        where.date = {};
        if (input.dateFrom) {
          where.date.gte = new Date(input.dateFrom);
        }
        if (input.dateTo) {
          const dateTo = new Date(input.dateTo);
          dateTo.setHours(23, 59, 59, 999);
          where.date.lte = dateTo;
        }
      }

      if (input.searchTerm && input.searchTerm.trim()) {
        where.search_term = {
          contains: input.searchTerm.trim(),
        };
      }

      const statistics =
        await ctx.prisma.searchTermDailyStatisticsEntity.findMany({
          where,
        });

      // 按搜索词聚合
      const aggregatedMap = new Map<
        string,
        {
          search_pv: number;
          search_uv: Set<number>;
          click_pv: number;
          click_uv: Set<number>;
          creation_pv: number;
          creation_uv: Set<number>;
          vip_intercept_pv: number;
          vip_intercept_uv: Set<number>;
          success_pv: number;
          success_uv: Set<number>;
          order_count: number;
          transaction_amount: number;
        }
      >();

      for (const stat of statistics) {
        const key = stat.search_term;
        if (!aggregatedMap.has(key)) {
          aggregatedMap.set(key, {
            search_pv: 0,
            search_uv: new Set(),
            click_pv: 0,
            click_uv: new Set(),
            creation_pv: 0,
            creation_uv: new Set(),
            vip_intercept_pv: 0,
            vip_intercept_uv: new Set(),
            success_pv: 0,
            success_uv: new Set(),
            order_count: 0,
            transaction_amount: 0,
          });
        }

        const aggregated = aggregatedMap.get(key)!;
        aggregated.search_pv += stat.search_pv;
        aggregated.search_uv.add(stat.search_uv); // 使用Set去重，但这里UV已经是聚合后的值
        aggregated.click_pv += stat.click_pv;
        aggregated.click_uv.add(stat.click_uv);
        aggregated.creation_pv += stat.creation_pv;
        aggregated.creation_uv.add(stat.creation_uv);
        aggregated.vip_intercept_pv += stat.vip_intercept_pv;
        aggregated.vip_intercept_uv.add(stat.vip_intercept_uv);
        aggregated.success_pv += stat.success_pv;
        aggregated.success_uv.add(stat.success_uv);
        aggregated.order_count += stat.order_count;
        aggregated.transaction_amount += Number(stat.transaction_amount);
      }

      // 计算汇总
      // 注意：UV由于已经是按日聚合的去重值，无法精确汇总，这里使用所有记录中的最大UV值作为近似值
      const summary = {
        search_pv: 0,
        search_uv: 0,
        click_pv: 0,
        click_uv: 0,
        creation_pv: 0,
        creation_uv: 0,
        vip_intercept_pv: 0,
        vip_intercept_uv: 0,
        success_pv: 0,
        success_uv: 0,
        order_count: 0,
        transaction_amount: 0,
      };

      // 累加PV和订单数据
      for (const stat of statistics) {
        summary.search_pv += stat.search_pv;
        summary.click_pv += stat.click_pv;
        summary.creation_pv += stat.creation_pv;
        summary.vip_intercept_pv += stat.vip_intercept_pv;
        summary.success_pv += stat.success_pv;
        summary.order_count += stat.order_count;
        summary.transaction_amount += Number(stat.transaction_amount);
      }

      // UV取所有记录中的最大值（因为无法精确去重，使用最大值作为近似值）
      const allSearchUvs = statistics.map(s => s.search_uv);
      const allClickUvs = statistics.map(s => s.click_uv);
      const allCreationUvs = statistics.map(s => s.creation_uv);
      const allVipInterceptUvs = statistics.map(s => s.vip_intercept_uv);
      const allSuccessUvs = statistics.map(s => s.success_uv);

      return {
        search_pv: summary.search_pv,
        search_uv: allSearchUvs.length > 0 ? Math.max(...allSearchUvs) : 0,
        click_pv: summary.click_pv,
        click_uv: allClickUvs.length > 0 ? Math.max(...allClickUvs) : 0,
        creation_pv: summary.creation_pv,
        creation_uv:
          allCreationUvs.length > 0 ? Math.max(...allCreationUvs) : 0,
        vip_intercept_pv: summary.vip_intercept_pv,
        vip_intercept_uv:
          allVipInterceptUvs.length > 0 ? Math.max(...allVipInterceptUvs) : 0,
        success_pv: summary.success_pv,
        success_uv: allSuccessUvs.length > 0 ? Math.max(...allSuccessUvs) : 0,
        order_count: summary.order_count,
        transaction_amount: summary.transaction_amount,
      };
    }),
});

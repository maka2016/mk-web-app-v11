import mysql from 'mysql2/promise';
import { z } from 'zod';
import { publicProcedure, router } from '../trpc';

// BI 行为日志库（MySQL）连接池
const biPool = mysql.createPool({
  host: 'am-2zeo48x814d64lo93167330.ads.aliyuncs.com',
  user: 'report_api',
  password: 'j3E4h6NWBQ5U-',
  database: 'mk_datawork',
});

/**
 * 老maka搜索数据 Router
 * searchword 是搜索词，如果没有，则用 ref_page_id
 */
export const oldMakaSearchRouter = router({
  // 获取老maka搜索词统计数据
  getOldMakaSearchStatistics: publicProcedure
    .input(
      z.object({
        dateFrom: z.string().optional(), // 日期范围开始 (YYYY-MM-DD)
        dateTo: z.string().optional(), // 日期范围结束 (YYYY-MM-DD)
        searchTerm: z.string().optional(), // 搜索词关键词搜索
        platform: z.string().optional(), // 设备筛选（可选）
      })
    )
    .query(async ({ input }) => {
      const { dateFrom, dateTo, searchTerm, platform } = input;

      // 构建时间范围
      let startTime: Date;
      let endTime: Date;

      if (dateFrom && dateTo) {
        startTime = new Date(dateFrom);
        startTime.setHours(0, 0, 0, 0);
        endTime = new Date(dateTo);
        endTime.setHours(23, 59, 59, 999);
      } else {
        // 默认今天
        const today = new Date();
        startTime = new Date(today);
        startTime.setHours(0, 0, 0, 0);
        endTime = new Date(today);
        endTime.setHours(23, 59, 59, 999);
      }

      // 查询条件：
      // event_type = 'page_view'
      // page_type = 'search_page'
      // searchword 是搜索词，如果没有，则用 ref_page_id
      // platform 作为筛选条件（可选）
      let querySql = `
        SELECT
          ref_page_id,
          platform,
          distinct_id,
          searchword,
          event_time
        FROM mk_datawork_sls_events
        WHERE event_type = 'page_view'
          AND page_type = 'search_page'
          AND (
            (searchword IS NOT NULL AND searchword != '' AND searchword != 'undefined')
            OR (
              (searchword IS NULL OR searchword = '' OR searchword = 'undefined')
              AND ref_page_id IS NOT NULL
              AND ref_page_id != ''
              AND ref_page_id != 'undefined'
              AND ref_page_id NOT IN ('works', 'vip_page_from_my_space', 'vip_page_from_tab')
            )
          )
          AND event_time >= ?
          AND event_time <= ?
      `;

      const queryParams: (Date | string)[] = [startTime, endTime];

      // 如果指定了设备筛选，添加platform条件
      if (platform) {
        querySql += ` AND LOWER(platform) = ?`;
        queryParams.push(platform.toLowerCase());
      }

      querySql += ` ORDER BY event_time DESC`;

      const [rows] = (await biPool.execute(
        querySql,
        queryParams
      )) as unknown as [
        Array<{
          ref_page_id: string | null;
          platform: string;
          distinct_id: string;
          searchword: string | null;
          event_time: Date;
        }>,
      ];

      // 使用searchword作为搜索词，如果没有则用ref_page_id，并聚合统计（不按platform分组）
      const statsMap = new Map<
        string,
        {
          search_term: string;
          pv: number;
          uv: Set<string>;
        }
      >(); // key: search_term

      for (const row of rows) {
        // 优先使用 searchword，如果没有则使用 ref_page_id
        const searchTermValue = String(
          row.searchword &&
            row.searchword.trim() &&
            row.searchword !== 'undefined'
            ? row.searchword
            : row.ref_page_id || ''
        ).trim();
        if (
          !searchTermValue ||
          searchTermValue.length === 0 ||
          searchTermValue.length > 200
        ) {
          continue;
        }

        // 如果指定了搜索词过滤，则进行过滤
        if (
          searchTerm &&
          !searchTermValue.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          continue;
        }

        const key = searchTermValue;

        if (!statsMap.has(key)) {
          statsMap.set(key, {
            search_term: searchTermValue,
            pv: 0,
            uv: new Set(),
          });
        }

        const stats = statsMap.get(key)!;
        stats.pv++;
        if (row.distinct_id) {
          stats.uv.add(row.distinct_id);
        }
      }

      // 转换为数组格式（不包含platform字段）
      const result = Array.from(statsMap.values()).map(stats => ({
        search_term: stats.search_term,
        pv: stats.pv,
        uv: stats.uv.size,
      }));

      // 按搜索用户量（UV）降序排序
      result.sort((a, b) => b.uv - a.uv);

      return result;
    }),

  // 获取老maka搜索统计汇总
  getOldMakaSearchStatisticsSummary: publicProcedure
    .input(
      z.object({
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        searchTerm: z.string().optional(),
        platform: z.string().optional(), // 设备筛选（可选）
      })
    )
    .query(async ({ input }) => {
      const { dateFrom, dateTo, searchTerm, platform } = input;

      // 构建时间范围
      let startTime: Date;
      let endTime: Date;

      if (dateFrom && dateTo) {
        startTime = new Date(dateFrom);
        startTime.setHours(0, 0, 0, 0);
        endTime = new Date(dateTo);
        endTime.setHours(23, 59, 59, 999);
      } else {
        const today = new Date();
        startTime = new Date(today);
        startTime.setHours(0, 0, 0, 0);
        endTime = new Date(today);
        endTime.setHours(23, 59, 59, 999);
      }

      let querySql = `
        SELECT
          ref_page_id,
          platform,
          distinct_id,
          searchword
        FROM mk_datawork_sls_events
        WHERE event_type = 'page_view'
          AND page_id = 'search_page'
          AND (
            (searchword IS NOT NULL AND searchword != '' AND searchword != 'undefined')
            OR (
              (searchword IS NULL OR searchword = '' OR searchword = 'undefined')
              AND ref_page_id IS NOT NULL
              AND ref_page_id != ''
              AND ref_page_id != 'undefined'
              AND ref_page_id NOT IN ('works', 'vip_page_from_my_space', 'vip_page_from_tab')
            )
          )
          AND event_time >= ?
          AND event_time <= ?
      `;

      const queryParams: (Date | string)[] = [startTime, endTime];

      // 如果指定了设备筛选，添加platform条件
      if (platform) {
        querySql += ` AND LOWER(platform) = ?`;
        queryParams.push(platform.toLowerCase());
      }

      const [rows] = (await biPool.execute(
        querySql,
        queryParams
      )) as unknown as [
        Array<{
          ref_page_id: string | null;
          platform: string;
          distinct_id: string;
          searchword: string | null;
        }>,
      ];

      // 汇总统计
      let totalPv = 0;
      const totalUv = new Set<string>();
      const platformStats = new Map<string, { pv: number; uv: Set<string> }>();

      for (const row of rows) {
        // 优先使用 searchword，如果没有则使用 ref_page_id
        const searchTermValue = String(
          row.searchword &&
            row.searchword.trim() &&
            row.searchword !== 'undefined'
            ? row.searchword
            : row.ref_page_id || ''
        ).trim();
        if (
          !searchTermValue ||
          searchTermValue.length === 0 ||
          searchTermValue.length > 200
        ) {
          continue;
        }

        // 如果指定了搜索词过滤，则进行过滤
        if (
          searchTerm &&
          !searchTermValue.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          continue;
        }

        const platform = (row.platform || 'unknown').toLowerCase();
        totalPv++;

        if (row.distinct_id) {
          totalUv.add(row.distinct_id);
        }

        if (!platformStats.has(platform)) {
          platformStats.set(platform, { pv: 0, uv: new Set() });
        }
        const platformStat = platformStats.get(platform)!;
        platformStat.pv++;
        if (row.distinct_id) {
          platformStat.uv.add(row.distinct_id);
        }
      }

      return {
        total_pv: totalPv,
        total_uv: totalUv.size,
        platform_stats: Array.from(platformStats.entries()).map(
          ([platform, stats]) => ({
            platform,
            pv: stats.pv,
            uv: stats.uv.size,
          })
        ),
      };
    }),
});

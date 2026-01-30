// MixSearchDailyStatisticsEntity 日统计脚本
// 按日统计 Mix 搜索页（search_page_mix）下新旧模板的搜索、点击、创作、拦截和成功等数据指标
//
// 口径说明（维度：appid + search_term + date）：
// 1）搜索PV/UV + 新旧结果数：
//   - 来源：mk_datawork_sls_events
//   - 条件：appid IN ('jiantie', 'maka'), event_type = 'page_view', page_type = 'search_page_mix'
//   - 维度：appid, searchword 作为 search_term
//   - 指标：
//       search_pv: COUNT(*)
//       search_uv: COUNT(DISTINCT distinct_id)
//       result_count: AVG(new_template_count) 四舍五入
//       old_result_count: AVG(old_template_count) 四舍五入
//
// 2）新模板点击PV/UV（click_pv/click_uv）：
//   - 来源：mk_datawork_sls_events
//   - 条件：appid IN ('jiantie', 'maka'),
//           event_type = 'page_view',
//           page_type = 'template_page',
//           ref_page_type = 'search_page_mix'
//   - 维度：appid, search_term（优先 searchword，其次 ref_page_id）
//   - 指标：
//       click_pv: COUNT(*)
//       click_uv: COUNT(DISTINCT distinct_id)
//
// 3）新模板创作PV/UV（creation_pv/creation_uv）：
//   - 来源：works_entity
//   - 条件：deleted = false,
//           create_time 在当天,
//           uid NOT IN innerUids,
//           metadata 非空,
//           metadata.ref_page_type = 'search_page_mix',
//           metadata.ref_page_id 为搜索词
//   - 维度：appid, search_term = metadata.ref_page_id
//   - 指标：
//       creation_pv: 作品数
//       creation_uv: 去重 uid 数
//
// 4）新模板 VIP 拦截 / 成功（vip_intercept_pv/uv、success_pv/uv）：
//   - 复用 data-query 里的规则：
//       vip 拦截：page_type = 'vip_intercept_page' AND page_id = 'vip_intercept_page'
//                 OR object_type = 'vip_intercept_pay'
//       成功（publish/share）：editor_publish_btn / work_share_btn
//   - 这里需要限定搜索来源：ref_page_type = 'search_page_mix'，
//     并通过 searchword 或 ref_page_id 识别 search_term。
//
// 5）老模板点击PV/UV（old_click_pv/old_click_uv）：
//   - 来源：mk_datawork_sls_events
//   - 条件：appid IN ('jiantie', 'maka'),
//           event_type = 'page_view',
//           page_type = 'template_page',
//           ref_page_type = 'search_page_mix',
//           object_type = 'template'  // 老模板
//   - 维度：appid, search_term（优先 searchword，其次 ref_page_id）
//   - 指标：
//       old_click_pv: COUNT(*)
//       old_click_uv: COUNT(DISTINCT distinct_id)
//
// 注意：
// - page_type 一定是 search_page_mix
// - 新模板埋点 object_type='template_item'，老模板埋点 object_type='template'

//old_template_count和new_template_count在param字典里，要解析
//{"distinctid":"mk_dst_17658798632992121ke37hl3nbc21ajj2n9m4f26nk707","env":"prod","event_time_str":"2025-12-16 18:12:40","hotword_floor_word_btn":"商务邀请函","new_template_count":"0","old_template_count":"597","traceid":"mk_t_176587986329921e7m841cjk2bh29ghjka2eng20a773a"}

import { Prisma } from '@mk/jiantie/v11-database/generated/client/client';
import { queryOrdersByDateRange } from '../../service/data-query';
import {
  closeAllConnections,
  getBiAdb,
  getPrisma,
} from '../../service/db-connections';
import {
  getEndOfDay,
  getStartOfDay,
  parseDate,
  parseWorksIdFromTraceMetadata,
  parseWorksIdFromUrl,
  toDateString,
} from '../../utils/utils';
import { innerUids } from './innerUids';

// 获取数据库连接
const prisma = getPrisma();
const biAdb = getBiAdb();

/**
 * Mix 搜索统计数据接口
 */
interface MixSearchStats {
  appid: string;
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
  new_order_count: number;
  new_transaction_amount: number;
  result_count: number;
  old_result_count: number;
}

/**
 * 统计 MixSearchDailyStatisticsEntity 日数据
 */
async function statMixSearchDaily(targetDate?: string) {
  const date = parseDate(targetDate);
  const startTime = getStartOfDay(date);
  const endTime = getEndOfDay(date);
  const dateStr = toDateString(date);

  console.log(`开始统计 Mix 搜索词数据，日期: ${dateStr}`);
  console.log(
    `时间范围: ${startTime.toISOString()} ~ ${endTime.toISOString()}`
  );

  // 1. 搜索 PV/UV + 新旧结果数量
  const searchEvents = await biAdb('mk_datawork_sls_events')
    .whereIn('appid', ['jiantie', 'maka'])
    .where({
      event_type: 'page_view',
      page_type: 'search_page_mix',
    })
    .whereNotIn('uid', innerUids)
    .whereBetween('event_time', [startTime, endTime])
    .whereNotNull('searchword')
    .where('searchword', '!=', '')
    .select('appid', 'searchword', 'distinct_id', 'param');

  const searchStatsMap = new Map<
    string,
    {
      appid: string;
      search_term: string;
      search_pv: number;
      search_uv: Set<string>;
      new_result_counts: number[];
      old_result_counts: number[];
    }
  >(); // key: appid_search_term

  for (const row of searchEvents as any[]) {
    const appid = row.appid;
    const searchTerm = String(row.searchword || '').trim();
    if (!searchTerm || searchTerm.length > 200) continue;

    const key = `${appid}_${searchTerm}`;
    if (!searchStatsMap.has(key)) {
      searchStatsMap.set(key, {
        appid,
        search_term: searchTerm,
        search_pv: 0,
        search_uv: new Set(),
        new_result_counts: [],
        old_result_counts: [],
      });
    }

    const stats = searchStatsMap.get(key)!;
    stats.search_pv++;
    if (row.distinct_id) {
      stats.search_uv.add(String(row.distinct_id));
    }

    // 从 param 字段解析 new_template_count 和 old_template_count
    let paramObj: any = null;
    if (row.param) {
      if (typeof row.param === 'string') {
        try {
          paramObj = JSON.parse(row.param);
        } catch (error) {
          // param 解析失败，跳过
        }
      } else if (typeof row.param === 'object') {
        paramObj = row.param;
      }
    }

    if (paramObj) {
      const newCount = Number(paramObj.new_template_count);
      if (!Number.isNaN(newCount) && newCount >= 0) {
        stats.new_result_counts.push(newCount);
      }
      const oldCount = Number(paramObj.old_template_count);
      if (!Number.isNaN(oldCount) && oldCount >= 0) {
        stats.old_result_counts.push(oldCount);
      }
    }
  }

  // 转为数组并计算 UV 和结果数均值
  const searchStatsAll = Array.from(searchStatsMap.values()).map(stats => {
    const avgNew =
      stats.new_result_counts.length > 0
        ? Math.round(
            stats.new_result_counts.reduce((sum, v) => sum + v, 0) /
              stats.new_result_counts.length
          )
        : 0;
    const avgOld =
      stats.old_result_counts.length > 0
        ? Math.round(
            stats.old_result_counts.reduce((sum, v) => sum + v, 0) /
              stats.old_result_counts.length
          )
        : 0;

    return {
      appid: stats.appid,
      search_term: stats.search_term,
      search_pv: stats.search_pv,
      search_uv: stats.search_uv.size,
      result_count: avgNew,
      old_result_count: avgOld,
    };
  });

  // 2. 新模板点击 PV/UV（从模板页回流到 Mix 搜索页）
  const newClickEvents = await biAdb('mk_datawork_sls_events')
    .whereIn('appid', ['jiantie', 'maka'])
    .where({
      event_type: 'click',
      object_type: 'template_item',
      page_type: 'search_page_mix',
    })
    .whereNotIn('uid', innerUids)
    .whereBetween('event_time', [startTime, endTime])
    .select('appid', 'searchword', 'ref_page_id', 'distinct_id');

  const newClickStatsMap = new Map<
    string,
    {
      appid: string;
      search_term: string;
      click_pv: number;
      click_uv: Set<string>;
    }
  >(); // key: appid_search_term

  for (const row of newClickEvents as any[]) {
    const appid = row.appid;
    // 优先 searchword，其次 ref_page_id
    const searchTermRaw =
      row.searchword && String(row.searchword).trim()
        ? String(row.searchword).trim()
        : String(row.ref_page_id || '').trim();
    const searchTerm = searchTermRaw;
    if (!searchTerm || searchTerm.length > 200) continue;

    const key = `${appid}_${searchTerm}`;
    if (!newClickStatsMap.has(key)) {
      newClickStatsMap.set(key, {
        appid,
        search_term: searchTerm,
        click_pv: 0,
        click_uv: new Set(),
      });
    }

    const stats = newClickStatsMap.get(key)!;
    stats.click_pv++;
    if (row.distinct_id) {
      stats.click_uv.add(String(row.distinct_id));
    }
  }

  // 3. 老模板点击 PV/UV（object_type = 'template'）
  const oldClickEvents = await biAdb('mk_datawork_sls_events')
    .whereIn('appid', ['jiantie', 'maka'])
    .where({
      event_type: 'click',
      page_type: 'search_page_mix',
      object_type: 'template',
    })
    .whereNotIn('uid', innerUids)
    .whereBetween('event_time', [startTime, endTime])
    .select('appid', 'searchword', 'ref_page_id', 'distinct_id');

  const oldClickStatsMap = new Map<
    string,
    {
      appid: string;
      search_term: string;
      old_click_pv: number;
      old_click_uv: Set<string>;
    }
  >(); // key: appid_search_term

  for (const row of oldClickEvents as any[]) {
    const appid = row.appid;
    const searchTermRaw =
      row.searchword && String(row.searchword).trim()
        ? String(row.searchword).trim()
        : String(row.ref_page_id || '').trim();
    const searchTerm = searchTermRaw;
    if (!searchTerm || searchTerm.length > 200) continue;

    const key = `${appid}_${searchTerm}`;
    if (!oldClickStatsMap.has(key)) {
      oldClickStatsMap.set(key, {
        appid,
        search_term: searchTerm,
        old_click_pv: 0,
        old_click_uv: new Set(),
      });
    }

    const stats = oldClickStatsMap.get(key)!;
    stats.old_click_pv++;
    if (row.distinct_id) {
      stats.old_click_uv.add(String(row.distinct_id));
    }
  }

  // 4. 新模板创作 PV/UV（从 works_entity 反查）
  const works = await prisma.worksEntity.findMany({
    where: {
      deleted: false,
      create_time: {
        gte: startTime,
        lte: endTime,
      },
      uid: {
        notIn: innerUids,
      },
      metadata: {
        not: Prisma.JsonNull,
      },
    },
    select: {
      id: true,
      uid: true,
      appid: true,
      metadata: true,
    },
  });

  const creationStatsMap = new Map<
    string,
    {
      appid: string;
      search_term: string;
      creation_pv: number;
      creation_uv: Set<number>;
    }
  >(); // key: appid_search_term

  for (const work of works) {
    if (!work.metadata || typeof work.metadata !== 'object') continue;
    const meta = work.metadata as any;
    if (
      meta.ref_page_type === 'search_page_mix' &&
      meta.ref_page_id &&
      typeof meta.ref_page_id === 'string'
    ) {
      const searchTerm = meta.ref_page_id.trim();
      if (!searchTerm || searchTerm.length > 200) continue;

      const appid = work.appid || 'jiantie';
      const key = `${appid}_${searchTerm}`;

      if (!creationStatsMap.has(key)) {
        creationStatsMap.set(key, {
          appid,
          search_term: searchTerm,
          creation_pv: 0,
          creation_uv: new Set<number>(),
        });
      }

      const stats = creationStatsMap.get(key)!;
      stats.creation_pv++;
      stats.creation_uv.add(work.uid);
    }
  }

  // 5. 订单数据：仅统计新模样（works.metadata.ref_page_type = 'search_page_mix'）
  const ordersAll = await queryOrdersByDateRange(startTime, endTime);

  const orderWorksIdMap = new Map<string, string>(); // order_no -> works_id
  const worksIdsFromOrdersAll = new Set<string>();

  for (const order of ordersAll as any[]) {
    const worksId = parseWorksIdFromTraceMetadata(order.trace_metadata);
    if (worksId) {
      worksIdsFromOrdersAll.add(worksId);
      orderWorksIdMap.set(order.order_no, worksId);
    }
  }

  const orderWorksAll =
    worksIdsFromOrdersAll.size > 0
      ? await prisma.worksEntity.findMany({
          where: {
            id: {
              in: Array.from(worksIdsFromOrdersAll),
            },
            uid: {
              notIn: innerUids,
            },
            deleted: false,
            metadata: {
              not: Prisma.JsonNull,
            },
          },
          select: {
            id: true,
            appid: true,
            metadata: true,
          },
        })
      : [];

  const workIdToSearchTerm = new Map<
    string,
    { appid: string; search_term: string }
  >();

  for (const work of orderWorksAll) {
    if (!work.metadata || typeof work.metadata !== 'object') continue;
    const meta = work.metadata as any;
    if (
      meta.ref_page_type === 'search_page_mix' &&
      meta.ref_page_id &&
      typeof meta.ref_page_id === 'string'
    ) {
      const searchTerm = meta.ref_page_id.trim();
      if (!searchTerm || searchTerm.length > 200) continue;
      const appid = work.appid || 'jiantie';
      workIdToSearchTerm.set(work.id, { appid, search_term: searchTerm });
    }
  }

  const orderStatsMap = new Map<
    string,
    {
      new_order_count: number;
      new_transaction_amount: number;
    }
  >(); // key: appid_search_term

  for (const order of ordersAll as any[]) {
    const worksId = orderWorksIdMap.get(order.order_no);
    if (!worksId) continue;
    const info = workIdToSearchTerm.get(worksId);
    if (!info) continue;

    const key = `${info.appid}_${info.search_term}`;
    if (!orderStatsMap.has(key)) {
      orderStatsMap.set(key, {
        new_order_count: 0,
        new_transaction_amount: 0,
      });
    }

    const stats = orderStatsMap.get(key)!;
    stats.new_order_count++;
    stats.new_transaction_amount += Number(order.amount) || 0;
  }

  // 6. VIP 拦截 PV/UV（仅统计搜索来源）
  // 注意：拦截事件没有 ref_page_type 字段，需要从 url 解析作品 id，再从作品 metadata 关联搜索词
  const vipInterceptEvents = await biAdb('mk_datawork_sls_events')
    .whereIn('appid', ['jiantie', 'maka'])
    .whereNotIn('uid', innerUids)
    .whereBetween('event_time', [startTime, endTime])
    .where(function () {
      this.where({
        page_type: 'vip_intercept_page',
        page_id: 'vip_intercept_page',
      })
        .orWhere({
          object_type: 'vip_intercept_pay',
        })
        // 兼容 maka 新版付费弹窗
        .orWhere({
          page_type: 'vip_intercept_page_v2024q2',
          event_type: 'page_view',
        });
    })
    .select('appid', 'distinct_id', 'url');

  console.log('vipInterceptEvents', vipInterceptEvents.length);

  // 从所有拦截事件的 url 解析出作品 id
  const worksIdsToLookup = new Set<string>();
  for (const row of vipInterceptEvents as any[]) {
    const worksId = parseWorksIdFromUrl(row.url);
    if (worksId) {
      worksIdsToLookup.add(worksId);
    }
  }

  // 批量查询 works.metadata 获取 search_term
  const worksIdToSearchTermMap = new Map<
    string,
    { appid: string; search_term: string }
  >();
  if (worksIdsToLookup.size > 0) {
    const lookupWorks = await prisma.worksEntity.findMany({
      where: {
        id: {
          in: Array.from(worksIdsToLookup),
        },
        deleted: false,
        metadata: {
          not: Prisma.JsonNull,
        },
      },
      select: {
        id: true,
        appid: true,
        metadata: true,
      },
    });

    for (const work of lookupWorks) {
      if (!work.metadata || typeof work.metadata !== 'object') continue;
      const meta = work.metadata as any;
      if (
        meta.ref_page_type === 'search_page_mix' &&
        meta.ref_page_id &&
        typeof meta.ref_page_id === 'string'
      ) {
        const searchTerm = meta.ref_page_id.trim();
        if (searchTerm && searchTerm.length > 0 && searchTerm.length <= 200) {
          const appid = work.appid || 'jiantie';
          worksIdToSearchTermMap.set(work.id, {
            appid,
            search_term: searchTerm,
          });
        }
      }
    }
  }

  const vipInterceptStatsMap = new Map<
    string,
    {
      appid: string;
      search_term: string;
      vip_intercept_pv: number;
      vip_intercept_uv: Set<string>;
    }
  >(); // key: appid_search_term

  for (const row of vipInterceptEvents as any[]) {
    // 从 url 解析作品 id，再从 works.metadata 获取搜索词
    const worksId = parseWorksIdFromUrl(row.url);
    if (!worksId) continue;

    const cached = worksIdToSearchTermMap.get(worksId);
    if (!cached) continue; // 只统计搜索来源的作品（metadata.ref_page_type = 'search_page_mix'）

    const { appid, search_term: searchTerm } = cached;
    if (!searchTerm || searchTerm.length === 0 || searchTerm.length > 200) {
      continue;
    }

    const key = `${appid}_${searchTerm}`;
    if (!vipInterceptStatsMap.has(key)) {
      vipInterceptStatsMap.set(key, {
        appid,
        search_term: searchTerm,
        vip_intercept_pv: 0,
        vip_intercept_uv: new Set(),
      });
    }

    const stats = vipInterceptStatsMap.get(key)!;
    stats.vip_intercept_pv++;
    if (row.distinct_id) {
      stats.vip_intercept_uv.add(String(row.distinct_id));
    }
  }

  // 7. 汇总所有出现过的 (appid, search_term)
  const allKeysMap = new Map<string, { appid: string; search_term: string }>();

  const collectKeys = (appid: string, searchTerm: string) => {
    const key = `${appid}_${searchTerm}`;
    if (!allKeysMap.has(key)) {
      allKeysMap.set(key, { appid, search_term: searchTerm });
    }
  };

  for (const row of searchStatsAll) {
    collectKeys(row.appid, row.search_term);
  }
  for (const stats of newClickStatsMap.values()) {
    collectKeys(stats.appid, stats.search_term);
  }
  for (const stats of oldClickStatsMap.values()) {
    collectKeys(stats.appid, stats.search_term);
  }
  for (const stats of creationStatsMap.values()) {
    collectKeys(stats.appid, stats.search_term);
  }
  for (const [key, orderStats] of orderStatsMap.entries()) {
    const [appid, ...rest] = key.split('_');
    const search_term = rest.join('_');
    if (appid && search_term) {
      collectKeys(appid, search_term);
    }
  }
  for (const stats of vipInterceptStatsMap.values()) {
    collectKeys(stats.appid, stats.search_term);
  }

  if (allKeysMap.size === 0) {
    console.log('当日没有 Mix 搜索相关数据，结束。');
    return;
  }

  // 8. 构建最终统计结果
  const finalStatsMap = new Map<string, MixSearchStats>(); // key: appid_search_term

  const ensureEntry = (appid: string, searchTerm: string): MixSearchStats => {
    const key = `${appid}_${searchTerm}`;
    if (!finalStatsMap.has(key)) {
      finalStatsMap.set(key, {
        appid,
        search_term: searchTerm,
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
        new_order_count: 0,
        new_transaction_amount: 0,
        result_count: 0,
        old_result_count: 0,
      });
    }
    return finalStatsMap.get(key)!;
  };

  // 合并搜索数据
  for (const row of searchStatsAll as any[]) {
    const entry = ensureEntry(row.appid, row.search_term);
    entry.search_pv = Number(row.search_pv) || 0;
    entry.search_uv = Number(row.search_uv) || 0;
    entry.result_count = Number(row.result_count) || 0;
    entry.old_result_count = Number(row.old_result_count) || 0;
  }

  // 合并新模板点击
  for (const stats of newClickStatsMap.values()) {
    const entry = ensureEntry(stats.appid, stats.search_term);
    entry.click_pv = Number(stats.click_pv) || 0;
    entry.click_uv = stats.click_uv.size;
  }

  // 合并老模板点击
  for (const stats of oldClickStatsMap.values()) {
    const entry = ensureEntry(stats.appid, stats.search_term);
    entry.old_click_pv = Number(stats.old_click_pv) || 0;
    entry.old_click_uv = stats.old_click_uv.size;
  }

  // 合并创作数据
  for (const stats of creationStatsMap.values()) {
    const entry = ensureEntry(stats.appid, stats.search_term);
    entry.creation_pv = Number(stats.creation_pv) || 0;
    entry.creation_uv = stats.creation_uv.size;
  }

  // 合并订单数据（仅新模样）
  for (const [key, stats] of orderStatsMap.entries()) {
    const [appid, ...rest] = key.split('_');
    const search_term = rest.join('_');
    if (!appid || !search_term) continue;
    const entry = ensureEntry(appid, search_term);
    entry.new_order_count = Number(stats.new_order_count) || 0;
    entry.new_transaction_amount = Number(stats.new_transaction_amount) || 0;
  }

  // 合并 VIP 拦截数据
  for (const stats of vipInterceptStatsMap.values()) {
    const entry = ensureEntry(stats.appid, stats.search_term);
    entry.vip_intercept_pv = Number(stats.vip_intercept_pv) || 0;
    entry.vip_intercept_uv = stats.vip_intercept_uv.size;
  }

  // 9. 写入 MixSearchDailyStatisticsEntity（按唯一键 appid + search_term + date upsert）
  const statDate = new Date(date);
  statDate.setHours(0, 0, 0, 0);

  let successCount = 0;
  let errorCount = 0;

  for (const stats of finalStatsMap.values()) {
    try {
      await prisma.mixSearchDailyStatisticsEntity.upsert({
        where: {
          appid_search_term_date: {
            appid: stats.appid,
            search_term: stats.search_term,
            date: statDate,
          },
        },
        create: {
          appid: stats.appid,
          search_term: stats.search_term,
          date: statDate,
          search_pv: stats.search_pv,
          search_uv: stats.search_uv,
          click_pv: stats.click_pv,
          click_uv: stats.click_uv,
          old_click_pv: stats.old_click_pv,
          old_click_uv: stats.old_click_uv,
          creation_pv: stats.creation_pv,
          creation_uv: stats.creation_uv,
          vip_intercept_pv: stats.vip_intercept_pv,
          vip_intercept_uv: stats.vip_intercept_uv,
          success_pv: stats.success_pv,
          success_uv: stats.success_uv,
          new_order_count: stats.new_order_count,
          new_transaction_amount: stats.new_transaction_amount,
          result_count: stats.result_count,
          old_result_count: stats.old_result_count,
        },
        update: {
          search_pv: stats.search_pv,
          search_uv: stats.search_uv,
          click_pv: stats.click_pv,
          click_uv: stats.click_uv,
          old_click_pv: stats.old_click_pv,
          old_click_uv: stats.old_click_uv,
          creation_pv: stats.creation_pv,
          creation_uv: stats.creation_uv,
          vip_intercept_pv: stats.vip_intercept_pv,
          vip_intercept_uv: stats.vip_intercept_uv,
          success_pv: stats.success_pv,
          success_uv: stats.success_uv,
          new_order_count: stats.new_order_count,
          new_transaction_amount: stats.new_transaction_amount,
          result_count: stats.result_count,
          old_result_count: stats.old_result_count,
        },
      });
      successCount++;
    } catch (error) {
      // 失败时只记日志，不中断整体任务
      console.error(
        `写入 MixSearchDailyStatisticsEntity 失败 appid=${stats.appid}, search_term=${stats.search_term}`,
        error
      );
      errorCount++;
    }
  }

  console.log(
    `Mix 搜索词统计完成，成功写入 ${successCount} 条记录，失败 ${errorCount} 条记录。`
  );
}

// 脚本入口
async function main() {
  try {
    const targetDate = process.argv[2]; // 可选参数：YYYY-MM-DD

    if (!targetDate) {
      // 如果没有提供日期，只处理今天
      await statMixSearchDaily();
      return;
    }

    // 从 targetDate 开始，每天调用函数，直到今天
    const startDate = parseDate(targetDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);

    console.log(
      `开始批量处理，从 ${toDateString(startDate)} 到 ${toDateString(today)}`
    );

    while (currentDate <= today) {
      const dateStr = toDateString(currentDate);
      console.log(`\n========== 处理日期: ${dateStr} ==========`);

      try {
        await statMixSearchDaily(dateStr);
      } catch (error) {
        console.error(`处理日期 ${dateStr} 时出错：`, error);
        // 继续处理下一天，不中断整个流程
      }

      // 日期加一天
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(
      `\n批量处理完成，从 ${toDateString(startDate)} 到 ${toDateString(today)}`
    );
  } catch (error) {
    console.error('统计 Mix 搜索词数据出错：', error);
  } finally {
    await closeAllConnections();
  }
}

// 仅在直接执行该文件时运行（被导入时不执行）
if (require.main === module) {
  main();
}

export { statMixSearchDaily };

//MixSearchDailyStatisticsEntity
//page_type一定要是search_page_mix
//注意区分新老模板，object_type='template'为老模板，tempalte_item为新

//下面数据只记录新模板的
// click_pv    Int      @default(0) @map("click_pv") /// 点击PV（点击搜索结果次数）
// click_uv    Int      @default(0) @map("click_uv") /// 点击UV（点击搜索结果用户数）

// /// 创作数据
// creation_pv      Int @default(0) @map("creation_pv") /// 创作PV（基于搜索结果创建作品次数）
// creation_uv      Int @default(0) @map("creation_uv") /// 创作UV（基于搜索结果创建作品用户数）
// /// 拦截数据
// vip_intercept_pv Int @default(0) @map("vip_intercept_pv") /// VIP拦截PV
// vip_intercept_uv Int @default(0) @map("vip_intercept_uv") /// VIP拦截UV
// /// 成功数据
// success_pv       Int @default(0) @map("success_pv") /// 成功PV,h5为分享，海报为导出
// success_uv       Int @default(0) @map("success_uv") /// 成功UV,h5为分享，海报为导出

// 这些是老模板的
//  old_click_pv     Int @default(0) @map("old_click_pv") /// 旧版点击PV（点击搜索结果次数）
//old_click_uv     Int @default(0) @map("old_click_uv") /// 旧版点击UV（点击搜索结果用户数）

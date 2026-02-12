// 搜索词模板点击统计表（日dws）
// 按日统计每个搜索词下每个模板的展示、点击、创作数据

//数据说明
//展示PV/UV：从biAdb的mk_datawork_sls_events读取，appid IN ('jiantie', 'maka'), event_type='show', object_type='template_item', object_id是模板ID, page_type='search_v2_page', page_id是搜索词
//点击PV/UV：从biAdb的mk_datawork_sls_events读取，appid IN ('jiantie', 'maka'), event_type='page_view', page_type='template_page', page_id是模板ID, ref_page_type='search_v2_page', ref_page_id是搜索词
//创作PV/UV：从works_entity读取，template_id是模板ID, metadata中的ref_page_type='search_v2_page', ref_page_id是搜索词

import { Prisma } from '@mk/jiantie/v11-database/generated/client/client';
import { getEndOfDay, getStartOfDay, parseDate } from '../../utils/utils';
import {
  closeAllConnections,
  getBiAdb,
  getPrisma,
} from '../../service/db-connections';
import { innerUids } from './innerUids';

// 获取数据库连接
const prisma = getPrisma();
const biAdb = getBiAdb();

/**
 * 搜索词模板统计数据接口
 */
interface SearchTermTemplateStats {
  appid: string;
  search_term: string;
  template_id: string;
  show_pv: number;
  show_uv: number;
  click_pv: number;
  click_uv: number;
  creation_pv: number;
  creation_uv: number;
}

/**
 * 统计搜索词模板日数据
 */
async function statSearchTermTemplateDaily(targetDate?: string) {
  const date = parseDate(targetDate);
  const startTime = getStartOfDay(date);
  const endTime = getEndOfDay(date);
  const dateStr = date.toISOString().split('T')[0];

  console.log(`开始统计搜索词模板数据，日期: ${dateStr}`);
  console.log(
    `时间范围: ${startTime.toISOString()} ~ ${endTime.toISOString()}`
  );

  // 1. 查询展示数据（show_pv/show_uv）
  const showEvents = await biAdb('mk_datawork_sls_events')
    .whereIn('appid', ['jiantie', 'maka'])
    .where({
      event_type: 'show',
      object_type: 'template_item',
      page_type: 'search_v2_page',
    })
    .whereNotIn('uid', innerUids)
    .whereNotNull('object_id')
    .where('object_id', '!=', '')
    .whereNotNull('page_id')
    .where('page_id', '!=', '')
    .whereBetween('event_time', [startTime, endTime])
    .select(
      'appid',
      'object_id as template_id',
      'page_id as search_term',
      'distinct_id'
    );

  // 聚合展示数据
  const showStatsMap = new Map<
    string,
    {
      appid: string;
      search_term: string;
      template_id: string;
      show_pv: number;
      show_uv: Set<string>;
    }
  >(); // key: appid_search_term_template_id

  for (const row of showEvents as any[]) {
    const appid = row.appid;
    const searchTerm = String(row.search_term || '').trim();
    const templateId = String(row.template_id || '').trim();

    // 过滤空搜索词和超长搜索词（>200字符）
    if (!searchTerm || searchTerm.length > 200) continue;
    if (!templateId) continue;

    const key = `${appid}_${searchTerm}_${templateId}`;

    if (!showStatsMap.has(key)) {
      showStatsMap.set(key, {
        appid,
        search_term: searchTerm,
        template_id: templateId,
        show_pv: 0,
        show_uv: new Set(),
      });
    }

    const stats = showStatsMap.get(key)!;
    stats.show_pv++;

    // 处理 distinct_id（用于计算UV）
    if (row.distinct_id) {
      stats.show_uv.add(String(row.distinct_id));
    }
  }

  // 2. 查询点击数据（click_pv/click_uv）
  const clickEvents = await biAdb('mk_datawork_sls_events')
    .whereIn('appid', ['jiantie', 'maka'])
    .where({
      event_type: 'page_view',
      page_type: 'template_page',
      ref_page_type: 'search_v2_page',
    })
    .whereNotIn('uid', innerUids)
    .whereNotNull('page_id')
    .where('page_id', '!=', '')
    .whereNotNull('ref_page_id')
    .where('ref_page_id', '!=', '')
    .whereBetween('event_time', [startTime, endTime])
    .select(
      'appid',
      'page_id as template_id',
      'ref_page_id as search_term',
      'distinct_id'
    );

  // 聚合点击数据
  const clickStatsMap = new Map<
    string,
    {
      appid: string;
      search_term: string;
      template_id: string;
      click_pv: number;
      click_uv: Set<string>;
    }
  >(); // key: appid_search_term_template_id

  for (const row of clickEvents as any[]) {
    const appid = row.appid;
    const searchTerm = String(row.search_term || '').trim();
    const templateId = String(row.template_id || '').trim();

    // 过滤空搜索词和超长搜索词（>200字符）
    if (!searchTerm || searchTerm.length > 200) continue;
    if (!templateId) continue;

    const key = `${appid}_${searchTerm}_${templateId}`;

    if (!clickStatsMap.has(key)) {
      clickStatsMap.set(key, {
        appid,
        search_term: searchTerm,
        template_id: templateId,
        click_pv: 0,
        click_uv: new Set(),
      });
    }

    const stats = clickStatsMap.get(key)!;
    stats.click_pv++;

    // 处理 distinct_id（用于计算UV）
    if (row.distinct_id) {
      stats.click_uv.add(String(row.distinct_id));
    }
  }

  // 3. 查询创作数据（creation_pv/creation_uv）
  // 先查询所有符合条件的作品
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
      template_id: {
        not: null,
      },
    },
    select: {
      id: true,
      uid: true,
      appid: true,
      template_id: true,
      metadata: true,
    },
  });

  // 在内存中过滤和聚合创作数据
  const creationStatsMap = new Map<
    string,
    {
      appid: string;
      search_term: string;
      template_id: string;
      creation_pv: number;
      creation_uv: Set<number>;
    }
  >(); // key: appid_search_term_template_id

  for (const work of works) {
    if (!work.metadata || typeof work.metadata !== 'object') continue;
    if (!work.template_id) continue;

    const meta = work.metadata as any;
    if (
      meta.ref_page_type === 'search_v2_page' &&
      meta.ref_page_id &&
      typeof meta.ref_page_id === 'string'
    ) {
      const searchTerm = meta.ref_page_id.trim();
      const templateId = work.template_id;

      // 过滤空字符串和超长搜索词
      if (!searchTerm || searchTerm.length > 200) continue;

      const appid = work.appid || 'jiantie'; // 默认使用jiantie
      const key = `${appid}_${searchTerm}_${templateId}`;

      if (!creationStatsMap.has(key)) {
        creationStatsMap.set(key, {
          appid,
          search_term: searchTerm,
          template_id: templateId,
          creation_pv: 0,
          creation_uv: new Set(),
        });
      }

      const stats = creationStatsMap.get(key)!;
      stats.creation_pv++;
      stats.creation_uv.add(work.uid);
    }
  }

  // 4. 合并所有数据源，构建最终的统计数据
  const finalStatsMap = new Map<string, SearchTermTemplateStats>(); // key: appid_search_term_template_id

  // 合并展示数据
  for (const [key, stats] of showStatsMap.entries()) {
    if (!finalStatsMap.has(key)) {
      finalStatsMap.set(key, {
        appid: stats.appid,
        search_term: stats.search_term,
        template_id: stats.template_id,
        show_pv: 0,
        show_uv: 0,
        click_pv: 0,
        click_uv: 0,
        creation_pv: 0,
        creation_uv: 0,
      });
    }
    const finalStats = finalStatsMap.get(key)!;
    finalStats.show_pv = stats.show_pv;
    finalStats.show_uv = stats.show_uv.size;
  }

  // 合并点击数据
  for (const [key, stats] of clickStatsMap.entries()) {
    if (!finalStatsMap.has(key)) {
      finalStatsMap.set(key, {
        appid: stats.appid,
        search_term: stats.search_term,
        template_id: stats.template_id,
        show_pv: 0,
        show_uv: 0,
        click_pv: 0,
        click_uv: 0,
        creation_pv: 0,
        creation_uv: 0,
      });
    }
    const finalStats = finalStatsMap.get(key)!;
    finalStats.click_pv = stats.click_pv;
    finalStats.click_uv = stats.click_uv.size;
  }

  // 合并创作数据
  for (const [key, stats] of creationStatsMap.entries()) {
    if (!finalStatsMap.has(key)) {
      finalStatsMap.set(key, {
        appid: stats.appid,
        search_term: stats.search_term,
        template_id: stats.template_id,
        show_pv: 0,
        show_uv: 0,
        click_pv: 0,
        click_uv: 0,
        creation_pv: 0,
        creation_uv: 0,
      });
    }
    const finalStats = finalStatsMap.get(key)!;
    finalStats.creation_pv = stats.creation_pv;
    finalStats.creation_uv = stats.creation_uv.size;
  }

  // 5. 查询现有记录
  const statDate = new Date(dateStr);
  const existingRecords =
    await prisma.searchTermTemplateClickDailyStatisticsEntity.findMany({
      where: {
        date: statDate,
      },
      select: {
        id: true,
        appid: true,
        search_term: true,
        template_id: true,
      },
    });

  const existingRecordMap = new Map<string, string>(); // key: appid_search_term_template_id, value: id
  for (const record of existingRecords) {
    const key = `${record.appid}_${record.search_term}_${record.template_id}`;
    existingRecordMap.set(key, record.id);
  }

  // 6. 批量写入或更新数据
  let successCount = 0;
  let errorCount = 0;

  const createRecords: any[] = [];
  const updateRecords: any[] = [];

  for (const stats of finalStatsMap.values()) {
    try {
      const key = `${stats.appid}_${stats.search_term}_${stats.template_id}`;
      const existingId = existingRecordMap.get(key);

      const recordData = {
        appid: stats.appid,
        search_term: stats.search_term,
        template_id: stats.template_id,
        date: statDate,
        show_pv: stats.show_pv,
        show_uv: stats.show_uv,
        click_pv: stats.click_pv,
        click_uv: stats.click_uv,
        creation_pv: stats.creation_pv,
        creation_uv: stats.creation_uv,
      };

      if (existingId) {
        // 如果已存在，准备更新
        updateRecords.push({
          id: existingId,
          data: {
            ...recordData,
            update_time: new Date(),
          },
        });
      } else {
        // 如果不存在，准备创建
        createRecords.push(recordData);
      }
    } catch (error) {
      console.error(
        `搜索词模板 ${stats.appid}_${stats.search_term}_${stats.template_id} 处理失败:`,
        error
      );
      errorCount++;
    }
  }

  // 批量创建新记录
  if (createRecords.length > 0) {
    try {
      await prisma.searchTermTemplateClickDailyStatisticsEntity.createMany({
        data: createRecords,
      });
      successCount += createRecords.length;
      console.log(`批量创建 ${createRecords.length} 条记录`);
    } catch (error) {
      console.error('批量创建失败:', error);
      errorCount += createRecords.length;
    }
  }

  // 批量更新现有记录
  for (const { id, data } of updateRecords) {
    try {
      await prisma.searchTermTemplateClickDailyStatisticsEntity.update({
        where: { id },
        data,
      });
      successCount++;
    } catch (error) {
      console.error(`更新记录 ${id} 失败:`, error);
      errorCount++;
    }
  }

  console.log(`\n统计完成！`);
  console.log(`成功: ${successCount} 条记录`);
  console.log(`失败: ${errorCount} 条记录`);
  console.log(`统计了 ${finalStatsMap.size} 个搜索词-模板组合`);
}

// 主函数
async function main() {
  try {
    // 从命令行参数获取日期，默认今天
    const dateArg = process.argv[2];
    await statSearchTermTemplateDaily(dateArg);
    process.exit(0);
  } catch (error) {
    console.error('执行失败:', error);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await closeAllConnections();
  }
}

// 如果直接运行此文件，执行主函数
if (require.main === module) {
  main();
}

export { statSearchTermTemplateDaily };

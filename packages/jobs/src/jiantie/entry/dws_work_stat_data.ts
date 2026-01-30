// 同步每日作品的行为数据到 WorksDailyStatisticsEntity
// 从 biAdb 的 mk_datawork_sls_events 读取以下数据
// 1) 导出次数 publish_count：
//    event_type: "click", object_type: "editor_publish_btn", ref_page_id 为作品 id
// 2) viewer_pv / viewer_uv：
//    page_type: "viewer", event_type: "page_view", page_id 为作品 id，uv 根据 distinct_id 去重
// 3) vip_inter_count：vip 拦截量 pv
//    (page_type = 'vip_intercept_page' AND page_id = 'vip_intercept_page') OR object_type = 'vip_intercept_pay'
//    作品 id 要从 url 中解析：https://www.jiantieapp.com/mobile/editor?works_id=42WTZ4LK_605502921&uid=605502921&is_full_screen=1&popEnable=0&appid=jiantie
// 4) share_count：
//    event_type: "click", object_type: "work_share_btn", object_id 为作品 id

import {
  getEndOfDay,
  getStartOfDay,
  parseDate,
  parseWorksIdFromUrl,
  toDateString,
} from '../../utils/utils';
import { closeAllConnections, getBiAdb, getPrisma } from '../../service/db-connections';
import {
  aggregateVipInterceptByWorks,
  queryVipInterceptEvents,
} from '../../service/data-query';

// 获取数据库连接
const prisma = getPrisma();
const biAdb = getBiAdb();

/**
 * 统计某一天的作品行为数据
 * @param targetDate YYYY-MM-DD
 */
async function statWorksDaily(targetDate?: string) {
  const date = parseDate(targetDate);
  const startTime = getStartOfDay(date);
  const endTime = getEndOfDay(date);
  const dateStr = toDateString(date);

  console.log(`开始统计作品行为数据，日期: ${dateStr}`);
  console.log(
    `时间范围: ${startTime.toISOString()} ~ ${endTime.toISOString()}`
  );

  // 1. 导出次数 publish_count（按作品维度）
  const publishStats = await biAdb('mk_datawork_sls_events')
    .whereIn('appid', ['jiantie', 'maka'])
    .where({
      event_type: 'click',
      object_type: 'editor_publish_btn',
    })
    .whereNotIn('uid', innerUids)
    .whereBetween('event_time', [startTime, endTime])
    .whereNotNull('ref_page_id')
    .select('ref_page_id as works_id', biAdb.raw('COUNT(*) as publish_count'))
    .groupBy('ref_page_id');

  // 2. 查看数据 viewer_pv / viewer_uv（按作品维度）
  const viewerStats = await biAdb('mk_datawork_sls_events')
    .whereIn('appid', ['jiantie', 'maka'])
    .where({
      event_type: 'page_view',
      page_type: 'viewer',
    })
    .whereNotIn('uid', innerUids)
    .whereBetween('event_time', [startTime, endTime])
    .whereNotNull('page_id')
    .select(
      'page_id as works_id',
      biAdb.raw('COUNT(*) as pv'),
      biAdb.raw('COUNT(DISTINCT distinct_id) as uv')
    )
    .groupBy('page_id');

  //如果是maka，vip的拦截事件可能是event_type=page_view,page_type = vip_intercept_page_v2024q2，works_id从url解析：https://maka.im/mk-web-store-v7/mobile/paymentpopup?share_panel_title=&up_to_vip_btn_text=%E5%8D%87%E7%BA%A7%E4%BC%9A%E5%91%98%E8%8E%B7%E5%8F%96%E9%95%BF%E6%9C%9F%E9%93%BE%E6%8E%A5&share_with_wm_btn_text=%E5%8F%91%E5%B8%83%E4%B8%B4%E6%97%B6%E9%93%BE%E6%8E%A5&showPosterWatermark=0&works_id=VUGK90R9_601734138&works_type=h5&hideExport=0&is_full_screen=1&isStatusBarHidden=1&parent_page_type=works&ref_page_id=works&uid=601734138

  // 3. vip 拦截量 vip_inter_count（按作品维度）
  const vipEvents = await queryVipInterceptEvents(startTime, endTime, {
    selectFields: ['url', 'distinct_id'],
  });

  const vipStatsMap = aggregateVipInterceptByWorks(vipEvents);

  // 4. 分享次数 share_count（按作品维度）
  const shareStats = await biAdb('mk_datawork_sls_events')
    .whereIn('appid', ['jiantie', 'maka'])
    .where({
      event_type: 'click',
      object_type: 'work_share_btn',
    })
    .whereNotIn('uid', innerUids)
    .whereBetween('event_time', [startTime, endTime])
    .whereNotNull('object_id')
    .select('object_id as works_id', biAdb.raw('COUNT(*) as share_count'))
    .groupBy('object_id');

  // 5. 汇总所有出现过的作品 ID
  const worksIdSet = new Set<string>();
  publishStats.forEach((row: any) => {
    if (row.works_id) worksIdSet.add(String(row.works_id));
  });
  viewerStats.forEach((row: any) => {
    if (row.works_id) worksIdSet.add(String(row.works_id));
  });
  vipStatsMap.forEach((_value, worksId) => {
    worksIdSet.add(worksId);
  });
  shareStats.forEach((row: any) => {
    if (row.works_id) worksIdSet.add(String(row.works_id));
  });

  if (worksIdSet.size === 0) {
    console.log('当日没有作品行为数据，结束。');
    return;
  }

  // 6. 验证作品是否存在（过滤无效 works_id）
  // 注意：一次性 IN 太多 id 会导致数据库/Prisma 参数数量超限，这里按批次查询
  const allWorksIds = Array.from(worksIdSet);
  const BATCH_SIZE = 1000;
  const works: { id: string }[] = [];

  for (let i = 0; i < allWorksIds.length; i += BATCH_SIZE) {
    const batchIds = allWorksIds.slice(i, i + BATCH_SIZE);
    const batchWorks = await prisma.worksEntity.findMany({
      where: {
        id: {
          in: batchIds,
        },
        deleted: false,
      },
      select: {
        id: true,
      },
    });
    works.push(...batchWorks);
  }

  const validWorksIdSet = new Set(works.map(w => w.id));

  console.log(
    `共发现 ${worksIdSet.size} 个作品ID，其中有效作品ID ${validWorksIdSet.size} 个`
  );

  const statDate = new Date(date);
  statDate.setHours(0, 0, 0, 0);

  let successCount = 0;
  let errorCount = 0;

  // 7. 构建查询索引用于快速取数
  const publishMap = new Map<string, number>();
  for (const row of publishStats as any[]) {
    if (!row.works_id) continue;
    publishMap.set(String(row.works_id), Number(row.publish_count) || 0);
  }

  const viewerMap = new Map<
    string,
    {
      pv: number;
      uv: number;
    }
  >();
  for (const row of viewerStats as any[]) {
    if (!row.works_id) continue;
    viewerMap.set(String(row.works_id), {
      pv: Number(row.pv) || 0,
      uv: Number(row.uv) || 0,
    });
  }

  const shareMap = new Map<string, number>();
  for (const row of shareStats as any[]) {
    if (!row.works_id) continue;
    shareMap.set(String(row.works_id), Number(row.share_count) || 0);
  }

  // 8. 为每个有效作品写入 / 更新统计数据（按 50 条一批）
  const UPSERT_BATCH_SIZE = 50;
  const validWorksIds = Array.from(validWorksIdSet);

  for (let i = 0; i < validWorksIds.length; i += UPSERT_BATCH_SIZE) {
    const batchIds = validWorksIds.slice(i, i + UPSERT_BATCH_SIZE);

    try {
      await Promise.all(
        batchIds.map(worksId => {
          const publish_count = publishMap.get(worksId) || 0;
          const viewerStat = viewerMap.get(worksId);
          const viewer_pv = viewerStat?.pv || 0;
          const viewer_uv = viewerStat?.uv || 0;

          const vipStat = vipStatsMap.get(worksId);
          const vip_inter_count = vipStat?.pv || 0;

          const share_count = shareMap.get(worksId) || 0;

          return prisma.worksDailyStatisticsEntity.upsert({
            where: {
              works_id_date: {
                works_id: worksId,
                date: statDate,
              },
            },
            update: {
              publish_count,
              viewer_pv,
              viewer_uv,
              vip_inter_count,
              share_count,
              update_time: new Date(),
            },
            create: {
              works_id: worksId,
              date: statDate,
              publish_count,
              viewer_pv,
              viewer_uv,
              vip_inter_count,
              share_count,
            },
          });
        })
      );

      successCount += batchIds.length;
      console.log(
        `批量写入进度：本批 ${batchIds.length} 个作品，累计成功 ${successCount} / ${validWorksIds.length}`
      );
    } catch (error) {
      console.error(
        `批量写入作品统计失败，本批作品ID: ${batchIds.join(', ')}`,
        error
      );
      errorCount += batchIds.length;
    }
  }

  console.log(`\n作品行为统计完成！`);
  console.log(`成功: ${successCount} 个作品`);
  console.log(`失败: ${errorCount} 个作品`);
}

// 主函数：从命令行读取日期参数
async function main() {
  try {
    const dateArg = process.argv[2];
    if (dateArg) {
      // 如果传入日期参数，仅统计指定日期
      await statWorksDaily(dateArg);
    } else {
      // 默认：统计最近 14 天（含今天），从最近一天往前依次执行
      const today = new Date();
      for (let i = 0; i < 15; i++) {
        const target = new Date(today);
        target.setDate(today.getDate() - i);
        const targetStr = toDateString(target);
        console.log(`\n====== 开始统计日期: ${targetStr} ======`);
        await statWorksDaily(targetStr);
      }
    }
    process.exit(0);
  } catch (error) {
    console.error('执行失败:', error);
    process.exit(1);
  } finally {
    await closeAllConnections();
  }
}

// 如果直接运行此文件，执行主函数
if (require.main === module) {
  main();
}

export { statWorksDaily };

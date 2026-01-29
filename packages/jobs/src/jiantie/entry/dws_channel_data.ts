// 频道统计表（日dws）
// 按日分端统计浏览、模板点击、创作、拦截、支付、订单、成交金额、分设备端（android、ios、web）

//数据说明
//频道：为template_market_channel_entity的class为四级标签的实体，device分端统计
//浏览量从biAdb的mk_datawork_sls_events读取，appid = 'jiantie' ,page_id为四级标签的id，event_type为page_view，page_type为tag_channel，uv按照distinct_id去重
//模板点击从biAdb的mk_datawork_sls_events读取，appid = 'jiantie' ,event_type为page_view，page_type为template_page，ref_page_id为四级标签的id，ref_page_type为tag_channel，uv按照distinct_id去重

//创作量
// 从works_entity读取，特征为meta数据里面的ref_page_id为四级标签的id，ref_page_type为tag_channel，分端数据由uid关联的user_reg_sources的device来

//拦截量的实现:
//第一步，从biAdb的mk_datawork_sls_events读取 appid = 'jiantie' ,page_type: "vip_intercept_page",page_id: "vip_intercept_page"的数据，device分端统计
//第二步，从数据的url中解析出works_id=作品ID的数据，如果解析不出来，则不统计拦截量
//第三步，通过works_entity的meta数据的ref_page_id关联到四级标签id上

//订单的实现
// 分端数据由uid关联的user_reg_sources的device来
//第一步，从orderDB的order表读取 appid = 'jiantie' ,order_status为paid的数据 join order_extra_info表
//第二步，数据里面读取trace_metadata{"workId":"SSXSYC4FW605140555"}，{"workId":"7GLV3G3O_605498305","works_id":"7GLV3G3O_605498305","ref_object_id":"T_902LN1PP8Y54"}
//读取works_id或者workId，关联作品id，关联到四级标签id上
//order里面的amount为订单金额，单位为分（不用关心货币）

import {
  getEndOfDay,
  getStartOfDay,
  parseDate,
  parseWorksIdFromTraceMetadata,
  parseWorksIdFromUrl,
  toDateString,
} from '../../utils/utils';
import {
  closeAllConnections,
  getBiAdb,
  getOrderDB,
  getPrisma,
  getUsercenterDB,
} from '../../service/db-connections';
import { normalizeDevice } from '../../service/device-utils';
import {
  filterWorksByMetadata,
  queryOrdersByDateRange,
  queryUserDevices,
  queryVipInterceptEvents,
} from '../../service/data-query';
import { innerUids } from './innerUids';

// 获取数据库连接
const prisma = getPrisma();
const biAdb = getBiAdb();
const orderDB = getOrderDB();
const usercenterDB = getUsercenterDB();

/**
 * 统计频道日数据
 */
async function statChannelDaily(targetDate?: string) {
  const date = parseDate(targetDate);
  const startTime = getStartOfDay(date);
  const endTime = getEndOfDay(date);
  const dateStr = date.toISOString().split('T')[0];

  console.log(`开始统计频道数据，日期: ${dateStr}`);
  console.log(
    `时间范围: ${startTime.toISOString()} ~ ${endTime.toISOString()}`
  );

  // 1. 查询所有四级标签频道
  const channels = await prisma.templateMarketChannelEntity.findMany({
    where: {
      class: '四级标签',
      online: true,
    },
    select: {
      id: true,
      alias: true,
      display_name: true,
    },
  });

  console.log(`找到 ${channels.length} 个四级标签频道`);

  // 2. 前置聚合查询，尽量减少在每个频道里的大范围扫描
  let successCount = 0;
  let errorCount = 0;

  const channelIdStrList = channels.map(c => c.id.toString());

  // 2.1 浏览量：一次性按频道 + 设备聚合
  const viewStatsAll = await biAdb('mk_datawork_sls_events')
    .whereIn('appid', ['jiantie', 'maka'])
    .where({
      event_type: 'page_view',
      page_type: 'tag_channel',
    })
    .whereIn('page_id', channelIdStrList)
    .whereNotIn('uid', innerUids)
    .whereBetween('event_time', [startTime, endTime])
    .select(
      'page_id',
      'platform',
      biAdb.raw('COUNT(*) as pv'),
      biAdb.raw('COUNT(DISTINCT distinct_id) as uv')
    )
    .groupBy('page_id', 'platform');

  const viewStatsMap = new Map<
    string,
    Array<{ platform: string; pv: number; uv: number }>
  >();
  for (const row of viewStatsAll as any[]) {
    const key = String(row.page_id);
    if (!viewStatsMap.has(key)) {
      viewStatsMap.set(key, []);
    }
    viewStatsMap.get(key)!.push({
      platform: row.platform,
      pv: Number(row.pv) || 0,
      uv: Number(row.uv) || 0,
    });
  }

  // 2.2 模板点击：一次性按频道 + 设备聚合
  const clickStatsAll = await biAdb('mk_datawork_sls_events')
    .whereIn('appid', ['jiantie', 'maka'])
    .where({
      event_type: 'page_view',
      page_type: 'template_page',
      ref_page_type: 'tag_channel',
    })
    .whereIn('ref_page_id', channelIdStrList)
    .whereBetween('event_time', [startTime, endTime])
    .select(
      'ref_page_id',
      'platform',
      biAdb.raw('COUNT(*) as pv'),
      biAdb.raw('COUNT(DISTINCT distinct_id) as uv')
    )
    .groupBy('ref_page_id', 'platform');

  const clickStatsMap = new Map<
    string,
    Array<{ platform: string; pv: number; uv: number }>
  >();
  for (const row of clickStatsAll as any[]) {
    const key = String(row.ref_page_id);
    if (!clickStatsMap.has(key)) {
      clickStatsMap.set(key, []);
    }
    clickStatsMap.get(key)!.push({
      platform: row.platform,
      pv: Number(row.pv) || 0,
      uv: Number(row.uv) || 0,
    });
  }

  // 2.3 创作量：一次性查出当日所有作品，并按频道分组
  const allWorks = await prisma.worksEntity.findMany({
    where: {
      deleted: false,
      create_time: {
        gte: startTime,
        lte: endTime,
      },
      uid: {
        notIn: innerUids,
      },
    },
    select: {
      id: true,
      uid: true,
      metadata: true,
    },
  });

  const channelWorksMap = new Map<string, Array<{ id: string; uid: number }>>();
  const allCreationUids = new Set<number>();
  const matchedWorks = filterWorksByMetadata(allWorks, {
    ref_page_type: 'tag_channel',
    ref_page_id: channelIdStrList,
  });
  for (const work of matchedWorks) {
    const meta = work.metadata as any;
    const key = String(meta.ref_page_id);
    if (!channelWorksMap.has(key)) {
      channelWorksMap.set(key, []);
    }
    channelWorksMap.get(key)!.push({
      id: work.id,
      uid: work.uid,
    });
    allCreationUids.add(work.uid);
  }

  // 一次性查出创作用户的设备信息
  const creationUserDevicesMap =
    allCreationUids.size > 0
      ? await queryUserDevices(Array.from(allCreationUids))
      : new Map<number, string>();

  // 2.4 拦截量：一次性查出拦截事件 + 作品，并预聚合到频道 + 设备
  const interceptEventsAll = await queryVipInterceptEvents(startTime, endTime, {
    selectFields: ['url', 'distinct_id', 'platform'],
  });

  type InterceptEventInfo = {
    worksId: string;
    distinct_id: string;
    device: string;
  };

  const interceptEventInfos: InterceptEventInfo[] = [];
  const interceptWorksIdSet = new Set<string>();
  for (const event of interceptEventsAll) {
    const worksId = parseWorksIdFromUrl(event.url);
    if (!worksId) continue;
    const device = normalizeDevice(event.platform);
    interceptEventInfos.push({
      worksId,
      distinct_id: event.distinct_id,
      device,
    });
    interceptWorksIdSet.add(worksId);
  }

  const interceptWorksAll =
    interceptWorksIdSet.size > 0
      ? await prisma.worksEntity.findMany({
          where: {
            id: {
              in: Array.from(interceptWorksIdSet),
            },
          },
          select: {
            id: true,
            metadata: true,
          },
        })
      : [];

  // worksId -> channelId
  const interceptWorkChannelMap = new Map<string, string>();
  const matchedInterceptWorks = filterWorksByMetadata(interceptWorksAll, {
    ref_page_type: 'tag_channel',
    ref_page_id: channelIdStrList,
  });
  for (const work of matchedInterceptWorks) {
    const meta = work.metadata as any;
    interceptWorkChannelMap.set(work.id, String(meta.ref_page_id));
  }

  const interceptStatsByChannelDevice = new Map<
    string,
    Map<string, { pv: number; distinctIds: Set<string> }>
  >();

  for (const info of interceptEventInfos) {
    const channelIdStr = interceptWorkChannelMap.get(info.worksId);
    if (!channelIdStr) continue;
    if (!interceptStatsByChannelDevice.has(channelIdStr)) {
      interceptStatsByChannelDevice.set(
        channelIdStr,
        new Map<string, { pv: number; distinctIds: Set<string> }>()
      );
    }
    const deviceMap = interceptStatsByChannelDevice.get(channelIdStr) as Map<
      string,
      { pv: number; distinctIds: Set<string> }
    >;
    if (!deviceMap.has(info.device)) {
      deviceMap.set(info.device, { pv: 0, distinctIds: new Set() });
    }
    const stats = deviceMap.get(info.device)!;
    stats.pv++;
    stats.distinctIds.add(info.distinct_id);
  }

  // 2.5 订单数和成交金额：一次性查出订单 + 作品 + 设备，并预聚合到频道 + 设备
  const ordersAll = await queryOrdersByDateRange(startTime, endTime);

  const orderWorksIdMap = new Map<string, string>(); // order_no -> works_id
  const worksIdsFromOrdersAll = new Set<string>();
  const orderUidsAll = new Set<number>();

  for (const order of ordersAll as any[]) {
    const worksId = parseWorksIdFromTraceMetadata(order.trace_metadata);
    if (worksId) {
      worksIdsFromOrdersAll.add(worksId);
      orderWorksIdMap.set(order.order_no, worksId);
      orderUidsAll.add(order.uid);
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
          },
          select: {
            id: true,
            metadata: true,
          },
        })
      : [];

  const orderWorkChannelMap = new Map<string, string>(); // worksId -> channelId
  const matchedOrderWorks = filterWorksByMetadata(orderWorksAll, {
    ref_page_type: 'tag_channel',
    ref_page_id: channelIdStrList,
  });
  for (const work of matchedOrderWorks) {
    const meta = work.metadata as any;
    orderWorkChannelMap.set(work.id, String(meta.ref_page_id));
  }

  const orderUserDevicesMap =
    orderUidsAll.size > 0
      ? await queryUserDevices(Array.from(orderUidsAll))
      : new Map<number, string>();

  const orderStatsByChannelDevice = new Map<
    string,
    Map<string, { count: number; amount: number }>
  >();

  for (const order of ordersAll as any[]) {
    const worksId = orderWorksIdMap.get(order.order_no);
    if (!worksId) continue;
    const channelIdStr = orderWorkChannelMap.get(worksId);
    if (!channelIdStr) continue;
    if (!orderStatsByChannelDevice.has(channelIdStr)) {
      orderStatsByChannelDevice.set(
        channelIdStr,
        new Map<string, { count: number; amount: number }>()
      );
    }
    const device = orderUserDevicesMap.get(order.uid) || 'other';
    const deviceMap = orderStatsByChannelDevice.get(channelIdStr) as Map<
      string,
      { count: number; amount: number }
    >;
    if (!deviceMap.has(device)) {
      deviceMap.set(device, { count: 0, amount: 0 });
    }
    const stats = deviceMap.get(device)!;
    stats.count++;
    stats.amount += Number(order.amount) || 0;
  }

  // 3. 对每个频道做最终聚合和写入
  for (const channel of channels) {
    try {
      // console.log(
      //   `\n正在统计频道: ${channel.display_name} (ID: ${channel.id})`
      // );

      const channelIdStr = channel.id.toString();

      // 浏览量（按设备端）
      const viewStatsByDevice = viewStatsMap.get(channelIdStr) || [];

      // 模板点击（按设备端）
      const clickStatsByDevice = clickStatsMap.get(channelIdStr) || [];

      // 创作量
      const matchedWorks = channelWorksMap.get(channelIdStr) || [];
      const creationStatsByDevice = new Map<
        string,
        { pv: number; uv: Set<number> }
      >();
      for (const work of matchedWorks) {
        const device = creationUserDevicesMap.get(work.uid) || 'other';
        if (!creationStatsByDevice.has(device)) {
          creationStatsByDevice.set(device, { pv: 0, uv: new Set() });
        }
        const stats = creationStatsByDevice.get(device)!;
        stats.pv++;
        stats.uv.add(work.uid);
      }

      // 拦截量
      const interceptDeviceMap =
        interceptStatsByChannelDevice.get(channelIdStr) ||
        new Map<string, { pv: number; distinctIds: Set<string> }>();
      const interceptStatsByDevice = new Map<
        string,
        { pv: number; uv: number }
      >();
      for (const [device, stats] of interceptDeviceMap.entries()) {
        interceptStatsByDevice.set(device, {
          pv: stats.pv,
          uv: stats.distinctIds.size,
        });
      }

      // 订单统计
      const orderStatsByDevice =
        orderStatsByChannelDevice.get(channelIdStr) ||
        new Map<string, { count: number; amount: number }>();

      // 合并所有设备端的数据，并保存
      const allDevices = new Set<string>();

      // 收集所有出现的设备端
      viewStatsByDevice.forEach(stat => {
        allDevices.add(normalizeDevice(stat.platform));
      });
      clickStatsByDevice.forEach(stat => {
        allDevices.add(normalizeDevice(stat.platform));
      });
      creationStatsByDevice.forEach((_, device) => {
        allDevices.add(device);
      });
      interceptStatsByDevice.forEach((_, device) => {
        allDevices.add(device);
      });
      orderStatsByDevice.forEach((_, device) => {
        allDevices.add(device);
      });

      // 如果没有数据，至少保存一个默认设备端（web）
      if (allDevices.size === 0) {
        allDevices.add('web');
      }

      const statDate = new Date(date);
      statDate.setHours(0, 0, 0, 0);

      // 为每个设备端保存统计数据
      for (const device of allDevices) {
        // 浏览量
        const viewStat = viewStatsByDevice.find(
          s => normalizeDevice(s.platform) === device
        );
        const view_pv = Number(viewStat?.pv || 0);
        const view_uv = Number(viewStat?.uv || 0);

        // 模板点击
        const clickStat = clickStatsByDevice.find(
          s => normalizeDevice(s.platform) === device
        );
        const click_pv = Number(clickStat?.pv || 0);
        const click_uv = Number(clickStat?.uv || 0);

        // 创作量
        const creationStat = creationStatsByDevice.get(device);
        const creation_pv = creationStat?.pv || 0;
        const creation_uv = creationStat?.uv.size || 0;

        // 拦截量
        const interceptStat = interceptStatsByDevice.get(device);
        const intercept_pv = interceptStat?.pv || 0;
        const intercept_uv = interceptStat?.uv || 0;

        // 订单数和成交金额
        const orderStat = orderStatsByDevice.get(device);
        const order_count = orderStat?.count || 0;
        const transaction_amount = orderStat?.amount
          ? Math.round(orderStat.amount) / 100
          : 0;

        console.log('statDate', {
          channel_id: channel.id,
          date: statDate,
          device: device,
        });
        // 保存统计数据
        await prisma.channelDailyStatisticsEntity.upsert({
          where: {
            channel_id_date_device: {
              channel_id: channel.id,
              date: statDate,
              device: device,
            },
          },
          update: {
            view_pv,
            view_uv,
            click_pv,
            click_uv,
            creation_pv,
            creation_uv,
            intercept_pv,
            intercept_uv,
            order_count,
            transaction_amount,
            update_time: new Date(),
          },
          create: {
            channel_id: channel.id,
            date: statDate,
            device: device,
            view_pv,
            view_uv,
            click_pv,
            click_uv,
            creation_pv,
            creation_uv,
            intercept_pv,
            intercept_uv,
            order_count,
            transaction_amount,
          },
        });

        console.log(
          `::data${statDate}  [${device}] 浏览量: PV=${view_pv}, UV=${view_uv} | 点击: PV=${click_pv}, UV=${click_uv} | 创作: PV=${creation_pv}, UV=${creation_uv} | 拦截: PV=${intercept_pv}, UV=${intercept_uv} | 订单: ${order_count}, 金额: ${transaction_amount.toFixed(2)}元`
        );
      }

      console.log(`  ✓ 频道 ${channel.display_name} 统计完成`);
      successCount++;
    } catch (error) {
      console.error(`  ✗ 频道 ${channel.display_name} 统计失败:`, error);
      errorCount++;
    }
  }

  console.log(`\n统计完成！`);
  console.log(`成功: ${successCount} 个频道`);
  console.log(`失败: ${errorCount} 个频道`);
}

// 主函数
async function main() {
  try {
    // 从命令行参数获取日期，默认今天
    const dateArg = process.argv[2];

    //for统计最近7日
    for (let i = 0; i < 13; i++) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - i);
      const targetStr = toDateString(targetDate);
      await statChannelDaily(targetStr);
    }
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

export { statChannelDaily };

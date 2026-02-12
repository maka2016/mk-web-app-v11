// 频道统计表（日dws）
// 按日分端统计浏览、模板点击、创作、拦截、支付、订单、成交金额、分设备端（android、ios、web）

//数据说明
//频道：为template_market_channel_entity的class为三级热词的实体，device分端统计
//浏览量从biAdb的mk_datawork_sls_events读取，appid = 'jiantie' ,page_id为三级热词的id，event_type为page_view，page_type为hotword_channel，uv按照distinct_id去重
//模板点击从biAdb的mk_datawork_sls_events读取，appid = 'jiantie' ,event_type为page_view，page_type为template_page，ref_page_id为三级热词的id，ref_page_type为hotword_channel，uv按照distinct_id去重

//创作量
// 从works_entity读取，特征为meta数据里面的ref_page_id为三级热词的id，ref_page_type为hotword_channel，分端数据由uid关联的user_reg_sources的device来

//拦截量的实现:
//第一步，从biAdb的mk_datawork_sls_events读取 appid = 'jiantie' ,page_type: "vip_intercept_page",page_id: "vip_intercept_page"的数据，device分端统计
//第二步，从数据的url中解析出works_id=作品ID的数据，如果解析不出来，则不统计拦截量
//第三步，通过works_entity的meta数据的ref_page_id关联到三级热词id上

//订单的实现
// 分端数据由uid关联的user_reg_sources的device来
//第一步，从orderDB的order表读取 appid = 'jiantie' ,order_status为paid的数据 join order_extra_info表
//第二步，数据里面读取trace_metadata{"workId":"SSXSYC4FW605140555"}，{"workId":"7GLV3G3O_605498305","works_id":"7GLV3G3O_605498305","ref_object_id":"T_902LN1PP8Y54"}
//读取works_id或者workId，关联作品id，关联到三级热词id上
//order里面的amount为订单金额，单位为分（不用关心货币）

import { initPrisma } from '@mk/jiantie/v11-database';
import dotenv from 'dotenv';
import knex from 'knex';
import { innerUids } from './innerUids';

console.log('process.cwd()', process.cwd());
dotenv.config({ path: 'src/jiantie/.env.local' });

// 初始化数据库连接
const prisma = initPrisma({
  connectionString: `${process.env.DATABASE_URL}`,
});

const biAdb = knex({
  client: 'mysql',
  connection: {
    host: 'am-2zeo48x814d64lo93167330.ads.aliyuncs.com',
    user: 'report_api',
    password: 'j3E4h6NWBQ5U-',
    database: 'mk_datawork',
  },
});

const orderDB = knex({
  client: 'mysql',
  connection: {
    host: 'rdsa2uaava2uaav413.mysql.rds.aliyuncs.com',
    user: 'query_prod',
    password: 'jCItnVtI0k67RBrt',
    database: 'mk_order_center',
  },
});

const usercenterDB = knex({
  client: 'mysql',
  connection: {
    host: 'rdsa2uaava2uaav413.mysql.rds.aliyuncs.com',
    user: 'query_prod',
    password: 'jCItnVtI0k67RBrt',
    database: 'mk_user_center',
  },
});

/**
 * 解析日期参数，默认今天
 * @param dateStr 日期字符串，格式：YYYY-MM-DD
 * @returns 日期对象
 */
function parseDate(dateStr?: string): Date {
  if (dateStr) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new Error(`无效的日期格式: ${dateStr}，请使用 YYYY-MM-DD 格式`);
    }
    return date;
  }
  return new Date();
}

/**
 * 获取日期的开始时间（00:00:00）
 */
function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * 获取日期的结束时间（23:59:59.999）
 */
function getEndOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * 从URL中解析works_id参数
 */
function parseWorksIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('works_id');
  } catch {
    // 如果不是完整URL，尝试正则匹配
    const match = url.match(/[?&]works_id=([^&]+)/);
    return match ? match[1] : null;
  }
}

/**
 * 从trace_metadata中解析works_id或workId
 */
function parseWorksIdFromTraceMetadata(
  traceMetadata: string | null | undefined
): string | null {
  if (!traceMetadata) return null;
  try {
    const metadata = JSON.parse(traceMetadata);
    if (typeof metadata !== 'object' || metadata === null) return null;
    // 优先使用works_id，如果没有则使用workId
    return metadata.works_id || metadata.workId || null;
  } catch {
    // JSON解析失败，返回null
    return null;
  }
}

/**
 * 标准化设备类型
 * 将各种设备类型转换为标准格式：web、ios、android、wap、other
 * @param device 原始设备类型
 * @returns 标准化后的设备类型
 */
function normalizeDevice(device: string | null | undefined): string {
  if (!device) return 'other';
  const normalized = device.toLowerCase().trim();

  // 直接匹配标准类型
  if (['web', 'ios', 'android', 'wap', 'other'].includes(normalized)) {
    return normalized;
  }

  // 匹配iOS相关
  if (
    normalized.includes('ios') ||
    normalized.includes('iphone') ||
    normalized.includes('ipad')
  ) {
    return 'ios';
  }

  // 匹配Android相关
  if (normalized.includes('android')) {
    return 'android';
  }

  // 匹配Web相关
  if (
    normalized.includes('web') ||
    normalized.includes('pc') ||
    normalized.includes('desktop')
  ) {
    return 'web';
  }

  // 匹配WAP相关
  if (
    normalized.includes('wap') ||
    normalized.includes('mobile') ||
    normalized.includes('h5')
  ) {
    return 'wap';
  }

  // 其他情况返回other
  return 'other';
}

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

  // 1. 查询所有三级热词频道
  const channels = await prisma.templateMarketChannelEntity.findMany({
    where: {
      class: '三级热词',
      online: true,
    },
    select: {
      id: true,
      alias: true,
      display_name: true,
    },
  });

  console.log(`找到 ${channels.length} 个三级热词频道`);

  // 2. 对每个频道进行统计
  let successCount = 0;
  let errorCount = 0;

  for (const channel of channels) {
    try {
      // console.log(
      //   `\n正在统计频道: ${channel.display_name} (ID: ${channel.id})`
      // );

      // 2.1 统计浏览量（按设备端分组）
      const viewStatsByDevice = await biAdb('mk_datawork_sls_events')
        .whereIn('appid', ['jiantie', 'maka'])
        .where({
          page_id: channel.id.toString(),
          event_type: 'page_view',
          page_type: 'hotword_channel',
        })
        .whereNotIn('uid', innerUids)
        .whereBetween('event_time', [startTime, endTime])
        .select(
          'platform',
          biAdb.raw('COUNT(*) as pv'),
          biAdb.raw('COUNT(DISTINCT distinct_id) as uv')
        )
        .groupBy('platform');

      // 2.2 统计模板点击（按设备端分组）
      const clickStatsByDevice = await biAdb('mk_datawork_sls_events')
        .whereIn('appid', ['jiantie', 'maka'])
        .where({
          event_type: 'page_view',
          page_type: 'template_page',
          ref_page_id: channel.id.toString(),
          ref_page_type: 'hotword_channel',
        })
        .whereBetween('event_time', [startTime, endTime])
        .select(
          'platform',
          biAdb.raw('COUNT(*) as pv'),
          biAdb.raw('COUNT(DISTINCT distinct_id) as uv')
        )
        .groupBy('platform');
      // 2.3 统计创作量
      // 查询所有符合条件的作品
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
        },
        select: {
          id: true,
          uid: true,
          metadata: true,
        },
      });

      // 过滤出符合条件的作品（metadata中的ref_page_id和ref_page_type匹配）
      const matchedWorks = works.filter(work => {
        if (!work.metadata || typeof work.metadata !== 'object') return false;
        const meta = work.metadata as any;
        return (
          meta.ref_page_id === channel.id.toString() &&
          meta.ref_page_type === 'hotword_channel'
        );
      });

      // 获取所有相关用户的设备信息
      const uids = Array.from(new Set(matchedWorks.map(w => w.uid)));
      const userDevicesMap = new Map<number, string>(); // uid -> device

      if (uids.length > 0) {
        const userRegSources = await usercenterDB('user_reg_sources')
          .whereIn('uid', uids)
          .whereIn('appid', ['jiantie', 'maka'])
          .whereNotIn('uid', innerUids)
          .select('uid', 'device');

        for (const source of userRegSources) {
          if (!userDevicesMap.has(source.uid)) {
            userDevicesMap.set(source.uid, normalizeDevice(source.device));
          }
        }
      }

      // 按设备端分组统计创作量
      const creationStatsByDevice = new Map<
        string,
        { pv: number; uv: Set<number> }
      >();
      for (const work of matchedWorks) {
        const device = userDevicesMap.get(work.uid) || 'other';
        if (!creationStatsByDevice.has(device)) {
          creationStatsByDevice.set(device, { pv: 0, uv: new Set() });
        }
        const stats = creationStatsByDevice.get(device)!;
        stats.pv++;
        stats.uv.add(work.uid);
      }

      // 2.4 统计拦截量（按设备端分组）
      // 第一步：查询拦截页面的数据
      const interceptEvents = await biAdb('mk_datawork_sls_events')
        .whereIn('appid', ['jiantie', 'maka'])
        .whereNotIn('uid', innerUids)
        .where({
          page_type: 'vip_intercept_page',
          page_id: 'vip_intercept_page',
        })
        .whereBetween('event_time', [startTime, endTime])
        .select('url', 'distinct_id', 'platform');

      // 第二步：从URL中解析works_id，并按设备端分组
      const interceptWorksByDevice = new Map<
        string,
        { worksIds: Set<string>; distinctIds: Set<string> }
      >();

      for (const event of interceptEvents) {
        const worksId = parseWorksIdFromUrl(event.url);
        if (worksId) {
          const device = normalizeDevice(event.platform);
          if (!interceptWorksByDevice.has(device)) {
            interceptWorksByDevice.set(device, {
              worksIds: new Set(),
              distinctIds: new Set(),
            });
          }
          const stats = interceptWorksByDevice.get(device)!;
          stats.worksIds.add(worksId);
          stats.distinctIds.add(event.distinct_id);
        }
      }

      // 第三步：通过works_entity的metadata关联到频道，并按设备端统计
      const interceptStatsByDevice = new Map<
        string,
        { pv: number; uv: number }
      >();

      for (const [device, { worksIds }] of interceptWorksByDevice.entries()) {
        if (worksIds.size === 0) {
          interceptStatsByDevice.set(device, { pv: 0, uv: 0 });
          continue;
        }

        const interceptWorks = await prisma.worksEntity.findMany({
          where: {
            id: {
              in: Array.from(worksIds),
            },
            // deleted: false,
          },
          select: {
            id: true,
            metadata: true,
          },
        });

        // 过滤出属于当前频道的作品
        const channelInterceptWorks = interceptWorks.filter(work => {
          if (!work.metadata || typeof work.metadata !== 'object') return false;
          const meta = work.metadata as any;
          return (
            meta.ref_page_id === channel.id.toString() &&
            meta.ref_page_type === 'hotword_channel'
          );
        });

        const channelInterceptWorksIds = new Set(
          channelInterceptWorks.map(w => w.id)
        );
        const channelInterceptDistinctIds = new Set<string>();

        // 重新统计这些作品对应的distinct_id
        for (const event of interceptEvents) {
          const worksId = parseWorksIdFromUrl(event.url);
          if (worksId && channelInterceptWorksIds.has(worksId)) {
            const eventDevice = normalizeDevice(event.platform);
            if (eventDevice === device) {
              channelInterceptDistinctIds.add(event.distinct_id);
            }
          }
        }

        interceptStatsByDevice.set(device, {
          pv: channelInterceptWorks.length,
          uv: channelInterceptDistinctIds.size,
        });
      }

      // 2.5 统计订单数和成交金额（按设备端分组）
      // 第一步：查询订单数据（join order_extra_info）
      const orders = await orderDB('orders')
        .join(
          'order_extra_info',
          'orders.order_no',
          'order_extra_info.order_no'
        )
        .whereIn('orders.appid', ['jiantie', 'maka'])
        .where({
          'orders.order_status': 'paid',
        })
        .whereBetween('orders.created_at', [startTime, endTime])
        .select(
          'orders.id',
          'orders.order_no',
          'orders.uid',
          'orders.amount',
          'order_extra_info.trace_metadata'
        );

      // 第二步：从trace_metadata中解析works_id或workId，并建立映射关系
      const orderWorksIdMap = new Map<string, string>(); // order_no -> works_id
      const worksIdsFromOrders = new Set<string>();
      const orderUids = new Set<number>();

      for (const order of orders) {
        const worksId = parseWorksIdFromTraceMetadata(order.trace_metadata);
        if (worksId) {
          worksIdsFromOrders.add(worksId);
          orderWorksIdMap.set(order.order_no, worksId);
          orderUids.add(order.uid);
        }
      }

      // 获取订单用户的设备信息
      const orderUserDevicesMap = new Map<number, string>(); // uid -> device
      if (orderUids.size > 0) {
        const orderUserRegSources = await usercenterDB('user_reg_sources')
          .whereIn('uid', Array.from(orderUids))
          .whereIn('appid', ['jiantie', 'maka'])
          .select('uid', 'device');

        for (const source of orderUserRegSources) {
          if (!orderUserDevicesMap.has(source.uid)) {
            orderUserDevicesMap.set(source.uid, normalizeDevice(source.device));
          }
        }
      }

      // 第三步：通过works_entity关联到频道，并按设备端统计
      const orderStatsByDevice = new Map<
        string,
        { count: number; amount: number }
      >();

      if (worksIdsFromOrders.size > 0) {
        const orderWorks = await prisma.worksEntity.findMany({
          where: {
            id: {
              in: Array.from(worksIdsFromOrders),
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
        });

        // 过滤出属于当前频道的作品
        const channelOrderWorks = orderWorks.filter(work => {
          if (!work.metadata || typeof work.metadata !== 'object') return false;
          const meta = work.metadata as any;
          return (
            meta.ref_page_id === channel.id.toString() &&
            meta.ref_page_type === 'hotword_channel'
          );
        });

        const channelOrderWorksIds = new Set(channelOrderWorks.map(w => w.id));

        // 遍历订单，找出属于当前频道的订单，并按设备端分组
        for (const order of orders) {
          const worksId = orderWorksIdMap.get(order.order_no);
          if (worksId && channelOrderWorksIds.has(worksId)) {
            const device = orderUserDevicesMap.get(order.uid) || 'other';
            if (!orderStatsByDevice.has(device)) {
              orderStatsByDevice.set(device, { count: 0, amount: 0 });
            }
            const stats = orderStatsByDevice.get(device)!;
            stats.count++;
            stats.amount += Number(order.amount) || 0;
          }
        }
      }

      // 3. 合并所有设备端的数据，并保存
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
          `  [${device}] 浏览量: PV=${view_pv}, UV=${view_uv} | 点击: PV=${click_pv}, UV=${click_uv} | 创作: PV=${creation_pv}, UV=${creation_uv} | 拦截: PV=${intercept_pv}, UV=${intercept_uv} | 订单: ${order_count}, 金额: ${transaction_amount.toFixed(2)}元`
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
    await statChannelDaily(dateArg);
    process.exit(0);
  } catch (error) {
    console.error('执行失败:', error);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await prisma.$disconnect();
    await biAdb.destroy();
    await orderDB.destroy();
    await usercenterDB.destroy();
  }
}

// 如果直接运行此文件，执行主函数
if (require.main === module) {
  main();
}

export { statChannelDaily };

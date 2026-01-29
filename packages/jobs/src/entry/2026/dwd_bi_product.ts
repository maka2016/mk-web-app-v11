//构建BiProductDailyEntity的日统计函数
//数据源说明
//从db-connections.ts获取db
//入参为appid和日期
//排除innerUids
//1. 产品BI表日dwd表，包括appid，日期、端，注册UV、活跃UV、拦截UV、GMV、订单数、成功UV（所有人数指标均为UV口径）
//注册用户从usercenterDB的user表中获取，从user_reg_sources读取uid对应的端
//sls中有app_id和platform
//活跃uv从sls：v11-app-logs：v11-app-logs中获取，按uid去重获得uv
//拦截uv从sls：v11-app-logs：v11-app-logs中获取，page_type为vip_page_block，按uid去重获得uv
//成功uv从sls：v11-app-logs：v11-app-logs中获取，event为success，按uid去重获得uv
//订单和金额从orderDB的order表中获取

import { getEndOfDay, getStartOfDay, parseDate } from '../../utils/utils';
import {
  closeAllConnections,
  getOrderDB,
  getPrisma,
  getUsercenterDB,
} from '../../service/db-connections';
import { normalizeDevice } from '../../service/device-utils';
import {
  queryOrdersByDateRange,
  queryUserDevices,
} from '../../service/data-query';
import { innerUids } from '../../jiantie/entry/innerUids';
import { queryV11SlsLogs } from '../../utils/sls';
import dayjs from 'dayjs';

// 获取数据库连接（单例）
const prisma = getPrisma();
// 目前只用到了订单库，这里提前初始化，后续如果接入 SLS/MySQL 可复用模式
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const orderDB = getOrderDB();

type DeviceKey = string;

interface RegisterStatsByDevice {
  [device: DeviceKey]: number;
}

interface OrderStats {
  order_count: number;
  gmv: number;
}

type OrderStatsByDevice = Map<DeviceKey, OrderStats>;

interface EventUvStats {
  [device: DeviceKey]: number;
}

/**
 * 从 v11-app-logs 统计某天的活跃 / 拦截 / 成功 UV（按设备分组）
 * - 活跃UV：所有事件（pageview/click/show/success/search 等）按 uid 去重
 * - 拦截UV：page_type = vip_page_block，按 uid 去重
 * - 成功UV：event = success，按 uid 去重
 */
async function collectSlsUvByDevice(
  appid: string,
  startTime: Date,
  endTime: Date
): Promise<{
  activeUvByDevice: EventUvStats;
  interceptUvByDevice: EventUvStats;
  successUvByDevice: EventUvStats;
}> {
  const from = Math.floor(startTime.getTime() / 1000);
  const to = Math.floor(endTime.getTime() / 1000);

  // 1. 活跃 UV：所有事件中出现过的 uid
  const activeQuery = `app_id: "${appid}" | SELECT platform, distinct_id, uid LIMIT 100000`;

  // 2. 拦截 UV：VIP 拦截页曝光/点击
  const interceptQuery = `app_id: "${appid}" and page_type: "vip_page_block" | SELECT platform, distinct_id, uid LIMIT 100000`;

  // 3. 成功 UV：业务 success 事件
  const successQuery = `app_id: "${appid}" and event: "success" | SELECT platform, distinct_id, uid LIMIT 100000`;

  const [activeLogs, interceptLogs, successLogs] = await Promise.all([
    queryV11SlsLogs({ query: activeQuery, from, to }),
    queryV11SlsLogs({ query: interceptQuery, from, to }),
    queryV11SlsLogs({ query: successQuery, from, to }),
  ]);

  const aggregateUv = (logs: { raw: Record<string, any> }[]): EventUvStats => {
    const deviceToUsers = new Map<DeviceKey, Set<number>>();

    for (const { raw } of logs) {
      // 过滤掉内部账号，使用 uid 去重
      const uid = raw.uid ? Number(raw.uid) : null;
      if (!uid || innerUids.includes(uid)) {
        continue;
      }

      const device = normalizeDevice(
        String(raw.platform || raw.device || 'other')
      );
      if (!deviceToUsers.has(device)) {
        deviceToUsers.set(device, new Set<number>());
      }
      deviceToUsers.get(device)!.add(uid);
    }

    const res: EventUvStats = {};
    for (const [device, set] of deviceToUsers.entries()) {
      res[device] = set.size;
    }
    return res;
  };

  return {
    activeUvByDevice: aggregateUv(activeLogs),
    interceptUvByDevice: aggregateUv(interceptLogs),
    successUvByDevice: aggregateUv(successLogs),
  };
}

/**
 * 统计某天的注册UV（按设备分组）
 * 从 usercenterDB 的 users + user_reg_sources 表直接计算：
 * - 先按 appid + reg_date 找出当日注册用户 uid
 * - 再从 user_reg_sources 读出对应设备并做标准化
 * - 每个 uid 只计算一次 UV
 */
async function collectRegisterUvByDevice(
  appid: string,
  targetDate: Date
): Promise<RegisterStatsByDevice> {
  const stats: RegisterStatsByDevice = {};

  const usercenterDB = getUsercenterDB();

  // 当天起止时间
  const startTime = getStartOfDay(targetDate);
  const endTime = getEndOfDay(targetDate);

  // 1. 找出当日注册且非内部账号的用户 uid
  const users = await usercenterDB('users')
    .where('appid', appid)
    .whereBetween('reg_date', [startTime, endTime])
    .select('uid');

  if (!users.length) {
    return stats;
  }

  console.log('users长度', users.length);

  const uids = Array.from(
    new Set(
      users
        .map((u: any) => u.uid as number)
        .filter(uid => !innerUids.includes(uid))
    )
  );

  if (!uids.length) {
    return stats;
  }

  // 2. 查注册来源表，获取每个 uid 的设备信息
  const regSources = await usercenterDB('user_reg_sources')
    .whereIn('uid', uids)
    .where('appid', appid)
    .select('uid', 'device');

  const uidToDevice = new Map<number, string>();
  for (const row of regSources as any[]) {
    const uid = row.uid as number;
    if (uidToDevice.has(uid)) continue;
    uidToDevice.set(uid, normalizeDevice(row.device || 'other'));
  }

  // 3. 按设备聚合 UV（按 uid 去重）
  for (const uid of uids) {
    const device = uidToDevice.get(uid) || 'other';
    stats[device] = (stats[device] || 0) + 1;
  }

  return stats;
}

/**
 * 统计某天的订单数和GMV（按设备分组）
 * 订单来源 orderDB.orders + order_extra_info，设备来源 user_reg_sources。
 */
async function collectOrderStatsByDevice(
  appid: string,
  startTime: Date,
  endTime: Date
): Promise<OrderStatsByDevice> {
  const orders = await queryOrdersByDateRange(startTime, endTime, {
    appids: [appid],
    orderStatus: 'paid',
    // GMV 通常以支付成功时间为准，这里使用 payments.paid_at
    useCreatedAt: false,
  });

  console.log('orders', orders.length);

  const statsByDevice: OrderStatsByDevice = new Map();

  if (!orders.length) {
    return statsByDevice;
  }

  const uids = Array.from(
    new Set(
      orders
        .map(o => o.uid)
        // 过滤内部账号
        .filter(uid => !innerUids.includes(uid))
    )
  );

  const deviceMap = await queryUserDevices(uids, { appids: [appid] });

  for (const order of orders) {
    if (innerUids.includes(order.uid)) continue;

    const rawDevice = deviceMap.get(order.uid) || 'other';
    const device = normalizeDevice(rawDevice);

    if (!statsByDevice.has(device)) {
      statsByDevice.set(device, {
        order_count: 0,
        gmv: 0,
      });
    }

    const stats = statsByDevice.get(device)!;
    stats.order_count += 1;
    stats.gmv += Number(order.amount) || 0;
  }

  return statsByDevice;
}

/**
 * 统计某天的产品BI数据（按 appid + 日期）
 * - 结果写入 BiProductDailyEntity，按 appid + date + device 维度聚合
 * - 入参：
 *   - appid: 业务应用ID，例如 jiantie / maka
 *   - targetDate: 统计日期，YYYY-MM-DD，默认今天
 *
 * 说明：
 * - register_uv：从 usercenterDB.users + user_reg_sources 按注册日期聚合
 * - active_uv / intercept_uv / success_uv：当前仅占位，后续接入 v11-app-logs 再补充
 * - order_count / gmv：从订单库 + user_reg_sources 获取，按设备端聚合
 */
async function statBiProductDaily(
  appid: string,
  targetDate?: string
): Promise<void> {
  if (!appid) {
    throw new Error('appid 不能为空');
  }

  const date = parseDate(targetDate);
  const startTime = getStartOfDay(date);
  const endTime = getEndOfDay(date);
  const dateStr = date.toISOString().split('T')[0];

  // BiProductDailyEntity 中的 date 是 Date 类型（不含时间），统一归一到 00:00:00
  const statDate = new Date(date);
  statDate.setHours(0, 0, 0, 0);

  console.log(
    `开始统计 BiProductDailyEntity，appid=${appid}，日期=${dateStr}，时间范围=${startTime.toISOString()} ~ ${endTime.toISOString()}`
  );

  // 1. 注册 UV（按设备）
  const registerUvByDevice = await collectRegisterUvByDevice(appid, statDate);

  // 2. 订单数 & GMV（按设备）
  const orderStatsByDevice = await collectOrderStatsByDevice(
    appid,
    startTime,
    endTime
  );

  // 3. 活跃 / 拦截 / 成功 UV（从 v11-app-logs 获取）
  const { activeUvByDevice, interceptUvByDevice, successUvByDevice } =
    await collectSlsUvByDevice(appid, startTime, endTime);

  // 4. 汇总所有出现过的设备端
  const allDevices = new Set<DeviceKey>();
  Object.keys(registerUvByDevice).forEach(d => allDevices.add(d));
  orderStatsByDevice.forEach((_, d) => allDevices.add(d));

  if (allDevices.size === 0) {
    // 没有任何数据时，仍然为默认设备写一行，便于后续校验
    allDevices.add('web');
  }

  let successCount = 0;
  let errorCount = 0;

  for (const device of allDevices) {
    const register_uv = registerUvByDevice[device] || 0;
    const orderStats = orderStatsByDevice.get(device);

    const order_count = orderStats?.order_count || 0;
    // gmv 字段是 Decimal(10,2)，这里使用元为单位写入（订单库 amount 为分）
    const gmv = orderStats?.gmv ? Math.round(orderStats.gmv) / 100 : 0;

    const active_uv = activeUvByDevice[device] || 0;
    const intercept_uv = interceptUvByDevice[device] || 0;
    const success_uv = successUvByDevice[device] || 0;

    const repDateStr = dayjs(statDate).startOf('day').toDate();

    try {
      await prisma.biProductDailyEntity.upsert({
        where: {
          appid_date_device: {
            appid,
            date: repDateStr,
            device,
          },
        },
        update: {
          register_uv,
          active_uv,
          intercept_uv,
          success_uv,
          order_count,
          gmv,
          update_time: new Date(),
        },
        create: {
          appid,
          date: repDateStr,
          device,
          register_uv,
          active_uv,
          intercept_uv,
          success_uv,
          order_count,
          gmv,
        },
      });
      successCount++;
      // console.log(
      //   `  [${device}] 写入成功：register_uv=${register_uv}, active_uv=${active_uv}, intercept_uv=${intercept_uv}, success_uv=${success_uv}, order_count=${order_count}, gmv=${gmv}`
      // );
    } catch (e) {
      errorCount++;
      console.error(
        `  [${device}] 写入 BiProductDailyEntity 失败：`,
        (e as Error).message || e
      );
    }
  }

  console.log(
    `BiProductDailyEntity 统计完成，appid=${appid}，日期=${dateStr}，成功=${successCount}，失败=${errorCount}`
  );
}

/**
 * CLI 入口：
 * - 使用方式：
 *   - 显式指定：pnpm run:job jiantie/2026/dwd_bi_product <appid> [YYYY-MM-DD]
 *     - 例如：node dwd_bi_product.js jiantie 2026-01-01
 *   - 不传任何参数：默认跑最近 7 天，appid 为 jiantie 和 maka
 */
async function runDefaultLast7Days() {
  // 默认 appid 列表
  const appids = ['jiantie', 'maka', 'wenzy', 'preschool', 'gov'];

  // 以今天为基准，统计最近 7 天（含今天）
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const appid of appids) {
    for (let i = 30; i >= 0; i--) {
      const d = dayjs(today).subtract(i, 'day');
      const dateStr = d.format('YYYY-MM-DD');

      console.log(
        `默认任务：开始统计 BiProductDailyEntity，appid=${appid}，日期=${dateStr}`
      );
      await statBiProductDaily(appid, dateStr);
    }
  }
}

async function main() {
  try {
    const appid = process.argv[2];
    const dateArg = process.argv[3];

    // 没有任何参数时，默认跑近 7 天，appid 为 jiantie 和 maka
    if (!appid) {
      console.log(
        '未指定 appid，使用默认配置：appid = [jiantie, maka]，统计最近 7 天（含今天）'
      );
      await runDefaultLast7Days();
      process.exitCode = 0;
      return;
    }

    await statBiProductDaily(appid, dateArg);
    process.exitCode = 0;
  } catch (error) {
    console.error('执行 BiProductDaily 统计失败：', error);
    process.exitCode = 1;
  } finally {
    await closeAllConnections();
  }
}

// 如果直接运行此文件，执行主函数
if (require.main === module) {
  main();
}

// 导出给其他任务复用
export { statBiProductDaily };

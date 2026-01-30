//构建BiProductUserTypeDailyEntity的日统计函数
//数据源说明
//从db-connections.ts获取db
//入参为appid和日期
//排除innerUids
//1. 产品BI表日dwd表，包括appid，日期、端，注册UV、活跃UV、拦截UV、GMV、订单数、成功UV（所有人数指标均为UV口径）
//注册用户从usercenterDB的user表中获取，从user_reg_sources读取uid对应的端,注册时间为user的reg_date
//sls中有app_id和platform
//注册用户活跃uv从sls：v11-app-logs：v11-app-logs中获取，按uid去重获得uv

// 点击数据从sls：v11-app-logs：v11-app-logs中获取，event为click，object_type为template_item或者old_template_item
// 点击的数据需要进行一些前置处理，因为有一些点击事件是发生在用户登录前的，所以需要根据distinct_id来匹配补全uid
//创作第一个数据源则需要读取works_entity表，匹配uid
//创作第二个数据源从sls读取 object_type: 'v5workCreate' ，event：click，匹配uid

//拦截uv从sls：v11-app-logs：v11-app-logs中获取，page_type为vip_page_block，按uid去重获得uv
//成功uv从sls：v11-app-logs：v11-app-logs中获取，event为success，按uid去重获得uv
//订单和金额从orderDB的order表中获取

//用户类型口径：
//new_today: 当天注册的新用户（0-1天]
//new_month: 30天内至2天注册的新用户(1-30天]
//old: 30天外注册的用户(30天以上)

import dayjs from 'dayjs';
import { getEndOfDay, getStartOfDay, parseDate } from '../../utils/utils';
import {
  closeAllConnections,
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

// 获取数据库连接（单例）
const prisma = getPrisma();
const usercenterDB = getUsercenterDB();

type DeviceKey = string;
type UserType = 'new_today' | 'new_month' | 'old';

interface StatsByDeviceAndUserType {
  [device: string]: Record<UserType, number>;
}

interface PvUvStatsByDeviceAndUserType {
  [device: string]: Record<
    UserType,
    {
      pv: number;
      uv: Set<number>;
    }
  >;
}

interface OrderStats {
  order_count: number;
  gmv: number;
}

interface OrderStatsByDeviceAndUserType {
  [device: string]: Record<UserType, OrderStats>;
}

/**
 * 从 SLS 建立 distinct_id 到 uid 的映射
 * 查询所有有 uid 的事件来建立映射关系
 */
async function buildDistinctIdToUidMap(
  appid: string,
  startTime: Date,
  endTime: Date
): Promise<Map<string, number>> {
  const from = dayjs(startTime).unix();
  const to = dayjs(endTime).unix();

  // 查询所有有 uid 的事件，建立 distinct_id 到 uid 的映射
  const mappingQuery = `app_id: "${appid}" and uid: * | SELECT distinct_id, uid LIMIT 100000`;
  const mappingLogs = await queryV11SlsLogs({
    query: mappingQuery,
    from,
    to,
  });

  const distinctIdToUid = new Map<string, number>();

  for (const { raw } of mappingLogs) {
    const distinctId = raw.distinct_id ? String(raw.distinct_id) : null;
    const uid = raw.uid ? Number(raw.uid) : null;

    if (distinctId && uid && !innerUids.includes(uid)) {
      // 如果同一个 distinct_id 有多个 uid，取第一个非空的
      if (!distinctIdToUid.has(distinctId)) {
        distinctIdToUid.set(distinctId, uid);
      }
    }
  }

  console.log(
    `建立了 ${distinctIdToUid.size} 个 distinct_id 到 uid 的映射关系`
  );

  return distinctIdToUid;
}

/**
 * 判断用户类型
 * new_today: 当天注册的新用户（0-1天]
 * new_month: 30天内至2天注册的新用户(1-30天]
 * old: 30天外注册的用户(30天以上)
 */
function getUserType(
  uid: number,
  registerDateMap: Map<number, Date>,
  targetDate: Date
): UserType {
  const registerDate = registerDateMap.get(uid);
  if (!registerDate) {
    // 如果没有注册日期，默认为老用户
    return 'old';
  }

  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  const regDate = new Date(registerDate);
  regDate.setHours(0, 0, 0, 0);

  // 计算注册日期距离目标日期的天数差
  const diffDays = Math.floor(
    (target.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // new_today: 当天注册（0-1天]，即diffDays = 0
  if (diffDays === 0) {
    return 'new_today';
  }

  // new_month: 30天内至2天注册(1-30天]，即diffDays在2到30之间（包含2和30）
  if (diffDays >= 2 && diffDays <= 30) {
    return 'new_month';
  }

  // old: 30天外注册的用户(30天以上)，即diffDays > 30，或者diffDays = 1的情况也归为old
  // 因为new_month是(1-30]，不包括1，所以1天的情况归为old
  return 'old';
}

/**
 * 统计某天的注册UV（按设备、用户类型分组）
 */
async function collectRegisterUvByDeviceAndUserType(
  appid: string,
  targetDate: Date
): Promise<StatsByDeviceAndUserType> {
  const stats: StatsByDeviceAndUserType = {};

  const startTime = getStartOfDay(targetDate);
  const endTime = getEndOfDay(targetDate);

  // 1. 找出当日注册且非内部账号的用户 uid
  const users = await usercenterDB('users')
    .where('appid', appid)
    .whereBetween('reg_date', [startTime, endTime])
    .select('uid', 'reg_date');

  if (!users.length) {
    return stats;
  }

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

  // 3. 按设备和用户类型聚合 UV（当日注册的都是新用户）
  for (const user of users as any[]) {
    const uid = user.uid as number;
    if (innerUids.includes(uid)) continue;

    const device = uidToDevice.get(uid) || 'other';
    if (!stats[device]) {
      stats[device] = { new_today: 0, new_month: 0, old: 0 };
    }
    stats[device]!.new_today += 1;
  }

  return stats;
}

/**
 * 从 SLS 获取活跃UV（按设备、用户类型分组）
 * 活跃UV：所有事件中出现过的 uid
 */
async function collectActiveUvByDeviceAndUserType(
  appid: string,
  startTime: Date,
  endTime: Date,
  registerDateMap: Map<number, Date>,
  targetDate: Date
): Promise<StatsByDeviceAndUserType> {
  const from = dayjs(startTime).unix();
  const to = dayjs(endTime).unix();

  // 先建立 distinct_id 到 uid 的映射（用于补全登录前的活跃事件）
  const distinctIdToUid = await buildDistinctIdToUidMap(
    appid,
    startTime,
    endTime
  );

  const activeQuery = `app_id: "${appid}" | SELECT platform, distinct_id, uid LIMIT 100000`;
  const activeLogs = await queryV11SlsLogs({ query: activeQuery, from, to });

  const stats: StatsByDeviceAndUserType = {};
  const uidSetByDevice = new Map<DeviceKey, Set<number>>();

  for (const { raw } of activeLogs) {
    // 优先使用原始 uid，如果没有则通过 distinct_id 匹配补全
    let uid = raw.uid ? Number(raw.uid) : null;

    // 如果 uid 为空，尝试通过 distinct_id 匹配
    if (!uid && raw.distinct_id) {
      const distinctId = String(raw.distinct_id);
      uid = distinctIdToUid.get(distinctId) || null;
    }

    if (!uid || innerUids.includes(uid)) {
      continue;
    }

    const device = normalizeDevice(
      String(raw.platform || raw.device || 'other')
    );

    if (!uidSetByDevice.has(device)) {
      uidSetByDevice.set(device, new Set<number>());
    }
    uidSetByDevice.get(device)!.add(uid);
  }

  // 按设备和用户类型聚合
  for (const [device, uidSet] of uidSetByDevice.entries()) {
    if (!stats[device]) {
      stats[device] = { new_today: 0, new_month: 0, old: 0 };
    }
    for (const uid of uidSet) {
      const userType = getUserType(uid, registerDateMap, targetDate);
      stats[device]![userType] += 1;
    }
  }

  return stats;
}

/**
 * 从 SLS 获取点击、拦截、成功的PV和UV（按设备、用户类型分组）
 */
async function collectSlsPvUvByDeviceAndUserType(
  appid: string,
  startTime: Date,
  endTime: Date,
  registerDateMap: Map<number, Date>,
  targetDate: Date
): Promise<{
  clickStats: PvUvStatsByDeviceAndUserType;
  interceptStats: PvUvStatsByDeviceAndUserType;
  successStats: PvUvStatsByDeviceAndUserType;
  creationStats: PvUvStatsByDeviceAndUserType;
}> {
  const from = dayjs(startTime).unix();
  const to = dayjs(endTime).unix();

  // 先建立 distinct_id 到 uid 的映射（用于补全登录前的点击事件）
  const distinctIdToUid = await buildDistinctIdToUidMap(
    appid,
    startTime,
    endTime
  );

  // 1. 点击：event为click，object_type为template_item或者old_template_item
  const clickQuery = `app_id: "${appid}" and event: "click" and (object_type: "template_item" or object_type: "old_template_item") | SELECT platform, distinct_id, uid LIMIT 100000`;

  // 2. 拦截：page_type为vip_page_block
  const interceptQuery = `app_id: "${appid}" and page_type: "vip_page_block" | SELECT platform, distinct_id, uid LIMIT 100000`;

  // 3. 成功：event为success
  const successQuery = `app_id: "${appid}" and event: "success" | SELECT platform, distinct_id, uid LIMIT 100000`;

  // 4. 创作：object_type: 'v5workCreate'，event：click
  const creationQuery = `app_id: "${appid}" and object_type: "v5workCreate" and event: "click" | SELECT platform, distinct_id, uid LIMIT 100000`;

  const [clickLogs, interceptLogs, successLogs, creationLogs] =
    await Promise.all([
      queryV11SlsLogs({ query: clickQuery, from, to }),
      queryV11SlsLogs({ query: interceptQuery, from, to }),
      queryV11SlsLogs({ query: successQuery, from, to }),
      queryV11SlsLogs({ query: creationQuery, from, to }),
    ]);

  const aggregatePvAndUv = (
    logs: { raw: Record<string, any> }[]
  ): PvUvStatsByDeviceAndUserType => {
    const result: PvUvStatsByDeviceAndUserType = {};

    for (const { raw } of logs) {
      // 优先使用原始 uid，如果没有则通过 distinct_id 匹配补全
      let uid = raw.uid ? Number(raw.uid) : null;

      // 如果 uid 为空，尝试通过 distinct_id 匹配
      if (!uid && raw.distinct_id) {
        const distinctId = String(raw.distinct_id);
        uid = distinctIdToUid.get(distinctId) || null;
      }

      if (!uid || innerUids.includes(uid)) {
        continue;
      }

      const device = normalizeDevice(
        String(raw.platform || raw.device || 'other')
      );
      const userType = getUserType(uid, registerDateMap, targetDate);

      if (!result[device]) {
        result[device] = {
          new_today: { pv: 0, uv: new Set() },
          new_month: { pv: 0, uv: new Set() },
          old: { pv: 0, uv: new Set() },
        };
      }

      // 统计PV
      result[device]![userType].pv += 1;

      // 统计UV
      result[device]![userType].uv.add(uid);
    }

    return result;
  };

  return {
    clickStats: aggregatePvAndUv(clickLogs),
    interceptStats: aggregatePvAndUv(interceptLogs),
    successStats: aggregatePvAndUv(successLogs),
    creationStats: aggregatePvAndUv(creationLogs),
  };
}

/**
 * 从 works_entity 获取创作PV和UV（第一个数据源）
 * 按设备、用户类型分组
 * PV = 作品数量，UV = 去重用户数
 */
async function collectWorksCreationPvUvByDeviceAndUserType(
  appid: string,
  startTime: Date,
  endTime: Date,
  registerDateMap: Map<number, Date>,
  targetDate: Date
): Promise<PvUvStatsByDeviceAndUserType> {
  const result: PvUvStatsByDeviceAndUserType = {};

  // 查询指定时间范围内创建的works
  const works = await prisma.worksEntity.findMany({
    where: {
      appid,
      create_time: {
        gte: startTime,
        lte: endTime,
      },
      deleted: false,
      uid: { notIn: innerUids },
    },
    select: {
      uid: true,
    },
  });

  if (!works.length) {
    return result;
  }

  const uids = Array.from(new Set(works.map(w => w.uid)));
  const deviceMap = await queryUserDevices(uids, { appids: [appid] });

  for (const work of works) {
    const rawDevice = deviceMap.get(work.uid) || 'other';
    const device = normalizeDevice(rawDevice);
    const userType = getUserType(work.uid, registerDateMap, targetDate);

    if (!result[device]) {
      result[device] = {
        new_today: { pv: 0, uv: new Set() },
        new_month: { pv: 0, uv: new Set() },
        old: { pv: 0, uv: new Set() },
      };
    }

    // 统计PV（作品数量）
    result[device]![userType].pv += 1;

    // 统计UV
    result[device]![userType].uv.add(work.uid);
  }

  return result;
}

/**
 * 合并两个创作数据源的PV和UV
 */
function mergeCreationStats(
  stats1: PvUvStatsByDeviceAndUserType,
  stats2: PvUvStatsByDeviceAndUserType
): PvUvStatsByDeviceAndUserType {
  const result: PvUvStatsByDeviceAndUserType = {};

  // 合并第一个数据源
  for (const [device, userTypeMap] of Object.entries(stats1)) {
    if (!result[device]) {
      result[device] = {
        new_today: { pv: 0, uv: new Set() },
        new_month: { pv: 0, uv: new Set() },
        old: { pv: 0, uv: new Set() },
      };
    }
    for (const [userType, stats] of Object.entries(userTypeMap)) {
      const typedStats = stats as { pv: number; uv: Set<number> };
      result[device]![userType as UserType].pv += typedStats.pv;
      for (const uid of typedStats.uv) {
        result[device]![userType as UserType].uv.add(uid);
      }
    }
  }

  // 合并第二个数据源
  for (const [device, userTypeMap] of Object.entries(stats2)) {
    if (!result[device]) {
      result[device] = {
        new_today: { pv: 0, uv: new Set() },
        new_month: { pv: 0, uv: new Set() },
        old: { pv: 0, uv: new Set() },
      };
    }
    for (const [userType, stats] of Object.entries(userTypeMap)) {
      const typedStats = stats as { pv: number; uv: Set<number> };
      result[device]![userType as UserType].pv += typedStats.pv;
      for (const uid of typedStats.uv) {
        result[device]![userType as UserType].uv.add(uid);
      }
    }
  }

  return result;
}

/**
 * 统计某天的订单数和GMV（按设备、用户类型分组）
 */
async function collectOrderStatsByDeviceAndUserType(
  appid: string,
  startTime: Date,
  endTime: Date,
  registerDateMap: Map<number, Date>,
  targetDate: Date
): Promise<OrderStatsByDeviceAndUserType> {
  const orders = await queryOrdersByDateRange(startTime, endTime, {
    appids: [appid],
    orderStatus: 'paid',
    useCreatedAt: false, // 使用 paid_at
  });

  const stats: OrderStatsByDeviceAndUserType = {};

  if (!orders.length) {
    return stats;
  }

  const uids = Array.from(
    new Set(orders.map(o => o.uid).filter(uid => !innerUids.includes(uid)))
  );

  const deviceMap = await queryUserDevices(uids, { appids: [appid] });

  for (const order of orders) {
    if (innerUids.includes(order.uid)) continue;

    const rawDevice = deviceMap.get(order.uid) || 'other';
    const device = normalizeDevice(rawDevice);
    const userType = getUserType(order.uid, registerDateMap, targetDate);

    if (!stats[device]) {
      stats[device] = {
        new_today: { order_count: 0, gmv: 0 },
        new_month: { order_count: 0, gmv: 0 },
        old: { order_count: 0, gmv: 0 },
      };
    }

    const orderStats = stats[device]![userType];
    orderStats.order_count += 1;
    orderStats.gmv += Number(order.amount) || 0;
  }

  return stats;
}

/**
 * 获取所有用户的注册日期映射
 */
async function getRegisterDateMap(
  appid: string,
  uids: number[]
): Promise<Map<number, Date>> {
  if (uids.length === 0) {
    return new Map();
  }

  const users = await usercenterDB('users')
    .where('appid', appid)
    .whereIn('uid', uids)
    .select('uid', 'reg_date');

  const registerDateMap = new Map<number, Date>();
  for (const user of users as any[]) {
    if (user.reg_date) {
      registerDateMap.set(user.uid, new Date(user.reg_date));
    }
  }

  return registerDateMap;
}

/**
 * 统计某天的产品BI数据（按 appid + 日期 + 设备 + 用户类型）
 */
async function statBiProductUserTypeDaily(
  appid: string,
  targetDate?: string
): Promise<void> {
  if (!appid) {
    throw new Error('appid 不能为空');
  }

  const date = parseDate(targetDate);
  const startTime = getStartOfDay(date);
  const endTime = getEndOfDay(date);
  const dateStr = dayjs(date).format('YYYY-MM-DD');

  // BiProductUserTypeDailyEntity 中的 date 是 Date 类型（不含时间），统一归一到 00:00:00
  const statDate = new Date(date);
  statDate.setHours(0, 0, 0, 0);

  console.log(
    `开始统计 BiProductUserTypeDailyEntity，appid=${appid}，日期=${dateStr}，时间范围=${dayjs(startTime).toISOString()} ~ ${dayjs(endTime).toISOString()}`
  );

  // 1. 获取所有需要统计的用户uid（从注册、订单、SLS行为中收集）
  const registerUsers = await usercenterDB('users')
    .where('appid', appid)
    .whereBetween('reg_date', [startTime, endTime])
    .select('uid');

  const registerUids = Array.from(
    new Set(
      registerUsers
        .map((u: any) => u.uid as number)
        .filter(uid => !innerUids.includes(uid))
    )
  );

  // 从订单获取uid
  const orders = await queryOrdersByDateRange(startTime, endTime, {
    appids: [appid],
    orderStatus: 'paid',
    useCreatedAt: false,
  });
  const orderUids = Array.from(
    new Set(orders.map(o => o.uid).filter(uid => !innerUids.includes(uid)))
  );

  // 从SLS获取有行为的用户uid
  const from = dayjs(startTime).unix();
  const to = dayjs(endTime).unix();
  const behaviorQuery = `app_id: "${appid}" | SELECT uid LIMIT 100000`;
  const behaviorLogs = await queryV11SlsLogs({
    query: behaviorQuery,
    from,
    to,
  });
  const behaviorUids = Array.from(
    new Set(
      behaviorLogs
        .map(log => {
          const uid = log.raw.uid ? Number(log.raw.uid) : null;
          return uid && !innerUids.includes(uid) ? uid : null;
        })
        .filter((uid): uid is number => uid !== null)
    )
  );

  // 合并所有uid
  const allUids = Array.from(
    new Set([...registerUids, ...orderUids, ...behaviorUids])
  );

  // 2. 获取所有用户的注册日期映射（用于判断新老用户）
  const registerDateMap = await getRegisterDateMap(appid, allUids);

  // 3. 统计注册UV（按设备、用户类型）
  const registerUvByDeviceAndUserType =
    await collectRegisterUvByDeviceAndUserType(appid, statDate);

  // 4. 统计活跃UV（按设备、用户类型）
  const activeUvByDeviceAndUserType = await collectActiveUvByDeviceAndUserType(
    appid,
    startTime,
    endTime,
    registerDateMap,
    statDate
  );

  // 5. 统计SLS相关PV和UV（点击、拦截、成功、创作）
  const {
    clickStats,
    interceptStats,
    successStats,
    creationStats: slsCreationStats,
  } = await collectSlsPvUvByDeviceAndUserType(
    appid,
    startTime,
    endTime,
    registerDateMap,
    statDate
  );

  // 6. 统计works创作PV和UV（第一个数据源）
  const worksCreationStats = await collectWorksCreationPvUvByDeviceAndUserType(
    appid,
    startTime,
    endTime,
    registerDateMap,
    statDate
  );

  // 7. 合并创作PV和UV（两个数据源）
  const allCreationStats = mergeCreationStats(
    worksCreationStats,
    slsCreationStats
  );

  // 8. 统计订单数据（按设备、用户类型）
  const orderStatsByDeviceAndUserType =
    await collectOrderStatsByDeviceAndUserType(
      appid,
      startTime,
      endTime,
      registerDateMap,
      statDate
    );

  // 9. 汇总所有出现过的设备和用户类型
  const allDevices = new Set<DeviceKey>();
  const allUserTypes: UserType[] = ['new_today', 'new_month', 'old'];

  // 收集所有设备
  Object.keys(registerUvByDeviceAndUserType).forEach(d => allDevices.add(d));
  Object.keys(activeUvByDeviceAndUserType).forEach(d => allDevices.add(d));
  Object.keys(clickStats).forEach(d => allDevices.add(d));
  Object.keys(interceptStats).forEach(d => allDevices.add(d));
  Object.keys(successStats).forEach(d => allDevices.add(d));
  Object.keys(allCreationStats).forEach(d => allDevices.add(d));
  Object.keys(orderStatsByDeviceAndUserType).forEach(d => allDevices.add(d));

  if (allDevices.size === 0) {
    allDevices.add('web');
  }

  let successCount = 0;
  let errorCount = 0;

  // 10. 写入数据库
  for (const device of allDevices) {
    for (const userType of allUserTypes) {
      const register_uv =
        registerUvByDeviceAndUserType[device]?.[userType] || 0;
      const active_uv = activeUvByDeviceAndUserType[device]?.[userType] || 0;

      const click_pv = clickStats[device]?.[userType]?.pv || 0;
      const click_uv = clickStats[device]?.[userType]?.uv.size || 0;

      const intercept_pv = interceptStats[device]?.[userType]?.pv || 0;
      const intercept_uv = interceptStats[device]?.[userType]?.uv.size || 0;

      const success_pv = successStats[device]?.[userType]?.pv || 0;
      const success_uv = successStats[device]?.[userType]?.uv.size || 0;

      const creation_pv = allCreationStats[device]?.[userType]?.pv || 0;
      const creation_uv = allCreationStats[device]?.[userType]?.uv.size || 0;

      const orderStats = orderStatsByDeviceAndUserType[device]?.[userType];
      const order_count = orderStats?.order_count || 0;
      // gmv 字段是 Decimal(10,2)，这里使用元为单位写入（订单库 amount 为分）
      const gmv = orderStats?.gmv ? Math.round(orderStats.gmv) / 100 : 0;

      const repDateStr = dayjs(statDate).startOf('day').toDate();

      try {
        await prisma.biProductUserTypeDailyEntity.upsert({
          where: {
            appid_date_device_user_type: {
              appid,
              date: repDateStr,
              device,
              user_type: userType,
            },
          },
          update: {
            register_uv,
            active_uv,
            click_pv,
            click_uv,
            creation_pv,
            creation_uv,
            success_pv,
            success_uv,
            intercept_pv,
            intercept_uv,
            order_count,
            gmv,
            update_time: new Date(),
          },
          create: {
            appid,
            date: repDateStr,
            device,
            user_type: userType,
            register_uv,
            active_uv,
            click_pv,
            click_uv,
            creation_pv,
            creation_uv,
            success_pv,
            success_uv,
            intercept_pv,
            intercept_uv,
            order_count,
            gmv,
          },
        });
        successCount++;
        // console.log(
        //   `  [${device}/${userType}] 写入成功：register_uv=${register_uv}, active_uv=${active_uv}, click_uv=${click_uv}, intercept_uv=${intercept_uv}, success_uv=${success_uv}, creation_uv=${creation_uv}, order_count=${order_count}, gmv=${gmv}`
        // );
      } catch (e) {
        errorCount++;
        console.error(
          `  [${device}/${userType}] 写入 BiProductUserTypeDailyEntity 失败：`,
          (e as Error).message || e
        );
      }
    }
  }

  console.log(
    `BiProductUserTypeDailyEntity 统计完成，appid=${appid}，日期=${dateStr}，成功=${successCount}，失败=${errorCount}`
  );
}

/**
 * CLI 入口：
 * - 使用方式：
 *   - 显式指定：pnpm run:job jiantie/2026/dwd_bi_product_uni <appid> [YYYY-MM-DD]
 *     - 例如：node dwd_bi_product_uni.js jiantie 2026-01-01
 *   - 不传任何参数：默认跑最近 3 天，appid 为 jiantie 和 maka
 */
async function runDefaultLast3Days() {
  const appids = ['jiantie', 'maka', 'wenzy', 'preschool', 'gov'];

  const today = dayjs().startOf('day').toDate();

  for (const appid of appids) {
    for (let i = 30; i >= 0; i--) {
      const d = dayjs(today).subtract(i, 'day');
      const dateStr = d.format('YYYY-MM-DD');

      console.log(
        `默认任务：开始统计 BiProductUserTypeDailyEntity，appid=${appid}，日期=${dateStr}`
      );
      await statBiProductUserTypeDaily(appid, dateStr);
    }
  }
}

async function main() {
  try {
    const appid = process.argv[2];
    const dateArg = process.argv[3];

    // 没有任何参数时，默认跑近 3 天
    if (!appid) {
      console.log(
        '未指定 appid，使用默认配置：appid = [jiantie, maka, wenzy, preschool, gov]，统计最近 3 天（含今天）'
      );
      await runDefaultLast3Days();
      process.exitCode = 0;
      return;
    }

    await statBiProductUserTypeDaily(appid, dateArg);
    process.exitCode = 0;
  } catch (error) {
    console.error('执行 BiProductUserTypeDaily 统计失败：', error);
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
export { statBiProductUserTypeDaily };

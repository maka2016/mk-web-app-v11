//构建BiAbtestDailyEntity的日统计函数
//数据源说明
//从db-connections.ts获取db
//入参为appid和日期
//排除innerUids
//按appid、端、uid单双号、日期统计
//新增UV：从usercenterDB的user表中获取，从user_reg_sources读取uid对应的端
//当天活跃口径：当天点击uv、当天拦截uv、当天创作uv、当天成功uv、当天订单量、当天成交金额gmv（所有活跃用户）
//当天新用户生命周期口径：当天点击uv、当天拦截uv、当天创作uv、当天成功uv、当天订单量、当天成交金额gmv（目标日期注册的新用户）
//3天新用户生命周期口径：3天点击uv、3天拦截uv、3天创作uv、3天成功uv、3天订单量、3天成交金额gmv（目标日期注册的新用户在注册后3天内）
//7天新用户生命周期口径：7天点击uv、7天拦截uv、7天创作uv、7天成功uv、7天订单量、7天成交金额gmv（目标日期注册的新用户在注册后7天内）

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
import { buildDistinctIdToUidMap } from '../../utils/distinctIdToUid';

// 获取数据库连接（单例）
const prisma = getPrisma();
const usercenterDB = getUsercenterDB();

type DeviceKey = string;
type UidParity = 'odd' | 'even';

/**
 * 获取uid的单双号
 */
function getUidParity(uid: number): UidParity {
  return uid % 2 === 0 ? 'even' : 'odd';
}

/**
 * 统计某天的注册UV（按设备、uid单双号分组）
 */
async function collectRegisterUvByDeviceAndParity(
  appid: string,
  targetDate: Date
): Promise<Map<DeviceKey, Map<UidParity, number>>> {
  const stats = new Map<DeviceKey, Map<UidParity, number>>();

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

  // 3. 按设备和uid单双号聚合 UV
  for (const uid of uids) {
    const device = uidToDevice.get(uid) || 'other';
    const parity = getUidParity(uid);

    if (!stats.has(device)) {
      stats.set(device, new Map<UidParity, number>());
    }
    const deviceStats = stats.get(device)!;
    deviceStats.set(parity, (deviceStats.get(parity) || 0) + 1);
  }

  return stats;
}

/**
 * 从 SLS 获取当天活跃口径的UV（按设备、uid单双号分组）
 * 活跃UV：所有事件中出现过的 uid
 */
async function collectActiveUvByDeviceAndParity(
  appid: string,
  startTime: Date,
  endTime: Date
): Promise<Map<DeviceKey, Map<UidParity, Set<number>>>> {
  const from = dayjs(startTime).unix();
  const to = dayjs(endTime).unix();

  // 先建立 distinct_id 到 uid 的映射
  const distinctIdToUid = await buildDistinctIdToUidMap(
    appid,
    startTime,
    endTime
  );

  const activeQuery = `app_id: "${appid}" | SELECT platform, distinct_id, uid LIMIT 100000`;
  const activeLogs = await queryV11SlsLogs({ query: activeQuery, from, to });

  const stats = new Map<DeviceKey, Map<UidParity, Set<number>>>();

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
    const parity = getUidParity(uid);

    if (!stats.has(device)) {
      stats.set(device, new Map<UidParity, Set<number>>());
    }
    const deviceStats = stats.get(device)!;
    if (!deviceStats.has(parity)) {
      deviceStats.set(parity, new Set<number>());
    }
    deviceStats.get(parity)!.add(uid);
  }

  return stats;
}

/**
 * 从 SLS 获取点击、拦截、创作、成功的UV（按设备、uid单双号分组）
 */
async function collectSlsUvByDeviceAndParity(
  appid: string,
  startTime: Date,
  endTime: Date
): Promise<{
  clickUv: Map<DeviceKey, Map<UidParity, Set<number>>>;
  interceptUv: Map<DeviceKey, Map<UidParity, Set<number>>>;
  creationUv: Map<DeviceKey, Map<UidParity, Set<number>>>;
  successUv: Map<DeviceKey, Map<UidParity, Set<number>>>;
}> {
  const from = dayjs(startTime).unix();
  const to = dayjs(endTime).unix();

  // 先建立 distinct_id 到 uid 的映射
  const distinctIdToUid = await buildDistinctIdToUidMap(
    appid,
    startTime,
    endTime
  );

  // 1. 点击：event为click，object_type为template_item或者old_template_item
  const clickQuery = `app_id: "${appid}" and event: "click" and (object_type: "template_item" or object_type: "old_template_item") | SELECT platform, distinct_id, uid LIMIT 100000`;

  // 2. 拦截：page_type为vip_page_block
  const interceptQuery = `app_id: "${appid}" and page_type: "vip_page_block" | SELECT platform, distinct_id, uid LIMIT 100000`;

  // 3. 创作：object_type: 'v5workCreate'，event：click
  const creationQuery = `app_id: "${appid}" and object_type: "v5workCreate" and event: "click" | SELECT platform, distinct_id, uid LIMIT 100000`;

  // 4. 成功：event为success
  const successQuery = `app_id: "${appid}" and event: "success" | SELECT platform, distinct_id, uid LIMIT 100000`;

  // 使用 Promise.allSettled 确保单个查询失败不影响其他查询
  const [clickResult, interceptResult, creationResult, successResult] =
    await Promise.allSettled([
      queryV11SlsLogs({ query: clickQuery, from, to }),
      queryV11SlsLogs({ query: interceptQuery, from, to }),
      queryV11SlsLogs({ query: creationQuery, from, to }),
      queryV11SlsLogs({ query: successQuery, from, to }),
    ]);

  // 处理查询结果，失败时返回空数组并记录错误
  const clickLogs = clickResult.status === 'fulfilled' ? clickResult.value : [];
  const interceptLogs =
    interceptResult.status === 'fulfilled' ? interceptResult.value : [];
  const creationLogs =
    creationResult.status === 'fulfilled' ? creationResult.value : [];
  const successLogs =
    successResult.status === 'fulfilled' ? successResult.value : [];

  // 记录失败的查询
  if (clickResult.status === 'rejected') {
    console.error('查询点击日志失败:', clickResult.reason);
  }
  if (interceptResult.status === 'rejected') {
    console.error('查询拦截日志失败:', interceptResult.reason);
  }
  if (creationResult.status === 'rejected') {
    console.error('查询创作日志失败:', creationResult.reason);
  }
  if (successResult.status === 'rejected') {
    console.error('查询成功日志失败:', successResult.reason);
  }

  const aggregateUv = (
    logs: { raw: Record<string, any> }[]
  ): Map<DeviceKey, Map<UidParity, Set<number>>> => {
    const result = new Map<DeviceKey, Map<UidParity, Set<number>>>();

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
      const parity = getUidParity(uid);

      if (!result.has(device)) {
        result.set(device, new Map<UidParity, Set<number>>());
      }
      const deviceStats = result.get(device)!;
      if (!deviceStats.has(parity)) {
        deviceStats.set(parity, new Set<number>());
      }
      deviceStats.get(parity)!.add(uid);
    }

    return result;
  };

  return {
    clickUv: aggregateUv(clickLogs),
    interceptUv: aggregateUv(interceptLogs),
    creationUv: aggregateUv(creationLogs),
    successUv: aggregateUv(successLogs),
  };
}

/**
 * 从 works_entity 获取创作UV（第一个数据源）
 * 按设备、uid单双号分组
 */
async function collectWorksCreationUvByDeviceAndParity(
  appid: string,
  startTime: Date,
  endTime: Date
): Promise<Map<DeviceKey, Map<UidParity, Set<number>>>> {
  const result = new Map<DeviceKey, Map<UidParity, Set<number>>>();

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

  // 按设备和uid单双号聚合UV
  for (const work of works) {
    const uid = work.uid;
    if (innerUids.includes(uid)) continue;

    const rawDevice = deviceMap.get(uid) || 'other';
    const device = normalizeDevice(rawDevice);
    const parity = getUidParity(uid);

    if (!result.has(device)) {
      result.set(device, new Map<UidParity, Set<number>>());
    }
    const deviceStats = result.get(device)!;
    if (!deviceStats.has(parity)) {
      deviceStats.set(parity, new Set<number>());
    }
    deviceStats.get(parity)!.add(uid);
  }

  return result;
}

/**
 * 合并创作UV（两个数据源）
 */
function mergeCreationUv(
  stats1: Map<DeviceKey, Map<UidParity, Set<number>>>,
  stats2: Map<DeviceKey, Map<UidParity, Set<number>>>
): Map<DeviceKey, Map<UidParity, Set<number>>> {
  const merged = new Map<DeviceKey, Map<UidParity, Set<number>>>();

  // 合并两个数据源
  for (const [device, parityMap] of stats1.entries()) {
    if (!merged.has(device)) {
      merged.set(device, new Map<UidParity, Set<number>>());
    }
    const mergedParityMap = merged.get(device)!;
    for (const [parity, uidSet] of parityMap.entries()) {
      if (!mergedParityMap.has(parity)) {
        mergedParityMap.set(parity, new Set<number>());
      }
      for (const uid of uidSet) {
        mergedParityMap.get(parity)!.add(uid);
      }
    }
  }

  for (const [device, parityMap] of stats2.entries()) {
    if (!merged.has(device)) {
      merged.set(device, new Map<UidParity, Set<number>>());
    }
    const mergedParityMap = merged.get(device)!;
    for (const [parity, uidSet] of parityMap.entries()) {
      if (!mergedParityMap.has(parity)) {
        mergedParityMap.set(parity, new Set<number>());
      }
      for (const uid of uidSet) {
        mergedParityMap.get(parity)!.add(uid);
      }
    }
  }

  return merged;
}

/**
 * 统计订单数据（按设备、uid单双号分组）
 */
async function collectOrderStatsByDeviceAndParity(
  appid: string,
  startTime: Date,
  endTime: Date
): Promise<
  Map<DeviceKey, Map<UidParity, { order_count: number; gmv: number }>>
> {
  const orders = await queryOrdersByDateRange(startTime, endTime, {
    appids: [appid],
    orderStatus: 'paid',
    useCreatedAt: false,
  });

  const stats = new Map<
    DeviceKey,
    Map<UidParity, { order_count: number; gmv: number }>
  >();

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
    const parity = getUidParity(order.uid);

    if (!stats.has(device)) {
      stats.set(
        device,
        new Map<UidParity, { order_count: number; gmv: number }>()
      );
    }
    const deviceStats = stats.get(device)!;
    if (!deviceStats.has(parity)) {
      deviceStats.set(parity, { order_count: 0, gmv: 0 });
    }

    const parityStats = deviceStats.get(parity)!;
    parityStats.order_count += 1;
    parityStats.gmv += Number(order.amount) || 0;
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
 * 统计新用户生命周期内的行为（1天/3天/7天）
 * 只统计目标日期注册的新用户在注册后指定天数内的行为
 */
async function collectNewUserLifecycleStats(
  appid: string,
  targetDate: Date,
  lifecycleDays: 1 | 3 | 7
): Promise<{
  clickUv: Map<DeviceKey, Map<UidParity, Set<number>>>;
  interceptUv: Map<DeviceKey, Map<UidParity, Set<number>>>;
  creationUv: Map<DeviceKey, Map<UidParity, Set<number>>>;
  successUv: Map<DeviceKey, Map<UidParity, Set<number>>>;
  orderStats: Map<
    DeviceKey,
    Map<UidParity, { order_count: number; gmv: number }>
  >;
}> {
  const targetStartTime = getStartOfDay(targetDate);
  const targetEndTime = getEndOfDay(targetDate);

  // 获取目标日期注册的新用户
  const registerUsers = await usercenterDB('users')
    .where('appid', appid)
    .whereBetween('reg_date', [targetStartTime, targetEndTime])
    .select('uid', 'reg_date');

  const registerUids = Array.from(
    new Set(
      registerUsers
        .map((u: any) => u.uid as number)
        .filter(uid => !innerUids.includes(uid))
    )
  );

  if (registerUids.length === 0) {
    return {
      clickUv: new Map(),
      interceptUv: new Map(),
      creationUv: new Map(),
      successUv: new Map(),
      orderStats: new Map(),
    };
  }

  // 获取注册日期映射
  const registerDateMap = await getRegisterDateMap(appid, registerUids);
  const registerUidSet = new Set(registerUids);

  // 计算生命周期结束时间（注册日期 + lifecycleDays）
  const lifecycleEndTime = dayjs(targetDate)
    .add(lifecycleDays - 1, 'day')
    .endOf('day')
    .toDate();

  const startTime = targetStartTime;
  const endTime = lifecycleEndTime;

  // 从SLS获取行为数据
  const from = dayjs(startTime).unix();
  const to = dayjs(endTime).unix();

  const distinctIdToUid = await buildDistinctIdToUidMap(
    appid,
    startTime,
    endTime
  );

  // 1. 点击
  const clickQuery = `app_id: "${appid}" and event: "click" and (object_type: "template_item" or object_type: "old_template_item") | SELECT platform, distinct_id, uid, __time__ LIMIT 100000`;

  // 2. 拦截
  const interceptQuery = `app_id: "${appid}" and page_type: "vip_page_block" | SELECT platform, distinct_id, uid, __time__ LIMIT 100000`;

  // 3. 创作（SLS）
  const creationQuery = `app_id: "${appid}" and object_type: "v5workCreate" and event: "click" | SELECT platform, distinct_id, uid, __time__ LIMIT 100000`;

  // 4. 成功
  const successQuery = `app_id: "${appid}" and event: "success" | SELECT platform, distinct_id, uid, __time__ LIMIT 100000`;

  // 使用 Promise.allSettled 确保单个查询失败不影响其他查询
  const [clickResult, interceptResult, creationResult, successResult] =
    await Promise.allSettled([
      queryV11SlsLogs({ query: clickQuery, from, to }),
      queryV11SlsLogs({ query: interceptQuery, from, to }),
      queryV11SlsLogs({ query: creationQuery, from, to }),
      queryV11SlsLogs({ query: successQuery, from, to }),
    ]);

  // 处理查询结果，失败时返回空数组并记录错误
  const clickLogs = clickResult.status === 'fulfilled' ? clickResult.value : [];
  const interceptLogs =
    interceptResult.status === 'fulfilled' ? interceptResult.value : [];
  const creationLogs =
    creationResult.status === 'fulfilled' ? creationResult.value : [];
  const successLogs =
    successResult.status === 'fulfilled' ? successResult.value : [];

  // 记录失败的查询
  if (clickResult.status === 'rejected') {
    console.error('查询点击日志失败:', clickResult.reason);
  }
  if (interceptResult.status === 'rejected') {
    console.error('查询拦截日志失败:', interceptResult.reason);
  }
  if (creationResult.status === 'rejected') {
    console.error('查询创作日志失败:', creationResult.reason);
  }
  if (successResult.status === 'rejected') {
    console.error('查询成功日志失败:', successResult.reason);
  }

  // 从works获取创作数据
  const works = await prisma.worksEntity.findMany({
    where: {
      appid,
      create_time: {
        gte: startTime,
        lte: endTime,
      },
      deleted: false,
      uid: { in: registerUids },
    },
    select: {
      uid: true,
      create_time: true,
    },
  });

  // 获取订单数据
  const orders = await queryOrdersByDateRange(startTime, endTime, {
    appids: [appid],
    orderStatus: 'paid',
    useCreatedAt: false,
  });

  const filteredOrders = orders.filter(
    order => registerUidSet.has(order.uid) && !innerUids.includes(order.uid)
  );

  const deviceMap = await queryUserDevices(registerUids, { appids: [appid] });

  // 辅助函数：判断行为是否在生命周期内
  const isInLifecycle = (uid: number, behaviorTime: Date): boolean => {
    const regDate = registerDateMap.get(uid);
    if (!regDate) return false;

    const regDateStart = dayjs(regDate).startOf('day');
    const lifecycleEnd = regDateStart
      .add(lifecycleDays - 1, 'day')
      .endOf('day');
    const behaviorDate = dayjs(behaviorTime);

    return (
      behaviorDate.isAfter(regDateStart.subtract(1, 'second')) &&
      behaviorDate.isBefore(lifecycleEnd.add(1, 'second'))
    );
  };

  // 聚合函数
  const aggregateUv = (
    logs: { raw: Record<string, any> }[]
  ): Map<DeviceKey, Map<UidParity, Set<number>>> => {
    const result = new Map<DeviceKey, Map<UidParity, Set<number>>>();

    for (const { raw } of logs) {
      let uid = raw.uid ? Number(raw.uid) : null;

      if (!uid && raw.distinct_id) {
        const distinctId = String(raw.distinct_id);
        uid = distinctIdToUid.get(distinctId) || null;
      }

      if (!uid || !registerUidSet.has(uid) || innerUids.includes(uid)) {
        continue;
      }

      // 检查行为时间是否在生命周期内
      const behaviorTime = raw.__time__
        ? new Date(Number(raw.__time__) * 1000)
        : new Date();
      if (!isInLifecycle(uid, behaviorTime)) {
        continue;
      }

      const device = normalizeDevice(
        String(raw.platform || raw.device || 'other')
      );
      const parity = getUidParity(uid);

      if (!result.has(device)) {
        result.set(device, new Map<UidParity, Set<number>>());
      }
      const deviceStats = result.get(device)!;
      if (!deviceStats.has(parity)) {
        deviceStats.set(parity, new Set<number>());
      }
      deviceStats.get(parity)!.add(uid);
    }

    return result;
  };

  // 聚合works创作UV
  const aggregateWorksCreationUv = (): Map<
    DeviceKey,
    Map<UidParity, Set<number>>
  > => {
    const result = new Map<DeviceKey, Map<UidParity, Set<number>>>();

    for (const work of works) {
      const uid = work.uid;
      if (!isInLifecycle(uid, work.create_time)) {
        continue;
      }

      const rawDevice = deviceMap.get(uid) || 'other';
      const device = normalizeDevice(rawDevice);
      const parity = getUidParity(uid);

      if (!result.has(device)) {
        result.set(device, new Map<UidParity, Set<number>>());
      }
      const deviceStats = result.get(device)!;
      if (!deviceStats.has(parity)) {
        deviceStats.set(parity, new Set<number>());
      }
      deviceStats.get(parity)!.add(uid);
    }

    return result;
  };

  // 聚合订单数据
  const aggregateOrderStats = (): Map<
    DeviceKey,
    Map<UidParity, { order_count: number; gmv: number }>
  > => {
    const result = new Map<
      DeviceKey,
      Map<UidParity, { order_count: number; gmv: number }>
    >();

    for (const order of filteredOrders) {
      // 订单时间使用 created_at（由于useCreatedAt=false时已用paid_at过滤，这里用created_at作为近似值）
      const orderTime = order.created_at;
      if (!isInLifecycle(order.uid, orderTime)) {
        continue;
      }

      const rawDevice = deviceMap.get(order.uid) || 'other';
      const device = normalizeDevice(rawDevice);
      const parity = getUidParity(order.uid);

      if (!result.has(device)) {
        result.set(
          device,
          new Map<UidParity, { order_count: number; gmv: number }>()
        );
      }
      const deviceStats = result.get(device)!;
      if (!deviceStats.has(parity)) {
        deviceStats.set(parity, { order_count: 0, gmv: 0 });
      }

      const parityStats = deviceStats.get(parity)!;
      parityStats.order_count += 1;
      parityStats.gmv += Number(order.amount) || 0;
    }

    return result;
  };

  const slsCreationUv = aggregateUv(creationLogs);
  const worksCreationUv = aggregateWorksCreationUv();
  const mergedCreationUv = mergeCreationUv(slsCreationUv, worksCreationUv);

  return {
    clickUv: aggregateUv(clickLogs),
    interceptUv: aggregateUv(interceptLogs),
    creationUv: mergedCreationUv,
    successUv: aggregateUv(successLogs),
    orderStats: aggregateOrderStats(),
  };
}

/**
 * 统计某天的ABtest BI数据（按 appid + 日期 + 设备 + uid单双号）
 */
export async function statBiAbtestDaily(
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

  const statDate = dayjs(date).startOf('day').toDate();

  console.log(
    `开始统计 BiAbtestDailyEntity，appid=${appid}，日期=${dateStr}，时间范围=${dayjs(startTime).toISOString()} ~ ${dayjs(endTime).toISOString()}`
  );

  // 1. 统计新增UV（按设备、uid单双号）
  const registerUv = await collectRegisterUvByDeviceAndParity(appid, statDate);

  // 2. 统计当天活跃口径指标（所有活跃用户）
  const activeUv = await collectActiveUvByDeviceAndParity(
    appid,
    startTime,
    endTime
  );

  const {
    clickUv: activeClickUv,
    interceptUv: activeInterceptUv,
    creationUv: slsActiveCreationUv,
    successUv: activeSuccessUv,
  } = await collectSlsUvByDeviceAndParity(appid, startTime, endTime);

  const worksActiveCreationUv = await collectWorksCreationUvByDeviceAndParity(
    appid,
    startTime,
    endTime
  );
  const activeCreationUv = mergeCreationUv(
    slsActiveCreationUv,
    worksActiveCreationUv
  );

  const activeOrderStats = await collectOrderStatsByDeviceAndParity(
    appid,
    startTime,
    endTime
  );

  // 3. 统计1天新用户生命周期口径指标
  const lifecycle1d = await collectNewUserLifecycleStats(appid, statDate, 1);

  // 4. 统计3天新用户生命周期口径指标
  const lifecycle3d = await collectNewUserLifecycleStats(appid, statDate, 3);

  // 5. 统计7天新用户生命周期口径指标
  const lifecycle7d = await collectNewUserLifecycleStats(appid, statDate, 7);

  // 6. 汇总所有出现过的设备和uid单双号组合
  const allDevices = new Set<DeviceKey>();
  const allParities: UidParity[] = ['odd', 'even'];

  registerUv.forEach((_, device) => allDevices.add(device));
  activeUv.forEach((_, device) => allDevices.add(device));
  activeClickUv.forEach((_, device) => allDevices.add(device));
  activeInterceptUv.forEach((_, device) => allDevices.add(device));
  activeCreationUv.forEach((_, device) => allDevices.add(device));
  activeSuccessUv.forEach((_, device) => allDevices.add(device));
  activeOrderStats.forEach((_, device) => allDevices.add(device));
  lifecycle1d.clickUv.forEach((_, device) => allDevices.add(device));
  lifecycle3d.clickUv.forEach((_, device) => allDevices.add(device));
  lifecycle7d.clickUv.forEach((_, device) => allDevices.add(device));

  // 7. 写入数据库
  const recordsToUpsert: any[] = [];

  for (const device of allDevices) {
    for (const parity of allParities) {
      const registerUvCount = registerUv.get(device)?.get(parity) || 0;

      // 当天活跃口径指标
      const activeClickUvCount =
        activeClickUv.get(device)?.get(parity)?.size || 0;
      const activeInterceptUvCount =
        activeInterceptUv.get(device)?.get(parity)?.size || 0;
      const activeCreationUvCount =
        activeCreationUv.get(device)?.get(parity)?.size || 0;
      const activeSuccessUvCount =
        activeSuccessUv.get(device)?.get(parity)?.size || 0;
      const activeOrderCount =
        activeOrderStats.get(device)?.get(parity)?.order_count || 0;
      const activeGmv = activeOrderStats.get(device)?.get(parity)?.gmv || 0;

      // 1天新用户生命周期口径指标
      const clickUv1d = lifecycle1d.clickUv.get(device)?.get(parity)?.size || 0;
      const interceptUv1d =
        lifecycle1d.interceptUv.get(device)?.get(parity)?.size || 0;
      const creationUv1d =
        lifecycle1d.creationUv.get(device)?.get(parity)?.size || 0;
      const successUv1d =
        lifecycle1d.successUv.get(device)?.get(parity)?.size || 0;
      const orderCount1d =
        lifecycle1d.orderStats.get(device)?.get(parity)?.order_count || 0;
      const gmv1d = lifecycle1d.orderStats.get(device)?.get(parity)?.gmv || 0;

      // 3天新用户生命周期口径指标
      const clickUv3d = lifecycle3d.clickUv.get(device)?.get(parity)?.size || 0;
      const interceptUv3d =
        lifecycle3d.interceptUv.get(device)?.get(parity)?.size || 0;
      const creationUv3d =
        lifecycle3d.creationUv.get(device)?.get(parity)?.size || 0;
      const successUv3d =
        lifecycle3d.successUv.get(device)?.get(parity)?.size || 0;
      const orderCount3d =
        lifecycle3d.orderStats.get(device)?.get(parity)?.order_count || 0;
      const gmv3d = lifecycle3d.orderStats.get(device)?.get(parity)?.gmv || 0;

      // 7天新用户生命周期口径指标
      const clickUv7d = lifecycle7d.clickUv.get(device)?.get(parity)?.size || 0;
      const interceptUv7d =
        lifecycle7d.interceptUv.get(device)?.get(parity)?.size || 0;
      const creationUv7d =
        lifecycle7d.creationUv.get(device)?.get(parity)?.size || 0;
      const successUv7d =
        lifecycle7d.successUv.get(device)?.get(parity)?.size || 0;
      const orderCount7d =
        lifecycle7d.orderStats.get(device)?.get(parity)?.order_count || 0;
      const gmv7d = lifecycle7d.orderStats.get(device)?.get(parity)?.gmv || 0;

      recordsToUpsert.push({
        appid,
        device,
        uid_parity: parity,
        date: statDate,
        register_uv: registerUvCount,
        active_click_uv: activeClickUvCount,
        active_intercept_uv: activeInterceptUvCount,
        active_creation_uv: activeCreationUvCount,
        active_success_uv: activeSuccessUvCount,
        active_order_count: activeOrderCount,
        active_gmv: activeGmv,
        click_uv_1d: clickUv1d,
        intercept_uv_1d: interceptUv1d,
        creation_uv_1d: creationUv1d,
        success_uv_1d: successUv1d,
        order_count_1d: orderCount1d,
        gmv_1d: gmv1d,
        click_uv_3d: clickUv3d,
        intercept_uv_3d: interceptUv3d,
        creation_uv_3d: creationUv3d,
        success_uv_3d: successUv3d,
        order_count_3d: orderCount3d,
        gmv_3d: gmv3d,
        click_uv_7d: clickUv7d,
        intercept_uv_7d: interceptUv7d,
        creation_uv_7d: creationUv7d,
        success_uv_7d: successUv7d,
        order_count_7d: orderCount7d,
        gmv_7d: gmv7d,
      });
    }
  }

  // 批量upsert
  for (const record of recordsToUpsert) {
    await prisma.biAbtestDailyEntity.upsert({
      where: {
        appid_device_uid_parity_date: {
          appid: record.appid,
          device: record.device,
          uid_parity: record.uid_parity,
          date: record.date,
        },
      },
      update: record,
      create: record,
    });
  }

  console.log(
    `完成统计 BiAbtestDailyEntity，appid=${appid}，日期=${dateStr}，共写入 ${recordsToUpsert.length} 条记录`
  );
}

// 如果直接运行此文件，执行主函数（用于测试）
if (require.main === module) {
  (async () => {
    try {
      const appid = process.argv[2] || 'maka';
      const date = process.argv[3];
      await statBiAbtestDaily(appid, date);
      await closeAllConnections();
      process.exit(0);
    } catch (error) {
      console.error('执行失败:', error);
      await closeAllConnections();
      process.exit(1);
    }
  })();
}

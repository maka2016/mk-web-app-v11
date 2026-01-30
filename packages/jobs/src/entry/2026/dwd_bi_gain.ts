//渠道获客数据channel_bi_daily_entity
//按日分端分渠道统计获客情况和他们的行为情况
//数据源说明
//从db-connections.ts获取db
//入参为appid和日期
//排除innerUids

//注册用户从usercenterDB的user表中获取，从user_reg_sources读取uid对应的端

//用户渠道
// 1、makaplatv4.promotion_events 表：广告事件，channel 作为 渠道
// 2、ad_conversion_event_entity 表：查询 event='register' 且 report_status='success' 的记录，使用 platform 字段值作为 渠道
//没有则计为自然渠道

//成功uv从sls：v11-app-logs：v11-app-logs中获取，匹配uid，event为click，object_type为template_item或者old_template_item
//拦截uv从sls：v11-app-logs：v11-app-logs中获取，匹配uid，page_type为vip_page_block
//成功uv从sls：v11-app-logs：v11-app-logs中获取，匹配uid，event为success
// 按uid去重获得uv
//创作第一个数据源则需要读取works_entity表，匹配uid
//创作第二个数据源从sls读取 object_type: 'v5workCreate' ，event：click，匹配uid

//订单数据从orderDB中获取，匹配uid，时间则看order的updated_at

import dayjs from 'dayjs';
import { getEndOfDay, getStartOfDay, parseDate } from '../../utils/utils';
import {
  closeAllConnections,
  getMakaplatv4DB,
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
const makaplatv4DB = getMakaplatv4DB();

type DeviceKey = string;
type ChannelKey = string;

// 自然渠道标识
const NATURAL_CHANNEL = 'natural';

/**
 * 获取用户的渠道信息
 * 优先级：promotion_events > ad_conversion_event_entity > 自然渠道
 */
async function getUserChannels(uids: number[]): Promise<Map<number, string>> {
  const channelMap = new Map<number, string>();

  if (uids.length === 0) {
    return channelMap;
  }

  // 1. 从 promotion_event_conversions 和 promotion_events 获取渠道
  const conversions = await makaplatv4DB('promotion_event_conversions')
    .whereIn('uid', uids)
    .where('conversion_type', 'reg')
    .select('uid', 'event_id');

  if (conversions.length > 0) {
    const eventIds = Array.from(
      new Set(conversions.map((c: any) => c.event_id).filter(Boolean))
    );

    if (eventIds.length > 0) {
      const events = await makaplatv4DB('promotion_events')
        .whereIn('id', eventIds)
        .select('id', 'channel');

      const eventIdToChannel = new Map<number, string>();
      for (const e of events as any[]) {
        if (e.channel) {
          eventIdToChannel.set(e.id, e.channel);
        }
      }

      for (const c of conversions as any[]) {
        const channel = eventIdToChannel.get(c.event_id);
        if (channel && !channelMap.has(c.uid)) {
          channelMap.set(c.uid, channel);
        }
      }
    }
  }

  // 2. 从 ad_conversion_event_entity 获取渠道（event='register' 且 report_status='success'）
  const adEvents = await prisma.adConversionEventEntity.findMany({
    where: {
      uid: { in: uids },
      event: 'register',
      report_status: 'success',
      platform: { not: null },
    },
    select: {
      uid: true,
      platform: true,
    },
  });

  for (const event of adEvents) {
    if (event.platform && !channelMap.has(event.uid)) {
      channelMap.set(event.uid, event.platform);
    }
  }

  // 3. 没有渠道的用户标记为自然渠道
  for (const uid of uids) {
    if (!channelMap.has(uid)) {
      channelMap.set(uid, NATURAL_CHANNEL);
    }
  }

  return channelMap;
}

/**
 * 统计某天的注册UV（按渠道、设备分组）
 */
async function collectRegisterUvByChannelAndDevice(
  appid: string,
  targetDate: Date
): Promise<Map<ChannelKey, Map<DeviceKey, number>>> {
  const stats = new Map<ChannelKey, Map<DeviceKey, number>>();

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

  // 2. 获取用户渠道信息
  const uidToChannel = await getUserChannels(uids);

  // 3. 查注册来源表，获取每个 uid 的设备信息
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

  // 4. 按渠道和设备聚合 UV（按 uid 去重）
  const uidSetByChannelDevice = new Map<
    ChannelKey,
    Map<DeviceKey, Set<number>>
  >();

  for (const uid of uids) {
    const channel = uidToChannel.get(uid) || NATURAL_CHANNEL;
    const device = uidToDevice.get(uid) || 'other';

    if (!uidSetByChannelDevice.has(channel)) {
      uidSetByChannelDevice.set(channel, new Map<DeviceKey, Set<number>>());
    }
    const channelStats = uidSetByChannelDevice.get(channel)!;

    if (!channelStats.has(device)) {
      channelStats.set(device, new Set<number>());
    }
    channelStats.get(device)!.add(uid);
  }

  // 转换为计数
  const result = new Map<ChannelKey, Map<DeviceKey, number>>();
  for (const [channel, deviceMap] of uidSetByChannelDevice.entries()) {
    const countMap = new Map<DeviceKey, number>();
    for (const [device, uidSet] of deviceMap.entries()) {
      countMap.set(device, uidSet.size);
    }
    result.set(channel, countMap);
  }

  return result;
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
 * 从 SLS 获取点击、拦截、成功、创作的PV和UV
 * 按渠道、设备分组
 */
async function collectSlsUvByChannelAndDevice(
  appid: string,
  startTime: Date,
  endTime: Date,
  uidToChannel: Map<number, string>,
  allowedUids?: Set<number>
): Promise<{
  clickUvByChannelDevice: Map<ChannelKey, Map<DeviceKey, Set<number>>>;
  clickPvByChannelDevice: Map<ChannelKey, Map<DeviceKey, number>>;
  interceptUvByChannelDevice: Map<ChannelKey, Map<DeviceKey, Set<number>>>;
  interceptPvByChannelDevice: Map<ChannelKey, Map<DeviceKey, number>>;
  successUvByChannelDevice: Map<ChannelKey, Map<DeviceKey, Set<number>>>;
  successPvByChannelDevice: Map<ChannelKey, Map<DeviceKey, number>>;
  creationUvByChannelDevice: Map<ChannelKey, Map<DeviceKey, Set<number>>>;
  creationPvByChannelDevice: Map<ChannelKey, Map<DeviceKey, number>>;
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
  ): {
    uv: Map<ChannelKey, Map<DeviceKey, Set<number>>>;
    pv: Map<ChannelKey, Map<DeviceKey, number>>;
  } => {
    const uvResult = new Map<ChannelKey, Map<DeviceKey, Set<number>>>();
    const pvResult = new Map<ChannelKey, Map<DeviceKey, number>>();

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
      // 如果指定了允许的uid列表，只统计当日注册的用户
      if (allowedUids && !allowedUids.has(uid)) {
        continue;
      }

      const device = normalizeDevice(
        String(raw.platform || raw.device || 'other')
      );
      const channel = uidToChannel.get(uid) || NATURAL_CHANNEL;

      // 统计UV
      if (!uvResult.has(channel)) {
        uvResult.set(channel, new Map<DeviceKey, Set<number>>());
      }
      const channelUvMap = uvResult.get(channel)!;

      if (!channelUvMap.has(device)) {
        channelUvMap.set(device, new Set<number>());
      }
      channelUvMap.get(device)!.add(uid);

      // 统计PV
      if (!pvResult.has(channel)) {
        pvResult.set(channel, new Map<DeviceKey, number>());
      }
      const channelPvMap = pvResult.get(channel)!;

      if (!channelPvMap.has(device)) {
        channelPvMap.set(device, 0);
      }
      channelPvMap.set(device, channelPvMap.get(device)! + 1);
    }

    return { uv: uvResult, pv: pvResult };
  };

  const clickStats = aggregatePvAndUv(clickLogs);
  const interceptStats = aggregatePvAndUv(interceptLogs);
  const successStats = aggregatePvAndUv(successLogs);
  const creationStats = aggregatePvAndUv(creationLogs);

  return {
    clickUvByChannelDevice: clickStats.uv,
    clickPvByChannelDevice: clickStats.pv,
    interceptUvByChannelDevice: interceptStats.uv,
    interceptPvByChannelDevice: interceptStats.pv,
    successUvByChannelDevice: successStats.uv,
    successPvByChannelDevice: successStats.pv,
    creationUvByChannelDevice: creationStats.uv,
    creationPvByChannelDevice: creationStats.pv,
  };
}

/**
 * 从 works_entity 获取创作PV和UV（第一个数据源）
 * 按渠道、设备分组
 * PV = 作品数量，UV = 去重用户数
 */
async function collectWorksCreationUvByChannelAndDevice(
  appid: string,
  startTime: Date,
  endTime: Date,
  uidToChannel: Map<number, string>,
  allowedUids?: Set<number>
): Promise<{
  uv: Map<ChannelKey, Map<DeviceKey, Set<number>>>;
  pv: Map<ChannelKey, Map<DeviceKey, number>>;
}> {
  const uvResult = new Map<ChannelKey, Map<DeviceKey, Set<number>>>();
  const pvResult = new Map<ChannelKey, Map<DeviceKey, number>>();

  // 查询指定时间范围内创建的works
  // 如果指定了允许的uid列表，只统计当日注册的用户
  let allowedUidsArray: number[] | undefined;
  if (allowedUids && allowedUids.size > 0) {
    // 从允许的uid中排除innerUids
    allowedUidsArray = Array.from(allowedUids).filter(
      uid => !innerUids.includes(uid)
    );
  }

  const worksWhere: any = {
    appid,
    create_time: {
      gte: startTime,
      lte: endTime,
    },
    deleted: false,
    uid: allowedUidsArray ? { in: allowedUidsArray } : { notIn: innerUids },
  };

  const works = await prisma.worksEntity.findMany({
    where: worksWhere,
    select: {
      uid: true,
    },
  });

  if (!works.length) {
    return { uv: uvResult, pv: pvResult };
  }

  const uids = Array.from(new Set(works.map(w => w.uid)));
  const deviceMap = await queryUserDevices(uids, { appids: [appid] });

  for (const work of works) {
    const channel = uidToChannel.get(work.uid) || NATURAL_CHANNEL;
    const rawDevice = deviceMap.get(work.uid) || 'other';
    const device = normalizeDevice(rawDevice);

    // 统计UV
    if (!uvResult.has(channel)) {
      uvResult.set(channel, new Map<DeviceKey, Set<number>>());
    }
    const channelUvMap = uvResult.get(channel)!;

    if (!channelUvMap.has(device)) {
      channelUvMap.set(device, new Set<number>());
    }
    channelUvMap.get(device)!.add(work.uid);

    // 统计PV（作品数量）
    if (!pvResult.has(channel)) {
      pvResult.set(channel, new Map<DeviceKey, number>());
    }
    const channelPvMap = pvResult.get(channel)!;

    if (!channelPvMap.has(device)) {
      channelPvMap.set(device, 0);
    }
    channelPvMap.set(device, channelPvMap.get(device)! + 1);
  }

  return { uv: uvResult, pv: pvResult };
}

/**
 * 统计某天的订单数和GMV（按渠道、设备分组）
 */
async function collectOrderStatsByChannelAndDevice(
  appid: string,
  startTime: Date,
  endTime: Date,
  uidToChannel: Map<number, string>,
  allowedUids?: Set<number>
): Promise<
  Map<ChannelKey, Map<DeviceKey, { order_count: number; gmv: number }>>
> {
  const orders = await queryOrdersByDateRange(startTime, endTime, {
    appids: [appid],
    orderStatus: 'paid',
    useCreatedAt: false, // 使用 updated_at
  });

  const statsByChannelDevice = new Map<
    ChannelKey,
    Map<DeviceKey, { order_count: number; gmv: number }>
  >();

  if (!orders.length) {
    return statsByChannelDevice;
  }

  const uids = Array.from(
    new Set(orders.map(o => o.uid).filter(uid => !innerUids.includes(uid)))
  );

  const deviceMap = await queryUserDevices(uids, { appids: [appid] });

  for (const order of orders) {
    if (innerUids.includes(order.uid)) continue;
    // 如果指定了允许的uid列表，只统计当日注册的用户
    if (allowedUids && !allowedUids.has(order.uid)) {
      continue;
    }

    const channel = uidToChannel.get(order.uid) || NATURAL_CHANNEL;
    const rawDevice = deviceMap.get(order.uid) || 'other';
    const device = normalizeDevice(rawDevice);

    if (!statsByChannelDevice.has(channel)) {
      statsByChannelDevice.set(channel, new Map());
    }
    const channelStats = statsByChannelDevice.get(channel)!;

    if (!channelStats.has(device)) {
      channelStats.set(device, {
        order_count: 0,
        gmv: 0,
      });
    }

    const stats = channelStats.get(device)!;
    stats.order_count += 1;
    stats.gmv += Number(order.amount) || 0;
  }

  return statsByChannelDevice;
}

/**
 * 统计某天的渠道获客数据（按 appid + 日期 + 渠道 + 设备）
 */
async function statBiGainDaily(
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
    `开始统计 BiChannelDailyEntity，appid=${appid}，日期=${dateStr}，时间范围=${dayjs(startTime).toISOString()} ~ ${dayjs(endTime).toISOString()}`
  );

  // 1. 获取所有需要统计的用户uid（注册用户 + 有行为的用户）
  // 先获取注册用户
  const registerUsers = await usercenterDB('users')
    .where('appid', appid)
    .whereBetween('reg_date', [startTime, endTime])
    .select('uid');

  console.log('users长度', registerUsers.length);

  const registerUids = Array.from(
    new Set(
      registerUsers
        .map((u: any) => u.uid as number)
        .filter(uid => !innerUids.includes(uid))
    )
  );

  // 从SLS获取有行为的用户uid（用于获取渠道信息）
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
  const allUids = Array.from(new Set([...registerUids, ...behaviorUids]));

  // 2. 获取所有用户的渠道信息
  const uidToChannel = await getUserChannels(allUids);

  // 3. 统计注册UV（按渠道、设备）
  const registerUvByChannelDevice = await collectRegisterUvByChannelAndDevice(
    appid,
    statDate
  );

  // 创建当日注册uid的Set，用于限制创作、订单、行为统计
  const registerUidsSet = new Set(registerUids);

  // 4. 统计SLS相关PV和UV（按渠道、设备）- 只统计当日注册的用户
  const {
    clickUvByChannelDevice,
    clickPvByChannelDevice,
    interceptUvByChannelDevice,
    interceptPvByChannelDevice,
    successUvByChannelDevice,
    successPvByChannelDevice,
    creationUvByChannelDevice,
    creationPvByChannelDevice,
  } = await collectSlsUvByChannelAndDevice(
    appid,
    startTime,
    endTime,
    uidToChannel,
    registerUidsSet
  );

  // 5. 统计works创作PV和UV（第一个数据源）- 只统计当日注册的用户
  const worksCreationStats = await collectWorksCreationUvByChannelAndDevice(
    appid,
    startTime,
    endTime,
    uidToChannel,
    registerUidsSet
  );

  // 6. 合并创作UV和PV（两个数据源）
  const allCreationUvByChannelDevice = new Map<
    ChannelKey,
    Map<DeviceKey, Set<number>>
  >();
  const allCreationPvByChannelDevice = new Map<
    ChannelKey,
    Map<DeviceKey, number>
  >();

  // 合并works创作UV和PV
  for (const [channel, deviceMap] of worksCreationStats.uv.entries()) {
    if (!allCreationUvByChannelDevice.has(channel)) {
      allCreationUvByChannelDevice.set(channel, new Map());
    }
    const channelMap = allCreationUvByChannelDevice.get(channel)!;
    for (const [device, uidSet] of deviceMap.entries()) {
      if (!channelMap.has(device)) {
        channelMap.set(device, new Set());
      }
      const deviceSet = channelMap.get(device)!;
      for (const uid of uidSet) {
        deviceSet.add(uid);
      }
    }
  }

  for (const [channel, deviceMap] of worksCreationStats.pv.entries()) {
    if (!allCreationPvByChannelDevice.has(channel)) {
      allCreationPvByChannelDevice.set(channel, new Map());
    }
    const channelPvMap = allCreationPvByChannelDevice.get(channel)!;
    for (const [device, pv] of deviceMap.entries()) {
      const currentPv = channelPvMap.get(device) || 0;
      channelPvMap.set(device, currentPv + pv);
    }
  }

  // 合并SLS创作UV和PV
  for (const [channel, deviceMap] of creationUvByChannelDevice.entries()) {
    if (!allCreationUvByChannelDevice.has(channel)) {
      allCreationUvByChannelDevice.set(channel, new Map());
    }
    const channelMap = allCreationUvByChannelDevice.get(channel)!;
    for (const [device, uidSet] of deviceMap.entries()) {
      if (!channelMap.has(device)) {
        channelMap.set(device, new Set());
      }
      const deviceSet = channelMap.get(device)!;
      for (const uid of uidSet) {
        deviceSet.add(uid);
      }
    }
  }

  for (const [channel, deviceMap] of creationPvByChannelDevice.entries()) {
    if (!allCreationPvByChannelDevice.has(channel)) {
      allCreationPvByChannelDevice.set(channel, new Map());
    }
    const channelPvMap = allCreationPvByChannelDevice.get(channel)!;
    for (const [device, pv] of deviceMap.entries()) {
      const currentPv = channelPvMap.get(device) || 0;
      channelPvMap.set(device, currentPv + pv);
    }
  }

  // 7. 统计订单数据（按渠道、设备）- 只统计当日注册的用户
  const orderStatsByChannelDevice = await collectOrderStatsByChannelAndDevice(
    appid,
    startTime,
    endTime,
    uidToChannel,
    registerUidsSet
  );

  // 8. 汇总所有出现过的渠道和设备
  const allChannels = new Set<ChannelKey>();
  const allDevices = new Set<DeviceKey>();

  registerUvByChannelDevice.forEach((_, channel) => allChannels.add(channel));
  clickUvByChannelDevice.forEach((_, channel) => allChannels.add(channel));
  clickPvByChannelDevice.forEach((_, channel) => allChannels.add(channel));
  interceptUvByChannelDevice.forEach((_, channel) => allChannels.add(channel));
  interceptPvByChannelDevice.forEach((_, channel) => allChannels.add(channel));
  successUvByChannelDevice.forEach((_, channel) => allChannels.add(channel));
  successPvByChannelDevice.forEach((_, channel) => allChannels.add(channel));
  allCreationUvByChannelDevice.forEach((_, channel) =>
    allChannels.add(channel)
  );
  allCreationPvByChannelDevice.forEach((_, channel) =>
    allChannels.add(channel)
  );
  orderStatsByChannelDevice.forEach((_, channel) => allChannels.add(channel));

  for (const channel of allChannels) {
    const channelData = registerUvByChannelDevice.get(channel);
    if (channelData) {
      channelData.forEach((_, device) => allDevices.add(device));
    }
    const clickUvData = clickUvByChannelDevice.get(channel);
    if (clickUvData) {
      clickUvData.forEach((_, device) => allDevices.add(device));
    }
    const clickPvData = clickPvByChannelDevice.get(channel);
    if (clickPvData) {
      clickPvData.forEach((_, device) => allDevices.add(device));
    }
    const interceptUvData = interceptUvByChannelDevice.get(channel);
    if (interceptUvData) {
      interceptUvData.forEach((_, device) => allDevices.add(device));
    }
    const interceptPvData = interceptPvByChannelDevice.get(channel);
    if (interceptPvData) {
      interceptPvData.forEach((_, device) => allDevices.add(device));
    }
    const successUvData = successUvByChannelDevice.get(channel);
    if (successUvData) {
      successUvData.forEach((_, device) => allDevices.add(device));
    }
    const successPvData = successPvByChannelDevice.get(channel);
    if (successPvData) {
      successPvData.forEach((_, device) => allDevices.add(device));
    }
    const creationUvData = allCreationUvByChannelDevice.get(channel);
    if (creationUvData) {
      creationUvData.forEach((_, device) => allDevices.add(device));
    }
    const creationPvData = allCreationPvByChannelDevice.get(channel);
    if (creationPvData) {
      creationPvData.forEach((_, device) => allDevices.add(device));
    }
    const orderData = orderStatsByChannelDevice.get(channel);
    if (orderData) {
      orderData.forEach((_, device) => allDevices.add(device));
    }
  }

  if (allChannels.size === 0) {
    allChannels.add(NATURAL_CHANNEL);
  }
  if (allDevices.size === 0) {
    allDevices.add('web');
  }

  let successCount = 0;
  let errorCount = 0;

  // 9. 写入数据库
  for (const channel of allChannels) {
    for (const device of allDevices) {
      const registerUv =
        registerUvByChannelDevice.get(channel)?.get(device) || 0;

      // 获取当天的PV和UV数据
      const clickUvSet = clickUvByChannelDevice.get(channel)?.get(device);
      const clickUv = clickUvSet ? clickUvSet.size : 0;
      const clickPv = clickPvByChannelDevice.get(channel)?.get(device) || 0;

      const interceptUvSet = interceptUvByChannelDevice
        .get(channel)
        ?.get(device);
      const interceptUv = interceptUvSet ? interceptUvSet.size : 0;
      const interceptPv =
        interceptPvByChannelDevice.get(channel)?.get(device) || 0;

      const successUvSet = successUvByChannelDevice.get(channel)?.get(device);
      const successUv = successUvSet ? successUvSet.size : 0;
      const successPv = successPvByChannelDevice.get(channel)?.get(device) || 0;

      const creationUvSet = allCreationUvByChannelDevice
        .get(channel)
        ?.get(device);
      const creationUv = creationUvSet ? creationUvSet.size : 0;
      const creationPv =
        allCreationPvByChannelDevice.get(channel)?.get(device) || 0;

      const orderStats = orderStatsByChannelDevice.get(channel)?.get(device);
      const order_count = orderStats?.order_count || 0;
      const gmv = orderStats?.gmv ? Math.round(orderStats.gmv) / 100 : 0;

      const repDateStr = dayjs(statDate).startOf('day').toDate();

      try {
        await prisma.biChannelDailyEntity.upsert({
          where: {
            appid_source_device_date: {
              appid,
              source: channel,
              device,
              date: repDateStr,
            },
          },
          update: {
            register_uv: registerUv,
            // 当天指标
            click_pv_today: clickPv,
            click_uv_today: clickUv,
            intercept_pv_today: interceptPv,
            today_intercept_uv: interceptUv,
            success_pv_today: successPv,
            success_uv_today: successUv,
            order_count_today: order_count,
            gmv_today: gmv,
            // 创作1D指标
            create_pv_1d: creationPv,
            create_uv_1d: creationUv,
            update_time: dayjs().toDate(),
          },
          create: {
            appid,
            source: channel,
            device,
            date: repDateStr,
            register_uv: registerUv,
            // 当天指标
            click_pv_today: clickPv,
            click_uv_today: clickUv,
            intercept_pv_today: interceptPv,
            today_intercept_uv: interceptUv,
            success_pv_today: successPv,
            success_uv_today: successUv,
            order_count_today: order_count,
            gmv_today: gmv,
            // 创作1D指标
            create_pv_1d: creationPv,
            create_uv_1d: creationUv,
          },
        });
        successCount++;
        // console.log(
        //   `  [${channel}/${device}] 写入成功：register_uv=${registerUv}, click_uv=${clickUv}, intercept_uv=${interceptUv}, success_uv=${successUv}, creation_uv=${creationUv}, order_count=${order_count}, gmv=${gmv}`
        // );
      } catch (e) {
        errorCount++;
        console.error(
          `  [${channel}/${device}] 写入 BiChannelDailyEntity 失败：`,
          (e as Error).message || e
        );
      }
    }
  }

  console.log(
    `BiChannelDailyEntity 统计完成，appid=${appid}，日期=${dateStr}，成功=${successCount}，失败=${errorCount}`
  );
}

/**
 * CLI 入口：
 * - 使用方式：
 *   - 显式指定：pnpm run:job jiantie/2026/dwd_bi_gain <appid> [YYYY-MM-DD]
 *     - 例如：node dwd_bi_gain.js jiantie 2026-01-01
 *   - 不传任何参数：默认跑最近 7 天，appid 为 jiantie 和 maka
 */
async function runDefaultLast7Days() {
  const appids = ['jiantie', 'maka', 'wenzy', 'preschool', 'gov'];

  const today = dayjs().startOf('day').toDate();

  // for (const appid of appids) {

  //   for (let i = 3; i >= 0; i--) {
  //     const d = new Date(today);
  //     d.setDate(d.getDate() - i);
  //     const dateStr = d.toISOString().split('T')[0];

  //     console.log(
  //       `默认任务：开始统计 BiChannelDailyEntity，appid=${appid}，日期=${dateStr}`
  //     );
  //     await statBiChannelDaily(appid, dateStr);
  //   }
  // }

  for (const appid of appids) {
    for (let i = 30; i >= 0; i--) {
      const d = dayjs(today).subtract(i, 'day');
      const dateStr = d.format('YYYY-MM-DD');

      console.log(
        `默认任务：开始统计 BiProductDailyEntity，appid=${appid}，日期=${dateStr}`
      );
      await statBiGainDaily(appid, dateStr);
    }
  }
}

async function main() {
  try {
    const appid = process.argv[2];
    const dateArg = process.argv[3];

    if (!appid) {
      console.log(
        '未指定 appid，使用默认配置：appid = [jiantie, maka, wenzy, preschool, gov]，统计最近 7 天（含今天）'
      );
      await runDefaultLast7Days();
      process.exitCode = 0;
      return;
    }

    await statBiGainDaily(appid, dateArg);
    process.exitCode = 0;
  } catch (error) {
    console.error('执行 BiChannelDaily 统计失败：', error);
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
export { statBiGainDaily };

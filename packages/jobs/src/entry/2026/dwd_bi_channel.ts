//频道数据每日统计BiTemplateChannelDailyEntity
//从db-connections.ts获取db
// 入参为appid和日期
// 排除innerUids

// 注册用户从usercenterDB的user表中获取，从user_reg_sources读取uid对应的端

// 数据需要进行一些前置处理，因为有一些点击和曝光事件是发生在用户登录前的，所以需要根据distinct_id来匹配补全uid

//频道的曝光从sls：v11-app-logs：v11-app-logs中获取
// event为page_view,page_type为tag_channel或者hotword_channel，page_id为频道id,按uid去重

//频道的模板点击从sls：v11-app-logs：v11-app-logs中获取
// event为click，object_type为template_item或者old_template_item，page_type为tag_channel或者hotword_channel，page_id为频道id,按uid去重

//频道的模板创作从works_entity表中获取
//1、meta数据里面的ref_page_id为频道id，ref_page_type为tag_channel或者hotword_channel，分端数据由uid关联的user_reg_sources的device来，按uid去重
//2、通过sls的 v5workCreate事件来关联作品和频道

//频道的成功量从sls：v11-app-logs：v11-app-logs中获取
// event为success，object_id为作品id
//1、meta数据里面的ref_page_id为频道id，ref_page_type为tag_channel或者hotword_channel，分端数据由uid关联的user_reg_sources的device来，按uid去重
//2、通过sls的 v5workCreate事件来关联作品和频道

// 订单数据从orderDB中获取，匹配uid，时间则看order的updated_at
//也是通过作品（meta和v5workCreate事件）来关联

import dayjs from 'dayjs';
import { getEndOfDay, getStartOfDay, parseDate } from '../../utils/utils';
import { closeAllConnections, getPrisma } from '../../service/db-connections';
import { normalizeDevice } from '../../service/device-utils';
import { queryUserDevices } from '../../service/data-query';
import { innerUids } from '../../jiantie/entry/innerUids';
import { queryV11SlsLogs } from '../../utils/sls';
import { buildDistinctIdToUidMap } from '../../utils/distinctIdToUid';
import { parseRefPageFromMetadata } from '../../utils/utils';

// 获取数据库连接（单例）
const prisma = getPrisma();

type ChannelKey = string;
type DeviceKey = string;

interface PvUvStats {
  pv: number;
  uv: Set<number>;
}

type StatsByChannelDevice = Map<ChannelKey, Map<DeviceKey, PvUvStats>>;

/**
 * 统计频道的曝光PV/UV
 * event为page_view, page_type为tag_channel或hotword_channel, page_id为频道id
 */
async function collectViewStatsByChannelAndDevice(
  appid: string,
  startTime: Date,
  endTime: Date
): Promise<StatsByChannelDevice> {
  const from = dayjs(startTime).unix();
  const to = dayjs(endTime).unix();

  // 先建立 distinct_id 到 uid 的映射
  const distinctIdToUid = await buildDistinctIdToUidMap(
    appid,
    startTime,
    endTime
  );

  const query = `app_id: "${appid}" and event: "page_view" and (page_type: "tag_channel" or page_type: "hotword_channel") | SELECT platform, distinct_id, uid, page_id LIMIT 100000`;
  const logs = await queryV11SlsLogs({ query, from, to });

  const stats = new Map<ChannelKey, Map<DeviceKey, PvUvStats>>();

  for (const { raw } of logs) {
    const pageId = raw.page_id ? String(raw.page_id) : null;
    if (!pageId) continue;

    // 优先使用原始 uid，如果没有则通过 distinct_id 匹配补全
    let uid = raw.uid ? Number(raw.uid) : null;
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

    if (!stats.has(pageId)) {
      stats.set(pageId, new Map<DeviceKey, PvUvStats>());
    }
    const channelStats = stats.get(pageId)!;

    if (!channelStats.has(device)) {
      channelStats.set(device, { pv: 0, uv: new Set<number>() });
    }

    const deviceStats = channelStats.get(device)!;
    deviceStats.pv += 1;
    deviceStats.uv.add(uid);
  }

  return stats;
}

/**
 * 统计频道的模板点击PV/UV
 * event为click，object_type为template_item或old_template_item，page_type为tag_channel或hotword_channel，page_id为频道id
 */
async function collectTemplateClickStatsByChannelAndDevice(
  appid: string,
  startTime: Date,
  endTime: Date
): Promise<StatsByChannelDevice> {
  const from = dayjs(startTime).unix();
  const to = dayjs(endTime).unix();

  // 先建立 distinct_id 到 uid 的映射
  const distinctIdToUid = await buildDistinctIdToUidMap(
    appid,
    startTime,
    endTime
  );

  const query = `app_id: "${appid}" and event: "click" and (object_type: "template_item" or object_type: "old_template_item") and (page_type: "tag_channel" or page_type: "hotword_channel") | SELECT platform, distinct_id, uid, page_id LIMIT 100000`;
  const logs = await queryV11SlsLogs({ query, from, to });

  const stats = new Map<ChannelKey, Map<DeviceKey, PvUvStats>>();

  for (const { raw } of logs) {
    const pageId = raw.page_id ? String(raw.page_id) : null;
    if (!pageId) continue;

    // 优先使用原始 uid，如果没有则通过 distinct_id 匹配补全
    let uid = raw.uid ? Number(raw.uid) : null;
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

    if (!stats.has(pageId)) {
      stats.set(pageId, new Map<DeviceKey, PvUvStats>());
    }
    const channelStats = stats.get(pageId)!;

    if (!channelStats.has(device)) {
      channelStats.set(device, { pv: 0, uv: new Set<number>() });
    }

    const deviceStats = channelStats.get(device)!;
    deviceStats.pv += 1;
    deviceStats.uv.add(uid);
  }

  return stats;
}

/**
 * 从 works_entity 表获取创作PV/UV（数据源1：meta中的ref_page_id和ref_page_type）
 */
async function collectCreationStatsFromWorks(
  appid: string,
  startTime: Date,
  endTime: Date
): Promise<StatsByChannelDevice> {
  const stats = new Map<ChannelKey, Map<DeviceKey, PvUvStats>>();

  // 查询指定时间范围内创建且未删除的works
  const works = await prisma.worksEntity.findMany({
    where: {
      appid,
      create_time: {
        gte: startTime,
        lte: endTime,
      },
      deleted: false,
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

  if (!works.length) {
    return stats;
  }

  // 过滤出符合条件的作品（metadata中的ref_page_id和ref_page_type匹配tag_channel或hotword_channel）
  const channelWorks = works.filter(work => {
    const { ref_page_type, ref_page_id } = parseRefPageFromMetadata(
      work.metadata
    );
    return (
      (ref_page_type === 'tag_channel' ||
        ref_page_type === 'hotword_channel') &&
      ref_page_id
    );
  });

  if (!channelWorks.length) {
    return stats;
  }

  // 获取所有uid
  const uids = Array.from(new Set(channelWorks.map(w => w.uid)));
  const deviceMap = await queryUserDevices(uids, { appids: [appid] });

  // 按频道和设备聚合
  for (const work of channelWorks) {
    const { ref_page_id } = parseRefPageFromMetadata(work.metadata);
    if (!ref_page_id) continue;

    const channelId = String(ref_page_id);
    const rawDevice = deviceMap.get(work.uid) || 'other';
    const device = normalizeDevice(rawDevice);

    if (!stats.has(channelId)) {
      stats.set(channelId, new Map<DeviceKey, PvUvStats>());
    }
    const channelStats = stats.get(channelId)!;

    if (!channelStats.has(device)) {
      channelStats.set(device, { pv: 0, uv: new Set<number>() });
    }

    const deviceStats = channelStats.get(device)!;
    deviceStats.pv += 1;
    deviceStats.uv.add(work.uid);
  }

  return stats;
}

/**
 * 从 SLS v5workCreate 事件获取创作PV/UV（数据源2：通过v5workCreate事件关联作品和频道）
 */
async function collectCreationStatsFromV5WorkCreate(
  appid: string,
  startTime: Date,
  endTime: Date
): Promise<StatsByChannelDevice> {
  const from = dayjs(startTime).unix();
  const to = dayjs(endTime).unix();

  // 先建立 distinct_id 到 uid 的映射
  const distinctIdToUid = await buildDistinctIdToUidMap(
    appid,
    startTime,
    endTime
  );

  // 查询 v5workCreate 事件，需要获取 page_id 和 page_type 来判断是否关联频道
  const query = `app_id: "${appid}" and object_type: "v5workCreate" and event: "click" and (page_type: "tag_channel" or page_type: "hotword_channel") | SELECT platform, distinct_id, uid, page_id, object_id LIMIT 100000`;
  const logs = await queryV11SlsLogs({ query, from, to });

  const stats = new Map<ChannelKey, Map<DeviceKey, PvUvStats>>();

  // 先获取所有作品ID，然后查询作品的meta信息来关联频道
  const workIds = Array.from(
    new Set(
      logs
        .map(log => log.raw.object_id)
        .filter((id): id is string => !!id && typeof id === 'string')
    )
  );

  if (workIds.length === 0) {
    return stats;
  }

  // 查询作品信息
  const works = await prisma.worksEntity.findMany({
    where: {
      id: {
        in: workIds,
      },
    },
    select: {
      id: true,
      uid: true,
      metadata: true,
    },
  });

  const workMap = new Map(works.map(w => [w.id, w]));

  // 处理日志，通过作品关联频道
  for (const { raw } of logs) {
    const pageId = raw.page_id ? String(raw.page_id) : null;
    const objectId = raw.object_id ? String(raw.object_id) : null;

    // 优先通过page_id获取频道ID，如果没有则通过作品的metadata获取
    let channelId: string | null = pageId;

    if (!channelId && objectId) {
      const work = workMap.get(objectId);
      if (work) {
        const { ref_page_id, ref_page_type } = parseRefPageFromMetadata(
          work.metadata
        );
        if (
          (ref_page_type === 'tag_channel' ||
            ref_page_type === 'hotword_channel') &&
          ref_page_id
        ) {
          channelId = String(ref_page_id);
        }
      }
    }

    if (!channelId) continue;

    // 获取uid
    let uid = raw.uid ? Number(raw.uid) : null;
    if (!uid && raw.distinct_id) {
      const distinctId = String(raw.distinct_id);
      uid = distinctIdToUid.get(distinctId) || null;
    }

    // 如果还是没有uid，尝试从作品获取
    if (!uid && objectId) {
      const work = workMap.get(objectId);
      if (work) {
        uid = work.uid;
      }
    }

    if (!uid || innerUids.includes(uid)) {
      continue;
    }

    const device = normalizeDevice(
      String(raw.platform || raw.device || 'other')
    );

    if (!stats.has(channelId)) {
      stats.set(channelId, new Map<DeviceKey, PvUvStats>());
    }
    const channelStats = stats.get(channelId)!;

    if (!channelStats.has(device)) {
      channelStats.set(device, { pv: 0, uv: new Set<number>() });
    }

    const deviceStats = channelStats.get(device)!;
    deviceStats.pv += 1;
    deviceStats.uv.add(uid);
  }

  return stats;
}

/**
 * 统计频道的拦截PV/UV
 * page_type为vip_page_block，需要通过作品关联频道
 */
async function collectInterceptStatsByChannelAndDevice(
  appid: string,
  startTime: Date,
  endTime: Date
): Promise<StatsByChannelDevice> {
  const from = dayjs(startTime).unix();
  const to = dayjs(endTime).unix();

  // 先建立 distinct_id 到 uid 的映射
  const distinctIdToUid = await buildDistinctIdToUidMap(
    appid,
    startTime,
    endTime
  );

  // 查询拦截事件，通常拦截事件会有作品ID信息，需要通过URL或其他字段获取
  const query = `app_id: "${appid}" and page_type: "vip_page_block" | SELECT platform, distinct_id, uid, object_id LIMIT 100000`;
  const logs = await queryV11SlsLogs({ query, from, to });

  const stats = new Map<ChannelKey, Map<DeviceKey, PvUvStats>>();

  // 从URL或object_id中提取作品ID
  const workIds = new Set<string>();
  for (const { raw } of logs) {
    let workId: string | null = null;

    // 优先从object_id获取
    if (raw.object_id) {
      workId = String(raw.object_id);
    }

    if (workId) {
      workIds.add(workId);
    }
  }

  if (workIds.size === 0) {
    return stats;
  }

  // 查询作品信息
  const works = await prisma.worksEntity.findMany({
    where: {
      id: {
        in: Array.from(workIds),
      },
    },
    select: {
      id: true,
      uid: true,
      metadata: true,
    },
  });

  const workMap = new Map(works.map(w => [w.id, w]));

  // 处理日志
  for (const { raw } of logs) {
    let workId: string | null = null;

    if (raw.object_id) {
      workId = String(raw.object_id);
    } else if (raw.url) {
      const urlMatch = String(raw.url).match(/[?&]works_id=([^&]+)/);
      if (urlMatch) {
        workId = urlMatch[1];
      }
    }

    if (!workId) continue;

    const work = workMap.get(workId);
    if (!work) continue;

    // 从作品metadata获取频道信息
    const { ref_page_id, ref_page_type } = parseRefPageFromMetadata(
      work.metadata
    );
    if (
      !(
        (ref_page_type === 'tag_channel' ||
          ref_page_type === 'hotword_channel') &&
        ref_page_id
      )
    ) {
      continue;
    }

    const channelId = String(ref_page_id);

    // 获取uid
    let uid = raw.uid ? Number(raw.uid) : null;
    if (!uid && raw.distinct_id) {
      const distinctId = String(raw.distinct_id);
      uid = distinctIdToUid.get(distinctId) || null;
    }

    if (!uid) {
      uid = work.uid;
    }

    if (!uid || innerUids.includes(uid)) {
      continue;
    }

    const device = normalizeDevice(
      String(raw.platform || raw.device || 'other')
    );

    if (!stats.has(channelId)) {
      stats.set(channelId, new Map<DeviceKey, PvUvStats>());
    }
    const channelStats = stats.get(channelId)!;

    if (!channelStats.has(device)) {
      channelStats.set(device, { pv: 0, uv: new Set<number>() });
    }

    const deviceStats = channelStats.get(device)!;
    deviceStats.pv += 1;
    deviceStats.uv.add(uid);
  }

  return stats;
}

/**
 * 统计频道的成功PV/UV
 * event为success，object_id为作品id，通过作品meta和v5workCreate事件关联频道
 */
async function collectSuccessStatsByChannelAndDevice(
  appid: string,
  startTime: Date,
  endTime: Date
): Promise<StatsByChannelDevice> {
  const from = dayjs(startTime).unix();
  const to = dayjs(endTime).unix();

  // 先建立 distinct_id 到 uid 的映射
  const distinctIdToUid = await buildDistinctIdToUidMap(
    appid,
    startTime,
    endTime
  );

  // 查询成功事件
  const query = `app_id: "${appid}" and event: "success" | SELECT platform, distinct_id, uid, object_id LIMIT 100000`;
  const logs = await queryV11SlsLogs({ query, from, to });

  const stats = new Map<ChannelKey, Map<DeviceKey, PvUvStats>>();

  // 收集所有作品ID
  const workIds = Array.from(
    new Set(
      logs
        .map(log => log.raw.object_id)
        .filter((id): id is string => !!id && typeof id === 'string')
    )
  );

  if (workIds.length === 0) {
    return stats;
  }

  // 查询作品信息（数据源1：通过meta关联）
  const works = await prisma.worksEntity.findMany({
    where: {
      id: {
        in: workIds,
      },
    },
    select: {
      id: true,
      uid: true,
      metadata: true,
    },
  });

  const workMap = new Map(works.map(w => [w.id, w]));

  // 查询v5workCreate事件（数据源2：通过v5workCreate事件关联）
  const v5CreateQuery = `app_id: "${appid}" and object_type: "v5workCreate" and event: "click" and (page_type: "tag_channel" or page_type: "hotword_channel") | SELECT object_id, page_id LIMIT 100000`;
  const v5CreateLogs = await queryV11SlsLogs({
    query: v5CreateQuery,
    from,
    to,
  });

  // 建立作品ID到频道ID的映射（从v5workCreate事件）
  const workIdToChannelFromV5 = new Map<string, string>();
  for (const { raw } of v5CreateLogs) {
    const objectId = raw.object_id ? String(raw.object_id) : null;
    const pageId = raw.page_id ? String(raw.page_id) : null;
    if (objectId && pageId) {
      workIdToChannelFromV5.set(objectId, String(pageId));
    }
  }

  // 处理成功事件日志
  for (const { raw } of logs) {
    const objectId = raw.object_id ? String(raw.object_id) : null;
    if (!objectId) continue;

    const work = workMap.get(objectId);
    let channelId: string | null = null;

    // 优先通过v5workCreate事件获取频道ID
    channelId = workIdToChannelFromV5.get(objectId) || null;

    // 如果没有，则通过作品的metadata获取
    if (!channelId && work) {
      const { ref_page_id, ref_page_type } = parseRefPageFromMetadata(
        work.metadata
      );
      if (
        (ref_page_type === 'tag_channel' ||
          ref_page_type === 'hotword_channel') &&
        ref_page_id
      ) {
        channelId = String(ref_page_id);
      }
    }

    if (!channelId) continue;

    // 获取uid
    let uid = raw.uid ? Number(raw.uid) : null;
    if (!uid && raw.distinct_id) {
      const distinctId = String(raw.distinct_id);
      uid = distinctIdToUid.get(distinctId) || null;
    }

    if (!uid && work) {
      uid = work.uid;
    }

    if (!uid || innerUids.includes(uid)) {
      continue;
    }

    const device = normalizeDevice(
      String(raw.platform || raw.device || 'other')
    );

    if (!stats.has(channelId)) {
      stats.set(channelId, new Map<DeviceKey, PvUvStats>());
    }
    const channelStats = stats.get(channelId)!;

    if (!channelStats.has(device)) {
      channelStats.set(device, { pv: 0, uv: new Set<number>() });
    }

    const deviceStats = channelStats.get(device)!;
    deviceStats.pv += 1;
    deviceStats.uv.add(uid);
  }

  return stats;
}

/**
 * 统计频道的订单数和GMV
 * 从order_record_entity获取，通过作品的meta和v5workCreate事件关联频道
 */
async function collectOrderStatsByChannelAndDevice(
  appid: string,
  startTime: Date,
  endTime: Date
): Promise<
  Map<ChannelKey, Map<DeviceKey, { order_count: number; gmv: number }>>
> {
  // 从order_record_entity查询订单
  const orderRecords = await prisma.orderRecordEntity.findMany({
    where: {
      appid: appid,
      deleted: false,
      payment_time: {
        gte: startTime,
        lte: endTime,
      },
      work_id: {
        not: null,
      },
    },
    select: {
      uid: true,
      work_id: true,
      order_amount: true,
      ref_page_type: true,
      ref_page_id: true,
    },
  });

  const statsByChannelDevice = new Map<
    ChannelKey,
    Map<DeviceKey, { order_count: number; gmv: number }>
  >();

  if (!orderRecords.length) {
    return statsByChannelDevice;
  }

  // 获取所有作品ID
  const workIds = Array.from(
    new Set(
      orderRecords
        .map(o => o.work_id)
        .filter((id): id is string => !!id && typeof id === 'string')
    )
  );

  if (workIds.length === 0) {
    return statsByChannelDevice;
  }

  // 查询作品信息（数据源1：通过meta关联）
  const works = await prisma.worksEntity.findMany({
    where: {
      id: {
        in: workIds,
      },
    },
    select: {
      id: true,
      uid: true,
      metadata: true,
    },
  });

  const workMap = new Map(works.map(w => [w.id, w]));

  // 查询v5workCreate事件（数据源2：通过v5workCreate事件关联）
  const from = dayjs(startTime).unix();
  const to = dayjs(endTime).unix();
  const v5CreateQuery = `app_id: "${appid}" and object_type: "v5workCreate" and event: "click" and (page_type: "tag_channel" or page_type: "hotword_channel") | SELECT object_id, page_id LIMIT 100000`;
  const v5CreateLogs = await queryV11SlsLogs({
    query: v5CreateQuery,
    from,
    to,
  });

  // 建立作品ID到频道ID的映射（从v5workCreate事件）
  const workIdToChannelFromV5 = new Map<string, string>();
  for (const { raw } of v5CreateLogs) {
    const objectId = raw.object_id ? String(raw.object_id) : null;
    const pageId = raw.page_id ? String(raw.page_id) : null;
    if (objectId && pageId) {
      workIdToChannelFromV5.set(objectId, String(pageId));
    }
  }

  // 获取所有uid
  const uids = Array.from(
    new Set(
      orderRecords.map(o => o.uid).filter(uid => !innerUids.includes(uid))
    )
  );
  const deviceMap = await queryUserDevices(uids, { appids: [appid] });

  // 处理订单
  for (const orderRecord of orderRecords) {
    if (innerUids.includes(orderRecord.uid)) continue;

    const workId = orderRecord.work_id;
    if (!workId) continue;

    const work = workMap.get(workId);
    let channelId: string | null = null;

    // 优先使用order_record_entity中的ref_page_id和ref_page_type
    if (
      orderRecord.ref_page_type === 'tag_channel' ||
      orderRecord.ref_page_type === 'hotword_channel'
    ) {
      if (orderRecord.ref_page_id) {
        channelId = String(orderRecord.ref_page_id);
      }
    }

    // 如果没有，则通过v5workCreate事件获取频道ID
    if (!channelId) {
      channelId = workIdToChannelFromV5.get(workId) || null;
    }

    // 如果还没有，则通过作品的metadata获取
    if (!channelId && work) {
      const { ref_page_id, ref_page_type } = parseRefPageFromMetadata(
        work.metadata
      );
      if (
        (ref_page_type === 'tag_channel' ||
          ref_page_type === 'hotword_channel') &&
        ref_page_id
      ) {
        channelId = String(ref_page_id);
      }
    }

    if (!channelId) continue;

    const rawDevice = deviceMap.get(orderRecord.uid) || 'other';
    const device = normalizeDevice(rawDevice);

    if (!statsByChannelDevice.has(channelId)) {
      statsByChannelDevice.set(channelId, new Map());
    }
    const channelStats = statsByChannelDevice.get(channelId)!;

    if (!channelStats.has(device)) {
      channelStats.set(device, {
        order_count: 0,
        gmv: 0,
      });
    }

    const stats = channelStats.get(device)!;
    stats.order_count += 1;
    stats.gmv += Number(orderRecord.order_amount) || 0;
  }

  return statsByChannelDevice;
}

/**
 * 合并两个StatsByChannelDevice结果
 */
function mergeStats(
  stats1: StatsByChannelDevice,
  stats2: StatsByChannelDevice
): StatsByChannelDevice {
  const merged = new Map<ChannelKey, Map<DeviceKey, PvUvStats>>();

  // 合并stats1
  for (const [channel, deviceMap] of stats1.entries()) {
    if (!merged.has(channel)) {
      merged.set(channel, new Map<DeviceKey, PvUvStats>());
    }
    const mergedChannelMap = merged.get(channel)!;

    for (const [device, stats] of deviceMap.entries()) {
      if (!mergedChannelMap.has(device)) {
        mergedChannelMap.set(device, { pv: 0, uv: new Set<number>() });
      }
      const mergedStats = mergedChannelMap.get(device)!;
      mergedStats.pv += stats.pv;
      for (const uid of stats.uv) {
        mergedStats.uv.add(uid);
      }
    }
  }

  // 合并stats2
  for (const [channel, deviceMap] of stats2.entries()) {
    if (!merged.has(channel)) {
      merged.set(channel, new Map<DeviceKey, PvUvStats>());
    }
    const mergedChannelMap = merged.get(channel)!;

    for (const [device, stats] of deviceMap.entries()) {
      if (!mergedChannelMap.has(device)) {
        mergedChannelMap.set(device, { pv: 0, uv: new Set<number>() });
      }
      const mergedStats = mergedChannelMap.get(device)!;
      mergedStats.pv += stats.pv;
      for (const uid of stats.uv) {
        mergedStats.uv.add(uid);
      }
    }
  }

  return merged;
}

/**
 * 统计某天的频道BI数据（按 appid + 日期 + 频道 + 设备）
 */
async function statBiTemplateChannelDaily(
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
    `开始统计 BiTemplateChannelDailyEntity，appid=${appid}，日期=${dateStr}，时间范围=${dayjs(startTime).toISOString()} ~ ${dayjs(endTime).toISOString()}`
  );

  // 1. 统计浏览PV/UV
  const viewStats = await collectViewStatsByChannelAndDevice(
    appid,
    startTime,
    endTime
  );

  // 2. 统计模板点击PV/UV
  const templateClickStats = await collectTemplateClickStatsByChannelAndDevice(
    appid,
    startTime,
    endTime
  );

  // 3. 统计创作PV/UV（两个数据源）
  const creationStatsFromWorks = await collectCreationStatsFromWorks(
    appid,
    startTime,
    endTime
  );
  const creationStatsFromV5 = await collectCreationStatsFromV5WorkCreate(
    appid,
    startTime,
    endTime
  );
  const creationStats = mergeStats(creationStatsFromWorks, creationStatsFromV5);

  // 4. 统计拦截PV/UV
  const interceptStats = await collectInterceptStatsByChannelAndDevice(
    appid,
    startTime,
    endTime
  );

  // 5. 统计成功PV/UV
  const successStats = await collectSuccessStatsByChannelAndDevice(
    appid,
    startTime,
    endTime
  );

  // 6. 统计订单数和GMV
  const orderStats = await collectOrderStatsByChannelAndDevice(
    appid,
    startTime,
    endTime
  );

  // 7. 汇总所有出现过的频道和设备
  const allChannels = new Set<ChannelKey>();
  const allDevices = new Set<DeviceKey>();

  viewStats.forEach((_, channel) => allChannels.add(channel));
  templateClickStats.forEach((_, channel) => allChannels.add(channel));
  creationStats.forEach((_, channel) => allChannels.add(channel));
  interceptStats.forEach((_, channel) => allChannels.add(channel));
  successStats.forEach((_, channel) => allChannels.add(channel));
  orderStats.forEach((_, channel) => allChannels.add(channel));

  for (const channel of allChannels) {
    const viewData = viewStats.get(channel);
    if (viewData) {
      viewData.forEach((_, device) => allDevices.add(device));
    }
    const clickData = templateClickStats.get(channel);
    if (clickData) {
      clickData.forEach((_, device) => allDevices.add(device));
    }
    const creationData = creationStats.get(channel);
    if (creationData) {
      creationData.forEach((_, device) => allDevices.add(device));
    }
    const interceptData = interceptStats.get(channel);
    if (interceptData) {
      interceptData.forEach((_, device) => allDevices.add(device));
    }
    const successData = successStats.get(channel);
    if (successData) {
      successData.forEach((_, device) => allDevices.add(device));
    }
    const orderData = orderStats.get(channel);
    if (orderData) {
      orderData.forEach((_, device) => allDevices.add(device));
    }
  }

  if (allChannels.size === 0) {
    console.log('未找到任何频道数据');
    return;
  }

  const repDateStr = dayjs(statDate).startOf('day').toDate();

  // 8. 收集所有需要插入的数据
  const insertData: Array<{
    appid: string;
    source: string;
    device: string;
    date: Date;
    view_pv: number;
    view_uv: number;
    template_click_pv: number;
    template_click_uv: number;
    creation_pv: number;
    creation_uv: number;
    intercept_pv: number;
    intercept_uv: number;
    success_pv: number;
    success_uv: number;
    order_count: number;
    gmv: number;
  }> = [];

  for (const channel of allChannels) {
    for (const device of allDevices) {
      const viewData = viewStats.get(channel)?.get(device);
      const view_pv = viewData?.pv || 0;
      const view_uv = viewData?.uv.size || 0;

      const clickData = templateClickStats.get(channel)?.get(device);
      const template_click_pv = clickData?.pv || 0;
      const template_click_uv = clickData?.uv.size || 0;

      const creationData = creationStats.get(channel)?.get(device);
      const creation_pv = creationData?.pv || 0;
      const creation_uv = creationData?.uv.size || 0;

      const interceptData = interceptStats.get(channel)?.get(device);
      const intercept_pv = interceptData?.pv || 0;
      const intercept_uv = interceptData?.uv.size || 0;

      const successData = successStats.get(channel)?.get(device);
      const success_pv = successData?.pv || 0;
      const success_uv = successData?.uv.size || 0;

      const orderData = orderStats.get(channel)?.get(device);
      const order_count = orderData?.order_count || 0;
      const gmv = orderData?.gmv ? Math.round(orderData.gmv) / 100 : 0;

      insertData.push({
        appid,
        source: channel,
        device,
        date: repDateStr,
        view_pv,
        view_uv,
        template_click_pv,
        template_click_uv,
        creation_pv,
        creation_uv,
        intercept_pv,
        intercept_uv,
        success_pv,
        success_uv,
        order_count,
        gmv,
      });
    }
  }

  // 9. 批量删除该日期和appid的所有数据
  if (insertData.length > 0) {
    try {
      const deleteResult = await prisma.biTemplateChannelDailyEntity.deleteMany(
        {
          where: {
            appid,
            date: repDateStr,
          },
        }
      );
      console.log(
        `已删除 appid=${appid}，日期=${dateStr} 的 ${deleteResult.count} 条 BiTemplateChannelDailyEntity 数据`
      );
    } catch (e) {
      console.error(
        `删除 BiTemplateChannelDailyEntity 数据失败：`,
        (e as Error).message || e
      );
      throw e;
    }
  }

  // 10. 批量写入数据（每500条一批）
  const BATCH_SIZE = 500;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < insertData.length; i += BATCH_SIZE) {
    const batch = insertData.slice(i, i + BATCH_SIZE);
    try {
      await prisma.biTemplateChannelDailyEntity.createMany({
        data: batch,
        skipDuplicates: true,
      });
      successCount += batch.length;
      // console.log(
      //   `批量写入成功：第 ${Math.floor(i / BATCH_SIZE) + 1} 批，${batch.length} 条记录`
      // );
    } catch (e) {
      errorCount += batch.length;
      console.error(
        `批量写入失败：第 ${Math.floor(i / BATCH_SIZE) + 1} 批，${batch.length} 条记录：`,
        (e as Error).message || e
      );
    }
  }

  console.log(
    `BiTemplateChannelDailyEntity 统计完成，appid=${appid}，日期=${dateStr}，成功=${successCount}，失败=${errorCount}`
  );
}

/**
 * CLI 入口：
 * - 使用方式：
 *   - 显式指定：pnpm run:job jiantie/2026/dwd_bi_channe <appid> [YYYY-MM-DD]
 *     - 例如：node dwd_bi_channe.js jiantie 2026-01-01
 *   - 不传任何参数：默认跑最近 7 天，appid 为 jiantie 和 maka
 */
async function runDefaultLast7Days() {
  const appids = ['jiantie', 'maka', 'wenzy', 'preschool', 'gov'];

  const today = dayjs().startOf('day').toDate();

  for (const appid of appids) {
    for (let i = 1; i >= 0; i--) {
      const d = dayjs(today).subtract(i, 'day');
      const dateStr = d.format('YYYY-MM-DD');

      console.log(
        `默认任务：开始统计 BiTemplateChannelDailyEntity，appid=${appid}，日期=${dateStr}`
      );
      await statBiTemplateChannelDaily(appid, dateStr);
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

    await statBiTemplateChannelDaily(appid, dateArg);
    console.log('执行 BiTemplateChannelDaily 统计成功');
    process.exitCode = 0;
  } catch (error) {
    console.error('执行 BiTemplateChannelDaily 统计失败：', error);
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
export { statBiTemplateChannelDaily };

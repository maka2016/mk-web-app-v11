//搜索数据每日统计BiSearchTermDailyEntity
//从db-connections.ts获取db
//入参为appid和日期
//排除innerUids

//需要根据distinct_id补齐uid

//搜索记录从sls：v11-app-logs：v11-app-logs中获取， event='page_view', page_type='search_page_mix'，
//搜索词是search_word,platform是设备，template_count是新模板数，old_template_count是老MAKA模板数

//模板点击记录从sls：v11-app-logs：v11-app-logs中获取， event='click', page_type='search_page_mix', object_id为template_id，object_type为template_item，search_word为搜索词
//老MAKA点击记录从sls：v11-app-logs：v11-app-logs中获取， event='click', page_type='search_page_mix', object_id为template_id， object_type为old_template_item， search_word为搜索词

//作品创作数据来源
//1、meta数据里面的search_word为搜索词，ref_page_type为search_page_mix（新模板创作）
//2、通过sls的 v5workCreate事件的object_id作为作品id来关联作品，search_word为搜索词，作为老模板创作数

//成功数据来源
//通过搜索词关联的作品，从sls：v11-app-logs：v11-app-logs中获取，event为success，object_id为作品id（新模板成功）
//老模板则是通过v5workCreate的object_id作为作品id来关联作品，关联出成功数

//拦截数据来源
//通过搜索词关联的作品，从sls：v11-app-logs：v11-app-logs中获取，page_type为vip_page_block，object_id为作品id（新模板拦截）
//老模板则是通过v5workCreate的object_id作为作品id来关联作品，关联出拦截数

//订单数据从orderDB中获取，匹配uid，时间则看order的updated_at
//也是通过作品（meta和v5workCreate事件）来关联

//节省存储空间，viewpv为0的不需要进行记录存储

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

type SearchWordKey = string;
type DeviceKey = string;

interface PvUvStats {
  pv: number;
  uv: Set<number>;
}

type StatsBySearchWordDevice = Map<SearchWordKey, Map<DeviceKey, PvUvStats>>;

/**
 * 从works metadata中解析search_word
 */
function parseSearchWordFromMetadata(metadata: any): string | null {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }
  return typeof metadata.search_word === 'string' ? metadata.search_word : null;
}

/**
 * 统计搜索页面的浏览PV/UV
 * event为page_view, page_type为search_page_mix, search_word为搜索词
 */
async function collectViewStatsBySearchWordAndDevice(
  appid: string,
  startTime: Date,
  endTime: Date
): Promise<StatsBySearchWordDevice> {
  const from = dayjs(startTime).unix();
  const to = dayjs(endTime).unix();

  // 先建立 distinct_id 到 uid 的映射
  const distinctIdToUid = await buildDistinctIdToUidMap(
    appid,
    startTime,
    endTime
  );

  const query = `app_id: "${appid}" and event: "page_view" and page_type: "search_page_mix" | SELECT platform, distinct_id, uid, search_word, template_count, old_template_count LIMIT 100000`;
  const logs = await queryV11SlsLogs({ query, from, to });

  const stats = new Map<SearchWordKey, Map<DeviceKey, PvUvStats>>();

  for (const { raw } of logs) {
    const searchWord = raw.search_word ? String(raw.search_word).trim() : null;
    if (!searchWord || searchWord === '') continue;

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

    if (!stats.has(searchWord)) {
      stats.set(searchWord, new Map<DeviceKey, PvUvStats>());
    }
    const searchWordStats = stats.get(searchWord)!;

    if (!searchWordStats.has(device)) {
      searchWordStats.set(device, { pv: 0, uv: new Set<number>() });
    }

    const deviceStats = searchWordStats.get(device)!;
    deviceStats.pv += 1;
    deviceStats.uv.add(uid);
  }

  return stats;
}

/**
 * 统计模板点击PV/UV（新模板）
 * event为click，page_type为search_page_mix，object_type为template_item
 */
async function collectTemplateClickStatsBySearchWordAndDevice(
  appid: string,
  startTime: Date,
  endTime: Date
): Promise<StatsBySearchWordDevice> {
  const from = dayjs(startTime).unix();
  const to = dayjs(endTime).unix();

  // 先建立 distinct_id 到 uid 的映射
  const distinctIdToUid = await buildDistinctIdToUidMap(
    appid,
    startTime,
    endTime
  );

  const query = `app_id: "${appid}" and event: "click" and page_type: "search_page_mix" and object_type: "template_item" | SELECT platform, distinct_id, uid, search_word LIMIT 100000`;
  const logs = await queryV11SlsLogs({ query, from, to });

  const stats = new Map<SearchWordKey, Map<DeviceKey, PvUvStats>>();

  for (const { raw } of logs) {
    const searchWord = raw.search_word ? String(raw.search_word).trim() : null;
    if (!searchWord || searchWord === '') continue;

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

    if (!stats.has(searchWord)) {
      stats.set(searchWord, new Map<DeviceKey, PvUvStats>());
    }
    const searchWordStats = stats.get(searchWord)!;

    if (!searchWordStats.has(device)) {
      searchWordStats.set(device, { pv: 0, uv: new Set<number>() });
    }

    const deviceStats = searchWordStats.get(device)!;
    deviceStats.pv += 1;
    deviceStats.uv.add(uid);
  }

  return stats;
}

/**
 * 统计老MAKA模板点击PV/UV
 * 从sls v11-app-logs读取
 */
async function collectOldMakaTemplateClickStatsBySearchWordAndDevice(
  appid: string,
  startTime: Date,
  endTime: Date
): Promise<StatsBySearchWordDevice> {
  const from = dayjs(startTime).unix();
  const to = dayjs(endTime).unix();

  // 先建立 distinct_id 到 uid 的映射
  const distinctIdToUid = await buildDistinctIdToUidMap(
    appid,
    startTime,
    endTime
  );

  const query = `app_id: "${appid}" and event: "click" and page_type: "search_page_mix" and object_type: "old_template_item" | SELECT platform, distinct_id, uid, search_word LIMIT 100000`;
  const logs = await queryV11SlsLogs({ query, from, to });

  const stats = new Map<SearchWordKey, Map<DeviceKey, PvUvStats>>();

  for (const { raw } of logs) {
    const searchWord = raw.search_word ? String(raw.search_word).trim() : null;
    if (!searchWord || searchWord === '') continue;

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

    if (!stats.has(searchWord)) {
      stats.set(searchWord, new Map<DeviceKey, PvUvStats>());
    }
    const searchWordStats = stats.get(searchWord)!;

    if (!searchWordStats.has(device)) {
      searchWordStats.set(device, { pv: 0, uv: new Set<number>() });
    }

    const deviceStats = searchWordStats.get(device)!;
    deviceStats.pv += 1;
    deviceStats.uv.add(uid);
  }

  return stats;
}

/**
 * 从 works_entity 表获取创作PV/UV（数据源1：meta中的search_word和ref_page_type）
 */
async function collectCreationStatsFromWorks(
  appid: string,
  startTime: Date,
  endTime: Date
): Promise<StatsBySearchWordDevice> {
  const stats = new Map<SearchWordKey, Map<DeviceKey, PvUvStats>>();

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

  // 过滤出符合条件的作品（metadata中的search_word和ref_page_type='search_page_mix'）
  const searchWorks = works.filter(work => {
    const searchWord = parseSearchWordFromMetadata(work.metadata);
    const { ref_page_type } = parseRefPageFromMetadata(work.metadata);
    return searchWord && ref_page_type === 'search_page_mix';
  });

  if (!searchWorks.length) {
    return stats;
  }

  // 获取所有uid
  const uids = Array.from(new Set(searchWorks.map(w => w.uid)));
  const deviceMap = await queryUserDevices(uids, { appids: [appid] });

  // 按搜索词和设备聚合
  for (const work of searchWorks) {
    const searchWord = parseSearchWordFromMetadata(work.metadata);
    if (!searchWord) continue;

    const rawDevice = deviceMap.get(work.uid) || 'other';
    const device = normalizeDevice(rawDevice);

    if (!stats.has(searchWord)) {
      stats.set(searchWord, new Map<DeviceKey, PvUvStats>());
    }
    const searchWordStats = stats.get(searchWord)!;

    if (!searchWordStats.has(device)) {
      searchWordStats.set(device, { pv: 0, uv: new Set<number>() });
    }

    const deviceStats = searchWordStats.get(device)!;
    deviceStats.pv += 1;
    deviceStats.uv.add(work.uid);
  }

  return stats;
}

/**
 * 从 SLS v5workCreate 事件获取创作PV/UV（数据源2：通过v5workCreate事件关联作品和搜索词）
 * 注意：这个函数统计的是新模板的创作（通过v5workCreate事件，但实际应该通过meta统计）
 * 老模板创作应该使用 collectOldMakaTemplateCreationStats 函数
 */
async function collectCreationStatsFromV5WorkCreate(
  appid: string,
  startTime: Date,
  endTime: Date
): Promise<StatsBySearchWordDevice> {
  const from = dayjs(startTime).unix();
  const to = dayjs(endTime).unix();

  // 先建立 distinct_id 到 uid 的映射
  const distinctIdToUid = await buildDistinctIdToUidMap(
    appid,
    startTime,
    endTime
  );

  // 查询 v5workCreate 事件，需要获取 search_word 来判断是否关联搜索
  const query = `app_id: "${appid}" and object_type: "v5workCreate" and event: "click" and page_type: "search_page_mix" | SELECT platform, distinct_id, uid, search_word, object_id LIMIT 100000`;
  const logs = await queryV11SlsLogs({ query, from, to });

  const stats = new Map<SearchWordKey, Map<DeviceKey, PvUvStats>>();

  for (const { raw } of logs) {
    const searchWord = raw.search_word ? String(raw.search_word).trim() : null;
    if (!searchWord || searchWord === '') continue;

    // 获取uid
    let uid = raw.uid ? Number(raw.uid) : null;
    if (!uid && raw.distinct_id) {
      const distinctId = String(raw.distinct_id);
      uid = distinctIdToUid.get(distinctId) || null;
    }

    // 如果还是没有uid，尝试从作品获取
    if (!uid && raw.object_id) {
      try {
        const work = await prisma.worksEntity.findUnique({
          where: { id: String(raw.object_id) },
          select: { uid: true },
        });
        if (work) {
          uid = work.uid;
        }
      } catch {
        // 忽略查询错误
      }
    }

    if (!uid || innerUids.includes(uid)) {
      continue;
    }

    const device = normalizeDevice(
      String(raw.platform || raw.device || 'other')
    );

    if (!stats.has(searchWord)) {
      stats.set(searchWord, new Map<DeviceKey, PvUvStats>());
    }
    const searchWordStats = stats.get(searchWord)!;

    if (!searchWordStats.has(device)) {
      searchWordStats.set(device, { pv: 0, uv: new Set<number>() });
    }

    const deviceStats = searchWordStats.get(device)!;
    deviceStats.pv += 1;
    deviceStats.uv.add(uid);
  }

  return stats;
}

/**
 * 统计老MAKA模板创作PV/UV
 * 通过v5workCreate事件关联作品和搜索词，作为老模板创作数
 */
async function collectOldMakaTemplateCreationStats(
  appid: string,
  startTime: Date,
  endTime: Date
): Promise<StatsBySearchWordDevice> {
  const from = dayjs(startTime).unix();
  const to = dayjs(endTime).unix();

  // 先建立 distinct_id 到 uid 的映射
  const distinctIdToUid = await buildDistinctIdToUidMap(
    appid,
    startTime,
    endTime
  );

  // 查询 v5workCreate 事件，需要获取 search_word 来判断是否关联搜索
  const query = `app_id: "${appid}" and object_type: "v5workCreate" and event: "click" and page_type: "search_page_mix" | SELECT platform, distinct_id, uid, search_word, object_id LIMIT 100000`;
  const logs = await queryV11SlsLogs({ query, from, to });

  const stats = new Map<SearchWordKey, Map<DeviceKey, PvUvStats>>();

  for (const { raw } of logs) {
    const searchWord = raw.search_word ? String(raw.search_word).trim() : null;
    if (!searchWord || searchWord === '') continue;

    // 获取uid
    let uid = raw.uid ? Number(raw.uid) : null;
    if (!uid && raw.distinct_id) {
      const distinctId = String(raw.distinct_id);
      uid = distinctIdToUid.get(distinctId) || null;
    }

    // 如果还是没有uid，尝试从作品获取
    if (!uid && raw.object_id) {
      try {
        const work = await prisma.worksEntity.findUnique({
          where: { id: String(raw.object_id) },
          select: { uid: true },
        });
        if (work) {
          uid = work.uid;
        }
      } catch {
        // 忽略查询错误
      }
    }

    if (!uid || innerUids.includes(uid)) {
      continue;
    }

    const device = normalizeDevice(
      String(raw.platform || raw.device || 'other')
    );

    if (!stats.has(searchWord)) {
      stats.set(searchWord, new Map<DeviceKey, PvUvStats>());
    }
    const searchWordStats = stats.get(searchWord)!;

    if (!searchWordStats.has(device)) {
      searchWordStats.set(device, { pv: 0, uv: new Set<number>() });
    }

    const deviceStats = searchWordStats.get(device)!;
    deviceStats.pv += 1;
    deviceStats.uv.add(uid);
  }

  return stats;
}

/**
 * 统计老MAKA模板成功PV/UV
 * 通过v5workCreate事件的object_id作为作品id来关联作品，关联出成功数
 */
async function collectOldMakaTemplateSuccessStats(
  appid: string,
  startTime: Date,
  endTime: Date
): Promise<StatsBySearchWordDevice> {
  const from = dayjs(startTime).unix();
  const to = dayjs(endTime).unix();

  // 先建立 distinct_id 到 uid 的映射
  const distinctIdToUid = await buildDistinctIdToUidMap(
    appid,
    startTime,
    endTime
  );

  // 查询v5workCreate事件，建立作品ID到搜索词的映射（老模板作品）
  const v5CreateQuery = `app_id: "${appid}" and object_type: "v5workCreate" and event: "click" and page_type: "search_page_mix" | SELECT object_id, search_word LIMIT 100000`;
  const v5CreateLogs = await queryV11SlsLogs({
    query: v5CreateQuery,
    from,
    to,
  });

  // 建立作品ID到搜索词的映射（从v5workCreate事件，这些是老模板作品）
  const oldMakaWorkIdToSearchWord = new Map<string, string>();
  for (const { raw } of v5CreateLogs) {
    const objectId = raw.object_id ? String(raw.object_id) : null;
    const searchWord = raw.search_word ? String(raw.search_word).trim() : null;
    if (objectId && searchWord && searchWord !== '') {
      oldMakaWorkIdToSearchWord.set(objectId, searchWord);
    }
  }

  if (oldMakaWorkIdToSearchWord.size === 0) {
    return new Map<SearchWordKey, Map<DeviceKey, PvUvStats>>();
  }

  // 查询成功事件
  const query = `app_id: "${appid}" and event: "success" | SELECT platform, distinct_id, uid, object_id LIMIT 100000`;
  const logs = await queryV11SlsLogs({ query, from, to });

  const stats = new Map<SearchWordKey, Map<DeviceKey, PvUvStats>>();

  // 查询作品信息（用于获取uid）
  const workIds = Array.from(oldMakaWorkIdToSearchWord.keys());
  const works = await prisma.worksEntity.findMany({
    where: {
      id: {
        in: workIds,
      },
    },
    select: {
      id: true,
      uid: true,
    },
  });

  const workMap = new Map(works.map(w => [w.id, w]));

  // 处理成功事件日志，只统计老模板作品
  for (const { raw } of logs) {
    const objectId = raw.object_id ? String(raw.object_id) : null;
    if (!objectId) continue;

    // 只统计通过v5workCreate事件关联的老模板作品
    const searchWord = oldMakaWorkIdToSearchWord.get(objectId);
    if (!searchWord || searchWord === '') continue;

    // 获取uid
    let uid = raw.uid ? Number(raw.uid) : null;
    if (!uid && raw.distinct_id) {
      const distinctId = String(raw.distinct_id);
      uid = distinctIdToUid.get(distinctId) || null;
    }

    if (!uid) {
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

    if (!stats.has(searchWord)) {
      stats.set(searchWord, new Map<DeviceKey, PvUvStats>());
    }
    const searchWordStats = stats.get(searchWord)!;

    if (!searchWordStats.has(device)) {
      searchWordStats.set(device, { pv: 0, uv: new Set<number>() });
    }

    const deviceStats = searchWordStats.get(device)!;
    deviceStats.pv += 1;
    deviceStats.uv.add(uid);
  }

  return stats;
}

/**
 * 统计老MAKA模板拦截PV/UV
 * 通过v5workCreate事件的object_id作为作品id来关联作品，关联出拦截数
 */
async function collectOldMakaTemplateInterceptStats(
  appid: string,
  startTime: Date,
  endTime: Date
): Promise<StatsBySearchWordDevice> {
  const from = dayjs(startTime).unix();
  const to = dayjs(endTime).unix();

  // 先建立 distinct_id 到 uid 的映射
  const distinctIdToUid = await buildDistinctIdToUidMap(
    appid,
    startTime,
    endTime
  );

  // 查询v5workCreate事件，建立作品ID到搜索词的映射（老模板作品）
  const v5CreateQuery = `app_id: "${appid}" and object_type: "v5workCreate" and event: "click" and page_type: "search_page_mix" | SELECT object_id, search_word LIMIT 100000`;
  const v5CreateLogs = await queryV11SlsLogs({
    query: v5CreateQuery,
    from,
    to,
  });

  // 建立作品ID到搜索词的映射（从v5workCreate事件，这些是老模板作品）
  const oldMakaWorkIdToSearchWord = new Map<string, string>();
  for (const { raw } of v5CreateLogs) {
    const objectId = raw.object_id ? String(raw.object_id) : null;
    const searchWord = raw.search_word ? String(raw.search_word).trim() : null;
    if (objectId && searchWord && searchWord !== '') {
      oldMakaWorkIdToSearchWord.set(objectId, searchWord);
    }
  }

  if (oldMakaWorkIdToSearchWord.size === 0) {
    return new Map<SearchWordKey, Map<DeviceKey, PvUvStats>>();
  }

  // 查询拦截事件
  const query = `app_id: "${appid}" and page_type: "vip_page_block" | SELECT platform, distinct_id, uid, object_id LIMIT 100000`;
  const logs = await queryV11SlsLogs({ query, from, to });

  const stats = new Map<SearchWordKey, Map<DeviceKey, PvUvStats>>();

  // 查询作品信息（用于获取uid）
  const workIds = Array.from(oldMakaWorkIdToSearchWord.keys());
  const works = await prisma.worksEntity.findMany({
    where: {
      id: {
        in: workIds,
      },
    },
    select: {
      id: true,
      uid: true,
    },
  });

  const workMap = new Map(works.map(w => [w.id, w]));

  // 处理拦截事件日志，只统计老模板作品
  for (const { raw } of logs) {
    const objectId = raw.object_id ? String(raw.object_id) : null;
    if (!objectId) continue;

    // 只统计通过v5workCreate事件关联的老模板作品
    const searchWord = oldMakaWorkIdToSearchWord.get(objectId);
    if (!searchWord || searchWord === '') continue;

    // 获取uid
    let uid = raw.uid ? Number(raw.uid) : null;
    if (!uid && raw.distinct_id) {
      const distinctId = String(raw.distinct_id);
      uid = distinctIdToUid.get(distinctId) || null;
    }

    if (!uid) {
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

    if (!stats.has(searchWord)) {
      stats.set(searchWord, new Map<DeviceKey, PvUvStats>());
    }
    const searchWordStats = stats.get(searchWord)!;

    if (!searchWordStats.has(device)) {
      searchWordStats.set(device, { pv: 0, uv: new Set<number>() });
    }

    const deviceStats = searchWordStats.get(device)!;
    deviceStats.pv += 1;
    deviceStats.uv.add(uid);
  }

  return stats;
}

/**
 * 统计拦截PV/UV
 * 通过搜索词关联的作品，从sls v11-app-logs中获取，page_type为vip_page_block，object_id为作品id
 */
async function collectInterceptStatsBySearchWordAndDevice(
  appid: string,
  startTime: Date,
  endTime: Date
): Promise<StatsBySearchWordDevice> {
  const from = dayjs(startTime).unix();
  const to = dayjs(endTime).unix();

  // 先建立 distinct_id 到 uid 的映射
  const distinctIdToUid = await buildDistinctIdToUidMap(
    appid,
    startTime,
    endTime
  );

  // 查询拦截事件
  const query = `app_id: "${appid}" and page_type: "vip_page_block" | SELECT platform, distinct_id, uid, object_id LIMIT 100000`;
  const logs = await queryV11SlsLogs({ query, from, to });

  const stats = new Map<SearchWordKey, Map<DeviceKey, PvUvStats>>();

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
  const v5CreateQuery = `app_id: "${appid}" and object_type: "v5workCreate" and event: "click" and page_type: "search_page_mix" | SELECT object_id, search_word LIMIT 100000`;
  const v5CreateLogs = await queryV11SlsLogs({
    query: v5CreateQuery,
    from,
    to,
  });

  // 建立作品ID到搜索词的映射（从v5workCreate事件）
  const workIdToSearchWordFromV5 = new Map<string, string>();
  for (const { raw } of v5CreateLogs) {
    const objectId = raw.object_id ? String(raw.object_id) : null;
    const searchWord = raw.search_word ? String(raw.search_word).trim() : null;
    if (objectId && searchWord && searchWord !== '') {
      workIdToSearchWordFromV5.set(objectId, searchWord);
    }
  }

  // 处理拦截事件日志
  for (const { raw } of logs) {
    const objectId = raw.object_id ? String(raw.object_id) : null;
    if (!objectId) continue;

    const work = workMap.get(objectId);
    let searchWord: string | null = null;

    // 优先通过v5workCreate事件获取搜索词
    searchWord = workIdToSearchWordFromV5.get(objectId) || null;

    // 如果没有，则通过作品的metadata获取
    if (!searchWord && work) {
      searchWord = parseSearchWordFromMetadata(work.metadata);
      const { ref_page_type } = parseRefPageFromMetadata(work.metadata);
      if (ref_page_type !== 'search_page_mix') {
        searchWord = null;
      }
    }

    if (!searchWord || searchWord === '') continue;

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

    if (!stats.has(searchWord)) {
      stats.set(searchWord, new Map<DeviceKey, PvUvStats>());
    }
    const searchWordStats = stats.get(searchWord)!;

    if (!searchWordStats.has(device)) {
      searchWordStats.set(device, { pv: 0, uv: new Set<number>() });
    }

    const deviceStats = searchWordStats.get(device)!;
    deviceStats.pv += 1;
    deviceStats.uv.add(uid);
  }

  return stats;
}

/**
 * 统计成功PV/UV
 * 通过搜索词关联的作品，从sls v11-app-logs中获取，event为success，object_id为作品id
 */
async function collectSuccessStatsBySearchWordAndDevice(
  appid: string,
  startTime: Date,
  endTime: Date
): Promise<StatsBySearchWordDevice> {
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

  const stats = new Map<SearchWordKey, Map<DeviceKey, PvUvStats>>();

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
  const v5CreateQuery = `app_id: "${appid}" and object_type: "v5workCreate" and event: "click" and page_type: "search_page_mix" | SELECT object_id, search_word LIMIT 100000`;
  const v5CreateLogs = await queryV11SlsLogs({
    query: v5CreateQuery,
    from,
    to,
  });

  // 建立作品ID到搜索词的映射（从v5workCreate事件）
  const workIdToSearchWordFromV5 = new Map<string, string>();
  for (const { raw } of v5CreateLogs) {
    const objectId = raw.object_id ? String(raw.object_id) : null;
    const searchWord = raw.search_word ? String(raw.search_word).trim() : null;
    if (objectId && searchWord && searchWord !== '') {
      workIdToSearchWordFromV5.set(objectId, searchWord);
    }
  }

  // 处理成功事件日志
  for (const { raw } of logs) {
    const objectId = raw.object_id ? String(raw.object_id) : null;
    if (!objectId) continue;

    const work = workMap.get(objectId);
    let searchWord: string | null = null;

    // 优先通过v5workCreate事件获取搜索词
    searchWord = workIdToSearchWordFromV5.get(objectId) || null;

    // 如果没有，则通过作品的metadata获取
    if (!searchWord && work) {
      searchWord = parseSearchWordFromMetadata(work.metadata);
      const { ref_page_type } = parseRefPageFromMetadata(work.metadata);
      if (ref_page_type !== 'search_page_mix') {
        searchWord = null;
      }
    }

    if (!searchWord || searchWord === '') continue;

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

    if (!stats.has(searchWord)) {
      stats.set(searchWord, new Map<DeviceKey, PvUvStats>());
    }
    const searchWordStats = stats.get(searchWord)!;

    if (!searchWordStats.has(device)) {
      searchWordStats.set(device, { pv: 0, uv: new Set<number>() });
    }

    const deviceStats = searchWordStats.get(device)!;
    deviceStats.pv += 1;
    deviceStats.uv.add(uid);
  }

  return stats;
}

/**
 * 统计订单数和GMV
 * 从order_record_entity获取，直接通过ref_page_id作为搜索词
 */
async function collectOrderStatsBySearchWordAndDevice(
  appid: string,
  startTime: Date,
  endTime: Date
): Promise<
  Map<SearchWordKey, Map<DeviceKey, { order_count: number; gmv: number }>>
> {
  // 查询订单记录
  const orders = await prisma.orderRecordEntity.findMany({
    where: {
      appid,
      deleted: false,
      payment_time: {
        gte: startTime,
        lte: endTime,
      },
      ref_page_type: 'search_page_mix',
      ref_page_id: {
        not: null,
      },
    },
    select: {
      uid: true,
      order_amount: true,
      ref_page_id: true,
    },
  });

  const statsBySearchWordDevice = new Map<
    SearchWordKey,
    Map<DeviceKey, { order_count: number; gmv: number }>
  >();

  if (!orders.length) {
    return statsBySearchWordDevice;
  }

  // 获取所有uid
  const uids = Array.from(
    new Set(orders.map(o => o.uid).filter(uid => !innerUids.includes(uid)))
  );
  const deviceMap = await queryUserDevices(uids, { appids: [appid] });

  console.log('orders', orders.length);
  // 处理订单
  for (const order of orders) {
    if (innerUids.includes(order.uid)) continue;

    const searchWord = order.ref_page_id
      ? String(order.ref_page_id).trim()
      : '';

    if (!searchWord || searchWord === '') continue;

    const rawDevice = deviceMap.get(order.uid) || 'other';
    const device = normalizeDevice(rawDevice);

    if (!statsBySearchWordDevice.has(searchWord)) {
      statsBySearchWordDevice.set(searchWord, new Map());
    }
    const searchWordStats = statsBySearchWordDevice.get(searchWord)!;

    if (!searchWordStats.has(device)) {
      searchWordStats.set(device, {
        order_count: 0,
        gmv: 0,
      });
    }

    const stats = searchWordStats.get(device)!;
    stats.order_count += 1;
    stats.gmv += Number(order.order_amount) || 0;
  }
  return statsBySearchWordDevice;
}

/**
 * 获取搜索页面的模板数统计（template_count和old_template_count）
 * 从搜索记录中获取
 */
async function getTemplateCountsBySearchWord(
  appid: string,
  startTime: Date,
  endTime: Date
): Promise<
  Map<SearchWordKey, { template_count: number; old_template_count: number }>
> {
  const from = dayjs(startTime).unix();
  const to = dayjs(endTime).unix();

  const query = `app_id: "${appid}" and event: "page_view" and page_type: "search_page_mix" | SELECT search_word, template_count, old_template_count LIMIT 100000`;
  const logs = await queryV11SlsLogs({ query, from, to });

  const counts = new Map<
    SearchWordKey,
    { template_count: number; old_template_count: number }
  >();

  for (const { raw } of logs) {
    const searchWord = raw.search_word ? String(raw.search_word).trim() : null;
    if (!searchWord || searchWord === '') continue;

    const templateCount = raw.template_count ? Number(raw.template_count) : 0;
    const oldTemplateCount = raw.old_template_count
      ? Number(raw.old_template_count)
      : 0;

    // 取每个搜索词的最大值（因为可能有多次搜索，模板数可能不同）
    if (!counts.has(searchWord)) {
      counts.set(searchWord, { template_count: 0, old_template_count: 0 });
    }
    const current = counts.get(searchWord)!;
    if (templateCount > current.template_count) {
      current.template_count = templateCount;
    }
    if (oldTemplateCount > current.old_template_count) {
      current.old_template_count = oldTemplateCount;
    }
  }

  return counts;
}

/**
 * 合并两个StatsBySearchWordDevice结果
 */
function mergeStats(
  stats1: StatsBySearchWordDevice,
  stats2: StatsBySearchWordDevice
): StatsBySearchWordDevice {
  const merged = new Map<SearchWordKey, Map<DeviceKey, PvUvStats>>();

  // 合并stats1
  for (const [searchWord, deviceMap] of stats1.entries()) {
    if (!merged.has(searchWord)) {
      merged.set(searchWord, new Map<DeviceKey, PvUvStats>());
    }
    const mergedSearchWordMap = merged.get(searchWord)!;

    for (const [device, stats] of deviceMap.entries()) {
      if (!mergedSearchWordMap.has(device)) {
        mergedSearchWordMap.set(device, { pv: 0, uv: new Set<number>() });
      }
      const mergedStats = mergedSearchWordMap.get(device)!;
      mergedStats.pv += stats.pv;
      for (const uid of stats.uv) {
        mergedStats.uv.add(uid);
      }
    }
  }

  // 合并stats2
  for (const [searchWord, deviceMap] of stats2.entries()) {
    if (!merged.has(searchWord)) {
      merged.set(searchWord, new Map<DeviceKey, PvUvStats>());
    }
    const mergedSearchWordMap = merged.get(searchWord)!;

    for (const [device, stats] of deviceMap.entries()) {
      if (!mergedSearchWordMap.has(device)) {
        mergedSearchWordMap.set(device, { pv: 0, uv: new Set<number>() });
      }
      const mergedStats = mergedSearchWordMap.get(device)!;
      mergedStats.pv += stats.pv;
      for (const uid of stats.uv) {
        mergedStats.uv.add(uid);
      }
    }
  }

  return merged;
}

/**
 * 统计某天的搜索BI数据（按 appid + 日期 + 搜索词 + 设备）
 */
async function statBiSearchTermDaily(
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
    `开始统计 BiSearchTermDailyEntity，appid=${appid}，日期=${dateStr}，时间范围=${dayjs(startTime).toISOString()} ~ ${dayjs(endTime).toISOString()}`
  );

  // 1. 统计浏览PV/UV
  const viewStats = await collectViewStatsBySearchWordAndDevice(
    appid,
    startTime,
    endTime
  );

  // 2. 统计模板点击PV/UV（新模板）
  const templateClickStats =
    await collectTemplateClickStatsBySearchWordAndDevice(
      appid,
      startTime,
      endTime
    );

  // 3. 统计老MAKA模板点击PV/UV
  const oldMakaTemplateClickStats =
    await collectOldMakaTemplateClickStatsBySearchWordAndDevice(
      appid,
      startTime,
      endTime
    );

  // 4. 统计创作PV/UV（两个数据源）
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

  // 5. 统计拦截PV/UV
  const interceptStats = await collectInterceptStatsBySearchWordAndDevice(
    appid,
    startTime,
    endTime
  );

  // 6. 统计成功PV/UV
  const successStats = await collectSuccessStatsBySearchWordAndDevice(
    appid,
    startTime,
    endTime
  );

  // 7. 统计老MAKA模板创作PV/UV
  const oldMakaTemplateCreationStats =
    await collectOldMakaTemplateCreationStats(appid, startTime, endTime);

  // 8. 统计老MAKA模板成功PV/UV
  const oldMakaTemplateSuccessStats = await collectOldMakaTemplateSuccessStats(
    appid,
    startTime,
    endTime
  );

  // 9. 统计老MAKA模板拦截PV/UV
  const oldMakaTemplateInterceptStats =
    await collectOldMakaTemplateInterceptStats(appid, startTime, endTime);

  // 10. 统计订单数和GMV
  const orderStats = await collectOrderStatsBySearchWordAndDevice(
    appid,
    startTime,
    endTime
  );

  // 11. 获取模板数统计
  const templateCounts = await getTemplateCountsBySearchWord(
    appid,
    startTime,
    endTime
  );

  // 12. 汇总所有出现过的搜索词和设备
  const allSearchWords = new Set<SearchWordKey>();
  const allDevices = new Set<DeviceKey>();

  viewStats.forEach((_, searchWord) => allSearchWords.add(searchWord));
  templateClickStats.forEach((_, searchWord) => allSearchWords.add(searchWord));
  oldMakaTemplateClickStats.forEach((_, searchWord) =>
    allSearchWords.add(searchWord)
  );
  creationStats.forEach((_, searchWord) => allSearchWords.add(searchWord));
  interceptStats.forEach((_, searchWord) => allSearchWords.add(searchWord));
  successStats.forEach((_, searchWord) => allSearchWords.add(searchWord));
  oldMakaTemplateCreationStats.forEach((_, searchWord) =>
    allSearchWords.add(searchWord)
  );
  oldMakaTemplateSuccessStats.forEach((_, searchWord) =>
    allSearchWords.add(searchWord)
  );
  oldMakaTemplateInterceptStats.forEach((_, searchWord) =>
    allSearchWords.add(searchWord)
  );
  orderStats.forEach((_, searchWord) => allSearchWords.add(searchWord));

  for (const searchWord of allSearchWords) {
    const viewData = viewStats.get(searchWord);
    if (viewData) {
      viewData.forEach((_, device) => allDevices.add(device));
    }
    const clickData = templateClickStats.get(searchWord);
    if (clickData) {
      clickData.forEach((_, device) => allDevices.add(device));
    }
    const oldMakaClickData = oldMakaTemplateClickStats.get(searchWord);
    if (oldMakaClickData) {
      oldMakaClickData.forEach((_, device) => allDevices.add(device));
    }
    const creationData = creationStats.get(searchWord);
    if (creationData) {
      creationData.forEach((_, device) => allDevices.add(device));
    }
    const interceptData = interceptStats.get(searchWord);
    if (interceptData) {
      interceptData.forEach((_, device) => allDevices.add(device));
    }
    const successData = successStats.get(searchWord);
    if (successData) {
      successData.forEach((_, device) => allDevices.add(device));
    }
    const oldMakaCreationData = oldMakaTemplateCreationStats.get(searchWord);
    if (oldMakaCreationData) {
      oldMakaCreationData.forEach((_, device) => allDevices.add(device));
    }
    const oldMakaSuccessData = oldMakaTemplateSuccessStats.get(searchWord);
    if (oldMakaSuccessData) {
      oldMakaSuccessData.forEach((_, device) => allDevices.add(device));
    }
    const oldMakaInterceptData = oldMakaTemplateInterceptStats.get(searchWord);
    if (oldMakaInterceptData) {
      oldMakaInterceptData.forEach((_, device) => allDevices.add(device));
    }
    const orderData = orderStats.get(searchWord);
    if (orderData) {
      orderData.forEach((_, device) => allDevices.add(device));
    }
  }

  if (allSearchWords.size === 0) {
    console.log('未找到任何搜索词数据');
    return;
  }

  const repDateStr = dayjs(statDate).startOf('day').toDate();

  // 10. 先删除该日期和appid的所有数据
  console.log(`开始删除 appid=${appid}，日期=${dateStr} 的旧数据...`);
  try {
    const deleteResult = await prisma.biSearchTermDailyEntity.deleteMany({
      where: {
        appid,
        date: repDateStr,
      },
    });
    console.log(`已删除 ${deleteResult.count} 条旧数据`);
  } catch (e) {
    console.error('删除旧数据失败：', (e as Error).message || e);
    throw e;
  }

  // 11. 收集所有需要插入的数据
  const insertData: Array<{
    appid: string;
    search_word: string;
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
    template_count: number;
    old_maka_template_count: number;
    old_maka_template_click_pv: number;
    old_maka_template_click_uv: number;
    old_maka_template_creation_pv: number;
    old_maka_template_creation_uv: number;
    old_maka_template_intercept_pv: number;
    old_maka_template_intercept_uv: number;
    old_maka_template_success_pv: number;
    old_maka_template_success_uv: number;
  }> = [];

  for (const searchWord of allSearchWords) {
    for (const device of allDevices) {
      const viewData = viewStats.get(searchWord)?.get(device);
      const view_pv = viewData?.pv || 0;
      const view_uv = viewData?.uv.size || 0;

      const clickData = templateClickStats.get(searchWord)?.get(device);
      const template_click_pv = clickData?.pv || 0;
      const template_click_uv = clickData?.uv.size || 0;

      const oldMakaClickData = oldMakaTemplateClickStats
        .get(searchWord)
        ?.get(device);
      const old_maka_template_click_pv = oldMakaClickData?.pv || 0;
      const old_maka_template_click_uv = oldMakaClickData?.uv.size || 0;

      const creationData = creationStats.get(searchWord)?.get(device);
      const creation_pv = creationData?.pv || 0;
      const creation_uv = creationData?.uv.size || 0;

      const interceptData = interceptStats.get(searchWord)?.get(device);
      const intercept_pv = interceptData?.pv || 0;
      const intercept_uv = interceptData?.uv.size || 0;

      const successData = successStats.get(searchWord)?.get(device);
      const success_pv = successData?.pv || 0;
      const success_uv = successData?.uv.size || 0;

      const orderData = orderStats.get(searchWord)?.get(device);
      const order_count = orderData?.order_count || 0;
      const gmv = orderData?.gmv ? Math.round(orderData.gmv) / 100 : 0;

      const templateCountData = templateCounts.get(searchWord);
      const template_count = templateCountData?.template_count || 0;
      const old_maka_template_count =
        templateCountData?.old_template_count || 0;

      // 节省存储空间，view_pv为0的不需要进行记录存储
      if (view_pv === 0 && order_count === 0) {
        continue;
      }

      // 老MAKA模板的创作、拦截、成功数据
      const oldMakaCreationData = oldMakaTemplateCreationStats
        .get(searchWord)
        ?.get(device);
      const old_maka_template_creation_pv = oldMakaCreationData?.pv || 0;
      const old_maka_template_creation_uv = oldMakaCreationData?.uv.size || 0;

      const oldMakaInterceptData = oldMakaTemplateInterceptStats
        .get(searchWord)
        ?.get(device);
      const old_maka_template_intercept_pv = oldMakaInterceptData?.pv || 0;
      const old_maka_template_intercept_uv = oldMakaInterceptData?.uv.size || 0;

      const oldMakaSuccessData = oldMakaTemplateSuccessStats
        .get(searchWord)
        ?.get(device);
      const old_maka_template_success_pv = oldMakaSuccessData?.pv || 0;
      const old_maka_template_success_uv = oldMakaSuccessData?.uv.size || 0;

      insertData.push({
        appid,
        search_word: searchWord,
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
        template_count,
        old_maka_template_count,
        old_maka_template_click_pv,
        old_maka_template_click_uv,
        old_maka_template_creation_pv,
        old_maka_template_creation_uv,
        old_maka_template_intercept_pv,
        old_maka_template_intercept_uv,
        old_maka_template_success_pv,
        old_maka_template_success_uv,
      });
    }
  }

  // 12. 批量插入，每批500条
  const BATCH_SIZE = 500;
  let successCount = 0;
  let errorCount = 0;

  console.log(
    `开始批量插入 ${insertData.length} 条数据，每批 ${BATCH_SIZE} 条...`
  );

  for (let i = 0; i < insertData.length; i += BATCH_SIZE) {
    const batch = insertData.slice(i, i + BATCH_SIZE);
    try {
      await prisma.biSearchTermDailyEntity.createMany({
        data: batch,
        skipDuplicates: true,
      });
      successCount += batch.length;
      console.log(
        `  批量插入成功：第 ${Math.floor(i / BATCH_SIZE) + 1} 批，${batch.length} 条数据`
      );
    } catch (e) {
      errorCount += batch.length;
      console.error(
        `  批量插入失败：第 ${Math.floor(i / BATCH_SIZE) + 1} 批，${batch.length} 条数据：`,
        (e as Error).message || e
      );
    }
  }

  console.log(
    `BiSearchTermDailyEntity 统计完成，appid=${appid}，日期=${dateStr}，成功=${successCount}，失败=${errorCount}`
  );
}

/**
 * CLI 入口：
 * - 使用方式：
 *   - 显式指定：pnpm run:job jiantie/2026/dwd_bi_search <appid> [YYYY-MM-DD]
 *     - 例如：node dwd_bi_search.js jiantie 2026-01-01
 *   - 不传任何参数：默认跑最近 2 天，appid 为 jiantie 和 maka
 */
async function runDefaultLast2Days() {
  const appids = ['maka'];

  const today = dayjs().startOf('day').toDate();

  for (const appid of appids) {
    for (let i = 7; i >= 0; i--) {
      const d = dayjs(today).subtract(i, 'day');
      const dateStr = d.format('YYYY-MM-DD');

      console.log(
        `默认任务：开始统计 BiSearchTermDailyEntity，appid=${appid}，日期=${dateStr}`
      );
      await statBiSearchTermDaily(appid, dateStr);
    }
  }
}

async function main() {
  try {
    const appid = process.argv[2];
    const dateArg = process.argv[3];

    if (!appid) {
      console.log(
        '未指定 appid，使用默认配置：appid = [jiantie, maka, wenzy, preschool, gov]，统计最近 2 天（含今天）'
      );
      await runDefaultLast2Days();
      process.exitCode = 0;
      return;
    }

    await statBiSearchTermDaily(appid, dateArg);
    process.exitCode = 0;
  } catch (error) {
    console.error('执行 BiSearchTermDaily 统计失败：', error);
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
export { statBiSearchTermDaily };

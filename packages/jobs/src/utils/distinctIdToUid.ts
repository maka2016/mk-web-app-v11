import dayjs from 'dayjs';
import { innerUids } from '../jiantie/entry/innerUids';
import { queryV11SlsLogs } from './sls';

/**
 * distinct_id -> uid 的结果缓存，按 appid + 时间范围维度缓存
 * 由于 Job 的时间范围一般是固定的，进程级缓存即可避免重复查询
 */
const distinctIdToUidCache = new Map<string, Map<string, number>>();

function getDistinctIdToUidCacheKey(
  appid: string,
  startTime: Date,
  endTime: Date
): string {
  const from = dayjs(startTime).unix();
  const to = dayjs(endTime).unix();
  return `${appid}-${from}-${to}`;
}

/**
 * 从 SLS 建立 distinct_id 到 uid 的映射
 * 查询所有有 uid 的事件来建立映射关系
 * 增加进程内缓存，避免相同时间范围内重复查询
 */
export async function buildDistinctIdToUidMap(
  appid: string,
  startTime: Date,
  endTime: Date
): Promise<Map<string, number>> {
  const cacheKey = getDistinctIdToUidCacheKey(appid, startTime, endTime);
  const cached = distinctIdToUidCache.get(cacheKey);
  if (cached) {
    return cached;
  }

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

  distinctIdToUidCache.set(cacheKey, distinctIdToUid);

  return distinctIdToUid;
}


//模板统计信息每日生成，BiTemplateDailyEntity
//入参为appid和日期
//排除innerUids
//需要根据distinct_id补齐uid

//scene_type通过page_type来区分，基本为tag_channel或者hotword_channel或者search_page_mix

//template_type根据是否能从tempalte_entity表中查询到来区分，能查到则为v11，否则为old

//曝光数据来源
//sls：v11-app-logs：v11-app-logs中获取，event为show，object_type为template_item或者old_template_item

//点击数据来源
//sls：v11-app-logs：v11-app-logs中获取，event为click，object_type为template_item或者old_template_item

//创作数据来源
//v11模板的话从works_entity表中获取，template_id为模板id，根据meta信息区分scene_type
//老模板先算为0

//拦截数据来源
//sls：v11-app-logs：v11-app-logs中获取，page_type为vip_page_block，关联作品的template_id为模板id，通过meta信息区分scene_type

//成功数据来源
//sls：v11-app-logs：v11-app-logs中获取，event为success，关联作品的template_id为模板id，通过meta信息区分scene_type

//订单数据来源
//从order_record_entity表中获取，时间使用payment_time
//通过work_id关联到作品，再通过作品的template_id和metadata来关联模板和场景

import dayjs from 'dayjs';
import { getEndOfDay, getStartOfDay, parseDate } from '../../utils/utils';
import { closeAllConnections, getPrisma } from '../../service/db-connections';
import { innerUids } from '../../jiantie/entry/innerUids';
import { queryV11SlsLogs } from '../../utils/sls';
import { buildDistinctIdToUidMap } from '../../utils/distinctIdToUid';
import { parseRefPageFromMetadata } from '../../utils/utils';

// 获取数据库连接（单例）
const prisma = getPrisma();

type TemplateKey = string; // template_id
type SceneKey = string; // scene_type: channel, search, other
type TemplateType = 'v11' | 'old';

interface PvUvStats {
  pv: number;
  uv: Set<number>;
}

type StatsByTemplateScene = Map<
  TemplateKey,
  Map<SceneKey, Map<TemplateType, PvUvStats>>
>;

/**
 * 根据 page_type 转换为 scene_type
 */
function getSceneTypeFromPageType(pageType: string | null | undefined): string {
  if (!pageType) return 'other';
  if (pageType === 'tag_channel') {
    return 'tag_channel';
  }
  if (pageType === 'hotword_channel') {
    return 'hotword_channel';
  }
  if (pageType === 'search_page_mix' || pageType === 'search_page') {
    return 'search_page';
  }
  return 'other';
}

/**
 * 批量获取模板类型
 */
async function getTemplateTypes(
  templateIds: string[]
): Promise<Map<string, TemplateType>> {
  const result = new Map<string, TemplateType>();
  if (templateIds.length === 0) return result;

  const templates = await prisma.templateEntity.findMany({
    where: { id: { in: templateIds } },
    select: { id: true },
  });

  const v11TemplateIds = new Set(templates.map(t => t.id));

  for (const templateId of templateIds) {
    result.set(templateId, v11TemplateIds.has(templateId) ? 'v11' : 'old');
  }

  return result;
}

/**
 * 统计模板的曝光PV/UV
 * event为show，object_type为template_item或old_template_item
 */
async function collectExposureStatsByTemplateAndScene(
  appid: string,
  startTime: Date,
  endTime: Date
): Promise<StatsByTemplateScene> {
  const from = dayjs(startTime).unix();
  const to = dayjs(endTime).unix();

  // 先建立 distinct_id 到 uid 的映射
  const distinctIdToUid = await buildDistinctIdToUidMap(
    appid,
    startTime,
    endTime
  );

  const query = `app_id: "${appid}" and event: "show" and (object_type: "template_item" or object_type: "old_template_item") | SELECT platform, distinct_id, uid, object_id, page_type LIMIT 100000`;
  const logs = await queryV11SlsLogs({ query, from, to });

  const stats = new Map<
    TemplateKey,
    Map<SceneKey, Map<TemplateType, PvUvStats>>
  >();

  // 收集所有模板ID
  const templateIds = Array.from(
    new Set(
      logs
        .map(log => log.raw.object_id)
        .filter((id): id is string => !!id && typeof id === 'string')
    )
  );

  if (templateIds.length === 0) {
    return stats;
  }

  // 批量获取模板类型
  const templateTypeMap = await getTemplateTypes(templateIds);

  // 处理日志
  for (const { raw } of logs) {
    const templateId = raw.object_id ? String(raw.object_id) : null;
    if (!templateId) continue;

    // 优先使用原始 uid，如果没有则通过 distinct_id 匹配补全
    let uid = raw.uid ? Number(raw.uid) : null;
    if (!uid && raw.distinct_id) {
      const distinctId = String(raw.distinct_id);
      uid = distinctIdToUid.get(distinctId) || null;
    }

    if (!uid || innerUids.includes(uid)) {
      continue;
    }

    const pageType = raw.page_type ? String(raw.page_type) : null;
    const sceneType = getSceneTypeFromPageType(pageType);
    const templateType = templateTypeMap.get(templateId) || 'old';

    if (!stats.has(templateId)) {
      stats.set(templateId, new Map<SceneKey, Map<TemplateType, PvUvStats>>());
    }
    const templateStats = stats.get(templateId)!;

    if (!templateStats.has(sceneType)) {
      templateStats.set(sceneType, new Map<TemplateType, PvUvStats>());
    }
    const sceneStats = templateStats.get(sceneType)!;

    if (!sceneStats.has(templateType)) {
      sceneStats.set(templateType, { pv: 0, uv: new Set<number>() });
    }

    const typeStats = sceneStats.get(templateType)!;
    typeStats.pv += 1;
    typeStats.uv.add(uid);
  }

  return stats;
}

/**
 * 统计模板的点击PV/UV
 * event为click，object_type为template_item或old_template_item
 */
async function collectClickStatsByTemplateAndScene(
  appid: string,
  startTime: Date,
  endTime: Date
): Promise<StatsByTemplateScene> {
  const from = dayjs(startTime).unix();
  const to = dayjs(endTime).unix();

  // 先建立 distinct_id 到 uid 的映射
  const distinctIdToUid = await buildDistinctIdToUidMap(
    appid,
    startTime,
    endTime
  );

  const query = `app_id: "${appid}" and event: "click" and (object_type: "template_item" or object_type: "old_template_item") | SELECT platform, distinct_id, uid, object_id, page_type LIMIT 100000`;
  const logs = await queryV11SlsLogs({ query, from, to });

  const stats = new Map<
    TemplateKey,
    Map<SceneKey, Map<TemplateType, PvUvStats>>
  >();

  // 收集所有模板ID
  const templateIds = Array.from(
    new Set(
      logs
        .map(log => log.raw.object_id)
        .filter((id): id is string => !!id && typeof id === 'string')
    )
  );

  if (templateIds.length === 0) {
    return stats;
  }

  // 批量获取模板类型
  const templateTypeMap = await getTemplateTypes(templateIds);

  // 处理日志
  for (const { raw } of logs) {
    const templateId = raw.object_id ? String(raw.object_id) : null;
    if (!templateId) continue;

    // 优先使用原始 uid，如果没有则通过 distinct_id 匹配补全
    let uid = raw.uid ? Number(raw.uid) : null;
    if (!uid && raw.distinct_id) {
      const distinctId = String(raw.distinct_id);
      uid = distinctIdToUid.get(distinctId) || null;
    }

    if (!uid || innerUids.includes(uid)) {
      continue;
    }

    const pageType = raw.page_type ? String(raw.page_type) : null;
    const sceneType = getSceneTypeFromPageType(pageType);
    const templateType = templateTypeMap.get(templateId) || 'old';

    if (!stats.has(templateId)) {
      stats.set(templateId, new Map<SceneKey, Map<TemplateType, PvUvStats>>());
    }
    const templateStats = stats.get(templateId)!;

    if (!templateStats.has(sceneType)) {
      templateStats.set(sceneType, new Map<TemplateType, PvUvStats>());
    }
    const sceneStats = templateStats.get(sceneType)!;

    if (!sceneStats.has(templateType)) {
      sceneStats.set(templateType, { pv: 0, uv: new Set<number>() });
    }

    const typeStats = sceneStats.get(templateType)!;
    typeStats.pv += 1;
    typeStats.uv.add(uid);
  }

  return stats;
}

/**
 * 统计模板的创作PV/UV
 * v11模板从works_entity表获取，老模板先算为0
 */
async function collectCreationStatsByTemplateAndScene(
  appid: string,
  startTime: Date,
  endTime: Date
): Promise<StatsByTemplateScene> {
  const stats = new Map<
    TemplateKey,
    Map<SceneKey, Map<TemplateType, PvUvStats>>
  >();

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
      template_id: {
        not: null,
      },
    },
    select: {
      id: true,
      uid: true,
      template_id: true,
      metadata: true,
    },
  });

  if (!works.length) {
    return stats;
  }

  // 只处理v11模板（template_id能在template_entity表中查到）
  const templateIds = Array.from(
    new Set(works.map(w => w.template_id).filter((id): id is string => !!id))
  );

  if (templateIds.length === 0) {
    return stats;
  }

  // 批量获取模板类型
  const templateTypeMap = await getTemplateTypes(templateIds);

  // 只处理v11模板
  const v11Works = works.filter(
    work => work.template_id && templateTypeMap.get(work.template_id) === 'v11'
  );

  if (!v11Works.length) {
    return stats;
  }

  // 按模板和场景聚合
  for (const work of v11Works) {
    if (!work.template_id) continue;

    const { ref_page_type } = parseRefPageFromMetadata(work.metadata);
    const sceneType = getSceneTypeFromPageType(ref_page_type);
    const templateType = templateTypeMap.get(work.template_id) || 'v11';

    if (!stats.has(work.template_id)) {
      stats.set(
        work.template_id,
        new Map<SceneKey, Map<TemplateType, PvUvStats>>()
      );
    }
    const templateStats = stats.get(work.template_id)!;

    if (!templateStats.has(sceneType)) {
      templateStats.set(sceneType, new Map<TemplateType, PvUvStats>());
    }
    const sceneStats = templateStats.get(sceneType)!;

    if (!sceneStats.has(templateType)) {
      sceneStats.set(templateType, { pv: 0, uv: new Set<number>() });
    }

    const typeStats = sceneStats.get(templateType)!;
    typeStats.pv += 1;
    typeStats.uv.add(work.uid);
  }

  return stats;
}

/**
 * 统计模板的拦截PV/UV
 * page_type为vip_page_block，关联作品的template_id为模板id，通过meta信息区分scene_type
 */
async function collectInterceptStatsByTemplateAndScene(
  appid: string,
  startTime: Date,
  endTime: Date
): Promise<StatsByTemplateScene> {
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

  const stats = new Map<
    TemplateKey,
    Map<SceneKey, Map<TemplateType, PvUvStats>>
  >();

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
      template_id: true,
      metadata: true,
    },
  });

  const workMap = new Map(works.map(w => [w.id, w]));

  // 收集所有模板ID
  const templateIds = Array.from(
    new Set(works.map(w => w.template_id).filter((id): id is string => !!id))
  );

  if (templateIds.length === 0) {
    return stats;
  }

  // 批量获取模板类型
  const templateTypeMap = await getTemplateTypes(templateIds);

  // 处理日志
  for (const { raw } of logs) {
    const objectId = raw.object_id ? String(raw.object_id) : null;
    if (!objectId) continue;

    const work = workMap.get(objectId);
    if (!work || !work.template_id) continue;

    // 优先使用原始 uid，如果没有则通过 distinct_id 匹配补全
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

    const { ref_page_type } = parseRefPageFromMetadata(work.metadata);
    const sceneType = getSceneTypeFromPageType(ref_page_type);
    const templateType = templateTypeMap.get(work.template_id) || 'old';

    if (!stats.has(work.template_id)) {
      stats.set(
        work.template_id,
        new Map<SceneKey, Map<TemplateType, PvUvStats>>()
      );
    }
    const templateStats = stats.get(work.template_id)!;

    if (!templateStats.has(sceneType)) {
      templateStats.set(sceneType, new Map<TemplateType, PvUvStats>());
    }
    const sceneStats = templateStats.get(sceneType)!;

    if (!sceneStats.has(templateType)) {
      sceneStats.set(templateType, { pv: 0, uv: new Set<number>() });
    }

    const typeStats = sceneStats.get(templateType)!;
    typeStats.pv += 1;
    typeStats.uv.add(uid);
  }

  return stats;
}

/**
 * 统计模板的成功PV/UV
 * event为success，关联作品的template_id为模板id，通过meta信息区分scene_type
 */
async function collectSuccessStatsByTemplateAndScene(
  appid: string,
  startTime: Date,
  endTime: Date
): Promise<StatsByTemplateScene> {
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

  const stats = new Map<
    TemplateKey,
    Map<SceneKey, Map<TemplateType, PvUvStats>>
  >();

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
      template_id: true,
      metadata: true,
    },
  });

  const workMap = new Map(works.map(w => [w.id, w]));

  // 收集所有模板ID
  const templateIds = Array.from(
    new Set(works.map(w => w.template_id).filter((id): id is string => !!id))
  );

  if (templateIds.length === 0) {
    return stats;
  }

  // 批量获取模板类型
  const templateTypeMap = await getTemplateTypes(templateIds);

  // 处理日志
  for (const { raw } of logs) {
    const objectId = raw.object_id ? String(raw.object_id) : null;
    if (!objectId) continue;

    const work = workMap.get(objectId);
    if (!work || !work.template_id) continue;

    // 优先使用原始 uid，如果没有则通过 distinct_id 匹配补全
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

    const { ref_page_type } = parseRefPageFromMetadata(work.metadata);
    const sceneType = getSceneTypeFromPageType(ref_page_type);
    const templateType = templateTypeMap.get(work.template_id) || 'old';

    if (!stats.has(work.template_id)) {
      stats.set(
        work.template_id,
        new Map<SceneKey, Map<TemplateType, PvUvStats>>()
      );
    }
    const templateStats = stats.get(work.template_id)!;

    if (!templateStats.has(sceneType)) {
      templateStats.set(sceneType, new Map<TemplateType, PvUvStats>());
    }
    const sceneStats = templateStats.get(sceneType)!;

    if (!sceneStats.has(templateType)) {
      sceneStats.set(templateType, { pv: 0, uv: new Set<number>() });
    }

    const typeStats = sceneStats.get(templateType)!;
    typeStats.pv += 1;
    typeStats.uv.add(uid);
  }

  return stats;
}

/**
 * 统计模板的订单数和GMV
 * 从order_record_entity获取，直接使用template_id和ref_page_type字段
 * 如果template_id为空，则通过work_id关联作品获取template_id（向后兼容）
 */
async function collectOrderStatsByTemplateAndScene(
  appid: string,
  startTime: Date,
  endTime: Date
): Promise<
  Map<
    TemplateKey,
    Map<SceneKey, Map<TemplateType, { order_count: number; gmv: number }>>
  >
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
      template_id: true,
      ref_page_type: true,
      order_amount: true,
    },
  });

  const statsByTemplateScene = new Map<
    TemplateKey,
    Map<SceneKey, Map<TemplateType, { order_count: number; gmv: number }>>
  >();

  if (!orderRecords.length) {
    return statsByTemplateScene;
  }

  // 找出没有template_id的订单，需要通过work_id关联作品获取
  const orderRecordsWithoutTemplateId = orderRecords.filter(
    o => !o.template_id
  );

  // 处理没有template_id的订单（向后兼容）
  let workMap = new Map<
    string,
    { template_id: string | null; metadata: any }
  >();
  if (orderRecordsWithoutTemplateId.length > 0) {
    const workIds = Array.from(
      new Set(
        orderRecordsWithoutTemplateId
          .map(o => o.work_id)
          .filter((id): id is string => !!id && typeof id === 'string')
      )
    );

    if (workIds.length > 0) {
      const works = await prisma.worksEntity.findMany({
        where: {
          id: {
            in: workIds,
          },
        },
        select: {
          id: true,
          template_id: true,
          metadata: true,
        },
      });

      workMap = new Map(
        works.map(w => [
          w.id,
          { template_id: w.template_id, metadata: w.metadata },
        ])
      );
    }
  }

  // 收集所有模板ID（包括直接获取的和从作品获取的）
  const templateIds = new Set<string>();
  for (const orderRecord of orderRecords) {
    if (orderRecord.template_id) {
      templateIds.add(orderRecord.template_id);
    } else if (orderRecord.work_id) {
      const work = workMap.get(orderRecord.work_id);
      if (work?.template_id) {
        templateIds.add(work.template_id);
      }
    }
  }

  if (templateIds.size === 0) {
    return statsByTemplateScene;
  }

  // 批量获取模板类型
  const templateTypeMap = await getTemplateTypes(Array.from(templateIds));

  // 处理订单
  for (const orderRecord of orderRecords) {
    if (innerUids.includes(orderRecord.uid)) continue;

    if (!orderRecord.work_id) continue;

    // 优先使用order_record_entity中的template_id，如果没有则从作品获取
    let template_id: string | null = orderRecord.template_id;
    let ref_page_type: string | null = orderRecord.ref_page_type;

    if (!template_id) {
      const work = workMap.get(orderRecord.work_id);
      if (!work || !work.template_id) continue;
      template_id = work.template_id;
      // 如果order_record_entity中没有ref_page_type，尝试从作品的metadata解析
      if (!ref_page_type && work.metadata) {
        const parsed = parseRefPageFromMetadata(work.metadata);
        ref_page_type = parsed.ref_page_type || null;
      }
    }

    if (!template_id) continue;

    const sceneType = getSceneTypeFromPageType(ref_page_type);
    const templateType = templateTypeMap.get(template_id) || 'old';

    if (!statsByTemplateScene.has(template_id)) {
      statsByTemplateScene.set(
        template_id,
        new Map<
          SceneKey,
          Map<TemplateType, { order_count: number; gmv: number }>
        >()
      );
    }
    const templateStats = statsByTemplateScene.get(template_id)!;

    if (!templateStats.has(sceneType)) {
      templateStats.set(
        sceneType,
        new Map<TemplateType, { order_count: number; gmv: number }>()
      );
    }
    const sceneStats = templateStats.get(sceneType)!;

    if (!sceneStats.has(templateType)) {
      sceneStats.set(templateType, {
        order_count: 0,
        gmv: 0,
      });
    }

    const stats = sceneStats.get(templateType)!;
    stats.order_count += 1;
    stats.gmv += Number(orderRecord.order_amount) || 0;
  }

  return statsByTemplateScene;
}

/**
 * 统计某天的模板BI数据（按 appid + 日期 + 模板 + 模板类型 + 场景类型）
 */
async function statBiTemplateDaily(
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
    `开始统计 BiTemplateDailyEntity，appid=${appid}，日期=${dateStr}，时间范围=${dayjs(startTime).toISOString()} ~ ${dayjs(endTime).toISOString()}`
  );

  // 1. 统计曝光PV/UV
  const exposureStats = await collectExposureStatsByTemplateAndScene(
    appid,
    startTime,
    endTime
  );

  // 2. 统计点击PV/UV
  const clickStats = await collectClickStatsByTemplateAndScene(
    appid,
    startTime,
    endTime
  );

  // 3. 统计创作PV/UV
  const creationStats = await collectCreationStatsByTemplateAndScene(
    appid,
    startTime,
    endTime
  );

  // 4. 统计拦截PV/UV
  const interceptStats = await collectInterceptStatsByTemplateAndScene(
    appid,
    startTime,
    endTime
  );

  // 5. 统计成功PV/UV
  const successStats = await collectSuccessStatsByTemplateAndScene(
    appid,
    startTime,
    endTime
  );

  // 6. 统计订单数和GMV
  const orderStats = await collectOrderStatsByTemplateAndScene(
    appid,
    startTime,
    endTime
  );

  // 7. 汇总所有出现过的模板、场景类型和模板类型
  const allTemplates = new Set<TemplateKey>();
  const allScenes = new Set<SceneKey>();
  const allTemplateTypes = new Set<TemplateType>();

  exposureStats.forEach((_, template) => allTemplates.add(template));
  clickStats.forEach((_, template) => allTemplates.add(template));
  creationStats.forEach((_, template) => allTemplates.add(template));
  interceptStats.forEach((_, template) => allTemplates.add(template));
  successStats.forEach((_, template) => allTemplates.add(template));
  orderStats.forEach((_, template) => allTemplates.add(template));

  for (const template of allTemplates) {
    const exposureData = exposureStats.get(template);
    if (exposureData) {
      exposureData.forEach((_, scene) => {
        allScenes.add(scene);
        exposureData
          .get(scene)
          ?.forEach((_, type) => allTemplateTypes.add(type));
      });
    }
    const clickData = clickStats.get(template);
    if (clickData) {
      clickData.forEach((_, scene) => {
        allScenes.add(scene);
        clickData.get(scene)?.forEach((_, type) => allTemplateTypes.add(type));
      });
    }
    const creationData = creationStats.get(template);
    if (creationData) {
      creationData.forEach((_, scene) => {
        allScenes.add(scene);
        creationData
          .get(scene)
          ?.forEach((_, type) => allTemplateTypes.add(type));
      });
    }
    const interceptData = interceptStats.get(template);
    if (interceptData) {
      interceptData.forEach((_, scene) => {
        allScenes.add(scene);
        interceptData
          .get(scene)
          ?.forEach((_, type) => allTemplateTypes.add(type));
      });
    }
    const successData = successStats.get(template);
    if (successData) {
      successData.forEach((_, scene) => {
        allScenes.add(scene);
        successData
          .get(scene)
          ?.forEach((_, type) => allTemplateTypes.add(type));
      });
    }
    const orderData = orderStats.get(template);
    if (orderData) {
      orderData.forEach((_, scene) => {
        allScenes.add(scene);
        orderData.get(scene)?.forEach((_, type) => allTemplateTypes.add(type));
      });
    }
  }

  if (allTemplates.size === 0) {
    console.log('未找到任何模板数据');
    return;
  }

  // 8. 收集所有需要写入的数据
  const repDateStr = dayjs(statDate).startOf('day').toDate();
  const recordsToInsert: Array<{
    template_id: string;
    appid: string;
    date: Date;
    template_type: string;
    scene_type: string;
    exposure_pv: number;
    exposure_uv: number;
    click_pv: number;
    click_uv: number;
    creation_pv: number;
    creation_uv: number;
    intercept_pv: number;
    intercept_uv: number;
    success_pv: number;
    success_uv: number;
    order_count: number;
    gmv: number;
  }> = [];

  for (const templateId of allTemplates) {
    for (const sceneType of allScenes) {
      for (const templateType of allTemplateTypes) {
        const exposureData = exposureStats
          .get(templateId)
          ?.get(sceneType)
          ?.get(templateType);
        const exposure_pv = exposureData?.pv || 0;
        const exposure_uv = exposureData?.uv.size || 0;

        const clickData = clickStats
          .get(templateId)
          ?.get(sceneType)
          ?.get(templateType);
        const click_pv = clickData?.pv || 0;
        const click_uv = clickData?.uv.size || 0;

        const creationData = creationStats
          .get(templateId)
          ?.get(sceneType)
          ?.get(templateType);
        const creation_pv = creationData?.pv || 0;
        const creation_uv = creationData?.uv.size || 0;

        const interceptData = interceptStats
          .get(templateId)
          ?.get(sceneType)
          ?.get(templateType);
        const intercept_pv = interceptData?.pv || 0;
        const intercept_uv = interceptData?.uv.size || 0;

        const successData = successStats
          .get(templateId)
          ?.get(sceneType)
          ?.get(templateType);
        const success_pv = successData?.pv || 0;
        const success_uv = successData?.uv.size || 0;

        const orderData = orderStats
          .get(templateId)
          ?.get(sceneType)
          ?.get(templateType);
        const order_count = orderData?.order_count || 0;
        const gmv = orderData?.gmv ? Math.round(orderData.gmv) / 100 : 0;

        // 如果 exposure_uv 为 0，跳过记录以节省存储空间
        if (exposure_uv === 0 && creation_pv === 0) {
          continue;
        }

        recordsToInsert.push({
          template_id: templateId,
          appid,
          date: repDateStr,
          template_type: templateType,
          scene_type: sceneType,
          exposure_pv,
          exposure_uv,
          click_pv,
          click_uv,
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
  }

  // 9. 批量删除该日期和appid的所有数据
  if (recordsToInsert.length > 0) {
    try {
      await prisma.biTemplateDailyEntity.deleteMany({
        where: {
          appid,
          date: repDateStr,
        },
      });
      console.log(
        `已删除 appid=${appid}，日期=${dateStr} 的所有 BiTemplateDailyEntity 数据`
      );
    } catch (e) {
      console.error(
        `删除 BiTemplateDailyEntity 数据失败：`,
        (e as Error).message || e
      );
    }
  }

  // 10. 批量写入数据（每500条一批）
  const BATCH_SIZE = 500;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < recordsToInsert.length; i += BATCH_SIZE) {
    const batch = recordsToInsert.slice(i, i + BATCH_SIZE);
    try {
      await prisma.biTemplateDailyEntity.createMany({
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
        `批量写入失败：第 ${Math.floor(i / BATCH_SIZE) + 1} 批，`,
        (e as Error).message || e
      );
    }
  }

  console.log(
    `BiTemplateDailyEntity 统计完成，appid=${appid}，日期=${dateStr}，成功=${successCount}，失败=${errorCount}`
  );
}

/**
 * CLI 入口：
 * - 使用方式：
 *   - 显式指定：pnpm run:job jiantie/2026/dwd_bi_template <appid> [YYYY-MM-DD]
 *     - 例如：node dwd_bi_template.js jiantie 2026-01-01
 *   - 不传任何参数：默认跑最近 7 天，appid 为 jiantie 和 maka
 */
async function runDefaultLast7Days() {
  const appids = ['jiantie', 'maka', 'wenzy', 'preschool', 'gov'];

  const today = dayjs().startOf('day').toDate();

  for (const appid of appids) {
    for (let i = 30; i >= 0; i--) {
      const d = dayjs(today).subtract(i, 'day');
      const dateStr = d.format('YYYY-MM-DD');

      console.log(
        `默认任务：开始统计 BiTemplateDailyEntity，appid=${appid}，日期=${dateStr}`
      );
      await statBiTemplateDaily(appid, dateStr);
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
      await runDefaultLast7Days();
      process.exitCode = 0;
      return;
    }

    await statBiTemplateDaily(appid, dateArg);
    process.exitCode = 0;
  } catch (error) {
    console.error('执行 BiTemplateDaily 统计失败：', error);
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
export { statBiTemplateDaily };

// 同步appid为jiantie和maka的用户数据到用户信息中间表（user_info_entity）
// - 每天增量同步：默认同步“昨天”的注册用户
// - 也支持传入具体日期（YYYY-MM-DD），方便补数据
//
// 数据来源：
// 1) mk_user_center.user 表：获取 uid、appid、reg_date
// 2) mk_user_center.user_reg_sources 表：获取设备信息 device（标准化为 web / ios / android / wap / other）
// 3) makaplatv4.promotion_event_conversions 表：转换事件（conversion_type='reg'）
// 4) makaplatv4.promotion_events 表：广告事件，channel 作为 register_source
//    - event_data / attribution_data 为 JSON，可能包含广告计划等字段，其中 promotionid / projectid 等作为 ad_plan_id
// 5) ad_conversion_event_entity 表：查询 event='register' 且 report_status='success' 的记录，使用 platform 字段值作为 register_source
//
// 目标表：
// - @mk/jiantie/v11-database.prisma 中的 user_info_entity（UserInfoEntity）
//
// 使用方式：
//   pnpm ts-node packages/jobs/src/jiantie/entry/sync_user_data.ts              # 同步昨天
//   pnpm ts-node packages/jobs/src/jiantie/entry/sync_user_data.ts 2025-11-30  # 同步指定日期

import { initPrisma } from '@mk/jiantie/v11-database';
import dotenv from 'dotenv';
import knex from 'knex';

console.log('process.cwd()', process.cwd());
dotenv.config({ path: 'src/jiantie/.env.local' });

// 初始化 PostgreSQL（中间表）
const prisma = initPrisma({
  connectionString: `${process.env.DATABASE_URL}`,
});

// 用户中心库（MySQL）
const usercenterDB = knex({
  client: 'mysql',
  connection: {
    host: 'rdsa2uaava2uaav413.mysql.rds.aliyuncs.com',
    user: 'query_prod',
    password: 'jCItnVtI0k67RBrt',
    database: 'mk_user_center',
  },
});

// makaplatv4（广告相关转化、事件）
const makadb = knex({
  client: 'mysql',
  connection: {
    host: 'rdsa2uaava2uaav413.mysql.rds.aliyuncs.com',
    user: 'mso_read_only',
    password: 'j3E4h6NWBQ5U',
    database: 'makaplatv4',
  },
});

/**
 * 将 MySQL 中的日期/时间（Date 或 string）转换为纯日期字符串 YYYY-MM-DD
 */
function toDateString(input: any): string {
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) {
    throw new Error(`无效日期: ${input}`);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 解析命令行参数日期，默认昨天
 */
function parseTargetDate(dateStr?: string): Date {
  if (dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      throw new Error(`无效的日期格式: ${dateStr}，请使用 YYYY-MM-DD`);
    }
    d.setHours(0, 0, 0, 0);
    return d;
  }

  const now = new Date();
  now.setDate(now.getDate() - 1); // 默认同步昨天
  now.setHours(0, 0, 0, 0);
  return now;
}

/**
 * 标准化设备类型
 * 将各种设备类型转换为标准格式：web、ios、android、wap、mini_program、other
 */
function normalizeDevice(device: string | null | undefined): string {
  if (!device) return 'other';
  const normalized = device.toLowerCase().trim();

  if (
    ['web', 'ios', 'android', 'wap', 'mini_program', 'other'].includes(
      normalized
    )
  ) {
    return normalized;
  }

  if (
    normalized.includes('ios') ||
    normalized.includes('iphone') ||
    normalized.includes('ipad')
  ) {
    return 'ios';
  }

  if (normalized.includes('android')) {
    return 'android';
  }

  if (
    normalized.includes('web') ||
    normalized.includes('pc') ||
    normalized.includes('desktop')
  ) {
    return 'web';
  }

  if (
    normalized.includes('wap') ||
    normalized.includes('mobile') ||
    normalized.includes('h5')
  ) {
    return 'wap';
  }

  if (
    normalized.includes('miniprogram') ||
    normalized.includes('mini_program') ||
    normalized.includes('小程序') ||
    normalized.includes('wechat') ||
    normalized.includes('weixin')
  ) {
    return 'mini_program';
  }

  return 'other';
}

/**
 * 尝试从 event_data / attribution_data 的 JSON 中提取广告计划 ID
 * - 优先 promotionid
 * - 其次 projectid
 */
function extractAdPlanId(
  eventData: string | null | undefined,
  attributionData: string | null | undefined
): string | null {
  function tryParse(jsonStr: string | null | undefined): any | null {
    if (!jsonStr) return null;
    try {
      const obj = JSON.parse(jsonStr);
      if (obj && typeof obj === 'object') {
        return obj;
      }
    } catch {
      return null;
    }
    return null;
  }

  const ed = tryParse(eventData);
  const ad = tryParse(attributionData);

  const candidate =
    (ed && (ed.promotionid || ed.promotion_id)) ||
    (ad && (ad.promotionid || ad.promotion_id));

  if (!candidate) return null;
  return String(candidate);
}

/**
 * 同步某一天的用户数据到中间表
 */
async function syncUserInfoByDate(targetDate: Date) {
  const dateStr = toDateString(targetDate);
  console.log(`开始同步用户中间表数据，日期: ${dateStr}`);

  // 计算当天的起止时间
  const startTime = new Date(targetDate);
  startTime.setHours(0, 0, 0, 0);
  const endTime = new Date(targetDate);
  endTime.setHours(23, 59, 59, 999);

  // 1. 查当天新注册用户（user 表）
  const users = await usercenterDB('users')
    .whereIn('appid', ['jiantie', 'maka'])
    .whereBetween('reg_date', [startTime, endTime])
    .select('uid', 'appid', 'reg_date');

  if (!users.length) {
    console.log(`日期 ${dateStr} 没有新注册用户，结束。`);
    return;
  }

  console.log(`找到 ${users.length} 个新注册用户。`);

  const uids = users.map(u => u.uid);

  // 2. 查注册设备信息（user_reg_sources）
  const regSources = await usercenterDB('user_reg_sources')
    .whereIn('uid', uids)
    .whereIn('appid', ['jiantie', 'maka'])

    .select(
      'uid',
      'appid',
      'device',
      'utm_source',
      'hume_channel',
      'utm_campaign'
    );

  // uid + appid -> 注册信息
  const regSourceMap = new Map<
    string,
    {
      device: string | null;
      register_source: string | null;
    }
  >();

  for (const item of regSources) {
    const key = `${item.uid}-${item.appid}`;
    if (!regSourceMap.has(key)) {
      const device = item.device || null;
      // 注册来源优先级：hume_channel > utm_source > utm_campaign
      const registerSource =
        item.hume_channel || item.utm_source || item.utm_campaign || null;
      regSourceMap.set(key, {
        device,
        register_source: registerSource,
      });
    }
  }

  console.log(
    `注册来源信息覆盖 ${regSourceMap.size} 条记录（按 uid-appid 去重）。`
  );

  // 3. 查转化事件（promotion_event_conversions，conversion_type = 'reg'）
  const conversions = await makadb('promotion_event_conversions')
    .whereIn('uid', uids)
    .andWhere('conversion_type', 'reg')
    .select(
      'uid',
      'conversion_unq_id',
      'event_id',
      'conversion_data',
      'bundleid'
    );

  const eventIds = Array.from(
    new Set(conversions.map((c: any) => c.event_id).filter(Boolean))
  );

  let events: any[] = [];
  if (eventIds.length) {
    events = await makadb('promotion_events')
      .whereIn('id', eventIds)
      .select('id', 'channel', 'event_data', 'attribution_data');
  }

  // event_id -> 事件
  const eventMap = new Map<
    number,
    {
      channel: string | null;
      event_data: string | null;
      attribution_data: string | null;
    }
  >();
  for (const e of events) {
    eventMap.set(e.id, {
      channel: e.channel || null,
      event_data: e.event_data || null,
      attribution_data: e.attribution_data || null,
    });
  }

  // uid -> { register_source, ad_plan_id }
  const adInfoMap = new Map<
    number,
    { register_source: string | null; ad_plan_id: string | null }
  >();

  for (const c of conversions) {
    const event = eventMap.get(c.event_id);
    if (!event) continue;
    const current = adInfoMap.get(c.uid) || {
      register_source: null,
      ad_plan_id: null,
    };

    const registerSource = event.channel || current.register_source;
    const adPlanId =
      extractAdPlanId(event.event_data, event.attribution_data) ||
      current.ad_plan_id;

    adInfoMap.set(c.uid, {
      register_source: registerSource,
      ad_plan_id: adPlanId,
    });
  }

  console.log(
    `广告转化/事件信息覆盖 ${adInfoMap.size} 个 uid（基于 conversion_type='reg'）。`
  );

  // 3.1 查 ad_conversion_event_entity，success 且为 register 的使用 platform 字段作为 register_source
  const platformEvents = await prisma.adConversionEventEntity.findMany({
    where: {
      uid: { in: uids },
      event: 'register',
      report_status: 'success',
    },
    select: {
      uid: true,
      platform: true,
      create_time: true,
    },
    orderBy: {
      create_time: 'desc',
    },
  });

  // uid -> platform 映射（取最新的记录）
  const platformMap = new Map<number, string | null>();
  for (const item of platformEvents) {
    if (!platformMap.has(item.uid)) {
      platformMap.set(item.uid, item.platform || null);
    }
  }
  console.log(
    `platform 渠道用户覆盖 ${platformMap.size} 个 uid（基于 ad_conversion_event_entity，event='register' 且 report_status='success'）。`
  );

  // 4. 写入中间表（UserInfoEntity），使用 upsert 保证幂等
  let success = 0;
  let skipped = 0;
  let failed = 0;

  const batchSize = 50;
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    console.log(
      `处理用户批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(users.length / batchSize)}，数量=${batch.length}`
    );

    const results = await Promise.all(
      batch.map(async user => {
        const key = `${user.uid}-${user.appid}`;
        const reg = regSourceMap.get(key);
        const ad = adInfoMap.get(user.uid);

        const registerDevice = normalizeDevice(reg?.device || null);
        // 优先使用 ad_conversion_event_entity 中的 platform 字段值作为 register_source
        const registerSource =
          platformMap.get(user.uid) ||
          ad?.register_source ||
          reg?.register_source ||
          null;
        const adPlanId = ad?.ad_plan_id || null;

        try {
          await prisma.userInfoEntity.upsert({
            where: {
              uid: user.uid,
            },
            update: {
              register_date: new Date(toDateString(user.reg_date)),
              register_device: registerDevice,
              register_source: registerSource || undefined,
              ad_plan_id: adPlanId || undefined,
              deleted: false,
              appid: user.appid,
            },
            create: {
              uid: user.uid,
              register_date: new Date(toDateString(user.reg_date)),
              register_device: registerDevice,
              register_source: registerSource || undefined,
              ad_plan_id: adPlanId || undefined,
              appid: user.appid,
            },
          });
          return { ok: true };
        } catch (e: any) {
          console.log(e);
          console.error(
            `  ✗ 写入用户 uid=${user.uid}, appid=${user.appid} 失败:`,
            e?.message || e
          );
          return { ok: false };
        }
      })
    );

    for (const r of results) {
      if (r.ok) {
        success++;
      } else {
        failed++;
      }
    }
  }

  skipped = users.length - success - failed;

  console.log('同步完成统计:');
  console.log(`- 总用户数: ${users.length}`);
  console.log(`- 成功写入: ${success}`);
  console.log(`- 失败: ${failed}`);
  console.log(`- 其余: ${skipped}（理论上为0，仅用于校验）`);
}

async function main() {
  try {
    const dateArg = process.argv[2];
    // 如果传了日期参数，仅同步指定日期
    if (dateArg) {
      const targetDate = parseTargetDate(dateArg);
      await syncUserInfoByDate(targetDate);
    } else {
      // 未传参数时，默认同步最近3天（含昨天，向前推 2 天）
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i <= 7; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() - i);
        await syncUserInfoByDate(targetDate);
      }
    }
    process.exit(0);
  } catch (error) {
    console.error('执行失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await usercenterDB.destroy();
    await makadb.destroy();
  }
}

if (require.main === module) {
  main();
}

export { syncUserInfoByDate };

//同步appid为jiantie和maka的数据到中间表
//从user读取每天的注册用户uid和注册日期
//从user_reg_sources读取设备信息
//从promotion_event_conversions中找到对应的转化事件（conversion_type=reg，uid为uid）,如何没找到则为自然用户
//从对应的promotion_events找到事件，channel为注册来源，然后从event_data和attribution_data中读取json
//例子（来自 readme，精简版，promotionid 为广告计划ID）：
// {"appid":"jiantie","promotionid":"7577703703366287379", ...}

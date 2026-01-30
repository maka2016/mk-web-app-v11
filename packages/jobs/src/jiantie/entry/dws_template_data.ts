// 模版统计表（日dws）
// 按日分端统计浏览、模板点击、创作、拦截、支付、订单、成交金额、分设备端（android、ios、web）

//数据说明
//模板实体，device分端统计

//浏览量从biAdb的mk_datawork_sls_events读取
// event_type: "show",
// object_type: "template_item",
// appid = 'jiantie'
// object_id对应模板id

//模板点击从biAdb的mk_datawork_sls_events读
// event_type: "page_view",
// page_type: "template_page",
//page_id对应模板id

//创作量
// 从works_entity读取，由template_id关联，分端数据由uid关联的user_reg_sources的device来

//拦截量的实现:
//第一步，从biAdb的mk_datawork_sls_events读取 appid = 'jiantie' ,page_type: "vip_intercept_page",page_id: "vip_intercept_page"的数据，device分端统计
//第二步，从数据的url中解析出works_id=作品ID的数据，如果解析不出来，则不统计拦截量
//第三步，通过works的模板id关联到模板id上

//成功量的实现
//第一步，从biAdb的mk_datawork_sls_events读取 event_type: "click", object_type: "editor_publish_btn", object_id 为作品 id 的数据，device分端统计，为导出量
//第二步，从biAdb的mk_datawork_sls_events读取 event_type: "click", object_type: "work_share_btn", object_id 为作品 id 的数据，device分端统计，为分享量
//判断模板的规格works_spec_entity，如果export_format为html的则为H5，H5的作品用分享量作为成功量，其他作品用导出量作为成功量

//订单的实现
// 分端数据由uid关联的user_reg_sources的device来
//第一步，从orderDB的order表读取 appid = 'jiantie' ,order_status为paid的数据 join order_extra_info表
//第二步，数据里面读取trace_metadata{"workId":"SSXSYC4FW605140555"}，{"workId":"7GLV3G3O_605498305","works_id":"7GLV3G3O_605498305","ref_object_id":"T_902LN1PP8Y54"}
//读取works_id或者workId，通过works的模板id关联到模板id上
//order里面的amount为订单金额，单位为分（不用关心货币）

import {
  getEndOfDay,
  getStartOfDay,
  parseDate,
  parseWorksIdFromTraceMetadata,
  parseWorksIdFromUrl,
} from '../../utils/utils';
import {
  closeAllConnections,
  getBiAdb,
  getOrderDB,
  getPrisma,
  getUsercenterDB,
} from '../../service/db-connections';
import { normalizeDevice } from '../../service/device-utils';
import {
  queryOrdersByDateRange,
  queryUserDevices,
} from '../../service/data-query';
import { innerUids } from './innerUids';

// 获取数据库连接
const prisma = getPrisma();
const biAdb = getBiAdb();
const orderDB = getOrderDB();
const usercenterDB = getUsercenterDB();

/**
 * 统计模板日数据
 */
async function statTemplateDaily(targetDate?: string) {
  const date = parseDate(targetDate);
  const startTime = getStartOfDay(date);
  const endTime = getEndOfDay(date);
  const dateStr = date.toISOString().split('T')[0];

  console.log(`开始统计模板数据，日期: ${dateStr}`);
  console.log(
    `时间范围: ${startTime.toISOString()} ~ ${endTime.toISOString()}`
  );

  // 1. 查询所有模板（排除已删除的）
  const templates = await prisma.templateEntity.findMany({
    where: {
      OR: [
        {
          deleted: false,
          coverV3: {
            not: {
              is: null,
            },
          },
        },
        {
          create_time: {
            gt: new Date('2025-11-21'),
          },
        },
      ],
    },
    select: {
      id: true,
      title: true,
    },
  });

  console.log(`找到 ${templates.length} 个模板`);

  /**
   * 预聚合拦截量：按 模板ID + 设备端 统计 pv / uv
   *
   * 之前的实现是在每个模板里单独查一遍拦截事件 + works_entity，
   * 这里改成按日期查一次，再在内存里做分组，减少重复 IO。
   */
  const interceptStatsByTemplateAndDevice = new Map<
    string,
    Map<string, { pv: number; uv: number }>
  >();

  {
    // 第一步：查询当日所有拦截相关事件
    const interceptEvents = await biAdb('mk_datawork_sls_events')
      // .whereIn('appid', ['jiantie', 'maka'])
      .whereNotIn('uid', innerUids)
      .whereBetween('event_time', [startTime, endTime])
      .where({
        page_type: 'vip_intercept_page',
        page_id: 'vip_intercept_page',
      })
      .orWhere({
        object_type: 'vip_intercept_pay',
      })
      // 兼容 maka 新版付费弹窗：event_type=page_view, page_type = vip_intercept_page_v2024q2
      // works_id 同样从 url 中解析
      .orWhere({
        page_type: 'vip_intercept_page_v2024q2',
        event_type: 'page_view',
      })

      .select('url', 'distinct_id', 'platform');

    // 收集所有出现的 works_id
    const allInterceptWorksIds = new Set<string>();
    for (const event of interceptEvents) {
      const worksId = parseWorksIdFromUrl(event.url);
      if (worksId) {
        allInterceptWorksIds.add(worksId);
      }
    }

    if (allInterceptWorksIds.size > 0) {
      // 第二步：一次性查出这些作品对应的模板ID
      const interceptWorks = await prisma.worksEntity.findMany({
        where: {
          id: {
            in: Array.from(allInterceptWorksIds),
          },
          // 拦截统计这块之前是按模板过滤，没有强制 deleted = false，这里保持行为一致
        },
        select: {
          id: true,
          template_id: true,
        },
      });

      const workIdToTemplateId = new Map<string, string>();
      for (const work of interceptWorks) {
        if (work.template_id) {
          workIdToTemplateId.set(work.id, work.template_id);
        }
      }

      // 第三步：在内存里按 模板ID + 设备端 聚合 pv / uv
      const tmpMap = new Map<
        string,
        Map<string, { worksIds: Set<string>; distinctIds: Set<string> }>
      >();

      for (const event of interceptEvents) {
        const worksId = parseWorksIdFromUrl(event.url);
        if (!worksId) continue;

        const templateId = workIdToTemplateId.get(worksId);
        if (!templateId) continue;

        const device = normalizeDevice(event.platform);

        if (!tmpMap.has(templateId)) {
          tmpMap.set(
            templateId,
            new Map<
              string,
              { worksIds: Set<string>; distinctIds: Set<string> }
            >()
          );
        }

        const byDevice = tmpMap.get(templateId)!;
        if (!byDevice.has(device)) {
          byDevice.set(device, {
            worksIds: new Set<string>(),
            distinctIds: new Set<string>(),
          });
        }

        const stats = byDevice.get(device)!;
        stats.worksIds.add(worksId);
        stats.distinctIds.add(event.distinct_id);
      }

      // 转成最终的 pv / uv 结构
      for (const [templateId, byDevice] of tmpMap.entries()) {
        const deviceMap = new Map<string, { pv: number; uv: number }>();
        for (const [device, { worksIds, distinctIds }] of byDevice.entries()) {
          deviceMap.set(device, {
            pv: worksIds.size,
            uv: distinctIds.size,
          });
        }
        interceptStatsByTemplateAndDevice.set(templateId, deviceMap);
      }
    }
  }

  /**
   * 预聚合订单：按 模板ID + 设备端 统计 count / amount
   *
   * 之前的实现是在每个模板里单独查当日所有订单 + user_reg_sources + works_entity，
   * 这里改成按日期查一次，再在内存里按模板 + 设备聚合。
   */
  const orderStatsByTemplateAndDevice = new Map<
    string,
    Map<string, { count: number; amount: number }>
  >();

  {
    // 第一步：查询当日所有订单数据（join order_extra_info）
    const orders = await queryOrdersByDateRange(startTime, endTime);

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
    const orderUserDevicesMap =
      orderUids.size > 0
        ? await queryUserDevices(Array.from(orderUids))
        : new Map<number, string>();

    // 第三步：通过works_entity拿到模板ID，并按模板 + 设备聚合订单统计
    if (worksIdsFromOrders.size > 0) {
      const orderWorks = await prisma.worksEntity.findMany({
        where: {
          id: {
            in: Array.from(worksIdsFromOrders),
          },
          deleted: false,
        },
        select: {
          id: true,
          template_id: true,
        },
      });

      const workIdToTemplateId = new Map<string, string>();
      for (const work of orderWorks) {
        if (work.template_id) {
          workIdToTemplateId.set(work.id, work.template_id);
        }
      }

      // 遍历订单，找出属于某个模板的订单，并按设备端分组
      for (const order of orders) {
        const worksId = orderWorksIdMap.get(order.order_no);
        if (!worksId) continue;

        const templateId = workIdToTemplateId.get(worksId);
        if (!templateId) continue;

        const device = orderUserDevicesMap.get(order.uid) || 'other';

        if (!orderStatsByTemplateAndDevice.has(templateId)) {
          orderStatsByTemplateAndDevice.set(
            templateId,
            new Map<string, { count: number; amount: number }>()
          );
        }

        const byDevice = orderStatsByTemplateAndDevice.get(templateId)!;
        if (!byDevice.has(device)) {
          byDevice.set(device, { count: 0, amount: 0 });
        }

        const stats = byDevice.get(device)!;
        stats.count++;
        stats.amount += Number(order.amount) || 0;
      }
    }
  }

  /**
   * 预聚合成功量：按 模板ID + 设备端 统计 pv / uv
   *
   * 根据模板规格的 export_format 判断：
   * - 如果 export_format 为 html（H5），使用分享量作为成功量
   * - 其他情况使用导出量作为成功量
   */
  const successStatsByTemplateAndDevice = new Map<
    string,
    Map<string, { pv: number; uv: number }>
  >();

  {
    // 第一步：查询当日所有导出相关事件（editor_publish_btn）
    const exportEvents = await biAdb('mk_datawork_sls_events')
      .whereIn('appid', ['jiantie', 'maka'])
      .whereNotIn('uid', innerUids)
      .whereBetween('event_time', [startTime, endTime])
      .where({
        event_type: 'click',
        object_type: 'editor_publish_btn',
      })
      .select('object_id', 'distinct_id', 'platform');

    // 第二步：查询当日所有分享相关事件（work_share_btn）
    const shareEvents = await biAdb('mk_datawork_sls_events')
      .whereIn('appid', ['jiantie', 'maka'])
      .whereNotIn('uid', innerUids)
      .whereBetween('event_time', [startTime, endTime])
      .where({
        event_type: 'click',
        object_type: 'work_share_btn',
      })
      .select('object_id', 'distinct_id', 'platform');

    // 收集所有出现的作品ID
    const allWorksIds = new Set<string>();
    for (const event of exportEvents) {
      if (event.object_id) {
        allWorksIds.add(event.object_id);
      }
    }
    for (const event of shareEvents) {
      if (event.object_id) {
        allWorksIds.add(event.object_id);
      }
    }

    if (allWorksIds.size > 0) {
      // 第三步：一次性查出这些作品对应的模板ID和规格ID
      const works = await prisma.worksEntity.findMany({
        where: {
          id: {
            in: Array.from(allWorksIds),
          },
          deleted: false,
        },
        select: {
          id: true,
          template_id: true,
          spec_id: true,
        },
      });

      const workIdToTemplateId = new Map<string, string>();
      const workIdToSpecId = new Map<string, string>();
      const allSpecIds = new Set<string>();
      const allTemplateIds = new Set<string>();

      for (const work of works) {
        if (work.template_id) {
          workIdToTemplateId.set(work.id, work.template_id);
          allTemplateIds.add(work.template_id);
        }
        if (work.spec_id) {
          workIdToSpecId.set(work.id, work.spec_id);
          allSpecIds.add(work.spec_id);
        }
      }

      // 第四步：查询模板的规格信息，判断 export_format
      const templates = await prisma.templateEntity.findMany({
        where: {
          id: {
            in: Array.from(allTemplateIds),
          },
        },
        select: {
          id: true,
          spec_id: true,
        },
      });

      const templateIdToSpecId = new Map<string, string>();
      for (const template of templates) {
        if (template.spec_id) {
          templateIdToSpecId.set(template.id, template.spec_id);
          allSpecIds.add(template.spec_id);
        }
      }

      // 查询所有规格的 export_format
      const specs = await prisma.worksSpecEntity.findMany({
        where: {
          id: {
            in: Array.from(allSpecIds),
          },
        },
        select: {
          id: true,
          export_format: true,
        },
      });

      const specIdToExportFormat = new Map<string, string | null>();
      for (const spec of specs) {
        specIdToExportFormat.set(spec.id, spec.export_format);
      }

      // 判断模板是否为H5（export_format === 'html'）
      const templateIdToIsH5 = new Map<string, boolean>();
      for (const [templateId, specId] of templateIdToSpecId.entries()) {
        const exportFormat = specIdToExportFormat.get(specId);
        templateIdToIsH5.set(templateId, exportFormat === 'html');
      }

      // 对于通过作品关联的模板，也需要判断
      for (const [workId, templateId] of workIdToTemplateId.entries()) {
        if (!templateIdToIsH5.has(templateId)) {
          const specId = workIdToSpecId.get(workId);
          if (specId) {
            const exportFormat = specIdToExportFormat.get(specId);
            templateIdToIsH5.set(templateId, exportFormat === 'html');
          }
        }
      }

      // 第五步：在内存里按 模板ID + 设备端 聚合导出量和分享量
      const exportStatsByTemplateAndDevice = new Map<
        string,
        Map<string, { worksIds: Set<string>; distinctIds: Set<string> }>
      >();
      const shareStatsByTemplateAndDevice = new Map<
        string,
        Map<string, { worksIds: Set<string>; distinctIds: Set<string> }>
      >();

      // 处理导出事件
      for (const event of exportEvents) {
        const worksId = event.object_id;
        if (!worksId) continue;

        const templateId = workIdToTemplateId.get(worksId);
        if (!templateId) continue;

        const device = normalizeDevice(event.platform);

        if (!exportStatsByTemplateAndDevice.has(templateId)) {
          exportStatsByTemplateAndDevice.set(
            templateId,
            new Map<
              string,
              { worksIds: Set<string>; distinctIds: Set<string> }
            >()
          );
        }

        const byDevice = exportStatsByTemplateAndDevice.get(templateId)!;
        if (!byDevice.has(device)) {
          byDevice.set(device, {
            worksIds: new Set<string>(),
            distinctIds: new Set<string>(),
          });
        }

        const stats = byDevice.get(device)!;
        stats.worksIds.add(worksId);
        stats.distinctIds.add(event.distinct_id);
      }

      // 处理分享事件
      for (const event of shareEvents) {
        const worksId = event.object_id;
        if (!worksId) continue;

        const templateId = workIdToTemplateId.get(worksId);
        if (!templateId) continue;

        const device = normalizeDevice(event.platform);

        if (!shareStatsByTemplateAndDevice.has(templateId)) {
          shareStatsByTemplateAndDevice.set(
            templateId,
            new Map<
              string,
              { worksIds: Set<string>; distinctIds: Set<string> }
            >()
          );
        }

        const byDevice = shareStatsByTemplateAndDevice.get(templateId)!;
        if (!byDevice.has(device)) {
          byDevice.set(device, {
            worksIds: new Set<string>(),
            distinctIds: new Set<string>(),
          });
        }

        const stats = byDevice.get(device)!;
        stats.worksIds.add(worksId);
        stats.distinctIds.add(event.distinct_id);
      }

      // 第六步：根据模板规格决定使用导出量还是分享量作为成功量
      for (const templateId of allTemplateIds) {
        const isH5 = templateIdToIsH5.get(templateId) || false;
        const sourceStats = isH5
          ? shareStatsByTemplateAndDevice.get(templateId)
          : exportStatsByTemplateAndDevice.get(templateId);

        if (sourceStats) {
          const deviceMap = new Map<string, { pv: number; uv: number }>();
          for (const [
            device,
            { worksIds, distinctIds },
          ] of sourceStats.entries()) {
            deviceMap.set(device, {
              pv: worksIds.size,
              uv: distinctIds.size,
            });
          }
          successStatsByTemplateAndDevice.set(templateId, deviceMap);
        }
      }
    }
  }

  // 2. 对每个模板进行统计（批量并行处理，每批20个）
  let successCount = 0;
  let errorCount = 0;

  /**
   * 处理单个模板的统计
   */
  async function processTemplate(template: { id: string }) {
    try {
      console.log(`\n正在统计模板: (ID: ${template.id})`);

      // 2.1 统计浏览量（按设备端分组）
      const viewStatsByDevice = await biAdb('mk_datawork_sls_events')
        .whereIn('appid', ['jiantie', 'maka'])
        .where({
          event_type: 'show',
          object_type: 'template_item',
          object_id: template.id,
        })
        .whereBetween('event_time', [startTime, endTime])
        .whereNotIn('uid', innerUids)
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
          page_id: template.id,
        })
        .whereBetween('event_time', [startTime, endTime])
        .whereNotIn('uid', innerUids)
        .select(
          'platform',
          biAdb.raw('COUNT(*) as pv'),
          biAdb.raw('COUNT(DISTINCT distinct_id) as uv')
        )
        .groupBy('platform');

      // 2.3 统计创作量
      // 查询所有使用该模板的作品
      const works = await prisma.worksEntity.findMany({
        where: {
          deleted: false,
          template_id: template.id,
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
        },
      });

      // 获取所有相关用户的设备信息
      const uids = Array.from(new Set(works.map(w => w.uid)));
      const userDevicesMap = new Map<number, string>(); // uid -> device

      if (uids.length > 0) {
        const userRegSources = await usercenterDB('user_reg_sources')
          .whereIn('uid', uids)
          .whereIn('appid', ['jiantie', 'maka'])
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
      for (const work of works) {
        const device = userDevicesMap.get(work.uid) || 'other';
        if (!creationStatsByDevice.has(device)) {
          creationStatsByDevice.set(device, { pv: 0, uv: new Set() });
        }
        const stats = creationStatsByDevice.get(device)!;
        stats.pv++;
        stats.uv.add(work.uid);
      }

      // 2.4 拦截量（按设备端分组），直接使用预聚合结果
      const interceptStatsByDevice =
        interceptStatsByTemplateAndDevice.get(template.id) ??
        new Map<string, { pv: number; uv: number }>();

      // 2.5 订单数和成交金额（按设备端分组），直接使用预聚合结果
      const orderStatsByDevice =
        orderStatsByTemplateAndDevice.get(template.id) ??
        new Map<string, { count: number; amount: number }>();

      // 2.6 成功量（按设备端分组），直接使用预聚合结果
      const successStatsByDevice =
        successStatsByTemplateAndDevice.get(template.id) ??
        new Map<string, { pv: number; uv: number }>();

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
      successStatsByDevice.forEach((_, device) => {
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

        // 成功量
        const successStat = successStatsByDevice.get(device);
        const success_pv = successStat?.pv || 0;
        const success_uv = successStat?.uv || 0;

        // 保存统计数据
        await prisma.templateDailyStatisticsEntity.upsert({
          where: {
            template_id_date_device: {
              template_id: template.id,
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
            success_pv,
            success_uv,
            order_count,
            transaction_amount,
            update_time: new Date(),
          },
          create: {
            template_id: template.id,
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
            success_pv,
            success_uv,
            order_count,
            transaction_amount,
          },
        });

        // console.log(
        //   `  [${device}] 浏览量: PV=${view_pv}, UV=${view_uv} | 点击: PV=${click_pv}, UV=${click_uv} | 创作: PV=${creation_pv}, UV=${creation_uv} | 拦截: PV=${intercept_pv}, UV=${intercept_uv} | 订单: ${order_count}, 金额: ${transaction_amount.toFixed(2)}元`
        // );
      }

      // console.log(`  ✓ 模板 ${template.title} 统计完成`);
      return { success: true, template: template.id };
    } catch (error) {
      console.error(`  ✗ 模板 ${template.id} 统计失败:`, error);
      return { success: false, error };
    }
  }

  // 批量并行处理，每批20个
  const batchSize = 50;
  for (let i = 0; i < templates.length; i += batchSize) {
    const batch = templates.slice(i, i + batchSize);
    console.log(
      `\n处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(templates.length / batchSize)} (${batch.length} 个模板)`
    );

    const results = await Promise.all(
      batch.map(template => processTemplate(template))
    );
    console.log('results', results);

    // 统计成功和失败数量
    for (const result of results) {
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }
    }
  }

  console.log(`\n统计完成！`);
  console.log(`成功: ${successCount} 个模板`);
  console.log(`失败: ${errorCount} 个模板`);
}

// 主函数
async function main() {
  try {
    // 统计近13天的数据
    const days = 13;
    const today = new Date();
    // today.setHours(0, 0, 0, 0);

    console.log(`开始统计近 ${days} 天的模板数据...\n`);

    for (let i = 0; i < days; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - i);
      const dateStr = targetDate.toISOString().split('T')[0];

      console.log(`\n${'='.repeat(60)}`);
      console.log(`处理日期 ${i + 1}/${days}: ${dateStr}`);
      console.log(`${'='.repeat(60)}`);

      try {
        await statTemplateDaily(dateStr);
        console.log(`✓ 日期 ${dateStr} 统计完成\n`);
      } catch (error) {
        console.error(`✗ 日期 ${dateStr} 统计失败:`, error);
        // 继续处理下一天，不中断整个流程
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`近 ${days} 天的数据统计全部完成！`);
    console.log(`${'='.repeat(60)}`);

    process.exit(0);
  } catch (error) {
    console.error('执行失败:', error);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await closeAllConnections();
  }
}

// 如果直接运行此文件，执行主函数
if (require.main === module) {
  main();
}

export { statTemplateDaily };

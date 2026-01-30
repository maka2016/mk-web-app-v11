// 订单记录中间表每日同步脚本
// 第一步，从orderDB的order表读取 appid = 'jiantie' or 'maka' ,order_status为paid的数据 join order_extra_info表
// 第二步，数据里面读取trace_metadata{"workId":"SSXSYC4FW605140555"}，{"workId":"7GLV3G3O_605498305","works_id":"7GLV3G3O_605498305","ref_object_id":"T_902LN1PP8Y54"}
// 读取works_id或者workId，通过works的模板id关联到模板id上
// 数据里面读取trace_metadata中可能有ref_page_type和ref_page_id，如果有，则记录
// order里面的amount为订单金额，单位为分（不用关心货币）
// 将数据写入订单记录中间表

import {
  getEndOfDay,
  getStartOfDay,
  parseDate,
  parseRefPageFromMetadata,
  parseWorksIdFromTraceMetadata,
} from '../../utils/utils';
import {
  closeAllConnections,
  getOrderDB,
  getPrisma,
} from '../../service/db-connections';
import { queryV11SlsLogs } from '../../utils/sls';
import dayjs from 'dayjs';

// 获取数据库连接
const prisma = getPrisma();
const orderDB = getOrderDB();

/**
 * 获取支付类型（从payments表中读取payment_method）
 * @param order 订单对象，包含payment_method字段
 */
function getPaymentType(order: any): string {
  // 从payments表中读取payment_method，如果不存在则使用默认值
  return order.payment_method || 'unknown';
}

/**
 * 同步订单记录中间表
 */
async function syncOrderData(targetDate?: string) {
  const date = parseDate(targetDate);
  const startTime = getStartOfDay(date);
  const endTime = getEndOfDay(date);
  const dateStr = date.toISOString().split('T')[0];

  console.log(`开始同步订单数据，日期: ${dateStr}`);
  console.log(
    `时间范围: ${startTime.toISOString()} ~ ${endTime.toISOString()}`
  );

  // 第一步：先根据payments表的paid_at时间过滤，获取符合条件的订单号
  // 查询payments表，获取在指定时间范围内支付的订单（选择已支付成功的，如果有多个则选择最新的）
  const payments = await orderDB('payments')
    .whereNotNull('paid_at') // 使用paid_at不为null来判断支付成功
    .whereBetween('paid_at', [startTime, endTime])
    .select('order_no', 'payment_method', 'paid_at', 'amount')
    .orderBy('paid_at', 'desc');

  console.log(`找到 ${payments.length} 条支付记录`);

  if (payments.length === 0) {
    console.log('没有支付数据需要同步');
    return;
  }

  // 建立order_no到payment_method的映射（每个订单只取最新的支付记录）
  const paymentMethodMap = new Map<string, string>();
  // 建立order_no到paid_at的映射（每个订单只取最新的支付记录）
  const paidAtMap = new Map<string, Date>();
  const validOrderNos = new Set<string>();
  for (const payment of payments) {
    if (!paymentMethodMap.has(payment.order_no)) {
      paymentMethodMap.set(
        payment.order_no,
        payment.payment_method || 'unknown'
      );
      // 同时保存支付时间
      if (payment.paid_at) {
        paidAtMap.set(payment.order_no, payment.paid_at);
      }
      validOrderNos.add(payment.order_no);
    }
  }

  console.log(`找到 ${validOrderNos.size} 个在指定时间范围内支付的订单`);

  // 第二步：根据订单号查询orders表，获取订单详细信息
  const orders = await orderDB('orders')
    .join('order_extra_info', 'orders.order_no', 'order_extra_info.order_no')
    .where({
      'orders.order_status': 'paid',
    })
    .whereIn('orders.order_no', Array.from(validOrderNos))
    .select(
      'orders.id',
      'orders.order_no',
      'orders.uid',
      'orders.amount',
      'orders.created_at',
      'orders.appid',
      'order_extra_info.trace_metadata'
    );

  console.log(`找到 ${orders.length} 个已支付订单`);

  if (orders.length === 0) {
    console.log('没有订单数据需要同步');
    return;
  }

  // 为每个订单添加payment_method字段
  const orderNos = orders.map(o => o.order_no);
  for (const order of orders) {
    (order as any).payment_method =
      paymentMethodMap.get(order.order_no) || 'unknown';
  }

  // 为每个订单添加payment_method字段
  for (const order of orders) {
    (order as any).payment_method =
      paymentMethodMap.get(order.order_no) || 'unknown';
  }

  // 第二步：从trace_metadata中解析works_id或workId，并建立映射关系
  const orderWorksIdMap = new Map<string, string>(); // order_no -> works_id
  const worksIdsFromOrders = new Set<string>();

  // 收集没有 trace_metadata 的订单，用于后续查询 SLS v11
  const ordersWithoutWorksId: Array<{
    order_no: string;
    uid: number;
    appid: string;
    created_at: Date;
  }> = [];

  for (const order of orders) {
    const worksId = parseWorksIdFromTraceMetadata(order.trace_metadata);
    if (worksId) {
      worksIdsFromOrders.add(worksId);
      orderWorksIdMap.set(order.order_no, worksId);
    } else {
      // 如果没有从 trace_metadata 中获取到 worksId，记录订单信息用于查询 SLS v11
      ordersWithoutWorksId.push({
        order_no: order.order_no,
        uid: order.uid,
        appid: order.appid,
        created_at: order.created_at,
      });
    }
  }

  console.log(`从订单中解析出 ${worksIdsFromOrders.size} 个作品ID`);
  console.log(
    `有 ${ordersWithoutWorksId.length} 个订单没有 trace_metadata 信息，将查询 SLS v11`
  );

  // 对于没有 trace_metadata 的订单，查询 SLS v11 获取作品 ID
  if (ordersWithoutWorksId.length > 0) {
    console.log('开始查询 SLS v11 获取作品 ID...');
    let slsQueryCount = 0;
    let slsSuccessCount = 0;

    for (const order of ordersWithoutWorksId) {
      try {
        // 查询时间范围：订单创建时间前后 7 天
        const queryStartTime = dayjs(order.created_at)
          .subtract(1, 'day')
          .toDate();
        const queryEndTime = dayjs(order.created_at).add(7, 'day').toDate();
        const from = dayjs(queryStartTime).unix();
        const to = dayjs(queryEndTime).unix();

        // 构建查询语句：uid 相同，object_type = 'vip_page_block'
        const query = `app_id: "${order.appid}" and uid: ${order.uid} and object_type: "vip_page_block" | SELECT object_id, __time__ as time LIMIT 100`;

        slsQueryCount++;
        const logs = await queryV11SlsLogs({
          query,
          from,
          to,
          reverse: false,
        });

        if (logs.length > 0) {
          // 找到时间最接近订单创建时间的记录
          const orderTime = order.created_at.getTime() / 1000; // 转换为秒级时间戳
          let closestLog = logs[0];
          let minTimeDiff = Math.abs((closestLog.raw.time || 0) - orderTime);

          for (const log of logs) {
            const logTime = log.raw.time || 0;
            const timeDiff = Math.abs(logTime - orderTime);
            if (timeDiff < minTimeDiff) {
              minTimeDiff = timeDiff;
              closestLog = log;
            }
          }

          // 取 object_id 作为作品 id
          const objectId = closestLog.raw.object_id;
          if (objectId && typeof objectId === 'string') {
            orderWorksIdMap.set(order.order_no, objectId);
            worksIdsFromOrders.add(objectId);
            slsSuccessCount++;
          }
        }
      } catch (error) {
        console.error(`查询订单 ${order.order_no} 的 SLS v11 数据失败:`, error);
      }
    }

    console.log(
      `SLS v11 查询完成：查询 ${slsQueryCount} 个订单，成功获取 ${slsSuccessCount} 个作品 ID`
    );
  }

  // 验证works_id是否存在，并批量查询作品的metadata和template_id
  const validWorksIds = new Set<string>();
  const worksMetadataMap = new Map<string, any>(); // works_id -> metadata
  const workTemplateIdMap = new Map<string, string | null>(); // works_id -> template_id
  const workTypeMap = new Map<string, string>(); // works_id -> work_type ('v11' or 'v5')
  if (worksIdsFromOrders.size > 0) {
    const works = await prisma.worksEntity.findMany({
      where: {
        id: {
          in: Array.from(worksIdsFromOrders),
        },
        deleted: false,
      },
      select: {
        id: true,
        template_id: true,
        metadata: true,
      },
    });

    for (const work of works) {
      validWorksIds.add(work.id);
      workTypeMap.set(work.id, 'v11'); // 在 worksEntity 表中的作品是 v11
      workTemplateIdMap.set(work.id, work.template_id || null);
      if (work.metadata) {
        worksMetadataMap.set(work.id, work.metadata);
      }
    }

    console.log(`验证后有效作品ID: ${validWorksIds.size} 个`);
  }

  // 对于不在worksEntity中的老maka作品，从SLS的v5workCreate事件获取信息
  const missingWorksIds = Array.from(worksIdsFromOrders).filter(
    id => !validWorksIds.has(id)
  );
  if (missingWorksIds.length > 0) {
    console.log(
      `发现 ${missingWorksIds.length} 个不在worksEntity中的作品ID，将从SLS v5workCreate事件查询`
    );

    // 查询时间范围：订单日期前后7天
    const queryStartTime = dayjs(startTime).subtract(7, 'day').toDate();
    const queryEndTime = dayjs(endTime).add(7, 'day').toDate();
    const from = dayjs(queryStartTime).unix();
    const to = dayjs(queryEndTime).unix();

    // 按appid分组查询（maka和jiantie）
    const appids = ['maka', 'jiantie'];
    let v5WorkCreateSuccessCount = 0;

    for (const appid of appids) {
      try {
        // 查询v5workCreate事件，获取object_id、page_type、page_id等信息
        const query = `app_id: "${appid}" and object_type: "v5workCreate" and event: "click" | SELECT object_id, page_type, page_id, search_word, __time__ as time LIMIT 100000`;
        const v5Logs = await queryV11SlsLogs({
          query,
          from,
          to,
          reverse: false,
        });

        // 建立object_id到最新日志记录的映射（取时间最接近的）
        const workIdToLogMap = new Map<string, any>();
        for (const log of v5Logs) {
          const objectId = log.raw.object_id ? String(log.raw.object_id) : null;
          if (!objectId || !missingWorksIds.includes(objectId)) {
            continue;
          }

          const existingLog = workIdToLogMap.get(objectId);
          const logTime = log.raw.time || 0;
          if (!existingLog || logTime > (existingLog.raw.time || 0)) {
            workIdToLogMap.set(objectId, log);
          }
        }

        // 从v5workCreate事件中构建metadata
        for (const [workId, log] of workIdToLogMap.entries()) {
          const metadata: any = {};
          const pageType = log.raw.page_type ? String(log.raw.page_type) : null;
          const pageId = log.raw.page_id ? String(log.raw.page_id) : null;
          const searchWord = log.raw.search_word
            ? String(log.raw.search_word)
            : null;

          // 根据page_type设置ref_page_type和ref_page_id
          if (pageType && pageId) {
            metadata.ref_page_type = pageType;
            metadata.ref_page_id = pageId;
          }

          // 如果有search_word，添加到metadata
          if (searchWord) {
            metadata.searchword = searchWord;
          }

          // 标记为 v5 作品
          workTypeMap.set(workId, 'v5');

          // 如果metadata有内容，添加到worksMetadataMap
          if (Object.keys(metadata).length > 0) {
            worksMetadataMap.set(workId, metadata);
            validWorksIds.add(workId);
            v5WorkCreateSuccessCount++;
          } else {
            // 即使没有metadata，也标记为有效（至少存在）
            validWorksIds.add(workId);
            v5WorkCreateSuccessCount++;
          }
        }
      } catch (error) {
        console.error(`查询 ${appid} 的 SLS v5workCreate 数据失败:`, error);
      }
    }

    console.log(
      `从SLS v5workCreate事件获取到 ${v5WorkCreateSuccessCount} 个老作品的信息`
    );
  }

  // 第三步：处理每个订单，写入订单记录中间表
  const statDate = new Date(date);
  statDate.setHours(0, 0, 0, 0);

  // 批量查询当天已存在的订单记录
  const existingRecords = await prisma.orderRecordEntity.findMany({
    where: {
      order_id: {
        in: orderNos,
      },
      date: statDate,
      deleted: false,
    },
    select: {
      id: true,
      order_id: true,
      appid: true,
    },
  });

  // 建立order_id+appid到record id的映射（因为唯一约束是order_id+appid）
  const existingRecordMap = new Map<string, string>();
  for (const record of existingRecords) {
    const key = `${record.order_id}|${record.appid || ''}`;
    existingRecordMap.set(key, record.id);
  }

  let successCount = 0;
  let errorCount = 0;
  let invalidWorksIdCount = 0;

  // 批量处理订单
  const createRecords: any[] = [];
  const updateRecords: any[] = [];

  for (const order of orders) {
    try {
      const worksId = orderWorksIdMap.get(order.order_no);

      // 如果works_id无效，仍然记录订单，但work_id为null
      const finalWorksId =
        worksId && validWorksIds.has(worksId) ? worksId : null;
      if (worksId && !validWorksIds.has(worksId)) {
        invalidWorksIdCount++;
      }

      // 从作品的metadata中解析ref_page_type和ref_page_id
      let ref_page_type: string | null = null;
      let ref_page_id: string | null = null;
      let template_id: string | null = null;
      if (finalWorksId) {
        const workMetadata = worksMetadataMap.get(finalWorksId);
        if (workMetadata) {
          const parsed = parseRefPageFromMetadata(workMetadata);
          ref_page_type = parsed.ref_page_type;
          ref_page_id = parsed.ref_page_id;
        }
        // 获取模板ID
        template_id = workTemplateIdMap.get(finalWorksId) || null;
      }

      // 获取支付类型
      const payment_type = getPaymentType(order);
      // 获取支付时间
      const payment_time = paidAtMap.get(order.order_no) || null;
      // 获取作品类型
      const work_type = finalWorksId
        ? workTypeMap.get(finalWorksId) || null
        : null;

      const recordData = {
        uid: order.uid,
        order_id: order.order_no,
        order_amount: order.amount,
        payment_type: payment_type,
        payment_time: payment_time,

        ref_page_type: ref_page_type,
        ref_page_id: ref_page_id,
        work_id: finalWorksId,
        template_id: template_id,
        work_type: work_type,
        appid: order.appid,
        date: statDate,
      };

      // 使用order_id+appid组合作为key查找已存在记录
      const recordKey = `${order.order_no}|${order.appid || ''}`;
      const existingRecordId = existingRecordMap.get(recordKey);
      if (existingRecordId) {
        // 如果已存在，准备更新
        updateRecords.push({
          id: existingRecordId,
          data: {
            ...recordData,
            update_time: new Date(),
          },
        });
      } else {
        // 如果不存在，准备创建
        createRecords.push(recordData);
      }
    } catch (error) {
      console.error(`订单 ${order.order_no} 处理失败:`, error);
      errorCount++;
    }
  }

  // 批量创建新记录
  if (createRecords.length > 0) {
    try {
      await prisma.orderRecordEntity.createMany({
        data: createRecords,
        skipDuplicates: true,
      });
      successCount += createRecords.length;
    } catch (error) {
      console.error('批量创建订单记录失败:', error);
      errorCount += createRecords.length;
    }
  }

  // 批量更新现有记录（由于Prisma限制，需要逐个更新）
  for (const updateRecord of updateRecords) {
    try {
      await prisma.orderRecordEntity.update({
        where: {
          id: updateRecord.id,
        },
        data: updateRecord.data,
      });
      successCount++;
    } catch (error) {
      console.error(`更新订单记录 ${updateRecord.id} 失败:`, error);
      errorCount++;
    }
  }

  console.log(`\n同步完成！`);
  console.log(`成功: ${successCount} 条订单记录`);
  console.log(`失败: ${errorCount} 条订单记录`);
  console.log(
    `无效works_id: ${invalidWorksIdCount} 条订单（已记录但work_id为null）`
  );
}

// 主函数
async function main() {
  try {
    // 从命令行参数获取日期，默认今天
    const dateArg = process.argv[2];

    await syncOrderData(dateArg);
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

export { syncOrderData };

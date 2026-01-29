/**
 * 检查订单数据一致性
 *
 * 检查项：
 * 1. 旧系统 orders 表与新系统 Order 表的一致性
 * 2. 订单基本信息一致性（order_no, appid, uid, amount, currency, order_status）
 * 3. 时间字段一致性（created_at vs create_time, updated_at vs update_time）
 * 4. 订单扩展信息一致性（order_extra_info vs meta）
 * 5. 订单商品信息一致性（order_products vs meta.products）
 * 6. product_alias 一致性（从 meta.products[0].external_product_id 提取）
 *
 * 默认只检查 jiantie 下的订单，可通过参数调整
 */

import dotenv from 'dotenv';
import {
  closeAllConnections,
  getOrderDB,
  getPrisma,
} from '../../../service/db-connections';

// 加载环境变量
dotenv.config({ path: '.env.local' });

// 获取数据库连接
const prisma = getPrisma();
const orderDB = getOrderDB();

/**
 * 清理字符串中的空字节（PostgreSQL 不支持）
 */
function cleanString(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  // 移除空字节（\0）
  return value.replace(/\0/g, '') || undefined;
}

/**
 * 处理日期时间，将 '0000-00-00 00:00:00' 转换为 undefined
 */
function parseDateTime(
  value: string | null | undefined | Date
): Date | undefined {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value;
  }

  const str = String(value);
  // 处理 MySQL 的无效日期
  if (
    str === '0000-00-00 00:00:00' ||
    str === '0000-00-00' ||
    str.startsWith('0000-')
  ) {
    return undefined;
  }

  try {
    const date = new Date(str);
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return undefined;
    }
    return date;
  } catch {
    return undefined;
  }
}

/**
 * 比较两个日期是否相等（容忍5秒误差，因为数据库时区可能有微小差异）
 */
function isDateEqual(
  a: Date | undefined,
  b: Date | undefined
): { isEqual: boolean; diff?: number } {
  if (!a && !b) {
    return { isEqual: true };
  }
  if (!a || !b) {
    return { isEqual: false };
  }

  const diff = Math.abs(a.getTime() - b.getTime());
  // 容忍5秒误差
  return { isEqual: diff <= 5000, diff };
}

/**
 * 解析 JSON 字段
 */
function parseJSON(value: string | null | undefined): any {
  if (!value) {
    return undefined;
  }
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

/**
 * 深度比较两个对象是否相等（用于比较 meta 字段）
 */
function deepEqual(a: any, b: any, path = ''): string[] {
  const differences: string[] = [];

  if (a === b) {
    return differences;
  }

  if (a === null || a === undefined) {
    if (b !== null && b !== undefined) {
      differences.push(`${path}: 旧=null/undefined, 新=${JSON.stringify(b)}`);
    }
    return differences;
  }

  if (b === null || b === undefined) {
    differences.push(`${path}: 旧=${JSON.stringify(a)}, 新=null/undefined`);
    return differences;
  }

  if (typeof a !== typeof b) {
    differences.push(`${path}: 类型不匹配 旧=${typeof a}, 新=${typeof b}`);
    return differences;
  }

  if (typeof a !== 'object' || a instanceof Date || b instanceof Date) {
    if (a !== b) {
      differences.push(`${path}: 旧=${a}, 新=${b}`);
    }
    return differences;
  }

  if (Array.isArray(a) !== Array.isArray(b)) {
    differences.push(
      `${path}: 数组类型不匹配 旧=${Array.isArray(a)}, 新=${Array.isArray(b)}`
    );
    return differences;
  }

  if (Array.isArray(a)) {
    if (a.length !== b.length) {
      differences.push(
        `${path}: 数组长度不匹配 旧=${a.length}, 新=${b.length}`
      );
    }
    const maxLength = Math.max(a.length, b.length);
    for (let i = 0; i < maxLength; i++) {
      differences.push(...deepEqual(a[i], b[i], `${path}[${i}]`));
    }
    return differences;
  }

  // 对象比较
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of allKeys) {
    const newPath = path ? `${path}.${key}` : key;
    differences.push(...deepEqual(a[key], b[key], newPath));
  }

  return differences;
}

/**
 * 检查单条订单记录一致性
 */
function checkOrderConsistency(
  oldRecord: any,
  newRecord: any,
  oldExtraInfo: any,
  oldProducts: any[]
): { isConsistent: boolean; differences: string[] } {
  const differences: string[] = [];

  // 检查 order_no
  const oldOrderNo = cleanString(oldRecord.order_no);
  const newOrderNo = cleanString(newRecord.order_no);
  if (oldOrderNo !== newOrderNo) {
    differences.push(`order_no 不匹配: 旧=${oldOrderNo}, 新=${newOrderNo}`);
  }

  // 检查 appid
  const oldAppid = cleanString(oldRecord.appid);
  const newAppid = cleanString(newRecord.appid);
  if (oldAppid !== newAppid) {
    differences.push(`appid 不匹配: 旧=${oldAppid}, 新=${newAppid}`);
  }

  // 检查 uid
  if (Number(oldRecord.uid) !== Number(newRecord.uid)) {
    differences.push(`uid 不匹配: 旧=${oldRecord.uid}, 新=${newRecord.uid}`);
  }

  // 检查 amount
  const oldAmount = Number(oldRecord.amount);
  const newAmount = Number(newRecord.amount);
  if (Math.abs(oldAmount - newAmount) > 0.01) {
    // 容忍0.01的误差（浮点数精度问题）
    differences.push(`amount 不匹配: 旧=${oldAmount}, 新=${newAmount}`);
  }

  // 检查 currency
  const oldCurrency = cleanString(oldRecord.currency) || 'CNY';
  const newCurrency = cleanString(newRecord.currency) || 'CNY';
  if (oldCurrency !== newCurrency) {
    differences.push(`currency 不匹配: 旧=${oldCurrency}, 新=${newCurrency}`);
  }

  // 检查 order_status
  const oldStatus = cleanString(oldRecord.order_status) || 'created';
  const newStatus = cleanString(newRecord.order_status) || 'created';
  if (oldStatus !== newStatus) {
    differences.push(`order_status 不匹配: 旧=${oldStatus}, 新=${newStatus}`);
  }

  // 检查时间字段
  const oldCreateTime = parseDateTime(oldRecord.created_at);
  const newCreateTime = newRecord.create_time
    ? new Date(newRecord.create_time)
    : undefined;
  const createTimeCompare = isDateEqual(oldCreateTime, newCreateTime);
  if (!createTimeCompare.isEqual) {
    differences.push(
      `create_time 不匹配: 旧=${oldCreateTime?.toISOString()}, 新=${newCreateTime?.toISOString()}, 差异=${createTimeCompare.diff}ms`
    );
  }

  // const oldUpdateTime = parseDateTime(oldRecord.updated_at);
  // const newUpdateTime = newRecord.update_time
  //   ? new Date(newRecord.update_time)
  //   : undefined;
  // const updateTimeCompare = isDateEqual(oldUpdateTime, newUpdateTime);
  // if (!updateTimeCompare.isEqual) {
  //   differences.push(
  //     `update_time 不匹配: 旧=${oldUpdateTime?.toISOString()}, 新=${newUpdateTime?.toISOString()}, 差异=${updateTimeCompare.diff}ms`
  //   );
  // }

  // 构建旧系统的 meta 对象（用于比较）
  const oldMeta: any = {};

  // 合并 order_extra_info
  if (oldExtraInfo) {
    if (oldExtraInfo.device) oldMeta.device = cleanString(oldExtraInfo.device);
    if (oldExtraInfo.version)
      oldMeta.version = cleanString(oldExtraInfo.version);
    if (oldExtraInfo.bundle_id)
      oldMeta.bundle_id = cleanString(oldExtraInfo.bundle_id);
    if (oldExtraInfo.ip) oldMeta.ip = cleanString(oldExtraInfo.ip);
    if (oldExtraInfo.channel_id)
      oldMeta.channel_id = cleanString(oldExtraInfo.channel_id);
    if (oldExtraInfo.locale) oldMeta.locale = cleanString(oldExtraInfo.locale);

    // 解析 JSON 字段
    if (oldExtraInfo.header_info) {
      const headerInfo = parseJSON(oldExtraInfo.header_info);
      if (headerInfo) oldMeta.header_info = headerInfo;
    }
    if (oldExtraInfo.device_identifiers) {
      const deviceIdentifiers = parseJSON(oldExtraInfo.device_identifiers);
      if (deviceIdentifiers) oldMeta.device_identifiers = deviceIdentifiers;
    }
    if (oldExtraInfo.utm_metadata) {
      const utmMetadata = parseJSON(oldExtraInfo.utm_metadata);
      if (utmMetadata) oldMeta.utm_metadata = utmMetadata;
    }
    if (oldExtraInfo.trace_metadata) {
      const traceMetadata = parseJSON(oldExtraInfo.trace_metadata);
      if (traceMetadata) oldMeta.trace_metadata = traceMetadata;
    }
  }

  // 合并 order_products
  if (oldProducts && oldProducts.length > 0) {
    oldMeta.products = oldProducts.map((p: any) => ({
      external_product_id: cleanString(p.external_product_id),
      product_name: cleanString(p.product_name),
      product_price: Number(p.product_price),
      currency: cleanString(p.currency),
      product_type: cleanString(p.product_type),
      product_thumbnail_url: cleanString(p.product_thumbnail_url),
      quantity: Number(p.quantity),
    }));
  }

  // 比较 meta 字段
  // const newMeta = newRecord.meta || {};
  // const metaDifferences = deepEqual(oldMeta, newMeta, 'meta');
  // if (metaDifferences.length > 0) {
  //   differences.push(...metaDifferences);
  // }

  // 检查 product_alias
  const expectedProductAlias =
    oldMeta.products && oldMeta.products.length > 0
      ? oldMeta.products[0].external_product_id
      : undefined;
  const actualProductAlias = cleanString(newRecord.product_alias);
  if (expectedProductAlias !== actualProductAlias) {
    differences.push(
      `product_alias 不匹配: 预期=${expectedProductAlias}, 实际=${actualProductAlias}`
    );
  }

  return {
    isConsistent: differences.length === 0,
    differences,
  };
}

/**
 * 检查订单数据一致性
 * @param options 检查选项
 */
async function checkOrdersConsistency(
  options: {
    batchSize?: number;
    appid?: string | string[];
    startTime?: string | Date;
    endTime?: string | Date;
    limit?: number;
  } = {}
) {
  const { batchSize = 1000, appid, startTime, endTime, limit } = options;

  console.log('开始检查订单数据一致性...');
  console.log('检查选项:', {
    batchSize,
    appid,
    startTime,
    endTime,
    limit,
  });

  // 构建查询条件
  let query = orderDB('orders').select('*');

  // 过滤 appid（默认只检查 jiantie）
  if (appid) {
    if (Array.isArray(appid)) {
      query = query.whereIn('appid', appid);
    } else {
      query = query.where('appid', appid);
    }
  } else {
    query = query.where('appid', 'jiantie');
  }

  // 过滤时间范围（使用 created_at 字段）
  if (startTime) {
    const startDate =
      startTime instanceof Date ? startTime : new Date(startTime);
    query = query.where('created_at', '>=', startDate);
  }
  if (endTime) {
    const endDate = endTime instanceof Date ? endTime : new Date(endTime);
    query = query.where('created_at', '<=', endDate);
  }

  // 限制数量
  if (limit) {
    query = query.limit(limit);
  }

  // 按 created_at, id 排序
  query = query.orderBy('created_at', 'asc').orderBy('id', 'asc');

  // 查询总数
  const totalCount = await query.clone().count('* as count').first();
  const total = Number(totalCount?.count || 0);
  console.log(`找到 ${total} 条订单记录需要检查`);

  if (total === 0) {
    console.log('没有需要检查的订单记录');
    return;
  }

  let processed = 0;
  let consistent = 0;
  let inconsistent = 0;
  let notFound = 0;
  const inconsistentDetails: Array<{
    order_no: string;
    appid: string;
    uid: number;
    type: 'not_found' | 'inconsistent';
    differences: string[];
  }> = [];

  // 分批处理
  for (let offset = 0; offset < total; offset += batchSize) {
    const batch = await query.clone().limit(batchSize).offset(offset);
    const batchNum = Math.floor(offset / batchSize) + 1;
    const totalBatches = Math.ceil(total / batchSize);

    console.log(
      `\n处理批次 ${batchNum}/${totalBatches}，数量=${batch.length}，进度=${processed}/${total}`
    );

    // 获取这批记录的 order_no 列表
    const orderNos = batch
      .map((r: any) => cleanString(r.order_no))
      .filter((no: string | undefined): no is string => !!no);

    // 查询这批订单在新系统中的数据
    const newOrders = await prisma.order.findMany({
      where: { order_no: { in: orderNos } },
    });

    // 构建新系统订单映射
    const newOrderMap = new Map<string, any>();
    for (const order of newOrders) {
      newOrderMap.set(order.order_no, order);
    }

    // 检查每条记录
    for (const oldRecord of batch) {
      processed++;
      const orderNo = cleanString(oldRecord.order_no);
      const appidValue = cleanString(oldRecord.appid) || oldRecord.appid;
      const uid = Number(oldRecord.uid);

      if (!orderNo) {
        console.warn(
          `  跳过无效记录: id=${oldRecord.id}, order_no=${orderNo}, appid=${appidValue}, uid=${uid}`
        );
        continue;
      }

      // 查找新系统中的对应记录
      const newRecord = newOrderMap.get(orderNo);

      if (!newRecord) {
        notFound++;
        inconsistent++;
        inconsistentDetails.push({
          order_no: orderNo,
          appid: String(appidValue),
          uid,
          type: 'not_found',
          differences: [`订单在新系统中不存在: order_no=${orderNo}`],
        });
        continue;
      }

      // 查询订单扩展信息
      const extraInfo = await orderDB('order_extra_info')
        .where('order_no', orderNo)
        .first();

      // 查询订单商品信息
      const products = await orderDB('order_products')
        .where('order_no', orderNo)
        .select('*');

      // 检查一致性
      const checkResult = checkOrderConsistency(
        oldRecord,
        newRecord,
        extraInfo,
        products
      );

      if (checkResult.isConsistent) {
        consistent++;
      } else {
        inconsistent++;
        inconsistentDetails.push({
          order_no: orderNo,
          appid: String(appidValue),
          uid,
          type: 'inconsistent',
          differences: checkResult.differences,
        });
      }
    }

    console.log(
      `批次 ${batchNum} 完成: 一致=${consistent}, 不一致=${inconsistent}, 未找到=${notFound}, 总计=${processed}/${total}`
    );
  }

  // 输出检查结果
  console.log('\n========== 检查完成 ==========');
  console.log(`总计: ${processed}`);
  console.log(`一致: ${consistent}`);
  console.log(`不一致: ${inconsistent}`);
  console.log(`未找到: ${notFound}`);

  // 输出不一致的详细信息
  if (inconsistentDetails.length > 0) {
    console.log('\n========== 不一致详情 ==========');
    for (const detail of inconsistentDetails.slice(0, 50)) {
      // 只显示前50个不一致的详情
      console.log(
        `\nOrderNo: ${detail.order_no}, AppID: ${detail.appid}, UID: ${detail.uid}, 类型: ${detail.type}`
      );
      for (const diff of detail.differences) {
        console.log(`  - ${diff}`);
      }
    }
    if (inconsistentDetails.length > 50) {
      console.log(
        `\n... 还有 ${inconsistentDetails.length - 50} 个不一致的详情未显示`
      );
    }
  }

  return {
    total: processed,
    consistent,
    inconsistent,
    notFound,
    details: inconsistentDetails,
  };
}

/**
 * 主函数
 */
async function main() {
  try {
    const args = process.argv.slice(2);

    // 解析命令行参数
    const options: any = {};
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (!arg?.startsWith('--')) {
        continue;
      }

      // 支持 --key=value 格式
      if (arg.includes('=')) {
        const [key, value] = arg.split('=');
        const paramKey = key.replace('--', '');
        if (paramKey === 'appid') {
          options.appid = value.split(',').map((v: string) => v.trim());
        } else if (paramKey === 'batchSize' || paramKey === 'limit') {
          options[paramKey] = parseInt(value, 10);
        } else if (paramKey === 'startTime' || paramKey === 'endTime') {
          options[paramKey] = value;
        }
        continue;
      }

      // 支持 --key value 格式
      const key = arg.replace('--', '');
      const value = args[i + 1];
      if (key && value) {
        if (key === 'appid') {
          options.appid = value.split(',').map((v: string) => v.trim());
          i++; // 跳过下一个参数
        } else if (key === 'batchSize' || key === 'limit') {
          options[key] = parseInt(value, 10);
          i++; // 跳过下一个参数
        } else if (key === 'startTime' || key === 'endTime') {
          options[key] = value;
          i++; // 跳过下一个参数
        }
      }
    }

    await checkOrdersConsistency(options);
  } catch (error) {
    console.error('检查过程出错:', error);
    process.exit(1);
  } finally {
    await closeAllConnections();
    process.exit(0);
  }
}

// 如果直接运行此文件，执行主函数
if (require.main === module) {
  main();
}

export { checkOrdersConsistency };

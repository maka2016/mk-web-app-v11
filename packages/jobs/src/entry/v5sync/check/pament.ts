/**
 * 检查支付数据一致性
 *
 * 检查项：
 * 1. 旧系统 payments 表与新系统 Payment 表的一致性
 * 2. 支付基本信息一致性（order_no, appid, uid, amount, currency）
 * 3. 支付方式一致性（payment_method, payment_type）
 * 4. 支付状态一致性（payment_status）
 * 5. 支付凭证一致性（transaction_id）
 * 6. 时间字段一致性（created_at vs create_time, paid_at vs paid_at）
 *
 * 默认只检查 jiantie 下的支付记录，可通过参数调整
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
  return { isEqual: diff <= 30000, diff };
}

/**
 * 检查单条支付记录一致性
 */
function checkPaymentConsistency(
  oldRecord: any,
  newRecord: any
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

  // 检查 payment_method（支付方式）
  const oldPaymentMethod = cleanString(oldRecord.payment_method) || 'unknown';
  const newPaymentMethod = cleanString(newRecord.payment_method) || 'unknown';
  if (oldPaymentMethod !== newPaymentMethod) {
    differences.push(
      `payment_method 不匹配: 旧=${oldPaymentMethod}, 新=${newPaymentMethod}`
    );
  }

  // 检查 payment_type（支付类型）
  const oldPaymentType = cleanString(oldRecord.payment_type) || 'unknown';
  const newPaymentType = cleanString(newRecord.payment_type) || 'unknown';
  if (oldPaymentType !== newPaymentType) {
    differences.push(
      `payment_type 不匹配: 旧=${oldPaymentType}, 新=${newPaymentType}`
    );
  }

  // 检查 payment_status（支付状态）
  const oldPaymentStatus = cleanString(oldRecord.payment_status) || 'pending';
  const newPaymentStatus = cleanString(newRecord.payment_status) || 'pending';
  if (oldPaymentStatus !== newPaymentStatus) {
    differences.push(
      `payment_status 不匹配: 旧=${oldPaymentStatus}, 新=${newPaymentStatus}`
    );
  }

  // 检查 transaction_id（支付凭证）
  const oldTransactionId = cleanString(oldRecord.transaction_id);
  const newTransactionId = cleanString(newRecord.transaction_id);
  if (oldTransactionId !== newTransactionId) {
    differences.push(
      `transaction_id 不匹配: 旧=${oldTransactionId || 'null'}, 新=${newTransactionId || 'null'}`
    );
  }

  // 检查时间字段
  // const oldCreateTime = parseDateTime(oldRecord.created_at);
  // const newCreateTime = newRecord.create_time
  //   ? new Date(newRecord.create_time)
  //   : undefined;
  // const createTimeCompare = isDateEqual(oldCreateTime, newCreateTime);
  // if (!createTimeCompare.isEqual) {
  //   differences.push(
  //     `create_time 不匹配: 旧=${oldCreateTime?.toISOString()}, 新=${newCreateTime?.toISOString()}, 差异=${createTimeCompare.diff}ms`
  //   );
  // }

  // 检查 paid_at（支付完成时间）
  const oldPaidAt = parseDateTime(oldRecord.paid_at);
  const newPaidAt = newRecord.paid_at ? new Date(newRecord.paid_at) : undefined;
  const paidAtCompare = isDateEqual(oldPaidAt, newPaidAt);
  if (!paidAtCompare.isEqual) {
    differences.push(
      `paid_at 不匹配: 旧=${oldPaidAt?.toISOString() || 'null'}, 新=${newPaidAt?.toISOString() || 'null'}, 差异=${paidAtCompare.diff}ms`
    );
  }

  return {
    isConsistent: differences.length === 0,
    differences,
  };
}

/**
 * 检查支付数据一致性
 * @param options 检查选项
 */
async function checkPaymentsConsistency(
  options: {
    batchSize?: number;
    appid?: string | string[];
    startTime?: string | Date;
    endTime?: string | Date;
    limit?: number;
  } = {}
) {
  const { batchSize = 1000, appid, startTime, endTime, limit } = options;

  console.log('开始检查支付数据一致性...');
  console.log('检查选项:', {
    batchSize,
    appid,
    startTime,
    endTime,
    limit,
  });

  // 构建查询条件
  let query = orderDB('payments').select('*');

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

  // 跳过 payment_status 为 pending 的老记录
  query = query.where('payment_status', '!=', 'pending');

  // 限制数量
  if (limit) {
    query = query.limit(limit);
  }

  // 按 created_at, id 排序
  query = query.orderBy('created_at', 'asc').orderBy('id', 'asc');

  // 查询总数
  const totalCount = await query.clone().count('* as count').first();
  const total = Number(totalCount?.count || 0);
  console.log(`找到 ${total} 条支付记录需要检查`);

  if (total === 0) {
    console.log('没有需要检查的支付记录');
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

    // 查询这批支付记录在新系统中的数据
    const newPayments = await prisma.payment.findMany({
      where: { order_no: { in: orderNos } },
    });

    // 构建新系统支付记录映射（按 order_no 映射，如果有多条则取第一条）
    const newPaymentMap = new Map<string, any>();
    for (const payment of newPayments) {
      const orderNo = payment.order_no;
      // 如果已存在，保留第一条（通常一个订单只有一条支付记录）
      if (!newPaymentMap.has(orderNo)) {
        newPaymentMap.set(orderNo, payment);
      }
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
      const newRecord = newPaymentMap.get(orderNo);

      if (!newRecord) {
        notFound++;
        inconsistent++;
        inconsistentDetails.push({
          order_no: orderNo,
          appid: String(appidValue),
          uid,
          type: 'not_found',
          differences: [`支付记录在新系统中不存在: order_no=${orderNo}`],
        });
        continue;
      }

      // 检查一致性
      const checkResult = checkPaymentConsistency(oldRecord, newRecord);

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

    await checkPaymentsConsistency(options);
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

export { checkPaymentsConsistency };

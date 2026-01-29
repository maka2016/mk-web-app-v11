/**
 * 同步订单和支付数据到新系统
 *
 * 从旧系统（订单数据库）同步订单和支付数据到新系统（v11数据库）
 *
 * 旧表:
 * - orders: 订单主表
 * - order_extra_info: 订单扩展信息（合并到新系统的 meta 字段）
 * - order_products: 订单商品信息（合并到新系统的 meta.products 字段）
 * - payments: 支付信息
 *
 * 新表:
 * - Order: 订单表（包含 meta 字段存储扩展信息和商品信息）
 * - Payment: 支付表
 *
 * 特殊处理:
 * - 旧系统的 order_extra_info 合并到新系统 Order 的 meta 字段
 * - 旧系统的 order_products 合并到新系统 Order 的 meta.products 数组
 * - 默认只同步 appid='jiantie' 的数据
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
 * 同步订单数据
 * @param options 同步选项
 */
async function syncOrders(
  options: {
    batchSize?: number;
    appid?: string | string[];
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}
) {
  const { batchSize = 1000, appid, startDate, endDate, limit } = options;

  console.log('开始同步订单数据...');
  console.log('同步选项:', {
    batchSize,
    appid,
    startDate,
    endDate,
    limit,
  });

  // 构建查询条件
  let query = orderDB('orders').select('*');

  // 过滤 appid（默认只同步 jiantie）
  if (appid) {
    if (Array.isArray(appid)) {
      query = query.whereIn('appid', appid);
    } else {
      query = query.where('appid', appid);
    }
  } else {
    query = query.where('appid', 'jiantie');
  }

  // 过滤订单日期范围
  if (startDate) {
    query = query.where('created_at', '>=', startDate);
  }
  if (endDate) {
    query = query.where('created_at', '<=', endDate);
  }

  // 限制数量
  if (limit) {
    query = query.limit(limit);
  }

  // 按 created_at 排序
  query = query.orderBy('created_at', 'asc');

  // 查询总数
  const totalCount = await query.clone().count('* as count').first();
  const total = Number(totalCount?.count || 0);
  console.log(`找到 ${total} 条订单记录需要同步`);

  if (total === 0) {
    console.log('没有需要同步的订单记录');
    return;
  }

  let processed = 0;
  let success = 0;
  let failed = 0;
  let skipped = 0;
  const failedRecords: Array<{ order_no: string; error: string }> = [];

  // 分批处理
  for (let offset = 0; offset < total; offset += batchSize) {
    const batch = await query.clone().limit(batchSize).offset(offset);
    const batchNum = Math.floor(offset / batchSize) + 1;
    const totalBatches = Math.ceil(total / batchSize);

    console.log(
      `\n处理批次 ${batchNum}/${totalBatches}，数量=${batch.length}，进度=${processed}/${total}`
    );

    // 批量处理订单
    const results = await Promise.all(
      batch.map(async (orderRecord: any) => {
        try {
          const orderNo = cleanString(orderRecord.order_no);
          const appid = cleanString(orderRecord.appid);
          const uid = Number(orderRecord.uid);

          if (!orderNo || !appid || !uid) {
            console.warn(
              `  跳过无效记录: order_no=${orderNo}, appid=${appid}, uid=${uid}`
            );
            return { ok: false, skipped: true };
          }

          // 检查用户是否存在
          const userExists = await prisma.user.findUnique({
            where: { uid },
            select: { uid: true },
          });

          if (!userExists) {
            console.warn(`  跳过不存在的用户: order_no=${orderNo}, uid=${uid}`);
            return { ok: false, skipped: true };
          }

          // 查询订单扩展信息
          const extraInfo = await orderDB('order_extra_info')
            .where('order_no', orderNo)
            .first();

          // 查询订单商品信息
          const products = await orderDB('order_products')
            .where('order_no', orderNo)
            .select('*');

          // 构建 meta 字段
          const meta: any = {};

          // 合并 order_extra_info
          if (extraInfo) {
            if (extraInfo.device) meta.device = cleanString(extraInfo.device);
            if (extraInfo.version)
              meta.version = cleanString(extraInfo.version);
            if (extraInfo.bundle_id)
              meta.bundle_id = cleanString(extraInfo.bundle_id);
            if (extraInfo.ip) meta.ip = cleanString(extraInfo.ip);
            if (extraInfo.channel_id)
              meta.channel_id = cleanString(extraInfo.channel_id);
            if (extraInfo.locale) meta.locale = cleanString(extraInfo.locale);

            // 解析 JSON 字段
            if (extraInfo.header_info) {
              const headerInfo = parseJSON(extraInfo.header_info);
              if (headerInfo) meta.header_info = headerInfo;
            }
            if (extraInfo.device_identifiers) {
              const deviceIdentifiers = parseJSON(extraInfo.device_identifiers);
              if (deviceIdentifiers)
                meta.device_identifiers = deviceIdentifiers;
            }
            if (extraInfo.utm_metadata) {
              const utmMetadata = parseJSON(extraInfo.utm_metadata);
              if (utmMetadata) meta.utm_metadata = utmMetadata;
            }
            if (extraInfo.trace_metadata) {
              const traceMetadata = parseJSON(extraInfo.trace_metadata);
              if (traceMetadata) meta.trace_metadata = traceMetadata;
            }
          }

          // 合并 order_products
          if (products && products.length > 0) {
            meta.products = products.map((p: any) => ({
              external_product_id: cleanString(p.external_product_id),
              product_name: cleanString(p.product_name),
              product_price: Number(p.product_price),
              currency: cleanString(p.currency),
              product_type: cleanString(p.product_type),
              product_thumbnail_url: cleanString(p.product_thumbnail_url),
              quantity: Number(p.quantity),
            }));
          }

          // 提取 product_alias（如果有商品信息，取第一个商品的 external_product_id）
          const productAlias =
            meta.products && meta.products.length > 0
              ? meta.products[0].external_product_id
              : undefined;

          // 查询是否已存在相同的订单
          const existingOrder = await prisma.order.findUnique({
            where: { order_no: orderNo },
          });

          if (existingOrder) {
            // 更新现有订单
            await prisma.order.update({
              where: { order_no: orderNo },
              data: {
                amount: Number(orderRecord.amount),
                currency: cleanString(orderRecord.currency) || 'CNY',
                order_status:
                  cleanString(orderRecord.order_status) || 'created',
                product_alias: productAlias,
                meta,
                update_time: new Date(),
              },
            });
          } else {
            // 创建新订单
            await prisma.order.create({
              data: {
                order_no: orderNo,
                appid,
                uid,
                amount: Number(orderRecord.amount),
                currency: cleanString(orderRecord.currency) || 'CNY',
                order_status:
                  cleanString(orderRecord.order_status) || 'created',
                product_alias: productAlias,
                meta,
                create_time:
                  parseDateTime(orderRecord.created_at) || new Date(),
                update_time:
                  parseDateTime(orderRecord.updated_at) || new Date(),
              },
            });
          }

          return { ok: true, order_no: orderNo };
        } catch (error: any) {
          console.error(
            `  ✗ 同步订单失败: order_no=${orderRecord.order_no}`,
            error?.message || error
          );
          return {
            ok: false,
            order_no: cleanString(orderRecord.order_no),
            error: error?.message || String(error),
          };
        }
      })
    );

    // 统计结果
    for (const result of results as any[]) {
      processed++;
      if (result.ok) {
        success++;
      } else if (result.skipped) {
        skipped++;
      } else {
        failed++;
        if (result.order_no) {
          failedRecords.push({
            order_no: result.order_no,
            error: result.error || 'unknown',
          });
        }
      }
    }

    console.log(
      `批次 ${batchNum} 完成: 成功=${success}, 失败=${failed}, 跳过=${skipped}, 总计=${processed}/${total}`
    );
  }

  console.log('\n订单同步完成！');
  console.log(`总计: ${processed}`);
  console.log(`成功: ${success}`);
  console.log(`失败: ${failed}`);
  console.log(`跳过: ${skipped}`);

  if (failedRecords.length > 0) {
    console.log('\n失败的记录列表:');
    console.log('OrderNo\tError');
    const displayRecords = failedRecords.slice(0, 10);
    for (const record of displayRecords) {
      console.log(`${record.order_no}\t${record.error.substring(0, 50)}`);
    }
    if (failedRecords.length > 10) {
      console.log(`... 还有 ${failedRecords.length - 10} 条失败记录`);
    }
  }
}

/**
 * 同步支付数据
 * @param options 同步选项
 */
async function syncPayments(
  options: {
    batchSize?: number;
    appid?: string | string[];
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}
) {
  const { batchSize = 1000, appid, startDate, endDate, limit } = options;

  console.log('\n开始同步支付数据...');
  console.log('同步选项:', {
    batchSize,
    appid,
    startDate,
    endDate,
    limit,
  });

  // 构建查询条件
  let query = orderDB('payments').select('*');

  // 过滤 appid（默认只同步 jiantie）
  if (appid) {
    if (Array.isArray(appid)) {
      query = query.whereIn('appid', appid);
    } else {
      query = query.where('appid', appid);
    }
  } else {
    query = query.where('appid', 'jiantie');
  }

  // 过滤支付日期范围
  if (startDate) {
    query = query.where('created_at', '>=', startDate);
  }
  if (endDate) {
    query = query.where('created_at', '<=', endDate);
  }

  // 限制数量
  if (limit) {
    query = query.limit(limit);
  }

  // 按 created_at 排序
  query = query.orderBy('created_at', 'asc');

  // 查询总数
  const totalCount = await query.clone().count('* as count').first();
  const total = Number(totalCount?.count || 0);
  console.log(`找到 ${total} 条支付记录需要同步`);

  if (total === 0) {
    console.log('没有需要同步的支付记录');
    return;
  }

  let processed = 0;
  let success = 0;
  let failed = 0;
  let skipped = 0;
  const failedRecords: Array<{ order_no: string; error: string }> = [];

  // 分批处理
  for (let offset = 0; offset < total; offset += batchSize) {
    const batch = await query.clone().limit(batchSize).offset(offset);
    const batchNum = Math.floor(offset / batchSize) + 1;
    const totalBatches = Math.ceil(total / batchSize);

    console.log(
      `\n处理批次 ${batchNum}/${totalBatches}，数量=${batch.length}，进度=${processed}/${total}`
    );

    // 批量处理支付记录
    const results = await Promise.all(
      batch.map(async (paymentRecord: any) => {
        try {
          const orderNo = cleanString(paymentRecord.order_no);
          const appid = cleanString(paymentRecord.appid);
          const uid = Number(paymentRecord.uid);

          if (!orderNo || !appid || !uid) {
            console.warn(
              `  跳过无效记录: order_no=${orderNo}, appid=${appid}, uid=${uid}`
            );
            return { ok: false, skipped: true };
          }

          // 检查订单是否存在（必须先同步订单）
          const orderExists = await prisma.order.findUnique({
            where: { order_no: orderNo },
            select: { order_no: true },
          });

          if (!orderExists) {
            console.warn(`  跳过不存在的订单: order_no=${orderNo}`);
            return { ok: false, skipped: true };
          }

          // 检查是否已存在相同的支付记录（按 order_no 去重）
          const existingPayment = await prisma.payment.findFirst({
            where: { order_no: orderNo },
          });

          const paymentData = {
            order_no: orderNo,
            appid,
            uid,
            payment_method:
              cleanString(paymentRecord.payment_method) || 'unknown',
            payment_type: cleanString(paymentRecord.payment_type) || 'unknown',
            transaction_id: cleanString(paymentRecord.transaction_id),
            amount: Number(paymentRecord.amount),
            currency: cleanString(paymentRecord.currency) || 'CNY',
            payment_status:
              cleanString(paymentRecord.payment_status) || 'pending',
            raw_response: cleanString(paymentRecord.raw_response),
            paid_at: parseDateTime(paymentRecord.paid_at),
            update_time: new Date(),
          };

          if (existingPayment) {
            // 更新现有支付记录
            await prisma.payment.update({
              where: { id: existingPayment.id },
              data: paymentData,
            });
          } else {
            // 创建新支付记录
            await prisma.payment.create({
              data: {
                ...paymentData,
                create_time:
                  parseDateTime(paymentRecord.created_at) || new Date(),
              },
            });
          }

          return { ok: true, order_no: orderNo };
        } catch (error: any) {
          console.error(
            `  ✗ 同步支付失败: order_no=${paymentRecord.order_no}`,
            error?.message || error
          );
          return {
            ok: false,
            order_no: cleanString(paymentRecord.order_no),
            error: error?.message || String(error),
          };
        }
      })
    );

    // 统计结果
    for (const result of results as any[]) {
      processed++;
      if (result.ok) {
        success++;
      } else if (result.skipped) {
        skipped++;
      } else {
        failed++;
        if (result.order_no) {
          failedRecords.push({
            order_no: result.order_no,
            error: result.error || 'unknown',
          });
        }
      }
    }

    console.log(
      `批次 ${batchNum} 完成: 成功=${success}, 失败=${failed}, 跳过=${skipped}, 总计=${processed}/${total}`
    );
  }

  console.log('\n支付同步完成！');
  console.log(`总计: ${processed}`);
  console.log(`成功: ${success}`);
  console.log(`失败: ${failed}`);
  console.log(`跳过: ${skipped}`);

  if (failedRecords.length > 0) {
    console.log('\n失败的记录列表:');
    console.log('OrderNo\tError');
    const displayRecords = failedRecords.slice(0, 10);
    for (const record of displayRecords) {
      console.log(`${record.order_no}\t${record.error.substring(0, 50)}`);
    }
    if (failedRecords.length > 10) {
      console.log(`... 还有 ${failedRecords.length - 10} 条失败记录`);
    }
  }
}

/**
 * 同步支付凭证日志（payment_tokens & payment_tokens_log -> PaymentTokenLog）
 *
 * 说明：
 * - 优先从 payment_tokens_log 读取原始记录 original_record（JSON），从中解析出 order_no 等信息
 * - 通过 id 关联 payment_tokens 获取 token、渠道等信息
 * - 只有当 original_record 中能解析出 order_no 时才会写入新表（避免写入无订单关联的数据）
 * - 目前主要用于迁移 Apple IAP 等历史凭证数据
 */
async function syncPaymentTokenLogs(
  options: {
    batchSize?: number;
    appid?: string | string[];
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}
) {
  const { batchSize = 1000, appid, startDate, endDate, limit } = options;

  console.log('\n开始同步支付凭证日志（PaymentTokenLog）...');
  console.log('同步选项:', {
    batchSize,
    appid,
    startDate,
    endDate,
    limit,
  });

  // 以 payment_tokens_log 作为主表，按 log 创建时间筛选
  let query = orderDB('payment_tokens_log').select('*');

  // 过滤 appid（默认只同步 jiantie）
  if (appid) {
    if (Array.isArray(appid)) {
      query = query.whereIn('appid', appid);
    } else {
      query = query.where('appid', appid);
    }
  } else {
    query = query.where('appid', 'jiantie');
  }

  // 过滤创建时间范围
  if (startDate) {
    query = query.where('created_at', '>=', startDate);
  }
  if (endDate) {
    query = query.where('created_at', '<=', endDate);
  }

  // 限制数量
  if (limit) {
    query = query.limit(limit);
  }

  // 按 created_at 排序
  query = query.orderBy('created_at', 'asc');

  const totalCount = await query.clone().count('* as count').first();
  const total = Number(totalCount?.count || 0);
  console.log(`找到 ${total} 条支付凭证日志记录需要同步`);

  if (total === 0) {
    console.log('没有需要同步的支付凭证日志记录');
    return;
  }

  let processed = 0;
  let success = 0;
  let failed = 0;
  let skipped = 0;
  const failedRecords: Array<{ id: number; error: string }> = [];

  for (let offset = 0; offset < total; offset += batchSize) {
    const batch = await query.clone().limit(batchSize).offset(offset);
    const batchNum = Math.floor(offset / batchSize) + 1;
    const totalBatches = Math.ceil(total / batchSize);

    console.log(
      `\n处理凭证批次 ${batchNum}/${totalBatches}，数量=${batch.length}，进度=${processed}/${total}`
    );

    const results = await Promise.all(
      batch.map(async (logRecord: any) => {
        try {
          const id = Number(logRecord.id);
          const appid = cleanString(logRecord.appid);
          const uid = Number(logRecord.uid);

          if (!id || !appid || !uid) {
            console.warn(
              `  跳过无效凭证记录: id=${id}, appid=${appid}, uid=${uid}`
            );
            return { ok: false, skipped: true };
          }

          // 检查用户是否存在
          const userExists = await prisma.user.findUnique({
            where: { uid },
            select: { uid: true },
          });

          if (!userExists) {
            console.warn(`  跳过不存在的用户凭证: id=${id}, uid=${uid}`);
            return { ok: false, skipped: true };
          }

          // 解析 original_record（通常是 JSON）
          const original = parseJSON(logRecord.original_record);
          if (!original || typeof original !== 'object') {
            console.warn(`  跳过无法解析 original_record 的记录: id=${id}`);
            return { ok: false, skipped: true };
          }

          // 尝试从 original_record 中提取 order_no
          const orderNo =
            cleanString(
              (original as any).order_no ||
                (original as any).orderNo ||
                (original as any).order_number
            ) || undefined;

          if (!orderNo) {
            console.warn(
              `  跳过没有 order_no 的凭证记录: id=${id}, uid=${uid}`
            );
            return { ok: false, skipped: true };
          }

          // 检查订单是否存在（只迁移能关联到订单的凭证）
          const orderExists = await prisma.order.findUnique({
            where: { order_no: orderNo },
            select: { order_no: true },
          });

          if (!orderExists) {
            console.warn(
              `  跳过找不到对应订单的凭证记录: id=${id}, order_no=${orderNo}`
            );
            return { ok: false, skipped: true };
          }

          // 关联 payment_tokens 表，获取 token 及渠道信息
          const tokenRecord = await orderDB('payment_tokens')
            .where('id', id)
            .first();

          if (!tokenRecord) {
            console.warn(
              `  跳过没有匹配 payment_tokens 的凭证记录: id=${id}, order_no=${orderNo}`
            );
            return { ok: false, skipped: true };
          }

          // 组装 token_data
          const extra = parseJSON(tokenRecord.extra);
          const tokenData: any = {
            bundle_id: cleanString(tokenRecord.bundle_id),
            token_type: cleanString(tokenRecord.token_type),
            is_valid: Boolean(tokenRecord.is_valid),
            original_record: original,
            source: 'v5_token_migration',
          };

          if (extra && typeof extra === 'object') {
            tokenData.extra = extra;
          }

          // 标准化 payment_method（尽量与新系统保持一致）
          const channel = (
            cleanString(tokenRecord.channel) || ''
          ).toLowerCase();
          let paymentMethod = channel;
          if (channel === 'apple' || channel === 'ios' || channel === 'iap') {
            paymentMethod = 'apple_iap';
          }

          const expiresAt = parseDateTime(tokenRecord.expires_at);

          // 检查是否已经存在相同的凭证记录（按 order_no + appid + uid + payment_method 去重）
          const existing = await prisma.paymentTokenLog.findFirst({
            where: {
              order_no: orderNo,
              appid,
              uid,
              payment_method: paymentMethod || undefined,
            },
          });

          const data = {
            order_no: orderNo,
            appid,
            uid,
            payment_method: paymentMethod || 'unknown',
            token: cleanString(tokenRecord.token_value) || '',
            token_data: tokenData,
            expires_at: expiresAt,
          };

          if (existing) {
            await prisma.paymentTokenLog.update({
              where: { id: existing.id },
              data,
            });
          } else {
            await prisma.paymentTokenLog.create({
              data: {
                ...data,
                create_time:
                  parseDateTime(tokenRecord.created_at) ||
                  parseDateTime(logRecord.created_at) ||
                  new Date(),
              },
            });
          }

          return { ok: true, id, order_no: orderNo };
        } catch (error: any) {
          console.error(
            `  ✗ 同步支付凭证失败: id=${logRecord.id}`,
            error?.message || error
          );
          return {
            ok: false,
            id: Number(logRecord.id),
            error: error?.message || String(error),
          };
        }
      })
    );

    for (const result of results as any[]) {
      processed++;
      if (result.ok) {
        success++;
      } else if (result.skipped) {
        skipped++;
      } else {
        failed++;
        if (result.id) {
          failedRecords.push({
            id: result.id,
            error: result.error || 'unknown',
          });
        }
      }
    }

    console.log(
      `凭证批次 ${batchNum} 完成: 成功=${success}, 失败=${failed}, 跳过=${skipped}, 总计=${processed}/${total}`
    );
  }

  console.log('\n支付凭证日志同步完成！');
  console.log(`总计: ${processed}`);
  console.log(`成功: ${success}`);
  console.log(`失败: ${failed}`);
  console.log(`跳过: ${skipped}`);

  if (failedRecords.length > 0) {
    console.log('\n支付凭证同步失败的记录列表（最多 10 条）:');
    console.log('ID\tError');
    const displayRecords = failedRecords.slice(0, 10);
    for (const record of displayRecords) {
      console.log(`${record.id}\t${record.error.substring(0, 50)}`);
    }
    if (failedRecords.length > 10) {
      console.log(`... 还有 ${failedRecords.length - 10} 条凭证记录同步失败`);
    }
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    // 可以通过命令行参数或环境变量配置同步选项
    const args = process.argv.slice(2);

    // 解析命令行参数
    const options: any = {};
    for (let i = 0; i < args.length; i += 2) {
      const key = args[i]?.replace('--', '');
      const value = args[i + 1];
      if (key && value) {
        if (key === 'appid') {
          options.appid = value.split(',').map((v: string) => v.trim());
        } else if (key === 'startDate' || key === 'endDate') {
          options[key] = value;
        } else if (key === 'batchSize' || key === 'limit') {
          options[key] = parseInt(value, 10);
        }
      }
    }

    // 先同步订单，再同步支付和支付凭证（因为都依赖订单）
    await syncOrders(options);
    await syncPayments(options);
    await syncPaymentTokenLogs(options);

    console.log('\n='.repeat(60));
    console.log('🎉 全部同步完成！');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('同步过程出错:', error);
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

export { syncOrders, syncPaymentTokenLogs, syncPayments };

/**
 * 从 v5synclog 里面找到 payment-success，failed 的记录，重新再跑一遍
 *
 * 使用方法：
 * 1. 确保已启动开发服务器：pnpm dev:jiantie
 * 2. 在 jobs 包下运行脚本：
 *    pnpm tsx packages/jobs/src/entry/v5sync/scripts/runfailedPayment.ts
 *
 * 可选环境变量：
 * - BASE_URL: API 基础 URL，默认为 http://localhost:3000
 * - LIMIT: 限制处理的记录数量，默认 100
 * - START_TIME: 开始时间（ISO 8601 格式），默认不限制
 * - END_TIME: 结束时间（ISO 8601 格式），默认不限制
 * - DRY_RUN: 如果设置为 true，只查询不执行，默认 false
 * - FORCE_RETRY: 如果设置为 true，强制重试即使订单已发货，默认 false（会自动跳过已发货订单）
 * - APPID: 限定 appid，可以是单个值（如 jiantie）或多个值（用逗号分隔，如 jiantie,maka）
 *
 * 示例：
 * # 处理最近 100 条失败的记录
 * pnpm tsx packages/jobs/src/entry/v5sync/scripts/runfailedPayment.ts
 *
 * # 只查询不执行（预览模式）
 * DRY_RUN=true pnpm tsx packages/jobs/src/entry/v5sync/scripts/runfailedPayment.ts
 *
 * # 处理指定时间范围内的失败记录
 * START_TIME=2024-01-01T00:00:00Z END_TIME=2024-01-31T23:59:59Z pnpm tsx packages/jobs/src/entry/v5sync/scripts/runfailedPayment.ts
 *
 * # 强制重试（即使订单已发货）
 * FORCE_RETRY=true pnpm tsx packages/jobs/src/entry/v5sync/scripts/runfailedPayment.ts
 *
 * # 限定 appid（单个）
 * APPID=jiantie pnpm tsx packages/jobs/src/entry/v5sync/scripts/runfailedPayment.ts
 *
 * # 限定 appid（多个，用逗号分隔）
 * APPID=jiantie,maka pnpm tsx packages/jobs/src/entry/v5sync/scripts/runfailedPayment.ts
 */

import dotenv from 'dotenv';
import {
  closeAllConnections,
  getPrisma,
} from '../../../service/db-connections';

// 加载环境变量
dotenv.config({ path: '.env.local' });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : 100;
const DRY_RUN = process.env.DRY_RUN === 'true';
const FORCE_RETRY = process.env.FORCE_RETRY === 'true'; // 强制重试，即使已发货
const APPID_FILTER = process.env.APPID
  ? process.env.APPID.split(',')
      .map(id => id.trim())
      .filter(Boolean)
  : undefined; // 限定 appid，可以是单个或多个（逗号分隔）
const START_TIME = process.env.START_TIME
  ? new Date(process.env.START_TIME)
  : undefined;
const END_TIME = process.env.END_TIME
  ? new Date(process.env.END_TIME)
  : undefined;

// 获取数据库连接
const prisma = getPrisma();

interface PaymentSuccessRequest {
  order_no: string;
  appid: string;
  uid: number;
  payment_method: string;
  amount: number;
  currency?: string;
  payment_type?: string;
  transaction_id?: string;
  payment_status?: string;
  paid_at?: string;
  callback_type?: string;
  callback_raw?: any;
  callback_parsed?: any;
  receipt_data?: string;
  original_transaction_id?: string;
  product_id?: string;
  extra?: Record<string, any>;
}

/**
 * 检查订单是否已经支付并已发货
 */
async function checkOrderStatus(orderNo: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { order_no: orderNo },
      include: {
        shippingLogs: {
          where: {
            status: 'success',
          },
          orderBy: {
            create_time: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!order) {
      return {
        exists: false,
        isPaid: false,
        hasShipped: false,
      };
    }

    const hasShipped = order.shippingLogs.length > 0;

    return {
      exists: true,
      isPaid: order.order_status === 'paid',
      hasShipped,
      orderStatus: order.order_status,
      shippingLogCount: order.shippingLogs.length,
    };
  } catch (error: any) {
    console.error(`   ⚠️  检查订单状态失败: ${error?.message || error}`);
    return {
      exists: false,
      isPaid: false,
      hasShipped: false,
      error: error?.message || String(error),
    };
  }
}

/**
 * 重新调用 payment-success API
 */
async function retryPaymentSuccess(
  requestData: PaymentSuccessRequest,
  logId: string
) {
  console.log(`\n🔄 重试记录 ID: ${logId}`);
  console.log(`   订单号: ${requestData.order_no}`);
  console.log(`   用户ID: ${requestData.uid}`);
  console.log(`   支付方式: ${requestData.payment_method}`);

  // 检查订单状态，避免重复发货（除非强制重试）
  if (!FORCE_RETRY) {
    const orderStatus = await checkOrderStatus(requestData.order_no);

    if (orderStatus.exists) {
      if (orderStatus.isPaid && orderStatus.hasShipped) {
        console.log(`   ⚠️  订单已支付且已发货，跳过重试以避免重复发货`);
        console.log(`      订单状态: ${orderStatus.orderStatus}`);
        console.log(`      成功发货记录数: ${orderStatus.shippingLogCount}`);
        console.log(`      💡 如需强制重试，请设置 FORCE_RETRY=true`);
        return {
          success: true,
          skipped: true,
          reason: '订单已支付且已发货',
        };
      } else if (orderStatus.isPaid && !orderStatus.hasShipped) {
        console.log(`   ℹ️  订单已支付但未发货，继续重试以完成发货`);
      } else if (!orderStatus.isPaid) {
        console.log(`   ℹ️  订单未支付，继续重试`);
      }
    } else {
      console.log(`   ℹ️  订单不存在或查询失败，继续重试`);
    }
  } else {
    console.log(`   ⚠️  [强制重试模式] 将忽略订单状态检查`);
  }

  if (DRY_RUN) {
    console.log('   [DRY_RUN] 跳过实际调用');
    return { success: true, skipped: true };
  }

  try {
    const response = await fetch(`${BASE_URL}/api/v5sync/payment-success`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    const text = await response.text();
    let result: any;

    try {
      result = JSON.parse(text);
    } catch {
      console.error(
        `   ❌ 响应不是合法 JSON，原始文本：${text.substring(0, 200)}`
      );
      return {
        success: false,
        error: '解析响应 JSON 失败',
        httpStatus: response.status,
      };
    }

    if (result.success) {
      console.log(`   ✅ 重试成功`);
      if (result.data) {
        console.log(`      订单状态: ${result.data.order_status}`);
        console.log(`      支付ID: ${result.data.payment_id}`);
        if (result.data.shipment_error) {
          console.log(`      ⚠️  发货错误: ${result.data.shipment_error}`);
        }
      }
    } else {
      console.log(
        `   ⚠️  重试失败: ${result.error || result.message || '未知错误'} ${JSON.stringify(result)}`
      );
    }

    return {
      success: result.success || false,
      result,
      httpStatus: response.status,
    };
  } catch (error: any) {
    console.error(`   ❌ 调用 API 失败: ${error?.message || error}`);
    return {
      success: false,
      error: error?.message || String(error),
    };
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('='.repeat(60));
  console.log('🔄 重试失败的 payment-success 记录');
  console.log('='.repeat(60));
  console.log('\n配置:');
  console.log(`  API地址: ${BASE_URL}`);
  console.log(`  限制数量: ${LIMIT}`);
  console.log(`  预览模式: ${DRY_RUN ? '是（只查询不执行）' : '否'}`);
  console.log(
    `  强制重试: ${FORCE_RETRY ? '是（忽略已发货检查）' : '否（自动跳过已发货订单）'}`
  );
  if (APPID_FILTER && APPID_FILTER.length > 0) {
    console.log(`  AppID过滤: ${APPID_FILTER.join(', ')}`);
  }
  if (START_TIME) {
    console.log(`  开始时间: ${START_TIME.toISOString()}`);
  }
  if (END_TIME) {
    console.log(`  结束时间: ${END_TIME.toISOString()}`);
  }

  try {
    // 查询失败的 payment-success 记录
    const where: any = {
      api_path: 'payment-success',
      status: 'failed',
    };

    if (START_TIME || END_TIME) {
      where.create_time = {};
      if (START_TIME) {
        where.create_time.gte = START_TIME;
      }
      if (END_TIME) {
        where.create_time.lte = END_TIME;
      }
    }

    // 查询失败的 payment-success 记录（先查询，然后在内存中过滤 appid）
    let failedLogs = await prisma.v5SyncLog.findMany({
      where,
      orderBy: {
        create_time: 'desc',
      },
      take: APPID_FILTER ? LIMIT * 2 : LIMIT, // 如果过滤 appid，多查一些以便过滤后有足够数据
    });

    // 如果指定了 appid 过滤，在内存中过滤
    if (APPID_FILTER && APPID_FILTER.length > 0) {
      const appidSet = new Set(APPID_FILTER);
      failedLogs = failedLogs.filter(log => {
        if (!log.request_data) return false;
        try {
          const requestData = log.request_data as any;
          const appid = requestData?.appid;
          return appid && appidSet.has(appid);
        } catch {
          return false;
        }
      });
      // 限制最终数量
      failedLogs = failedLogs.slice(0, LIMIT);
    }

    console.log(`\n📊 找到 ${failedLogs.length} 条失败的记录`);

    if (failedLogs.length === 0) {
      console.log('✅ 没有需要重试的记录');
      return;
    }

    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    let alreadyShippedCount = 0;

    // 逐条处理
    for (let i = 0; i < failedLogs.length; i++) {
      const log = failedLogs[i];
      console.log(`\n[${i + 1}/${failedLogs.length}] 处理记录 ID: ${log.id}`);

      // 检查 request_data 是否存在
      if (!log.request_data) {
        console.log('   ⚠️  跳过：没有请求数据');
        skippedCount++;
        continue;
      }

      // 尝试提取请求数据
      let requestData: PaymentSuccessRequest;
      try {
        requestData = log.request_data as any as PaymentSuccessRequest;
      } catch (error: any) {
        console.log(
          `   ⚠️  跳过：无法解析请求数据 - ${error?.message || error}`
        );
        skippedCount++;
        continue;
      }

      // 验证必需字段
      if (
        !requestData.order_no ||
        !requestData.appid ||
        !requestData.uid ||
        !requestData.payment_method ||
        !requestData.amount
      ) {
        console.log('   ⚠️  跳过：请求数据缺少必需字段');
        console.log(`      order_no: ${requestData.order_no || '缺失'}`);
        console.log(`      appid: ${requestData.appid || '缺失'}`);
        console.log(`      uid: ${requestData.uid || '缺失'}`);
        console.log(
          `      payment_method: ${requestData.payment_method || '缺失'}`
        );
        console.log(`      amount: ${requestData.amount || '缺失'}`);
        skippedCount++;
        continue;
      }

      // 重试
      const result = await retryPaymentSuccess(requestData, log.id);

      if (result.skipped) {
        if (result.reason === '订单已支付且已发货') {
          alreadyShippedCount++;
        } else {
          skippedCount++;
        }
      } else if (result.success) {
        successCount++;
      } else {
        failedCount++;
      }

      // 避免请求过快，稍微延迟
      if (i < failedLogs.length - 1 && !DRY_RUN) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // 输出统计
    console.log('\n' + '='.repeat(60));
    console.log('📊 处理完成统计');
    console.log('='.repeat(60));
    console.log(`  总记录数: ${failedLogs.length}`);
    console.log(`  成功: ${successCount}`);
    console.log(`  失败: ${failedCount}`);
    console.log(`  已发货（跳过）: ${alreadyShippedCount}`);
    console.log(`  其他跳过: ${skippedCount}`);
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ 处理过程出错:', error);
    if (error instanceof Error) {
      console.error('错误信息:', error.message);
      console.error('错误堆栈:', error.stack);
    }
    process.exit(1);
  } finally {
    await closeAllConnections();
    process.exit(0);
  }
}

// 如果直接运行此文件，执行主函数
if (require.main === module) {
  main().catch(console.error);
}

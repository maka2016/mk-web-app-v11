/**
 * 测试购买作品的完整流程
 *
 * 使用方法：
 * 1. 确保已启动开发服务器：pnpm dev:jiantie
 * 2. 运行测试脚本：pnpm tsx packages/jiantie/scripts/test-purchase-work.ts
 *
 * 环境变量（可选）：
 * - BASE_URL: API 基础 URL，默认为 http://localhost:3000
 * - WORKS_ID: 要购买的作品ID，默认为 test_work_123456
 * - UID: 测试用户ID，默认为 123456
 * - APPID: 应用ID，默认为 jiantie
 */

const P_BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const WORKS_ID = process.env.WORKS_ID || 'test_work_123456';
const UID = process.env.UID ? parseInt(process.env.UID) : 123456;
const APPID = process.env.APPID || 'jiantie';

interface CreateOrderRequest {
  order_no: string;
  appid: string;
  uid: number;
  amount: number;
  currency?: string;
  order_status?: string;
  product_alias?: string;
  meta?: {
    device?: string;
    version?: string;
    bundle_id?: string;
    ip?: string;
    channel_id?: string;
    trace_metadata?: {
      works_id?: string;
      workId?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
  create_time?: string;
}

interface ShipOrderRequest {
  order_no: string;
  appid: string;
  uid: number;
  shipping_type: string;
  shipping_data?: Record<string, any>;
  status?: string;
  error_message?: string;
  shipped_at?: string;
  source?: string;
}

/**
 * 创建购买作品的订单
 */
async function createPurchaseWorkOrder(data: CreateOrderRequest) {
  console.log('\n📦 步骤 1: 创建购买作品订单');
  console.log('请求数据:', JSON.stringify(data, null, 2));

  const response = await fetch(`${BASE_URL}/api/v5sync/order-create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();
  console.log('响应状态:', response.status);
  console.log('响应数据:', JSON.stringify(result, null, 2));

  if (!result.success) {
    throw new Error(`创建订单失败: ${result.error}`);
  }

  return result.data;
}

/**
 * 发货（用于购买作品订单）
 */
async function shipOrder(data: ShipOrderRequest) {
  console.log('\n🚚 步骤 2: 发货（触发作品权限发放）');
  console.log('请求数据:', JSON.stringify(data, null, 2));

  const response = await fetch(`${P_BASE_URL}/api/v5sync/order-ship`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();
  console.log('响应状态:', response.status);
  console.log('响应数据:', JSON.stringify(result, null, 2));

  if (!result.success) {
    throw new Error(`发货失败: ${result.error}`);
  }

  return result.data;
}

/**
 * 主测试函数
 */
async function testPurchaseWork() {
  console.log('='.repeat(60));
  console.log('🧪 测试购买作品完整流程');
  console.log('='.repeat(60));
  console.log('\n测试配置:');
  console.log(`  API地址: ${BASE_URL}`);
  console.log(`  作品ID: ${WORKS_ID}`);
  console.log(`  用户ID: ${UID}`);
  console.log(`  应用ID: ${APPID}`);

  // 生成唯一的订单号
  const orderNo = `PURCHASE_${Date.now()}`;

  try {
    // 步骤 1: 创建购买作品的订单
    const orderData: CreateOrderRequest = {
      order_no: orderNo,
      appid: APPID,
      uid: UID,
      amount: 9900, // 99.00 元（单位：分），请根据实际商品价格调整
      currency: 'CNY',
      order_status: 'created',
      product_alias: 'validWork', // 购买作品专用商品别名
      meta: {
        device: 'web',
        version: '1.0.0',
        bundle_id: 'com.example.app',
        channel_id: 'test_channel',
        // 购买作品必须在 trace_metadata 中包含 works_id 或 workId
        trace_metadata: {
          works_id: WORKS_ID, // 或使用 workId
          // 其他追踪信息（可选）
          forwardPageName: 'works_detail',
          refPageType: 'works',
          refPageId: 'page_123',
        },
      },
    };

    const orderResult = await createPurchaseWorkOrder(orderData);
    console.log('✅ 订单创建成功:', orderResult.order_no);

    // 等待一小段时间，确保订单已写入数据库
    await new Promise(resolve => setTimeout(resolve, 500));

    // 步骤 2: 发货（触发作品权限发放）
    const shipData: ShipOrderRequest = {
      order_no: orderNo,
      appid: APPID,
      uid: UID,
      shipping_type: 'apple_iap', // 或 'wechat', 'alipay' 等
      shipping_data: {
        transaction_id: `txn_${Date.now()}`,
        receipt_data: 'test_receipt_data',
        product_id: 'com.example.product',
      },
      status: 'success',
      shipped_at: new Date().toISOString(),
      source: 'test_script',
    };

    const shipResult = await shipOrder(shipData);
    console.log('✅ 发货成功:', shipResult.id);

    console.log('\n' + '='.repeat(60));
    console.log('🎉 测试完成！');
    console.log('='.repeat(60));
    console.log('\n订单信息:');
    console.log(`  订单号: ${orderResult.order_no}`);
    console.log(`  用户ID: ${orderResult.uid}`);
    console.log(`  金额: ${orderResult.amount / 100} 元`);
    console.log(`  商品别名: validWork`);
    console.log(`  作品ID: ${WORKS_ID}`);
    console.log('\n发货信息:');
    console.log(`  发货ID: ${shipResult.id}`);
    console.log(`  发货类型: ${shipResult.shipping_type}`);
    console.log(`  发货状态: ${shipResult.status}`);
    if (shipResult.error_message) {
      console.log(`  ⚠️  发货错误: ${shipResult.error_message}`);
    }
    console.log('\n📝 说明:');
    console.log('  1. 订单创建后，作品权限将在发货时自动发放');
    console.log('  2. 作品权限有效期为 31 天（由商品配置决定）');
    console.log('  3. 可以通过 /api/v5sync/user-resources/{appid}/{uid}/work/{worksId}/purchased 查询购买状态');
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    if (error instanceof Error) {
      console.error('错误信息:', error.message);
    }
    process.exit(1);
  }
}

// 运行测试
testPurchaseWork().catch(console.error);

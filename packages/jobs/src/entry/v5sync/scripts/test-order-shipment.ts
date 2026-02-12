/**
 * 测试订单创建到发货的完整流程
 *
 * 使用方法：
 * 1. 确保已启动开发服务器：pnpm dev:jiantie
 * 2. 运行测试脚本：pnpm tsx packages/jiantie/scripts/test-order-shipment.ts
 *
 * 或者使用 node 运行（需要先编译）：
 * pnpm tsx packages/jiantie/scripts/test-order-shipment.ts
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

interface CreateOrderRequest {
  order_no: string;
  appid: string;
  uid: number;
  amount: number;
  currency?: string;
  order_status?: string;

  product_id?: string;

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
 * 创建订单
 */
async function createOrder(data: CreateOrderRequest) {
  console.log('\n📦 步骤 1: 创建订单');
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
 * 发货
 */
async function shipOrder(data: ShipOrderRequest) {
  console.log('\n🚚 步骤 2: 发货');
  console.log('请求数据:', JSON.stringify(data, null, 2));

  const response = await fetch(`${BASE_URL}/api/v5sync/order-ship`, {
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
async function testOrderShipment() {
  console.log('='.repeat(60));
  console.log('🧪 测试订单创建到发货流程');
  console.log('='.repeat(60));

  // 生成唯一的订单号
  const orderNo = `TEST_${Date.now()}`;
  const uid = 123456; // 测试用户ID，请根据实际情况修改
  const appid = 'jiantie'; // 或 'maka'

  try {
    // 步骤 1: 创建订单
    const orderData: CreateOrderRequest = {
      order_no: orderNo,
      appid: appid,
      uid: uid,
      amount: 4900, // 99.00 元（单位：分）
      currency: 'CNY',
      order_status: 'created',
      product_alias: 'jiantie.work.template.p90d.once.29.mainland', // 商品别名，请确保数据库中存在该商品
      meta: {
        trace_metadata: {
          works_id: 'work_123456', // 或使用 workId
        },
      },
    };

    const orderResult = await createOrder(orderData);
    console.log('✅ 订单创建成功:', orderResult.order_no);

    // 等待一小段时间，确保订单已写入数据库
    await new Promise(resolve => setTimeout(resolve, 500));

    // 步骤 2: 发货
    const shipData: ShipOrderRequest = {
      order_no: orderNo,
      appid: appid,
      uid: uid,
      shipping_type: 'v5api', // 或 'wechat', 'alipay' 等
      shipping_data: {
        transaction_id: `txn_${Date.now()}`,
        receipt_data: 'test_receipt_data',
        product_id: 'com.example.product',
      },
      status: 'success',
      shipped_at: new Date().toISOString(),
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
    console.log('\n发货信息:');
    console.log(`  发货ID: ${shipResult.id}`);
    console.log(`  发货类型: ${shipResult.shipping_type}`);
    console.log(`  发货状态: ${shipResult.status}`);
    if (shipResult.shipment_error) {
      console.log(`  ⚠️  发货错误: ${shipResult.shipment_error}`);
    }
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    if (error instanceof Error) {
      console.error('错误信息:', error.message);
    }
    process.exit(1);
  }
}

// 运行测试
testOrderShipment().catch(console.error);

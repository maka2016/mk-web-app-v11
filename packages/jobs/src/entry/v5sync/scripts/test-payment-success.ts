/**
 * 测试支付成功回调 + 自动发货流程
 *
 * 使用方法：
 * 1. 确保已启动开发服务器：pnpm dev:jiantie
 * 2. 在 jobs 包下运行测试脚本，例如：
 *    pnpm tsx packages/jobs/src/entry/v5sync/scripts/test-payment-success.ts
 *
 * 可选环境变量：
 * - BASE_URL: API 基础 URL，默认为 http://localhost:3000
 * - UID: 测试用户ID，默认为 123456
 * - APPID: 应用ID，默认为 jiantie
 * - PRODUCT_ALIAS: 商品别名（需要在 v11 数据库中存在），默认 jiantie.work.template.p90d.once.29.mainland
 * - PAYMENT_METHOD: 支付方式，可选 wechat/alipay/apple_iap，默认为 wechat
 *
 * 测试示例：
 * 
 * # 测试微信支付（默认）
 * pnpm tsx packages/jobs/src/entry/v5sync/scripts/test-payment-success.ts
 * 
 * # 测试支付宝支付
 * PAYMENT_METHOD=alipay pnpm tsx packages/jobs/src/entry/v5sync/scripts/test-payment-success.ts
 * 
 * # 测试苹果 IAP 支付（包含凭证验证）
 * PAYMENT_METHOD=apple_iap pnpm tsx packages/jobs/src/entry/v5sync/scripts/test-payment-success.ts
 * 
 * # 测试苹果支付 + 自定义用户
 * PAYMENT_METHOD=apple_iap UID=789 pnpm tsx packages/jobs/src/entry/v5sync/scripts/test-payment-success.ts
 */

let BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const UID = process.env.UID ? parseInt(process.env.UID, 10) : 123456;
const APPID = process.env.APPID || 'jiantie';
const PRODUCT_ALIAS =
  process.env.PRODUCT_ALIAS || 'jiantie.work.template.p90d.once.29.mainland';
const PAYMENT_METHOD = process.env.PAYMENT_METHOD || 'wechat'; // wechat/alipay/apple_iap

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
  extra?: Record<string, any>;
  // 苹果 IAP 专用字段
  receipt_data?: string; // Base64 编码的苹果支付凭证
  original_transaction_id?: string; // 原始交易ID（用于续订等场景）
  product_id?: string; // 苹果商品ID
}

/**
 * 创建订单
 */
async function createOrder(data: CreateOrderRequest) {
  console.log('\n📦 步骤 1: 创建测试订单');
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

  return result.data as {
    order_no: string;
    uid: number;
    appid: string;
    amount: number;
    order_status: string;
  };
}

/**
 * 支付成功回调（含自动发货）
 */
async function paymentSuccess(data: PaymentSuccessRequest) {
  console.log('\n💰 步骤 2: 调用支付成功回调（/api/v5sync/payment-success）');
  console.log('请求数据:', JSON.stringify(data, null, 2));

  const response = await fetch(`${BASE_URL}/api/v5sync/payment-success`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const text = await response.text();

  console.log('响应状态:', response.status);
  console.log('响应原始文本:', text);

  let result: any;
  try {
    result = JSON.parse(text);
  } catch {
    console.error('❌ 响应不是合法 JSON，原始文本：', text);
    throw new Error('解析响应 JSON 失败');
  }

  console.log('解析后的响应数据:', JSON.stringify(result, null, 2));

  if (!result.success) {
    console.warn('⚠️ 接口返回 success=false，说明发货可能失败或有其他错误');
  }

  return result;
}

/**
 * 主测试函数
 */
async function testPaymentSuccess() {
  console.log('='.repeat(60));
  console.log('🧪 测试支付成功回调 + 自动发货流程');
  console.log('='.repeat(60));
  console.log('\n测试配置:');
  console.log(`  API地址: ${BASE_URL}`);
  console.log(`  用户ID: ${UID}`);
  console.log(`  应用ID: ${APPID}`);
  console.log(`  商品别名: ${PRODUCT_ALIAS}`);
  console.log(`  支付方式: ${PAYMENT_METHOD}`);

  // 生成唯一的订单号 & 交易号
  const orderNo = `PAY_${Date.now()}`;
  const transactionId = `txn_${Date.now()}`;

  try {
    // 步骤 1: 创建订单（状态为 created）
    const orderData: CreateOrderRequest = {
      order_no: orderNo,
      appid: APPID,
      uid: UID,
      amount: 9900, // 99.00 元（单位：分），可按需调整
      currency: 'CNY',
      order_status: 'created',
      product_alias: PRODUCT_ALIAS,
      meta: {
        device: 'web',
        version: '1.0.0',
        bundle_id: 'com.example.app',
        channel_id: 'test_channel',
        trace_metadata: {
          works_id: 'work_123456', // 如果是作品相关发货，可以按需改成真实 works_id
        },
      },
    };

    const orderResult = await createOrder(orderData);
    console.log('✅ 订单创建成功:', orderResult.order_no);

    // 等待一小段时间，确保订单已写入数据库
    await new Promise(resolve => setTimeout(resolve, 500));

    // 步骤 2: 模拟支付成功回调
    const nowIso = new Date().toISOString();
    const paymentData: PaymentSuccessRequest = {
      order_no: orderNo,
      appid: APPID,
      uid: UID,
      payment_method: PAYMENT_METHOD,
      amount: orderResult.amount,
      currency: 'CNY',
      payment_type: 'normal',
      transaction_id: transactionId,
      payment_status: 'success',
      paid_at: nowIso,
      callback_type: PAYMENT_METHOD,
      extra: {
        from: 'test-payment-success-script',
      },
    };

    // 根据支付方式设置不同的回调数据
    if (PAYMENT_METHOD === 'apple_iap') {
      // 苹果 IAP 支付场景
      const originalTransactionId = `original_${Date.now()}`;
      const appleProductId = PRODUCT_ALIAS.replace(/\./g, '_'); // 转换为苹果商品ID格式
      
      // 模拟苹果支付凭证（实际应该是 Base64 编码的 receipt）
      const mockReceipt = {
        receipt: {
          receipt_type: 'Production',
          bundle_id: orderData.meta?.bundle_id || 'com.example.app',
          application_version: orderData.meta?.version || '1.0.0',
          in_app: [
            {
              quantity: '1',
              product_id: appleProductId,
              transaction_id: transactionId,
              original_transaction_id: originalTransactionId,
              purchase_date: nowIso,
              purchase_date_ms: Date.now().toString(),
              original_purchase_date: nowIso,
              original_purchase_date_ms: Date.now().toString(),
            },
          ],
        },
        status: 0, // 0 表示验证成功
      };
      
      paymentData.receipt_data = Buffer.from(JSON.stringify(mockReceipt)).toString('base64');
      paymentData.original_transaction_id = originalTransactionId;
      paymentData.product_id = appleProductId;
      paymentData.callback_raw = mockReceipt;
      paymentData.callback_parsed = mockReceipt.receipt.in_app[0];
      
      console.log('\n🍎 使用苹果 IAP 支付凭证:');
      console.log(`  商品ID: ${appleProductId}`);
      console.log(`  交易ID: ${transactionId}`);
      console.log(`  原始交易ID: ${originalTransactionId}`);
      console.log(`  凭证长度: ${paymentData.receipt_data.length} 字符`);
    } else if (PAYMENT_METHOD === 'wechat') {
      // 微信支付场景
      paymentData.callback_raw = {
        out_trade_no: orderNo,
        transaction_id: transactionId,
        total_fee: orderResult.amount,
        time_end: nowIso,
      };
      paymentData.callback_parsed = {
        out_trade_no: orderNo,
        transaction_id: transactionId,
        total_fee: orderResult.amount,
      };
    } else if (PAYMENT_METHOD === 'alipay') {
      // 支付宝支付场景
      paymentData.callback_raw = {
        out_trade_no: orderNo,
        trade_no: transactionId,
        total_amount: (orderResult.amount / 100).toFixed(2), // 支付宝金额单位是元
        gmt_payment: nowIso,
      };
      paymentData.callback_parsed = {
        out_trade_no: orderNo,
        trade_no: transactionId,
        total_amount: (orderResult.amount / 100).toFixed(2),
      };
    }

    const payResult = await paymentSuccess(paymentData);

    console.log('\n' + '='.repeat(60));
    console.log('🎉 测试完成！');
    console.log('='.repeat(60));
    console.log('\n订单信息:');
    console.log(`  订单号: ${orderResult.order_no}`);
    console.log(`  用户ID: ${orderResult.uid}`);
    console.log(`  金额: ${orderResult.amount / 100} 元`);
    console.log(`  初始状态: ${orderResult.order_status}`);
    console.log('\n支付信息:');
    console.log(`  支付方式: ${PAYMENT_METHOD}`);
    console.log(`  交易ID: ${transactionId}`);
    if (PAYMENT_METHOD === 'apple_iap' && paymentData.original_transaction_id) {
      console.log(`  原始交易ID: ${paymentData.original_transaction_id}`);
      console.log(`  苹果商品ID: ${paymentData.product_id}`);
    }
    console.log('\n支付回调结果:');
    console.log(`  接口 success: ${payResult.success}`);
    console.log(`  message: ${payResult.message}`);
    if (payResult.data) {
      console.log(`  回写订单状态: ${payResult.data.order_status}`);
      console.log(`  payment_id: ${payResult.data.payment_id}`);
      console.log(`  payment_status: ${payResult.data.payment_status}`);
      console.log(`  callback_log_id: ${payResult.data.callback_log_id}`);
      console.log(`  shipping_log_id: ${payResult.data.shipping_log_id}`);
      if (payResult.data.shipment_error) {
        console.log(`  ⚠️  发货错误: ${payResult.data.shipment_error}`);
      }
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
testPaymentSuccess().catch(console.error);

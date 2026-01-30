// 查询ad_conversion_event_entity中event为COMPLETE_ORDER，report_status为pending的记录，
// 可能存在漏归因，看看能不能找到对应的success的register、login事件。把对应的event回传补上并更新状态
//
// 使用方式：
//   pnpm tsx packages/jobs/src/entry/sync_mini_order.ts

import { reportTencentAdAction } from '@mk/jiantie/services';
import { initPrisma } from '@mk/jiantie/v11-database';
import dotenv from 'dotenv';

console.log('process.cwd()', process.cwd());
dotenv.config({ path: 'src/jiantie/.env.local' });

const prisma = initPrisma({ connectionString: `${process.env.DATABASE_URL}` });

/**
 * 同步待上报的 COMPLETE_ORDER 事件
 * 查找同一用户下已成功上报的 register/login 事件，复用归因信息进行补报
 */
async function syncMiniOrder() {
  console.log('='.repeat(60));
  console.log('开始同步待上报的 COMPLETE_ORDER 事件');
  console.log('='.repeat(60));

  // 1. 查询所有 event='COMPLETE_ORDER' 且 report_status='pending' 的记录
  const pendingOrders = await prisma.adConversionEventEntity.findMany({
    where: {
      event: 'COMPLETE_ORDER',
      report_status: 'pending',
    },
    orderBy: {
      create_time: 'desc',
    },
  });

  console.log(`找到 ${pendingOrders.length} 条待上报的 COMPLETE_ORDER 事件`);

  if (pendingOrders.length === 0) {
    console.log('没有待处理的事件，退出');
    return;
  }

  let successCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  // 2. 对每条记录进行处理
  for (const orderEvent of pendingOrders) {
    try {
      console.log(`\n处理事件 ID: ${orderEvent.id}, UID: ${orderEvent.uid}`);

      // 3. 查找同一用户下已成功上报的 register 或 login 事件
      const registerEvent = await prisma.adConversionEventEntity.findFirst({
        where: {
          uid: orderEvent.uid,
          event: {
            in: ['register', 'login'],
          },
          platform: 'gdt',
          report_status: 'success',
          ad_event_id: { not: null },
        },
        orderBy: { create_time: 'desc' }, // 取最近的归因成功事件
      });

      if (!registerEvent || !registerEvent.ad_event_id) {
        console.log(`  ⚠️  未找到对应的归因成功的 register/login 事件，跳过`);
        skippedCount++;
        continue;
      }

      console.log(
        `  ✓ 找到归因事件: ${registerEvent.event} (ID: ${registerEvent.id})`
      );

      // 4. 从 register event 的 data 中获取 openId 和 unionId
      const registerData = registerEvent.data as Record<string, any>;
      const openId =
        registerData.openId ??
        registerData.openid ??
        registerData.wechat_openid ??
        registerData.wechatOpenId;
      const unionId =
        registerData.unionId ??
        registerData.unionid ??
        registerData.wechat_unionid ??
        registerData.wechatUnionId;

      if (!openId) {
        console.log(`  ⚠️  register 事件中缺少 openId，跳过`);
        await prisma.adConversionEventEntity.update({
          where: { id: orderEvent.id },
          data: {
            platform: 'gdt',
            ad_event_id: registerEvent.ad_event_id,
            report_status: 'failed',
            report_result: 'register 事件中缺少 openId',
          },
        });
        failedCount++;
        continue;
      }

      // 5. 获取广告点击回调记录
      const adClick = await prisma.adClickCallbackEntity.findUnique({
        where: { id: registerEvent.ad_event_id },
      });

      if (!adClick || !adClick.callback) {
        console.log(`  ⚠️  未找到对应的广告点击回调记录，跳过`);
        await prisma.adConversionEventEntity.update({
          where: { id: orderEvent.id },
          data: {
            platform: 'gdt',
            ad_event_id: registerEvent.ad_event_id,
            report_status: 'failed',
            report_result: '未找到对应的广告点击回调记录',
          },
        });
        failedCount++;
        continue;
      }

      // 6. 获取订单事件的数据
      const orderData = orderEvent.data as Record<string, any>;

      // 7. 上报订单事件到腾讯广告
      const reportResult = await reportTencentAdAction({
        callbackUrl: adClick.callback,
        accessToken: 'f54d2c22accaeabb610ee2760e35987e',
        actions: [
          {
            action_time: Math.floor(orderEvent.create_time.getTime() / 1000),
            action_type: 'COMPLETE_ORDER',
            action_param: {
              ...orderData.params,
            },
            user_id: {
              wechat_openid: openId,
              wechat_unionid: unionId,
              wechat_app_id: 'wxbcd47d4167a10e41',
            },
          },
        ],
      });

      console.log(`  上报结果: ${reportResult.ok ? '成功' : '失败'}`);

      // 8. 更新订单事件的上报状态
      await prisma.adConversionEventEntity.update({
        where: { id: orderEvent.id },
        data: {
          platform: 'gdt',
          ad_event_id: registerEvent.ad_event_id,
          report_status: reportResult.ok ? 'success' : 'failed',
          report_result: JSON.stringify(reportResult.data ?? null),
        },
      });

      if (reportResult.ok) {
        successCount++;
      } else {
        failedCount++;
      }
    } catch (error) {
      console.error(`  ✗ 处理事件失败:`, {
        eventId: orderEvent.id,
        uid: orderEvent.uid,
        error: error instanceof Error ? error.message : String(error),
      });
      failedCount++;

      // 更新为失败状态
      try {
        await prisma.adConversionEventEntity.update({
          where: { id: orderEvent.id },
          data: {
            platform: 'gdt',
            report_status: 'failed',
            report_result:
              error instanceof Error ? error.message : 'unknown sync error',
          },
        });
      } catch (updateError) {
        console.error('  更新失败状态时出错:', updateError);
      }
    }
  }

  // 9. 输出统计信息
  console.log('\n' + '='.repeat(60));
  console.log('同步完成');
  console.log('='.repeat(60));
  console.log(`总计: ${pendingOrders.length} 条`);
  console.log(`成功: ${successCount} 条`);
  console.log(`失败: ${failedCount} 条`);
  console.log(`跳过: ${skippedCount} 条（未找到归因事件）`);
}

async function main() {
  try {
    await syncMiniOrder();
    process.exit(0);
  } catch (error) {
    console.error('执行失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { syncMiniOrder };

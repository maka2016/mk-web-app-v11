// 脚本，处理过去3天的数据，每7200秒（2小时）为一个执行周期
import dotenv from 'dotenv';
import { dealSls } from '../service/dealSls';

// 加载环境变量
dotenv.config({ path: '.env.local' });
/**
 * 主函数：处理过去3天的数据，每7200秒为一个周期
 */
async function main() {
  const now = Math.floor(Date.now() / 1000); // 当前时间戳（秒）
  const threeDaysAgo = now - 3 * 24 * 3600; // 3天前的时间戳（秒）
  const periodSeconds = 7200; // 每个周期7200秒（2小时）

  // 计算周期数
  const totalSeconds = now - threeDaysAgo;
  const periodCount = Math.ceil(totalSeconds / periodSeconds);

  console.log(`开始处理过去3天的数据`);
  console.log(`起始时间: ${new Date(threeDaysAgo * 1000).toISOString()}`);
  console.log(`结束时间: ${new Date(now * 1000).toISOString()}`);
  console.log(
    `总时长: ${totalSeconds} 秒 (${Math.floor(totalSeconds / 3600)} 小时)`
  );
  console.log(`周期数: ${periodCount} 个周期 (每周期 ${periodSeconds} 秒)`);
  console.log('---');

  let successCount = 0;
  let failCount = 0;

  // 按周期依次处理
  for (let i = 0; i < periodCount; i++) {
    const from = threeDaysAgo + i * periodSeconds;
    const to = Math.min(threeDaysAgo + (i + 1) * periodSeconds, now);

    console.log(
      `[${i + 1}/${periodCount}] 处理周期: ${new Date(from * 1000).toISOString()} 到 ${new Date(to * 1000).toISOString()}`
    );

    try {
      await dealSls(from, to);
      successCount++;
      console.log(`[${i + 1}/${periodCount}] 周期处理完成\n`);
    } catch (error: any) {
      failCount++;
      console.error(`[${i + 1}/${periodCount}] 周期处理失败:`, error.message);
      console.error(`[${i + 1}/${periodCount}] 继续处理下一个周期\n`);
      // 继续处理下一个周期，不中断整个流程
    }
  }

  console.log('---');
  console.log(`所有周期处理完成`);
  console.log(`成功: ${successCount} 个周期`);
  console.log(`失败: ${failCount} 个周期`);

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// 执行主函数
main();

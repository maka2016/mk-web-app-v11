// 脚本，统计当天（东八区）的工作数据
import dotenv from 'dotenv';
import { dealWorkHistoryStat } from '../service/dealWorkHistoryStat';
import { statDailyWork } from '../service/dealWorkStat';

// 加载环境变量
dotenv.config({ path: '.env.local' });
/**
 * 主函数：统计当天（东八区）的工作数据
 */
async function main() {
  // 获取当前东八区日期（YYYY-MM-DD格式）
  const now = new Date();
  // 转换为东八区时间
  const beijingTime = new Date(
    now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' })
  );
  const year = beijingTime.getFullYear();
  const month = String(beijingTime.getMonth() + 1).padStart(2, '0');
  const day = String(beijingTime.getDate()).padStart(2, '0');
  const date = `${year}-${month}-${day}`;

  // 如果命令行传入了日期参数，使用传入的日期
  const args = process.argv.slice(2);
  const targetDate = args.length > 0 ? args[0] : date;

  // 验证日期格式
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(targetDate)) {
    console.error('错误：日期格式不正确，应为 YYYY-MM-DD 格式');
    console.log('用法: ts-node src/entry/statDailyWork.ts [日期]');
    console.log('示例: ts-node src/entry/statDailyWork.ts 2024-01-15');
    console.log('示例: ts-node src/entry/statDailyWork.ts  # 使用当天日期');
    process.exit(1);
  }

  console.log(`开始统计日期 ${targetDate} (东八区) 的工作数据`);

  try {
    //统计最近3天
    const threeDaysAgo = new Date(targetDate);
    for (let i = 1; i < 3; i++) {
      const date = new Date(threeDaysAgo);
      date.setDate(date.getDate() + i);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      await statDailyWork(dateStr);
    }

    // await refreshStatWork(targetDate);

    await dealWorkHistoryStat(targetDate);
    console.log('脚本执行完成');
    process.exit(0);
  } catch (error: any) {
    console.error('脚本执行失败:', error.message);
    process.exit(1);
  }
}

// 执行主函数
main();

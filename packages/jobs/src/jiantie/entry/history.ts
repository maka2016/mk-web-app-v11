// 历史数据统计：跑过去90天的模板数据

import { syncOrderData } from './sync_order_data';

/**
 * 格式化日期为 YYYY-MM-DD 格式
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 主函数：统计过去90天的模板数据
 */
async function main() {
  try {
    const days = 120;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log(`开始统计过去 ${days} 天的模板数据...\n`);

    for (let i = 0; i < days; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - i);
      const dateStr = formatDate(targetDate);

      console.log(`\n${'='.repeat(60)}`);
      console.log(`处理日期 ${i + 1}/${days}: ${dateStr}`);
      console.log(`${'='.repeat(60)}`);

      try {
        // await statTemplateDaily(dateStr);
        console.log(`✓ 日期 ${dateStr} 统计完成\n`);
        await syncOrderData(dateStr);
      } catch (error) {
        console.error(`✗ 日期 ${dateStr} 统计失败:`, error);
        // 继续处理下一天，不中断整个流程
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`过去 ${days} 天的数据统计全部完成！`);
    console.log(`${'='.repeat(60)}`);

    process.exit(0);
  } catch (error) {
    console.error('执行失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件，执行主函数
if (require.main === module) {
  main();
}

export { main as runHistoryStats };

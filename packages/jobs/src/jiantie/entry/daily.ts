// 每日自动运行任务：统计今天和昨天的 channel 和 template 数据

import { syncTemplateSortMetrics } from '../../service/cms/template';
import { statChannelDaily } from './dws_channel_data';
import { statMixSearchDaily } from './dws_jiantie_mix_search_res';
import { statTemplateDaily } from './dws_template_data';
import { statWorksDaily } from './dws_work_stat_data';
import { syncOrderData } from './sync_order_data';
import { syncUserInfoByDate } from './sync_user_data';
import { washTemplateDesignerUid } from './washTemplateDesignerUid';
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
 * 获取昨天的日期
 */
function getYesterday(): Date {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday;
}

/**
 * 执行任务并处理错误
 */
async function executeTask(
  taskName: string,
  taskFn: () => Promise<void>
): Promise<void> {
  try {
    console.log(`\n--- ${taskName} ---`);
    await taskFn();
    console.log(`✓ ${taskName}完成`);
  } catch (error) {
    console.error(`✗ ${taskName}失败:`, error);
  }
}

/**
 * 主函数：运行今天和昨天的数据统计
 */
async function main() {
  try {
    const today = new Date();
    const yesterday = getYesterday();
    const todayStr = formatDate(today);
    const yesterdayStr = formatDate(yesterday);

    const beforeYesterday = new Date(yesterday);
    beforeYesterday.setDate(yesterday.getDate() - 1);
    const beforeYesterdayStr = formatDate(beforeYesterday);

    console.log('='.repeat(60));
    console.log('开始执行每日数据统计任务');
    console.log('='.repeat(60));
    console.log(`今天: ${todayStr}`);
    console.log(`昨天: ${yesterdayStr}`);
    console.log('');

    const dayConfigs = [
      {
        label: '前天',
        dateStr: beforeYesterdayStr,
      },
      {
        label: '昨天',
        dateStr: yesterdayStr,
      },
      {
        label: '今天',
        dateStr: todayStr,
      },
    ] as const;

    for (const { label, dateStr } of dayConfigs) {
      console.log('\n' + '='.repeat(60));
      console.log(`开始统计${label}的数据: ${dateStr}`);
      console.log('='.repeat(60));
      await executeTask(`统计${label}的频道数据`, () =>
        statChannelDaily(dateStr)
      );
      await executeTask(`同步${label}的用户数据`, () =>
        syncUserInfoByDate(new Date(dateStr))
      );
      await executeTask(`同步${label}的订单数据`, () => syncOrderData(dateStr));

      await executeTask(`统计${label}的模板数据`, () =>
        statTemplateDaily(dateStr)
      );
      await executeTask(`统计${label}的作品行为数据`, () =>
        statWorksDaily(dateStr)
      );

      //mix搜索
      await executeTask(`统计${label}的Mix搜索数据`, () =>
        statMixSearchDaily(dateStr)
      );
      // await executeTask(`统计${label}的搜索词数据`, () =>
      //   statSearchTermDaily(dateStr)
      // );
    }

    await executeTask('同步模板排序数据', () => syncTemplateSortMetrics());

    await executeTask('清洗模板设计师uid', () => washTemplateDesignerUid());

    console.log('\n' + '='.repeat(60));
    console.log('每日数据统计任务全部完成！');
    console.log('='.repeat(60));

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

export { main as runDailyStats };

//脚本，处理传入秒数前至今数据，dealSls
import dotenv from 'dotenv';
import { dealSls } from '../service/dealSls';

// 加载环境变量
dotenv.config({ path: '.env.local' });

/**
 * 主函数：处理从指定秒数前到现在的 SLS 日志数据
 */
async function main() {
  // 从命令行参数获取秒数
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('错误：请传入秒数参数');
    console.log('用法: ts-node src/entry/minJob.ts <秒数>');
    console.log('示例: ts-node src/entry/minJob.ts 3600  # 处理1小时前的数据');
    process.exit(1);
  }

  const secondsAgo = parseInt(args[0], 10);

  if (isNaN(secondsAgo) || secondsAgo <= 0) {
    console.error('错误：秒数必须是正整数');
    process.exit(1);
  }

  // 计算时间范围
  const now = Math.floor(Date.now() / 1000); // 当前时间戳（秒）
  const from = now - secondsAgo; // 指定秒数前的时间戳（秒）
  const to = now; // 当前时间戳（秒）

  console.log(
    `开始处理从 ${new Date(from * 1000).toISOString()} 到 ${new Date(to * 1000).toISOString()} 的数据`
  );
  console.log(
    `时间范围: ${secondsAgo} 秒 (约 ${Math.floor(secondsAgo / 60)} 分钟)`
  );

  try {
    // 调用 dealSls 处理数据
    await dealSls(from, to);
    console.log('脚本执行完成');
    process.exit(0);
  } catch (error: any) {
    console.error('脚本执行失败:', error.message);
    process.exit(1);
  }
}

// 执行主函数
main();

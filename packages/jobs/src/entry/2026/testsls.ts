// 简单的 SLS 查询测试脚本
// 用法示例：
//   pnpm run:job jiantie/2026/testsls 'appId: "jiantie" | SELECT * LIMIT 10'
//   pnpm run:job jiantie/2026/testsls 'appId: "jiantie" | SELECT * LIMIT 10' 1736160000 1736163600
//
// 说明：
// - 第一个参数为 SLS query 语句（可选，不传则使用 jiantie 的默认示例查询）
// - 第二个参数为开始时间 from（秒级时间戳，可选，默认最近 1 小时）
// - 第三个参数为结束时间 to（秒级时间戳，可选，默认当前时间）
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { queryV11SlsLogs, V11SlsLogRecord } from '../../utils/sls';

console.log('test', process.env.SLS_ENDPOINT);

/**
 * 将字符串转换为数字时间戳（秒）
 */
function parseTimestamp(input: string | undefined, fallback: number): number {
  if (!input) return fallback;
  const num = Number(input);
  if (Number.isNaN(num) || num <= 0) {
    return fallback;
  }
  return Math.floor(num);
}

/**
 * 打印部分日志内容，避免一次性输出过大
 */
function printSampleLogs(logs: V11SlsLogRecord[], limit = 5): void {
  const total = logs.length;
  const sample = logs.slice(0, limit);

  console.log(
    `\n本次查询共返回 ${total} 条日志，以下展示前 ${sample.length} 条：\n`
  );
  sample.forEach((item, index) => {
    console.log(`--- 第 ${index + 1} 条 ---`);
    console.log(JSON.stringify(item.raw, null, 2));
  });

  if (total > sample.length) {
    console.log(`\n... 其余 ${total - sample.length} 条已省略`);
  }
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const inputQuery = args[0];

    const nowSec = Math.floor(Date.now() / 1000);
    const defaultFrom = nowSec - 3600; // 默认最近 1 小时

    const from = parseTimestamp(args[1], defaultFrom);
    const to = parseTimestamp(args[2], nowSec);

    const query = inputQuery || 'appId: "jiantie" | SELECT * LIMIT 10';

    if (!inputQuery) {
      console.log(
        '未传入 query，使用默认示例：appId: "jiantie" | SELECT * LIMIT 10'
      );
      console.log(
        "你也可以通过：pnpm run:job jiantie/2026/testsls '<SLS 查询语句>' [from] [to] 来自定义查询"
      );
    }

    console.log('开始执行 SLS 测试查询：');
    console.log(`query: ${query}`);
    console.log(`from : ${from} (${new Date(from * 1000).toISOString()})`);
    console.log(`to   : ${to} (${new Date(to * 1000).toISOString()})`);

    const logs = await queryV11SlsLogs({
      query,
      from,
      to,
    });

    printSampleLogs(logs);
    process.exitCode = 0;
  } catch (error) {
    console.error('执行 SLS 测试查询失败：', error);
    process.exitCode = 1;
  }
}

// 如果直接运行此文件，执行主函数
if (require.main === module) {
  main();
}

export { main as runSlsTest };

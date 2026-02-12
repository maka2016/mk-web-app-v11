// 测试向量搜索脚本
// 功能：测试向量搜索的粗排和精排效果
// 使用 PostgreSQL pgvector 扩展进行向量相似度搜索

import dotenv from 'dotenv';
import { searchTemplates } from '../service/searchV1';

// 加载环境变量
dotenv.config({ path: '.env.local' });

/**
 * 主函数
 */
async function main() {
  console.time('searchTemplates');
  const result = await searchTemplates({
    query: '宝宝邀请',
    page_size: 100,
    page: 1,
    filter: {
      appid: 'jiantie',
    },
    // sort: 'bestseller', // 或 'latest' 或 'bestseller'
  });

  console.log(result?.templates?.[0]);
  console.log(result?.templates?.[1]);
  console.log(`找到 ${result.total} 个结果`);
  console.log(`当前页数: ${result.page}`);
  console.log(`总页数: ${result.total_pages}`);

  console.timeEnd('searchTemplates');
}

// 执行主函数
if (require.main === module) {
  main();
}

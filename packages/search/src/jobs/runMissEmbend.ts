// 复制 embedding 脚本
// 功能：
// 1. 寻找 embedding 为 null 的记录
// 2. 根据 template_id 找到有 embedding 数据的对应记录（同一个 template_id，不同 appid）
// 3. 复制 embedding 数据

import dotenv from 'dotenv';
import { Pool } from 'pg';

// 加载环境变量
dotenv.config({ path: '.env.local' });
dotenv.config();

/**
 * 主函数
 */
async function main() {
  try {
    // 检查环境变量
    if (!process.env.SEARCHDB_URL) {
      throw new Error('缺少环境变量: SEARCHDB_URL');
    }

    console.log('开始复制 embedding...\n');

    // 初始化目标数据库连接（PostgreSQL Pool）
    const searchDbPool = new Pool({
      connectionString: process.env.SEARCHDB_URL,
    });

    // 测试数据库连接
    await searchDbPool.query('SELECT 1');

    // 1. 查找所有 embedding 为 null 的记录
    console.log('查找 embedding 为 null 的记录...');
    const nullEmbeddingQuery = `
      SELECT template_id, appid
      FROM templates
      WHERE embedding IS NULL
      ORDER BY template_id, appid
    `;
    const nullEmbeddingResult = await searchDbPool.query(nullEmbeddingQuery);
    const nullEmbeddingRecords = nullEmbeddingResult.rows;

    console.log(
      `找到 ${nullEmbeddingRecords.length} 条 embedding 为 null 的记录\n`
    );

    if (nullEmbeddingRecords.length === 0) {
      console.log('没有需要处理的记录');
      await searchDbPool.end();
      return;
    }

    // 2. 对于每个 embedding 为 null 的记录，查找同一个 template_id 下有 embedding 的记录
    let processed = 0;
    let success = 0;
    let failed = 0;
    let notFound = 0;

    for (const record of nullEmbeddingRecords) {
      try {
        const { template_id, appid } = record;

        // 使用子查询直接从同一个 template_id 的其他记录复制 embedding
        const updateQuery = `
          UPDATE templates t1
          SET embedding = (
            SELECT embedding
            FROM templates t2
            WHERE t2.template_id = $1
              AND t2.appid != $2
              AND t2.embedding IS NOT NULL
            LIMIT 1
          )
          WHERE t1.template_id = $1 AND t1.appid = $2
        `;
        await searchDbPool.query(updateQuery, [template_id, appid]);

        // 检查更新后的 embedding 是否成功复制
        const checkQuery = `
          SELECT embedding
          FROM templates
          WHERE template_id = $1 AND appid = $2
        `;
        const checkResult = await searchDbPool.query(checkQuery, [
          template_id,
          appid,
        ]);

        processed++;

        if (
          checkResult.rows.length > 0 &&
          checkResult.rows[0].embedding !== null
        ) {
          // 成功复制了 embedding
          success++;
          console.log(`✓ 复制成功: template_id=${template_id}, appid=${appid}`);
        } else {
          // 没有找到可复制的 embedding
          notFound++;
          console.log(
            `未找到可复制的 embedding: template_id=${template_id}, appid=${appid}`
          );
        }
      } catch (error) {
        processed++;
        failed++;
        console.error(
          `✗ 处理失败: template_id=${record.template_id}, appid=${record.appid}`,
          error
        );
      }
    }

    console.log('\n处理完成！');
    console.log(`总计: ${processed}`);
    console.log(`成功: ${success}`);
    console.log(`失败: ${failed}`);
    console.log(`未找到可复制数据: ${notFound}`);

    // 关闭连接
    await searchDbPool.end();

    console.log('\n复制完成！');
  } catch (error) {
    console.error('复制失败:', error);
    process.exit(1);
  }
}

// 执行主函数
if (require.main === module) {
  main();
}

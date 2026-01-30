// 初始化模版 AI 向量表脚本
// 在主数据库中创建 template_ai_vectors 表及其索引
// 复用 DATABASE_URL 数据库
// 
// 使用方法：
//   cd packages/jiantie
//   pnpm init:ai-vector-table
// 或者：
//   tsx ai-template-search/scripts/initTemplateAIVectorTable.ts

import dotenv from 'dotenv';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// 加载环境变量
dotenv.config({ path: '.env.local' });
dotenv.config();

async function main() {
  try {
    // 检查环境变量
    if (!process.env.DATABASE_URL) {
      throw new Error('缺少环境变量: DATABASE_URL');
    }

    console.log('开始初始化模版 AI 向量表...\n');
    console.log(`数据库连接: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}\n`);

    // 连接数据库（复用主数据库）
    const dbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // 测试连接
    await dbPool.query('SELECT 1');
    console.log('✓ 数据库连接成功\n');

    // 确保 pgvector 扩展已安装
    console.log('检查 pgvector 扩展...');
    try {
      await dbPool.query('CREATE EXTENSION IF NOT EXISTS vector;');
      console.log('✓ pgvector 扩展已安装\n');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('already exists')) {
        console.log('✓ pgvector 扩展已存在\n');
      } else {
        console.warn(`⚠ pgvector 扩展检查失败: ${errorMessage}`);
        console.warn('  如果扩展未安装，请先手动安装 pgvector 扩展\n');
      }
    }

    // 读取 SQL 脚本
    // 使用相对于脚本文件的路径
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const sqlPath = join(__dirname, 'createTemplateAIVectorTable.sql');
    
    console.log(`读取 SQL 脚本: ${sqlPath}`);
    const sql = readFileSync(sqlPath, 'utf-8');
    console.log('✓ SQL 脚本读取成功\n');

    // 执行 SQL 脚本（逐条执行，便于错误定位）
    console.log('执行 SQL 脚本...\n');
    
    // 移除注释，然后按分号分割
    const cleanedSql = sql
      .split('\n')
      .map(line => {
        // 移除行内注释（-- 后面的内容）
        const commentIndex = line.indexOf('--');
        if (commentIndex >= 0) {
          return line.substring(0, commentIndex);
        }
        return line;
      })
      .join('\n');

    const statements = cleanedSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`共找到 ${statements.length} 条 SQL 语句\n`);

    // 先执行表创建语句
    const tableCreateStatements = statements.filter(s => 
      s.toUpperCase().includes('CREATE TABLE')
    );
    
    // 再执行索引创建语句
    const indexCreateStatements = statements.filter(s => 
      s.toUpperCase().includes('CREATE INDEX')
    );

    // 执行表创建
    if (tableCreateStatements.length > 0) {
      console.log('执行表创建语句...');
      for (let i = 0; i < tableCreateStatements.length; i++) {
        const statement = tableCreateStatements[i];
        try {
          const preview = statement.substring(0, 50).replace(/\s+/g, ' ');
          console.log(`  执行: ${preview}...`);
          await dbPool.query(statement);
          console.log(`  ✓ 表创建语句执行成功\n`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('already exists')) {
            console.log(`  ⚠ 表已存在，跳过\n`);
          } else {
            console.error(`  ❌ 表创建失败: ${errorMessage}`);
            throw error;
          }
        }
      }
    }

    // 执行索引创建
    if (indexCreateStatements.length > 0) {
      console.log('执行索引创建语句...');
      for (let i = 0; i < indexCreateStatements.length; i++) {
        const statement = indexCreateStatements[i];
        try {
          const preview = statement.substring(0, 50).replace(/\s+/g, ' ');
          console.log(`  执行索引 ${i + 1}/${indexCreateStatements.length}: ${preview}...`);
          await dbPool.query(statement);
          console.log(`  ✓ 索引 ${i + 1} 创建成功`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
            console.log(`  ⚠ 索引 ${i + 1} 已存在，跳过`);
          } else {
            console.error(`  ❌ 索引 ${i + 1} 创建失败: ${errorMessage}`);
            // 索引创建失败不应该阻止整个流程，只记录警告
            console.warn(`  继续执行其他索引创建...`);
          }
        }
      }
      console.log('');
    }

    console.log('\n✓ SQL 脚本执行完成\n');

    // 验证表是否存在
    const checkResult = await dbPool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'template_ai_vectors'
      );
    `);

    if (checkResult.rows[0]?.exists) {
      console.log('✓ 验证：template_ai_vectors 表已存在\n');
    } else {
      throw new Error('表创建失败：验证时未找到 template_ai_vectors 表');
    }

    // 检查索引
    const indexResult = await dbPool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'template_ai_vectors'
      ORDER BY indexname;
    `);

    console.log(`✓ 已创建 ${indexResult.rows.length} 个索引：`);
    indexResult.rows.forEach((row) => {
      console.log(`  - ${row.indexname}`);
    });

    // 检查表结构
    const columnsResult = await dbPool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'template_ai_vectors'
      ORDER BY ordinal_position;
    `);

    console.log(`\n✓ 表结构（${columnsResult.rows.length} 个字段）：`);
    columnsResult.rows.forEach((row) => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    await dbPool.end();

    console.log('\n✅ 初始化完成！');
    console.log('\n现在可以使用向量化功能了。');
  } catch (error) {
    console.error('\n❌ 初始化失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message);
      if (error.stack) {
        console.error('堆栈:', error.stack);
      }
    }
    process.exit(1);
  }
}

// 执行主函数
main();

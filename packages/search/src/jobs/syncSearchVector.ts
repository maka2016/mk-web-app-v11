// 同步搜索向量脚本
// 源数据库：prisma连接读取：DATABASE_URL
// 功能：
// 1. 读取jiantie-db的template_entity，和排序要素template_sort_metrics_entity，
// 2. 将作品标题计算成向量（bert-base-chinese），存到目标数据库的向量表里
//
// 目标数据库连接：SEARCHDB_URL
// 向量表：templates (template_id, appid, spec, meta, embedding vector(1536))

import { initPrisma } from '@mk/jiantie/v11-database';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { AliyunEmbedding } from '../utils/embedding';

// 加载环境变量
dotenv.config({ path: '.env.local' });
dotenv.config();

interface TemplateData {
  id: string;
  title: string;
  appid: string | null;
  appids: string[];
  spec_id: string | null;
  sortMetrics: {
    sales_count: number;
    creation_count: number;
    composite_score: number;
    publish_time: Date | null;
    pin_weight: number;
    data: {
      上架天数?: number;
      新鲜度分?: number;
      历史支付数?: number;
      综合排名分?: number;
      近14天创作UV?: number;
      近14天曝光UV?: number;
      近14天点击UV?: number;
      uv曝光创作率?: number;
      uv曝光购买率?: number;
    };
  } | null;
}

/**
 * 批量处理模板数据
 */
async function processTemplates(
  templates: TemplateData[],
  searchDbPool: Pool,
  embeddingClient: AliyunEmbedding,
  batchSize: number = 2,
  force: boolean = false
) {
  console.log(`开始处理 ${templates.length} 个模板...`);
  if (force) {
    console.log('强制模式：将重新计算所有向量值\n');
  } else {
    console.log('普通模式：仅计算缺失的向量值\n');
  }

  let processed = 0;
  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < templates.length; i += batchSize) {
    const batch = templates.slice(i, i + batchSize);
    console.log(
      `处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(templates.length / batchSize)} (${i + 1}-${Math.min(i + batchSize, templates.length)})`
    );

    const promises = batch.map(async template => {
      try {
        // 准备元数据
        const 上架天数 = template.sortMetrics?.data?.上架天数;
        const publish_time = 上架天数 ? Date.now() - 上架天数 * 24 * 60 * 60 * 1000 : 0;

        const meta = {
          title: template.title,
          sales_count: template.sortMetrics?.sales_count || 0,
          creation_count: template.sortMetrics?.creation_count || 0,
          composite_score: template.sortMetrics?.composite_score || 0,
          publish_time,
          pin_weight: template.sortMetrics?.pin_weight || 0,
        };

        // 确定要处理的 appid 列表
        // 如果 appids 数组有值，使用它；否则使用 template.appid（如果存在）
        const appidsToProcess: string[] =
          template.appids && template.appids.length > 0 ? template.appids : template.appid ? [template.appid] : [];

        if (appidsToProcess.length === 0) {
          // 没有 appid，跳过
          processed++;
          skipped++;
          return {
            success: true,
            id: template.id,
            skipped: true,
          };
        }

        // 如果不是强制模式，检查是否已存在向量值
        let hasEmbedding = false;
        if (!force) {
          const checkQuery = `
            SELECT embedding FROM templates
            WHERE template_id = $1 AND embedding IS NOT NULL
          `;
          const checkResult = await searchDbPool.query(checkQuery, [template.id]);
          hasEmbedding = checkResult.rows.length > 0;
        }

        let embedding: number[] | null = null;
        let embeddingSkipped = false;

        if (force || !hasEmbedding) {
          // 需要计算向量
          embedding = await embeddingClient.computeEmbedding(template.title);

          // 验证向量
          if (!embedding || embedding.length === 0) {
            throw new Error(`模板 ${template.id} 的向量计算结果为空`);
          }
          if (embedding.length !== 1536) {
            throw new Error(`模板 ${template.id} 的向量维度不正确: 期望 1536 ${embedding.length}`);
          }
        } else {
          // 跳过向量计算
          embeddingSkipped = true;
        }

        // 为每个 appid 插入或更新记录
        let query: string;
        let params: any[];

        for (const appid of appidsToProcess) {
          if (embedding) {
            // 有向量值，更新所有字段包括向量
            query = `
              INSERT INTO templates (template_id, appid, spec, meta, embedding)
              VALUES ($1, $2, $3, $4, $5::vector)
                 ON CONFLICT (template_id,appid)
              DO UPDATE SET
                spec = EXCLUDED.spec,
                meta = EXCLUDED.meta,
                embedding = EXCLUDED.embedding
            `;
            params = [
              template.id,
              appid,
              template.spec_id ?? null,
              JSON.stringify(meta),
              `[${embedding.join(',')}]`, // PostgreSQL vector 格式: [1.0,2.0,3.0,...]
            ];
          } else {
            // 没有向量值，只更新其他字段，不更新向量
            query = `
              INSERT INTO templates (template_id, appid, spec, meta)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (template_id,appid)
              DO UPDATE SET
                spec = EXCLUDED.spec,
                meta = EXCLUDED.meta
            `;
            params = [template.id, appid, template.spec_id ?? null, JSON.stringify(meta)];
          }

          await searchDbPool.query(query, params);
        }

        processed++;
        success++;
        if (embeddingSkipped) {
          skipped++;
        }
        return {
          success: true,
          id: template.id,
          skipped: embeddingSkipped,
        };
      } catch (error) {
        processed++;
        failed++;
        console.error(`处理模板 ${template.id} 失败:`, error);
        return { success: false, id: template.id, error };
      }
    });

    await Promise.all(promises);

    console.log(`进度: ${processed}/${templates.length} (成功: ${success}, 失败: ${failed}, 跳过: ${skipped})`);
  }

  console.log(`处理完成！总计: ${processed}, 成功: ${success}, 失败: ${failed}, 跳过: ${skipped}`);
}

/**
 * 主函数
 */
async function main() {
  try {
    // 读取命令行参数 force
    // 支持格式: force=1, --force=1, --force 1
    let force = false;
    const forceIndex = process.argv.findIndex(arg => arg === 'force=1' || arg === '--force=1' || arg === '--force');
    if (forceIndex !== -1) {
      const arg = process.argv[forceIndex];
      if (arg.includes('=')) {
        force = arg.split('=')[1] === '1';
      } else if (process.argv[forceIndex + 1]) {
        force = process.argv[forceIndex + 1] === '1';
      }
    }

    // 检查环境变量
    if (!process.env.DATABASE_URL) {
      throw new Error('缺少环境变量: DATABASE_URL');
    }
    if (!process.env.SEARCHDB_URL) {
      throw new Error('缺少环境变量: SEARCHDB_URL');
    }

    console.log('开始同步搜索向量...\n');

    // 初始化源数据库连接（Prisma）
    console.log('连接源数据库...');
    const sourcePrisma = initPrisma({
      connectionString: process.env.DATABASE_URL,
    });

    // 初始化目标数据库连接（PostgreSQL Pool）

    const searchDbPool = new Pool({
      connectionString: process.env.SEARCHDB_URL,
    });

    // 测试目标数据库连接
    await searchDbPool.query('SELECT 1');

    // 读取模板数据
    console.log('读取模板数据...');
    const templates = await sourcePrisma.templateEntity.findMany({
      where: {
        deleted: false, // 只处理未删除的模板
        appids: {
          isEmpty: false, // 只要 appids 非空
        },
      },
      select: {
        id: true,
        title: true,
        appid: true,
        appids: true,
        spec_id: true,
        sortMetrics: {
          select: {
            sales_count: true,
            creation_count: true,
            composite_score: true,
            publish_time: true,
            pin_weight: true,
            data: true,
          },
        },
      },
    });

    //data数据例子{"上架天数": 0, "新鲜度分": 0.8333333333333334, "历史支付数": 0, "综合排名分": 0.5451860357099747, "近14天创作UV": 0, "近14天曝光UV": 1, "近14天点击UV": 0, "uv曝光创作率": 0, "uv曝光购买率": 0, "历史点击量UV": 0, "近14天支付数": 0, "新鲜度排名分": 0.9886738274047578, "近14天uv曝光点击率": 0, "uv曝光创作率排名分": 0.4470226249162698, "uv曝光购买率排名分": 0.4744997137641307, "历史的uv点击购买率": 0, "近14天uv曝光点击率排名分": 0.391157349528354, "历史的uv点击购买率排名分": 0.4245766629363613}

    console.log(`找到 ${templates.length} 个模板\n`);

    if (templates.length === 0) {
      console.log('没有需要处理的模板');
      await sourcePrisma.$disconnect();
      await searchDbPool.end();
      return;
    }

    // 初始化向量化客户端
    const embeddingClient = new AliyunEmbedding();
    console.log('向量化客户端初始化完成\n');

    // 处理模板
    await processTemplates(templates as TemplateData[], searchDbPool, embeddingClient, 2, force);

    // 关闭连接
    await sourcePrisma.$disconnect();
    await searchDbPool.end();

    console.log('\n同步完成！');
  } catch (error) {
    console.error('同步失败:', error);
    process.exit(1);
  }
}

// 执行主函数
if (require.main === module) {
  main();
}

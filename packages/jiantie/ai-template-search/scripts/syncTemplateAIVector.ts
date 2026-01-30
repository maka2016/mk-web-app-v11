// 同步模版 AI 向量脚本
// 数据库：prisma连接读取：DATABASE_URL
// 功能：
// 1. 读取jiantie-db的template_ai_vector_entity（包含AI元数据）
// 2. 将模版标题、场景标签、行业标签、示例文案等信息拼接成富文本
// 3. 计算向量（阿里云 Embedding API），存到数据库的 template_ai_vectors 表
// 4. 更新主数据库的同步状态
//
// 数据库连接：DATABASE_URL（复用主数据库）
// 向量表：template_ai_vectors (template_id, appid, meta, embedding vector(1536))

import { initPrisma } from '../../v11-database';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { AliyunEmbedding } from '../utils/embedding';

// 加载环境变量
dotenv.config({ path: '.env.local' });
dotenv.config();

interface TemplateAIMeta {
  sceneTags?: string[];
  industryTags?: string[];
  styleTags?: string[];
  audienceTags?: string[];
  sampleTitle?: string;
  sampleCopy?: string;
  slots?: unknown[];
}

interface TemplateAIVectorData {
  id: string;
  template_id: string;
  ai_meta: TemplateAIMeta | null;
  template: {
    id: string;
    title: string;
    appid: string | null;
    appids: string[];
  } | null;
}

/**
 * 构建用于向量化的富文本
 */
function buildEmbeddingText(
  template: TemplateAIVectorData
): string {
  const parts: string[] = [];

  // 从关联的 TemplateEntity 获取标题
  if (template.template?.title) {
    parts.push(template.template.title);
  }

  if (template.ai_meta) {
    const meta = template.ai_meta;
    if (meta.sceneTags && meta.sceneTags.length > 0) {
      parts.push(`场景：${meta.sceneTags.join('、')}`);
    }
    if (meta.industryTags && meta.industryTags.length > 0) {
      parts.push(`行业：${meta.industryTags.join('、')}`);
    }
    if (meta.styleTags && meta.styleTags.length > 0) {
      parts.push(`风格：${meta.styleTags.join('、')}`);
    }
    if (meta.audienceTags && meta.audienceTags.length > 0) {
      parts.push(`人群：${meta.audienceTags.join('、')}`);
    }
    if (meta.sampleTitle) {
      parts.push(meta.sampleTitle);
    }
    if (meta.sampleCopy) {
      // 限制示例文案长度，避免过长
      parts.push(meta.sampleCopy.slice(0, 200));
    }
  }

  return parts.join(' ');
}

/**
 * 批量处理模版 AI 向量数据
 */
async function processTemplateAIVectors(
  templates: TemplateAIVectorData[],
  sourcePrisma: ReturnType<typeof initPrisma>,
  dbPool: Pool,
  embeddingClient: AliyunEmbedding,
  batchSize: number = 2,
  force: boolean = false
) {
  console.log(`开始处理 ${templates.length} 个模版 AI 向量...`);
  if (force) {
    console.log('强制模式：将重新计算所有向量值\n');
  } else {
    console.log('普通模式：仅计算待同步的向量值\n');
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
        // 检查是否有关联的模版数据
        if (!template.template) {
          console.warn(`模版 ${template.template_id} 不存在，跳过`);
          processed++;
          skipped++;
          return {
            success: true,
            id: template.id,
            skipped: true,
          };
        }

        // 构建向量化文本
        const embeddingText = buildEmbeddingText(template);
        if (!embeddingText || embeddingText.trim().length === 0) {
          throw new Error(`模版 ${template.template_id} 的向量化文本为空`);
        }

        // 确定要处理的 appid 列表
        const appidsToProcess: string[] =
          template.template.appids && template.template.appids.length > 0
            ? template.template.appids
            : template.template.appid
              ? [template.template.appid]
              : [];

        if (appidsToProcess.length === 0) {
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
            SELECT embedding FROM template_ai_vectors
            WHERE template_id = $1 AND embedding IS NOT NULL
            LIMIT 1
          `;
          const checkResult = await dbPool.query(checkQuery, [
            template.template_id,
          ]);
          hasEmbedding = checkResult.rows.length > 0;
        }

        let embedding: number[] | null = null;
        let embeddingSkipped = false;

        if (force || !hasEmbedding) {
          // 需要计算向量
          console.log(`  生成向量文本: ${embeddingText.slice(0, 100)}...`);
          embedding = await embeddingClient.computeEmbedding(embeddingText);

          // 验证向量
          if (!embedding || embedding.length === 0) {
            throw new Error(`模版 ${template.template_id} 的向量计算结果为空`);
          }
          if (embedding.length !== 1536) {
            throw new Error(
              `模版 ${template.template_id} 的向量维度不正确: 期望 1536，实际 ${embedding.length}`
            );
          }
        } else {
          // 跳过向量计算
          embeddingSkipped = true;
        }

        // 准备元数据
        const meta = {
          template_id: template.template_id,
          title: template.template.title,
          scene_tags: template.ai_meta?.sceneTags || [],
          industry_tags: template.ai_meta?.industryTags || [],
          style_tags: template.ai_meta?.styleTags || [],
          audience_tags: template.ai_meta?.audienceTags || [],
          sample_title: template.ai_meta?.sampleTitle || null,
        };

        // 为每个 appid 插入或更新记录
        for (const appid of appidsToProcess) {
          if (embedding) {
            // 有向量值，更新所有字段包括向量
            const query = `
              INSERT INTO template_ai_vectors (template_id, appid, meta, embedding, updated_at)
              VALUES ($1, $2, $3, $4::vector, NOW())
              ON CONFLICT (template_id, appid)
              DO UPDATE SET
                meta = EXCLUDED.meta,
                embedding = EXCLUDED.embedding,
                updated_at = NOW()
            `;
            await dbPool.query(query, [
              template.template_id,
              appid,
              JSON.stringify(meta),
              `[${embedding.join(',')}]`, // PostgreSQL vector 格式
            ]);
          } else {
            // 没有向量值，只更新其他字段，不更新向量
            const query = `
              INSERT INTO template_ai_vectors (template_id, appid, meta, updated_at)
              VALUES ($1, $2, $3, NOW())
              ON CONFLICT (template_id, appid)
              DO UPDATE SET
                meta = EXCLUDED.meta,
                updated_at = NOW()
            `;
            await dbPool.query(query, [
              template.template_id,
              appid,
              JSON.stringify(meta),
            ]);
          }
        }

        // 更新主数据库的同步状态
        if (embedding) {
          await sourcePrisma.templateAIVectorEntity.update({
            where: { id: template.id },
            data: {
              sync_status: 'synced',
              synced_at: new Date(),
              sync_error: null,
            },
          });
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
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(`处理模版 ${template.template_id} 失败:`, errorMessage);

        // 更新主数据库的同步状态为失败
        try {
          await sourcePrisma.templateAIVectorEntity.update({
            where: { id: template.id },
            data: {
              sync_status: 'failed',
              sync_error: errorMessage,
            },
          });
        } catch (updateError) {
          console.error(`更新同步状态失败:`, updateError);
        }

        return { success: false, id: template.id, error: errorMessage };
      }
    });

    await Promise.all(promises);

    console.log(
      `进度: ${processed}/${templates.length} (成功: ${success}, 失败: ${failed}, 跳过: ${skipped})`
    );
  }

  console.log(
    `处理完成！总计: ${processed}, 成功: ${success}, 失败: ${failed}, 跳过: ${skipped}`
  );
}

/**
 * 主函数
 */
async function main() {
  try {
    // 读取命令行参数 force
    let force = false;
    const forceIndex = process.argv.findIndex(
      arg => arg === 'force=1' || arg === '--force=1' || arg === '--force'
    );
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

    console.log('开始同步模版 AI 向量...\n');

    // 初始化数据库连接（Prisma）
    console.log('连接数据库...');
    const sourcePrisma = initPrisma({
      connectionString: process.env.DATABASE_URL,
    });

    // 初始化数据库连接（PostgreSQL Pool，复用主数据库）
    const dbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // 测试数据库连接
    await dbPool.query('SELECT 1');

    // 读取模版 AI 向量数据
    console.log('读取模版 AI 向量数据...');
    const templates = await sourcePrisma.templateAIVectorEntity.findMany({
      where: force
        ? {} // 强制模式：处理所有记录
        : {
            // 普通模式：只处理待同步的记录
            sync_status: {
              in: ['pending', 'failed'],
            },
          },
      select: {
        id: true,
        template_id: true,
        ai_meta: true,
        template: {
          select: {
            id: true,
            title: true,
            appid: true,
            appids: true,
          },
        },
      },
    });

    console.log(`找到 ${templates.length} 个模版 AI 向量记录\n`);

    if (templates.length === 0) {
      console.log('没有需要处理的模版 AI 向量');
      await sourcePrisma.$disconnect();
      await dbPool.end();
      return;
    }

    // 初始化向量化客户端
    const embeddingClient = new AliyunEmbedding();
    console.log('向量化客户端初始化完成\n');

    // 处理模版 AI 向量
    await processTemplateAIVectors(
      templates as TemplateAIVectorData[],
      sourcePrisma,
      dbPool,
      embeddingClient,
      2,
      force
    );

    // 关闭连接
    await sourcePrisma.$disconnect();
    await dbPool.end();

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

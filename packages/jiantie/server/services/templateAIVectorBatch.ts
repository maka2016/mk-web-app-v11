import type { PrismaClient } from '@mk/jiantie/v11-database/generated/client/client';
import { Pool } from 'pg';
import { AIVectorMeta, analyzeTemplateForVector } from '../../ai-template-search/utils/analyze';
import { AliyunEmbedding } from '../../ai-template-search/utils/embedding';
import { getTemplateDataWithOSS } from '../utils/works-utils';

export const BATCH_VECTORIZE_MAX_COUNT = 500;

export type BatchVectorizeResult = {
  total: number;
  success_count: number;
  failed_count: number;
  results: Array<{
    template_id: string;
    success: boolean;
    error?: string;
    ai_meta?: AIVectorMeta | null;
  }>;
};

function buildEmbeddingText(
  title: string,
  aiMeta: {
    sceneTags?: string[];
    industryTags?: string[];
    styleTags?: string[];
    audienceTags?: string[];
    sampleTitle?: string;
    sampleCopy?: string;
  } | null
): string {
  const parts: string[] = [title];
  if (aiMeta) {
    if (aiMeta.sceneTags?.length) parts.push(`场景：${aiMeta.sceneTags.join('、')}`);
    if (aiMeta.industryTags?.length) parts.push(`行业：${aiMeta.industryTags.join('、')}`);
    if (aiMeta.styleTags?.length) parts.push(`风格：${aiMeta.styleTags.join('、')}`);
    if (aiMeta.audienceTags?.length) parts.push(`人群：${aiMeta.audienceTags.join('、')}`);
    if (aiMeta.sampleTitle) parts.push(aiMeta.sampleTitle);
    if (aiMeta.sampleCopy) parts.push(aiMeta.sampleCopy.slice(0, 200));
  }
  return parts.join(' ');
}

function getSearchDbPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error('缺少环境变量: DATABASE_URL');
  }
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

/**
 * 批量向量化核心逻辑：对给定的模版 ID 列表依次执行向量化，返回汇总结果。
 * 供 templateAIVector 路由与 asyncTask 任务处理器复用。
 */
export async function vectorizeTemplatesBatch(
  prisma: PrismaClient,
  templateIds: string[],
  skipAiAnalyze: boolean
): Promise<BatchVectorizeResult> {
  const results: BatchVectorizeResult['results'] = [];

  for (const template_id of templateIds) {
    try {
      let templateData;
      try {
        templateData = await getTemplateDataWithOSS({ prisma, templateId: template_id });
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : `模版 ${template_id} 不存在或获取失败`);
      }

      const template = templateData.detail;
      const worksData = templateData.work_data;

      let aiVector = await prisma.templateAIVectorEntity.findUnique({
        where: { template_id },
      });

      if (!aiVector) {
        aiVector = await prisma.templateAIVectorEntity.create({
          data: {
            template_id,
            ai_meta: undefined,
            sync_status: 'pending',
          },
        });
      }

      let aiMeta: AIVectorMeta | null = (aiVector.ai_meta as AIVectorMeta | null) ?? null;

      if (!skipAiAnalyze) {
        console.log(`[vectorizeTemplatesBatch] 开始 AI 分析模版 ${template_id}...`);
        const analyzeResult = await analyzeTemplateForVector(worksData, template.title);
        if (analyzeResult.success && analyzeResult.meta) {
          aiMeta = analyzeResult.meta;
          aiVector = await prisma.templateAIVectorEntity.update({
            where: { id: aiVector.id },
            data: { ai_meta: JSON.parse(JSON.stringify(aiMeta)) },
          });
        } else {
          console.warn(`[vectorizeTemplatesBatch] AI 分析失败: ${analyzeResult.error}`);
        }
      }

      const embeddingText = buildEmbeddingText(template.title, aiMeta);
      const embeddingClient = new AliyunEmbedding();
      const embedding = await embeddingClient.computeEmbedding(embeddingText);

      const appidsToProcess: string[] =
        template.appids?.length ? template.appids : template.appid ? [template.appid] : ['maka'];

      const meta = {
        template_id,
        title: template.title,
        scene_tags: aiMeta?.sceneTags ?? [],
        industry_tags: aiMeta?.industryTags ?? [],
        style_tags: aiMeta?.styleTags ?? [],
        audience_tags: aiMeta?.audienceTags ?? [],
        sample_title: aiMeta?.sampleTitle ?? null,
      };

      const pool = getSearchDbPool();
      for (const appid of appidsToProcess) {
        await pool.query(
          `INSERT INTO template_ai_vectors (template_id, appid, meta, embedding, updated_at)
           VALUES ($1, $2, $3, $4::vector, NOW())
           ON CONFLICT (template_id, appid)
           DO UPDATE SET meta = EXCLUDED.meta, embedding = EXCLUDED.embedding, updated_at = NOW()`,
          [template_id, appid, JSON.stringify(meta), `[${embedding.join(',')}]`]
        );
      }
      await pool.end();

      await prisma.templateAIVectorEntity.update({
        where: { id: aiVector.id },
        data: { sync_status: 'synced', synced_at: new Date(), sync_error: null },
      });

      results.push({ template_id, success: true, ai_meta: aiMeta });
    } catch (error) {
      results.push({
        template_id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    total: templateIds.length,
    success_count: results.filter(r => r.success).length,
    failed_count: results.filter(r => !r.success).length,
    results,
  };
}

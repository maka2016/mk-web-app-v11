import { TRPCError } from '@trpc/server';
import { Pool } from 'pg';
import { z } from 'zod';
import { AIWorksSDK } from '../../ai-template-search/utils/ai-works-sdk';
import { AIVectorMeta, analyzeTemplateForVector } from '../../ai-template-search/utils/analyze';
import { AliyunEmbedding } from '../../ai-template-search/utils/embedding';
import { searchAITemplateVectors } from '../../ai-template-search/utils/search';
import { protectedProcedure, router } from '../trpc';
import { getWorksDataWithOSS } from '../utils/works-utils';

function getSearchDbPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: '缺少环境变量: DATABASE_URL',
    });
  }
  return new Pool({
    connectionString: process.env.DATABASE_URL,
  });
}

function buildWorksQueryText(params: { title?: string | null; textLines: string[] }) {
  const { title, textLines } = params;

  // 用户希望“尽可能多的数据”，但 embedding 接口也有输入长度上限
  // 这里做一个温和的上限，避免超长导致失败
  const MAX_CHARS = 12000;

  const parts: string[] = [];
  if (title && title.trim()) {
    parts.push(`作品标题：${title.trim()}`);
  }

  // 以行形式拼接（保留 tag 信息，增加语义密度）
  let truncated = false;
  let usedLines = 0;
  let accLen = parts.join('\n').length;

  for (let i = 0; i < textLines.length; i++) {
    const next = textLines[i];
    const nextLen = next.length + 1;
    if (accLen + nextLen > MAX_CHARS) {
      truncated = true;
      break;
    }
    parts.push(next);
    usedLines++;
    accLen += nextLen;
  }

  return {
    text: parts.join('\n'),
    truncated,
    usedLines,
  };
}

/**
 * 构建用于向量化的富文本（与模版向量保持一致）
 */
function buildEmbeddingText(title: string, aiMeta: AIVectorMeta | null): string {
  const parts: string[] = [title];

  if (aiMeta) {
    if (aiMeta.sceneTags && aiMeta.sceneTags.length > 0) {
      parts.push(`场景：${aiMeta.sceneTags.join('、')}`);
    }
    if (aiMeta.industryTags && aiMeta.industryTags.length > 0) {
      parts.push(`行业：${aiMeta.industryTags.join('、')}`);
    }
    if (aiMeta.styleTags && aiMeta.styleTags.length > 0) {
      parts.push(`风格：${aiMeta.styleTags.join('、')}`);
    }
    if (aiMeta.audienceTags && aiMeta.audienceTags.length > 0) {
      parts.push(`人群：${aiMeta.audienceTags.join('、')}`);
    }
    if (aiMeta.sampleTitle) {
      parts.push(aiMeta.sampleTitle);
    }
    if (aiMeta.sampleCopy) {
      parts.push(aiMeta.sampleCopy.slice(0, 200));
    }
  }

  return parts.join(' ');
}

export const worksAIVectorRouter = router({
  /**
   * 向量化一个用户作品（落库到 works_ai_vectors）
   *
   * 主键策略：works_id 唯一，重复向量化覆盖更新
   */
  vectorizeWorks: protectedProcedure
    .input(
      z.object({
        works_id: z.string(),
        version: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1) 拉取作品数据（DB + OSS）
      const works = await getWorksDataWithOSS({
        prisma: ctx.prisma,
        worksId: input.works_id,
        version: input.version,
      });

      // 2) 调用 AI 分析，生成与模版一致的语义标签
      let aiMeta: AIVectorMeta | null = null;
      let analyzeError: string | undefined;

      const analyzeResult = await analyzeTemplateForVector(
        works.work_data,
        works.detail.title ?? ''
      );

      if (analyzeResult.success && analyzeResult.meta) {
        aiMeta = analyzeResult.meta;
      } else {
        analyzeError = analyzeResult.error;
      }

      // 3) 构建用于向量化的文本（与模版保持一致）
      let embeddingText = buildEmbeddingText(works.detail.title ?? '', aiMeta);

      // 如果 AI 分析失败或文本为空，降级为直接拼接作品文本
      let textLines: string[] = [];
      let usedLines = 0;
      let truncated = false;

      if (!embeddingText.trim()) {
        const elements = AIWorksSDK.extractTemplateTextElements(works.work_data);
        if (elements.length === 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '作品中没有可用于向量化的文本内容',
          });
        }

        textLines = elements
          .map((e, idx) => `${idx + 1}. [${e.tag || 'text_body'}] ${e.text || ''}`.trim())
          .filter(Boolean);

        const query = buildWorksQueryText({
          title: works.detail.title,
          textLines,
        });

        embeddingText = query.text;
        usedLines = query.usedLines;
        truncated = query.truncated;
      } else {
        // 有 AI 语义信息时，仍然统计一下文本行数（用于调试）
        const elements = AIWorksSDK.extractTemplateTextElements(works.work_data);
        textLines = elements.map((e, idx) => `${idx + 1}. [${e.tag || 'text_body'}] ${e.text || ''}`.trim());
        usedLines = textLines.length;
        truncated = false;
      }

      if (!embeddingText.trim()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '向量化文本为空',
        });
      }

      // 4) 生成向量
      const embeddingClient = new AliyunEmbedding();
      const embedding = await embeddingClient.computeEmbedding(embeddingText);

      if (!embedding || embedding.length !== 1536) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '向量生成失败',
        });
      }

      // 5) 落库到 search DB（works_ai_vectors）
      const meta = {
        is_user_works: true,
        works_id: input.works_id,
        uid: works.detail.uid,
        appid: works.detail.appid ?? null,
        title: works.detail.title ?? null,
        ai_meta: aiMeta,
        scene_tags: aiMeta?.sceneTags ?? [],
        industry_tags: aiMeta?.industryTags ?? [],
        style_tags: aiMeta?.styleTags ?? [],
        audience_tags: aiMeta?.audienceTags ?? [],
        sample_title: aiMeta?.sampleTitle ?? null,
        text_used_lines: usedLines,
        text_total_lines: textLines.length,
        truncated,
        version: works.detail.version ?? null,
        analyze_error: analyzeError ?? null,
      };

      const searchDbPool = getSearchDbPool();
      try {
        const upsert = `
          INSERT INTO works_ai_vectors (works_id, uid, appid, meta, embedding, updated_at)
          VALUES ($1, $2, $3, $4, $5::vector, NOW())
          ON CONFLICT (works_id)
          DO UPDATE SET
            uid = EXCLUDED.uid,
            appid = EXCLUDED.appid,
            meta = EXCLUDED.meta,
            embedding = EXCLUDED.embedding,
            updated_at = NOW()
        `;
        await searchDbPool.query(upsert, [
          input.works_id,
          works.detail.uid,
          works.detail.appid ?? null,
          JSON.stringify(meta),
          `[${embedding.join(',')}]`,
        ]);
      } finally {
        await searchDbPool.end();
      }

      return {
        success: true,
        works_id: input.works_id,
        embedding_text_preview: embeddingText.slice(0, 400),
        meta,
      };
    }),

  /**
   * 用用户作品（worksId）的文本作为查询，匹配 template_ai_vectors
   * 说明：这里不依赖 works_ai_vectors 是否已落库，随时可用。
   */
  matchTemplatesByWorksId: protectedProcedure
    .input(
      z.object({
        works_id: z.string(),
        version: z.string().optional(),
        scene_tags: z.array(z.string()).optional(),
        industry_tags: z.array(z.string()).optional(),
        limit: z.number().optional().default(10),
        min_similarity: z.number().optional().default(0.3),
      })
    )
    .query(async ({ ctx, input }) => {
      // 1) 拉取作品数据（DB + OSS）
      const works = await getWorksDataWithOSS({
        prisma: ctx.prisma,
        worksId: input.works_id,
        version: input.version,
      });

      // 2) 抽取文本
      const elements = AIWorksSDK.extractTemplateTextElements(works.work_data);
      if (elements.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '作品中没有可用于匹配的文本内容',
        });
      }

      const lines = elements
        .map((e, idx) => `${idx + 1}. [${e.tag || 'text_body'}] ${e.text || ''}`.trim())
        .filter(Boolean);

      const query = buildWorksQueryText({
        title: works.detail.title,
        textLines: lines,
      });

      // 3) 生成查询向量
      const embeddingClient = new AliyunEmbedding();
      const queryEmbedding = await embeddingClient.computeEmbedding(query.text);

      if (!queryEmbedding || queryEmbedding.length !== 1536) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '查询向量生成失败',
        });
      }

      // 4) 搜索 template_ai_vectors
      const searchDbPool = getSearchDbPool();
      try {
        const results = await searchAITemplateVectors(searchDbPool, queryEmbedding, {
          sceneTags: input.scene_tags,
          industryTags: input.industry_tags,
          limit: input.limit,
          minSimilarity: input.min_similarity,
        });

        return {
          works_id: input.works_id,
          query_text_preview: query.text.slice(0, 400),
          query_used_lines: query.usedLines,
          query_total_lines: lines.length,
          truncated: query.truncated,
          results,
        };
      } finally {
        await searchDbPool.end();
      }
    }),

  /**
   * 查询已向量化的作品列表
   */
  getVectorizedWorksList: protectedProcedure
    .input(
      z
        .object({
          works_id: z.string().optional(),
          page: z.number().optional().default(1),
          pageSize: z.number().optional().default(20),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 20;
      const offset = (page - 1) * pageSize;

      const params: any[] = [];
      let where = '1=1';

      if (input?.works_id) {
        params.push(`%${input.works_id}%`);
        where += ` AND works_id ILIKE $${params.length}`;
      }

      const searchDbPool = getSearchDbPool();
      try {
        const [rowsRes, countRes] = await Promise.all([
          searchDbPool.query(
            `
            SELECT works_id, uid, appid, meta, created_at, updated_at
            FROM works_ai_vectors
            WHERE ${where}
            ORDER BY updated_at DESC
            LIMIT ${pageSize} OFFSET ${offset}
          `,
            params
          ),
          searchDbPool.query(
            `
            SELECT COUNT(*)::INT AS total
            FROM works_ai_vectors
            WHERE ${where}
          `,
            params
          ),
        ]);

        const data = rowsRes.rows;
        const total = (countRes.rows[0]?.total as number) ?? 0;

        return {
          data,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        };
      } finally {
        await searchDbPool.end();
      }
    }),

  /**
   * 删除作品向量（从搜索数据库删除）
   */
  deleteVector: protectedProcedure
    .input(
      z.object({
        works_id: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const searchDbPool = getSearchDbPool();
      try {
        await searchDbPool.query('DELETE FROM works_ai_vectors WHERE works_id = $1', [input.works_id]);

        return {
          success: true,
          works_id: input.works_id,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : '删除作品向量失败',
        });
      } finally {
        await searchDbPool.end();
      }
    }),
});

import { TRPCError } from '@trpc/server';
import { Pool } from 'pg';
import { z } from 'zod';
import { AIVectorMeta, analyzeTemplateForVector } from '../../ai-template-search/utils/analyze';
import { AliyunEmbedding } from '../../ai-template-search/utils/embedding';
import { searchAITemplateVectors } from '../../ai-template-search/utils/search';
import { BATCH_VECTORIZE_MAX_COUNT, vectorizeTemplatesBatch } from '../services/templateAIVectorBatch';
import { protectedProcedure, router } from '../trpc';
import { getTemplateDataWithOSS } from '../utils/works-utils';

// 同步状态枚举 Schema
const syncStatusSchema = z.enum(['pending', 'synced', 'failed']);

/**
 * 构建用于向量化的富文本
 */
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

/**
 * 获取数据库连接池（复用主数据库）
 */
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

export const templateAIVectorRouter = router({
  /**
   * 向量化单个模版
   * 流程：
   * 1. 获取模版数据（包含 work_data）
   * 2. 提取可编辑内容并调用 AI 分析
   * 3. 将 AI 分析结果写入 ai_meta
   * 4. 使用 ai_meta 生成向量并写入数据库
   */
  vectorizeTemplate: protectedProcedure
    .input(
      z.object({
        template_id: z.string(),
        skip_ai_analyze: z.boolean().optional().default(false), // 跳过 AI 分析，直接使用已有的 ai_meta
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // 1. 获取模版数据（包含 work_data）
        let templateData;
        try {
          templateData = await getTemplateDataWithOSS({
            prisma: ctx.prisma,
            templateId: input.template_id,
          });
        } catch (error) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: error instanceof Error ? error.message : `模版 ${input.template_id} 不存在或获取失败`,
          });
        }

        const template = templateData.detail;
        const worksData = templateData.work_data;

        // 2. 读取或创建模版 AI 向量数据
        let aiVector = await ctx.prisma.templateAIVectorEntity.findUnique({
          where: { template_id: input.template_id },
        });

        // 如果不存在，自动创建一个
        if (!aiVector) {
          aiVector = await ctx.prisma.templateAIVectorEntity.create({
            data: {
              template_id: input.template_id,
              ai_meta: undefined,
              sync_status: 'pending',
            },
          });
        }

        // 3. 调用 AI 分析（除非跳过或已有 ai_meta）
        let aiMeta: AIVectorMeta | null = aiVector.ai_meta as AIVectorMeta | null;
        let aiAnalyzeError: string | undefined;

        if (!input.skip_ai_analyze) {
          console.log(`[vectorizeTemplate] 开始 AI 分析模版 ${input.template_id}...`);
          const analyzeResult = await analyzeTemplateForVector(worksData, template.title);

          if (analyzeResult.success && analyzeResult.meta) {
            aiMeta = analyzeResult.meta;
            console.log(`[vectorizeTemplate] AI 分析成功:`, aiMeta);

            // 将 AI 分析结果写入数据库
            aiVector = await ctx.prisma.templateAIVectorEntity.update({
              where: { id: aiVector.id },
              data: {
                ai_meta: JSON.parse(JSON.stringify(aiMeta)),
              },
            });
          } else {
            aiAnalyzeError = analyzeResult.error;
            console.warn(`[vectorizeTemplate] AI 分析失败: ${aiAnalyzeError}`);
            // AI 分析失败不阻止向量化，使用已有的 ai_meta 或空值
          }
        }

        // 4. 构建向量化文本
        const embeddingText = buildEmbeddingText(template.title, aiMeta);

        if (!embeddingText || embeddingText.trim().length === 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '向量化文本为空',
          });
        }

        // 5. 生成向量
        const embeddingClient = new AliyunEmbedding();
        const embedding = await embeddingClient.computeEmbedding(embeddingText);

        if (!embedding || embedding.length !== 1536) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: '向量生成失败',
          });
        }

        // 6. 确定要处理的 appid 列表（没有 appid 时默认 maka）
        const appidsToProcess: string[] =
          template.appids && template.appids.length > 0
            ? template.appids
            : template.appid
              ? [template.appid]
              : ['maka'];

        // 7. 准备元数据
        const meta = {
          template_id: input.template_id,
          title: template.title,
          scene_tags: aiMeta?.sceneTags || [],
          industry_tags: aiMeta?.industryTags || [],
          style_tags: aiMeta?.styleTags || [],
          audience_tags: aiMeta?.audienceTags || [],
          sample_title: aiMeta?.sampleTitle || null,
        };

        // 8. 存入搜索数据库
        const searchDbPool = getSearchDbPool();
        for (const appid of appidsToProcess) {
          const query = `
            INSERT INTO template_ai_vectors (template_id, appid, meta, embedding, updated_at)
            VALUES ($1, $2, $3, $4::vector, NOW())
            ON CONFLICT (template_id, appid)
            DO UPDATE SET
              meta = EXCLUDED.meta,
              embedding = EXCLUDED.embedding,
              updated_at = NOW()
          `;
          await searchDbPool.query(query, [input.template_id, appid, JSON.stringify(meta), `[${embedding.join(',')}]`]);
        }
        await searchDbPool.end();

        // 9. 更新主数据库的同步状态
        await ctx.prisma.templateAIVectorEntity.update({
          where: { id: aiVector.id },
          data: {
            sync_status: 'synced',
            synced_at: new Date(),
            sync_error: aiAnalyzeError || null, // 如果 AI 分析失败，记录错误但不影响同步状态
          },
        });

        return {
          success: true,
          template_id: input.template_id,
          embedding_text: embeddingText,
          ai_meta: aiMeta,
          ai_analyze_error: aiAnalyzeError,
        };
      } catch (error) {
        // 更新同步状态为失败（使用 upsert 确保记录存在）
        try {
          await ctx.prisma.templateAIVectorEntity.upsert({
            where: { template_id: input.template_id },
            update: {
              sync_status: 'failed',
              sync_error: error instanceof Error ? error.message : String(error),
            },
            create: {
              template_id: input.template_id,
              ai_meta: undefined,
              sync_status: 'failed',
              sync_error: error instanceof Error ? error.message : String(error),
            },
          });
        } catch (updateError) {
          console.error('更新同步状态失败:', updateError);
        }

        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : '向量化失败',
        });
      }
    }),

  /**
   * 获取已向量化列表
   */
  getVectorizedList: protectedProcedure
    .input(
      z
        .object({
          sync_status: syncStatusSchema.optional(),
          template_id: z.string().optional(),
          /** 模版标题模糊匹配 */
          title_keyword: z.string().optional(),
          page: z.number().optional().default(1),
          pageSize: z.number().optional().default(20),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const page = input?.page || 1;
      const pageSize = input?.pageSize || 20;
      const skip = (page - 1) * pageSize;

      const where: any = {};
      if (input?.sync_status) {
        where.sync_status = input.sync_status;
      }
      // 模版 ID 或标题模糊匹配（任一满足即可）
      const hasTemplateId = Boolean(input?.template_id?.trim());
      const hasTitleKeyword = Boolean(input?.title_keyword?.trim());
      if (hasTemplateId || hasTitleKeyword) {
        const orConditions: any[] = [];
        if (hasTemplateId) {
          orConditions.push({
            template_id: { contains: input!.template_id!.trim() },
          });
        }
        if (hasTitleKeyword) {
          orConditions.push({
            template: {
              title: {
                contains: input!.title_keyword!.trim(),
                mode: 'insensitive',
              },
            },
          });
        }
        where.OR = orConditions;
      }

      const [data, total] = await Promise.all([
        ctx.prisma.templateAIVectorEntity.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { update_time: 'desc' },
          include: {
            template: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        }),
        ctx.prisma.templateAIVectorEntity.count({ where }),
      ]);

      return {
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  /**
   * 测试向量匹配
   */
  testVectorMatch: protectedProcedure
    .input(
      z.object({
        query_text: z.string(), // 用户查询文本
        scene_tags: z.array(z.string()).optional(), // 场景标签过滤
        industry_tags: z.array(z.string()).optional(), // 行业标签过滤
        limit: z.number().optional().default(10), // 返回数量
        min_similarity: z.number().optional().default(0.3), // 最小相似度
      })
    )
    .query(async ({ input }) => {
      try {
        // 生成查询向量
        const embeddingClient = new AliyunEmbedding();
        const queryEmbedding = await embeddingClient.computeEmbedding(input.query_text);

        if (!queryEmbedding || queryEmbedding.length !== 1536) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: '查询向量生成失败',
          });
        }

        // 搜索向量
        const searchDbPool = getSearchDbPool();
        const results = await searchAITemplateVectors(searchDbPool, queryEmbedding, {
          sceneTags: input.scene_tags,
          industryTags: input.industry_tags,
          limit: input.limit,
          minSimilarity: input.min_similarity,
        });
        await searchDbPool.end();

        return {
          results,
          query_text: input.query_text,
          query_embedding_length: queryEmbedding.length,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : '向量匹配失败',
        });
      }
    }),

  /**
   * 批量向量化
   * 流程与 vectorizeTemplate 相同，复用 vectorizeTemplatesBatch 核心逻辑
   */
  batchVectorize: protectedProcedure
    .input(
      z.object({
        template_ids: z.array(z.string()),
        skip_ai_analyze: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return vectorizeTemplatesBatch(ctx.prisma, input.template_ids, input.skip_ai_analyze);
    }),

  /**
   * 按模版创建时间范围批量向量化
   * 查询该时间段内创建的模版 ID，再复用批量向量化逻辑
   */
  batchVectorizeByCreatedAt: protectedProcedure
    .input(
      z.object({
        start_date: z.string(), // YYYY-MM-DD
        end_date: z.string(), // YYYY-MM-DD
        skip_ai_analyze: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const startDate = new Date(input.start_date);
      const endDate = new Date(input.end_date);

      if (isNaN(startDate.getTime())) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '开始日期格式无效，请使用 YYYY-MM-DD',
        });
      }
      if (isNaN(endDate.getTime())) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '结束日期格式无效，请使用 YYYY-MM-DD',
        });
      }

      const startTime = new Date(startDate);
      startTime.setHours(0, 0, 0, 0);
      const endTime = new Date(endDate);
      endTime.setHours(23, 59, 59, 999);

      if (endTime < startTime) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '结束日期不能早于开始日期',
        });
      }

      const templates = await ctx.prisma.templateEntity.findMany({
        where: {
          create_time: { gte: startTime, lte: endTime },
          deleted: false,
        },
        select: { id: true },
        orderBy: { create_time: 'asc' },
      });

      const templateIds = templates.map(t => t.id);

      if (templateIds.length === 0) {
        return {
          total: 0,
          success_count: 0,
          failed_count: 0,
          results: [],
          message: '该时间范围内没有模版',
        };
      }

      if (templateIds.length > BATCH_VECTORIZE_MAX_COUNT) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `范围内模版数量过多（${templateIds.length}），请缩小时间范围，单次最多处理 ${BATCH_VECTORIZE_MAX_COUNT} 个`,
        });
      }

      const result = await vectorizeTemplatesBatch(ctx.prisma, templateIds, input.skip_ai_analyze);
      return {
        ...result,
        message: result.total === 0 ? '该时间范围内没有模版' : undefined,
      };
    }),

  /**
   * 删除向量（从主库删除 template_ai_vector_entity，并从搜索表删除）
   * 先删主库实体再删搜索表，保证彻底清理；列表查询不再包含该模版向量。
   */
  deleteVector: protectedProcedure
    .input(
      z.object({
        template_id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // 1. 从主库删除 template_ai_vector_entity，彻底清理实体数据
        const deleteResult = await ctx.prisma.templateAIVectorEntity.deleteMany({
          where: { template_id: input.template_id },
        });

        // 2. 从搜索表删除向量
        const searchDbPool = getSearchDbPool();
        try {
          await searchDbPool.query('DELETE FROM template_ai_vectors WHERE template_id = $1', [input.template_id]);
        } finally {
          await searchDbPool.end();
        }

        return {
          success: true,
          template_id: input.template_id,
          deleted: deleteResult.count,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : '删除向量失败',
        });
      }
    }),
});

import { Pool } from 'pg';
import { AliyunEmbedding } from '../../../../ai-template-search/utils/embedding';
import { searchAITemplateVectors } from '../../../../ai-template-search/utils/search';

export const dynamic = 'force-dynamic';

/**
 * AI 模版匹配 API
 * 根据用户输入匹配最合适的模版
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      query_text,
      scene_tags,
      industry_tags,
      limit = 4,
      min_similarity = 0.3,
    } = body;

    // 验证参数
    if (!query_text || typeof query_text !== 'string' || !query_text.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          message: '查询文本不能为空',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!process.env.DATABASE_URL) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'DATABASE_URL is not configured',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 生成查询向量
    const embeddingClient = new AliyunEmbedding();
    const queryEmbedding = await embeddingClient.computeEmbedding(query_text.trim());

    if (!queryEmbedding || queryEmbedding.length !== 1536) {
      return new Response(
        JSON.stringify({
          success: false,
          message: '查询向量生成失败',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 搜索向量（复用主数据库）
    const searchDbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    try {
      const results = await searchAITemplateVectors(searchDbPool, queryEmbedding, {
        sceneTags: Array.isArray(scene_tags) ? scene_tags : undefined,
        industryTags: Array.isArray(industry_tags) ? industry_tags : undefined,
        limit: typeof limit === 'number' ? Math.min(limit, 20) : 4, // 最多返回20个
        minSimilarity: typeof min_similarity === 'number' ? min_similarity : 0.3,
      });

      // 多样性筛选：确保返回的模版风格多样
      // 简单实现：如果结果中有相似度接近的模版，优先选择不同风格的
      const diverseResults = ensureDiversity(results, limit);

      return new Response(
        JSON.stringify({
          success: true,
          results: diverseResults,
          query_text: query_text.trim(),
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } finally {
      await searchDbPool.end();
    }
  } catch (error) {
    console.error('[AI Generate API] 模版匹配失败:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : '模版匹配失败，请重试',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * 确保结果多样性
 * 如果结果中有相似度接近的模版，优先选择不同风格的
 */
function ensureDiversity(
  results: Array<{
    template_id: string;
    appid: string | null;
    meta: {
      template_id: string;
      title: string;
      scene_tags: string[];
      industry_tags: string[];
      style_tags: string[];
      audience_tags: string[];
      sample_title: string | null;
    };
    similarity: number;
  }>,
  limit: number
): typeof results {
  if (results.length <= limit) {
    return results;
  }

  // 简单实现：按相似度排序，然后选择前N个
  // 后续可以优化：考虑风格标签的多样性
  const selected: typeof results = [];
  const selectedStyleTags = new Set<string>();

  for (const result of results) {
    if (selected.length >= limit) {
      break;
    }

    // 如果还有空间，或者这个结果的风格标签与已选择的不同，则选择
    const styleTags = result.meta.style_tags || [];
    const hasNewStyle = styleTags.some(tag => !selectedStyleTags.has(tag));

    if (selected.length < limit || hasNewStyle) {
      selected.push(result);
      styleTags.forEach(tag => selectedStyleTags.add(tag));
    }
  }

  // 如果还没选够，补充剩余的
  if (selected.length < limit) {
    for (const result of results) {
      if (selected.length >= limit) {
        break;
      }
      if (!selected.find(r => r.template_id === result.template_id)) {
        selected.push(result);
      }
    }
  }

  return selected;
}

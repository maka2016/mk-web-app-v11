import { Pool } from 'pg';

/**
 * AI 模版向量搜索结果
 */
export interface AITemplateSearchResult {
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
  similarity: number; // 向量相似度（0-1）
}

/**
 * AI 模版向量搜索选项
 */
export interface AITemplateSearchOptions {
  sceneTags?: string[]; // 场景标签过滤
  industryTags?: string[]; // 行业标签过滤
  limit?: number; // 返回数量
  minSimilarity?: number; // 最小相似度
}

/**
 * AI 模版向量搜索
 * @param dbPool PostgreSQL 连接池
 * @param queryEmbedding 查询向量
 * @param options 搜索选项（包含场景标签过滤等）
 */
export async function searchAITemplateVectors(
  dbPool: Pool,
  queryEmbedding: number[],
  options: AITemplateSearchOptions = {}
): Promise<AITemplateSearchResult[]> {
  const { sceneTags, industryTags, limit = 10, minSimilarity = 0.3 } = options;

  // 构建查询条件
  const whereConditions: string[] = [];
  const params: (string | number)[] = [`[${queryEmbedding.join(',')}]`];
  let paramIndex = 2;

  // 场景标签过滤（使用 JSONB 的 && 重叠操作符：meta 中的 scene_tags 数组与传入数组有交集即匹配）
  if (sceneTags && sceneTags.length > 0) {
    whereConditions.push(`(meta->'scene_tags') && $${paramIndex}::jsonb`);
    params.push(JSON.stringify(sceneTags));
    paramIndex++;
  }

  // 行业标签过滤
  if (industryTags && industryTags.length > 0) {
    whereConditions.push(`(meta->'industry_tags') && $${paramIndex}::jsonb`);
    params.push(JSON.stringify(industryTags));
    paramIndex++;
  }

  const whereClause =
    whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // 多取候选行（limit 的 5 倍或至少 50），便于在应用层按 minSimilarity 过滤、去重后仍能凑满 limit 条
  const fetchLimit = Math.max(limit * 5, 50);

  const query = `
    SELECT
      template_id,
      appid,
      meta,
      1 - (embedding <=> $1::vector) as similarity
    FROM template_ai_vectors
    ${whereClause}
    ORDER BY embedding <=> $1::vector
    LIMIT $${paramIndex}
  `;

  params.push(fetchLimit);

  const result = await dbPool.query(query, params);

  const items = result.rows
    .map(row => ({
      template_id: row.template_id,
      appid: row.appid,
      meta:
        typeof row.meta === 'string' ? JSON.parse(row.meta) : row.meta,
      similarity: parseFloat(row.similarity),
    }))
    .filter(item => item.similarity >= minSimilarity);

  // 按 template_id 去重，同一模版（可能因不同 appid 有多条）只保留相似度最高的一条
  const seen = new Set<string>();
  const deduped: AITemplateSearchResult[] = [];
  for (const item of items) {
    if (seen.has(item.template_id)) continue;
    seen.add(item.template_id);
    deduped.push(item);
    if (deduped.length >= limit) break;
  }
  return deduped;
}

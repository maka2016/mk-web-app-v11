import { Pool } from 'pg';

export interface SearchResult {
  template_id: string;
  appid: string | null;
  spec: string | null;
  meta: {
    title: string;
    sales_count: number;
    creation_count: number;
    composite_score: number;
    publish_time: string | null;
    pin_weight: number;
  };
  similarity: number; // 向量相似度（0-1）
  final_score?: number; // 精排后的综合分数
}

export interface SearchOptions {
  // 粗排参数
  coarseLimit?: number; // 粗排返回的候选数量，默认1000
  minSimilarity?: number; // 最小相似度阈值，默认0.3

  // 精排参数
  finalLimit?: number; // 最终返回结果数量，默认20
  weights?: {
    similarity?: number; // 相似度权重，默认0.5
    business?: number; // 业务指标权重，默认0.3
    time?: number; // 时间权重，默认0.15
    pin?: number; // 置顶权重，默认0.05
  };
}

/**
 * 粗排阶段：使用向量相似度快速筛选候选结果
 */
async function coarseRanking(
  searchDbPool: Pool,
  queryEmbedding: number[],
  options: SearchOptions
): Promise<SearchResult[]> {
  const { coarseLimit = 1000, minSimilarity = 0.3 } = options;

  // 为了确保索引有效使用，先获取更多候选（coarseLimit * 2）
  // 然后在应用层过滤掉相似度低于阈值的
  // 这样可以充分利用 pgvector 的索引性能
  const fetchLimit = Math.max(coarseLimit * 2, 2000);

  // 使用 pgvector 的余弦距离进行搜索
  // 1 - (embedding <=> $1::vector) 将距离转换为相似度（值越大越相似）
  const query = `
    SELECT
      template_id,
      appid,
      spec,
      meta,
      1 - (embedding <=> $1::vector) as similarity
    FROM templates
    ORDER BY embedding <=> $1::vector
    LIMIT $2
  `;

  const result = await searchDbPool.query(query, [
    `[${queryEmbedding.join(',')}]`,
    fetchLimit,
  ]);

  // 在应用层过滤相似度低于阈值的，并限制数量
  const filtered = result.rows
    .map(row => ({
      template_id: row.template_id,
      appid: row.appid,
      spec: row.spec,
      meta: typeof row.meta === 'string' ? JSON.parse(row.meta) : row.meta,
      similarity: parseFloat(row.similarity),
    }))
    .filter(item => item.similarity >= minSimilarity)
    .slice(0, coarseLimit);

  return filtered;
}

/**
 * 归一化业务指标分数
 * 结合销量、创建数、综合分数
 */
function normalizeBusinessScore(meta: SearchResult['meta']): number {
  // 归一化销量（假设最大销量为10000，使用对数缩放）
  const normalizedSales = Math.min(
    1,
    Math.log10(meta.sales_count + 1) / Math.log10(10001)
  );

  // 归一化创建数（假设最大创建数为50000，使用对数缩放）
  const normalizedCreation = Math.min(
    1,
    Math.log10(meta.creation_count + 1) / Math.log10(50001)
  );

  // 综合分数（假设范围0-100，归一化到0-1）
  const normalizedComposite = Math.min(1, meta.composite_score / 100);

  // 加权平均：销量40%，创建数30%，综合分数30%
  return normalizedComposite;
}

/**
 * 计算时间分数
 * 发布时间越新，分数越高
 */
function calculateTimeScore(publishTime: string | null): number {
  if (!publishTime) {
    return 0.5; // 没有发布时间，给中等分数
  }

  const publishDate = new Date(publishTime);
  const now = new Date();
  const daysSincePublish =
    (now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24);

  // 使用指数衰减：30天内为1，之后逐渐衰减，1年后为0.1
  if (daysSincePublish <= 30) {
    return 1;
  } else if (daysSincePublish <= 365) {
    return 0.1 + 0.9 * Math.exp(-(daysSincePublish - 30) / 100);
  } else {
    return 0.1;
  }
}

/**
 * 精排阶段：对粗排结果进行综合评分
 */
function fineRanking(
  candidates: SearchResult[],
  options: SearchOptions
): SearchResult[] {
  const {
    finalLimit = 20,
    weights = {
      similarity: 0.5,
      business: 0.2,
      time: 0.15,
      pin: 0.05,
    },
  } = options;

  // 计算每个候选结果的综合分数
  const scoredResults = candidates.map(result => {
    // 相似度分数（已经是0-1范围）
    const similarityScore = result.similarity;

    // 业务指标分数
    const businessScore = normalizeBusinessScore(result.meta);

    // 时间分数
    const timeScore = calculateTimeScore(result.meta.publish_time);

    // 置顶权重（直接使用，范围0-1）
    const pinScore = Math.min(1, result.meta.pin_weight / 100);

    // 综合分数 = 加权平均
    const finalScore =
      similarityScore * weights.similarity! +
      businessScore * weights.business! +
      timeScore * weights.time! +
      pinScore * weights.pin!;

    return {
      ...result,
      final_score: finalScore,
    };
  });

  // 按综合分数降序排序
  scoredResults.sort((a, b) => (b.final_score || 0) - (a.final_score || 0));

  // 返回前N个结果
  return scoredResults.slice(0, finalLimit);
}

/**
 * 两阶段搜索：粗排 + 精排
 * @param searchDbPool PostgreSQL 连接池
 * @param queryEmbedding 查询向量
 * @param options 搜索选项
 * @returns 搜索结果数组（已按综合分数排序）
 */
export async function searchWithTwoStageRanking(
  searchDbPool: Pool,
  queryEmbedding: number[],
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  // 第一阶段：粗排
  const candidates = await coarseRanking(searchDbPool, queryEmbedding, options);

  if (candidates.length === 0) {
    return [];
  }

  // 第二阶段：精排
  const finalResults = fineRanking(candidates, options);

  return finalResults;
}

/**
 * 单阶段搜索（仅向量相似度，用于对比）
 */
export async function searchVectors(
  searchDbPool: Pool,
  queryEmbedding: number[],
  limit: number = 10
): Promise<SearchResult[]> {
  const query = `
    SELECT
      template_id,
      appid,
      spec,
      meta,
      1 - (embedding <=> $1::vector) as similarity
    FROM templates
    ORDER BY embedding <=> $1::vector
    LIMIT $2
  `;

  const result = await searchDbPool.query(query, [
    `[${queryEmbedding.join(',')}]`,
    limit,
  ]);

  return result.rows.map(row => ({
    template_id: row.template_id,
    appid: row.appid,
    spec: row.spec,
    meta: typeof row.meta === 'string' ? JSON.parse(row.meta) : row.meta,
    similarity: parseFloat(row.similarity),
  }));
}

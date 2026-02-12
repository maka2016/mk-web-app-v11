import { initPrisma } from '@mk/jiantie/v11-database';
import { Pool } from 'pg';
import { AliyunEmbedding } from '../utils/embedding';
import { SearchResult } from '../utils/search';

// 搜索排序方式
export type SortType = 'composite' | 'latest' | 'bestseller';

// 搜索过滤器
export interface SearchFilter {
  spec_id?: string; // 规格id（没有则不筛选）
  appid?: string; // appid（没有则不筛选）
}

// 搜索参数
export interface SearchParams {
  query: string; // 搜索词
  page_size: number; // 分页大小
  page: number; // 分页号（从1开始）
  filter?: SearchFilter; // 过滤器
  sort?: SortType; // 排序：最新、最畅销、综合（默认）
}

// 模板排序要素
export interface SortFactors {
  similarity: number; // 向量相似度
  composite_score: number; // 综合排序分
  sales_count: number; // 销量
  creation_count: number; // 创建数
  publish_time: string | null; // 发布时间
  pin_weight: number; // 置顶权重
}

// 扩展的搜索结果（包含 templateEntity 信息）
export interface ExtendedSearchResult extends SearchResult {
  title: string; // 模板标题（来自 templateEntity）
  coverV3: {
    url: string;
    width: number;
    height: number;
  } | null; // 封面（来自 templateEntity）
  sort_score?: number; // 排序分（根据排序方式计算的最终分数）
  sort_factors?: SortFactors; // 模板排序要素
}

// 规格统计
export interface SpecStat {
  spec_id: string; // 规格ID
  count: number; // 该规格的模板数量
}

// 搜索结果
export interface SearchResponse {
  templates: ExtendedSearchResult[]; // 模板列表
  total: number; // 总条数
  page: number; // 当前页数
  total_pages: number; // 总页数
  specs: SpecStat[]; // 规格统计结果
}

// 从环境变量加载配置并初始化数据库连接池
let searchDbPool: Pool | null = null;
let embeddingClient: AliyunEmbedding | null = null;
let prismaClient: ReturnType<typeof initPrisma> | null = null;

function getSearchDbPool(): Pool {
  if (!searchDbPool) {
    const searchDbUrl = process.env.SEARCHDB_URL;
    if (!searchDbUrl) {
      throw new Error('缺少环境变量: SEARCHDB_URL');
    }
    searchDbPool = new Pool({
      connectionString: searchDbUrl,
    });
  }
  return searchDbPool;
}

function getEmbeddingClient(): AliyunEmbedding {
  if (!embeddingClient) {
    embeddingClient = new AliyunEmbedding();
  }
  return embeddingClient;
}

function getPrismaClient() {
  if (!prismaClient) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('缺少环境变量: DATABASE_URL');
    }
    prismaClient = initPrisma({
      connectionString: databaseUrl,
    });
  }
  return prismaClient;
}

/**
 * 计算综合排序分数
 * 综合：相似度*0.5+综合排序分*0.5
 */
function calculateCompositeScore(
  similarity: number,
  compositeScore: number
): number {
  // 归一化综合分数到0-1范围（假设composite_score范围是0-100）
  const normalizedComposite = Math.min(1, compositeScore / 100);
  return Math.ceil(similarity * 100) + normalizedComposite * 30;

  // return normalizedComposite * 1;
}

/**
 * 粗排阶段：使用 testzhcfg 全文搜索召回+向量相似度召回，然后再排序
 */
async function coarseRankingWithFilter(
  searchDbPool: Pool,
  queryEmbedding: number[],
  queryText: string,
  filter?: SearchFilter
): Promise<SearchResult[]> {
  const fetchLimit = 200;

  // 查询1：testzhcfg 全文搜索召回
  // 参数顺序：filter参数 + queryText + embedding + limit
  const fullTextWhereConditions: string[] = [];
  const fullTextQueryParams: (string | number)[] = [];
  let fullTextParamIndex = 1;

  // 添加过滤器条件
  if (filter?.spec_id) {
    fullTextWhereConditions.push(`spec = $${fullTextParamIndex}`);
    fullTextQueryParams.push(filter.spec_id);
    fullTextParamIndex++;
  }

  if (filter?.appid) {
    fullTextWhereConditions.push(`appid = $${fullTextParamIndex}`);
    fullTextQueryParams.push(filter.appid);
    fullTextParamIndex++;
  }

  // 添加全文搜索条件
  const queryTextParamIndex = fullTextParamIndex;
  fullTextWhereConditions.push(
    `to_tsvector('testzhcfg', meta->>'title') @@ to_tsquery('testzhcfg', $${queryTextParamIndex})`
  );
  fullTextQueryParams.push(queryText);

  // 添加 embedding 用于计算相似度
  const embeddingParamIndex = fullTextParamIndex + 1;
  fullTextQueryParams.push(`[${queryEmbedding.join(',')}]`);

  // 添加 limit
  const limitParamIndex = fullTextParamIndex + 2;
  fullTextQueryParams.push(fetchLimit);

  const fullTextWhereClause = `WHERE ${fullTextWhereConditions.join(' AND ')}`;
  const fullTextQuery = `
    SELECT
      template_id,
      appid,
      spec,
      meta,
      1 - (embedding <=> $${embeddingParamIndex}::vector) as similarity
    FROM templates
    ${fullTextWhereClause}
    LIMIT $${limitParamIndex}
  `;

  // 查询2：向量相似度召回
  // 参数顺序：embedding + filter参数 + limit
  const vectorWhereConditions: string[] = [];
  const vectorQueryParams: (string | number)[] = [];
  vectorQueryParams.push(`[${queryEmbedding.join(',')}]`);
  let vectorParamIndex = 2; // $1 是 embedding，从 $2 开始

  // 添加相似度阈值条件（默认0.3）
  // 相似度 = 1 - (embedding <=> $1::vector)，所以阈值条件为 (embedding <=> $1::vector) <= 0.7
  vectorWhereConditions.push(`(embedding <=> $1::vector) <= 0.6`);

  // 添加过滤器条件
  if (filter?.spec_id) {
    vectorWhereConditions.push(`spec = $${vectorParamIndex}`);
    vectorQueryParams.push(filter.spec_id);
    vectorParamIndex++;
  }

  if (filter?.appid) {
    vectorWhereConditions.push(`appid = $${vectorParamIndex}`);
    vectorQueryParams.push(filter.appid);
    vectorParamIndex++;
  }

  // 添加 limit
  vectorQueryParams.push(fetchLimit);

  const vectorWhereClause = vectorWhereConditions.length
    ? `WHERE ${vectorWhereConditions.join(' AND ')}`
    : '';
  const vectorLimitParamIndex = vectorParamIndex;
  const vectorQuery = `
    SELECT
      template_id,
      appid,
      spec,
      meta,
      1 - (embedding <=> $1::vector) as similarity
    FROM templates
    ${vectorWhereClause}
    ORDER BY embedding <=> $1::vector
    LIMIT $${vectorLimitParamIndex}
  `;

  // 并行执行两个查询
  const [fullTextResult, vectorResult] = await Promise.all([
    searchDbPool.query(fullTextQuery, fullTextQueryParams),
    searchDbPool.query(vectorQuery, vectorQueryParams),
  ]);

  // 合并结果并去重（使用 Map 以 template_id 为 key）
  const resultMap = new Map<
    string,
    {
      template_id: string;
      appid: string;
      spec: string;
      meta: any;
      similarity: number;
    }
  >();

  // 添加全文搜索结果
  for (const row of fullTextResult.rows) {
    const templateId = row.template_id;
    const similarity = parseFloat(row.similarity);
    const existing = resultMap.get(templateId);
    // 如果已存在，保留相似度更高的
    if (!existing || similarity > existing.similarity) {
      resultMap.set(templateId, {
        template_id: templateId,
        appid: row.appid,
        spec: row.spec,
        meta: typeof row.meta === 'string' ? JSON.parse(row.meta) : row.meta,
        similarity,
      });
    }
  }

  // 添加向量相似度搜索结果
  for (const row of vectorResult.rows) {
    const templateId = row.template_id;
    const similarity = parseFloat(row.similarity);
    const existing = resultMap.get(templateId);
    // 如果已存在，保留相似度更高的
    if (!existing || similarity > existing.similarity) {
      resultMap.set(templateId, {
        template_id: templateId,
        appid: row.appid,
        spec: row.spec,
        meta: typeof row.meta === 'string' ? JSON.parse(row.meta) : row.meta,
        similarity,
      });
    }
  }

  // 转换为数组并按相似度排序
  const merged = Array.from(resultMap.values());
  merged.sort((a, b) => b.similarity - a.similarity);

  console.log(
    `粗排结果：全文搜索召回 ${fullTextResult.rows.length} 条，向量召回 ${vectorResult.rows.length} 条，合并去重后 ${merged.length} 条`
  );

  return merged;
}

/**
 * 根据排序方式对结果进行排序
 */
function sortResults(
  results: SearchResult[],
  sortType: SortType = 'composite'
): Array<SearchResult & { sort_score?: number; sort_factors?: SortFactors }> {
  const sorted = [...results];

  switch (sortType) {
    case 'latest': {
      // 最新：创建时间降序
      sorted.forEach(result => {
        const timeScore = result.meta.publish_time
          ? new Date(result.meta.publish_time).getTime()
          : 0;
        (result as any).sort_score = timeScore;
        (result as any).sort_factors = {
          similarity: result.similarity,
          composite_score: result.meta.composite_score,
          sales_count: result.meta.sales_count,
          creation_count: result.meta.creation_count,
          publish_time: result.meta.publish_time,
          pin_weight: result.meta.pin_weight,
        };
      });
      sorted.sort((a, b) => {
        const timeA = a.meta.publish_time
          ? new Date(a.meta.publish_time).getTime()
          : 0;
        const timeB = b.meta.publish_time
          ? new Date(b.meta.publish_time).getTime()
          : 0;
        return timeB - timeA;
      });
      break;
    }

    case 'bestseller': {
      // 最畅销：销量降序
      sorted.forEach(result => {
        (result as any).sort_score = result.meta.sales_count;
        (result as any).sort_factors = {
          similarity: result.similarity,
          composite_score: result.meta.composite_score,
          sales_count: result.meta.sales_count,
          creation_count: result.meta.creation_count,
          publish_time: result.meta.publish_time,
          pin_weight: result.meta.pin_weight,
        };
      });
      sorted.sort((a, b) => {
        return b.meta.sales_count - a.meta.sales_count;
      });
      break;
    }

    case 'composite':
    default: {
      // 综合：相似度*0.5+综合排序分*0.5
      sorted.forEach(result => {
        const compositeScore = calculateCompositeScore(
          result.similarity,
          result.meta.composite_score
        );
        result.final_score = compositeScore;
        (result as any).sort_score = compositeScore;
        (result as any).sort_factors = {
          similarity: result.similarity,
          composite_score: result.meta.composite_score,
          sales_count: result.meta.sales_count,
          creation_count: result.meta.creation_count,
          publish_time: result.meta.publish_time,
          pin_weight: result.meta.pin_weight,
        };
      });
      sorted.sort((a, b) => {
        return (b.final_score || 0) - (a.final_score || 0);
      });
      break;
    }
  }

  return sorted as Array<
    SearchResult & { sort_score?: number; sort_factors?: SortFactors }
  >;
}

/**
 * 封装模板搜索函数
 * @param params 搜索参数
 * @param facetOnlyMode 仅标签模式：为 true 时只返回规格数据，不返回模板列表
 * @returns 搜索结果
 */
export async function searchTemplates(
  params: SearchParams,
  facetOnlyMode: boolean = false
): Promise<SearchResponse> {
  const { query, page_size, page, filter, sort = 'composite' } = params;

  // 验证参数
  if (!query || query.trim().length === 0) {
    throw new Error('搜索词不能为空');
  }

  if (page_size <= 0) {
    throw new Error('分页大小必须大于0');
  }

  if (page <= 0) {
    throw new Error('分页号必须大于0');
  }

  // 获取数据库连接池和向量化客户端
  const searchDbPool = getSearchDbPool();
  const embeddingClient = getEmbeddingClient();

  console.time('computeEmbedding');
  // 计算查询文本的向量
  const queryEmbedding = await embeddingClient.computeEmbedding(query);
  console.timeEnd('computeEmbedding');

  console.time('coarseRankingWithFilter');
  // 粗排阶段：使用 testzhcfg 全文搜索召回+向量相似度召回，然后再排序
  const candidates = await coarseRankingWithFilter(
    searchDbPool,
    queryEmbedding,
    query,
    filter
  );
  console.timeEnd('coarseRankingWithFilter');

  // 统计规格数量（基于所有候选结果，无需排序）
  const specCountMap = new Map<string, number>();
  for (const result of candidates) {
    if (result.spec) {
      const currentCount = specCountMap.get(result.spec) || 0;
      specCountMap.set(result.spec, currentCount + 1);
    }
  }
  const specs: SpecStat[] = Array.from(specCountMap.entries()).map(
    ([spec_id, count]) => ({
      spec_id,
      count,
    })
  );

  // 仅标签模式：只返回规格数据，跳过模板列表的计算
  if (facetOnlyMode) {
    return {
      templates: [],
      total: candidates.length,
      page: 1,
      total_pages: 1,
      specs,
    };
  }

  console.time('sortResults');
  // 根据排序方式对结果进行排序
  const sortedResults = sortResults(candidates, sort);
  console.timeEnd('sortResults');

  console.time('paginateResults');
  // 分页处理
  const total = sortedResults.length;
  const total_pages = Math.ceil(total / page_size);
  const startIndex = (page - 1) * page_size;
  const endIndex = startIndex + page_size;
  const paginatedResults = sortedResults.slice(startIndex, endIndex);

  // 直接使用 meta 中的信息拼装结果
  const templatesWithEntity: ExtendedSearchResult[] = paginatedResults.map(
    result => {
      return {
        ...result,
        title: result.meta.title || '',
        coverV3: null,
        sort_score: (result as any).sort_score,
        sort_factors: (result as any).sort_factors,
      };
    }
  );

  return {
    templates: templatesWithEntity,
    total,
    page,
    total_pages,
    specs,
  };
}

/**
 * 阿里云向量化客户端配置
 */
interface AliyunEmbeddingConfig {
  apiKey?: string;
  baseURL?: string;
  model?: string;
}

/**
 * 阿里云向量化 API 响应格式
 */
interface AliyunEmbeddingResponse {
  result?: {
    embeddings?: Array<{
      index: number;
      embedding: number[];
    }>;
  };
  request_id?: string;
  error?: {
    code?: string;
    message?: string;
  };
}

/**
 * 阿里云向量化工具类
 */
export class AliyunEmbedding {
  private apiKey: string;
  private baseURL: string;
  private model: string;

  constructor(config?: AliyunEmbeddingConfig) {
    this.apiKey = process.env.EMBENDED_APIKEY || 'OS-akv3v044697o7828';

    this.baseURL =
      process.env.EMBENDED_BASEURL ||
      'http://default-9n40.platform-cn-shanghai.opensearch.aliyuncs.com';
    this.model = process.env.EMBENDED_MODEL || 'ops-text-embedding-001';

    if (!this.apiKey) {
      throw new Error(
        '缺少阿里云 API Key，请设置 EMBENDED_APIKEY 环境变量'
      );
    }
  }

  /**
   * 调用阿里云文本嵌入 API
   * @param texts 输入文本数组
   * @returns 向量数组的数组
   */
  private async callEmbeddingAPI(texts: string[]): Promise<number[]> {
    const url = `${this.baseURL}/v3/openapi/workspaces/default/text-embedding/${this.model}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        input: texts,
        input_type: 'document',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `阿里云 API 请求失败: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data: AliyunEmbeddingResponse = await response.json();
    if (data.error) {
      throw new Error(
        `阿里云 API 返回错误: ${data.error.code} - ${data.error.message}`
      );
    }

    if (!data.result?.embeddings || data.result.embeddings.length === 0) {
      throw new Error('向量化响应为空');
    }

    // 提取 embedding 数组并按 index 排序
    return data.result.embeddings?.[0].embedding;
  }

  /**
   * 计算单个文本的向量
   * @param text 输入文本
   * @returns 向量数组
   */
  async computeEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error('文本不能为空');
    }

    try {
      const embeddings = await this.callEmbeddingAPI([text]);
      return embeddings;
    } catch (error) {
      console.error('向量化失败:', error);
      throw error;
    }
  }

  /**
   * 获取模型信息（用于获取向量维度等）
   */
  async getModelInfo(): Promise<{ dimension: number }> {
    // 通过一个测试文本获取向量维度
    const testEmbedding = await this.computeEmbedding('test');
    return {
      dimension: testEmbedding.length,
    };
  }
}

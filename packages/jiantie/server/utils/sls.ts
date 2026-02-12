import * as $OpenApi from '@alicloud/openapi-client';
import Sls20201230, * as $Sls20201230 from '@alicloud/sls20201230';
import * as $Util from '@alicloud/tea-util';

// 配置信息（请根据实际情况修改）
const CONFIG = {
  endpoint: process.env.SLS_ENDPOINT || 'cn-beijing.log.aliyuncs.com',
  project: process.env.SLS_PROJECT || '',
  logstore: process.env.SLS_LOGSTORE || '',
  accessKeyId:
    process.env.SLS_ACCESS_KEY_ID ||
    process.env.ALIBABA_CLOUD_ACCESS_KEY_ID ||
    '',
  accessKeySecret:
    process.env.SLS_ACCESS_KEY_SECRET ||
    process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET ||
    '',
};

/**
 * 创建 SLS 客户端
 */
function createClient(): Sls20201230 {
  // 工程代码建议使用更安全的
  // 无AK方式，凭据配置方式请参见：https://help.aliyun.com/document_detail/378664.html
  let config = new $OpenApi.Config({
    accessKeyId: CONFIG.accessKeyId,
    accessKeySecret: CONFIG.accessKeySecret,
  });
  config.endpoint = CONFIG.endpoint;
  return new Sls20201230(config);
}

export interface V11SlsQueryOptions {
  /**
   * 查询语句，例如：
   *  * | SELECT distinct_id, event, page_type, page_id, __time__ as time LIMIT 1000
   */
  query: string;
  /**
   * 开始时间（秒级时间戳）
   */
  from: number;
  /**
   * 结束时间（秒级时间戳）
   */
  to: number;
  /**
   * 是否逆序
   */
  reverse?: boolean;
  /**
   * 覆盖默认 project
   */
  project?: string;
  /**
   * 覆盖默认 logstore
   */
  logstore?: string;
}

export interface V11SlsLogRecord {
  // 原始 key-value 数据
  raw: Record<string, any>;
}

/**
 * 通用的 v11-app-logs 查询工具函数
 * - 封装 GetLogsV2 调用
 * - 把返回的日志数据统一转换为 key-value 对象数组
 */
export async function queryV11SlsLogs(
  options: V11SlsQueryOptions
): Promise<V11SlsLogRecord[]> {
  const client = createClient();
  const project = options.project || CONFIG.project;
  const logstore = options.logstore || CONFIG.logstore;

  const request = new $Sls20201230.GetLogsV2Request({
    project,
    logstore,
    query: options.query,
    from: options.from,
    to: options.to,
    reverse: options.reverse ?? false,
  });

  const headers = new $Sls20201230.GetLogsV2Headers({});
  const runtime = new $Util.RuntimeOptions({});

  const response = await client.getLogsV2WithOptions(
    project,
    logstore,
    request,
    headers,
    runtime
  );

  const data = response.body?.data;
  if (!data || data.length === 0) {
    return [];
  }

  const result: V11SlsLogRecord[] = [];

  for (const log of data as any[]) {
    const logData: Record<string, any> = {};

    // SLS 可能返回数组形式或对象形式
    if (Array.isArray(log)) {
      for (const item of log) {
        if (item && item.key && item.value !== undefined) {
          logData[item.key] = item.value;
        }
      }
    } else if (typeof log === 'object' && log !== null) {
      Object.assign(logData, log);
    }

    result.push({ raw: logData });
  }
  return result;
}

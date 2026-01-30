import { prisma } from '@mk/jiantie/v11-database';

/**
 * 记录 v5sync API 调用日志
 * @param apiPath API 路径，如：user-register、user-login 等
 * @param requestData 请求数据
 * @param responseData 响应数据
 * @param status 状态：success 或 failed
 * @param httpStatus HTTP 状态码
 * @param errorMessage 错误信息（可选）
 */
export async function logV5SyncApi(
  apiPath: string,
  requestData: any,
  responseData: any,
  status: 'success' | 'failed',
  httpStatus?: number,
  errorMessage?: string
) {
  try {
    await prisma.v5SyncLog.create({
      data: {
        api_path: apiPath,
        request_data: requestData,
        response_data: responseData,
        status: status,
        http_status: httpStatus || null,
        error_message: errorMessage || null,
      },
    });
  } catch (error) {
    // 日志记录失败不应该影响主业务逻辑，只记录错误
    console.error('[V5Sync Log] 记录日志失败:', error);
  }
}

import axios, { AxiosRequestConfig } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { HttpProxyAgent } from 'http-proxy-agent';

/**
 * 创建支持代理的 fetch 函数（基于 axios）
 * 用于在需要代理的环境下，将 axios 请求转换为 fetch 兼容的响应
 * @returns fetch 函数，如果未配置代理则返回原生 fetch
 */
export function createProxyFetch(): typeof fetch {
  const proxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy;

  if (!proxyUrl) {
    return fetch;
  }

  try {
    // 创建 axios 实例，配置代理
    const httpsAgent = new HttpsProxyAgent(proxyUrl);
    const httpAgent = new HttpProxyAgent(proxyUrl);

    const axiosInstance = axios.create({
      timeout: 60000,
      httpAgent,
      httpsAgent,
    });

    // 将 axios 请求转换为 fetch 兼容的响应
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const method = init?.method || 'GET';
      const headers = (init?.headers as Record<string, string>) || {};
      const body = init?.body as any;

      try {
        const config: AxiosRequestConfig = {
          method: method.toLowerCase() as any,
          url,
          headers,
          data: body,
          responseType: 'arraybuffer',
          validateStatus: () => true, // 不抛出错误，让 fetch 处理所有状态码
        };

        // 处理 AbortSignal
        if (init?.signal) {
          config.signal = init.signal;
        }

        const response = await axiosInstance.request(config);

        // 将 axios 响应转换为 fetch Response
        const responseBody = Buffer.from(response.data);
        const responseHeaders = new Headers();

        Object.keys(response.headers).forEach(key => {
          const value = response.headers[key];
          if (value) {
            responseHeaders.set(key, String(value));
          }
        });

        return new Response(responseBody, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
        });
      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`请求失败: ${error.message}`);
        }
        throw error;
      }
    };
  } catch (error) {
    console.warn('[AI Generate API] 代理配置失败，使用直接连接:', error);
    return fetch;
  }
}

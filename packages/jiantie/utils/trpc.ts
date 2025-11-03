import { getAppId, getToken, getUid } from '@/services';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@workspace/server';

/**
 * tRPC 客户端配置
 * 用于在客户端调用 tRPC API
 */
export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: '/api/trpc',
      // 自动添加请求头
      headers() {
        const uid = getUid();
        const token = getToken();
        const appid = getAppId();

        return {
          'x-uid': uid || '',
          'x-token': token || '',
          'x-appid': appid || '',
        };
      },
    }),
  ],
});

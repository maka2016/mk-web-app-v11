import { appRouter, createContext } from '@/server';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

// 强制动态渲染，禁用所有缓存
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * tRPC API handler for Next.js App Router
 * Handles all tRPC requests at /api/trpc/*
 *
 * 注意：在 Next.js App Router 中，如果配置了 basePath，Next.js 会自动处理路由，
 * API 路由处理器接收到的请求路径已经去掉了 basePath，所以 endpoint 应该是不包含 basePath 的路径。
 */
const handler = async (req: Request) => {
  const response = await fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
    onError: ({ path, error, type, ctx }) => {
      // 记录错误日志供内部调试
      console.error('tRPC Error:', {
        path,
        type,
        code: error.code,
        message: String(error.message || 'Unknown error'),
        // 记录用户信息方便排查
        uid: ctx?.uid,
        appid: ctx?.appid,
        // 详细错误信息
        cause: error.cause,
        // stack: error.stack,
      });
    },
    responseMeta() {
      // 返回禁用缓存的响应头
      return {
        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      };
    },
  });

  return response;
};

export { handler as GET, handler as POST };

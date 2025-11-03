import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter, createContext } from '@workspace/server';

// 强制动态渲染，禁用所有缓存
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * tRPC API handler for Next.js App Router
 * Handles all tRPC requests at /api/trpc/*
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
        stack: error.stack,
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

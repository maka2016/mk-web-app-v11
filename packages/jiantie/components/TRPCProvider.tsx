'use client';

import { getTRPCHeaders, trpcReact, trpcUrl } from '@/utils/trpc';
import { defaultShouldDehydrateQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { useState } from 'react';
import superjson from 'superjson';

/**
 * tRPC Provider 组件
 * 用于在 React 应用中提供 tRPC 和 React Query 的上下文
 */
export function TRPCProvider({ children }: { children: React.ReactNode }) {
  // 创建 QueryClient 实例（使用 useState 确保在客户端只创建一次）
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30 * 1000,
        },
        dehydrate: {
          // serializeData: superjson.serialize,
          shouldDehydrateQuery: (query) =>
            defaultShouldDehydrateQuery(query) ||
            query.state.status === 'pending',
        },
        hydrate: {
          // deserializeData: superjson.deserialize,
        },
      },
    })
  );

  // 创建 tRPC 客户端实例
  const [trpcClient] = useState(() =>
    trpcReact.createClient({
      links: [
        httpBatchLink({
          url: trpcUrl,
          headers: getTRPCHeaders,
          transformer: superjson,
        }),
      ],
    })
  );

  return (
    <trpcReact.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpcReact.Provider>
  );
}

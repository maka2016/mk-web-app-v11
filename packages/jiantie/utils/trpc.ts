import type { AppRouter, SerializedWorksEntityForClient } from '@/server';
import { getAppId, getToken, getUid } from '@/services';
import { getCookie } from '@/utils/cookie';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import superjson from 'superjson';

/**
 * 客户端使用的作品实体类型
 * tRPC 传输时会将 Date 序列化为 string，此类型反映实际接收到的数据结构
 */
export type SerializedWorksEntity = SerializedWorksEntityForClient;

/**
 * 获取 basePath
 * Next.js 会将 basePath 存储在 window.__NEXT_DATA__.basePath 中
 */
const getBasePath = (): string => {
  // 在浏览器环境中，从 Next.js 的全局数据获取（这是 Next.js 的标准方式）
  if (typeof window !== 'undefined') {
    const nextData = (window as any).__NEXT_DATA__;
    if (nextData?.basePath) {
      return nextData.basePath;
    }
  }

  // 服务端渲染时，从环境变量获取
  // 注意：在 next.config.ts 中，BASEPATH 已经被添加到 env 对象中
  if (typeof process !== 'undefined' && process.env.BASEPATH) {
    return process.env.BASEPATH;
  }

  return '';
};

/**
 * 获取 tRPC URL
 */
const basePath = getBasePath();
export const trpcUrl = basePath ? `${basePath}/api/trpc` : '/api/trpc';

/**
 * 获取请求头
 */
export const getTRPCHeaders = () => {
  const uid = getUid();
  const token = getToken();
  const appid = getAppId();
  const adminUserId = typeof window !== 'undefined' ? getCookie('admin_user_id') : null;

  const headers: Record<string, string> = {
    'x-uid': uid || '',
    'x-token': token || '',
    'x-appid': appid || '',
  };

  // 如果存在管理员ID，添加到请求头
  if (adminUserId) {
    headers['x-admin-user-id'] = adminUserId;
  }

  return headers;
};

/**
 * tRPC React hooks 客户端
 * 用于在 React 组件中使用 tRPC hooks（推荐方式）
 *
 * 使用示例：
 * ```tsx
 * const { data, isLoading } = trpc.works.findMany.useQuery({ uid: 123 });
 * const mutation = trpc.works.create.useMutation();
 * ```
 */
export const trpcReact = createTRPCReact<AppRouter>();

/**
 * tRPC 普通客户端（用于非 React 环境或直接调用）
 * 用于在客户端直接调用 tRPC API（不使用 hooks）
 *
 * 使用示例：
 * ```tsx
 * const data = await trpcClient.works.findMany.query({ uid: 123 });
 * ```
 */
export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: trpcUrl,
      headers: getTRPCHeaders,
      transformer: superjson,
    }),
  ],
});

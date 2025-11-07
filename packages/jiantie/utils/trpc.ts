import { getAppId, getToken, getUid } from '@/services';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { WorksEntity } from '@workspace/database/generated/client';
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

/**
 * tRPC 传输类型：将 Date 类型转换为 string
 * tRPC 通过 JSON 序列化传输数据，Date 会被转换为 string
 */
export type SerializedWorksEntity = Omit<
  WorksEntity,
  'create_time' | 'update_time' | 'custom_time'
> & {
  create_time: string;
  update_time: string;
  custom_time: string | null;
};

/**
 * 类型安全的 tRPC 包装函数
 * 用于避免 "Type instantiation is excessively deep" 错误
 */
export const trpcWorks = {
  /**
   * 查询作品列表
   */
  findMany: async (
    input?: Parameters<typeof trpc.works.findMany.query>[0]
  ): Promise<SerializedWorksEntity[]> => {
    return (await trpc.works.findMany.query(input)) as any;
  },

  /**
   * 统计作品数量
   */
  count: async (
    input?: Parameters<typeof trpc.works.count.query>[0]
  ): Promise<number> => {
    return (await trpc.works.count.query(input)) as any;
  },

  /**
   * 删除作品
   */
  delete: async (input: { id: string }): Promise<SerializedWorksEntity> => {
    return (await trpc.works.delete.mutate(input)) as any;
  },

  /**
   * 复制作品
   */
  duplicate: async (input: { id: string }): Promise<SerializedWorksEntity> => {
    return (await trpc.works.duplicate.mutate(input)) as any;
  },
};

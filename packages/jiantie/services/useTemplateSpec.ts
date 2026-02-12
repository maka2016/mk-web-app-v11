import { trpc } from '@/utils/trpc';
import { useCallback, useEffect, useState } from 'react';

// 全局缓存和批量处理状态
const templateSpecCache: Record<string, string> = {};

interface PendingRequest {
  resolve: (value: string) => void;
  reject: (error: unknown) => void;
}

const pendingRequests: Map<string, PendingRequest[]> = new Map();
let batchTimer: NodeJS.Timeout | null = null;
const BATCH_SIZE = 50; // 批量大小
const BATCH_TIMEOUT = 100; // 超时时间100ms

const processBatch = async () => {
  if (pendingRequests.size === 0) {
    return;
  }

  // 获取当前批次的所有 template_id
  const templateIds = Array.from(pendingRequests.keys());
  const currentBatch = new Map(pendingRequests);

  // 清空待处理队列
  pendingRequests.clear();

  try {
    // 批量调用 tRPC API
    const data = await trpc.template.findTemplateSpec.query({
      template_ids: templateIds,
    });

    // 更新缓存并分发结果
    templateIds.forEach(template_id => {
      const specName =
        data[template_id]?.display_name || data[template_id]?.name || '';
      templateSpecCache[template_id] = specName;

      // 解析所有等待该 template_id 的 Promise
      const requests = currentBatch.get(template_id) || [];
      requests.forEach(({ resolve }) => {
        resolve(specName);
      });
    });
  } catch (error) {
    console.error('Template-card batch request failed:', error);

    // 批量请求失败时，所有请求都返回空字符串
    currentBatch.forEach(requests => {
      requests.forEach(({ resolve }) => {
        resolve('');
      });
    });
  }
};

const fetchTemplateSpec = async (template_id: string): Promise<string> => {
  // 如果已有缓存，直接返回
  if (templateSpecCache[template_id]) {
    return templateSpecCache[template_id];
  }

  return new Promise((resolve, reject) => {
    // 添加到待处理队列
    if (!pendingRequests.has(template_id)) {
      pendingRequests.set(template_id, []);
    }
    pendingRequests.get(template_id)?.push({ resolve, reject });

    // 如果达到批量大小，立即处理
    if (pendingRequests.size >= BATCH_SIZE) {
      if (batchTimer) {
        clearTimeout(batchTimer);
        batchTimer = null;
      }
      processBatch();
    } else {
      // 如果没有定时器，设置超时处理
      if (!batchTimer) {
        batchTimer = setTimeout(() => {
          batchTimer = null;
          processBatch();
        }, BATCH_TIMEOUT);
      }
    }
  });
};

/**
 * 获取模板规格名称的 Hook
 * @param template_id 模板ID
 * @returns {object} { specName: string | undefined, isLoading: boolean, error: Error | null, refetch: () => void }
 */
export const useTemplateSpec = (template_id: string) => {
  const [specName, setSpecName] = useState<string | undefined>(
    templateSpecCache[template_id] || undefined
  );
  const [isLoading, setIsLoading] = useState<boolean>(
    !templateSpecCache[template_id]
  );
  const [error, setError] = useState<Error | null>(null);

  const fetchSpec = useCallback(async () => {
    if (!template_id) return;

    // 如果已有缓存，直接使用缓存
    if (templateSpecCache[template_id]) {
      setSpecName(templateSpecCache[template_id]);
      setIsLoading(false);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const result = await fetchTemplateSpec(template_id);
      setSpecName(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setSpecName('');
    } finally {
      setIsLoading(false);
    }
  }, [template_id]);

  // 手动重新获取数据的函数
  const refetch = useCallback(() => {
    // 清除该 template_id 的缓存
    delete templateSpecCache[template_id];
    setSpecName(undefined);
    fetchSpec();
  }, [template_id, fetchSpec]);

  useEffect(() => {
    fetchSpec();
  }, [fetchSpec]);

  return {
    specName,
    isLoading,
    error,
    refetch,
  };
};

/**
 * 批量预取模板规格数据
 * @param template_ids 模板ID数组
 */
export const preloadTemplateSpecs = async (template_ids: string[]) => {
  const uncachedIds = template_ids.filter(id => !templateSpecCache[id]);

  if (uncachedIds.length === 0) {
    return; // 全部已缓存
  }

  try {
    // 使用 tRPC API
    const data = await trpc.template.findTemplateSpec.query({
      template_ids: uncachedIds,
    });

    // 更新缓存
    uncachedIds.forEach(template_id => {
      const specName =
        data[template_id]?.display_name || data[template_id]?.name || '';
      templateSpecCache[template_id] = specName;
    });
  } catch (error) {
    console.error('Preload template specs failed:', error);
  }
};

'use client';

import { useEffect, useRef } from 'react';

/**
 * 页面超时自动刷新组件
 * 每20秒检查一次，如果页面打开时间超过30分钟，则自动刷新页面
 */
export const PageTimeoutRefresh = () => {
  const pageOpenTimeRef = useRef<number>(0);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 记录页面打开时间
    pageOpenTimeRef.current = Date.now();

    // 设置定时检查，每20秒检查一次
    checkIntervalRef.current = setInterval(() => {
      console.log('检查页面超时');
      const now = Date.now();
      const elapsed = now - pageOpenTimeRef.current;
      const thirtyMinutes = 3600 * 1000; // 30分钟的毫秒数

      if (elapsed >= thirtyMinutes) {
        // 超过30分钟，刷新页面
        window.location.reload();
      }
    }, 20 * 1000); // 每20秒检查一次

    // 清理函数
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  return null;
};

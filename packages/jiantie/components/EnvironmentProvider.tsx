'use client';

import { useEffect } from 'react';
import { environmentStore } from '@/store';

/**
 * 环境 Provider 组件
 * 自动初始化全局环境信息
 * 在 app/layout.tsx 中使用
 */
export const EnvironmentProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  useEffect(() => {
    // 初始化环境信息
    environmentStore.init();
  }, []);

  return <>{children}</>;
};

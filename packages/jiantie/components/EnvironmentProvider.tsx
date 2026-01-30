'use client';

import { useEffect } from 'react';
import { environmentStore } from '../store';
import { isIOS } from '../utils/devices';
import useIsMobile from '../utils/use-mobile';

/**
 * 环境 Provider 组件
 * 自动初始化全局环境信息
 * 在 app/layout.tsx 中使用
 */
export const EnvironmentProvider = ({
  children,
  userAgent,
}: {
  children: React.ReactNode;
  userAgent: string;
}) => {
  const isMobile = useIsMobile(userAgent);
  useEffect(() => {
    // 初始化环境信息
    environmentStore.init({ isMobile });

    // 根据设备类型设置 dvh 高度值
    // iOS 使用 100dvh，Android 使用 100vh
    if (isIOS()) {
      document.documentElement.style.setProperty('--dvh-height', '100dvh');
    } else {
      document.documentElement.style.setProperty('--dvh-height', '100vh');
    }
  }, []);

  return <>{children}</>;
};

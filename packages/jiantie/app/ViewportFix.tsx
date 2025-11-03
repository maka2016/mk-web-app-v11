// app/layout.tsx 或 app/providers.tsx 中 useEffect 执行一次（客户端执行）

'use client';

import { useEffect } from 'react';

export function ViewportFix() {
  useEffect(() => {
    const fixedViewport = document.createElement('meta');
    fixedViewport.name = 'viewport';
    fixedViewport.content = 'width=376, user-scalable=no';

    // 移除所有已有的 viewport 标签（Next.js 会插入）
    const existingViewports = document.querySelectorAll('meta[name=viewport]');
    console.log('existingViewports', existingViewports);
    existingViewports.forEach(el => el?.remove());

    // 插入你自己的
    document.head.appendChild(fixedViewport);
  }, []);

  return null;
}

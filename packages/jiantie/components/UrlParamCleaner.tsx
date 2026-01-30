'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * URL 参数清理组件
 * 检测 URL 上的 appid 参数，如果有多个，则保留第一个，删除多余的
 */
export const UrlParamCleaner = () => {
  const pathname = usePathname();
  const router = useRouter();
  const hasCleanedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || hasCleanedRef.current) return;

    const search = window.location.search;
    if (!search) {
      hasCleanedRef.current = true;
      return;
    }

    // 直接从 URL 字符串中解析所有参数，确保能检测到重复的 appid
    const searchString = search.slice(1); // 去掉开头的 '?'
    const pairs = searchString.split('&');
    const appidValues: string[] = [];
    const otherParams: Array<[string, string]> = [];

    pairs.forEach(pair => {
      const [key, value = ''] = pair.split('=');
      if (key === 'appid') {
        appidValues.push(decodeURIComponent(value));
      } else if (key) {
        otherParams.push([key, decodeURIComponent(value)]);
      }
    });

    // 如果有多个 appid 参数，需要清理
    if (appidValues.length > 1) {
      // 保留第一个 appid 值
      const firstAppid = appidValues[0];

      // 构建新的查询参数
      const newSearchParams = new URLSearchParams();

      // 先添加第一个 appid
      newSearchParams.set('appid', firstAppid);

      // 然后添加其他参数
      otherParams.forEach(([key, value]) => {
        newSearchParams.append(key, value);
      });

      // 构建新的 URL
      const newUrl = `${pathname}${newSearchParams.toString() ? `?${newSearchParams.toString()}` : ''}`;

      // 使用 replace 替换当前 URL，避免在历史记录中留下痕迹
      router.replace(newUrl);
      hasCleanedRef.current = true;
    } else {
      hasCleanedRef.current = true;
    }
  }, [pathname, router]);

  return null;
};

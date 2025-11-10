'use client';

import APPBridge from '@mk/app-bridge';
import { useRouter } from 'next/navigation';

const buildAbsoluteUrl = (href: string) => {
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return href;
  }
  if (href.startsWith('//')) {
    if (typeof window === 'undefined') {
      return `https:${href}`;
    }
    return `${window.location.protocol}${href}`;
  }
  if (typeof window === 'undefined') {
    return href;
  }
  if (href.startsWith('/')) {
    return `${window.location.origin}${href}`;
  }
  return `${window.location.origin}/${href}`;
};

export const useRouter2 = () => {
  const router = useRouter();

  const push: typeof router.push = (href, options) => {
    if (typeof window !== 'undefined') {
      try {
        if (APPBridge.judgeIsInApp()) {
          const url = buildAbsoluteUrl(String(href));
          APPBridge.navToPage({
            url,
            type: 'URL',
          });
          return;
        }
      } catch (error) {
        console.error('useRouter2 push fallback to next router:', error);
      }
    }
    return router.push(href, options);
  };

  return {
    ...router,
    push,
  };
};

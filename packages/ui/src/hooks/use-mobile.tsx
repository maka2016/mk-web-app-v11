import { useEffect, useState } from 'react';

/**
 * 根据 user-agent 判断是否是移动设备
 */
function isMobileDevice(userAgent?: string): boolean {
  if (!userAgent) return false;
  const mobileRegex =
    /Mobile|Android|iP(hone|od|ad)|BlackBerry|IEMobile|Opera Mini/i;
  return mobileRegex.test(userAgent);
}

const useIsMobile = (initialUserAgent?: string) => {
  // 在 SSR 阶段，使用 user-agent 来判断初始值
  // 如果没有提供 user-agent，默认使用 true（保持向后兼容）
  const initialIsMobile =
    typeof window === 'undefined' && initialUserAgent
      ? isMobileDevice(initialUserAgent)
      : initialUserAgent
        ? isMobileDevice(initialUserAgent)
        : true;

  const [isMobile, setIsMobile] = useState(initialIsMobile);

  useEffect(() => {
    // 客户端检测屏幕宽度
    const checkIsMobile = () => {
      setIsMobile(document.body.clientWidth < 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  return isMobile;
};

export default useIsMobile;

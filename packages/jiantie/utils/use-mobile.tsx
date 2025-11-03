import { useEffect, useState } from 'react';

const useIsMobile = (userAgent?: string) => {
  const [isMobile, setIsMobile] = useState(true);

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

  // 如果是 SSR 阶段，使用 user-agent 判断是否是移动设备
  if (typeof window === 'undefined' && userAgent) {
    const mobileRegex =
      /Mobile|Android|iP(hone|od|ad)|BlackBerry|IEMobile|Opera Mini/i;
    return mobileRegex.test(userAgent);
  }

  return isMobile;
};

export default useIsMobile;

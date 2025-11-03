'use client';

import { useEffect, useRef, useState } from 'react';

interface ScrollableContentProps {
  children: React.ReactNode;
  onScrollEnd?: () => void;
}

/**
 * 可滚动内容容器
 * 优化移动端滚动体验，支持下拉刷新等
 */
export const ScrollableContent: React.FC<ScrollableContentProps> = ({
  children,
  onScrollEnd,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceToBottom = scrollHeight - scrollTop - clientHeight;

      // 接近底部时触发
      if (distanceToBottom < 100 && !isNearBottom) {
        setIsNearBottom(true);
        onScrollEnd?.();
      } else if (distanceToBottom >= 100 && isNearBottom) {
        setIsNearBottom(false);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isNearBottom, onScrollEnd]);

  return (
    <div
      ref={containerRef}
      className='flex-1 overflow-auto'
      style={{
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
      }}
    >
      {children}
    </div>
  );
};

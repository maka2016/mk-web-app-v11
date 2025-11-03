import React, { useEffect, useRef, forwardRef } from 'react';
import styled from '@emotion/styled';

// 外层定位容器
const OuterContainer = styled.div`
  position: absolute;
  pointer-events: none !important;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  overflow: hidden; /* 确保视差内容不会超出容器 */
`;

// 内层视差容器
const InnerContainer = styled.div<{ hasParallax: boolean }>`
  position: absolute !important;
  place-self: unset !important;
  pointer-events: none !important;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  transform: translateY(0);
`;

export interface BgContainerProps {
  children?: React.ReactNode;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  parallaxScrollBgConfig?: {
    coefficient: number;
  };
  [key: string]: any;
}

const BgContainer = forwardRef<HTMLDivElement, BgContainerProps>(
  ({ children, parallaxScrollBgConfig, style, ...props }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);
    const finalRef = (ref || containerRef) as React.RefObject<HTMLDivElement>;
    const hasParallax = !!parallaxScrollBgConfig?.coefficient;

    // 视差滚动效果
    useEffect(() => {
      if (!hasParallax || !innerRef.current) return;
      const scrollDOM =
        document.querySelector<HTMLDivElement>(`#designer_scroll_container`) ||
        document.querySelector<HTMLDivElement>(`#auto-scroll-container`);
      if (!scrollDOM) return;

      const handleScroll = () => {
        const scrollY = scrollDOM.scrollTop;
        const coefficient = parallaxScrollBgConfig!.coefficient;

        // 计算视差偏移量并应用到内层容器
        const offset = scrollY * coefficient;
        innerRef.current!.style.transform = `translateY(${offset}px)`;
      };

      // 添加滚动监听器
      scrollDOM.addEventListener('scroll', handleScroll, { passive: true });

      // 初始化时调用一次
      handleScroll();

      return () => {
        scrollDOM.removeEventListener('scroll', handleScroll);
      };
    }, [hasParallax, parallaxScrollBgConfig?.coefficient]);

    return (
      <OuterContainer className='OuterContainer' ref={finalRef} {...props}>
        <InnerContainer
          className='InnerContainer'
          ref={innerRef}
          hasParallax={hasParallax}
          style={style}
        >
          {children}
        </InnerContainer>
      </OuterContainer>
    );
  }
);

BgContainer.displayName = 'BgContainer';

export default BgContainer;

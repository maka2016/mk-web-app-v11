'use client';

import { type EditionType } from '@/app/mobile/channel2/homev2/components/edition-select-modal';
import { useEffect, useRef, useState } from 'react';

// 解析十六进制颜色为 RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  return { r, g, b };
};

// 基于主题色生成浅色占位符颜色
const generatePlaceholderFromTheme = (
  themeColor: string,
  seed: number
): string => {
  const { r, g, b } = hexToRgb(themeColor);
  // 将主题色混合白色，生成浅色变体（85%~92% 白色混合）
  const mix = 0.85 + (seed % 8) * 0.01;
  const pr = Math.floor(r + (255 - r) * mix);
  const pg = Math.floor(g + (255 - g) * mix);
  const pb = Math.floor(b + (255 - b) * mix);
  return `rgb(${pr}, ${pg}, ${pb})`;
};

// 生成随机粉色系颜色（兜底）
const generateRandomPinkColor = (
  edition: EditionType,
  seed: number
): string => {
  if (edition === 'personal') {
    // 个人版：粉红色系
    const r = Math.floor(240 + (seed % 16));
    const g = Math.floor(180 + (seed % 41));
    const b = Math.floor(200 + (seed % 41));
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // 商业版：粉蓝色系
    const r = Math.floor(180 + (seed % 41));
    const g = Math.floor(200 + (seed % 41));
    const b = Math.floor(240 + (seed % 16));
    return `rgb(${r}, ${g}, ${b})`;
  }
};

// 懒加载图片组件
export interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  edition: EditionType;
  templateId?: string; // 用于生成稳定的随机颜色
  coverSrc?: string;
  themeColor?: string; // 主题色（十六进制），传入后占位符基于主题色生成
}

export const LazyImage = ({
  src,
  coverSrc,
  alt,
  className,
  style,
  onLoad,
  edition,
  templateId,
  themeColor,
}: LazyImageProps) => {
  const [loadPriority, setLoadPriority] = useState<'high' | 'low' | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);
  const imageElementRef = useRef<HTMLImageElement>(null);
  const currentSrcRef = useRef<string>(src);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadedRef = useRef(false); // 使用 ref 跟踪 isLoaded 的最新值

  // 使用 templateId 生成稳定的随机颜色，如果没有则使用随机数
  const placeholderColor = useState(() => {
    let seed: number;
    if (templateId) {
      // 使用 templateId 的哈希值生成稳定的颜色
      let hash = 0;
      for (let i = 0; i < templateId.length; i++) {
        hash = templateId.charCodeAt(i) + ((hash << 5) - hash);
      }
      seed = Math.abs(hash) % 1000;
    } else {
      seed = Math.floor(Math.random() * 1000);
    }
    // 优先使用主题色生成占位色
    if (themeColor) {
      return generatePlaceholderFromTheme(themeColor, seed);
    }
    return generateRandomPinkColor(edition, seed);
  })[0];

  // 同步 isLoaded 到 ref
  useEffect(() => {
    isLoadedRef.current = isLoaded;
  }, [isLoaded]);

  // 当 src 改变时，更新 currentSrcRef 并重置加载状态
  useEffect(() => {
    if (currentSrcRef.current !== src) {
      currentSrcRef.current = src;
      // 异步重置状态，避免同步 setState
      // setTimeout(() => {
      //   setIsLoaded(false);
      //   isLoadedRef.current = false;
      //   setLoadPriority(null);
      //   setShouldLoad(false);
      // }, 0);
    }
  }, [src]);

  // 使用 Intersection Observer 持续监听图片是否在视野区
  useEffect(() => {
    const element = imgRef.current;
    if (!element) return;

    // 创建观察器，同时监听进入和离开视野区
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        const isIntersecting = entry.isIntersecting;
        const rect = entry.boundingClientRect;
        const viewportHeight = window.innerHeight;

        // 判断是否在视口内（高优先级区域）
        const isInViewport =
          rect.top >= 0 && rect.top < viewportHeight && rect.bottom > 0;

        // 判断是否在预加载区域（视口下方400px内）
        const isInPreloadZone =
          rect.top < viewportHeight + 400 && rect.bottom > -200;

        if (isIntersecting && isInViewport) {
          // 在视口内：立即高优先级加载
          if (loadTimerRef.current) {
            clearTimeout(loadTimerRef.current);
            loadTimerRef.current = null;
          }
          setLoadPriority('high');
          setShouldLoad(true);
        } else if (isIntersecting && isInPreloadZone && !isLoadedRef.current) {
          // 在预加载区域：延迟低优先级加载
          if (loadTimerRef.current) {
            clearTimeout(loadTimerRef.current);
          }
          loadTimerRef.current = setTimeout(() => {
            // 再次检查是否还在预加载区域且未加载完成
            if (!isLoadedRef.current) {
              setLoadPriority('low');
              setShouldLoad(true);
            }
          }, 100);
        } else {
          // 离开视野区或不在加载区域：清理定时器，但不取消已开始的加载
          if (loadTimerRef.current) {
            clearTimeout(loadTimerRef.current);
            loadTimerRef.current = null;
          }
          // 不再取消加载，让已开始的加载继续完成
        }
      },
      {
        root: null,
        rootMargin: '400px 0px', // 预加载区域：视口下方400px，上方200px
        threshold: 0.01,
      }
    );

    observerRef.current.observe(element);

    return () => {
      if (loadTimerRef.current) {
        clearTimeout(loadTimerRef.current);
      }
      observerRef.current?.disconnect();
    };
  }, []); // 观察器应该持续运行，使用 ref 来获取最新状态

  return (
    <div ref={imgRef} className={className} style={style}>
      {shouldLoad && loadPriority ? (
        <>
          {/* 占位符背景 */}
          <div
            className='absolute inset-0'
            style={{
              backgroundImage: coverSrc ? `url(${coverSrc})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'top',
              backgroundRepeat: 'no-repeat',
              backgroundColor: placeholderColor,
            }}
          />

          {/* 图片 - 只有 shouldLoad 为 true 时才渲染，离开视野区时会自动卸载从而取消加载 */}
          {shouldLoad && (
            <img
              key={`${src}-${loadPriority}`}
              ref={imageElementRef}
              src={src}
              alt={alt}
              className='w-full h-full object-cover object-top relative z-10'
              fetchPriority={loadPriority}
              loading={loadPriority === 'low' ? 'lazy' : 'eager'}
              onLoad={() => {
                // 检查是否是当前 src 的加载完成事件
                const img = imageElementRef.current;
                if (img && currentSrcRef.current === src && shouldLoad) {
                  setIsLoaded(true);
                  isLoadedRef.current = true;
                  onLoad?.();
                }
              }}
              onError={() => {
                // 加载失败时也重置状态
                // setIsLoaded(false);
                isLoadedRef.current = false;
              }}
              style={{ opacity: isLoaded ? 1 : 0, transition: 'opacity 0.3s' }}
            />
          )}
        </>
      ) : (
        <div
          className='w-full h-full'
          style={{ backgroundColor: placeholderColor }}
        ></div>
      )}
    </div>
  );
};

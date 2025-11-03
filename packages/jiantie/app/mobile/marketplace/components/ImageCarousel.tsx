'use client';

import { cdnApi } from '@mk/services';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface ImageCarouselProps {
  images: Array<{
    url: string;
    alt?: string;
  }>;
  onImageClick?: (index: number) => void;
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  onImageClick,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: 'center',
    skipSnaps: false,
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi]
  );

  const handleImageClick = useCallback(
    (index: number) => {
      if (onImageClick) {
        onImageClick(index);
      } else {
        setIsFullscreen(true);
      }
    },
    [onImageClick]
  );

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrentIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect).on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  if (images.length === 0) {
    return null;
  }

  return (
    <>
      <div className='relative w-full aspect-[3/4] bg-gray-100'>
        {/* Embla Carousel 容器 */}
        <div className='embla w-full h-full' ref={emblaRef}>
          <div className='embla__container flex h-full'>
            {images.map((image, index) => (
              <div
                key={index}
                className='embla__slide flex-[0_0_100%] min-w-0'
                onClick={() => handleImageClick(index)}
              >
                <img
                  src={cdnApi(image.url, { resizeWidth: 800 })}
                  alt={image.alt || `预览图 ${index + 1}`}
                  className='w-full h-full object-cover cursor-pointer'
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
              </div>
            ))}
          </div>
        </div>

        {/* 左右切换按钮（桌面端） */}
        {images.length > 1 && (
          <>
            <button
              onClick={scrollPrev}
              className='hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center bg-black/50 hover:bg-black/70 rounded-full text-white transition-all z-10'
              aria-label='上一张'
            >
              <ChevronLeft className='w-6 h-6' />
            </button>
            <button
              onClick={scrollNext}
              className='hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center bg-black/50 hover:bg-black/70 rounded-full text-white transition-all z-10'
              aria-label='下一张'
            >
              <ChevronRight className='w-6 h-6' />
            </button>
          </>
        )}

        {/* 指示器 */}
        {images.length > 1 && (
          <div className='absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 px-3 py-2 bg-black/50 rounded-full z-10'>
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollTo(index)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  index === currentIndex
                    ? 'bg-white w-6'
                    : 'bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`查看第 ${index + 1} 张图片`}
              />
            ))}
          </div>
        )}

        {/* 计数器 */}
        {images.length > 1 && (
          <div className='absolute top-4 right-4 px-3 py-1 bg-black/50 text-white text-sm rounded-full z-10'>
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* 全屏查看模式 */}
      {isFullscreen && (
        <div
          className='fixed inset-0 z-50 bg-black flex items-center justify-center'
          onClick={() => setIsFullscreen(false)}
        >
          <button
            className='absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full text-white z-10'
            onClick={() => setIsFullscreen(false)}
            aria-label='关闭'
          >
            ✕
          </button>
          <div className='relative w-full h-full flex items-center justify-center'>
            <img
              src={cdnApi(images[currentIndex].url)}
              alt={images[currentIndex].alt || `预览图 ${currentIndex + 1}`}
              className='max-w-full max-h-full object-contain'
            />
          </div>
          {images.length > 1 && (
            <>
              <button
                onClick={e => {
                  e.stopPropagation();
                  scrollPrev();
                }}
                className='absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full text-white z-10'
              >
                <ChevronLeft className='w-8 h-8' />
              </button>
              <button
                onClick={e => {
                  e.stopPropagation();
                  scrollNext();
                }}
                className='absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full text-white z-10'
              >
                <ChevronRight className='w-8 h-8' />
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
};

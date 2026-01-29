import { cdnApi } from '@/services';
import { EmblaCarouselType, EmblaOptionsType } from 'embla-carousel';
import Autoplay from 'embla-carousel-autoplay';
import Fade from 'embla-carousel-fade';
import useEmblaCarousel from 'embla-carousel-react';
import React, { useCallback, useEffect, useRef } from 'react';
import { DotButton, useDotButton } from './EmblaCarouselDotButton';

export const removeOssParamRegex = (url: string) => {
  return (
    url
      // 步骤1：移除x-oss-process参数（含前后分隔符）
      .replace(
        /([?&])x-oss-process=[^&#]*(&|$)/g,
        (match, p1, p2) => (p2 === '&' ? p1 : '') // 动态保留分隔符
      )
      // 步骤2：清理残留的?或&符号
      .replace(/(\?|&)+$/, '') // 移除末尾的?或&
      .replace(/\?&/, '?') // 处理?a&b → ?a&b
      .replace(/&&+/g, '&')
  ); // 合并多个&
};

type EmblaEventType = any;
const TWEEN_FACTOR_BASE: Record<string, number> = {
  opacity: 0.5,
  scale: 0.2,
  default: 0.2,
  thumbnails: 0.2,
  fade: 0.2,
};

const numberWithinRange = (number: number, min: number, max: number): number =>
  Math.min(Math.max(number, min), max);

export type SlidesType = {
  url: string;
  style: React.CSSProperties;
  desc: string;
};

type PropType = {
  id: string;
  slides: SlidesType[];
  autoFlip?: boolean;
  flipFeq?: number;
  options?: EmblaOptionsType;
  carouselType?: string;
  hideDots?: boolean;
};

const EmblaCarousel: React.FC<PropType> = props => {
  const {
    id,
    slides,
    options,
    flipFeq,
    autoFlip,
    carouselType = 'default',
    hideDots,
  } = props;

  const plugins = [];

  if (autoFlip) {
    plugins.push(Autoplay());
  }
  if (carouselType === 'fade') {
    plugins.push(Fade());
  }
  const [emblaRef, emblaApi] = useEmblaCarousel(
    options,
    plugins.length ? plugins : undefined
  );
  const tweenFactor = useRef(0);
  const tweenNodes = useRef<HTMLElement[]>([]);

  const { selectedIndex, scrollSnaps, onDotButtonClick } =
    useDotButton(emblaApi);

  const setTweenFactor = useCallback(
    (emblaApi: EmblaCarouselType) => {
      tweenFactor.current =
        TWEEN_FACTOR_BASE[carouselType] *
        Math.max(emblaApi.scrollSnapList().length, 3);
    },
    [carouselType]
  );

  const tweenDefault = useCallback(
    (emblaApi: EmblaCarouselType, eventName?: EmblaEventType) => {
      const engine = emblaApi.internalEngine();
      const slidesInView = emblaApi.slidesInView();
      const isScrollEvent = eventName === 'scroll';

      emblaApi
        .scrollSnapList()
        .forEach((scrollSnap: number, snapIndex: number) => {
          const slidesInSnap = engine.slideRegistry[snapIndex];

          slidesInSnap.forEach((slideIndex: number) => {
            if (isScrollEvent && !slidesInView.includes(slideIndex)) return;

            emblaApi.slideNodes()[slideIndex].style.opacity = '1';
            const tweenNode = tweenNodes.current[slideIndex];
            tweenNode.style.transform = `scale(${1})`;
          });
        });
    },
    []
  );

  const tweenOpacity = useCallback(
    (emblaApi: EmblaCarouselType, eventName?: EmblaEventType) => {
      const engine = emblaApi.internalEngine();
      const scrollProgress = emblaApi.scrollProgress();
      const slidesInView = emblaApi.slidesInView();
      const isScrollEvent = eventName === 'scroll';

      emblaApi
        .scrollSnapList()
        .forEach((scrollSnap: number, snapIndex: number) => {
          let diffToTarget = scrollSnap - scrollProgress;
          const slidesInSnap = engine.slideRegistry[snapIndex];

          slidesInSnap.forEach((slideIndex: number) => {
            if (isScrollEvent && !slidesInView.includes(slideIndex)) return;

            if (engine.options.loop) {
              engine.slideLooper.loopPoints.forEach(
                (loopItem: { index: number; target: () => number }) => {
                  const target = loopItem.target();

                  if (slideIndex === loopItem.index && target !== 0) {
                    const sign = Math.sign(target);

                    if (sign === -1) {
                      diffToTarget = scrollSnap - (1 + scrollProgress);
                    }
                    if (sign === 1) {
                      diffToTarget = scrollSnap + (1 - scrollProgress);
                    }
                  }
                }
              );
            }

            const tweenValue = 1 - Math.abs(diffToTarget * tweenFactor.current);
            const opacity = Math.max(numberWithinRange(tweenValue, 0, 1), 0.5);
            emblaApi.slideNodes()[slideIndex].style.opacity = String(opacity);
            const tweenNode = tweenNodes.current[slideIndex];
            tweenNode.style.transform = `scale(${1})`;
          });
        });
    },
    []
  );

  const tweenScale = useCallback(
    (emblaApi: EmblaCarouselType, eventName?: EmblaEventType) => {
      const engine = emblaApi.internalEngine();
      const scrollProgress = emblaApi.scrollProgress();
      const slidesInView = emblaApi.slidesInView();
      const isScrollEvent = eventName === 'scroll';

      emblaApi
        .scrollSnapList()
        .forEach((scrollSnap: number, snapIndex: number) => {
          let diffToTarget = scrollSnap - scrollProgress;
          const slidesInSnap = engine.slideRegistry[snapIndex];

          slidesInSnap.forEach((slideIndex: number) => {
            if (isScrollEvent && !slidesInView.includes(slideIndex)) return;

            if (engine.options.loop) {
              engine.slideLooper.loopPoints.forEach(
                (loopItem: { index: number; target: () => number }) => {
                  const target = loopItem.target();

                  if (slideIndex === loopItem.index && target !== 0) {
                    const sign = Math.sign(target);

                    if (sign === -1) {
                      diffToTarget = scrollSnap - (1 + scrollProgress);
                    }
                    if (sign === 1) {
                      diffToTarget = scrollSnap + (1 - scrollProgress);
                    }
                  }
                }
              );
            }

            const tweenValue = 1 - Math.abs(diffToTarget * tweenFactor.current);
            const scale = Math.max(numberWithinRange(tweenValue, 0, 1), 0.8);
            const tweenNode = tweenNodes.current[slideIndex];
            tweenNode.style.transform = `scale(${scale})`;
            emblaApi.slideNodes()[slideIndex].style.opacity = '1';
          });
        });
    },
    []
  );

  const setTweenNodes = useCallback((emblaApi: EmblaCarouselType): void => {
    tweenNodes.current = emblaApi.slideNodes().map((slideNode: HTMLElement) => {
      return slideNode.querySelector('.embla__slide__img') as HTMLElement;
    });
  }, []);

  useEffect(() => {
    const dom = document.querySelectorAll(
      `#MkImageGroup_v2_${id} .embla`
    ) as any;
    if (carouselType === 'thumbnails' || carouselType === 'fade') {
      dom.forEach((element: HTMLElement) => {
        element?.style.setProperty('--slide-v2-size', '100%');
      });
    } else {
      dom.forEach((element: HTMLElement) => {
        element?.style.setProperty('--slide-v2-size', '74%');
      });
    }

    if (carouselType === 'scale') {
      dom.forEach((element: HTMLElement) => {
        element?.style.setProperty('--slide-spacing', '0');
      });
    } else {
      dom.forEach((element: HTMLElement) => {
        element?.style.setProperty('--slide-spacing', '10px');
      });
    }
  }, [carouselType]);

  useEffect(() => {
    if (
      !emblaApi ||
      carouselType === 'opacity' ||
      carouselType === 'scale' ||
      carouselType === 'fade'
    )
      return;

    setTweenNodes(emblaApi);
    setTweenFactor(emblaApi);
    tweenDefault(emblaApi);
    emblaApi
      .on('reInit', setTweenNodes)
      .on('reInit', setTweenFactor)
      .on('reInit', tweenDefault)
      .on('scroll', tweenDefault)
      .on('slideFocus', tweenDefault);
  }, [emblaApi, tweenDefault, carouselType]);

  useEffect(() => {
    if (!emblaApi || carouselType !== 'opacity') return;
    setTweenNodes(emblaApi);
    setTweenFactor(emblaApi);
    tweenOpacity(emblaApi);
    emblaApi
      .on('reInit', setTweenNodes)
      .on('reInit', setTweenFactor)
      .on('reInit', tweenOpacity)
      .on('scroll', tweenOpacity)
      .on('slideFocus', tweenOpacity);
  }, [emblaApi, tweenOpacity, carouselType]);

  useEffect(() => {
    if (!emblaApi || carouselType !== 'scale') return;
    setTweenNodes(emblaApi);
    setTweenFactor(emblaApi);
    tweenScale(emblaApi);

    emblaApi
      .on('reInit', setTweenNodes)
      .on('reInit', setTweenFactor)
      .on('reInit', tweenScale)
      .on('scroll', tweenScale)
      .on('slideFocus', tweenScale);
  }, [emblaApi, tweenScale, carouselType]);

  return (
    <div className='embla'>
      <div className='embla__viewport' ref={emblaRef} key={carouselType}>
        <div className='embla__container'>
          {slides.map(({ url, style, desc }, index) => (
            <div className='embla__slide' key={index}>
              <img
                className='embla__slide__img'
                src={cdnApi(removeOssParamRegex(url), {
                  resizeWidth: 1200,
                })}
                alt={desc}
                loading='lazy'
                style={style}
              />
              {desc && <div className='embla__thumbnails_desc'>{desc}</div>}
            </div>
          ))}
        </div>
      </div>

      {!hideDots && (
        <>
          {carouselType === 'thumbnails' ? (
            <div
              className='embla__controls'
              style={{
                bottom: -68,
              }}
            >
              <div className='embla__thumbnails'>
                {slides.map((_, index) => (
                  <div
                    key={index}
                    className={'embla__thumbnails_item'.concat(
                      index === selectedIndex
                        ? ' embla__thumbnails_item--selected'
                        : ''
                    )}
                    onClick={() => onDotButtonClick(index)}
                  >
                    <img
                      loading='lazy'
                      src={cdnApi(removeOssParamRegex(_.url), {
                        resizeWidth: 1200,
                      })}
                      alt=''
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className='embla__controls'>
              <div className='embla__dots'>
                {scrollSnaps.map((_, index) => (
                  <DotButton
                    key={index}
                    onClick={() => onDotButtonClick(index)}
                    className={'embla__dot'.concat(
                      index === selectedIndex ? ' embla__dot--selected' : ''
                    )}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EmblaCarousel;

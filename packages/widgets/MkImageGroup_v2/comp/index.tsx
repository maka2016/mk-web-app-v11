import React, { useEffect } from 'react';
import EmblaCarousel, { SlidesType } from './EmblaCarousel';
import './base.css';
import './embla.css';
import { PlatformCompProps } from '@mk/widgets-bridge-sdk';
import { MkImageGroupData } from '../shared/types';
import { cdnApi } from '@mk/services';
import { defaultIamgeUrl } from '../shared/utils';

const OPTIONS: any = { containScroll: false, loop: true };

const MkImageGroup: React.FC<PlatformCompProps<MkImageGroupData>> = props => {
  const { id, controledValues, lifecycle, containerInfo, canvaInfo } = props;
  const {
    imageDataList = [],
    type,
    autoFlip,
    flipFeq,
    carouselType,
    hideDots = false,
  } = controledValues;
  const slides = imageDataList.map(imageData => {
    return {
      url: cdnApi(imageData.ossPath),
      desc: imageData.desc,
      style: {
        objectFit: type === 'fullfill' ? 'contain' : 'cover',
      },
    } as SlidesType;
  });
  useEffect(() => {
    lifecycle.didLoaded?.();
    lifecycle.didMount?.({
      data: {
        ...controledValues,
        imageDataList: controledValues.imageDataList.length
          ? controledValues.imageDataList
          : [
              {
                id: 'default',
                desc: '',
                ossPath: defaultIamgeUrl,
              },
            ],
        type: controledValues.type || 'tiled',
        autoFlip: controledValues.autoFlip,
        carouselType: controledValues.carouselType || 'default',
        flipFeq: 5000,
      },
      boxInfo: {
        width: containerInfo.width || canvaInfo.canvaW || 300,
        height: containerInfo.height || 258,
        x: 0,
        y: 0,
      },
    });

    return () => {};
  }, []);

  const height =
    242 + (!hideDots ? (carouselType === 'thumbnails' ? 68 : 16) : 0);
  return (
    <div
      id={`MkImageGroup_v2_${id}`}
      className='theme-light MkImageGroup_v2 '
      style={{
        height,
        width: '100%',
        padding: '16px 0',
        pointerEvents: 'auto',
      }}
    >
      <EmblaCarousel
        id={id}
        slides={slides}
        options={OPTIONS}
        autoFlip={autoFlip}
        flipFeq={flipFeq}
        carouselType={carouselType}
        hideDots={hideDots}
      />
    </div>
  );
};
export default MkImageGroup;

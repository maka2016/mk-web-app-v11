import { cdnApi } from '@/services';
import { PlatformCompProps } from '@/widgets';
import React from 'react';
import { MkImageGroupData } from '../shared/types';
import EmblaCarousel, { SlidesType } from './EmblaCarousel';
import './base.css';
import './embla.css';

const OPTIONS: any = { containScroll: false, loop: true };

const MkImageGroup: React.FC<PlatformCompProps<MkImageGroupData>> = props => {
  const { id, controledValues } = props;
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

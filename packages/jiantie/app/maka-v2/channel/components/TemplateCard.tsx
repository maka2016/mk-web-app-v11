import React, { CSSProperties, useRef, useState } from 'react';

import { BehaviorBox } from '@/components/BehaviorTracker';
import { useTracking } from '@/components/TrackingContext';
import { cdnApi } from '@/services';
import { useStore } from '@/store';
import { isPc, queryToObj, random } from '@/utils';
import { mkWebStoreLogger } from '../../../../services/logger';

export interface TemplateCardData {
  template_id: string;
  width: number;
  height: number;
  preview_img: string;
  thumbnail: string;
  title: string;
  spec_name: string;
  price: number;
  editor_type: string;
  spec_id: number;
  spec_alias: string;
  editor_version?: number;
}

interface Props {
  columnWidth?: number;
  gutter?: number;
  template: TemplateCardData;
  style?: CSSProperties;
  objectFit?: 'contain' | 'cover';
  onClick?: (template: TemplateCardData) => void;
}

const TemplateCard = (props: Props) => {
  const store = useStore();
  const trackMeta = useTracking();
  const {
    template,
    columnWidth,
    gutter,
    onClick,
    objectFit = 'contain',
  } = props;
  const {
    template_id,
    preview_img,
    thumbnail,
    title,
    spec_name,
    height = 0,
    width = 0,
    price,
    editor_type,
    spec_id,
    editor_version,
  } = template;

  // 图片高度
  const _width = columnWidth || 180;
  // 最小高度不小于宽度，最大高度不大于4倍宽度
  const _height = Math.floor(
    Math.min(Math.max(height * (_width / (width || _width)), 0), 4 * _width)
  );

  const imageRef = useRef<HTMLDivElement>(null);

  const [instId] = useState(`template_${random(25).toUpperCase()}`);

  const toTemplateDetail = (e?: React.MouseEvent) => {
    const query = queryToObj();
    const params = new URLSearchParams();

    if (template_id) params.set('id', template_id);
    if (query.parent_page_type)
      params.set('parent_page_type', query.parent_page_type);
    if (query.ref_page_id) params.set('ref_page_id', query.ref_page_id);
    if (query.page_inst_id)
      params.set('page_inst_id', decodeURIComponent(query.page_inst_id));
    if (query.hotword_floor_word_btn)
      params.set(
        'hotword_floor_word_btn',
        decodeURIComponent(query.hotword_floor_word_btn)
      );

    params.set('is_full_screen', '1');

    store.push(`/maka-v2/template`, {
      newWindow: isPc(),
      query: Object.fromEntries(params.entries()),
    });
  };

  const getImgSrc = () => {
    let src = preview_img || thumbnail;
    if (src?.indexOf('.gif') > -1) {
      return src + '?x-oss-process=image/resize,w_200';
    }

    return cdnApi(src, {
      resizeWidth: 400,
    });
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    mkWebStoreLogger.track_click({
      object_type: 'old_template_item',
      object_id: template_id,
      ...trackMeta,
    });
    if (onClick) {
      console.log('calling onChange');
      onClick(template);
      return;
    }

    toTemplateDetail(e);
  };

  return (
    <BehaviorBox
      className='relative overflow-hidden bg-[rgba(1,7,13,0.1)] rounded-md'
      style={{ width: _width, height: _height, marginBottom: gutter }}
      onClick={handleClick}
      behavior={
        {
          object_type: 'old_template_item',
          object_id: template_id,
          object_inst_id: instId,
          works_type: editor_type,
          work_specs: spec_id,
          ...trackMeta,
        } as any
      }
    >
      <div
        ref={imageRef}
        className='overflow-hidden h-full rounded-md text-[0]'
      >
        <img
          src={getImgSrc()}
          width={_width}
          height={_height}
          alt={title}
          style={{
            objectFit: objectFit,
            height: objectFit === 'cover' ? '100%' : 'auto',
          }}
        />
      </div>

      <div className='absolute bottom-2 left-2 text-[11px] leading-4 px-0.5 text-white rounded-[2.5px] bg-[rgba(1,7,13,0.4)]'>
        {spec_name}
      </div>

      {editor_version === 10 && (
        <div
          className='absolute top-0 right-0 bg-gradient-to-br from-[#ffe768] from-[14.45%] to-[#ffbe00] to-[120%] border border-transparent rounded-tl-md rounded-br-md h-4 leading-4 font-semibold text-[10px] px-1 flex items-center justify-center text-[#a16207]'
          style={{
            borderImageSource:
              'linear-gradient(217.27deg, rgba(255, 255, 255, 0.55) -9.02%, rgba(255, 255, 255, 0) 53.03%)',
          }}
        >
          <span>新版体验</span>
        </div>
      )}
    </BehaviorBox>
  );
};

export default TemplateCard;

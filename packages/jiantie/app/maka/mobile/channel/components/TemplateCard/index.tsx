import { CSSProperties, useRef, useState } from 'react';

import { BehaviorBox } from '@/components/BehaviorTracker';
import { useTracking } from '@/components/TrackingContext';
import { cdnApi, getAppId } from '@/services';
import APPBridge from '@/store/app-bridge';
import { queryToObj, random } from '@/utils';
import { useRouter } from 'next/navigation';
import styles from './TemplateCard.module.scss';

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
  track?: any;
  objectFit?: 'contain' | 'cover';

  onChange?: (template: TemplateCardData) => void;
}

const TemplateCard = (props: Props) => {
  const router = useRouter();
  const trackingMeta = useTracking();
  const {
    template,
    columnWidth,
    track = {},
    gutter,
    onChange,
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
  const isFree = price === 0;

  const imageRef = useRef<HTMLDivElement>(null);

  const [instId] = useState(`template_${random(25).toUpperCase()}`);

  const toTemplateDetail = () => {
    if (onChange) {
      onChange(template);
    } else {
      const query = queryToObj();
      const params = new URLSearchParams();

      if (template_id) {
        params.set('id', template_id);
      }
      // if (query.parent_page_type)
      //   params.set('parent_page_type', query.parent_page_type);
      // if (query.ref_page_id) params.set('ref_page_id', query.ref_page_id);
      // if (query.page_inst_id)
      //   params.set('page_inst_id', decodeURIComponent(query.page_inst_id));
      // if (query.hotword_floor_word_btn)
      //   params.set(
      //     'hotword_floor_word_btn',
      //     decodeURIComponent(query.hotword_floor_word_btn)
      // );

      if (trackingMeta.page_type) {
        params.set('ref_page_type', trackingMeta.page_type);
      }
      if (trackingMeta.page_id) {
        params.set('ref_page_id', trackingMeta.page_id);
      }
      if (trackingMeta.search_word) {
        params.set('search_word', trackingMeta.search_word);
      }

      params.set('is_full_screen', '1');

      const url =
        editor_version === 10
          ? `${location.origin}/mobile/template?${params.toString()}`
          : `${location.origin}/maka/mobile/template?${params.toString()}`;
      if (APPBridge.judgeIsInApp()) {
        APPBridge.navToPage({
          url,
          type: 'URL',
        });
      } else {
        router.push(`${url}&appid=${getAppId()}`);
      }
    }
  };

  const getImgSrc = () => {
    let src = preview_img || thumbnail;
    if (src?.indexOf('.gif') > -1) {
      return src + '?x-oss-process=image/resize,w_200';
    }

    return cdnApi(src, {
      resizeWidth: _width * 2,
    });
  };

  return (
    <BehaviorBox
      className={styles.templateCard}
      style={{ width: _width, height: _height, marginBottom: gutter }}
      onClick={() => toTemplateDetail()}
      behavior={{
        object_type: 'old_template_item',
        object_id: template_id,
        // object_inst_id: instId,
        // works_type: editor_type,
        // work_specs: spec_id,
        // ...track,
        ...trackingMeta,
      }}
    >
      <div ref={imageRef} className={styles.imageWrap}>
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

      <div className={styles.spec}>{spec_name}</div>

      {editor_version === 10 && (
        <div className={styles.new}>
          <span>新版体验</span>
        </div>
      )}
    </BehaviorBox>
  );
};

export default TemplateCard;

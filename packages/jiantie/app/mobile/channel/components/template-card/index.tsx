import { CSSProperties } from 'react';

import { BehaviorBox } from '@/components/BehaviorTracker';
import { cdnApi, getAppId } from '@/services';
import { useTemplateSpec } from '@/services/useTemplateSpec';
import { useStore } from '@/store';
import APPBridge from '@/store/app-bridge';
import { getUrlWithParam } from '@/utils';
import cls from 'classnames';
import { useRouter } from 'next/navigation';
import styles from './index.module.scss';

export interface Template {
  id?: string;
  name: string;
  desc: string;
  template_id: string;
  cover: {
    url: string;
  };
  cover_url?: string;
  coverV3?: {
    url: string;
    width: number;
    height: number;
  } | null;
  config?: {
    price?: number;
    vipTag?: 'vip' | 'svip';
    saleType?: 'free' | 'buy';
  };
}

interface Props {
  template: Template;
  style?: CSSProperties;
}

const TemplateCard = (props: Props) => {
  const { template } = props;
  const { template_id } = template;
  const router = useRouter();
  const appid = getAppId();
  const { vipABTest } = useStore();

  // 使用自定义 hook 获取模板规格数据
  const { specName } = useTemplateSpec(template_id);
  // const searchParams = useSearchParams()

  const toTemplateDetail = () => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}/mobile/template?id=${template_id}&is_full_screen=1`,
        type: 'URL',
      });
    } else {
      router.push(
        getUrlWithParam(
          `/mobile/template?id=${template_id}&appid=${appid}&template_name=${template.name}`,
          'clickid'
        )
      );
    }
  };
  const resetWidth = 600;
  const aspectRatio = 9 / 16;
  // 优先使用 coverV3，如果没有则使用 cover 或 cover_url
  const coverUrl =
    template.coverV3?.url || template.cover_url || '';
  const templateImg = `${decodeURIComponent(
    cdnApi(coverUrl, {
      resizeWidth: resetWidth,
      format: 'webp',
    })
  )}/crop,x_0,y_0,w_${resetWidth},h_${Math.round(resetWidth / aspectRatio)}`;

  return (
    <BehaviorBox
      className={styles.templateItem}
      onClick={() => toTemplateDetail()}
      behavior={{
        object_type: 'template_item',
        object_id: template_id,
        parent_id: 'template_list',
      }}
    >
      <div
        className={styles.cover}
        style={{ backgroundImage: `url(${templateImg})` }}
      />

      <div
        className={styles.coverMh}
        style={{ backgroundImage: `url(${templateImg})` }}
      />

      {appid === 'jiantie' && vipABTest === 'test' ? (
        <>
          {template.config?.vipTag && (
            <div
              className={cls([styles.vipTag, styles[template.config.vipTag]])}
            >
              {template.config.vipTag.toUpperCase()}
            </div>
          )}

          <div className={styles.templateInfo}>
            <div className={styles.spec}>{specName}</div>
            {/* {!!template.config.price && template.config.price > 0 && (
              <div className={styles.spec}>¥{template.config.price / 100}</div>
            )} */}
          </div>
        </>
      ) : (
        specName && <div className={styles.onlySpec}>{specName}</div>
      )}

      {/* <div className={styles.name}>{template.name}</div> */}
      {appid === 'maka' && <div className={styles.new}>新版体验</div>}
    </BehaviorBox>
  );
};

export default TemplateCard;

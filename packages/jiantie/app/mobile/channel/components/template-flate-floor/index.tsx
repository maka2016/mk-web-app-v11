import { getCmsApiHost, requestCMS } from '@/services';
import { useEffect, useRef, useState } from 'react';
import styles from './index.module.scss';

import APPBridge from '@/store/app-bridge';
import { getUrlWithParam } from '@/utils';
import { Icon } from '@workspace/ui/components/Icon';
import { Loading } from '@workspace/ui/components/loading';
import cls from 'classnames';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import qs from 'qs';
import TemplateCard, { Template } from '../template-card';

interface Tag {
  id: number;
  name: string;
  desc: string;
  documentId: string;
}

export interface Floor {
  id: number;
  documentId: string;
  name: string;
  desc: string;
  template_tags: Tag[];
}

interface Props {
  floor: Floor;
}

const TemplateFlatFloor = (props: Props) => {
  const { floor } = props;
  const [tagId, setTagId] = useState(floor.template_tags?.[0]?.documentId);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const t = useTranslations('HomePage');

  const getFloorTemplates = async () => {
    if (!tagId) {
      setEmpty(true);
      return;
    }
    const query = qs.stringify(
      {
        populate: {
          template_items: {
            populate: '*',
          },
        },
        filters: {
          documentId: {
            $eq: tagId,
          },
        },
      },
      { encodeValuesOnly: true }
    );

    const promptGroupRes = (
      await requestCMS.get(`${getCmsApiHost()}/api/template-tags?${query}`)
    ).data.data;

    if (promptGroupRes) {
      const data =
        promptGroupRes[0]?.template_items
          ?.sort((a: any, b: any) => b.sort_score - a.sort_score)
          ?.slice(0, 6) || [];

      setTemplates(data);
      setLoading(false);
    }
  };

  useEffect(() => {
    getFloorTemplates();
  }, [tagId]);

  const onChangeFilterId = (id: string) => {
    setTemplates([]);
    setLoading(true);
    setTagId(id);
  };

  const toSearch = (keyword?: string) => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}/mobile/channel/search?keyword=${keyword}&is_full_screen=1`,
        type: 'URL',
      });
    } else {
      router.push(
        getUrlWithParam(`/mobile/channel/search?keyword=${keyword}`, 'clickid')
      );
    }
  };

  if (empty) {
    return <div></div>;
  }

  return (
    <div className={styles.templateFloor} id={`gallery_floor_${floor.id}`}>
      <div className={styles.floorTitle} onClick={() => toSearch(floor.name)}>
        <div className={styles.title}>{floor.name}</div>
        <Icon name='right' size={16} />
      </div>

      {floor.template_tags.length > 1 && (
        <div className={styles.floorTags}>
          {floor.template_tags.map(item => (
            <div
              key={item.id}
              className={cls([
                styles.tag,
                item.documentId === tagId && styles.active,
              ])}
              onClick={() => onChangeFilterId(item.documentId)}
            >
              {item.name}
            </div>
          ))}
        </div>
      )}

      <div className={styles.templateList}>
        <div
          className={cls([
            styles.scrollList,
            'md:grid-cols-7 max-md:grid-cols-3',
          ])}
          ref={scrollRef}
        >
          {templates.map(item => (
            <TemplateCard template={item} key={item.template_id} />
          ))}
        </div>

        {loading && (
          <div className={styles.loading}>
            <Loading />
          </div>
        )}
      </div>
      <div
        className={styles.more}
        onClick={() => {
          const curTag = floor.template_tags.find(
            item => item.documentId === tagId
          );
          toSearch(curTag?.name);
        }}
      >
        <span>{t('more')}</span>
        <Icon name='right' size={14} />
      </div>
    </div>
  );
};

export default TemplateFlatFloor;

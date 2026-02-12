'use client';
import { Channel, getAppId, getCmsApiHost, requestCMS } from '@/services';
import APPBridge from '@/store/app-bridge';
import { Icon } from '@workspace/ui/components/Icon';
import { Loading } from '@workspace/ui/components/loading';
import { cn } from '@workspace/ui/lib/utils';
import { useRouter } from 'next/navigation';
import qs from 'qs';
import { useEffect, useState } from 'react';
import TemplateCard, { TemplateCardData } from '../TemplateCard';
import styles from './index.module.scss';

interface Props {
  floor: Channel; // 四级楼层
  color?: string;
}

const COLLECTION_LIMIT = 4; // 每个楼层显示前4个集合

/**
 * 楼层及其集合组件
 * 展示一个楼层下的前4个集合（五级数据）
 */
const FloorWithCollections = (props: Props) => {
  const { floor, color } = props;
  const [collections, setCollections] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const appid = getAppId();
  const router = useRouter();

  useEffect(() => {
    loadCollections();
  }, [floor]);

  const loadCollections = () => {
    if (floor?.children && floor.children.length > 0) {
      // 获取前4个在线的集合
      const activeCollections = floor.children
        .filter((item: Channel) => item.online === true)
        .sort((a: any, b: any) => (a.sort || 0) - (b.sort || 0))
        .slice(0, COLLECTION_LIMIT);

      setCollections(activeCollections);
      setLoading(false);
    } else {
      setCollections([]);
      setLoading(false);
    }
  };

  const toFloorDetail = () => {
    const id = floor.documentId;
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}/mobile/channel/floor?channelId=${id}&is_full_screen=1`,
        type: 'URL',
      });
    } else {
      router.push(`/mobile/channel/floor?channelId=${id}&appid=${getAppId()}`);
    }
  };

  if (!floor) return null;

  return (
    <div className={cn([styles.floorContainer, styles[appid]])}>
      <div className={styles.floorHeader}>
        <div className={styles.floorTitle}>{floor.name}</div>
        <div className={styles.more} onClick={toFloorDetail} style={{ color }}>
          查看全部
          <Icon name='right-bold' size={20} />
        </div>
      </div>

      <div className={styles.collectionsContainer}>
        {loading ? (
          <div className={styles.loading}>
            <Loading />
          </div>
        ) : collections.length > 0 ? (
          <div className={styles.collectionsList}>
            {collections.map(collection => (
              <CollectionItem
                key={collection.documentId}
                collection={collection}
                color={color}
              />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>暂无内容</div>
        )}
      </div>
    </div>
  );
};

/**
 * 单个集合项组件
 * 展示集合名称和前几个模板
 */
const CollectionItem = ({
  collection,
  color,
}: {
  collection: Channel;
  color?: string;
}) => {
  const [templates, setTemplates] = useState<TemplateCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadTemplates();
  }, [collection]);

  const loadTemplates = async () => {
    if (!collection.documentId) {
      setLoading(false);
      return;
    }

    try {
      const query = qs.stringify(
        {
          populate: {
            cover: {
              populate: '*',
            },
          },
          filters: {
            $and: collection?.filters?.default?.$and || [],
            $or: [
              {
                offline: {
                  $ne: true,
                },
              },
              {
                offline: {
                  $null: true,
                },
              },
            ],
          },
          pagination: {
            pageSize: 3, // 每个集合只显示3个模板
            page: 1,
          },
          sort: ['sort_score:desc'],
        },
        { encodeValuesOnly: true }
      );

      const res = await requestCMS.get(
        `${getCmsApiHost()}/api/template-items?${query}`
      );

      if (res?.data?.data) {
        setTemplates(res.data.data);
      }
      setLoading(false);
    } catch (error) {
      console.error('加载集合模板失败:', error);
      setLoading(false);
    }
  };

  const toCollectionDetail = () => {
    const id = collection.documentId;
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}/mobile/channel/floor?channelId=${id}&is_full_screen=1`,
        type: 'URL',
      });
    } else {
      router.push(`/mobile/channel/floor?channelId=${id}&appid=${getAppId()}`);
    }
  };

  return (
    <div className={styles.collectionItem}>
      <div
        className={styles.collectionName}
        onClick={toCollectionDetail}
        style={{ color }}
      >
        {collection.name}
        <Icon name='right' size={16} />
      </div>

      <div className={styles.templateList}>
        {loading ? (
          <div className={styles.templateLoading}>
            <Loading size={16} />
          </div>
        ) : (
          <>
            {templates.map(template => (
              <TemplateCard key={template.template_id} template={template} />
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default FloorWithCollections;

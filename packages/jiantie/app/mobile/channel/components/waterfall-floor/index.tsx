import { useEffect, useState } from 'react';
import styles from './index.module.scss';
import cls from 'classnames';
import InfiniteScroll from 'react-infinite-scroller';
import { Loading } from '@workspace/ui/components/loading';
import { getCmsApiHost, requestCMS } from '@/services';
import qs from 'qs';
import TemplateCard, { Template } from '../template-card';

interface Tag {
  id: number;
  name: string;
  desc: string;
  documentId: string;
}

interface Floor {
  id: number;
  documentId: string;
  name: string;
  desc: string;
  template_tags: Tag[];
}

interface Props {
  floors: Floor[];
}

const limit = 30;
const WaterfallFloor = (props: Props) => {
  const { floors = [] } = props;
  const [floorId, setFloorId] = useState<number>();
  const [tagId, setTagId] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [page, setPage] = useState(1);
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    if (floors.length) {
      setFloorId(floors[0].id);
      setTagId(floors[0].template_tags[0].documentId);
    }
  }, [floors]);

  const getFloorTemplates = async () => {
    const query = qs.stringify(
      {
        populate: {
          cover: {
            populate: '*',
          },
        },
        filters: {
          template_tags: {
            documentId: {
              $eq: tagId,
            },
          },
        },
        pagination: {
          pageSize: limit,
          page,
        },
        sort: ['sort_score:desc'],
      },

      { encodeValuesOnly: true }
    );

    const promptGroupRes = (
      await requestCMS.get(`${getCmsApiHost()}/api/template-items?${query}`)
    ).data.data;

    if (promptGroupRes.length > 0) {
      setTemplates(
        page === 1 ? promptGroupRes : [...templates, ...promptGroupRes]
      );
      setFinished(promptGroupRes.length < limit);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (floorId) {
      getFloorTemplates();
    }
  }, [floorId, page]);

  const loadMore = () => {
    if (loading || finished) return;
    setLoading(true);
    setPage(page + 1);
  };

  const onChangeFloorId = (item: Floor) => {
    setFloorId(item.id);
    setPage(1);
    setLoading(true);
    setFinished(false);
    setTemplates([]);
    setTagId(item.template_tags[0].documentId);
  };

  const onChangeFilterId = (id: string) => {
    setTemplates([]);
    setLoading(true);
    setFinished(false);
    setTagId(id);
  };

  const renderTags = () => {
    const floor = floors.find(item => item.id === floorId);
    if (!floor?.template_tags?.length || floor.template_tags.length < 2)
      return null;

    return (
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
    );
  };

  return (
    <div className={styles.waterfall}>
      <div className={styles.floorTabs}>
        {floors.map(item => (
          <div
            className={cls([
              styles.tabItem,
              floorId === item.id && styles.active,
            ])}
            key={item.id}
            onClick={() => onChangeFloorId(item)}
          >
            {item.name}
          </div>
        ))}
      </div>
      {renderTags()}
      <InfiniteScroll
        initialLoad={false}
        pageStart={0}
        loadMore={loadMore}
        hasMore={!finished}
      >
        <div className={styles.templates}>
          {templates.map(item => (
            <TemplateCard template={item} key={item.template_id} />
          ))}
        </div>
      </InfiniteScroll>
      {loading && (
        <div className='p-2 flex items-center justify-center'>
          <Loading />
        </div>
      )}
    </div>
  );
};

export default WaterfallFloor;

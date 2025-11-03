import { getCmsApiHost, getUid, requestCMS } from '@/services';
import qs from 'qs';
import { use, useEffect, useState } from 'react';
import styles from './index.module.scss';
import InfiniteScroll from 'react-infinite-scroller';
import { Loading } from '@workspace/ui/components/loading';
import { cdnApi } from '@mk/services';
import cls from 'classnames';

interface Props {
  templateId: string;
  onChange: (templateId: string) => void;
}

interface TemplateItem {
  id: string;
  template_id: string;
  name: string;
  cover_url: string;
  cover: {
    url: string;
  };
}
const limit = 20;
const LibTemplate = (props: Props) => {
  const { templateId, onChange } = props;
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [tagName, setTagName] = useState<any>();
  const [page, setPage] = useState(1);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [total, setTotal] = useState(0);

  const getSortOrder = () => {
    const uid = getUid();
    if (!uid) {
      return ['sort_score:desc'];
    }
    const lastDigit = parseInt(uid.slice(-1));

    return lastDigit >= 0 && lastDigit <= 4
      ? ['sort_score:desc']
      : ['scrore_ab:desc'];
  };

  const getTemplateItem = async () => {
    const query = qs.stringify(
      {
        populate: {
          tags: {
            populate: '*',
          },
        },
        filters: {
          template_id: {
            $eq: templateId,
          },
        },
        pagination: {
          pageSize: 1,
          page: 1,
        },
      },
      { encodeValuesOnly: true }
    );
    const res = await requestCMS.get(
      `${getCmsApiHost()}/api/template-items?${query}`
    );
    if (res?.data?.data?.length) {
      const item = res.data.data[0];
      const tag = item?.tags?.find(
        (item: any) => item.alias === '场景分类名字'
      );
      setTagName(tag?.name);
      setTotal(tag.templates.length);
    }
    setReady(true);
  };

  const getTemplateList = async () => {
    setLoading(true);
    console.log('tagName', tagName);
    const query = qs.stringify(
      {
        populate: {
          cover: {
            populate: '*',
          },
        },
        filters: {
          $and: [
            {
              name: {
                $null: false,
              },
            },
            {
              tags: {
                alias: '场景分类名字',
                name: {
                  $in: [tagName],
                },
              },
            },
          ],
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
          pageSize: total,
          page,
        },
        sort: getSortOrder(),
      },
      { encodeValuesOnly: true }
    );

    const res = await requestCMS.get(
      `${getCmsApiHost()}/api/template-items?${query}`
    );

    setLoading(false);
    setFinished(res?.data?.data?.length < limit);
    const list = res?.data?.data || [];
    setTemplates(page === 1 ? list : templates.concat(list));
    if (page === 1) {
      setTimeout(() => {
        const dom = document.getElementById(`template_item_${templateId}`);
        if (dom) {
          dom.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 200);
    }
  };

  useEffect(() => {
    if (templateId) {
      getTemplateItem();
    }
  }, [templateId]);

  useEffect(() => {
    if (ready) {
      getTemplateList();
    }
  }, [page, ready]);

  const loadMore = () => {
    // if (loading || finished) {
    //   return
    // }
    // setLoading(true)
    // setPage(page + 1)
  };

  const resizeCover = (url: string) => {
    const resetWidth = 600;
    const aspectRatio = 171 / 251;
    const templateImg = `${decodeURIComponent(
      cdnApi(url, {
        resizeWidth: resetWidth,
        format: 'webp',
      })
    )}/crop,x_0,y_0,w_${resetWidth},h_${Math.round(resetWidth / aspectRatio)}`;
    return templateImg;
  };

  return (
    <div className={styles.libTemplate}>
      <InfiniteScroll
        initialLoad={false}
        pageStart={0}
        loadMore={loadMore}
        hasMore={!finished}
        useWindow={false}
        className={styles.templateList}
      >
        {templates.map(item => {
          const active = item.template_id === templateId;
          return (
            <div
              key={item.template_id}
              className={cls([styles.templateItem, active && styles.active])}
              id={`template_item_${item.template_id}`}
              onClick={() => onChange(item.template_id)}
            >
              <img
                src={resizeCover(item.cover_url || item.cover?.url)}
                alt=''
              />
            </div>
          );
        })}
      </InfiniteScroll>
      {loading && (
        <div className='flex items-center justify-center'>
          <Loading />
        </div>
      )}
    </div>
  );
};

export default LibTemplate;

import './template.scss';
import React, { useEffect, useState } from 'react';
import qs from 'qs';
import cls from 'classnames';
import { requestCMS } from './services';
import InfiniteScroll from 'react-infinite-scroller';
import { Icon } from '@workspace/ui/components/Icon';

const limit = 60;

interface Floor {
  id: number;
  name: string;
}

interface MaterialItem {
  id: number;
  name: string;
  content: any;
  cover: {
    url: string;
  };
}
const BorderContent = ({ editorSDK, widgetState }: any) => {
  const [page, setPage] = useState(1);
  const [list, setList] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [activeId, setActiveId] = useState<number>();

  // 素材列表
  const getMaterials = async () => {
    setLoading(true);
    const query = qs.stringify(
      {
        populate: {
          cover: {
            populate: '*',
          },
        },

        filters: {
          material_class: {
            name: {
              $eq: '边框样式',
            },
          },
        },
        pagination: {
          pageSize: limit,
          page,
        },
      },
      { encodeValuesOnly: true }
    );

    const res = await requestCMS.get(
      `/material-items?${query}&populate=material_class`
    );
    if (res?.data?.data) {
      setList(page === 1 ? res.data.data : list.concat(res.data.data));
      setFinished(res.data.data.length < limit);
      setLoading(false);
    }
  };

  useEffect(() => {
    getMaterials();
  }, [page]);

  const loadMore = () => {
    if (loading || finished) {
      return;
    }
    setLoading(true);
    setPage(page + 1);
  };

  const onChangeTemplate = (item: MaterialItem) => {
    const { editingElemId } = widgetState;
    if (!editingElemId) {
      return;
    }

    if (!item.content) {
      const nextVal = editorSDK.getLayer(editingElemId)?.attrs || {};
      nextVal.backgroundGroup = null;
      nextVal.background = null;
      nextVal.fontSize = null;
      nextVal.color = null;
      nextVal.margin = 0;
      nextVal.padding = 0;
      editorSDK.changeCompAttr(editingElemId, nextVal);
      setActiveId(undefined);
      return;
    }

    setActiveId(item.id);
    editorSDK.changeCompAttr(editingElemId, item.content);
  };

  return (
    <div className={'themeTemplateContainer'}>
      <InfiniteScroll
        initialLoad={false}
        pageStart={0}
        loadMore={loadMore}
        hasMore={!finished}
        useWindow={false}
        className={'materialList'}
      >
        <div
          className={cls(['borderItem', 'flex items-center justify-center'])}
          onClick={() =>
            onChangeTemplate({
              id: 0,
              name: '',
              content: undefined,
              cover: {
                url: '',
              },
            })
          }
        >
          <Icon name='prohibited' size={24} color='rgba(0,0,0,0.25)' />
        </div>
        {list.map(item => (
          <div
            key={item.id}
            className={cls(['borderItem', activeId === item.id && 'active'])}
            onClick={() => onChangeTemplate(item)}
          >
            <img src={item?.cover?.url} alt='' />
          </div>
        ))}
      </InfiniteScroll>
      {loading && <div className={'loading'}>Loading</div>}
    </div>
  );
};
export default BorderContent;

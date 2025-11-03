import './template.scss';
import { requestCMS } from './services';
import React, { useEffect, useState } from 'react';
import qs from 'qs';
import cls from 'classnames';
import InfiniteScroll from 'react-infinite-scroller';
import { EditorSDK } from '@mk/works-store/types';

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
const ThemeTemplate = (props: {
  onChange: () => void;
  editorSDK: EditorSDK;
}) => {
  const { editorSDK } = props;
  const [page, setPage] = useState(1);
  const [list, setList] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [activeFloorId, setActiveFloorId] = useState<number>(-1);
  const [activeId, setActiveId] = useState<number>();

  // 素材楼层
  const getFloorData = async () => {
    const query = qs.stringify(
      {
        populate: 'material_class',
        filters: {
          material_class: {
            name: {
              $eq: '主题模版',
            },
          },
        },
      },
      { encodeValuesOnly: true }
    );

    const promptGroupRes = (await requestCMS.get(`/material-tags?${query}`))
      .data.data;

    if (promptGroupRes.length > 0) {
      setFloors([{ id: -1, name: '全部' }, ...promptGroupRes]);
      // setActiveFloorId(promptGroupRes[0].id)
    }
  };

  const getAllMaterials = async () => {
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
              $eq: '主题模版',
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
          material_tags: {
            id: {
              $eq: activeFloorId && activeFloorId > -1 ? activeFloorId : '',
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
      `/material-items?${query}&populate=material_tags`
    );
    if (res?.data?.data) {
      setList(page === 1 ? res.data.data : list.concat(res.data.data));
      setFinished(res.data.data.length < limit);
      setLoading(false);
    }
  };

  useEffect(() => {
    getFloorData();
  }, []);

  useEffect(() => {
    if (activeFloorId) {
      if (activeFloorId === -1) {
        getAllMaterials();
      } else {
        getMaterials();
      }
    }
  }, [activeFloorId, page]);

  const loadMore = () => {
    if (loading || finished) {
      return;
    }
    setLoading(true);
    setPage(page + 1);
  };

  const onChangeTemplate = (payload: any) => {
    editorSDK?.setWorksStyle({ themeSchema: payload });
    props.onChange();
  };

  const onChangeFloor = (id: number) => {
    setActiveFloorId(id);
    setPage(1);
    setFinished(false);
    setList([]);
  };

  return (
    <div className={'themeTemplateContainer'}>
      <div className={'floors'}>
        {floors.map(item => (
          <div
            key={item.id}
            className={cls([
              'floorItem',
              activeFloorId === item.id && 'active',
            ])}
            onClick={() => onChangeFloor(item.id)}
          >
            {item.name}
          </div>
        ))}
      </div>
      <InfiniteScroll
        initialLoad={false}
        pageStart={0}
        loadMore={loadMore}
        hasMore={!finished}
        useWindow={false}
        className={'materialList'}
      >
        {list.map(item => (
          <div
            key={item.id}
            className={cls(['templateItem', activeId === item.id && 'active'])}
            onClick={() => {
              setActiveId(item.id);
              onChangeTemplate(item.content);
            }}
          >
            <img src={item?.cover?.url} alt='' />
            <div className={'name'}>{item.name}</div>
          </div>
        ))}
      </InfiniteScroll>
      {loading && <div className={'loading'}>Loading</div>}
    </div>
  );
};
export default ThemeTemplate;

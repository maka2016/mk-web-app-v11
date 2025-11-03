import './template.scss';
import React, { useEffect, useState } from 'react';
import qs from 'qs';
import cls from 'classnames';
import { requestCMS, useMaterialItems } from './services';
import InfiniteScroll from 'react-infinite-scroller';
import { Icon } from '@workspace/ui/components/Icon';
import styled from '@emotion/styled';
import styles from './index.module.scss';
import { cdnApi } from '@mk/services';

const limit = 60;

interface MaterialItem {
  id: number;
  name: string;
  content: any;
  cover: {
    url: string;
  };
}

const SelectorRoot = styled.div`
  padding: 16px;
  width: 400px;
  height: 600px;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-y: auto;

  .materialList {
    width: 100%;
    height: 100%;
    align-content: baseline;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    align-items: center;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .item {
    aspect-ratio: 1/1;
    object-fit: cover;
    background-color: #9e9e9e;
    border-radius: 4px;
  }
`;

export default function FrontgroundSelector({
  onChange,
}: {
  onChange: (value: string, name: string) => void;
}) {
  const {
    materialList,
    loading,
    finished,
    setPage,
    page,
    floors,
    activeFloorId,
    setActiveFloorId,
  } = useMaterialItems({
    materialClass: '简帖氛围前景',
    limit,
  });

  const loadMore = () => {
    if (loading || finished) {
      return;
    }
    setPage(page + 1);
  };

  return (
    <SelectorRoot className={styles.template}>
      <div
        className={cls([
          styles.floors,
          'w-full',
          'md:flex-wrap',
          'max-md:overflow-x-auto',
        ])}
      >
        {floors.map(item => (
          <div
            key={item.documentId}
            className={cls([
              styles.floorItem,
              activeFloorId === item.documentId && styles.active,
            ])}
            onClick={() => setActiveFloorId(item.documentId)}
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
        className={styles.materialList}
      >
        <div
          className={cls([
            styles.templateItem,
            'item flex items-center justify-center',
          ])}
          onClick={() => onChange('', '')}
        >
          <Icon name='prohibited' size={24} color='rgba(0,0,0,0.25)' />
        </div>
        {materialList.map(item => (
          <div
            key={item.documentId}
            className={cls([styles.templateItem, 'item'])}
            onClick={() => onChange(item?.cover?.url, item.name)}
          >
            <img src={cdnApi(item?.cover?.url)} alt='' />
          </div>
        ))}
      </InfiniteScroll>
      {loading && <div className={'loading'}>Loading</div>}
    </SelectorRoot>
  );
}

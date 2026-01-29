import { cdnApi } from '@/services';
import styled from '@emotion/styled';
import { Icon } from '@workspace/ui/components/Icon';
import cls from 'classnames';
import { useEffect, useRef, useState } from 'react';
import InfiniteScroll from 'react-infinite-scroller';
import styles from './index.module.scss';
import './template.scss';
import {
  MaterialItem,
  MaterialResourceManagerAPI,
} from '@/components/GridEditorV3/componentForContentLib/MaterialResourceManager/services';

const limit = 60;

const MATERIAL_CLASS_SCOPE = '简帖氛围前景';

interface Floor {
  documentId: string;
  name: string;
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
  const materialManagerRef = useRef<MaterialResourceManagerAPI | null>(null);
  if (!materialManagerRef.current) {
    materialManagerRef.current = new MaterialResourceManagerAPI(
      MATERIAL_CLASS_SCOPE
    );
  }

  const isFetchingRef = useRef(false);
  const [materialList, setMaterialList] = useState<MaterialItem[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [activeFloorId, setActiveFloorId] = useState<string>('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await materialManagerRef.current!.getFloors();
        const data = res.data || [];
        const mapped: Floor[] = data.map(f => ({
          documentId: f.documentId || f.id,
          name: f.name,
        }));
        setFloors([{ documentId: '', name: '全部' }, ...mapped]);
      } catch (e) {
        console.error('获取前景标签失败:', e);
      }
    };
    run();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      setLoading(true);

      try {
        const result = await materialManagerRef.current!.getItems(
          activeFloorId || '',
          { page, pageSize: limit }
        );

        if (cancelled) return;

        setMaterialList(prev =>
          page === 1 ? result.data : prev.concat(result.data)
        );

        const total = result.meta?.pagination?.total || 0;
        const pageSize = result.meta?.pagination?.pageSize || limit;
        setFinished(page * pageSize >= total);
      } catch (e) {
        if (!cancelled) {
          console.error('获取前景素材失败:', e);
          setFinished(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
        isFetchingRef.current = false;
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [activeFloorId, page]);

  const loadMore = () => {
    if (loading || finished) {
      return;
    }
    setPage(prev => prev + 1);
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
            onClick={() => {
              setActiveFloorId(item.documentId);
              setPage(1);
              setFinished(false);
              setMaterialList([]);
            }}
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

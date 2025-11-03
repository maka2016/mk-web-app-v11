import styles from './index.module.scss';
import { useEffect, useState, useCallback } from 'react';
import InfiniteScroll from 'react-infinite-scroller';
import { Loading } from '@workspace/ui/components/loading';
import cls from 'classnames';
import { Icon } from '@workspace/ui/components/Icon';
import { Button } from '@workspace/ui/components/button';
import { cdnApi } from '@mk/services';
import { BehaviorBox } from '@workspace/ui/components/BehaviorTracker';
import {
  getFloorData,
  getAllMaterials,
  getMaterials,
  type Floor,
  type MaterialItem,
} from './services';
import { IMusic } from '@mk/works-store/types';
import { useMusic } from './MusicProvider';

interface TemplateProps {
  value: IMusic;
  onChange: (payload: IMusic) => void;
}

const MusicLibContent = (props: TemplateProps) => {
  const { onChange } = props;
  const { togglePlay, isPlaying } = useMusic();
  const [page, setPage] = useState(1);
  const [list, setList] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [activeFloorId, setActiveFloorId] = useState<number>(-1);

  // 素材楼层
  const fetchFloorData = async () => {
    const floorsData = await getFloorData();
    if (floorsData.length > 0) {
      setFloors(floorsData);
      // setActiveFloorId(floorsData[0].id)
    }
  };

  const fetchAllMaterials = useCallback(async () => {
    setLoading(true);
    const result = await getAllMaterials(page);
    if (result.data) {
      setList(page === 1 ? result.data : list.concat(result.data));
      setFinished(result.finished);
      setLoading(false);
    }
  }, [page, list]);

  // 素材列表
  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    const result = await getMaterials(activeFloorId, page);
    if (result.data) {
      setList(page === 1 ? result.data : list.concat(result.data));
      setFinished(result.finished);
      setLoading(false);
    }
  }, [activeFloorId, page, list]);

  useEffect(() => {
    fetchFloorData();
  }, []);

  useEffect(() => {
    if (activeFloorId) {
      if (activeFloorId === -1) {
        fetchAllMaterials();
      } else {
        fetchMaterials();
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

  const onUseMusic = (payload: MaterialItem) => {
    if (!payload?.url?.url) {
      return;
    }
    const data: IMusic = {
      title: payload.name,
      url: payload.url.url,
      materialId: payload.documentId,
      type: 'music',
      duration: 0,
      preview: payload?.cover?.url,
    };
    onChange(data);
  };

  const onChangeFloor = (id: number) => {
    setActiveFloorId(id);
    setPage(1);
    setFinished(false);
    setList([]);
  };

  // 处理音乐播放
  const handleTogglePlay = async (url: string) => {
    await togglePlay(url);
  };

  return (
    <div className={`${styles.music} h-full overflow-hidden`}>
      <div className={styles.floorsContainer}>
        <div className={styles.floors}>
          {floors.map(item => (
            <div
              key={item.id}
              className={cls([
                styles.floorItem,
                activeFloorId === item.id && styles.active,
              ])}
              onClick={() => onChangeFloor(item.id)}
            >
              {item.name}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.scrollList}>
        <InfiniteScroll
          initialLoad={false}
          pageStart={0}
          loadMore={loadMore}
          hasMore={!finished}
          useWindow={false}
          className={styles.materialList}
        >
          {list.map(item => {
            const isActive = props.value.materialId === item.documentId;
            return (
              <BehaviorBox
                behavior={{
                  object_type: 'template_click',
                  object_id: `${item.id}`,
                  parent_id: 'ai_works',
                }}
                key={item.id}
                className={cls([
                  styles.templateItem,
                  isPlaying(item.url.url) && styles.playing,
                ])}
                style={{
                  // 确保播放状态样式生效
                  ...(isPlaying(item.url.url) && {
                    backgroundColor: 'rgba(0, 102, 204, 0.1) !important',
                    outline: '1px solid #0066cc !important',
                    color: '#0066cc !important',
                  }),
                }}
                onClick={() => {
                  handleTogglePlay(item.url.url);
                }}
              >
                <div className={styles.cover}>
                  <div
                    className={styles.mask}
                    style={{
                      ...(isPlaying(item.url.url) && {
                        backgroundColor: 'rgba(0, 102, 204, 0.8) !important',
                      }),
                    }}
                  >
                    <Icon
                      name={isPlaying(item.url.url) ? 'pause' : 'play'}
                      color='#fff'
                    />
                  </div>
                  <img
                    src={cdnApi(item?.cover?.url, {
                      resizeWidth: 120,
                    })}
                    alt=''
                  />
                </div>
                <div
                  className={styles.name}
                  style={{
                    ...(isPlaying(item.url.url) && {
                      color: '#0066cc !important',
                      fontWeight: '500 !important',
                    }),
                  }}
                >
                  {item.name}
                </div>
                <Button
                  disabled={isActive}
                  size='sm'
                  onClick={() => {
                    onUseMusic(item);
                  }}
                >
                  {isActive ? '已应用' : '应用'}
                </Button>
              </BehaviorBox>
            );
          })}
        </InfiniteScroll>
        {loading && (
          <div className={styles.loading}>
            <Loading />
          </div>
        )}
      </div>
    </div>
  );
};

export default MusicLibContent;

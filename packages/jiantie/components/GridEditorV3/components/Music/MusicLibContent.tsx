import { BehaviorBox } from '@/components/BehaviorTracker';
import { IMusic } from '@/components/GridEditorV3/works-store/types';
import {
  MaterialFloor,
  MaterialItem,
  MaterialResourceManagerAPI,
} from '@/components/GridEditorV3/componentForContentLib/MaterialResourceManager/services';
import { cdnApi } from '@/services';
import { Icon } from '@workspace/ui/components/Icon';
import { Button } from '@workspace/ui/components/button';
import { Loading } from '@workspace/ui/components/loading';
import cls from 'classnames';
import { useEffect, useRef, useState } from 'react';
import InfiniteScroll from 'react-infinite-scroller';
import { useMusic } from './MusicProvider';
import styles from './index.module.scss';

// 简帖音乐分类的标识（可以是 documentId 或 alias）
const MUSIC_CLASS_SCOPE = 'tlljh8cexlk80g74cz3uisxg'; // 简帖音乐的 documentId

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
  const [floors, setFloors] = useState<MaterialFloor[]>([]);
  const [activeFloorId, setActiveFloorId] = useState<string>('');

  // 初始化 MaterialResourceManager（保持引用稳定，避免重复实例化）
  const materialManagerRef = useRef<MaterialResourceManagerAPI | null>(null);
  if (!materialManagerRef.current) {
    materialManagerRef.current = new MaterialResourceManagerAPI(MUSIC_CLASS_SCOPE);
  }

  // 防止重复请求导致的循环/并发
  const isFetchingRef = useRef(false);

  // 素材楼层
  const fetchFloorData = async () => {
    try {
      const response = await materialManagerRef.current!.getFloors();
      const floorsData = response.data || [];
      if (floorsData.length > 0) {
        // 添加"全部"选项
        const allOption: MaterialFloor = {
          id: '',
          name: '全部',
          desc: '',
          documentId: '',
          createdAt: '',
          updatedAt: '',
          publishedAt: '',
          key: null,
        };
        setFloors([allOption, ...floorsData]);
      }
    } catch (error) {
      console.error('获取楼层数据失败:', error);
    }
  };

  useEffect(() => {
    fetchFloorData();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      setLoading(true);

      try {
        const result = await materialManagerRef.current!.getItems(
          activeFloorId || '', // 空字符串表示获取全部
          {
            page,
            pageSize: 60,
          }
        );

        if (cancelled) return;

        if (result.data) {
          setList(prevList =>
            page === 1 ? result.data : prevList.concat(result.data)
          );
          const total = result.meta?.pagination?.total || 0;
          const pageSize = result.meta?.pagination?.pageSize || 60;
          const currentTotal = page * pageSize;
          setFinished(currentTotal >= total);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('获取素材列表失败:', error);
          setFinished(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
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

  const onUseMusic = (payload: MaterialItem) => {
    // 从 content.url 获取音乐 URL（迁移后数据格式）
    const musicUrl = (payload.content as any)?.url || '';
    if (!musicUrl) {
      return;
    }
    const data: IMusic = {
      title: payload.name,
      url: musicUrl,
      materialId: payload.documentId,
      type: 'music',
      duration: 0,
      preview: payload?.cover?.url,
    };
    onChange(data);
  };

  const onChangeFloor = (id: string) => {
    setActiveFloorId(id);
    setPage(1);
    setFinished(false);
    setList([]);
  };

  // 处理音乐播放
  const handleTogglePlay = async (url: string) => {
    await togglePlay(url);
  };

  // 获取音乐 URL（从 content.url 获取，迁移后的数据格式）
  const getMusicUrl = (item: MaterialItem): string => {
    return (item.content as any)?.url || '';
  };

  return (
    <div className={`${styles.music} h-full overflow-hidden`}>
      <div className={styles.floorsContainer}>
        <div className={styles.floors}>
          {floors.map(item => (
            <div
              key={item.id || item.documentId}
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
            const musicUrl = getMusicUrl(item);
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
                  isPlaying(musicUrl) && styles.playing,
                ])}
                style={{
                  // 确保播放状态样式生效
                  ...(isPlaying(musicUrl) && {
                    backgroundColor: 'rgba(0, 102, 204, 0.1) !important',
                    outline: '1px solid #0066cc !important',
                    color: '#0066cc !important',
                  }),
                }}
                onClick={() => {
                  handleTogglePlay(musicUrl);
                }}
              >
                <div className={styles.cover}>
                  <div
                    className={styles.mask}
                    style={{
                      ...(isPlaying(musicUrl) && {
                        backgroundColor: 'rgba(0, 102, 204, 0.8) !important',
                      }),
                    }}
                  >
                    <Icon
                      name={isPlaying(musicUrl) ? 'pause' : 'play'}
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
                    ...(isPlaying(musicUrl) && {
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

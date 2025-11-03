import styles from './index.module.scss';
import { getCmsApiHost, request, requestCMS } from '@/services';
import { useEffect, useRef, useState } from 'react';
import InfiniteScroll from 'react-infinite-scroller';
import { Loading } from '@workspace/ui/components/loading';
import { useWorksStore } from '../../../useStore';
import qs from 'qs';
import cls from 'classnames';
import { Icon } from '@workspace/ui/components/Icon';
import { Button } from '@workspace/ui/components/button';
import { EventEmitter } from '@mk/utils';
import { useTranslations } from 'next-intl';
import { cdnApi } from '@mk/services';
import { BehaviorBox } from '@workspace/ui/components/BehaviorTracker';
import { CircleCheck, Power, PowerOff } from 'lucide-react';

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
  url: {
    url: string;
  };
}

interface TemplateProps {
  onChange: (theme: MaterialItem) => void;
  onClose?: () => void;
}

const MusicLibContent = (props: TemplateProps) => {
  const [page, setPage] = useState(1);
  const [list, setList] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const worksStore = useWorksStore();
  const [floors, setFloors] = useState<Floor[]>([]);
  const [activeFloorId, setActiveFloorId] = useState<number>(-1);
  const [activeId, setActiveId] = useState<number>();
  const [keyword, setKeyword] = useState('');
  const [searchPage, setSearchPage] = useState(1);
  const [searchList, setSearchList] = useState<MaterialItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFinished, setSearchFinished] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playingSrc, setPlayingSrc] = useState('');
  const [playing, setPlaying] = useState(false);
  const [currentMusic, setCurrentMusic] = useState<any>(
    worksStore?.worksData?.canvasData?.music
  );

  const t = useTranslations('Editor');

  // 素材楼层
  const getFloorData = async () => {
    const query = qs.stringify(
      {
        populate: 'material_class',
        filters: {
          material_class: {
            name: {
              $eq: '简帖音乐',
            },
          },
        },
      },
      { encodeValuesOnly: true }
    );

    const promptGroupRes = (
      await requestCMS.get(`${getCmsApiHost()}/api/material-tags?${query}`)
    ).data.data;

    if (promptGroupRes.length > 0) {
      setFloors([{ id: -1, name: t('all') }, ...promptGroupRes]);
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
          url: {
            populate: '*',
          },
          material_floors: {
            populate: {
              material_class: {
                populate: '*',
              },
            },
          },
        },

        filters: {
          material_floors: {
            material_class: {
              name: {
                $eq: '简帖音乐',
              },
            },
          },
        },
        pagination: {
          pageSize: limit,
          page: page,
        },
      },
      { encodeValuesOnly: true }
    );

    const res = await requestCMS.get(
      `${getCmsApiHost()}/api/material-musics?${query}`
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
          url: {
            populate: '*',
          },
        },

        filters: {
          material_floors: {
            id: {
              $eq: activeFloorId && activeFloorId > -1 ? activeFloorId : '',
            },
          },
        },
        pagination: {
          pageSize: limit,
          page: page,
        },
      },
      { encodeValuesOnly: true }
    );

    const res = await requestCMS.get(
      `${getCmsApiHost()}/api/material-musics?${query}&populate=material_floors`
    );
    if (res?.data?.data) {
      setList(page === 1 ? res.data.data : list.concat(res.data.data));
      setFinished(res.data.data.length < limit);
      setLoading(false);
    }
  };

  const searchMaterials = async () => {
    setSearchLoading(true);
    const query = qs.stringify(
      {
        populate: {
          cover: {
            populate: '*',
          },
          url: {
            populate: '*',
          },
        },
        filters: {
          name: {
            $contains: keyword,
          },
        },
        pagination: {
          pageSize: limit,
          page: page,
        },
      },
      { encodeValuesOnly: true }
    );

    const res = await requestCMS.get(
      `${getCmsApiHost()}/api/material-musics?${query}`
    );
    if (res?.data?.data) {
      setSearchList(
        page === 1 ? res.data.data : searchList.concat(res.data.data)
      );
      setSearchFinished(res.data.data.length < limit);
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    getFloorData();
  }, []);

  useEffect(() => {
    if (keyword) {
      searchMaterials();
    }
  }, [keyword, searchPage]);

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

  const onUseMusic = (payload: MaterialItem) => {
    if (!payload?.url?.url) {
      return;
    }
    const data = {
      title: payload.name,
      url: payload.url.url,
      materialId: payload.id.toString(),
      type: 'music',
      duration: 0,
      preview: payload?.cover?.url,
    };
    worksStore.setMusic(data);
    setCurrentMusic(data);
  };

  const clearMusic = () => {
    if (playing && playingSrc === currentMusic.url) {
      setPlaying(false);
      setPlayingSrc('');
      audioRef.current?.pause();
    }

    const emptyMusic = {
      title: '',
      materialId: '',
      type: '',
      duration: -1,
      url: '',
      preview: '',
    };
    worksStore?.setMusic(emptyMusic);
    setCurrentMusic(emptyMusic);
  };

  const onChangeFloor = (id: number) => {
    setActiveFloorId(id);
    setPage(1);
    setFinished(false);
    setList([]);
  };

  useEffect(() => {
    if (playingSrc) {
      audioRef.current?.play();
      EventEmitter.emit('stopMusic', '');
    }
  }, [playingSrc]);

  const togglePlay = (url: string) => {
    if (url !== playingSrc) {
      audioRef.current?.play();
      EventEmitter.emit('stopMusic', '');
      setPlayingSrc(url);
      setPlaying(true);
    } else if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
    } else {
      audioRef.current?.play();
      EventEmitter.emit('stopMusic', '');
      setPlaying(true);
    }
  };

  const renderCurrentMusic = () => {
    // const curMusic = worksStore?.worksData?.canvasData?.music
    // console.log(curMusic)

    if (!currentMusic.url) {
      return null;
    }
    return (
      <div className={styles.currentMusic}>
        <div
          className={styles.cover}
          onClick={() => {
            togglePlay(currentMusic.url || '');
          }}
        >
          <div className={styles.mask}>
            <Icon
              name={
                playing && playingSrc === currentMusic.url ? 'pause' : 'play'
              }
              color='#fff'
            />
          </div>
          <img
            src={cdnApi(currentMusic.preview, {
              resizeWidth: 120,
            })}
            alt=''
          />
        </div>
        <div className={styles.name}>{currentMusic.title}</div>
        <Button variant='ghost' onClick={() => clearMusic()}>
          {t('clearMusic')}
        </Button>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <Icon
        name='close'
        size={20}
        className={styles.close}
        color='#000'
        onClick={() => props.onClose?.()}
      />

      <div className={styles.head}>
        <div className={styles.title}>
          <Icon name='music2' size={20} />
          <span>音乐</span>
        </div>
        <div className={styles.curMusic}>
          当前选择：{currentMusic?.title || '无'}
        </div>
      </div>
      <div className={styles.music}>
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
        <div className={styles.scrollList}>
          <InfiniteScroll
            initialLoad={false}
            pageStart={0}
            loadMore={loadMore}
            hasMore={!finished}
            useWindow={false}
            className={styles.materialList}
          >
            {list.map(item => (
              <BehaviorBox
                behavior={{
                  object_type: 'template_click',
                  object_id: `${item.id}`,
                  parent_id: 'ai_works',
                }}
                key={item.id}
                className={cls([
                  styles.templateItem,
                  activeId === item.id && styles.active,
                ])}
                onClick={() => {
                  togglePlay(item.url.url);
                }}
              >
                <div className={styles.cover}>
                  <div className={styles.mask}>
                    <Icon
                      name={
                        playing && playingSrc === item.url.url
                          ? 'pause'
                          : 'play'
                      }
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
                <div className={styles.name}>{item.name}</div>
                <Button
                  size='sm'
                  onClick={() => {
                    setActiveId(item.id);
                    onUseMusic(item);
                  }}
                >
                  {t('apply')}
                </Button>
              </BehaviorBox>
            ))}
          </InfiniteScroll>
          {loading && (
            <div className={styles.loading}>
              <Loading />
            </div>
          )}
        </div>
        <audio
          loop
          ref={audioRef}
          src={playingSrc}
          preload='auto'
          autoPlay={false}
        ></audio>
      </div>
      {renderCurrentMusic()}

      <div className={styles.footer}>
        {currentMusic.disabled ? (
          <>
            <Button
              className='flex-1 hover:bg-background'
              size='lg'
              variant='outline'
              onClick={() => {
                props.onClose?.();
              }}
            >
              暂不开启
            </Button>
            <Button
              className={styles.open_btn}
              size='lg'
              onClick={() => {
                worksStore.setMusic({
                  ...currentMusic,
                  disabled: false,
                });
                setCurrentMusic({
                  ...currentMusic,
                  disabled: false,
                });
                EventEmitter.emit('resumeMusic', '');
                props.onClose?.();
              }}
            >
              <Power size={20} />
              开启功能
            </Button>
          </>
        ) : (
          <>
            <Button
              className={cls([styles.close_btn, 'hover:bg-background'])}
              size='lg'
              variant='outline'
              onClick={() => {
                worksStore.setMusic({
                  ...currentMusic,
                  disabled: true,
                });
                setCurrentMusic({
                  ...currentMusic,
                  disabled: true,
                });
                EventEmitter.emit('stopMusic', '');
                setPlaying(false);
                audioRef.current?.pause();
                props.onClose?.();
              }}
            >
              <PowerOff size={20} />
              关闭功能
            </Button>
            <Button
              className={styles.open_btn}
              size='lg'
              onClick={() => props.onClose?.()}
            >
              <CircleCheck size={20} />
              完成设置
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default MusicLibContent;

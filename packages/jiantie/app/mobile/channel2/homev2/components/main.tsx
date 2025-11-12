'use client';

import { getUid } from '@/services';
import { navigateWithBridge } from '@/utils/navigate-with-bridge';
import { trpc } from '@/utils/trpc';
import APPBridge from '@mk/app-bridge';
import CommonLogger from '@mk/loggerv7/logger';
import { cdnApi } from '@mk/services';
import { BehaviorBox } from '@workspace/ui/components/BehaviorTracker';
import { ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface ChannelEntity {
  id: number;
  alias: string | null;
  display_name: string;
  thumb_path: string | null;
  class: string;
  locale: string;
  parent_id: number | null;
  appid: string | null;
  template_ids?: string[] | null;
  desc?: string | null;
  remark?: string | null;
  children?: ChannelEntity[];
}

interface Props {
  appid?: string;
}

const gradientBackground =
  'linear-gradient(229.86deg, rgba(242, 155, 227, 0.5) 1.92%, rgba(255, 255, 255, 0.5) 28.84%), linear-gradient(135.77deg, rgba(242, 155, 155, 0.5) 7.08%, rgba(255, 255, 255, 0.5) 38.06%), linear-gradient(90deg, rgba(255,255,255,1) 0%, rgba(255,255,255,1) 100%)';

export default function Main({ appid = 'jiantie' }: Props) {
  const router = useRouter();
  const [channels, setChannels] = useState<ChannelEntity[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [channelsError, setChannelsError] = useState<string | null>(null);

  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(
    null
  );
  const [hotwords, setHotwords] = useState<ChannelEntity[]>([]);
  const [selectedHotwordId, setSelectedHotwordId] = useState<number | null>(
    null
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailInitialized, setDetailInitialized] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [floors, setFloors] = useState<ChannelEntity[]>([]);
  const [floorsLoading, setFloorsLoading] = useState(false);
  const [floorsInitialized, setFloorsInitialized] = useState(false);
  const [floorsError, setFloorsError] = useState<string | null>(null);
  const [expandedFloors, setExpandedFloors] = useState<Record<number, boolean>>(
    {}
  );

  const [unread, setUnread] = useState(0);

  useEffect(() => {
    CommonLogger.track_pageview({
      page_type: 'channel2_home_v2',
      page_id: 'channel2_home_v2',
    });
  }, []);

  useEffect(() => {
    let cancel = false;
    const fetchChannels = async () => {
      try {
        setChannelsLoading(true);
        setChannelsError(null);

        const data = (await trpc.channel.getChannels.query({
          appid,
          locale: 'zh-CN',
          env: 'production',
        })) as ChannelEntity[];

        if (cancel) return;

        const map = new Map<number, ChannelEntity>();
        data.forEach((topLevel: ChannelEntity) => {
          (topLevel.children || []).forEach((child: ChannelEntity) => {
            if (!map.has(child.id)) {
              map.set(child.id, child as ChannelEntity);
            }
          });
        });

        const flattened = Array.from(map.values());
        setChannels(flattened);

        setSelectedChannelId(prev => {
          if (prev !== null) return prev;
          return flattened.length > 0 ? flattened[0].id : null;
        });
      } catch (error) {
        console.error('加载二级栏目失败:', error);
        if (!cancel) {
          setChannelsError(
            error instanceof Error ? error.message : '网络请求失败'
          );
        }
      } finally {
        if (!cancel) {
          setChannelsLoading(false);
        }
      }
    };

    const fetchUnreadNotifications = async () => {
      try {
        const uid = getUid();
        if (!uid) {
          setUnread(0);
          return;
        }
        const res = await trpc.rsvp.getUnreadNotificationCount.query({
          user_id: uid,
        });
        setUnread(res.count || 0);
      } catch (error) {
        console.error('获取通知未读数失败:', error);
        setUnread(0);
      }
    };

    fetchChannels();
    fetchUnreadNotifications();

    return () => {
      cancel = true;
    };
  }, [appid]);

  useEffect(() => {
    if (!selectedChannelId) {
      return;
    }

    let cancel = false;
    const loadChannelDetail = async () => {
      try {
        setDetailLoading(true);
        setDetailError(null);

        const detail = await trpc.channel.getChannelDetail.query({
          id: selectedChannelId,
          locale: 'zh-CN',
        });

        if (cancel) return;

        const thirdLevel = detail?.children || [];
        setHotwords(thirdLevel);

        if (thirdLevel.length > 0) {
          const firstId = thirdLevel[0].id;
          setSelectedHotwordId(prev =>
            thirdLevel.some((item: ChannelEntity) => item.id === prev)
              ? prev
              : firstId
          );
        } else {
          setSelectedHotwordId(null);
          setFloors([]);
        }
      } catch (error) {
        console.error('加载频道详情失败:', error);
        if (!cancel) {
          setDetailError(
            error instanceof Error ? error.message : '网络请求失败'
          );
          setHotwords([]);
          setSelectedHotwordId(null);
          setFloors([]);
        }
      } finally {
        if (!cancel) {
          setDetailLoading(false);
          setDetailInitialized(true);
        }
      }
    };

    loadChannelDetail();

    return () => {
      cancel = true;
    };
  }, [selectedChannelId]);

  useEffect(() => {
    if (!selectedHotwordId) {
      setFloors([]);
      setFloorsInitialized(true);
      setFloorsLoading(false);
      return;
    }

    let cancel = false;
    const loadFloors = async () => {
      try {
        setFloorsLoading(true);
        setFloorsError(null);

        const data = await trpc.channel.getFourthLevelCollections.query({
          parentId: selectedHotwordId,
          locale: 'zh-CN',
        });

        if (!cancel) {
          setFloors(data as ChannelEntity[]);
        }
      } catch (error) {
        console.error('加载楼层数据失败:', error);
        if (!cancel) {
          setFloorsError(
            error instanceof Error ? error.message : '网络请求失败'
          );
        }
      } finally {
        if (!cancel) {
          setFloorsLoading(false);
          setFloorsInitialized(true);
        }
      }
    };

    loadFloors();

    return () => {
      cancel = true;
    };
  }, [selectedHotwordId]);

  useEffect(() => {
    setExpandedFloors(prev => {
      const next: Record<number, boolean> = {};
      floors.forEach(floor => {
        if (floors.length === 1) {
          next[floor.id] = true;
        } else {
          next[floor.id] = prev[floor.id] || false;
        }
      });
      return next;
    });
  }, [floors]);

  const toNotificationCenter = () => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}/mobile/rsvp/notifications`,
        type: 'URL',
      });
    } else {
      router.push(`/mobile/rsvp/notifications?appid=${appid}`);
    }
  };

  const handleChannelSelect = (channelId: number) => {
    if (channelId === selectedChannelId) return;
    setSelectedChannelId(channelId);
  };

  const handleHotwordSelect = (hotwordId: number) => {
    if (hotwordId === selectedHotwordId) return;
    setSelectedHotwordId(hotwordId);
  };

  const isFloorsUpdating = floorsLoading && floorsInitialized;
  const isDetailUpdating = detailLoading && detailInitialized;
  const isSingleFloor = floors.length === 1;

  return (
    <div
      className='flex min-h-dvh flex-col'
      style={{
        paddingTop: 'var(--safe-area-inset-top)',
        // backgroundImage: gradientBackground,
        backgroundImage: 'url(https://res.maka.im/assets/jiantie/beijing4.jpg)',
        backgroundSize: '100% ',
        backgroundPosition: 'top',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <header className='px-4  pt-4 flex items-center justify-between'>
        <button
          className='flex items-center gap-2'
          onDoubleClick={() => {
            router.push('/mobile/home');
          }}
        >
          <img
            src={cdnApi('/assets/jiantie/logo2.png')}
            alt='简帖'
            className='w-16 h-10 object-contain'
          />
        </button>
        <div className='flex items-center gap-2'>
          {/* <button className='flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm font-semibold text-neutral-900 shadow-sm'>
            <span className='text-xs font-semibold text-neutral-800'>En</span>
            <ChevronDown className='h-4 w-4 text-neutral-700' />
          </button> */}
          <button
            onClick={toNotificationCenter}
            className='relative flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm active:scale-95 transition transform'
          >
            <span className='text-sm leading-none'>🔔</span>
            {unread > 0 && (
              <span className='absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold text-white'>
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>
        </div>
      </header>

      <section className=' pb-4 pt-3'>
        <div className='w-full  overflow-x-auto  [--scrollbar-color:transparent] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'>
          <div className='flex gap-4 px-4 pr-16'>
            {channels.map(channel => {
              const isActive = channel.id === selectedChannelId;
              const label = channel.display_name || '频道';
              return (
                <button
                  key={channel.id}
                  onClick={() => handleChannelSelect(channel.id)}
                  className='flex w-10 flex-col items-center gap-2'
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full shadow-sm transition-all ${
                      isActive
                        ? 'bg-gradient-to-br from-[#ff4667] to-[#ff6f91] text-white'
                        : 'bg-[#f4f4f5] text-neutral-900 border border-white '
                    }`}
                  >
                    {channel.thumb_path ? (
                      <img
                        src={cdnApi(channel.thumb_path)}
                        alt={channel.display_name}
                        className='h-4 w-4 object-contain'
                      />
                    ) : (
                      <span className='text-base font-semibold'>
                        {label.slice(0, 2)}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-center text-base font-semibold leading-4 ${
                      isActive ? 'text-[#ff4667]' : 'text-neutral-700'
                    }`}
                  >
                    {label.slice(0, 2)}
                  </span>
                </button>
              );
            })}
            <div className='w-16 h-10 opacity-0'>1</div>
          </div>
        </div>
      </section>

      <div className='flex-1 overflow-hidden rounded-t-2xl bg-white shadow-[0_-6px_20px_rgba(0,0,0,0.04)]'>
        {channelsError ? (
          <div className='flex h-full flex-col items-center justify-center px-6 text-center text-red-500'>
            <p className='mb-2 text-xl'>加载失败</p>
            <p className='text-sm text-red-400'>{channelsError}</p>
          </div>
        ) : (
          <div className='flex h-full flex-col'>
            {(detailError || hotwords.length !== 1) && (
              <section className='px-3 py-3'>
                {detailError ? (
                  <div className='rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-500'>
                    {detailError}
                  </div>
                ) : (
                  <div className='-mx-1 overflow-x-auto px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'>
                    <div className='flex gap-2'>
                      {hotwords.map((item: ChannelEntity) => {
                        const isActive = item.id === selectedHotwordId;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleHotwordSelect(item.id)}
                            className={`whitespace-nowrap rounded-full px-2 py-1 text-base font-semibold transition-all shadow-sm ${
                              isActive
                                ? 'bg-[#D53933] text-white'
                                : 'bg-[#F4F4F5] text-neutral-900'
                            }`}
                            style={{
                              border: isActive ? 'none' : '1px solid #fff',
                            }}
                          >
                            {item.display_name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            )}

            <div className='flex-1 overflow-y-auto'>
              {!floorsInitialized && floorsLoading ? (
                <div className='flex h-full items-center justify-center'>
                  <div className='text-center text-gray-500'>
                    <div className='mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#D53933] border-t-transparent' />
                    正在加载内容...
                  </div>
                </div>
              ) : floorsError ? (
                <div className='px-4 py-6 text-center text-sm text-rose-500'>
                  {floorsError}
                </div>
              ) : (
                <div className='relative'>
                  {isFloorsUpdating ? (
                    <div className='pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-white/70 backdrop-blur-[1px]'>
                      <div className='flex items-center gap-2 text-sm text-gray-500'>
                        <div className='h-4 w-4 animate-spin rounded-full border-2 border-[#D53933] border-t-transparent' />
                        更新中
                      </div>
                    </div>
                  ) : null}
                  <div className='space-y-6 px-4 py-3'>
                    {floors.map(floor => {
                      const collections = floor.children || [];
                      const isExpanded = expandedFloors[floor.id] || false;
                      const shouldShowToggle =
                        collections.length > 4 && floors.length > 1;
                      const visibleCollections =
                        isExpanded || !shouldShowToggle
                          ? collections
                          : collections.slice(0, 4);
                      return (
                        <section
                          key={floor.id}
                          className='rounded-2xl bg-white'
                        >
                          <div className='mb-3 flex items-center justify-between'>
                            <h4 className='text-base font-semibold text-neutral-900'>
                              {floor.display_name || '场景名称'}
                            </h4>
                            {shouldShowToggle ? (
                              <button
                                className='flex items-center gap-1 text-sm font-semibold text-[#D53933]'
                                onClick={() => {
                                  setExpandedFloors(prev => ({
                                    ...prev,
                                    [floor.id]: !isExpanded,
                                  }));
                                }}
                              >
                                {isExpanded ? '收起' : '查看全部'}
                                <ChevronRight
                                  className={`h-4 w-4 transform transition-transform duration-200 ${
                                    isExpanded ? 'rotate-90' : 'rotate-0'
                                  }`}
                                />
                              </button>
                            ) : null}
                          </div>

                          {collections.length === 0 ? (
                            <div className='rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-400'>
                              该楼层暂无集合
                            </div>
                          ) : (
                            <div className='grid grid-cols-2 gap-4'>
                              {visibleCollections.map(collection => {
                                const label = collection.display_name || '集合';
                                return (
                                  <BehaviorBox
                                    key={collection.id}
                                    behavior={{
                                      object_type: 'template_collection_btn',
                                      object_id: `${collection.id}`,
                                    }}
                                    className='overflow-hidden rounded-2xl border border-white bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-transform active:scale-[0.99]'
                                    onClick={() => {
                                      navigateWithBridge({
                                        path: `/mobile/channel2/collection/${collection.id}`,
                                        router,
                                      });
                                    }}
                                  >
                                    <div className='relative'>
                                      <div className='aspect-[176/236] overflow-hidden rounded-t-2xl bg-gradient-to-br from-rose-50 to-rose-100'>
                                        {collection.thumb_path ? (
                                          <img
                                            src={cdnApi(collection.thumb_path, {
                                              resizeWidth: 640,
                                            })}
                                            alt={label}
                                            className='h-full w-full object-cover'
                                          />
                                        ) : (
                                          <div className='flex h-full w-full items-center justify-center text-xl font-semibold text-rose-300'>
                                            {label.slice(0, 2)}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </BehaviorBox>
                                );
                              })}
                            </div>
                          )}
                        </section>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

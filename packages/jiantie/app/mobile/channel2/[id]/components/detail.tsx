'use client';

import {
  backWithBridge,
  navigateWithBridge,
} from '@/utils/navigate-with-bridge';
import { trpc } from '@/utils/trpc';
import { cdnApi } from '@mk/services';
import { ChevronRight, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Channel {
  id: number;
  alias: string;
  display_name: string;
  thumb_path: string | null;
  class: string;
  locale: string;
  template_ids: string[];
  parent_id: number | null;
  appid: string | null;
  create_time: string;
  update_time: string;
  children?: Channel[];
}

interface DetailProps {
  channelId: number;
}

export default function Detail({ channelId }: DetailProps) {
  const router = useRouter();
  const [channelDetail, setChannelDetail] = useState<Channel | null>(null);
  const [thirdLevelKeywords, setThirdLevelKeywords] = useState<Channel[]>([]);
  const [selectedKeywordId, setSelectedKeywordId] = useState<number | null>(
    null
  );
  const [fourthLevelFloors, setFourthLevelFloors] = useState<Channel[]>([]);
  const [expandedFloors, setExpandedFloors] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());

  // 获取二级频道详情和三级热词
  useEffect(() => {
    const fetchChannelDetail = async () => {
      try {
        setLoading(true);
        const data = await trpc.channel.getChannelDetail.query({
          id: channelId,
          locale: 'zh-CN',
        });

        if (!data) {
          setError('频道不存在');
          return;
        }

        setChannelDetail(data);
        setThirdLevelKeywords(data.children || []);

        // 默认选中第一个三级热词
        if (data.children && data.children.length > 0) {
          setSelectedKeywordId(data.children[0].id);
        }
      } catch (err) {
        console.error('获取频道详情失败:', err);
        setError(err instanceof Error ? err.message : '网络请求失败');
      } finally {
        setLoading(false);
      }
    };

    fetchChannelDetail();
  }, [channelId]);

  // 获取四级楼层（包含五级集合）
  useEffect(() => {
    if (!selectedKeywordId) return;

    const fetchFloors = async () => {
      try {
        const data = await trpc.channel.getFourthLevelCollections.query({
          parentId: selectedKeywordId,
        });
        setFourthLevelFloors(data);
      } catch (err) {
        console.error('获取四级楼层失败:', err);
      }
    };

    fetchFloors();
  }, [selectedKeywordId]);

  if (loading) {
    return (
      <div className='flex items-center justify-center h-dvh bg-gray-50'>
        <div className='text-center'>
          <div className='w-12 h-12 border-4 border-[#D53933] border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
          <p className='text-gray-500'>加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !channelDetail) {
    return (
      <div className='flex flex-col items-center justify-center h-dvh bg-gray-50'>
        <div className='text-center text-red-500'>
          <p className='text-xl mb-2'>❌</p>
          <p>{error || '频道不存在'}</p>
        </div>
        <button
          onClick={() => backWithBridge(router)}
          className='mt-6 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors'
        >
          返回
        </button>
      </div>
    );
  }

  return (
    <div
      className='flex flex-col h-dvh '
      style={{
        backgroundImage: 'url(https://res.maka.im/assets/jiantie/beijing4.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        // backgroundColor: 'yellow',
      }}
    >
      {/* 顶部导航栏 */}
      <div>
        <div className='bg-white flex items-center justify-between px-4 py-3 mb-3'>
          {/* 左侧：返回按钮 + 频道信息 */}
          <div className='flex items-center space-x-3 flex-1'>
            <button
              onClick={() => backWithBridge(router)}
              className='group flex-shrink-0 text-gray-900 rounded-full p-1 transition-transform duration-150 ease-out hover:bg-gray-100/70 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D53933]/40'
            >
              <span className='sr-only'>返回</span>
              <svg
                className='w-6 h-6 transition-transform duration-200 ease-out'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M15 19l-7-7 7-7'
                />
              </svg>
            </button>

            {channelDetail.thumb_path && (
              <div className='w-100 h-6 flex-shrink-0'>
                <h1 className='text-base font-medium text-gray-900 truncate'>
                  {channelDetail.display_name}
                </h1>
              </div>
            )}
          </div>

          {/* 右侧：搜索按钮 */}
          <button
            onClick={() =>
              navigateWithBridge({ path: '/mobile/channel2/search', router })
            }
            className='group flex-shrink-0 text-gray-900 ml-2 rounded-full p-1 transition-transform duration-150 ease-out hover:bg-gray-100/70 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D53933]/40'
          >
            <span className='sr-only'>搜索</span>
            <Search className='w-5 h-5 transition-transform duration-200 ease-out' />
          </button>
        </div>

        {/* 三级热词标签 */}
        {thirdLevelKeywords.length > 1 && (
          <div className='p-3 pt-0 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'>
            <div className='flex space-x-2'>
              {thirdLevelKeywords.map(keyword => (
                <button
                  key={keyword.id}
                  onClick={() => setSelectedKeywordId(keyword.id)}
                  // box-shadow: 0 1px 2px -1px rgba(0, 0, 0, 0.10), 0 1px 3px 0 rgba(0, 0, 0, 0.10);
                  //                   border-radius: 75px;
                  // border: 1px solid #FFF;
                  style={{
                    fontSize: '16px',
                    // fontWeight: 'bold',
                    borderRadius: '75px',
                    border:
                      selectedKeywordId != keyword.id
                        ? '1px solid #FFF'
                        : 'none',
                    boxShadow:
                      '0 1px 2px -1px rgba(0, 0, 0, 0.10), 0 1px 3px 0 rgba(0, 0, 0, 0.10)',
                  }}
                  className={`px-4 py-1.5  whitespace-nowrap text-sm font-bold transition-all ${
                    selectedKeywordId === keyword.id
                      ? 'bg-[#D53933] text-white shadow-sm'
                      : 'bg-[#F4F4F5] text-[#09090B]'
                  }`}
                >
                  {keyword.display_name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 主内容区 - 四级楼层和五级集合 */}
      <div className='flex-1 overflow-y-auto bg-cover bg-center bg-no-repeat'>
        {fourthLevelFloors.length === 0 ? (
          <div className='flex items-center justify-center h-full'>
            <div className='text-center text-gray-400'>
              <p className='text-4xl mb-2'>📭</p>
              <p className='text-sm'>暂无数据</p>
            </div>
          </div>
        ) : (
          <div className=' space-y-6 pb-6'>
            {fourthLevelFloors.map(floor => {
              const isSingleFloor = fourthLevelFloors.length === 1;
              const isExpanded = expandedFloors.has(floor.id);
              const collections = floor.children || [];
              const hasMore = collections.length > 4;
              const displayCollections =
                isSingleFloor || isExpanded
                  ? collections
                  : collections.slice(0, 4);

              return (
                <div key={floor.id}>
                  {/* 四级楼层标题 - 只有多个楼层时才显示 */}
                  {!isSingleFloor && (
                    <div className='px-4 mb-3 flex items-center justify-between'>
                      <h2 className='text-base font-bold text-gray-900'>
                        {floor.display_name}
                      </h2>
                      {hasMore && (
                        <button
                          onClick={() => {
                            setExpandedFloors(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(floor.id)) {
                                newSet.delete(floor.id);
                              } else {
                                newSet.add(floor.id);
                              }
                              return newSet;
                            });
                          }}
                          className='inline-flex items-center gap-1 text-[#D53933] text-sm whitespace-nowrap'
                        >
                          <span>{isExpanded ? '收起' : '查看全部'}</span>
                          <ChevronRight
                            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          />
                        </button>
                      )}
                    </div>
                  )}

                  {/* 五级集合卡片网格 */}
                  {displayCollections.length > 0 ? (
                    <div className='px-4 grid grid-cols-2 gap-x-2.5 gap-y-3 transition-all duration-300'>
                      {displayCollections.map((collection, index) => {
                        const isInInitial4 = index < 4;
                        return (
                          <div
                            key={collection.id}
                            className={`bg-white rounded-tl-lg rounded-tr-lg rounded-bl-lg overflow-hidden active:opacity-80 transition-all duration-300 ${
                              !isInInitial4 && isExpanded
                                ? 'animate-fadeInUp'
                                : ''
                            }`}
                            style={{
                              animationDelay:
                                !isInInitial4 && isExpanded
                                  ? `${(index - 4) * 50}ms`
                                  : '0ms',
                            }}
                            onClick={() => {
                              navigateWithBridge({
                                path: `/mobile/channel2/collection/${collection.id}`,
                                router,
                              });
                            }}
                          >
                            {/* 集合缩略图 */}
                            <div className='aspect-[176/236] bg-gradient-to-br from-gray-100 to-gray-50 relative'>
                              {collection.thumb_path ? (
                                <img
                                  src={cdnApi(collection.thumb_path, {
                                    resizeWidth: 640,
                                  })}
                                  alt={collection.display_name}
                                  className={`object-cover w-full h-full absolute inset-0 transition-opacity duration-300 ${
                                    loadedImages.has(collection.id)
                                      ? 'opacity-100'
                                      : 'opacity-0'
                                  }`}
                                  onLoad={() => {
                                    setLoadedImages(prev => {
                                      const newSet = new Set(prev);
                                      newSet.add(collection.id);
                                      return newSet;
                                    });
                                  }}
                                />
                              ) : (
                                <div className='flex items-center justify-center h-full'>
                                  <span className='text-3xl font-bold text-gray-300'>
                                    {collection.display_name.substring(0, 2)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className='px-4 py-6 text-center text-gray-400 text-sm'>
                      该楼层暂无集合
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

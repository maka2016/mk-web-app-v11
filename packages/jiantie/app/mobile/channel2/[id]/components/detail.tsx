'use client';

import { trpc } from '@/utils/trpc';
import { cdnApi } from '@mk/services';
import { Search } from 'lucide-react';
import Image from 'next/image';
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
  create_time: Date;
  update_time: Date;
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
  const [fourthLevelCollections, setFourthLevelCollections] = useState<
    Channel[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // 获取四级集合
  useEffect(() => {
    if (!selectedKeywordId) return;

    const fetchCollections = async () => {
      try {
        const data = await trpc.channel.getFourthLevelCollections.query({
          parentId: selectedKeywordId,
          locale: 'zh-CN',
        });
        setFourthLevelCollections(data);
      } catch (err) {
        console.error('获取四级集合失败:', err);
      }
    };

    fetchCollections();
  }, [selectedKeywordId]);

  if (loading) {
    return (
      <div className='flex items-center justify-center h-dvh bg-gray-50'>
        <div className='text-center'>
          <div className='w-12 h-12 border-4 border-pink-600 border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
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
          onClick={() => router.back()}
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
        <div className='bg-white flex items-center justify-between px-4 py-3'>
          {/* 左侧：返回按钮 + 频道信息 */}
          <div className='flex items-center space-x-3 flex-1'>
            <button
              onClick={() => router.back()}
              className='flex-shrink-0 text-gray-900'
            >
              <svg
                className='w-6 h-6'
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
                <Image
                  src={cdnApi(channelDetail.thumb_path)}
                  alt={channelDetail.display_name}
                  width={24}
                  height={24}
                  className='object-contain'
                />
                <h1 className='text-base font-medium text-gray-900 truncate'>
                  {channelDetail.display_name}
                </h1>
              </div>
            )}
          </div>

          {/* 右侧：搜索按钮 */}
          <button
            onClick={() => router.push(`/mobile/channel2/search`)}
            className='flex-shrink-0 text-gray-900 ml-2'
          >
            <Search className='w-5 h-5' />
          </button>
        </div>

        {/* 三级热词标签 */}
        {thirdLevelKeywords.length > 1 && (
          <div className='p-3 pb-0  overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'>
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
                    border: '1px solid #FFF',
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

      {/* 主内容区 - 四级集合 */}
      <div className='flex-1 overflow-y-auto bg-cover bg-center bg-no-repeat'>
        {fourthLevelCollections.length === 0 ? (
          <div className='flex items-center justify-center h-full'>
            <div className='text-center text-gray-400'>
              <p className='text-4xl mb-2'>📭</p>
              <p className='text-sm'>暂无数据</p>
            </div>
          </div>
        ) : (
          <div className='pt-3'>
            {/* 场景名称标题 */}

            {/* 模板卡片网格 */}
            <div className='px-4 grid grid-cols-2 gap-x-2.5 gap-y-3'>
              {fourthLevelCollections.map(collection => (
                <div
                  key={collection.id}
                  className='bg-white rounded-tl-lg rounded-tr-lg rounded-bl-lg overflow-hidden active:opacity-80 transition-opacity'
                  onClick={() => {
                    router.push(`/mobile/channel2/collection/${collection.id}`);
                  }}
                >
                  {/* 集合缩略图 */}
                  <div className='aspect-[176/236] bg-gradient-to-br from-gray-100 to-gray-50 relative'>
                    {collection.thumb_path ? (
                      <Image
                        src={cdnApi(collection.thumb_path)}
                        alt={collection.display_name}
                        fill
                        className='object-cover'
                      />
                    ) : (
                      <div className='flex items-center justify-center h-full'>
                        <span className='text-3xl font-bold text-gray-300'>
                          {collection.display_name.substring(0, 2)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 集合信息 */}
                  {/* <div className='px-2 py-2'>
                    <h3 className='text-xs text-gray-900 font-medium line-clamp-1 mb-0.5'>
                      {collection.display_name}
                    </h3>
                  </div> */}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

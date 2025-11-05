'use client';

import { trpc } from '@/utils/trpc';
import { cdnApi } from '@mk/services';
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
          <div className='w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
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
    <div className='flex flex-col h-dvh bg-gray-50'>
      {/* 顶部频道信息 */}
      <div className='bg-white shadow-sm'>
        <div className='flex items-center p-4 space-x-4'>
          {/* 返回按钮 */}
          <button
            onClick={() => router.back()}
            className='flex-shrink-0 text-gray-600 hover:text-gray-900'
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

          {/* 频道信息 */}
          <div className='flex items-center space-x-3 flex-1'>
            {channelDetail.thumb_path && (
              <div className='w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-gray-100'>
                <Image
                  src={cdnApi(channelDetail.thumb_path)}
                  alt={channelDetail.display_name}
                  width={48}
                  height={48}
                  className='object-cover'
                />
              </div>
            )}
            <div>
              <h1 className='text-lg font-semibold text-gray-900'>
                {channelDetail.display_name}
              </h1>
              <p className='text-sm text-gray-500'>
                {channelDetail.template_ids.length} 个模板
              </p>
            </div>
          </div>
        </div>

        {/* 三级热词标签 */}
        {thirdLevelKeywords.length > 0 && (
          <div className='px-4 pb-3 overflow-x-auto'>
            <div className='flex space-x-2'>
              {thirdLevelKeywords.map(keyword => (
                <button
                  key={keyword.id}
                  onClick={() => setSelectedKeywordId(keyword.id)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                    selectedKeywordId === keyword.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
      <div className='flex-1 overflow-y-auto p-4'>
        {fourthLevelCollections.length === 0 ? (
          <div className='flex items-center justify-center h-full'>
            <div className='text-center text-gray-500'>
              <p className='text-xl mb-2'>📭</p>
              <p>暂无集合数据</p>
            </div>
          </div>
        ) : (
          <div className='grid grid-cols-2 gap-4'>
            {fourthLevelCollections.map(collection => (
              <div
                key={collection.id}
                className='bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer'
                onClick={() => {
                  router.push(`/mobile/chanel2/collection/${collection.id}`);
                }}
              >
                {/* 集合缩略图 */}
                <div className='aspect-[4/3] bg-gray-100 relative'>
                  {collection.thumb_path ? (
                    <Image
                      src={cdnApi(collection.thumb_path)}
                      alt={collection.display_name}
                      fill
                      className='object-cover'
                    />
                  ) : (
                    <div className='flex items-center justify-center h-full text-4xl text-gray-400'>
                      {collection.display_name.substring(0, 2)}
                    </div>
                  )}
                </div>

                {/* 集合信息 */}
                <div className='p-3'>
                  <h3 className='text-sm font-medium text-gray-900 mb-1 line-clamp-1'>
                    {collection.display_name}
                  </h3>
                  <p className='text-xs text-gray-500'>
                    {collection.template_ids.length} 个模板
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

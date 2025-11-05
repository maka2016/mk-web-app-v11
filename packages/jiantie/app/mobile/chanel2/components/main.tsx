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

interface Props {
  appid?: string;
}

export default function Main({ appid = 'jiantie' }: Props) {
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        setLoading(true);
        const data = await trpc.channel.getChannels.query({
          appid,
          locale: 'zh-CN',
        });
        setChannels(data);
      } catch (err) {
        console.error('获取频道数据失败:', err);
        setError(err instanceof Error ? err.message : '网络请求失败');
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();
  }, [appid]);

  return (
    <div className='flex flex-col h-dvh bg-gray-50'>
      {/* 顶部搜索栏 */}
      <div className='bg-white shadow-sm p-4 sticky top-0 z-10'>
        <div
          onClick={() => router.push('/mobile/chanel2/search')}
          className='flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors'
        >
          <Search className='w-5 h-5 text-gray-400 flex-shrink-0' />
          <span className='text-gray-400 text-sm flex-1'>搜索集合...</span>
        </div>
      </div>

      {/* 主内容区 */}
      <div className='flex-1 overflow-y-auto'>
        {loading ? (
          <div className='flex items-center justify-center h-full'>
            <div className='text-center'>
              <div className='w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
              <p className='text-gray-500'>加载中...</p>
            </div>
          </div>
        ) : error ? (
          <div className='flex items-center justify-center h-full'>
            <div className='text-center text-red-500'>
              <p className='text-xl mb-2'>❌</p>
              <p>{error}</p>
            </div>
          </div>
        ) : channels.length === 0 ? (
          <div className='flex items-center justify-center h-full'>
            <div className='text-center text-gray-500'>
              <p className='text-xl mb-2'>📭</p>
              <p>暂无频道数据</p>
            </div>
          </div>
        ) : (
          <div className='p-6 space-y-8'>
            {channels.map(channel => (
              <div key={channel.id}>
                {/* 分类标题 */}
                <h2 className='text-sm text-gray-400 mb-4 font-medium'>
                  {channel.display_name}
                </h2>

                {/* 网格布局 */}
                <div className='grid grid-cols-4 gap-6'>
                  {channel.children && channel.children.length > 0 ? (
                    channel.children.map(child => (
                      <div
                        key={child.id}
                        className='flex flex-col items-center cursor-pointer transition-transform active:scale-95'
                        onClick={() => {
                          router.push(`/mobile/chanel2/${child.id}`);
                        }}
                      >
                        {/* 圆形图标容器 */}
                        <div className='w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-2 overflow-hidden'>
                          {child.thumb_path ? (
                            <div className='w-full h-full relative'>
                              <Image
                                src={cdnApi(child.thumb_path)}
                                alt={child.display_name}
                                fill
                                className='object-cover'
                              />
                            </div>
                          ) : (
                            <span className='text-2xl'>
                              {child.display_name.substring(0, 2)}
                            </span>
                          )}
                        </div>
                        {/* 分类名称 */}
                        <span className='text-sm text-gray-700 text-center leading-tight'>
                          {child.display_name}
                        </span>
                      </div>
                    ))
                  ) : (
                    // 如果没有子频道，显示父频道本身
                    <div
                      className='flex flex-col items-center cursor-pointer transition-transform active:scale-95'
                      onClick={() => {
                        console.log('点击频道:', channel);
                      }}
                    >
                      <div className='w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-2 overflow-hidden'>
                        {channel.thumb_path ? (
                          <div className='w-full h-full relative'>
                            <Image
                              src={cdnApi(channel.thumb_path)}
                              alt={channel.display_name}
                              fill
                              className='object-cover'
                            />
                          </div>
                        ) : (
                          <span className='text-2xl'>
                            {channel.display_name.substring(0, 2)}
                          </span>
                        )}
                      </div>
                      <span className='text-sm text-gray-700 text-center leading-tight'>
                        {channel.display_name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      <div className='flex items-center justify-between gap-4 p-4 bg-white border-t'>
        <button
          onClick={() => router.back()}
          className='flex-1 px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors'
        >
          返回
        </button>
        <button
          onClick={() => window.location.reload()}
          className='flex-1 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors'
        >
          刷新数据
        </button>
      </div>
    </div>
  );
}

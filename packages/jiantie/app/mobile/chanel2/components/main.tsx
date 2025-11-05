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
    <div
      className='flex flex-col h-dvh'
      style={{
        backgroundImage: 'url(https://res.maka.im/assets/jiantie/beijing3.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'top',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* 顶部Logo区 */}
      <div
        className='flex
       items-center justify-between
        px-6 pt-6 sticky top-0 z-20 '
      >
        {/* 左侧Logo */}
        <div className='flex items-start'>
          <div className='relative w-14 h-10'>
            <Image
              src={cdnApi('/assets/jiantie/logo2.png')}
              alt='简帖'
              fill
              className='object-contain'
              priority
            />
          </div>
        </div>

        {/* 右侧通知 */}
        <div className='flex items-center gap-3'>
          <button
            style={{
              borderRadius: '10px',
            }}
            className='relative w-8 h-8 flex items-center justify-center bg-white  hover:bg-gray-50 transition-colors'
            onClick={() => {
              // TODO: 跳转到通知页面
              console.log('查看通知');
            }}
          >
            <img
              src='https://res.maka.im/assets/jiantie/tongzhi.png'
              alt='通知'
              className='w-4 h-4'
            />
            {/* 通知角标 */}
            {/* <span className='absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium'></span> */}
          </button>
        </div>
      </div>

      {/* 顶部搜索栏 */}
      <div className=' p-6 sticky top-12 z-10'>
        <div
          onClick={() => router.push('/mobile/chanel2/search')}
          className='flex items-center gap-3 px-4 py-4 bg-white rounded-2xl cursor-pointer transition-colors'
          style={{
            border: '2px solid rgba(232, 32, 39, 0.30)',
            boxShadow:
              '0 4px 6px -1px rgba(0, 0, 0, 0.10), 0 2px 4px -2px rgba(0, 0, 0, 0.10)',
          }}
        >
          <Search className='w-5 h-5 text-gray-400 flex-shrink-0' />
          <span className='text-gray-400 text-sm flex-1'>模板搜索</span>
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
          <div className='p-4 space-y-8'>
            {channels.map(channel => (
              <div key={channel.id}>
                {/* 分类标题 */}
                <h2
                  className='text-sm text-black/45 mb-4 font-semibold leading-5'
                  style={{
                    fontFamily: '"PingFang SC"',
                    fontFeatureSettings: '"liga" off, "clig" off',
                  }}
                >
                  {channel.display_name}
                </h2>

                {/* 网格布局 */}
                <div className='flex flex-wrap justify-between'>
                  {channel.children && channel.children.length > 0 ? (
                    channel.children.map(child => (
                      <div
                        key={child.id}
                        className='flex flex-col items-center cursor-pointer transition-transform active:scale-95 mb-4'
                        style={{ width: '72px' }}
                        onClick={() => {
                          router.push(`/mobile/chanel2/${child.id}`);
                        }}
                      >
                        {/* 圆形图标容器 */}
                        <div
                          className=' rounded-full bg-gray-100 flex items-center justify-center mb-2 overflow-hidden border border-white'
                          style={{
                            width: '72px',
                            height: '72px',
                            border: '1px solid #fff',
                            boxShadow:
                              '0 1px 2px -1px rgba(0, 0, 0, 0.10), 0 1px 3px 0 rgba(0, 0, 0, 0.10)',
                          }}
                        >
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
                        <span
                          className='font-semibold text-center leading-6'
                          style={{
                            fontSize: '16px',
                            color: 'var(--foreground)',
                            fontFamily: '"PingFang SC"',
                            fontFeatureSettings: '"liga" off, "clig" off',
                          }}
                        >
                          {child.display_name}
                        </span>
                      </div>
                    ))
                  ) : (
                    // 如果没有子频道，显示父频道本身
                    <div
                      className='flex flex-col items-center cursor-pointer transition-transform active:scale-95 mb-4'
                      style={{ width: 'calc(25% - 6px)' }}
                      onClick={() => {
                        console.log('点击频道:', channel);
                      }}
                    >
                      <div className='w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-2 overflow-hidden border border-white'>
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
                      <span
                        className='text-base font-semibold text-center leading-6'
                        style={{
                          color: 'var(--foreground)',
                          fontFamily: '"PingFang SC"',
                          fontFeatureSettings: '"liga" off, "clig" off',
                        }}
                      >
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

'use client';

import { getUid } from '@/services';
import { navigateWithBridge } from '@/utils/navigate-with-bridge';
import { trpc } from '@/utils/trpc';
import APPBridge from '@mk/app-bridge';
import { cdnApi } from '@mk/services';
import { TemplateMarketChannelEntity } from '@workspace/database/generated/client/client';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Channel
  extends Omit<
    TemplateMarketChannelEntity,
    'children' | 'create_time' | 'update_time'
  > {
  children?: Channel[];
  create_time: string;
  update_time: string;
}

interface Props {
  appid?: string;
}

export default function Main({ appid = 'jiantie' }: Props) {
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);

  const toNotificationCenter = () => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}/mobile/notification-center?is_full_screen=1`,
        type: 'URL',
      });
    } else {
      router.push(`/mobile/rsvp/notifications?appid=${appid}`);
    }
  };

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        setLoading(true);
        const data = await trpc.channel.getChannels.query({
          appid,
          locale: 'zh-CN',
          env: 'production',
        });
        setChannels(data);
      } catch (err) {
        console.error('获取频道数据失败:', err);
        setError(err instanceof Error ? err.message : '网络请求失败');
      } finally {
        setLoading(false);
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
        console.error('Failed to get RSVP notifications:', error);
        setUnread(0);
      }
    };

    fetchChannels();
    fetchUnreadNotifications();
  }, [appid]);

  return (
    <div
      className='flex flex-col h-dvh'
      style={{
        paddingTop: 'var(--safe-area-inset-top)',
        backgroundImage: 'url(https://res.maka.im/assets/jiantie/beijing4.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'top',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div
        className='flex
       items-center justify-between
        px-6 pt-6 sticky top-0 z-20 '
      >
        {/* 左侧Logo */}
        <div className='flex items-start'>
          <div className='relative w-14 h-10'>
            <img
              src={cdnApi('/assets/jiantie/logo2.png')}
              alt='简帖'
              className='w-full h-full object-contain'
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
            onClick={toNotificationCenter}
          >
            <img
              src='https://res.maka.im/assets/jiantie/tongzhi.png'
              alt='通知'
              className='w-4 h-4'
            />
            {/* 通知角标 */}
            {unread > 0 && (
              <span className='absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium'>
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>
        </div>
      </div>
      {/* 顶部搜索栏 */}
      <div className=' p-6 sticky top-12 z-10'>
        <div
          onClick={() =>
            navigateWithBridge({
              path: '/mobile/channel2/search',
              router,
            })
          }
          className='flex items-center gap-3 px-4 py-4 bg-white rounded-2xl cursor-pointer transition-transform duration-150 ease-out active:bg-gray-50 active:scale-[0.98]'
          style={{
            border: '2px solid rgba(232, 32, 39, 0.30)',
            boxShadow:
              '0 4px 6px -1px rgba(0, 0, 0, 0.10), 0 2px 4px -2px rgba(0, 0, 0, 0.10)',
          }}
        >
          <Search className='w-5 h-5 text-gray-400 flex-shrink-0' />
          <span className='text-gray-400 text-base flex-1'>模板搜索</span>
        </div>
      </div>
      {/* 主内容区 */}
      <div className='flex-1 overflow-y-auto'>
        {loading ? (
          <div className='flex items-center justify-center h-full'>
            <div className='text-center'>
              <div className='w-12 h-12 border-4 border-[#D53933] border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
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
          <div className='py-4 px-6  pb-32 space-y-8'>
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

                {/* 网格布局 - 3列 */}
                <div className='grid grid-cols-3 gap-10'>
                  {channel.children &&
                    channel.children.map(child => (
                      <div
                        key={child.id}
                        className='flex flex-col items-center cursor-pointer transition-transform active:scale-95'
                        onClick={() => {
                          navigateWithBridge({
                            path: `/mobile/channel2/${child.id}`,
                            router,
                          });
                        }}
                      >
                        {/* 圆形图标容器 */}
                        <div
                          className='w-full aspect-square  bg-gray-100 flex items-center justify-center mb-2 overflow-hidden border border-white'
                          style={{
                            border: '1px solid #fff',
                            borderRadius: '12px',
                            boxShadow:
                              '0 1px 2px -1px rgba(0, 0, 0, 0.10), 0 1px 3px 0 rgba(0, 0, 0, 0.10)',
                          }}
                        >
                          {child.thumb_path ? (
                            <div className='w-12 h-12 relative  overflow-hidden'>
                              {/* <Image
                                src={cdnApi(child.thumb_path)}
                                alt={child.display_name}
                                width={48}
                                height={48}
                                style={{ objectFit: 'cover' }}
                                className='object-contain'
                              /> */}
                              <img
                                src={`${cdnApi(child.thumb_path)}`}
                                alt={child.display_name}
                                width={64}
                                height={64}
                                style={{ objectFit: 'cover' }}
                                className='object-contain w-full h-full'
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
                          className='font-semibold text-center leading-6 text-base'
                          style={{
                            color: 'var(--foreground)',
                            fontFamily: '"PingFang SC"',
                            fontFeatureSettings: '"liga" off, "clig" off',
                          }}
                        >
                          {child.display_name}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

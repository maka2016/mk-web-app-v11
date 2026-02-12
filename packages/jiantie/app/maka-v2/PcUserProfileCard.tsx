'use client';

import { cdnApi, getToken, getUid } from '@/services';
import { useStore } from '@/store';
import { Button } from '@workspace/ui/components/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { observer } from 'mobx-react';
import { useEffect, useRef, useState } from 'react';
import Mine from './mine/components/main';

const PcUserProfileCard = () => {
  const { userProfile, toLogin } = useStore();
  const [open, setOpen] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 检查是否有登录凭证，如果有说明用户已登录，只是数据还在加载中
  // 只在客户端计算，服务端始终返回 false，避免 SSR hydration 错误
  const hasAuth =
    typeof window !== 'undefined' ? !!getUid() && !!getToken() : false;
  const shouldShowLoading = hasAuth && !userProfile;
  // 如果超时了，不再显示加载中
  const isLoading = shouldShowLoading && !loadingTimeout;

  // 处理加载超时
  useEffect(() => {
    if (shouldShowLoading) {
      // 设置超时，如果 5 秒后还没加载完成，取消加载状态
      loadingTimeoutRef.current = setTimeout(() => {
        setLoadingTimeout(true);
      }, 5000);
    } else {
      // 如果已经加载完成或没有登录凭证，重置超时状态
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      // 使用 setTimeout 避免在 effect 中同步 setState
      setTimeout(() => {
        setLoadingTimeout(false);
      }, 0);
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [shouldShowLoading]);

  const avatar =
    userProfile?.avatar || cdnApi('/cdn/webstore10/jiantie/default_avatar.png');

  // 如果正在加载，不显示"登录/注册"，而是显示空字符串或加载状态
  const username = userProfile?.username || (isLoading ? '' : '登录/注册');
  console.log('username', username)

  return (
    <>
      {/* <Button
        variant='outline'
        className='w-full mb-4 border-yellow-500 text-yellow-500 bg-yellow-50 hover:bg-yellow-100'
        onClick={() => setVipShow(true)}
      >
        升级会员
      </Button> */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={'ghost'}
            className='flex w-full items-center gap-3 rounded-md bg-background px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground'
            // onMouseEnter={() => setOpen(true)}
            onClick={e => {
              // 如果正在加载，不处理点击事件
              if (isLoading) {
                return;
              }
              if (!userProfile?.username) {
                e.preventDefault();
                e.stopPropagation();
                toLogin();
                return;
              }
            }}
          >
            <img
              src={avatar}
              alt='avatar'
              className='h-8 w-8 rounded-full object-cover'
            />
            <div className='flex flex-1 flex-col overflow-hidden'>
              {isLoading ? (
                <span className='truncate text-sm font-medium text-muted-foreground'>
                  加载中...
                </span>
              ) : (
                <span className='truncate text-sm font-medium'>{username}</span>
              )}
              {userProfile?.uid && (
                <span className='truncate text-xs text-muted-foreground'>
                  ID: {userProfile.uid}
                </span>
              )}
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side='right'
          align='start'
          className='p-0'
        // onMouseEnter={() => setOpen(true)}
        // onMouseLeave={() => setOpen(false)}
        >
          {/* 直接复用 Mine 组件，保留全部交互能力 */}
          <div className='w-[360px] rounded-lg overflow-hidden'>
            <Mine active={true} onChangeTab={() => { }} />
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
};

export default observer(PcUserProfileCard);

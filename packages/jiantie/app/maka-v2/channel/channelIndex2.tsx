'use client';

import { getCookie, setCookieExpire } from '@/utils';
import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Crown, Info, Sparkles } from 'lucide-react';
import { useState } from 'react';
import Channel2026 from './Channel2026';
const COOKIE_KEY = 'maka_channel_2026_version_tip_shown';

const NewVersionTip = () => {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const hasShown = getCookie(COOKIE_KEY);
      return !hasShown;
    }
    return false;
  });

  const handleClose = () => {
    setIsOpen(false);
    setCookieExpire(COOKIE_KEY, '1', 365 * 24 * 60 * 60 * 1000);
  };

  return (
    <ResponsiveDialog
      isDialog
      isOpen={isOpen}
      onOpenChange={nextOpen => {
        if (!nextOpen) {
          setIsOpen(false);
          setCookieExpire(COOKIE_KEY, '1', 365 * 24 * 60 * 60 * 1000);
        } else {
          setIsOpen(true);
        }
      }}
      showCloseIcon={false}
      contentProps={{
        className: 'max-w-[320px] p-0 rounded-xl overflow-hidden',
      }}
    >
      <div className='flex flex-col'>
        {/* 顶部蓝色标题栏 */}
        <div className='bg-[#102997] px-4 py-4 rounded-t-xl'>
          <p className='text-white text-center text-base font-semibold leading-6'>
            🎉 欢迎尝鲜2026新版MAKA 🎉
          </p>
        </div>

        {/* 白色主体内容 */}
        <div className='bg-white px-4 py-4 rounded-b-xl'>
          {/* 特性列表 */}
          <div className='flex flex-col gap-3 mb-4'>
            {/* 特性1: 自动排版 */}
            <div className='flex gap-2 items-start'>
              <div className='bg-[#f7edfe] p-2 rounded-xl flex-shrink-0'>
                <Sparkles className='w-5 h-5 text-purple-600' />
              </div>
              <div className='flex-1 flex flex-col'>
                <p className='text-black text-sm font-semibold leading-5 mb-1'>
                  自动排版
                </p>
                <p className='text-[#64748b] text-xs font-normal leading-[18px]'>
                  系统自动根据内容调整版面布局。字多字少都不乱，怎么填都好看。
                </p>
              </div>
            </div>

            {/* 特性2: 精品模板 */}
            <div className='flex gap-2 items-start'>
              <div className='bg-[#fef9c3] p-2 rounded-xl flex-shrink-0'>
                <Crown className='w-5 h-5 text-yellow-700' />
              </div>
              <div className='flex-1 flex flex-col'>
                <p className='text-black text-sm font-semibold leading-5 mb-1'>
                  精品模板
                </p>
                <p className='text-[#64748b] text-xs font-normal leading-[18px]'>
                  拒绝廉价感，甄选4A广告级设计标准。让品牌更出众。
                </p>
              </div>
            </div>

            {/* 特性3: 模板逐批重制中 */}
            <div className='flex gap-2 items-start'>
              <div className='bg-[#e6f4fe] p-2 rounded-xl flex-shrink-0'>
                <Info className='w-5 h-5 text-blue-600' />
              </div>
              <div className='flex-1 flex flex-col'>
                <p className='text-black text-sm font-semibold leading-5 mb-1'>
                  模板逐批重制中
                </p>
                <p className='text-[#64748b] text-xs font-normal leading-[18px]'>
                  如暂缺您所在的行业分类，随时可切换到旧版继续使用。
                </p>
              </div>
            </div>
          </div>

          {/* 底部按钮 */}
          <Button
            className='w-full bg-[#102997] text-white hover:bg-[#0d1f7a] px-4 py-2 rounded-md'
            onClick={handleClose}
          >
            <span className='text-sm font-semibold leading-5'>
              开启新版之旅
            </span>
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
};

export default function Channel2Home() {
  return (
    <Channel2026
      appid='maka'
      headerWrapper={
        <>
          <NewVersionTip />
        </>
      }
    />
  );
}

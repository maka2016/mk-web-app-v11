'use client';

import { cdnApi } from '@mk/services';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Clock } from 'lucide-react';

dayjs.extend(relativeTime);

interface WorkInfoCardProps {
  work: {
    id: string;
    title: string;
    cover: string | null;
    update_time: string;
    is_rsvp?: boolean;
  };
  purchaseStatus?: 'purchased' | 'not-purchased' | null;
  rsvpStats?: {
    invited: number;
    replied: number;
  } | null;
  onClick?: () => void;
  size?: 'small' | 'medium';
  loading?: boolean;
}

export function WorkInfoCard({
  work,
  purchaseStatus,
  rsvpStats,
  onClick,
  size = 'small',
  loading = false,
}: WorkInfoCardProps) {
  const resizeWidth = 192; // 96px * 2 for retina

  const handleClick = () => {
    if (!loading && onClick) {
      onClick();
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`bg-white border border-gray-200 rounded-[12px] relative overflow-hidden ${
        onClick && !loading
          ? 'cursor-pointer active:bg-gray-100'
          : loading
            ? 'cursor-wait opacity-60'
            : ''
      }`}
    >
      <div className='flex gap-[10px] items-start h-[128px]'>
        {/* 缩略图 */}
        <div className='w-[96px] h-[128px] relative flex-shrink-0 overflow-hidden'>
          {work.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cdnApi(work.cover, { resizeWidth })}
              alt={work.title}
              className='w-full h-full object-cover object-top'
            />
          ) : (
            <div className='w-full h-full bg-gray-100 flex flex-col items-center justify-center text-gray-400'>
              <div className='text-[24px] mb-1'>🖼️</div>
              <div className='text-[9px] leading-[13.5px]'>预览</div>
            </div>
          )}
          {/* 加载蒙层 */}
          {loading && (
            <div className='absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center'>
              <div className='w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin' />
            </div>
          )}
        </div>

        {/* 内容 */}
        <div className='flex-1 min-w-0 h-full flex flex-col justify-between py-2'>
          <div className='flex-1 min-w-0'>
            <div className='flex flex-col gap-1'>
              <h3 className='text-[16px] font-semibold leading-[24px] text-[#101828]'>
                {work.title}
              </h3>
              <div className='flex items-center gap-[4px]'>
                <Clock className='w-[11.5px] h-[11.5px] text-[#6a7282]' />
                <span className='text-[12px] leading-[18px] text-[#6a7282]'>
                  更新于{' '}
                  {Intl.DateTimeFormat('zh-CN', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }).format(new Date(work.update_time))}
                </span>
              </div>
            </div>
          </div>

          {/* RSVP 统计信息 */}
          {work.is_rsvp && rsvpStats && (
            <div className='flex items-center gap-4 h-[30px]'>
              <div className='flex items-center gap-1'>
                <span className='text-[20px] font-semibold leading-[30px] text-[#101828]'>
                  {rsvpStats.invited}
                </span>
                <span className='text-[12px] leading-[18px] text-[#6a7282]'>
                  已邀请
                </span>
              </div>
              <div className='flex items-center gap-1'>
                <span className='text-[20px] font-semibold leading-[30px] text-[#00a63e]'>
                  {rsvpStats.replied}
                </span>
                <span className='text-[12px] leading-[18px] text-[#6a7282]'>
                  已回复
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 购买状态标签 - 右上角 */}
        {purchaseStatus && (
          <div
            className={`absolute top-0 right-0 px-2 py-1 rounded-bl-[6px] flex items-center justify-center ${
              purchaseStatus === 'purchased'
                ? 'bg-[#fde272] text-yellow-700'
                : 'bg-gray-500 text-[#f8fafc]'
            }`}
          >
            <span className='text-xs font-semibold leading-[12px]'>
              {purchaseStatus === 'purchased' ? '已购' : '未购'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

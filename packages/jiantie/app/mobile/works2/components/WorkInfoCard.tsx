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
}

export function WorkInfoCard({
  work,
  purchaseStatus,
  rsvpStats,
  onClick,
  size = 'small',
}: WorkInfoCardProps) {
  const isSmall = size === 'small';
  const imageSize = isSmall ? 'w-16 h-16' : 'w-20 h-20';
  const resizeWidth = isSmall ? 128 : 160;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg p-3 shadow-sm border border-gray-100 ${onClick ? 'cursor-pointer active:opacity-80' : ''}`}
    >
      <div className='flex gap-3'>
        {/* 缩略图 */}
        <div
          className={`${imageSize} relative flex-shrink-0 rounded overflow-hidden border border-gray-200 self-stretch`}
        >
          {work.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cdnApi(work.cover, { resizeWidth })}
              alt={work.title}
              className='w-full h-full object-cover'
            />
          ) : (
            <div className='w-full h-full bg-gray-100 flex items-center justify-center text-xs text-gray-400'>
              无
            </div>
          )}
        </div>

        {/* 内容 */}
        <div className='flex-1 min-w-0'>
          <div className='flex items-start justify-between gap-2 mb-1'>
            <h3
              className={`${isSmall ? 'text-base' : 'text-base'} font-${isSmall ? 'medium' : 'semibold'} text-[#09090B] line-clamp-2 flex-1`}
            >
              {work.title}
            </h3>
            {purchaseStatus && (
              <span
                className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${
                  purchaseStatus === 'purchased'
                    ? 'bg-[#ffe035] text-[#a16207]'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {purchaseStatus === 'purchased' ? '已购' : '未购'}
              </span>
            )}
          </div>

          <div className='flex items-center gap-1 text-xs text-gray-500 mb-1'>
            <Clock className='w-3 h-3' />
            <span>更新于 {dayjs(work.update_time).fromNow()}</span>
          </div>

          {/* RSVP 统计信息 */}
          {work.is_rsvp && rsvpStats && (
            <div className='flex items-center gap-3 mt-1 text-xs'>
              <span className='text-[#09090B] font-medium'>
                <span className='font-semibold'>{rsvpStats.invited}</span>{' '}
                已邀请
              </span>
              <span className='text-green-600 font-medium'>
                <span className='font-semibold'>{rsvpStats.replied}</span>{' '}
                已回复
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

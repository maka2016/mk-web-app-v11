'use client';

import { cn } from '@workspace/ui/lib/utils';
import { RelayRecord } from '../type';

interface RelayUserListProps {
  records: RelayRecord[];
  displayMode?: 'horizontal' | 'grid';
  theme?: {
    avatarSize?: number;
    avatarBorderColor?: string;
    listTextColor?: string;
    secondaryTextColor?: string;
  };
  className?: string;
  /** 仅展示头像（隐藏昵称和时间） */
  showAvatarOnly?: boolean;
}

/**
 * 格式化时间显示
 */
function formatTime(time: Date | string): string {
  try {
    const date = typeof time === 'string' ? new Date(time) : time;
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) {
      return '刚刚';
    } else if (minutes < 60) {
      return `${minutes}分钟前`;
    } else if (hours < 24) {
      return `${hours}小时前`;
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return date.toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
      });
    }
  } catch {
    return '';
  }
}

/**
 * 获取用户头像或默认头像
 */
function getUserAvatar(avatar: string | null | undefined): string {
  if (avatar) return avatar;
  // 默认头像可以使用默认图片或根据昵称生成
  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGM0Y0RjYiLz4KPHN2ZyB4PSIxMCIgeT0iMTAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDIwIDIwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cGF0aCBkPSJNMTAgMTBDMTIuNzYxNCAxMCAxNSA3Ljc2MTQyIDE1IDVDMTUgMi4yMzg1OCAxMi43NjE0IDAgMTAgMEM3LjIzODU4IDAgNSAyLjIzODU4IDUgNUM1IDcuNzYxNDIgNy4yMzg1OCAxMCAxMCAxMFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTEwIDEyQzYuNjg2MyAxMiA0IDEzLjY4NjMgNCAxN0g2QzYgMTQuNzg5MSA3Ljc4OTA5IDEzIDEwIDEzQzEyLjIxMDkgMTMgMTQgMTQuNzg5MSAxNCAxN0gxNkMxNiAxMy42ODYzIDEzLjMxMzcgMTIgMTAgMTJaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo8L3N2Zz4K';
}

export function RelayUserList({
  records,
  displayMode = 'horizontal',
  theme,
  className,
  showAvatarOnly,
}: RelayUserListProps) {
  const avatarSize = theme?.avatarSize || 40;
  const avatarBorderColor = theme?.avatarBorderColor || '#e5e7ec';
  const textColor = theme?.listTextColor || '#09090B';
  const secondaryTextColor = theme?.secondaryTextColor || '#6b7280';

  if (records.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center py-8 text-sm',
          className
        )}
        style={{ color: secondaryTextColor }}
      >
        暂无用户接力
      </div>
    );
  }

  if (displayMode === 'grid') {
    return (
      <div
        className={cn('grid grid-cols-4 gap-4', className)}
        style={{ color: textColor }}
      >
        {records.map(record => (
          <div key={record.id} className='flex flex-col items-center gap-2'>
            <div
              className='rounded-full overflow-hidden flex-shrink-0'
              style={{
                width: avatarSize,
                height: avatarSize,
                border: `2px solid ${avatarBorderColor}`,
              }}
            >
              <img
                src={getUserAvatar(record.user_avatar)}
                alt={record.user_nickname}
                className='w-full h-full object-cover'
                onError={e => {
                  // 如果图片加载失败，显示默认头像
                  const target = e.target as HTMLImageElement;
                  target.src = getUserAvatar(null);
                }}
              />
            </div>
            {!showAvatarOnly && (
              <>
                <div className='text-xs text-center truncate w-full'>
                  {record.user_nickname || '未知用户'}
                </div>
                <div
                  className='text-xs text-center truncate w-full'
                  style={{ color: secondaryTextColor }}
                >
                  {formatTime(record.relay_time)}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    );
  }

  // horizontal 模式：横向滚动
  // 预览模式下仅显示头像时，使用堆叠样式
  if (displayMode === 'horizontal' && showAvatarOnly) {
    const maxVisible = 8;
    const visible = records.slice(0, maxVisible);
    const hasMore = records.length > maxVisible;

    return (
      <div className={cn('flex items-center justify-center w-full', className)}>
        <div className='flex items-center'>
          {visible.map((record, index) => (
            <div
              key={record.id}
              className='rounded-full overflow-hidden flex-shrink-0 border-2 border-white'
              style={{
                width: avatarSize,
                height: avatarSize,
                borderColor: avatarBorderColor,
                marginLeft: index === 0 ? 0 : -avatarSize / 3,
              }}
            >
              <img
                src={getUserAvatar(record.user_avatar)}
                alt={record.user_nickname}
                className='w-full h-full object-cover'
                onError={e => {
                  const target = e.target as HTMLImageElement;
                  target.src = getUserAvatar(null);
                }}
              />
            </div>
          ))}

          {hasMore && (
            <div
              className='rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium bg-white'
              style={{
                width: avatarSize,
                height: avatarSize,
                border: `2px solid ${avatarBorderColor}`,
                marginLeft: -avatarSize / 3,
                color: secondaryTextColor,
              }}
            >
              +
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('flex gap-4 overflow-x-auto pb-2', className)}
      style={{ color: textColor }}
    >
      {records.map(record => (
        <div
          key={record.id}
          className='flex flex-col items-center gap-2 flex-shrink-0'
          style={{ width: avatarSize + 16 }}
        >
          <div
            className='rounded-full overflow-hidden flex-shrink-0'
            style={{
              width: avatarSize,
              height: avatarSize,
              border: `2px solid ${avatarBorderColor}`,
            }}
          >
            <img
              src={getUserAvatar(record.user_avatar)}
              alt={record.user_nickname}
              className='w-full h-full object-cover'
              onError={e => {
                const target = e.target as HTMLImageElement;
                target.src = getUserAvatar(null);
              }}
            />
          </div>
          {!showAvatarOnly && (
            <>
              <div className='text-xs text-center truncate w-full'>
                {record.user_nickname || '未知用户'}
              </div>
              <div
                className='text-xs text-center truncate w-full'
                style={{ color: secondaryTextColor }}
              >
                {formatTime(record.relay_time)}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

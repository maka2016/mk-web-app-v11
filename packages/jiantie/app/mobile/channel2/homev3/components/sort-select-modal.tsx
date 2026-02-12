'use client';

import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';

export type SortType = 'default' | 'time' | 'hot'; // 综合、最新、最热

const sortOptionKeys: Array<{
  value: SortType;
  labelKey: '综合排序' | '最新排序' | '最热排序';
  descriptionKey: '多因素综合排序' | '按创建时间倒序' | '按受欢迎程度倒序';
}> = [
  { value: 'default', labelKey: '综合排序', descriptionKey: '多因素综合排序' },
  { value: 'time', labelKey: '最新排序', descriptionKey: '按创建时间倒序' },
  { value: 'hot', labelKey: '最热排序', descriptionKey: '按受欢迎程度倒序' },
];

interface SortSelectModalProps {
  /** 当前选中的排序类型 */
  activeSort?: SortType;
  /** 排序改变时的回调 */
  onSortChange?: (sort: SortType) => void;
  /** 是否显示弹窗 */
  open?: boolean;
  /** 弹窗打开/关闭的回调 */
  onOpenChange?: (open: boolean) => void;
}

export const SortSelectModal = ({
  activeSort = 'default',
  onSortChange,
  open,
  onOpenChange,
}: SortSelectModalProps) => {
  const t = useTranslations('ChannelHome');
  const handleSelect = (sort: SortType) => {
    if (sort === activeSort) {
      if (onOpenChange) {
        onOpenChange(false);
      }
      return;
    }
    if (onSortChange) {
      onSortChange(sort);
    }
    // 延迟关闭弹窗，让用户看到选中反馈
    setTimeout(() => {
      if (onOpenChange) {
        onOpenChange(false);
      }
    }, 100);
  };

  return (
    <ResponsiveDialog
      isDialog
      isOpen={open}
      onOpenChange={onOpenChange}
      contentProps={{
        className: 'rounded-[12px] p-4 max-w-[90vw] mx-auto',
      }}
    >
      <div
        className='flex flex-col bg-white'
        style={{
          width: '100%',
          gap: '8px',
          borderRadius: '12px',
        }}
      >
        {/* 标题 */}
        <div
          className='flex items-center justify-center text-center w-full py-2'
          style={{ borderBottom: '1px solid #f1f5f9' }}
        >
          <h2
            className='text-lg font-semibold'
            style={{
              fontFamily: '"PingFang SC"',
              color: '#101828',
              lineHeight: '28px',
            }}
          >
            {t('排序方式')}
          </h2>
        </div>

        {/* 排序选项 */}
        <div className='flex flex-col' style={{ gap: '4px' }}>
          {sortOptionKeys.map(option => {
            const isActive = activeSort === option.value;
            return (
              <button
                key={option.value}
                className='flex items-center justify-between w-full px-4 py-3 cursor-pointer active:bg-gray-100'
                style={{
                  borderRadius: '8px',
                }}
                onClick={() => handleSelect(option.value)}
              >
                <div
                  className='flex flex-col items-start'
                  style={{ gap: '2px' }}
                >
                  <span
                    className='text-base font-medium'
                    style={{
                      fontFamily: '"PingFang SC"',
                      color: isActive ? '#101828' : '#475569',
                    }}
                  >
                    {t(option.labelKey)}
                  </span>
                  <span
                    className='text-xs'
                    style={{
                      fontFamily: '"PingFang SC"',
                      color: '#94a3b8',
                    }}
                  >
                    {t(option.descriptionKey)}
                  </span>
                </div>
                {isActive && (
                  <Check
                    className='w-5 h-5 shrink-0'
                    style={{ color: '#d53933' }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </ResponsiveDialog>
  );
};

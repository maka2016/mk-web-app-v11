import { ChevronRight } from 'lucide-react';
import { ReactNode } from 'react';

interface ActionButtonProps {
  icon: ReactNode;
  iconBgColor?: string;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  showArrow?: boolean;
}

/**
 * 大型操作按钮组件
 * 用于展示带有图标、标题、描述的操作按钮
 */
export function ActionButton({
  icon,
  iconBgColor,
  title,
  description,
  onClick,
  disabled = false,
  showArrow = true,
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className='w-full bg-white border border-[#e4e4e7] rounded-[14px] p-4 flex items-center gap-3 active:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors'
    >
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
          iconBgColor || ''
        }`}
      >
        {icon}
      </div>
      <div className='flex-1 text-left'>
        <div className='text-base font-semibold text-[#09090b] leading-6'>
          {title}
        </div>
        <div className='text-xs text-[#6a7282] leading-[18px]'>
          {description}
        </div>
      </div>
      {showArrow && <div className='text-[#99a1af] text-xl'>›</div>}
    </button>
  );
}

interface RoundedActionButtonProps {
  icon: ReactNode;
  iconBgColor: string;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}

/**
 * 圆角操作按钮组件（用于 RSVP 和宾客回执）
 * 使用 rounded-lg 替代 rounded-[14px]，样式稍有不同
 */
export function RoundedActionButton({
  icon,
  iconBgColor,
  title,
  description,
  onClick,
  disabled = false,
}: RoundedActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className='w-full flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-100 shadow-sm hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
    >
      <div
        className={`w-10 h-10 rounded-lg ${iconBgColor} flex items-center justify-center flex-shrink-0`}
      >
        {icon}
      </div>
      <div className='flex-1 text-left'>
        <span className='text-sm font-medium text-[#09090B]'>{title}</span>
        <p className='text-xs text-gray-500 mt-1'>{description}</p>
      </div>
      <ChevronRight className='w-5 h-5 text-gray-400 flex-shrink-0' />
    </button>
  );
}

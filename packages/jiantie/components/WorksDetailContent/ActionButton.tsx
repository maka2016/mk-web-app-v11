import { cn } from '@workspace/ui/lib/utils';
import { LucideIcon } from 'lucide-react';
import React, { ReactNode } from 'react';

interface ActionButtonProps {
  icon: LucideIcon | React.ReactElement;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
  className?: string;
  iconSize?: number;
  size?: 'default' | 'small' | 'large';
  direction?: 'horizontal' | 'vertical';
}
interface ActionBarProps {
  children: ReactNode;
  className?: string;
  count?: number;
}

export function ActionBar({
  children,
  className = 'px-3 py-2',
  count = 5,
}: ActionBarProps) {
  return (
    <div className={`border-t border-gray-100 ${className}`}>
      <div className={`grid grid-cols-${count} items-center justify-around`}>
        {children}
      </div>
    </div>
  );
}

export function ActionButton({
  icon: Icon,
  iconSize = 16,
  label,
  onClick,
  disabled = false,
  variant = 'default',
  className = '',
  direction = 'horizontal',
  size = 'default',
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        `flex ${direction === 'vertical' ? 'flex-col' : 'flex-row'} items-center justify-center px-2 py-1 rounded-md ${
          variant === 'danger'
            ? 'text-red-600 active:text-red-600'
            : 'text-gray-600 active:bg-black/10 active:text-black'
        } disabled:opacity-50 disabled:cursor-not-allowed ${className}`
      )}
    >
      <div
        className={`flex items-center justify-center ${size === 'small' ? 'h-4 w-4' : size === 'large' ? 'h-10 w-10' : 'h-8 w-8'}`}
      >
        {React.isValidElement(Icon) ? Icon : <Icon size={iconSize} />}
      </div>
      {label && <span className='text-sm'>{label}</span>}
    </button>
  );
}

// 导出别名以保持兼容性
export const VerticalActionButton = (props: ActionButtonProps) => {
  const size = props.size || 'large';
  return <ActionButton {...props} size={size} direction='vertical' />;
};

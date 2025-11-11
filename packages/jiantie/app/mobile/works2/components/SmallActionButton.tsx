import { Button } from '@workspace/ui/components/button';
import { LucideIcon } from 'lucide-react';

interface SmallActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'destructive';
  loading?: boolean;
}

/**
 * 小型操作按钮组件
 * 用于编辑操作区域的按钮（预览、编辑、复制、删除等）
 */
export function SmallActionButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  variant = 'default',
  loading = false,
}: SmallActionButtonProps) {
  const iconColor =
    variant === 'destructive' ? 'text-red-500' : 'text-gray-600';
  const textColor =
    variant === 'destructive' ? 'text-red-500' : 'text-gray-600';

  return (
    <Button
      variant='outline'
      onClick={onClick}
      disabled={disabled || loading}
      className='flex items-center justify-center gap-1 h-auto py-2 px-2 flex-1'
    >
      <Icon className={`w-4 h-4 ${iconColor}`} />
      <span className={`text-xs ${textColor}`}>
        {loading ? `${label}中...` : label}
      </span>
    </Button>
  );
}

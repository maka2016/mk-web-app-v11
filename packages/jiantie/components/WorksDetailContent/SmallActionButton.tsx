import { LucideIcon } from 'lucide-react';

interface SmallActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'destructive' | 'primary';
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
  const isPrimary = variant === 'primary';
  const isDestructive = variant === 'destructive';

  const buttonClasses = isPrimary
    ? 'bg-primary border-primary hover:bg-primary/80'
    : 'bg-white border-[#e2e8f0] hover:bg-slate-50';

  const iconColor = isPrimary
    ? 'text-white'
    : isDestructive
      ? 'text-red-500'
      : 'text-[#020617]';

  const textColor = isPrimary
    ? 'text-white'
    : isDestructive
      ? 'text-red-500'
      : 'text-[#020617]';

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex items-center justify-center gap-1 py-1.5 px-3 flex-1 rounded-md border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${buttonClasses}`}
    >
      <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
      <span className={`text-sm font-semibold ${textColor}`}>
        {loading ? `${label}中...` : label}
      </span>
    </button>
  );
}

import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number;
  description?: string;
  icon: LucideIcon;
  iconBgColor: string;
  iconColor: string;
  isLoading?: boolean;
  onClick?: () => void;
  formatValue?: (num: number) => string;
}

const defaultFormatValue = (num: number) => num.toLocaleString('zh-CN');

export function StatCard({
  label,
  value,
  description,
  icon: Icon,
  iconBgColor,
  iconColor,
  isLoading = false,
  onClick,
  formatValue = defaultFormatValue,
}: StatCardProps) {
  const displayValue = isLoading ? '...' : formatValue(value);

  return (
    <div
      className={`bg-white rounded-xl border border-slate-100 ${
        onClick ? 'cursor-pointer active:bg-slate-50 transition-colors' : ''
      }`}
      onClick={onClick}
    >
      <div className='flex flex-col p-2 relative'>
        <div className='relative mb-1'>
          <p className='text-slate-500 text-xs font-medium'>{label}</p>
        </div>
        <h3 className='text-base font-bold text-slate-800 tracking-tight mb-0.5'>
          {displayValue}
        </h3>
        {description && <p className='text-xs text-slate-400'>{description}</p>}
        <div
          className={`absolute top-0 right-0 p-1 rounded-lg ${iconBgColor} flex-shrink-0`}
        >
          <Icon size={14} className={iconColor} />
        </div>
      </div>
    </div>
  );
}

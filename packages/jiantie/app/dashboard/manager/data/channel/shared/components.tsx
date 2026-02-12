'use client';

import { CheckSquare, Settings } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  RANKING_METRICS,
  REPORT_METRICS,
  formatMoney,
  formatNumber,
} from './constants';

// 截断到4位小数（不四舍五入）
const truncateTo4Decimals = (num: number): string => {
  const truncated = Math.floor(num * 10000) / 10000;
  const parts = truncated.toString().split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1] || '';
  const paddedDecimal = decimalPart.padEnd(4, '0').substring(0, 4);
  return `${integerPart}.${paddedDecimal}`;
};

// 评分渲染
export const renderScore = (val: number) => (
  <span className='inline-flex items-center px-2 py-0.5 rounded bg-red-50 text-red-600 font-bold font-mono text-xs border border-red-100'>
    {truncateTo4Decimals(val)}
  </span>
);

// 指标单元格渲染
export const renderMetricCell = (
  value: number,
  definition: (typeof REPORT_METRICS)[0] | (typeof RANKING_METRICS)[0]
) => {
  if (!definition) return value;
  if (definition.format === 'number') {
    return (
      <span className='font-mono text-slate-700'>{formatNumber(value)}</span>
    );
  }
  if (definition.format === 'currency') {
    return (
      <span className='font-mono text-slate-700'>{formatMoney(value)}</span>
    );
  }
  if (definition.format === 'percent') {
    const val = parseFloat(String(value));
    const formattedVal = val.toFixed(3); // 保留到千分位
    const colorClass =
      val < 40
        ? 'text-red-500 font-bold'
        : val <= 70
          ? 'text-blue-500 font-bold'
          : 'text-green-600 font-bold';
    return (
      <div className='flex flex-col items-end gap-0.5 w-full'>
        <span className={`${colorClass} font-mono`}>{formattedVal}%</span>
        <div className='w-16 h-1 bg-slate-300 rounded-full overflow-hidden'>
          <div
            className={`h-full rounded-full ${
              val < 40
                ? 'bg-red-400'
                : val <= 70
                  ? 'bg-blue-300'
                  : 'bg-green-400'
            }`}
            style={{ width: `${Math.min(val, 100)}%` }}
          ></div>
        </div>
      </div>
    );
  }
  if (definition.format === 'score') {
    return renderScore(value);
  }
  return value;
};

// 列选择器组件
export const ColumnSelector = ({
  definitions,
  visibleColumns,
  onChange,
  label = '指标配置',
}: {
  definitions: typeof REPORT_METRICS | typeof RANKING_METRICS;
  visibleColumns: string[];
  onChange: (columns: string[]) => void;
  label?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const groupedMetrics = definitions.reduce(
    (acc, metric) => {
      if (!acc[metric.group]) acc[metric.group] = [];
      acc[metric.group].push(metric);
      return acc;
    },
    {} as Record<string, Array<(typeof definitions)[number]>>
  );

  const toggleColumn = (key: string) => {
    if (visibleColumns.includes(key)) {
      // 移除列
      onChange(visibleColumns.filter(c => c !== key));
    } else {
      // 添加列，并按照定义顺序排序
      const newColumns = [...visibleColumns, key];
      // 按照 definitions 中的顺序排序
      const sortedColumns = definitions
        .map(def => def.key)
        .filter(key => newColumns.includes(key));
      onChange(sortedColumns);
    }
  };

  return (
    <div className='relative' ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='text-xs flex items-center gap-1.5 text-slate-600 hover:text-blue-600 bg-white border border-slate-200 px-3 py-1.5 rounded shadow-sm transition-colors'
      >
        <Settings size={14} /> {label}
      </button>

      {isOpen && (
        <div className='absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-100 z-50 animate-in fade-in zoom-in-95 duration-200'>
          <div className='p-3 border-b border-slate-100 bg-slate-50 rounded-t-lg'>
            <h4 className='font-bold text-xs text-slate-700'>{label}</h4>
          </div>
          <div className='p-3 max-h-80 overflow-y-auto'>
            {Object.entries(groupedMetrics).map(([group, metrics]) => (
              <div key={group} className='mb-4 last:mb-0'>
                <h5 className='text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2'>
                  {group}
                </h5>
                <div className='space-y-2'>
                  {metrics.map((metric: any) => (
                    <label
                      key={metric.key}
                      className='flex items-center gap-2 cursor-pointer group hover:bg-slate-50 p-1 rounded -mx-1'
                    >
                      <div
                        onClick={() => toggleColumn(metric.key)}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          visibleColumns.includes(metric.key)
                            ? 'bg-blue-500 border-blue-500'
                            : 'bg-white border-slate-300'
                        }`}
                      >
                        {visibleColumns.includes(metric.key) && (
                          <CheckSquare size={12} className='text-white' />
                        )}
                      </div>
                      <span
                        className={`text-sm ${
                          visibleColumns.includes(metric.key)
                            ? 'text-slate-700'
                            : 'text-slate-500'
                        }`}
                      >
                        {metric.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// 统计卡片组件
export const StatCard = ({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  icon: any;
  color: string;
}) => (
  <div className='bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between hover:shadow-md transition-shadow'>
    <div className='flex-1 min-w-0'>
      <p className='text-slate-500 text-xs font-medium mb-2 flex items-center gap-1 truncate'>
        {title}
        <span className='text-slate-300'>|</span>
        <span className='text-slate-400 font-normal'>本期</span>
      </p>
      <h3
        className='text-2xl font-bold text-slate-800 tracking-tight truncate'
        title={value}
      >
        {value}
      </h3>
    </div>
    <div
      className={`p-3 rounded-xl ${color} bg-opacity-10 text-opacity-100 ml-2 flex-shrink-0`}
    >
      <Icon size={22} className={color.replace('bg-', 'text-')} />
    </div>
  </div>
);

'use client';

import { trpc } from '@/utils/trpc';
import {
  ArrowDownRight,
  ChevronDown,
  DollarSign,
  FileText,
  MousePointer,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { StatCard, renderMetricCell } from '../shared/components';
import { clientTypes, formatMoney, formatNumber } from '../shared/constants';

// 市场渠道统计数据
type MarketChannelStat = {
  register_source: string;
  date: string;
  register_count: number;
  creation_pv: number;
  creation_uv: number;
  intercept_pv: number;
  intercept_uv: number;
  order_count: number;
  gmv: number;
  ltv: number;
  ltv7: number;
};

// 指标定义
const MARKET_METRICS = [
  {
    key: 'register_count',
    label: '用户注册量',
    group: '注册',
    format: 'number',
  },
  { key: 'creation_pv', label: '创作PV', group: '创作', format: 'number' },
  { key: 'creation_uv', label: '创作UV', group: '创作', format: 'number' },
  { key: 'intercept_pv', label: '拦截PV', group: '拦截', format: 'number' },
  { key: 'intercept_uv', label: '拦截UV', group: '拦截', format: 'number' },
  { key: 'order_count', label: '订单量', group: '订单', format: 'number' },
  { key: 'gmv', label: 'GMV', group: '订单', format: 'currency' },
  { key: 'ltv', label: 'LTV', group: '价值', format: 'currency' },
  { key: 'ltv7', label: 'LTV7天', group: '价值', format: 'currency' },
];

export default function MarketChannelPage() {
  const searchParams = useSearchParams();
  const typeapp = searchParams.get('typeapp');

  const [clientFilter, setClientFilter] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [statistics, setStatistics] = useState<MarketChannelStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollHandleRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);

  const getDateRange = () => {
    const today = new Date();
    const dateTo = new Date(today);
    dateTo.setHours(23, 59, 59, 999);

    let dateFrom = new Date(today);
    switch (selectedPeriod) {
      case 'today':
        dateFrom.setHours(0, 0, 0, 0);
        break;
      case 'yesterday':
        dateFrom.setDate(dateFrom.getDate() - 1);
        dateFrom.setHours(0, 0, 0, 0);
        dateTo.setDate(dateTo.getDate() - 1);
        dateTo.setHours(23, 59, 59, 999);
        break;
      case 'near7':
        dateFrom.setDate(dateFrom.getDate() - 7);
        dateFrom.setHours(0, 0, 0, 0);
        break;
      case 'near30':
        dateFrom.setDate(dateFrom.getDate() - 30);
        dateFrom.setHours(0, 0, 0, 0);
        break;
      case 'thisMonth':
        dateFrom.setDate(1);
        dateFrom.setHours(0, 0, 0, 0);
        break;
      case 'lastMonth':
        dateFrom.setMonth(dateFrom.getMonth() - 1);
        dateFrom.setDate(1);
        dateFrom.setHours(0, 0, 0, 0);
        dateTo.setDate(0);
        dateTo.setHours(23, 59, 59, 999);
        break;
      default:
        dateFrom.setDate(dateFrom.getDate() - 7);
        dateFrom.setHours(0, 0, 0, 0);
    }

    return {
      dateFrom: dateFrom.toISOString().split('T')[0],
      dateTo: dateTo.toISOString().split('T')[0],
    };
  };

  const { dateFrom, dateTo } = getDateRange();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const data = await trpc.channel.getMarketChannelStatistics.query({
          dateFrom,
          dateTo,
          device: clientFilter as any,
          appid: typeapp || undefined,
        });
        setStatistics(data || []);
      } catch (error) {
        console.error('获取市场渠道统计数据失败:', error);
        setStatistics([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dateFrom, dateTo, clientFilter, typeapp]);

  // 更新滚动信息
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateScrollInfo = () => {
      setScrollLeft(container.scrollLeft);
      setScrollWidth(container.scrollWidth);
      setClientWidth(container.clientWidth);
    };

    updateScrollInfo();
    container.addEventListener('scroll', updateScrollInfo);
    window.addEventListener('resize', updateScrollInfo);

    return () => {
      container.removeEventListener('scroll', updateScrollInfo);
      window.removeEventListener('resize', updateScrollInfo);
    };
  }, [statistics]);

  // 处理滚动把手拖动
  const handleScrollHandleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const container = scrollContainerRef.current;
    const handle = scrollHandleRef.current;
    if (!container || !handle) return;

    const startX = e.clientX;
    const startScrollLeft = container.scrollLeft;
    const maxScroll = container.scrollWidth - container.clientWidth;
    const handleWidth = handle.offsetWidth;
    const trackWidth = container.clientWidth - handleWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const scrollRatio = deltaX / trackWidth;
      const newScrollLeft = Math.max(
        0,
        Math.min(maxScroll, startScrollLeft + scrollRatio * maxScroll)
      );
      container.scrollLeft = newScrollLeft;
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // 处理点击滚动轨道
  const handleScrollTrackClick = (e: React.MouseEvent) => {
    const container = scrollContainerRef.current;
    const handle = scrollHandleRef.current;
    if (!container || !handle) return;

    const track = e.currentTarget as HTMLElement;
    const clickX = e.clientX - track.getBoundingClientRect().left;
    const trackWidth = track.clientWidth;
    const handleWidth = handle.offsetWidth;
    const maxScroll = container.scrollWidth - container.clientWidth;

    const newScrollLeft = (clickX / (trackWidth - handleWidth)) * maxScroll;
    container.scrollLeft = Math.max(0, Math.min(maxScroll, newScrollLeft));
  };

  // 计算滚动把手的位置和宽度
  const scrollRatio = clientWidth > 0 ? clientWidth / scrollWidth : 1;
  const handleWidth = Math.max(20, scrollRatio * clientWidth);
  const handleLeft =
    scrollWidth > clientWidth
      ? (scrollLeft / (scrollWidth - clientWidth)) * (clientWidth - handleWidth)
      : 0;
  const showScrollHandle = scrollWidth > clientWidth;

  // 计算汇总数据
  const totalStats = statistics.reduce(
    (acc, stat) => ({
      register_count: acc.register_count + stat.register_count,
      creation_pv: acc.creation_pv + stat.creation_pv,
      creation_uv: acc.creation_uv + stat.creation_uv,
      intercept_pv: acc.intercept_pv + stat.intercept_pv,
      intercept_uv: acc.intercept_uv + stat.intercept_uv,
      order_count: acc.order_count + stat.order_count,
      gmv: acc.gmv + stat.gmv,
      ltv: acc.ltv + stat.ltv,
      ltv7: acc.ltv7 + stat.ltv7,
    }),
    {
      register_count: 0,
      creation_pv: 0,
      creation_uv: 0,
      intercept_pv: 0,
      intercept_uv: 0,
      order_count: 0,
      gmv: 0,
      ltv: 0,
      ltv7: 0,
    }
  );

  // 按注册渠道分组
  const groupedBySource = new Map<string, MarketChannelStat[]>();
  for (const stat of statistics) {
    const source = stat.register_source || '未知渠道';
    if (!groupedBySource.has(source)) {
      groupedBySource.set(source, []);
    }
    groupedBySource.get(source)!.push(stat);
  }

  // 格式化CSV单元格值
  const formatCSVValue = (
    value: number,
    metricKey: string,
    format?: string
  ): string => {
    if (value === null || value === undefined || isNaN(value)) {
      return '0';
    }

    const numValue = Number(value);

    switch (format) {
      case 'number':
        return numValue.toLocaleString('zh-CN');
      case 'currency':
        return `¥${numValue.toLocaleString('zh-CN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      default:
        return String(numValue);
    }
  };

  // 导出CSV文件
  const handleExportCSV = () => {
    const headers = ['注册渠道', '日期', ...MARKET_METRICS.map(m => m.label)];

    const rows: string[][] = [];
    for (const stat of statistics) {
      const rowData: string[] = [stat.register_source || '未知渠道', stat.date];

      for (const metric of MARKET_METRICS) {
        const value = stat[metric.key as keyof MarketChannelStat] as number;
        const formattedValue = formatCSVValue(
          value || 0,
          metric.key,
          metric.format
        );
        rowData.push(formattedValue);
      }

      rows.push(rowData);
    }

    const csvContent = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
      ...rows.map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);

    const dateStr = new Date()
      .toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      .replace(/\//g, '-');
    link.setAttribute('download', `市场渠道统计-${dateStr}.csv`);

    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const periods = [
    { id: 'today', label: '今日' },
    { id: 'yesterday', label: '昨日' },
    { id: 'near7', label: '近7天' },
    { id: 'near30', label: '近30天' },
    { id: 'thisMonth', label: '本月' },
    { id: 'lastMonth', label: '上月' },
  ];

  // 根据指标类型获取列宽
  const getColumnWidth = (format?: string): string => {
    switch (format) {
      case 'currency':
        return 'min-w-[120px] w-[120px]';
      case 'number':
        return 'min-w-[100px] w-[100px]';
      default:
        return 'min-w-[100px] w-[100px]';
    }
  };

  return (
    <div className='animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6'>
      {/* 筛选器 */}
      <div className='flex flex-wrap items-center justify-between gap-4 mb-6'>
        <div>
          <h2 className='text-xl font-bold text-slate-800'>市场渠道统计</h2>
          <p className='text-sm text-slate-500 mt-1'>
            按注册渠道统计每天带来的用户注册量、创作pvuv、拦截pvuv、订单量、GMV、LTV、LTV7天
          </p>
        </div>

        <div className='flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm'>
          {/* 客户端筛选 */}
          <div className='relative group border-r border-slate-200 pr-3'>
            <select
              value={clientFilter}
              onChange={e => setClientFilter(e.target.value)}
              className='appearance-none bg-slate-50 text-slate-700 text-sm font-medium rounded-lg pl-3 pr-8 py-2 hover:bg-slate-100 focus:outline-none cursor-pointer transition-colors'
            >
              {clientTypes.map(t => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className='absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none'
            />
          </div>

          {/* 周期筛选 */}
          <div className='relative group'>
            <select
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(e.target.value)}
              className='appearance-none bg-slate-50 text-slate-700 text-sm font-medium rounded-lg pl-3 pr-8 py-2 hover:bg-slate-100 focus:outline-none cursor-pointer transition-colors'
            >
              {periods.map(p => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className='absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none'
            />
          </div>
        </div>
      </div>

      {/* 核心指标卡片 */}
      {isLoading ? (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-2'>
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className='bg-white p-5 rounded-xl shadow-sm border border-slate-100 animate-pulse'
            >
              <div className='h-4 bg-slate-200 rounded w-3/4 mb-2'></div>
              <div className='h-8 bg-slate-200 rounded w-1/2'></div>
            </div>
          ))}
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-2'>
          <StatCard
            title='用户注册量'
            value={formatNumber(totalStats.register_count)}
            icon={Users}
            color='bg-blue-500'
          />
          <StatCard
            title='创作UV'
            value={formatNumber(totalStats.creation_uv)}
            icon={FileText}
            color='bg-purple-500'
          />
          <StatCard
            title='订单数'
            value={formatNumber(totalStats.order_count)}
            icon={TrendingUp}
            color='bg-orange-500'
          />
          <StatCard
            title='GMV'
            value={formatMoney(totalStats.gmv)}
            icon={DollarSign}
            color='bg-green-500'
          />
        </div>
      )}

      {/* 数据表格 */}
      <div className='bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-6'>
        <div className='px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50'>
          <h3 className='font-bold text-slate-800 flex items-center gap-2 whitespace-nowrap'>
            <MousePointer size={18} className='text-blue-600' /> 市场渠道明细
          </h3>
          <div className='flex items-center gap-3'>
            <div className='h-4 w-px bg-slate-300'></div>
            <button
              onClick={handleExportCSV}
              className='text-xs flex items-center gap-1 text-slate-500 hover:text-blue-600 bg-white border border-slate-200 px-2 py-1.5 rounded shadow-sm transition-colors'
            >
              <ArrowDownRight size={14} /> 导出
            </button>
          </div>
        </div>

        {/* 横向滚动把手 */}
        {showScrollHandle && (
          <div
            className='relative h-2 bg-slate-100 border-b border-slate-200 cursor-pointer'
            onClick={handleScrollTrackClick}
          >
            <div
              ref={scrollHandleRef}
              onMouseDown={handleScrollHandleMouseDown}
              onClick={e => e.stopPropagation()}
              className='absolute top-0 h-full bg-slate-300 hover:bg-slate-400 rounded cursor-grab active:cursor-grabbing transition-colors'
              style={{
                width: `${handleWidth}px`,
                left: `${handleLeft}px`,
              }}
            />
          </div>
        )}

        <div ref={scrollContainerRef} className='overflow-x-auto min-h-[400px]'>
          {isLoading ? (
            <div className='p-8 text-center text-slate-500'>加载中...</div>
          ) : statistics.length > 0 ? (
            <table className='w-full text-left text-sm table-fixed'>
              <thead className='sticky top-0 z-10'>
                <tr className='bg-slate-50 text-slate-500 border-b border-slate-200'>
                  <th className='px-6 py-3 font-medium w-32 sticky left-0 top-0 bg-slate-50 z-20 whitespace-nowrap'>
                    注册渠道
                  </th>
                  <th className='px-4 py-3 font-medium w-32 whitespace-nowrap bg-slate-50'>
                    日期
                  </th>
                  {MARKET_METRICS.map(metric => (
                    <th
                      key={metric.key}
                      className={`px-4 py-3 font-medium text-right whitespace-nowrap bg-slate-50 ${getColumnWidth(metric.format)}`}
                    >
                      {metric.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100'>
                {statistics.map((stat, index) => (
                  <tr
                    key={`${stat.register_source}_${stat.date}_${index}`}
                    className='hover:bg-slate-50 group'
                  >
                    <td className='px-6 py-4 sticky left-0 z-10 border-r border-transparent group-hover:border-slate-100 bg-white group-hover:bg-slate-50 whitespace-nowrap'>
                      {stat.register_source || '未知渠道'}
                    </td>
                    <td className='px-4 py-4 whitespace-nowrap'>{stat.date}</td>
                    {MARKET_METRICS.map(metric => {
                      const value = stat[
                        metric.key as keyof MarketChannelStat
                      ] as number;
                      return (
                        <td
                          key={metric.key}
                          className={`px-4 py-4 text-right whitespace-nowrap ${getColumnWidth(metric.format)}`}
                        >
                          {renderMetricCell(value || 0, metric)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className='p-8 text-center text-slate-500'>暂无数据</div>
          )}
        </div>
      </div>
    </div>
  );
}

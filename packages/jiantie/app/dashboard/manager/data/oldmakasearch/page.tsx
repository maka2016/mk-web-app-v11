'use client';

import { trpc } from '@/utils/trpc';
import {
  BarChart2,
  ChevronDown,
  Download,
  FileText,
  MousePointer,
  Search,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  ColumnSelector,
  StatCard,
  renderMetricCell,
} from '../channel/shared/components';

// 格式化函数
const formatNumber = (val: number) => val.toLocaleString();

// 指标定义
const OLD_MAKA_SEARCH_METRICS = [
  { key: 'search_term', label: '搜索词', group: '基础', format: 'text' },
  { key: 'pv', label: '搜索量 (PV)', group: '搜索', format: 'number' },
  { key: 'uv', label: '搜索用户 (UV)', group: '搜索', format: 'number' },
];

const DEFAULT_VISIBLE_COLUMNS = ['search_term', 'pv', 'uv'];

const STORAGE_KEY = 'old_maka_search_visible_columns';

// 搜索词表格组件
const SearchTermTable = ({
  data,
  visibleColumns,
}: {
  data: Array<{
    search_term: string;
    pv: number;
    uv: number;
  }>;
  visibleColumns: string[];
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);

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
  }, [data, visibleColumns]);

  // 计算滚动把手的位置和宽度
  const scrollRatio = clientWidth > 0 ? clientWidth / scrollWidth : 1;
  const handleWidth = Math.max(20, scrollRatio * clientWidth);
  const handleLeft =
    scrollWidth > clientWidth
      ? (scrollLeft / (scrollWidth - clientWidth)) * (clientWidth - handleWidth)
      : 0;
  const showScrollHandle = scrollWidth > clientWidth;

  return (
    <div className='bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-6 sticky top-[100px] z-20'>
      <div className='px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50'>
        <h3 className='font-bold text-slate-800 flex items-center gap-2 whitespace-nowrap'>
          <FileText size={18} className='text-blue-600' /> 搜索词分布明细
        </h3>
      </div>

      {/* 滚动容器 */}
      <div
        ref={scrollContainerRef}
        className='overflow-x-auto relative min-h-[400px]'
        style={{ scrollbarWidth: 'thin' }}
      >
        <table className='w-full text-left text-sm'>
          <thead className='sticky top-0 z-10'>
            <tr className='bg-slate-50 text-slate-500 border-b border-slate-200'>
              {visibleColumns.map(colKey => {
                const metric = OLD_MAKA_SEARCH_METRICS.find(
                  d => d.key === colKey
                );
                if (metric) {
                  return (
                    <th
                      key={colKey}
                      className={`px-6 py-3 font-medium ${
                        colKey === 'search_term'
                          ? 'sticky left-0 bg-slate-50 z-20 w-48 whitespace-nowrap'
                          : 'text-right whitespace-nowrap'
                      }`}
                    >
                      {metric.label}
                    </th>
                  );
                }
                return null;
              })}
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-100'>
            {data.map((stat, index) => (
              <tr
                key={`${stat.search_term}_${index}`}
                className='hover:bg-slate-50 group'
              >
                {visibleColumns.map(colKey => {
                  const metric = OLD_MAKA_SEARCH_METRICS.find(
                    d => d.key === colKey
                  );
                  if (!metric) return null;

                  const value = stat[colKey as keyof typeof stat];
                  const isText = metric.format === 'text';

                  return (
                    <td
                      key={colKey}
                      className={`px-6 py-4 ${
                        colKey === 'search_term'
                          ? 'sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-transparent group-hover:border-slate-100 font-medium text-slate-800'
                          : 'text-right whitespace-nowrap'
                      }`}
                    >
                      {isText ? (
                        <span className='text-blue-600 hover:text-blue-700'>
                          {String(value || '')}
                        </span>
                      ) : (
                        renderMetricCell(Number(value) || 0, metric)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 水平滚动条 */}
      {showScrollHandle && (
        <div className='px-4 py-2 border-t border-slate-200 bg-slate-50'>
          <div className='relative h-2 bg-slate-200 rounded-full'>
            <div
              className='absolute h-2 bg-blue-500 rounded-full cursor-pointer hover:bg-blue-600 transition-colors'
              style={{
                left: `${handleLeft}px`,
                width: `${handleWidth}px`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default function OldMakaSearchPage() {
  // 从 localStorage 读取保存的指标配置
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_VISIBLE_COLUMNS;
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('读取指标配置失败:', error);
    }
    return DEFAULT_VISIBLE_COLUMNS;
  });

  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);

  // 当 visibleColumns 改变时，保存到 localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleColumns));
      } catch (error) {
        console.error('保存指标配置失败:', error);
      }
    }
  }, [visibleColumns]);

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

  const [statistics, setStatistics] = useState<
    Array<{
      search_term: string;
      pv: number;
      uv: number;
    }>
  >([]);
  const [summary, setSummary] = useState<{
    total_pv: number;
    total_uv: number;
    platform_stats: Array<{ platform: string; pv: number; uv: number }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [statsData, summaryData] = await Promise.all([
          trpc.oldMakaSearch.getOldMakaSearchStatistics.query({
            dateFrom,
            dateTo,
            searchTerm: searchTerm || undefined,
            platform: selectedPlatform !== 'all' ? selectedPlatform : undefined,
          }),
          trpc.oldMakaSearch.getOldMakaSearchStatisticsSummary.query({
            dateFrom,
            dateTo,
            searchTerm: searchTerm || undefined,
            platform: selectedPlatform !== 'all' ? selectedPlatform : undefined,
          }),
        ]);
        setStatistics(statsData || []);
        setSummary(summaryData || null);
      } catch (error) {
        console.error('获取统计数据失败:', error);
        setStatistics([]);
        setSummary(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dateFrom, dateTo, searchTerm, selectedPlatform]);

  // 导出功能
  const handleExport = () => {
    try {
      setIsExporting(true);
      const headers = visibleColumns.map(col => {
        const metric = OLD_MAKA_SEARCH_METRICS.find(m => m.key === col);
        return metric ? metric.label : col;
      });

      const rows = statistics.map(item => {
        return visibleColumns.map(col => {
          const value = item[col as keyof typeof item];
          return value !== null && value !== undefined ? String(value) : '';
        });
      });

      const csvContent = [
        headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
        ...rows.map(row =>
          row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ),
      ].join('\n');

      // 下载文件
      const blob = new Blob(['\uFEFF' + csvContent], {
        type: 'text/csv;charset=utf-8;',
      });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `老maka搜索数据_${dateFrom}_${dateTo}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请稍后重试');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className='h-dvh bg-slate-50 font-sans text-slate-800 pb-12 overflow-hidden'>
      {/* Header */}
      <header className='bg-white border-b border-slate-200 sticky top-0 z-20 px-6 py-3 flex items-center justify-between shadow-sm'>
        <div className='flex items-center gap-2'>
          <div className='text-white p-1.5 rounded-lg shadow-sm bg-blue-600 shadow-blue-200'>
            <BarChart2 size={20} />
          </div>
          <h1 className='text-lg font-bold text-slate-800 tracking-tight'>
            老MAKA搜索数据
          </h1>
          <div className='mx-4 h-6 w-px bg-slate-200'></div>
          <p className='text-sm text-slate-500'>
            查看所有端进入搜索页面的搜索词分布数据
          </p>
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 py-8 h-dvh overflow-y-auto pb-32'>
        <div className='space-y-6'>
          {/* 筛选区域 */}
          <div className='bg-white rounded-xl shadow-sm border border-slate-200 p-4'>
            <div className='flex flex-wrap items-center gap-4'>
              {/* 日期筛选 */}
              <div className='flex items-center gap-2'>
                <span className='text-sm font-medium text-slate-700 whitespace-nowrap'>
                  日期范围:
                </span>
                <div className='relative'>
                  <select
                    value={selectedPeriod}
                    onChange={e => setSelectedPeriod(e.target.value)}
                    className='appearance-none bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 pr-8 text-sm text-slate-700 font-medium hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors cursor-pointer'
                  >
                    <option value='today'>今天</option>
                    <option value='yesterday'>昨天</option>
                    <option value='near7'>近7天</option>
                    <option value='near30'>近30天</option>
                  </select>
                  <ChevronDown
                    size={16}
                    className='absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none'
                  />
                </div>
              </div>

              {/* 设备筛选 */}
              <div className='flex items-center gap-2'>
                <span className='text-sm font-medium text-slate-700 whitespace-nowrap'>
                  设备:
                </span>
                <div className='relative'>
                  <select
                    value={selectedPlatform}
                    onChange={e => setSelectedPlatform(e.target.value)}
                    className='appearance-none bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 pr-8 text-sm text-slate-700 font-medium hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors cursor-pointer'
                  >
                    <option value='all'>全部</option>
                    <option value='ios'>iOS</option>
                    <option value='android'>Android</option>
                    <option value='web'>Web</option>
                    <option value='wap'>WAP</option>
                  </select>
                  <ChevronDown
                    size={16}
                    className='absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none'
                  />
                </div>
              </div>

              {/* 搜索词搜索 */}
              <div className='flex items-center gap-2 flex-1 min-w-[200px]'>
                <Search size={16} className='text-slate-400' />
                <input
                  type='text'
                  placeholder='搜索关键词...'
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className='flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              </div>

              {/* 导出按钮 */}
              <button
                onClick={handleExport}
                disabled={isExporting || isLoading}
                className='flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-sm'
              >
                <Download size={16} />
                {isExporting ? '导出中...' : '导出数据'}
              </button>
            </div>
          </div>

          {/* 统计卡片 */}
          {isLoading ? (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
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
          ) : summary ? (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
              <StatCard
                title='总搜索量 (PV)'
                value={formatNumber(summary.total_pv)}
                icon={MousePointer}
                color='bg-blue-500'
              />
              <StatCard
                title='总搜索用户 (UV)'
                value={formatNumber(summary.total_uv)}
                icon={FileText}
                color='bg-purple-500'
              />
              {summary.platform_stats.map((platformStat, index) => (
                <StatCard
                  key={platformStat.platform}
                  title={`${platformStat.platform.toUpperCase()} 搜索量 (PV)`}
                  value={formatNumber(platformStat.pv)}
                  icon={MousePointer}
                  color={index === 0 ? 'bg-green-500' : 'bg-orange-500'}
                />
              ))}
            </div>
          ) : null}

          {/* 指标配置 */}
          <div className='flex justify-end'>
            <ColumnSelector
              definitions={OLD_MAKA_SEARCH_METRICS}
              visibleColumns={visibleColumns}
              onChange={setVisibleColumns}
            />
          </div>

          {/* 数据表格 */}
          {isLoading ? (
            <div className='bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-500'>
              <div className='animate-pulse space-y-4'>
                <div className='h-4 bg-slate-200 rounded w-1/4 mx-auto'></div>
                <div className='h-4 bg-slate-200 rounded w-1/3 mx-auto'></div>
              </div>
            </div>
          ) : statistics && statistics.length > 0 ? (
            <SearchTermTable
              data={statistics}
              visibleColumns={visibleColumns}
            />
          ) : (
            <div className='bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-500'>
              暂无数据
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

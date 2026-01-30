'use client';

import { trpc } from '@/utils/trpc';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@workspace/ui/components/pagination';
import dayjs from 'dayjs';
import {
  BarChart2,
  ChevronDown,
  Download,
  MousePointer,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { ColumnSelector, StatCard } from '../channel/shared/components';

type PeriodKey =
  | 'today'
  | 'yesterday'
  | 'dayBeforeYesterday'
  | 'near7'
  | 'near14'
  | 'near30';

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: 'today', label: '今天' },
  { key: 'yesterday', label: '昨天' },
  { key: 'dayBeforeYesterday', label: '前天' },
  { key: 'near7', label: '近7天' },
  { key: 'near14', label: '近14天' },
  { key: 'near30', label: '近30天' },
];

interface MixSearchStatByTerm {
  search_term: string;
  search_pv: number;
  search_uv: number;
  click_pv: number;
  click_uv: number;
  old_click_pv: number;
  old_click_uv: number;
  creation_pv: number;
  creation_uv: number;
  vip_intercept_pv: number;
  vip_intercept_uv: number;
  success_pv: number;
  success_uv: number;
  result_count: number;
  old_result_count: number;
}

// 列配置定义
const COLUMN_DEFINITIONS = [
  { key: 'result_count', label: '新版结果数', group: '结果数' },
  { key: 'old_result_count', label: '旧版结果数', group: '结果数' },
  { key: 'search_pv', label: '搜索量 (PV)', group: '搜索' },
  { key: 'search_uv', label: '搜索用户 (UV)', group: '搜索' },
  { key: 'click_pv', label: '新版点击 PV', group: '新版点击' },
  { key: 'click_uv', label: '新版点击 UV', group: '新版点击' },
  { key: 'old_click_pv', label: '旧版点击 PV', group: '旧版点击' },
  { key: 'old_click_uv', label: '旧版点击 UV', group: '旧版点击' },
  { key: 'creation_pv', label: '创作 PV', group: '创作' },
  { key: 'creation_uv', label: '创作 UV', group: '创作' },
  { key: 'vip_intercept_pv', label: 'VIP拦截 PV', group: 'VIP拦截' },
  { key: 'vip_intercept_uv', label: 'VIP拦截 UV', group: 'VIP拦截' },
  { key: 'success_pv', label: '成功 PV', group: '成功' },
  { key: 'success_uv', label: '成功 UV', group: '成功' },
];

const DEFAULT_VISIBLE_COLUMNS = [
  'result_count',
  'old_result_count',
  'search_pv',
  'search_uv',
  'click_pv',
  'click_uv',
  'old_click_pv',
  'old_click_uv',
  'creation_pv',
  'creation_uv',
  'vip_intercept_pv',
  'vip_intercept_uv',
  'success_pv',
  'success_uv',
];

const STORAGE_KEY = 'makamix_search_visible_columns';
const PAGE_SIZE = 30;

export default function MakaMixSearchDailyPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>('near7');
  const [currentPage, setCurrentPage] = useState(1);

  // 从 localStorage 读取保存的列配置
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
      console.error('读取列配置失败:', error);
    }
    return DEFAULT_VISIBLE_COLUMNS;
  });

  // 格式化函数
  const formatMoney = (val: number) => `¥${val.toLocaleString()}`;
  const formatNumber = (val: number) => val.toLocaleString();
  // 当 visibleColumns 改变时，保存到 localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleColumns));
      } catch (error) {
        console.error('保存列配置失败:', error);
      }
    }
  }, [visibleColumns]);

  const { dateFrom, dateTo, displayDateFrom, displayDateTo } = useMemo(() => {
    // 业务时间为东8区，这里先把当前时间转换到东8区"墙上时间"，
    // 再计算区间，最后再换算成 UTC 传给后端（数据库字段是 UTC）。
    const now = dayjs();
    let beijingStart: dayjs.Dayjs;
    let beijingEnd: dayjs.Dayjs;

    switch (selectedPeriod) {
      case 'today':
        beijingStart = now.startOf('day');
        beijingEnd = now.add(1, 'day').startOf('day');
        break;
      case 'yesterday':
        beijingStart = now.subtract(1, 'day').startOf('day');
        beijingEnd = now.endOf('day');
        break;
      case 'dayBeforeYesterday':
        beijingStart = now.subtract(2, 'day').startOf('day');
        beijingEnd = now.subtract(1, 'day').endOf('day');
        break;
      case 'near7':
        beijingStart = now.subtract(7, 'day').startOf('day');
        beijingEnd = now.add(1, 'day').endOf('day');
        break;
      case 'near14':
        beijingStart = now.subtract(14, 'day').startOf('day');
        beijingEnd = now.add(1, 'day').endOf('day');
        break;
      case 'near30':
        beijingStart = now.subtract(30, 'day').startOf('day');
        beijingEnd = now.add(1, 'day').endOf('day');
        break;
      default:
        beijingStart = now.subtract(7, 'day').startOf('day');
        beijingEnd = now.add(1, 'day').endOf('day');
    }

    // 转成 UTC 再给后端：dayjs 对象减去 8 小时得到真实 UTC 边界
    // const beijingOffsetMs = 8 * 60 * 60 * 1000; // 8小时的毫秒数

    return {
      dateFrom: beijingStart, // 带时间的 UTC ISO 字符串
      dateTo: beijingEnd,
      displayDateFrom: beijingStart.format('YYYY-MM-DD'),
      displayDateTo: beijingEnd.format('YYYY-MM-DD'),
    };
  }, [selectedPeriod]);

  const [statistics, setStatistics] = useState<MixSearchStatByTerm[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [summary, setSummary] = useState<{
    search_pv: number;
    search_uv: number;
    click_pv: number;
    click_uv: number;
    old_click_pv: number;
    old_click_uv: number;
    creation_pv: number;
    creation_uv: number;
    vip_intercept_pv: number;
    vip_intercept_uv: number;
    success_pv: number;
    success_uv: number;
    result_count: number;
    old_result_count: number;
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [statsData, summaryData] = await Promise.all([
          trpc.adminSearch.getMixSearchStatisticsByTerm.query({
            appid: 'maka',
            dateFrom: dateFrom.toISOString(),
            dateTo: dateTo.toISOString(),
          }),
          trpc.adminSearch.getMixSearchDailyStatisticsSummary.query({
            appid: 'maka',
            dateFrom: dateFrom.toISOString(),
            dateTo: dateTo.toISOString(),
          }),
        ]);

        setStatistics(statsData || []);
        setSummary(summaryData || null);
        // 重置到第一页
        setCurrentPage(1);
      } catch (error) {
        console.error('获取 MixSearch 统计数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dateFrom, dateTo]);

  // 计算分页数据
  const paginatedStatistics = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return statistics.slice(start, end);
  }, [statistics, currentPage]);

  const totalPages = Math.ceil(statistics.length / PAGE_SIZE);

  // CSV 转义函数
  const escapeCSV = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // 导出 CSV
  const handleExportCSV = () => {
    try {
      if (statistics.length === 0) {
        alert('暂无数据可导出');
        return;
      }

      // 按照 COLUMN_DEFINITIONS 的顺序构建表头
      const headers = [
        '搜索词',
        ...COLUMN_DEFINITIONS.filter(col =>
          visibleColumns.includes(col.key)
        ).map(col => col.label),
      ];

      // 构建数据行
      const rows = statistics.map(stat => {
        const row: (string | number)[] = [stat.search_term];
        COLUMN_DEFINITIONS.filter(col =>
          visibleColumns.includes(col.key)
        ).forEach(colDef => {
          const value = stat[colDef.key as keyof MixSearchStatByTerm];
          row.push(value as number);
        });
        return row;
      });

      // 构建 CSV 内容
      const csvContent = [
        headers.map(escapeCSV).join(','),
        ...rows.map(row => row.map(escapeCSV).join(',')),
      ].join('\n');

      // 添加 BOM 以支持中文 Excel
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], {
        type: 'text/csv;charset=utf-8;',
      });

      // 创建下载链接
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `MAKA混合搜索数据_${displayDateFrom}_${displayDateTo}.csv`
      );
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出 CSV 失败:', error);
      alert('导出失败，请稍后重试');
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
            MAKA混合搜索数据
          </h1>
          <div className='mx-4 h-6 w-px bg-slate-200'></div>
          <p className='text-sm text-slate-500'>
            在选定时间区间内，按搜索词聚合查看 MAKA
            混合搜索（新老搜索结果）整体表现，
          </p>
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 py-8 h-dvh overflow-y-auto pb-32'>
        <div className='space-y-6'>
          {/* 筛选区域 */}
          <div className='bg-white rounded-xl shadow-sm border border-slate-200 p-4'>
            <div className='flex flex-wrap items-center gap-4'>
              <div className='flex items-center gap-2'>
                <span className='text-sm text-slate-600'>日期范围:</span>
                <div className='relative'>
                  <select
                    value={selectedPeriod}
                    onChange={e =>
                      setSelectedPeriod(e.target.value as PeriodKey)
                    }
                    className='appearance-none bg-white border border-slate-300 rounded-lg px-4 py-2 pr-8 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  >
                    {PERIOD_OPTIONS.map(option => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className='absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none'
                  />
                </div>
              </div>

              <div className='text-xs text-slate-400'>
                当前区间：{displayDateFrom} ~ {displayDateTo}
              </div>
            </div>
          </div>

          {/* 汇总统计卡片 */}
          {summary && (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
              <StatCard
                title='总搜索用户 (UV)'
                value={formatNumber(summary.search_uv)}
                icon={Users}
                color='bg-blue-500'
              />
              <StatCard
                title='总点击用户 (UV)'
                value={formatNumber(summary.click_uv)}
                icon={MousePointer}
                color='bg-indigo-500'
              />
              <StatCard
                title='总创作用户 (UV)'
                value={formatNumber(summary.creation_uv)}
                icon={TrendingUp}
                color='bg-purple-500'
              />
              <StatCard
                title='新版/旧版平均结果数'
                value={`${formatNumber(summary.result_count)} / ${formatNumber(
                  summary.old_result_count
                )}`}
                icon={BarChart2}
                color='bg-emerald-500'
              />
            </div>
          )}

          {/* 列配置和导出 */}
          <div className='flex justify-end gap-3 mb-4'>
            <button
              onClick={handleExportCSV}
              disabled={statistics.length === 0}
              className='text-xs flex items-center gap-1.5 text-slate-600 hover:text-blue-600 bg-white border border-slate-200 px-3 py-1.5 rounded shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <Download size={14} />
              导出数据
            </button>
            <ColumnSelector
              definitions={COLUMN_DEFINITIONS as any}
              visibleColumns={visibleColumns}
              onChange={setVisibleColumns}
              label='列配置'
            />
          </div>

          {/* 数据表格 */}
          <div className='bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden'>
            <div className='px-6 py-4 border-b border-slate-200 flex items-center justify-between'>
              <div>
                <h2 className='text-base font-semibold text-slate-800'>
                  按搜索词统计明细
                </h2>
                <p className='text-xs text-slate-500 mt-1'>
                  在当前日期区间内，按搜索词聚合 MixSearch
                  的整体表现，对比新老搜索结果点击与结果数量。
                  <span className='text-red-500'>
                    创建、拦截、成功数据只统计新模板
                  </span>
                </p>
              </div>
              {isLoading && (
                <div className='text-xs text-slate-400'>加载中...</div>
              )}
            </div>

            {statistics.length === 0 ? (
              <div className='p-8 text-center text-slate-500 text-sm'>
                暂无数据
              </div>
            ) : (
              <div
                className='overflow-x-auto'
                style={{ scrollbarWidth: 'thin' }}
              >
                <table className='min-w-full text-left text-sm'>
                  <thead>
                    <tr className='bg-slate-50 text-slate-500 border-b border-slate-200'>
                      <th className='px-4 py-3 whitespace-nowrap text-xs font-medium sticky left-0 bg-slate-50 z-10'>
                        搜索词
                      </th>
                      {COLUMN_DEFINITIONS.filter(col =>
                        visibleColumns.includes(col.key)
                      ).map(colDef => (
                        <th
                          key={colDef.key}
                          className='px-4 py-3 whitespace-nowrap text-xs font-medium text-right'
                        >
                          {colDef.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-slate-100'>
                    {paginatedStatistics.map(stat => (
                      <tr
                        key={stat.search_term}
                        className='group hover:bg-slate-50'
                      >
                        <td className='px-4 py-3 text-slate-800 text-xs max-w-[220px] truncate sticky left-0 bg-white group-hover:bg-slate-50 z-10'>
                          {stat.search_term}
                        </td>
                        {COLUMN_DEFINITIONS.filter(col =>
                          visibleColumns.includes(col.key)
                        ).map(colDef => {
                          const value =
                            stat[colDef.key as keyof MixSearchStatByTerm];
                          return (
                            <td
                              key={colDef.key}
                              className='px-4 py-3 text-right font-mono text-slate-800 whitespace-nowrap'
                            >
                              {formatNumber(value as number)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 分页控件 */}
            {statistics.length > PAGE_SIZE && (
              <div className='px-6 py-4 border-t border-slate-200'>
                <div className='flex items-center justify-between'>
                  <div className='text-sm text-slate-600'>
                    共 {statistics.length} 条数据，第 {currentPage} /{' '}
                    {totalPages} 页
                  </div>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => {
                            if (currentPage > 1) {
                              setCurrentPage(currentPage - 1);
                            }
                          }}
                          className={
                            currentPage === 1
                              ? 'pointer-events-none opacity-50'
                              : 'cursor-pointer'
                          }
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(
                          pageNum =>
                            pageNum === 1 ||
                            pageNum === totalPages ||
                            Math.abs(pageNum - currentPage) <= 2
                        )
                        .map((pageNum, index, array) => (
                          <div key={pageNum} className='flex items-center'>
                            {index > 0 && array[index - 1] !== pageNum - 1 && (
                              <PaginationEllipsis />
                            )}
                            <PaginationItem>
                              <PaginationLink
                                onClick={() => setCurrentPage(pageNum)}
                                isActive={pageNum === currentPage}
                                className='cursor-pointer'
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          </div>
                        ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => {
                            if (currentPage < totalPages) {
                              setCurrentPage(currentPage + 1);
                            }
                          }}
                          className={
                            currentPage >= totalPages
                              ? 'pointer-events-none opacity-50'
                              : 'cursor-pointer'
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

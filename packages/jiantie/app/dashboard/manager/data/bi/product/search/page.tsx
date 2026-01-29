'use client';

import { trpc } from '@/utils/trpc';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@workspace/ui/components/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table';
import dayjs from 'dayjs';
import { CheckSquare, Download, Loader2, Settings } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { renderMetricCell } from '../../../channel/shared/components';

// 搜索看板指标定义
const SEARCH_BI_METRICS = [
  { key: 'view_pv', label: '曝光PV', group: '曝光', format: 'number' },
  { key: 'view_uv', label: '曝光UV', group: '曝光', format: 'number' },
  {
    key: 'template_click_pv',
    label: '模板点击PV',
    group: '点击',
    format: 'number',
  },
  {
    key: 'template_click_uv',
    label: '模板点击UV',
    group: '点击',
    format: 'number',
  },
  {
    key: 'old_maka_template_click_pv',
    label: '老MAKA模板点击PV',
    group: '点击',
    format: 'number',
  },
  {
    key: 'old_maka_template_click_uv',
    label: '老MAKA模板点击UV',
    group: '点击',
    format: 'number',
  },
  { key: 'creation_pv', label: '创作PV', group: '创作', format: 'number' },
  { key: 'creation_uv', label: '创作UV', group: '创作', format: 'number' },
  {
    key: 'old_maka_template_creation_pv',
    label: '老MAKA创作PV',
    group: '创作',
    format: 'number',
  },
  {
    key: 'old_maka_template_creation_uv',
    label: '老MAKA创作UV',
    group: '创作',
    format: 'number',
  },
  { key: 'intercept_pv', label: '拦截PV', group: '拦截', format: 'number' },
  { key: 'intercept_uv', label: '拦截UV', group: '拦截', format: 'number' },
  { key: 'success_pv', label: '成功PV', group: '成功', format: 'number' },
  { key: 'success_uv', label: '成功UV', group: '成功', format: 'number' },
  { key: 'order_count', label: '订单数', group: '商业', format: 'number' },
  { key: 'gmv', label: '成交金额 (GMV)', group: '商业', format: 'currency' },
  {
    key: 'template_count',
    label: '模板数',
    group: '模板',
    format: 'number',
  },
  {
    key: 'old_maka_template_count',
    label: '老MAKA模板数',
    group: '模板',
    format: 'number',
  },
  {
    key: 'view_value_uv',
    label: '曝光UV价值',
    group: '价值',
    format: 'currency',
  },
  {
    key: 'click_value_uv',
    label: '点击UV价值',
    group: '价值',
    format: 'currency',
  },
  {
    key: 'creation_value_uv',
    label: '创作UV价值',
    group: '价值',
    format: 'currency',
  },
  {
    key: 'creation_success_rate_uv',
    label: '创作成成功率UV',
    group: '转化率',
    format: 'percent',
  },
  {
    key: 'creation_intercept_rate_uv',
    label: '创作拦截率UV',
    group: '转化率',
    format: 'percent',
  },
  {
    key: 'template_click_rate_uv',
    label: '模板点击率UV',
    group: '转化率',
    format: 'percent',
  },
  {
    key: 'old_maka_template_click_rate_uv',
    label: '老模板点击率UV',
    group: '转化率',
    format: 'percent',
  },
  {
    key: 'view_value_uv_display',
    label: '曝光价值UV',
    group: '价值',
    format: 'currency',
  },
];

const DEFAULT_VISIBLE_COLUMNS = [
  'view_pv',
  'view_uv',
  'template_click_pv',
  'template_click_uv',
  'creation_pv',
  'creation_uv',
  'success_pv',
  'success_uv',
  'order_count',
  'gmv',
];

export default function SearchBiPage() {
  const searchParams = useSearchParams();
  const appid = searchParams.get('appid') || '';

  // 初始化日期
  const [dateFrom, setDateFrom] = useState(
    dayjs().subtract(1, 'day').format('YYYY-MM-DD')
  );
  const [dateTo, setDateTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [device, setDevice] = useState<string>('');
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    DEFAULT_VISIBLE_COLUMNS
  );
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // 搜索BI数据
  const [biData, setBiData] = useState<
    Array<{
      id: string;
      appid: string;
      search_word: string;
      device: string;
      date: string;
      view_pv: number;
      view_uv: number;
      template_click_pv: number;
      template_click_uv: number;
      creation_pv: number;
      creation_uv: number;
      intercept_pv: number;
      intercept_uv: number;
      success_pv: number;
      success_uv: number;
      order_count: number;
      gmv: number;
      template_count: number;
      old_maka_template_count: number;
      old_maka_template_click_pv: number;
      old_maka_template_click_uv: number;
      old_maka_template_creation_pv: number;
      old_maka_template_creation_uv: number;
      create_time: string;
      update_time: string;
    }>
  >([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // 获取可用的device列表
  const [devices, setDevices] = useState<string[]>([]);

  // 列选择器状态
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
  const columnSelectorRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭列选择器
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        columnSelectorRef.current &&
        !columnSelectorRef.current.contains(event.target as Node)
      ) {
        setIsColumnSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 切换列显示
  const toggleColumn = (key: string) => {
    if (visibleColumns.includes(key)) {
      // 移除列
      setVisibleColumns(visibleColumns.filter(c => c !== key));
    } else {
      // 添加列，并按照定义顺序排序
      const newColumns = [...visibleColumns, key];
      const sortedColumns = SEARCH_BI_METRICS.map(m => m.key).filter(key =>
        newColumns.includes(key)
      );
      setVisibleColumns(sortedColumns);
    }
  };

  // 按组分类指标
  const groupedMetrics = useMemo(() => {
    return SEARCH_BI_METRICS.reduce(
      (acc, metric) => {
        if (!acc[metric.group]) acc[metric.group] = [];
        acc[metric.group].push(metric);
        return acc;
      },
      {} as Record<string, typeof SEARCH_BI_METRICS>
    );
  }, []);

  // 计算日期间隔
  const dateRangeDays = useMemo(() => {
    if (!dateFrom || !dateTo) return 0;
    const from = dayjs(dateFrom);
    const to = dayjs(dateTo);
    if (!from.isValid() || !to.isValid()) return 0;
    return to.diff(from, 'day') + 1; // +1 因为包含结束日期
  }, [dateFrom, dateTo]);

  // 日期验证错误
  const dateError = useMemo(() => {
    if (!dateFrom || !dateTo) return null;
    if (dateRangeDays > 31) {
      return '日期范围不能超过31天';
    }
    if (dayjs(dateTo).isBefore(dayjs(dateFrom))) {
      return '结束日期不能早于开始日期';
    }
    return null;
  }, [dateFrom, dateTo, dateRangeDays]);

  // 快捷日期筛选处理函数
  const handleQuickDateSelect = (period: string) => {
    let from: string;
    let to: string;

    switch (period) {
      case 'today':
        from = dayjs().format('YYYY-MM-DD');
        to = dayjs().format('YYYY-MM-DD');
        break;
      case 'yesterday':
        from = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
        to = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
        break;
      case 'near7':
        from = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
        to = dayjs().format('YYYY-MM-DD');
        break;
      case 'near14':
        from = dayjs().subtract(14, 'day').format('YYYY-MM-DD');
        to = dayjs().format('YYYY-MM-DD');
        break;
      case 'near30':
        from = dayjs().subtract(30, 'day').format('YYYY-MM-DD');
        to = dayjs().format('YYYY-MM-DD');
        break;
      default:
        return;
    }

    setDateFrom(from);
    setDateTo(to);
    setSelectedPeriod(period);
  };

  // 查询搜索BI数据
  useEffect(() => {
    const fetchData = async () => {
      // 如果有日期验证错误，不执行查询
      if (dateError) {
        setIsLoadingData(false);
        setBiData([]);
        return;
      }

      try {
        setIsLoadingData(true);
        const data = await trpc.bi.getSearchTermBiDaily.query({
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          appid: appid || undefined,
          device: device || undefined,
        });
        setBiData(data || []);
      } catch (error: any) {
        console.error('获取搜索BI数据失败:', error);
        setBiData([]);
      } finally {
        setIsLoadingData(false);
      }
    };

    if (appid) {
      fetchData();
    } else {
      setIsLoadingData(false);
      setBiData([]);
    }
  }, [dateFrom, dateTo, appid, device, dateError]);

  // 获取device列表
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const data = await trpc.bi.getDevices.query();
        setDevices(data || []);
      } catch (error) {
        console.error('获取device列表失败:', error);
        setDevices([]);
      }
    };

    fetchDevices();
  }, []);

  // 按搜索词聚合数据（聚合所有端）
  const aggregatedData = biData.reduce(
    (
      acc: Record<
        string,
        {
          search_word: string;
          view_pv: number;
          view_uv: number;
          template_click_pv: number;
          template_click_uv: number;
          creation_pv: number;
          creation_uv: number;
          intercept_pv: number;
          intercept_uv: number;
          success_pv: number;
          success_uv: number;
          order_count: number;
          gmv: number;
          template_count: number;
          old_maka_template_count: number;
          old_maka_template_click_pv: number;
          old_maka_template_click_uv: number;
          old_maka_template_creation_pv: number;
          old_maka_template_creation_uv: number;
        }
      >,
      item
    ) => {
      const key = item.search_word;
      if (!acc[key]) {
        acc[key] = {
          search_word: item.search_word,
          view_pv: 0,
          view_uv: 0,
          template_click_pv: 0,
          template_click_uv: 0,
          creation_pv: 0,
          creation_uv: 0,
          intercept_pv: 0,
          intercept_uv: 0,
          success_pv: 0,
          success_uv: 0,
          order_count: 0,
          gmv: 0,
          template_count: 0,
          old_maka_template_count: 0,
          old_maka_template_click_pv: 0,
          old_maka_template_click_uv: 0,
          old_maka_template_creation_pv: 0,
          old_maka_template_creation_uv: 0,
        };
      }
      acc[key].view_pv += item.view_pv;
      acc[key].view_uv += item.view_uv;
      acc[key].template_click_pv += item.template_click_pv;
      acc[key].template_click_uv += item.template_click_uv;
      acc[key].creation_pv += item.creation_pv;
      acc[key].creation_uv += item.creation_uv;
      acc[key].intercept_pv += item.intercept_pv;
      acc[key].intercept_uv += item.intercept_uv;
      acc[key].success_pv += item.success_pv;
      acc[key].success_uv += item.success_uv;
      acc[key].order_count += item.order_count;
      acc[key].gmv += Number(item.gmv);
      // 模板数取最大值（因为可能有多次搜索，模板数可能不同）
      acc[key].template_count = Math.max(
        acc[key].template_count,
        item.template_count
      );
      acc[key].old_maka_template_count = Math.max(
        acc[key].old_maka_template_count,
        item.old_maka_template_count
      );
      acc[key].old_maka_template_click_pv += item.old_maka_template_click_pv;
      acc[key].old_maka_template_click_uv += item.old_maka_template_click_uv;
      acc[key].old_maka_template_creation_pv +=
        item.old_maka_template_creation_pv || 0;
      acc[key].old_maka_template_creation_uv +=
        item.old_maka_template_creation_uv || 0;
      return acc;
    },
    {}
  );

  // 计算价值指标和转化率指标
  const aggregatedDataArray = Object.values(aggregatedData)
    .map(item => ({
      ...item,
      view_value_uv: item.view_uv > 0 ? item.gmv / item.view_uv : 0,
      click_value_uv:
        item.template_click_uv > 0 ? item.gmv / item.template_click_uv : 0,
      creation_value_uv: item.creation_uv > 0 ? item.gmv / item.creation_uv : 0,
      creation_success_rate_uv:
        item.creation_uv > 0 ? (item.success_uv / item.creation_uv) * 100 : 0,
      creation_intercept_rate_uv:
        item.creation_uv > 0 ? (item.intercept_uv / item.creation_uv) * 100 : 0,
      template_click_rate_uv:
        item.view_uv > 0 ? (item.template_click_uv / item.view_uv) * 100 : 0,
      old_maka_template_click_rate_uv:
        item.view_uv > 0
          ? (item.old_maka_template_click_uv / item.view_uv) * 100
          : 0,
      view_value_uv_display: item.view_uv > 0 ? item.gmv / item.view_uv : 0,
    }))
    // 按曝光PV降序排序
    .sort((a, b) => b.view_pv - a.view_pv);

  // 分页计算
  const totalPages = Math.ceil(aggregatedDataArray.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = aggregatedDataArray.slice(startIndex, endIndex);

  // 当数据变化时，如果当前页超出范围，重置到第一页
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [aggregatedDataArray.length, currentPage, totalPages]);

  // 计算汇总数据
  const summary = aggregatedDataArray.length
    ? (() => {
        const baseSummary = aggregatedDataArray.reduce(
          (
            acc: {
              view_pv: number;
              view_uv: number;
              template_click_pv: number;
              template_click_uv: number;
              old_maka_template_click_pv: number;
              old_maka_template_click_uv: number;
              creation_pv: number;
              creation_uv: number;
              old_maka_template_creation_pv: number;
              old_maka_template_creation_uv: number;
              intercept_pv: number;
              intercept_uv: number;
              success_pv: number;
              success_uv: number;
              order_count: number;
              gmv: number;
              template_count: number;
              old_maka_template_count: number;
            },
            item
          ) => ({
            view_pv: acc.view_pv + item.view_pv,
            view_uv: acc.view_uv + item.view_uv,
            template_click_pv: acc.template_click_pv + item.template_click_pv,
            template_click_uv: acc.template_click_uv + item.template_click_uv,
            old_maka_template_click_pv:
              acc.old_maka_template_click_pv + item.old_maka_template_click_pv,
            old_maka_template_click_uv:
              acc.old_maka_template_click_uv + item.old_maka_template_click_uv,
            creation_pv: acc.creation_pv + item.creation_pv,
            creation_uv: acc.creation_uv + item.creation_uv,
            old_maka_template_creation_pv:
              acc.old_maka_template_creation_pv +
              item.old_maka_template_creation_pv,
            old_maka_template_creation_uv:
              acc.old_maka_template_creation_uv +
              item.old_maka_template_creation_uv,
            intercept_pv: acc.intercept_pv + item.intercept_pv,
            intercept_uv: acc.intercept_uv + item.intercept_uv,
            success_pv: acc.success_pv + item.success_pv,
            success_uv: acc.success_uv + item.success_uv,
            order_count: acc.order_count + item.order_count,
            gmv: acc.gmv + Number(item.gmv),
            template_count: Math.max(acc.template_count, item.template_count),
            old_maka_template_count: Math.max(
              acc.old_maka_template_count,
              item.old_maka_template_count
            ),
          }),
          {
            view_pv: 0,
            view_uv: 0,
            template_click_pv: 0,
            template_click_uv: 0,
            old_maka_template_click_pv: 0,
            old_maka_template_click_uv: 0,
            creation_pv: 0,
            creation_uv: 0,
            old_maka_template_creation_pv: 0,
            old_maka_template_creation_uv: 0,
            intercept_pv: 0,
            intercept_uv: 0,
            success_pv: 0,
            success_uv: 0,
            order_count: 0,
            gmv: 0,
            template_count: 0,
            old_maka_template_count: 0,
          }
        );

        // 计算汇总的价值指标和转化率指标
        return {
          ...baseSummary,
          view_value_uv:
            baseSummary.view_uv > 0 ? baseSummary.gmv / baseSummary.view_uv : 0,
          click_value_uv:
            baseSummary.template_click_uv > 0
              ? baseSummary.gmv / baseSummary.template_click_uv
              : 0,
          creation_value_uv:
            baseSummary.creation_uv > 0
              ? baseSummary.gmv / baseSummary.creation_uv
              : 0,
          creation_success_rate_uv:
            baseSummary.creation_uv > 0
              ? (baseSummary.success_uv / baseSummary.creation_uv) * 100
              : 0,
          creation_intercept_rate_uv:
            baseSummary.creation_uv > 0
              ? (baseSummary.intercept_uv / baseSummary.creation_uv) * 100
              : 0,
          template_click_rate_uv:
            baseSummary.view_uv > 0
              ? (baseSummary.template_click_uv / baseSummary.view_uv) * 100
              : 0,
          old_maka_template_click_rate_uv:
            baseSummary.view_uv > 0
              ? (baseSummary.old_maka_template_click_uv / baseSummary.view_uv) *
                100
              : 0,
          view_value_uv_display:
            baseSummary.view_uv > 0 ? baseSummary.gmv / baseSummary.view_uv : 0,
        };
      })()
    : null;

  // CSV 转义函数
  const escapeCSV = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // 格式化数值
  const formatValue = (value: number, metric: any): string => {
    if (metric?.format === 'currency') {
      return value.toFixed(2);
    } else if (metric?.format === 'percent') {
      return `${value.toFixed(2)}%`;
    } else {
      return String(value);
    }
  };

  // 导出 Excel
  const handleExportExcel = () => {
    try {
      if (!aggregatedDataArray || aggregatedDataArray.length === 0) {
        alert('暂无数据可导出');
        return;
      }

      // 构建表头
      const headers = [
        '搜索词',
        ...visibleColumns.map(colKey => {
          const metric = SEARCH_BI_METRICS.find(m => m.key === colKey);
          return metric?.label || colKey;
        }),
      ];

      // 构建数据行
      const rows: string[][] = [];

      // 遍历所有搜索词
      aggregatedDataArray.forEach(item => {
        const row: (string | number)[] = [
          item.search_word,
          ...visibleColumns.map(colKey => {
            const metric = SEARCH_BI_METRICS.find(m => m.key === colKey);
            const value = (item as any)[colKey] || 0;
            return formatValue(value, metric);
          }),
        ];
        rows.push(row.map(String));
      });

      // 汇总行
      if (summary) {
        const summaryRow: (string | number)[] = [
          '合计',
          ...visibleColumns.map(colKey => {
            const metric = SEARCH_BI_METRICS.find(m => m.key === colKey);
            const value = summary[colKey as keyof typeof summary] || 0;
            return formatValue(Number(value), metric);
          }),
        ];
        rows.push(summaryRow.map(String));
      }

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

      // 生成文件名（包含日期范围）
      const dateStr = `${dateFrom}_${dateTo}`;
      link.setAttribute('download', `搜索看板_${dateStr}.csv`);

      // 触发下载
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 释放 URL 对象
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出 Excel 失败:', error);
      alert('导出失败，请稍后重试');
    }
  };

  if (!appid) {
    return (
      <div className='min-h-screen bg-slate-50 p-6'>
        <div className='max-w-[1920px] mx-auto'>
          <div className='rounded-lg border border-dashed p-8 text-center bg-white'>
            <p className='text-slate-500'>
              请从 URL 参数中提供 appid（例如：?appid=jiantie）
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-slate-50 p-6'>
      <div className='max-w-[1920px] mx-auto'>
        {/* 标题 */}
        <div className='mb-6 flex items-start justify-between'>
          <div>
            <h1 className='text-2xl font-bold text-slate-900'>搜索看板</h1>
            <p className='text-slate-500 mt-1'>
              查看各个搜索词的汇总信息，包括曝光、点击、创作、拦截、成功和商业指标
            </p>
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={handleExportExcel}
            disabled={!aggregatedDataArray || aggregatedDataArray.length === 0}
          >
            <Download className='w-4 h-4' />
            导出 Excel
          </Button>
        </div>

        {/* 汇总数据卡片 */}
        {summary && !isLoadingData && (
          <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6'>
            {/* 曝光PV */}
            <div className='bg-white rounded-lg shadow-sm border border-slate-200 p-4'>
              <div className='text-xs text-slate-500 mb-1'>曝光PV</div>
              <div className='text-lg font-semibold text-slate-900'>
                {renderMetricCell(
                  summary.view_pv,
                  SEARCH_BI_METRICS.find(m => m.key === 'view_pv')!
                )}
              </div>
            </div>
            {/* 曝光UV */}
            <div className='bg-white rounded-lg shadow-sm border border-slate-200 p-4'>
              <div className='text-xs text-slate-500 mb-1'>曝光UV累加</div>
              <div className='text-lg font-semibold text-slate-900'>
                {renderMetricCell(
                  summary.view_uv,
                  SEARCH_BI_METRICS.find(m => m.key === 'view_uv')!
                )}
              </div>
            </div>
            {/* 模板点击PV */}
            <div className='bg-white rounded-lg shadow-sm border border-slate-200 p-4'>
              <div className='text-xs text-slate-500 mb-1'>模板点击PV</div>
              <div className='text-lg font-semibold text-slate-900'>
                {renderMetricCell(
                  summary.template_click_pv,
                  SEARCH_BI_METRICS.find(m => m.key === 'template_click_pv')!
                )}
              </div>
            </div>
            {/* 模板点击UV */}
            <div className='bg-white rounded-lg shadow-sm border border-slate-200 p-4'>
              <div className='text-xs text-slate-500 mb-1'>模板点击UV累加</div>
              <div className='text-lg font-semibold text-slate-900'>
                {renderMetricCell(
                  summary.template_click_uv,
                  SEARCH_BI_METRICS.find(m => m.key === 'template_click_uv')!
                )}
              </div>
            </div>
            {/* 创作PV */}
            <div className='bg-white rounded-lg shadow-sm border border-slate-200 p-4'>
              <div className='text-xs text-slate-500 mb-1'>创作PV</div>
              <div className='text-lg font-semibold text-slate-900'>
                {renderMetricCell(
                  summary.creation_pv,
                  SEARCH_BI_METRICS.find(m => m.key === 'creation_pv')!
                )}
              </div>
            </div>
            {/* 创作UV */}
            <div className='bg-white rounded-lg shadow-sm border border-slate-200 p-4'>
              <div className='text-xs text-slate-500 mb-1'>创作UV累加</div>
              <div className='text-lg font-semibold text-slate-900'>
                {renderMetricCell(
                  summary.creation_uv,
                  SEARCH_BI_METRICS.find(m => m.key === 'creation_uv')!
                )}
              </div>
            </div>
            {/* 成功PV */}
            <div className='bg-white rounded-lg shadow-sm border border-slate-200 p-4'>
              <div className='text-xs text-slate-500 mb-1'>成功PV</div>
              <div className='text-lg font-semibold text-slate-900'>
                {renderMetricCell(
                  summary.success_pv,
                  SEARCH_BI_METRICS.find(m => m.key === 'success_pv')!
                )}
              </div>
            </div>
            {/* 成功UV */}
            <div className='bg-white rounded-lg shadow-sm border border-slate-200 p-4'>
              <div className='text-xs text-slate-500 mb-1'>成功UV累加</div>
              <div className='text-lg font-semibold text-slate-900'>
                {renderMetricCell(
                  summary.success_uv,
                  SEARCH_BI_METRICS.find(m => m.key === 'success_uv')!
                )}
              </div>
            </div>
            {/* 订单数 */}
            <div className='bg-white rounded-lg shadow-sm border border-slate-200 p-4'>
              <div className='text-xs text-slate-500 mb-1'>订单数</div>
              <div className='text-lg font-semibold text-slate-900'>
                {renderMetricCell(
                  summary.order_count,
                  SEARCH_BI_METRICS.find(m => m.key === 'order_count')!
                )}
              </div>
            </div>
            {/* GMV */}
            <div className='bg-white rounded-lg shadow-sm border border-slate-200 p-4'>
              <div className='text-xs text-slate-500 mb-1'>成交金额 (GMV)</div>
              <div className='text-lg font-semibold text-slate-900'>
                {renderMetricCell(
                  summary.gmv,
                  SEARCH_BI_METRICS.find(m => m.key === 'gmv')!
                )}
              </div>
            </div>
          </div>
        )}

        {/* 筛选器 */}
        <div className='bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6'>
          <div className='flex flex-wrap gap-4 items-end'>
            {/* 快捷日期筛选 */}
            <div className='w-full'>
              <label className='text-sm font-medium text-slate-700 mb-2 block'>
                快捷日期
              </label>
              <div className='flex gap-1 border border-slate-200 rounded-lg p-1 bg-slate-50'>
                <button
                  onClick={() => handleQuickDateSelect('today')}
                  className={`px-3 py-1.5 text-sm rounded transition-colors ${
                    selectedPeriod === 'today'
                      ? 'bg-blue-600 text-white'
                      : 'bg-transparent text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  今天
                </button>
                <button
                  onClick={() => handleQuickDateSelect('yesterday')}
                  className={`px-3 py-1.5 text-sm rounded transition-colors ${
                    selectedPeriod === 'yesterday'
                      ? 'bg-blue-600 text-white'
                      : 'bg-transparent text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  昨天
                </button>
                <button
                  onClick={() => handleQuickDateSelect('near7')}
                  className={`px-3 py-1.5 text-sm rounded transition-colors ${
                    selectedPeriod === 'near7'
                      ? 'bg-blue-600 text-white'
                      : 'bg-transparent text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  近7天
                </button>
                <button
                  onClick={() => handleQuickDateSelect('near14')}
                  className={`px-3 py-1.5 text-sm rounded transition-colors ${
                    selectedPeriod === 'near14'
                      ? 'bg-blue-600 text-white'
                      : 'bg-transparent text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  近14天
                </button>
                <button
                  onClick={() => handleQuickDateSelect('near30')}
                  className={`px-3 py-1.5 text-sm rounded transition-colors ${
                    selectedPeriod === 'near30'
                      ? 'bg-blue-600 text-white'
                      : 'bg-transparent text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  近30天
                </button>
              </div>
            </div>
            <div className='flex-1 min-w-[200px]'>
              <label className='text-sm font-medium text-slate-700 mb-1 block'>
                开始日期
              </label>
              <Input
                type='date'
                value={dateFrom}
                onChange={e => {
                  setDateFrom(e.target.value);
                  setSelectedPeriod('');
                }}
                className={dateError ? 'border-red-500' : ''}
              />
              {dateError && (
                <p className='text-xs text-red-500 mt-1'>{dateError}</p>
              )}
            </div>
            <div className='flex-1 min-w-[200px]'>
              <label className='text-sm font-medium text-slate-700 mb-1 block'>
                结束日期
              </label>
              <Input
                type='date'
                value={dateTo}
                onChange={e => {
                  setDateTo(e.target.value);
                  setSelectedPeriod('');
                }}
                className={dateError ? 'border-red-500' : ''}
              />
              {dateError && (
                <p className='text-xs text-red-500 mt-1'>{dateError}</p>
              )}
            </div>
            <div className='flex-1 min-w-[150px]'>
              <label className='text-sm font-medium text-slate-700 mb-1 block'>
                端类型
              </label>
              <Select
                value={device || 'all'}
                onValueChange={value => setDevice(value === 'all' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder='全部' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>全部</SelectItem>
                  {devices.map((d: string) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='flex items-end'>
              <div className='relative' ref={columnSelectorRef}>
                <button
                  type='button'
                  onClick={() => setIsColumnSelectorOpen(!isColumnSelectorOpen)}
                  className='text-xs flex items-center gap-1.5 text-slate-600 hover:text-blue-600 bg-white border border-slate-200 px-3 py-2 rounded shadow-sm transition-colors'
                >
                  <Settings size={14} /> 指标配置
                </button>

                {isColumnSelectorOpen && (
                  <div className='absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-100 z-50'>
                    <div className='p-3 border-b border-slate-100 bg-slate-50 rounded-t-lg'>
                      <h4 className='font-bold text-xs text-slate-700'>
                        指标配置
                      </h4>
                    </div>
                    <div className='p-3 max-h-80 overflow-y-auto'>
                      {Object.entries(groupedMetrics).map(
                        ([group, metrics]) => (
                          <div key={group} className='mb-4 last:mb-0'>
                            <h5 className='text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2'>
                              {group}
                            </h5>
                            <div className='space-y-2'>
                              {metrics.map(metric => (
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
                                      <CheckSquare
                                        size={12}
                                        className='text-white'
                                      />
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
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 数据表格 */}
        <div className='bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden'>
          {isLoadingData ? (
            <div className='flex items-center justify-center py-12'>
              <Loader2 className='h-6 w-6 animate-spin text-slate-400' />
              <span className='ml-2 text-slate-500'>加载中...</span>
            </div>
          ) : !aggregatedDataArray || aggregatedDataArray.length === 0 ? (
            <div className='flex items-center justify-center py-12'>
              <span className='text-slate-500'>暂无数据</span>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-[200px]'>搜索词</TableHead>
                    {visibleColumns.map(colKey => {
                      const metric = SEARCH_BI_METRICS.find(
                        m => m.key === colKey
                      );
                      return (
                        <TableHead key={colKey} className='text-right'>
                          {metric?.label || colKey}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* 汇总行 - 在数据行之前 */}
                  {summary && (
                    <TableRow className='bg-slate-50 font-semibold'>
                      <TableCell>合计</TableCell>
                      {visibleColumns.map(colKey => {
                        const metric = SEARCH_BI_METRICS.find(
                          m => m.key === colKey
                        );
                        const value = summary[
                          colKey as keyof typeof summary
                        ] as number;
                        return (
                          <TableCell key={colKey} className='text-right'>
                            {metric
                              ? renderMetricCell(
                                  Number(value || 0),
                                  metric as any
                                )
                              : String(value || '-')}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  )}
                  {paginatedData.map((item, index) => (
                    <TableRow key={`${item.search_word}-${index}`}>
                      <TableCell className='font-medium'>
                        {item.search_word}
                      </TableCell>
                      {visibleColumns.map(colKey => {
                        const metric = SEARCH_BI_METRICS.find(
                          m => m.key === colKey
                        );
                        const value = (item as any)[colKey] as number;
                        return (
                          <TableCell key={colKey} className='text-right'>
                            {metric
                              ? renderMetricCell(
                                  Number(value || 0),
                                  metric as any
                                )
                              : String(value || '-')}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* 分页控件 */}
          {!isLoadingData &&
            aggregatedDataArray.length > 0 &&
            totalPages > 1 && (
              <div className='border-t border-slate-200 p-4'>
                <div className='flex items-center justify-between'>
                  <div className='text-sm text-slate-600'>
                    共 {aggregatedDataArray.length} 条记录，第 {currentPage} /{' '}
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
                            currentPage <= 1
                              ? 'pointer-events-none opacity-50'
                              : 'cursor-pointer'
                          }
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(
                          p =>
                            p === 1 ||
                            p === totalPages ||
                            (p >= currentPage - 2 && p <= currentPage + 2)
                        )
                        .map((p, idx, arr) => (
                          <div key={p} className='flex items-center'>
                            {idx > 0 && arr[idx - 1] < p - 1 && (
                              <PaginationItem>
                                <PaginationEllipsis />
                              </PaginationItem>
                            )}
                            <PaginationItem>
                              <PaginationLink
                                onClick={() => {
                                  setCurrentPage(p);
                                }}
                                isActive={p === currentPage}
                                className='cursor-pointer'
                              >
                                {p}
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
    </div>
  );
}

'use client';

import { trpc } from '@/utils/trpc';
import { Input } from '@workspace/ui/components/input';
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
import { useEffect, useRef, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { renderMetricCell } from '../../../channel/shared/components';
import { formatMoney, formatNumber } from '../../../channel/shared/constants';

// 综合面板指标定义
const UNI_BI_METRICS = [
  { key: 'register_uv', label: '注册UV', group: '用户', format: 'number' },
  { key: 'active_uv', label: '活跃UV', group: '用户', format: 'number' },
  { key: 'click_pv', label: '点击PV', group: '点击', format: 'number' },
  { key: 'click_uv', label: '点击UV', group: '点击', format: 'number' },
  { key: 'creation_pv', label: '创作PV', group: '创作', format: 'number' },
  { key: 'creation_uv', label: '创作UV', group: '创作', format: 'number' },
  { key: 'success_pv', label: '成功PV', group: '成功', format: 'number' },
  { key: 'success_uv', label: '成功UV', group: '成功', format: 'number' },
  { key: 'intercept_pv', label: '拦截PV', group: '拦截', format: 'number' },
  { key: 'intercept_uv', label: '拦截UV', group: '拦截', format: 'number' },
  {
    key: 'intercept_uvpv',
    label: '拦截UVPV',
    group: '拦截',
    format: 'number',
  },
  {
    key: 'creation_success_rate_uv',
    label: '创作成功率UV',
    group: '转化率',
    format: 'percent',
  },
  {
    key: 'register_intercept_rate_uv',
    label: '注册拦截率UV',
    group: '转化率',
    format: 'percent',
  },
  {
    key: 'register_order_rate_uv',
    label: '注册订单转化率UV',
    group: '转化率',
    format: 'percent',
  },
  { key: 'order_count', label: '订单数', group: '商业', format: 'number' },
  { key: 'gmv', label: '成交金额 (GMV)', group: '商业', format: 'currency' },
];

const STORAGE_KEY = 'product-bi-visible-columns';
const DEFAULT_VISIBLE_COLUMNS = [
  'register_uv',
  'active_uv',
  'click_pv',
  'click_uv',
  'creation_pv',
  'creation_uv',
  'success_pv',
  'success_uv',
  'order_count',
  'gmv',
];

export default function UniBiPage() {
  const searchParams = useSearchParams();
  const appid = searchParams.get('appid') || '';

  // 初始化日期
  const [dateFrom, setDateFrom] = useState(
    dayjs().subtract(7, 'day').format('YYYY-MM-DD')
  );
  const [dateTo, setDateTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [device, setDevice] = useState<string>('');
  const [userType, setUserType] = useState<string>('');
  // 从 localStorage 读取保存的列配置
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_VISIBLE_COLUMNS;
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // 验证是否为有效数组
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('读取列配置失败:', error);
    }
    return DEFAULT_VISIBLE_COLUMNS;
  });

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

  // 综合面板BI数据
  const [biData, setBiData] = useState<
    Array<{
      id: string;
      appid: string;
      date: string;
      device: string;
      user_type: string;
      register_uv: number;
      active_uv: number;
      click_pv: number;
      click_uv: number;
      creation_pv: number;
      creation_uv: number;
      success_pv: number;
      success_uv: number;
      intercept_pv: number;
      intercept_uv: number;
      order_count: number;
      gmv: number;
      create_time: string;
      update_time: string;
    }>
  >([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // 获取可用的device列表
  const [devices, setDevices] = useState<string[]>([]);

  // 查询综合面板BI数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingData(true);
        const data = await trpc.bi.getProductUserTypeBiDaily.query({
          dateFrom:
            dayjs(dateFrom).subtract(1, 'day').format('YYYY-MM-DD') ||
            undefined,
          dateTo:
            dayjs(dateTo).subtract(1, 'day').format('YYYY-MM-DD') || undefined,
          appid: appid || undefined,
          device: device || undefined,
          user_type: userType || undefined,
        });
        setBiData(data || []);
      } catch (error: any) {
        console.error('获取综合面板BI数据失败:', error);
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
  }, [dateFrom, dateTo, appid, device, userType]);

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

  // 计算汇总数据
  const summaryRaw = biData.length
    ? biData.reduce(
      (
        acc: {
          register_uv: number;
          active_uv: number;
          click_pv: number;
          click_uv: number;
          creation_pv: number;
          creation_uv: number;
          success_pv: number;
          success_uv: number;
          intercept_pv: number;
          intercept_uv: number;
          order_count: number;
          gmv: number;
        },
        item
      ) => ({
        register_uv: acc.register_uv + item.register_uv,
        active_uv: acc.active_uv + item.active_uv,
        click_pv: acc.click_pv + item.click_pv,
        click_uv: acc.click_uv + item.click_uv,
        creation_pv: acc.creation_pv + item.creation_pv,
        creation_uv: acc.creation_uv + item.creation_uv,
        success_pv: acc.success_pv + item.success_pv,
        success_uv: acc.success_uv + item.success_uv,
        intercept_pv: acc.intercept_pv + item.intercept_pv,
        intercept_uv: acc.intercept_uv + item.intercept_uv,
        order_count: acc.order_count + item.order_count,
        gmv: acc.gmv + Number(item.gmv),
      }),
      {
        register_uv: 0,
        active_uv: 0,
        click_pv: 0,
        click_uv: 0,
        creation_pv: 0,
        creation_uv: 0,
        success_pv: 0,
        success_uv: 0,
        intercept_pv: 0,
        intercept_uv: 0,
        order_count: 0,
        gmv: 0,
      }
    )
    : null;

  // 计算汇总数据的派生指标
  const summary = summaryRaw
    ? {
      ...summaryRaw,
      intercept_uvpv: summaryRaw.intercept_uv + summaryRaw.intercept_pv,
      creation_success_rate_uv:
        summaryRaw.creation_uv > 0
          ? (summaryRaw.success_uv / summaryRaw.creation_uv) * 100
          : 0,
      register_intercept_rate_uv:
        summaryRaw.register_uv > 0
          ? (summaryRaw.intercept_uv / summaryRaw.register_uv) * 100
          : 0,
      register_order_rate_uv:
        summaryRaw.register_uv > 0
          ? (summaryRaw.order_count / summaryRaw.register_uv) * 100
          : 0,
    }
    : null;

  // 按 user_type 聚合数据（不再区分端类型）
  const aggregatedData = biData.reduce(
    (
      acc: Record<
        string,
        {
          user_type: string;
          register_uv: number;
          active_uv: number;
          click_pv: number;
          click_uv: number;
          creation_pv: number;
          creation_uv: number;
          success_pv: number;
          success_uv: number;
          intercept_pv: number;
          intercept_uv: number;
          order_count: number;
          gmv: number;
          // 计算得出的指标
          intercept_uvpv: number;
          creation_success_rate_uv: number;
          register_intercept_rate_uv: number;
          register_order_rate_uv: number;
        }
      >,
      item
    ) => {
      const key = item.user_type;
      if (!acc[key]) {
        acc[key] = {
          user_type: item.user_type,
          register_uv: 0,
          active_uv: 0,
          click_pv: 0,
          click_uv: 0,
          creation_pv: 0,
          creation_uv: 0,
          success_pv: 0,
          success_uv: 0,
          intercept_pv: 0,
          intercept_uv: 0,
          order_count: 0,
          gmv: 0,
          intercept_uvpv: 0,
          creation_success_rate_uv: 0,
          register_intercept_rate_uv: 0,
          register_order_rate_uv: 0,
        };
      }
      acc[key].register_uv += item.register_uv;
      acc[key].active_uv += item.active_uv;
      acc[key].click_pv += item.click_pv;
      acc[key].click_uv += item.click_uv;
      acc[key].creation_pv += item.creation_pv;
      acc[key].creation_uv += item.creation_uv;
      acc[key].success_pv += item.success_pv;
      acc[key].success_uv += item.success_uv;
      acc[key].intercept_pv += item.intercept_pv;
      acc[key].intercept_uv += item.intercept_uv;
      acc[key].order_count += item.order_count;
      acc[key].gmv += Number(item.gmv);
      return acc;
    },
    {}
  );

  // 计算派生指标
  const aggregatedDataWithMetrics = Object.values(aggregatedData).map(item => {
    // 拦截UVPV：拦截UV + 拦截PV
    const intercept_uvpv = item.intercept_uv + item.intercept_pv;
    // 创作成功率UV：成功UV / 创作UV * 100
    const creation_success_rate_uv =
      item.creation_uv > 0 ? (item.success_uv / item.creation_uv) * 100 : 0;
    // 注册拦截率UV：拦截UV / 注册UV * 100
    const register_intercept_rate_uv =
      item.register_uv > 0 ? (item.intercept_uv / item.register_uv) * 100 : 0;
    // 注册订单转化率UV：订单数 / 注册UV * 100（表示平均每个注册用户产生的订单数百分比）
    const register_order_rate_uv =
      item.register_uv > 0 ? (item.order_count / item.register_uv) * 100 : 0;

    return {
      ...item,
      intercept_uvpv,
      creation_success_rate_uv,
      register_intercept_rate_uv,
      register_order_rate_uv,
    };
  });

  const aggregatedDataArray = aggregatedDataWithMetrics;

  // 处理图表数据：按日期和 user_type 分组（不再区分端类型）
  const chartData = biData.reduce(
    (
      acc: Record<
        string,
        {
          date: string;
          [key: string]: string | number;
        }
      >,
      item
    ) => {
      const dateKey = item.date;
      if (!acc[dateKey]) {
        acc[dateKey] = { date: dateKey };
      }
      const key = item.user_type;
      if (!acc[dateKey][`${key}_active_uv`]) {
        acc[dateKey][`${key}_active_uv`] = 0;
        acc[dateKey][`${key}_gmv`] = 0;
        acc[dateKey][`${key}_order_count`] = 0;
      }
      acc[dateKey][`${key}_active_uv`] =
        (acc[dateKey][`${key}_active_uv`] as number) + item.active_uv;
      acc[dateKey][`${key}_gmv`] =
        (acc[dateKey][`${key}_gmv`] as number) + Number(item.gmv);
      acc[dateKey][`${key}_order_count`] =
        (acc[dateKey][`${key}_order_count`] as number) + item.order_count;
      return acc;
    },
    {}
  );

  // 转换为数组并按日期排序
  const chartDataArray = Object.values(chartData).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  // 获取所有唯一的 user_type
  const chartKeys = Array.from(new Set(biData.map(item => item.user_type)));

  // 图表颜色配置
  const chartColors = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#84cc16',
  ];

  const getUserTypeLabel = (type: string) => {
    return type === 'new_today'
      ? '当天新用户'
      : type === 'new_month'
        ? '30天内新用户'
        : type === 'old'
          ? '30天外老用户'
          : type;
  };

  // 列配置选择器状态
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
  const columnSelectorRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭列配置选择器
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        columnSelectorRef.current &&
        !columnSelectorRef.current.contains(event.target as Node)
      ) {
        setIsColumnSelectorOpen(false);
      }
    };
    if (isColumnSelectorOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isColumnSelectorOpen]);

  // 按组分类指标
  const groupedMetrics = UNI_BI_METRICS.reduce(
    (acc, metric) => {
      if (!acc[metric.group]) acc[metric.group] = [];
      acc[metric.group].push(metric);
      return acc;
    },
    {} as Record<string, typeof UNI_BI_METRICS>
  );

  // 切换列显示
  const toggleColumn = (key: string) => {
    if (visibleColumns.includes(key)) {
      // 移除列
      setVisibleColumns(visibleColumns.filter(c => c !== key));
    } else {
      // 添加列，并按照定义顺序排序
      const newColumns = [...visibleColumns, key];
      // 按照 UNI_BI_METRICS 中的顺序排序
      const sortedColumns = UNI_BI_METRICS.map(def => def.key).filter(key =>
        newColumns.includes(key)
      );
      setVisibleColumns(sortedColumns);
    }
  };

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
      if (biData.length === 0) {
        alert('暂无数据可导出');
        return;
      }

      setIsExporting(true);

      // 构建表头（包含所有指标）
      const headers = [
        '日期',
        'AppID',
        '端类型',
        '用户类型',
        ...UNI_BI_METRICS.map(m => m.label),
      ];

      // 构建数据行（包含所有天的原始数据）
      const rows = biData.map(item => {
        // 计算派生指标
        const intercept_uvpv = item.intercept_uv + item.intercept_pv;
        const creation_success_rate_uv =
          item.creation_uv > 0
            ? ((item.success_uv / item.creation_uv) * 100).toFixed(2)
            : '0.00';
        const register_intercept_rate_uv =
          item.register_uv > 0
            ? ((item.intercept_uv / item.register_uv) * 100).toFixed(2)
            : '0.00';
        const register_order_rate_uv =
          item.register_uv > 0
            ? ((item.order_count / item.register_uv) * 100).toFixed(2)
            : '0.00';

        // 格式化用户类型
        const userTypeLabel = getUserTypeLabel(item.user_type);

        // 按照 UNI_BI_METRICS 的顺序构建数据行
        const row: (string | number)[] = [
          item.date,
          item.appid,
          item.device || '',
          userTypeLabel,
        ];

        UNI_BI_METRICS.forEach(metric => {
          let value: string | number;
          switch (metric.key) {
            case 'intercept_uvpv':
              value = intercept_uvpv;
              break;
            case 'creation_success_rate_uv':
              value = creation_success_rate_uv;
              break;
            case 'register_intercept_rate_uv':
              value = register_intercept_rate_uv;
              break;
            case 'register_order_rate_uv':
              value = register_order_rate_uv;
              break;
            case 'gmv':
              value = Number(item.gmv).toFixed(2);
              break;
            default:
              value = item[metric.key as keyof typeof item] as number;
          }
          row.push(value);
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
      link.setAttribute('download', `综合面板BI数据_${dateFrom}_${dateTo}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setIsExporting(false);
    } catch (error) {
      console.error('导出 CSV 失败:', error);
      alert('导出失败，请稍后重试');
      setIsExporting(false);
    }
  };

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
        <div className='mb-6'>
          <h1 className='text-2xl font-bold text-slate-900'>综合面板</h1>
          <p className='text-slate-500 mt-1'>
            查看按用户类型（当天新用户/老用户）和端类型统计的日数据，包括用户指标和商业指标
          </p>
        </div>

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
                  className={`px-3 py-1.5 text-sm rounded transition-colors ${selectedPeriod === 'today'
                    ? 'bg-blue-600 text-white'
                    : 'bg-transparent text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  今天
                </button>
                <button
                  onClick={() => handleQuickDateSelect('yesterday')}
                  className={`px-3 py-1.5 text-sm rounded transition-colors ${selectedPeriod === 'yesterday'
                    ? 'bg-blue-600 text-white'
                    : 'bg-transparent text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  昨天
                </button>
                <button
                  onClick={() => handleQuickDateSelect('near7')}
                  className={`px-3 py-1.5 text-sm rounded transition-colors ${selectedPeriod === 'near7'
                    ? 'bg-blue-600 text-white'
                    : 'bg-transparent text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  近7天
                </button>
                <button
                  onClick={() => handleQuickDateSelect('near14')}
                  className={`px-3 py-1.5 text-sm rounded transition-colors ${selectedPeriod === 'near14'
                    ? 'bg-blue-600 text-white'
                    : 'bg-transparent text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  近14天
                </button>
                <button
                  onClick={() => handleQuickDateSelect('near30')}
                  className={`px-3 py-1.5 text-sm rounded transition-colors ${selectedPeriod === 'near30'
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
              />
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
              />
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
            <div className='flex-1 min-w-[150px]'>
              <label className='text-sm font-medium text-slate-700 mb-1 block'>
                用户类型
              </label>
              <Select
                value={userType || 'all'}
                onValueChange={value =>
                  setUserType(value === 'all' ? '' : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='全部' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>全部</SelectItem>
                  <SelectItem value='new_today'>当天新用户</SelectItem>
                  <SelectItem value='new_month'>30天内新用户</SelectItem>
                  <SelectItem value='old'>30天外老用户</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* 走势图 */}
        {!isLoadingData && chartDataArray.length > 0 && (
          <div className='grid grid-cols-3 gap-4 mb-6'>
            {/* 活跃UV走势图 */}
            <div className='bg-white rounded-lg shadow-sm border border-slate-200 p-4'>
              <h3 className='text-sm font-semibold text-slate-900 mb-3'>
                活跃UV走势
              </h3>
              <ResponsiveContainer width='100%' height={200}>
                <LineChart data={chartDataArray}>
                  <CartesianGrid strokeDasharray='3 3' stroke='#e2e8f0' />
                  <XAxis
                    dataKey='date'
                    tickFormatter={date => dayjs(date).format('MM-DD')}
                    stroke='#64748b'
                    style={{ fontSize: '10px' }}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis
                    stroke='#64748b'
                    style={{ fontSize: '10px' }}
                    tick={{ fontSize: 10 }}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                    labelFormatter={label =>
                      `日期: ${dayjs(label).format('YYYY-MM-DD')}`
                    }
                    formatter={(value: number | undefined) => formatNumber(value || 0)}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                    iconSize={10}
                  />
                  {chartKeys.map((key, index) => {
                    return (
                      <Line
                        key={key}
                        type='monotone'
                        dataKey={`${key}_active_uv`}
                        stroke={chartColors[index % chartColors.length]}
                        strokeWidth={2}
                        name={getUserTypeLabel(key)}
                        dot={{
                          fill: chartColors[index % chartColors.length],
                          r: 3,
                        }}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* GMV走势图 */}
            <div className='bg-white rounded-lg shadow-sm border border-slate-200 p-4'>
              <h3 className='text-sm font-semibold text-slate-900 mb-3'>
                GMV走势
              </h3>
              <ResponsiveContainer width='100%' height={200}>
                <LineChart data={chartDataArray}>
                  <CartesianGrid strokeDasharray='3 3' stroke='#e2e8f0' />
                  <XAxis
                    dataKey='date'
                    tickFormatter={date => dayjs(date).format('MM-DD')}
                    stroke='#64748b'
                    style={{ fontSize: '10px' }}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis
                    stroke='#64748b'
                    style={{ fontSize: '10px' }}
                    tick={{ fontSize: 10 }}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                    labelFormatter={label =>
                      `日期: ${dayjs(label).format('YYYY-MM-DD')}`
                    }
                    formatter={(value: number | undefined) => formatMoney(value || 0)}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                    iconSize={10}
                  />
                  {chartKeys.map((key, index) => {
                    return (
                      <Line
                        key={key}
                        type='monotone'
                        dataKey={`${key}_gmv`}
                        stroke={chartColors[index % chartColors.length]}
                        strokeWidth={2}
                        name={getUserTypeLabel(key)}
                        dot={{
                          fill: chartColors[index % chartColors.length],
                          r: 3,
                        }}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* 订单数走势图 */}
            <div className='bg-white rounded-lg shadow-sm border border-slate-200 p-4'>
              <h3 className='text-sm font-semibold text-slate-900 mb-3'>
                订单数走势
              </h3>
              <ResponsiveContainer width='100%' height={200}>
                <LineChart data={chartDataArray}>
                  <CartesianGrid strokeDasharray='3 3' stroke='#e2e8f0' />
                  <XAxis
                    dataKey='date'
                    tickFormatter={date => dayjs(date).format('MM-DD')}
                    stroke='#64748b'
                    style={{ fontSize: '10px' }}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis
                    stroke='#64748b'
                    style={{ fontSize: '10px' }}
                    tick={{ fontSize: 10 }}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                    labelFormatter={label =>
                      `日期: ${dayjs(label).format('YYYY-MM-DD')}`
                    }
                    formatter={(value: number | undefined) => formatNumber(value || 0)}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                    iconSize={10}
                  />
                  {chartKeys.map((key, index) => {
                    return (
                      <Line
                        key={key}
                        type='monotone'
                        dataKey={`${key}_order_count`}
                        stroke={chartColors[index % chartColors.length]}
                        strokeWidth={2}
                        name={getUserTypeLabel(key)}
                        dot={{
                          fill: chartColors[index % chartColors.length],
                          r: 3,
                        }}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 数据表格 */}
        <div className='bg-white rounded-lg shadow-sm border border-slate-200 '>
          {/* 表格头部工具栏 */}
          <div className='p-4 border-b border-slate-200 flex items-center justify-between'>
            <h3 className='text-sm font-semibold text-slate-900'>数据表格</h3>
            <div className='flex items-center gap-2'>
              <button
                onClick={handleExportCSV}
                disabled={isExporting || biData.length === 0}
                className='text-xs flex items-center gap-1.5 text-slate-600 hover:text-blue-600 bg-white border border-slate-200 px-3 py-1.5 rounded shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {isExporting ? (
                  <>
                    <Loader2 size={14} className='animate-spin' /> 导出中...
                  </>
                ) : (
                  <>
                    <Download size={14} /> 导出数据
                  </>
                )}
              </button>
              <div className='relative' ref={columnSelectorRef}>
                <button
                  onClick={() => setIsColumnSelectorOpen(!isColumnSelectorOpen)}
                  className='text-xs flex items-center gap-1.5 text-slate-600 hover:text-blue-600 bg-white border border-slate-200 px-3 py-1.5 rounded shadow-sm transition-colors'
                >
                  <Settings size={14} /> 列配置
                </button>

                {isColumnSelectorOpen && (
                  <div className='absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-100 z-50 animate-in fade-in zoom-in-95 duration-200'>
                    <div className='p-3 border-b border-slate-100 bg-slate-50 rounded-t-lg'>
                      <h4 className='font-bold text-xs text-slate-700'>
                        列配置
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
                                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${visibleColumns.includes(metric.key)
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
                                    className={`text-sm ${visibleColumns.includes(metric.key)
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
                    <TableHead className='w-[120px]'>用户类型</TableHead>
                    {visibleColumns.map(colKey => {
                      const metric = UNI_BI_METRICS.find(m => m.key === colKey);
                      return (
                        <TableHead key={colKey} className='text-right'>
                          {metric?.label || colKey}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aggregatedDataArray.map((item, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{getUserTypeLabel(item.user_type)}</TableCell>
                      {visibleColumns.map(colKey => {
                        const metric = UNI_BI_METRICS.find(
                          m => m.key === colKey
                        );
                        const value = item[
                          colKey as keyof typeof item
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
                  ))}
                  {/* 汇总行 */}
                  {summary && (
                    <TableRow className='bg-slate-50 font-semibold'>
                      <TableCell>合计</TableCell>
                      {visibleColumns.map(colKey => {
                        const metric = UNI_BI_METRICS.find(
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
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

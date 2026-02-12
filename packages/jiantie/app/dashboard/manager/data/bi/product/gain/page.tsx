'use client';

import { trpc } from '@/utils/trpc';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
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
import { CheckSquare, Loader2, Settings } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
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
import {
  convertToUtcDate,
  utcToLocalDateString,
} from '../../../../../../../utils/date';
import { renderMetricCell } from '../../../channel/shared/components';
import { formatMoney, formatNumber } from '../../../channel/shared/constants';

// 渠道获客BI指标定义
const CHANNEL_GAIN_METRICS = [
  { key: 'register_uv', label: '新增', group: '用户', format: 'number' },
  {
    key: 'click_pv_today',
    label: '当日点击PV',
    group: '点击',
    format: 'number',
  },
  {
    key: 'click_uv_today',
    label: '当日点击UV',
    group: '点击',
    format: 'number',
  },
  {
    key: 'create_pv_1d',
    label: '当日创作PV',
    group: '创作',
    format: 'number',
  },
  {
    key: 'create_uv_1d',
    label: '当日创作UV',
    group: '创作',
    format: 'number',
  },
  {
    key: 'success_pv_today',
    label: '当日成功PV',
    group: '成功',
    format: 'number',
  },
  {
    key: 'success_uv_today',
    label: '当日成功UV',
    group: '成功',
    format: 'number',
  },
  {
    key: 'order_count_today',
    label: '当日订单',
    group: '商业',
    format: 'number',
  },
  { key: 'gmv_today', label: '当日GMV', group: '商业', format: 'currency' },
  { key: 'arup', label: '当日ARPU', group: '商业', format: 'currency' },
  {
    key: 'click_rate_uv',
    label: '点击转化率UV',
    group: '转化率',
    format: 'percent',
  },
  {
    key: 'creation_rate_uv',
    label: '创作转化率UV',
    group: '转化率',
    format: 'percent',
  },
  {
    key: 'creation_success_rate_uv',
    label: '创作成功率UV',
    group: '转化率',
    format: 'percent',
  },
  {
    key: 'register_order_rate_uv',
    label: '注册订单转化率UV',
    group: '转化率',
    format: 'percent',
  },
  {
    key: 'click_to_creation_rate_uv',
    label: '点击到创作转化率UV',
    group: '转化率',
    format: 'percent',
  },
];

const STORAGE_KEY = 'channel-gain-bi-visible-columns';
const DEFAULT_VISIBLE_COLUMNS = [
  'register_uv',
  'click_pv_today',
  'click_uv_today',
  'create_pv_1d',
  'create_uv_1d',
  'success_pv_today',
  'success_uv_today',
  'order_count_today',
  'gmv_today',
  'arup',
];

export default function ChannelGainPage() {
  const searchParams = useSearchParams();
  const appid = searchParams.get('appid') || '';

  // 初始化日期
  const [dateFrom, setDateFrom] = useState(
    dayjs().subtract(0, 'day').format('YYYY-MM-DD')
  );
  const [dateTo, setDateTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [device, setDevice] = useState<string>('');
  const [source, setSource] = useState<string>('');
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_VISIBLE_COLUMNS;
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('读取指标配置失败:', e);
    }
    return DEFAULT_VISIBLE_COLUMNS;
  });
  const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false);

  // 渠道获客BI数据
  const [biData, setBiData] = useState<
    Array<{
      id: string;
      appid: string;
      source: string;
      device: string;
      date: string;
      register_uv: number;
      click_uv_7d: number;
      intercept_uv_7d: number;
      success_uv_7d: number;
      order_count_7d: number;
      gmv_7d: number;
      click_pv_today: number;
      click_uv_today: number;
      today_intercept_uv: number;
      success_pv_today: number;
      success_uv_today: number;
      order_count_today: number;
      gmv_today: number;
      create_pv_1d: number;
      create_uv_1d: number;
      create_time: string;
      update_time: string;
    }>
  >([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // 获取可用的device列表
  const [devices, setDevices] = useState<string[]>([]);

  // 获取可用的source列表
  const [sources, setSources] = useState<string[]>([]);

  // 查询渠道获客BI数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingData(true);
        const data = await trpc.bi.getChannelBiDaily.query({
          dateFrom: convertToUtcDate(dateFrom) || undefined,
          dateTo: convertToUtcDate(dateTo) || undefined,
          appid: appid || undefined,
          device: device || undefined,
          source: source || undefined,
        });
        setBiData(data || []);
      } catch (error: any) {
        console.error('获取渠道获客BI数据失败:', error);
        setBiData([]);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [dateFrom, dateTo, appid, device, source]);

  // 获取device列表（从产品BI数据获取）
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

  // 获取source列表
  useEffect(() => {
    const fetchSources = async () => {
      try {
        const data = await trpc.bi.getChannelBiSources.query({
          appid: appid || undefined,
        });
        setSources(data || []);
      } catch (error) {
        console.error('获取source列表失败:', error);
        setSources([]);
      }
    };

    fetchSources();
  }, [appid]);

  // 保存列配置
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleColumns));
    }
  }, [visibleColumns]);

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

  // 计算汇总数据
  const summary = biData.length
    ? (() => {
      const total = biData.reduce(
        (
          acc: {
            register_uv: number;
            click_pv_today: number;
            click_uv_today: number;
            create_pv_1d: number;
            create_uv_1d: number;
            success_pv_today: number;
            success_uv_today: number;
            order_count_today: number;
            gmv_today: number;
          },
          item
        ) => ({
          register_uv: acc.register_uv + item.register_uv,
          click_pv_today: acc.click_pv_today + (item.click_pv_today || 0),
          click_uv_today: acc.click_uv_today + item.click_uv_today,
          create_pv_1d: acc.create_pv_1d + (item.create_pv_1d || 0),
          create_uv_1d: acc.create_uv_1d + (item.create_uv_1d || 0),
          success_pv_today:
            acc.success_pv_today + (item.success_pv_today || 0),
          success_uv_today: acc.success_uv_today + item.success_uv_today,
          order_count_today: acc.order_count_today + item.order_count_today,
          gmv_today: acc.gmv_today + Number(item.gmv_today),
        }),
        {
          register_uv: 0,
          click_pv_today: 0,
          click_uv_today: 0,
          create_pv_1d: 0,
          create_uv_1d: 0,
          success_pv_today: 0,
          success_uv_today: 0,
          order_count_today: 0,
          gmv_today: 0,
        }
      );
      // 计算汇总ARUP: 当日GMV / 新增
      // 计算汇总率指标
      return {
        ...total,
        arup: total.register_uv > 0 ? total.gmv_today / total.register_uv : 0,
        click_rate_uv:
          total.register_uv > 0
            ? (total.click_uv_today / total.register_uv) * 100
            : 0,
        creation_rate_uv:
          total.register_uv > 0
            ? (total.create_uv_1d / total.register_uv) * 100
            : 0,
        creation_success_rate_uv:
          total.create_uv_1d > 0
            ? (total.success_uv_today / total.create_uv_1d) * 100
            : 0,
        register_order_rate_uv:
          total.register_uv > 0
            ? (total.order_count_today / total.register_uv) * 100
            : 0,
        click_to_creation_rate_uv:
          total.click_uv_today > 0
            ? (total.create_uv_1d / total.click_uv_today) * 100
            : 0,
      };
    })()
    : null;

  // 按渠道聚合数据（时间和端都加起来）
  const aggregatedData = biData.reduce(
    (
      acc: Record<
        string,
        {
          appid: string;
          source: string;
          register_uv: number;
          click_pv_today: number;
          click_uv_today: number;
          create_pv_1d: number;
          create_uv_1d: number;
          success_pv_today: number;
          success_uv_today: number;
          order_count_today: number;
          gmv_today: number;
          arup: number;
        }
      >,
      item
    ) => {
      const key = `${item.appid}_${item.source}`;
      if (!acc[key]) {
        acc[key] = {
          appid: item.appid,
          source: item.source,
          register_uv: 0,
          click_pv_today: 0,
          click_uv_today: 0,
          create_pv_1d: 0,
          create_uv_1d: 0,
          success_pv_today: 0,
          success_uv_today: 0,
          order_count_today: 0,
          gmv_today: 0,
          arup: 0,
        };
      }
      acc[key].register_uv += item.register_uv;
      acc[key].click_pv_today += item.click_pv_today || 0;
      acc[key].click_uv_today += item.click_uv_today;
      acc[key].create_pv_1d += item.create_pv_1d || 0;
      acc[key].create_uv_1d += item.create_uv_1d || 0;
      acc[key].success_pv_today += item.success_pv_today || 0;
      acc[key].success_uv_today += item.success_uv_today;
      acc[key].order_count_today += item.order_count_today;
      acc[key].gmv_today += Number(item.gmv_today);
      return acc;
    },
    {}
  );

  // 计算每个渠道的ARUP和率指标: 当日GMV / 新增
  const aggregatedDataArray = Object.values(aggregatedData).map(item => ({
    ...item,
    arup: item.register_uv > 0 ? item.gmv_today / item.register_uv : 0,
    click_rate_uv:
      item.register_uv > 0 ? (item.click_uv_today / item.register_uv) * 100 : 0,
    creation_rate_uv:
      item.register_uv > 0 ? (item.create_uv_1d / item.register_uv) * 100 : 0,
    creation_success_rate_uv:
      item.create_uv_1d > 0
        ? (item.success_uv_today / item.create_uv_1d) * 100
        : 0,
    register_order_rate_uv:
      item.register_uv > 0
        ? (item.order_count_today / item.register_uv) * 100
        : 0,
    click_to_creation_rate_uv:
      item.click_uv_today > 0
        ? (item.create_uv_1d / item.click_uv_today) * 100
        : 0,
  }));

  // 获取所有唯一的 source
  const chartSources = Array.from(new Set(biData.map(item => item.source)));

  // 处理图表数据：按日期和渠道分组，聚合所有 device 的数据
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
      const sourceKey = item.source;
      if (!acc[dateKey][`${sourceKey}_register_uv`]) {
        acc[dateKey][`${sourceKey}_register_uv`] = 0;
        acc[dateKey][`${sourceKey}_click_uv_today`] = 0;
        acc[dateKey][`${sourceKey}_gmv_today`] = 0;
        acc[dateKey][`${sourceKey}_order_count_today`] = 0;
        acc[dateKey][`${sourceKey}_arpu`] = 0;
      }
      acc[dateKey][`${sourceKey}_register_uv`] =
        (acc[dateKey][`${sourceKey}_register_uv`] as number) + item.register_uv;
      acc[dateKey][`${sourceKey}_click_uv_today`] =
        (acc[dateKey][`${sourceKey}_click_uv_today`] as number) +
        item.click_uv_today;
      acc[dateKey][`${sourceKey}_gmv_today`] =
        (acc[dateKey][`${sourceKey}_gmv_today`] as number) +
        Number(item.gmv_today);
      acc[dateKey][`${sourceKey}_order_count_today`] =
        (acc[dateKey][`${sourceKey}_order_count_today`] as number) +
        item.order_count_today;
      return acc;
    },
    {}
  );

  // 转换为数组并按日期排序，同时计算每个渠道的 ARPU
  const chartDataArray = Object.values(chartData)
    .map(item => {
      const result = { ...item };
      // 为每个渠道计算 ARPU: GMV / 新增用户数
      chartSources.forEach(source => {
        const registerUv = (result[`${source}_register_uv`] as number) || 0;
        const gmv = (result[`${source}_gmv_today`] as number) || 0;
        result[`${source}_arpu`] = registerUv > 0 ? gmv / registerUv : 0;
      });
      return result;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  // 图表颜色配置
  const chartColors = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
  ];

  return (
    <div className='min-h-screen bg-slate-50 p-6'>
      <div className='max-w-[1920px] mx-auto'>
        {/* 标题 */}
        <div className='mb-6'>
          <h1 className='text-2xl font-bold text-slate-900'>渠道获客面板</h1>
          <p className='text-slate-500 mt-1'>
            （点击数据从 2026-01-07 开始统计）
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
                渠道
              </label>
              <Select
                value={source || 'all'}
                onValueChange={value => setSource(value === 'all' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder='全部' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>全部</SelectItem>
                  {sources.map((s: string) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </div>
        </div>

        {/* 走势图 */}
        {!isLoadingData && chartDataArray.length > 0 && (
          <div className='grid grid-cols-3 gap-4 mb-6'>
            {/* 新增UV走势图 */}
            <div className='bg-white rounded-lg shadow-sm border border-slate-200 p-4'>
              <h3 className='text-sm font-semibold text-slate-900 mb-3'>
                新增UV走势
              </h3>
              <ResponsiveContainer width='100%' height={200}>
                <LineChart data={chartDataArray}>
                  <CartesianGrid strokeDasharray='3 3' stroke='#e2e8f0' />
                  <XAxis
                    dataKey='date'
                    tickFormatter={date => utcToLocalDateString(date)}
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
                      `日期: ${utcToLocalDateString(label)}`
                    }
                    formatter={(value: number | undefined) => formatNumber(value || 0)}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                    iconSize={10}
                  />
                  {chartSources.map((source, index) => (
                    <Line
                      key={source}
                      type='monotone'
                      dataKey={`${source}_register_uv`}
                      stroke={chartColors[index % chartColors.length]}
                      strokeWidth={2}
                      name={source}
                      dot={{
                        fill: chartColors[index % chartColors.length],
                        r: 3,
                      }}
                    />
                  ))}
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
                    tickFormatter={date => utcToLocalDateString(date)}
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
                      `日期: ${utcToLocalDateString(label)}`
                    }
                    formatter={(value: number | undefined) => formatMoney(value || 0)}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                    iconSize={10}
                  />
                  {chartSources.map((source, index) => (
                    <Line
                      key={source}
                      type='monotone'
                      dataKey={`${source}_gmv_today`}
                      stroke={chartColors[index % chartColors.length]}
                      strokeWidth={2}
                      name={source}
                      dot={{
                        fill: chartColors[index % chartColors.length],
                        r: 3,
                      }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* ARPU走势图 */}
            <div className='bg-white rounded-lg shadow-sm border border-slate-200 p-4'>
              <h3 className='text-sm font-semibold text-slate-900 mb-3'>
                ARPU走势
              </h3>
              <ResponsiveContainer width='100%' height={200}>
                <LineChart data={chartDataArray}>
                  <CartesianGrid strokeDasharray='3 3' stroke='#e2e8f0' />
                  <XAxis
                    dataKey='date'
                    tickFormatter={date => utcToLocalDateString(date)}
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
                      `日期: ${utcToLocalDateString(label)}`
                    }
                    formatter={(value: number | undefined) => formatMoney(value || 0)}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                    iconSize={10}
                  />
                  {chartSources.map((source, index) => (
                    <Line
                      key={source}
                      type='monotone'
                      dataKey={`${source}_arpu`}
                      stroke={chartColors[index % chartColors.length]}
                      strokeWidth={2}
                      name={source}
                      dot={{
                        fill: chartColors[index % chartColors.length],
                        r: 3,
                      }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 数据表格 */}
        <div className='bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden'>
          {/* 表格工具栏 */}
          <div className='flex items-center justify-between p-4 border-b border-slate-200'>
            <h2 className='text-lg font-semibold text-slate-900'>数据表格</h2>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setIsColumnConfigOpen(true)}
              className='flex items-center gap-2'
            >
              <Settings size={16} />
              列配置
            </Button>
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
                    <TableHead className='w-[120px]'>渠道</TableHead>
                    {visibleColumns.map(colKey => {
                      const metric = CHANNEL_GAIN_METRICS.find(
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
                  {aggregatedDataArray.map((item, index: number) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Link
                          href={`/dashboard/manager/data/bi/product/userlist?appid=${appid}&register_source=${encodeURIComponent(item.source)}&register_date_from=${dateFrom}&register_date_to=${dateTo}&dateFrom=${dateFrom}&dateTo=${dateTo}`}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='text-blue-600 hover:text-blue-800 hover:underline'
                        >
                          {item.source}{' '}
                        </Link>
                      </TableCell>
                      {visibleColumns.map(colKey => {
                        const metric = CHANNEL_GAIN_METRICS.find(
                          m => m.key === colKey
                        );
                        const value = item[
                          colKey as keyof typeof item
                        ] as number;
                        // 如果是新增列，添加跳转链接
                        const isRegisterUv = colKey === 'register_uv';
                        const cellContent = metric
                          ? renderMetricCell(Number(value || 0), metric as any)
                          : String(value || '-');
                        return (
                          <TableCell key={colKey} className='text-right'>
                            {isRegisterUv && value > 0 ? (
                              <Link
                                href={`/dashboard/manager/data/bi/product/userlist?appid=${appid}&register_source=${encodeURIComponent(item.source)}&register_date_from=${dateFrom}&register_date_to=${dateTo}&dateFrom=${dateFrom}&dateTo=${dateTo}`}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='text-blue-600 hover:text-blue-800 hover:underline'
                              >
                                {cellContent}
                              </Link>
                            ) : (
                              cellContent
                            )}
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
                        const metric = CHANNEL_GAIN_METRICS.find(
                          m => m.key === colKey
                        );
                        const value = summary[
                          colKey as keyof typeof summary
                        ] as number;
                        // 如果是新增列，添加跳转链接
                        const isRegisterUv = colKey === 'register_uv';
                        const cellContent = metric
                          ? renderMetricCell(Number(value || 0), metric as any)
                          : String(value || '-');
                        return (
                          <TableCell key={colKey} className='text-right'>
                            {isRegisterUv && value > 0 ? (
                              <Link
                                href={`/dashboard/manager/data/bi/product/userlist?appid=${appid}&register_date_from=${dateFrom}&register_date_to=${dateTo}&dateFrom=${dateFrom}&dateTo=${dateTo}`}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='text-blue-600 hover:text-blue-800 hover:underline'
                              >
                                {cellContent}
                              </Link>
                            ) : (
                              cellContent
                            )}
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

        {/* 列配置对话框 */}
        <ResponsiveDialog
          isOpen={isColumnConfigOpen}
          onOpenChange={setIsColumnConfigOpen}
          isDialog={true}
          contentProps={{
            className: 'max-w-[500px]',
          }}
        >
          <div className='p-6 space-y-4'>
            <h2 className='text-xl font-semibold text-slate-900'>列配置</h2>
            <div className='space-y-4 max-h-[60vh] overflow-y-auto'>
              {Object.entries(
                CHANNEL_GAIN_METRICS.reduce(
                  (acc, metric) => {
                    if (!acc[metric.group]) acc[metric.group] = [];
                    acc[metric.group].push(metric);
                    return acc;
                  },
                  {} as Record<string, typeof CHANNEL_GAIN_METRICS>
                )
              ).map(([group, metrics]) => (
                <div key={group}>
                  <h3 className='text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider'>
                    {group}
                  </h3>
                  <div className='space-y-2'>
                    {metrics.map(metric => {
                      const isVisible = visibleColumns.includes(metric.key);
                      return (
                        <label
                          key={metric.key}
                          className='flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-slate-50 transition-colors'
                        >
                          <div
                            onClick={() => {
                              if (isVisible) {
                                setVisibleColumns(
                                  visibleColumns.filter(c => c !== metric.key)
                                );
                              } else {
                                const newColumns = [
                                  ...visibleColumns,
                                  metric.key,
                                ];
                                const sortedColumns = CHANNEL_GAIN_METRICS.map(
                                  m => m.key
                                ).filter(key => newColumns.includes(key));
                                setVisibleColumns(sortedColumns);
                              }
                            }}
                            className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isVisible
                              ? 'bg-blue-500 border-blue-500'
                              : 'bg-white border-slate-300'
                              }`}
                          >
                            {isVisible && (
                              <CheckSquare size={14} className='text-white' />
                            )}
                          </div>
                          <span
                            className={`text-sm flex-1 ${isVisible ? 'text-slate-900' : 'text-slate-500'
                              }`}
                          >
                            {metric.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className='flex justify-end gap-2 pt-4 border-t border-slate-200'>
              <Button
                variant='outline'
                onClick={() => setIsColumnConfigOpen(false)}
              >
                关闭
              </Button>
            </div>
          </div>
        </ResponsiveDialog>
      </div>
    </div>
  );
}

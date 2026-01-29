'use client';

import { convertToUtcDate, utcToLocalDateString } from '@/utils/date';
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
import { Loader2 } from 'lucide-react';
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
import { renderMetricCell } from '../../channel/shared/components';
import { formatMoney, formatNumber } from '../../channel/shared/constants';

// 产品BI指标定义
const PRODUCT_BI_METRICS = [
  { key: 'register_uv', label: '注册UV', group: '用户', format: 'number' },
  { key: 'active_uv', label: '活跃UV', group: '用户', format: 'number' },
  { key: 'intercept_uv', label: '拦截UV', group: '用户', format: 'number' },
  { key: 'success_uv', label: '成功UV', group: '用户', format: 'number' },
  { key: 'order_count', label: '订单数', group: '商业', format: 'number' },
  { key: 'gmv', label: '成交金额 (GMV)', group: '商业', format: 'currency' },
];

// 计算衍生指标
const calculateDerivedMetrics = (data: any) => {
  return {
    ...data,
    // 转化率指标
    active_rate:
      data.register_uv > 0 ? (data.active_uv / data.register_uv) * 100 : 0,
    intercept_rate:
      data.active_uv > 0 ? (data.intercept_uv / data.active_uv) * 100 : 0,
    success_rate:
      data.active_uv > 0 ? (data.success_uv / data.active_uv) * 100 : 0,
    order_rate:
      data.active_uv > 0 ? (data.order_count / data.active_uv) * 100 : 0,
    // 价值指标
    active_value: data.active_uv > 0 ? Number(data.gmv) / data.active_uv : 0,
    register_value:
      data.register_uv > 0 ? Number(data.gmv) / data.register_uv : 0,
  };
};

const STORAGE_KEY = 'product-bi-visible-columns';
const DEFAULT_VISIBLE_COLUMNS = [
  'register_uv',
  'active_uv',
  'intercept_uv',
  'success_uv',
  'order_count',
  'gmv',
];

export default function ProductBiPage() {
  // 初始化日期
  const [dateFrom, setDateFrom] = useState(
    dayjs().subtract(7, 'day').format('YYYY-MM-DD')
  );
  const [dateTo, setDateTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [appid, setAppid] = useState<string>('');
  const [device, setDevice] = useState<string>('');
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

  // 产品BI数据
  const [biData, setBiData] = useState<
    Array<{
      id: string;
      appid: string;
      date: string;
      device: string;
      register_uv: number;
      active_uv: number;
      intercept_uv: number;
      success_uv: number;
      order_count: number;
      gmv: number;
      create_time: string;
      update_time: string;
    }>
  >([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // 获取可用的appid列表
  const [appids, setAppids] = useState<string[]>(['jiantie']);

  // 获取可用的device列表
  const [devices, setDevices] = useState<string[]>(['ios']);

  // 查询产品BI数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingData(true);
        const data = await trpc.bi.getProductBiDaily.query({
          dateFrom: convertToUtcDate(dateFrom),
          dateTo: convertToUtcDate(dateTo),
          appid: appid || undefined,
          device: device || undefined,
        });
        // 统一处理服务器返回的日期数据
        // const processedData = (data || []).map(item => ({
        //   ...item,
        //   date: utcToLocalDateString(item.date),
        // }));
        setBiData(data);
      } catch (error: any) {
        console.error('获取产品BI数据失败:', error);
        setBiData([]);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [dateFrom, dateTo, appid, device]);

  // 获取appid列表
  useEffect(() => {
    const fetchAppids = async () => {
      try {
        const data = await trpc.bi.getAppids.query();
        setAppids(data || ['jiantie']);
      } catch (error: any) {
        console.error('获取appid列表失败:', error);
        setAppids([]);
      }
    };

    fetchAppids();
  }, []);

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

  // 保存列配置
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleColumns));
    }
  }, [visibleColumns]);

  // 计算汇总数据
  const summary = biData.length
    ? biData.reduce(
      (
        acc: {
          register_uv: number;
          active_uv: number;
          intercept_uv: number;
          success_uv: number;
          order_count: number;
          gmv: number;
        },
        item
      ) => ({
        register_uv: acc.register_uv + item.register_uv,
        active_uv: acc.active_uv + item.active_uv,
        intercept_uv: acc.intercept_uv + item.intercept_uv,
        success_uv: acc.success_uv + item.success_uv,
        order_count: acc.order_count + item.order_count,
        gmv: acc.gmv + Number(item.gmv),
      }),
      {
        register_uv: 0,
        active_uv: 0,
        intercept_uv: 0,
        success_uv: 0,
        order_count: 0,
        gmv: 0,
      }
    )
    : null;

  const summaryWithMetrics = summary ? calculateDerivedMetrics(summary) : null;

  // 按 appid 聚合数据（时间和端都加起来）
  const aggregatedData = biData.reduce(
    (
      acc: Record<
        string,
        {
          appid: string;
          register_uv: number;
          active_uv: number;
          intercept_uv: number;
          success_uv: number;
          order_count: number;
          gmv: number;
        }
      >,
      item
    ) => {
      if (!acc[item.appid]) {
        acc[item.appid] = {
          appid: item.appid,
          register_uv: 0,
          active_uv: 0,
          intercept_uv: 0,
          success_uv: 0,
          order_count: 0,
          gmv: 0,
        };
      }
      acc[item.appid].register_uv += item.register_uv;
      acc[item.appid].active_uv += item.active_uv;
      acc[item.appid].intercept_uv += item.intercept_uv;
      acc[item.appid].success_uv += item.success_uv;
      acc[item.appid].order_count += item.order_count;
      acc[item.appid].gmv += Number(item.gmv);
      return acc;
    },
    {}
  );

  const aggregatedDataArray = Object.values(aggregatedData);

  // 处理图表数据：按日期和 appid 分组，聚合所有 device 的数据
  const chartData = biData.reduce(
    (
      acc: Record<
        string,
        {
          date: string;
          [appid: string]: string | number;
        }
      >,
      item
    ) => {
      const dateKey = item.date;
      if (!acc[dateKey]) {
        acc[dateKey] = { date: dateKey };
      }
      const appidKey = item.appid;
      if (!acc[dateKey][`${appidKey}_register_uv`]) {
        acc[dateKey][`${appidKey}_register_uv`] = 0;
        acc[dateKey][`${appidKey}_active_uv`] = 0;
        acc[dateKey][`${appidKey}_gmv`] = 0;
        acc[dateKey][`${appidKey}_order_count`] = 0;
      }
      acc[dateKey][`${appidKey}_register_uv`] =
        (acc[dateKey][`${appidKey}_register_uv`] as number) + item.register_uv;
      acc[dateKey][`${appidKey}_active_uv`] =
        (acc[dateKey][`${appidKey}_active_uv`] as number) + item.active_uv;
      acc[dateKey][`${appidKey}_gmv`] =
        (acc[dateKey][`${appidKey}_gmv`] as number) + Number(item.gmv);
      acc[dateKey][`${appidKey}_order_count`] =
        (acc[dateKey][`${appidKey}_order_count`] as number) + item.order_count;
      return acc;
    },
    {}
  );

  // 转换为数组并按日期排序
  const chartDataArray = Object.values(chartData).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  // 获取所有唯一的 appid
  const chartAppids = Array.from(new Set(biData.map(item => item.appid)));

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
          <h1 className='text-2xl font-bold text-slate-900'>公司经营看板</h1>
          <p className='text-slate-500 mt-1'>
            查看产品维度的日统计数据，包括用户指标和商业指标
          </p>
        </div>

        {/* 筛选器 */}
        <div className='bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6'>
          <div className='flex flex-wrap gap-4 items-end'>
            <div className='flex-1 min-w-[200px]'>
              <label className='text-sm font-medium text-slate-700 mb-1 block'>
                开始日期
              </label>
              <Input
                type='date'
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
              />
            </div>
            <div className='flex-1 min-w-[200px]'>
              <label className='text-sm font-medium text-slate-700 mb-1 block'>
                结束日期
              </label>
              <Input
                type='date'
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
              />
            </div>
            <div className='flex-1 min-w-[150px]'>
              <label className='text-sm font-medium text-slate-700 mb-1 block'>
                应用ID
              </label>
              <Select
                value={appid || 'all'}
                onValueChange={value => setAppid(value === 'all' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder='全部' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>全部</SelectItem>
                  {appids.map((id: string) => (
                    <SelectItem key={id} value={id}>
                      {id}
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
            {/* <div>
              <ColumnSelector
                definitions={PRODUCT_BI_METRICS as any}
                visibleColumns={visibleColumns}
                onChange={setVisibleColumns}
                label='指标配置'
              />
            </div> */}
          </div>
        </div>

        {/* 走势图 */}
        {!isLoadingData && chartDataArray.length > 0 && (
          <div className='grid grid-cols-4 gap-4 mb-6'>
            {/* 注册UV走势图 */}
            <div className='bg-white rounded-lg shadow-sm border border-slate-200 p-4'>
              <h3 className='text-sm font-semibold text-slate-900 mb-3'>
                注册UV走势
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
                  {chartAppids.map((appid, index) => (
                    <Line
                      key={appid}
                      type='monotone'
                      dataKey={`${appid}_register_uv`}
                      stroke={chartColors[index % chartColors.length]}
                      strokeWidth={2}
                      name={appid}
                      dot={{
                        fill: chartColors[index % chartColors.length],
                        r: 3,
                      }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

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
                  {chartAppids.map((appid, index) => (
                    <Line
                      key={appid}
                      type='monotone'
                      dataKey={`${appid}_active_uv`}
                      stroke={chartColors[index % chartColors.length]}
                      strokeWidth={2}
                      name={appid}
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
                  {chartAppids.map((appid, index) => (
                    <Line
                      key={appid}
                      type='monotone'
                      dataKey={`${appid}_gmv`}
                      stroke={chartColors[index % chartColors.length]}
                      strokeWidth={2}
                      name={appid}
                      dot={{
                        fill: chartColors[index % chartColors.length],
                        r: 3,
                      }}
                    />
                  ))}
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
                  {chartAppids.map((appid, index) => (
                    <Line
                      key={appid}
                      type='monotone'
                      dataKey={`${appid}_order_count`}
                      stroke={chartColors[index % chartColors.length]}
                      strokeWidth={2}
                      name={appid}
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
                    <TableHead className='w-[120px]'>应用ID</TableHead>
                    {visibleColumns.map(colKey => {
                      const metric = PRODUCT_BI_METRICS.find(
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
                  {aggregatedDataArray.map((item, index: number) => {
                    const itemWithMetrics = calculateDerivedMetrics(item);
                    return (
                      <TableRow key={index}>
                        <TableCell>{item.appid}</TableCell>
                        {visibleColumns.map(colKey => {
                          const metric = PRODUCT_BI_METRICS.find(
                            m => m.key === colKey
                          );
                          const value =
                            itemWithMetrics[
                            colKey as keyof typeof itemWithMetrics
                            ];
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
                    );
                  })}
                  {/* 汇总行 */}
                  {summaryWithMetrics && (
                    <TableRow className='bg-slate-50 font-semibold'>
                      <TableCell>合计</TableCell>
                      {visibleColumns.map(colKey => {
                        const metric = PRODUCT_BI_METRICS.find(
                          m => m.key === colKey
                        );
                        const value =
                          summaryWithMetrics[
                          colKey as keyof typeof summaryWithMetrics
                          ];
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

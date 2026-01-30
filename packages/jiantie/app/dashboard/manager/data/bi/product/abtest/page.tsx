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
import { useEffect, useMemo, useRef, useState } from 'react';

// ABtest指标定义
const ABTEST_METRICS = [
  { key: 'register_uv', label: '新增UV', group: '基础', format: 'number' },
  // 当天活跃口径
  { key: 'active_click_uv', label: '当天活跃点击UV', group: '当天活跃', format: 'number' },
  { key: 'active_intercept_uv', label: '当天活跃拦截UV', group: '当天活跃', format: 'number' },
  { key: 'active_creation_uv', label: '当天活跃创作UV', group: '当天活跃', format: 'number' },
  { key: 'active_success_uv', label: '当天活跃成功UV', group: '当天活跃', format: 'number' },
  { key: 'active_order_count', label: '当天活跃订单量', group: '当天活跃', format: 'number' },
  { key: 'active_gmv', label: '当天活跃成交金额GMV', group: '当天活跃', format: 'currency' },
  // 当天新用户生命周期口径
  { key: 'click_uv_1d', label: '当天点击UV(新用户)', group: '当天新用户', format: 'number' },
  { key: 'intercept_uv_1d', label: '当天拦截UV(新用户)', group: '当天新用户', format: 'number' },
  { key: 'creation_uv_1d', label: '当天创作UV(新用户)', group: '当天新用户', format: 'number' },
  { key: 'success_uv_1d', label: '当天成功UV(新用户)', group: '当天新用户', format: 'number' },
  { key: 'order_count_1d', label: '当天订单量(新用户)', group: '当天新用户', format: 'number' },
  { key: 'gmv_1d', label: '当天成交金额GMV(新用户)', group: '当天新用户', format: 'currency' },
  { key: 'click_uv_3d', label: '3天点击UV', group: '3天', format: 'number' },
  { key: 'intercept_uv_3d', label: '3天拦截UV', group: '3天', format: 'number' },
  { key: 'creation_uv_3d', label: '3天创作UV', group: '3天', format: 'number' },
  { key: 'success_uv_3d', label: '3天成功UV', group: '3天', format: 'number' },
  { key: 'order_count_3d', label: '3天订单量', group: '3天', format: 'number' },
  { key: 'gmv_3d', label: '3天成交金额GMV', group: '3天', format: 'currency' },
  { key: 'click_uv_7d', label: '7天点击UV', group: '7天', format: 'number' },
  { key: 'intercept_uv_7d', label: '7天拦截UV', group: '7天', format: 'number' },
  { key: 'creation_uv_7d', label: '7天创作UV', group: '7天', format: 'number' },
  { key: 'success_uv_7d', label: '7天成功UV', group: '7天', format: 'number' },
  { key: 'order_count_7d', label: '7天订单量', group: '7天', format: 'number' },
  { key: 'gmv_7d', label: '7天成交金额GMV', group: '7天', format: 'currency' },
  // 注册相关转化率（1天）
  { key: 'register_click_rate_1d', label: '注册点击率(1天)', group: '转化率-1天', format: 'percent' },
  { key: 'register_creation_rate_1d', label: '注册创作率(1天)', group: '转化率-1天', format: 'percent' },
  { key: 'register_success_rate_1d', label: '注册成功率(1天)', group: '转化率-1天', format: 'percent' },
  { key: 'register_order_rate_1d', label: '注册订单转化率(1天)', group: '转化率-1天', format: 'percent' },
  // 点击相关转化率（1天）
  { key: 'click_intercept_rate_1d', label: '点击拦截率(1天)', group: '转化率-1天', format: 'percent' },
  { key: 'click_creation_rate_1d', label: '点击创作率(1天)', group: '转化率-1天', format: 'percent' },
  { key: 'click_success_rate_1d', label: '点击成功率(1天)', group: '转化率-1天', format: 'percent' },
  { key: 'click_order_rate_1d', label: '点击订单转化率(1天)', group: '转化率-1天', format: 'percent' },
  // 创作相关转化率（1天）
  { key: 'creation_success_rate_1d', label: '创作成功率(1天)', group: '转化率-1天', format: 'percent' },
  { key: 'creation_order_rate_1d', label: '创作订单转化率(1天)', group: '转化率-1天', format: 'percent' },
  // 价值指标（1天）
  { key: 'register_gmv_per_uv_1d', label: '注册用户人均GMV(1天)', group: '价值-1天', format: 'currency' },
  { key: 'click_gmv_per_uv_1d', label: '点击用户人均GMV(1天)', group: '价值-1天', format: 'currency' },
  { key: 'creation_gmv_per_uv_1d', label: '创作用户人均GMV(1天)', group: '价值-1天', format: 'currency' },
  { key: 'success_gmv_per_uv_1d', label: '成功用户人均GMV(1天)', group: '价值-1天', format: 'currency' },
  { key: 'order_avg_amount_1d', label: '客单价(1天)', group: '价值-1天', format: 'currency' },
  // 注册相关转化率（3天）
  { key: 'register_click_rate_3d', label: '注册点击率(3天)', group: '转化率-3天', format: 'percent' },
  { key: 'register_creation_rate_3d', label: '注册创作率(3天)', group: '转化率-3天', format: 'percent' },
  { key: 'register_success_rate_3d', label: '注册成功率(3天)', group: '转化率-3天', format: 'percent' },
  { key: 'register_order_rate_3d', label: '注册订单转化率(3天)', group: '转化率-3天', format: 'percent' },
  // 点击相关转化率（3天）
  { key: 'click_intercept_rate_3d', label: '点击拦截率(3天)', group: '转化率-3天', format: 'percent' },
  { key: 'click_creation_rate_3d', label: '点击创作率(3天)', group: '转化率-3天', format: 'percent' },
  { key: 'click_success_rate_3d', label: '点击成功率(3天)', group: '转化率-3天', format: 'percent' },
  { key: 'click_order_rate_3d', label: '点击订单转化率(3天)', group: '转化率-3天', format: 'percent' },
  // 创作相关转化率（3天）
  { key: 'creation_success_rate_3d', label: '创作成功率(3天)', group: '转化率-3天', format: 'percent' },
  { key: 'creation_order_rate_3d', label: '创作订单转化率(3天)', group: '转化率-3天', format: 'percent' },
  // 价值指标（3天）
  { key: 'register_gmv_per_uv_3d', label: '注册用户人均GMV(3天)', group: '价值-3天', format: 'currency' },
  { key: 'click_gmv_per_uv_3d', label: '点击用户人均GMV(3天)', group: '价值-3天', format: 'currency' },
  { key: 'creation_gmv_per_uv_3d', label: '创作用户人均GMV(3天)', group: '价值-3天', format: 'currency' },
  { key: 'success_gmv_per_uv_3d', label: '成功用户人均GMV(3天)', group: '价值-3天', format: 'currency' },
  { key: 'order_avg_amount_3d', label: '客单价(3天)', group: '价值-3天', format: 'currency' },
  // 注册相关转化率（7天）
  { key: 'register_click_rate_7d', label: '注册点击率(7天)', group: '转化率-7天', format: 'percent' },
  { key: 'register_creation_rate_7d', label: '注册创作率(7天)', group: '转化率-7天', format: 'percent' },
  { key: 'register_success_rate_7d', label: '注册成功率(7天)', group: '转化率-7天', format: 'percent' },
  { key: 'register_order_rate_7d', label: '注册订单转化率(7天)', group: '转化率-7天', format: 'percent' },
  // 点击相关转化率（7天）
  { key: 'click_intercept_rate_7d', label: '点击拦截率(7天)', group: '转化率-7天', format: 'percent' },
  { key: 'click_creation_rate_7d', label: '点击创作率(7天)', group: '转化率-7天', format: 'percent' },
  { key: 'click_success_rate_7d', label: '点击成功率(7天)', group: '转化率-7天', format: 'percent' },
  { key: 'click_order_rate_7d', label: '点击订单转化率(7天)', group: '转化率-7天', format: 'percent' },
  // 创作相关转化率（7天）
  { key: 'creation_success_rate_7d', label: '创作成功率(7天)', group: '转化率-7天', format: 'percent' },
  { key: 'creation_order_rate_7d', label: '创作订单转化率(7天)', group: '转化率-7天', format: 'percent' },
  // 价值指标（7天）
  { key: 'register_gmv_per_uv_7d', label: '注册用户人均GMV(7天)', group: '价值-7天', format: 'currency' },
  { key: 'click_gmv_per_uv_7d', label: '点击用户人均GMV(7天)', group: '价值-7天', format: 'currency' },
  { key: 'creation_gmv_per_uv_7d', label: '创作用户人均GMV(7天)', group: '价值-7天', format: 'currency' },
  { key: 'success_gmv_per_uv_7d', label: '成功用户人均GMV(7天)', group: '价值-7天', format: 'currency' },
  { key: 'order_avg_amount_7d', label: '客单价(7天)', group: '价值-7天', format: 'currency' },
];

const STORAGE_KEY = 'abtest-bi-visible-columns';
// 默认显示基础指标和部分重要转化率指标
const DEFAULT_VISIBLE_COLUMNS = [
  'register_uv',
  'click_uv_1d',
  'creation_uv_1d',
  'success_uv_1d',
  'order_count_1d',
  'gmv_1d',
  'click_uv_7d',
  'creation_uv_7d',
  'success_uv_7d',
  'order_count_7d',
  'gmv_7d',
  'register_click_rate_1d',
  'register_creation_rate_1d',
  'register_order_rate_1d',
  'click_creation_rate_1d',
  'creation_success_rate_1d',
  'register_click_rate_7d',
  'register_creation_rate_7d',
  'register_order_rate_7d',
  'click_creation_rate_7d',
  'creation_success_rate_7d',
];

// 格式化金额
const formatMoney = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return '-';
  return `¥${value.toFixed(2)}`;
};

// 格式化数字
const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return '-';
  return value.toLocaleString();
};

// 格式化百分比
const formatPercent = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return '-';
  return `${value.toFixed(2)}%`;
};

// 根据指标格式格式化值
const formatValue = (
  value: number | null | undefined,
  format?: string
): string => {
  if (format === 'percent') {
    return formatPercent(value);
  } else if (format === 'currency') {
    return formatMoney(value);
  }
  return formatNumber(value);
};

// 计算转化率指标
const calculateDerivedMetrics = (data: {
  register_uv: number;
  click_uv_1d: number;
  intercept_uv_1d: number;
  creation_uv_1d: number;
  success_uv_1d: number;
  order_count_1d: number;
  gmv_1d: number;
  click_uv_3d: number;
  intercept_uv_3d: number;
  creation_uv_3d: number;
  success_uv_3d: number;
  order_count_3d: number;
  gmv_3d: number;
  click_uv_7d: number;
  intercept_uv_7d: number;
  creation_uv_7d: number;
  success_uv_7d: number;
  order_count_7d: number;
  gmv_7d: number;
}) => {
  return {
    ...data,
    // 1天转化率
    register_click_rate_1d:
      data.register_uv > 0
        ? (data.click_uv_1d / data.register_uv) * 100
        : 0,
    register_creation_rate_1d:
      data.register_uv > 0
        ? (data.creation_uv_1d / data.register_uv) * 100
        : 0,
    register_success_rate_1d:
      data.register_uv > 0
        ? (data.success_uv_1d / data.register_uv) * 100
        : 0,
    register_order_rate_1d:
      data.register_uv > 0
        ? (data.order_count_1d / data.register_uv) * 100
        : 0,
    click_intercept_rate_1d:
      data.click_uv_1d > 0
        ? (data.intercept_uv_1d / data.click_uv_1d) * 100
        : 0,
    click_creation_rate_1d:
      data.click_uv_1d > 0
        ? (data.creation_uv_1d / data.click_uv_1d) * 100
        : 0,
    click_success_rate_1d:
      data.click_uv_1d > 0
        ? (data.success_uv_1d / data.click_uv_1d) * 100
        : 0,
    click_order_rate_1d:
      data.click_uv_1d > 0
        ? (data.order_count_1d / data.click_uv_1d) * 100
        : 0,
    creation_success_rate_1d:
      data.creation_uv_1d > 0
        ? (data.success_uv_1d / data.creation_uv_1d) * 100
        : 0,
    creation_order_rate_1d:
      data.creation_uv_1d > 0
        ? (data.order_count_1d / data.creation_uv_1d) * 100
        : 0,
    register_gmv_per_uv_1d:
      data.register_uv > 0 ? data.gmv_1d / data.register_uv : 0,
    click_gmv_per_uv_1d:
      data.click_uv_1d > 0 ? data.gmv_1d / data.click_uv_1d : 0,
    creation_gmv_per_uv_1d:
      data.creation_uv_1d > 0 ? data.gmv_1d / data.creation_uv_1d : 0,
    success_gmv_per_uv_1d:
      data.success_uv_1d > 0 ? data.gmv_1d / data.success_uv_1d : 0,
    order_avg_amount_1d:
      data.order_count_1d > 0 ? data.gmv_1d / data.order_count_1d : 0,
    // 3天转化率
    register_click_rate_3d:
      data.register_uv > 0
        ? (data.click_uv_3d / data.register_uv) * 100
        : 0,
    register_creation_rate_3d:
      data.register_uv > 0
        ? (data.creation_uv_3d / data.register_uv) * 100
        : 0,
    register_success_rate_3d:
      data.register_uv > 0
        ? (data.success_uv_3d / data.register_uv) * 100
        : 0,
    register_order_rate_3d:
      data.register_uv > 0
        ? (data.order_count_3d / data.register_uv) * 100
        : 0,
    click_intercept_rate_3d:
      data.click_uv_3d > 0
        ? (data.intercept_uv_3d / data.click_uv_3d) * 100
        : 0,
    click_creation_rate_3d:
      data.click_uv_3d > 0
        ? (data.creation_uv_3d / data.click_uv_3d) * 100
        : 0,
    click_success_rate_3d:
      data.click_uv_3d > 0
        ? (data.success_uv_3d / data.click_uv_3d) * 100
        : 0,
    click_order_rate_3d:
      data.click_uv_3d > 0
        ? (data.order_count_3d / data.click_uv_3d) * 100
        : 0,
    creation_success_rate_3d:
      data.creation_uv_3d > 0
        ? (data.success_uv_3d / data.creation_uv_3d) * 100
        : 0,
    creation_order_rate_3d:
      data.creation_uv_3d > 0
        ? (data.order_count_3d / data.creation_uv_3d) * 100
        : 0,
    register_gmv_per_uv_3d:
      data.register_uv > 0 ? data.gmv_3d / data.register_uv : 0,
    click_gmv_per_uv_3d:
      data.click_uv_3d > 0 ? data.gmv_3d / data.click_uv_3d : 0,
    creation_gmv_per_uv_3d:
      data.creation_uv_3d > 0 ? data.gmv_3d / data.creation_uv_3d : 0,
    success_gmv_per_uv_3d:
      data.success_uv_3d > 0 ? data.gmv_3d / data.success_uv_3d : 0,
    order_avg_amount_3d:
      data.order_count_3d > 0 ? data.gmv_3d / data.order_count_3d : 0,
    // 7天转化率
    register_click_rate_7d:
      data.register_uv > 0
        ? (data.click_uv_7d / data.register_uv) * 100
        : 0,
    register_creation_rate_7d:
      data.register_uv > 0
        ? (data.creation_uv_7d / data.register_uv) * 100
        : 0,
    register_success_rate_7d:
      data.register_uv > 0
        ? (data.success_uv_7d / data.register_uv) * 100
        : 0,
    register_order_rate_7d:
      data.register_uv > 0
        ? (data.order_count_7d / data.register_uv) * 100
        : 0,
    click_intercept_rate_7d:
      data.click_uv_7d > 0
        ? (data.intercept_uv_7d / data.click_uv_7d) * 100
        : 0,
    click_creation_rate_7d:
      data.click_uv_7d > 0
        ? (data.creation_uv_7d / data.click_uv_7d) * 100
        : 0,
    click_success_rate_7d:
      data.click_uv_7d > 0
        ? (data.success_uv_7d / data.click_uv_7d) * 100
        : 0,
    click_order_rate_7d:
      data.click_uv_7d > 0
        ? (data.order_count_7d / data.click_uv_7d) * 100
        : 0,
    creation_success_rate_7d:
      data.creation_uv_7d > 0
        ? (data.success_uv_7d / data.creation_uv_7d) * 100
        : 0,
    creation_order_rate_7d:
      data.creation_uv_7d > 0
        ? (data.order_count_7d / data.creation_uv_7d) * 100
        : 0,
    register_gmv_per_uv_7d:
      data.register_uv > 0 ? data.gmv_7d / data.register_uv : 0,
    click_gmv_per_uv_7d:
      data.click_uv_7d > 0 ? data.gmv_7d / data.click_uv_7d : 0,
    creation_gmv_per_uv_7d:
      data.creation_uv_7d > 0 ? data.gmv_7d / data.creation_uv_7d : 0,
    success_gmv_per_uv_7d:
      data.success_uv_7d > 0 ? data.gmv_7d / data.success_uv_7d : 0,
    order_avg_amount_7d:
      data.order_count_7d > 0 ? data.gmv_7d / data.order_count_7d : 0,
  };
};

export default function AbtestPage() {
  const searchParams = useSearchParams();
  const appid = searchParams.get('appid') || '';

  // 初始化日期
  const [dateFrom, setDateFrom] = useState(
    dayjs().subtract(7, 'day').format('YYYY-MM-DD')
  );
  const [dateTo, setDateTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [device, setDevice] = useState<string>('');

  // 列配置
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
    } catch (e) {
      console.error('读取ABtest列配置失败:', e);
    }
    return DEFAULT_VISIBLE_COLUMNS;
  });

  // ABtest BI数据
  const [biData, setBiData] = useState<
    Array<{
      id: string;
      appid: string;
      date: string;
      device: string;
      uid_parity: string;
      register_uv: number;
      click_uv_1d: number;
      intercept_uv_1d: number;
      creation_uv_1d: number;
      success_uv_1d: number;
      order_count_1d: number;
      gmv_1d: number;
      click_uv_3d: number;
      intercept_uv_3d: number;
      creation_uv_3d: number;
      success_uv_3d: number;
      order_count_3d: number;
      gmv_3d: number;
      click_uv_7d: number;
      intercept_uv_7d: number;
      creation_uv_7d: number;
      success_uv_7d: number;
      order_count_7d: number;
      gmv_7d: number;
      active_click_uv: number;
      active_intercept_uv: number;
      active_creation_uv: number;
      active_success_uv: number;
      active_order_count: number;
      active_gmv: number;
      create_time: string;
      update_time: string;
    }>
  >([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // 获取可用的device列表
  const [devices, setDevices] = useState<string[]>([]);

  // 列配置弹层状态
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
  const columnSelectorRef = useRef<HTMLDivElement | null>(null);
  const [columnSearch, setColumnSearch] = useState('');

  // 点击外部关闭列配置弹层
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
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isColumnSelectorOpen]);

  // 保存列配置到本地
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleColumns));
    }
  }, [visibleColumns]);

  // 按 group 对指标分组，方便列配置展示
  const groupedMetrics = useMemo(() => {
    const keyword = columnSearch.trim();
    const lowerKeyword = keyword.toLowerCase();

    return ABTEST_METRICS.filter(metric => {
      if (!keyword) return true;
      return (
        metric.label.toLowerCase().includes(lowerKeyword) ||
        metric.key.toLowerCase().includes(lowerKeyword)
      );
    }).reduce(
      (acc, metric) => {
        if (!acc[metric.group]) acc[metric.group] = [];
        acc[metric.group].push(metric);
        return acc;
      },
      {} as Record<string, typeof ABTEST_METRICS>
    );
  }, [columnSearch]);

  // 切换列显示
  const toggleColumn = (key: string) => {
    if (visibleColumns.includes(key)) {
      // 至少保留一列，避免全部隐藏
      if (visibleColumns.length === 1) return;
      setVisibleColumns(visibleColumns.filter(c => c !== key));
    } else {
      const newColumns = [...visibleColumns, key];
      const sortedColumns = ABTEST_METRICS.map(def => def.key).filter(colKey =>
        newColumns.includes(colKey)
      );
      setVisibleColumns(sortedColumns);
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

  // 查询ABtest BI数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingData(true);
        const data = await trpc.bi.getAbtestBiDaily.query({
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          appid: appid || undefined,
          device: device || undefined,
        });
        setBiData(data || []);
      } catch (error: any) {
        console.error('获取ABtest BI数据失败:', error);
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
  }, [dateFrom, dateTo, appid, device]);

  // 获取device列表
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const data = await trpc.bi.getAbtestDevices.query();
        setDevices(data || []);
      } catch (error) {
        console.error('获取device列表失败:', error);
        setDevices([]);
      }
    };

    fetchDevices();
  }, []);

  // 按日期和端分组数据，对比单双号，并计算派生指标
  const groupedData = useMemo(() => {
    const grouped = new Map<
      string,
      {
        date: string;
        device: string;
        odd: ReturnType<typeof calculateDerivedMetrics> | null;
        even: ReturnType<typeof calculateDerivedMetrics> | null;
      }
    >();

    for (const item of biData) {
      const key = `${item.date}_${item.device}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          date: item.date,
          device: item.device,
          odd: null,
          even: null,
        });
      }

      const group = grouped.get(key)!;
      const derivedData = calculateDerivedMetrics(item);
      if (item.uid_parity === 'odd') {
        group.odd = derivedData;
      } else if (item.uid_parity === 'even') {
        group.even = derivedData;
      }
    }

    return Array.from(grouped.values()).sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      return a.device.localeCompare(b.device);
    });
  }, [biData]);

  // 导出CSV
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);

      if (groupedData.length === 0) {
        alert('暂无数据可导出');
        return;
      }

      // 构建CSV表头
      const headers = [
        '日期',
        '端',
        '单双号',
        ...ABTEST_METRICS.map(m => m.label),
      ];

      // 构建CSV数据行
      const rows: string[][] = [];
      for (const group of groupedData) {
        for (const parity of ['odd', 'even'] as const) {
          const data = group[parity];
          if (!data) continue;

          const row = [
            group.date,
            group.device,
            parity === 'odd' ? '单号' : '双号',
            ...ABTEST_METRICS.map(metric => {
              const value = data[metric.key as keyof typeof data];
              return formatValue(value as number, metric.format);
            }),
          ];
          rows.push(row);
        }
      }

      // 构建CSV内容
      const csvContent = [
        headers.join(','),
        ...rows.map(row =>
          row.map(cell => {
            const str = String(cell);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          }).join(',')
        ),
      ].join('\n');

      // 添加BOM以支持中文Excel
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
        `ABtest数据-${dateFrom}_${dateTo}-${dayjs().format('YYYY-MM-DD')}.csv`
      );

      // 触发下载
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 释放URL对象
      URL.revokeObjectURL(url);

      alert(`成功导出 ${rows.length} 条记录`);
    } catch (error) {
      console.error('导出CSV失败:', error);
      alert('导出失败，请稍后重试');
    } finally {
      setIsExporting(false);
    }
  };

  const periods = [
    { id: 'today', label: '今日' },
    { id: 'yesterday', label: '昨日' },
    { id: 'near7', label: '近7天' },
    { id: 'near14', label: '近14天' },
    { id: 'near30', label: '近30天' },
  ];

  return (
    <div className='animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6'>
      {/* 筛选器 */}
      <div className='flex flex-wrap items-center justify-between gap-4 mb-6'>
        <div>
          <h2 className='text-xl font-bold text-slate-800'>ABtest数据看板</h2>
          <p className='text-sm text-slate-500 mt-1'>
            查看UID单双号的ABtest数据对比，包括当天、3天、7天的各项指标
          </p>
        </div>

        <div className='flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm'>
          {/* 快捷日期选择 */}
          <div className='flex items-center gap-2'>
            {periods.map(period => (
              <button
                key={period.id}
                onClick={() => handleQuickDateSelect(period.id)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  selectedPeriod === period.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>

          {/* 日期输入 */}
          <div className='flex items-center gap-2'>
            <Input
              type='date'
              value={dateFrom}
              onChange={e => {
                setDateFrom(e.target.value);
                setSelectedPeriod('');
              }}
              className='w-40'
            />
            <span className='text-slate-500'>至</span>
            <Input
              type='date'
              value={dateTo}
              onChange={e => {
                setDateTo(e.target.value);
                setSelectedPeriod('');
              }}
              className='w-40'
            />
          </div>

          {/* 端类型选择 */}
          <Select
            value={device || 'all'}
            onValueChange={value => setDevice(value === 'all' ? '' : value)}
          >
            <SelectTrigger className='w-32'>
              <SelectValue placeholder='全部端' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>全部端</SelectItem>
              {devices.map(d => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className='flex items-center gap-2'>
            {/* 导出按钮 */}
            <button
              onClick={handleExportCSV}
              disabled={isExporting || groupedData.length === 0}
              className='flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              {isExporting ? (
                <Loader2 className='animate-spin' size={16} />
              ) : (
                <Download size={16} />
              )}
              {isExporting ? '导出中...' : '导出CSV'}
            </button>

            {/* 列配置 */}
            <div className='relative' ref={columnSelectorRef}>
              <button
                type='button'
                onClick={() => setIsColumnSelectorOpen(!isColumnSelectorOpen)}
                className='text-xs flex items-center gap-1.5 text-slate-600 hover:text-blue-600 bg-white border border-slate-200 px-3 py-2 rounded shadow-sm transition-colors'
              >
                <Settings size={14} /> 列配置
              </button>

              {isColumnSelectorOpen && (
                <div className='absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-100 z-50 animate-in fade-in zoom-in-95 duration-200'>
                  <div className='p-3 border-b border-slate-100 bg-slate-50 rounded-t-lg'>
                    <h4 className='font-bold text-xs text-slate-700 mb-2'>
                      列配置
                    </h4>
                    <Input
                      placeholder='搜索列名称或字段 key...'
                      value={columnSearch}
                      onChange={e => setColumnSearch(e.target.value)}
                      className='h-7 text-xs'
                    />
                  </div>
                  <div className='p-3 max-h-80 overflow-y-auto'>
                    {Object.entries(groupedMetrics).map(([group, metrics]) => (
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
          </div>
        </div>
      </div>

      {/* 数据表格 */}
      <div className='bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden'>
        {isLoadingData ? (
          <div className='p-12 text-center text-slate-500'>
            <Loader2 className='inline-block animate-spin h-8 w-8 text-blue-600' />
            <p className='mt-4'>加载中...</p>
          </div>
        ) : groupedData.length === 0 ? (
          <div className='p-12 text-center text-slate-500'>
            <p>暂无数据</p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='sticky left-0 bg-white z-10 min-w-[100px]'>
                    日期
                  </TableHead>
                  <TableHead className='min-w-[80px]'>端</TableHead>
                  <TableHead className='min-w-[80px]'>单双号</TableHead>
                  {ABTEST_METRICS.filter(metric =>
                    visibleColumns.includes(metric.key)
                  ).map(metric => (
                    <TableHead key={metric.key} className='min-w-[120px]'>
                      {metric.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedData.map((group, idx) => (
                  <>
                    {/* 单号行 */}
                    {group.odd && (
                      <TableRow
                        key={`${group.date}_${group.device}_odd_${idx}`}
                        className='bg-blue-50/50'
                      >
                        <TableCell className='sticky left-0 bg-blue-50/50 z-10 font-medium'>
                          {group.date}
                        </TableCell>
                        <TableCell>{group.device}</TableCell>
                        <TableCell>
                          <span className='inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-xs font-medium'>
                            单号
                          </span>
                        </TableCell>
                        {group.odd &&
                          ABTEST_METRICS.filter(metric =>
                            visibleColumns.includes(metric.key)
                          ).map(metric => {
                            const value =
                              group.odd![metric.key as keyof typeof group.odd];
                            return (
                              <TableCell key={metric.key}>
                                {formatValue(value as number, metric.format)}
                              </TableCell>
                            );
                          })}
                      </TableRow>
                    )}
                    {/* 双号行 */}
                    {group.even && (
                      <TableRow
                        key={`${group.date}_${group.device}_even_${idx}`}
                        className='bg-green-50/50'
                      >
                        <TableCell className='sticky left-0 bg-green-50/50 z-10 font-medium'>
                          {group.date}
                        </TableCell>
                        <TableCell>{group.device}</TableCell>
                        <TableCell>
                          <span className='inline-flex items-center px-2 py-1 rounded-md bg-green-100 text-green-800 text-xs font-medium'>
                            双号
                          </span>
                        </TableCell>
                        {group.even &&
                          ABTEST_METRICS.filter(metric =>
                            visibleColumns.includes(metric.key)
                          ).map(metric => {
                            const value =
                              group.even![
                                metric.key as keyof typeof group.even
                              ];
                            return (
                              <TableCell key={metric.key}>
                                {formatValue(value as number, metric.format)}
                              </TableCell>
                            );
                          })}
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

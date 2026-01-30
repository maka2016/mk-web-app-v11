'use client';

import { cdnApi } from '@/services';
import { convertToUtcDate } from '@/utils/date';
import { trpc } from '@/utils/trpc';
import { Button } from '@workspace/ui/components/button';
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
import {
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Download,
  Loader2,
  Settings,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { renderMetricCell } from '../../../channel/shared/components';

// 频道看板指标定义
const CHANNEL_BI_METRICS = [
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
  { key: 'creation_pv', label: '创作PV', group: '创作', format: 'number' },
  { key: 'creation_uv', label: '创作UV', group: '创作', format: 'number' },
  { key: 'intercept_pv', label: '拦截PV', group: '拦截', format: 'number' },
  { key: 'intercept_uv', label: '拦截UV', group: '拦截', format: 'number' },
  { key: 'success_pv', label: '成功PV', group: '成功', format: 'number' },
  { key: 'success_uv', label: '成功UV', group: '成功', format: 'number' },
  { key: 'order_count', label: '订单数', group: '商业', format: 'number' },
  { key: 'gmv', label: '成交金额 (GMV)', group: '商业', format: 'currency' },
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
    label: '创作成功率UV',
    group: '转化率',
    format: 'percent',
  },
  {
    key: 'creation_order_rate_uv',
    label: '创作订单率UV',
    group: '转化率',
    format: 'percent',
  },
  {
    key: 'view_order_rate_uv',
    label: '曝光订单率UV',
    group: '转化率',
    format: 'percent',
  },
  {
    key: 'creation_intercept_rate_uv',
    label: '创作拦截率UV',
    group: '转化率',
    format: 'percent',
  },
];

const STORAGE_KEY = 'channel-bi-visible-columns';
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

export default function ChannelBiPage() {
  const searchParams = useSearchParams();
  const appid = searchParams.get('appid') || '';

  // 初始化日期
  const [dateFrom, setDateFrom] = useState(dayjs().format('YYYY-MM-DD'));
  const [dateTo, setDateTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [device, setDevice] = useState<string>('');
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
  const [showChannelId, setShowChannelId] = useState(false);

  // 频道BI数据
  const [biData, setBiData] = useState<
    Array<{
      id: string;
      appid: string;
      source: string;
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
      create_time: string;
      update_time: string;
      channel: {
        id: number;
        display_name: string;
        alias: string;
        class: string;
        parent: {
          id: number;
          display_name: string;
          alias: string;
          class: string;
          parent: {
            id: number;
            display_name: string;
            alias: string;
            class: string;
          } | null;
        } | null;
      } | null;
    }>
  >([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // 获取可用的device列表
  const [devices, setDevices] = useState<string[]>([]);

  // 分组折叠状态
  const [expandedLevel2, setExpandedLevel2] = useState<Record<string, boolean>>(
    {}
  );
  const [expandedLevel3, setExpandedLevel3] = useState<Record<string, boolean>>(
    {}
  );

  // 列选择器状态
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
  const columnSelectorRef = useRef<HTMLDivElement>(null);

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
      const sortedColumns = CHANNEL_BI_METRICS.map(m => m.key).filter(key =>
        newColumns.includes(key)
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

  // 按组分类指标
  const groupedMetrics = useMemo(() => {
    return CHANNEL_BI_METRICS.reduce(
      (acc, metric) => {
        if (!acc[metric.group]) acc[metric.group] = [];
        acc[metric.group].push(metric);
        return acc;
      },
      {} as Record<string, typeof CHANNEL_BI_METRICS>
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

  // 查询频道BI数据
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
        const data = await trpc.bi.getTemplateChannelBiDaily.query({
          dateFrom: convertToUtcDate(dateFrom) || undefined,
          dateTo: convertToUtcDate(dateTo) || undefined,
          appid: appid || undefined,
          device: device || undefined,
        });
        setBiData(data || []);
      } catch (error: any) {
        console.error('获取频道BI数据失败:', error);
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

  // 按四级频道聚合数据
  const aggregatedData = biData.reduce(
    (
      acc: Record<
        string,
        {
          channelId: string;
          channelName: string;
          level3Id: number | null;
          level3Name: string;
          level2Id: number | null;
          level2Name: string;
          level2ThumbPath: string | null;
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
        }
      >,
      item
    ) => {
      const key = item.source;
      if (!acc[key]) {
        acc[key] = {
          channelId: item.source,
          channelName: item.channel?.display_name || `频道${item.source}`,
          level3Id: item.channel?.parent?.id || null,
          level3Name:
            item.channel?.parent?.display_name ||
            item.channel?.parent?.alias ||
            '-',
          level2Id: item.channel?.parent?.parent?.id || null,
          level2Name:
            item.channel?.parent?.parent?.display_name ||
            item.channel?.parent?.parent?.alias ||
            '-',
          level2ThumbPath:
            (item.channel?.parent?.parent as any)?.thumb_path || null,
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
      return acc;
    },
    {}
  );

  // 计算价值指标和转化率指标
  const aggregatedDataArray = Object.values(aggregatedData).map(item => ({
    ...item,
    view_value_uv: item.view_uv > 0 ? item.gmv / item.view_uv : 0,
    click_value_uv:
      item.template_click_uv > 0 ? item.gmv / item.template_click_uv : 0,
    creation_value_uv: item.creation_uv > 0 ? item.gmv / item.creation_uv : 0,
    creation_success_rate_uv:
      item.creation_uv > 0 ? (item.success_uv / item.creation_uv) * 100 : 0,
    creation_order_rate_uv:
      item.creation_uv > 0 ? (item.order_count / item.creation_uv) * 100 : 0,
    view_order_rate_uv:
      item.view_uv > 0 ? (item.order_count / item.view_uv) * 100 : 0,
    creation_intercept_rate_uv:
      item.creation_uv > 0 ? (item.intercept_uv / item.creation_uv) * 100 : 0,
  }));

  const METRIC_KEYS = [
    'view_pv',
    'view_uv',
    'template_click_pv',
    'template_click_uv',
    'creation_pv',
    'creation_uv',
    'intercept_pv',
    'intercept_uv',
    'success_pv',
    'success_uv',
    'order_count',
    'gmv',
    'view_value_uv',
    'click_value_uv',
    'creation_value_uv',
    'creation_success_rate_uv',
    'creation_order_rate_uv',
    'view_order_rate_uv',
    'creation_intercept_rate_uv',
  ] as const;

  // 按二级 / 三级频道分组
  const level2Groups = aggregatedDataArray.reduce(
    (
      acc: Record<
        string,
        {
          key: string;
          level2Name: string;
          level2ThumbPath: string | null;
          metrics: Record<string, number>;
          level3Groups: Record<
            string,
            {
              key: string;
              level3Name: string;
              metrics: Record<string, number>;
              children: typeof aggregatedDataArray;
            }
          >;
        }
      >,
      item
    ) => {
      const level2Key = String(
        (item as any).level2Id || (item as any).level2Name || '未知二级频道'
      );
      if (!acc[level2Key]) {
        const metrics: Record<string, number> = {};
        METRIC_KEYS.forEach(k => {
          metrics[k] = 0;
        });
        acc[level2Key] = {
          key: level2Key,
          level2Name: (item as any).level2Name || '未知二级频道',
          level2ThumbPath: (item as any).level2ThumbPath || null,
          metrics,
          level3Groups: {},
        };
      }

      const level3Key = `${level2Key}-${
        (item as any).level3Id || (item as any).level3Name || '未知三级频道'
      }`;
      if (!acc[level2Key].level3Groups[level3Key]) {
        const metrics: Record<string, number> = {};
        METRIC_KEYS.forEach(k => {
          metrics[k] = 0;
        });
        acc[level2Key].level3Groups[level3Key] = {
          key: level3Key,
          level3Name: (item as any).level3Name || '未知三级频道',
          metrics,
          children: [] as any,
        };
      }

      METRIC_KEYS.forEach(k => {
        // 价值指标和转化率指标需要重新计算，不能直接累加
        if (
          k === 'view_value_uv' ||
          k === 'click_value_uv' ||
          k === 'creation_value_uv' ||
          k === 'creation_success_rate_uv' ||
          k === 'creation_order_rate_uv' ||
          k === 'view_order_rate_uv' ||
          k === 'creation_intercept_rate_uv'
        ) {
          return; // 跳过，后面统一计算
        }
        const value = (item as any)[k] || 0;
        acc[level2Key].metrics[k] += value;
        acc[level2Key].level3Groups[level3Key].metrics[k] += value;
      });

      acc[level2Key].level3Groups[level3Key].children.push(item as any);

      return acc;
    },
    {}
  );

  // 计算分组后的价值指标和转化率指标
  const level2GroupsArray = Object.values(level2Groups).map(group => {
    // 计算二级频道的价值指标和转化率指标
    const level2Metrics = {
      ...group.metrics,
      view_value_uv:
        group.metrics.view_uv > 0
          ? group.metrics.gmv / group.metrics.view_uv
          : 0,
      click_value_uv:
        group.metrics.template_click_uv > 0
          ? group.metrics.gmv / group.metrics.template_click_uv
          : 0,
      creation_value_uv:
        group.metrics.creation_uv > 0
          ? group.metrics.gmv / group.metrics.creation_uv
          : 0,
      creation_success_rate_uv:
        group.metrics.creation_uv > 0
          ? (group.metrics.success_uv / group.metrics.creation_uv) * 100
          : 0,
      creation_order_rate_uv:
        group.metrics.creation_uv > 0
          ? (group.metrics.order_count / group.metrics.creation_uv) * 100
          : 0,
      view_order_rate_uv:
        group.metrics.view_uv > 0
          ? (group.metrics.order_count / group.metrics.view_uv) * 100
          : 0,
      creation_intercept_rate_uv:
        group.metrics.creation_uv > 0
          ? (group.metrics.intercept_uv / group.metrics.creation_uv) * 100
          : 0,
    };

    // 计算三级热词的价值指标和转化率指标
    const level3Groups = Object.values(group.level3Groups).map(level3 => ({
      ...level3,
      metrics: {
        ...level3.metrics,
        view_value_uv:
          level3.metrics.view_uv > 0
            ? level3.metrics.gmv / level3.metrics.view_uv
            : 0,
        click_value_uv:
          level3.metrics.template_click_uv > 0
            ? level3.metrics.gmv / level3.metrics.template_click_uv
            : 0,
        creation_value_uv:
          level3.metrics.creation_uv > 0
            ? level3.metrics.gmv / level3.metrics.creation_uv
            : 0,
        creation_success_rate_uv:
          level3.metrics.creation_uv > 0
            ? (level3.metrics.success_uv / level3.metrics.creation_uv) * 100
            : 0,
        creation_order_rate_uv:
          level3.metrics.creation_uv > 0
            ? (level3.metrics.order_count / level3.metrics.creation_uv) * 100
            : 0,
        view_order_rate_uv:
          level3.metrics.view_uv > 0
            ? (level3.metrics.order_count / level3.metrics.view_uv) * 100
            : 0,
        creation_intercept_rate_uv:
          level3.metrics.creation_uv > 0
            ? (level3.metrics.intercept_uv / level3.metrics.creation_uv) * 100
            : 0,
      },
    }));

    return {
      ...group,
      metrics: level2Metrics,
      level3Groups,
    };
  });

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
              creation_pv: number;
              creation_uv: number;
              intercept_pv: number;
              intercept_uv: number;
              success_pv: number;
              success_uv: number;
              order_count: number;
              gmv: number;
            },
            item
          ) => ({
            view_pv: acc.view_pv + item.view_pv,
            view_uv: acc.view_uv + item.view_uv,
            template_click_pv: acc.template_click_pv + item.template_click_pv,
            template_click_uv: acc.template_click_uv + item.template_click_uv,
            creation_pv: acc.creation_pv + item.creation_pv,
            creation_uv: acc.creation_uv + item.creation_uv,
            intercept_pv: acc.intercept_pv + item.intercept_pv,
            intercept_uv: acc.intercept_uv + item.intercept_uv,
            success_pv: acc.success_pv + item.success_pv,
            success_uv: acc.success_uv + item.success_uv,
            order_count: acc.order_count + item.order_count,
            gmv: acc.gmv + Number(item.gmv),
          }),
          {
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
          creation_order_rate_uv:
            baseSummary.creation_uv > 0
              ? (baseSummary.order_count / baseSummary.creation_uv) * 100
              : 0,
          view_order_rate_uv:
            baseSummary.view_uv > 0
              ? (baseSummary.order_count / baseSummary.view_uv) * 100
              : 0,
          creation_intercept_rate_uv:
            baseSummary.creation_uv > 0
              ? (baseSummary.intercept_uv / baseSummary.creation_uv) * 100
              : 0,
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

  // 导出分天详细 Excel
  const handleExportExcel = () => {
    try {
      if (!biData || biData.length === 0) {
        alert('暂无数据可导出');
        return;
      }

      // 构建表头
      const headers = [
        '日期',
        '端类型',
        '四级频道',
        '频道ID',
        '二级频道',
        '三级热词',
        ...visibleColumns.map(colKey => {
          const metric = CHANNEL_BI_METRICS.find(m => m.key === colKey);
          return metric?.label || colKey;
        }),
      ];

      // 构建数据行 - 使用原始分天数据
      const rows: string[][] = [];

      // 按日期排序，然后按频道排序
      const sortedData = [...biData].sort((a, b) => {
        // 先按日期降序
        const dateCompare = dayjs(b.date).valueOf() - dayjs(a.date).valueOf();
        if (dateCompare !== 0) return dateCompare;
        // 再按频道名称排序
        const channelA = a.channel?.display_name || '';
        const channelB = b.channel?.display_name || '';
        return channelA.localeCompare(channelB);
      });

      sortedData.forEach(item => {
        // 计算衍生指标
        const calculatedMetrics: Record<string, number> = {
          view_value_uv: item.view_uv > 0 ? Number(item.gmv) / item.view_uv : 0,
          click_value_uv:
            item.template_click_uv > 0
              ? Number(item.gmv) / item.template_click_uv
              : 0,
          creation_value_uv:
            item.creation_uv > 0 ? Number(item.gmv) / item.creation_uv : 0,
          creation_success_rate_uv:
            item.creation_uv > 0
              ? (item.success_uv / item.creation_uv) * 100
              : 0,
          creation_order_rate_uv:
            item.creation_uv > 0
              ? (item.order_count / item.creation_uv) * 100
              : 0,
          view_order_rate_uv:
            item.view_uv > 0 ? (item.order_count / item.view_uv) * 100 : 0,
          creation_intercept_rate_uv:
            item.creation_uv > 0
              ? (item.intercept_uv / item.creation_uv) * 100
              : 0,
        };

        const row: (string | number)[] = [
          dayjs(item.date).format('YYYY-MM-DD'),
          item.device || '-',
          item.channel?.display_name || `频道${item.source}`,
          item.source || '',
          item.channel?.parent?.parent?.display_name ||
            item.channel?.parent?.parent?.alias ||
            '-',
          item.channel?.parent?.display_name ||
            item.channel?.parent?.alias ||
            '-',
          ...visibleColumns.map(colKey => {
            const metric = CHANNEL_BI_METRICS.find(m => m.key === colKey);
            // 优先使用计算的衍生指标，否则使用原始数据
            const value =
              calculatedMetrics[colKey] !== undefined
                ? calculatedMetrics[colKey]
                : (item as any)[colKey] || 0;
            return formatValue(Number(value), metric);
          }),
        ];
        rows.push(row.map(String));
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

      // 生成文件名（包含日期范围）
      const dateStr = `${dateFrom}_${dateTo}`;
      link.setAttribute('download', `频道看板分天详细_${dateStr}.csv`);

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
            <h1 className='text-2xl font-bold text-slate-900'>频道看板</h1>
            <p className='text-slate-500 mt-1'>
              从2026.1.7开始，查看各个四级频道的汇总信息，包括曝光、点击、创作、拦截、成功和商业指标
            </p>
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={handleExportExcel}
            disabled={!biData || biData.length === 0}
          >
            <Download className='w-4 h-4' />
            导出分天详细excel
          </Button>
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
                      {/* 频道ID选项 */}
                      <div className='mb-4'>
                        <h5 className='text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2'>
                          基础信息
                        </h5>
                        <div className='space-y-2'>
                          <label className='flex items-center gap-2 cursor-pointer group hover:bg-slate-50 p-1 rounded -mx-1'>
                            <div
                              onClick={() => setShowChannelId(!showChannelId)}
                              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                showChannelId
                                  ? 'bg-blue-500 border-blue-500'
                                  : 'bg-white border-slate-300'
                              }`}
                            >
                              {showChannelId && (
                                <CheckSquare size={12} className='text-white' />
                              )}
                            </div>
                            <span
                              className={`text-sm ${
                                showChannelId
                                  ? 'text-slate-700'
                                  : 'text-slate-500'
                              }`}
                            >
                              频道ID
                            </span>
                          </label>
                        </div>
                      </div>
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
                <TableHeader className='bg-white'>
                  <TableRow>
                    <TableHead className='w-[120px] sticky left-0 z-10 bg-white'>频道</TableHead>
                    {showChannelId && (
                      <TableHead className='w-[100px] sticky left-[120px] z-10 bg-white'>频道ID</TableHead>
                    )}
                    {visibleColumns.map(colKey => {
                      const metric = CHANNEL_BI_METRICS.find(
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
                  {level2GroupsArray.map(level2 => {
                    const level2Expanded = expandedLevel2[level2.key] ?? false;
                    return (
                      <React.Fragment key={`level2-group-${level2.key}`}>
                        <TableRow
                          key={`level2-${level2.key}`}
                          className='bg-white hover:bg-white'
                        >
                          <TableCell className='sticky left-0 z-10 bg-white'>
                            <button
                              type='button'
                              className='flex items-center gap-1 text-left text-slate-900'
                              onClick={() => {
                                const isExpanded =
                                  expandedLevel2[level2.key] ?? false;
                                setExpandedLevel2(prev => ({
                                  ...prev,
                                  [level2.key]: !isExpanded,
                                }));
                              }}
                            >
                              {level2Expanded ? (
                                <ChevronDown className='w-4 h-4 text-slate-500' />
                              ) : (
                                <ChevronRight className='w-4 h-4 text-slate-500' />
                              )}
                              {level2.level2ThumbPath && (
                                <img
                                  src={cdnApi(level2.level2ThumbPath)}
                                  alt={level2.level2Name}
                                  className='w-5 h-5 object-contain'
                                />
                              )}
                              <span className='font-medium'>
                                {level2.level2Name}
                              </span>
                            </button>
                          </TableCell>
                          {showChannelId && (
                            <TableCell className='sticky left-[120px] z-10 bg-white'>-</TableCell>
                          )}
                          {visibleColumns.map(colKey => {
                            const metric = CHANNEL_BI_METRICS.find(
                              m => m.key === colKey
                            );
                            const value = (
                              level2.metrics as Record<string, number>
                            )[colKey] as number;
                            return (
                              <TableCell
                                key={colKey}
                                className='text-right font-medium'
                              >
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
                        {level2Expanded &&
                          level2.level3Groups.map(level3 => {
                            const level3Expanded =
                              expandedLevel3[level3.key] ?? false;
                            return (
                              <React.Fragment key={`level3-group-${level3.key}`}>
                                <TableRow
                                  key={`level3-${level3.key}`}
                                  className='bg-slate-100 hover:bg-slate-100'
                                >
                                  <TableCell className='pl-6 sticky left-0 z-10 bg-slate-100'>
                                    <button
                                      type='button'
                                      className='flex items-center gap-1 text-left text-slate-900'
                                      onClick={() => {
                                        const isExpanded =
                                          expandedLevel3[level3.key] ?? false;
                                        setExpandedLevel3(prev => ({
                                          ...prev,
                                          [level3.key]: !isExpanded,
                                        }));
                                      }}
                                    >
                                      {level3Expanded ? (
                                        <ChevronDown className='w-4 h-4 text-slate-500' />
                                      ) : (
                                        <ChevronRight className='w-4 h-4 text-slate-500' />
                                      )}
                                      <span className='font-normal'>
                                        {level3.level3Name}
                                      </span>
                                    </button>
                                  </TableCell>
                                  {showChannelId && (
                                    <TableCell className='sticky left-[120px] z-10 bg-slate-100'>-</TableCell>
                                  )}
                                  {visibleColumns.map(colKey => {
                                    const metric = CHANNEL_BI_METRICS.find(
                                      m => m.key === colKey
                                    );
                                    const value = (
                                      level3.metrics as Record<string, number>
                                    )[colKey] as number;
                                    return (
                                      <TableCell
                                        key={colKey}
                                        className='text-right'
                                      >
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
                                {level3Expanded &&
                                  level3.children.map(
                                    (item: any, index: number) => (
                                      <TableRow
                                        key={`level4-${level3.key}-${index}`}
                                        className='bg-white hover:bg-white'
                                      >
                                        <TableCell className='pl-10 sticky left-0 z-10 bg-white'>
                                          {item.channelName}
                                        </TableCell>
                                        {showChannelId && (
                                          <TableCell className='sticky left-[120px] z-10 bg-white'>{item.channelId}</TableCell>
                                        )}
                                        {visibleColumns.map(colKey => {
                                          const metric = CHANNEL_BI_METRICS.find(
                                            m => m.key === colKey
                                          );
                                          const value = item[
                                            colKey as keyof typeof item
                                          ] as number;
                                          return (
                                            <TableCell
                                              key={colKey}
                                              className='text-right'
                                            >
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
                                    )
                                  )}
                              </React.Fragment>
                            );
                          })}
                      </React.Fragment>
                    );
                  })}
                  {/* 汇总行 */}
                  {summary && (
                    <TableRow className='bg-slate-50 hover:bg-slate-50 font-semibold'>
                      <TableCell className='sticky left-0 z-10 bg-slate-50'>合计</TableCell>
                      {showChannelId && (
                        <TableCell className='sticky left-[120px] z-10 bg-slate-50'>-</TableCell>
                      )}
                      {visibleColumns.map(colKey => {
                        const metric = CHANNEL_BI_METRICS.find(
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

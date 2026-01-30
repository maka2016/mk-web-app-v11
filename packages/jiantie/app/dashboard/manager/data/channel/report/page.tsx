'use client';

import { trpc } from '@/utils/trpc';
import type { ChannelDailyStatisticsEntity } from '@mk/jiantie/v11-database/generated/client/client';
import {
  ArrowDownRight,
  ChevronDown,
  ChevronRight,
  DollarSign,
  FileText,
  MousePointer,
  TrendingUp,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  ColumnSelector,
  StatCard,
  renderMetricCell,
} from '../shared/components';
import {
  REPORT_METRICS,
  clientTypes,
  formatMoney,
  formatNumber,
} from '../shared/constants';

// 计算衍生指标
const calculateDerivedMetrics = (data: any) => {
  return {
    ...data,
    // 转化率指标
    view_click_rate_uv:
      data.view_uv > 0 ? (data.click_uv / data.view_uv) * 100 : 0,
    view_creation_rate_uv:
      data.view_uv > 0 ? (data.creation_uv / data.view_uv) * 100 : 0,
    click_creation_rate_uv:
      data.click_uv > 0 ? (data.creation_uv / data.click_uv) * 100 : 0,
    view_intercept_rate_pv:
      data.view_pv > 0 ? (data.intercept_pv / data.view_pv) * 100 : 0,
    view_intercept_rate_uv:
      data.view_uv > 0 ? (data.intercept_uv / data.view_uv) * 100 : 0,
    view_order_rate_uv:
      data.view_uv > 0 ? (data.order_count / data.view_uv) * 100 : 0,
    creation_order_rate_uv:
      data.creation_uv > 0 ? (data.order_count / data.creation_uv) * 100 : 0,
    creation_intercept_rate_uv:
      data.creation_uv > 0 ? (data.intercept_uv / data.creation_uv) * 100 : 0,
    click_order_rate_uv:
      data.click_uv > 0 ? (data.order_count / data.click_uv) * 100 : 0,
    // 价值指标
    view_value_pv:
      data.view_pv > 0 ? data.transaction_amount / data.view_pv : 0,
    view_value_uv:
      data.view_uv > 0 ? data.transaction_amount / data.view_uv : 0,
    click_value_uv:
      data.click_uv > 0 ? data.transaction_amount / data.click_uv : 0,
    creation_value_uv:
      data.creation_uv > 0 ? data.transaction_amount / data.creation_uv : 0,
  };
};

// 频道报表表格组件
const ChannelReportTable = ({
  data,
  visibleColumns,
  selectedPeriod,
}: {
  data: ChannelDailyStatisticsEntity[];
  visibleColumns: string[];
  selectedPeriod: string;
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expandedLevel2, setExpandedLevel2] = useState<Set<number>>(new Set());
  const [expandedLevel3, setExpandedLevel3] = useState<Set<number>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollHandleRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);

  const toggleExpandLevel2 = (level2Id: number) => {
    setExpandedLevel2(prev => {
      const next = new Set(prev);
      if (next.has(level2Id)) {
        next.delete(level2Id);
      } else {
        next.add(level2Id);
      }
      return next;
    });
  };

  const toggleExpandLevel3 = (level3Id: number) => {
    setExpandedLevel3(prev => {
      const next = new Set(prev);
      if (next.has(level3Id)) {
        next.delete(level3Id);
      } else {
        next.add(level3Id);
      }
      return next;
    });
  };

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
  }, [data, visibleColumns, expandedLevel2, expandedLevel3]);

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

  // 按频道聚合统计数据
  const summaryMap = new Map<number, any>();

  for (const stat of data) {
    const channelId = stat.channel_id;
    if (!summaryMap.has(channelId)) {
      summaryMap.set(channelId, {
        channel_id: channelId,
        channel: (stat as any).channel || null,
        view_pv: 0,
        view_uv: 0,
        click_pv: 0,
        click_uv: 0,
        creation_pv: 0,
        creation_uv: 0,
        intercept_pv: 0,
        intercept_uv: 0,
        order_count: 0,
        transaction_amount: 0,
      });
    }

    const summary = summaryMap.get(channelId)!;
    summary.view_pv += stat.view_pv;
    summary.view_uv += stat.view_uv;
    summary.click_pv += stat.click_pv;
    summary.click_uv += stat.click_uv;
    summary.creation_pv += stat.creation_pv;
    summary.creation_uv += stat.creation_uv;
    summary.intercept_pv += stat.intercept_pv;
    summary.intercept_uv += stat.intercept_uv;
    summary.order_count += stat.order_count;
    summary.transaction_amount += Number(stat.transaction_amount);
  }

  // 计算衍生指标
  const channelSummaries = Array.from(summaryMap.values()).map(channel =>
    calculateDerivedMetrics(channel)
  );

  // 按二级频道 -> 三级热词 -> 四级标签分组
  // 结构：Map<level2Id, { level2Channel, level3Groups: Map<level3Id, { level3Channel, level4Tags } }>
  const groupedByLevel2 = new Map<
    number,
    {
      level2Channel: any;
      level3Groups: Map<
        number,
        {
          level3Channel: any;
          level4Tags: typeof channelSummaries;
        }
      >;
    }
  >();

  for (const channel of channelSummaries) {
    const channelData = channel.channel;
    if (!channelData) continue;

    // 四级标签的层级关系：四级标签 -> 三级热词 -> 二级频道
    if (channelData.class === '四级标签' && channelData.parent) {
      const level3Channel = channelData.parent;
      const level2Channel = level3Channel.parent;

      if (
        level3Channel.class === '三级热词' &&
        level2Channel?.class === '二级频道'
      ) {
        const level2Id = level2Channel.id;
        const level3Id = level3Channel.id;

        // 初始化二级频道分组
        if (!groupedByLevel2.has(level2Id)) {
          groupedByLevel2.set(level2Id, {
            level2Channel,
            level3Groups: new Map(),
          });
        }

        const level2Group = groupedByLevel2.get(level2Id)!;

        // 初始化三级热词分组
        if (!level2Group.level3Groups.has(level3Id)) {
          level2Group.level3Groups.set(level3Id, {
            level3Channel,
            level4Tags: [],
          });
        }

        // 添加四级标签
        level2Group.level3Groups.get(level3Id)!.level4Tags.push(channel);
      }
    }
  }

  const sortedLevel2Ids = Array.from(groupedByLevel2.keys()).sort((a, b) => {
    const level2A = groupedByLevel2.get(a)?.level2Channel;
    const level2B = groupedByLevel2.get(b)?.level2Channel;
    if (level2A && level2B) {
      const weightA = level2A.sort_weight ?? 0;
      const weightB = level2B.sort_weight ?? 0;
      // 按 sort_weight 从大到小排序
      if (weightA !== weightB) {
        return weightB - weightA;
      }
      // 如果 sort_weight 相同，则按 id 排序
      return (level2A.id || 0) - (level2B.id || 0);
    }
    return a - b;
  });

  // 构建表格行的辅助函数
  const buildTableRows = (includeAllChildren: boolean) => {
    const rows: Array<{
      type: 'level2' | 'level3' | 'level4';
      data: any;
      level2Channel?: any;
      level3Channel?: any;
      level2Id?: number;
      level3Id?: number;
    }> = [];

    for (const level2Id of sortedLevel2Ids) {
      const level2Group = groupedByLevel2.get(level2Id)!;
      const level2Channel = level2Group.level2Channel;

      // 计算二级频道汇总数据（所有三级热词下的所有四级标签）
      let level2Summary = {
        view_pv: 0,
        view_uv: 0,
        click_pv: 0,
        click_uv: 0,
        creation_pv: 0,
        creation_uv: 0,
        intercept_pv: 0,
        intercept_uv: 0,
        order_count: 0,
        transaction_amount: 0,
      };

      for (const level3Group of level2Group.level3Groups.values()) {
        for (const level4Tag of level3Group.level4Tags) {
          level2Summary.view_pv += level4Tag.view_pv;
          level2Summary.view_uv += level4Tag.view_uv;
          level2Summary.click_pv += level4Tag.click_pv;
          level2Summary.click_uv += level4Tag.click_uv;
          level2Summary.creation_pv += level4Tag.creation_pv;
          level2Summary.creation_uv += level4Tag.creation_uv;
          level2Summary.intercept_pv += level4Tag.intercept_pv;
          level2Summary.intercept_uv += level4Tag.intercept_uv;
          level2Summary.order_count += level4Tag.order_count;
          level2Summary.transaction_amount += level4Tag.transaction_amount;
        }
      }

      // 添加二级频道行
      rows.push({
        type: 'level2',
        data: {
          channel_id: level2Channel.id,
          channel: level2Channel,
          ...calculateDerivedMetrics(level2Summary),
        },
        level2Id,
      });

      const shouldShowLevel3 =
        includeAllChildren || expandedLevel2.has(level2Id);

      if (shouldShowLevel3) {
        const sortedLevel3Ids = Array.from(
          level2Group.level3Groups.keys()
        ).sort((a, b) => {
          const level3A = level2Group.level3Groups.get(a)?.level3Channel;
          const level3B = level2Group.level3Groups.get(b)?.level3Channel;
          if (level3A && level3B) {
            const weightA = level3A.sort_weight ?? 0;
            const weightB = level3B.sort_weight ?? 0;
            // 按 sort_weight 从大到小排序
            if (weightA !== weightB) {
              return weightB - weightA;
            }
            // 如果 sort_weight 相同，则按 id 排序
            return (level3A.id || 0) - (level3B.id || 0);
          }
          return a - b;
        });

        for (const level3Id of sortedLevel3Ids) {
          const level3Group = level2Group.level3Groups.get(level3Id)!;
          const level3Channel = level3Group.level3Channel;

          // 计算三级热词汇总数据（该三级热词下的所有四级标签）
          const level3Summary = calculateDerivedMetrics(
            level3Group.level4Tags.reduce(
              (acc, level4Tag) => ({
                view_pv: acc.view_pv + level4Tag.view_pv,
                view_uv: acc.view_uv + level4Tag.view_uv,
                click_pv: acc.click_pv + level4Tag.click_pv,
                click_uv: acc.click_uv + level4Tag.click_uv,
                creation_pv: acc.creation_pv + level4Tag.creation_pv,
                creation_uv: acc.creation_uv + level4Tag.creation_uv,
                intercept_pv: acc.intercept_pv + level4Tag.intercept_pv,
                intercept_uv: acc.intercept_uv + level4Tag.intercept_uv,
                order_count: acc.order_count + level4Tag.order_count,
                transaction_amount:
                  acc.transaction_amount + level4Tag.transaction_amount,
              }),
              {
                view_pv: 0,
                view_uv: 0,
                click_pv: 0,
                click_uv: 0,
                creation_pv: 0,
                creation_uv: 0,
                intercept_pv: 0,
                intercept_uv: 0,
                order_count: 0,
                transaction_amount: 0,
              }
            )
          );

          // 添加三级热词行
          rows.push({
            type: 'level3',
            data: {
              channel_id: level3Channel.id,
              channel: level3Channel,
              ...level3Summary,
            },
            level2Channel,
            level3Channel,
            level2Id,
            level3Id,
          });

          const shouldShowLevel4 =
            includeAllChildren || expandedLevel3.has(level3Id);

          if (shouldShowLevel4) {
            // 按 sort_weight 排序四级标签
            const sortedLevel4Tags = [...level3Group.level4Tags].sort(
              (a, b) => {
                const channelA = a.channel;
                const channelB = b.channel;
                if (channelA && channelB) {
                  const weightA = channelA.sort_weight ?? 0;
                  const weightB = channelB.sort_weight ?? 0;
                  // 按 sort_weight 从大到小排序
                  if (weightA !== weightB) {
                    return weightB - weightA;
                  }
                  // 如果 sort_weight 相同，则按 id 排序
                  return (channelA.id || 0) - (channelB.id || 0);
                }
                return 0;
              }
            );
            // 添加四级标签行
            for (const level4Tag of sortedLevel4Tags) {
              rows.push({
                type: 'level4',
                data: level4Tag,
                level2Channel,
                level3Channel,
                level2Id,
                level3Id,
              });
            }
          }
        }
      }
    }

    return rows;
  };

  const tableRows = buildTableRows(false);

  // 根据指标类型获取列宽
  const getColumnWidth = (format?: string): string => {
    switch (format) {
      case 'currency':
        return 'min-w-[120px] w-[120px]'; // 成交金额等货币类型需要更宽
      case 'percent':
        return 'min-w-[100px] w-[100px]'; // 百分比类型
      case 'number':
        return 'min-w-[90px] w-[90px]'; // 数字类型
      default:
        return 'min-w-[90px] w-[90px]';
    }
  };

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
      case 'percent':
        return `${numValue.toFixed(3)}%`;
      case 'score':
        return numValue.toFixed(4);
      default:
        return String(numValue);
    }
  };

  // 导出CSV文件
  const handleExportCSV = () => {
    // 构建表头
    const headers = [
      '频道 / 细分分类 / 标签楼层',
      ...visibleColumns.map(colKey => {
        const metric = REPORT_METRICS.find(d => d.key === colKey);
        return metric ? metric.label : colKey;
      }),
    ];

    // 构建完整的数据行（包括所有展开和未展开的子级）
    const allTableRows = buildTableRows(true);
    const rows: string[][] = [];

    for (const row of allTableRows) {
      const channel = row.data;
      const channelName =
        channel.channel?.display_name || `频道 ${channel.channel_id}`;
      const rowData: string[] = [channelName];

      for (const colKey of visibleColumns) {
        const metric = REPORT_METRICS.find(d => d.key === colKey);
        const value = channel[colKey as keyof typeof channel] as number;
        const formattedValue = formatCSVValue(
          value || 0,
          colKey,
          metric?.format
        );
        rowData.push(formattedValue);
      }

      rows.push(rowData);
    }

    // 将数据转换为CSV格式
    const csvContent = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
      ...rows.map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
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

    // 生成文件名（包含当前日期）
    const dateStr = new Date()
      .toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      .replace(/\//g, '-');
    link.setAttribute('download', `频道报表-${dateStr}.csv`);

    // 触发下载
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 释放URL对象
    URL.revokeObjectURL(url);
  };

  return (
    <div className='bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-6 sticky top-[100px] z-20'>
      <div className='px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50'>
        <h3 className='font-bold text-slate-800 flex items-center gap-2 whitespace-nowrap'>
          <FileText size={18} className='text-blue-600' /> 频道分类经营明细
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
        <table className='w-full text-left text-sm table-fixed'>
          <thead className='sticky top-0 z-10'>
            <tr className='bg-slate-50 text-slate-500 border-b border-slate-200'>
              <th className='px-6 py-3 font-medium w-48 sticky left-0 top-0 bg-slate-50 z-20 whitespace-nowrap'>
                频道 / 细分分类 / 标签楼层
              </th>
              {visibleColumns.map(colKey => {
                const metric = REPORT_METRICS.find(d => d.key === colKey);
                return (
                  <th
                    key={colKey}
                    className={`px-4 py-3 font-medium text-right whitespace-nowrap bg-slate-50 ${getColumnWidth(metric?.format)}`}
                  >
                    {metric?.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-100'>
            {tableRows.map((row, index) => {
              const channel = row.data;
              const isLevel2 = row.type === 'level2';
              const isLevel3 = row.type === 'level3';
              const isLevel4 = row.type === 'level4';

              const isLevel2Expanded =
                row.level2Id !== undefined && expandedLevel2.has(row.level2Id);
              const isLevel3Expanded =
                row.level3Id !== undefined && expandedLevel3.has(row.level3Id);

              // 三级热词可以点击跳转
              const hotWordId = isLevel3 ? channel.channel?.id : null;
              // 四级标签可以点击跳转
              const floorId = isLevel4 ? channel.channel_id : null;
              const level4HotWordId = isLevel4 ? row.level3Id : null;

              return (
                <tr
                  key={`${row.type}-${channel.channel_id}-${index}`}
                  className={`hover:bg-slate-50 group ${isLevel2
                    ? 'bg-slate-50'
                    : isLevel3
                      ? 'bg-slate-50/30'
                      : 'bg-white'
                    } ${isLevel3 || isLevel4 ? 'cursor-pointer' : ''}`}
                >
                  <td
                    className={`px-6 py-4 sticky left-0 z-10 border-r border-transparent group-hover:border-slate-100 ${isLevel2
                      ? 'bg-slate-50 group-hover:bg-slate-100'
                      : isLevel3
                        ? 'bg-slate-50/30 group-hover:bg-slate-50'
                        : 'bg-white group-hover:bg-slate-50'
                      }`}
                  >
                    <div
                      className={`flex items-center gap-2 ${isLevel2
                        ? 'font-bold text-slate-800 cursor-pointer'
                        : isLevel3
                          ? 'text-slate-700 pl-6 cursor-pointer hover:text-blue-600 font-medium'
                          : isLevel4
                            ? 'text-slate-600 pl-12 cursor-pointer hover:text-blue-600 transition-colors'
                            : 'text-slate-600 pl-12'
                        }`}
                      onClick={e => {
                        e.stopPropagation();
                        if (isLevel2 && row.level2Id !== undefined) {
                          toggleExpandLevel2(row.level2Id);
                        } else if (isLevel3 && row.level3Id !== undefined) {
                          toggleExpandLevel3(row.level3Id);
                        } else if (isLevel3 && hotWordId) {
                          // 跳转到模板排名页时，带上统一的 timeRange 参数
                          let timeRange:
                            | 'today'
                            | 'yesterday'
                            | '7days'
                            | '14days'
                            | 'history' = '14days';

                          if (selectedPeriod === 'today') {
                            timeRange = 'today';
                          } else if (selectedPeriod === 'yesterday') {
                            timeRange = 'yesterday';
                          } else if (selectedPeriod === 'near7') {
                            timeRange = '7days';
                          } else if (selectedPeriod === 'near30') {
                            timeRange = 'history';
                          } else if (
                            selectedPeriod === 'thisMonth' ||
                            selectedPeriod === 'lastMonth'
                          ) {
                            timeRange = 'history';
                          }

                          const typeapp = searchParams.get('typeapp');
                          router.push(
                            `/dashboard/manager/data/channel/ranking?typeapp=${typeapp}&hotWordId=${hotWordId}&timeRange=${timeRange}`
                          );
                        } else if (isLevel4 && floorId && level4HotWordId) {
                          // 四级标签跳转到模板排名页
                          let timeRange:
                            | 'today'
                            | 'yesterday'
                            | '7days'
                            | '14days'
                            | 'history' = '14days';

                          if (selectedPeriod === 'today') {
                            timeRange = 'today';
                          } else if (selectedPeriod === 'yesterday') {
                            timeRange = 'yesterday';
                          } else if (selectedPeriod === 'near7') {
                            timeRange = '7days';
                          } else if (selectedPeriod === 'near30') {
                            timeRange = 'history';
                          } else if (
                            selectedPeriod === 'thisMonth' ||
                            selectedPeriod === 'lastMonth'
                          ) {
                            timeRange = 'history';
                          }

                          const typeapp = searchParams.get('typeapp');
                          router.push(
                            `/dashboard/manager/data/channel/ranking?typeapp=${typeapp}&hotWordId=${level4HotWordId}&floorId=${floorId}&timeRange=${timeRange}`
                          );
                        }
                      }}
                    >
                      {isLevel3 && (
                        <div className='absolute left-0 top-0 bottom-0 w-4 flex items-center justify-center'>
                          <div className='w-px h-full bg-slate-200'></div>
                          <div className='absolute w-1.5 h-1.5 rounded-full bg-slate-400'></div>
                        </div>
                      )}
                      {isLevel4 && (
                        <div className='absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center'>
                          <div className='w-px h-full bg-slate-200'></div>
                          <div className='absolute left-4 w-1.5 h-1.5 rounded-full bg-slate-300'></div>
                        </div>
                      )}
                      {isLevel2 && row.level2Id !== undefined && (
                        <div className='flex-shrink-0'>
                          {isLevel2Expanded ? (
                            <ChevronDown size={16} className='text-blue-600' />
                          ) : (
                            <ChevronRight size={16} className='text-blue-600' />
                          )}
                        </div>
                      )}
                      {isLevel3 && row.level3Id !== undefined && (
                        <div className='flex-shrink-0'>
                          {isLevel3Expanded ? (
                            <ChevronDown size={14} className='text-blue-500' />
                          ) : (
                            <ChevronRight size={14} className='text-blue-500' />
                          )}
                        </div>
                      )}
                      <span className='whitespace-nowrap overflow-hidden text-ellipsis block'>
                        {channel.channel?.display_name ||
                          `频道 ${channel.channel_id}`}
                      </span>
                    </div>
                  </td>
                  {visibleColumns.map(colKey => {
                    const metric = REPORT_METRICS.find(d => d.key === colKey);
                    return (
                      <td
                        key={colKey}
                        className={`px-4 py-4 text-right whitespace-nowrap ${isLevel2 || isLevel3 ? 'font-semibold' : ''
                          } ${getColumnWidth(metric?.format)}`}
                      >
                        {renderMetricCell(
                          channel[colKey as keyof typeof channel] as number,
                          metric!
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const STORAGE_KEY = 'channel-report-visible-columns';
const DEFAULT_VISIBLE_COLUMNS = [
  'view_uv',
  'click_uv',
  'creation_uv',
  'order_count',
  'transaction_amount',
  'view_click_rate_uv',
  'click_creation_rate_uv',
  'view_value_uv',
  'creation_value_uv',
];

export default function ReportPage() {
  const searchParams = useSearchParams();
  const typeapp = searchParams.get('typeapp');

  // 从 localStorage 读取保存的指标配置
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
      console.error('读取指标配置失败:', error);
    }
    return DEFAULT_VISIBLE_COLUMNS;
  });
  const [clientFilter, setClientFilter] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('today');

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

  const [statistics, setStatistics] = useState<
    ChannelDailyStatisticsEntity[]
  >([]);
  const [summary, setSummary] = useState<
    Array<{
      channel_id: number;
      channel: any;
      view_pv: number;
      view_uv: number;
      click_pv: number;
      click_uv: number;
      creation_pv: number;
      creation_uv: number;
      intercept_pv: number;
      intercept_uv: number;
      order_count: number;
      transaction_amount: number;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  const { dateFrom, dateTo } = getDateRange();

  useEffect(() => {
    // 根据 typeapp 过滤数据的函数
    const filterByTypeapp = (item: any) => {
      const channelData = item.channel;
      if (!channelData) return true;

      // 如果是四级标签，需要检查其三级热词的父级（二级频道）的父级（一级栏目）
      if (channelData.class === '四级标签' && channelData.parent) {
        const level3Channel = channelData.parent;
        const level2Channel = level3Channel.parent;
        const level1Channel = level2Channel?.parent;

        // 如果 typeapp 为 jiantie，只保留一级栏目 name 为"个人"的二级频道
        if (typeapp === 'jiantie') {
          return level1Channel?.display_name === '个人';
        }
        // 如果 typeapp 为 maka，只保留一级栏目 name 为"商业"的二级频道
        if (typeapp === 'maka') {
          return level1Channel?.display_name === '商业';
        }
      }

      // 如果没有 typeapp 参数或不符合条件，保留所有数据
      return true;
    };

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [statsData, summaryData] = await Promise.all([
          trpc.channel.getChannelStatistics.query({
            dateFrom,
            dateTo,
            device: clientFilter as any,
          }),
          trpc.channel.getChannelStatisticsSummary.query({
            dateFrom,
            dateTo,
            device: clientFilter as any,
          }),
        ]);
        // 根据 typeapp 过滤数据
        const filteredStats = (statsData || []).filter(filterByTypeapp);
        const filteredSummary = (summaryData || []).filter(filterByTypeapp);
        setStatistics(filteredStats);
        setSummary(filteredSummary);
      } catch (error) {
        console.error('获取统计数据失败:', error);
        setStatistics([]);
        setSummary([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dateFrom, dateTo, clientFilter, typeapp]);

  const totalStats = summary.length
    ? calculateDerivedMetrics(
      summary.reduce(
        (
          acc: {
            view_pv: number;
            view_uv: number;
            click_pv: number;
            click_uv: number;
            creation_pv: number;
            creation_uv: number;
            intercept_pv: number;
            intercept_uv: number;
            order_count: number;
            transaction_amount: number;
          },
          item: {
            view_pv: number;
            view_uv: number;
            click_pv: number;
            click_uv: number;
            creation_pv: number;
            creation_uv: number;
            intercept_pv: number;
            intercept_uv: number;
            order_count: number;
            transaction_amount: number;
          }
        ) => ({
          view_pv: acc.view_pv + item.view_pv,
          view_uv: acc.view_uv + item.view_uv,
          click_pv: acc.click_pv + item.click_pv,
          click_uv: acc.click_uv + item.click_uv,
          creation_pv: acc.creation_pv + item.creation_pv,
          creation_uv: acc.creation_uv + item.creation_uv,
          intercept_pv: acc.intercept_pv + item.intercept_pv,
          intercept_uv: acc.intercept_uv + item.intercept_uv,
          order_count: acc.order_count + item.order_count,
          transaction_amount:
            acc.transaction_amount + item.transaction_amount,
        }),
        {
          view_pv: 0,
          view_uv: 0,
          click_pv: 0,
          click_uv: 0,
          creation_pv: 0,
          creation_uv: 0,
          intercept_pv: 0,
          intercept_uv: 0,
          order_count: 0,
          transaction_amount: 0,
        }
      )
    )
    : null;

  const periods = [
    { id: 'today', label: '今日' },
    { id: 'yesterday', label: '昨日' },
    { id: 'near7', label: '近7天' },
    { id: 'near30', label: '近30天' },
    { id: 'thisMonth', label: '本月' },
    { id: 'lastMonth', label: '上月' },
  ];

  return (
    <div className='animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6'>
      {/* 筛选器 */}
      <div className='flex flex-wrap items-center justify-between gap-4 mb-6'>
        <div>
          <h2 className='text-xl font-bold text-slate-800'>业务经营概览</h2>
          <p className='text-sm text-slate-500 mt-1'>
            频道数据查看历史周期内的整体业务表现与意图分布（从2025.12.03日12:00开始）
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
      ) : totalStats ? (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-2'>
          <StatCard
            title='总浏览量 (UV)'
            value={formatNumber(totalStats.view_uv)}
            icon={MousePointer}
            color='bg-blue-500'
          />
          <StatCard
            title='总创作用户 (UV)'
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
            title='成交金额 (GMV)'
            value={formatMoney(totalStats.transaction_amount)}
            icon={DollarSign}
            color='bg-green-500'
          />
        </div>
      ) : null}

      {/* 指标配置 */}
      <div className='mb-4 flex justify-end'>
        <ColumnSelector
          definitions={REPORT_METRICS}
          visibleColumns={visibleColumns}
          onChange={setVisibleColumns}
        />
      </div>

      {/* 数据表格 */}
      {isLoading ? (
        <div className='bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-500'>
          加载中...
        </div>
      ) : statistics && statistics.length > 0 ? (
        <ChannelReportTable
          data={statistics}
          visibleColumns={visibleColumns}
          selectedPeriod={selectedPeriod}
        />
      ) : (
        <div className='bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-500'>
          暂无数据
        </div>
      )}
    </div>
  );
}

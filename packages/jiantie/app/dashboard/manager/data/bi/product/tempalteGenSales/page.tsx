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
import { ChevronDown, ChevronRight, Download } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

const PAGE_SIZE = 30;

interface TemplateGenSalesData {
  productionMonth: string;
  designerUid: number;
  designerName: string;
  templateCount: number;
  monthlySales: Record<string, number>;
  monthlyGmv: Record<string, number>;
}

export default function TemplateGenSalesPage() {
  const searchParams = useSearchParams();
  const appid = searchParams.get('appid') || '';

  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState<TemplateGenSalesData[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloadingOrders, setIsDownloadingOrders] = useState(false);
  // 折叠状态：生产月份
  const [expandedProductionMonths, setExpandedProductionMonths] = useState<
    Set<string>
  >(new Set());
  // 折叠状态：销售月份列
  const [expandedSalesMonths, setExpandedSalesMonths] = useState<Set<string>>(
    new Set()
  );
  // 筛选状态：生产月份（控制哪些生产月份显示）
  const [selectedProductionMonths, setSelectedProductionMonths] = useState<
    Set<string>
  >(new Set());
  // 筛选状态：设计师（控制哪些设计师显示）
  const [selectedDesigners, setSelectedDesigners] = useState<Set<number>>(
    new Set()
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const result = await trpc.bi.getTemplateGenSales.query({
          appid: appid || undefined,
        });
        setData(result.data || []);
        setMonths(result.months || []);
        setCurrentPage(1);
        // 默认展开所有生产月份
        const allProductionMonths = new Set(
          (result.data || []).map(item => item.productionMonth)
        );
        setExpandedProductionMonths(allProductionMonths);
        // 默认选中所有生产月份（用于筛选）
        setSelectedProductionMonths(allProductionMonths);
        // 默认选中所有设计师（用于筛选）
        const allDesignerUids = new Set(
          (result.data || []).map(item => item.designerUid)
        );
        setSelectedDesigners(allDesignerUids);
        // 默认展开所有销售月份
        setExpandedSalesMonths(new Set(result.months || []));
      } catch (error) {
        console.error('获取模板产销数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [appid]);

  // 切换生产月份折叠状态
  const toggleProductionMonth = (month: string) => {
    setExpandedProductionMonths(prev => {
      const next = new Set(prev);
      if (next.has(month)) {
        next.delete(month);
      } else {
        next.add(month);
      }
      return next;
    });
  };

  // 切换销售月份列折叠状态
  const toggleSalesMonth = (month: string) => {
    setExpandedSalesMonths(prev => {
      const next = new Set(prev);
      if (next.has(month)) {
        next.delete(month);
      } else {
        next.add(month);
      }
      return next;
    });
  };

  // 切换生产月份筛选状态
  const toggleProductionMonthFilter = (month: string) => {
    setSelectedProductionMonths(prev => {
      const next = new Set(prev);
      if (next.has(month)) {
        next.delete(month);
      } else {
        next.add(month);
      }
      return next;
    });
    setCurrentPage(1); // 重置到第一页
  };

  // 切换设计师筛选状态
  const toggleDesignerFilter = (designerUid: number) => {
    setSelectedDesigners(prev => {
      const next = new Set(prev);
      if (next.has(designerUid)) {
        next.delete(designerUid);
      } else {
        next.add(designerUid);
      }
      return next;
    });
    setCurrentPage(1); // 重置到第一页
  };

  // 获取所有生产月份（用于筛选按钮）
  const allProductionMonths = useMemo(() => {
    const monthsSet = new Set(data.map(item => item.productionMonth));
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [data]);

  // 获取所有设计师（用于筛选按钮）
  const allDesigners = useMemo(() => {
    const designerMap = new Map<number, string>();
    for (const item of data) {
      if (!designerMap.has(item.designerUid)) {
        designerMap.set(item.designerUid, item.designerName);
      }
    }
    return Array.from(designerMap.entries())
      .map(([uid, name]) => ({ uid, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  // 按生产月份分组数据（只包含选中的生产月份和设计师）
  const groupedByProductionMonth = useMemo(() => {
    const grouped = new Map<string, TemplateGenSalesData[]>();
    for (const item of data) {
      // 只处理选中的生产月份
      if (!selectedProductionMonths.has(item.productionMonth)) continue;
      // 只处理选中的设计师
      if (!selectedDesigners.has(item.designerUid)) continue;
      if (!grouped.has(item.productionMonth)) {
        grouped.set(item.productionMonth, []);
      }
      grouped.get(item.productionMonth)!.push(item);
    }
    return grouped;
  }, [data, selectedProductionMonths, selectedDesigners]);

  // 计算分页数据（按生产月份分组后的数据）
  const paginatedData = useMemo(() => {
    const allRows: Array<{
      type: 'productionMonth' | 'designer';
      productionMonth?: string;
      data?: TemplateGenSalesData;
    }> = [];

    // 按生产月份排序
    const sortedProductionMonths = Array.from(
      groupedByProductionMonth.keys()
    ).sort((a, b) => b.localeCompare(a));

    for (const productionMonth of sortedProductionMonths) {
      // 添加生产月份行
      allRows.push({ type: 'productionMonth', productionMonth });

      // 如果该生产月份展开，添加设计师行
      if (expandedProductionMonths.has(productionMonth)) {
        const designers = groupedByProductionMonth.get(productionMonth) || [];
        for (const designer of designers) {
          allRows.push({ type: 'designer', data: designer });
        }
      }
    }

    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return allRows.slice(start, end);
  }, [groupedByProductionMonth, expandedProductionMonths, currentPage]);

  const totalRows = useMemo(() => {
    let count = 0;
    for (const productionMonth of groupedByProductionMonth.keys()) {
      count += 1; // 生产月份行
      if (expandedProductionMonths.has(productionMonth)) {
        count += groupedByProductionMonth.get(productionMonth)?.length || 0;
      }
    }
    return count;
  }, [groupedByProductionMonth, expandedProductionMonths]);

  const totalPages = Math.ceil(totalRows / PAGE_SIZE);

  // 判断某个月份是否应该显示数据（只显示生产月份之后的月份）
  const shouldShowMonth = (productionMonth: string, statMonth: string) => {
    return statMonth >= productionMonth;
  };

  // 计算月汇总数据（基于筛选条件）
  const monthlySummary = useMemo(() => {
    const summary = {
      totalTemplateCount: 0,
      totalSales: {} as Record<string, number>,
      totalGmv: {} as Record<string, number>,
    };

    // 只统计筛选后的数据
    data.forEach(item => {
      // 只处理选中的生产月份
      if (!selectedProductionMonths.has(item.productionMonth)) return;
      // 只处理选中的设计师
      if (!selectedDesigners.has(item.designerUid)) return;

      summary.totalTemplateCount += item.templateCount;
      months.forEach(month => {
        // 只统计生产月份之后的月份
        if (month >= item.productionMonth) {
          summary.totalSales[month] =
            (summary.totalSales[month] || 0) + (item.monthlySales[month] || 0);
          summary.totalGmv[month] =
            (summary.totalGmv[month] || 0) + (item.monthlyGmv[month] || 0);
        }
      });
    });

    return summary;
  }, [data, months, selectedProductionMonths, selectedDesigners]);

  // 格式化函数
  const formatMoney = (val: number) => `¥${val.toLocaleString()}`;
  const formatNumber = (val: number) => val.toLocaleString();

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
      if (data.length === 0) {
        alert('暂无数据可导出');
        return;
      }

      // 构建表头
      const headers = [
        '生产月份',
        '设计师',
        '上架量',
        ...months.map(month => `销量_${month}`),
        ...months.map(month => `销售额_${month}`),
      ];

      // 构建数据行
      const rows = data.map(item => {
        const row: (string | number)[] = [
          item.productionMonth,
          item.designerName,
          item.templateCount,
        ];

        // 添加各月销量
        months.forEach(month => {
          row.push(item.monthlySales[month] || 0);
        });

        // 添加各月销售额
        months.forEach(month => {
          row.push(item.monthlyGmv[month] || 0);
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
        `模板产销数据_${new Date().toISOString().split('T')[0]}.csv`
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

  // 将 UTC ISO 字符串转换为东8区时间的 Date 对象
  // 方法：获取 UTC 时间的各个部分，加上 8 小时，然后创建东8区时间字符串
  const toCSTDate = (isoString: string): Date => {
    const utcDate = new Date(isoString);

    // 获取 UTC 时间的各个部分
    let year = utcDate.getUTCFullYear();
    let month = utcDate.getUTCMonth();
    let date = utcDate.getUTCDate();
    let hours = utcDate.getUTCHours();
    let minutes = utcDate.getUTCMinutes();
    let seconds = utcDate.getUTCSeconds();
    let ms = utcDate.getUTCMilliseconds();

    // 加上 8 小时（东8区）
    hours += 8;

    // 处理跨天、跨月、跨年的情况
    if (hours >= 24) {
      hours -= 24;
      date += 1;
      // 检查是否需要跨月
      const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      if (date > daysInMonth) {
        date = 1;
        month += 1;
        if (month > 11) {
          month = 0;
          year += 1;
        }
      }
    }

    // 创建东8区时间字符串（格式：YYYY-MM-DDTHH:mm:ss.SSS+08:00）
    const cstString = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(3, '0')}+08:00`;
    return new Date(cstString);
  };

  // 从东8区 Date 对象获取月份字符串（格式：YYYYMM）
  const getMonthString = (date: Date): string => {
    // 使用 getFullYear() 和 getMonth() 获取本地时区（东8区）的年月
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return `${year}${String(month).padStart(2, '0')}`;
  };

  // 从东8区 Date 对象格式化日期为 YYYY-MM-DD
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 从东8区 Date 对象格式化时间为 YYYY-MM-DD HH:mm:ss
  const formatDateTime = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  // 下载订单详情
  const handleDownloadOrderDetails = async () => {
    try {
      setIsDownloadingOrders(true);

      // 获取订单详情数据
      const orderDetails = await trpc.bi.getTemplateGenSalesOrderDetails.query({
        appid: appid || undefined,
      });

      if (orderDetails.length === 0) {
        alert('暂无订单数据可导出');
        setIsDownloadingOrders(false);
        return;
      }

      // 构建表头
      const headers = [
        '订单ID',
        '销售日期',
        '销售月份',
        '支付时间',
        '订单金额（元）',
        '模板ID',
        '生产时间',
        '生产月份',
        '设计师UID',
        '设计师名称',
      ];

      // 构建数据行（在前端进行时区转换和格式化）
      const rows = orderDetails.map(order => {
        // 转换为东8区 Date 对象
        const paymentTimeCST = toCSTDate(order.paymentTime);
        const createTimeCST = toCSTDate(order.createTime);

        // 计算月份（基于东8区）
        const salesMonth = getMonthString(paymentTimeCST);
        const productionMonth = getMonthString(createTimeCST);

        return [
          order.orderId,
          formatDate(paymentTimeCST),
          salesMonth,
          formatDateTime(paymentTimeCST),
          order.orderAmount.toFixed(2),
          order.templateId,
          formatDateTime(createTimeCST),
          productionMonth,
          order.designerUid.toString(),
          order.designerName,
        ];
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
        `订单详情_${new Date().toISOString().split('T')[0]}.csv`
      );
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert(`成功导出 ${orderDetails.length} 条订单记录`);
    } catch (error) {
      console.error('导出订单详情失败:', error);
      alert('导出失败，请稍后重试');
    } finally {
      setIsDownloadingOrders(false);
    }
  };

  return (
    <div className='h-dvh bg-slate-50 font-sans text-slate-800 pb-12 overflow-hidden'>
      <main className='max-w-[95vw] mx-auto px-4 sm:px-6 py-8 h-dvh overflow-y-auto pb-32'>
        <div className='space-y-6'>
          {/* 导出按钮和筛选控制 */}
          <div className='space-y-3 mb-4'>
            <div className='flex items-center gap-2 flex-wrap'>
              <span className='text-xs text-slate-600 font-medium'>
                设计师筛选：
              </span>
              <div className='flex flex-wrap gap-1'>
                {allDesigners.map(designer => {
                  const isSelected = selectedDesigners.has(designer.uid);
                  return (
                    <button
                      key={designer.uid}
                      onClick={() => toggleDesignerFilter(designer.uid)}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${isSelected
                        ? 'bg-purple-100 border-purple-300 text-purple-700'
                        : 'bg-slate-100 border-slate-300 text-slate-600'
                        }`}
                    >
                      {designer.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className='flex justify-between items-center gap-3'>
              <div className='flex items-center gap-2 flex-wrap'>
                <span className='text-xs text-slate-600 font-medium'>
                  生产月份筛选：
                </span>
                <div className='flex flex-wrap gap-1'>
                  {allProductionMonths.map(month => {
                    const isSelected = selectedProductionMonths.has(month);
                    return (
                      <button
                        key={month}
                        onClick={() => toggleProductionMonthFilter(month)}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${isSelected
                          ? 'bg-green-100 border-green-300 text-green-700'
                          : 'bg-slate-100 border-slate-300 text-slate-600'
                          }`}
                      >
                        {month}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className='flex items-center gap-2'>
                <button
                  onClick={handleExportCSV}
                  disabled={data.length === 0}
                  className='text-xs flex items-center gap-1.5 text-slate-600 hover:text-blue-600 bg-white border border-slate-200 px-3 py-1.5 rounded shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  <Download size={14} />
                  导出数据
                </button>
                <button
                  onClick={handleDownloadOrderDetails}
                  disabled={isDownloadingOrders}
                  className='text-xs flex items-center gap-1.5 text-slate-600 hover:text-blue-600 bg-white border border-slate-200 px-3 py-1.5 rounded shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  <Download size={14} />
                  {isDownloadingOrders ? '下载中...' : '下载订单详情'}
                </button>
              </div>
            </div>

            <div className='flex items-center gap-2 flex-wrap'>
              <span className='text-xs text-slate-600 font-medium'>
                销售月份列：
              </span>
              <div className='flex flex-wrap gap-1'>
                {months.map(month => {
                  const isExpanded = expandedSalesMonths.has(month);
                  return (
                    <button
                      key={month}
                      onClick={() => toggleSalesMonth(month)}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${isExpanded
                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                        : 'bg-slate-100 border-slate-300 text-slate-600'
                        }`}
                    >
                      {month}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 数据表格 */}
          <div className='bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden'>
            <div className='px-6 py-4 border-b border-slate-200 flex items-center justify-between'>
              <div>
                <h2 className='text-base font-semibold text-slate-800'>
                  模板产销明细
                </h2>
                <p className='text-xs text-slate-500 mt-1'>
                  按生产月数分组，设计师聚合，显示上架量、周期销量和销售额列
                </p>
              </div>
              {isLoading && (
                <div className='text-xs text-slate-400'>加载中...</div>
              )}
            </div>

            {data.length === 0 && !isLoading ? (
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
                        生产月份
                      </th>
                      <th className='px-4 py-3 whitespace-nowrap text-xs font-medium sticky left-[120px] bg-slate-50 z-10'>
                        设计师
                      </th>
                      <th className='px-4 py-3 whitespace-nowrap text-xs font-medium text-right'>
                        上架量
                      </th>
                      {months.map(month => {
                        const isExpanded = expandedSalesMonths.has(month);
                        return (
                          <th
                            key={`sales-${month}`}
                            className='px-4 py-3 whitespace-nowrap text-xs font-medium text-right'
                            style={{
                              display: isExpanded ? 'table-cell' : 'none',
                            }}
                          >
                            销量
                            <br />
                            {month}
                          </th>
                        );
                      })}
                      {months.map(month => {
                        const isExpanded = expandedSalesMonths.has(month);
                        return (
                          <th
                            key={`gmv-${month}`}
                            className='px-4 py-3 whitespace-nowrap text-xs font-medium text-right'
                            style={{
                              display: isExpanded ? 'table-cell' : 'none',
                            }}
                          >
                            销售额
                            <br />
                            {month}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-slate-100'>
                    {paginatedData.map((row, index) => {
                      if (row.type === 'productionMonth') {
                        const productionMonth = row.productionMonth!;
                        const isExpanded =
                          expandedProductionMonths.has(productionMonth);
                        const designers =
                          groupedByProductionMonth.get(productionMonth) || [];
                        const totalTemplateCount = designers.reduce(
                          (sum, d) => sum + d.templateCount,
                          0
                        );
                        const totalSales: Record<string, number> = {};
                        const totalGmv: Record<string, number> = {};
                        designers.forEach(designer => {
                          months.forEach(month => {
                            if (shouldShowMonth(productionMonth, month)) {
                              totalSales[month] =
                                (totalSales[month] || 0) +
                                (designer.monthlySales[month] || 0);
                              totalGmv[month] =
                                (totalGmv[month] || 0) +
                                (designer.monthlyGmv[month] || 0);
                            }
                          });
                        });

                        return (
                          <tr
                            key={`production-${productionMonth}`}
                            className='group hover:bg-slate-50 bg-slate-50 font-semibold'
                          >
                            <td className='px-4 py-3 text-slate-800 text-xs sticky left-0 bg-slate-50 group-hover:bg-slate-100 z-10'>
                              <button
                                onClick={() =>
                                  toggleProductionMonth(productionMonth)
                                }
                                className='flex items-center gap-2 hover:text-blue-600'
                              >
                                {isExpanded ? (
                                  <ChevronDown size={16} />
                                ) : (
                                  <ChevronRight size={16} />
                                )}
                                {productionMonth}
                              </button>
                            </td>
                            <td className='px-4 py-3 text-slate-800 text-xs sticky left-[120px] bg-slate-50 group-hover:bg-slate-100 z-10'>
                              合计 ({designers.length} 位设计师)
                            </td>
                            <td className='px-4 py-3 text-right font-mono text-slate-800 whitespace-nowrap'>
                              {formatNumber(totalTemplateCount)}
                            </td>
                            {months.map(month => {
                              const shouldShow = shouldShowMonth(
                                productionMonth,
                                month
                              );
                              const isExpanded = expandedSalesMonths.has(month);
                              return (
                                <td
                                  key={`sales-${month}`}
                                  className={`px-4 py-3 text-right font-mono whitespace-nowrap ${shouldShow
                                    ? 'text-slate-800'
                                    : 'text-slate-300'
                                    }`}
                                  style={{
                                    display: isExpanded ? 'table-cell' : 'none',
                                  }}
                                >
                                  {shouldShow
                                    ? formatNumber(totalSales[month] || 0)
                                    : '-'}
                                </td>
                              );
                            })}
                            {months.map(month => {
                              const shouldShow = shouldShowMonth(
                                productionMonth,
                                month
                              );
                              const isExpanded = expandedSalesMonths.has(month);
                              return (
                                <td
                                  key={`gmv-${month}`}
                                  className={`px-4 py-3 text-right font-mono whitespace-nowrap ${shouldShow
                                    ? 'text-slate-800'
                                    : 'text-slate-300'
                                    }`}
                                  style={{
                                    display: isExpanded ? 'table-cell' : 'none',
                                  }}
                                >
                                  {shouldShow
                                    ? formatMoney(totalGmv[month] || 0)
                                    : '-'}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      } else {
                        const item = row.data!;
                        return (
                          <tr
                            key={`${item.productionMonth}-${item.designerUid}-${index}`}
                            className='group hover:bg-slate-50'
                          >
                            <td className='px-4 py-3 text-slate-800 text-xs sticky left-0 bg-white group-hover:bg-slate-50 z-10 pl-8'>
                              {item.productionMonth}
                            </td>
                            <td className='px-4 py-3 text-slate-800 text-xs sticky left-[120px] bg-white group-hover:bg-slate-50 z-10'>
                              {item.designerName}
                            </td>
                            <td className='px-4 py-3 text-right font-mono text-slate-800 whitespace-nowrap'>
                              {formatNumber(item.templateCount)}
                            </td>
                            {months.map(month => {
                              const shouldShow = shouldShowMonth(
                                item.productionMonth,
                                month
                              );
                              const isExpanded = expandedSalesMonths.has(month);
                              return (
                                <td
                                  key={`sales-${month}`}
                                  className={`px-4 py-3 text-right font-mono whitespace-nowrap ${shouldShow
                                    ? 'text-slate-800'
                                    : 'text-slate-300'
                                    }`}
                                  style={{
                                    display: isExpanded ? 'table-cell' : 'none',
                                  }}
                                >
                                  {shouldShow
                                    ? formatNumber(
                                      item.monthlySales[month] || 0
                                    )
                                    : '-'}
                                </td>
                              );
                            })}
                            {months.map(month => {
                              const shouldShow = shouldShowMonth(
                                item.productionMonth,
                                month
                              );
                              const isExpanded = expandedSalesMonths.has(month);
                              return (
                                <td
                                  key={`gmv-${month}`}
                                  className={`px-4 py-3 text-right font-mono whitespace-nowrap ${shouldShow
                                    ? 'text-slate-800'
                                    : 'text-slate-300'
                                    }`}
                                  style={{
                                    display: isExpanded ? 'table-cell' : 'none',
                                  }}
                                >
                                  {shouldShow
                                    ? formatMoney(item.monthlyGmv[month] || 0)
                                    : '-'}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      }
                    })}
                    {/* 月汇总行 */}
                    {data.length > 0 && (
                      <tr className='bg-blue-50 font-bold border-t-2 border-blue-300'>
                        <td className='px-4 py-3 text-slate-800 text-xs sticky left-0 bg-blue-50 z-10'>
                          月汇总
                        </td>
                        <td className='px-4 py-3 text-slate-800 text-xs sticky left-[120px] bg-blue-50 z-10'>
                          全部
                        </td>
                        <td className='px-4 py-3 text-right font-mono text-slate-800 whitespace-nowrap'>
                          {formatNumber(monthlySummary.totalTemplateCount)}
                        </td>
                        {months.map(month => {
                          const isExpanded = expandedSalesMonths.has(month);
                          return (
                            <td
                              key={`summary-sales-${month}`}
                              className='px-4 py-3 text-right font-mono text-slate-800 whitespace-nowrap'
                              style={{
                                display: isExpanded ? 'table-cell' : 'none',
                              }}
                            >
                              {formatNumber(
                                monthlySummary.totalSales[month] || 0
                              )}
                            </td>
                          );
                        })}
                        {months.map(month => {
                          const isExpanded = expandedSalesMonths.has(month);
                          return (
                            <td
                              key={`summary-gmv-${month}`}
                              className='px-4 py-3 text-right font-mono text-slate-800 whitespace-nowrap'
                              style={{
                                display: isExpanded ? 'table-cell' : 'none',
                              }}
                            >
                              {formatMoney(monthlySummary.totalGmv[month] || 0)}
                            </td>
                          );
                        })}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 分页控件 */}
            {totalRows > PAGE_SIZE && (
              <div className='px-6 py-4 border-t border-slate-200'>
                <div className='flex items-center justify-between'>
                  <div className='text-sm text-slate-600'>
                    共 {totalRows} 行数据，第 {currentPage} / {totalPages} 页
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

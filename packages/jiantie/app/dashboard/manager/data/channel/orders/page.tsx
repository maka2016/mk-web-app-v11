'use client';

import { getShareUrl } from '@/store';
import { trpc } from '@/utils/trpc';
import { ChevronDown, Download } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

// 订单数据类型
type OrderItem = {
  id: string;
  order_id: string;
  uid: number;
  order_time: Date | string;
  payment_type: string;
  work_id: string | null;
  work_title: string | null;
  template_id: string | null;
  level2_channel_id?: number | null;
  level2_channel_name?: string | null;
  level3_channel_id?: number | null;
  level3_channel_name?: string | null;
  level4_channel_id?: number | null;
  level4_channel_name?: string | null;
  user_register_date?: Date | string | null;
  user_register_source?: string | null;
  payment_time: Date | string;
  amount: number | null; // 订单金额（单位：分）
};

// 格式化日期时间
const formatDateTime = (date: Date | string | null): string => {
  if (!date) return '-';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

// 格式化日期
const formatDate = (date: Date | string | null): string => {
  if (!date) return '-';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 格式化金额（从分转换为元）
const formatAmount = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '-';
  return `¥${(amount / 100).toFixed(2)}`;
};

export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeapp = searchParams.get('typeapp');
  const appid = typeapp || undefined; // 将 typeapp 作为 appid 传递给后端

  const [selectedPeriod, setSelectedPeriod] = useState('near7');
  const [currentPage, setCurrentPage] = useState(1);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const pageSize = 50;

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

  const { dateFrom, dateTo } = getDateRange();

  // 当时间范围或页码变化时，重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPeriod]);

  // 获取订单数据
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        const data = await trpc.channel.getOrderList.query({
          dateFrom,
          dateTo,
          skip: (currentPage - 1) * pageSize,
          take: pageSize,
          appid, // 传递 appid 参数
        });
        setOrders(data?.orders || []);
        setTotal(data.total || 0);
      } catch (error) {
        console.error('获取订单列表失败:', error);
        setOrders([]);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [dateFrom, dateTo, currentPage, pageSize, appid]);

  const totalPages = Math.ceil(total / pageSize);

  // 获取所有订单数据（用于导出）
  const fetchAllOrders = async (): Promise<OrderItem[]> => {
    const allOrders: OrderItem[] = [];
    let currentPage = 1;
    const batchSize = 100; // 每批获取 100 条，减少请求次数
    let hasMore = true;

    while (hasMore) {
      const data = await trpc.channel.getOrderList.query({
        dateFrom,
        dateTo,
        skip: (currentPage - 1) * batchSize,
        take: batchSize,
        appid,
      });

      if (data?.orders && data.orders.length > 0) {
        allOrders.push(...data.orders);
        currentPage++;

        // 如果返回的数据少于 batchSize，说明已经获取完所有数据
        if (data.orders.length < batchSize) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    return allOrders;
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
  const handleDownloadCSV = async () => {
    try {
      setIsDownloading(true);

      // 获取所有订单数据
      const allOrders = await fetchAllOrders();

      if (allOrders.length === 0) {
        alert('暂无数据可导出');
        setIsDownloading(false);
        return;
      }

      // 构建 CSV 表头
      const headers = [
        '订单时间',
        '订单ID',
        '用户ID',
        '订单金额',
        '注册渠道',
        '关联作品',
        '模板ID',
        '支付渠道',
        '二级频道',
        '三级频道',
        '四级频道',
        '支付时间',
        '用户注册时间',
        'URL',
      ];

      // 构建 CSV 数据行
      const rows = allOrders.map(order => {
        const url = order.work_id ? getShareUrl(order.work_id) : '';

        return [
          formatDateTime(order.order_time),
          order.order_id,
          order.uid.toString(),
          order.amount !== null ? (order.amount / 100).toFixed(2) : '',
          order.user_register_source || '',
          order.work_title || '',
          order.template_id || '',
          order.payment_type || '',
          order.level2_channel_name || '',
          order.level3_channel_name || '',
          order.level4_channel_name || '',
          formatDateTime(order.payment_time),
          order.user_register_date ? formatDate(order.user_register_date) : '',
          url,
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

      // 生成文件名（包含日期范围）
      const dateStr = new Date()
        .toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
        .replace(/\//g, '-');
      link.setAttribute(
        'download',
        `订单列表-${dateFrom}_${dateTo}-${dateStr}.csv`
      );

      // 触发下载
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 释放 URL 对象
      URL.revokeObjectURL(url);

      alert(`成功导出 ${allOrders.length} 条订单记录`);
    } catch (error) {
      console.error('导出 CSV 失败:', error);
      alert('导出失败，请稍后重试');
    } finally {
      setIsDownloading(false);
    }
  };

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
          <h2 className='text-xl font-bold text-slate-800'>订单列表</h2>
          <p className='text-sm text-slate-500 mt-1'>
            查看订单详情，包括订单时间、用户信息、关联作品和频道信息
          </p>
        </div>

        <div className='flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm'>
          {/* 时间筛选 */}
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
              className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none'
            />
          </div>
          {/* 下载全部按钮 */}
          <button
            onClick={handleDownloadCSV}
            disabled={isDownloading || total === 0}
            className='flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          >
            <Download size={16} />
            {isDownloading ? '下载中...' : '下载全部'}
          </button>
        </div>
      </div>

      {/* 统计信息 */}
      <div className='bg-white rounded-xl border border-slate-200 shadow-sm p-4'>
        <div className='flex items-center justify-between'>
          <div className='text-sm text-slate-600'>
            共 <span className='font-bold text-slate-800'>{total}</span> 条订单
          </div>
          <div className='text-sm text-slate-500'>
            {dateFrom} 至 {dateTo}
          </div>
        </div>
      </div>

      {/* 订单表格 */}
      <div className='bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden'>
        {isLoading ? (
          <div className='p-12 text-center text-slate-500'>
            <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
            <p className='mt-4'>加载中...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className='p-12 text-center text-slate-500'>
            <p>暂无订单数据</p>
          </div>
        ) : (
          <>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-slate-50 border-b border-slate-200'>
                  <tr>
                    {/* <th className='px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider'>
                      订单时间
                    </th> */}
                    <th className='px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-32 max-w-32'>
                      订单ID
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider'>
                      用户ID
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider'>
                      订单金额
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider'>
                      注册渠道
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider'>
                      关联作品
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider'>
                      模板ID
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider'>
                      支付渠道
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider'>
                      二级频道
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider'>
                      三级频道
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider'>
                      四级频道
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider'>
                      支付时间
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider'>
                      用户注册时间
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-100'>
                  {orders.map(order => (
                    <tr
                      key={order.id}
                      className='hover:bg-slate-50 transition-colors'
                    >
                      {/* <td className='px-4 py-3 text-sm text-slate-700 whitespace-nowrap'>
                        {formatDateTime(order.order_time)}
                      </td> */}
                      <td className='px-4 py-3 text-sm text-slate-700 font-mono w-32 max-w-32'>
                        <div className='line-clamp-2 break-words'>
                          {order.order_id}
                        </div>
                      </td>
                      <td className='px-4 py-3 text-sm text-slate-700'>
                        <button
                          onClick={() =>
                            router.push(
                              `/dashboard/manager/data/user/${order.uid}`
                            )
                          }
                          className='text-blue-600 hover:text-blue-800 hover:underline cursor-pointer'
                        >
                          {order.uid}
                        </button>
                      </td>
                      <td className='px-4 py-3 text-sm text-slate-700 font-medium'>
                        {formatAmount(order.amount)}
                      </td>
                      <td className='px-4 py-3 text-sm text-slate-700'>
                        {order?.user_register_source || (
                          <span className='text-slate-400'>-</span>
                        )}
                      </td>
                      <td className='px-4 py-3 text-sm text-slate-700'>
                        {order.work_title ? (
                          <button
                            onClick={() =>
                              router.push(
                                `/dashboard/manager/works?keyword=${encodeURIComponent(order.work_title || '')}&uid=${order.uid}`
                              )
                            }
                            className='text-blue-600 hover:text-blue-800 hover:underline cursor-pointer line-clamp-2 break-words text-left'
                          >
                            {order.work_title}
                          </button>
                        ) : (
                          <span className='text-slate-400'>-</span>
                        )}
                      </td>
                      <td className='px-4 py-3 text-sm text-slate-700'>
                        {order.template_id ? (
                          <button
                            onClick={() =>
                              router.push(
                                `/dashboard/manager/data/template/${order.template_id}`
                              )
                            }
                            className='text-blue-600 hover:text-blue-800 hover:underline cursor-pointer'
                          >
                            {order.template_id}
                          </button>
                        ) : (
                          <span className='text-slate-400'>-</span>
                        )}
                      </td>
                      <td className='px-4 py-3 text-sm text-slate-700'>
                        {order.payment_type || (
                          <span className='text-slate-400'>-</span>
                        )}
                      </td>
                      <td className='px-4 py-3 text-sm text-slate-700'>
                        {order.level2_channel_name || (
                          <span className='text-slate-400'>-</span>
                        )}
                      </td>
                      <td className='px-4 py-3 text-sm text-slate-700'>
                        {order.level3_channel_name || (
                          <span className='text-slate-400'>-</span>
                        )}
                      </td>
                      <td className='px-4 py-3 text-sm text-slate-700'>
                        {order.level4_channel_name || (
                          <span className='text-slate-400'>-</span>
                        )}
                      </td>
                      <td className='px-4 py-3 text-sm text-slate-700 whitespace-nowrap'>
                        {formatDateTime(order.payment_time)}
                      </td>
                      <td className='px-4 py-3 text-sm text-slate-700 whitespace-nowrap'>
                        {!!order?.user_register_date &&
                          formatDate(
                            order?.user_register_date as Date | string
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className='px-4 py-3 border-t border-slate-200 flex items-center justify-between'>
                <div className='text-sm text-slate-600'>
                  第 {currentPage} / {totalPages} 页
                </div>
                <div className='flex items-center gap-2'>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className='px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                  >
                    上一页
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage(p => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className='px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

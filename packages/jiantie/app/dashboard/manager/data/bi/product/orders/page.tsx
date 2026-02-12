'use client';

import { cdnApi } from '@/services';
import { getShareUrl } from '@/store';
import { trpc } from '@/utils/trpc';
import { Input } from '@workspace/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import { ChevronDown, Download } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

// 订单数据类型
type OrderItem = {
  id: string;
  order_id: string;
  uid: number;
  order_time: Date | string;
  payment_type: string;
  work_id: string | null;
  work_type: string | null;
  work_title: string | null;
  work_cover: string | null;
  template_id: string | null;
  level2_channel_id?: number | null;
  level2_channel_name?: string | null;
  level3_channel_id?: number | null;
  level3_channel_name?: string | null;
  level4_channel_id?: number | null;
  level4_channel_name?: string | null;
  search_term?: string | null;
  ref_page_type?: string | null;
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
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
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
  const appid = searchParams.get('appid') || undefined;

  const [selectedPeriod, setSelectedPeriod] = useState('near7');
  const [currentPage, setCurrentPage] = useState(1);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const pageSize = 50;

  // 筛选条件
  const [selectedLevel2, setSelectedLevel2] = useState<number | null>(null);
  const [selectedLevel3, setSelectedLevel3] = useState<number | null>(null);
  const [selectedLevel4, setSelectedLevel4] = useState<number | null>(null);
  const [selectedRefPageType, setSelectedRefPageType] = useState<string>('');
  const [selectedSearchTerm, setSelectedSearchTerm] = useState<string>('');
  const [selectedPaymentType, setSelectedPaymentType] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // 频道数据
  const [channels, setChannels] = useState<{
    level2: Array<{
      id: number;
      display_name: string;
      alias: string;
      class: string;
      thumb_path: string | null;
      parent_id: number | null;
      sort_weight: number;
    }>;
    level3: Array<{
      id: number;
      display_name: string;
      alias: string;
      class: string;
      thumb_path: string | null;
      parent_id: number | null;
      sort_weight: number;
    }>;
    level4: Array<{
      id: number;
      display_name: string;
      alias: string;
      class: string;
      thumb_path: string | null;
      parent_id: number | null;
      sort_weight: number;
    }>;
  }>({
    level2: [],
    level3: [],
    level4: [],
  });

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

  // 获取频道数据
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const data = await trpc.bi.getTemplateListChannels.query({
          appid: appid || undefined,
        });
        setChannels(data);
      } catch (error) {
        console.error('获取频道数据失败:', error);
        setChannels({ level2: [], level3: [], level4: [] });
      }
    };

    if (appid) {
      fetchChannels();
    }
  }, [appid]);

  // 根据选中的二级频道筛选三级热词
  const filteredLevel3 = useMemo(
    () =>
      channels.level3.filter(
        ch => !selectedLevel2 || ch.parent_id === selectedLevel2
      ),
    [channels.level3, selectedLevel2]
  );

  // 根据选中的三级热词筛选四级标签
  const filteredLevel4 = useMemo(
    () =>
      channels.level4.filter(
        ch => !selectedLevel3 || ch.parent_id === selectedLevel3
      ),
    [channels.level4, selectedLevel3]
  );

  // 从订单数据中提取可用的筛选选项
  const availablePaymentTypes = useMemo(() => {
    const types = new Set<string>();
    orders.forEach(order => {
      if (order.payment_type) {
        types.add(order.payment_type);
      }
    });
    return Array.from(types).sort();
  }, [orders]);

  const availableSearchTerms = useMemo(() => {
    const terms = new Set<string>();
    orders.forEach(order => {
      if (order.search_term) {
        terms.add(order.search_term);
      }
    });
    return Array.from(terms).sort();
  }, [orders]);

  // 当时间范围或筛选条件变化时，重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedPeriod,
    selectedLevel2,
    selectedLevel3,
    selectedLevel4,
    selectedRefPageType,
    selectedSearchTerm,
    selectedPaymentType,
    selectedTemplateId,
  ]);

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
          level2ChannelId: selectedLevel2 || undefined,
          level3ChannelId: selectedLevel3 || undefined,
          level4ChannelId: selectedLevel4 || undefined,
          refPageType: selectedRefPageType || undefined,
          searchTerm: selectedSearchTerm || undefined,
          paymentType: selectedPaymentType || undefined,
          templateId: selectedTemplateId || undefined,
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
  }, [
    dateFrom,
    dateTo,
    currentPage,
    pageSize,
    appid,
    selectedLevel2,
    selectedLevel3,
    selectedLevel4,
    selectedRefPageType,
    selectedSearchTerm,
    selectedPaymentType,
    selectedTemplateId,
  ]);

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
        level2ChannelId: selectedLevel2 || undefined,
        level3ChannelId: selectedLevel3 || undefined,
        level4ChannelId: selectedLevel4 || undefined,
        refPageType: selectedRefPageType || undefined,
        searchTerm: selectedSearchTerm || undefined,
        paymentType: selectedPaymentType || undefined,
        templateId: selectedTemplateId || undefined,
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
        // '订单时间',
        '订单ID',
        '用户ID',
        '订单金额',
        '注册渠道',
        '作品ID',
        '作品类型',
        '关联作品',
        '模板ID',
        '支付渠道',
        '来源类型',
        '二级频道',
        '三级频道',
        '四级频道',
        '搜索词',
        '支付时间',
        '用户注册时间',
        'URL',
      ];

      // 构建 CSV 数据行
      const rows = allOrders.map(order => {
        const url = order.work_id ? getShareUrl(order.work_id) : '';
        const sourceType =
          order.ref_page_type === 'tag_channel'
            ? '频道'
            : order.ref_page_type === 'search_page_mix'
              ? '搜索'
              : '';

        return [
          // formatDateTime(order.order_time),
          order.order_id,
          order.uid.toString(),
          order.amount !== null ? (order.amount / 100).toFixed(2) : '',
          order.user_register_source || '',
          order.work_id || '',
          order.work_type || '',
          order.work_title || '',
          order.template_id || '',
          order.payment_type || '',
          sourceType,
          order.level2_channel_name || '',
          order.level3_channel_name || '',
          order.level4_channel_name || '',
          order.search_term || '',
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

      {/* 统计信息和筛选 */}
      <div className='bg-white rounded-xl border border-slate-200 shadow-sm p-4'>
        <div className='flex items-center justify-between mb-4'>
          <div className='text-sm text-slate-600'>
            共 <span className='font-bold text-slate-800'>{total}</span> 条订单
          </div>
        </div>

        {/* 筛选条件 */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          {/* 二级频道筛选 */}
          <div>
            <label className='text-sm font-medium text-slate-700 mb-1 block'>
              二级频道
            </label>
            <Select
              value={selectedLevel2 ? selectedLevel2.toString() : 'all'}
              onValueChange={value => {
                const newLevel2 = value === 'all' ? null : parseInt(value, 10);
                setSelectedLevel2(newLevel2);
                // 清空下级筛选
                setSelectedLevel3(null);
                setSelectedLevel4(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder='全部' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>全部</SelectItem>
                {channels.level2.map(ch => (
                  <SelectItem key={ch.id} value={ch.id.toString()}>
                    {ch.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 三级频道筛选 */}
          <div>
            <label className='text-sm font-medium text-slate-700 mb-1 block'>
              三级频道
            </label>
            <Select
              value={selectedLevel3 ? selectedLevel3.toString() : 'all'}
              onValueChange={value => {
                const newLevel3 = value === 'all' ? null : parseInt(value, 10);
                setSelectedLevel3(newLevel3);
                // 清空四级筛选
                setSelectedLevel4(null);
              }}
              disabled={!selectedLevel2}
            >
              <SelectTrigger>
                <SelectValue placeholder='全部' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>全部</SelectItem>
                {filteredLevel3.map(ch => (
                  <SelectItem key={ch.id} value={ch.id.toString()}>
                    {ch.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 四级频道筛选 */}
          <div>
            <label className='text-sm font-medium text-slate-700 mb-1 block'>
              四级频道
            </label>
            <Select
              value={selectedLevel4 ? selectedLevel4.toString() : 'all'}
              onValueChange={value => {
                setSelectedLevel4(value === 'all' ? null : parseInt(value, 10));
              }}
              disabled={!selectedLevel3}
            >
              <SelectTrigger>
                <SelectValue placeholder='全部' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>全部</SelectItem>
                {filteredLevel4.map(ch => (
                  <SelectItem key={ch.id} value={ch.id.toString()}>
                    {ch.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 来源类型筛选 */}
          <div>
            <label className='text-sm font-medium text-slate-700 mb-1 block'>
              来源类型
            </label>
            <Select
              value={selectedRefPageType || 'all'}
              onValueChange={value =>
                setSelectedRefPageType(value === 'all' ? '' : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder='全部' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>全部</SelectItem>
                <SelectItem value='tag_channel'>频道</SelectItem>
                <SelectItem value='search_page_mix'>搜索</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 搜索词筛选 */}
          <div>
            <label className='text-sm font-medium text-slate-700 mb-1 block'>
              搜索词
            </label>
            <Input
              type='text'
              placeholder='请输入搜索词'
              value={selectedSearchTerm}
              onChange={e => setSelectedSearchTerm(e.target.value)}
              className='w-full'
            />
          </div>

          {/* 支付渠道筛选 */}
          <div>
            <label className='text-sm font-medium text-slate-700 mb-1 block'>
              支付渠道
            </label>
            <Select
              value={selectedPaymentType || 'all'}
              onValueChange={value =>
                setSelectedPaymentType(value === 'all' ? '' : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder='全部' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>全部</SelectItem>
                {availablePaymentTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 模板ID筛选 */}
          <div>
            <label className='text-sm font-medium text-slate-700 mb-1 block'>
              模板ID
            </label>
            <Input
              type='text'
              placeholder='请输入模板ID'
              value={selectedTemplateId}
              onChange={e => setSelectedTemplateId(e.target.value)}
              className='w-full'
            />
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
                      作品ID
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-24'>
                      作品封面
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider'>
                      作品类型
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
                      来源类型
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
                      搜索词
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
                      <td className='px-4 py-3 text-sm text-slate-700 font-mono w-32 max-w-32'>
                        <div className='line-clamp-2 break-words'>
                          {order.order_id}
                        </div>
                      </td>
                      <td className='px-4 py-3 text-sm text-slate-700'>
                        <button
                          onClick={() =>
                            window.open(
                              `/dashboard/manager/data/user/${order.uid}`,
                              '_blank'
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
                      <td className='px-4 py-3 text-sm text-slate-700 font-mono'>
                        {order.work_id ? (
                          <button
                            onClick={() => {
                              const url = getShareUrl(
                                order.work_id!,
                                undefined,
                                undefined,
                                {
                                  workType: order.work_type,
                                  uid: order.uid,
                                }
                              );
                              window.open(url, '_blank');
                            }}
                            className='text-blue-600 hover:text-blue-800 hover:underline cursor-pointer'
                          >
                            {order.work_id}
                          </button>
                        ) : (
                          <span className='text-slate-400'>-</span>
                        )}
                      </td>
                      <td className='px-4 py-3 text-sm text-slate-700'>
                        {order.work_cover ? (
                          <img
                            src={cdnApi(order.work_cover, {
                              resizeWidth: 80,
                              resizeHeight: 80,
                            })}
                            alt={order.work_title || '作品封面'}
                            className='w-16 h-16 object-contain rounded'
                          />
                        ) : (
                          <div className='w-16 h-16 rounded bg-slate-100 flex items-center justify-center text-slate-400 text-xs'>
                            无封面
                          </div>
                        )}
                      </td>
                      <td className='px-4 py-3 text-sm text-slate-700'>
                        {order.work_type ? (
                          <span className='inline-flex items-center px-2 py-1 rounded-md bg-purple-100 text-purple-800 text-xs font-medium'>
                            {order.work_type}
                          </span>
                        ) : (
                          <span className='text-slate-400'>-</span>
                        )}
                      </td>
                      <td className='px-4 py-3 text-sm text-slate-700'>
                        {order.work_title ? (
                          <button
                            onClick={() =>
                              window.open(
                                `/dashboard/manager/works?keyword=${encodeURIComponent(order.work_title || '')}&uid=${order.uid}`,
                                '_blank'
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
                              window.open(
                                `/dashboard/manager/data/template/${order.template_id}`,
                                '_blank'
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
                        {order.ref_page_type === 'tag_channel' ? (
                          <span className='inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-xs font-medium'>
                            频道
                          </span>
                        ) : order.ref_page_type === 'search_page_mix' ? (
                          <span className='inline-flex items-center px-2 py-1 rounded-md bg-green-100 text-green-800 text-xs font-medium'>
                            搜索
                          </span>
                        ) : (
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
                      <td className='px-4 py-3 text-sm text-slate-700'>
                        {order.search_term ? (
                          <span className='font-medium text-slate-800'>
                            {order.search_term}
                          </span>
                        ) : (
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

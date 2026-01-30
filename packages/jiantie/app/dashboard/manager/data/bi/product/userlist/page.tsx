'use client';

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
import { Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatMoney, formatNumber } from '../../../channel/shared/constants';

const PAGE_SIZE = 20;

export default function UserListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appid = searchParams.get('appid') || '';
  const dateFrom =
    searchParams.get('dateFrom') ||
    dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  const dateTo = searchParams.get('dateTo') || dayjs().format('YYYY-MM-DD');

  // 初始化状态
  const [uid, setUid] = useState(searchParams.get('uid') || '');
  const [registerSource, setRegisterSource] = useState(
    searchParams.get('register_source') || ''
  );
  const [registerDevice, setRegisterDevice] = useState(
    searchParams.get('register_device') || ''
  );
  const [registerDateFrom, setRegisterDateFrom] = useState(
    searchParams.get('register_date_from') || dateFrom || ''
  );
  const [registerDateTo, setRegisterDateTo] = useState(
    searchParams.get('register_date_to') || dateTo || ''
  );
  const [hasOrder, setHasOrder] = useState<'all' | 'yes' | 'no'>(
    (searchParams.get('has_order') as 'all' | 'yes' | 'no') || 'all'
  );
  const [hasWorks, setHasWorks] = useState<'all' | 'yes' | 'no'>(
    (searchParams.get('has_works') as 'all' | 'yes' | 'no') || 'all'
  );
  const [adPlanId, setAdPlanId] = useState(
    searchParams.get('ad_plan_id') || ''
  );
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<
    Array<{
      uid: number;
      register_date: string;
      register_device: string | null;
      register_source: string | null;
      appid: string | null;
      works_count: number;
      works_titles: string[];
      order_count: number;
      gmv: number;
    }>
  >([]);
  const [total, setTotal] = useState(0);

  // 获取可用的source列表
  const [sources, setSources] = useState<string[]>([]);
  // 获取可用的device列表
  const [devices, setDevices] = useState<string[]>([]);

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

    if (appid) {
      fetchSources();
    }
  }, [appid]);

  // 获取device列表
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const data = await trpc.bi.getUserListDevices.query({
          appid: appid || undefined,
        });
        setDevices(data || []);
      } catch (error) {
        console.error('获取device列表失败:', error);
        setDevices([]);
      }
    };

    if (appid) {
      fetchDevices();
    }
  }, [appid]);

  // 加载数据
  const loadData = async (targetPage?: number) => {
    const currentPage = targetPage !== undefined ? targetPage : page;
    setLoading(true);
    try {
      const skip = (currentPage - 1) * PAGE_SIZE;
      const filters: any = {
        skip,
        take: PAGE_SIZE,
      };

      if (appid) {
        filters.appid = appid;
      }

      if (uid) {
        const uidNum = parseInt(uid, 10);
        if (!isNaN(uidNum)) {
          filters.uid = uidNum;
        }
      }

      if (registerSource) {
        filters.register_source = registerSource;
      }

      if (registerDevice) {
        filters.register_device = registerDevice;
      }

      if (registerDateFrom) {
        filters.register_date_from = registerDateFrom;
      }

      if (registerDateTo) {
        filters.register_date_to = registerDateTo;
      }

      if (hasOrder !== 'all') {
        filters.has_order = hasOrder;
      }

      if (hasWorks !== 'all') {
        filters.has_works = hasWorks;
      }

      if (adPlanId) {
        filters.ad_plan_id = adPlanId;
      }

      const result = await trpc.bi.getUserList.query(filters);

      setData(result.users || []);
      setTotal(result.total || 0);
    } catch (error) {
      console.error('获取用户列表失败:', error);
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // 搜索
  const handleSearch = () => {
    setPage(1);
    updateURL(1);
    loadData(1);
  };

  // 更新URL（用于同一页面内的搜索和分页操作）
  const updateURL = (targetPage?: number) => {
    const params = new URLSearchParams();
    if (appid) params.set('appid', appid);
    if (uid) params.set('uid', uid);
    if (registerSource) params.set('register_source', registerSource);
    if (registerDevice) params.set('register_device', registerDevice);
    if (registerDateFrom) params.set('register_date_from', registerDateFrom);
    if (registerDateTo) params.set('register_date_to', registerDateTo);
    if (hasOrder !== 'all') params.set('has_order', hasOrder);
    if (hasWorks !== 'all') params.set('has_works', hasWorks);
    if (adPlanId) params.set('ad_plan_id', adPlanId);
    const currentPage = targetPage !== undefined ? targetPage : page;
    if (currentPage > 1) params.set('page', String(currentPage));
    // 保留日期范围参数（从gain页面跳转过来时使用）
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    router.replace(
      `/dashboard/manager/data/bi/product/userlist?${params.toString()}`
    );
  };

  // 初始化时加载数据
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 分页变化时重新加载
  useEffect(() => {
    if (page > 1) {
      loadData();
      updateURL();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // 计算总页数
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className='min-h-screen bg-slate-50 p-6'>
      <div className='max-w-[1920px] mx-auto'>
        {/* 标题 */}
        <div className='mb-6'>
          <h1 className='text-2xl font-bold text-slate-900'>用户列表</h1>
          <p className='text-slate-500 mt-1'>
            查看用户信息，包括用户ID、作品数、付费量等
          </p>
        </div>

        {/* 筛选器 */}
        <div className='bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6'>
          <div className='flex flex-wrap gap-4 items-end'>
            <div className='flex-1 min-w-[200px]'>
              <label className='text-sm font-medium text-slate-700 mb-1 block'>
                用户ID
              </label>
              <Input
                placeholder='请输入用户ID'
                value={uid}
                onChange={e => setUid(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
            </div>
            <div className='flex-1 min-w-[200px]'>
              <label className='text-sm font-medium text-slate-700 mb-1 block'>
                注册渠道
              </label>
              <Select
                value={registerSource || 'all'}
                onValueChange={value =>
                  setRegisterSource(value === 'all' ? '' : value)
                }
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
                value={registerDevice || 'all'}
                onValueChange={value =>
                  setRegisterDevice(value === 'all' ? '' : value)
                }
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
            <div className='flex-1 min-w-[200px]'>
              <label className='text-sm font-medium text-slate-700 mb-1 block'>
                注册开始日期
              </label>
              <Input
                type='date'
                value={registerDateFrom}
                onChange={e => setRegisterDateFrom(e.target.value)}
              />
            </div>
            <div className='flex-1 min-w-[200px]'>
              <label className='text-sm font-medium text-slate-700 mb-1 block'>
                注册结束日期
              </label>
              <Input
                type='date'
                value={registerDateTo}
                onChange={e => setRegisterDateTo(e.target.value)}
              />
            </div>
            <div className='flex-1 min-w-[150px]'>
              <label className='text-sm font-medium text-slate-700 mb-1 block'>
                是否有订单
              </label>
              <Select
                value={hasOrder}
                onValueChange={value =>
                  setHasOrder(value as 'all' | 'yes' | 'no')
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='全部' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>全部</SelectItem>
                  <SelectItem value='yes'>有订单</SelectItem>
                  <SelectItem value='no'>无订单</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='flex-1 min-w-[150px]'>
              <label className='text-sm font-medium text-slate-700 mb-1 block'>
                是否有作品
              </label>
              <Select
                value={hasWorks}
                onValueChange={value =>
                  setHasWorks(value as 'all' | 'yes' | 'no')
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='全部' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>全部</SelectItem>
                  <SelectItem value='yes'>有作品</SelectItem>
                  <SelectItem value='no'>无作品</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='flex-1 min-w-[200px]'>
              <label className='text-sm font-medium text-slate-700 mb-1 block'>
                广告计划ID
              </label>
              <Input
                placeholder='请输入广告计划ID'
                value={adPlanId}
                onChange={e => setAdPlanId(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
            </div>
            <div className='flex items-end'>
              <Button onClick={handleSearch}>搜索</Button>
            </div>
          </div>
        </div>

        {/* 数据表格 */}
        <div className='bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden'>
          {loading ? (
            <div className='flex items-center justify-center py-12'>
              <Loader2 className='h-6 w-6 animate-spin text-slate-400' />
              <span className='ml-2 text-slate-500'>加载中...</span>
            </div>
          ) : !data || data.length === 0 ? (
            <div className='flex items-center justify-center py-12'>
              <span className='text-slate-500'>暂无数据</span>
            </div>
          ) : (
            <>
              <div className='overflow-x-auto'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='w-[120px]'>用户ID</TableHead>
                      <TableHead className='w-[120px]'>注册日期</TableHead>
                      <TableHead className='w-[120px]'>注册设备</TableHead>
                      <TableHead className='w-[150px]'>注册渠道</TableHead>
                      <TableHead className='w-[100px] text-right'>
                        作品数
                      </TableHead>
                      <TableHead className='w-[300px]'>前5个作品标题</TableHead>
                      <TableHead className='w-[100px] text-right'>
                        订单数
                      </TableHead>
                      <TableHead className='w-[120px] text-right'>
                        付费金额
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((user, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <button
                            onClick={() => {
                              const params = new URLSearchParams();
                              params.set('uid', String(user.uid));
                              if (appid) params.set('appid', appid);
                              window.open(
                                `/dashboard/manager/data/bi/product/userinfo?${params.toString()}`,
                                '_blank'
                              );
                            }}
                            className='text-blue-600 hover:text-blue-800 hover:underline cursor-pointer'
                          >
                            {user.uid}
                          </button>
                        </TableCell>
                        <TableCell>
                          {dayjs(user.register_date).format('YYYY-MM-DD')}
                        </TableCell>
                        <TableCell>{user.register_device || '-'}</TableCell>
                        <TableCell>{user.register_source || '-'}</TableCell>
                        <TableCell className='text-right'>
                          {formatNumber(user.works_count)}
                        </TableCell>
                        <TableCell>
                          {user.works_titles && user.works_titles.length > 0 ? (
                            <div className='flex flex-col gap-1'>
                              {user.works_titles.map((title, idx) => (
                                <span
                                  key={idx}
                                  className='text-sm text-slate-700 truncate'
                                  title={title}
                                >
                                  {title}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className='text-slate-400'>-</span>
                          )}
                        </TableCell>
                        <TableCell className='text-right'>
                          {formatNumber(user.order_count)}
                        </TableCell>
                        <TableCell className='text-right'>
                          {formatMoney(user.gmv)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* 分页 */}
              {totalPages > 1 && (
                <div className='flex items-center justify-between p-4 border-t border-slate-200'>
                  <div className='text-sm text-slate-500'>
                    共 {total} 条记录，第 {page} / {totalPages} 页
                  </div>
                  <div className='flex gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => {
                        if (page > 1) {
                          setPage(page - 1);
                        }
                      }}
                      disabled={page <= 1}
                    >
                      上一页
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => {
                        if (page < totalPages) {
                          setPage(page + 1);
                        }
                      }}
                      disabled={page >= totalPages}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

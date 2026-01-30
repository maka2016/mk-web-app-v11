'use client';

import { cdnApi } from '@/services';
import { getShareUrl } from '@/store';
import { trpc } from '@/utils/trpc';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@workspace/ui/components/tabs';
import { Loader2, Search, User } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatNumber } from '../../../channel/shared/constants';

const PAGE_SIZE = 20;

// 格式化日期
const formatDate = (dateStr: string | Date) => {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

// 格式化日期时间（包含时分秒）
const formatDateTime = (dateStr: string | Date) => {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export default function UserInfoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appid = searchParams.get('appid') || '';
  const uidFromUrl = searchParams.get('uid') || '';

  const [uid, setUid] = useState(uidFromUrl);
  const [userId, setUserId] = useState<number | null>(null);
  const [userInfo, setUserInfo] = useState<any | null>(null);
  const [works, setWorks] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [worksLoading, setWorksLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'works' | 'behavior'>('works');
  const [behaviorLogs, setBehaviorLogs] = useState<any[]>([]);
  const [behaviorLoading, setBehaviorLoading] = useState(false);

  // 从 URL 读取 uid
  useEffect(() => {
    if (uidFromUrl) {
      const uidNum = parseInt(uidFromUrl, 10);
      if (!isNaN(uidNum)) {
        setUid(uidFromUrl);
        setUserId(uidNum);
      }
    }
  }, [uidFromUrl]);

  // 加载用户信息
  const loadUserInfo = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const result = await trpc.bi.getUserList.query({
        uid: userId,
        appid: appid || undefined,
        skip: 0,
        take: 1,
      });

      if (result.users && result.users.length > 0) {
        const user = result.users[0];
        setUserInfo({
          uid: user.uid,
          register_date: user.register_date,
          register_device: user.register_device,
          register_source: user.register_source,
          appid: user.appid,
          ad_plan_id: user.ad_plan_id,
          works_count: user.works_count,
          order_count: user.order_count,
          gmv: user.gmv,
        });
      } else {
        setUserInfo(null);
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
      setUserInfo(null);
    } finally {
      setLoading(false);
    }
  };

  // 加载作品列表
  const loadWorks = async (targetPage?: number) => {
    if (!userId) return;

    const currentPage = targetPage !== undefined ? targetPage : page;
    setWorksLoading(true);

    try {
      const skip = (currentPage - 1) * PAGE_SIZE;
      const result = await trpc.adminWorks.getWorksByUser.query({
        uid: userId,
        time_period: 'all',
        is_paid: 'all',
        skip,
        take: PAGE_SIZE,
      });

      setWorks(result.works || []);
      setTotal(result.total || 0);
    } catch (error) {
      console.error('加载作品列表失败:', error);
      setWorks([]);
      setTotal(0);
    } finally {
      setWorksLoading(false);
    }
  };

  // 切换用户
  const handleSearch = () => {
    const uidNum = parseInt(uid, 10);
    if (!isNaN(uidNum)) {
      setUserId(uidNum);
      setPage(1);
      updateURL(uidNum);
    }
  };

  // 更新 URL（用于同一页面内的搜索操作）
  const updateURL = (targetUid: number) => {
    const params = new URLSearchParams();
    if (appid) params.set('appid', appid);
    if (targetUid) params.set('uid', String(targetUid));
    router.replace(
      `/dashboard/manager/data/bi/product/userinfo?${params.toString()}`
    );
  };

  // 当 userId 变化时重新加载
  useEffect(() => {
    if (userId) {
      loadUserInfo();
      if (activeTab === 'works') {
        loadWorks(1);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // 加载用户行为日志
  const loadBehaviorLogs = async () => {
    if (!userId) return;

    setBehaviorLoading(true);
    try {
      const params = new URLSearchParams({
        uid: String(userId),
        eventTypes: 'click,page_view,success',
        limit: '1000',
      });
      if (appid) {
        params.set('appid', appid);
      }

      const response = await fetch(
        `/api/sls/user-behavior?${params.toString()}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();

      setBehaviorLogs(result.logs || []);
    } catch (error) {
      console.error('加载用户行为日志失败:', error);
      setBehaviorLogs([]);
    } finally {
      setBehaviorLoading(false);
    }
  };

  // 当 tab 切换时加载数据
  useEffect(() => {
    if (userId && activeTab === 'works') {
      loadWorks(1);
    } else if (userId && activeTab === 'behavior') {
      loadBehaviorLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // 分页变化时重新加载
  useEffect(() => {
    if (userId && activeTab === 'works' && page > 1) {
      loadWorks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className='min-h-screen bg-slate-50 p-6'>
      <div className='max-w-[1920px] mx-auto'>
        {/* 标题和搜索 */}
        <div className='mb-6'>
          <h1 className='text-2xl font-bold text-slate-900 mb-4'>用户信息</h1>
          <div className='bg-white rounded-lg shadow-sm border border-slate-200 p-4'>
            <div className='flex gap-4 items-end'>
              <div className='flex-1 min-w-[200px]'>
                <label className='text-sm font-medium text-slate-700 mb-1 block'>
                  用户ID
                </label>
                <div className='flex gap-2'>
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
                  <Button onClick={handleSearch}>
                    <Search size={16} className='mr-2' />
                    查询
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 用户基础信息卡片 */}
        {loading && !userId ? (
          <div className='bg-white rounded-lg shadow-sm border border-slate-200 p-8 mb-6'>
            <div className='flex items-center justify-center py-12'>
              <Loader2 className='h-6 w-6 animate-spin' />
              <span className='ml-2'>加载中...</span>
            </div>
          </div>
        ) : userId && userInfo ? (
          <div className='bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6'>
            <div className='flex items-start gap-4 mb-6'>
              <div className='w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0'>
                <User size={32} className='text-purple-600' />
              </div>
              <div className='flex-1'>
                <h2 className='text-xl font-bold text-slate-800 mb-2'>
                  用户 ID: {userInfo.uid}
                </h2>
                <div className='flex flex-col gap-1 text-sm text-slate-600'>
                  <div className='flex flex-wrap gap-4'>
                    <span>应用: {userInfo.appid || '-'}</span>
                    <span>
                      注册日期:{' '}
                      {userInfo.register_date
                        ? formatDate(userInfo.register_date)
                        : '-'}
                    </span>
                    <span>注册设备: {userInfo.register_device || '-'}</span>
                    <span>注册来源: {userInfo.register_source || '-'}</span>
                    <span>广告计划ID: {userInfo.ad_plan_id || '-'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 统计信息 */}
            <div className='grid grid-cols-3 gap-4'>
              <div className='bg-slate-50 rounded-lg p-4'>
                <div className='text-sm text-slate-500 mb-1'>创作量</div>
                <div className='text-2xl font-bold text-slate-800'>
                  {formatNumber(userInfo.works_count || 0)}
                </div>
              </div>
              <div className='bg-slate-50 rounded-lg p-4'>
                <div className='text-sm text-slate-500 mb-1'>订单量</div>
                <div className='text-2xl font-bold text-slate-800'>
                  {formatNumber(userInfo.order_count || 0)}
                </div>
              </div>
              <div className='bg-slate-50 rounded-lg p-4'>
                <div className='text-sm text-slate-500 mb-1'>总付费金额</div>
                <div className='text-2xl font-bold text-slate-800'>
                  ¥{formatNumber((userInfo.gmv || 0).toFixed(2))}
                </div>
              </div>
            </div>
          </div>
        ) : userId ? (
          <div className='bg-white rounded-lg shadow-sm border border-slate-200 p-8 mb-6'>
            <div className='text-center py-12 text-slate-500'>
              未找到用户信息
            </div>
          </div>
        ) : null}

        {/* Tab 列表 */}
        {userId && userInfo && (
          <div className='bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden'>
            <Tabs
              value={activeTab}
              onValueChange={value =>
                setActiveTab(value as 'works' | 'behavior')
              }
            >
              <div className='px-4 py-3 border-b border-slate-200'>
                <TabsList className='bg-transparent h-auto p-0 gap-4'>
                  <TabsTrigger
                    value='works'
                    className='px-2 py-1.5 text-sm text-slate-500 data-[state=active]:text-slate-900 data-[state=active]:font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600'
                  >
                    作品列表
                  </TabsTrigger>
                  <TabsTrigger
                    value='behavior'
                    className='px-2 py-1.5 text-sm text-slate-500 data-[state=active]:text-slate-900 data-[state=active]:font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600'
                  >
                    行为列表
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value='works' className='m-0'>
                <div className='p-4'>
                  <div className='text-sm text-slate-500 mb-4'>
                    共 {total} 件作品
                  </div>

                  {worksLoading ? (
                    <div className='flex items-center justify-center py-12'>
                      <Loader2 className='h-6 w-6 animate-spin' />
                      <span className='ml-2'>加载中...</span>
                    </div>
                  ) : works.length === 0 ? (
                    <div className='text-center py-12 text-slate-500'>
                      暂无作品数据
                    </div>
                  ) : (
                    <>
                      <div className='overflow-x-auto'>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className='w-[120px]'>
                                作品ID
                              </TableHead>
                              <TableHead className='w-[100px]'>封面</TableHead>
                              <TableHead className='w-[200px]'>标题</TableHead>
                              <TableHead className='w-[120px]'>
                                创建时间
                              </TableHead>
                              <TableHead className='w-[120px]'>
                                更新时间
                              </TableHead>
                              <TableHead className='w-[100px]'>版本</TableHead>
                              <TableHead className='w-[100px]'>
                                是否付费
                              </TableHead>
                              <TableHead className='w-[120px]'>
                                付费时间
                              </TableHead>
                              <TableHead className='w-[120px]'>
                                付费金额
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {works.map(work => {
                              return (
                                <TableRow
                                  key={work.id}
                                  className='hover:bg-slate-50 transition-colors cursor-pointer'
                                  onClick={() => {
                                    window.open(getShareUrl(work.id), '_blank');
                                  }}
                                >
                                  <TableCell className='font-mono text-xs'>
                                    {work.id.slice(0, 12)}...
                                  </TableCell>
                                  <TableCell>
                                    {work.cover ? (
                                      <img
                                        src={cdnApi(work.cover, {
                                          resizeWidth: 80,
                                          resizeHeight: 80,
                                        })}
                                        alt={work.title || '作品封面'}
                                        className='w-16 h-16 object-cover rounded'
                                      />
                                    ) : (
                                      <div className='w-16 h-16 rounded bg-slate-100 flex items-center justify-center text-slate-400 text-xs'>
                                        无封面
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell className='max-w-xs truncate'>
                                    {work.title || '-'}
                                  </TableCell>
                                  <TableCell className='text-xs'>
                                    {work.create_time
                                      ? formatDate(work.create_time)
                                      : '-'}
                                  </TableCell>
                                  <TableCell className='text-xs'>
                                    {work.update_time
                                      ? formatDate(work.update_time)
                                      : '-'}
                                  </TableCell>
                                  <TableCell className='text-xs font-mono'>
                                    {work.version ?? '-'}
                                  </TableCell>
                                  <TableCell>
                                    {work.is_paid ? (
                                      <span className='text-green-600'>
                                        已付费
                                      </span>
                                    ) : (
                                      <span className='text-slate-400'>
                                        未付费
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className='text-xs'>
                                    {work.order_time
                                      ? formatDateTime(work.order_time)
                                      : '-'}
                                  </TableCell>
                                  <TableCell className='text-xs'>
                                    {work.payment_amount
                                      ? `¥${formatNumber(
                                          work.payment_amount.toFixed(2)
                                        )}`
                                      : '-'}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      {/* 分页 */}
                      {totalPages > 1 && (
                        <div className='flex items-center justify-between p-4 border-t border-slate-200 mt-4'>
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
              </TabsContent>

              <TabsContent value='behavior' className='m-0'>
                <div className='p-4'>
                  <div className='text-sm text-slate-500 mb-4'>
                    共 {behaviorLogs.length} 条行为记录
                  </div>

                  {behaviorLoading ? (
                    <div className='flex items-center justify-center py-12'>
                      <Loader2 className='h-6 w-6 animate-spin' />
                      <span className='ml-2'>加载中...</span>
                    </div>
                  ) : behaviorLogs.length === 0 ? (
                    <div className='text-center py-12 text-slate-500'>
                      暂无行为数据
                    </div>
                  ) : (
                    <div className='overflow-x-auto'>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className='w-[150px]'>时间</TableHead>
                            <TableHead className='w-[100px]'>
                              事件类型
                            </TableHead>
                            <TableHead className='w-[120px]'>
                              页面类型
                            </TableHead>
                            <TableHead className='w-[120px]'>页面ID</TableHead>
                            <TableHead className='w-[120px]'>
                              对象类型
                            </TableHead>
                            <TableHead className='w-[120px]'>对象ID</TableHead>
                            <TableHead className='w-[100px]'>平台</TableHead>
                            <TableHead>URL</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {behaviorLogs.map((log, index) => (
                            <TableRow
                              key={index}
                              className='hover:bg-slate-50 transition-colors'
                            >
                              <TableCell className='text-xs'>
                                {log.time
                                  ? new Date(log.time).toLocaleString('zh-CN')
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                    log.event === 'order_paid'
                                      ? 'bg-orange-100 text-orange-800'
                                      : log.event === 'click'
                                        ? 'bg-blue-100 text-blue-800'
                                        : log.event === 'page_view'
                                          ? 'bg-green-100 text-green-800'
                                          : log.event === 'success'
                                            ? 'bg-purple-100 text-purple-800'
                                            : 'bg-slate-100 text-slate-800'
                                  }`}
                                >
                                  {log.event === 'order_paid'
                                    ? '付费订单'
                                    : log.event || '-'}
                                </span>
                              </TableCell>
                              <TableCell className='text-xs'>
                                {log.pageType || '-'}
                              </TableCell>
                              <TableCell className='text-xs font-mono'>
                                {log.pageId
                                  ? String(log.pageId).slice(0, 12) + '...'
                                  : '-'}
                              </TableCell>
                              <TableCell className='text-xs'>
                                {log.objectType || '-'}
                              </TableCell>
                              <TableCell className='text-xs font-mono'>
                                {log.objectId
                                  ? String(log.objectId).slice(0, 12) + '...'
                                  : '-'}
                              </TableCell>
                              <TableCell className='text-xs'>
                                {log.platform || '-'}
                              </TableCell>
                              <TableCell className='text-xs max-w-xs truncate'>
                                {log.url || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}

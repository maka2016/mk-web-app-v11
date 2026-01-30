'use client';

import { trpc } from '@/utils/trpc';
import { Button } from '@workspace/ui/components/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@workspace/ui/components/pagination';
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
import { ExternalLink, Loader2, Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';

const PAGE_SIZE = 20;

// 格式化日期
const formatDate = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export default function UserListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // 从 URL 获取 typeapp，如果存在则用于筛选
  const typeapp = searchParams.get('typeapp');
  const urlAppid = searchParams.get('appid');

  // 优先使用 typeapp，如果没有则使用 appid 参数，都没有则显示全部
  const initialAppid = typeapp || urlAppid || 'all';

  const [uid, setUid] = useState(searchParams.get('uid') || '');
  const [appid, setAppid] = useState<string>(initialAppid);
  const [registerDevice, setRegisterDevice] = useState<string>(
    searchParams.get('register_device') || 'all'
  );
  const [registerSource, setRegisterSource] = useState(
    searchParams.get('register_source') || ''
  );
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  const loadData = async (
    targetPage?: number,
    overrideFilters?: {
      registerSource?: string;
      uid?: string;
      registerDevice?: string;
    }
  ) => {
    const currentPage = targetPage !== undefined ? targetPage : page;
    setLoading(true);
    try {
      const skip = (currentPage - 1) * PAGE_SIZE;
      const filters: any = {
        skip,
        take: PAGE_SIZE,
        deleted: false,
      };

      const currentUid = overrideFilters?.uid ?? uid;
      if (currentUid) {
        const uidNum = parseInt(currentUid, 10);
        if (!isNaN(uidNum)) {
          filters.uid = uidNum;
        }
      }

      // 优先使用 typeapp，如果没有则使用 appid
      const finalAppid = typeapp || appid;
      if (finalAppid && finalAppid !== 'all') {
        filters.appid = finalAppid;
      }

      const currentRegisterDevice =
        overrideFilters?.registerDevice ?? registerDevice;
      if (currentRegisterDevice && currentRegisterDevice !== 'all') {
        filters.register_device = currentRegisterDevice;
      }

      const currentRegisterSource =
        overrideFilters?.registerSource ?? registerSource;
      if (currentRegisterSource) {
        filters.register_source = currentRegisterSource;
      }

      const [list, count] = await Promise.all([
        trpc.user.findMany.query(filters) as Promise<any[]>,
        trpc.user.count.query({
          uid: filters.uid,
          appid: finalAppid && finalAppid !== 'all' ? finalAppid : undefined,
          register_device: filters.register_device,
          register_source: filters.register_source,
          deleted: false,
        }) as Promise<number>,
      ]);

      setData(list || []);
      setTotal(count || 0);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadData(1);
    updateURL();
  };

  const handleQuickFilter = (targetRegisterSource: string) => {
    setRegisterSource(targetRegisterSource);
    setPage(1);
    // 直接传递新的筛选值，避免状态更新延迟问题
    loadData(1, { registerSource: targetRegisterSource });
    // 更新 URL
    const params = new URLSearchParams();
    if (uid) params.set('uid', uid);
    if (appid && appid !== 'all') params.set('appid', appid);
    if (registerDevice && registerDevice !== 'all')
      params.set('register_device', registerDevice);
    if (targetRegisterSource)
      params.set('register_source', targetRegisterSource);
    const currentTypeapp = searchParams.get('typeapp');
    if (currentTypeapp) params.set('typeapp', currentTypeapp);
    router.replace(
      `/dashboard/manager/data/channel/userList?${params.toString()}`
    );
  };

  const updateURL = () => {
    const params = new URLSearchParams();
    if (uid) params.set('uid', uid);
    if (appid && appid !== 'all') params.set('appid', appid);
    if (registerDevice && registerDevice !== 'all')
      params.set('register_device', registerDevice);
    if (registerSource) params.set('register_source', registerSource);
    if (page > 1) params.set('page', String(page));
    // 保留 typeapp 参数
    const typeapp = searchParams.get('typeapp');
    if (typeapp) params.set('typeapp', typeapp);
    router.replace(
      `/dashboard/manager/data/channel/userList?${params.toString()}`
    );
  };

  // 当 typeapp 变化时，自动更新 appid
  useEffect(() => {
    if (typeapp && typeapp !== appid) {
      setAppid(typeapp);
      setPage(1);
    } else if (!typeapp && appid !== urlAppid) {
      // 如果 typeapp 不存在，恢复为 urlAppid 或 'all'
      setAppid(urlAppid || 'all');
    }
  }, [typeapp]);

  // 初始化时加载数据
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 当筛选条件或分页变化时，重新加载数据
  useEffect(() => {
    loadData();
    updateURL();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, appid, typeapp]);

  // 跳转到用户详情页
  const handleViewUser = (uid: number) => {
    router.push(`/dashboard/manager/data/user/${uid}`);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>用户列表</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            {/* 搜索和筛选区域 */}
            <div className='flex flex-wrap items-center gap-3'>
              <div className='flex items-center gap-2'>
                <Label className='text-sm font-medium min-w-[60px]'>UID</Label>
                <Input
                  placeholder='搜索用户UID'
                  value={uid}
                  onChange={e => setUid(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  className='h-9 w-[150px]'
                />
              </div>
              <div className='flex items-center gap-2'>
                <Label className='text-sm font-medium min-w-[70px]'>
                  注册设备
                </Label>
                <Select
                  value={registerDevice}
                  onValueChange={setRegisterDevice}
                >
                  <SelectTrigger className='h-9 w-[120px]'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>全部</SelectItem>
                    <SelectItem value='web'>Web</SelectItem>
                    <SelectItem value='ios'>iOS</SelectItem>
                    <SelectItem value='android'>Android</SelectItem>
                    <SelectItem value='wap'>WAP</SelectItem>
                    <SelectItem value='mini_program'>小程序</SelectItem>
                    <SelectItem value='other'>其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='flex items-center gap-2'>
                <Label className='text-sm font-medium min-w-[70px]'>
                  注册渠道
                </Label>
                <Input
                  placeholder='搜索注册渠道'
                  value={registerSource}
                  onChange={e => setRegisterSource(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  className='h-9 w-[200px]'
                />
                <Button
                  variant='outline'
                  size='sm'
                  className='h-9'
                  onClick={() => handleQuickFilter('douyin')}
                >
                  抖音
                </Button>
              </div>
              <Button onClick={handleSearch} size='sm' className='h-9'>
                <Search className='h-4 w-4 mr-2' />
                查询
              </Button>
            </div>

            {/* 数据表格 */}
            <div className='border rounded-lg overflow-x-auto'>
              {loading ? (
                <div className='flex items-center justify-center py-12'>
                  <Loader2 className='h-6 w-6 animate-spin' />
                  <span className='ml-2'>加载中...</span>
                </div>
              ) : data.length === 0 ? (
                <div className='text-center py-12 text-muted-foreground'>
                  暂无数据
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='min-w-[100px]'>UID</TableHead>
                      <TableHead className='min-w-[150px]'>注册时间</TableHead>
                      <TableHead className='min-w-[100px]'>注册设备</TableHead>
                      <TableHead className='min-w-[150px]'>注册渠道</TableHead>
                      <TableHead className='min-w-[100px]'>应用</TableHead>
                      <TableHead className='min-w-[120px]'>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map(item => (
                      <TableRow key={item.uid}>
                        <TableCell className='font-mono text-sm'>
                          {item.uid}
                        </TableCell>
                        <TableCell className='text-sm'>
                          {formatDate(item.register_date)}
                        </TableCell>
                        <TableCell>
                          <span className='px-2 py-1 rounded text-xs bg-blue-500/10 text-blue-600'>
                            {item.register_device || '-'}
                          </span>
                        </TableCell>
                        <TableCell className='text-sm'>
                          {item.register_source || '-'}
                        </TableCell>
                        <TableCell>
                          <span className='px-2 py-1 rounded text-xs bg-purple-500/10 text-purple-600'>
                            {item.appid || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => handleViewUser(item.uid)}
                          >
                            <ExternalLink className='h-4 w-4 mr-1' />
                            查看详情
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* 分页 */}
            {total > 0 && (
              <div className='flex items-center justify-between'>
                <div className='text-sm text-muted-foreground'>
                  共 {total} 条记录，第 {page} / {totalPages} 页
                </div>
                <Pagination className='w-auto ml-auto mr-0'>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => {
                          if (page > 1) {
                            setPage(page - 1);
                          }
                        }}
                        className={
                          page <= 1 ? 'pointer-events-none opacity-50' : ''
                        }
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(
                        p =>
                          p === 1 ||
                          p === totalPages ||
                          (p >= page - 2 && p <= page + 2)
                      )
                      .map((p, idx, arr) => (
                        <React.Fragment key={p}>
                          {idx > 0 && arr[idx - 1] < p - 1 && (
                            <PaginationItem>
                              <span className='px-2'>...</span>
                            </PaginationItem>
                          )}
                          <PaginationItem>
                            <PaginationLink
                              onClick={() => {
                                setPage(p);
                              }}
                              isActive={p === page}
                            >
                              {p}
                            </PaginationLink>
                          </PaginationItem>
                        </React.Fragment>
                      ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => {
                          if (page < totalPages) {
                            setPage(page + 1);
                          }
                        }}
                        className={
                          page >= totalPages
                            ? 'pointer-events-none opacity-50'
                            : ''
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

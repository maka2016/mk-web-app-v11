'use client';

import { trpc } from '@/utils/trpc';
import { Badge } from '@workspace/ui/components/badge';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table';
import dayjs from 'dayjs';
import { Loader2, Search, Trash2, UserCheck } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const PAGE_SIZE = 20;

interface WhitelistUserItem {
  uid: number;
  createdAt: Date | string;
  reason: string | null;
}

export default function WhitelistUserPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [uidSearch, setUidSearch] = useState(searchParams.get('uid') || '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<WhitelistUserItem[]>([]);
  const [total, setTotal] = useState(0);

  const loadData = async (targetPage?: number) => {
    const currentPage = targetPage !== undefined ? targetPage : page;
    setLoading(true);
    try {
      const skip = (currentPage - 1) * PAGE_SIZE;
      const filters: any = {
        skip,
        take: PAGE_SIZE,
      };

      if (uidSearch) {
        const uidNum = parseInt(uidSearch, 10);
        if (!isNaN(uidNum)) {
          filters.uid = uidNum;
        }
      }

      const result = await trpc.risk.listWhitelistUsers.query(filters);

      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (error: any) {
      console.error('Failed to fetch whitelist users:', error);
      toast.error(`加载失败: ${error.message || '未知错误'}`);
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

  const updateURL = () => {
    const params = new URLSearchParams();
    if (uidSearch) params.set('uid', uidSearch);
    if (page > 1) params.set('page', String(page));
    router.replace(`/dashboard/manager/risk/whiteUser?${params.toString()}`);
  };

  // 分页变化时重新查询
  useEffect(() => {
    loadData();
    updateURL();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // 初始加载
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 删除白名单用户
  const handleDelete = async (uid: number) => {
    if (!confirm(`确定要删除用户 ${uid} 的白名单吗？`)) {
      return;
    }
    try {
      await trpc.risk.deleteWhitelistUser.mutate({ uid });
      toast.success('删除成功');
      await loadData();
      updateURL();
    } catch (error: any) {
      toast.error(`删除失败: ${error.message || '未知错误'}`);
    }
  };

  // 跳转到用户管理页面
  const handleViewUser = (uid: number) => {
    const userUrl = `http://cms.maka.mobi/user/manage?uid=${uid}`;
    window.open(userUrl, '_blank');
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className='mx-auto p-6 space-y-6'>
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <UserCheck className='h-5 w-5' />
              <CardTitle>白名单用户</CardTitle>
            </div>
            <Badge variant='outline' className='text-sm'>
              共 {total} 个用户
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            {/* 搜索区域 */}
            <div className='flex flex-wrap items-center gap-3'>
              <div className='flex items-center gap-2'>
                <Label className='text-sm font-medium min-w-[60px]'>
                  用户ID
                </Label>
                <Input
                  placeholder='搜索用户ID'
                  value={uidSearch}
                  onChange={e => setUidSearch(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  className='h-9 w-[200px]'
                  type='number'
                />
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
                      <TableHead className='min-w-[120px]'>用户ID</TableHead>
                      <TableHead className='min-w-[180px]'>加入时间</TableHead>
                      <TableHead className='min-w-[300px]'>原因</TableHead>
                      <TableHead className='min-w-[200px]'>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map(item => (
                      <TableRow key={item.uid}>
                        <TableCell className='font-mono font-medium'>
                          {item.uid}
                        </TableCell>
                        <TableCell>
                          {dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                        </TableCell>
                        <TableCell className='text-muted-foreground'>
                          {item.reason || '-'}
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center gap-2'>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => handleViewUser(item.uid)}
                            >
                              查看用户
                            </Button>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => handleDelete(item.uid)}
                            >
                              <Trash2 className='h-4 w-4 mr-1' />
                              删除
                            </Button>
                          </div>
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

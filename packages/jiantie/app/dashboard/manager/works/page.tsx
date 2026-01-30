'use client';

import { getShareUrl } from '@/store';
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
import { DataPagination } from '@/components/DataPagination';
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
import { Edit, Eye, Loader2, RotateCcw, Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';

const PAGE_SIZE = 20;

export default function WorksManagerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [uid, setUid] = useState(searchParams.get('uid') || '');
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [deleted, setDeleted] = useState<string>(
    searchParams.get('deleted') || 'all'
  );
  const [specId, setSpecId] = useState(searchParams.get('spec_id') || '');
  const [templateId, setTemplateId] = useState(
    searchParams.get('template_id') || ''
  );
  const [workId, setWorkId] = useState(searchParams.get('work_id') || '');
  const [appid, setAppid] = useState(searchParams.get('appid') || '');
  const [versionMin, setVersionMin] = useState(
    searchParams.get('version_min') || ''
  );
  const [isPaid, setIsPaid] = useState<string>(
    searchParams.get('is_paid') || 'all'
  );
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  // 获取规格列表用于下拉选择
  const [specsList, setSpecsList] = useState<any[]>([]);
  // 用于标记是否是初始加载，避免初始加载时触发筛选搜索
  const isInitialMount = useRef(true);

  useEffect(() => {
    const loadSpecs = async () => {
      try {
        const specs = (await trpc.worksSpec.findMany.query({
          deleted: false,
          take: 1000,
        })) as any[];
        setSpecsList(specs || []);
      } catch (error) {
        console.error('Failed to load specs:', error);
        setSpecsList([]);
      }
    };
    loadSpecs();
  }, []);

  // 查询数据函数
  const loadData = async (targetPage?: number) => {
    const currentPage = targetPage !== undefined ? targetPage : page;

    setLoading(true);
    try {
      const skip = (currentPage - 1) * PAGE_SIZE;
      const filters: any = {
        skip,
        take: PAGE_SIZE,
      };

      // 只有在有值时才添加筛选条件
      if (uid) filters.uid = Number(uid);
      if (workId) filters.work_id = workId;
      if (keyword) filters.keyword = keyword;
      if (deleted !== 'all') filters.deleted = deleted === 'true';
      if (specId) filters.spec_id = specId;
      if (templateId) filters.template_id = templateId;
      if (appid) filters.appid = appid;
      if (versionMin) filters.version_gte = Number(versionMin);
      if (isPaid && isPaid !== 'all')
        filters.is_paid = isPaid as 'paid' | 'unpaid';

      const countFilters: any = {};
      if (uid) countFilters.uid = Number(uid);
      if (workId) countFilters.work_id = workId;
      if (keyword) countFilters.keyword = keyword;
      if (deleted !== 'all') countFilters.deleted = deleted === 'true';
      if (specId) countFilters.spec_id = specId;
      if (templateId) countFilters.template_id = templateId;
      if (appid) countFilters.appid = appid;
      if (versionMin) countFilters.version_gte = Number(versionMin);
      if (isPaid && isPaid !== 'all')
        countFilters.is_paid = isPaid as 'paid' | 'unpaid';
      countFilters.spec_id_not = undefined;

      const [list, count] = await Promise.all([
        trpc.works.findManyInternal.query(filters) as Promise<any[]>,
        trpc.works.countByUid.query(countFilters as any) as Promise<number>,
      ]);

      setData(list || []);
      setTotal(count || 0);
    } catch (error) {
      console.error('Failed to fetch works:', error);
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadData(1);
    updateURL(1);
  };

  // 分页变化时重新查询
  useEffect(() => {
    loadData();
    updateURL();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // 初始加载：如果URL中有参数，自动加载数据
  useEffect(() => {
    loadData();
    // 初始加载完成后，标记为非初始状态
    isInitialMount.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 筛选条件变化时自动重置分页并搜索
  useEffect(() => {
    // 跳过初始加载
    if (isInitialMount.current) return;

    // 当删除状态、规格或付费状态变化时，重置分页并搜索
    setPage(1);
    loadData(1);
    updateURL(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleted, specId, isPaid]);

  const updateURL = (targetPage?: number) => {
    const currentPage = targetPage !== undefined ? targetPage : page;
    const params = new URLSearchParams();
    if (uid) params.set('uid', uid);
    if (keyword) params.set('keyword', keyword);
    if (deleted !== 'all') params.set('deleted', deleted);
    if (specId) params.set('spec_id', specId);
    if (templateId) params.set('template_id', templateId);
    if (workId) params.set('work_id', workId);
    if (appid) params.set('appid', appid);
    if (versionMin) params.set('version_min', versionMin);
    if (isPaid && isPaid !== 'all') params.set('is_paid', isPaid);
    if (currentPage > 1) params.set('page', String(currentPage));
    router.replace(`/dashboard/manager/works?${params.toString()}`);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className='mx-auto p-6 space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>作品管理</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            {/* 搜索和筛选区域 */}
            <div className='flex flex-wrap items-center gap-3'>
              <div className='flex items-center gap-2'>
                <Label className='text-sm font-mediummin-w-[60px]'>
                  用户ID
                </Label>
                <Input
                  type='number'
                  placeholder='请输入用户ID'
                  value={uid}
                  onChange={e => setUid(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  className='h-9 w-[160px]'
                />
              </div>
              <div className='flex items-center gap-2'>
                <Label className='text-sm font-mediummin-w-[70px]'>
                  作品ID
                </Label>
                <Input
                  placeholder='作品ID'
                  value={workId}
                  onChange={e => setWorkId(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  className='h-9 w-[180px]'
                />
              </div>
              <div className='flex items-center gap-2'>
                <Label className='text-sm font-mediummin-w-[70px]'>
                  关键字
                </Label>
                <Input
                  placeholder='搜索标题'
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  className='h-9 w-[180px]'
                />
              </div>
              <div className='flex items-center gap-2'>
                <Label className='text-sm font-mediummin-w-[70px]'>
                  删除状态
                </Label>
                <Select value={deleted} onValueChange={setDeleted}>
                  <SelectTrigger className='h-9 w-[120px]'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>全部</SelectItem>
                    <SelectItem value='false'>未删除</SelectItem>
                    <SelectItem value='true'>已删除</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='flex items-center gap-2'>
                <Label className='text-sm font-mediummin-w-[40px]'>规格</Label>
                <Select
                  value={specId || 'all'}
                  onValueChange={value =>
                    setSpecId(value === 'all' ? '' : value)
                  }
                >
                  <SelectTrigger className='h-9 w-[180px]'>
                    <SelectValue placeholder='选择规格' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>全部</SelectItem>
                    {specsList.map((spec: any) => {
                      const displayText = spec.display_name
                        ? `${spec.display_name}${spec.name && spec.name !== spec.display_name ? ` (${spec.name})` : ''}`
                        : spec.name || spec.alias || '';
                      return (
                        <SelectItem key={spec.id} value={spec.id}>
                          {displayText}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className='flex items-center gap-2'>
                <Label className='text-sm font-mediummin-w-[60px]'>
                  模板ID
                </Label>
                <Input
                  placeholder='模板ID'
                  value={templateId}
                  onChange={e => setTemplateId(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  className='h-9 w-[160px]'
                />
              </div>
              <div className='flex items-center gap-2'>
                <Label className='text-sm font-mediummin-w-[60px]'>AppID</Label>
                <Input
                  placeholder='AppID'
                  value={appid}
                  onChange={e => setAppid(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  className='h-9 w-[160px]'
                />
              </div>
              <div className='flex items-center gap-2'>
                <Label className='text-sm font-mediummin-w-[80px]'>版本≥</Label>
                <Input
                  type='number'
                  placeholder='版本号'
                  value={versionMin}
                  onChange={e => setVersionMin(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  className='h-9 w-[120px]'
                />
              </div>
              <div className='flex items-center gap-2'>
                <Label className='text-sm font-mediummin-w-[70px]'>
                  付费状态
                </Label>
                <Select value={isPaid} onValueChange={setIsPaid}>
                  <SelectTrigger className='h-9 w-[120px]'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>全部</SelectItem>
                    <SelectItem value='paid'>已付费</SelectItem>
                    <SelectItem value='unpaid'>未付费</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSearch} size='sm' className='h-9'>
                <Search className='h-4 w-4' />
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
                      <TableHead className='min-w-[120px] max-w-[120px] break-words whitespace-normal'>
                        标题
                      </TableHead>
                      <TableHead className='min-w-[120px] max-w-[120px] break-words whitespace-normal'>
                        描述
                      </TableHead>
                      <TableHead className='min-w-[80px] max-w-[150px]'>
                        封面
                      </TableHead>
                      <TableHead className='min-w-[80px] max-w-[150px] break-words whitespace-normal'>
                        用户ID
                      </TableHead>
                      <TableHead className='min-w-[100px] max-w-[150px] break-words whitespace-normal'>
                        AppID
                      </TableHead>
                      <TableHead className='min-w-[120px] max-w-[120px] break-words whitespace-normal'>
                        规格
                      </TableHead>
                      <TableHead className='min-w-[120px] max-w-[120px] break-words whitespace-normal'>
                        模板ID
                      </TableHead>
                      <TableHead className='min-w-[100px] max-w-[120px] break-words whitespace-normal'>
                        编辑版本
                      </TableHead>
                      <TableHead className='min-w-[120px] max-w-[120px] break-words whitespace-normal'>
                        创建时间
                      </TableHead>
                      <TableHead className='min-w-[120px] max-w-[120px] break-words whitespace-normal'>
                        更新时间
                      </TableHead>
                      <TableHead className='min-w-[120px] max-w-[120px]'>
                        状态
                      </TableHead>
                      <TableHead className='min-w-[100px] max-w-[120px]'>
                        付费状态
                      </TableHead>
                      <TableHead className='min-w-[280px] max-w-[320px]'>
                        操作
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className='min-w-[120px] max-w-[120px] break-words whitespace-normal'>
                          {item.title}
                        </TableCell>
                        <TableCell className='text-muted-foreground min-w-[120px] max-w-[120px] break-words whitespace-normal'>
                          {item.desc || '-'}
                        </TableCell>
                        <TableCell className='min-w-[80px] max-w-[150px]'>
                          {item.cover ? (
                            <img
                              src={item.cover}
                              alt='cover'
                              className='w-16 h-16 object-cover rounded'
                            />
                          ) : (
                            <span className='text-muted-foreground'>-</span>
                          )}
                        </TableCell>
                        <TableCell className='min-w-[80px] max-w-[150px] break-words whitespace-normal'>
                          {item.uid}
                        </TableCell>
                        <TableCell className='min-w-[100px] max-w-[150px] break-words whitespace-normal'>
                          {item.appid || '-'}
                        </TableCell>
                        <TableCell className='min-w-[120px] max-w-[120px] break-words whitespace-normal'>
                          {item.specInfo?.display_name ||
                            item.specInfo?.name ||
                            '-'}
                        </TableCell>
                        <TableCell className='min-w-[120px] max-w-[120px] break-words whitespace-normal'>
                          {item.template_id || '-'}
                        </TableCell>
                        <TableCell className='min-w-[100px] max-w-[120px] break-words whitespace-normal'>
                          {item.version || '-'}
                        </TableCell>
                        <TableCell className='text-sm text-muted-foreground min-w-[120px] max-w-[120px] break-words whitespace-normal'>
                          {item.create_time
                            ? new Date(item.create_time).toLocaleString('zh-CN')
                            : '-'}
                        </TableCell>
                        <TableCell className='text-sm text-muted-foreground min-w-[120px] max-w-[120px] break-words whitespace-normal'>
                          {item.update_time
                            ? new Date(item.update_time).toLocaleString('zh-CN')
                            : '-'}
                        </TableCell>
                        <TableCell className='min-w-[80px] max-w-[120px]'>
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              item.deleted
                                ? 'bg-destructive/10 text-destructive'
                                : 'bg-green-500/10 text-green-600'
                            }`}
                          >
                            {item.deleted ? '已删除' : '正常'}
                          </span>
                        </TableCell>
                        <TableCell className='min-w-[100px] max-w-[120px]'>
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              item.is_paid
                                ? 'bg-blue-500/10 text-blue-600'
                                : 'bg-gray-500/10 text-gray-600'
                            }`}
                          >
                            {item.is_paid ? '已付费' : '未付费'}
                          </span>
                        </TableCell>
                        <TableCell className='min-w-[280px] max-w-[320px]'>
                          <div className='flex items-center gap-2 flex-wrap'>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => {
                                window.open(getShareUrl(item.id), '_blank');
                              }}
                            >
                              <Eye className='h-4 w-4 mr-1' />
                              预览
                            </Button>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => {
                                window.open(
                                  `/mobile/editor?works_id=${item.id}&no_save=1`,
                                  '_blank'
                                );
                              }}
                            >
                              <Edit className='h-4 w-4 mr-1' />
                              编辑
                            </Button>
                            {item.template_id && (
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() => {
                                  const url = `/mobile/template?id=${item.template_id}&appid=jiantie&template_name=${encodeURIComponent(item.title || '')}`;
                                  window.open(url, '_blank');
                                }}
                              >
                                <Eye className='h-4 w-4 mr-1' />
                                打开模版
                              </Button>
                            )}
                            {item.deleted && (
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={async () => {
                                  if (
                                    !confirm(
                                      `确定要恢复作品 "${item.title || item.id}" 吗？`
                                    )
                                  ) {
                                    return;
                                  }
                                  try {
                                    await trpc.works.recoverByUid.mutate({
                                      id: item.id,
                                    });
                                    // 恢复成功后重新查询
                                    await loadData();
                                    updateURL();
                                  } catch (error: any) {
                                    alert(
                                      `恢复失败: ${error.message || '未知错误'}`
                                    );
                                  }
                                }}
                              >
                                <RotateCcw className='h-4 w-4 mr-1' />
                                恢复
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* 分页 */}
            <DataPagination
              page={page}
              total={total}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              showInfo={true}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

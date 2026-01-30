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
import { DialogFooter } from '@workspace/ui/components/dialog';
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
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
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
import { Tabs, TabsList, TabsTrigger } from '@workspace/ui/components/tabs';
import { Edit, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const PAGE_SIZE = 20;

interface HotKeywordItem {
  id: string;
  keyword: string;
  appid: string;
  sort_order: number;
  online: boolean;
  create_time: string;
  update_time: string;
}

export default function HotKeywordsManagerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [appidFilter, setAppidFilter] = useState<string>(
    searchParams.get('appid') || 'jiantie'
  );
  const [onlineFilter, setOnlineFilter] = useState<string>(
    searchParams.get('online') || 'all'
  );
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<HotKeywordItem[]>([]);
  const [total, setTotal] = useState(0);

  // 编辑/创建对话框状态
  const [showDialog, setShowDialog] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState<HotKeywordItem | null>(
    null
  );
  const [formData, setFormData] = useState({
    keyword: '',
    appid: 'jiantie',
    sort_order: 0,
    online: true,
  });

  const loadData = async (targetPage?: number) => {
    const currentPage = targetPage !== undefined ? targetPage : page;
    setLoading(true);
    try {
      const skip = (currentPage - 1) * PAGE_SIZE;
      const filters: any = {
        skip,
        take: PAGE_SIZE,
      };

      if (keyword) filters.keyword = keyword;
      filters.appid = appidFilter;
      if (onlineFilter !== 'all') {
        filters.online = onlineFilter === 'true';
      }

      const result = await trpc.search.listHotKeywords.query(filters) as any;

      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (error: any) {
      console.error('Failed to fetch hot keywords:', error);
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
    updateURL(1);
  };

  const handleAppidChange = (value: string) => {
    setAppidFilter(value);
    setPage(1);
  };

  const updateURL = (targetPage?: number) => {
    const currentPage = targetPage !== undefined ? targetPage : page;
    const params = new URLSearchParams();
    if (keyword) params.set('keyword', keyword);
    params.set('appid', appidFilter);
    if (onlineFilter !== 'all') params.set('online', onlineFilter);
    if (currentPage > 1) params.set('page', String(currentPage));
    router.replace(`/dashboard/manager/search/hotwords?${params.toString()}`);
  };

  // appid 变化时重新查询
  useEffect(() => {
    if (page === 1) {
      loadData(1);
      updateURL(1);
    } else {
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appidFilter]);

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

  // 打开创建对话框
  const handleCreate = () => {
    setEditingKeyword(null);
    setFormData({
      keyword: '',
      appid: appidFilter,
      sort_order: 0,
      online: true,
    });
    setShowDialog(true);
  };

  // 打开编辑对话框
  const handleEdit = (item: HotKeywordItem) => {
    setEditingKeyword(item);
    setFormData({
      keyword: item.keyword,
      appid: item.appid,
      sort_order: item.sort_order,
      online: item.online,
    });
    setShowDialog(true);
  };

  // 保存热词
  const handleSave = async () => {
    if (!formData.keyword.trim()) {
      toast.error('请输入热词');
      return;
    }
    if (!formData.appid.trim()) {
      toast.error('请选择应用ID');
      return;
    }

    try {
      if (editingKeyword) {
        // 更新
        await trpc.search.updateHotKeyword.mutate({
          id: editingKeyword.id,
          keyword: formData.keyword.trim(),
          appid: formData.appid,
          sort_order: formData.sort_order,
          online: formData.online,
        });
        toast.success('更新成功');
      } else {
        // 创建
        await trpc.search.createHotKeyword.mutate({
          keyword: formData.keyword.trim(),
          appid: formData.appid,
          sort_order: formData.sort_order,
          online: formData.online,
        });
        toast.success('创建成功');
      }
      setShowDialog(false);
      await loadData();
      updateURL();
    } catch (error: any) {
      toast.error(`保存失败: ${error.message || '未知错误'}`);
    }
  };

  // 删除热词
  const handleDelete = async (id: string, keyword: string) => {
    if (!confirm(`确定要删除热词"${keyword}"吗？`)) {
      return;
    }
    try {
      await trpc.search.deleteHotKeyword.mutate({ id });
      toast.success('删除成功');
      await loadData();
      updateURL();
    } catch (error: any) {
      toast.error(`删除失败: ${error.message || '未知错误'}`);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className='mx-auto p-6 space-y-6'>
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle>热词管理</CardTitle>
            <Button onClick={handleCreate} size='sm'>
              <Plus className='h-4 w-4 mr-2' />
              新增热词
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            {/* 搜索和筛选区域 */}
            <div className='flex flex-wrap items-center gap-3'>
              <div className='flex items-center gap-2'>
                <Label className='text-sm font-medium min-w-[60px]'>热词</Label>
                <Input
                  placeholder='搜索热词'
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  className='h-9 w-[200px]'
                />
              </div>
              <div className='flex items-center gap-2'>
                <Label className='text-sm font-medium min-w-[70px]'>
                  应用ID
                </Label>
                <Tabs
                  value={appidFilter}
                  onValueChange={handleAppidChange}
                  className='w-auto'
                >
                  <TabsList className='h-9'>
                    <TabsTrigger value='jiantie'>简帖</TabsTrigger>
                    <TabsTrigger value='maka'>MAKA</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className='flex items-center gap-2'>
                <Label className='text-sm font-medium min-w-[70px]'>
                  上线状态
                </Label>
                <Select value={onlineFilter} onValueChange={setOnlineFilter}>
                  <SelectTrigger className='h-9 w-[120px]'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>全部</SelectItem>
                    <SelectItem value='true'>已上线</SelectItem>
                    <SelectItem value='false'>未上线</SelectItem>
                  </SelectContent>
                </Select>
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
                      <TableHead className='min-w-[200px]'>热词</TableHead>
                      <TableHead className='min-w-[120px]'>应用ID</TableHead>
                      <TableHead className='min-w-[100px]'>排序值</TableHead>
                      <TableHead className='min-w-[100px]'>上线状态</TableHead>
                      <TableHead className='min-w-[180px]'>创建时间</TableHead>
                      <TableHead className='min-w-[180px]'>更新时间</TableHead>
                      <TableHead className='min-w-[180px]'>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className='font-medium'>
                          {item.keyword}
                        </TableCell>
                        <TableCell>{item.appid}</TableCell>
                        <TableCell>{item.sort_order}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              item.online
                                ? 'bg-green-500/10 text-green-600'
                                : 'bg-gray-500/10 text-gray-600'
                            }
                          >
                            {item.online ? '已上线' : '未上线'}
                          </Badge>
                        </TableCell>
                        <TableCell className='text-sm text-muted-foreground'>
                          {item.create_time
                            ? new Date(item.create_time).toLocaleString('zh-CN')
                            : '-'}
                        </TableCell>
                        <TableCell className='text-sm text-muted-foreground'>
                          {item.update_time
                            ? new Date(item.update_time).toLocaleString('zh-CN')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center gap-2'>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => handleEdit(item)}
                            >
                              <Edit className='h-4 w-4 mr-1' />
                              编辑
                            </Button>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() =>
                                handleDelete(item.id, item.keyword)
                              }
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

      {/* 创建/编辑对话框 */}
      <ResponsiveDialog
        isDialog
        isOpen={showDialog}
        onOpenChange={setShowDialog}
        title={editingKeyword ? '编辑热词' : '新增热词'}
        contentProps={{
          className: 'max-w-[500px]',
        }}
      >
        <div className='space-y-4 p-4'>
          <div className='space-y-3'>
            <div className='space-y-2'>
              <Label htmlFor='keyword'>热词 *</Label>
              <Input
                id='keyword'
                value={formData.keyword}
                onChange={e =>
                  setFormData({ ...formData, keyword: e.target.value })
                }
                placeholder='请输入热词'
                autoFocus
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='appid'>应用ID *</Label>
              {editingKeyword ? (
                <Select
                  value={formData.appid}
                  onValueChange={value =>
                    setFormData({ ...formData, appid: value })
                  }
                >
                  <SelectTrigger id='appid'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='jiantie'>简帖</SelectItem>
                    <SelectItem value='maka'>MAKA</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id='appid'
                  value={formData.appid === 'jiantie' ? '简帖' : 'MAKA'}
                  readOnly
                  className='bg-muted'
                />
              )}
            </div>
            <div className='space-y-2'>
              <Label htmlFor='sort_order'>排序值</Label>
              <Input
                id='sort_order'
                type='number'
                value={formData.sort_order}
                onChange={e =>
                  setFormData({
                    ...formData,
                    sort_order: Number(e.target.value) || 0,
                  })
                }
                placeholder='数值越大越靠前，默认为0'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='online'>上线状态</Label>
              <Select
                value={formData.online ? 'true' : 'false'}
                onValueChange={value =>
                  setFormData({ ...formData, online: value === 'true' })
                }
              >
                <SelectTrigger id='online'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='true'>已上线</SelectItem>
                  <SelectItem value='false'>未上线</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setShowDialog(false)}>
                取消
              </Button>
              <Button
                onClick={handleSave}
                disabled={!formData.keyword.trim() || !formData.appid.trim()}
              >
                保存
              </Button>
            </DialogFooter>
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  );
}

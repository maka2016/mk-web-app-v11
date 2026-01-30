'use client';

import { trpc } from '@/utils/trpc';
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
import { Edit, Loader2, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';

const PAGE_SIZE = 20;

export default function DesignersManagerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState(searchParams.get('name') || '');
  const [deleted, setDeleted] = useState<string>(
    searchParams.get('deleted') || 'all'
  );
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  // 编辑/创建对话框状态
  const [showDialog, setShowDialog] = useState(false);
  const [editingDesigner, setEditingDesigner] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    desc: '',
    avatar: '',
    email: '',
    phone: '',
    uid: '',
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

      if (name) filters.name = name;
      if (deleted !== 'all') filters.deleted = deleted === 'true';

      const [list, count] = await Promise.all([
        trpc.designer.findMany.query(filters) as Promise<any[]>,
        trpc.designer.count.query({
          name: filters.name,
          deleted: filters.deleted,
        }) as Promise<number>,
      ]);

      setData(list || []);
      setTotal(count || 0);
    } catch (error) {
      console.error('Failed to fetch designers:', error);
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
    if (name) params.set('name', name);
    if (deleted !== 'all') params.set('deleted', deleted);
    if (page > 1) params.set('page', String(page));
    router.replace(`/dashboard/manager/designers?${params.toString()}`);
  };

  // 分页变化时重新查询
  useEffect(() => {
    const hasParams = name || deleted !== 'all';
    if (hasParams) {
      loadData();
      updateURL();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // 打开创建对话框
  const handleCreate = () => {
    setEditingDesigner(null);
    setFormData({
      name: '',
      desc: '',
      avatar: '',
      email: '',
      phone: '',
      uid: '',
    });
    setShowDialog(true);
  };

  // 打开编辑对话框
  const handleEdit = (designer: any) => {
    setEditingDesigner(designer);
    setFormData({
      name: designer.name || '',
      desc: designer.desc || '',
      avatar: designer.avatar || '',
      email: designer.email || '',
      phone: designer.phone || '',
      uid: String(designer.uid || ''),
    });
    setShowDialog(true);
  };

  // 保存设计师
  const handleSave = async () => {
    try {
      if (editingDesigner) {
        // 更新
        const { uid, ...updateData } = formData;
        await trpc.designer.update.mutate({
          id: editingDesigner.id,
          ...updateData,
        });
      } else {
        // 创建
        if (!formData.uid) {
          alert('请输入设计师UID');
          return;
        }
        await trpc.designer.create.mutate({
          ...formData,
          uid: Number(formData.uid),
        });
      }
      setShowDialog(false);
      await loadData();
      updateURL();
    } catch (error: any) {
      alert(`保存失败: ${error.message || '未知错误'}`);
    }
  };

  // 删除设计师
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个设计师吗？')) {
      return;
    }
    try {
      await trpc.designer.delete.mutate({ id });
      await loadData();
      updateURL();
    } catch (error: any) {
      alert(`删除失败: ${error.message || '未知错误'}`);
    }
  };

  // 恢复设计师
  const handleRecover = async (id: string) => {
    if (!confirm('确定要恢复这个设计师吗？')) {
      return;
    }
    try {
      await trpc.designer.recover.mutate({ id });
      await loadData();
      updateURL();
    } catch (error: any) {
      alert(`恢复失败: ${error.message || '未知错误'}`);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className='mx-auto p-6 space-y-6'>
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle>设计师管理</CardTitle>
            <Button onClick={handleCreate} size='sm'>
              <Plus className='h-4 w-4 mr-2' />
              新增设计师
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            {/* 搜索和筛选区域 */}
            <div className='flex flex-wrap items-center gap-3'>
              <div className='flex items-center gap-2'>
                <Label className='text-sm font-medium min-w-[60px]'>
                  设计师名称
                </Label>
                <Input
                  placeholder='搜索设计师名称'
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  className='h-9 w-[200px]'
                />
              </div>
              <div className='flex items-center gap-2'>
                <Label className='text-sm font-medium min-w-[70px]'>
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
                      <TableHead className='min-w-[120px]'>名称</TableHead>
                      <TableHead className='min-w-[120px]'>描述</TableHead>
                      <TableHead className='min-w-[80px]'>模板数</TableHead>
                      <TableHead className='min-w-[120px]'>创建时间</TableHead>
                      <TableHead className='min-w-[120px]'>更新时间</TableHead>
                      <TableHead className='min-w-[80px]'>状态</TableHead>
                      <TableHead className='min-w-[180px]'>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className='font-mono text-xs'>
                          {item.uid || '-'}
                        </TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className='text-muted-foreground'>
                          {item.desc || '-'}
                        </TableCell>
                        <TableCell>{item._count?.templates || 0}</TableCell>
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
                        <TableCell>
                          <div className='flex items-center gap-2'>
                            {!item.deleted && (
                              <>
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
                                  onClick={() => handleDelete(item.id)}
                                >
                                  <Trash2 className='h-4 w-4 mr-1' />
                                  删除
                                </Button>
                              </>
                            )}
                            {item.deleted && (
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() => handleRecover(item.id)}
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
        title={editingDesigner ? '编辑设计师' : '新增设计师'}
        contentProps={{
          className: 'max-w-[600px]',
        }}
      >
        <div className='space-y-4 p-4'>
          <div className='space-y-3'>
            <div className='space-y-2'>
              <Label htmlFor='name'>名称 *</Label>
              <Input
                id='name'
                value={formData.name}
                onChange={e =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder='请输入设计师名称'
              />
              {!editingDesigner && (
                <div className='space-y-2'>
                  <Label htmlFor='uid'>UID *</Label>
                  <Input
                    id='uid'
                    type='number'
                    value={formData.uid}
                    onChange={e =>
                      setFormData({ ...formData, uid: e.target.value })
                    }
                    placeholder='请输入设计师UID（唯一）'
                  />
                </div>
              )}
              {editingDesigner && (
                <div className='space-y-2'>
                  <Label htmlFor='uid-display'>UID</Label>
                  <Input
                    id='uid-display'
                    value={formData.uid}
                    disabled
                    className='bg-muted'
                  />
                </div>
              )}
              <div className='space-y-2'>
                <Label htmlFor='desc'>描述</Label>
                <Input
                  id='desc'
                  value={formData.desc}
                  onChange={e =>
                    setFormData({ ...formData, desc: e.target.value })
                  }
                  placeholder='请输入设计师描述'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='avatar'>头像URL</Label>
                <Input
                  id='avatar'
                  value={formData.avatar}
                  onChange={e =>
                    setFormData({ ...formData, avatar: e.target.value })
                  }
                  placeholder='请输入头像URL'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='email'>邮箱</Label>
                <Input
                  id='email'
                  type='email'
                  value={formData.email}
                  onChange={e =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder='请输入邮箱'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='phone'>电话</Label>
                <Input
                  id='phone'
                  value={formData.phone}
                  onChange={e =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder='请输入电话'
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setShowDialog(false)}>
                取消
              </Button>
              <Button
                onClick={handleSave}
                disabled={!formData.name || (!editingDesigner && !formData.uid)}
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

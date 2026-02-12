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
import { DataPagination } from '@/components/DataPagination';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import { Switch } from '@workspace/ui/components/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table';
import { Textarea } from '@workspace/ui/components/textarea';
import { Loader2, Pencil, Plus, Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';

const PAGE_SIZE = 20;

/**
 * @deprecated
 * 废弃功能
 */
export default function SpecsManagerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [alias, setAlias] = useState(searchParams.get('alias') || '');
  const [deleted, setDeleted] = useState<string>(
    searchParams.get('deleted') || 'false'
  );
  const [appid, setAppid] = useState(searchParams.get('appid') || '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    alias: '',
    desc: '',
    width: '',
    height: '',
    display_name: '',
    offline: false,
    deleted: false,
    export_format: '',
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    alias: '',
    desc: '',
    width: '',
    height: '',
    display_name: '',
    offline: false,
    deleted: false,
    export_format: '',
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

      if (alias) filters.alias = alias;
      if (deleted === 'true' || deleted === 'false') {
        filters.deleted = deleted === 'true';
      }
      if (appid) filters.appid = appid;

      const result = (await trpc.worksSpec.findManyWithCount.query(
        filters
      )) as { list: any[]; total: number };

      setData(result?.list || []);
      setTotal(result?.total || 0);
    } catch (error) {
      console.error('Failed to fetch specs:', error);
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

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setEditForm({
      alias: item.alias || '',
      desc: item.desc || '',
      width: item.width ? String(item.width) : '',
      height: item.height ? String(item.height) : '',
      display_name: item.display_name || '',
      offline: item.offline || false,
      deleted: item.deleted || false,
      export_format: item.export_format || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingItem) return;

    setIsUpdating(true);
    try {
      const updateData: any = {
        id: editingItem.id,
      };

      // 只更新有变化的字段
      if (editForm.alias !== (editingItem.alias || '')) {
        updateData.alias = editForm.alias;
      }
      if (editForm.desc !== (editingItem.desc || '')) {
        updateData.desc = editForm.desc || undefined;
      }
      if (editForm.display_name !== (editingItem.display_name || '')) {
        updateData.display_name = editForm.display_name || undefined;
      }

      const widthNum = editForm.width ? Number(editForm.width) : null;
      const heightNum = editForm.height ? Number(editForm.height) : null;

      if (
        widthNum !== null &&
        !isNaN(widthNum) &&
        widthNum !== editingItem.width
      ) {
        updateData.width = widthNum;
      }
      if (
        heightNum !== null &&
        !isNaN(heightNum) &&
        heightNum !== editingItem.height
      ) {
        updateData.height = heightNum;
      }

      if (editForm.offline !== (editingItem.offline || false)) {
        updateData.offline = editForm.offline;
      }
      if (editForm.deleted !== (editingItem.deleted || false)) {
        updateData.deleted = editForm.deleted;
      }
      if (editForm.export_format !== (editingItem.export_format || '')) {
        updateData.export_format = editForm.export_format || undefined;
      }

      // 如果没有需要更新的字段，直接关闭对话框
      if (Object.keys(updateData).length === 1) {
        setIsEditDialogOpen(false);
        setEditingItem(null);
        setIsUpdating(false);
        return;
      }

      await trpc.worksSpec.update.mutate(updateData);

      // 刷新数据
      await loadData();
      updateURL();

      setIsEditDialogOpen(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Failed to update spec:', error);
      alert('更新失败，请重试');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.name.trim() || !createForm.alias.trim()) {
      alert('请填写名称和别名');
      return;
    }

    setIsCreating(true);
    try {
      const createData: any = {
        name: createForm.name.trim(),
        alias: createForm.alias.trim(),
        deleted: false, // 默认未删除
      };

      if (createForm.desc?.trim()) {
        createData.desc = createForm.desc.trim();
      }
      if (createForm.display_name?.trim()) {
        createData.display_name = createForm.display_name.trim();
      }

      const widthNum = createForm.width ? Number(createForm.width) : null;
      const heightNum = createForm.height ? Number(createForm.height) : null;

      if (widthNum !== null && !isNaN(widthNum)) {
        createData.width = widthNum;
      }
      if (heightNum !== null && !isNaN(heightNum)) {
        createData.height = heightNum;
      }

      if (createForm.offline) {
        createData.offline = createForm.offline;
      }
      // 如果用户明确设置为已删除，则覆盖默认值
      if (createForm.deleted) {
        createData.deleted = true;
      }
      if (createForm.export_format?.trim()) {
        createData.export_format = createForm.export_format.trim();
      }

      await trpc.worksSpec.create.mutate(createData);

      // 刷新数据
      await loadData();
      updateURL();

      setIsCreateDialogOpen(false);
      setCreateForm({
        name: '',
        alias: '',
        desc: '',
        width: '',
        height: '',
        display_name: '',
        offline: false,
        deleted: false,
        export_format: '',
      });
    } catch (error) {
      console.error('Failed to create spec:', error);
      alert('创建失败，请重试');
    } finally {
      setIsCreating(false);
    }
  };

  const updateURL = () => {
    const params = new URLSearchParams();
    if (alias) params.set('alias', alias);
    if (deleted === 'true' || deleted === 'false') {
      params.set('deleted', deleted);
    }
    if (appid) params.set('appid', appid);
    if (page > 1) params.set('page', String(page));
    router.replace(`/dashboard/manager/specs?${params.toString()}`);
  };

  // 初始加载和分页变化时重新查询
  useEffect(() => {
    loadData();
    updateURL();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className='mx-auto p-6 space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>规格管理</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            {/* 搜索和筛选区域 */}
            <div className='flex flex-wrap items-center gap-3'>
              <div className='flex items-center gap-2'>
                <Label className='text-sm font-mediummin-w-[40px]'>别名</Label>
                <Input
                  placeholder='规格别名'
                  value={alias}
                  onChange={e => setAlias(e.target.value)}
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
                <Label className='text-sm font-mediummin-w-[60px]'>
                  应用ID
                </Label>
                <Input
                  placeholder='应用ID'
                  value={appid}
                  onChange={e => setAppid(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  className='h-9 w-[160px]'
                />
              </div>
              <Button onClick={handleSearch} size='sm' className='h-9'>
                <Search className='h-4 w-4 mr-2' />
                查询
              </Button>
              <Button
                onClick={() => {
                  setCreateForm({
                    name: '',
                    alias: '',
                    desc: '',
                    width: '',
                    height: '',
                    display_name: '',
                    offline: false,
                    deleted: false,
                    export_format: '',
                  });
                  setIsCreateDialogOpen(true);
                }}
                size='sm'
                className='h-9'
              >
                <Plus className='h-4 w-4 mr-2' />
                添加规格
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
                      <TableHead className='min-w-[120px] max-w-[120px]'>
                        名称
                      </TableHead>
                      <TableHead className='min-w-[120px] max-w-[120px]'>
                        显示名称
                      </TableHead>
                      <TableHead className='min-w-[120px] max-w-[120px]'>
                        别名
                      </TableHead>
                      <TableHead className='min-w-[120px] max-w-[120px]'>
                        尺寸
                      </TableHead>
                      <TableHead className='min-w-[80px] max-w-[120px]'>
                        单位
                      </TableHead>
                      <TableHead className='min-w-[80px] max-w-[150px]'>
                        是否翻页
                      </TableHead>
                      <TableHead className='min-w-[80px] max-w-[150px]'>
                        是否平铺
                      </TableHead>
                      <TableHead className='min-w-[120px] max-w-[120px]'>
                        创建时间
                      </TableHead>
                      <TableHead className='min-w-[120px] max-w-[120px]'>
                        更新时间
                      </TableHead>
                      <TableHead className='min-w-[80px] max-w-[120px]'>
                        状态
                      </TableHead>
                      <TableHead className='min-w-[80px] max-w-[150px]'>
                        操作
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className='font-medium min-w-[120px] max-w-[120px]'>
                          {item.name}
                        </TableCell>
                        <TableCell className='min-w-[120px] max-w-[120px]'>
                          {item.display_name || item.name}
                        </TableCell>
                        <TableCell className='min-w-[120px] max-w-[120px]'>
                          {item.alias}
                        </TableCell>
                        <TableCell className='min-w-[120px] max-w-[120px]'>
                          {item.width && item.height
                            ? `${item.width} × ${item.height}`
                            : '-'}
                        </TableCell>
                        <TableCell className='min-w-[80px] max-w-[120px]'>
                          {item.unit || '-'}
                        </TableCell>
                        <TableCell className='min-w-[80px] max-w-[150px]'>
                          {item.is_flip_page ? (
                            <span className='text-green-600'>是</span>
                          ) : (
                            <span className='text-muted-foreground'>否</span>
                          )}
                        </TableCell>
                        <TableCell className='min-w-[80px] max-w-[150px]'>
                          {item.is_flat_page ? (
                            <span className='text-green-600'>是</span>
                          ) : (
                            <span className='text-muted-foreground'>否</span>
                          )}
                        </TableCell>
                        <TableCell className='text-sm text-muted-foreground min-w-[120px] max-w-[120px]'>
                          {item.create_time
                            ? new Date(item.create_time).toLocaleString('zh-CN')
                            : '-'}
                        </TableCell>
                        <TableCell className='text-sm text-muted-foreground min-w-[120px] max-w-[120px]'>
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
                        <TableCell className='min-w-[80px] max-w-[150px]'>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => handleEdit(item)}
                            className='h-8 px-2'
                          >
                            <Pencil className='h-4 w-4' />
                          </Button>
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

      {/* 编辑对话框 */}
      <ResponsiveDialog
        isOpen={isEditDialogOpen}
        onOpenChange={open => {
          setIsEditDialogOpen(open);
          if (!open) {
            setEditingItem(null);
          }
        }}
        title='编辑规格'
        contentProps={{
          className: 'max-w-[600px] w-full',
        }}
      >
        <div className='space-y-4 p-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='edit-alias'>别名 *</Label>
              <Input
                id='edit-alias'
                value={editForm.alias}
                onChange={e =>
                  setEditForm({ ...editForm, alias: e.target.value })
                }
                placeholder='请输入别名'
                className='h-9'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='edit-display-name'>显示名称</Label>
              <Input
                id='edit-display-name'
                value={editForm.display_name}
                onChange={e =>
                  setEditForm({ ...editForm, display_name: e.target.value })
                }
                placeholder='请输入显示名称'
                className='h-9'
              />
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='edit-desc'>描述</Label>
            <Textarea
              id='edit-desc'
              value={editForm.desc}
              onChange={e => setEditForm({ ...editForm, desc: e.target.value })}
              placeholder='请输入描述'
              className='min-h-[80px]'
            />
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='edit-width'>宽度</Label>
              <Input
                id='edit-width'
                type='number'
                value={editForm.width}
                onChange={e =>
                  setEditForm({ ...editForm, width: e.target.value })
                }
                placeholder='请输入宽度'
                className='h-9'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='edit-height'>高度</Label>
              <Input
                id='edit-height'
                type='number'
                value={editForm.height}
                onChange={e =>
                  setEditForm({ ...editForm, height: e.target.value })
                }
                placeholder='请输入高度'
                className='h-9'
              />
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='edit-export-format'>导出格式</Label>
            <Input
              id='edit-export-format'
              value={editForm.export_format}
              onChange={e =>
                setEditForm({ ...editForm, export_format: e.target.value })
              }
              placeholder='请输入导出格式，多个格式用逗号分隔，如：video,html,image'
              className='h-9'
            />
            <p className='text-xs text-muted-foreground'>
              支持的值：video（视频）、html（网页）、image（图片），多个值用逗号分隔
            </p>
          </div>

          <div className='flex items-center justify-between space-x-2'>
            <div className='flex items-center space-x-2'>
              <Switch
                id='edit-offline'
                checked={editForm.offline}
                onCheckedChange={checked =>
                  setEditForm({ ...editForm, offline: checked })
                }
              />
              <Label htmlFor='edit-offline'>离线模式</Label>
            </div>
            <div className='flex items-center space-x-2'>
              <Switch
                id='edit-deleted'
                checked={editForm.deleted}
                onCheckedChange={checked =>
                  setEditForm({ ...editForm, deleted: checked })
                }
              />
              <Label htmlFor='edit-deleted'>已删除</Label>
            </div>
          </div>

          <div className='flex justify-end gap-2 pt-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingItem(null);
              }}
              disabled={isUpdating}
            >
              取消
            </Button>
            <Button
              size='sm'
              onClick={handleUpdate}
              disabled={isUpdating || !editForm.alias.trim()}
            >
              {isUpdating ? (
                <>
                  <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                  更新中...
                </>
              ) : (
                '保存'
              )}
            </Button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* 创建对话框 */}
      <ResponsiveDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={open => {
          setIsCreateDialogOpen(open);
          if (!open) {
            setCreateForm({
              name: '',
              alias: '',
              desc: '',
              width: '',
              height: '',
              display_name: '',
              offline: false,
              deleted: false,
              export_format: '',
            });
          }
        }}
        title='添加规格'
        contentProps={{
          className: 'max-w-[600px] w-full',
        }}
      >
        <div className='space-y-4 p-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='create-name'>名称 *</Label>
              <Input
                id='create-name'
                value={createForm.name}
                onChange={e =>
                  setCreateForm({ ...createForm, name: e.target.value })
                }
                placeholder='请输入名称'
                className='h-9'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='create-alias'>别名 *</Label>
              <Input
                id='create-alias'
                value={createForm.alias}
                onChange={e =>
                  setCreateForm({ ...createForm, alias: e.target.value })
                }
                placeholder='请输入别名'
                className='h-9'
              />
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='create-display-name'>显示名称</Label>
            <Input
              id='create-display-name'
              value={createForm.display_name}
              onChange={e =>
                setCreateForm({ ...createForm, display_name: e.target.value })
              }
              placeholder='请输入显示名称'
              className='h-9'
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='create-desc'>描述</Label>
            <Textarea
              id='create-desc'
              value={createForm.desc}
              onChange={e =>
                setCreateForm({ ...createForm, desc: e.target.value })
              }
              placeholder='请输入描述'
              className='min-h-[80px]'
            />
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='create-width'>宽度</Label>
              <Input
                id='create-width'
                type='number'
                value={createForm.width}
                onChange={e =>
                  setCreateForm({ ...createForm, width: e.target.value })
                }
                placeholder='请输入宽度'
                className='h-9'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='create-height'>高度</Label>
              <Input
                id='create-height'
                type='number'
                value={createForm.height}
                onChange={e =>
                  setCreateForm({ ...createForm, height: e.target.value })
                }
                placeholder='请输入高度'
                className='h-9'
              />
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='create-export-format'>导出格式</Label>
            <Input
              id='create-export-format'
              value={createForm.export_format}
              onChange={e =>
                setCreateForm({ ...createForm, export_format: e.target.value })
              }
              placeholder='请输入导出格式，多个格式用逗号分隔，如：video,html,image'
              className='h-9'
            />
            <p className='text-xs text-muted-foreground'>
              支持的值：video（视频）、html（网页）、image（图片），多个值用逗号分隔
            </p>
          </div>

          <div className='flex items-center justify-between space-x-2'>
            <div className='flex items-center space-x-2'>
              <Switch
                id='create-offline'
                checked={createForm.offline}
                onCheckedChange={checked =>
                  setCreateForm({ ...createForm, offline: checked })
                }
              />
              <Label htmlFor='create-offline'>离线模式</Label>
            </div>
            <div className='flex items-center space-x-2'>
              <Switch
                id='create-deleted'
                checked={createForm.deleted}
                onCheckedChange={checked =>
                  setCreateForm({ ...createForm, deleted: checked })
                }
              />
              <Label htmlFor='create-deleted'>已删除</Label>
            </div>
          </div>

          <div className='flex justify-end gap-2 pt-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                setIsCreateDialogOpen(false);
                setCreateForm({
                  name: '',
                  alias: '',
                  desc: '',
                  width: '',
                  height: '',
                  display_name: '',
                  offline: false,
                  deleted: false,
                  export_format: '',
                });
              }}
              disabled={isCreating}
            >
              取消
            </Button>
            <Button
              size='sm'
              onClick={handleCreate}
              disabled={
                isCreating ||
                !createForm.name.trim() ||
                !createForm.alias.trim()
              }
            >
              {isCreating ? (
                <>
                  <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                  创建中...
                </>
              ) : (
                '创建'
              )}
            </Button>
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  );
}

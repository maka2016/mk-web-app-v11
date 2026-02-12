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
import { Textarea } from '@workspace/ui/components/textarea';
import { DataPagination } from '@/components/DataPagination';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table';
import { Badge } from '@workspace/ui/components/badge';
import { Checkbox } from '@workspace/ui/components/checkbox';
import {
  Edit,
  Loader2,
  Plus,
  Search,
  Trash2,
  Shield,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const PAGE_SIZE = 20;

// 菜单分组列表
const MENU_GROUPS = [
  { id: '工作台', label: '工作台' },
  { id: '基础数据管理', label: '基础数据管理' },
  { id: '平台资源管理', label: '平台资源管理' },
  { id: 'BI报表', label: 'BI报表' },
  { id: '业务报表（废弃）', label: '业务报表（废弃）' },
  { id: '风控管理', label: '风控管理' },
  { id: '权限管理', label: '权限管理' },
];

export default function AdminRolesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState(searchParams.get('name') || '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  // 编辑/创建对话框状态
  const [showDialog, setShowDialog] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [assigningRole, setAssigningRole] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    alias: '',
    description: '',
  });
  const [selectedMenuGroups, setSelectedMenuGroups] = useState<string[]>([]);

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

      const [list, count] = await Promise.all([
        trpc.adminRole.findMany.query(filters) as Promise<any[]>,
        trpc.adminRole.count.query({
          name: filters.name,
        }) as Promise<number>,
      ]);

      setData(list || []);
      setTotal(count || 0);
    } catch (error: any) {
      console.error('Failed to fetch roles:', error);
      toast.error(error.message || '加载失败');
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
    if (page > 1) params.set('page', String(page));
    router.replace(`/dashboard/manager/admin/roles?${params.toString()}`);
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

  // 打开创建对话框
  const handleCreate = () => {
    setEditingRole(null);
    setFormData({
      name: '',
      alias: '',
      description: '',
    });
    setShowDialog(true);
  };

  // 打开编辑对话框
  const handleEdit = (role: any) => {
    setEditingRole(role);
    setFormData({
      name: role.name || '',
      alias: role.alias || '',
      description: role.description || '',
    });
    setShowDialog(true);
  };

  // 打开分配权限对话框
  const handleAssignPermissions = async (role: any) => {
    setAssigningRole(role);
    try {
      const roleDetail = await trpc.adminRole.findById.query({
        id: role.id,
      });
      const groups = Array.isArray(roleDetail?.menu_groups)
        ? roleDetail?.menu_groups
        : [];
      setSelectedMenuGroups(groups as string[]);
      setShowPermissionDialog(true);
    } catch (error: any) {
      toast.error(error.message || '加载权限失败');
    }
  };

  // 保存角色
  const handleSave = async () => {
    try {
      if (editingRole) {
        // 更新
        await trpc.adminRole.update.mutate({
          id: editingRole.id,
          ...formData,
        });
        toast.success('更新成功');
      } else {
        // 创建
        await trpc.adminRole.create.mutate({
          ...formData,
        });
        toast.success('创建成功');
      }
      setShowDialog(false);
      await loadData();
      updateURL();
    } catch (error: any) {
      toast.error(error.message || '保存失败');
    }
  };

  // 删除角色
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个角色吗？')) {
      return;
    }
    try {
      await trpc.adminRole.delete.mutate({ id });
      toast.success('删除成功');
      await loadData();
      updateURL();
    } catch (error: any) {
      toast.error(error.message || '删除失败');
    }
  };

  // 保存权限分配
  const handleSavePermissions = async () => {
    if (!assigningRole) return;
    try {
      await trpc.adminRole.assignPermissions.mutate({
        roleId: assigningRole.id,
        menuGroups: selectedMenuGroups,
      });
      toast.success('权限分配成功');
      setShowPermissionDialog(false);
      await loadData();
    } catch (error: any) {
      toast.error(error.message || '分配失败');
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className='mx-auto p-6 space-y-6'>
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle>角色管理</CardTitle>
            <Button onClick={handleCreate} size='sm'>
              <Plus className='h-4 w-4 mr-2' />
              新增角色
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            {/* 搜索区域 */}
            <div className='flex flex-wrap items-center gap-3'>
              <div className='flex items-center gap-2'>
                <Label className='text-sm font-medium min-w-[60px]'>
                  角色名称
                </Label>
                <Input
                  placeholder='搜索角色名称'
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  className='h-9 w-[200px]'
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
                      <TableHead className='min-w-[120px]'>角色名称</TableHead>
                      <TableHead className='min-w-[120px]'>别名</TableHead>
                      <TableHead className='min-w-[200px]'>描述</TableHead>
                      <TableHead className='min-w-[140px]'>权限（菜单分组）</TableHead>
                      <TableHead className='min-w-[100px]'>使用人数</TableHead>
                      <TableHead className='min-w-[120px]'>创建时间</TableHead>
                      <TableHead className='min-w-[200px]'>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className='font-medium'>
                          {item.name}
                        </TableCell>
                        <TableCell>{item.alias || '-'}</TableCell>
                        <TableCell className='text-muted-foreground'>
                          {item.description || '-'}
                        </TableCell>
                        <TableCell>
                          <div className='flex flex-wrap gap-1'>
                            {(Array.isArray(item.menu_groups)
                              ? (item.menu_groups as string[])
                              : []
                            ).length > 0 ? (
                              (item.menu_groups as string[]).map((g: string) => (
                                <Badge
                                  key={g}
                                  variant='secondary'
                                  className='text-xs'
                                >
                                  {g}
                                </Badge>
                              ))
                            ) : (
                              <span className='text-sm text-muted-foreground'>
                                未分配
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant='secondary'>
                            {item._count?.adminUserRoles || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className='text-sm text-muted-foreground'>
                          {item.create_time
                            ? new Date(item.create_time).toLocaleString('zh-CN')
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
                              onClick={() => handleAssignPermissions(item)}
                            >
                              <Shield className='h-4 w-4 mr-1' />
                              权限
                            </Button>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => handleDelete(item.id)}
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

      {/* 创建/编辑对话框 */}
      <ResponsiveDialog
        isDialog
        isOpen={showDialog}
        onOpenChange={setShowDialog}
        title={editingRole ? '编辑角色' : '新增角色'}
        contentProps={{
          className: 'max-w-[500px]',
        }}
      >
        <div className='space-y-4 p-4'>
          <div className='space-y-3'>
            <div className='space-y-2'>
              <Label htmlFor='name'>角色名称 *</Label>
              <Input
                id='name'
                value={formData.name}
                onChange={e =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder='请输入角色名称'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='alias'>别名</Label>
              <Input
                id='alias'
                value={formData.alias}
                onChange={e =>
                  setFormData({ ...formData, alias: e.target.value })
                }
                placeholder='请输入角色别名（可选）'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='description'>描述</Label>
              <Textarea
                id='description'
                value={formData.description}
                onChange={e =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder='请输入角色描述（可选）'
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setShowDialog(false)}>
                取消
              </Button>
              <Button onClick={handleSave} disabled={!formData.name}>
                保存
              </Button>
            </DialogFooter>
          </div>
        </div>
      </ResponsiveDialog>

      {/* 分配权限对话框 */}
      <ResponsiveDialog
        isDialog
        isOpen={showPermissionDialog}
        onOpenChange={setShowPermissionDialog}
        title='分配权限'
        contentProps={{
          className: 'max-w-[500px]',
        }}
      >
        <div className='space-y-4 p-4'>
          <div className='space-y-3'>
            <div className='text-sm text-muted-foreground'>
              为角色 <strong>{assigningRole?.name}</strong> 分配菜单分组权限
            </div>
            <div className='space-y-2 max-h-[400px] overflow-y-auto'>
              {MENU_GROUPS.map(group => (
                <div
                  key={group.id}
                  className='flex items-center space-x-2 p-2 hover:bg-accent rounded'
                >
                  <Checkbox
                    id={`menu-group-${group.id}`}
                    checked={selectedMenuGroups.includes(group.id)}
                    onCheckedChange={checked => {
                      if (checked) {
                        setSelectedMenuGroups([...selectedMenuGroups, group.id]);
                      } else {
                        setSelectedMenuGroups(
                          selectedMenuGroups.filter(id => id !== group.id)
                        );
                      }
                    }}
                  />
                  <Label
                    htmlFor={`menu-group-${group.id}`}
                    className='flex-1 cursor-pointer'
                  >
                    <div className='font-medium'>{group.label}</div>
                  </Label>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button
                variant='outline'
                onClick={() => setShowPermissionDialog(false)}
              >
                取消
              </Button>
              <Button onClick={handleSavePermissions}>保存</Button>
            </DialogFooter>
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  );
}

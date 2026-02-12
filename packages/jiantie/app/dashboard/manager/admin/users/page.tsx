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
import { DataPagination } from '@/components/DataPagination';
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
import { Badge } from '@workspace/ui/components/badge';
import { Checkbox } from '@workspace/ui/components/checkbox';
import {
  Edit,
  Loader2,
  Plus,
  Search,
  Trash2,
  UserCog,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState(searchParams.get('username') || '');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [status, setStatus] = useState<string>(
    searchParams.get('status') || 'all'
  );
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [roles, setRoles] = useState<any[]>([]);

  // 编辑/创建对话框状态
  const [showDialog, setShowDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [assigningUser, setAssigningUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    status: 0,
  });
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  // 加载角色列表
  const loadRoles = async () => {
    try {
      const roleList = await trpc.adminRole.findMany.query();
      setRoles(roleList || []);
    } catch (error) {
      console.error('Failed to load roles:', error);
    }
  };

  const loadData = async (targetPage?: number) => {
    const currentPage = targetPage !== undefined ? targetPage : page;
    setLoading(true);
    try {
      const skip = (currentPage - 1) * PAGE_SIZE;
      const filters: any = {
        skip,
        take: PAGE_SIZE,
      };

      if (username) filters.username = username;
      if (email) filters.email = email;
      if (status !== 'all') filters.status = Number(status);

      const [list, count] = await Promise.all([
        trpc.adminUser.findMany.query(filters) as Promise<any[]>,
        trpc.adminUser.count.query({
          username: filters.username,
          email: filters.email,
          status: filters.status,
        }) as Promise<number>,
      ]);

      setData(list || []);
      setTotal(count || 0);
    } catch (error: any) {
      console.error('Failed to fetch admin users:', error);
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
    if (username) params.set('username', username);
    if (email) params.set('email', email);
    if (status !== 'all') params.set('status', status);
    if (page > 1) params.set('page', String(page));
    router.replace(`/dashboard/manager/admin/users?${params.toString()}`);
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
    loadRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 打开创建对话框
  const handleCreate = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      email: '',
      password: '',
      status: 0,
    });
    setShowDialog(true);
  };

  // 打开编辑对话框
  const handleEdit = (user: any) => {
    setEditingUser(user);
    setFormData({
      username: user.username || '',
      email: user.email || '',
      password: '',
      status: user.status || 0,
    });
    setShowDialog(true);
  };

  // 打开分配角色对话框
  const handleAssignRoles = async (user: any) => {
    setAssigningUser(user);
    try {
      const userRoles = await trpc.adminUser.getRoles.query({
        adminUserId: user.id,
      });
      setSelectedRoleIds(userRoles.map((r: any) => String(r.id)));
      setShowRoleDialog(true);
    } catch (error: any) {
      toast.error(error.message || '加载角色失败');
    }
  };

  // 保存账号
  const handleSave = async () => {
    try {
      if (editingUser) {
        // 更新
        await trpc.adminUser.update.mutate({
          id: editingUser.id,
          ...formData,
        });
        toast.success('更新成功');
      } else {
        // 创建
        if (!formData.password) {
          toast.error('请输入密码');
          return;
        }
        await trpc.adminUser.create.mutate({
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

  // 删除账号
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个账号吗？')) {
      return;
    }
    try {
      await trpc.adminUser.delete.mutate({ id });
      toast.success('删除成功');
      await loadData();
      updateURL();
    } catch (error: any) {
      toast.error(error.message || '删除失败');
    }
  };

  // 保存角色分配
  const handleSaveRoles = async () => {
    if (!assigningUser) return;
    try {
      await trpc.adminUser.assignRoles.mutate({
        adminUserId: assigningUser.id,
        roleIds: selectedRoleIds,
      });
      toast.success('角色分配成功');
      setShowRoleDialog(false);
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
            <CardTitle>账号管理</CardTitle>
            <Button onClick={handleCreate} size='sm'>
              <Plus className='h-4 w-4 mr-2' />
              新增账号
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            {/* 搜索和筛选区域 */}
            <div className='flex flex-wrap items-center gap-3'>
              <div className='flex items-center gap-2'>
                <Label className='text-sm font-medium min-w-[60px]'>
                  用户名
                </Label>
                <Input
                  placeholder='搜索用户名'
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  className='h-9 w-[200px]'
                />
              </div>
              <div className='flex items-center gap-2'>
                <Label className='text-sm font-medium min-w-[60px]'>
                  邮箱
                </Label>
                <Input
                  placeholder='搜索邮箱'
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  className='h-9 w-[200px]'
                />
              </div>
              <div className='flex items-center gap-2'>
                <Label className='text-sm font-medium min-w-[70px]'>
                  状态
                </Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className='h-9 w-[120px]'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>全部</SelectItem>
                    <SelectItem value='0'>正常</SelectItem>
                    <SelectItem value='-1'>已删除</SelectItem>
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
                      <TableHead className='min-w-[120px]'>用户名</TableHead>
                      <TableHead className='min-w-[200px]'>邮箱</TableHead>
                      <TableHead className='min-w-[200px]'>角色</TableHead>
                      <TableHead className='min-w-[120px]'>创建时间</TableHead>
                      <TableHead className='min-w-[120px]'>更新时间</TableHead>
                      <TableHead className='min-w-[80px]'>状态</TableHead>
                      <TableHead className='min-w-[220px]'>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className='font-medium'>
                          {item.username}
                        </TableCell>
                        <TableCell>{item.email || '-'}</TableCell>
                        <TableCell>
                          <div className='flex flex-wrap gap-1'>
                            {item.adminUserRoles?.length > 0 ? (
                              item.adminUserRoles.map((ur: any) => (
                                <Badge
                                  key={ur.id}
                                  variant='secondary'
                                  className='text-xs'
                                >
                                  {ur.role?.name || ur.role?.alias || '-'}
                                </Badge>
                              ))
                            ) : (
                              <span className='text-muted-foreground text-sm'>
                                未分配
                              </span>
                            )}
                          </div>
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
                          <Badge
                            variant={
                              item.status === 0 ? 'success' : 'destructive'
                            }
                          >
                            {item.status === 0 ? '正常' : '已删除'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center gap-2'>
                            {item.status === 0 && (
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
                                  onClick={() => handleAssignRoles(item)}
                                >
                                  <UserCog className='h-4 w-4 mr-1' />
                                  角色
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
        title={editingUser ? '编辑账号' : '新增账号'}
        contentProps={{
          className: 'max-w-[500px]',
        }}
      >
        <div className='space-y-4 p-4'>
          <div className='space-y-3'>
            <div className='space-y-2'>
              <Label htmlFor='username'>用户名 *</Label>
              <Input
                id='username'
                value={formData.username}
                onChange={e =>
                  setFormData({ ...formData, username: e.target.value })
                }
                placeholder='请输入用户名'
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
                placeholder='请输入邮箱（可选）'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='password'>
                密码 {editingUser ? '(留空不修改)' : '*'}
              </Label>
              <Input
                id='password'
                type='password'
                value={formData.password}
                onChange={e =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder={
                  editingUser
                    ? '留空则不修改密码'
                    : '请输入密码（至少6位）'
                }
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='status'>状态</Label>
              <Select
                value={String(formData.status)}
                onValueChange={value =>
                  setFormData({ ...formData, status: Number(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='0'>正常</SelectItem>
                  <SelectItem value='-1'>已删除</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setShowDialog(false)}>
                取消
              </Button>
              <Button
                onClick={handleSave}
                disabled={!formData.username || (!editingUser && !formData.password)}
              >
                保存
              </Button>
            </DialogFooter>
          </div>
        </div>
      </ResponsiveDialog>

      {/* 分配角色对话框 */}
      <ResponsiveDialog
        isDialog
        isOpen={showRoleDialog}
        onOpenChange={setShowRoleDialog}
        title='分配角色'
        contentProps={{
          className: 'max-w-[500px]',
        }}
      >
        <div className='space-y-4 p-4'>
          <div className='space-y-3'>
            <div className='text-sm text-muted-foreground'>
              为账号 <strong>{assigningUser?.username}</strong> 分配角色
            </div>
            <div className='space-y-2 max-h-[400px] overflow-y-auto'>
              {roles.length === 0 ? (
                <div className='text-center py-8 text-muted-foreground'>
                  暂无角色
                </div>
              ) : (
                roles.map(role => (
                  <div
                    key={role.id}
                    className='flex items-center space-x-2 p-2 hover:bg-accent rounded'
                  >
                    <Checkbox
                      id={`role-${role.id}`}
                      checked={selectedRoleIds.includes(String(role.id))}
                      onCheckedChange={checked => {
                        if (checked) {
                          setSelectedRoleIds([...selectedRoleIds, String(role.id)]);
                        } else {
                          setSelectedRoleIds(
                            selectedRoleIds.filter(id => id !== String(role.id))
                          );
                        }
                      }}
                    />
                    <Label
                      htmlFor={`role-${role.id}`}
                      className='flex-1 cursor-pointer'
                    >
                      <div className='font-medium'>{role.name}</div>
                      {role.description && (
                        <div className='text-sm text-muted-foreground'>
                          {role.description}
                        </div>
                      )}
                    </Label>
                  </div>
                ))
              )}
            </div>
            <DialogFooter>
              <Button
                variant='outline'
                onClick={() => setShowRoleDialog(false)}
              >
                取消
              </Button>
              <Button onClick={handleSaveRoles}>保存</Button>
            </DialogFooter>
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  );
}

'use client';

import { DataPagination } from '@/components/DataPagination';
import { trpcReact } from '@/utils/trpc';
import { Button } from '@workspace/ui/components/button';
import { DialogFooter } from '@workspace/ui/components/dialog';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
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
import { useState } from 'react';

const PAGE_SIZE = 20;

/** 已提交的筛选条件（仅点击查询或翻页时更新，用于实际请求） */
function getSubmittedFromParamsDesigner(
  sp: ReturnType<typeof useSearchParams>
) {
  return {
    name: sp.get('name') || '',
    uid: sp.get('uid') || '',
    deleted: sp.get('deleted') || 'all',
    page: Number(sp.get('page')) || 1,
  };
}

export default function DesignersManagerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 表单状态（用户编辑，不触发查询）
  const [name, setName] = useState(searchParams.get('name') || '');
  const [uid, setUid] = useState(searchParams.get('uid') || '');
  const [deleted, setDeleted] = useState<string>(
    searchParams.get('deleted') || 'all'
  );

  // 已提交的筛选（仅点击查询或翻页时更新，用于请求）
  const [submitted, setSubmitted] = useState(() =>
    getSubmittedFromParamsDesigner(searchParams)
  );

  const [showDialog, setShowDialog] = useState(false);
  const [editingDesigner, setEditingDesigner] = useState<{
    id: string;
    name?: string | null;
    desc?: string | null;
    avatar?: string | null;
    email?: string | null;
    phone?: string | null;
    uid?: number;
  } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    desc: '',
    avatar: '',
    email: '',
    phone: '',
    uid: '',
  });

  const filters = {
    name: submitted.name || undefined,
    uid: submitted.uid ? Number(submitted.uid) : undefined,
    deleted:
      submitted.deleted === 'all'
        ? undefined
        : submitted.deleted === 'true',
  };

  const { data: listData, isLoading } = trpcReact.designer.findMany.useQuery({
    skip: (submitted.page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    ...filters,
  });

  const { data: totalCount = 0 } = trpcReact.designer.count.useQuery(filters);

  const utils = trpcReact.useUtils();
  const createMutation = trpcReact.designer.create.useMutation({
    onSuccess: () => {
      void utils.designer.findMany.invalidate();
      void utils.designer.count.invalidate();
    },
  });
  const updateMutation = trpcReact.designer.update.useMutation({
    onSuccess: () => {
      void utils.designer.findMany.invalidate();
      void utils.designer.count.invalidate();
    },
  });
  const deleteMutation = trpcReact.designer.delete.useMutation({
    onSuccess: () => {
      void utils.designer.findMany.invalidate();
      void utils.designer.count.invalidate();
    },
  });
  const recoverMutation = trpcReact.designer.recover.useMutation({
    onSuccess: () => {
      void utils.designer.findMany.invalidate();
      void utils.designer.count.invalidate();
    },
  });

  const updateURL = (s: typeof submitted) => {
    const params = new URLSearchParams();
    if (s.name) params.set('name', s.name);
    if (s.uid) params.set('uid', s.uid);
    if (s.deleted !== 'all') params.set('deleted', s.deleted);
    if (s.page > 1) params.set('page', String(s.page));
    router.replace(`/dashboard/manager/designers?${params.toString()}`);
  };

  const handleSearch = () => {
    const next = {
      name,
      uid,
      deleted,
      page: 1,
    };
    setSubmitted(next);
    updateURL(next);
  };

  const handlePageChange = (newPage: number) => {
    const next = { ...submitted, page: newPage };
    setSubmitted(next);
    updateURL(next);
  };

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

  const handleEdit = (designer: {
    id: string;
    name?: string | null;
    desc?: string | null;
    avatar?: string | null;
    email?: string | null;
    phone?: string | null;
    uid?: number;
  }) => {
    setEditingDesigner(designer);
    setFormData({
      name: designer.name || '',
      desc: designer.desc || '',
      avatar: designer.avatar || '',
      email: designer.email || '',
      phone: designer.phone || '',
      uid: String(designer.uid ?? ''),
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    try {
      if (editingDesigner) {
        const { uid: _u, ...updateData } = formData;
        await updateMutation.mutateAsync({
          id: editingDesigner.id,
          ...updateData,
        });
      } else {
        if (!formData.uid) {
          alert('请输入设计师UID');
          return;
        }
        await createMutation.mutateAsync({
          ...formData,
          uid: Number(formData.uid),
        });
      }
      setShowDialog(false);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '未知错误';
      alert(`保存失败: ${msg}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个设计师吗？')) return;
    try {
      await deleteMutation.mutateAsync({ id });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '未知错误';
      alert(`删除失败: ${msg}`);
    }
  };

  const handleRecover = async (id: string) => {
    if (!confirm('确定要恢复这个设计师吗？')) return;
    try {
      await recoverMutation.mutateAsync({ id });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '未知错误';
      alert(`恢复失败: ${msg}`);
    }
  };

  const data = listData ?? [];

  return (
    <div className="mx-auto space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">设计师管理</h1>
        <Button onClick={handleCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          新增设计师
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3 sticky top-0 bg-background z-10 shadow-sm py-2">
          <div className="flex items-center gap-2">
            <Label className="min-w-[60px] text-sm font-medium">
              设计师名称
            </Label>
            <Input
              placeholder="搜索设计师名称"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              className="h-9 w-[200px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="min-w-[60px] text-sm font-medium">UID</Label>
            <Input
              placeholder="UID 精确查询"
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              className="h-9 w-[120px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="min-w-[70px] text-sm font-medium">
              删除状态
            </Label>
            <Select value={deleted} onValueChange={setDeleted}>
              <SelectTrigger className="h-9 w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="false">未删除</SelectItem>
                <SelectItem value="true">已删除</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSearch} size="sm" className="h-9">
            <Search className="mr-2 h-4 w-4" />
            查询
          </Button>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">加载中...</span>
            </div>
          ) : data.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              暂无数据
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px]">UID</TableHead>
                  <TableHead className="min-w-[120px]">名称</TableHead>
                  <TableHead className="min-w-[120px]">描述</TableHead>
                  <TableHead className="min-w-[80px]">模板数</TableHead>
                  <TableHead className="min-w-[120px]">创建时间</TableHead>
                  <TableHead className="min-w-[120px]">更新时间</TableHead>
                  <TableHead className="min-w-[80px]">状态</TableHead>
                  <TableHead className="min-w-[180px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">
                      {item.uid ?? '-'}
                    </TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.desc ?? '-'}
                    </TableCell>
                    <TableCell>{item._count?.templates ?? 0}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {item.create_time
                        ? new Date(item.create_time).toLocaleString('zh-CN')
                        : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {item.update_time
                        ? new Date(item.update_time).toLocaleString('zh-CN')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded px-2 py-1 text-xs ${item.deleted
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-green-500/10 text-green-600'
                          }`}
                      >
                        {item.deleted ? '已删除' : '正常'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {!item.deleted && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(item)}
                            >
                              <Edit className="mr-1 h-4 w-4" />
                              编辑
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="mr-1 h-4 w-4" />
                              删除
                            </Button>
                          </>
                        )}
                        {item.deleted && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRecover(item.id)}
                          >
                            <RotateCcw className="mr-1 h-4 w-4" />
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

        <DataPagination
          sticky={true}
          page={submitted.page}
          total={totalCount}
          pageSize={PAGE_SIZE}
          onPageChange={handlePageChange}
          showInfo
        />
      </div>

      <ResponsiveDialog
        isDialog
        isOpen={showDialog}
        onOpenChange={setShowDialog}
        title={editingDesigner ? '编辑设计师' : '新增设计师'}
        contentProps={{
          className: 'max-w-[600px]',
        }}
      >
        <div className="space-y-4 p-4">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="name">名称 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="请输入设计师名称"
              />
            </div>
            {!editingDesigner && (
              <div className="space-y-2">
                <Label htmlFor="uid">UID *</Label>
                <Input
                  id="uid"
                  type="number"
                  value={formData.uid}
                  onChange={(e) =>
                    setFormData({ ...formData, uid: e.target.value })
                  }
                  placeholder="请输入设计师UID（唯一）"
                />
              </div>
            )}
            {editingDesigner && (
              <div className="space-y-2">
                <Label htmlFor="uid-display">UID</Label>
                <Input
                  id="uid-display"
                  value={formData.uid}
                  disabled
                  className="bg-muted"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="desc">描述</Label>
              <Input
                id="desc"
                value={formData.desc}
                onChange={(e) =>
                  setFormData({ ...formData, desc: e.target.value })
                }
                placeholder="请输入设计师描述"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avatar">头像URL</Label>
              <Input
                id="avatar"
                value={formData.avatar}
                onChange={(e) =>
                  setFormData({ ...formData, avatar: e.target.value })
                }
                placeholder="请输入头像URL"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="请输入邮箱"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">电话</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="请输入电话"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                取消
              </Button>
              <Button
                onClick={handleSave}
                disabled={
                  !formData.name || (!editingDesigner && !formData.uid)
                }
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

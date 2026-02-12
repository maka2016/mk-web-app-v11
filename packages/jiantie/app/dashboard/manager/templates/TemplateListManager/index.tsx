'use client';

import { DateRangePicker } from '@/components/DateRangePicker';
import { DataPagination } from '@/components/DataPagination';
import { getUid } from '@/services';
import { trpc, trpcReact } from '@/utils/trpc';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import { Checkbox } from '@workspace/ui/components/checkbox';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { Popover, PopoverContent, PopoverTrigger } from '@workspace/ui/components/popover';
import { Progress } from '@workspace/ui/components/progress';
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
import { cn } from '@workspace/ui/lib/utils';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ListTodo,
  Loader2,
  Minus,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { DateRange } from 'react-day-picker';
import toast from 'react-hot-toast';
import { ChannelsManager } from '@/app/dashboard/manager/channels/ChannelsManager';

const PAGE_SIZE = 20;

const TASK_STATUS_LABEL: Record<string, string> = {
  pending: '待处理',
  processing: '处理中',
  completed: '已完成',
  failed: '失败',
};

const TASK_STATUS_BADGE: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
  pending: 'warning',
  processing: 'info',
  completed: 'success',
  failed: 'danger',
};

/** 批量生成封面任务名称：批量模版生成_x个_时间 */
function batchGenerateCoversTaskName(count: number): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const timeStr = `${y}-${m}-${d} ${h}:${min}`;
  return `批量模版生成_${count}个_${timeStr}`;
}

/** 从任务中取展示名称 */
function getTaskDisplayName(task: { task_name?: string; id: string }): string {
  return task.task_name || `${task.id.substring(0, 8)}…`;
}

// 支持 indeterminate 状态的 Checkbox 组件
function IndeterminateCheckbox({
  checked,
  indeterminate,
  onCheckedChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  // Radix UI 的 Checkbox 不支持 indeterminate，我们通过视觉提示来模拟
  if (indeterminate) {
    return (
      <div className='relative inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary bg-primary'>
        <Minus className='h-3 w-3 text-primary-foreground' />
      </div>
    );
  }

  return <Checkbox checked={checked} onCheckedChange={onCheckedChange} />;
}

export interface TemplateListManagerProps {
  /** 限定查询范围的模版 IDs（可选） */
  constraintTemplateIds?: string[];
  /** 隐藏标题栏 */
  hideTitle?: boolean;
  /** 自定义标题 */
  title?: string;
  /** 隐藏悬浮任务列表 */
  hideFloatingTaskList?: boolean;
  /** 容器类名 */
  className?: string;
  /** 数据变化回调（用于通知父组件刷新） */
  onDataChange?: () => void;
  /** 紧凑模式：减少间距和字体大小，适合嵌入式场景 */
  compact?: boolean;
}

export function TemplateListManager({
  constraintTemplateIds,
  hideTitle = false,
  title = '模板管理',
  hideFloatingTaskList = false,
  className,
  onDataChange,
  compact = false,
}: TemplateListManagerProps) {
  const [designerUid, setDesignerUid] = useState('');
  const [deleted, setDeleted] = useState<string>('all');
  const [specId, setSpecId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [titleFilter, setTitleFilter] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [taskListExpanded, setTaskListExpanded] = useState(false);

  // 获取规格列表用于下拉选择
  const [specsList, setSpecsList] = useState<any[]>([]);

  // 模板详情编辑（仅改设计师）
  const [detailEditOpen, setDetailEditOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [editDesignerUid, setEditDesignerUid] = useState<string>('none');

  // 频道管理相关
  const [channelsManagerOpen, setChannelsManagerOpen] = useState(false);
  const [channelDialogTemplateIds, setChannelDialogTemplateIds] = useState<
    string[] | null
  >(null);
  const [clearSelectionOnClose, setClearSelectionOnClose] = useState(false);
  const [channelDialogTitle, setChannelDialogTitle] = useState('频道上架');

  // 获取当前页模版的频道信息
  const templateIdsOnPage = useMemo(
    () => data.map((t: any) => String(t.id)).filter(Boolean),
    [data]
  );
  const {
    data: templateChannelsMap,
    isLoading: loadingTemplateChannels,
    refetch: refetchTemplateChannels,
  } = trpcReact.adminChannel.getChannelsByTemplateIds.useQuery(
    {
      template_ids: templateIdsOnPage,
      env: 'production',
    },
    {
      enabled: templateIdsOnPage.length > 0,
    }
  );

  // 批量上架/下架 mutation
  const updateTemplateIdsMutation =
    trpcReact.adminChannel.updateTemplateIds.useMutation({
      onSuccess: () => {
        refetchTemplateChannels();
      },
      onError: (error) => {
        toast.error(error.message || '操作失败');
      },
    });

  // tRPC utils for manual queries
  const utils = trpcReact.useUtils();

  // tRPC mutations
  const createAsyncTaskMutation = trpcReact.asyncTask.createTask.useMutation();
  const updateTemplateMutation = trpcReact.template.update.useMutation({
    onSuccess: async () => {
      toast.success('更新成功');
      setDetailEditOpen(false);
      setEditingTemplate(null);
      await loadData();
      onDataChange?.();
    },
    onError: (e: unknown) => {
      const err = e as { message?: string } | null;
      toast.error(err?.message || '更新失败');
    },
  });

  const deleteTemplateMutation = trpcReact.template.delete.useMutation({
    onSuccess: async () => {
      toast.success('已标记为删除');
      await loadData();
      onDataChange?.();
    },
    onError: (e: unknown) => {
      const err = e as { message?: string } | null;
      toast.error(err?.message || '标记删除失败');
    },
  });

  const copyTemplateMutation = trpcReact.template.copy.useMutation({
    onSuccess: async () => {
      toast.success('复制成功');
      await loadData();
      onDataChange?.();
    },
    onError: (e: unknown) => {
      const err = e as { message?: string } | null;
      toast.error(err?.message || '复制失败');
    },
  });

  const { data: designersData, isLoading: designersLoading } =
    trpcReact.designer.findMany.useQuery(
      {
        deleted: false,
        take: 200,
      },
      {
        enabled: true,
      }
    );
  const designers = useMemo(
    () => (designersData ?? []) as any[],
    [designersData]
  );
  const designerMap = useMemo(
    () => new Map<number, any>(designers.map((d: any) => [d.uid, d])),
    [designers]
  );

  // 悬浮任务列表（仅批量生成封面）
  const { data: floatingTasksData, refetch: refetchFloatingTasks } =
    trpcReact.asyncTask.getTaskList.useQuery(
      {
        task_type: 'batch_generate_covers',
        page: 1,
        pageSize: 8,
      },
      {
        enabled: !hideFloatingTaskList,
        refetchInterval: (query) => {
          const tasks = (query.state.data?.tasks ?? []) as any[];
          const hasActive = tasks.some(
            (t) => t.status === 'pending' || t.status === 'processing'
          );
          return hasActive ? 3000 : false;
        },
      }
    );
  const floatingTasks = (floatingTasksData?.tasks ?? []) as any[];

  const processTaskMutation = trpcReact.asyncTask.processTask.useMutation({
    onSuccess: () => refetchFloatingTasks(),
    onError: () => {
      toast('启动执行失败，请到任务列表中手动处理', {
        duration: 5000,
        icon: '⚠️',
      });
      refetchFloatingTasks();
    },
  });

  useEffect(() => {
    const loadSpecs = async () => {
      try {
        const specs = (await utils.worksSpec.findMany.fetch({
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
  }, [utils]);

  const loadData = async (targetPage?: number) => {
    const currentPage = targetPage !== undefined ? targetPage : page;
    setLoading(true);
    try {
      const skip = (currentPage - 1) * PAGE_SIZE;
      const filters: any = {
        skip,
        take: PAGE_SIZE,
      };

      // 如果有 constraintTemplateIds，则添加 ids 筛选
      if (constraintTemplateIds && constraintTemplateIds.length > 0) {
        filters.ids = constraintTemplateIds;
      }

      if (designerUid && /^\d+$/.test(designerUid)) {
        filters.designer_uid = Number(designerUid);
      }
      if (deleted !== 'all') filters.deleted = deleted === 'true';
      if (specId) filters.spec_id = specId;
      if (templateId) filters.template_id = templateId;
      if (titleFilter) filters.title = titleFilter;

      // 日期范围过滤
      if (dateRange?.from) {
        filters.date_from = dateRange.from.toISOString().split('T')[0];
      }
      if (dateRange?.to) {
        filters.date_to = dateRange.to.toISOString().split('T')[0];
      }

      const [list, count] = await Promise.all([
        utils.template.findMany.fetch(filters) as Promise<any[]>,
        utils.template.count.fetch({
          ids: filters.ids,
          designer_uid: filters.designer_uid,
          deleted: filters.deleted,
          spec_id: filters.spec_id,
          template_id: filters.template_id,
          title: filters.title,
          date_from: filters.date_from,
          date_to: filters.date_to,
        }) as Promise<number>,
      ]);

      // 获取规格信息
      const specIds = (list || [])
        .map((t: any) => t.spec_id)
        .filter((id: string | null): id is string => !!id);

      let specMap = new Map();
      if (specIds.length > 0) {
        const specs = (await utils.worksSpec.findMany.fetch({
          take: 1000,
        })) as any[];
        specMap = new Map((specs || []).map((s: any) => [s.id, s]));
      }

      const enrichedList = (list || []).map((item: any) => ({
        ...item,
        specInfo: item.spec_id ? specMap.get(item.spec_id) : null,
      }));

      setData(enrichedList);
      setTotal(count || 0);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    setSelectedIds(new Set());
    loadData(1);
  };

  // 分页变化或 constraintTemplateIds 变化时重新查询
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, constraintTemplateIds]);

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(data.map((item) => item.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  // 单个选择
  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // 批量生成封面：1. 入队 2. 调用执行；Toast 提示到任务列表查看
  const handleBatchGenerateCovers = async () => {
    if (selectedIds.size === 0) {
      toast.error('请先选择要生成封面的模板');
      return;
    }

    const templateIds = Array.from(selectedIds);

    try {
      const uidStr = getUid();
      const createdByUid = uidStr ? Number(uidStr) : undefined;

      // 1. 入队（含名称：批量模版生成_x个_时间）
      const taskName = batchGenerateCoversTaskName(templateIds.length);
      const result = await createAsyncTaskMutation.mutateAsync({
        task_type: 'batch_generate_covers',
        task_name: taskName,
        input_data: {
          template_ids: templateIds,
        },
        created_by_uid:
          createdByUid && !isNaN(createdByUid) ? createdByUid : undefined,
      });

      toast.success('任务执行中，请到任务列表中查看', { duration: 4000 });

      await refetchFloatingTasks();
      processTaskMutation.mutate({ id: result.id });
      setSelectedIds(new Set());
      onDataChange?.();
    } catch (error: any) {
      console.error('创建批量生成封面任务失败:', error);
      toast.error(error?.message || '创建任务失败');
    }
  };

  const allSelected = data.length > 0 && selectedIds.size === data.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < data.length;

  const getTaskProgress = (task: any) => {
    const p = task.progress as {
      total?: number;
      completed?: number;
      failed?: number;
    } | null;
    if (!p || p.total == null || p.total === 0) return null;
    const done = (p.completed ?? 0) + (p.failed ?? 0);
    return {
      total: p.total,
      completed: done,
      failed: p.failed ?? 0,
      percentage: Math.round((done / p.total) * 100),
    };
  };

  return (
    <div className={cn(compact ? 'space-y-1.5' : 'space-y-3', 'relative', className)}>
      {/* 标题 */}
      {!hideTitle && (
        <div className='flex items-center justify-between'>
          <h1 className='text-xl font-semibold'>{title}</h1>
          {selectedIds.size > 0 && (
            <div className='flex items-center gap-2'>
              <span className='text-sm text-muted-foreground'>
                已选择 {selectedIds.size} 项
              </span>
              <Button
                variant='default'
                size='sm'
                onClick={() => {
                  setChannelDialogTemplateIds(Array.from(selectedIds));
                  setChannelDialogTitle(
                    `批量上架（已选择 ${selectedIds.size} 个模版）`
                  );
                  setClearSelectionOnClose(true);
                  setChannelsManagerOpen(true);
                }}
                disabled={loadingTemplateChannels}
              >
                批量上架
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={async () => {
                  if (selectedIds.size === 0) {
                    toast.error('请先选择要下架的模版');
                    return;
                  }
                  const confirmed = window.confirm(
                    `确定要从所有频道中下架选中的 ${selectedIds.size} 个模版吗？`
                  );
                  if (!confirmed) return;

                  try {
                    const templateIds = Array.from(selectedIds);
                    // 获取所有已上架的频道
                    const channelsData =
                      await trpc.adminChannel.getChannelsByTemplateIds.query({
                        template_ids: templateIds,
                        env: 'production',
                      });

                    if (!channelsData) {
                      toast.error('获取频道信息失败');
                      return;
                    }

                    // 收集所有需要更新的频道
                    const channelUpdates = new Map<number, string[]>();

                    for (const templateId of templateIds) {
                      const templateChannels = channelsData[templateId] || [];
                      for (const channel of templateChannels) {
                        if (!channelUpdates.has(channel.id)) {
                          // 获取频道完整信息
                          const channelFull =
                            await trpc.adminChannel.findById.query({
                              id: channel.id,
                              include_children: false,
                            });
                          if (channelFull) {
                            channelUpdates.set(
                              channel.id,
                              channelFull.template_ids || []
                            );
                          }
                        }
                      }
                    }

                    // 从每个频道中移除选中的模版
                    const updatePromises = Array.from(
                      channelUpdates.entries()
                    ).map(async ([channelId, currentTemplateIds]) => {
                      const newTemplateIds = currentTemplateIds.filter(
                        (id: string) => !templateIds.includes(id)
                      );
                      if (newTemplateIds.length !== currentTemplateIds.length) {
                        await updateTemplateIdsMutation.mutateAsync({
                          id: channelId,
                          template_ids: newTemplateIds,
                        });
                      }
                    });

                    await Promise.all(updatePromises);
                    toast.success('批量下架成功');
                    setSelectedIds(new Set());
                    await refetchTemplateChannels();
                    onDataChange?.();
                  } catch (error: any) {
                    console.error('批量下架失败:', error);
                    toast.error(error.message || '批量下架失败');
                  }
                }}
                disabled={
                  updateTemplateIdsMutation.isPending || loadingTemplateChannels
                }
              >
                {updateTemplateIdsMutation.isPending ? (
                  <>
                    <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                    下架中...
                  </>
                ) : (
                  '批量下架'
                )}
              </Button>
              <Button
                variant='default'
                size='sm'
                onClick={handleBatchGenerateCovers}
                disabled={createAsyncTaskMutation.isPending}
              >
                {createAsyncTaskMutation.isPending ? (
                  <>
                    <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                    入队中...
                  </>
                ) : (
                  '批量生成封面'
                )}
              </Button>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setSelectedIds(new Set())}
              >
                <X className='h-4 w-4 mr-1' />
                取消选择
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 批量操作栏（当 hideTitle 时显示在这里） */}
      {hideTitle && selectedIds.size > 0 && (
        <div className='flex items-center justify-end gap-2'>
          <span className='text-sm text-muted-foreground'>
            已选择 {selectedIds.size} 项
          </span>
          <Button
            variant='default'
            size='sm'
            onClick={() => {
              setChannelDialogTemplateIds(Array.from(selectedIds));
              setChannelDialogTitle(
                `批量上架（已选择 ${selectedIds.size} 个模版）`
              );
              setClearSelectionOnClose(true);
              setChannelsManagerOpen(true);
            }}
            disabled={loadingTemplateChannels}
          >
            批量上架
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={async () => {
              if (selectedIds.size === 0) {
                toast.error('请先选择要下架的模版');
                return;
              }
              const confirmed = window.confirm(
                `确定要从所有频道中下架选中的 ${selectedIds.size} 个模版吗？`
              );
              if (!confirmed) return;

              try {
                const templateIds = Array.from(selectedIds);
                const channelsData =
                  await trpc.adminChannel.getChannelsByTemplateIds.query({
                    template_ids: templateIds,
                    env: 'production',
                  });

                if (!channelsData) {
                  toast.error('获取频道信息失败');
                  return;
                }

                const channelUpdates = new Map<number, string[]>();

                for (const templateId of templateIds) {
                  const templateChannels = channelsData[templateId] || [];
                  for (const channel of templateChannels) {
                    if (!channelUpdates.has(channel.id)) {
                      const channelFull =
                        await trpc.adminChannel.findById.query({
                          id: channel.id,
                          include_children: false,
                        });
                      if (channelFull) {
                        channelUpdates.set(
                          channel.id,
                          channelFull.template_ids || []
                        );
                      }
                    }
                  }
                }

                const updatePromises = Array.from(channelUpdates.entries()).map(
                  async ([channelId, currentTemplateIds]) => {
                    const newTemplateIds = currentTemplateIds.filter(
                      (id: string) => !templateIds.includes(id)
                    );
                    if (newTemplateIds.length !== currentTemplateIds.length) {
                      await updateTemplateIdsMutation.mutateAsync({
                        id: channelId,
                        template_ids: newTemplateIds,
                      });
                    }
                  }
                );

                await Promise.all(updatePromises);
                toast.success('批量下架成功');
                setSelectedIds(new Set());
                await refetchTemplateChannels();
                onDataChange?.();
              } catch (error: any) {
                console.error('批量下架失败:', error);
                toast.error(error.message || '批量下架失败');
              }
            }}
            disabled={
              updateTemplateIdsMutation.isPending || loadingTemplateChannels
            }
          >
            {updateTemplateIdsMutation.isPending ? (
              <>
                <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                下架中...
              </>
            ) : (
              '批量下架'
            )}
          </Button>
          <Button
            variant='default'
            size='sm'
            onClick={handleBatchGenerateCovers}
            disabled={createAsyncTaskMutation.isPending}
          >
            {createAsyncTaskMutation.isPending ? (
              <>
                <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                入队中...
              </>
            ) : (
              '批量生成封面'
            )}
          </Button>
          <Button
            variant='destructive'
            size='sm'
            onClick={async () => {
              const confirmed = window.confirm(
                `确定将选中的 ${selectedIds.size} 个模板标记为删除？`
              );
              if (!confirmed) return;
              try {
                for (const id of selectedIds) {
                  await deleteTemplateMutation.mutateAsync({ id });
                }
                setSelectedIds(new Set());
              } catch {
                // 错误已在 mutation onError 中处理
              }
            }}
            disabled={deleteTemplateMutation.isPending}
          >
            {deleteTemplateMutation.isPending ? (
              <>
                <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                删除中...
              </>
            ) : (
              <>
                <Trash2 className='h-4 w-4 mr-1' />
                批量删除
              </>
            )}
          </Button>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setSelectedIds(new Set())}
          >
            <X className='h-4 w-4 mr-1' />
            取消选择
          </Button>
        </div>
      )}

      {/* 搜索和筛选区域 */}
      <div className={cn(
        'border rounded-lg sticky top-0 bg-white border-b z-10',
        compact ? 'p-1.5 space-y-1' : 'p-3 space-y-2'
      )}>
        <div className={cn('flex flex-wrap items-center', compact ? 'gap-1.5' : 'gap-2')}>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <div className='flex items-center gap-1'>
            <Label className={cn(compact ? 'text-xs' : 'text-sm', 'font-medium')}>标题</Label>
            <Input
              placeholder='搜索标题'
              value={titleFilter}
              onChange={(e) => setTitleFilter(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              className={cn(compact ? 'h-6 text-xs w-[100px]' : 'h-8 w-[160px]')}
            />
          </div>
          <div className='flex items-center gap-1'>
            <Label className={cn(compact ? 'text-xs' : 'text-sm', 'font-medium')}>模板ID</Label>
            <Input
              placeholder='模板ID'
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              className={cn(compact ? 'h-6 text-xs w-[80px]' : 'h-8 w-[150px]')}
            />
          </div>
          <div className='flex items-center gap-1'>
            <Label className={cn(compact ? 'text-xs' : 'text-sm', 'font-medium')}>设计师</Label>
            <Input
              type='number'
              placeholder='UID'
              value={designerUid}
              onChange={(e) => setDesignerUid(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              className={cn(compact ? 'h-6 text-xs w-[60px]' : 'h-8 w-[150px]')}
            />
          </div>
          <div className='flex items-center gap-1'>
            <Label className={cn(compact ? 'text-xs' : 'text-sm', 'font-medium')}>状态</Label>
            <Select value={deleted} onValueChange={setDeleted}>
              <SelectTrigger className={cn(compact ? 'h-6 text-xs w-[70px]' : 'h-8 w-[110px]')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>全部</SelectItem>
                <SelectItem value='false'>未删除</SelectItem>
                <SelectItem value='true'>已删除</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className='flex items-center gap-1'>
            <Label className={cn(compact ? 'text-xs' : 'text-sm', 'font-medium')}>规格</Label>
            <Select
              value={specId || 'all'}
              onValueChange={(value) => setSpecId(value === 'all' ? '' : value)}
            >
              <SelectTrigger className={cn(compact ? 'h-6 text-xs w-[100px]' : 'h-8 w-[170px]')}>
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
          <Button onClick={handleSearch} size='sm' className={cn(compact ? 'h-6 px-2 text-xs' : 'h-8 px-3')}>
            <Search className={cn(compact ? 'h-3 w-3' : 'h-4 w-4', 'mr-1')} />
            查询
          </Button>
        </div>
      </div>

      {/* 数据表格 */}
      <div className='border rounded-lg overflow-x-auto'>
        {loading ? (
          <div className={cn('flex items-center justify-center', compact ? 'py-4' : 'py-8')}>
            <Loader2 className={cn(compact ? 'h-4 w-4' : 'h-6 w-6', 'animate-spin')} />
            <span className={cn('ml-2', compact && 'text-xs')}>加载中...</span>
          </div>
        ) : data.length === 0 ? (
          <div className={cn('text-center text-muted-foreground', compact ? 'py-4 text-xs' : 'py-8')}>暂无数据</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className={compact ? 'h-6' : undefined}>
                <TableHead className={cn(compact ? 'w-[30px] px-1' : 'w-[50px]')}>
                  <IndeterminateCheckbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className={cn(compact ? 'px-1 text-xs min-w-[90px]' : 'min-w-[100px]')}>ID</TableHead>
                <TableHead className={cn(compact ? 'px-1 text-xs min-w-[100px]' : 'min-w-[150px]')}>
                  标题
                </TableHead>
                {!compact && (
                  <TableHead className='min-w-[120px] max-w-[120px]'>
                    描述
                  </TableHead>
                )}
                <TableHead className={cn(compact ? 'px-1 text-xs min-w-[40px] max-w-[50px]' : 'min-w-[80px] max-w-[130px]')}>
                  封面
                </TableHead>
                {!compact && (
                  <TableHead className='min-w-[100px] max-w-[150px]'>
                    设计师
                  </TableHead>
                )}
                <TableHead className={cn(compact ? 'px-1 text-xs min-w-[50px]' : 'min-w-[80px]')}>
                  规格
                </TableHead>
                <TableHead className={cn(compact ? 'px-1 text-xs min-w-[80px] max-w-[120px]' : 'min-w-[120px] max-w-[180px]')}>
                  频道
                </TableHead>
                {!compact && (
                  <>
                    <TableHead className='min-w-[120px] max-w-[120px]'>
                      创建时间
                    </TableHead>
                    <TableHead className='min-w-[120px] max-w-[120px]'>
                      更新时间
                    </TableHead>
                  </>
                )}
                <TableHead className={cn(compact ? 'w-[40px] px-1' : 'w-[50px]')}>
                  操作
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <TableRow key={item.id}>
                    <TableCell className={cn(compact ? 'w-[30px] px-1 py-0.5' : 'w-[50px]')}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleSelect(item.id)}
                        className={compact ? 'h-3 w-3' : undefined}
                      />
                    </TableCell>
                    <TableCell className={cn('font-mono', compact ? 'text-xs px-1 py-0.5 min-w-[90px]' : 'text-xs min-w-[100px]')}>
                      <Link
                        href={`/dashboard/manager/data/template/${item.id}`}
                        className='text-primary hover:underline break-all'
                      >
                        {item.id}
                      </Link>
                    </TableCell>
                    <TableCell className={cn(compact ? 'text-xs px-1 py-0.5 min-w-[100px]' : 'min-w-[150px]')}>
                      <span className='break-words'>{item.title || '-'}</span>
                    </TableCell>
                    {!compact && (
                      <TableCell className='text-muted-foreground min-w-[120px] max-w-[120px]'>
                        {item.desc || '-'}
                      </TableCell>
                    )}
                    <TableCell className={cn(compact ? 'px-1 py-0.5 min-w-[40px] max-w-[50px]' : 'min-w-[80px] max-w-[130px]')}>
                      {item.coverV3?.url ? (
                        <img
                          src={item.coverV3.url}
                          alt='cover'
                          className={cn(compact ? 'w-6 h-6' : 'w-12 h-12', 'object-cover rounded cursor-pointer')}
                          onClick={() => {
                            window.open(item.coverV3.url, '_blank');
                          }}
                        />
                      ) : (
                        <span className={cn('text-muted-foreground', compact && 'text-xs')}>无</span>
                      )}
                    </TableCell>
                    {!compact && (
                      <TableCell className='min-w-[100px] max-w-[150px]'>
                        {(() => {
                          if (item.designer_uid == null) return '-';
                          const designer = designerMap.get(item.designer_uid);
                          if (!designer) return String(item.designer_uid);
                          return designer.name
                            ? `${designer.name} (${designer.uid})`
                            : String(designer.uid);
                        })()}
                      </TableCell>
                    )}
                    <TableCell className={cn(compact ? 'text-xs px-1 py-0.5 min-w-[50px]' : 'min-w-[80px]')}>
                      <span className='break-words'>
                        {item.specInfo?.display_name ||
                          item.specInfo?.name ||
                          '-'}
                      </span>
                    </TableCell>
                    <TableCell className={cn(compact ? 'px-1 py-0.5 min-w-[80px] max-w-[120px]' : 'min-w-[120px] max-w-[180px]')}>
                      {(() => {
                        const channels =
                          (templateChannelsMap &&
                            templateChannelsMap[item.id as string]) ||
                          [];
                        if (loadingTemplateChannels) {
                          return (
                            <span className='text-xs text-muted-foreground'>
                              加载中...
                            </span>
                          );
                        }
                        if (channels.length > 0) {
                          return (
                            <div className='flex flex-col gap-0.5'>
                              {channels.map((channel) => (
                                <div
                                  key={channel.id}
                                  className='inline-flex items-center gap-0.5 group'
                                >
                                  <Badge
                                    variant='secondary'
                                    className={cn(compact ? 'text-xs px-1 py-0' : 'text-xs', 'whitespace-normal text-left')}
                                  >
                                    {channel.path ||
                                      channel.display_name ||
                                      channel.alias}
                                  </Badge>
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    className='h-3 w-3 p-0 hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity'
                                    disabled={
                                      updateTemplateIdsMutation.isPending
                                    }
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (!item.id) return;

                                      const templateId = String(item.id);

                                      // 确认下架
                                      const confirmed = window.confirm(
                                        `确定要从频道"${channel.path || channel.display_name || channel.alias}"中下架该模版吗？`
                                      );
                                      if (!confirmed) return;

                                      try {
                                        // 先获取频道的完整信息（包括 template_ids）
                                        const channelFull =
                                          await trpc.adminChannel.findById.query(
                                            {
                                              id: channel.id,
                                              include_children: false,
                                            }
                                          );

                                        if (!channelFull) {
                                          throw new Error(
                                            `频道 ${channel.id} 不存在`
                                          );
                                        }

                                        const currentTemplateIds =
                                          channelFull.template_ids || [];
                                        const newTemplateIds =
                                          currentTemplateIds.filter(
                                            (id: string) => id !== templateId
                                          );

                                        await updateTemplateIdsMutation.mutateAsync(
                                          {
                                            id: channel.id,
                                            template_ids: newTemplateIds,
                                          }
                                        );

                                        toast.success('下架成功');
                                        // 刷新频道列表
                                        await refetchTemplateChannels();
                                        onDataChange?.();
                                      } catch (error: any) {
                                        console.error('下架失败:', error);
                                        toast.error(
                                          error.message || '下架失败'
                                        );
                                      }
                                    }}
                                    title='下架'
                                  >
                                    <X className='h-2 w-2' />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          );
                        }
                        return (
                          <Button
                            variant='link'
                            size='sm'
                            className='h-5 px-0 text-xs'
                            onClick={() => {
                              setChannelDialogTemplateIds([String(item.id)]);
                              setChannelDialogTitle('频道上架');
                              setClearSelectionOnClose(false);
                              setChannelsManagerOpen(true);
                            }}
                          >
                            上架
                          </Button>
                        );
                      })()}
                    </TableCell>
                    {!compact && (
                      <>
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
                      </>
                    )}
                    <TableCell className={cn(compact ? 'px-1 py-0.5 min-w-0' : 'min-w-0')}>
                      <div className='flex items-center gap-0.5'>
                        <Button
                          variant='ghost'
                          size='icon'
                          className={compact ? 'h-7 w-7' : 'h-8 w-8'}
                          aria-label='编辑'
                          onClick={() => {
                            const uid = getUid();
                            if (!uid) {
                              alert('请先登录');
                              return;
                            }
                            window.open(
                              `/desktop/editor-designer?works_id=${item.id}&designer_tool=2&uid=${uid}&is_template=true`,
                              '_blank'
                            );
                          }}
                        >
                          <Pencil className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
                        </Button>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant='ghost'
                              size='icon'
                              className={compact ? 'h-7 w-7' : 'h-8 w-8'}
                              aria-label='操作'
                            >
                              <MoreHorizontal className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className='w-40 p-1' align='end'>
                            <div className='flex flex-col gap-0.5'>
                              <Button
                                variant='ghost'
                                size='sm'
                                className='justify-start font-normal'
                                onClick={() => {
                                  const url = `/mobile/template?id=${item.id}&appid=jiantie&template_name=${encodeURIComponent(item.title || '')}`;
                                  window.open(url, '_blank');
                                }}
                              >
                                预览
                              </Button>
                              <Button
                                variant='ghost'
                                size='sm'
                                className='justify-start font-normal'
                                disabled={!!item.deleted}
                                onClick={() => {
                                  setEditingTemplate(item);
                                  setEditDesignerUid(
                                    item.designer_uid != null
                                      ? String(item.designer_uid)
                                      : 'none'
                                  );
                                  setDetailEditOpen(true);
                                }}
                              >
                                详情
                              </Button>
                              <Button
                              variant='ghost'
                              size='sm'
                              className='justify-start font-normal'
                              disabled={copyTemplateMutation.isPending || !!item.deleted}
                              onClick={() => {
                                copyTemplateMutation.mutate({ id: String(item.id) });
                              }}
                            >
                              复制
                            </Button>
                            {!item.deleted && (
                              <Button
                                variant='ghost'
                                size='sm'
                                className='justify-start font-normal text-destructive hover:bg-destructive/10 hover:text-destructive'
                                disabled={deleteTemplateMutation.isPending}
                                onClick={() => {
                                  const confirmed = window.confirm(
                                    `确定将模板「${item.title || item.id}」标记为删除？`
                                  );
                                  if (!confirmed) return;
                                  deleteTemplateMutation.mutate({ id: String(item.id) });
                                }}
                              >
                                删除
                              </Button>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
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
        sticky
      />

      {/* 右上角悬浮简易任务列表（支持收起/展开） */}
      {!hideFloatingTaskList && (
        <div
          className={cn(
            'fixed top-4 right-3 z-50 rounded-lg border border-border bg-background shadow-lg transition-all',
            taskListExpanded ? 'w-80' : 'w-auto'
          )}
        >
          <div
            className={cn(
              'flex items-center justify-between gap-2 px-3 py-2',
              taskListExpanded ? 'border-b border-border' : ''
            )}
          >
            <button
              type='button'
              onClick={() => setTaskListExpanded((v) => !v)}
              className='flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-medium hover:opacity-80'
            >
              <ListTodo className='h-4 w-4 shrink-0 text-muted-foreground' />
              {taskListExpanded && <span className='truncate'>任务列表</span>}
              {floatingTasks.length > 0 && (
                <span className='shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground'>
                  {floatingTasks.length}
                </span>
              )}
              {taskListExpanded ? (
                <ChevronDown
                  className='h-4 w-4 shrink-0 text-muted-foreground'
                  aria-label='收起'
                />
              ) : (
                <ChevronUp
                  className='h-4 w-4 shrink-0 text-muted-foreground'
                  aria-label='展开'
                />
              )}
            </button>
            {taskListExpanded && (
              <Link
                href='/dashboard/manager/async-tasks'
                className='shrink-0 text-xs text-primary hover:underline flex items-center gap-1'
              >
                查看全部
                <ExternalLink className='h-3 w-3' />
              </Link>
            )}
          </div>
          {taskListExpanded && (
            <div className='max-h-64 overflow-y-auto p-2'>
              {floatingTasks.length === 0 ? (
                <p className='py-4 text-center text-sm text-muted-foreground'>
                  暂无任务
                </p>
              ) : (
                <ul className='space-y-2'>
                  {floatingTasks.map((task: any) => {
                    const progress = getTaskProgress(task);
                    const status = (task.status ?? 'pending') as string;
                    const displayName = getTaskDisplayName(task);
                    return (
                      <li
                        key={task.id}
                        className='rounded-md border border-border bg-muted/30 px-2 py-2'
                      >
                        <div className='flex items-start justify-between gap-2'>
                          <span className='min-w-0 flex-1 truncate text-sm font-medium'>
                            {displayName}
                          </span>
                          <Badge
                            variant={TASK_STATUS_BADGE[status] ?? 'outline'}
                            className='shrink-0 text-xs'
                          >
                            {TASK_STATUS_LABEL[status] ?? status}
                          </Badge>
                        </div>
                        {progress != null && (
                          <div className='mt-1.5 flex items-center gap-2'>
                            <Progress
                              value={progress.percentage}
                              className='h-1.5 flex-1'
                            />
                            <span className='text-xs text-muted-foreground whitespace-nowrap'>
                              {progress.completed}/{progress.total}
                              {progress.failed > 0
                                ? ` (失败${progress.failed})`
                                : ''}
                            </span>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* 模板详情编辑弹窗（仅改设计师） */}
      <ResponsiveDialog
        isDialog
        isOpen={detailEditOpen}
        onOpenChange={(open) => {
          setDetailEditOpen(open);
          if (!open) {
            setEditingTemplate(null);
          }
        }}
        title='模板详情编辑'
        description='可在此快速更换模板设计师'
        contentProps={{
          className: 'max-w-[520px]',
        }}
      >
        <div className='space-y-4 p-4'>
          <div className='space-y-1 text-sm'>
            <div className='text-muted-foreground'>模板ID</div>
            <div className='font-mono text-xs'>
              {editingTemplate?.id || '-'}
            </div>
          </div>

          <div className='space-y-1 text-sm'>
            <div className='text-muted-foreground'>标题</div>
            <div className='truncate'>{editingTemplate?.title || '-'}</div>
          </div>

          <div className='space-y-2'>
            <Label className='text-sm font-medium'>设计师</Label>
            <Select
              value={editDesignerUid}
              onValueChange={setEditDesignerUid}
              disabled={designersLoading || updateTemplateMutation.isPending}
            >
              <SelectTrigger className='h-9 w-full'>
                <SelectValue placeholder='选择设计师' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='none'>不设置</SelectItem>
                {designers.map((d: any) => (
                  <SelectItem key={d.uid} value={String(d.uid)}>
                    {d.name ? `${d.name} (${d.uid})` : String(d.uid)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className='text-xs text-muted-foreground'>
              {designersLoading
                ? '设计师列表加载中…'
                : '找不到？可到「设计师管理」先创建/完善设计师信息。'}
            </div>
          </div>

          <div className='flex justify-end gap-2 pt-2'>
            <Button
              variant='outline'
              onClick={() => setDetailEditOpen(false)}
              disabled={updateTemplateMutation.isPending}
            >
              取消
            </Button>
            <Button
              onClick={async () => {
                const id = editingTemplate?.id as string | undefined;
                if (!id) return;
                await updateTemplateMutation.mutateAsync({
                  id,
                  designer_uid:
                    editDesignerUid === 'none' ? null : Number(editDesignerUid),
                });
              }}
              disabled={
                !editingTemplate?.id ||
                updateTemplateMutation.isPending ||
                (editDesignerUid !== 'none' && !/^\d+$/.test(editDesignerUid))
              }
            >
              {updateTemplateMutation.isPending ? (
                <>
                  <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                  保存中...
                </>
              ) : (
                '保存'
              )}
            </Button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* 频道上架（批量上架） */}
      <ResponsiveDialog
        isDialog
        isOpen={channelsManagerOpen}
        onOpenChange={(open) => {
          setChannelsManagerOpen(open);
          if (!open) {
            if (clearSelectionOnClose) {
              setSelectedIds(new Set());
            }
            setClearSelectionOnClose(false);
            setChannelDialogTemplateIds(null);
            setChannelDialogTitle('频道上架');
            refetchTemplateChannels();
            onDataChange?.();
          }
        }}
        title={channelDialogTitle}
        contentProps={{
          className:
            'w-[90vw] max-h-[85vh] flex flex-col overflow-hidden max-w-[100vw]',
        }}
      >
        <div className='flex-1 min-h-0 p-4'>
          <ChannelsManager
            className='h-[75vh]'
            title='频道管理（用于上架）'
            templatePoolTemplateIds={
              channelDialogTemplateIds ?? templateIdsOnPage
            }
            defaultFilterEnv='production'
            defaultFilterLocale='zh-CN'
          />
        </div>
      </ResponsiveDialog>
    </div>
  );
}

export default TemplateListManager;

'use client';

import { DataPagination } from '@/components/DataPagination';
import { DateRangePicker } from '@/components/DateRangePicker';
import { trpcReact } from '@/utils/trpc';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
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
  Eye,
  Loader2,
  RefreshCw,
  Search
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { type DateRange } from 'react-day-picker';
import toast from 'react-hot-toast';

const PAGE_SIZE = 20;

type TaskType =
  | 'batch_generate_covers'
  | 'batch_regenerate_covers_by_date'
  | 'template_batch_vectorize_by_ids'
  | 'template_batch_vectorize_by_date';
type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

const TASK_TYPE_LABEL: Record<TaskType, string> = {
  batch_generate_covers: '批量生成封面',
  batch_regenerate_covers_by_date: '修正模版封面',
  template_batch_vectorize_by_ids: '批量模版向量（按ID）',
  template_batch_vectorize_by_date: '批量模版向量（按日期范围）',
};

const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  completed: '已完成',
  failed: '失败',
};

const TASK_STATUS_BADGE: Record<TaskStatus, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'danger' | 'info'> = {
  pending: 'warning',
  processing: 'info',
  completed: 'success',
  failed: 'danger',
};

export default function AsyncTasksPage() {
  const [page, setPage] = useState(1);
  const [taskType, setTaskType] = useState<TaskType | 'all'>('all');
  const [status, setStatus] = useState<TaskStatus | 'all'>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // 获取任务列表
  const { data: tasksData, isLoading, refetch } = trpcReact.asyncTask.getTaskList.useQuery({
    task_type: taskType === 'all' ? undefined : taskType,
    status: status === 'all' ? undefined : status,
    page,
    pageSize: PAGE_SIZE,
  });

  const tasks = useMemo(() => tasksData?.tasks || [], [tasksData?.tasks]);
  const totalPages = useMemo(() => tasksData?.totalPages || 0, [tasksData?.totalPages]);
  const total = useMemo(() => totalPages * PAGE_SIZE, [totalPages]);

  // 获取任务详情
  const { data: taskDetail } = trpcReact.asyncTask.getTaskById.useQuery(
    { id: selectedTaskId || '' },
    { enabled: !!selectedTaskId && showDetailDialog }
  );

  // 处理任务
  const processTaskMutation = trpcReact.asyncTask.processTask.useMutation({
    onSuccess: () => {
      toast.success('任务处理已启动');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || '启动任务处理失败');
    },
  });

  // 重试任务
  const retryTaskMutation = trpcReact.asyncTask.retryTask.useMutation({
    onSuccess: () => {
      toast.success('任务已重置为待处理状态');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || '重试任务失败');
    },
  });

  // 创建修正模版封面任务
  const createRegenerateTaskMutation = trpcReact.template.batchRegenerateCoversByDate.useMutation({
    onSuccess: (result) => {
      toast.success(result.message || '任务已创建');
      setShowRegenerateDialog(false);
      setDateRange(undefined);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || '创建任务失败');
    },
  });

  const handleProcessTask = (taskId: string) => {
    if (confirm('确定要处理这个任务吗？')) {
      processTaskMutation.mutate({ id: taskId });
    }
  };

  const handleRetryTask = (taskId: string) => {
    if (confirm('确定要重试这个任务吗？')) {
      retryTaskMutation.mutate({ id: taskId });
    }
  };

  const handleViewDetail = (taskId: string) => {
    setSelectedTaskId(taskId);
    setShowDetailDialog(true);
  };

  const getProgress = (task: any) => {
    if (!task.progress) return null;
    const progress = task.progress as {
      total?: number;
      completed?: number;
      failed?: number;
    };
    if (progress.total === undefined || progress.total === 0) return null;
    const completed = (progress.completed || 0) + (progress.failed || 0);
    return {
      total: progress.total,
      completed,
      failed: progress.failed || 0,
      percentage: Math.round((completed / progress.total) * 100),
    };
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleCreateRegenerateTask = () => {
    if (!dateRange?.from) {
      toast.error('请选择开始日期');
      return;
    }

    if (dateRange.to && dateRange.to < dateRange.from) {
      toast.error('结束日期不能早于开始日期');
      return;
    }

    const dateFromStr = dateRange.from.toISOString().split('T')[0];
    const dateToStr = dateRange.to
      ? dateRange.to.toISOString().split('T')[0]
      : undefined;

    createRegenerateTaskMutation.mutate({
      date_from: dateFromStr,
      date_to: dateToStr,
    });
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">异步任务管理</h1>
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowRegenerateDialog(true)}
          >
            修正模版封面
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            刷新
          </Button>
        </div>
      </div>

      {/* 筛选条件 */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索任务ID..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Select value={taskType} onValueChange={(v) => {
          setTaskType(v as TaskType | 'all');
          setPage(1);
        }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="任务类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            {Object.entries(TASK_TYPE_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => {
          setStatus(v as TaskStatus | 'all');
          setPage(1);
        }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="任务状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            {Object.entries(TASK_STATUS_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 任务列表 */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>任务ID</TableHead>
              <TableHead>任务名称</TableHead>
              <TableHead>任务类型</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>进度</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead>完成时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  暂无任务
                </TableCell>
              </TableRow>
            ) : (
              tasks
                .filter((task) => {
                  if (!searchKeyword) return true;
                  return task.id.toLowerCase().includes(searchKeyword.toLowerCase());
                })
                .map((task) => {
                  const progress = getProgress(task);
                  return (
                    <TableRow key={task.id}>
                      <TableCell className="font-mono text-sm">
                        {task.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        {task.task_name || '-'}
                      </TableCell>
                      <TableCell>
                        {TASK_TYPE_LABEL[task.task_type as TaskType] || task.task_type}
                      </TableCell>
                      <TableCell>
                        <Badge variant={TASK_STATUS_BADGE[task.status as TaskStatus]}>
                          {TASK_STATUS_LABEL[task.status as TaskStatus]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {progress ? (
                          <div className="flex items-center gap-2 min-w-[200px]">
                            <Progress value={progress.percentage} className="flex-1" />
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                              {progress.completed}/{progress.total}
                              {progress.failed > 0 && ` (失败: ${progress.failed})`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(task.create_time)}</TableCell>
                      <TableCell>{formatDate(task.completed_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetail(task.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {task.status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleProcessTask(task.id)}
                              disabled={processTaskMutation.isPending}
                            >
                              {processTaskMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                '处理'
                              )}
                            </Button>
                          )}
                          {task.status === 'failed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRetryTask(task.id)}
                              disabled={retryTaskMutation.isPending}
                            >
                              {retryTaskMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                '重试'
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      <DataPagination
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        showInfo={true}
      />

      {/* 任务详情弹窗 */}
      <ResponsiveDialog
        isOpen={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        title="任务详情"
        showCloseIcon={true}
        contentProps={{ className: '' }}
      >
        {taskDetail && (
          <div className="space-y-4 p-4 h-[80vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">任务ID</Label>
                <p className="mt-1 font-mono text-sm">{taskDetail.id}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">任务名称</Label>
                <p className="mt-1">{taskDetail.task_name || '-'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">任务类型</Label>
                <p className="mt-1">
                  {TASK_TYPE_LABEL[taskDetail.task_type as TaskType] || taskDetail.task_type}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">状态</Label>
                <p className="mt-1">
                  <Badge variant={TASK_STATUS_BADGE[taskDetail.status as TaskStatus]}>
                    {TASK_STATUS_LABEL[taskDetail.status as TaskStatus]}
                  </Badge>
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">创建时间</Label>
                <p className="mt-1">{formatDate(taskDetail.create_time)}</p>
              </div>
              {taskDetail.started_at && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">开始时间</Label>
                  <p className="mt-1">{formatDate(taskDetail.started_at)}</p>
                </div>
              )}
              {taskDetail.completed_at && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">完成时间</Label>
                  <p className="mt-1">{formatDate(taskDetail.completed_at)}</p>
                </div>
              )}
            </div>

            {taskDetail.progress && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">进度信息</Label>
                <pre className="mt-1 p-3 bg-muted rounded-md text-sm overflow-auto">
                  {JSON.stringify(taskDetail.progress, null, 2)}
                </pre>
              </div>
            )}

            <div>
              <Label className="text-sm font-medium text-muted-foreground">输入参数</Label>
              <pre className="mt-1 p-3 bg-muted rounded-md text-sm overflow-auto max-h-48 select-text">
                {JSON.stringify(taskDetail.input_data, null, 2)}
              </pre>
            </div>

            {taskDetail.output_data && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">输出结果</Label>
                <pre className="mt-1 p-3 bg-muted rounded-md text-sm overflow-auto max-h-48 select-text">
                  {JSON.stringify(taskDetail.output_data, null, 2)}
                </pre>
              </div>
            )}

            {taskDetail.error_message && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">错误信息</Label>
                <p className="mt-1 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                  {taskDetail.error_message}
                </p>
              </div>
            )}
          </div>
        )}
      </ResponsiveDialog>

      {/* 修正模版封面对话框 */}
      <ResponsiveDialog
        isOpen={showRegenerateDialog}
        onOpenChange={setShowRegenerateDialog}
        title="修正模版封面"
        showCloseIcon={true}
      >
        <div className="space-y-4 p-4">
          <div className="space-y-4">
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              label="日期范围"
              id="regenerate-date-range"
              placeholder="选择时间范围"
            />
            <p className="text-sm text-muted-foreground">
              将检查指定时间范围内创建的模版，如果 coverV3 中的图片真实宽高与记录值不一致，将重新生成封面。如果不选择结束日期，将查询开始日期之后的所有模版。
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowRegenerateDialog(false);
                setDateRange(undefined);
              }}
            >
              取消
            </Button>
            <Button
              variant="default"
              onClick={handleCreateRegenerateTask}
              disabled={createRegenerateTaskMutation.isPending || !dateRange?.from}
            >
              {createRegenerateTaskMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  创建中...
                </>
              ) : (
                '创建任务'
              )}
            </Button>
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  );
}

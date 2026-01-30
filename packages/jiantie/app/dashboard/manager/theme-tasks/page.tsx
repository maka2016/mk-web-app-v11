'use client';

import { getImgInfo2 } from '@/components/GridEditorV3/utils/utils1';
import { showSelector } from '@/components/showSelector';
import { cdnApi, getAppId, getUid } from '@/services';
import { trpc, trpcReact } from '@/utils/trpc';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card';
import { Checkbox } from '@workspace/ui/components/checkbox';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { DataPagination } from '@/components/DataPagination';
import {
  RadioGroup,
  RadioGroupItem,
} from '@workspace/ui/components/radio-group';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@workspace/ui/components/tabs';
import { Textarea } from '@workspace/ui/components/textarea';
import { Edit, Loader2, Plus, RefreshCw, Settings, Trash2, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ChannelsManager } from '../channels/ChannelsManager';

type TaskStatus = 'pending_review' | 'in_progress' | 'completed';
type ReviewStatus = 'pending' | 'approved' | 'changes_requested' | 'rejected';
type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'light'
  | 'dark';

// 使用统一的 tRPC 类型（从 @/server 导入）

const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pending_review: '1 待审核',
  in_progress: '2 进行中',
  completed: '3 已完成',
};

const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: '待审核',
  approved: '已通过',
  changes_requested: '需修改',
  rejected: '已拒绝',
};

const REVIEW_STATUS_BADGE: Record<ReviewStatus, BadgeVariant> = {
  pending: 'warning',
  approved: 'success',
  changes_requested: 'info',
  rejected: 'danger',
};

export default function ThemeTasksManagerPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialTaskId = searchParams?.get('taskId') || null;
  const initialSubmissionId = searchParams?.get('submissionId') || null;

  const [taskKeyword, setTaskKeyword] = useState('');
  const [searchKeyword, setSearchKeyword] = useState<string>(''); // 实际用于搜索的关键词
  const [taskStatus, setTaskStatus] = useState<TaskStatus | 'all'>('in_progress');

  const [submissionDesignerFilter, setSubmissionDesignerFilter] =
    useState<'all' | string>('all');
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState<
    'all' | ReviewStatus
  >('all');

  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // 分页状态
  const [taskPage, setTaskPage] = useState(1);
  const [taskPageSize] = useState(20);
  const [submissionPage, setSubmissionPage] = useState(1);
  const [submissionPageSize] = useState(20);
  const [templatePage, setTemplatePage] = useState(1);
  const [templatePageSize] = useState(20);

  // tRPC React hooks
  const { data: tasksData, isLoading: loadingTasks, refetch: refetchTasks } = trpcReact.themeTask.listTasks.useQuery({
    status: taskStatus === 'all' ? undefined : taskStatus,
    keyword: searchKeyword || undefined,
    skip: (taskPage - 1) * taskPageSize,
    take: taskPageSize,
  });
  const tasks = useMemo(() => tasksData?.data || [], [tasksData?.data]);
  const tasksTotal = useMemo(() => tasksData?.total || 0, [tasksData?.total]);

  // 选中任务单（存储完整对象）
  const [selectedTask, setSelectedTask] = useState<(typeof tasks)[number] | null>(null);

  const designerUid = submissionDesignerFilter !== 'all' && submissionDesignerFilter
    ? Number(submissionDesignerFilter)
    : undefined;
  const { data: submissionsData, isLoading: loadingSubmissions, refetch: refetchSubmissions } = trpcReact.themeTask.listSubmissionsByTask.useQuery(
    {
      theme_task_id: selectedTask?.id || '',
      review_status: submissionStatusFilter === 'all' ? undefined : submissionStatusFilter,
      designer_uid: designerUid,
      skip: (submissionPage - 1) * submissionPageSize,
      take: submissionPageSize,
    },
    {
      enabled: !!selectedTask?.id,
    }
  );
  const submissions = useMemo(() => {
    if (!submissionsData || typeof submissionsData !== 'object') return [];
    return (submissionsData as any).data || [];
  }, [submissionsData]);
  const submissionsTotal = useMemo(() => {
    if (!submissionsData || typeof submissionsData !== 'object') return 0;
    return (submissionsData as any).total || 0;
  }, [submissionsData]);

  // 存储每个作品的模版数量映射
  const [templateCountMap, setTemplateCountMap] = useState<Map<string, number>>(new Map());

  // 批量查询所有作品的模版数量
  const fetchTemplateCounts = async (worksIds: string[]) => {
    if (worksIds.length === 0) {
      setTemplateCountMap(new Map());
      return;
    }

    // 并行查询所有作品的模版数量
    const countPromises = worksIds.map(async (worksId) => {
      try {
        const templates = await trpc.themeTask.listTemplatesByWorksId.query({
          works_id: worksId,
          skip: 0,
          take: 1, // 只需要知道是否有模版，不需要全部数据
        });
        return { worksId, count: templates?.total || 0 };
      } catch (error) {
        console.error(`查询作品 ${worksId} 的模版数量失败:`, error);
        return { worksId, count: 0 };
      }
    });

    const results = await Promise.all(countPromises);
    const newMap = new Map<string, number>();
    results.forEach(({ worksId, count }) => {
      newMap.set(worksId, count);
    });
    setTemplateCountMap(newMap);
  };

  useEffect(() => {
    if (submissions.length === 0) {
      setTemplateCountMap(new Map());
      return;
    }

    const worksIds = submissions
      .map((s: any) => s.works_id)
      .filter((id: any): id is string => !!id);

    fetchTemplateCounts(worksIds);
  }, [submissions]);

  // 选中提交记录（存储完整对象）
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);

  const { data: reviewLogsData, isLoading: loadingLogs, refetch: refetchLogs } = trpcReact.themeTask.listReviewLogs.useQuery(
    {
      submission_id: selectedSubmission?.id || '',
    },
    {
      enabled: !!selectedSubmission?.id,
    }
  );
  const reviewLogs = useMemo(() => reviewLogsData || [], [reviewLogsData]);

  const deleteReviewLogMutation = trpcReact.themeTask.deleteReviewLog.useMutation(
    {
      onSuccess: () => {
        toast.success('删除成功');
        refetchLogs();
      },
      onError: (e: any) => {
        toast.error(e?.message || '删除失败');
      },
    }
  );

  const deleteSubmissionMutation = trpcReact.themeTask.deleteSubmission.useMutation({
    onSuccess: () => {
      toast.success('删除成功');
      // 如果删除的是当前选中的提交记录，清空选中状态
      if (selectedSubmission?.id) {
        setSelectedSubmission(null);
      }
      refetchSubmissions();
    },
    onError: (e: any) => {
      toast.error(e?.message || '删除失败');
    },
  });

  const { data: materialClassesData } = trpcReact.materialResource.getMaterialClasses.useQuery();
  const materialClasses = useMemo(() => materialClassesData || [], [materialClassesData]);

  const { data: specsData } = trpcReact.worksSpec.findMany.useQuery({ deleted: false });
  const specs = useMemo(() => specsData || [], [specsData]);

  const { data: designersData, isLoading: loadingDesigners } = trpcReact.designer.findMany.useQuery({
    deleted: false,
    take: 200,
  });
  const designers = useMemo(() => designersData || [], [designersData]);

  // 获取该任务作品项创建的模板列表（约束查询范围）
  const { data: templatesData, isLoading: loadingTemplates, refetch: refetchTemplates } = trpcReact.themeTask.listTemplatesByWorksId.useQuery(
    {
      works_id: selectedSubmission?.works_id || '',
      skip: (templatePage - 1) * templatePageSize,
      take: templatePageSize,
    },
    {
      enabled: !!selectedSubmission?.works_id,
      // 当 selectedSubmission 变化时，确保重新查询而不是使用缓存
      staleTime: 0,
    }
  );
  // 当 selectedSubmission 变化时，如果数据还在加载或没有数据，返回空数组
  const templates = useMemo(() => {
    if (!selectedSubmission?.works_id || !templatesData) {
      return [];
    }
    return templatesData.data || [];
  }, [templatesData, selectedSubmission?.works_id]);
  const templatesTotal = useMemo(() => templatesData?.total || 0, [templatesData?.total]);
  const templatePoolTemplateIds = useMemo(() => {
    return templates.map((t: any) => String(t.id)).filter(Boolean);
  }, [templates]);
  const [channelsManagerOpen, setChannelsManagerOpen] = useState(false);

  // Mutations
  const createTaskMutation = trpcReact.themeTask.createTask.useMutation({
    onSuccess: () => {
      setShowCreateDialog(false);
      setCreateForm({
        title: '',
        desc: '',
        material_class_id: undefined,
        spec_id: undefined,
        designer_uids: [],
        style: '',
        sample_images: [],
      });
      refetchTasks();
    },
    onError: (e: any) => {
      toast.error(e?.message || '创建失败');
    },
  });

  const reviewSubmissionMutation = trpcReact.themeTask.reviewSubmission.useMutation({
    onSuccess: () => {
      setReviewDialogOpen(false);
      setReviewImages([]);
      refetchSubmissions();
      if (selectedSubmission?.id) {
        refetchLogs();
      }
    },
    onError: (e: any) => {
      toast.error(e?.message || '审核失败');
    },
  });

  const updateTaskMutation = trpcReact.themeTask.updateTask.useMutation({
    onSuccess: () => {
      setShowSettingsDialog(false);
      refetchTasks();
      if (editingTaskId === selectedTask?.id) {
        refetchSubmissions();
      }
    },
    onError: (e: any) => {
      toast.error(e?.message || '更新失败');
    },
  });

  // 创建异步任务用于生成封面
  const createAsyncTaskMutation = trpcReact.asyncTask.createTask.useMutation();
  const processTaskMutation = trpcReact.asyncTask.processTask.useMutation();

  // 创建模板
  const createTemplateMutation = trpcReact.template.createFromData.useMutation({
    onSuccess: async (template) => {
      setShowCreateTemplateDialog(false);
      setCreateTemplateForm({
        title: '',
        desc: '',
        cover: undefined,
      });
      refetchTemplates();
      // 更新模版数量：如果当前选中的提交记录存在，刷新它的模版数量
      if (selectedSubmission?.works_id) {
        fetchTemplateCounts([selectedSubmission.works_id]);
      }
      toast.success('创建模版成功，封面将自动生成');

      // 创建封面生成异步任务
      try {
        const uidStr = getUid();
        const createdByUid = uidStr ? Number(uidStr) : undefined;

        // 生成任务名称
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const h = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const timeStr = `${y}-${m}-${d} ${h}:${min}`;
        const taskName = `模版封面生成_${template.id}_${timeStr}`;

        const task = await createAsyncTaskMutation.mutateAsync({
          task_type: 'batch_generate_covers',
          task_name: taskName,
          input_data: {
            template_ids: [template.id],
          },
          created_by_uid: createdByUid && !isNaN(createdByUid) ? createdByUid : undefined,
        });

        // 立即执行任务
        processTaskMutation.mutate({ id: task.id });
      } catch (error: any) {
        console.error('创建封面生成任务失败:', error);
        // 任务创建失败不影响模版创建成功的提示
      }
    },
    onError: (e: any) => {
      toast.error(e?.message || '创建模版失败');
    },
  });

  const [createForm, setCreateForm] = useState<{
    title: string;
    desc: string;
    material_class_id: string | undefined;
    spec_id: string | undefined;
    designer_uids: number[];
    style: string;
    sample_images: string[];
  }>({
    title: '',
    desc: '',
    material_class_id: undefined,
    spec_id: undefined,
    designer_uids: [],
    style: '',
    sample_images: [],
  });

  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewToStatus, setReviewToStatus] = useState<
    'approved' | 'changes_requested' | 'rejected'
  >('changes_requested');
  const [reviewNote, setReviewNote] = useState('');
  const [reviewImages, setReviewImages] = useState<string[]>([]);

  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string>('');
  const [settingsForm, setSettingsForm] = useState<{
    title: string;
    desc: string;
    material_class_id: string | undefined;
    spec_id: string | undefined;
    designer_uids: number[];
    status: TaskStatus;
    due_at: string | undefined;
    style: string;
    sample_images: string[];
  }>({
    title: '',
    desc: '',
    material_class_id: undefined,
    spec_id: undefined,
    designer_uids: [],
    status: 'in_progress',
    due_at: undefined,
    style: '',
    sample_images: [],
  });

  const [showCreateTemplateDialog, setShowCreateTemplateDialog] = useState(false);
  const [createTemplateForm, setCreateTemplateForm] = useState<{
    title: string;
    desc: string;
    cover: string | undefined;
  }>({
    title: '',
    desc: '',
    cover: undefined,
  });

  // 当前模版页的已上架频道映射（按模板ID）
  const templateIdsOnPage = useMemo(
    () => templates.map((t: any) => String(t.id)).filter(Boolean),
    [templates]
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

  // 下架模版 mutation
  const updateTemplateIdsMutation = trpcReact.adminChannel.updateTemplateIds.useMutation({
    onError: (error) => {
      toast.error(error.message || '下架失败');
    },
  });
  const updateUrlSelection = (options: {
    taskId?: string | null;
    submissionId?: string | null;
  }) => {
    if (!pathname || !searchParams) return;
    const params = new URLSearchParams(searchParams.toString());

    if (options.taskId !== undefined) {
      if (!options.taskId) {
        params.delete('taskId');
      } else {
        params.set('taskId', options.taskId);
      }
    }

    if (options.submissionId !== undefined) {
      if (!options.submissionId) {
        params.delete('submissionId');
      } else {
        params.set('submissionId', options.submissionId);
      }
    }

    const queryString = params.toString();
    const url = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(url, { scroll: false });
  };


  // 当筛选条件变化时，重置分页到第一页
  useEffect(() => {
    setTaskPage(1);
  }, [taskStatus, searchKeyword]);

  useEffect(() => {
    setSubmissionPage(1);
  }, [submissionDesignerFilter, submissionStatusFilter, selectedTask?.id]);

  useEffect(() => {
    setTemplatePage(1);
  }, [selectedSubmission?.works_id]);

  // 当任务列表加载完成且没有选中任务时，自动选中第一个
  useEffect(() => {
    if (!selectedTask && tasks.length > 0 && !initialTaskId) {
      // 根据 API 响应自动选择第一个任务，这是合理的副作用
      const first = tasks[0];
      setSelectedTask(first);
      updateUrlSelection({ taskId: first.id, submissionId: null });
    }
  }, [tasks, selectedTask, initialTaskId]);

  // 当提交列表变化时，自动选中第一个（如果当前选中的不在列表中）
  useEffect(() => {
    if (submissions.length > 0 && !initialSubmissionId) {
      // 根据 API 响应自动选择第一个提交，这是合理的副作用
      setSelectedSubmission((prev: any) => {
        if (prev && submissions.some((x: any) => x.id === prev.id)) return prev;
        const first = submissions[0];
        updateUrlSelection({
          taskId: selectedTask?.id ?? null,
          submissionId: first?.id ?? null,
        });
        return first;
      });
    } else {
      setSelectedSubmission(null);
    }
  }, [submissions, initialSubmissionId, selectedTask?.id]);

  // 根据 URL 初始化选中的任务单
  useEffect(() => {
    if (!initialTaskId || selectedTask || tasks.length === 0) return;
    const found = tasks.find(t => t.id === initialTaskId);
    if (found) {
      setSelectedTask(found);
    } else {
      updateUrlSelection({ taskId: null, submissionId: null });
    }
  }, [initialTaskId, tasks, selectedTask]);

  // 根据 URL 初始化选中的作品提交
  useEffect(() => {
    if (!initialSubmissionId || selectedSubmission || submissions.length === 0) return;
    const found = submissions.find((s: any) => s.id === initialSubmissionId);
    if (found) {
      setSelectedSubmission(found);
    } else {
      updateUrlSelection({
        taskId: initialTaskId,
        submissionId: null,
      });
    }
  }, [initialSubmissionId, submissions, selectedSubmission, initialTaskId]);

  const handleSelectTask = (task: (typeof tasks)[number]) => {
    setSelectedTask(task);
    setSelectedSubmission(null);
    updateUrlSelection({ taskId: task.id, submissionId: null });
  };

  const handleSelectSubmission = (submission: any) => {
    setSelectedSubmission(submission);
    const taskId = selectedTask?.id ?? null;
    updateUrlSelection({ taskId, submissionId: submission.id });
  };

  const handleCreate = async () => {
    if (!createForm.title.trim()) return;
    const uid = getUid();
    createTaskMutation.mutate({
      title: createForm.title.trim(),
      desc: createForm.desc || undefined,
      material_class_id: createForm.material_class_id || undefined,
      spec_id: createForm.spec_id || undefined,
      designer_uids: createForm.designer_uids.length > 0 ? createForm.designer_uids : undefined,
      created_by_uid: uid ? Number(uid) : undefined,
      status: 'in_progress',
      style: createForm.style.trim() || undefined,
      sample_images: createForm.sample_images.length > 0 ? createForm.sample_images : undefined,
    });
  };


  const handleReview = async () => {
    if (!selectedSubmission) return;
    const uid = getUid();
    if (!uid) {
      toast.error('请先登录');
      return;
    }
    reviewSubmissionMutation.mutate({
      submission_id: selectedSubmission.id,
      to_review_status: reviewToStatus,
      reviewer_uid: Number(uid),
      review_note: reviewNote || undefined,
      review_images: reviewImages.length > 0 ? reviewImages : undefined,
    });
  };

  const handleUpdate = async () => {
    if (!editingTaskId || !settingsForm.title.trim()) return;

    // <input type="datetime-local" /> 返回的是不带时区的 "YYYY-MM-DDTHH:mm"
    // 后端 z.string().datetime() 需要带时区的 ISO 字符串（例如 ...Z）
    const dueAtIso =
      settingsForm.due_at && !Number.isNaN(new Date(settingsForm.due_at).getTime())
        ? new Date(settingsForm.due_at).toISOString()
        : null;

    updateTaskMutation.mutate({
      id: editingTaskId,
      title: settingsForm.title.trim(),
      desc: settingsForm.desc || null,
      material_class_id: settingsForm.material_class_id || null,
      spec_id: settingsForm.spec_id || null,
      designer_uids: settingsForm.designer_uids.length > 0 ? settingsForm.designer_uids : undefined,
      status: settingsForm.status,
      due_at: dueAtIso,
      style: settingsForm.style.trim() || null,
      sample_images: settingsForm.sample_images.length > 0 ? settingsForm.sample_images : null,
    });
  };

  return (
    <div className='h-screen flex flex-col overflow-hidden'>
      <div className='grid grid-cols-12 gap-2 h-full p-2 overflow-hidden'>
        {/* 左：任务单列表 */}
        <div className='col-span-3 flex flex-col h-full overflow-hidden'>
          <Card className='flex flex-col border shadow-none h-full'>
            <CardHeader className='px-3 py-2 border-b flex-shrink-0'>
              <div className='flex items-center justify-between gap-2'>
                <CardTitle className='text-sm font-medium'>
                  主题任务单
                </CardTitle>
                <div className='flex items-center gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-6 px-2 text-xs'
                    onClick={() => refetchTasks()}
                    disabled={loadingTasks}
                  >
                    <RefreshCw className='h-3 w-3 mr-1' />
                    刷新
                  </Button>
                  <Button
                    size='sm'
                    className='h-6 px-2 text-xs'
                    onClick={() => setShowCreateDialog(true)}
                  >
                    <Plus className='h-3 w-3 mr-1' />
                    新建
                  </Button>
                </div>
              </div>
              <div className='pt-2'>
                <RadioGroup
                  value={taskStatus}
                  onValueChange={v => setTaskStatus(v as TaskStatus | 'all')}
                  className='flex flex-wrap gap-3 text-xs'
                >
                  <div className='flex items-center gap-1'>
                    <RadioGroupItem value='pending_review' id='task-status-pending_review' />
                    <Label htmlFor='task-status-pending_review'>待审核</Label>
                  </div>
                  <div className='flex items-center gap-1'>
                    <RadioGroupItem value='in_progress' id='task-status-in_progress' />
                    <Label htmlFor='task-status-in_progress'>进行中</Label>
                  </div>
                  <div className='flex items-center gap-1'>
                    <RadioGroupItem value='completed' id='task-status-completed' />
                    <Label htmlFor='task-status-completed'>已完成</Label>
                  </div>
                  <div className='flex items-center gap-1'>
                    <RadioGroupItem value='all' id='task-status-all' />
                    <Label htmlFor='task-status-all'>全部</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className='pt-2'>
                <Input
                  placeholder='搜索任务单标题/描述'
                  value={taskKeyword}
                  onChange={e => setTaskKeyword(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      setSearchKeyword(taskKeyword);
                    }
                  }}
                  className='h-7 text-xs'
                />
              </div>
            </CardHeader>
            <CardContent className='flex-1 overflow-y-auto p-2 space-y-2'>
              {loadingTasks && tasks.length === 0 ? (
                <div className='flex items-center justify-center py-8'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  <span className='ml-2 text-xs'>加载中...</span>
                </div>
              ) : tasks.length === 0 ? (
                <div className='text-center py-8 text-xs text-muted-foreground'>
                  暂无任务单
                </div>
              ) : (
                tasks.map(t => {
                  const isActive = t.id === selectedTask?.id;
                  return (
                    <div
                      key={t.id}
                      className={`w-full p-2 rounded border transition-colors relative ${isActive
                        ? 'border-primary/50 bg-primary/10'
                        : 'border-transparent hover:bg-muted/50'
                        }`}
                    >
                      <button
                        type='button'
                        className='w-full text-left'
                        onClick={() => handleSelectTask(t)}
                      >
                        <div className='flex items-start justify-between gap-2'>
                          <div className='min-w-0 flex-1'>
                            <div className='text-xs font-medium truncate'>
                              {t.title}
                            </div>
                            <div className='text-[10px] text-muted-foreground truncate'>
                              {t.desc || '-'}
                            </div>
                            <div className='pt-1 text-[10px] text-muted-foreground flex flex-wrap gap-1'>
                              <span>
                                状态：{TASK_STATUS_LABEL[t.status as TaskStatus]}
                              </span>
                              {(t as any).style && (
                                <span>风格：{(t as any).style}</span>
                              )}
                              {(t as any).material_class?.name && (
                                <span>分类：{(t as any).material_class.name}</span>
                              )}
                              {(t as any).specInfo?.display_name && (
                                <span>规格：{(t as any).specInfo.display_name}</span>
                              )}
                              <span>提交：{(t as any)._count?.submissions ?? 0}</span>
                            </div>
                            {Array.isArray((t as any).sample_images) &&
                              (t as any).sample_images.length > 0 && (
                                <div className='pt-1 flex gap-1'>
                                  {(t as any).sample_images
                                    .slice(0, 3)
                                    .map((url: string, idx: number) => (
                                      <img
                                        key={idx}
                                        src={cdnApi(url)}
                                        alt={`样稿 ${idx + 1}`}
                                        className='w-8 h-8 object-cover rounded border'
                                      />
                                    ))}
                                  {(t as any).sample_images.length > 3 && (
                                    <div className='w-8 h-8 rounded border flex items-center justify-center text-[8px] text-muted-foreground'>
                                      +{(t as any).sample_images.length - 3}
                                    </div>
                                  )}
                                </div>
                              )}
                          </div>
                        </div>
                      </button>
                      <div className='flex justify-end mt-1 absolute right-2 top-2'>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-5 px-2 text-xs'
                          onClick={e => {
                            e.stopPropagation();
                            const task = t;
                            setEditingTaskId(task.id);
                            // 从 designers 关联中获取设计师 UID 列表
                            const designerUids = task.designers
                              ? task.designers.map((d) => d.designer_uid)
                              : task.designer_uid
                                ? [task.designer_uid]
                                : [];
                            const taskWithStyle = task
                            setSettingsForm({
                              title: task.title,
                              desc: task.desc || '',
                              material_class_id: task.material_class_id || undefined,
                              spec_id: task.spec_id || undefined,
                              designer_uids: designerUids,
                              status: task.status as TaskStatus,
                              due_at: task.due_at
                                ? new Date(task.due_at).toISOString().slice(0, 16)
                                : undefined,
                              style: taskWithStyle.style || '',
                              sample_images: Array.isArray(taskWithStyle.sample_images) ? taskWithStyle.sample_images as string[] : [],
                            });
                            setShowSettingsDialog(true);
                          }}
                        >
                          <Settings className='h-3 w-3' />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
              {/* 主题任务单分页 */}
              <DataPagination
                page={taskPage}
                total={tasksTotal}
                pageSize={taskPageSize}
                onPageChange={setTaskPage}
                showInfo={true}
              />
            </CardContent>
          </Card>
        </div>

        {/* 中：激活任务单下的提交列表 */}
        <div className='col-span-6 flex flex-col h-full overflow-hidden'>
          <Card className='flex flex-col border shadow-none h-full'>
            <CardHeader className='px-3 py-2 border-b flex-shrink-0 space-y-2'>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-sm font-medium'>
                  设计师提交作品列表
                </CardTitle>
                {selectedTask && (
                  <div className='text-xs text-muted-foreground'>
                    {selectedTask.title}
                  </div>
                )}
              </div>
              <div className='flex items-center justify-between gap-2'>
                <div className='flex items-center gap-3'>
                  <div className='flex items-center gap-2'>
                    <Label className='text-[11px] text-muted-foreground'>
                      设计师
                    </Label>
                    <Select
                      value={submissionDesignerFilter}
                      onValueChange={v => {
                        const next = v as 'all' | string;
                        setSubmissionDesignerFilter(next);
                        // 状态变化会自动触发 refetch
                      }}
                    >
                      <SelectTrigger className='h-7 text-xs w-[180px]'>
                        <SelectValue placeholder='全部设计师' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='all'>全部设计师</SelectItem>
                        {designers.map(d => (
                          <SelectItem key={d.id} value={String(d.uid)}>
                            {d.name}（{d.uid}）
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Label className='text-[11px] text-muted-foreground'>
                      状态
                    </Label>
                    <Select
                      value={submissionStatusFilter}
                      onValueChange={v => {
                        const next = v as 'all' | ReviewStatus;
                        setSubmissionStatusFilter(next);
                        // 状态变化会自动触发 refetch
                      }}
                    >
                      <SelectTrigger className='h-7 text-xs w-[140px]'>
                        <SelectValue placeholder='全部状态' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='all'>全部状态</SelectItem>
                        <SelectItem value='pending'>
                          {REVIEW_STATUS_LABEL.pending}
                        </SelectItem>
                        <SelectItem value='approved'>
                          {REVIEW_STATUS_LABEL.approved}
                        </SelectItem>
                        <SelectItem value='changes_requested'>
                          {REVIEW_STATUS_LABEL.changes_requested}
                        </SelectItem>
                        <SelectItem value='rejected'>
                          {REVIEW_STATUS_LABEL.rejected}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className='flex-1 overflow-auto p-2'>
              {!selectedTask ? (
                <div className='text-center py-8 text-xs text-muted-foreground'>
                  请先选择任务单
                </div>
              ) : loadingSubmissions && submissions.length === 0 ? (
                <div className='flex items-center justify-center py-8'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  <span className='ml-2 text-xs'>加载中...</span>
                </div>
              ) : submissions.length === 0 ? (
                <div className='text-center py-8 text-xs text-muted-foreground'>
                  暂无提交
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className='h-7'>
                      <TableHead className='h-7 px-2 text-xs font-medium'>
                        封面
                      </TableHead>
                      <TableHead className='h-7 px-2 text-xs font-medium'>
                        作品
                      </TableHead>
                      <TableHead className='h-7 px-2 text-xs font-medium'>
                        设计师
                      </TableHead>
                      <TableHead className='h-7 px-2 text-xs font-medium'>
                        状态
                      </TableHead>
                      <TableHead className='h-7 px-2 text-xs font-medium'>
                        已有模版
                      </TableHead>
                      <TableHead className='h-7 px-2 text-xs font-medium'>
                        提交时间
                      </TableHead>
                      <TableHead className='h-7 px-2 text-xs font-medium'>
                        操作
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((s: any) => {
                      const isActive = s.id === selectedSubmission?.id;
                      const status = s.review_status as ReviewStatus;
                      return (
                        <TableRow
                          key={s.id}
                          className={`${isActive ? 'bg-primary/10' : ''}`}
                        >
                          <TableCell className='px-2 py-1'>
                            <div
                              className='relative h-12 w-16 overflow-hidden rounded border bg-muted cursor-pointer'
                              onClick={() => handleSelectSubmission(s)}
                            >
                              {s.works?.cover ? (
                                <img
                                  src={cdnApi(s.works.cover, {
                                    resizeWidth: 200,
                                  })}
                                  alt={s.works?.title || '作品封面'}
                                  className='h-full w-full object-cover object-top'
                                />
                              ) : (
                                <div className='flex h-full items-center justify-center text-xs text-muted-foreground'>
                                  无
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell
                            className='px-2 py-1 text-xs cursor-pointer'
                            onClick={() => handleSelectSubmission(s)}
                          >
                            <div className='font-medium line-clamp-1'>
                              {s.works?.title || s.works_id}
                            </div>
                            <div className='text-[10px] text-muted-foreground line-clamp-1'>
                              {s.works_id}
                            </div>
                          </TableCell>
                          <TableCell
                            className='px-2 py-1 text-xs cursor-pointer'
                            onClick={() => handleSelectSubmission(s)}
                          >
                            {(() => {
                              const designer = designers.find(
                                d => d.uid === s.designer_uid
                              );
                              if (designer) {
                                return designer.name;
                              }
                              return s.designer_uid;
                            })()}
                          </TableCell>
                          <TableCell
                            className='px-2 py-1 cursor-pointer'
                            onClick={() => handleSelectSubmission(s)}
                          >
                            <Badge variant={REVIEW_STATUS_BADGE[status]}>
                              {REVIEW_STATUS_LABEL[status]}
                            </Badge>
                          </TableCell>
                          <TableCell
                            className='px-2 py-1 text-xs text-center cursor-pointer'
                            onClick={() => handleSelectSubmission(s)}
                          >
                            {templateCountMap.get(s.works_id) ?? '-'}
                          </TableCell>
                          <TableCell
                            className='px-2 py-1 text-[10px] text-muted-foreground cursor-pointer'
                            onClick={() => handleSelectSubmission(s)}
                          >
                            {s.submit_time
                              ? new Date(s.submit_time).toLocaleString('zh-CN')
                              : '-'}
                          </TableCell>
                          <TableCell className='px-2 py-1'>
                            {(() => {
                              const templateCount = templateCountMap.get(s.works_id) ?? 0;
                              // 已有模版数量不为0时不提供删除功能
                              if (templateCount > 0) {
                                return null;
                              }
                              return (
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  className='h-6 px-2 text-xs text-destructive hover:text-destructive'
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const ok = window.confirm('确认删除该条提交记录？');
                                    if (!ok) return;
                                    deleteSubmissionMutation.mutate({
                                      id: s.id,
                                    });
                                  }}
                                  disabled={deleteSubmissionMutation.isPending}
                                >
                                  删除
                                </Button>
                              );
                            })()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              {/* 任务作品列表分页 */}
              <DataPagination
                page={submissionPage}
                total={submissionsTotal}
                pageSize={submissionPageSize}
                onPageChange={setSubmissionPage}
                showInfo={true}
              />
            </CardContent>
          </Card>
        </div>

        {/* 右：提交详情 + 审核动作 + 审核历史 */}
        <div className='col-span-3 flex flex-col h-full overflow-hidden'>
          <Card className='flex flex-col border shadow-none h-full'>
            <CardContent className='flex-1 overflow-auto p-3 space-y-3'>
              {!selectedSubmission ? (
                <div className='text-center py-8 text-xs text-muted-foreground'>
                  请选择一条提交记录
                </div>
              ) : (
                <>
                  <div className='space-y-2'>
                    <div className='text-sm font-medium'>
                      {selectedSubmission.works?.title || '未命名作品'}
                    </div>
                    <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                      <span>作品ID：{selectedSubmission.works_id}</span>
                      <Button
                        variant='outline'
                        size='sm'
                        className='h-6 px-2 text-xs'
                        onClick={() => {
                          const uid = getUid();
                          const worksId = selectedSubmission.works_id;
                          if (!worksId) return;
                          const url = `/desktop/editor-designer?works_id=${worksId}&designer_tool=2${uid ? `&uid=${uid}` : ''
                            }&appid=${getAppId()}`;
                          window.open(url, '_blank');
                        }}
                      >
                        查看作品
                      </Button>
                    </div>
                    <div className='flex flex-wrap gap-2 text-xs text-muted-foreground'>
                      <span>设计师UID：{selectedSubmission.designer_uid}</span>
                      <span>
                        当前状态：
                        {
                          REVIEW_STATUS_LABEL[
                          selectedSubmission.review_status as ReviewStatus
                          ]
                        }
                      </span>
                      <span>
                        最近审核：
                        {selectedSubmission.reviewed_at
                          ? new Date(
                            selectedSubmission.reviewed_at
                          ).toLocaleString('zh-CN')
                          : '-'}
                      </span>
                      <span>
                        审核人UID：{selectedSubmission.reviewer_uid || '-'}
                      </span>
                    </div>
                    {selectedSubmission.review_note && (
                      <div className='text-xs border rounded p-2 bg-muted/30'>
                        <div className='font-medium mb-1'>最新审核备注</div>
                        <div className='text-muted-foreground whitespace-pre-wrap'>
                          {selectedSubmission.review_note}
                        </div>
                      </div>
                    )}
                    {Array.isArray(
                      (selectedSubmission as any).review_images
                    ) &&
                      (selectedSubmission as any).review_images.length >
                      0 && (
                        <div className='text-xs border rounded p-2 bg-muted/30'>
                          <div className='font-medium mb-2'>最新审核图片</div>
                          <div className='grid grid-cols-3 gap-2'>
                            {(
                              selectedSubmission as any
                            ).review_images.map((url: string, idx: number) => (
                              <img
                                key={idx}
                                src={cdnApi(url)}
                                alt={`审核图片 ${idx + 1}`}
                                className='w-full h-24 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity'
                                onClick={() => {
                                  // 可以添加预览功能
                                  window.open(cdnApi(url), '_blank');
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    {(selectedSubmission as any).designer_note && (
                      <div className='text-xs border rounded p-2 bg-primary/5 border-primary/20'>
                        <div className='font-medium mb-1 text-primary'>设计师提交备注</div>
                        <div className='text-muted-foreground whitespace-pre-wrap'>
                          {(selectedSubmission as any).designer_note}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tab 切换：审核历史和模版列表 */}
                  <div className='border-t pt-3'>
                    <Tabs
                      defaultValue={selectedSubmission?.review_status === 'approved' ? 'templates' : 'review'}
                      className='w-full'
                    >
                      <TabsList className={selectedSubmission?.review_status === 'approved' ? 'grid w-full grid-cols-2' : 'w-full'}>
                        {selectedSubmission?.review_status === 'approved' && (
                          <TabsTrigger value='templates'>模版列表</TabsTrigger>
                        )}
                        <TabsTrigger value='review'>审核历史</TabsTrigger>
                      </TabsList>
                      {selectedSubmission?.review_status === 'approved' && (
                        <TabsContent value='templates' className='mt-3 space-y-2'>
                          <div className='flex items-center justify-between'>
                            <div className='text-sm font-medium'>模版</div>
                            <div className='flex items-center gap-2'>
                              <Button
                                variant='outline'
                                size='sm'
                                className='h-6 px-2 text-xs'
                                onClick={async () => {
                                  if (!selectedSubmission?.works_id || !selectedSubmission?.works?.uid) {
                                    toast.error('作品信息不完整');
                                    return;
                                  }
                                  try {
                                    // 获取作品数据
                                    const worksData = await trpc.works.getWorksData.query({
                                      id: selectedSubmission.works_id,
                                      version: 'latest',
                                    });
                                    if (!worksData?.work_data) {
                                      toast.error('获取作品数据失败');
                                      return;
                                    }
                                    // 设置表单默认值（不自动设置封面，让用户选择是否使用作品封面）
                                    setCreateTemplateForm({
                                      title: selectedSubmission.works?.title || '未命名模版',
                                      desc: selectedSubmission.works?.desc || '',
                                      cover: undefined, // 不自动设置，让用户选择
                                    });
                                    setShowCreateTemplateDialog(true);
                                  } catch (e: any) {
                                    toast.error(e?.message || '获取作品数据失败');
                                  }
                                }}
                              >
                                <Plus className='h-3 w-3 mr-1' />
                                创建模版
                              </Button>
                              {templates.length > 0 && (
                                <Button
                                  variant='default'
                                  size='sm'
                                  className='h-6 px-2 text-xs'
                                  onClick={() => {
                                    if (!selectedSubmission?.works_id) {
                                      toast.error('请先选择作品');
                                      return;
                                    }
                                    setChannelsManagerOpen(true);
                                  }}
                                  disabled={!selectedSubmission?.works_id || loadingTemplates}
                                >
                                  频道上架
                                </Button>
                              )}
                              <Button
                                variant='outline'
                                size='sm'
                                className='h-6 px-2 text-xs'
                                onClick={() => refetchTemplates()}
                                disabled={loadingTemplates}
                              >
                                <RefreshCw className='h-3 w-3 mr-1' />
                                刷新
                              </Button>
                            </div>
                          </div>
                          {loadingTemplates ? (
                            <div className='flex items-center py-4 text-xs text-muted-foreground'>
                              <Loader2 className='h-4 w-4 animate-spin mr-2' />
                              加载中...
                            </div>
                          ) : templates.length === 0 ? (
                            <div className='text-xs text-muted-foreground'>
                              暂无模版
                            </div>
                          ) : (
                            <>
                              <div className='space-y-2'>
                                {templates.map(template => {
                                  const cover = (template.coverV3 as { url: string; width: number; height: number } | null)?.url
                                  const channels =
                                    (templateChannelsMap &&
                                      templateChannelsMap[template.id as string]) ||
                                    [];
                                  const maxVisibleChannels = 3;
                                  return (
                                    <div
                                      key={template.id}
                                      className='border rounded p-2 text-xs'
                                    >
                                      <div className='flex items-start gap-2'>
                                        {cover ? (
                                          <img
                                            src={cdnApi(cover, {
                                              resizeWidth: 200,
                                            })}
                                            alt={template.title}
                                            onClick={() => {
                                              window.open(cover, '_blank');
                                            }}
                                            className='w-12 h-12 object-cover object-top rounded border flex-shrink-0'
                                          />
                                        ) : <span className='w-12 h-12 object-cover object-top rounded border flex-shrink-0 text-muted-foreground'>无封面</span>}
                                        <div className='flex-1 min-w-0'>
                                          <div className='font-medium line-clamp-1'>
                                            {template.title}
                                          </div>
                                          <div className='mt-1 flex flex-wrap gap-1'>
                                            {loadingTemplateChannels && (
                                              <span className='text-[10px] text-muted-foreground'>
                                                频道加载中...
                                              </span>
                                            )}
                                            {!loadingTemplateChannels &&
                                              channels.length > 0 && (
                                                <>
                                                  {channels
                                                    .slice(0, maxVisibleChannels)
                                                    .map(channel => (
                                                      <div
                                                        key={channel.id}
                                                        className='inline-flex items-center gap-1'
                                                      >
                                                        <Badge
                                                          variant='secondary'
                                                          className='text-[10px]'
                                                        >
                                                          {channel.path ||
                                                            channel.display_name ||
                                                            channel.alias}
                                                        </Badge>
                                                        <Button
                                                          variant='ghost'
                                                          size='sm'
                                                          className='h-4 w-4 p-0 hover:bg-destructive/10 hover:text-destructive'
                                                          disabled={updateTemplateIdsMutation.isPending}
                                                          onClick={async (e) => {
                                                            e.stopPropagation();
                                                            if (!template.id) return;

                                                            const templateId = String(template.id);

                                                            // 确认下架
                                                            const confirmed = window.confirm(
                                                              `确定要从频道"${channel.path || channel.display_name || channel.alias}"中下架该模版吗？`
                                                            );
                                                            if (!confirmed) return;

                                                            try {
                                                              // 先获取频道的完整信息（包括 template_ids）
                                                              const channelFull = await trpc.adminChannel.findById.query({
                                                                id: channel.id,
                                                                include_children: false,
                                                              });

                                                              if (!channelFull) {
                                                                throw new Error(`频道 ${channel.id} 不存在`);
                                                              }

                                                              const currentTemplateIds = channelFull.template_ids || [];
                                                              const newTemplateIds = currentTemplateIds.filter(
                                                                (id: string) => id !== templateId
                                                              );

                                                              await updateTemplateIdsMutation.mutateAsync({
                                                                id: channel.id,
                                                                template_ids: newTemplateIds,
                                                              });

                                                              toast.success('下架成功');
                                                              // 刷新频道列表
                                                              await refetchTemplateChannels();
                                                            } catch (error: any) {
                                                              console.error('下架失败:', error);
                                                              toast.error(error.message || '下架失败');
                                                            }
                                                          }}
                                                          title='下架'
                                                        >
                                                          <X className='h-2.5 w-2.5' />
                                                        </Button>
                                                      </div>
                                                    ))}
                                                  {channels.length > maxVisibleChannels && (
                                                    <span className='text-[10px] text-muted-foreground'>
                                                      +{channels.length - maxVisibleChannels}
                                                    </span>
                                                  )}
                                                </>
                                              )}
                                            {!loadingTemplateChannels &&
                                              channels.length === 0 && (
                                                <span className='text-[10px] text-muted-foreground'>
                                                  未上架频道
                                                </span>
                                              )}
                                          </div>
                                          {template.desc && (
                                            <div className='text-[10px] text-muted-foreground line-clamp-1 mt-1'>
                                              {template.desc}
                                            </div>
                                          )}
                                          <div className='flex flex-wrap gap-2 text-[10px] text-muted-foreground mt-1'>
                                            <span>模版ID：{template.id}</span>
                                            {template.specInfo && (
                                              <span>规格：{template.specInfo.display_name || template.specInfo.name}</span>
                                            )}
                                            <span>
                                              创建时间：
                                              {template.create_time
                                                ? new Date(template.create_time).toLocaleString('zh-CN')
                                                : '-'}
                                            </span>
                                          </div>
                                        </div>
                                        <div className='flex gap-1 flex-shrink-0'>
                                          <Button
                                            variant='ghost'
                                            size='sm'
                                            className='h-6 px-2 text-xs'
                                            onClick={() => {
                                              const url = `/desktop/editor-designer?works_id=${template.id}&designer_tool=dev`;
                                              window.open(url, '_blank');
                                            }}
                                          >
                                            <Edit className='h-3 w-3 mr-1' />
                                            编辑
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                              {/* 模版列表分页 */}
                              <DataPagination
                                page={templatePage}
                                total={templatesTotal}
                                pageSize={templatePageSize}
                                onPageChange={setTemplatePage}
                                showInfo={true}
                                className='mt-2'
                              />
                            </>
                          )}
                        </TabsContent>
                      )}
                      <TabsContent value='review' className='mt-3 space-y-2'>
                        <div className='flex items-center justify-between'>
                          <div className='text-sm font-medium'>审核历史</div>
                          <div className='flex items-center gap-2'>
                            <Button
                              size='sm'
                              className='h-6 px-2 text-xs'
                              onClick={() => {
                                if (!selectedSubmission) return;
                                setReviewNote(selectedSubmission.review_note || '');
                                setReviewToStatus('changes_requested');
                                const submissionWithImages = selectedSubmission;
                                setReviewImages(
                                  Array.isArray(submissionWithImages.review_images)
                                    ? submissionWithImages.review_images as string[]
                                    : []
                                );
                                setReviewDialogOpen(true);
                              }}
                            >
                              审核
                            </Button>
                            <Button
                              variant='outline'
                              size='sm'
                              className='h-6 px-2 text-xs'
                              onClick={() => refetchLogs()}
                              disabled={loadingLogs}
                            >
                              <RefreshCw className='h-3 w-3 mr-1' />
                              刷新
                            </Button>
                          </div>
                        </div>
                        {loadingLogs ? (
                          <div className='flex items-center py-4 text-xs text-muted-foreground'>
                            <Loader2 className='h-4 w-4 animate-spin mr-2' />
                            加载中...
                          </div>
                        ) : reviewLogs.length === 0 ? (
                          <div className='text-xs text-muted-foreground'>
                            暂无审核历史
                          </div>
                        ) : (
                          <div className='space-y-2'>
                            {reviewLogs.map(log => (
                              <div
                                key={log.id}
                                className='border rounded p-2 text-xs'
                              >
                                <div className='flex items-start justify-between gap-2'>
                                  <div className='flex flex-wrap gap-2 text-muted-foreground'>
                                    <span>
                                      {log.create_time
                                        ? new Date(log.create_time).toLocaleString(
                                          'zh-CN'
                                        )
                                        : '-'}
                                    </span>
                                    <span>审核人UID：{log.reviewer_uid}</span>
                                    <span>
                                      状态：{log.from_review_status || '-'} →{' '}
                                      {log.to_review_status}
                                    </span>
                                  </div>
                                  {(() => {
                                    const createTimeMs = log.create_time
                                      ? new Date(log.create_time).getTime()
                                      : 0;
                                    const oneHourMs = 60 * 60 * 1000;
                                    const canDelete =
                                      !!createTimeMs &&
                                      Date.now() - createTimeMs <= oneHourMs;

                                    if (!canDelete) {
                                      return (
                                        <span className='text-[10px] text-muted-foreground'>
                                          已归档
                                        </span>
                                      );
                                    }

                                    return (
                                      <Button
                                        variant='ghost'
                                        size='sm'
                                        className='h-6 px-2 text-xs text-destructive hover:text-destructive'
                                        onClick={() => {
                                          const ok = window.confirm('确认删除该条审核历史？');
                                          if (!ok) return;
                                          deleteReviewLogMutation.mutate({
                                            id: log.id,
                                          });
                                        }}
                                        disabled={deleteReviewLogMutation.isPending}
                                      >
                                        <Trash2 className='h-3 w-3 mr-1' />
                                        删除
                                      </Button>
                                    );
                                  })()}
                                </div>
                                {log.review_note && (
                                  <div className='mt-1 whitespace-pre-wrap'>
                                    <div className='font-medium mb-1'>审核备注：</div>
                                    <div>{log.review_note}</div>
                                  </div>
                                )}
                                {Array.isArray((log as any).review_images) &&
                                  (log as any).review_images.length > 0 && (
                                    <div className='mt-2'>
                                      <div className='font-medium mb-1'>审核图片：</div>
                                      <div className='grid grid-cols-3 gap-2'>
                                        {(log as any).review_images.map(
                                          (url: string, idx: number) => (
                                            <img
                                              key={idx}
                                              src={cdnApi(url)}
                                              alt={`审核图片 ${idx + 1}`}
                                              className='w-full h-24 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity'
                                              onClick={() => {
                                                window.open(cdnApi(url), '_blank');
                                              }}
                                            />
                                          )
                                        )}
                                      </div>
                                    </div>
                                  )}
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 新建任务单 */}
      <ResponsiveDialog
        isDialog
        isOpen={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        title='新建主题任务单'
        contentProps={{ className: 'max-w-[680px]' }}
      >
        <div className='space-y-4 p-4 overflow-y-auto max-h-[80vh]'>
          <div className='space-y-2'>
            <Label>标题 *</Label>
            <Input
              value={createForm.title}
              onChange={e =>
                setCreateForm(prev => ({ ...prev, title: e.target.value }))
              }
              placeholder='请输入任务单标题'
            />
          </div>
          <div className='space-y-2'>
            <Label>描述</Label>
            <Textarea
              value={createForm.desc}
              onChange={e =>
                setCreateForm(prev => ({ ...prev, desc: e.target.value }))
              }
              placeholder='请输入描述（可选）'
              rows={4}
            />
          </div>

          <div className='space-y-2'>
            <Label>风格</Label>
            <Input
              value={createForm.style}
              onChange={e =>
                setCreateForm(prev => ({ ...prev, style: e.target.value }))
              }
              placeholder='请输入风格描述（可选）'
            />
          </div>

          <div className='space-y-2'>
            <Label>样稿图片</Label>
            <div className='grid grid-cols-4 gap-2'>
              {createForm.sample_images.map((url, index) => (
                <div key={index} className='relative group'>
                  <img
                    src={cdnApi(url)}
                    alt={`样稿 ${index + 1}`}
                    className='w-full h-24 object-cover rounded border'
                  />
                  <button
                    type='button'
                    onClick={() => {
                      setCreateForm(prev => ({
                        ...prev,
                        sample_images: prev.sample_images.filter((_, i) => i !== index),
                      }));
                    }}
                    className='absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity'
                  >
                    <X className='h-3 w-3' />
                  </button>
                </div>
              ))}
              <button
                type='button'
                onClick={() => {
                  showSelector({
                    type: 'picture',
                    onSelected: (params) => {
                      setCreateForm(prev => ({
                        ...prev,
                        sample_images: [...prev.sample_images, params.url],
                      }));
                    },
                  });
                }}
                className='w-full h-24 border-2 border-dashed rounded flex items-center justify-center hover:bg-muted/50 transition-colors'
              >
                <Plus className='h-6 w-6 text-muted-foreground' />
              </button>
            </div>
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-2'>
              <Label>素材分类</Label>
              <Select
                value={createForm.material_class_id || 'none'}
                onValueChange={v =>
                  setCreateForm(prev => ({
                    ...prev,
                    material_class_id: v === 'none' ? undefined : v,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='选择素材分类（可选）' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='none'>不关联</SelectItem>
                  {materialClasses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label>规格</Label>
              <Select
                value={createForm.spec_id || 'none'}
                onValueChange={v =>
                  setCreateForm(prev => ({
                    ...prev,
                    spec_id: v === 'none' ? undefined : v,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='选择规格（可选）' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='none'>不关联</SelectItem>
                  {specs.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.display_name || s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='space-y-2'>
            <Label>指派设计师（可多选）</Label>
            {loadingDesigners ? (
              <div className='text-xs text-muted-foreground'>加载设计师中...</div>
            ) : (
              <div className='border rounded-md p-3 max-h-[200px] overflow-y-auto space-y-2'>
                {designers.length === 0 ? (
                  <div className='text-xs text-muted-foreground text-center py-2'>
                    暂无设计师
                  </div>
                ) : (
                  designers.map(d => {
                    const isChecked = createForm.designer_uids.includes(d.uid);
                    return (
                      <div
                        key={d.id}
                        className='flex items-center space-x-2 cursor-pointer hover:bg-muted/50 p-2 rounded'
                        onClick={() => {
                          setCreateForm(prev => ({
                            ...prev,
                            designer_uids: isChecked
                              ? prev.designer_uids.filter(uid => uid !== d.uid)
                              : [...prev.designer_uids, d.uid],
                          }));
                        }}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={checked => {
                            setCreateForm(prev => ({
                              ...prev,
                              designer_uids: checked
                                ? [...prev.designer_uids, d.uid]
                                : prev.designer_uids.filter(uid => uid !== d.uid),
                            }));
                          }}
                        />
                        <Label className='cursor-pointer flex-1'>
                          {d.name}（{d.uid}）
                        </Label>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className='flex justify-end gap-2 pt-2'>
            <Button
              variant='outline'
              onClick={() => setShowCreateDialog(false)}
              disabled={createTaskMutation.isPending}
            >
              取消
            </Button>
            <Button onClick={handleCreate} disabled={createTaskMutation.isPending}>
              {createTaskMutation.isPending ? (
                <>
                  <Loader2 className='h-4 w-4 animate-spin mr-2' />
                  创建中...
                </>
              ) : (
                '创建'
              )}
            </Button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* 审核弹窗 */}
      <ResponsiveDialog
        isDialog
        isOpen={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        title='审核任务作品'
        contentProps={{ className: 'max-w-[680px]' }}
      >
        {selectedSubmission && (
          <div className='space-y-4 p-4 overflow-y-auto max-h-[80vh]'>
            <div className='space-y-1'>
              <div className='text-sm font-medium'>
                {selectedSubmission.works?.title || selectedSubmission.works_id}
              </div>
              <div className='text-xs text-muted-foreground'>
                作品ID：{selectedSubmission.works_id}，设计师UID：
                {selectedSubmission.designer_uid}
              </div>
            </div>
            <div className='space-y-2'>
              <Label>审核结果</Label>
              <RadioGroup
                value={reviewToStatus}
                onValueChange={v =>
                  setReviewToStatus(
                    v as 'approved' | 'changes_requested' | 'rejected'
                  )
                }
                className='flex gap-4'
              >
                <div className='flex items-center gap-2'>
                  <RadioGroupItem value='approved' id='approved' />
                  <Label htmlFor='approved'>通过</Label>
                </div>
                <div className='flex items-center gap-2'>
                  <RadioGroupItem value='changes_requested' id='changes_requested' />
                  <Label htmlFor='changes_requested'>需要修改</Label>
                </div>
                <div className='flex items-center gap-2'>
                  <RadioGroupItem value='rejected' id='rejected' />
                  <Label htmlFor='rejected'>拒绝</Label>
                </div>
              </RadioGroup>
            </div>
            <div className='space-y-2'>
              <Label>审核备注</Label>
              <Textarea
                value={reviewNote}
                onChange={e => setReviewNote(e.target.value)}
                placeholder='请输入审核备注（可选）'
                rows={5}
              />
            </div>
            <div className='space-y-2'>
              <Label>审核图片</Label>
              <div className='grid grid-cols-4 gap-2'>
                {reviewImages.map((url, index) => (
                  <div key={index} className='relative group'>
                    <img
                      src={cdnApi(url)}
                      alt={`审核图片 ${index + 1}`}
                      className='w-full h-24 object-cover rounded border'
                    />
                    <button
                      type='button'
                      onClick={() => {
                        setReviewImages(prev =>
                          prev.filter((_, i) => i !== index)
                        );
                      }}
                      className='absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity'
                    >
                      <X className='h-3 w-3' />
                    </button>
                  </div>
                ))}
                <button
                  type='button'
                  onClick={() => {
                    showSelector({
                      type: 'picture',
                      onSelected: (params) => {
                        setReviewImages(prev => [...prev, params.url]);
                      },
                    });
                  }}
                  className='w-full h-24 border-2 border-dashed rounded flex items-center justify-center hover:bg-muted/50 transition-colors'
                >
                  <Plus className='h-6 w-6 text-muted-foreground' />
                </button>
              </div>
            </div>
            <div className='flex justify-end gap-2 pt-2'>
              <Button
                variant='outline'
                onClick={() => setReviewDialogOpen(false)}
                disabled={reviewSubmissionMutation.isPending}
              >
                取消
              </Button>
              <Button onClick={handleReview} disabled={reviewSubmissionMutation.isPending}>
                {reviewSubmissionMutation.isPending ? (
                  <>
                    <Loader2 className='h-4 w-4 animate-spin mr-2' />
                    提交中...
                  </>
                ) : (
                  '提交审核'
                )}
              </Button>
            </div>
          </div>
        )}
      </ResponsiveDialog>

      {/* 设置弹窗 */}
      <ResponsiveDialog
        isDialog
        isOpen={showSettingsDialog}
        onOpenChange={setShowSettingsDialog}
        title='设置主题任务单'
        contentProps={{ className: 'max-w-[680px]' }}
      >
        <div className='space-y-4 p-4 overflow-y-auto max-h-[80vh]'>
          <div className='space-y-2'>
            <Label>标题 *</Label>
            <Input
              value={settingsForm.title}
              onChange={e =>
                setSettingsForm(prev => ({ ...prev, title: e.target.value }))
              }
              placeholder='请输入任务单标题'
            />
          </div>
          <div className='space-y-2'>
            <Label>描述</Label>
            <Textarea
              value={settingsForm.desc}
              onChange={e =>
                setSettingsForm(prev => ({ ...prev, desc: e.target.value }))
              }
              placeholder='请输入描述（可选）'
              rows={4}
            />
          </div>

          <div className='space-y-2'>
            <Label>风格</Label>
            <Input
              value={settingsForm.style}
              onChange={e =>
                setSettingsForm(prev => ({ ...prev, style: e.target.value }))
              }
              placeholder='请输入风格描述（可选）'
            />
          </div>

          <div className='space-y-2'>
            <Label>样稿图片</Label>
            <div className='grid grid-cols-4 gap-2'>
              {settingsForm.sample_images.map((url, index) => (
                <div key={index} className='relative group'>
                  <img
                    src={cdnApi(url)}
                    alt={`样稿 ${index + 1}`}
                    className='w-full h-24 object-cover rounded border'
                  />
                  <button
                    type='button'
                    onClick={() => {
                      setSettingsForm(prev => ({
                        ...prev,
                        sample_images: prev.sample_images.filter((_, i) => i !== index),
                      }));
                    }}
                    className='absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity'
                  >
                    <X className='h-3 w-3' />
                  </button>
                </div>
              ))}
              <button
                type='button'
                onClick={() => {
                  showSelector({
                    type: 'picture',
                    onSelected: (params) => {
                      setSettingsForm(prev => ({
                        ...prev,
                        sample_images: [...prev.sample_images, params.url],
                      }));
                    },
                  });
                }}
                className='w-full h-24 border-2 border-dashed rounded flex items-center justify-center hover:bg-muted/50 transition-colors'
              >
                <Plus className='h-6 w-6 text-muted-foreground' />
              </button>
            </div>
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-2'>
              <Label>素材分类</Label>
              <Select
                value={settingsForm.material_class_id || 'none'}
                onValueChange={v =>
                  setSettingsForm(prev => ({
                    ...prev,
                    material_class_id: v === 'none' ? undefined : v,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='选择素材分类（可选）' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='none'>不关联</SelectItem>
                  {materialClasses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label>规格</Label>
              <Select
                value={settingsForm.spec_id || 'none'}
                onValueChange={v =>
                  setSettingsForm(prev => ({
                    ...prev,
                    spec_id: v === 'none' ? undefined : v,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='选择规格（可选）' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='none'>不关联</SelectItem>
                  {specs.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.display_name || s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='space-y-2'>
            <Label>指派设计师（可多选）</Label>
            {loadingDesigners ? (
              <div className='text-xs text-muted-foreground'>加载设计师中...</div>
            ) : (
              <div className='border rounded-md p-3 max-h-[200px] overflow-y-auto space-y-2'>
                {designers.length === 0 ? (
                  <div className='text-xs text-muted-foreground text-center py-2'>
                    暂无设计师
                  </div>
                ) : (
                  designers.map(d => {
                    const isChecked = settingsForm.designer_uids.includes(d.uid);
                    return (
                      <div
                        key={d.id}
                        className='flex items-center space-x-2 cursor-pointer hover:bg-muted/50 p-2 rounded'
                        onClick={() => {
                          setSettingsForm(prev => ({
                            ...prev,
                            designer_uids: isChecked
                              ? prev.designer_uids.filter(uid => uid !== d.uid)
                              : [...prev.designer_uids, d.uid],
                          }));
                        }}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={checked => {
                            setSettingsForm(prev => ({
                              ...prev,
                              designer_uids: checked
                                ? [...prev.designer_uids, d.uid]
                                : prev.designer_uids.filter(uid => uid !== d.uid),
                            }));
                          }}
                        />
                        <Label className='cursor-pointer flex-1'>
                          {d.name}（{d.uid}）
                        </Label>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className='space-y-2'>
            <Label>状态</Label>
            <Select
              value={settingsForm.status}
              onValueChange={v =>
                setSettingsForm(prev => ({
                  ...prev,
                  status: v as TaskStatus,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='pending_review'>待审核</SelectItem>
                <SelectItem value='in_progress'>进行中</SelectItem>
                <SelectItem value='completed'>已完成</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2'>
            <Label>截止时间</Label>
            <Input
              type='datetime-local'
              value={settingsForm.due_at || ''}
              onChange={e =>
                setSettingsForm(prev => ({
                  ...prev,
                  due_at: e.target.value || undefined,
                }))
              }
              placeholder='选择截止时间（可选）'
            />
          </div>

          <div className='flex justify-end gap-2 pt-2'>
            <Button
              variant='outline'
              onClick={() => setShowSettingsDialog(false)}
              disabled={updateTaskMutation.isPending}
            >
              取消
            </Button>
            <Button onClick={handleUpdate} disabled={updateTaskMutation.isPending}>
              {updateTaskMutation.isPending ? (
                <>
                  <Loader2 className='h-4 w-4 animate-spin mr-2' />
                  更新中...
                </>
              ) : (
                '保存'
              )}
            </Button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* 创建模版弹窗 */}
      <ResponsiveDialog
        isDialog
        isOpen={showCreateTemplateDialog}
        onOpenChange={setShowCreateTemplateDialog}
        title='创建模版'
        contentProps={{ className: 'max-w-[680px]' }}
      >
        {selectedSubmission && (
          <div className='space-y-4 p-4 overflow-y-auto max-h-[80vh]'>
            <div className='space-y-1'>
              <div className='text-sm font-medium'>
                从作品创建模版：{selectedSubmission.works?.title || selectedSubmission.works_id}
              </div>
              <div className='text-xs text-muted-foreground'>
                作品ID：{selectedSubmission.works_id}，设计师UID：
                {selectedSubmission.designer_uid}
              </div>
            </div>
            <div className='space-y-2'>
              <Label>模版标题 *</Label>
              <Input
                value={createTemplateForm.title}
                onChange={e =>
                  setCreateTemplateForm(prev => ({ ...prev, title: e.target.value }))
                }
                placeholder='请输入模版标题'
              />
            </div>
            <div className='space-y-2'>
              <Label>模版描述</Label>
              <Textarea
                value={createTemplateForm.desc}
                onChange={e =>
                  setCreateTemplateForm(prev => ({ ...prev, desc: e.target.value }))
                }
                placeholder='请输入模版描述（可选）'
                rows={4}
              />
            </div>
            <div className='flex justify-end gap-2 pt-2'>
              <Button
                variant='outline'
                onClick={() => setShowCreateTemplateDialog(false)}
                disabled={createTemplateMutation.isPending}
              >
                取消
              </Button>
              <Button
                onClick={async () => {
                  if (!createTemplateForm.title.trim()) {
                    toast.error('请输入模版标题');
                    return;
                  }
                  if (!selectedSubmission?.works_id || !selectedSubmission?.works?.uid) {
                    toast.error('作品信息不完整');
                    return;
                  }
                  try {
                    // 获取作品数据
                    const worksData = await trpc.works.getWorksData.query({
                      id: selectedSubmission.works_id,
                    });
                    if (!worksData?.work_data) {
                      toast.error('获取作品数据失败');
                      return;
                    }
                    const themePackV3 = worksData.work_data.gridProps.themePackV3;
                    if (!themePackV3) {
                      toast.error('作品未绑定主题包，无法创建模版');
                      return
                    }
                    const originalGridProps = worksData.work_data.gridProps;
                    const commonWorksData = {
                      gridProps: {
                        gridsData: originalGridProps.gridsData,
                        version: originalGridProps.version,
                        style: originalGridProps.style,
                        themePackV3RefId: {
                          documentId: themePackV3?.documentId || '',
                          worksId: selectedSubmission.works_id,
                        },
                        worksCate: 'template'
                      },
                      isGridMode: true,
                      layersMap: worksData.work_data.layersMap,
                      music: worksData.work_data.music,
                    }
                    // 封面可选，如果提供了封面则使用，否则留空由异步任务生成
                    const finalCover =
                      selectedSubmission.works?.cover || createTemplateForm.cover;
                    // 如果提供了封面，尝试获取封面尺寸用于 coverV3
                    let coverV3: { url: string; width: number; height: number } | undefined;
                    if (finalCover) {
                      try {
                        const imgInfo = await getImgInfo2(finalCover);
                        if (imgInfo && imgInfo.baseWidth > 0 && imgInfo.baseHeight > 0) {
                          coverV3 = {
                            url: finalCover,
                            width: imgInfo.baseWidth,
                            height: imgInfo.baseHeight,
                          };
                        }
                      } catch (error) {
                        console.error('获取封面尺寸失败:', error);
                        // 封面尺寸获取失败不影响创建，封面将由异步任务生成
                      }
                    }
                    // 创建模版（封面和 coverV3 都是可选的）
                    createTemplateMutation.mutate({
                      title: createTemplateForm.title.trim(),
                      desc: createTemplateForm.desc || undefined,
                      cover: finalCover || undefined,
                      coverV3,
                      designer_uid: selectedSubmission.designer_uid,
                      spec_id: selectedSubmission.works?.spec_id || undefined,
                      designer_works_id: selectedSubmission.works_id,
                      content: commonWorksData,
                    });
                  } catch (e: any) {
                    toast.error(e?.message || '获取作品数据失败');
                  }
                }}
                disabled={createTemplateMutation.isPending}
              >
                {createTemplateMutation.isPending ? (
                  <>
                    <Loader2 className='h-4 w-4 animate-spin mr-2' />
                    创建中...
                  </>
                ) : (
                  '创建模版'
                )}
              </Button>
            </div>
          </div>
        )}
      </ResponsiveDialog>

      {/* 频道上架（复用频道管理 + 限定模板池） */}
      <ResponsiveDialog
        isDialog
        isOpen={channelsManagerOpen}
        onOpenChange={setChannelsManagerOpen}
        title='频道上架'
        contentProps={{
          className: 'w-[90vw] max-h-[85vh] flex flex-col overflow-hidden max-w-[100vw]',
        }}
      >
        <div className='flex-1 min-h-0 p-4'>
          <ChannelsManager
            className='h-[75vh]'
            title='频道管理（用于上架）'
            templatePoolTemplateIds={templatePoolTemplateIds}
            defaultFilterEnv='production'
            defaultFilterLocale='zh-CN'
          />
        </div>
      </ResponsiveDialog>

    </div>
  );
}

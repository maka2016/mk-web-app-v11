'use client';

import { TemplateListManager } from '@/app/dashboard/manager/templates/TemplateListManager';
import { DataPagination } from '@/components/DataPagination';
import { getImgInfo2 } from '@/components/GridEditorV3/utils/utils1';
import { showSelector } from '@/components/showSelector';
import { defaultWorksData } from '@/config/defaultWorksData';
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
import { Loader2, Plus, RefreshCw, Settings, Trash2, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
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

  // 获取该任务作品项创建的模板列表（获取所有ID用于约束查询范围）
  const { data: templatesData, isLoading: loadingTemplates, refetch: refetchTemplates } = trpcReact.themeTask.listTemplatesByWorksId.useQuery(
    {
      works_id: selectedSubmission?.works_id || '',
      skip: 0,
      take: 1000, // 获取所有模版ID，TemplateListManager会自行分页
    },
    {
      enabled: !!selectedSubmission?.works_id,
      // 当 selectedSubmission 变化时，确保重新查询而不是使用缓存
      staleTime: 0,
    }
  );
  // 获取所有模版IDs用于约束 TemplateListManager 的查询范围
  const constraintTemplateIds = useMemo(() => {
    if (!selectedSubmission?.works_id || !templatesData) {
      return [];
    }
    return (templatesData.data || []).map((t: any) => String(t.id)).filter(Boolean);
  }, [templatesData, selectedSubmission?.works_id]);
  // 兼容现有代码：templatePoolTemplateIds 用于频道上架
  const templatePoolTemplateIds = constraintTemplateIds;
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
        inheritFromWorks: false,
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
    /** 是否继承作品数据，false=空白创建（使用 defaultWorksData） */
    inheritFromWorks: boolean;
  }>({
    title: '',
    desc: '',
    cover: undefined,
    inheritFromWorks: false, // 默认空白创建
  });

  // 注：频道查询和模版操作（复制、下架）已移至 TemplateListManager 组件内部
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

  // 注：templatePage 状态已移至 TemplateListManager 内部，组件会在 constraintTemplateIds 变化时自动重置

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
        <div className='col-span-2 flex flex-col h-full overflow-hidden'>
          <Card className='flex flex-col border shadow-none h-full'>
            <CardHeader className='px-2 py-1.5 border-b flex-shrink-0'>
              <div className='flex items-center justify-between gap-1'>
                <CardTitle className='text-xs font-medium'>任务单</CardTitle>
                <div className='flex items-center gap-1'>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-5 w-5'
                    onClick={() => refetchTasks()}
                    disabled={loadingTasks}
                    title='刷新'
                  >
                    <RefreshCw className='h-3 w-3' />
                  </Button>
                  <Button
                    size='icon'
                    className='h-5 w-5'
                    onClick={() => setShowCreateDialog(true)}
                    title='新建'
                  >
                    <Plus className='h-3 w-3' />
                  </Button>
                </div>
              </div>
              <div className='pt-1.5 flex flex-wrap gap-1'>
                {(['pending_review', 'in_progress', 'completed', 'all'] as const).map(status => (
                  <button
                    key={status}
                    type='button'
                    onClick={() => setTaskStatus(status)}
                    className={`px-1.5 py-0.5 text-xs rounded transition-colors ${taskStatus === status
                      ? 'bg-primary text-primary-btn'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                  >
                    {status === 'pending_review' ? '待审' : status === 'in_progress' ? '进行' : status === 'completed' ? '完成' : '全部'}
                  </button>
                ))}
              </div>
              <div className='pt-1.5'>
                <Input
                  placeholder='搜索标题...'
                  value={taskKeyword}
                  onChange={e => setTaskKeyword(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      setSearchKeyword(taskKeyword);
                    }
                  }}
                  className='h-6 text-xs'
                />
              </div>
            </CardHeader>
            <CardContent className='flex-1 overflow-y-auto p-1.5 space-y-1'>
              {loadingTasks && tasks.length === 0 ? (
                <div className='flex items-center justify-center py-6'>
                  <Loader2 className='h-3 w-3 animate-spin' />
                  <span className='ml-1 text-xs'>加载中...</span>
                </div>
              ) : tasks.length === 0 ? (
                <div className='text-center py-6 text-xs text-muted-foreground'>
                  暂无任务单
                </div>
              ) : (
                tasks.map(t => {
                  const isActive = t.id === selectedTask?.id;
                  return (
                    <div
                      key={t.id}
                      className={`w-full p-1.5 rounded border transition-colors relative ${isActive
                        ? 'border-primary/50 bg-primary/10'
                        : 'border-transparent hover:bg-muted/50'
                        }`}
                    >
                      <button
                        type='button'
                        className='w-full text-left pr-5'
                        onClick={() => handleSelectTask(t)}
                      >
                        <div className='text-xs font-medium truncate'>
                          {t.title}
                        </div>
                        <div className='text-xs text-muted-foreground flex flex-wrap gap-x-1.5 gap-y-0.5 mt-0.5'>
                          <span>{TASK_STATUS_LABEL[t.status as TaskStatus]}</span>
                          <span>·</span>
                          <span>{(t as any)._count?.submissions ?? 0}提交</span>
                          {(t as any).specInfo?.display_name && (
                            <>
                              <span>·</span>
                              <span>{(t as any).specInfo.display_name}</span>
                            </>
                          )}
                        </div>
                      </button>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-4 w-4 absolute right-1 top-1'
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
                        title='设置'
                      >
                        <Settings className='h-2.5 w-2.5' />
                      </Button>
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
        <div className='col-span-5 flex flex-col h-full overflow-hidden'>
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
                    <TableRow className='h-6'>
                      <TableHead className='h-6 px-1 text-xs font-medium w-12'>
                        封面
                      </TableHead>
                      <TableHead className='h-6 px-1 text-xs font-medium min-w-[120px]'>
                        作品
                      </TableHead>
                      <TableHead className='h-6 px-1 text-xs font-medium w-16'>
                        设计师
                      </TableHead>
                      <TableHead className='h-6 px-1 text-xs font-medium w-12 text-center'>
                        状态
                      </TableHead>
                      <TableHead className='h-6 px-1 text-xs font-medium w-10 text-center'>
                        模版
                      </TableHead>
                      <TableHead className='h-6 px-1 text-xs font-medium w-20'>
                        时间
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
                          className={`cursor-pointer ${isActive ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
                          onClick={() => handleSelectSubmission(s)}
                        >
                          <TableCell className='px-1 py-0.5 w-12'>
                            <div className='relative h-10 w-10 overflow-hidden rounded border bg-muted'>
                              {s.works?.cover ? (
                                <img
                                  src={cdnApi(s.works.cover, {
                                    resizeWidth: 200,
                                  })}
                                  alt={s.works?.title || '作品封面'}
                                  className='h-full w-full object-cover object-top'
                                />
                              ) : (
                                <div className='flex h-full items-center justify-center text-[8px] text-muted-foreground'>
                                  无
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className='px-1 py-0.5 text-xs min-w-[100px]'>
                            <div className='font-medium break-words'>
                              {s.works?.title || s.works_id}
                            </div>
                          </TableCell>
                          <TableCell className='px-1 py-0.5 text-xs w-16'>
                            {(() => {
                              const designer = designers.find(
                                d => d.uid === s.designer_uid
                              );
                              if (designer) {
                                return <span className='break-words'>{designer.name}</span>;
                              }
                              return <span className='break-words'>{s.designer_uid}</span>;
                            })()}
                          </TableCell>
                          <TableCell className='px-1 py-0.5 w-16 text-center'>
                            <Badge variant={REVIEW_STATUS_BADGE[status]} className='text-xs px-1 py-0'>
                              {REVIEW_STATUS_LABEL[status]}
                            </Badge>
                          </TableCell>
                          <TableCell className='px-1 py-0.5 text-xs w-10 text-center'>
                            {templateCountMap.get(s.works_id) ?? '-'}
                          </TableCell>
                          <TableCell className='px-1 py-0.5 text-xs text-muted-foreground w-20'>
                            {s.submit_time
                              ? new Date(s.submit_time).toLocaleDateString('zh-CN')
                              : '-'}
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
        <div className='col-span-5 flex flex-col h-full overflow-hidden'>
          <Card className='flex flex-col border shadow-none h-full'>
            <CardContent className='flex-1 overflow-auto p-3 pb-0 space-y-3'>
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
                      {(selectedSubmission.review_status as ReviewStatus) === 'pending' && (
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-6 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10'
                          onClick={() => {
                            const ok = window.confirm('确认删除该条提交记录？');
                            if (!ok) return;
                            deleteSubmissionMutation.mutate({
                              id: selectedSubmission.id,
                            });
                          }}
                          disabled={deleteSubmissionMutation.isPending}
                        >
                          删除提交
                        </Button>
                      )}
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
                          {/* 创建模版按钮（主题任务特有功能） */}
                          <div className='flex items-center justify-end gap-2 mb-2'>
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
                                  if (!worksData.work_data.gridProps?.themePackV3) {
                                    toast.error('作品未绑定主题包，无法创建模版');
                                    return;
                                  }
                                  // 设置表单默认值（不自动设置封面，让用户选择是否使用作品封面）
                                  setCreateTemplateForm({
                                    title: selectedSubmission.works?.title || '未命名模版',
                                    desc: selectedSubmission.works?.desc || '',
                                    cover: undefined, // 不自动设置，让用户选择
                                    inheritFromWorks: false,
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
                          {/* 模版列表（使用 TemplateListManager 组件） */}
                          {loadingTemplates ? (
                            <div className='flex items-center py-4 text-xs text-muted-foreground'>
                              <Loader2 className='h-4 w-4 animate-spin mr-2' />
                              加载中...
                            </div>
                          ) : constraintTemplateIds.length === 0 ? (
                            <div className='text-xs text-muted-foreground'>
                              暂无模版
                            </div>
                          ) : (
                            <TemplateListManager
                              constraintTemplateIds={constraintTemplateIds}
                              hideTitle
                              hideFloatingTaskList
                              compact
                              onDataChange={() => {
                                refetchTemplates();
                                if (selectedSubmission?.works_id) {
                                  fetchTemplateCounts([selectedSubmission.works_id]);
                                }
                              }}
                            />
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
                                        <span className='text-xs text-muted-foreground'>
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
            <div className='space-y-2'>
              <Label>创建方式</Label>
              <RadioGroup
                value={createTemplateForm.inheritFromWorks ? 'inherit' : 'blank'}
                onValueChange={value =>
                  setCreateTemplateForm(prev => ({
                    ...prev,
                    inheritFromWorks: value === 'inherit',
                  }))
                }
                className='flex flex-col gap-3'
              >
                <div className='flex items-start space-x-2'>
                  <RadioGroupItem value='blank' id='create-blank' />
                  <div className='grid gap-1 leading-none'>
                    <label
                      htmlFor='create-blank'
                      className='text-sm font-medium cursor-pointer'
                    >
                      空白创建
                    </label>
                    <p className='text-sm text-muted-foreground'>
                      使用默认空白结构作为模版内容
                    </p>
                  </div>
                </div>
                <div className='flex items-start space-x-2'>
                  <RadioGroupItem value='inherit' id='create-inherit' />
                  <div className='grid gap-1 leading-none'>
                    <label
                      htmlFor='create-inherit'
                      className='text-sm font-medium cursor-pointer'
                    >
                      继承作品数据
                    </label>
                    <p className='text-sm text-muted-foreground'>
                      使用该作品的布局、图层等作为模版内容
                    </p>
                  </div>
                </div>
              </RadioGroup>
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
                  if (!selectedSubmission?.designer_uid || !selectedSubmission?.works_id) {
                    toast.error('作品信息不完整');
                    return;
                  }
                  try {
                    // 两种创建方式都需要 themePackV3RefId，先获取作品数据
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
                      return;
                    }
                    const themePackV3RefId = {
                      documentId: themePackV3.documentId || '',
                    };

                    let commonWorksData: Record<string, unknown>;

                    if (createTemplateForm.inheritFromWorks) {
                      // 继承作品数据：使用作品的布局、图层等
                      const originalGridProps = worksData.work_data.gridProps;
                      commonWorksData = {
                        gridProps: {
                          gridsData: originalGridProps.gridsData,
                          version: originalGridProps.version,
                          style: originalGridProps.style,
                          themePackV3RefId,
                          worksCate: 'template',
                        },
                        isGridMode: true,
                        layersMap: worksData.work_data.layersMap,
                        music: worksData.work_data.music,
                      };
                    } else {
                      // 空白创建：使用 defaultWorksData，关联 themePackV3RefId
                      commonWorksData = {
                        ...defaultWorksData,
                        gridProps: {
                          ...defaultWorksData.gridProps,
                          themePackV3RefId,
                          worksCate: 'template',
                        },
                      };
                    }

                    // 封面可选，如果提供了封面则使用，否则留空由异步任务生成
                    const finalCover =
                      selectedSubmission?.works?.cover || createTemplateForm.cover;
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
                      }
                    }

                    createTemplateMutation.mutate({
                      title: createTemplateForm.title.trim(),
                      desc: createTemplateForm.desc || undefined,
                      cover: finalCover || undefined,
                      coverV3,
                      designer_uid: selectedSubmission.designer_uid,
                      spec_id: selectedSubmission?.works?.spec_id || undefined,
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

'use client';

import CoverManager from '@/components/GridEditorV3/componentsForEditor/CoverManager';
import {
  cdnApi,
  getAppId,
  getDesignerInfoForClient,
  getUid,
  type DesignerConfig,
} from '@/services';
import { useStore } from '@/store';
import { trpc, trpcReact, type SerializedWorksEntity } from '@/utils/trpc';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card';
import { Checkbox } from '@workspace/ui/components/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@workspace/ui/components/pagination';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog';
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
import { Textarea } from '@workspace/ui/components/textarea';
import cls from 'classnames';
import dayjs from 'dayjs';
import {
  CheckCircle2,
  Copy,
  Edit2,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  Loader2,
  MoreHorizontal,
  Search,
  Trash2,
} from 'lucide-react';
import { observer } from 'mobx-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface WorksListForDesignerProps {
  currentWorksId?: string;
  onSelectWork?: (work: SerializedWorksEntity) => void;
  enableThemeTaskSubmit?: boolean; // 是否显示“提交到主题任务单”
}

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

// 主题任务单相关类型
type ThemeTaskForDesigner = Awaited<
  ReturnType<typeof trpc.themeTask.listOpenTasksForDesigner.query>
>[0];

type WorksSubmissionStatus = Awaited<
  ReturnType<typeof trpc.themeTask.getSubmissionStatusesForWorks.query>
>[string];

const WorksListForDesigner = ({
  currentWorksId,
  onSelectWork,
}: WorksListForDesignerProps = {}) => {
  const { setLoginShow } = useStore();
  const [uid, setUid] = useState<string>('');
  const [isDesigner, setIsDesigner] = useState<boolean | null>(null);
  const [designerName, setDesignerName] = useState<string>('');

  const [worksList, setWorksList] = useState<SerializedWorksEntity[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [searchValue, setSearchValue] = useState('');

  // 主题任务单提交相关（设计师入口）
  const [themeTasks, setThemeTasks] = useState<ThemeTaskForDesigner[]>([]);
  const [selectedThemeTaskId, setSelectedThemeTaskId] = useState<string>('');
  const [loadingThemeTasks, setLoadingThemeTasks] = useState(false);
  const [loadingThemeStatuses, setLoadingThemeStatuses] = useState(false);
  const [themeStatusMap, setThemeStatusMap] = useState<
    Record<string, WorksSubmissionStatus>
  >({});
  const [submittingWorkId, setSubmittingWorkId] = useState<string>('');
  const [showTaskSelectDialog, setShowTaskSelectDialog] = useState(false);
  const [workToSubmit, setWorkToSubmit] = useState<SerializedWorksEntity | null>(
    null
  );

  // 任务单详情查看
  const [taskDetailDialogOpen, setTaskDetailDialogOpen] = useState(false);
  const [taskIdForDetail, setTaskIdForDetail] = useState<string>('');

  // 审核意见查看相关
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewNote, setReviewNote] = useState<string>('');
  const [reviewWorkTitle, setReviewWorkTitle] = useState<string>('');
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [submissionId, setSubmissionId] = useState<string>('');

  // 提交审核备注相关
  const [submitReviewDialogOpen, setSubmitReviewDialogOpen] = useState(false);
  const [submitReviewRemark, setSubmitReviewRemark] = useState('');
  const [workToSubmitReview, setWorkToSubmitReview] =
    useState<SerializedWorksEntity | null>(null);

  // 提交确认弹窗相关
  const [showSubmitConfirmDialog, setShowSubmitConfirmDialog] = useState(false);
  const [workToSubmitConfirm, setWorkToSubmitConfirm] =
    useState<SerializedWorksEntity | null>(null);
  const [taskToSubmitConfirm, setTaskToSubmitConfirm] =
    useState<ThemeTaskForDesigner | null>(null);

  const [selectedWorks, setSelectedWorks] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workToDelete, setWorkToDelete] =
    useState<SerializedWorksEntity | null>(null);
  const [editingWork, setEditingWork] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // 封面管理相关
  const [coverDialogOpen, setCoverDialogOpen] = useState(false);
  const [workToEditCover, setWorkToEditCover] =
    useState<SerializedWorksEntity | null>(null);

  // 创建主题/模版相关
  const [showSpec, setShowSpec] = useState(false);
  const [defaultWorksName, setDefaultWorksName] = useState('设计师作品');

  // 规格相关
  type SpecItem = Awaited<
    ReturnType<typeof trpc.worksSpec.findManyWithCount.query>
  >['list'][0];
  const [specList, setSpecList] = useState<SpecItem[]>([]);
  const [worksName, setWorksName] = useState(defaultWorksName);
  const [selectedSpec, setSelectedSpec] = useState<SpecItem | null>(null);

  // tRPC utils for manual queries
  const utils = trpcReact.useUtils();

  // tRPC mutations
  const deleteWorkMutation = trpcReact.works.delete.useMutation();
  const duplicateWorkMutation = trpcReact.works.duplicate.useMutation();
  const updateWorkMutation = trpcReact.works.update.useMutation();
  const createWorkMutation = trpcReact.works.create.useMutation();
  const submitWorkToTaskMutation = trpcReact.themeTask.submitWorkToTask.useMutation();

  const { data: taskDetail, isLoading: loadingTaskDetail } =
    trpcReact.themeTask.getTaskById.useQuery(
      { id: taskIdForDetail },
      { enabled: taskDetailDialogOpen && !!taskIdForDetail }
    );

  // 获取审核历史记录
  const { data: reviewLogs, isLoading: loadingReviewLogs } =
    trpcReact.themeTask.listReviewLogs.useQuery(
      { submission_id: submissionId },
      { enabled: reviewDialogOpen && !!submissionId }
    );

  // 加载作品列表
  const loadWorks = async (pageNum = page, search = keyword) => {
    const currentUid = getUid();
    if (!currentUid) {
      return;
    }

    setLoading(true);
    try {
      // 使用 tRPC API 查询作品列表
      const [works, count] = (await Promise.all([
        utils.works.findMany.fetch({
          deleted: false,
          is_folder: false,
          keyword: search || undefined,
          skip: (pageNum - 1) * pageSize,
          take: pageSize,
        }),
        utils.works.count.fetch({
          deleted: false,
          is_folder: false,
          keyword: search || undefined,
        }),
      ])) as any as [SerializedWorksEntity[], number];

      setWorksList(works);
      setTotal(count);
    } catch (error) {
      toast.error('加载作品列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 验证设计师身份
  useEffect(() => {
    const currentUid = getUid();
    setUid(currentUid);

    if (!currentUid) {
      setLoginShow(true);
      return;
    }

    // 验证设计师身份
    getDesignerInfoForClient({
      uid: currentUid,
      appid: getAppId(),
    })
      .then((res: DesignerConfig) => {
        setIsDesigner(res.isDesigner);
        setDesignerName(res.fullName);
        if (!res.isDesigner) {
          toast.error('你还不是设计师，请联系管理员');
        }
      })
      .catch(() => {
        toast.error('需要登陆才能使用设计师功能');
        setIsDesigner(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 加载设计师可用的任务单列表
  const loadThemeTasks = async (designerUid: number) => {
    if (!designerUid || designerUid <= 0) {
      console.warn('无效的设计师 UID:', designerUid);
      return;
    }
    setLoadingThemeTasks(true);
    try {
      const list = await utils.themeTask.listOpenTasksForDesigner.fetch({
        designer_uid: designerUid,
      });
      // 确保返回的是数组
      const taskList = Array.isArray(list) ? list : [];
      setThemeTasks(taskList);
      setSelectedThemeTaskId(prev => {
        if (prev && taskList.some(t => t.id === prev)) return prev;
        return taskList[0]?.id || '';
      });
    } catch (e) {
      console.error('加载任务单列表失败:', e);
      toast.error('加载任务单列表失败');
      setThemeTasks([]);
      setSelectedThemeTaskId('');
    } finally {
      setLoadingThemeTasks(false);
    }
  };

  // 加载当前页作品在所选任务单下的审核状态
  const loadThemeStatusesForCurrentPage = async (
    themeTaskId: string,
    currentWorks: SerializedWorksEntity[]
  ) => {
    if (!themeTaskId) {
      setThemeStatusMap({});
      return;
    }
    if (!currentWorks.length) {
      setThemeStatusMap({});
      return;
    }
    setLoadingThemeStatuses(true);
    try {
      const map = await utils.themeTask.getSubmissionStatusesForWorks.fetch({
        theme_task_id: themeTaskId,
        works_ids: currentWorks.map(w => w.id),
      });
      setThemeStatusMap(map || {});
    } catch (e) {
      console.error(e);
      // 更新时保留旧数据，避免闪烁
    } finally {
      setLoadingThemeStatuses(false);
    }
  };

  // 加载作品列表
  useEffect(() => {
    if (isDesigner && uid) {
      loadWorks();
      const uidNum = Number(uid);
      if (uidNum > 0) {
        loadThemeTasks(uidNum);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, isDesigner, uid]);

  // 当任务单或作品列表变化时，刷新状态映射
  useEffect(() => {
    if (!selectedThemeTaskId) {
      setThemeStatusMap({});
      return;
    }
    loadThemeStatusesForCurrentPage(selectedThemeTaskId, worksList);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedThemeTaskId, worksList]);

  // 当对话框打开时，如果任务单列表为空，重新加载
  useEffect(() => {
    if (showTaskSelectDialog && themeTasks.length === 0 && !loadingThemeTasks && uid) {
      const uidNum = Number(uid);
      if (uidNum > 0) {
        loadThemeTasks(uidNum);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTaskSelectDialog]);

  // 当选择任务单对话框打开时，重新加载任务单列表
  useEffect(() => {
    if (showTaskSelectDialog && uid) {
      loadThemeTasks(Number(uid));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTaskSelectDialog]);

  // 加载规格列表
  useEffect(() => {
    if (showSpec) {
      utils.worksSpec.findManyWithCount.fetch({ deleted: false }).then(res => {
        setSpecList(res.list);
      });
    }
  }, [showSpec, utils]);

  // 搜索
  const handleSearch = () => {
    setKeyword(searchValue);
    setPage(1);
    loadWorks(1, searchValue);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedWorks.size === worksList.length) {
      setSelectedWorks(new Set());
    } else {
      setSelectedWorks(new Set(worksList.map(w => w.id)));
    }
  };

  // 选择单个作品
  const toggleSelectWork = (workId: string) => {
    const newSelected = new Set(selectedWorks);
    if (newSelected.has(workId)) {
      newSelected.delete(workId);
    } else {
      newSelected.add(workId);
    }
    setSelectedWorks(newSelected);
  };

  // 删除作品
  const handleDelete = async (work: SerializedWorksEntity) => {
    try {
      await deleteWorkMutation.mutateAsync({ id: work.id });
      toast.success('删除成功');
      setDeleteDialogOpen(false);
      setWorkToDelete(null);

      // 渐进式更新：直接从列表中移除
      setWorksList(prev => prev.filter(w => w.id !== work.id));
      setTotal(prev => prev - 1);

      // 如果当前页没有数据了且不是第一页，返回上一页
      if (worksList.length === 1 && page > 1) {
        setPage(page - 1);
      }
    } catch (error) {
      toast.error('删除失败');
      console.error(error);
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedWorks.size === 0) {
      toast.error('请选择要删除的作品');
      return;
    }

    const deleteCount = selectedWorks.size;
    try {
      await Promise.all(
        Array.from(selectedWorks).map(workId =>
          deleteWorkMutation.mutateAsync({ id: workId })
        )
      );
      toast.success(`成功删除 ${deleteCount} 个作品`);

      // 渐进式更新：从列表中批量移除
      setWorksList(prev => prev.filter(w => !selectedWorks.has(w.id)));
      setTotal(prev => prev - deleteCount);
      setSelectedWorks(new Set());

      // 如果当前页没有数据了且不是第一页，返回上一页
      if (worksList.length === deleteCount && page > 1) {
        setPage(page - 1);
      }
    } catch (error) {
      toast.error('批量删除失败');
      console.error(error);
    }
  };

  // 复制作品
  const handleDuplicate = async (work: SerializedWorksEntity) => {
    try {
      const newWork = (await duplicateWorkMutation.mutateAsync({
        id: work.id,
      })) as any as SerializedWorksEntity;
      toast.success('复制成功');

      // 渐进式更新：将新作品添加到列表顶部，移除最后一项保持页面大小
      setWorksList(prev => {
        const newList = [newWork, ...prev];
        // 如果超过页面大小，移除最后一项
        return newList.length > pageSize ? newList.slice(0, pageSize) : newList;
      });
      setTotal(prev => prev + 1);
    } catch (error) {
      toast.error('复制失败');
      console.error(error);
    }
  };

  // 编辑标题
  const startEditing = (work: SerializedWorksEntity) => {
    setEditingWork(work.id);
    setEditTitle(work.title);
  };

  const saveTitle = async (work: SerializedWorksEntity) => {
    if (!editTitle.trim()) {
      toast.error('标题不能为空');
      return;
    }

    try {
      await updateWorkMutation.mutateAsync({
        id: work.id,
        title: editTitle,
      });
      toast.success('更新成功');
      setEditingWork(null);

      // 渐进式更新：直接更新列表中的标题
      setWorksList(prev =>
        prev.map(w => (w.id === work.id ? { ...w, title: editTitle } : w))
      );
    } catch (error) {
      toast.error('更新失败');
      console.error(error);
    }
  };

  const cancelEditing = () => {
    setEditingWork(null);
    setEditTitle('');
  };

  // 打开设计师编辑器
  const openEditor = (work: SerializedWorksEntity) => {
    if (onSelectWork) {
      onSelectWork(work);
    } else {
      window.open(
        `/desktop/editor-designer?works_id=${work.id}&designer_tool=2&uid=${getUid()}&appid=${getAppId()}`,
        '_blank'
      );
    }
  };

  // 预览作品
  const previewWork = (work: SerializedWorksEntity) => {
    if (work.child_works_id) {
      window.open(`/view/${work.child_works_id}`, '_blank');
    } else {
      toast.error('作品尚未发布');
    }
  };

  // 打开封面编辑对话框
  const openCoverDialog = (work: SerializedWorksEntity) => {
    setWorkToEditCover(work);
    setCoverDialogOpen(true);
  };

  // 处理封面变更
  const handleCoverChange = async (cover: string | undefined) => {
    if (!workToEditCover || !cover) return;

    try {
      await updateWorkMutation.mutateAsync({
        id: workToEditCover.id,
        cover: cover,
      });
      toast.success('封面更新成功');
      setCoverDialogOpen(false);

      // 渐进式更新：直接更新列表中的封面
      setWorksList(prev =>
        prev.map(w =>
          w.id === workToEditCover.id
            ? ({ ...w, cover: cover } as SerializedWorksEntity)
            : w
        )
      );
      setWorkToEditCover(null);
    } catch (error) {
      toast.error('封面更新失败');
      console.error(error);
    }
  };

  // 创建作品（主题/模版）
  const handleCreateWorks = async (item: SpecItem) => {
    try {
      const res = await createWorkMutation.mutateAsync({
        title: worksName + item.display_name,
        desc: '请填写描述',
        spec_id: item.id,
        appid: getAppId(),
        cover: '',
      });
      setShowSpec(false);
      setSelectedSpec(null);
      setWorksName(defaultWorksName);
      // 刷新列表
      loadWorks();
      window.open(
        `/desktop/editor-designer?works_id=${res.id}&designer_tool=2&uid=${getUid()}&appid=${getAppId()}&works_cate=theme`
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.log(errorMessage);
      if (/uid/.test(errorMessage) || errorMessage.includes('请先登录')) {
        toast.error(`需要先登录`);
        setLoginShow(true);
      } else {
        toast.error(`创建作品失败: ${errorMessage}`);
      }
    }
  };

  // 未登录
  if (!uid) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <div className='text-center'>
          <p className='mb-4 text-lg'>请先登录</p>
          <Button onClick={() => setLoginShow(true)}>登录</Button>
        </div>
      </div>
    );
  }

  // 加载中
  if (isDesigner === null) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <div className='text-center'>
          <p className='text-lg'>验证设计师身份中...</p>
        </div>
      </div>
    );
  }

  // 非设计师
  if (!isDesigner) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <div className='text-center'>
          <p className='mb-4 text-lg text-destructive'>
            你还不是设计师，请联系管理员
          </p>
          <Button onClick={() => window.history.back()}>返回</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={cls(
          'flex-1 overflow-auto',
          'container mx-auto p-6'
        )}
      >

        {/* 工具栏 */}
        <div className={cls('mb-4 flex flex-col gap-2')}>
          <div className='flex items-center justify-between gap-4'>
            <div className='flex flex-1 items-center gap-2'>
              <div className='relative flex-1 max-w-md'>
                <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  placeholder='搜索作品标题...'
                  value={searchValue}
                  onChange={e => setSearchValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  className='pl-10'
                />
              </div>
              <Button onClick={handleSearch} variant='secondary'>
                搜索
              </Button>
            </div>

            <div className='flex items-center gap-2'>
              <div className='flex items-center gap-2'>
                <div className='text-xs text-muted-foreground whitespace-nowrap'>
                  任务单
                </div>
                <select
                  className='h-9 rounded-md border border-input bg-background px-2 text-sm'
                  value={selectedThemeTaskId}
                  onChange={e => setSelectedThemeTaskId(e.target.value)}
                  disabled={loadingThemeTasks}
                >
                  <option value=''>请选择任务单</option>
                  {themeTasks.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-9'
                  disabled={!selectedThemeTaskId}
                  onClick={() => {
                    if (selectedThemeTaskId) {
                      setTaskIdForDetail(selectedThemeTaskId);
                      setTaskDetailDialogOpen(true);
                    }
                  }}
                >
                  <Eye className='h-4 w-4 mr-1' />
                  查看详情
                </Button>
              </div>
              <Button
                variant='outline'
                onClick={() => {
                  setDefaultWorksName('设计师主题作品');
                  setWorksName('设计师主题作品');
                  setShowSpec(true);
                  setSelectedSpec(null);
                }}
              >
                创建主题
              </Button>
            </div>

            {selectedWorks.size > 0 && (
              <div className='flex items-center gap-2'>
                <span className='text-sm text-muted-foreground'>
                  已选择 {selectedWorks.size} 项
                </span>
                <Button
                  variant='destructive'
                  size='sm'
                  onClick={handleBatchDelete}
                >
                  <Trash2 className='mr-2 h-4 w-4' />
                  批量删除
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* 当前任务单信息强调 */}
        {selectedThemeTaskId && (() => {
          const selectedTask = themeTasks.find(t => t.id === selectedThemeTaskId);
          if (!selectedTask) return null;
          return (
            <Card className='mb-4 border-2 border-primary bg-primary/5'>
              <CardHeader className='pb-3'>
                <div className='flex items-center gap-2'>
                  <CheckCircle2 className='h-5 w-5 text-primary' />
                  <Badge variant='default' className='mr-2'>当前任务单</Badge>
                  <CardTitle className='text-base'>{selectedTask.title}</CardTitle>
                </div>
                {selectedTask.desc && (
                  <CardDescription className='mt-1'>
                    {selectedTask.desc}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className='pt-0'>
                <div className='flex flex-wrap gap-4 text-sm'>
                  {selectedTask.material_class && (
                    <div className='flex items-center gap-1'>
                      <span className='text-muted-foreground'>素材分类：</span>
                      <span className='font-medium'>{selectedTask.material_class.name}</span>
                    </div>
                  )}
                  {selectedTask.specInfo && (
                    <div className='flex items-center gap-1'>
                      <span className='text-muted-foreground'>规格：</span>
                      <span className='font-medium'>
                        {selectedTask.specInfo.display_name ?? selectedTask.specInfo.name}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* 统计信息 */}
        <div className='mb-4 text-sm text-muted-foreground'>
          共 {total} 个作品
        </div>

        {/* 作品列表 */}
        <div className={cls('rounded-lg border bg-card', 'mb-6')}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-12'>
                  <Checkbox
                    checked={
                      worksList.length > 0 &&
                      selectedWorks.size === worksList.length
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className='w-24'>封面</TableHead>
                <TableHead>标题</TableHead>
                <TableHead className='w-32'>创建时间</TableHead>
                <TableHead className='w-32'>更新时间</TableHead>
                <TableHead className='w-24'>状态</TableHead>
                <TableHead className='w-28'>任务状态</TableHead>
                <TableHead className='w-40 text-right'>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className='h-32 text-center'
                  >
                    加载中...
                  </TableCell>
                </TableRow>
              ) : worksList.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className='h-32 text-center'
                  >
                    <div className='flex flex-col items-center justify-center gap-2'>
                      <p className='text-muted-foreground'>
                        {keyword ? '没有找到匹配的作品' : '还没有作品'}
                      </p>
                      {keyword && (
                        <Button
                          variant='link'
                          onClick={() => {
                            setKeyword('');
                            setSearchValue('');
                            setPage(1);
                            loadWorks(1, '');
                          }}
                        >
                          清除搜索
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                worksList.map(work => (
                  <TableRow
                    key={work.id}
                    className={cls(
                      'group',
                      currentWorksId && work.id === currentWorksId
                        ? 'bg-blue-50'
                        : ''
                    )}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedWorks.has(work.id)}
                        onCheckedChange={() => toggleSelectWork(work.id)}
                      />
                    </TableCell>
                    <TableCell className='p-1'>
                      <div className='relative h-16 w-12 overflow-hidden rounded border bg-muted'>
                        {work.cover ? (
                          <Image
                            src={work.cover}
                            alt={work.title}
                            fill
                            className='object-cover'
                            unoptimized
                          />
                        ) : (
                          <div className='flex h-full items-center justify-center text-xs text-muted-foreground'>
                            无
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className='p-1'>
                      {editingWork === work.id ? (
                        <div className='flex items-center gap-2'>
                          <Input
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                saveTitle(work);
                              } else if (e.key === 'Escape') {
                                cancelEditing();
                              }
                            }}
                            autoFocus
                            className='h-8'
                          />
                          <Button
                            size='sm'
                            onClick={() => saveTitle(work)}
                            variant='ghost'
                          >
                            保存
                          </Button>
                          <Button
                            size='sm'
                            onClick={cancelEditing}
                            variant='ghost'
                          >
                            取消
                          </Button>
                        </div>
                      ) : (
                        <div className='flex items-center gap-2'>
                          <span className='font-medium'>{work.title}</span>
                          <Button
                            size='sm'
                            variant='ghost'
                            onClick={() => startEditing(work)}
                            className='h-6 w-6 p-0'
                            title='重命名'
                          >
                            <Edit2 className='h-3 w-3' />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <>
                      <TableCell className='text-sm text-muted-foreground'>
                        {dayjs(work.create_time).format('YYYY-MM-DD')}
                      </TableCell>
                      <TableCell className='text-sm text-muted-foreground'>
                        {dayjs(work.update_time).format('YYYY-MM-DD HH:mm')}
                      </TableCell>
                      <TableCell>
                        {work.child_works_id ? (
                          <span className='inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700'>
                            已发布
                          </span>
                        ) : (
                          <span className='inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700'>
                            草稿
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {selectedThemeTaskId ? (
                          (() => {
                            const row = themeStatusMap[work.id];
                            const status = row?.review_status as
                              | ReviewStatus
                              | undefined;
                            if (!status) {
                              return (
                                <span className='text-xs text-muted-foreground'>
                                  未提交
                                </span>
                              );
                            }
                            const variantMap: Record<
                              ReviewStatus,
                              BadgeVariant
                            > = {
                              pending: 'warning',
                              approved: 'success',
                              changes_requested: 'info',
                              rejected: 'danger',
                            };
                            const labelMap: Record<ReviewStatus, string> = {
                              pending: '待审核',
                              approved: '已通过',
                              changes_requested: '需修改',
                              rejected: '已拒绝',
                            };
                            const hasReviewNote = !!row?.review_note;
                            const hasReviewInfo = hasReviewNote || (Array.isArray(row?.review_images) && (row.review_images as string[]).length > 0);
                            return (
                              <Badge
                                variant={variantMap[status]}
                                className={hasReviewInfo ? 'cursor-pointer hover:opacity-80' : ''}
                                onClick={() => {
                                  if (hasReviewInfo && row) {
                                    setReviewNote(row.review_note || '');
                                    setReviewWorkTitle(work.title || '');
                                    setReviewImages(
                                      Array.isArray(row.review_images)
                                        ? (row.review_images as string[])
                                        : []
                                    );
                                    setSubmissionId(row.id);
                                    setReviewDialogOpen(true);
                                  }
                                }}
                              >
                                {labelMap[status]}
                              </Badge>
                            );
                          })()
                        ) : (
                          <span className='text-xs text-muted-foreground'>
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center justify-end gap-1'>
                          <Button
                            size='sm'
                            variant='ghost'
                            onClick={() => openEditor(work)}
                          >
                            编辑
                          </Button>
                          {(() => {
                            // 计算按钮显示逻辑
                            const getSubmitButtonConfig = () => {
                              // 未选择任务单时，显示"提交任务"按钮（弹出选择对话框）
                              if (!selectedThemeTaskId) {
                                return {
                                  show: true,
                                  text: '提交任务',
                                  onClick: async () => {
                                    if (!uid) {
                                      toast.error('请先登录');
                                      setLoginShow(true);
                                      return;
                                    }
                                    setWorkToSubmit(work);
                                    setShowTaskSelectDialog(true);
                                  },
                                };
                              }

                              // 已选择任务单，根据审核状态决定
                              const row = themeStatusMap[work.id];
                              const status = row?.review_status as ReviewStatus | undefined;

                              // 审核中或审核通过时不显示
                              if (status === 'pending' || status === 'approved') {
                                return { show: false };
                              }

                              // 有审核意见时显示"提交审核"
                              if (row?.review_note) {
                                return {
                                  show: true,
                                  text: '提交审核',
                                  successMessage: '已提交审核',
                                };
                              }

                              // 未提交或其他情况显示"提交任务"
                              return {
                                show: true,
                                text: '提交任务',
                                successMessage: '已提交到任务单',
                              };
                            };

                            const config = getSubmitButtonConfig();
                            if (!config.show) return null;

                            // 统一的提交处理函数
                            const handleSubmit = async () => {
                              if (!uid) {
                                toast.error('请先登录');
                                setLoginShow(true);
                                return;
                              }

                              // 如果未选择任务单，已在config.onClick中处理
                              if (config.onClick) {
                                await config.onClick();
                                return;
                              }

                              // 提交审核时需要填写备注
                              if (config.text === '提交审核') {
                                setWorkToSubmitReview(work);
                                setSubmitReviewRemark('');
                                setSubmitReviewDialogOpen(true);
                                return;
                              }

                              // 已选择任务单的提交逻辑 - 先显示确认弹窗
                              const task = themeTasks.find(t => t.id === selectedThemeTaskId);
                              if (!task) {
                                toast.error('任务单不存在');
                                return;
                              }
                              setWorkToSubmitConfirm(work);
                              setTaskToSubmitConfirm(task);
                              setShowSubmitConfirmDialog(true);
                            };

                            return (
                              <Button
                                size='sm'
                                variant='ghost'
                                onClick={handleSubmit}
                                disabled={submittingWorkId === work.id}
                              >
                                {submittingWorkId === work.id ? (
                                  <>
                                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                    提交中...
                                  </>
                                ) : (
                                  config.text
                                )}
                              </Button>
                            );
                          })()}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant='ghost'
                                size='sm'
                                className='h-8 w-8 p-0'
                              >
                                <MoreHorizontal className='h-4 w-4' />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end'>
                              {work.child_works_id && (
                                <DropdownMenuItem
                                  onClick={() => previewWork(work)}
                                >
                                  <ExternalLink className='mr-2 h-4 w-4' />
                                  预览
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleDuplicate(work)}
                              >
                                <Copy className='mr-2 h-4 w-4' />
                                复制
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openCoverDialog(work)}
                              >
                                <ImageIcon className='mr-2 h-4 w-4' />
                                修改封面
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setWorkToDelete(work);
                                  setDeleteDialogOpen(true);
                                }}
                                className='text-destructive'
                              >
                                <Trash2 className='mr-2 h-4 w-4' />
                                删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 分页区域 - 固定在底部 */}
      {total > pageSize &&
        (() => {
          const totalPages = Math.ceil(total / pageSize);
          const pages = [];

          // 生成页码数组
          if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
              pages.push(i);
            }
          } else {
            if (page <= 3) {
              pages.push(1, 2, 3, 4, 5, -1, totalPages);
            } else if (page >= totalPages - 2) {
              pages.push(
                1,
                -1,
                totalPages - 4,
                totalPages - 3,
                totalPages - 2,
                totalPages - 1,
                totalPages
              );
            } else {
              pages.push(1, -1, page - 1, page, page + 1, -1, totalPages);
            }
          }

          return (
            <div
              className={cls(
                'border-t bg-background sticky bottom-0',
                'px-6 py-4'
              )}
            >
              <div
                className={cls(
                  'flex items-center justify-between gap-4',
                  'container mx-auto'
                )}
              >
                <div className='text-sm text-muted-foreground whitespace-nowrap'>
                  显示 {(page - 1) * pageSize + 1} 到{' '}
                  {Math.min(page * pageSize, total)} 条，共 {total} 条
                </div>
                <div>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          className={
                            page === 1
                              ? 'pointer-events-none opacity-50'
                              : 'cursor-pointer'
                          }
                        />
                      </PaginationItem>
                      {pages.map((pageNum, index) =>
                        pageNum === -1 ? (
                          <PaginationItem key={`ellipsis-${index}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        ) : (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => setPage(pageNum)}
                              isActive={page === pageNum}
                              className='cursor-pointer'
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      )}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            setPage(p => Math.min(totalPages, p + 1))
                          }
                          className={
                            page >= totalPages
                              ? 'pointer-events-none opacity-50'
                              : 'cursor-pointer'
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>
            </div>
          );
        })()}

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className='sm:max-w-md p-6'>
          <DialogHeader className='mb-4'>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除作品 &ldquo;{workToDelete?.title}&rdquo;
              吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              variant='outline'
              onClick={() => {
                setDeleteDialogOpen(false);
                setWorkToDelete(null);
              }}
            >
              取消
            </Button>
            <Button
              variant='destructive'
              onClick={() => workToDelete && handleDelete(workToDelete)}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 查看审核意见对话框 */}
      <ResponsiveDialog
        isOpen={reviewDialogOpen}
        onOpenChange={(open) => {
          setReviewDialogOpen(open);
          if (!open) {
            // 关闭时清理状态
            setReviewNote('');
            setReviewImages([]);
            setSubmissionId('');
            setReviewWorkTitle('');
          }
        }}
        title='审核意见'
        description={reviewWorkTitle ? `作品：${reviewWorkTitle}` : undefined}
        contentProps={{ className: 'max-w-[800px]' }}
      >
        <div className="p-4">
          <div className='space-y-6 max-h-[70vh] overflow-y-auto'>
            {/* 当前审核信息 */}
            <div className='space-y-4'>
              <div className='text-sm font-medium border-b pb-2'>当前审核信息</div>

              {reviewNote && (
                <div className='space-y-2'>
                  <Label>审核备注</Label>
                  <Textarea
                    value={reviewNote}
                    readOnly
                    className='min-h-[100px] resize-none'
                    placeholder='暂无审核意见'
                  />
                </div>
              )}

              {reviewImages.length > 0 && (
                <div className='space-y-2'>
                  <Label>审核图片</Label>
                  <div className='grid grid-cols-3 gap-3'>
                    {reviewImages.map((url, idx) => (
                      <div
                        key={idx}
                        className='relative aspect-video overflow-hidden rounded-md border cursor-pointer hover:opacity-80 transition-opacity'
                        onClick={() => window.open(cdnApi(url), '_blank')}
                      >
                        <img
                          src={cdnApi(url)}
                          alt={`审核图片 ${idx + 1}`}
                          className='w-full h-full object-cover'
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!reviewNote && reviewImages.length === 0 && (
                <div className='text-sm text-muted-foreground py-4 text-center'>
                  暂无当前审核信息
                </div>
              )}
            </div>

            {/* 审核历史记录 */}
            <div className='space-y-4 border-t pt-4'>
              <div className='text-sm font-medium'>审核历史记录</div>

              {loadingReviewLogs ? (
                <div className='flex items-center justify-center py-8 text-muted-foreground'>
                  <Loader2 className='h-5 w-5 animate-spin mr-2' />
                  加载中...
                </div>
              ) : !reviewLogs || reviewLogs.length === 0 ? (
                <div className='text-sm text-muted-foreground py-4 text-center'>
                  暂无审核历史记录
                </div>
              ) : (
                <div className='space-y-3'>
                  {reviewLogs.map(log => {
                    const statusMap: Record<string, string> = {
                      pending: '待审核',
                      approved: '已通过',
                      changes_requested: '需修改',
                      rejected: '已拒绝',
                    };
                    const logImages = Array.isArray(log.review_images)
                      ? (log.review_images as string[])
                      : [];

                    return (
                      <div
                        key={log.id}
                        className='border rounded-lg p-3 space-y-2 bg-muted/30'
                      >
                        <div className='flex items-start justify-between gap-2 text-xs'>
                          <div className='flex flex-wrap gap-2 text-muted-foreground'>
                            <span>
                              {log.create_time
                                ? dayjs(log.create_time).format('YYYY-MM-DD HH:mm:ss')
                                : '-'}
                            </span>
                            <span>审核人UID：{log.reviewer_uid}</span>
                            <span>
                              状态：{log.from_review_status ? statusMap[log.from_review_status] || log.from_review_status : '-'} →{' '}
                              {statusMap[log.to_review_status] || log.to_review_status}
                            </span>
                          </div>
                        </div>

                        {log.review_note && (
                          <div className='text-sm'>
                            <div className='font-medium mb-1 text-muted-foreground'>审核备注：</div>
                            <div className='whitespace-pre-wrap bg-background rounded p-2 border'>
                              {log.review_note}
                            </div>
                          </div>
                        )}

                        {logImages.length > 0 && (
                          <div className='text-sm'>
                            <div className='font-medium mb-2 text-muted-foreground'>审核图片：</div>
                            <div className='grid grid-cols-3 gap-2'>
                              {logImages.map((url: string, idx: number) => (
                                <div
                                  key={idx}
                                  className='relative aspect-video overflow-hidden rounded-md border cursor-pointer hover:opacity-80 transition-opacity'
                                  onClick={() => window.open(cdnApi(url), '_blank')}
                                >
                                  <img
                                    src={cdnApi(url)}
                                    alt={`审核图片 ${idx + 1}`}
                                    className='w-full h-full object-cover'
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className='flex justify-end gap-2 pt-2 border-t'>
            <Button
              variant='outline'
              onClick={() => {
                setReviewDialogOpen(false);
              }}
            >
              关闭
            </Button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* 提交审核备注对话框 */}
      <ResponsiveDialog
        isOpen={submitReviewDialogOpen}
        onOpenChange={setSubmitReviewDialogOpen}
        title='提交审核'
        description={
          workToSubmitReview?.title ? `作品：${workToSubmitReview.title}` : undefined
        }
      >
        <div className='space-y-4 py-4'>
          <div className='space-y-2'>
            <Label>备注（必填）</Label>
            <Textarea
              value={submitReviewRemark}
              onChange={e => setSubmitReviewRemark(e.target.value)}
              className='min-h-[120px]'
              placeholder='请填写本次提交说明/修改点...'
            />
          </div>
        </div>
        <div className='flex justify-end gap-2 pt-2'>
          <Button
            variant='outline'
            onClick={() => setSubmitReviewDialogOpen(false)}
            disabled={submittingWorkId === workToSubmitReview?.id}
          >
            取消
          </Button>
          <Button
            onClick={async () => {
              const remark = submitReviewRemark.trim();
              if (!remark) {
                toast.error('请填写备注信息');
                return;
              }
              if (!workToSubmitReview) return;
              if (!selectedThemeTaskId) return;
              if (!uid) {
                toast.error('请先登录');
                setLoginShow(true);
                return;
              }
              try {
                setSubmittingWorkId(workToSubmitReview.id);
                await submitWorkToTaskMutation.mutateAsync({
                  theme_task_id: selectedThemeTaskId,
                  works_id: workToSubmitReview.id,
                  designer_uid: Number(uid),
                  designer_note: remark,
                });
                toast.success('已提交审核');
                setSubmitReviewDialogOpen(false);
                setWorkToSubmitReview(null);
                setSubmitReviewRemark('');
                await loadThemeStatusesForCurrentPage(
                  selectedThemeTaskId,
                  worksList
                );
              } catch (e: any) {
                toast.error(e?.message || '提交失败');
              } finally {
                setSubmittingWorkId('');
              }
            }}
            disabled={submittingWorkId === workToSubmitReview?.id}
          >
            {submittingWorkId === workToSubmitReview?.id ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                提交中...
              </>
            ) : (
              '确认提交'
            )}
          </Button>
        </div>
      </ResponsiveDialog>

      {/* 封面管理对话框 */}
      <ResponsiveDialog
        isDialog
        isOpen={coverDialogOpen}
        onOpenChange={(open) => {
          setCoverDialogOpen(open);
          if (!open) {
            setWorkToEditCover(null);
          }
        }}
        title='修改封面'
        description={
          workToEditCover?.title
            ? `为作品 "${workToEditCover.title}" 重新生成或上传封面`
            : undefined
        }
        contentProps={{
          className: 'max-w-md',
        }}
      >
        {workToEditCover && (
          <CoverManager
            worksDetail={workToEditCover}
            useDynamicCover={false}
            onCoverChange={handleCoverChange}
          />
        )}
      </ResponsiveDialog>

      {/* 选择规格对话框 */}
      <ResponsiveDialog
        isOpen={showSpec}
        onOpenChange={setShowSpec}
        title='选择规格'
        contentProps={{
          className: 'max-w-[800px]',
        }}
      >
        <div className='flex flex-col flex-wrap gap-4 p-4 w-[800px]'>
          <div className='flex flex-col gap-2'>
            <h1 className='text-sm'>作品名称</h1>
            <div className='flex items-center'>
              <Input
                value={worksName}
                onChange={e => setWorksName(e.target.value)}
                placeholder='请输入作品名称'
              />
              <span className='w-1/2 ml-2 flex items-center'>
                - {selectedSpec?.display_name || '未选规格'}
              </span>
            </div>
          </div>
          <div className='flex flex-col gap-2'>
            <h1 className='text-sm'>选择规格</h1>
            <div className='border rounded-lg overflow-hidden'>
              <div className='overflow-auto max-h-96'>
                <table className='w-full text-sm'>
                  <thead className='bg-gray-50 border-b sticky top-0 z-10'>
                    <tr>
                      <th className='px-3 py-2 text-left font-medium text-gray-700 min-w-[100px]'>
                        规格显示(用户视角)
                      </th>
                      <th className='px-3 py-2 text-left font-medium text-gray-700 min-w-[80px]'>
                        内部规格(旧)
                      </th>
                      <th className='px-3 py-2 text-left font-medium text-gray-700 min-w-[80px]'>
                        宽度
                      </th>
                      <th className='px-3 py-2 text-left font-medium text-gray-700 min-w-[80px]'>
                        高度
                      </th>
                      <th className='px-3 py-2 text-left font-medium text-gray-700 min-w-[60px]'>
                        翻页
                      </th>
                      <th className='px-3 py-2 text-left font-medium text-gray-700 min-w-[80px]'>
                        最大页数
                      </th>
                      <th className='px-3 py-2 text-left font-medium text-gray-700 min-w-[80px]'>
                        导出格式
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {specList.map(item => (
                      <tr
                        key={item.id}
                        className={`cursor-pointer transition-colors hover:bg-gray-50 ${selectedSpec?.id === item.id ? 'bg-blue-50' : ''
                          }`}
                        onClick={() => setSelectedSpec(item)}
                      >
                        <td className='px-3 py-2 font-medium text-gray-900 truncate'>
                          {item.display_name}
                        </td>
                        <td className='px-3 py-2 font-medium text-gray-900 truncate'>
                          {item.name}
                        </td>
                        <td className='px-3 py-2 text-gray-600 whitespace-nowrap'>
                          {item.viewport_width || 0}px
                        </td>
                        <td className='px-3 py-2 text-gray-600 whitespace-nowrap'>
                          {item.fixed_height &&
                            item.viewport_width &&
                            item.width &&
                            item.height
                            ? Math.floor(
                              (item.viewport_width / item.width) * item.height
                            ) + 'px'
                            : '自适应'}
                        </td>
                        <td className='px-3 py-2 text-gray-600 whitespace-nowrap'>
                          {item.is_flip_page ? '是' : '否'}
                        </td>
                        <td className='px-3 py-2 text-gray-600 whitespace-nowrap'>
                          {item.max_page_count}
                        </td>
                        <td className='px-3 py-2'>
                          <div className='flex flex-wrap gap-1'>
                            {item.export_format &&
                              item.export_format
                                .split(',')
                                .filter(format => format.trim())
                                .map((format, index) => (
                                  <span
                                    key={index}
                                    className='px-1.5 py-0.5 bg-gray-100 rounded text-xs whitespace-nowrap'
                                  >
                                    {format.trim() === 'video'
                                      ? '视频'
                                      : format.trim() === 'html'
                                        ? '网页'
                                        : format.trim() === 'image'
                                          ? '图片'
                                          : format.trim()}
                                  </span>
                                ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className='flex justify-end'>
            <Button
              disabled={!selectedSpec}
              onClick={() => selectedSpec && handleCreateWorks(selectedSpec)}
            >
              创建
            </Button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* 任务单详情（只读） */}
      <ResponsiveDialog
        isDialog
        isOpen={taskDetailDialogOpen}
        onOpenChange={open => {
          setTaskDetailDialogOpen(open);
          if (!open) setTaskIdForDetail('');
        }}
        title='任务单详情'
        contentProps={{ className: 'max-w-[560px]' }}
      >
        <div className='space-y-4 p-4'>
          {loadingTaskDetail ? (
            <div className='flex items-center justify-center py-12 text-muted-foreground'>
              <Loader2 className='h-6 w-6 animate-spin mr-2' />
              加载中...
            </div>
          ) : !taskDetail ? (
            <div className='py-8 text-center text-sm text-muted-foreground'>
              未找到任务单
            </div>
          ) : (
            <>
              <div className='space-y-1'>
                <div className='text-sm font-medium'>{taskDetail.title}</div>
                {taskDetail.desc && (
                  <div className='text-sm text-muted-foreground whitespace-pre-wrap'>
                    {taskDetail.desc}
                  </div>
                )}
              </div>
              <div className='grid grid-cols-2 gap-x-4 gap-y-2 text-sm'>
                <div className='text-muted-foreground'>状态</div>
                <div>
                  {taskDetail.status === 'pending_review' && '1 待审核'}
                  {taskDetail.status === 'in_progress' && '2 进行中'}
                  {taskDetail.status === 'completed' && '3 已完成'}
                </div>
                {taskDetail.due_at && (
                  <>
                    <div className='text-muted-foreground'>截止时间</div>
                    <div>{dayjs(taskDetail.due_at).format('YYYY-MM-DD HH:mm')}</div>
                  </>
                )}
                {taskDetail.style && (
                  <>
                    <div className='text-muted-foreground'>风格</div>
                    <div>{taskDetail.style}</div>
                  </>
                )}
                {taskDetail.material_class && (
                  <>
                    <div className='text-muted-foreground'>素材分类</div>
                    <div>{taskDetail.material_class.name}</div>
                  </>
                )}
                {taskDetail.specInfo && (
                  <>
                    <div className='text-muted-foreground'>规格</div>
                    <div>{taskDetail.specInfo.display_name ?? taskDetail.specInfo.name}</div>
                  </>
                )}
              </div>
              {Array.isArray(taskDetail.sample_images) &&
                (taskDetail.sample_images as string[]).length > 0 && (
                  <div className='space-y-2'>
                    <div className='text-sm text-muted-foreground'>参考图</div>
                    <div className='flex flex-wrap gap-2'>
                      {(taskDetail.sample_images as string[]).map((url, idx) => (
                        <img
                          key={idx}
                          src={cdnApi(url)}
                          alt={`参考图 ${idx + 1}`}
                          className='w-20 h-20 object-cover rounded-md border border-border'
                        />
                      ))}
                    </div>
                  </div>
                )}
            </>
          )}
        </div>
      </ResponsiveDialog>

      {/* 选择任务单对话框（用于提交作品） */}
      <ResponsiveDialog
        isDialog
        isOpen={showTaskSelectDialog}
        onOpenChange={setShowTaskSelectDialog}
        title='选择任务单'
        contentProps={{ className: 'max-w-[500px]' }}
      >
        <div className='space-y-4 p-4'>
          {workToSubmit && (
            <div className='text-sm text-muted-foreground'>
              作品：{workToSubmit.title}
            </div>
          )}
          <div className='space-y-2'>
            <Label>选择任务单</Label>
            {loadingThemeTasks ? (
              <div className='flex items-center py-4 text-sm text-muted-foreground'>
                <Loader2 className='h-4 w-4 animate-spin mr-2' />
                加载任务单中...
              </div>
            ) : themeTasks.length === 0 ? (
              <div className='space-y-2'>
                <div className='text-sm text-muted-foreground py-4'>
                  暂无可用的任务单
                </div>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    const uidNum = Number(uid);
                    if (uidNum > 0) {
                      loadThemeTasks(uidNum);
                    } else {
                      toast.error('用户ID无效');
                    }
                  }}
                  disabled={loadingThemeTasks}
                >
                  重新加载
                </Button>
              </div>
            ) : (
              <Select
                value={selectedThemeTaskId || undefined}
                onValueChange={v => setSelectedThemeTaskId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder='请选择任务单' />
                </SelectTrigger>
                <SelectContent>
                  {themeTasks.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                      {t.material_class?.name && `（${t.material_class.name}）`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className='flex justify-end gap-2 pt-2'>
            <Button
              variant='outline'
              onClick={() => {
                setShowTaskSelectDialog(false);
                setWorkToSubmit(null);
              }}
            >
              取消
            </Button>
            <Button
              onClick={async () => {
                if (!workToSubmit || !selectedThemeTaskId) {
                  toast.error('请选择任务单');
                  return;
                }
                if (!uid) {
                  toast.error('请先登录');
                  setLoginShow(true);
                  return;
                }
                // 显示确认弹窗
                const task = themeTasks.find(t => t.id === selectedThemeTaskId);
                if (!task) {
                  toast.error('任务单不存在');
                  return;
                }
                setShowTaskSelectDialog(false);
                setWorkToSubmitConfirm(workToSubmit);
                setTaskToSubmitConfirm(task);
                setShowSubmitConfirmDialog(true);
              }}
              disabled={!selectedThemeTaskId}
            >
              提交
            </Button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* 提交任务确认弹窗 */}
      <ResponsiveDialog
        isDialog
        isOpen={showSubmitConfirmDialog}
        onOpenChange={open => {
          setShowSubmitConfirmDialog(open);
          if (!open) {
            setWorkToSubmitConfirm(null);
            setTaskToSubmitConfirm(null);
          }
        }}
        title='确认提交任务'
        contentProps={{ className: 'max-w-[600px]' }}
      >
        <div className='space-y-4 p-4'>
          {/* 任务单信息 */}
          {taskToSubmitConfirm && (
            <Card className='border-2 border-primary bg-primary/5'>
              <CardHeader className='pb-3'>
                <CardTitle className='text-base'>任务单信息</CardTitle>
              </CardHeader>
              <CardContent className='space-y-2'>
                <div>
                  <div className='text-sm font-medium'>{taskToSubmitConfirm.title}</div>
                  {taskToSubmitConfirm.desc && (
                    <div className='text-sm text-muted-foreground mt-1 whitespace-pre-wrap'>
                      {taskToSubmitConfirm.desc}
                    </div>
                  )}
                </div>
                <div className='flex flex-wrap gap-4 text-sm'>
                  {taskToSubmitConfirm.material_class && (
                    <div className='flex items-center gap-1'>
                      <span className='text-muted-foreground'>素材分类：</span>
                      <span className='font-medium'>
                        {taskToSubmitConfirm.material_class.name}
                      </span>
                    </div>
                  )}
                  {taskToSubmitConfirm.specInfo && (
                    <div className='flex items-center gap-1'>
                      <span className='text-muted-foreground'>规格：</span>
                      <span className='font-medium'>
                        {taskToSubmitConfirm.specInfo.display_name ??
                          taskToSubmitConfirm.specInfo.name}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 作品信息 */}
          {workToSubmitConfirm && (
            <Card>
              <CardHeader className='pb-3'>
                <CardTitle className='text-base'>作品信息</CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                <div className='flex items-start gap-3'>
                  {workToSubmitConfirm.cover && (
                    <div className='relative h-20 w-14 flex-shrink-0 overflow-hidden rounded border bg-muted'>
                      <Image
                        src={workToSubmitConfirm.cover}
                        alt={workToSubmitConfirm.title}
                        fill
                        className='object-cover'
                        unoptimized
                      />
                    </div>
                  )}
                  <div className='flex-1'>
                    <div className='font-medium'>{workToSubmitConfirm.title}</div>
                    <div className='text-sm text-muted-foreground mt-1'>
                      创建时间：{dayjs(workToSubmitConfirm.create_time).format('YYYY-MM-DD')}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className='text-sm text-muted-foreground pt-2 border-t'>
            确认将作品提交到该任务单吗？
          </div>
        </div>
        <div className='flex justify-end gap-2 pt-2 px-4 pb-4'>
          <Button
            variant='outline'
            onClick={() => {
              setShowSubmitConfirmDialog(false);
              setWorkToSubmitConfirm(null);
              setTaskToSubmitConfirm(null);
            }}
            disabled={submittingWorkId === workToSubmitConfirm?.id}
          >
            取消
          </Button>
          <Button
            onClick={async () => {
              if (!workToSubmitConfirm || !taskToSubmitConfirm) {
                toast.error('信息不完整');
                return;
              }
              if (!uid) {
                toast.error('请先登录');
                setLoginShow(true);
                return;
              }
              try {
                setSubmittingWorkId(workToSubmitConfirm.id);
                const taskId = taskToSubmitConfirm.id;
                await submitWorkToTaskMutation.mutateAsync({
                  theme_task_id: taskId,
                  works_id: workToSubmitConfirm.id,
                  designer_uid: Number(uid),
                });
                toast.success('已提交到任务单');
                setShowSubmitConfirmDialog(false);
                // 如果是从选择任务单对话框来的，需要关闭它
                setShowTaskSelectDialog(false);
                setWorkToSubmit(null);
                // 刷新状态
                await loadThemeStatusesForCurrentPage(taskId, worksList);
                // 清理状态
                setWorkToSubmitConfirm(null);
                setTaskToSubmitConfirm(null);
              } catch (e: any) {
                toast.error(e?.message || '提交失败');
              } finally {
                setSubmittingWorkId('');
              }
            }}
            disabled={submittingWorkId === workToSubmitConfirm?.id}
          >
            {submittingWorkId === workToSubmitConfirm?.id ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                提交中...
              </>
            ) : (
              '确认提交'
            )}
          </Button>
        </div>
      </ResponsiveDialog>
    </>
  );
};

export default observer(WorksListForDesigner);

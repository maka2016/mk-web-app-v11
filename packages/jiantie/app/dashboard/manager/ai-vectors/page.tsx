'use client';

import { AIWorksSDK2 } from '@/ai-template-search/utils/ai-works-sdk2';
import { DataPagination } from '@/components/DataPagination';
import GridCompWrapper from '@/components/GridEditorV3/AppV2';
import { WorksStore } from '@/components/GridEditorV3/works-store/store';
import { IWorksData } from '@/components/GridEditorV3/works-store/types';
import { SerializedWorksEntity } from '@/utils';
import { trpcReact } from '@/utils/trpc';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
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
import { Textarea } from '@workspace/ui/components/textarea';
import {
  Loader2,
  Play,
  RefreshCw,
  Search,
  TestTube,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

const PAGE_SIZE = 20;

type SyncStatus = 'pending' | 'synced' | 'failed';

const SYNC_STATUS_LABEL: Record<SyncStatus, string> = {
  pending: '待同步',
  synced: '已同步',
  failed: '同步失败',
};

const SYNC_STATUS_BADGE: Record<
  SyncStatus,
  'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'danger' | 'info'
> = {
  pending: 'warning',
  synced: 'success',
  failed: 'danger',
};

type AIVectorMeta = {
  sceneTags?: string[];
  industryTags?: string[];
  styleTags?: string[];
  audienceTags?: string[];
  sampleTitle?: string;
  sampleCopy?: string;
  userStory?: string;
};

export default function AIVectorsPage() {
  const [page, setPage] = useState(1);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | 'all'>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [sourceType, setSourceType] = useState<'template' | 'works'>('template');
  const [vectorizingId, setVectorizingId] = useState<string | null>(null);
  const [worksVectorizingId, setWorksVectorizingId] = useState<string | null>(null);
  const [showVectorizeDialog, setShowVectorizeDialog] = useState(false);
  const [showWorksVectorizeDialog, setShowWorksVectorizeDialog] = useState(false);
  const [showMatchTestDialog, setShowMatchTestDialog] = useState(false);

  // 模版向量列表
  const {
    data: templateListData,
    isLoading: isTemplateLoading,
    refetch: refetchTemplate,
  } = trpcReact.templateAIVector.getVectorizedList.useQuery(
    {
      sync_status: syncStatus === 'all' ? undefined : syncStatus,
      template_id: searchKeyword || undefined,
      page,
      pageSize: PAGE_SIZE,
    },
    {
      enabled: sourceType === 'template',
    }
  );

  // 作品向量列表
  const {
    data: worksListData,
    isLoading: isWorksLoading,
    refetch: refetchWorks,
  } = trpcReact.worksAIVector.getVectorizedWorksList.useQuery(
    {
      works_id: searchKeyword || undefined,
      page,
      pageSize: PAGE_SIZE,
    },
    {
      enabled: sourceType === 'works',
    }
  );

  const isLoading = sourceType === 'template' ? isTemplateLoading : isWorksLoading;

  const templateItems = useMemo(() => templateListData?.data || [], [templateListData?.data]);
  const worksItems = useMemo(() => worksListData?.data || [], [worksListData?.data]);

  const totalPages = useMemo(
    () => (sourceType === 'template' ? templateListData?.totalPages || 0 : worksListData?.totalPages || 0),
    [sourceType, templateListData?.totalPages, worksListData?.totalPages]
  );
  const total = useMemo(() => totalPages * PAGE_SIZE, [totalPages]);

  // 向量化单个模版
  const vectorizeMutation = trpcReact.templateAIVector.vectorizeTemplate.useMutation({
    onSuccess: () => {
      toast.success('向量化成功');
      setVectorizingId(null);
      refetchTemplate();
    },
    onError: (error) => {
      toast.error(error.message || '向量化失败');
      setVectorizingId(null);
    },
  });

  // 删除向量
  const deleteMutation = trpcReact.templateAIVector.deleteVector.useMutation({
    onSuccess: () => {
      toast.success('删除成功');
      refetchTemplate();
    },
    onError: (error) => {
      toast.error(error.message || '删除失败');
    },
  });

  // 向量化单个作品
  const worksVectorizeMutation = trpcReact.worksAIVector.vectorizeWorks.useMutation({
    onSuccess: () => {
      toast.success('作品向量化成功');
      setWorksVectorizingId(null);
      refetchWorks();
    },
    onError: (error) => {
      toast.error(error.message || '作品向量化失败');
      setWorksVectorizingId(null);
    },
  });

  // 删除作品向量
  const worksDeleteMutation = trpcReact.worksAIVector.deleteVector.useMutation({
    onSuccess: () => {
      toast.success('删除作品向量成功');
      refetchWorks();
    },
    onError: (error) => {
      toast.error(error.message || '删除作品向量失败');
    },
  });

  const handleVectorize = (templateId: string) => {
    if (confirm('确定要向量化这个模版吗？')) {
      setVectorizingId(templateId);
      vectorizeMutation.mutate({ template_id: templateId });
    }
  };

  const handleWorksVectorize = (worksId: string) => {
    if (confirm('确定要重新向量化这个作品吗？')) {
      setWorksVectorizingId(worksId);
      worksVectorizeMutation.mutate({ works_id: worksId });
    }
  };

  const handleWorksDelete = (worksId: string) => {
    if (confirm('确定要删除这个作品的向量吗？')) {
      worksDeleteMutation.mutate({ works_id: worksId });
    }
  };

  const handleDelete = (templateId: string) => {
    if (confirm('确定要删除这个模版的向量吗？')) {
      deleteMutation.mutate({ template_id: templateId });
    }
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

  return (
    <div className="h-screen p-6 overflow-auto">
      <div className="space-y-4">
        {/* 标题和操作区 */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">AI 向量管理</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowVectorizeDialog(true)}
            >
              <TestTube className="h-4 w-4 mr-2" />
              批量模版向量
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSourceType('works');
                setShowWorksVectorizeDialog(true);
              }}
            >
              <TestTube className="h-4 w-4 mr-2" />
              批量作品向量
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowMatchTestDialog(true)}
            >
              <Play className="h-4 w-4 mr-2" />
              匹配测试
            </Button>
          </div>
        </div>

        {/* 筛选区 */}
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm">来源：</span>
            <Select
              value={sourceType}
              onValueChange={(value) => {
                setSourceType(value as 'template' | 'works');
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="选择来源" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="template">模版向量</SelectItem>
                <SelectItem value="works">作品向量</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm">同步状态：</span>
            <Select
              value={syncStatus}
              onValueChange={(value) => {
                setSyncStatus(value as SyncStatus | 'all');
                setPage(1);
              }}
              disabled={sourceType === 'works'}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="pending">待同步</SelectItem>
                <SelectItem value="synced">已同步</SelectItem>
                <SelectItem value="failed">同步失败</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={sourceType === 'template' ? '搜索模版ID...' : '搜索作品ID...'}
                value={searchKeyword}
                onChange={(e) => {
                  setSearchKeyword(e.target.value);
                  setPage(1);
                }}
                className="pl-8"
              />
            </div>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              if (sourceType === 'template') {
                refetchTemplate();
              } else {
                refetchWorks();
              }
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* 表格（模版 & 作品共用一套列） */}
        <div className="border rounded-md overflow-x-auto">
          <Table className="text-xs">
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">
                  {sourceType === 'template' ? '模版ID' : '作品ID'}
                </TableHead>
                <TableHead className="whitespace-nowrap">
                  {sourceType === 'template' ? '模版标题' : '作品标题'}
                </TableHead>
                <TableHead className="whitespace-nowrap">场景标签</TableHead>
                <TableHead className="whitespace-nowrap">行业标签</TableHead>
                <TableHead className="whitespace-nowrap">风格标签</TableHead>
                <TableHead className="whitespace-nowrap">受众标签</TableHead>
                <TableHead className="whitespace-nowrap">示例标题</TableHead>
                <TableHead className="whitespace-nowrap">示例文案</TableHead>
                <TableHead className="whitespace-nowrap">用户故事</TableHead>
                <TableHead className="whitespace-nowrap">同步状态</TableHead>
                <TableHead className="whitespace-nowrap">同步错误</TableHead>
                <TableHead className="whitespace-nowrap">
                  {sourceType === 'template' ? '同步时间' : '创建时间'}
                </TableHead>
                <TableHead className="whitespace-nowrap">更新时间</TableHead>
                <TableHead className="text-right whitespace-nowrap">
                  {sourceType === 'template' ? '操作' : '文本信息 / 操作'}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={14} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : (sourceType === 'template' ? templateItems.length === 0 : worksItems.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                (sourceType === 'template' ? templateItems : worksItems).map((raw: any) => {
                  const isTemplate = sourceType === 'template';

                  const id = isTemplate ? raw.template_id : raw.works_id;

                  // 标题
                  const title = isTemplate
                    ? raw.template?.title ?? ''
                    : (raw.meta?.title as string | undefined) ?? '';

                  // 统一的语义信息
                  let aiMeta: AIVectorMeta | null = null;
                  if (isTemplate) {
                    aiMeta = (raw.ai_meta as AIVectorMeta | null) ?? null;
                  } else {
                    const meta = (raw.meta || {}) as {
                      scene_tags?: string[];
                      industry_tags?: string[];
                      style_tags?: string[];
                      audience_tags?: string[];
                      sample_title?: string | null;
                      ai_meta?: AIVectorMeta;
                    };
                    const inner = meta.ai_meta;
                    aiMeta = {
                      sceneTags: meta.scene_tags ?? inner?.sceneTags ?? [],
                      industryTags: meta.industry_tags ?? inner?.industryTags ?? [],
                      styleTags: meta.style_tags ?? inner?.styleTags ?? [],
                      audienceTags: meta.audience_tags ?? inner?.audienceTags ?? [],
                      sampleTitle: meta.sample_title ?? inner?.sampleTitle ?? '',
                      sampleCopy: inner?.sampleCopy ?? '',
                    };
                  }

                  const scene = aiMeta?.sceneTags ?? [];
                  const industry = aiMeta?.industryTags ?? [];
                  const style = aiMeta?.styleTags ?? [];
                  const audience = aiMeta?.audienceTags ?? [];
                  const sampleTitle = aiMeta?.sampleTitle ?? '';
                  const sampleCopy = aiMeta?.sampleCopy ?? '';

                  // 状态 & 时间
                  const syncStatus: SyncStatus | null = isTemplate ? (raw.sync_status as SyncStatus) : 'synced';
                  const syncError: string | null | undefined = isTemplate ? raw.sync_error ?? null : null;
                  const primaryTime = isTemplate ? raw.synced_at : raw.created_at;
                  const updateTime = isTemplate ? raw.update_time : raw.updated_at;

                  // 文本统计（只对作品有效）
                  const worksMeta = (!isTemplate ? (raw.meta || {}) : {}) as {
                    text_used_lines?: number;
                    text_total_lines?: number;
                    truncated?: boolean;
                  };

                  const isVectorizing = isTemplate && vectorizingId === raw.template_id;
                  const isWorksVectorizing = !isTemplate && worksVectorizingId === raw.works_id;

                  // 用户故事（模版从 ai_meta.userStory；作品优先 meta.user_story，其次 ai_meta.userStory）
                  const userStory =
                    (isTemplate
                      ? aiMeta?.userStory
                      : ((raw.meta || {}) as { user_story?: string; ai_meta?: AIVectorMeta }).user_story ??
                        ((raw.meta || {}) as { ai_meta?: AIVectorMeta }).ai_meta?.userStory) || '';

                  return (
                    <TableRow key={id}>
                      <TableCell className="font-mono truncate max-w-[90px]">
                        {id}
                      </TableCell>
                      <TableCell className="max-w-[140px] min-w-[140px]">
                        {title ? (
                          <div className="whitespace-pre-wrap break-words">
                            {title}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="max-w-[140px] min-w-[140px]">
                        {scene.length > 0 ? (
                          <div className="whitespace-pre-wrap break-words">
                            {scene.join('、')}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="max-w-[140px] min-w-[140px]">
                        {industry.length > 0 ? (
                          <div className="whitespace-pre-wrap break-words">
                            {industry.join('、')}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="max-w-[140px] min-w-[140px]">
                        {style.length > 0 ? (
                          <div className="whitespace-pre-wrap break-words">
                            {style.join('、')}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="max-w-[140px] min-w-[140px]">
                        {audience.length > 0 ? (
                          <div className="whitespace-pre-wrap break-words">
                            {audience.join('、')}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="max-w-[140px] min-w-[140px]">
                        {sampleTitle ? (
                          <div className="whitespace-pre-wrap break-words">
                            {sampleTitle}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="max-w-[140px] min-w-[140px]">
                        {sampleCopy ? (
                          <div className="whitespace-pre-wrap break-words">
                            {sampleCopy}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="max-w-[180px] min-w-[160px]">
                        {userStory ? (
                          <div className="whitespace-pre-wrap break-words text-xs">
                            {userStory}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {syncStatus ? (
                          <Badge variant={SYNC_STATUS_BADGE[syncStatus]}>
                            {SYNC_STATUS_LABEL[syncStatus]}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="max-w-[140px] min-w-[140px]">
                        {syncError ? (
                          <div className="whitespace-pre-wrap break-words text-destructive">
                            {syncError}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-wrap text-muted-foreground max-w-[100px]">
                        {formatDate(primaryTime)}
                      </TableCell>
                      <TableCell className="text-wrap text-muted-foreground max-w-[100px]">
                        {formatDate(updateTime)}
                      </TableCell>
                      <TableCell className="text-right max-w-[180px]">
                        {isTemplate ? (
                          <div className="flex flex-wrap justify-end gap-2 max-w-[160px]">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleVectorize(raw.template_id)}
                              disabled={isVectorizing}
                            >
                              {isVectorizing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                '重新向量化'
                              )}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(raw.template_id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground text-right space-y-2">
                            <div>
                              <div>UID：{raw.uid}</div>
                              <div>APPID：{raw.appid || '-'}</div>
                              <div>
                                文本：
                                {worksMeta.text_used_lines !== undefined &&
                                worksMeta.text_total_lines !== undefined
                                  ? `${worksMeta.text_used_lines}/${worksMeta.text_total_lines}`
                                  : '-'}
                                {worksMeta.truncated ? '（已截断）' : ''}
                              </div>
                            </div>
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleWorksVectorize(raw.works_id)}
                                disabled={isWorksVectorizing}
                              >
                                {isWorksVectorizing ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  '重新向量化'
                                )}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleWorksDelete(raw.works_id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
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

        {/* 批量模版向量弹窗 */}
        <VectorizeDialog
          isOpen={showVectorizeDialog}
          onOpenChange={setShowVectorizeDialog}
          onSuccess={() => {
            setShowVectorizeDialog(false);
            refetchTemplate();
          }}
        />

        {/* 批量作品向量弹窗 */}
        <WorksVectorizeDialog
          isOpen={showWorksVectorizeDialog}
          onOpenChange={setShowWorksVectorizeDialog}
          onSuccess={() => {
            setShowWorksVectorizeDialog(false);
            refetchWorks();
          }}
        />

        {/* 匹配测试弹窗 */}
        <MatchTestDialog
          isOpen={showMatchTestDialog}
          onOpenChange={setShowMatchTestDialog}
        />
      </div>
    </div>
  );
}

// 批量作品向量弹窗组件
function WorksVectorizeDialog({
  isOpen,
  onOpenChange,
  onSuccess,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [worksIdsInput, setWorksIdsInput] = useState('');
  const [result, setResult] = useState<
    Array<{
      works_id: string;
      success: boolean;
      error?: string;
    }>
  >([]);
  const [isRunning, setIsRunning] = useState(false);

  const vectorizeWorks = trpcReact.worksAIVector.vectorizeWorks.useMutation();

  const worksIds = worksIdsInput
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const handleVectorize = async () => {
    if (worksIds.length === 0) {
      toast.error('请输入至少一个作品ID，多个ID用空格分隔');
      return;
    }

    setIsRunning(true);
    setResult([]);

    const outputs: Array<{ works_id: string; success: boolean; error?: string }> = [];

    for (const id of worksIds) {
      try {
        await vectorizeWorks.mutateAsync({ works_id: id });
        outputs.push({ works_id: id, success: true });
      } catch (e) {
        outputs.push({
          works_id: id,
          success: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    setResult(outputs);
    const ok = outputs.filter((r) => r.success).length;
    const bad = outputs.length - ok;
    toast.success(`作品向量化完成：成功 ${ok}，失败 ${bad}`);
    onSuccess();
    setIsRunning(false);
  };

  const handleClose = () => {
    if (isRunning) return;
    setWorksIdsInput('');
    setResult([]);
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onOpenChange={handleClose}
      title="批量作品向量"
      description="输入要向量化的作品ID，多个ID用空格分隔。系统将抽取作品文本、调用 AI 分析并生成与模版一致的向量语义"
      showCloseIcon={true}
    >
      <div className="space-y-4 p-4">
        <div className="space-y-2">
          <Label htmlFor="works-ids">作品ID（多个用空格分隔）</Label>
          <Textarea
            id="works-ids"
            placeholder="例如：W_xxx W_yyy W_zzz"
            value={worksIdsInput}
            onChange={(e) => setWorksIdsInput(e.target.value)}
            rows={4}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            已解析 {worksIds.length} 个作品ID
          </p>
        </div>

        {result.length > 0 && (
          <div className="space-y-4 p-4 bg-muted rounded-md">
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">
                成功 {result.filter((r) => r.success).length}
              </Badge>
              {result.some((r) => !r.success) && (
                <Badge variant="destructive">
                  失败 {result.filter((r) => !r.success).length}
                </Badge>
              )}
              <Badge variant="outline">共 {result.length} 个</Badge>
            </div>
            <div className="space-y-2 max-h-48 overflow-auto">
              <Label>明细</Label>
              <div className="space-y-1 text-xs">
                {result.map((r) => (
                  <div
                    key={r.works_id}
                    className="flex items-center justify-between gap-2 py-1 px-2 rounded bg-background"
                  >
                    <span className="font-mono break-all flex-1">{r.works_id}</span>
                    {r.success ? (
                      <Badge variant="success" className="shrink-0">
                        成功
                      </Badge>
                    ) : (
                      <Badge
                        variant="destructive"
                        className="shrink-0"
                        title={r.error}
                      >
                        {r.error ? `${r.error.slice(0, 20)}…` : '失败'}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-end p-4">
        <Button variant="outline" onClick={handleClose} disabled={isRunning}>
          关闭
        </Button>
        <Button
          onClick={handleVectorize}
          disabled={isRunning || worksIds.length === 0}
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              向量化中...
            </>
          ) : (
            `开始向量化（${worksIds.length} 个）`
          )}
        </Button>
      </div>
    </ResponsiveDialog>
  );
}

// 批量模版向量弹窗组件
function VectorizeDialog({
  isOpen,
  onOpenChange,
  onSuccess,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [templateIdsInput, setTemplateIdsInput] = useState('');
  const [result, setResult] = useState<{
    total: number;
    success_count: number;
    failed_count: number;
    results: Array<{
      template_id: string;
      success: boolean;
      error?: string;
      ai_meta?: unknown;
    }>;
  } | null>(null);

  const batchMutation = trpcReact.templateAIVector.batchVectorize.useMutation({
    onSuccess: (data) => {
      const ok = data.failed_count === 0;
      toast.success(ok ? `全部成功：${data.success_count} 个` : `完成：成功 ${data.success_count}，失败 ${data.failed_count}`);
      setResult(data);
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || '批量向量化失败');
      setResult(null);
    },
  });

  const templateIds = templateIdsInput
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const handleVectorize = () => {
    if (templateIds.length === 0) {
      toast.error('请输入至少一个模版ID，多个ID用空格分隔');
      return;
    }

    batchMutation.mutate({ template_ids: templateIds });
  };

  const handleClose = () => {
    setTemplateIdsInput('');
    setResult(null);
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onOpenChange={handleClose}
      title="批量模版向量"
      description="输入要向量化的模版ID，多个ID用空格分隔。系统将提取模版可编辑内容、调用 AI 分析并生成向量"
      showCloseIcon={true}
    >
      <div className="space-y-4 p-4">
        <div className="space-y-2">
          <Label htmlFor="template-ids">模版ID（多个用空格分隔）</Label>
          <Textarea
            id="template-ids"
            placeholder="例如：T_xxx T_yyy T_zzz"
            value={templateIdsInput}
            onChange={(e) => setTemplateIdsInput(e.target.value)}
            rows={4}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            已解析 {templateIds.length} 个模版ID
          </p>
        </div>

        {result && (
          <div className="space-y-4 p-4 bg-muted rounded-md">
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">成功 {result.success_count}</Badge>
              {result.failed_count > 0 && (
                <Badge variant="destructive">失败 {result.failed_count}</Badge>
              )}
              <Badge variant="outline">共 {result.total} 个</Badge>
            </div>
            <div className="space-y-2 max-h-48 overflow-auto">
              <Label>明细</Label>
              <div className="space-y-1 text-xs">
                {result.results.map((r) => (
                  <div
                    key={r.template_id}
                    className="flex items-center justify-between gap-2 py-1 px-2 rounded bg-background"
                  >
                    <span className="font-mono break-all flex-1">{r.template_id}</span>
                    {r.success ? (
                      <Badge variant="success" className="shrink-0">成功</Badge>
                    ) : (
                      <Badge variant="destructive" className="shrink-0" title={r.error}>
                        {r.error ? `${r.error.slice(0, 20)}…` : '失败'}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {batchMutation.isError && (
          <div className="p-4 bg-destructive/10 rounded-md">
            <p className="text-sm text-destructive">
              {batchMutation.error?.message || '未知错误'}
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-end p-4">
        <Button variant="outline" onClick={handleClose}>
          关闭
        </Button>
        <Button
          onClick={handleVectorize}
          disabled={batchMutation.isPending || templateIds.length === 0}
        >
          {batchMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              向量化中...
            </>
          ) : (
            `开始向量化（${templateIds.length} 个）`
          )}
        </Button>
      </div>
    </ResponsiveDialog>
  );
}

// 匹配测试弹窗组件
function MatchTestDialog({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const utils = trpcReact.useUtils();
  const [queryText, setQueryText] = useState('');
  const [worksId, setWorksId] = useState('');
  const [isBuildingFromWorks, setIsBuildingFromWorks] = useState(false);
  const [sceneTags, setSceneTags] = useState<string[]>([]);
  const [industryTags, setIndustryTags] = useState<string[]>([]);
  const [limit, setLimit] = useState(10);
  const [minSimilarity, setMinSimilarity] = useState(0.3);
  const [sceneTagInput, setSceneTagInput] = useState('');
  const [industryTagInput, setIndustryTagInput] = useState('');
  const [generatingTemplateId, setGeneratingTemplateId] = useState<string | null>(
    null
  );
  const [generated, setGenerated] = useState<
    Array<{
      template_id: string;
      template_title?: string;
      success: boolean;
      content?: unknown;
      error?: string;
    }>
  >([]);
  const [previewWorksStore, setPreviewWorksStore] = useState<WorksStore | null>(
    null
  );
  const [showPreview, setShowPreview] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  const testMutation = trpcReact.templateAIVector.testVectorMatch.useQuery(
    {
      query_text: queryText,
      scene_tags: sceneTags.length > 0 ? sceneTags : undefined,
      industry_tags: industryTags.length > 0 ? industryTags : undefined,
      limit,
      min_similarity: minSimilarity,
    },
    {
      enabled: false, // 手动触发
    }
  );

  const vectorizeWorksMutation = trpcReact.worksAIVector.vectorizeWorks.useMutation({
    onSuccess: () => {
      toast.success('作品向量化完成（已写入 works_ai_vectors）');
    },
    onError: (error) => {
      toast.error(error.message || '作品向量化失败');
    },
  });

  const handleBuildQueryFromWorks = async () => {
    const id = worksId.trim();
    if (!id) {
      toast.error('请输入作品ID');
      return;
    }

    setIsBuildingFromWorks(true);
    try {
      const worksData = await utils.works.getWorksData.fetch({ id });
      const detail = (worksData as any)?.detail as SerializedWorksEntity | undefined;
      const workData = (worksData as any)?.work_data as IWorksData | undefined;

      if (!workData) {
        throw new Error('作品 work_data 为空');
      }

      const elements = AIWorksSDK2.extractTemplateTextElements(workData);
      if (elements.length === 0) {
        throw new Error('作品中没有可用的文本内容');
      }

      const title = detail?.title ? String(detail.title).trim() : '';
      const lines = elements
        .map((e, idx) => `${idx + 1}. [${e.tag || 'text_body'}] ${e.text || ''}`.trim())
        .filter(Boolean);

      const nextQuery = [title ? `作品标题：${title}` : null, ...lines].filter(Boolean).join('\n');
      setQueryText(nextQuery);
      toast.success(`已从作品抽取 ${lines.length} 条文本，生成查询文本`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setIsBuildingFromWorks(false);
    }
  };

  const handleVectorizeWorks = () => {
    const id = worksId.trim();
    if (!id) {
      toast.error('请输入作品ID');
      return;
    }
    vectorizeWorksMutation.mutate({ works_id: id });
  };

  const handleTest = () => {
    if (!queryText.trim()) {
      toast.error('请输入查询文本');
      return;
    }

    testMutation.refetch();
  };

  const generateForTemplate = async (templateId: string, templateTitle?: string) => {
    const q = queryText.trim();
    if (!q) {
      toast.error('请先输入查询文本');
      return;
    }

    setGeneratingTemplateId(templateId);

    try {
      // 1) 获取模版 work_data
      const templateData = await utils.template.getTemplateData.fetch({
        id: templateId,
      });

      const titleFromDetail: string | undefined = (templateData as any)?.detail?.title;
      const worksData = (templateData as any)?.work_data as IWorksData | undefined;
      const worksDetail = (templateData as any)?.detail as
        | SerializedWorksEntity
        | undefined;

      if (!worksData) {
        throw new Error('模版 work_data 为空');
      }

      // 2) 基于模版数据创建预览 worksStore
      const templateWorksStore = new WorksStore({
        worksId: () => templateId,
        readonly: false,
        autoSaveFreq: -1,
        worksData: worksData as unknown as IWorksData,
        worksDetail: (worksDetail ?? (templateData as any)?.detail) as unknown as SerializedWorksEntity,
      });

      // 3) 使用 AIWorksSDK2 Agent 工作流生成内容
      const nextPreviewWorksStore = await AIWorksSDK2.generateWithAgentWorkflow(
        q,
        templateWorksStore
      );

      setPreviewWorksStore(nextPreviewWorksStore);
      setPreviewKey((k) => k + 1);
      setShowPreview(true);

      const record = {
        template_id: templateId,
        template_title: templateTitle ?? titleFromDetail,
        success: true,
        content: '使用 AIWorksSDK2 Agent 工作流生成' as unknown,
      };

      setGenerated(prev => [
        // 同一模版只保留最新一条
        ...prev.filter(x => x.template_id !== templateId),
        record,
      ]);

      toast.success('生成完成');
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      setGenerated(prev => [
        ...prev.filter(x => x.template_id !== templateId),
        {
          template_id: templateId,
          template_title: templateTitle,
          success: false,
          error: errMsg,
        },
      ]);
      toast.error(errMsg || '生成失败');
    } finally {
      setGeneratingTemplateId(null);
    }
  };

  const handleAddSceneTag = () => {
    if (sceneTagInput.trim() && !sceneTags.includes(sceneTagInput.trim())) {
      setSceneTags([...sceneTags, sceneTagInput.trim()]);
      setSceneTagInput('');
    }
  };

  const handleRemoveSceneTag = (tag: string) => {
    setSceneTags(sceneTags.filter(t => t !== tag));
  };

  const handleAddIndustryTag = () => {
    if (industryTagInput.trim() && !industryTags.includes(industryTagInput.trim())) {
      setIndustryTags([...industryTags, industryTagInput.trim()]);
      setIndustryTagInput('');
    }
  };

  const handleRemoveIndustryTag = (tag: string) => {
    setIndustryTags(industryTags.filter(t => t !== tag));
  };

  const handleClose = () => {
    setQueryText('');
    setWorksId('');
    setIsBuildingFromWorks(false);
    setSceneTags([]);
    setIndustryTags([]);
    setSceneTagInput('');
    setIndustryTagInput('');
    setGenerated([]);
    setGeneratingTemplateId(null);
    setShowPreview(false);
    setPreviewWorksStore(null);
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onOpenChange={handleClose}
      title="向量匹配测试"
      description="输入查询内容，测试与模版向量的匹配程度"
      showCloseIcon={true}
      fullHeight={true}
    >
      <div className="space-y-4 p-4 h-full overflow-auto">
        <div className="space-y-2">
          <Label htmlFor="query-text">查询文本 *</Label>
          <Textarea
            id="query-text"
            placeholder="例如：2026暑期篮球兴趣班火热招生，专业教练团队，小班教学"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            输入用户可能使用的查询文本，系统将转换为向量并搜索匹配的模版
          </p>
        </div>

        <div className="space-y-2">
          <Label>场景标签过滤（可选）</Label>
          <div className="flex gap-2">
            <Input
              placeholder="输入标签后点击添加"
              value={sceneTagInput}
              onChange={(e) => setSceneTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSceneTag();
                }
              }}
            />
            <Button variant="outline" onClick={handleAddSceneTag}>
              添加
            </Button>
          </div>
          {sceneTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {sceneTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => handleRemoveSceneTag(tag)}
                >
                  {tag} ×
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>行业标签过滤（可选）</Label>
          <div className="flex gap-2">
            <Input
              placeholder="输入标签后点击添加"
              value={industryTagInput}
              onChange={(e) => setIndustryTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddIndustryTag();
                }
              }}
            />
            <Button variant="outline" onClick={handleAddIndustryTag}>
              添加
            </Button>
          </div>
          {industryTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {industryTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => handleRemoveIndustryTag(tag)}
                >
                  {tag} ×
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="limit">返回数量</Label>
            <Input
              id="limit"
              type="number"
              min={1}
              max={50}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="min-similarity">最小相似度</Label>
            <Input
              id="min-similarity"
              type="number"
              min={0}
              max={1}
              step={0.1}
              value={minSimilarity}
              onChange={(e) => setMinSimilarity(Number(e.target.value))}
            />
          </div>
        </div>

        {/* 结果展示 */}
        <div className="border rounded-md p-4 max-h-96 overflow-auto">
          <div className="text-sm font-semibold mb-2">
            {testMutation.data
              ? `找到 ${testMutation.data.results.length} 个匹配的模版`
              : '匹配结果'}
          </div>
          {testMutation.isFetching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : testMutation.isError ? (
            <div className="text-sm text-destructive">
              {testMutation.error?.message || '匹配失败'}
            </div>
          ) : testMutation.data && testMutation.data.results.length > 0 ? (
            <div className="space-y-3">
              {testMutation.data.results.map((result, index) => (
                <div
                  key={result.template_id}
                  className="p-3 border rounded-md space-y-2"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">
                          #{index + 1} {result.meta.title || result.template_id}
                        </div>
                        <div className="text-xs font-mono text-muted-foreground break-all">
                          {result.template_id}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="success">
                          {(result.similarity * 100).toFixed(1)}%
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={
                            !!generatingTemplateId ||
                            testMutation.isFetching ||
                            !queryText.trim()
                          }
                          onClick={() =>
                            generateForTemplate(result.template_id, result.meta.title)
                          }
                        >
                          {generatingTemplateId === result.template_id ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              生成中...
                            </>
                          ) : (
                            '生成模版'
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <div>相似度：{(result.similarity * 100).toFixed(2)}%</div>
                      {result.meta.scene_tags && result.meta.scene_tags.length > 0 && (
                        <div className="mt-1">
                          场景标签：{result.meta.scene_tags.join('、')}
                        </div>
                      )}
                      {result.meta.industry_tags && result.meta.industry_tags.length > 0 && (
                        <div className="mt-1">
                          行业标签：{result.meta.industry_tags.join('、')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : testMutation.data && testMutation.data.results.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              没有找到匹配的模版
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              等待输入查询文本
            </div>
          )}
        </div>

        {/* 生成结果展示（按模版触发） */}
        {generated.length > 0 && (
          <div className="border rounded-md p-4">
            <div className="text-sm font-semibold mb-2">生成结果（按模版触发）</div>
            <div className="space-y-3">
              {generated.map((g) => (
                <div key={g.template_id} className="border rounded-md p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm">
                        {g.template_title ? g.template_title : g.template_id}
                      </div>
                      <div className="text-xs font-mono text-muted-foreground break-all">
                        {g.template_id}
                      </div>
                    </div>
                    {g.success ? (
                      <Badge variant="success">已生成</Badge>
                    ) : (
                      <Badge variant="destructive">失败</Badge>
                    )}
                  </div>

                  {g.success ? (
                    <pre className="text-xs whitespace-pre-wrap break-words bg-muted rounded-md p-3 max-h-64 overflow-auto">
                      {JSON.stringify(g.content, null, 2)}
                    </pre>
                  ) : (
                    <div className="text-xs text-destructive whitespace-pre-wrap break-words">
                      {g.error || '未知错误'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 预览弹窗（套用到作品后的效果） */}
        <ResponsiveDialog
          isOpen={showPreview}
          // onOpenChange={(open) => {
          //   if (!open) {
          //     setShowPreview(false);
          //     setPreviewWorksStore(null);
          //   }
          // }}
          description="已将生成内容套用到模版作品中，可在此预览效果"
          fullHeight={true}
          contentProps={{
            className: 'max-w-full w-full',
          }}
        >
          <div className="h-full overflow-auto">
            <Button className='absolute top-1 right-1 z-10' onClick={() => setShowPreview(false)}>关闭</Button>
            {previewWorksStore ? (
              <PreviewWorks worksStore={previewWorksStore} previewKey={previewKey} />
            ) : (
              <div className="text-sm text-muted-foreground">暂无预览数据</div>
            )}
          </div>
        </ResponsiveDialog>
      </div>

      <div className="flex gap-2 justify-end p-4">
        <Button variant="outline" onClick={handleClose}>
          关闭
        </Button>
        <Button
          onClick={handleTest}
          disabled={testMutation.isFetching || !queryText.trim()}
        >
          {testMutation.isFetching ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              匹配中...
            </>
          ) : (
            '开始匹配测试'
          )}
        </Button>
      </div>
    </ResponsiveDialog>
  );
}

function PreviewWorks({
  worksStore,
  previewKey,
}: {
  worksStore: WorksStore;
  previewKey: number;
}) {
  return (
    <GridCompWrapper
      readonly={false}
      // headerType={'none'}
      worksData={worksStore.worksData}
      worksDetail={worksStore.worksDetail}
      worksId={`preview-${previewKey}`}
    />
  );
}

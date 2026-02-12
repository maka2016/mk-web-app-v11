'use client';

import { DataPagination } from '@/components/DataPagination';
import { DateRangePicker } from '@/components/DateRangePicker';
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
import { cn } from '@workspace/ui/lib/utils';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';

/** runDetail 的完整类型（与 getRunDetail 返回一致） */
type RunDetail = {
  id: string;
  created_at: Date | string | null;
  updated_at: Date | string | null;
  uid: number | null;
  appid: string | null;
  template_id: string | null;
  template_title: string | null;
  user_input: string | null;
  status: string;
  error_message: string | null;
  final_snapshot: unknown;
  steps: Array<{
    id: string;
    iteration: number;
    step_type: string;
    model_name: string | null;
    duration_ms: number | null;
    prompt_text: string | null;
    response_text: string | null;
    response_json: unknown;
    execution_report: unknown;
    error: string | null;
  }>;
};

const PAGE_SIZE = 20;

type RunStatus = 'running' | 'success' | 'failed';

const STATUS_LABEL: Record<RunStatus, string> = {
  running: '进行中',
  success: '成功',
  failed: '失败',
};

const STATUS_BADGE: Record<
  RunStatus,
  'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'danger' | 'info'
> = {
  running: 'warning',
  success: 'success',
  failed: 'danger',
};

function formatDate(date: string | Date | null | undefined) {
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
}

function CollapsibleBlock({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-md border">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-muted/50"
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        {title}
      </button>
      {open && <div className="border-t p-3 text-sm">{children}</div>}
    </div>
  );
}

/** 生成可复制给 AI 分析的完整数据报告（纯文本） */
function buildDetailReport(detail: RunDetail): string {
  const lines: string[] = [];
  lines.push('# AI 生成流水详情报告');
  lines.push('');
  lines.push('## 基本信息');
  lines.push(`Run ID: ${detail.id}`);
  lines.push(`状态: ${detail.status}`);
  lines.push(`模版 ID: ${detail.template_id ?? '-'}`);
  lines.push(`模版标题: ${detail.template_title ?? '-'}`);
  lines.push(`UID: ${detail.uid ?? '-'}`);
  lines.push(`AppID: ${detail.appid ?? '-'}`);
  lines.push(`用户输入: ${detail.user_input ?? '-'}`);
  lines.push(`创建时间: ${formatDate(detail.created_at)}`);
  lines.push(`更新时间: ${formatDate(detail.updated_at)}`);
  if (detail.error_message) {
    lines.push('');
    lines.push('### 错误信息');
    lines.push(detail.error_message);
  }
  lines.push('');
  lines.push('## Steps 时间线');
  detail.steps.forEach((step, index) => {
    lines.push('');
    lines.push(`### Step ${index + 1} (迭代 ${step.iteration}, ${step.step_type})`);
    if (step.model_name) lines.push(`模型: ${step.model_name}`);
    if (step.duration_ms != null) lines.push(`耗时: ${step.duration_ms}ms`);
    if (step.error) lines.push(`错误: ${step.error}`);
    if (step.prompt_text != null && step.prompt_text !== '') {
      lines.push('');
      lines.push('#### Prompt');
      lines.push(step.prompt_text);
    }
    if (step.response_text != null && step.response_text !== '') {
      lines.push('');
      lines.push('#### 原始 Response');
      lines.push(step.response_text);
    }
    if (step.response_json != null) {
      lines.push('');
      lines.push('#### 解析后 JSON');
      lines.push(JSON.stringify(step.response_json, null, 2));
    }
    if (step.step_type === 'validate' && step.execution_report != null) {
      lines.push('');
      lines.push('#### Execution Report');
      lines.push(JSON.stringify(step.execution_report, null, 2));
    }
  });
  if (detail.final_snapshot != null) {
    lines.push('');
    lines.push('## 最终快照 (final_snapshot)');
    lines.push(JSON.stringify(detail.final_snapshot, null, 2));
  }
  lines.push('');
  lines.push('---');
  lines.push('（以上为完整结构化数据，可直接粘贴给 AI 分析）');
  return lines.join('\n');
}

export default function AIGenerationLogsPage() {
  const [page, setPage] = useState(1);
  const [templateIdFilter, setTemplateIdFilter] = useState('');
  const [uidFilter, setUidFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<RunStatus | 'all'>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [copyReportFeedback, setCopyReportFeedback] = useState(false);

  const dateFrom =
    dateRange?.from instanceof Date
      ? dateRange.from.toISOString()
      : undefined;
  const dateTo =
    dateRange?.to instanceof Date
      ? new Date(dateRange.to.getTime() + 86400000 - 1).toISOString()
      : undefined;

  const { data: listData, isLoading, refetch } = trpcReact.aiGenerationLog.listRuns.useQuery({
    template_id: templateIdFilter.trim() || undefined,
    uid: uidFilter.trim() ? Number(uidFilter) : undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
    date_from: dateFrom,
    date_to: dateTo,
    page,
    pageSize: PAGE_SIZE,
  });

  const { data: runDetail } = trpcReact.aiGenerationLog.getRunDetail.useQuery(
    { run_id: selectedRunId || '' },
    { enabled: !!selectedRunId && showDetailDialog }
  );

  const runs = listData?.runs ?? [];
  const total = listData?.total ?? 0;

  const handleViewDetail = (runId: string) => {
    setSelectedRunId(runId);
    setShowDetailDialog(true);
    setCopyReportFeedback(false);
  };

  const handleCopyReport = () => {
    if (!runDetail) return;
    const report = buildDetailReport(runDetail as RunDetail);
    void navigator.clipboard.writeText(report).then(() => {
      setCopyReportFeedback(true);
      setTimeout(() => setCopyReportFeedback(false), 2000);
    });
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">AI 生成流水</h1>
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

      {/* 筛选 */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-48">
          <Label className="text-xs text-muted-foreground">模版 ID</Label>
          <Input
            placeholder="模版 ID"
            value={templateIdFilter}
            onChange={(e) => {
              setTemplateIdFilter(e.target.value);
              setPage(1);
            }}
            variantSize="sm"
            className="mt-1"
          />
        </div>
        <div className="w-32">
          <Label className="text-xs text-muted-foreground">UID</Label>
          <Input
            placeholder="UID"
            value={uidFilter}
            onChange={(e) => {
              setUidFilter(e.target.value);
              setPage(1);
            }}
            variantSize="sm"
            className="mt-1"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as RunStatus | 'all');
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            {(Object.entries(STATUS_LABEL) as [RunStatus, string][]).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="w-[260px]">
          <DateRangePicker
            value={dateRange}
            onChange={(range) => {
              setDateRange(range);
              setPage(1);
            }}
            label="日期范围"
            id="ai-logs-date-range"
            placeholder="选择时间范围"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <Search className="h-4 w-4 mr-2" />
          查询
        </Button>
      </div>

      {/* 列表 */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>时间</TableHead>
              <TableHead>模版 ID</TableHead>
              <TableHead>模版标题</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>步数</TableHead>
              <TableHead className="w-[80px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : runs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  暂无记录
                </TableCell>
              </TableRow>
            ) : (
              runs.map((run) => (
                <TableRow key={run.id}>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(run.created_at)}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {run.template_id ?? '-'}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" title={run.template_title ?? undefined}>
                    {run.template_title ?? '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE[run.status as RunStatus] ?? 'outline'}>
                      {STATUS_LABEL[run.status as RunStatus] ?? run.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{run._count.steps}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetail(run.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DataPagination
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        showInfo
      />

      {/* 详情弹窗 */}
      <ResponsiveDialog
        isOpen={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        title="生成流水详情"
        showCloseIcon
        contentProps={{
          className: 'max-w-full w-[90vw]',
        }}
      >
        {runDetail && (
          <div className="space-y-4 p-4 max-h-[80vh] overflow-y-auto">
            <CollapsibleBlock title="复制给 AI 分析的完整数据报告" defaultOpen={true}>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    下方为本次流水完整结构化数据，可一键复制后粘贴给 AI 分析问题或复现。
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyReport}
                    className="shrink-0"
                  >
                    {copyReportFeedback ? (
                      '已复制'
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        复制完整报告
                      </>
                    )}
                  </Button>
                </div>
                <pre
                  className="whitespace-pre-wrap break-words text-xs bg-muted p-3 rounded max-h-64 overflow-auto border select-all font-mono"
                  role="document"
                  aria-label="完整数据报告"
                >
                  {buildDetailReport(runDetail as RunDetail)}
                </pre>
              </div>
            </CollapsibleBlock>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Run ID</Label>
                <p className="mt-1 font-mono break-all">{runDetail.id}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">状态</Label>
                <p className="mt-1">
                  <Badge variant={STATUS_BADGE[runDetail.status as RunStatus] ?? 'outline'}>
                    {STATUS_LABEL[runDetail.status as RunStatus] ?? runDetail.status}
                  </Badge>
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">模版 ID</Label>
                <p className="mt-1 font-mono">{runDetail.template_id ?? '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">模版标题</Label>
                <p className="mt-1 truncate" title={runDetail.template_title ?? undefined}>
                  {runDetail.template_title ?? '-'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">用户输入</Label>
                <p className="mt-1 line-clamp-2 text-muted-foreground">
                  {runDetail.user_input ?? '-'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">创建时间</Label>
                <p className="mt-1">{formatDate(runDetail.created_at)}</p>
              </div>
              {runDetail.error_message && (
                <div className="col-span-2">
                  <Label className="text-muted-foreground">错误信息</Label>
                  <p className="mt-1 p-2 bg-destructive/10 text-destructive rounded text-sm">
                    {runDetail.error_message}
                  </p>
                </div>
              )}
            </div>

            <div>
              <Label className="text-muted-foreground">Steps 时间线</Label>
              <div className="mt-2 space-y-3">
                {runDetail.steps.map((step) => (
                  <div
                    key={step.id}
                    className="rounded-lg border p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">
                        迭代 {step.iteration} · {step.step_type}
                      </Badge>
                      {step.model_name && (
                        <span className="text-muted-foreground">{step.model_name}</span>
                      )}
                      {step.duration_ms != null && (
                        <span className="text-muted-foreground">{step.duration_ms}ms</span>
                      )}
                      {step.error && (
                        <span className="text-destructive text-xs">{step.error}</span>
                      )}
                    </div>
                    <div className="grid gap-2">
                      {step.prompt_text != null && step.prompt_text !== '' && (
                        <CollapsibleBlock title="Prompt" defaultOpen={false}>
                          <pre className="whitespace-pre-wrap break-words text-xs bg-muted p-2 rounded max-h-48 overflow-auto">
                            {step.prompt_text}
                          </pre>
                        </CollapsibleBlock>
                      )}
                      {step.response_text != null && step.response_text !== '' && (
                        <CollapsibleBlock title="原始 Response" defaultOpen={false}>
                          <pre className="whitespace-pre-wrap break-words text-xs bg-muted p-2 rounded max-h-48 overflow-auto">
                            {step.response_text}
                          </pre>
                        </CollapsibleBlock>
                      )}
                      {step.response_json != null && (
                        <CollapsibleBlock title="解析后 JSON" defaultOpen={false}>
                          <pre className="whitespace-pre-wrap break-words text-xs bg-muted p-2 rounded max-h-48 overflow-auto">
                            {JSON.stringify(step.response_json, null, 2)}
                          </pre>
                        </CollapsibleBlock>
                      )}
                      {step.step_type === 'validate' &&
                        step.execution_report != null && (
                          <CollapsibleBlock title="Execution Report" defaultOpen={false}>
                            <pre className="whitespace-pre-wrap break-words text-xs bg-muted p-2 rounded max-h-48 overflow-auto">
                              {JSON.stringify(step.execution_report, null, 2)}
                            </pre>
                          </CollapsibleBlock>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {runDetail.final_snapshot != null && (
              <CollapsibleBlock title="最终快照 (final_snapshot)" defaultOpen={false}>
                <pre className="whitespace-pre-wrap break-words text-xs bg-muted p-2 rounded max-h-64 overflow-auto">
                  {JSON.stringify(runDetail.final_snapshot, null, 2)}
                </pre>
              </CollapsibleBlock>
            )}
          </div>
        )}
      </ResponsiveDialog>
    </div>
  );
}

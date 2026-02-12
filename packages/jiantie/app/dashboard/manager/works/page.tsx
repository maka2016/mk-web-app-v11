'use client';

import { DataPagination } from '@/components/DataPagination';
import { DateRangePicker } from '@/components/DateRangePicker';
import { getShareUrl } from '@/store';
import { trpcReact } from '@/utils/trpc';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
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
import { Edit, Eye, Loader2, RotateCcw, Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';

const PAGE_SIZE = 20;

function parseDateRangeFromUrl(
  searchParams: ReturnType<typeof useSearchParams>
): DateRange | undefined {
  const dateFromParam = searchParams.get('date_from');
  const dateToParam = searchParams.get('date_to');
  if (dateFromParam && dateToParam) {
    return {
      from: new Date(dateFromParam),
      to: new Date(dateToParam),
    };
  }
  if (dateFromParam) {
    return { from: new Date(dateFromParam), to: undefined };
  }
  return undefined;
}

/** 已提交的筛选条件（仅点击查询或翻页时更新，用于实际请求） */
function getSubmittedFromParams(sp: ReturnType<typeof useSearchParams>) {
  const dateRange = parseDateRangeFromUrl(sp);
  const createTimeFrom =
    dateRange?.from instanceof Date
      ? dateRange.from.toISOString().slice(0, 10)
      : undefined;
  const createTimeTo =
    dateRange?.to instanceof Date
      ? dateRange.to.toISOString().slice(0, 10)
      : undefined;
  return {
    uid: sp.get('uid') || '',
    keyword: sp.get('keyword') || '',
    deleted: sp.get('deleted') || 'all',
    spec_id: sp.get('spec_id') || '',
    template_id: sp.get('template_id') || '',
    work_id: sp.get('work_id') || '',
    appid: sp.get('appid') || '',
    version_min: sp.get('version_min') || '',
    is_paid: sp.get('is_paid') || 'all',
    page: Number(sp.get('page')) || 1,
    create_time_from: createTimeFrom,
    create_time_to: createTimeTo,
  };
}

export default function WorksManagerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 表单状态（用户编辑，不触发查询）
  const [uid, setUid] = useState(searchParams.get('uid') || '');
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [deleted, setDeleted] = useState<string>(
    searchParams.get('deleted') || 'all'
  );
  const [specId, setSpecId] = useState(searchParams.get('spec_id') || '');
  const [templateId, setTemplateId] = useState(
    searchParams.get('template_id') || ''
  );
  const [workId, setWorkId] = useState(searchParams.get('work_id') || '');
  const [appid, setAppid] = useState(searchParams.get('appid') || '');
  const [versionMin, setVersionMin] = useState(
    searchParams.get('version_min') || ''
  );
  const [isPaid, setIsPaid] = useState<string>(
    searchParams.get('is_paid') || 'all'
  );
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() =>
    parseDateRangeFromUrl(searchParams)
  );

  // 已提交的筛选（仅点击查询或翻页时更新，用于请求）
  const [submitted, setSubmitted] = useState(() =>
    getSubmittedFromParams(searchParams)
  );

  const listFilters = {
    uid: submitted.uid ? Number(submitted.uid) : undefined,
    work_id: submitted.work_id || undefined,
    keyword: submitted.keyword || undefined,
    deleted:
      submitted.deleted === 'all'
        ? undefined
        : submitted.deleted === 'true',
    spec_id: submitted.spec_id || undefined,
    template_id: submitted.template_id || undefined,
    appid: submitted.appid || undefined,
    version_gte: submitted.version_min
      ? Number(submitted.version_min)
      : undefined,
    is_paid: (submitted.is_paid === 'all' ? undefined : submitted.is_paid) as
      | 'paid'
      | 'unpaid'
      | undefined,
    create_time_from: submitted.create_time_from,
    create_time_to: submitted.create_time_to,
  };

  const countFilters = { ...listFilters };

  const { data: listData, isLoading } =
    trpcReact.works.findManyInternal.useQuery({
      ...listFilters,
      skip: (submitted.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    });

  const { data: totalCount = 0 } =
    trpcReact.works.countByUid.useQuery(countFilters);

  const { data: specsList = [] } = trpcReact.worksSpec.findMany.useQuery({
    deleted: false,
    take: 1000,
  });

  const utils = trpcReact.useUtils();
  const recoverMutation = trpcReact.works.recoverByUid.useMutation({
    onSuccess: () => {
      void utils.works.findManyInternal.invalidate();
      void utils.works.countByUid.invalidate();
    },
  });

  const updateURL = (s: typeof submitted) => {
    const params = new URLSearchParams();
    if (s.uid) params.set('uid', s.uid);
    if (s.keyword) params.set('keyword', s.keyword);
    if (s.deleted !== 'all') params.set('deleted', s.deleted);
    if (s.spec_id) params.set('spec_id', s.spec_id);
    if (s.template_id) params.set('template_id', s.template_id);
    if (s.work_id) params.set('work_id', s.work_id);
    if (s.appid) params.set('appid', s.appid);
    if (s.version_min) params.set('version_min', s.version_min);
    if (s.is_paid !== 'all') params.set('is_paid', s.is_paid);
    if (s.create_time_from) params.set('date_from', s.create_time_from);
    if (s.create_time_to) params.set('date_to', s.create_time_to);
    if (s.page > 1) params.set('page', String(s.page));
    router.replace(`/dashboard/manager/works?${params.toString()}`);
  };

  const handleSearch = () => {
    const createFrom =
      dateRange?.from instanceof Date
        ? dateRange.from.toISOString().slice(0, 10)
        : undefined;
    const createTo =
      dateRange?.to instanceof Date
        ? dateRange.to.toISOString().slice(0, 10)
        : undefined;
    const next: typeof submitted = {
      uid,
      keyword,
      deleted,
      spec_id: specId,
      template_id: templateId,
      work_id: workId,
      appid,
      version_min: versionMin,
      is_paid: isPaid,
      page: 1,
      create_time_from: createFrom,
      create_time_to: createTo,
    };
    setSubmitted(next);
    updateURL(next);
  };

  const handlePageChange = (newPage: number) => {
    const next = { ...submitted, page: newPage };
    setSubmitted(next);
    updateURL(next);
  };

  const handleRecover = async (item: { id: string; title?: string | null }) => {
    if (!confirm(`确定要恢复作品 "${item.title || item.id}" 吗？`)) return;
    try {
      await recoverMutation.mutateAsync({ id: item.id });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '未知错误';
      alert(`恢复失败: ${msg}`);
    }
  };

  const data = listData ?? [];

  return (
    <div className="mx-auto space-y-6 px-4">
      <div className="space-y-3 relative">
        <div className="flex flex-wrap items-center gap-3 sticky top-0 bg-background z-10 shadow-sm py-2">
          <div className="flex items-center gap-2">
            <Label className="min-w-[60px] text-sm font-medium">用户ID</Label>
            <Input
              type="number"
              placeholder="请输入用户ID"
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              className="h-9 w-[160px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="min-w-[70px] text-sm font-medium">作品ID</Label>
            <Input
              placeholder="作品ID"
              value={workId}
              onChange={(e) => setWorkId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              className="h-9 w-[180px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="min-w-[70px] text-sm font-medium">关键字</Label>
            <Input
              placeholder="搜索标题"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              className="h-9 w-[180px]"
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
          <div className="flex items-center gap-2">
            <Label className="min-w-[40px] text-sm font-medium">规格</Label>
            <Select
              value={specId || 'all'}
              onValueChange={(value) => setSpecId(value === 'all' ? '' : value)}
            >
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue placeholder="选择规格" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                {specsList.map((spec: { id: string; display_name?: string | null; name?: string | null; alias?: string | null }) => {
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
          <div className="flex items-center gap-2">
            <Label className="min-w-[60px] text-sm font-medium">
              模板ID
            </Label>
            <Input
              placeholder="模板ID"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              className="h-9 w-[160px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="min-w-[60px] text-sm font-medium">AppID</Label>
            <Input
              placeholder="AppID"
              value={appid}
              onChange={(e) => setAppid(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              className="h-9 w-[160px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="min-w-[80px] text-sm font-medium">版本≥</Label>
            <Input
              type="number"
              placeholder="版本号"
              value={versionMin}
              onChange={(e) => setVersionMin(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              className="h-9 w-[120px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="min-w-[70px] text-sm font-medium">
              付费状态
            </Label>
            <Select value={isPaid} onValueChange={setIsPaid}>
              <SelectTrigger className="h-9 w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="paid">已付费</SelectItem>
                <SelectItem value="unpaid">未付费</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            label="创建时间"
            placeholder="选择日期范围"
          />
          <Button onClick={handleSearch} size="sm" className="h-9">
            <Search className="h-4 w-4" />
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
                  <TableHead className="min-w-[120px] max-w-[120px] break-words whitespace-normal">
                    标题
                  </TableHead>
                  <TableHead className="min-w-[120px] max-w-[120px] break-words whitespace-normal">
                    描述
                  </TableHead>
                  <TableHead className="min-w-[80px] max-w-[150px]">
                    封面
                  </TableHead>
                  <TableHead className="min-w-[80px] max-w-[150px] break-words whitespace-normal">
                    用户ID
                  </TableHead>
                  <TableHead className="min-w-[100px] max-w-[150px] break-words whitespace-normal">
                    AppID
                  </TableHead>
                  <TableHead className="min-w-[120px] max-w-[120px] break-words whitespace-normal">
                    规格
                  </TableHead>
                  <TableHead className="min-w-[120px] max-w-[120px] break-words whitespace-normal">
                    模板ID
                  </TableHead>
                  <TableHead className="min-w-[100px] max-w-[120px] break-words whitespace-normal">
                    编辑版本
                  </TableHead>
                  <TableHead className="min-w-[120px] max-w-[120px] break-words whitespace-normal">
                    创建时间
                  </TableHead>
                  <TableHead className="min-w-[120px] max-w-[120px] break-words whitespace-normal">
                    更新时间
                  </TableHead>
                  <TableHead className="min-w-[120px] max-w-[120px]">
                    状态
                  </TableHead>
                  <TableHead className="min-w-[100px] max-w-[120px]">
                    付费状态
                  </TableHead>
                  <TableHead className="min-w-[280px] max-w-[320px]">
                    操作
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="min-w-[120px] max-w-[120px] break-words whitespace-normal">
                      {item.title}
                    </TableCell>
                    <TableCell className="text-muted-foreground min-w-[120px] max-w-[120px] break-words whitespace-normal">
                      {item.desc ?? '-'}
                    </TableCell>
                    <TableCell className="min-w-[80px] max-w-[150px]">
                      {item.cover ? (
                        <img
                          src={item.cover}
                          alt="cover"
                          className="h-16 w-16 rounded object-cover"
                        />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="min-w-[80px] max-w-[150px] break-words whitespace-normal">
                      {item.uid}
                    </TableCell>
                    <TableCell className="min-w-[100px] max-w-[150px] break-words whitespace-normal">
                      {item.appid ?? '-'}
                    </TableCell>
                    <TableCell className="min-w-[120px] max-w-[120px] break-words whitespace-normal">
                      {item.specInfo?.display_name ??
                        item.specInfo?.name ??
                        '-'}
                    </TableCell>
                    <TableCell className="min-w-[120px] max-w-[120px] break-words whitespace-normal">
                      {item.template_id ?? '-'}
                    </TableCell>
                    <TableCell className="min-w-[100px] max-w-[120px] break-words whitespace-normal">
                      {item.version ?? '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground min-w-[120px] max-w-[120px] break-words whitespace-normal text-sm">
                      {item.create_time
                        ? new Date(item.create_time).toLocaleString('zh-CN')
                        : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground min-w-[120px] max-w-[120px] break-words whitespace-normal text-sm">
                      {item.update_time
                        ? new Date(item.update_time).toLocaleString('zh-CN')
                        : '-'}
                    </TableCell>
                    <TableCell className="min-w-[80px] max-w-[120px]">
                      <span
                        className={`rounded px-2 py-1 text-xs ${item.deleted
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-green-500/10 text-green-600'
                          }`}
                      >
                        {item.deleted ? '已删除' : '正常'}
                      </span>
                    </TableCell>
                    <TableCell className="min-w-[100px] max-w-[120px]">
                      <span
                        className={`rounded px-2 py-1 text-xs ${item.is_paid
                          ? 'bg-blue-500/10 text-blue-600'
                          : 'bg-gray-500/10 text-gray-600'
                          }`}
                      >
                        {item.is_paid ? '已付费' : '未付费'}
                      </span>
                    </TableCell>
                    <TableCell className="min-w-[280px] max-w-[320px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            window.open(getShareUrl(item.id), '_blank');
                          }}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          预览
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            window.open(
                              `/mobile/editor?works_id=${item.id}&no_save=1`,
                              '_blank'
                            );
                          }}
                        >
                          <Edit className="mr-1 h-4 w-4" />
                          编辑
                        </Button>
                        {item.template_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const url = `/mobile/template?id=${item.template_id}&appid=jiantie&template_name=${encodeURIComponent(item.title || '')}`;
                              window.open(url, '_blank');
                            }}
                          >
                            <Eye className="mr-1 h-4 w-4" />
                            打开模版
                          </Button>
                        )}
                        {item.deleted && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRecover(item)}
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
    </div>
  );
}

'use client';

//makav7作品风控页面
//读取work_audit_results和对应的work_info，显示列表（默认按照uv倒序）
//顶部页面切换器：可疑&高危作品、通过作品、白名单作品
//每页有快捷筛选器，已人工标记、待已人工标记处理
//显示数据：作品封面、作品名称（点击查看作品）、风控时间、作品创建时间、作品更新时间、pvuv、历史pvuv、机审状态、风控等级、原因、操作、标记为白名单、去封禁uid）

import { cdnApi } from '@/services';
import { trpc } from '@/utils/trpc';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@workspace/ui/components/pagination';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Switch } from '@workspace/ui/components/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table';
import { Tabs, TabsList, TabsTrigger } from '@workspace/ui/components/tabs';
import dayjs from 'dayjs';
import {
  AlertTriangle,
  Loader2,
  Search,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

const PAGE_SIZE = 100;

type PageType = 'suspicious_high' | 'pass' | 'whitelist';
type ManualTagFilter = 'all' | 'tagged' | 'untagged';

interface AuditResultItem {
  id: string;
  workId: string;
  uid: number;
  type: string;
  pv: number;
  uv: number;
  historyPv: number;
  historyUv: number;
  lastReviewTime: Date | string | null;
  reviewCount: number;
  manualTag: string | null;
  workInfo: {
    id: string;
    workId: string;
    title: string;
    cover: string | null;
    status: number | null;
    createTime: Date | string | null;
    updateTime: Date | string | null;
    features: {
      userInfo?: {
        registerTime?: Date | string | null;
        userName?: string | null;
      };
    } | null;
  } | null;
  latestAudit: {
    id: string;
    machineReviewResult: 'waiting' | 'pass' | 'failed' | null;
    machineRiskLevel: 'low' | 'suspicious' | 'high' | null;
    reason: string | null;
    reviewTime: Date | string | null;
    passType: string;
  } | null;
}

export default function RiskResultPage() {
  const [pageType, setPageType] = useState<PageType>('suspicious_high');
  const [manualTagFilter, setManualTagFilter] =
    useState<ManualTagFilter>('untagged');
  const [data, setData] = useState<AuditResultItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [workIdSearch, setWorkIdSearch] = useState('');
  const [uidSearch, setUidSearch] = useState('');
  const [keywordSearch, setKeywordSearch] = useState('');
  const [onlyNewWork, setOnlyNewWork] = useState(false);
  const [onlyNewUser, setOnlyNewUser] = useState(false);
  const [showConfirmViolationDialog, setShowConfirmViolationDialog] =
    useState(false);
  const [confirmingWorkId, setConfirmingWorkId] = useState<string | null>(null);
  const [showFeatureDialog, setShowFeatureDialog] = useState(false);
  const [selectedFeatures, setSelectedFeatures] = useState<any>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 判断是否为新作品（24小时内创建）
  const isNewWork = (createTime: Date | string | null): boolean => {
    if (!createTime) return false;
    const create = dayjs(createTime);
    const now = dayjs();
    const diffHours = now.diff(create, 'hour');
    return diffHours < 24;
  };

  // 判断是否为新用户（当天新注册）
  const isNewUser = (registerTime: Date | string | null): boolean => {
    if (!registerTime) return false;
    const register = dayjs(registerTime);
    const today = dayjs().startOf('day');
    const registerDay = register.startOf('day');
    return registerDay.isSame(today);
  };

  // 加载数据
  const loadData = async (targetPage = page) => {
    setLoading(true);
    try {
      const result = await trpc.risk.listAuditResults.query({
        pageType,
        manualTagFilter,
        orderBy: 'lastReviewTime',
        orderDirection: 'desc',
        skip: (targetPage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        workId: workIdSearch || undefined,
        uid: uidSearch ? parseInt(uidSearch, 10) : undefined,
        keyword: keywordSearch || undefined,
        onlyNewWork: onlyNewWork || undefined,
        onlyNewUser: onlyNewUser || undefined,
      });

      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (error) {
      toast.error('加载数据失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(1);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageType, manualTagFilter, onlyNewWork, onlyNewUser]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  // 查看作品
  const handleViewWorks = (worksId: string, uid: number) => {
    const workUrl = `https://www.maka.im//mk-viewer-7/website/${uid}/${worksId}?backDoor=1`;
    window.open(workUrl, '_blank');
  };

  // 标记为白名单
  const handleMarkAsWhitelist = async (workId: string) => {
    if (!confirm('确定要将此作品通过并标记为白名单吗？')) {
      return;
    }

    try {
      await trpc.risk.markAsWhitelist.mutate({ workId });
      toast.success('标记成功');

      // 只更新当前操作的数据项，不重新加载所有数据
      setData(prevData =>
        prevData.map(item => {
          if (item.workId === workId) {
            return {
              ...item,
              manualTag: 'whitelist',
              lastReviewTime: new Date(),
              reviewCount: item.reviewCount + 1,
              latestAudit: {
                ...(item.latestAudit || {}),
                id: item.latestAudit?.id || '',
                machineReviewResult: 'pass' as const,
                passType: 'whiteWork',
                machineRiskLevel: 'low' as const,
                reason: '人工标记为白名单',
                reviewTime: new Date(),
              },
            };
          }
          return item;
        })
      );
    } catch (error: any) {
      toast.error(error.message || '标记失败');
      console.error(error);
    }
  };

  // 刷新用户作品状态
  const handleRefreshWorkStatus = async (uid: number) => {
    try {
      toast.loading('正在刷新作品状态...', { id: 'refresh-status' });
      // 从数据库刷新用户作品状态
      await trpc.risk.refreshUserWorksStatus.mutate({ uid });
      // 重新加载列表数据
      await loadData();
      toast.success('作品状态已更新', { id: 'refresh-status' });
    } catch (error: any) {
      console.error('刷新作品状态失败:', error);
      toast.error(`刷新失败: ${error.message || '未知错误'}`, {
        id: 'refresh-status',
      });
    }
  };

  // 跳转到用户管理页面
  const handleBanUser = async (uid: number) => {
    const banUrl = `http://cms.maka.mobi/user/manage?uid=${uid}`;
    window.open(banUrl, '_blank');

    // 清除之前的定时器
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    // 15秒后自动更新作品状态
    refreshTimerRef.current = setTimeout(async () => {
      try {
        toast.success('正在从数据库刷新作品状态...');
        // 先刷新用户作品状态（从 platv5_works 读取并同步到 workInfo 表）
        await trpc.risk.refreshUserWorksStatus.mutate({ uid });
        // 然后重新加载列表数据
        await loadData();
        toast.success('作品状态已更新');
      } catch (error: any) {
        console.error('刷新作品状态失败:', error);
        toast.error(`刷新失败: ${error.message || '未知错误'}`);
      } finally {
        refreshTimerRef.current = null;
      }
    }, 10000);
  };

  // 确认违规
  const handleConfirmViolation = (workId: string) => {
    setConfirmingWorkId(workId);
    setShowConfirmViolationDialog(true);
  };

  // 显示 feature 信息
  const handleShowFeatures = (features: any) => {
    setSelectedFeatures(features);
    setShowFeatureDialog(true);
  };

  // 确认已手动封禁
  const handleConfirmBan = async () => {
    if (!confirmingWorkId) return;

    try {
      await trpc.risk.confirmViolation.mutate({ workId: confirmingWorkId });
      toast.success('已确认违规并标记');
      setShowConfirmViolationDialog(false);

      // 只更新当前操作的数据项，不重新加载所有数据
      setData(prevData =>
        prevData.map(item => {
          if (item.workId === confirmingWorkId) {
            return {
              ...item,
              manualTag: 'violation',
              lastReviewTime: new Date(),
              reviewCount: item.reviewCount + 1,
              latestAudit: {
                ...(item.latestAudit || {}),
                id: item.latestAudit?.id || '',
                machineReviewResult: 'failed' as const,
                passType: 'manual',
                machineRiskLevel: 'high' as const,
                reason: '人工确认违规并已手动封禁',
                reviewTime: new Date(),
              },
            };
          }
          return item;
        })
      );

      setConfirmingWorkId(null);
    } catch (error: any) {
      toast.error(error.message || '确认失败');
      console.error(error);
    }
  };

  // 搜索
  const handleSearch = () => {
    setPage(1);
    loadData(1);
  };

  // 获取风险等级显示
  const getRiskLevelDisplay = (
    level: 'low' | 'suspicious' | 'high' | null
  ): { text: string; color: string } | '-' => {
    if (!level) return '-';
    const map: Record<
      'low' | 'suspicious' | 'high',
      { text: string; color: string }
    > = {
      low: { text: '无', color: 'bg-gray-100 text-gray-800' },
      suspicious: { text: '可疑', color: 'bg-yellow-100 text-yellow-800' },
      high: { text: '高危', color: 'bg-red-100 text-red-800' },
    };
    return map[level];
  };

  // 获取机审状态显示
  const getReviewStatusDisplay = (
    status: 'waiting' | 'pass' | 'failed' | null
  ): { text: string; color: string } | '-' => {
    if (!status) return '-';
    const map: Record<
      'waiting' | 'pass' | 'failed',
      { text: string; color: string }
    > = {
      waiting: { text: '待审核', color: 'bg-gray-100 text-gray-800' },
      pass: { text: '通过', color: 'bg-green-100 text-green-800' },
      failed: { text: '失败', color: 'bg-red-100 text-red-800' },
    };
    return map[status];
  };

  // 获取作品状态显示
  const getWorkStatusDisplay = (
    status: number | null
  ): { text: string; color: string } | '-' => {
    if (status === null || status === undefined) return '-';
    if (status === -3) {
      return { text: '平台下线', color: 'bg-red-100 text-red-800' };
    }
    if (status === -1 || status === -2) {
      return { text: '用户下线', color: 'bg-yellow-100 text-yellow-800' };
    }
    if (status >= 0) {
      return { text: '上线', color: 'bg-green-100 text-green-800' };
    }
    return '-';
  };

  return (
    <div className='container mx-auto py-6 px-4'>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold mb-2'>作品审核记录</h1>
        <p className='text-muted-foreground'>管理 makav7 作品的风控审核记录</p>
      </div>

      {/* 顶部页面切换器 */}
      <div className='mb-6'>
        <Tabs value={pageType} onValueChange={v => setPageType(v as PageType)}>
          <TabsList>
            <TabsTrigger value='suspicious_high'>可疑&高危作品</TabsTrigger>
            <TabsTrigger value='pass'>通过作品</TabsTrigger>
            <TabsTrigger value='whitelist'>白名单作品</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 筛选器和搜索 */}
      <div className='mb-6 space-y-3'>
        <div className='flex gap-2 items-center'>
          <Tabs
            value={manualTagFilter}
            onValueChange={v => setManualTagFilter(v as ManualTagFilter)}
          >
            <TabsList>
              <TabsTrigger value='all'>全部</TabsTrigger>
              <TabsTrigger value='tagged'>已人工标记</TabsTrigger>
              <TabsTrigger value='untagged'>待人工标记处理</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className='flex-1 relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4' />
            <Input
              placeholder='搜索作品标题...'
              value={keywordSearch}
              onChange={e => setKeywordSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              className='pl-10'
            />
          </div>
          <Input
            placeholder='作品ID'
            value={workIdSearch}
            onChange={e => setWorkIdSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            className='w-40'
          />
          <Input
            placeholder='用户ID'
            type='number'
            value={uidSearch}
            onChange={e => setUidSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            className='w-40'
          />
          <Button onClick={handleSearch}>搜索</Button>
        </div>
        <div className='flex gap-4 items-center'>
          <label className='flex items-center gap-2 cursor-pointer'>
            <Switch checked={onlyNewWork} onCheckedChange={setOnlyNewWork} />
            <span className='text-sm'>仅新作品</span>
          </label>
          <label className='flex items-center gap-2 cursor-pointer'>
            <Switch checked={onlyNewUser} onCheckedChange={setOnlyNewUser} />
            <span className='text-sm'>仅新用户</span>
          </label>
        </div>
      </div>

      {/* 统计信息 */}
      <div className='mb-4 text-sm text-muted-foreground'>
        共 {total} 条记录
      </div>

      {/* 数据列表 */}
      <div className='rounded-lg border bg-card mb-6'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-24'>封面</TableHead>
              <TableHead>作品名称</TableHead>
              <TableHead className='w-32'>作品状态</TableHead>
              <TableHead className='w-32'>风控时间</TableHead>
              <TableHead className='w-32'>创建时间</TableHead>
              <TableHead className='w-32'>更新时间</TableHead>
              <TableHead className='w-24'>近期PV/UV</TableHead>
              <TableHead className='w-24'>历史PV/UV</TableHead>
              <TableHead className='w-32'>用户注册时间</TableHead>
              <TableHead className='w-24'>机审状态</TableHead>
              <TableHead className='w-24'>风控等级</TableHead>
              <TableHead className='w-40'>原因</TableHead>
              <TableHead className='w-48 text-right'>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={13} className='text-center py-8'>
                  <Loader2 className='w-6 h-6 animate-spin mx-auto' />
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={13}
                  className='text-center py-8 text-muted-foreground'
                >
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              data.map(item => (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.workInfo?.cover ? (
                      <div className='w-20 h-20 relative rounded overflow-hidden'>
                        <img
                          src={item.workInfo.cover}
                          alt={item.workInfo.title}
                          className='w-full h-full object-cover cursor-pointer'
                          onClick={() =>
                            handleShowFeatures(item.workInfo?.features)
                          }
                        />
                        <div className='absolute top-1 left-1 flex flex-col gap-1'>
                          {isNewWork(item.workInfo?.createTime ?? null) && (
                            <Badge
                              variant='info'
                              className='text-xs px-1.5 py-0'
                            >
                              新作品
                            </Badge>
                          )}
                          {isNewUser(
                            item.workInfo?.features?.userInfo?.registerTime ??
                              null
                          ) && (
                            <Badge
                              variant='success'
                              className='text-xs px-1.5 py-0'
                            >
                              新用户
                            </Badge>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div
                        className='w-16 h-16 relative bg-muted rounded flex items-center justify-center text-muted-foreground text-xs cursor-pointer'
                        onClick={() =>
                          handleShowFeatures(item.workInfo?.features)
                        }
                      >
                        无封面
                        <div className='absolute top-1 left-1 flex flex-col gap-1'>
                          {isNewWork(item.workInfo?.createTime ?? null) && (
                            <Badge
                              variant='info'
                              className='text-xs px-1.5 py-0'
                            >
                              新作品
                            </Badge>
                          )}
                          {isNewUser(
                            item.workInfo?.features?.userInfo?.registerTime ??
                              null
                          ) && (
                            <Badge
                              variant='success'
                              className='text-xs px-1.5 py-0'
                            >
                              新用户
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div
                      className='font-medium cursor-pointer hover:text-primary'
                      onClick={() => handleViewWorks(item.workId, item.uid)}
                    >
                      {item.workInfo?.title || '未知作品'}
                    </div>
                    <div className='text-sm text-muted-foreground'>
                      ID: {item.workId}
                    </div>
                    {item.manualTag && (
                      <div className='text-xs text-blue-600 mt-1'>
                        标签: {item.manualTag}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const status = getWorkStatusDisplay(
                        item.workInfo?.status ?? null
                      );
                      if (status === '-') return '-';
                      return (
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.color} cursor-pointer hover:opacity-80 transition-opacity`}
                          onClick={() => handleRefreshWorkStatus(item.uid)}
                          title='点击刷新作品状态'
                        >
                          {status.text}
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    {item.lastReviewTime
                      ? dayjs(item.lastReviewTime).format('YYYY-MM-DD HH:mm')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {item.workInfo?.createTime
                      ? dayjs(item.workInfo.createTime).format(
                          'YYYY-MM-DD HH:mm'
                        )
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {item.workInfo?.updateTime
                      ? dayjs(item.workInfo.updateTime).format(
                          'YYYY-MM-DD HH:mm'
                        )
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <div className='text-sm'>
                      <div>PV: {item.pv}</div>
                      <div>UV: {item.uv}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className='text-sm'>
                      <div>PV: {item.historyPv}</div>
                      <div>UV: {item.historyUv}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.workInfo?.features?.userInfo?.registerTime
                      ? dayjs(
                          item.workInfo.features.userInfo.registerTime
                        ).format('YYYY-MM-DD HH:mm')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      if (!item.latestAudit?.machineReviewResult) return '-';
                      const status = getReviewStatusDisplay(
                        item.latestAudit.machineReviewResult
                      );
                      if (status === '-') return '-';
                      return (
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.color}`}
                        >
                          {status.text}
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      if (!item.latestAudit?.machineRiskLevel) return '-';
                      const level = getRiskLevelDisplay(
                        item.latestAudit.machineRiskLevel
                      );
                      if (level === '-') return '-';
                      return (
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${level.color}`}
                        >
                          {level.text}
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    <div className='text-sm text-muted-foreground max-w-40 '>
                      {item.latestAudit?.reason || '-'}
                    </div>
                  </TableCell>
                  <TableCell className='text-right'>
                    <div className='flex flex-col items-end gap-1'>
                      <Button
                        variant='outline'
                        size='sm'
                        className='h-7 px-2 text-xs'
                        onClick={() => handleMarkAsWhitelist(item.workId)}
                      >
                        <ShieldCheck className='w-3 h-3 mr-1' />
                        标记通过
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        className='h-7 px-2 text-xs'
                        onClick={() => handleConfirmViolation(item.workId)}
                      >
                        <AlertTriangle className='w-3 h-3 mr-1' />
                        标记违规
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        className='h-7 px-2 text-xs'
                        onClick={() => handleBanUser(item.uid)}
                      >
                        <Shield className='w-3 h-3 mr-1' />
                        封禁用户
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      {total > PAGE_SIZE && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => {
                  if (page > 1) {
                    setPage(page - 1);
                  }
                }}
                className={
                  page === 1
                    ? 'pointer-events-none opacity-50'
                    : 'cursor-pointer'
                }
              />
            </PaginationItem>
            {Array.from(
              { length: Math.ceil(total / PAGE_SIZE) },
              (_, i) => i + 1
            )
              .filter(
                pageNum =>
                  pageNum === 1 ||
                  pageNum === Math.ceil(total / PAGE_SIZE) ||
                  Math.abs(pageNum - page) <= 2
              )
              .map((pageNum, index, array) => (
                <div key={pageNum} className='flex items-center'>
                  {index > 0 && array[index - 1] !== pageNum - 1 && (
                    <PaginationEllipsis />
                  )}
                  <PaginationItem>
                    <PaginationLink
                      onClick={() => setPage(pageNum)}
                      isActive={pageNum === page}
                      className='cursor-pointer'
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                </div>
              ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => {
                  if (page < Math.ceil(total / PAGE_SIZE)) {
                    setPage(page + 1);
                  }
                }}
                className={
                  page >= Math.ceil(total / PAGE_SIZE)
                    ? 'pointer-events-none opacity-50'
                    : 'cursor-pointer'
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* 确认违规弹窗 */}
      <ResponsiveDialog
        isOpen={showConfirmViolationDialog}
        onOpenChange={setShowConfirmViolationDialog}
        title='确认违规'
      >
        <div className='p-6 space-y-4'>
          <p className='text-base'>确认已手动封禁？</p>
          <div className='flex justify-end gap-2'>
            <Button
              variant='outline'
              onClick={() => {
                setShowConfirmViolationDialog(false);
                setConfirmingWorkId(null);
              }}
            >
              取消
            </Button>
            <Button onClick={handleConfirmBan}>确认</Button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* Feature 信息弹窗 */}
      <ResponsiveDialog
        isOpen={showFeatureDialog}
        onOpenChange={setShowFeatureDialog}
        title='Feature 信息'
        contentProps={{
          className: 'max-w-[900px] max-h-[80vh]',
        }}
      >
        <div className='p-6 overflow-auto'>
          {selectedFeatures ? (
            <div className='space-y-6'>
              {/* 用户信息 */}
              {selectedFeatures.userInfo && (
                <div className='space-y-2'>
                  <h3 className='font-semibold text-base'>用户信息</h3>
                  <div className='bg-muted p-4 rounded-lg space-y-2'>
                    {selectedFeatures.userInfo.userName && (
                      <div>
                        <span className='text-muted-foreground'>用户名：</span>
                        <span className='ml-2'>
                          {selectedFeatures.userInfo.userName}
                        </span>
                      </div>
                    )}
                    {selectedFeatures.userInfo.registerTime && (
                      <div>
                        <span className='text-muted-foreground'>
                          注册时间：
                        </span>
                        <span className='ml-2'>
                          {dayjs(selectedFeatures.userInfo.registerTime).format(
                            'YYYY-MM-DD HH:mm:ss'
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 文本内容 */}
              {selectedFeatures.textContents &&
                Array.isArray(selectedFeatures.textContents) &&
                selectedFeatures.textContents.length > 0 && (
                  <div className='space-y-2'>
                    <h3 className='font-semibold text-base'>文本内容</h3>
                    <div className='bg-muted p-4 rounded-lg'>
                      <div className='text-sm whitespace-nowrap overflow-x-auto'>
                        {selectedFeatures.textContents.join(' ')}
                      </div>
                    </div>
                  </div>
                )}

              {/* 用户上传图片 */}
              {selectedFeatures.userUploadedImageUrls &&
                Array.isArray(selectedFeatures.userUploadedImageUrls) &&
                selectedFeatures.userUploadedImageUrls.length > 0 && (
                  <div className='space-y-2'>
                    <h3 className='font-semibold text-base'>用户上传图片</h3>
                    <div className='bg-muted p-4 rounded-lg'>
                      <div className='grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2'>
                        {selectedFeatures.userUploadedImageUrls.map(
                          (url: string, index: number) => (
                            <div
                              key={index}
                              className='relative aspect-square rounded overflow-hidden border cursor-pointer'
                              onClick={() => window.open(url, '_blank')}
                            >
                              <img
                                src={cdnApi(url)}
                                alt={`用户上传图片 ${index + 1}`}
                                className='w-full h-full object-contain'
                                onError={e => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-xs text-muted-foreground p-2 break-all">${url}</div>`;
                                  }
                                }}
                              />
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}

              {/* 外链 */}
              {selectedFeatures.linkUrls &&
                Array.isArray(selectedFeatures.linkUrls) &&
                selectedFeatures.linkUrls.length > 0 && (
                  <div className='space-y-2'>
                    <h3 className='font-semibold text-base'>外链</h3>
                    <div className='bg-muted p-4 rounded-lg space-y-2'>
                      {selectedFeatures.linkUrls.map(
                        (url: string, index: number) => (
                          <div
                            key={index}
                            className='text-sm break-all p-2 bg-background rounded'
                          >
                            <a
                              href={url}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='text-primary hover:underline'
                            >
                              {url}
                            </a>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

              {/* 原始 JSON（折叠显示） */}
              <details className='space-y-2'>
                <summary className='font-semibold text-base cursor-pointer'>
                  原始 JSON 数据
                </summary>
                <pre className='bg-muted p-4 rounded-lg overflow-auto text-xs max-h-60'>
                  {JSON.stringify(selectedFeatures, null, 2)}
                </pre>
              </details>
            </div>
          ) : (
            <div className='text-center text-muted-foreground py-8'>
              暂无 Feature 信息
            </div>
          )}
        </div>
      </ResponsiveDialog>
    </div>
  );
}

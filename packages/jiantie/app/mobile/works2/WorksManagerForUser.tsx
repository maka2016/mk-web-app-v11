'use client';

import { RSVPShareOptions } from '@/components/RSVP/RSVPShareOptions';
import { getAppId, getUid } from '@/services';
import { useStore } from '@/store';
import { getUrlWithParam } from '@/utils';
import { trpc } from '@/utils/trpc';
import APPBridge from '@mk/app-bridge';
import { cdnApi } from '@mk/services';
import type { WorksEntity } from '@workspace/database/generated/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog';
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
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  ChevronRight,
  Clock,
  Copy,
  Eye,
  FileText,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

dayjs.extend(relativeTime);

// tRPC 传输类型：将 Date 类型转换为 string
type SerializedWorksEntity = Omit<
  WorksEntity,
  'create_time' | 'update_time' | 'custom_time'
> & {
  create_time: string;
  update_time: string;
  custom_time: string | null;
};

// 作品详情类型（包含 specInfo）
type WorksDetail = SerializedWorksEntity & {
  specInfo?: {
    id: string;
    name: string;
    display_name: string;
    export_format: string[];
  } | null;
};

// RSVP 统计信息
type RSVPStats = {
  invited: number;
  replied: number;
};

export default function WorksManagerForUser() {
  const router = useRouter();
  const appid = getAppId();
  const { permissions } = useStore();
  const [worksList, setWorksList] = useState<SerializedWorksEntity[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedWork, setSelectedWork] = useState<WorksDetail | null>(null);
  const [rsvpStats, setRsvpStats] = useState<RSVPStats | null>(null);
  const [rsvpStatsMap, setRsvpStatsMap] = useState<Map<string, RSVPStats>>(
    new Map()
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workToDelete, setWorkToDelete] =
    useState<SerializedWorksEntity | null>(null);
  const [formConfigId, setFormConfigId] = useState<string | null>(null);

  // 获取 RSVP 统计信息
  const loadRSVPStats = async (worksIds: string[]) => {
    if (worksIds.length === 0) return;

    const statsMap = new Map<string, RSVPStats>();

    // 批量获取所有 RSVP 作品的统计信息
    await Promise.all(
      worksIds.map(async worksId => {
        try {
          const formConfig = await trpc.rsvp.getFormConfigByWorksId.query({
            works_id: worksId,
          });

          if (formConfig) {
            const invitees =
              await trpc.rsvp.getInviteesWithResponseStatus.query({
                form_config_id: formConfig.id,
              });

            const invited = invitees?.length || 0;
            const replied =
              invitees?.filter((item: any) => item.has_response).length || 0;

            statsMap.set(worksId, { invited, replied });
          } else {
            statsMap.set(worksId, { invited: 0, replied: 0 });
          }
        } catch (error) {
          console.error(`Failed to load RSVP stats for ${worksId}:`, error);
          statsMap.set(worksId, { invited: 0, replied: 0 });
        }
      })
    );

    setRsvpStatsMap(prev => {
      const newMap = new Map(prev);
      statsMap.forEach((value, key) => {
        newMap.set(key, value);
      });
      return newMap;
    });
  };

  // 加载作品列表
  const loadWorks = async (pageNum = page) => {
    const currentUid = getUid();
    if (!currentUid) {
      return;
    }

    setLoading(true);
    try {
      const [works, count] = await Promise.all([
        trpc.works.findMany.query({
          deleted: false,
          is_folder: false,
          skip: (pageNum - 1) * pageSize,
          take: pageSize,
        }),
        trpc.works.count.query({
          deleted: false,
          is_folder: false,
        }),
      ]);

      setWorksList(works);
      setTotal(count);

      // 为所有 RSVP 类型的作品加载统计信息
      const rsvpWorksIds = works
        .filter(work => work.is_rsvp)
        .map(work => work.id);
      if (rsvpWorksIds.length > 0) {
        loadRSVPStats(rsvpWorksIds);
      }
    } catch (error) {
      toast.error('加载作品列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 获取作品详情
  const loadWorkDetail = async (work: SerializedWorksEntity) => {
    try {
      const detail = await trpc.works.findById.query({ id: work.id });
      const workDetail = detail as WorksDetail;

      // 如果是 RSVP 类型，获取统计信息
      if (workDetail.is_rsvp) {
        try {
          const formConfig = await trpc.rsvp.getFormConfigByWorksId.query({
            works_id: work.id,
          });

          if (formConfig) {
            setFormConfigId(formConfig.id);
            const invitees =
              await trpc.rsvp.getInviteesWithResponseStatus.query({
                form_config_id: formConfig.id,
              });

            const invited = invitees?.length || 0;
            const replied =
              invitees?.filter((item: any) => item.has_response).length || 0;

            setRsvpStats({ invited, replied });
          } else {
            setFormConfigId(null);
            setRsvpStats({ invited: 0, replied: 0 });
          }
        } catch (error) {
          console.error('Failed to load RSVP stats:', error);
          setFormConfigId(null);
          setRsvpStats({ invited: 0, replied: 0 });
        }
      } else {
        setFormConfigId(null);
        setRsvpStats(null);
      }

      setSelectedWork(workDetail);
      setDetailOpen(true);
    } catch (error) {
      toast.error('加载作品详情失败');
      console.error(error);
    }
  };

  // 判断作品类型
  const getWorkType = (work: WorksDetail): 'rsvp' | 'image' | 'webpage' => {
    if (work.is_rsvp) {
      return 'rsvp';
    }
    if (work.specInfo?.export_format) {
      if (work.specInfo.export_format.includes('html')) {
        return 'webpage';
      }
      if (
        work.specInfo.export_format.includes('image') ||
        work.specInfo.export_format.includes('video')
      ) {
        return 'image';
      }
    }
    return 'webpage'; // 默认
  };

  // 获取购买状态标签
  const getPurchaseStatus = () => {
    // TODO: 这里需要根据实际业务逻辑判断是否已购买
    // 暂时返回 null，后续可以根据需要实现
    return null;
  };

  // 预览作品
  const handlePreview = (work: WorksDetail) => {
    const uid = getUid();
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}/mobile/preview?works_id=${work.id}&uid=${uid}&is_full_screen=1&back=1`,
        type: 'URL',
      });
    } else {
      router.push(
        getUrlWithParam(
          `/mobile/preview?works_id=${work.id}&uid=${uid}&appid=${appid}`,
          'clickid'
        )
      );
    }
    setDetailOpen(false);
  };

  // 编辑作品
  const handleEdit = (work: WorksDetail) => {
    const uid = getUid();

    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}/editor?works_id=${work.id}&uid=${uid}&is_full_screen=1&popEnable=0&simple_mode=true`,
        type: 'URL',
      });
    } else {
      router.push(
        getUrlWithParam(
          `/editor?works_id=${work.id}&uid=${uid}&appid=${appid}&simple_mode=true`,
          'clickid'
        )
      );
    }
    setDetailOpen(false);
  };

  // 复制作品
  const handleCopy = async (work: WorksDetail) => {
    if (total >= +(permissions.works_num || 0)) {
      toast.error('创作数量已达上限');
      return;
    }

    try {
      await trpc.works.duplicate.mutate({ id: work.id });
      toast.success('复制成功');
      setDetailOpen(false);
      // 重新加载列表
      loadWorks(page);
    } catch (error) {
      toast.error('复制失败');
      console.error(error);
    }
  };

  // 删除作品
  const handleDelete = async () => {
    if (!workToDelete) return;

    try {
      await trpc.works.delete.mutate({ id: workToDelete.id });
      toast.success('删除成功');
      setDeleteDialogOpen(false);
      setWorkToDelete(null);
      setDetailOpen(false);

      // 渐进式更新：直接从列表中移除
      setWorksList(prev => prev.filter(w => w.id !== workToDelete.id));
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

  // 打开删除确认对话框
  const openDeleteDialog = (work: WorksDetail) => {
    setWorkToDelete(work);
    setDeleteDialogOpen(true);
  };

  useEffect(() => {
    loadWorks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className='flex flex-col h-full bg-[#f4f4f5]'>
      {/* 头部 */}
      <div className='bg-white px-4 py-3 border-b border-gray-200'>
        <h1 className='text-lg font-semibold text-[#09090B]'>我的邀请函</h1>
      </div>

      {/* 作品列表 */}
      <div className='flex-1 overflow-y-auto px-4 py-3'>
        {loading && worksList.length === 0 ? (
          <div className='flex justify-center items-center h-64'>
            <div className='text-sm text-gray-500'>加载中...</div>
          </div>
        ) : worksList.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-64'>
            <div className='text-sm text-gray-400'>还没有作品</div>
          </div>
        ) : (
          <div className='space-y-3'>
            {worksList.map(work => {
              const purchaseStatus = getPurchaseStatus();
              return (
                <div
                  key={work.id}
                  onClick={() => loadWorkDetail(work)}
                  className='bg-white rounded-lg p-3 shadow-sm border border-gray-100 cursor-pointer active:opacity-80'
                >
                  <div className='flex gap-3'>
                    {/* 缩略图 */}
                    <div className='relative w-16 flex-shrink-0 rounded overflow-hidden border border-gray-200 self-stretch'>
                      {work.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cdnApi(work.cover, { resizeWidth: 128 })}
                          alt={work.title}
                          className='w-full h-full object-cover'
                        />
                      ) : (
                        <div className='w-full h-full bg-gray-100 flex items-center justify-center text-xs text-gray-400'>
                          无
                        </div>
                      )}
                    </div>

                    {/* 内容 */}
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-start justify-between gap-2 mb-1'>
                        <h3 className='text-base font-medium text-[#09090B] line-clamp-2 flex-1'>
                          {work.title}
                        </h3>
                        {purchaseStatus && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${
                              purchaseStatus === 'purchased'
                                ? 'bg-[#ffe035] text-[#a16207]'
                                : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {purchaseStatus === 'purchased' ? '已购' : '未购'}
                          </span>
                        )}
                      </div>

                      <div className='flex items-center gap-1 text-xs text-gray-500 mb-1'>
                        <Clock className='w-3 h-3' />
                        <span>更新于 {dayjs(work.update_time).fromNow()}</span>
                      </div>

                      {/* RSVP 统计信息 */}
                      {work.is_rsvp && (
                        <div className='flex items-center gap-3 mt-1 text-xs'>
                          <span className='text-[#09090B] font-medium'>
                            <span className='font-semibold'>
                              {rsvpStatsMap.get(work.id)?.invited ?? 0}
                            </span>{' '}
                            已邀请
                          </span>
                          <span className='text-green-600 font-medium'>
                            <span className='font-semibold'>
                              {rsvpStatsMap.get(work.id)?.replied ?? 0}
                            </span>{' '}
                            已回复
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && !loading && (
        <div className='bg-white border-t border-gray-200 px-2 py-3'>
          <Pagination className='justify-center'>
            <PaginationContent className='flex-wrap gap-1'>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => page > 1 && setPage(page - 1)}
                  className={
                    page === 1
                      ? 'pointer-events-none opacity-50'
                      : 'cursor-pointer'
                  }
                />
              </PaginationItem>
              {(() => {
                const pages: (number | 'ellipsis')[] = [];
                const maxVisible = 5;

                if (totalPages <= maxVisible) {
                  for (let i = 1; i <= totalPages; i++) {
                    pages.push(i);
                  }
                } else {
                  if (page <= 3) {
                    for (let i = 1; i <= 4; i++) {
                      pages.push(i);
                    }
                    pages.push('ellipsis');
                    pages.push(totalPages);
                  } else if (page >= totalPages - 2) {
                    pages.push(1);
                    pages.push('ellipsis');
                    for (let i = totalPages - 3; i <= totalPages; i++) {
                      pages.push(i);
                    }
                  } else {
                    pages.push(1);
                    pages.push('ellipsis');
                    for (let i = page - 1; i <= page + 1; i++) {
                      pages.push(i);
                    }
                    pages.push('ellipsis');
                    pages.push(totalPages);
                  }
                }

                return pages.map((item, index) => {
                  if (item === 'ellipsis') {
                    return (
                      <PaginationItem key={`ellipsis-${index}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  return (
                    <PaginationItem key={item}>
                      <PaginationLink
                        onClick={() => setPage(item)}
                        isActive={page === item}
                        className='cursor-pointer min-w-[32px]'
                      >
                        {item}
                      </PaginationLink>
                    </PaginationItem>
                  );
                });
              })()}
              <PaginationItem>
                <PaginationNext
                  onClick={() => page < totalPages && setPage(page + 1)}
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
      )}

      {/* 作品详情弹窗 */}
      <ResponsiveDialog
        isOpen={detailOpen}
        onOpenChange={setDetailOpen}
        title='邀请函详情'
      >
        {selectedWork && (
          <div className='p-4 space-y-4'>
            {/* 作品信息卡片 */}
            <div className='bg-white rounded-lg p-4 border border-gray-200'>
              <div className='flex gap-3'>
                {/* 缩略图 */}
                <div className='relative w-20 flex-shrink-0 rounded overflow-hidden border border-gray-200 self-stretch'>
                  {selectedWork.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cdnApi(selectedWork.cover, { resizeWidth: 160 })}
                      alt={selectedWork.title}
                      className='w-full h-full object-cover'
                    />
                  ) : (
                    <div className='w-full h-full bg-gray-100 flex items-center justify-center text-xs text-gray-400'>
                      无
                    </div>
                  )}
                </div>

                {/* 文本信息 */}
                <div className='flex-1 min-w-0'>
                  <div className='flex items-start justify-between gap-2 mb-1'>
                    <h2 className='text-base font-semibold text-[#09090B] line-clamp-2'>
                      {selectedWork.title}
                    </h2>
                    {getPurchaseStatus() && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${
                          getPurchaseStatus() === 'purchased'
                            ? 'bg-[#ffe035] text-[#a16207]'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {getPurchaseStatus() === 'purchased' ? '已购' : '未购'}
                      </span>
                    )}
                  </div>

                  <div className='flex items-center gap-1 text-xs text-gray-500 mb-2'>
                    <Clock className='w-3 h-3' />
                    <span>
                      更新于 {dayjs(selectedWork.update_time).fromNow()}
                    </span>
                  </div>

                  {/* RSVP 统计信息 */}
                  {selectedWork.is_rsvp && rsvpStats && (
                    <div className='flex items-center gap-3 text-xs'>
                      <span className='text-[#09090B] font-medium'>
                        <span className='font-semibold'>
                          {rsvpStats.invited}
                        </span>{' '}
                        已邀请
                      </span>
                      <span className='text-green-600 font-medium'>
                        <span className='font-semibold'>
                          {rsvpStats.replied}
                        </span>{' '}
                        已回复
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 编辑操作 */}
            <div className='bg-white rounded-lg border border-gray-200'>
              <div className='px-4 py-3 border-b border-gray-200'>
                <h3 className='text-sm font-semibold text-[#09090B]'>
                  编辑操作
                </h3>
              </div>
              <div className='grid grid-cols-4 gap-2 p-3'>
                <button
                  onClick={() => selectedWork && handlePreview(selectedWork)}
                  className='flex flex-col items-center gap-1 p-2 rounded hover:bg-gray-50 active:bg-gray-100'
                >
                  <Eye className='w-5 h-5 text-gray-600' />
                  <span className='text-xs text-gray-600'>预览</span>
                </button>
                <button
                  onClick={() => selectedWork && handleEdit(selectedWork)}
                  className='flex flex-col items-center gap-1 p-2 rounded hover:bg-gray-50 active:bg-gray-100'
                >
                  <Pencil className='w-5 h-5 text-gray-600' />
                  <span className='text-xs text-gray-600'>编辑</span>
                </button>
                <button
                  onClick={() => selectedWork && handleCopy(selectedWork)}
                  className='flex flex-col items-center gap-1 p-2 rounded hover:bg-gray-50 active:bg-gray-100'
                >
                  <Copy className='w-5 h-5 text-gray-600' />
                  <span className='text-xs text-gray-600'>复制</span>
                </button>
                <button
                  onClick={() => selectedWork && openDeleteDialog(selectedWork)}
                  className='flex flex-col items-center gap-1 p-2 rounded hover:bg-gray-50 active:bg-gray-100'
                >
                  <Trash2 className='w-5 h-5 text-red-500' />
                  <span className='text-xs text-red-500'>删除</span>
                </button>
              </div>
            </div>

            {/* 分享邀请（仅 RSVP 类型） */}
            {getWorkType(selectedWork) === 'rsvp' && (
              <div className='bg-white rounded-lg border border-gray-200'>
                <div className='px-4 py-3 border-b border-gray-200'>
                  <h3 className='text-sm font-semibold text-[#09090B]'>
                    分享邀请
                  </h3>
                </div>
                <div className='p-4 space-y-3'>
                  <RSVPShareOptions
                    worksId={selectedWork.id}
                    formConfigId={formConfigId || undefined}
                  />
                </div>
              </div>
            )}

            {/* 宾客回执（仅 RSVP 类型） */}
            {getWorkType(selectedWork) === 'rsvp' && (
              <div className='bg-white rounded-lg border border-gray-200'>
                <div className='px-4 py-3 border-b border-gray-200'>
                  <h3 className='text-sm font-semibold text-[#09090B]'>
                    宾客回执
                  </h3>
                </div>
                <button className='w-full flex items-center gap-3 p-4 hover:bg-gray-50 active:bg-gray-100'>
                  <div className='w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0'>
                    <FileText className='w-5 h-5 text-gray-600' />
                  </div>
                  <div className='flex-1 text-left'>
                    <span className='text-sm font-medium text-[#09090B]'>
                      管理宾客回执
                    </span>
                    <p className='text-xs text-gray-500 mt-1'>
                      查看宾客列表和回执信息
                    </p>
                  </div>
                  <ChevronRight className='w-5 h-5 text-gray-400 flex-shrink-0' />
                </button>
              </div>
            )}
          </div>
        )}
      </ResponsiveDialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className='w-[320px]'>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除作品 &ldquo;{workToDelete?.title}&rdquo;
              吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteDialogOpen(false);
                setWorkToDelete(null);
              }}
              className='rounded-full'
            >
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className='rounded-full bg-red-500 hover:bg-red-600'
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

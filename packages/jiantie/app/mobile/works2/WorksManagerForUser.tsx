'use client';

import { RSVPShareOptions } from '@/components/RSVP/RSVPShareOptions';
import { getAppId, getUid, request } from '@/services';
import { useStore } from '@/store';
import { getUrlWithParam } from '@/utils';
import { useCheckPublish } from '@/utils/checkPubulish';
import { toVipPage } from '@/utils/jiantie';
import { trpc } from '@/utils/trpc';
import APPBridge from '@mk/app-bridge';
import { API } from '@mk/services';
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
  Copy,
  Eye,
  FileText,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { WorkInfoCard } from './components/WorkInfoCard';

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
  const { permissions, isVip } = useStore();
  const { canShareWithoutWatermark } = useCheckPublish();
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
  const [purchasedWorksMap, setPurchasedWorksMap] = useState<
    Map<string, boolean>
  >(new Map());
  const [canShare, setCanShare] = useState<boolean>(false);

  // 获取已购作品列表
  const getPurchasedWorks = async (worksIds: string[]) => {
    if (worksIds.length === 0) return [];
    try {
      const res = await request.get(
        `${API('apiv10')}/user-resources?type=purchased&resourceIds=${worksIds.join(',')}`
      );
      return res.data as Array<{
        expiryDate: string | null;
        resourceId: string;
      }>;
    } catch (error) {
      console.error('Failed to get purchased works:', error);
      return [];
    }
  };

  // 加载购买状态
  const loadPurchaseStatus = async (worksIds: string[]) => {
    if (worksIds.length === 0) return;

    const purchasedWorks = await getPurchasedWorks(worksIds);
    const purchasedMap = new Map<string, boolean>();

    purchasedWorks.forEach(work => {
      purchasedMap.set(work.resourceId, true);
    });

    // 为未购买的作品设置 false
    worksIds.forEach(id => {
      if (!purchasedMap.has(id)) {
        purchasedMap.set(id, false);
      }
    });

    setPurchasedWorksMap(prev => {
      const newMap = new Map(prev);
      purchasedMap.forEach((value, key) => {
        newMap.set(key, value);
      });
      return newMap;
    });
  };

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

      // 获取所有作品 ID
      const worksIds = works.map(work => work.id);

      // 并行加载购买状态和 RSVP 统计信息
      const promises: Promise<void>[] = [];

      // 加载购买状态
      if (worksIds.length > 0) {
        promises.push(loadPurchaseStatus(worksIds));
      }

      // 为所有 RSVP 类型的作品加载统计信息
      const rsvpWorksIds = works
        .filter(work => work.is_rsvp)
        .map(work => work.id);
      if (rsvpWorksIds.length > 0) {
        promises.push(loadRSVPStats(rsvpWorksIds));
      }

      await Promise.all(promises);
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

      // 检查分享权限（如果是会员或 RSVP 类型）
      if (workDetail.is_rsvp) {
        // 如果是会员，直接允许分享
        if (isVip) {
          setCanShare(true);
        } else {
          // 非会员需要检查分享权限
          try {
            const hasPermission = await canShareWithoutWatermark(work.id);
            setCanShare(hasPermission);
          } catch (error) {
            console.error('Failed to check share permission:', error);
            setCanShare(false);
          }
        }
      }

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
  const getPurchaseStatus = (
    workId: string
  ): 'purchased' | 'not-purchased' | null => {
    // 如果是会员，不显示购买状态
    if (isVip) {
      return null;
    }

    // 获取购买状态
    const isPurchased = purchasedWorksMap.get(workId);

    // 如果还没有加载购买状态，不显示标签
    if (isPurchased === undefined) {
      return null;
    }

    return isPurchased ? 'purchased' : 'not-purchased';
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
      <div
        className={`flex-1 overflow-y-auto px-4 py-3 ${totalPages > 1 && !loading ? 'pb-[60px]' : ''}`}
      >
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
            {worksList.map(work => (
              <WorkInfoCard
                key={work.id}
                work={work}
                purchaseStatus={getPurchaseStatus(work.id)}
                rsvpStats={rsvpStatsMap.get(work.id)}
                onClick={() => loadWorkDetail(work)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 分页 - 固定在底部 */}
      {totalPages > 1 && !loading && (
        <div className='fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 z-10'>
          <Pagination className='justify-center'>
            <PaginationContent className='gap-0.5'>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => page > 1 && setPage(page - 1)}
                  className={`h-8 px-2 text-xs ${page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
                />
              </PaginationItem>
              {(() => {
                const pages: (number | 'ellipsis')[] = [];
                const maxVisible = 3; // 减少可见页码数量

                if (totalPages <= maxVisible) {
                  for (let i = 1; i <= totalPages; i++) {
                    pages.push(i);
                  }
                } else {
                  if (page === 1) {
                    pages.push(1, 2, 'ellipsis', totalPages);
                  } else if (page === totalPages) {
                    pages.push(1, 'ellipsis', totalPages - 1, totalPages);
                  } else {
                    pages.push(1, 'ellipsis', page, 'ellipsis', totalPages);
                  }
                }

                return pages.map((item, index) => {
                  if (item === 'ellipsis') {
                    return (
                      <PaginationItem key={`ellipsis-${index}`}>
                        <PaginationEllipsis className='h-8 w-8' />
                      </PaginationItem>
                    );
                  }
                  return (
                    <PaginationItem key={item}>
                      <PaginationLink
                        onClick={() => setPage(item)}
                        isActive={page === item}
                        className='cursor-pointer h-8 w-8 text-xs'
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
                  className={`h-8 px-2 text-xs ${page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
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
            <WorkInfoCard
              work={selectedWork}
              purchaseStatus={getPurchaseStatus(selectedWork.id)}
              rsvpStats={rsvpStats}
              size='medium'
            />

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
                  {canShare ? (
                    <RSVPShareOptions
                      worksId={selectedWork.id}
                      formConfigId={formConfigId || undefined}
                    />
                  ) : (
                    <div className='bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-100'>
                      <div className='flex flex-col items-center text-center py-4'>
                        <div className='w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-3'>
                          <svg
                            className='w-6 h-6 text-purple-600'
                            fill='none'
                            viewBox='0 0 24 24'
                            stroke='currentColor'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
                            />
                          </svg>
                        </div>
                        <h4 className='text-base font-semibold text-[#09090B] mb-2'>
                          升级解锁分享功能
                        </h4>
                        <p className='text-sm text-gray-600 mb-4'>
                          升级会员或购买作品后即可使用分享邀请功能
                        </p>
                        <button
                          onClick={() => {
                            toVipPage({
                              works_id: selectedWork.id,
                              ref_object_id: selectedWork.template_id || '',
                              tab: appid === 'xueji' ? 'business' : 'personal',
                              vipType: 'rsvp',
                            });
                          }}
                          className='px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full font-medium hover:from-purple-700 hover:to-blue-700 active:scale-95 transition-all shadow-md'
                        >
                          立即升级
                        </button>
                      </div>
                    </div>
                  )}
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

'use client';

import { getUid, request } from '@/services';
import { useStore } from '@/store';
import { trpc, trpcWorks, type SerializedWorksEntity } from '@/utils/trpc';
import { API } from '@mk/services';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@workspace/ui/components/pagination';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { ArrowDown, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { WorkInfoCard } from './components/WorkInfoCard';

dayjs.extend(relativeTime);

// RSVP 统计信息
type RSVPStats = {
  invited: number;
  replied: number;
};

export default function WorksManagerForUser() {
  const router = useRouter();
  const { isVip } = useStore();
  const [worksList, setWorksList] = useState<SerializedWorksEntity[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [rsvpStatsMap, setRsvpStatsMap] = useState<Map<string, RSVPStats>>(
    new Map()
  );
  const [purchasedWorksMap, setPurchasedWorksMap] = useState<
    Map<string, boolean>
  >(new Map());

  // 下拉刷新相关状态
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
        trpcWorks.findMany({
          deleted: false,
          is_folder: false,
          skip: (pageNum - 1) * pageSize,
          take: pageSize,
        }),
        trpcWorks.count({
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

  // 下拉刷新处理
  const handleRefresh = useCallback(async () => {
    if (refreshing) return;

    setRefreshing(true);
    setPullDistance(0);

    try {
      // 重置到第一页并刷新数据
      setPage(1);
      await loadWorks(1);
    } finally {
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshing]);

  // 触摸开始
  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      const scrollContainer = scrollContainerRef.current;
      if (!scrollContainer || refreshing) return;

      // 只有在滚动到顶部时才允许下拉刷新
      if (scrollContainer.scrollTop === 0) {
        touchStartY.current = e.touches[0].clientY;
      }
    },
    [refreshing]
  );

  // 触摸移动
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      const scrollContainer = scrollContainerRef.current;
      if (!scrollContainer || refreshing) return;

      // 只有在滚动到顶部时才处理下拉
      if (scrollContainer.scrollTop === 0 && touchStartY.current > 0) {
        const touchY = e.touches[0].clientY;
        const distance = touchY - touchStartY.current;

        // 只处理向下拉的情况
        if (distance > 0) {
          // 添加阻尼效果，最大拉动距离为 80px
          const dampingFactor = 0.5;
          const maxDistance = 80;
          const dampedDistance = Math.min(
            distance * dampingFactor,
            maxDistance
          );
          setPullDistance(dampedDistance);

          // 阻止默认滚动行为
          if (distance > 10) {
            e.preventDefault();
          }
        }
      }
    },
    [refreshing]
  );

  // 触摸结束
  const handleTouchEnd = useCallback(() => {
    if (refreshing) return;

    const threshold = 60; // 触发刷新的阈值

    touchStartY.current = 0;

    if (pullDistance >= threshold) {
      handleRefresh();
    } else {
      setPullDistance(0);
    }
  }, [refreshing, pullDistance, handleRefresh]);

  // 跳转到作品详情页面
  const handleWorkDetail = (work: SerializedWorksEntity) => {
    const url = `/mobile/works2/${work.id}`;
    // if (APPBridge.judgeIsInApp()) {
    //   APPBridge.navToPage({
    //     url: `${location.origin}${url}`,
    //     type: 'URL',
    //   });
    // } else {
    // router.push(url);
    // }
    router.push(url);
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

  useEffect(() => {
    loadWorks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // 绑定触摸事件监听器（需要设置 passive: false 以允许 preventDefault）
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    // 使用原生事件监听器，设置 passive: false
    scrollContainer.addEventListener('touchstart', handleTouchStart, {
      passive: false,
    });
    scrollContainer.addEventListener('touchmove', handleTouchMove, {
      passive: false,
    });
    scrollContainer.addEventListener('touchend', handleTouchEnd);

    return () => {
      scrollContainer.removeEventListener('touchstart', handleTouchStart);
      scrollContainer.removeEventListener('touchmove', handleTouchMove);
      scrollContainer.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <>
      <div
        className='flex flex-col h-full'
        style={{
          paddingTop: 'var(--safe-area-inset-top)',
        }}
      >
        {/* 头部 */}
        <div className='bg-white px-4 py-3 border-b border-gray-200'>
          <h1 className='text-lg font-semibold text-[#09090B]'>我的邀请函</h1>
        </div>

        {/* 下拉刷新指示器区域 */}
        <div
          className='bg-gray-50 overflow-hidden'
          style={{
            height: `${refreshing ? 50 : pullDistance}px`,
            transition:
              refreshing || pullDistance === 0 ? 'height 0.3s ease' : 'none',
          }}
        >
          {(pullDistance > 0 || refreshing) && (
            <div className='flex items-center justify-center h-full text-sm'>
              {refreshing ? (
                <div className='flex items-center gap-2 text-blue-500'>
                  <Loader2 className='w-5 h-5 animate-spin' />
                  <span className='font-medium'>刷新中...</span>
                </div>
              ) : (
                <div
                  className={`flex items-center gap-2 transition-colors ${
                    pullDistance >= 60 ? 'text-blue-500' : 'text-gray-500'
                  }`}
                >
                  <ArrowDown
                    className={`w-5 h-5 transition-transform ${
                      pullDistance >= 60 ? 'rotate-180' : ''
                    }`}
                  />
                  <span className='font-medium'>
                    {pullDistance >= 60 ? '松手刷新' : '下拉刷新'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 作品列表 */}
        <div
          ref={scrollContainerRef}
          className={`flex-1 overflow-y-auto bg-gray-50 p-4 ${totalPages > 1 && !loading ? 'pb-[60px]' : ''}`}
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
            <div className='flex flex-col gap-[12px]'>
              {worksList.map(work => (
                <WorkInfoCard
                  key={work.id}
                  work={work}
                  purchaseStatus={getPurchaseStatus(work.id)}
                  rsvpStats={rsvpStatsMap.get(work.id)}
                  onClick={() => handleWorkDetail(work)}
                />
              ))}
            </div>
          )}
        </div>

        {/* 分页 - 固定在底部 */}
        {totalPages > 1 && (
          <div className='bg-white border-t border-gray-200 px-2 py-2 z-10'>
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
      </div>
    </>
  );
}

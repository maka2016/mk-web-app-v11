'use client';

import { WorkDetailContent } from '@/components/WorksDetailContent';
import { WorkInfoCard } from '@/components/WorksDetailContent/WorkInfoCard';
import {
  useWorksActions,
  WorksActionsProvider,
} from '@/components/WorksDetailContent/WorksActionsContext';
import { getUid } from '@/services';
import { useStore } from '@/store';
import { trpc, type SerializedWorksEntity } from '@/utils/trpc';
import { Button } from '@workspace/ui/components/button';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from '@workspace/ui/components/pagination';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Tabs, TabsList, TabsTrigger } from '@workspace/ui/components/tabs';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

dayjs.extend(relativeTime);

// 作品规格类型
type WorksSpec = {
  id: string;
  name: string;
  alias: string;
  display_name: string | null;
  count: number; // 该规格的作品数量
};

function WorksListForJiantieInner() {
  const t = useTranslations('Works');
  const store = useStore();
  const [worksList, setWorksList] = useState<SerializedWorksEntity[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<string>('all');
  const categoryRef = useRef('all'); // 保存最新的 category 值
  const [worksSpecs, setWorksSpecs] = useState<WorksSpec[]>([]);
  const [specsLoading, setSpecsLoading] = useState(false);
  const [totalWorksCount, setTotalWorksCount] = useState(0); // 全部作品数量
  const [purchasedWorksMap, setPurchasedWorksMap] = useState<
    Map<string, boolean>
  >(new Map());
  const isInitialMount = useRef(true); // 标记是否是首次挂载

  // 下拉刷新相关状态
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const worksActions = useWorksActions();

  // 搜索相关状态
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchInput, setSearchInput] = useState(''); // 输入框的值
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 弹窗状态
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // 获取已购作品列表
  const getPurchasedWorks = async (worksIds: string[]) => {
    if (worksIds.length === 0) return [];

    const currentUid = getUid();
    if (!currentUid) return [];

    try {
      // 使用 trpc 的 userResource.getPurchased 接口
      const purchasedWorks = await trpc.userResource.getPurchased.query({
        uid: parseInt(currentUid, 10),
        resourceIds: worksIds,
        resourceType: 'works',
      });

      return purchasedWorks;
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

  // 加载规格列表和统计信息
  const loadWorksSpecs = async (silent = false) => {
    const currentUid = getUid();
    if (!currentUid) return;

    // 静默模式下不显示 loading 状态
    if (!silent) {
      setSpecsLoading(true);
    }

    try {
      // 使用优化后的 API，一次性获取规格列表和统计信息
      const { specs, totalWorksCount } =
        await trpc.worksSpec.findManyWithStats.query({
          uid: parseInt(currentUid, 10), // 转换为 number
          deleted: false,
        });




      setWorksSpecs(specs);
      setTotalWorksCount(totalWorksCount);
    } catch (error) {
      // 静默模式下只在控制台输出错误
      if (!silent) {
        toast.error(t('加载规格列表失败'));
      }
      console.error(error);
    } finally {
      if (!silent) {
        setSpecsLoading(false);
      }
    }
  };

  // 加载作品列表
  const loadWorks = async (
    pageNum = page,
    keyword = searchKeyword,
    silent = false
  ) => {
    const currentUid = getUid();
    if (!currentUid) {
      return;
    }

    // 静默模式下不显示 loading 状态
    if (!silent) {
      setLoading(true);
    }

    try {
      // 从 ref 中获取最新的 category 值
      const currentCategory = categoryRef.current;

      // 根据分类设置不同的查询条件
      const queryParams: any = {
        deleted: false,
        is_folder: false,
      };

      // 如果选择了具体的规格（不是"全部"），则按规格过滤
      if (currentCategory !== 'all') {
        queryParams.spec_id = currentCategory;
      }

      // 如果有搜索关键字，添加搜索条件
      if (keyword) {
        queryParams.keyword = keyword;
      }

      const [works, count] = await Promise.all([
        trpc.works.findMany.query({
          ...queryParams,
          skip: (pageNum - 1) * pageSize,
          take: pageSize,
        }),
        trpc.works.count.query(queryParams),
      ]);

      setWorksList(works as unknown as SerializedWorksEntity[]);
      setTotal(count);

      // 获取所有作品 ID（避免在这里显式使用 SerializedWorksEntity，防止类型推导过深）
      const worksIds = works.map((work: any) => work.id as string);

      // 加载购买状态（RSVP 统计信息已由服务端返回）
      if (worksIds.length > 0) {
        await loadPurchaseStatus(worksIds);
      }
    } catch (error) {
      // 静默模式下只在控制台输出错误
      if (!silent) {
        toast.error(t('加载作品列表失败'));
      }
      console.error(error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
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
      // 并行刷新作品列表和规格统计
      await Promise.all([loadWorks(1), loadWorksSpecs()]);
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

  // 关闭弹窗
  const handleDetailDialogClose = () => {
    setDetailDialogOpen(false);
  };

  // 数据变更时刷新列表和规格统计
  const handleDataChange = () => {
    loadWorks(page);
    loadWorksSpecs(); // 作品数据变化后，更新规格统计
  };

  // 获取购买状态标签
  const getPurchaseStatus = (
    workId: string
  ): 'purchased' | 'not-purchased' | null => {
    // 如果是会员，不显示购买状态
    if (store.isVip) {
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

  // 切换搜索框显示
  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (!showSearch) {
      // 打开搜索框时自动聚焦
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      // 关闭搜索框时清空搜索
      handleClearSearch();
    }
  };

  // 执行搜索
  const handleSearch = () => {
    if (searchInput.trim()) {
      setSearchKeyword(searchInput.trim());
      setPage(1);
      loadWorks(1, searchInput.trim());
    }
  };

  // 处理回车键
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 清除搜索
  const handleClearSearch = () => {
    setSearchInput('');
    setSearchKeyword('');
    setPage(1);
    loadWorks(1, '');
  };

  // 组件挂载时加载规格列表和作品列表
  useEffect(() => {
    const currentUid = getUid();
    if (!currentUid) {
      // 如果没有 uid，说明用户信息还未初始化，等待后重试
      const timer = setTimeout(() => {
        const retryUid = getUid();
        if (retryUid) {
          loadWorksSpecs();
          loadWorks();
        } else {
          // toast.error('获取用户信息失败，请重新登录');
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      loadWorksSpecs();
      loadWorks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 同步 category 到 ref
  useEffect(() => {
    categoryRef.current = category;
  }, [category]);

  // 切换分类时重置到第一页
  useEffect(() => {
    setPage(1);
  }, [category]);

  // 当 page 或 category 变化时加载作品（排除首次挂载）
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const currentUid = getUid();
    if (currentUid) {
      loadWorks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, category]);

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any)['freshPageData'] = () => {
        loadWorks();
      };
    }
  }, []);

  // 监听页面可见性变化，从后台切回前台时刷新数据
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const currentUid = getUid();
        if (currentUid) {
          // 页面变为可见时，静默刷新作品列表和规格统计
          loadWorks(page, searchKeyword, true);
          loadWorksSpecs(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <>
      <div
        className='flex flex-col h-full bg-white'
        id='WorksManagerForUser'
        style={{
          paddingTop: 'var(--safe-area-inset-top)',
        }}
      >
        {/* 分类 Tabs / 搜索框 */}
        <div className='relative px-4 border-b border-gray-200 bg-white'>
          {!showSearch ? (
            <div className='py-3'>
              {specsLoading ? (
                <div className='flex items-center gap-2 py-2 text-sm text-gray-400'>
                  <Loader2 className='w-4 h-4 animate-spin' />
                  <span>{t('loadingSpecs')}</span>
                </div>
              ) : (
                <Tabs
                  value={category}
                  onValueChange={value => setCategory(value)}
                >
                  <TabsList className='w-full justify-start bg-transparent h-auto p-0 overflow-x-auto gap-4 rounded-none'>
                    <TabsTrigger
                      value='all'
                      className='px-0 py-2 text-md text-gray-400 data-[state=active]:text-[#09090B] data-[state=active]:font-semibold rounded-none border-0 border-b border-transparent data-[state=active]:border-[#09090B] data-[state=active]:border-b-[2px] whitespace-nowrap'
                    >
                      {t('全部')} <span className='text-xs'>({totalWorksCount})</span>
                    </TabsTrigger>
                    {worksSpecs.filter(spec => spec.count > 0).map(spec => (
                      <TabsTrigger
                        key={spec.id}
                        value={spec.id}
                        className='px-0 py-2 text-md text-gray-400 data-[state=active]:text-[#09090B] data-[state=active]:font-semibold rounded-none border-0 border-b border-transparent data-[state=active]:border-[#09090B] data-[state=active]:border-b-[2px] whitespace-nowrap'
                      >
                        {t(spec.display_name || spec.alias)}
                        <span className='text-xs'>({spec.count})</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              )}
              <button
                onClick={toggleSearch}
                className='absolute top-1/2 -translate-y-1/2 right-4 p-1 text-gray-600 transition-colors'
                aria-label={t('搜索作品')}
              >
                <Search className='w-5 h-5' />
              </button>
            </div>
          ) : (
            <div className='flex items-center gap-2 py-3 border-b-2 border-transparent'>
              <div className='flex-1 relative flex items-center'>
                <input
                  ref={searchInputRef}
                  type='text'
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('搜索作品名称')}
                  className='w-full py-2 pl-3 pr-8 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
                {searchInput && (
                  <button
                    onClick={handleClearSearch}
                    className='absolute right-2 p-1 text-gray-400'
                    aria-label={t('清除搜索')}
                  >
                    <X className='w-4 h-4' />
                  </button>
                )}
              </div>
              <button
                onClick={handleSearch}
                className='py-2 text-md text-blue-600 whitespace-nowrap font-medium'
              >
                {t('搜索')}
              </button>
              <button
                onClick={toggleSearch}
                className='py-2 text-md text-gray-600 whitespace-nowrap'
              >
                {t('取消')}
              </button>
            </div>
          )}
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
                  <span className='font-medium'>{t('refreshing')}</span>
                </div>
              ) : (
                <div
                  className={`flex items-center gap-2 transition-colors ${pullDistance >= 60 ? 'text-blue-500' : 'text-gray-500'
                    }`}
                >
                  <ArrowDown
                    className={`w-5 h-5 transition-transform ${pullDistance >= 60 ? 'rotate-180' : ''
                      }`}
                  />
                  <span className='font-medium'>
                    {pullDistance >= 60 ? t('松手刷新') : t('下拉刷新')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className='content relative flex-1 flex flex-col overflow-hidden'>
          {/* 加载遮罩层 - 使用sticky定位，始终在列表容器顶部可见 */}
          {loading && (
            <div className='absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm'>
              <div className='flex items-center gap-2 text-sm text-gray-500'>
                <Loader2 className='w-5 h-5 animate-spin' />
                <span>{t('loading')}</span>
              </div>
            </div>
          )}
          {/* 作品列表 */}
          <div
            ref={scrollContainerRef}
            className={`flex-1 overflow-y-auto bg-[#f5f5f5] px-4 py-3 ${totalPages > 1 && !loading ? 'pb-[60px]' : ''}`}
          >
            {worksList.length === 0 && !loading ? (
              <div className='flex flex-col items-center justify-center h-64'>
                {getUid() ? (
                  <div className='text-sm text-gray-400'>{t('还没有作品')}</div>
                ) : (
                  <>
                    <div className='mb-3 text-sm text-gray-400'>
                      {t('登录后可查看你的作品')}
                    </div>
                    <Button
                      onClick={() => store.setLoginShow(true)}
                      className='px-4 py-2 rounded-full'
                    >
                      {t('去登录')}
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3'>
                {worksList.map((work: SerializedWorksEntity) => {
                  return (
                    <WorkInfoCard
                      key={work.id}
                      work={work}
                      isVip={store.isVip}
                      purchaseStatus={getPurchaseStatus(work.id)}
                      onDataChange={handleDataChange}
                      onDownload={async () => {
                        if (work.share_type === 'invite') {
                          worksActions.toDownloadInviteeManager(work);
                          return;
                        }
                        await worksActions.downloadWork(work, {
                          autoShare: true,
                        });
                      }}
                      onShare={() => {
                        store.push(`/mobile/works2/${work.id}`);
                      }}
                      onData={() => {
                        const url = `/mobile/dataview?works_id=${work.id}&appid=maka&is_full_screen=1`;
                        store.push(url);
                      }}
                      toEdit={() => {
                        store.push(
                          `/mobile/editor?works_id=${work.id}&uid=${getUid()}`
                        );
                      }}
                    />
                  );
                })}
              </div>
            )}
            {/* 分页 - 固定在底部 */}
            {totalPages > 1 && (
              <div className='py-2 mt-4'>
                <Pagination className='w-full'>
                  <PaginationContent className='gap-2 w-full'>
                    <PaginationItem>
                      <PaginationLink
                        onClick={() => page > 1 && setPage(page - 1)}
                        className={`h-8 w-8 p-0 text-xs bg-white border border-gray-300 ${page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
                        aria-label={t('上一页')}
                      >
                        <ChevronLeft className='h-4 w-4' />
                      </PaginationLink>
                    </PaginationItem>

                    <div className='flex gap-2 items-center'>
                      {(() => {
                        const showMax = 7; // 最多显示的页码数量

                        if (totalPages <= showMax) {
                          // 页数少，全部显示
                          return Array.from(
                            { length: totalPages },
                            (_, i) => i + 1
                          ).map(num => (
                            <PaginationItem key={num}>
                              <PaginationLink
                                onClick={() => setPage(num)}
                                isActive={page === num}
                                className={`cursor-pointer h-8 w-8 text-xs bg-white border ${page === num
                                    ? 'border-blue-500 text-blue-600 font-semibold'
                                    : 'border-gray-300'
                                  }`}
                              >
                                {num}
                              </PaginationLink>
                            </PaginationItem>
                          ));
                        }

                        // 页数多，智能显示：第一页 ... 当前页附近 ... 最后一页
                        const pages: (number | 'ellipsis')[] = [];
                        const showStart = Math.max(2, page - 1);
                        const showEnd = Math.min(totalPages - 1, page + 1);

                        pages.push(1); // 第一页
                        if (showStart > 2) pages.push('ellipsis'); // 省略号
                        for (let i = showStart; i <= showEnd; i++)
                          pages.push(i); // 当前页附近
                        if (showEnd < totalPages - 1) pages.push('ellipsis'); // 省略号
                        pages.push(totalPages); // 最后一页

                        return pages.map((item, index) => {
                          if (item === 'ellipsis') {
                            return (
                              <span key={`ellipsis-${index}`} className='px-1'>
                                ...
                              </span>
                            );
                          }
                          return (
                            <PaginationItem key={item}>
                              <PaginationLink
                                onClick={() => setPage(item)}
                                isActive={page === item}
                                className={`cursor-pointer h-8 w-8 text-xs bg-white border ${page === item
                                    ? 'border-blue-500 text-blue-600 font-semibold'
                                    : 'border-gray-300'
                                  }`}
                              >
                                {item}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        });
                      })()}
                    </div>

                    <PaginationItem>
                      <PaginationLink
                        onClick={() => page < totalPages && setPage(page + 1)}
                        className={`h-8 w-8 p-0 text-xs bg-white border border-gray-300 ${page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
                        aria-label={t('下一页')}
                      >
                        <ChevronRight className='h-4 w-4' />
                      </PaginationLink>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 作品详情弹窗 */}
      <ResponsiveDialog
        // title={'邀请函详情'}
        fullHeight={true}
        isOpen={detailDialogOpen}
        onOpenChange={open => {
          if (!open) {
            handleDetailDialogClose();
          }
        }}
        showCloseIcon={true}
      >
        {selectedWorkId && (
          <WorkDetailContent
            work={worksList.find(work => work.id === selectedWorkId)}
            onClose={handleDetailDialogClose}
            onDataChange={handleDataChange}
            purchaseStatus={getPurchaseStatus(selectedWorkId)}
          />
        )}
      </ResponsiveDialog>
    </>
  );
}

export default function WorksListForJiantie() {
  return (
    <WorksActionsProvider>
      <WorksListForJiantieInner />
    </WorksActionsProvider>
  );
}

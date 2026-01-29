'use client';
import {
  API,
  getAppId,
  getToken,
  getUid,
  request,
  worksServerV2,
} from '@/services';
import APPBridge from '@/store/app-bridge';
import { observer } from 'mobx-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { WorkInfoCard } from '@/components/WorksDetailContent/WorkInfoCard';
import {
  useWorksActions,
  WorksActionsProvider,
} from '@/components/WorksDetailContent/WorksActionsContext';
// import CommonLogger from '@/services/loggerv7/logger';
import { getWorksMaka } from '@/services';
import { useStore } from '@/store';
import { isPc, setCookieExpire } from '@/utils';
import { SerializedWorksEntity, trpc } from '@/utils/trpc';
import { Badge } from '@workspace/ui/components/badge';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from '@workspace/ui/components/pagination';
import { Skeleton } from '@workspace/ui/components/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@workspace/ui/components/tabs';
import { cn } from '@workspace/ui/lib/utils';
import {
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import { mkWebStoreLogger } from '../../../services/logger';
import { WorksItem } from './types';

interface Props {
  appid?: string;
  active: boolean;
  onChangeTab: (index: number) => void;
}

const tabs = [
  {
    label: '全部作品',
    type: 'all',
  },
  {
    label: '图片&视频',
    type: 'image',
  },
  {
    label: 'H5网页',
    type: 'h5',
  },
];

const WorksListForMaka = (props: Props) => {
  const appid = props.appid || getAppId();
  const store = useStore();
  const worksActions = useWorksActions();
  const [activeType, setActiveType] = useState('all');
  const activeTypeRef = useRef('all'); // 保存最新的 activeType 值
  const [specInfo, setSpecInfo] = useState<any>();

  // 作品列表状态
  const [worksList, setWorksList] = useState<WorksItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // 各分类的作品数量统计
  const [categoryCount, setCategoryCount] = useState({
    all: 0,
    image: 0,
    h5: 0,
  });

  // 下拉刷新相关状态
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 搜索相关状态
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchInput, setSearchInput] = useState(''); // 输入框的值
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 初始化标记，防止重复加载
  const initializedRef = useRef(false);
  const prevActiveRef = useRef(props.active);

  // 加载作品列表
  const loadWorks = async (pageNum = page, keyword = searchKeyword) => {
    setLoading(true);
    try {
      let incSpecs = '';
      let exSpecs = '';

      // 从 ref 中获取最新的 activeType 值
      const currentActiveType = activeTypeRef.current;

      // 根据分类设置查询条件
      if (currentActiveType === 'image') {
        // 图片&视频：排除 H5 规格
        exSpecs = '7ee4c72fe272959de662fff3378e7063';
      } else if (currentActiveType === 'h5') {
        // H5网页：只包含 H5 规格
        incSpecs = '7ee4c72fe272959de662fff3378e7063';
      }

      const res = await getWorksMaka({
        page: pageNum,
        size: pageSize,
        incSpecs,
        exSpecs,
        keyword: keyword || undefined,
        incAnalytics: currentActiveType === 'h5' || currentActiveType === 'all',
      });

      //如果res里面的数据editor_version为10且spec.name为h5网页时，则需求从sls_works_cumulative_pv_uv_entity获取访问量pv和访问人数uv
      let worksListWithPvUv = (res?.list || []) as WorksItem[];

      // 筛选出符合条件的作品：editor_version为10且spec.name为h5网页
      const h5WorksIds = worksListWithPvUv
        .filter(
          work =>
            work.editor_version === 10 &&
            work.spec?.name &&
            /h5/gi.test(work.spec.name)
        )
        .map(work => work.id);

      // 如果有符合条件的作品，批量获取pv/uv数据
      if (h5WorksIds.length > 0) {
        let pvUvData: Record<string, { pv: number; uv: number }> = {};
        try {
          pvUvData = await trpc.works.getCumulativePvUv.query({
            worksIds: h5WorksIds,
          });
        } catch (error) {
          console.error('获取pv/uv数据失败:', error);
          // 即使获取失败也继续显示作品列表，使用默认值0
        }

        // 将pv/uv数据合并到作品列表中，确保所有符合条件的作品都有pv/uv字段
        worksListWithPvUv = worksListWithPvUv.map(work => {
          if (
            work.editor_version === 10 &&
            work.spec?.name &&
            /h5/gi.test(work.spec.name)
          ) {
            // 如果数据库中有数据则使用，否则默认为0
            const pvUv = pvUvData[work.id];
            return {
              ...work,
              pv: pvUv?.pv ?? 0,
              uv: pvUv?.uv ?? 0,
            };
          }
          return work;
        });
      }

      setTotal(res?.total || 0);
      setWorksList(worksListWithPvUv);
      // 第一次加载完成后，标记为非初始加载
      if (isInitialLoading) {
        setIsInitialLoading(false);
      }
    } catch (error) {
      toast.error('加载作品列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 加载分类统计信息
  const loadCategoryCount = async () => {
    try {
      const [allRes, imageRes, h5Res] = await Promise.all([
        getWorksMaka({ page: 1, size: 1 }),
        getWorksMaka({
          page: 1,
          size: 1,
          exSpecs: '7ee4c72fe272959de662fff3378e7063',
        }),
        getWorksMaka({
          page: 1,
          size: 1,
          incSpecs: '7ee4c72fe272959de662fff3378e7063',
        }),
      ]);

      setCategoryCount({
        all: allRes?.total || 0,
        image: imageRes?.total || 0,
        h5: h5Res?.total || 0,
      });
    } catch (error) {
      console.error('加载分类统计失败:', error);
    }
  };

  const getSpecInfo = async () => {
    const res: any = await request.get(
      `${worksServerV2()}/works-spec/v1/list?page=1&pageSize=100`
    );
    if (res?.list?.length) {
      const result: any = {};
      res.list.forEach((item: any) => {
        result[item.id] = item;
      });
      setSpecInfo(result);
    }
  };

  const refreshData = () => {
    if (getToken()) {
      loadWorks(page);
      loadCategoryCount();
    } else {
      checkToken();
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
      await Promise.all([loadWorks(1), loadCategoryCount()]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, activeType]);

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

  // const listenAppWebviewShow = () => {
  //   document.addEventListener('visibilitychange', () => {
  //     console.log('visibilitychange', document.visibilityState);
  //     if (document.visibilityState === 'visible') {
  //       refreshData();
  //     }
  //   });
  // };

  useEffect(() => {
    getSpecInfo();
    loadCategoryCount();

    // 初始化时检查 token
    if (getToken()) {
      // 如果已经有 token，立即标记为已初始化并加载数据
      initializedRef.current = true;
      loadWorks();
    } else {
      // 没有 token 则延迟检查
      setTimeout(() => {
        checkToken();
      }, 1000);
    }

    mkWebStoreLogger.track_pageview({
      page_type: 'works_page',
      page_id: `works_page`,
    });
    // listenAppWebviewShow();

    if (typeof window !== 'undefined') {
      (window as any)['freshPageData'] = () => {
        refreshData();
      };
    }
  }, []);

  // 同步 activeType 到 ref
  useEffect(() => {
    activeTypeRef.current = activeType;
  }, [activeType]);

  // 切换分类时重置到第一页并显示骨架屏
  useEffect(() => {
    setPage(1);
    // 切换分类时，如果已经初始化过，则显示骨架屏
    if (initializedRef.current) {
      setIsInitialLoading(true);
    }
  }, [activeType]);

  // 页码或分类变化时加载作品
  useEffect(() => {
    if (getToken() && initializedRef.current) {
      loadWorks();
    }
  }, [page, activeType]);

  // 绑定触摸事件监听器
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

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

  const checkToken = (retry = 0) => {
    const MAX_RETRY = 5;

    console.log('uid', getUid());
    // 如果已经有 token 就直接结束，不再调用 loadWorks（由 useEffect 统一处理）
    if (getToken()) {
      console.log('has token');
      initializedRef.current = true;
      return;
    }

    if (!APPBridge.judgeIsInApp()) return;

    APPBridge.appCall(
      {
        type: 'MKUserInfo',
        jsCbFnName: 'appBridgeOnUserInfoCb',
      },
      p => {
        console.log('作品页面 appBridgeOnUserInfoCb', p, 'attempt', retry + 1);

        if (p?.uid) {
          // 成功获取到 token
          setCookieExpire(`${appid}_token`, p?.token, 3 * 60 * 60 * 1000);
          setCookieExpire(`${appid}_uid`, p.uid, 3 * 60 * 60 * 1000);
          initializedRef.current = true;
          // 设置一个小的延迟，让 cookie 生效后由 useEffect 统一触发加载
          setTimeout(() => {
            setPage(1); // 触发 useEffect 重新加载
          }, 100);
          return; // 停止重试
        }

        // 没有拿到 token，并且没超过最大次数，就 1s 后重试
        if (retry + 1 < MAX_RETRY) {
          setTimeout(() => {
            if (!getToken()) checkToken(retry + 1);
          }, 1000);
        } else {
          console.log('checkToken: reached max attempts, stop retrying');
        }
      }
    );
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
      setIsInitialLoading(true);
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
    setIsInitialLoading(true);
    loadWorks(1, '');
  };

  const totalPages = Math.ceil(total / pageSize);

  // 加载购买状态（为了兼容 WorkInfoCard，但 MAKA 作品不需要）
  const handleDataChange = () => {
    loadWorks(page);
    loadCategoryCount();
  };

  // 渲染骨架屏卡片
  const renderSkeletonCard = () => {
    return (
      <div className='bg-white rounded-lg overflow-hidden shadow-sm'>
        <div className='relative flex gap-3 md:flex-col md:gap-2 p-3'>
          {/* 缩略图骨架 */}
          <div className='w-[78px] md:w-full aspect-square relative flex-shrink-0 rounded overflow-hidden'>
            <Skeleton className='w-full h-full' />
          </div>
          {/* 内容骨架 */}
          <div className='flex-1 flex flex-col gap-2 md:gap-1.5'>
            <Skeleton className='h-4 w-3/4' />
            <Skeleton className='h-3 w-1/2' />
          </div>
        </div>
      </div>
    );
  };

  const toEditor = (work: WorksItem) => {
    const uid = getUid();
    const works_id = work.id;

    if (work.editor_version === 10) {
      store.push('/maka-v2/editor', {
        newWindow: isPc(),
        fullScreen: true,
        popEnable: false,
        query: {
          works_id,
          uid,
          appid,
        },
      });
    } else if (work.editor_version === 7) {
      if (isPc()) {
        let url = `/maka-v2/editor-pc?works_id=${works_id}&uid=${uid}&appid=${appid}`;
        store.push(url, {
          newWindow: true,
        });
        return;
      }
      // MAKA作品
      let url = `${API('根域名')}/editor-wap-v7/?token=${getToken()}&page_id=${works_id}&uid=${uid}&is_full_screen=1&popEnable=0`;
      if (APPBridge.isRN()) {
        url += '&rn_mode=true';
      }
      store.push(url);
    } else {
      toast.error('抱歉，该作品只支持在电脑浏览器内编辑。');
    }
  };

  const handleShareLegacy = async (workItem: WorksItem) => {
    store.push(
      `/maka-v2/share-legacy?works_id=${workItem.id}&uid=${workItem.uid}`
    );
  };

  // 渲染作品卡片
  const renderWorkCard = (work: WorksItem) => {
    return (
      <div key={work.id} className='relative'>
        <WorkInfoCard
          work={work}
          isVip={store.isVip}
          purchaseStatus={'purchased'}
          onDownload={async () => {
            const worksItem = work as WorksItem;
            if (worksItem.editor_version !== 10) {
              // 只处理旧版本作品（editor_version !== 10）
              const canPublish = await store.checkSharePermission(work.id, {
                trackData: {
                  works_id: work.id,
                  ref_object_id: work.template_id,
                  editor_version: work.editor_version,
                  works_type: 'poster',
                  vipType: 'share',
                },
              });
              if (!canPublish) {
                return;
              }

              // 下载海报
              store.push(
                `/maka-v2/download-legacy?works_id=${work.id}&uid=${work.uid}`
              );
            } else {
              const worksDetail = (await trpc.works.findById.query({
                id: work.id,
              })) as unknown as SerializedWorksEntity;
              if (worksDetail.share_type === 'invite') {
                worksActions.toDownloadInviteeManager(worksDetail);
                return;
              }
              await worksActions.downloadWork(worksDetail, {
                autoShare: true,
              });
            }
          }}
          onShare={async () => {
            const worksItem = work as WorksItem;
            if (
              worksItem.analytics &&
              worksItem.analytics.length > 0 &&
              worksItem.editor_version !== 10
            ) {
              await handleShareLegacy(work as WorksItem);
            } else {
              const worksDetail = (await trpc.works.findById.query({
                id: work.id,
              })) as unknown as SerializedWorksEntity;
              worksActions.toPreviewModal(worksDetail);
            }
          }}
          showBadge={false}
          onDataChange={handleDataChange}
          specInfo={specInfo}
          toEdit={() => {
            toEditor(work);
          }}
          onData={() => {
            const worksItem = work as WorksItem;
            if (
              worksItem.analytics &&
              worksItem.analytics.length > 0 &&
              worksItem.editor_version !== 10
            ) {
              if (APPBridge.judgeIsInApp()) {
                APPBridge.navToPage({
                  url: worksItem.analytics[0].url,
                  type: 'NATIVE',
                });
              } else {
                store.push(worksItem.analytics[0].url, {
                  newWindow: isPc(),
                });
              }
              return;
            } else {
              const url = `/maka-v2/dataview?works_id=${work.id}&appid=maka&is_full_screen=1`;
              store.push(url, {
                newWindow: isPc(),
              });
            }
          }}
        />
        {work.editor_version === 10 && (
          <Badge className='absolute top-1.5 left-1.5'>新版</Badge>
        )}
      </div>
    );
  };

  return (
    <div
      className='flex flex-col bg-white relative h-full'
      id='WorksListForMaka'
      style={{
        paddingTop: 'var(--safe-area-inset-top, 0px)',
      }}
    >
      {/* 分类 Tabs / 搜索框 */}
      <div className='sticky top-0 z-20 px-4 border-b border-gray-200 bg-white'>
        {!showSearch ? (
          <div className='py-3'>
            <Tabs
              value={activeType}
              onValueChange={value => setActiveType(value)}
            >
              <TabsList className='w-full justify-start bg-transparent h-auto p-0 overflow-x-auto gap-4 rounded-none'>
                {tabs.map(tab => (
                  <TabsTrigger
                    key={tab.type}
                    value={tab.type}
                    className='px-0 py-2 text-md text-gray-400 data-[state=active]:text-[#09090B] data-[state=active]:font-semibold rounded-none border-0 border-b border-transparent data-[state=active]:border-[#09090B] data-[state=active]:border-b-[2px] whitespace-nowrap'
                  >
                    {tab.label}{' '}
                    <span className='text-xs'>
                      ({categoryCount[tab.type as keyof typeof categoryCount]})
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <button
              onClick={toggleSearch}
              className='absolute top-1/2 -translate-y-1/2 right-4 p-1 text-gray-600 active:text-gray-800 transition-colors'
              aria-label='搜索作品'
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
                placeholder='搜索作品名称'
                className='w-full py-2 pl-3 pr-8 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
              {searchInput && (
                <button
                  onClick={handleClearSearch}
                  className='absolute right-2 p-1 text-gray-400 active:text-gray-600'
                  aria-label='清除搜索'
                >
                  <X className='w-4 h-4' />
                </button>
              )}
            </div>
            <button
              onClick={handleSearch}
              className='py-2 text-md text-blue-600 active:text-blue-800 whitespace-nowrap font-medium'
            >
              搜索
            </button>
            <button
              onClick={toggleSearch}
              className='py-2 text-md text-gray-600 active:text-gray-800 whitespace-nowrap'
            >
              取消
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
                {/* <Loader2 className='w-5 h-5 animate-spin' />
                  <span className='font-medium'>刷新中...</span> */}
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
                  {pullDistance >= 60 ? '松手刷新' : '下拉刷新'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className='content relative flex-1 flex flex-col overflow-y-auto'>
        {/* 加载遮罩层 - 只在非初始加载时显示（数据更新时保留原有数据） */}
        {loading && !isInitialLoading && (
          <div className='absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm'>
            <div className='flex items-center gap-2 text-sm text-gray-500'>
              <Loader2 className='w-5 h-5 animate-spin' />
              <span>加载中...</span>
            </div>
          </div>
        )}

        {/* 作品列表 */}
        <div
          ref={scrollContainerRef}
          className={cn(
            `flex-1 overflow-y-auto bg-[#f5f5f5] px-4 py-3 ${totalPages > 1 && !loading ? 'pb-[60px]' : ''}`,
            totalPages > 1 && !loading ? 'pb-[60px]' : ''
          )}
        >
          {/* 第一次加载时显示骨架屏 */}
          {isInitialLoading && loading ? (
            <div
              className={cn(
                'gap-3 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 md:gap-4 lg:gap-6 xl:gap-8'
              )}
            >
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={`skeleton-${index}`}>{renderSkeletonCard()}</div>
              ))}
            </div>
          ) : worksList.length === 0 && !loading ? (
            <div className='flex flex-col items-center justify-center h-64'>
              <div className='text-sm text-gray-400'>还没有作品</div>
            </div>
          ) : (
            <div
              className={cn(
                'gap-3 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 md:gap-4 lg:gap-6 xl:gap-8'
              )}
            >
              {worksList.map(renderWorkCard)}
            </div>
          )}

          {/* 分页 */}
          {totalPages > 1 && (
            <div className='py-2 mt-4'>
              <Pagination className='w-full'>
                <PaginationContent className='gap-2 w-full'>
                  <PaginationItem>
                    <PaginationLink
                      onClick={() => page > 1 && setPage(page - 1)}
                      className={`h-8 w-8 p-0 text-xs bg-white border border-gray-300 ${page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
                      aria-label='上一页'
                    >
                      <ChevronLeft className='h-4 w-4' />
                    </PaginationLink>
                  </PaginationItem>

                  <div className='flex gap-2 items-center'>
                    {(() => {
                      const showMax = 7;

                      if (totalPages <= showMax) {
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

                      const pages: (number | 'ellipsis')[] = [];
                      const showStart = Math.max(2, page - 1);
                      const showEnd = Math.min(totalPages - 1, page + 1);

                      pages.push(1);
                      if (showStart > 2) pages.push('ellipsis');
                      for (let i = showStart; i <= showEnd; i++) pages.push(i);
                      if (showEnd < totalPages - 1) pages.push('ellipsis');
                      pages.push(totalPages);

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
                      aria-label='下一页'
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
  );
};

const WorksListForMakaWithActions = (props: Props) => {
  return (
    <WorksActionsProvider>
      <WorksListForMaka {...props} />
    </WorksActionsProvider>
  );
};

export default observer(WorksListForMakaWithActions);

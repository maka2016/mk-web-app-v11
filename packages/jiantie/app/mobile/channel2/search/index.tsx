'use client';
import { Template } from '@/app/mobile/channel/components/template-card';
import { LazyImage } from '@/components/LazyImage';
import { cdnApi, getAppId } from '@/services';
import { mkWebStoreLogger } from '@/services/logger';
import { useStore } from '@/store';
import APPBridge from '@/store/app-bridge';
import { queryToObj, random } from '@/utils';
import { Icon } from '@workspace/ui/components/Icon';
import { Loading } from '@workspace/ui/components/loading';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import cls from 'classnames';
import { Check, ChevronDown } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import InfiniteScroll from 'react-infinite-scroller';
import SearchInput from './SearchInput';
import styles from './search.module.scss';

const PAGE_SIZE = 30;

const Search = (props: { keywords?: string }) => {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const store = useStore();
  const [keyword, setKeyword] = useState<string>(props.keywords || '');
  const [historyWords, setHistoryWords] = useState<string[]>([]);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [finished, setFinished] = useState<boolean>(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [sortType, setSortType] = useState<
    'composite' | 'latest' | 'bestseller'
  >('composite');
  const [selectedSpecId, setSelectedSpecId] = useState<string>('');
  const [showSortModal, setShowSortModal] = useState(false);
  const [specs, setSpecs] = useState<
    Array<{ id: string; name: string; count?: number }>
  >([]);
  const [total, setTotal] = useState<number>(0);

  const pageInstIdRef = useRef<string>(
    `search_page_${random(25).toUpperCase()}`
  );
  const templateCacheRef = useRef<any>({});
  const trackedSearchKeyRef = useRef<string>('');

  const appid = getAppId();
  const activeEdition = appid === 'jiantie' ? 'personal' : 'business';

  const replaceUrlArg = (argVal: string, type: string) => {
    const params = new URLSearchParams(urlSearchParams);
    params.set(type, argVal);

    // 使用 router.replace + shallow 模式
    router.replace(`?${params.toString()}`, {
      scroll: false,
    });
  };

  const getHistoryWords = async () => {
    const history = localStorage.getItem('HOME_CACHE_HISTORY_KEY');
    setHistoryWords(history ? JSON.parse(history) : []);
  };

  const updateHistoryWords = (item: string) => {
    if (!item || historyWords.includes(item)) return;
    const history = [item, ...historyWords];
    localStorage.setItem('HOME_CACHE_HISTORY_KEY', JSON.stringify(history));
    setHistoryWords(history);
  };

  const clearHistory = () => {
    localStorage.setItem('HOME_CACHE_HISTORY_KEY', JSON.stringify([]));
    setHistoryWords([]);
  };

  const getTemplatesByKeyword = async (targetPage?: number) => {
    if (loading || finished) return;
    setLoading(true);

    const currentPage = targetPage ?? page;

    try {
      const params = new URLSearchParams({
        query: keyword,
        page: currentPage.toString(),
        page_size: PAGE_SIZE.toString(),
        sort: sortType,
      });

      const currentAppid = getAppId();
      if (currentAppid) {
        params.set('appid', currentAppid);
      }

      if (selectedSpecId) {
        params.set('spec_id', selectedSpecId);
      }

      const res = await fetch(`/api/search-v1?${params.toString()}`);
      const data = await res.json();

      if (data.result) {
        const templateList: Template[] =
          data.result.template_list?.map((item: any) => {
            const coverUrl = item.cover?.url || item.preview_image_url || '';
            return {
              id: item.template,
              name: item.name || '',
              desc: item.desc || '',
              template_id: item.template,
              cover_url: coverUrl,
              cover: item.cover || { url: coverUrl },
              coverV3: item.coverV3 || null,
            };
          }) || [];
        const newTemplates =
          currentPage > 1 ? templates.concat(templateList) : templateList;
        setTemplates(newTemplates);
        setLoading(false);
        setFinished(templateList.length < PAGE_SIZE);

        // 更新模板总量
        if (data.result.total !== undefined) {
          setTotal(data.result.total);

          // 在第一页搜索结果返回后进行打点，将搜索结果数量写到 object_id
          if (currentPage === 1 && keyword) {
            const searchKey = `${keyword}_${sortType}_${selectedSpecId}`;
            if (trackedSearchKeyRef.current !== searchKey) {
              trackedSearchKeyRef.current = searchKey;
              const query = queryToObj();
              mkWebStoreLogger.track_pageview({
                page_type: 'search_v2_page',
                page_id: keyword,
                page_inst_id: pageInstIdRef.current,
                parent_page_type: query.parent_page_type || '',
                ref_page_id: decodeURIComponent(query.ref_page_id || ''),
                object_id: data.result.total.toString(),
              });
            }
          }
        }

        // 更新规格列表（只在第一页且不带规格筛选条件时更新）
        // 规格筛选列表使用不带规格筛选条件时api返回的规格数据
        if (currentPage === 1 && !selectedSpecId && data.result.specs) {
          setSpecs(
            (data.result.specs || [])
              .map((spec: any) => ({
                id: spec.id,
                name: spec.display_name || spec.name || spec.alias || '',
                count: spec.count,
              }))
              .sort(
                (a: { count?: number }, b: { count?: number }) =>
                  (b.count || 0) - (a.count || 0)
              )
          );
        }

        // 只有在成功加载数据后才更新 page
        if (templateList.length > 0 && currentPage === page) {
          setPage(page + 1);
        }
      } else {
        setLoading(false);
        setFinished(true);
      }
    } catch (error) {
      console.error('搜索失败:', error);
      setLoading(false);
      setFinished(true);
    }
  };

  // 同步 props.keywords 到 state（用于从 URL 恢复搜索关键词）
  useEffect(() => {
    if (props.keywords && props.keywords !== keyword) {
      setKeyword(props.keywords);
    }
  }, [props.keywords]);

  // 当搜索词、排序或规格变化时，重置并重新搜索
  useEffect(() => {
    if (!keyword) return;

    setPage(1);
    setTemplates([]);
    setFinished(false);
    // 重置打点标记，以便新搜索时可以重新打点
    trackedSearchKeyRef.current = '';

    // 使用 setTimeout 确保状态更新后再执行搜索
    const timer = setTimeout(() => {
      getTemplatesByKeyword(1);
    }, 0);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, sortType, selectedSpecId]);

  const onSearch = async (value: string) => {
    console.log('onSearch', value, pageInstIdRef.current);
    updateHistoryWords(value);
    // 使用 router.replace 更新 URL 参数，防止返回时失去搜索结果
    const params = new URLSearchParams(urlSearchParams);
    params.set('keywords', value);
    params.set('ref_page_id', value);
    router.replace(`?${params.toString()}`, {
      scroll: false,
    });
    templateCacheRef.current = {};
    setFinished(false);
    setKeyword(value);
    setPage(1);
    setTemplates([]);
    // 重置打点标记，以便新搜索时可以重新打点
    trackedSearchKeyRef.current = '';
  };

  const handleSortChange = (sort: 'composite' | 'latest' | 'bestseller') => {
    setSortType(sort);
    setPage(1);
    setTemplates([]);
    setFinished(false);
    setShowSortModal(false);
  };

  const handleSpecChange = (specId: string) => {
    setSelectedSpecId(specId === selectedSpecId ? '' : specId);
    setPage(1);
    setTemplates([]);
    setFinished(false);
  };

  const getSortLabel = () => {
    switch (sortType) {
      case 'composite':
        return '综合排序';
      case 'latest':
        return '最新排序';
      case 'bestseller':
        return '最热排序';
      default:
        return '综合排序';
    }
  };

  const loadMore = () => {
    if (loading || finished) {
      return;
    }

    getTemplatesByKeyword();
  };

  const renderTemlates = () => {
    if (!templates?.length && finished) {
      return (
        <div className={styles.empty}>
          <img
            src='https://img2.maka.im/cdn/editor7/material_empty_tip.png'
            height={96}
            width={137}
            alt='当前没有数据哦～'
          />
          <span>当前没有数据哦～</span>
        </div>
      );
    }

    return (
      <InfiniteScroll loadMore={loadMore} hasMore={!finished} useWindow={false}>
        <TemplateWaterfall
          templates={templates}
          activeEdition={activeEdition}
          pageType='search_v2_page'
          pageId={keyword}
          pageInstId={pageInstIdRef.current}
        />
      </InfiniteScroll>
    );
  };

  const renderContent = () => {
    if (!keyword) {
      return (
        <div className={styles.searchWord}>
          <div className={styles.history}>
            <div className={cls([styles.title, styles.justifyBetween])}>
              <span>历史搜索</span>
              <Icon name='delete' onClick={() => clearHistory()} />
            </div>
            <div className={styles.historyWrap}>
              {historyWords?.map((item, index) => (
                <div
                  className={styles.historyItem}
                  key={index}
                  onClick={() => onSearch(item)}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    return (
      <>
        {/* 规格筛选标签和排序按钮 */}
        <div className='flex items-center justify-between px-3 py-1.5 bg-white border-b border-gray-100'>
          {/* 规格筛选标签 */}
          <div className='flex flex-wrap items-center gap-1.5 flex-1 overflow-x-auto'>
            {/* 全部 */}
            <button
              className={cls(
                'px-2 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap',
                !selectedSpecId
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-700 active:bg-gray-200'
              )}
              style={
                !selectedSpecId
                  ? {
                      backgroundColor: 'var(--theme-color)',
                      color: 'var(--btn-text-color)',
                    }
                  : undefined
              }
              onClick={() => handleSpecChange('')}
            >
              全部
            </button>
            {/* 规格标签 - 如果只有一个规格则不显示 */}
            {specs.length > 1 &&
              specs.map(spec => {
                const isActive = selectedSpecId === spec.id;
                return (
                  <button
                    key={spec.id}
                    className={cls(
                      'px-2 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap',
                      isActive
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                    )}
                    style={
                      isActive
                        ? {
                            backgroundColor: 'var(--theme-color)',
                            color: 'var(--btn-text-color)',
                          }
                        : undefined
                    }
                    onClick={() => handleSpecChange(spec.id)}
                  >
                    {spec.name}
                    {spec.count !== undefined && spec.count}
                  </button>
                );
              })}
          </div>
          {/* 排序按钮 */}
          <div
            className='flex items-center gap-1 cursor-pointer ml-2 shrink-0'
            onClick={() => setShowSortModal(true)}
          >
            <span className='text-sm font-medium text-gray-700'>
              {getSortLabel()}
            </span>
            <ChevronDown className='w-4 h-4 text-gray-500' />
          </div>
        </div>
        <div id='search-scroll' className={styles.scrollContainer}>
          {renderTemlates()}
          {loading && (
            <div className='flex justify-center items-center p-4'>
              <Loading />
            </div>
          )}
        </div>
      </>
    );
  };

  const goBack = () => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navAppBack();
    } else {
      router.back();
    }
  };

  useEffect(() => {
    getHistoryWords();

    const query = queryToObj();
    // mkWebStoreLogger.track_pageview({
    //   page_type: 'search_page',
    //   page_id: 'search_page',
    //   page_inst_id: pageInstIdRef.current,
    //   parent_page_type: query.parent_page_type || '',
    //   ref_page_id: decodeURIComponent(query.ref_page_id || ''),
    // });
  }, []);

  return (
    <div
      className={cls([styles.searchContainer, appid && (styles as any)[appid]])}
    >
      <div className={styles.searchInput}>
        <div className='size-5'>
          <Icon name='left' size={20} onClick={() => goBack()} />
        </div>
        <SearchInput keyword={keyword} onSearch={onSearch} />
      </div>
      {renderContent()}

      {/* 排序选择弹窗 */}
      <ResponsiveDialog
        isDialog
        isOpen={showSortModal}
        onOpenChange={setShowSortModal}
        contentProps={{
          className: 'rounded-[12px] p-4 max-w-[90vw] mx-auto',
        }}
      >
        <div
          className='flex flex-col bg-white'
          style={{
            width: '100%',
            gap: '8px',
            borderRadius: '12px',
          }}
        >
          <div
            className='flex items-center justify-center text-center w-full py-2'
            style={{ borderBottom: '1px solid #f1f5f9' }}
          >
            <h2
              className='text-lg font-semibold'
              style={{
                fontFamily: '"PingFang SC"',
                color: '#101828',
                lineHeight: '28px',
              }}
            >
              排序方式
            </h2>
          </div>
          <div className='flex flex-col' style={{ gap: '4px' }}>
            {[
              { value: 'composite', label: '综合排序', desc: '多因素综合排序' },
              { value: 'latest', label: '最新排序', desc: '按创建时间倒序' },
              {
                value: 'bestseller',
                label: '最热排序',
                desc: '按受欢迎程度倒序',
              },
            ].map(option => {
              const isActive = sortType === option.value;
              return (
                <button
                  key={option.value}
                  className='flex items-center justify-between w-full px-4 py-3 cursor-pointer active:bg-gray-100'
                  style={{ borderRadius: '8px' }}
                  onClick={() =>
                    handleSortChange(
                      option.value as 'composite' | 'latest' | 'bestseller'
                    )
                  }
                >
                  <div
                    className='flex flex-col items-start'
                    style={{ gap: '2px' }}
                  >
                    <span
                      className='text-base font-medium'
                      style={{
                        fontFamily: '"PingFang SC"',
                        color: isActive ? '#101828' : '#475569',
                      }}
                    >
                      {option.label}
                    </span>
                    <span
                      className='text-xs'
                      style={{
                        fontFamily: '"PingFang SC"',
                        color: '#94a3b8',
                      }}
                    >
                      {option.desc}
                    </span>
                  </div>
                  {isActive && (
                    <Check
                      className='w-5 h-5 shrink-0'
                      style={{ color: '#d53933' }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  );
};

// 模板瀑布流组件
interface TemplateWaterfallProps {
  templates: Template[];
  activeEdition: 'personal' | 'business';
  pageType: string;
  pageId: string;
  pageInstId: string;
}

const TemplateWaterfall = ({
  templates,
  activeEdition,
  pageType,
  pageId,
  pageInstId,
}: TemplateWaterfallProps) => {
  const store = useStore();
  const appid = getAppId();
  const [cardWidth, setCardWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 计算卡片宽度 - 使用容器的实际宽度而不是 window.innerWidth
  useEffect(() => {
    const calculateCardWidth = () => {
      if (containerRef.current) {
        // 获取容器的实际宽度（已经减去了scrollContainer的padding）
        const containerWidth = containerRef.current.clientWidth;
        // 容器宽度 = (容器实际宽度 - 16px gap) / 3
        // gap-2 = 8px，3列有2个gap，总共16px
        // 使用 Math.floor 确保像素对齐，避免小数导致的渲染问题
        const width = Math.floor((containerWidth - 16) / 3);
        setCardWidth(width);
      }
    };

    calculateCardWidth();

    // 使用 ResizeObserver 监听容器尺寸变化
    const resizeObserver = new ResizeObserver(() => {
      calculateCardWidth();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // 同时监听窗口大小变化（作为备用）
    window.addEventListener('resize', calculateCardWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', calculateCardWidth);
    };
  }, []);

  // 将模板分配到3列中，实现真正的瀑布流
  const columns = useMemo(() => {
    if (!cardWidth || templates.length === 0) {
      return [[], [], []];
    }

    // 计算每个模板卡片的高度
    const getCardHeight = (template: Template) => {
      if (!template.coverV3) {
        // 如果没有 coverV3，使用默认宽高比 9:16
        return (cardWidth * 16) / 9;
      }

      const { width, height } = template.coverV3;

      return (cardWidth * height) / width;
    };

    // 初始化3列
    const newColumns: Array<Array<Template>> = [[], [], []];
    // 记录每列的总高度
    const columnHeights = [0, 0, 0];

    // 遍历所有模板，将每个模板分配到高度最小的列
    templates.forEach(template => {
      // 找到高度最小的列
      const minHeight = Math.min(...columnHeights);
      const cardHeight = getCardHeight(template);
      const maxAllowedHeight = minHeight + 100; // 允许100px的差额

      // 优先插入到左边：从左到右找到第一个高度不超过（最小高度 + 100px）的列
      let targetIndex = -1;
      for (let i = 0; i < columnHeights.length; i++) {
        if (columnHeights[i] <= maxAllowedHeight) {
          targetIndex = i;
          break;
        }
      }

      // 如果没找到符合条件的列，使用高度最小的列
      if (targetIndex === -1) {
        targetIndex = columnHeights.indexOf(minHeight);
      }

      // 将模板添加到该列
      newColumns[targetIndex].push(template);

      // 更新该列的高度
      columnHeights[targetIndex] += cardHeight;
    });

    return newColumns;
  }, [templates, cardWidth]);

  // 计算每个模板卡片的高度（用于渲染）
  const getCardHeight = (template: Template) => {
    if (!cardWidth) return 0;

    if (!template.coverV3) {
      // 如果没有 coverV3，使用默认宽高比 9:16
      return (cardWidth * 16) / 9;
    }

    const { width, height } = template.coverV3;

    //临时
    if (height > 1400) {
      return (cardWidth * 20) / 9;
    }

    return (cardWidth * height) / width;
  };

  const handleTemplateClick = (template: Template) => {
    const templateId = template.template_id || template.id || '';
    const templateName = template.name || '';

    // 构建 URL 参数
    const params = new URLSearchParams({
      id: templateId,
      appid: appid || '',
      template_name: templateName,
    });

    // 添加搜索页面相关的打点参数
    if (pageId) {
      params.set('ref_page_id', pageId);
    }
    params.set('ref_page_type', pageType);

    // 从当前 URL 获取 clickid 参数
    const currentParams = new URLSearchParams(window.location.search);
    const clickid = currentParams.get('clickid');
    if (clickid) {
      params.set('clickid', clickid);
    }

    const url = `/mobile/template?${params.toString()}`;

    if (APPBridge.judgeIsInApp()) {
      const appUrl = new URL(
        `${location.origin}/mobile/template`,
        window.location.origin
      );
      appUrl.searchParams.set('id', templateId);
      appUrl.searchParams.set('is_full_screen', '1');
      // 在 App 内跳转时也要添加打点参数
      if (pageId) {
        appUrl.searchParams.set('ref_page_id', pageId);
      }
      appUrl.searchParams.set('ref_page_type', pageType);
      APPBridge.navToPage({
        url: appUrl.toString(),
        type: 'URL',
      });
    } else {
      store.push(url);
    }
  };

  return (
    <div ref={containerRef} className='flex gap-2 pt-2'>
      {columns.map((column, columnIndex) => (
        <div key={columnIndex} className='flex-1 flex flex-col gap-2'>
          {column.map(template => {
            const cardHeight = getCardHeight(template);
            const coverUrltemp =
              template.coverV3?.url || '';
            const coverUrl = cdnApi(coverUrltemp, {
              resizeWidth: cardWidth * 3,
              resizeHeight: cardHeight * 3,
              format: 'webp',
              quality: 90,
            });

            let previewCoverUrl;
            if (coverUrltemp.indexOf('gif') > -1) {
              previewCoverUrl = `${coverUrltemp}&x-oss-process=image/resize,m_lfit,w_160,q_60,image/format,jpg`;
            }

            return (
              <div
                key={template.id || template.template_id}
                className='relative rounded-sm overflow-hidden cursor-pointer active:opacity-80 transition-opacity'
                style={{
                  height: `${cardHeight}px`,
                  boxShadow: '0 2px 2px 2px rgba(0, 0, 0, 0.10)',
                }}
                onClick={() => handleTemplateClick(template)}
              >
                {coverUrl ? (
                  <LazyImage
                    src={coverUrl}
                    coverSrc={previewCoverUrl}
                    alt={template.name || ''}
                    className='w-full h-full relative'
                    style={{ height: '100%' }}
                    edition={activeEdition}
                    templateId={template.id || template.template_id}
                    onLoad={() => {
                      const query = queryToObj();
                      mkWebStoreLogger.track_show({
                        object_type: 'template_item',
                        object_id: template.id || template.template_id,
                        page_type: pageType,
                        page_id: pageId,
                        parent_page_type: query.parent_page_type || '',
                        ref_page_id: decodeURIComponent(
                          query.ref_page_id || ''
                        ),
                        page_inst_id: pageInstId,
                      } as any);
                    }}
                  />
                ) : (
                  <div
                    className='w-full h-full flex items-center justify-center'
                    style={{ backgroundColor: '#f4f4f5' }}
                  >
                    <span className='text-gray-400 text-xs'>暂无封面</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default Search;

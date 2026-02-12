'use client';
import cls from 'classnames';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { getSearchMubanBySparam, sParamType } from '../api/search';
import SearchInput, { types } from '../components/SearchInput';
// import localforage from "localforage"
import { getAppId, getUid } from '@/services';
import { mkWebStoreLogger } from '@/services/logger';
import { useStore } from '@/store';
import APPBridge from '@/store/app-bridge';
import { queryToObj, random } from '@/utils';
import { trpc } from '@/utils/trpc';
import { Icon } from '@workspace/ui/components/Icon';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Check, ChevronDown, Loader2, Sparkles } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import InfiniteScroll from 'react-infinite-scroller';
import {
  TrackingContext,
  TrackingContextValue,
} from '../../../../components/TrackingContext';
import {
  TemplateItem2026,
  TemplateWaterfall,
} from '../Channel2026/TemplateWaterfall';
import SearchFacets, {
  Facets,
  SearchParamsType,
} from '../components/SearchFacets';
import SearchFacetsMix from '../components/SearchFacetsMix';
import Waterfall from '../components/Waterfall';

interface Hotword {
  search_content: string;
}

interface Suggestion {
  keyword: string;
}

const PAGE_SIZE = 50;

const Search = (props: { keywords?: string }) => {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const store = useStore();
  const [keyword, setKeyword] = useState<string>(props.keywords || '');
  const [hotwords, setHotwords] = useState<Hotword[]>([]);
  const [historyWords, setHistoryWords] = useState<string[]>([]);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [finished, setFinished] = useState<boolean>(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [oq, setOq] = useState<string>('');
  const [searchParams, setSearchParamsState] = useState<SearchParamsType>({});
  const [facets, setFacets] = useState<Facets>({
    category: [],
    spec: [],
    style_tag: [],
    color_tag: [],
  });
  const [facetsUpdate, setFacetsUpdate] = useState(true);
  const [specsLoading, setSpecsLoading] = useState<boolean>(false);

  // 新版模板搜索相关状态（参考 channel2/search）
  const [newTemplates, setNewTemplates] = useState<TemplateItem2026[]>([]);
  const [newPage, setNewPage] = useState<number>(1);
  const [newLoading, setNewLoading] = useState<boolean>(false);
  const [newFinished, setNewFinished] = useState<boolean>(false);
  const [sortType, setSortType] = useState<
    'composite' | 'latest' | 'bestseller'
  >('composite');
  const [selectedSpecId, setSelectedSpecId] = useState<string>('');
  const [showSortModal, setShowSortModal] = useState(false);
  const [specs, setSpecs] = useState<
    Array<{ id: string; name: string; count?: number }>
  >([]);
  const [total, setTotal] = useState<number>(0);
  const [showAllNewTemplates, setShowAllNewTemplates] =
    useState<boolean>(false);
  const [ignoreNextNewLoadMore, setIgnoreNextNewLoadMore] =
    useState<boolean>(false);
  const [specsLoaded, setSpecsLoaded] = useState<boolean>(false); // 标记筛选器数据是否已加载
  const [newDataFirstLoaded, setNewDataFirstLoaded] = useState<boolean>(false); // 标记当前搜索词的新数据是否首次加载完成
  const [oldDataFirstLoaded, setOldDataFirstLoaded] = useState<boolean>(false); // 标记旧版搜索第一页是否已加载完成
  const [oldTemplateTotal, setOldTemplateTotal] = useState<number>(0); // 旧版搜索的模板总数

  const appid = getAppId();

  const pageInstIdRef = useRef<string>(
    `search_page_${random(25).toUpperCase()}`
  );
  const templateCacheRef = useRef<any>({});
  const trackedSearchKeyRef = useRef<string>(''); // 用于避免重复打点
  const { appVersion } = useStore();

  const replaceUrlArg = (argVal: string, type: string) => {
    const params = new URLSearchParams(urlSearchParams);
    params.set(type, argVal);

    // 使用 router.replace + shallow 模式
    router.replace(`?${params.toString()}`, {
      scroll: false,
    });
  };

  const getSearchHotWords = async () => {
    try {
      const result = await trpc.search.listHotKeywords.query({
        appid: appid,
        online: true,
        skip: 0,
        take: 20,
      });
      if (result?.data) {
        // 将新的热词数据映射为旧的数据结构格式，保持兼容性
        const mappedHotwords = result.data.map((item: { keyword: string }) => ({
          search_content: item.keyword,
        }));
        setHotwords(mappedHotwords);
      }
    } catch (error) {
      console.error('获取热词失败:', error);
      // 如果 tRPC 请求失败，保持空数组，不影响其他功能
      setHotwords([]);
    }
  };

  // 新版搜索：仅用于获取规格筛选器数据的独立请求（不携带筛选条件）
  const getNewSpecsByKeyword = async (targetKeyword?: string) => {
    const queryValue = targetKeyword ?? keyword;
    if (!queryValue || specsLoading) return;

    setSpecsLoading(true);
    setSpecsLoaded(false); // 重置加载状态
    try {
      const currentAppid = getAppId();

      // 注意：这里不能带上任何筛选条件（尤其是 spec_id），保持独立
      const data = await trpc.search.searchTemplates.query({
        query: queryValue,
        // 使用 facet_mode=1 仅拉取标签数据，降低数据传输量
        facet_mode: '1',
        sort: 'composite',
        appid: currentAppid || undefined,
      });

      if (data.result?.specs) {
        const specList = (data.result.specs || [])
          .map((spec: any) => ({
            id: spec.id,
            // 这里保留原有的名称优先级：display_name > name > alias
            name: spec.display_name || spec.name || spec.alias || '',
            count: spec.count,
          }))
          .sort(
            (
              a: { id: string; name: string; count?: number },
              b: { id: string; name: string; count?: number }
            ) => {
              // 先让“图片”规格排在最前面
              const aIsPicture = a.name === '图片';
              const bIsPicture = b.name === '图片';
              if (aIsPicture && !bIsPicture) return -1;
              if (!aIsPicture && bIsPicture) return 1;

              // 其他规格继续按 count 从高到低排序
              return (b.count || 0) - (a.count || 0);
            }
          );
        setSpecs(specList);

        // 默认选中规格：
        // 1. 优先选中名称为“图片”的规格
        // 2. 如果没有“图片”，则回退为第一个规格
        if (specList.length > 0) {
          const pictureSpec =
            specList.find(
              (item: { id: string; name: string; count?: number }) =>
                item.name === '图片'
            ) ?? specList[0];
          setSelectedSpecId(pictureSpec.id);
        } else {
          setSelectedSpecId('');
        }

        // 标记筛选器数据已加载完成
        setSpecsLoaded(true);
      } else {
        setSpecsLoaded(true);
        setSelectedSpecId('');
      }
    } catch (error) {
      console.error('获取新版推荐规格失败:', error);
      setSpecsLoaded(true);
    } finally {
      setSpecsLoading(false);
    }
  };

  // 新版搜索：获取模板列表
  const getNewTemplatesByKeyword = async (
    targetPage?: number,
    targetKeyword?: string,
    targetSpecId?: string,
    targetSortType?: 'composite' | 'latest' | 'bestseller'
  ) => {
    if (newLoading || newFinished) return;
    const queryValue = targetKeyword ?? keyword;
    if (!queryValue) return;
    setNewLoading(true);

    const currentPage = targetPage ?? newPage;
    const currentSpecId =
      targetSpecId !== undefined ? targetSpecId : selectedSpecId;
    const currentSortType = targetSortType ?? sortType;

    try {
      const currentAppid = getAppId();

      const data = await trpc.search.searchTemplates.query({
        query: queryValue,
        page: currentPage,
        page_size: PAGE_SIZE,
        sort: currentSortType,
        appid: currentAppid || undefined,
        spec_id: currentSpecId || undefined,
      });

      if (data.result) {
        // 类型守卫：检查是否有 template_list（非 facet_mode 模式）
        const hasTemplateList = 'template_list' in data.result;
        const templateList = (hasTemplateList as unknown as TemplateItem2026[])
          ? data.result.template_list?.map((item: any) => {
              const coverUrl = item.cover?.url || item.preview_image_url || '';
              return {
                id: item.template,
                name: item.name || '',
                template_id: item.template,
                cover_url: coverUrl,
                cover: item.cover || coverUrl,
                coverV3: item.coverV3 || null,
                title: item.name || '',
                coverV2: null,
                spec: null,
              };
            }) || []
          : [];
        const newList =
          currentPage > 1
            ? newTemplates.concat(templateList as unknown as TemplateItem2026[])
            : (templateList as unknown as TemplateItem2026[]);
        setNewTemplates(newList as unknown as TemplateItem2026[]);
        setNewLoading(false);
        setNewFinished(templateList.length < PAGE_SIZE);

        if (data.result.total !== undefined) {
          setTotal(data.result.total);
        }

        // 只在成功加载数据后更新页码
        if (templateList.length > 0 && currentPage === newPage) {
          setNewPage(newPage + 1);
        }

        // 首次加载完成（第一页）时，标记新数据已加载，可以显示旧列表
        if (currentPage === 1) {
          setNewDataFirstLoaded(true);
        }

        // 模板列表的请求不再更新规格筛选器数据，避免带上筛选条件
      } else {
        setNewLoading(false);
        setNewFinished(true);
        // 即使没有数据，也标记为已加载，以便显示旧列表
        if (currentPage === 1) {
          setNewDataFirstLoaded(true);
        }
      }
    } catch (error) {
      console.error('搜索失败:', error);
      setNewLoading(false);
      setNewFinished(true);
      // 加载失败时也标记为已加载，以便显示旧列表
      if (currentPage === 1) {
        setNewDataFirstLoaded(true);
      }
    }
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

  // 新版搜索：排序 & 规格交互
  const handleSortChange = (sort: 'composite' | 'latest' | 'bestseller') => {
    setSortType(sort);
    setNewPage(1);
    setNewTemplates([]);
    setNewFinished(false);
    setShowAllNewTemplates(false);
    setShowSortModal(false);
  };

  const handleSpecChange = (specId: string) => {
    setSelectedSpecId(specId === selectedSpecId ? '' : specId);
    setNewPage(1);
    setNewTemplates([]);
    setNewFinished(false);
    setShowAllNewTemplates(false);
  };

  const getTemplatesByKeyword = async () => {
    if (loading || finished) return;
    setLoading(true);

    let { parent_page_type = 'site_search_total', channel = '' } = queryToObj();
    const curType = types.find(
      item => item.key === decodeURIComponent(parent_page_type)
    );
    const params: sParamType = {
      queryWord: keyword,
      cWord: oq,
      filter: {
        ...searchParams.filter,
        category: curType?.filter.category || '',
        ex_category: curType?.filter.ex_category || '',
      },
      orderBy: searchParams.orderBy,
      pageNum: page,
      type: 'word',
      channel,
    };
    const res = await getSearchMubanBySparam(params, {
      u: getUid(),
      cli_rev: appVersion,
    });
    if (res.result) {
      const data = res.result.template_list?.map((item: any) => {
        return {
          template_id: item.template,
          width: item.thumb_width || 110,
          height: item.thumb_height || 190,
          preview_img: item.preview_image_url,
          thumbnail: item.preview_image_url,
          title: item.name,
          spec_name: item.spec_name,
          price: item.price,
          editor_version: item.editor_version,
        };
      });
      const isFirstPage = templates.length === 0;
      const newTemplates = isFirstPage ? data : templates.concat(data);
      setPage(page + 1);
      setTemplates(newTemplates);
      setLoading(false);
      setFinished((res.result.template_list?.length || 0) < PAGE_SIZE);
      setSuggestions(oq ? suggestions : res.result.suggestions);
      if (facetsUpdate) setFacets(res.result.facets);
      setFacetsUpdate(false);

      // 第一页加载完成时，标记旧版搜索已加载，并存储总数
      if (isFirstPage) {
        setOldDataFirstLoaded(true);
        // 使用接口返回的 total_cnt
        setOldTemplateTotal(res.result.total_cnt || 0);
      }
    } else {
      setLoading(false);
      setFinished(true);
      // 即使没有数据，也标记为已加载
      const isFirstPage = templates.length === 0;
      if (isFirstPage) {
        setOldDataFirstLoaded(true);
        setOldTemplateTotal(0);
      }
    }
  };

  // 仅在关键词变化时，先加载筛选器数据
  useEffect(() => {
    if (!keyword) {
      setSpecsLoaded(false);
      setSpecs([]);
      setSelectedSpecId('');
      setNewDataFirstLoaded(false); // 重置新数据加载状态
      setOldDataFirstLoaded(false); // 重置旧数据加载状态
      return;
    }
    // 重置筛选器加载状态，确保模板加载等待筛选器数据加载完成
    setSpecsLoaded(false);
    setSpecs([]);
    setSelectedSpecId('');
    setNewDataFirstLoaded(false); // 重置新数据加载状态，等待新数据加载完成后再显示旧列表
    setOldDataFirstLoaded(false); // 重置旧数据加载状态
    getNewSpecsByKeyword();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  // 筛选器数据加载完成后，自动选中第一个筛选器，然后加载模板数据
  // 或者在排序、规格变化时加载模板数据
  useEffect(() => {
    if (!keyword) return;

    // 如果是新搜索词（keyword刚变化），需要等待筛选器数据加载完成
    // specsLoaded为false时，说明筛选器数据还在加载中，需要等待
    if (!specsLoaded) {
      return;
    }

    // 清空旧数据，避免新旧数据交替显示
    setNewTemplates([]);
    setNewPage(1);
    setNewFinished(false);
    setNewLoading(false);
    setShowAllNewTemplates(false);

    // 筛选器数据已加载完成，可以加载模板数据
    // 如果有选中的规格，会带上规格筛选；如果没有，则不带筛选条件
    getNewTemplatesByKeyword(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, sortType, selectedSpecId, specsLoaded]);

  const onChangeKeyword = (value: string) => {
    templateCacheRef.current = {};
    setKeyword(value);
    setOq(prev => prev || keyword);
    setPage(1);
    setTemplates([]);
    setLoading(false);
    setFinished(false);
    setSearchParamsState({});
    setFacetsUpdate(true);
  };

  const handleSetSearchParams = (value: SearchParamsType) => {
    setPage(1);
    setTemplates([]);
    setLoading(false);
    setFinished(false);
    setSearchParamsState(value);
  };

  useEffect(() => {
    if (!keyword) return;

    getTemplatesByKeyword();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, keyword]);

  // 当新旧搜索的第一页都加载完成后，进行打点
  useEffect(() => {
    if (!keyword) return;

    // 只有当新旧搜索的第一页都加载完成后才打点
    if (newDataFirstLoaded && oldDataFirstLoaded) {
      const searchKey = `${keyword}_${sortType}_${selectedSpecId}`;
      // 避免重复打点
      if (trackedSearchKeyRef.current !== searchKey) {
        trackedSearchKeyRef.current = searchKey;
        const query = queryToObj();
        mkWebStoreLogger.track_pageview({
          page_type: 'search_page_mix',
          page_id: 'search_page',
          search_word: keyword,
          page_inst_id: pageInstIdRef.current,
          parent_page_type: query.parent_page_type || '',
          old_template_count: oldTemplateTotal,
          template_count: total,
          ref_page_id: decodeURIComponent(query.ref_page_id || ''),
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    newDataFirstLoaded,
    oldDataFirstLoaded,
    keyword,
    total,
    oldTemplateTotal,
  ]);

  const onSearch = async (value: string) => {
    if (value === keyword) {
      toast.dismiss();
      toast.error('请输入新的搜索词', { duration: 1200 });
      return;
    }
    updateHistoryWords(value);
    replaceUrlArg(value, 'ref_page_id');
    templateCacheRef.current = {};

    // 重置打点相关的状态
    trackedSearchKeyRef.current = '';
    setOldDataFirstLoaded(false);
    setNewDataFirstLoaded(false);
    setOldTemplateTotal(0);

    // 立即清空所有数据状态，避免新旧数据交替显示导致的闪烁
    setFinished(false);
    setTemplates([]);
    setSearchParamsState({});
    setPage(1);
    setOq('');

    // 新版搜索重置：清空所有相关数据
    setNewTemplates([]);
    setNewPage(1);
    setNewFinished(false);
    setNewLoading(false);
    setShowAllNewTemplates(false);
    setTotal(0);
    setSpecs([]);

    // 清除筛选条件：新搜索词时不带任何筛选条件
    setSelectedSpecId('');
    setSortType('composite');
    setSpecsLoaded(false); // 重置筛选器加载状态
    setNewDataFirstLoaded(false); // 重置新数据加载状态，等待新数据加载完成后再显示旧列表

    // 更新关键词，这会触发 useEffect 重新加载数据
    // 由于我们已经重置了所有状态，useEffect 会使用新的筛选条件（空）重新加载
    setKeyword(value);
  };

  const loadMore = () => {
    if (loading || finished) {
      return;
    }

    getTemplatesByKeyword();
  };

  const renderTemlates = () => {
    const defaultTemplates: any[] = [];
    if (!templates?.length && finished) {
      return (
        <div className='w-full text-center py-8'>
          <img
            src='https://img2.maka.im/cdn/editor7/material_empty_tip.png'
            height={96}
            width={137}
            alt='当前没有数据哦～'
            className='mx-auto'
          />
          <span className='text-xs text-[#7d7e80]'>当前没有数据哦～</span>
        </div>
      );
    }

    const query = queryToObj();
    const key =
      (keyword || '') +
      (oq || '') +
      (searchParams.filter?.spec || '') +
      (searchParams.filter?.style_tag || '') +
      (searchParams.filter?.color_tag || '') +
      (searchParams.orderBy || '') +
      `cat_${query.category}` +
      `ex_cat_${query.ex_category}`;

    return (
      <Waterfall
        key={key}
        id={keyword}
        useWindow={false}
        getScrollParent={() => document.getElementById('scroll-container')}
        template={templates || defaultTemplates}
        finished={finished}
        loading={loading}
        onLoad={() => {
          loadMore();
        }}
        // track={{
        //   page_type: 'search_page_mix',
        //   page_id: 'search_page',
        //   searchword: keyword || '',
        // }}
      />
    );
  };

  // 适配函数：将 search-mix 的 TemplateItem2026 转换为 Channel2026 的 TemplateItem2026 格式
  const adaptTemplate = (template: TemplateItem2026): TemplateItem2026 => {
    return {
      id: template.id || template.template_id,
      title: template.name || '',
      desc: template.desc || '',
      cover: template.coverV3 ? { url: (template.coverV3 as { url: string; width: number; height: number }).url } : { url: template.cover_url || '' },
      coverV3: template.coverV3 || null,
      spec: null,
      template_id: template.template_id,
      cover_url: template.cover_url || (template.coverV3 as { url: string; width: number; height: number } | null)?.url || '',
      name: template.name || '',
    };
  };

  // 处理模板点击事件
  const handleNewTemplateClick = (template: TemplateItem2026) => {
    const templateId = template.id || template.template_id || '';
    const templateName = template.name || template.title || '';

    const appidValue = getAppId();

    const params = new URLSearchParams({
      id: templateId,
      appid: appidValue || '',
      template_name: templateName,
    });

    // 添加搜索页面相关的打点参数
    if (keyword) {
      params.set('ref_page_id', keyword);
      params.set('searchword', keyword);
    }

    params.set('ref_page_type', 'search_page_mix');

    // 从当前 URL 获取 clickid 参数
    const currentParams = new URLSearchParams(window.location.search);
    const clickid = currentParams.get('clickid');
    if (clickid) {
      params.set('clickid', clickid);
    }

    const url = `/mobile/template?${params.toString()}`;

    // 点击打点（对齐 channel2/search 的埋点字段）
    mkWebStoreLogger.track_click({
      object_type: 'template_item',
      object_id: templateId,
      page_type: 'search_page_mix',
      page_id: keyword,
      searchword: keyword,
    } as any);

    if (APPBridge.judgeIsInApp()) {
      const appUrl = new URL(
        `${location.origin}/mobile/template`,
        window.location.origin
      );
      appUrl.searchParams.set('id', templateId);
      appUrl.searchParams.set('is_full_screen', '1');
      // 在 App 内跳转时也要添加打点参数
      if (keyword) {
        appUrl.searchParams.set('ref_page_id', keyword);
        appUrl.searchParams.set('searchword', keyword);
      }

      appUrl.searchParams.set('ref_page_type', 'search_page_mix');
      APPBridge.navToPage({
        url: appUrl.toString(),
        type: 'URL',
      });
    } else {
      store.push(url);
    }
  };

  const renderContent = () => {
    const q = queryToObj();
    const isVerticalApp = q.appid && q.appid !== 'maka';
    if (!keyword) {
      return (
        <div className='p-4'>
          {!isVerticalApp && (
            <div className='py-2 rounded-md bg-gradient-to-b from-[#fff9e4] from-0% to-transparent to-[48%]'>
              <div className='flex items-center font-semibold text-base leading-[26px] text-[rgba(0,0,0,0.88)] mx-3 mb-3'>
                <img
                  src='https://img2.maka.im/cdn/webstore7/assets/icon_hot.png'
                  width={16}
                  height={16}
                  alt='热门'
                />
                <span className='ml-1'>大家都在搜</span>
              </div>
              <div className='w-full flex flex-wrap px-4'>
                {hotwords?.map((item, index) => {
                  const getIndexBgColor = () => {
                    if (index === 0) return '#ff4d4f';
                    if (index === 1) return '#fa6714';
                    if (index === 2) return '#faad14';
                    return 'rgba(0, 0, 0, 0.25)';
                  };
                  return (
                    <div
                      onClick={() => {}}
                      className='w-1/2 flex items-center mb-3 py-1'
                      key={index}
                    >
                      <span
                        className='font-normal text-xs leading-4 inline-block w-4 bg-[rgba(0,0,0,0.25)] rounded text-center text-white mx-1.5'
                        style={{ backgroundColor: getIndexBgColor() }}
                      >
                        {index + 1}
                      </span>
                      <span
                        className='text-[rgba(0,0,0,0.88)] text-xs font-semibold leading-5'
                        onClick={() => {
                          onSearch(item.search_content);
                        }}
                      >
                        {item.search_content}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div className='px-2 flex items-center justify-between text-[rgba(0,0,0,0.88)] text-base font-normal leading-6 mb-3'>
              <span>历史搜索</span>
              <Icon name='delete' onClick={() => clearHistory()} />
            </div>
            <div className='w-full flex flex-wrap px-2'>
              {historyWords?.map((item, index) => (
                <div
                  className='font-normal text-sm leading-[22px] py-0.5 px-3 text-[rgba(0,0,0,0.6)] mr-2.5 bg-[#f5f5f5] rounded-[20px] mb-3'
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

    // 显示初始加载状态：当有搜索关键词但数据还没首次加载完成时
    const isInitialLoading =
      keyword &&
      (specsLoading ||
        !specsLoaded ||
        (newLoading && newTemplates.length === 0 && !newDataFirstLoaded));

    if (isInitialLoading) {
      return (
        <div className='flex justify-center items-center py-20'>
          <Loader2
            className='w-8 h-8 animate-spin'
            style={{ color: 'var(--theme-color)' }}
          />
        </div>
      );
    }
    return (
      <>
        {suggestions?.length > 0 && (
          <div className='px-4 py-3 flex flex-nowrap overflow-x-auto'>
            {suggestions?.map((item, index) => (
              <div
                className={cls([
                  'shrink-0 py-1.5 px-2 text-[rgba(0,0,0,0.88)] mr-2 font-normal text-sm leading-[22px] bg-[#fafafa] rounded',
                  item.keyword === keyword && 'bg-[#e6f4ff] text-[#1a87ff]',
                ])}
                key={index}
                onClick={() => onChangeKeyword(item.keyword)}
              >
                {item.keyword}
              </div>
            ))}
          </div>
        )}
        <div style={{ height: 8 }}></div>

        {!(total >= 5) && (
          <SearchFacets
            facets={facets}
            searchParams={searchParams}
            setSearchParams={value => handleSetSearchParams(value)}
          />
        )}

        <div
          id='search-scroll'
          className='flex-1 h-0 overflow-x-hidden overflow-y-auto px-4'
        >
          {/* //新搜索列表：放在旧列表前面 */}
          {total >= 5 && (
            <>
              {/* 新版推荐标题和筛选器 */}
              <div className='relative z-10 flex items-center justify-start py-1.5 bg-white border-b border-gray-100'>
                {/* 左侧：新版推荐标题区域 */}
                <div className='flex items-center justify-start gap-2 shrink-0'>
                  <Sparkles className='w-4 h-4' style={{ color: '#9333ea' }} />
                  <div className='flex flex-col'>
                    <span
                      className='text-sm font-semibold leading-tight'
                      style={{ color: '#9333ea' }}
                    >
                      新版推荐
                    </span>
                    <span className='text-xs text-gray-500 leading-tight pt-0.5'>
                      全新编辑器｜自适应排版
                    </span>
                  </div>
                </div>
                {/* 右侧：规格筛选标签 */}
                <div className='flex flex-wrap items-center pl-12 gap-1.5 flex-1 justify-start overflow-x-auto'>
                  {/* 规格标签 - 如果只有一个规格则不显示 */}
                  {specs.length > 0 &&
                    specs.map(spec => {
                      const isActive = selectedSpecId === spec.id;
                      return (
                        <button
                          key={spec.id}
                          className={cls(
                            'px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap'
                          )}
                          style={
                            isActive
                              ? {
                                  backgroundColor:
                                    'var(--theme-background-color)',
                                  color: 'var(--theme-color)',
                                }
                              : {
                                  backgroundColor: '#ffffff',
                                  color: '#64748b',
                                }
                          }
                          onClick={() => handleSpecChange(spec.id)}
                        >
                          {spec.name}
                          {/* {spec.count !== undefined && spec.count} */}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* 新版模板列表，默认半屏高度 */}
              <div style={{ padding: '0 0px 8px 0px' }}>
                {newLoading && newTemplates.length === 0 ? (
                  <div className='flex justify-center items-center py-8'>
                    <Loader2 className='w-6 h-6 animate-spin' />
                  </div>
                ) : (
                  <div
                    style={{
                      // maxHeight: showAllNewTemplates ? 'none' : '50vh',
                      overflow: showAllNewTemplates ? 'visible' : 'hidden',
                      position: 'relative',
                    }}
                  >
                    <InfiniteScroll
                      id='search-scroll-new'
                      loadMore={() => {
                        console.log('loadMore');
                        if (ignoreNextNewLoadMore || !showAllNewTemplates) {
                          setIgnoreNextNewLoadMore(false);
                          return;
                        }

                        if (!newLoading && !newFinished) {
                          getNewTemplatesByKeyword();
                        }
                        console.log('loadMore suc');
                      }}
                      hasMore={!newFinished}
                      useWindow={false}
                      getScrollParent={() =>
                        document.getElementById('search-scroll-new')
                      }
                    >
                      <div style={{ paddingTop: '8px' }}>
                        <TemplateWaterfall
                          templates={(showAllNewTemplates
                            ? newTemplates
                            : newTemplates.slice(0, 10)
                          ).map(adaptTemplate)}
                          onTemplateClick={handleNewTemplateClick}
                        />
                      </div>
                      {newLoading && newTemplates.length > 0 && (
                        <div className='flex justify-center items-center py-4'>
                          <Loader2 className='w-5 h-5 animate-spin' />
                        </div>
                      )}
                    </InfiniteScroll>
                    {!showAllNewTemplates && !newLoading && total > 6 && (
                      <>
                        {/* 移动端：绝对定位覆盖在列表上方 */}
                        <div
                          className=' flex justify-center items-center gap-1 py-3 md:hidden'
                          onClick={() => {
                            setShowAllNewTemplates(true);
                            setIgnoreNextNewLoadMore(true);
                          }}
                          style={{
                            cursor: 'pointer',
                            background:
                              'linear-gradient(to top, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.7), transparent)',
                            paddingTop: '24px',
                          }}
                        >
                          <span
                            className='text-sm font-medium'
                            style={{ color: 'var(--theme-color)' }}
                          >
                            查看更多
                          </span>
                          <ChevronDown
                            className='w-4 h-4'
                            style={{ color: 'var(--theme-color)' }}
                          />
                        </div>
                        {/* PC端：放在列表下方 */}
                        <div
                          className='hidden md:flex justify-center items-center gap-1 py-3'
                          onClick={() => {
                            setShowAllNewTemplates(true);
                            setIgnoreNextNewLoadMore(true);
                          }}
                          style={{
                            cursor: 'pointer',
                          }}
                        >
                          <span
                            className='text-sm font-medium'
                            style={{ color: 'var(--theme-color)' }}
                          >
                            查看更多
                          </span>
                          <ChevronDown
                            className='w-4 h-4'
                            style={{ color: 'var(--theme-color)' }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* 旧搜索列表（保留原有逻辑） */}
          {/* 只有在新数据首次加载完成后才显示旧列表 */}
          {newDataFirstLoaded && (
            <SearchFacetsMix
              facets={facets}
              searchParams={searchParams}
              setSearchParams={value => handleSetSearchParams(value)}
            />
          )}

          {/* 只有在新数据首次加载完成后才显示旧列表 */}
          {newDataFirstLoaded && renderTemlates()}

          <div style={{ height: 200 }}></div>
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
    // 初始化获取历史搜索
    getSearchHotWords();
    getHistoryWords();
  }, []);

  // 构建打点信息
  const trackingValue: TrackingContextValue = useMemo(() => {
    if (keyword) {
      return {
        ref_page_id: keyword,
        ref_page_type: 'search_page_mix',
        page_id: keyword,
        page_type: 'search_page_mix',
        search_word: keyword,
      };
    }
    return {
      ref_page_id: undefined,
      ref_page_type: undefined,
      page_id: undefined,
      page_type: undefined,
      search_word: undefined,
    };
  }, [keyword]);

  return (
    <TrackingContext.Provider value={trackingValue}>
      <div
        className={cls([
          'flex flex-col overflow-hidden h-screen bg-white',
          appid && appid,
        ])}
      >
        <div className='w-full max-w-full flex items-center pt-4 px-4 overflow-hidden'>
          <Icon
            name='left'
            size={20}
            onClick={() => goBack()}
            style={{ color: 'rgba(1, 7, 13, 0.8)', marginRight: '8px' }}
          />
          <SearchInput
            appid={appid}
            border
            keyword={keyword}
            onSearch={onSearch}
          />
        </div>
        {renderContent()}
      </div>

      {/* 排序选择弹窗（对齐 channel2/search） */}
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
    </TrackingContext.Provider>
  );
};

export default Search;

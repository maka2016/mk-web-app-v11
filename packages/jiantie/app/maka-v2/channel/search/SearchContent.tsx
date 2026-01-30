'use client';
import { getAppId, getUid } from '@/services';
import { mkWebStoreLogger } from '@/services/logger';
import { useStore } from '@/store';
import { queryToObj, random } from '@/utils';
import { trpc } from '@/utils/trpc';
import { Icon } from '@workspace/ui/components/Icon';
import cls from 'classnames';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { getSearchMubanBySparam, sParamType } from '../api/search';
import SearchFacets, {
  Facets,
  SearchParamsType,
} from '../components/SearchFacets';
import { types } from '../components/SearchInput';

interface Hotword {
  search_content: string;
}

interface Suggestion {
  keyword: string;
}

const PAGE_SIZE = 30;

interface SearchContentProps {
  initialKeyword?: string;
  onClose?: () => void;
  isInPopover?: boolean;
  onSearchChange?: (value: string) => void;
}

export default function SearchContent({
  initialKeyword = '',
  onSearchChange,
  onClose,
  isInPopover = false,
}: SearchContentProps) {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const [keyword, setKeyword] = useState<string>(initialKeyword);
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

  const pageInstIdRef = useRef<string>(
    `search_page_${random(25).toUpperCase()}`
  );
  const templateCacheRef = useRef<any>({});
  const { appVersion } = useStore();

  const appid = getAppId();

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
        appid: appid || 'jiantie',
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
      const newTemplates = page > 1 ? templates.concat(data) : data;
      setPage(page + 1);
      setTemplates(newTemplates);
      setLoading(false);
      setFinished((res.result.template_list?.length || 0) < PAGE_SIZE);
      setSuggestions(oq ? suggestions : res.result.suggestions);
      if (facetsUpdate) setFacets(res.result.facets);
      setFacetsUpdate(false);
    } else {
      setLoading(false);
      setFinished(true);
    }
  };

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
  }, [searchParams, keyword]);

  const onSearch = async (value: string) => {
    updateHistoryWords(value);
    replaceUrlArg(value, 'ref_page_id');
    const query = queryToObj();
    mkWebStoreLogger.track_pageview({
      page_type: 'search_page',
      page_id: 'search_page',
      page_inst_id: pageInstIdRef.current,
      parent_page_type: query.parent_page_type || '',
      ref_page_id: decodeURIComponent(query.ref_page_id || ''),
    });
    templateCacheRef.current = {};
    setFinished(false);
    setKeyword(value);
    setOq('');
    setPage(1);
    setTemplates([]);
    setSearchParamsState({});
    onSearchChange?.(value);
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
                      className='inline-block w-1/2 flex items-center mb-3 py-1'
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

        <SearchFacets
          facets={facets}
          searchParams={searchParams}
          setSearchParams={value => handleSetSearchParams(value)}
        />
      </>
    );
  };

  useEffect(() => {
    getSearchHotWords();
    getHistoryWords();

    const query = queryToObj();
    mkWebStoreLogger.track_pageview({
      page_type: 'search_page',
      page_id: 'search_page',
      page_inst_id: pageInstIdRef.current,
      parent_page_type: query.parent_page_type || '',
      ref_page_id: decodeURIComponent(query.ref_page_id || ''),
    });
  }, []);

  return (
    <div
      className={cls([
        'flex flex-col overflow-hidden',
        isInPopover ? 'w-[800px] max-h-[600px]' : 'h-screen',
        'bg-white',
        appid && appid,
      ])}
    >
      <div className='flex-1 overflow-hidden'>{renderContent()}</div>
    </div>
  );
}

'use client';
import {
  getSearchMubanBySparam,
  sParamType,
} from '@/app/maka/mobile/channel/api/search';

import {
  Facets,
  SearchParamsType,
} from '@/app/maka/mobile/channel/components/SearchFacets';
import { getAppId, getUid } from '@/services';
import { mkWebStoreLogger } from '@/services/logger';
import { useStore } from '@/store';
import APPBridge from '@/store/app-bridge';
import { queryToObj, random } from '@/utils';
import { Icon } from '@workspace/ui/components/Icon';
import { Loading } from '@workspace/ui/components/loading';
import cls from 'classnames';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import InfiniteScroll from 'react-infinite-scroller';
import TemplateCard, { Template } from '../components/template-card';
import SearchInput from './SearchInput';
import styles from './search.module.scss';

const PAGE_SIZE = 30;

const Search = (props: { keywords?: string }) => {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const [keyword, setKeyword] = useState<string>(props.keywords || '');
  const [historyWords, setHistoryWords] = useState<string[]>([]);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [finished, setFinished] = useState<boolean>(false);
  const [templates, setTemplates] = useState<Template[]>([]);
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

    const params: sParamType = {
      queryWord: keyword,
      cWord: oq,
      filter: searchParams.filter,
      orderBy: searchParams.orderBy,
      pageNum: page,
      type: 'word',
      appid: getAppId(),
    };
    const res = await getSearchMubanBySparam(params, {
      u: getUid(),
      cli_rev: appVersion,
    });
    if (res.result) {
      const data: Template[] = res.result.template_list?.map((item: any) => {
        return {
          name: item.name || '',
          desc: item.desc || '',
          template_id: item.template,
          cover_url: item.preview_image_url,
        };
      });
      const newTemplates = page > 1 ? templates.concat(data) : data;
      setPage(page + 1);
      setTemplates(newTemplates);
      setLoading(false);
      setFinished((res.result.template_list?.length || 0) < PAGE_SIZE);
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
      <InfiniteScroll
        loadMore={loadMore}
        hasMore={!finished}
        useWindow={false}
        className='grid grid-cols-3 gap-2'
      >
        {templates?.map((item, index) => (
          <TemplateCard key={index} template={item} />
        ))}
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
        {/* <SearchFacets
          facets={facets}
          searchParams={searchParams}
          setSearchParams={value => handleSetSearchParams(value)}
        /> */}
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
      className={cls([styles.searchContainer, appid && (styles as any)[appid]])}
    >
      <div className={styles.searchInput}>
        <div className='size-5'>
          <Icon name='left' size={20} onClick={() => goBack()} />
        </div>
        <SearchInput keyword={keyword} onSearch={onSearch} />
      </div>
      {renderContent()}
    </div>
  );
};

export default Search;

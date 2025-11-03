'use client';
import React, { useEffect, useRef, useState } from 'react';
import cls from 'classnames';
import styles from './search.module.scss';
import SearchInput, { types } from '../components/SearchInput';
import {
  getHotSearchWords,
  getSearchMubanBySparam,
  sParamType,
} from '../api/search';
// import localforage from "localforage"
import Waterfall from '../components/Waterfall';
import { useRouter, useSearchParams } from 'next/navigation';
import SearchFacets, {
  Facets,
  SearchParamsType,
} from '../components/SearchFacets';
import APPBridge from '@mk/app-bridge';
import { queryToObj, random } from '@mk/utils';
import { mkWebStoreLogger } from '@/utils/logger';
import { Icon } from '@workspace/ui/components/Icon';
import { getAppId, getUid } from '@/services';
import { useStore } from '@/store';

interface Hotword {
  search_content: string;
}

interface Suggestion {
  keyword: string;
}

const PAGE_SIZE = 30;

const Search = (props: { keywords?: string }) => {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
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
    const res = await getHotSearchWords();
    if (res?.data?.hotSearchKeyWords) {
      setHotwords(res.data.hotSearchKeyWords);
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
        track={undefined}
      />
    );
  };

  const renderContent = () => {
    const q = queryToObj();
    const isVerticalApp = q.appid && q.appid !== 'maka';
    if (!keyword) {
      return (
        <div className={styles.searchWord}>
          {!isVerticalApp && (
            <div className={styles.hotword}>
              <div className={styles.title}>
                <img
                  src='https://img2.maka.im/cdn/webstore7/assets/icon_hot.png'
                  width={16}
                  height={16}
                  alt='热门'
                />
                <span>大家都在搜</span>
              </div>
              <div className={styles.hotwordWrap}>
                {hotwords?.map((item, index) => {
                  return (
                    <div
                      onClick={() => {}}
                      className={styles.hotwordItem}
                      key={index}
                    >
                      <span className={styles.index}>{index + 1}</span>
                      <span
                        className={styles.name}
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
        {suggestions?.length > 0 && (
          <div className={styles.suggestions}>
            {suggestions?.map((item, index) => (
              <div
                className={cls([
                  styles.suggestionItem,
                  item.keyword === keyword && styles.active,
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
        <div id='search-scroll' className={styles.scrollContainer}>
          {renderTemlates()}
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
      className={cls([styles.searchContainer, appid && (styles as any)[appid]])}
    >
      <div className={styles.searchInput}>
        <Icon name='left' size={20} onClick={() => goBack()} />
        <SearchInput
          appid={appid}
          border
          keyword={keyword}
          onSearch={onSearch}
        />
      </div>
      {renderContent()}
    </div>
  );
};

export default Search;

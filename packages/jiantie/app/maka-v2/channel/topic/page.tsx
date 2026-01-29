'use client';
import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import {
  TrackingContext,
  TrackingContextValue,
} from '@/components/TrackingContext';
import { getAppId } from '@/services';
import { mkWebStoreLogger } from '@/services/logger';
import { queryToObj, random } from '@/utils';
import useIsMobile from '@/utils/use-mobile';
import { ChevronLeft } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  checkCollect,
  getHotwordDetail,
  getTemplatesByFilterId,
} from '../api/channel';
import HotwordMetaTab, { HotWord } from '../components/HotwordMetaTab';
import SearchFacets, {
  Facets,
  SearchParamsType,
} from '../components/SearchFacets';
import Waterfall from '../components/Waterfall';

interface Template {
  template_id: string;
  collected: boolean;
}

const PAGE_SIZE = 30;

const Topic: React.FC = () => {
  const [hotWord, setHotWord] = useState<HotWord>();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filterId, setFilterId] = useState<number>(0);
  const [floorId, setFloorId] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [finished, setFinished] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [facets, setFacets] = useState<Facets>({
    category: [],
    spec: [],
    style_tag: [],
    color_tag: [],
  });
  const [searchParams, setSearchParams] = useState<SearchParamsType>({});
  const [facetsUpdate, setFacetsUpdate] = useState<boolean>(false);
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const appid = getAppId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const pageInstIdRef = useRef<string>(
    `site_promotional_page_${random(25).toUpperCase()}`
  );

  // 打点上下文：专题页（topicpage）
  const trackingValue: TrackingContextValue = useMemo(() => {
    const { id } = queryToObj();

    if (id) {
      const idStr = String(id);
      return {
        ref_page_id: idStr,
        ref_page_type: 'topicpage',
        page_id: idStr,
        page_type: 'topicpage',
      };
    }

    return {
      ref_page_id: undefined,
      ref_page_type: undefined,
      page_id: undefined,
      page_type: undefined,
    };
  }, []);

  const replaceUrlArg = (argVal: string, type: string) => {
    const params = new URLSearchParams(urlSearchParams);
    params.set(type, argVal);

    // 使用 router.replace + shallow 模式
    router.replace(`?${params.toString()}`, {
      scroll: false,
    });
  };

  const getHotwordData = async () => {
    const { id, hotword_floor_word_btn } = queryToObj();
    const res = await getHotwordDetail(id);
    const data = res.data as HotWord;

    mkWebStoreLogger.track_pageview({
      page_type: 'site_promotional_page',
      page_id: 'site_promotional_page',
      page_inst_id: pageInstIdRef.current,
    });

    // 二级热词定位
    let filterIndex = 0;
    if (hotword_floor_word_btn) {
      const _index = data.hot_word_meta.findIndex(
        item => item.hot_word === decodeURIComponent(hotword_floor_word_btn)
      );
      if (_index > -1) {
        filterIndex = _index;
      }
    }

    setHotWord(data);
    setFilterId(data.hot_word_meta[filterIndex].filter_id);
    setFloorId(res.data.floor_id);
    setFacetsUpdate(true);
  };

  const hasSearchFilter = () => {
    return (
      searchParams.filter?.spec ||
      searchParams.filter?.color_tag ||
      searchParams.filter?.style_tag
    );
  };

  /**
   * 热词楼层模版
   */
  const getTemplates = async () => {
    if (loading || finished) {
      return;
    }

    setLoading(true);
    const res = await getTemplatesByFilterId(floorId, filterId, {
      p: page,
      n: PAGE_SIZE,
      with_top_template: !!hasSearchFilter() ? 0 : 1,
      color: searchParams.filter?.color_tag || '',
      style: searchParams.filter?.style_tag || '',
      spec: searchParams.filter?.spec || '',
      orderby: searchParams.orderBy || '',
    });

    if (res?.data?.rows) {
      const templateList = res.data.rows.filter(
        (item: Template) => item.template_id
      );
      const list = templateList.map((item: Template) => item.template_id) || [];
      const _res = await checkCollect({
        templates: list,
      });
      templateList.forEach((item: Template, index: number) => {
        item.collected = _res.data.templates[index].collected;
      });

      if (filterId !== filterId) {
        return;
      }
      const newTemplates =
        page > 1 ? templates.concat(templateList) : templateList;

      setTemplates(newTemplates);
      setPage(page + 1);
      setLoading(false);
      setFinished(res.data.rows.length < PAGE_SIZE);
      if (facetsUpdate) setFacets(res.data.facets);
      setFacetsUpdate(false);
    } else {
      setFinished(true);
      setLoading(false);
    }
  };

  /**
   *
   * @param id 切换热词标签
   */
  const onChangeFilterId = (id: number) => {
    setFilterId(id);
    setPage(1);
    setLoading(false);
    setFinished(false);
    setTemplates([]);
    setSearchParams({});
    setFacetsUpdate(true);

    scrollRef.current?.scrollTo({
      top: 0,
    });

    const item = hotWord?.hot_word_meta.find(_i => _i.filter_id === id);
    replaceUrlArg(item?.hot_word || '', 'hotword_floor_word_btn');
  };

  const loadMore = () => {
    console.log('loadMore', loading, finished);
    if (loading || finished) return;
    getTemplates();
  };
  const handleSetSearchParams = (value: SearchParamsType) => {
    setSearchParams(value);
    setPage(1);
    setLoading(false);
    setFinished(false);
    setTemplates([]);
  };

  useEffect(() => {
    if (!searchParams || !floorId) return;
    getTemplates();
  }, [searchParams, floorId, filterId]);

  const renderHotWord = () => {
    const defaultTemplates: any[] = [];
    const item = hotWord?.hot_word_meta.find(
      _item => _item.filter_id === filterId
    );
    if (!item) {
      return;
    }

    const key =
      `${item.filter_id}` +
      searchParams.filter?.spec +
      searchParams.filter?.style_tag +
      searchParams.filter?.color_tag +
      searchParams.orderBy;

    return (
      <Waterfall
        useWindow={false}
        getScrollParent={() => scrollRef.current}
        key={key}
        template={templates || defaultTemplates}
        finished={finished}
        loading={loading}
        onLoad={loadMore}
        // track={{
        //   page_name: item.filter_name,
        //   // page_id: site?.page_type,
        //   // page_type: site?.page_type,
        //   // page_inst_id: site?.page_inst_id,
        //   parent_id: item.id,
        //   parent_type: 'hotword_floor_word_btn',
        //   parent_inst_id: item.trackInstId,
        // }}
      />
    );
  };

  useEffect(() => {
    getHotwordData();
  }, []);

  // 获取当前选中的标签名称
  const currentLabel =
    hotWord?.hot_word_meta.find(item => item.filter_id === filterId)
      ?.hot_word ||
    hotWord?.hot_word_tag_title ||
    hotWord?.hot_word_tag ||
    '';

  const handleBack = () => {
    router.back();
  };

  return (
    <TrackingContext.Provider value={trackingValue}>
      <div className='h-full overflow-y-auto' ref={scrollRef}>
        {/* 移动端Header */}
        {isMobile && <MobileHeader title={currentLabel} />}

        {/* PC端Header */}
        {!isMobile && (
          <div className='sticky top-0 h-14 py-0 px-6 flex items-center justify-between text-black/88 bg-white border-b border-[#f0f0f0] z-10'>
            <div className='flex items-center gap-4'>
              <div
                className='flex items-center cursor-pointer'
                onClick={handleBack}
              >
                <ChevronLeft size={24} />
                <span className='text-sm font-normal leading-[22px] text-black'>
                  返回
                </span>
              </div>
              <span className='text-base font-semibold leading-6 text-black/88'>
                {currentLabel}
              </span>
            </div>
          </div>
        )}

        <div
          className={isMobile ? 'sticky top-11 z-[1]' : 'sticky top-14 z-[1]'}
        >
          {hotWord && hotWord?.hot_word_meta?.length > 1 && (
            <HotwordMetaTab
              type={appid}
              style={{
                padding: isMobile ? '12px 16px 8px' : '16px 24px 12px',
              }}
              hotWord={hotWord}
              filterId={filterId}
              onChangeFilterId={onChangeFilterId}
              track={
                {
                  // page_id: id,
                  // page_type: id,
                  // page_inst_id: siteName,
                }
              }
            />
          )}
        </div>
        <SearchFacets
          facets={facets}
          searchParams={searchParams}
          setSearchParams={handleSetSearchParams}
          track={
            {
              // page_id: site?.page_type,
              // page_type: site?.page_type,
              // page_inst_id: site?.page_inst_id,
            }
          }
        />

        <div className={`${isMobile ? 'px-4' : 'px-6'} min-h-screen bg-white`}>
          {renderHotWord()}
        </div>
      </div>
    </TrackingContext.Provider>
  );
};

export default Topic;

'use client';
import { BehaviorBox } from '@/components/BehaviorTracker';
import {
  TrackingContext,
  TrackingContextValue,
} from '@/components/TrackingContext';
import { getToken, getUid } from '@/services';
import { mkWebStoreLogger } from '@/services/logger';
import { useStore } from '@/store';
import APPBridge from '@/store/app-bridge';
import { isMakaAppAndroid, random } from '@/utils';
import { Icon } from '@workspace/ui/components/Icon';
import { Button } from '@workspace/ui/components/button';
import { cn } from '@workspace/ui/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getChannelResources,
  getResourceDetail,
  getSiteFloors,
  getSiteInfo,
  getTemplatesByFilterId,
} from './api/channel';
import { HotWord } from './components/HotwordMetaTab';
import SearchFacets, {
  Facets,
  SearchParamsType,
} from './components/SearchFacets';
import TemplateFlatFloor from './components/TemplateFlateFloor';
import Waterfall from './components/Waterfall';

const PAGE_SIZE = 20;

interface Template {
  template_id: string;
  collected: boolean;
}

interface Floor {
  id: number;
  hot_word: HotWord[];
  template: Template[];
  facets: Facets;
}

interface Resource {
  image: string;
  name: string;
  click_type: string;
  click_content: string;
  floor_names: string[];
}

interface Entrance {
  click_content: string;
  name: string;
  desc: string;
  image: string;
  image_active: string;
  isJiantieChannel?: boolean;
}

const colors = [
  '#FFFBE6',
  '#F6FFED',
  '#E6F4FF',
  '#FFF1F0',
  '#F9F0FF',
  '#F0F5FF',
];

const colorCache: Record<string, string> = {};

const ChannelIndex1 = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [versionHelperCounter, setVersionHelperCounter] = useState(0);
  const [floorAlias, setFloorAlias] = useState<string>('');
  const [resource, setResource] = useState<Resource[]>([]);
  const [hotWords, setHotWords] = useState<HotWord[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filterId, setFilterId] = useState(0);
  const [floorId, setFloorId] = useState(0);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [page, setPage] = useState(1);
  const [tabIndex, setTabIndex] = useState(0);
  const [searchParams, setSearchParams] = useState<SearchParamsType>({});
  const store = useStore();
  const [facets, setFacets] = useState<Facets>({
    category: [],
    spec: [],
    style_tag: [],
    color_tag: [],
  });
  const [entrances, setEntrances] = useState<Entrance[]>([]);
  const [floorLayout, setFloorLayout] = useState('');
  const [bgColor, setBgColor] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [hasShowFeedback, setHasShowFeedback] = useState(false);
  const [facetsUpdate, setFacetsUpdate] = useState(false);
  const urlSearchParams = useSearchParams();
  const [postionY, setPositionY] = useState(-88);
  const router = useRouter();

  const onScroll = useCallback(() => {
    if (window.scrollY > 2 * window.innerHeight && !hasShowFeedback) {
      setShowFeedback(true);
      setHasShowFeedback(true);
    }
  }, [hasShowFeedback]);

  const throttleScroll = () => {
    setPositionY(Math.min(-88 + (scrollRef.current?.scrollTop || 0), -44));
  };

  const replaceUrlArg = (argVal: string, type: string) => {
    const params = new URLSearchParams(urlSearchParams);
    params.set(type, argVal);
    router.replace(`?${params.toString()}`, {
      scroll: false,
    });
  };

  const getEntrances = async () => {
    const res = await getChannelResources({
      alias: 'app_home_site_cards',
      no_url_conv: 1,
    });
    if (res.data.app_home_site_cards?.length) {
      let index = 0;
      const sessionIndex = localStorage.getItem('home_v4_channel');
      const hasSession = sessionIndex;
      if (hasSession) {
        index = +sessionIndex;
      }

      const list = res.data.app_home_site_cards.filter(
        (item: any) => item.click_content
      );
      const item = list[index] || list[0];

      setEntrances(list);
      setFloorAlias(item?.click_content);
      setBgColor(colorCache[item?.click_content || '']);
      if (hasSession) {
        replaceUrlArg(item.click_content, 'parent_page_type');
        replaceUrlArg(item.name, 'page_inst_id');
      }

      // 初始化时打pageview
      if (item?.click_content) {
        replaceUrlArg(item.click_content, 'ref_page_id');
        mkWebStoreLogger.track_pageview({
          page_type: 'channel_page',
          page_id: item.click_content,
          page_inst_id: item.name,
          ref_page_id: item.click_content,
        });
      }
    }
  };

  const fetchResourceDetail = async () => {
    const res = await getResourceDetail(`${floorAlias}`);
    setResource(res?.data?.channel_site_entry || []);
  };

  const fetchFloors = async () => {
    const res = await getSiteFloors(`${floorAlias}`, {
      offset: 0,
      limit: PAGE_SIZE,
    });

    if (res?.data?.rows) {
      const floor: Floor = res.data.rows.find((item: Floor) => item.hot_word);
      if (floor) {
        //为了跨组件打点
        floor.hot_word.forEach(e => {
          e.trackInstId = `hotword_floor_nav_btn_${random(25).toUpperCase()}`;
          e.hot_word_meta.forEach(v => {
            v.trackInstId = `hotword_floor_word_btn_${random(25).toUpperCase()}`;
          });
        });

        let index = 0;

        replaceUrlArg(floor.hot_word[index].hot_word_tag, 'ref_page_id');
        replaceUrlArg(
          floor.hot_word[index].hot_word_meta[0].hot_word,
          'hotword_floor_word_btn'
        );

        setPage(1);
        setTabIndex(index);
        setHotWords(floor.hot_word);
        setFilterId(floor.hot_word[index].hot_word_meta[0].filter_id);
        setFloorId(floor.id);
        setLoading(false);
        setFinished(false);
        setFacets(floor.facets);
      }
    }
  };

  const getTemplates = async () => {
    if (loading || finished) {
      return;
    }

    if (floorLayout !== 'waterfall_flow') {
      return;
    }

    setLoading(true);

    const res = await getTemplatesByFilterId(floorId, filterId, {
      p: page,
      n: PAGE_SIZE,
      with_top_template: page === 1 ? 1 : 0,
      color: searchParams.filter?.color_tag || '',
      style: searchParams.filter?.style_tag || '',
      spec: searchParams.filter?.spec || '',
      orderby: searchParams.orderBy || '',
    });

    if (res?.data?.rows) {
      const newTemplates =
        page > 1 ? templates.concat(res.data.rows) : res.data.rows;

      setTemplates(newTemplates);
      setPage(page + 1);
      setLoading(false);
      setFinished(res.data.rows.length < PAGE_SIZE);

      if (facetsUpdate) {
        setFacets(res.data.facets);
      }
      setFacetsUpdate(false);
    } else {
      setFinished(true);
      setLoading(false);
    }
  };

  const getChannelInfo = async () => {
    const res = await getSiteInfo(`${floorAlias}`);
    setFloorLayout(res?.data?.floor_layout || 'waterfall_flow');
    setBgColor(res?.data?.bg_color || '');
    colorCache[floorAlias] = res?.data?.bg_color || '';
  };

  const onChangeChannel = (item: Entrance, index: number) => {
    if (floorAlias === item.click_content) {
      return;
    }

    localStorage.setItem('home_v4_channel', `${index}`);

    setFloorAlias(item.click_content);
    setBgColor(colorCache[item.click_content || '']);
    setHotWords([]);
    setResource([]);
    setTabIndex(0);
    setTemplates([]);
    setSearchParams({});
    setFloorLayout('');
    setFilterId(0);
    setFloorId(0);

    replaceUrlArg(item.click_content, 'parent_page_type');
    replaceUrlArg(item.name, 'page_inst_id');

    // 切换channel时打pageview
    if (item.click_content) {
      replaceUrlArg(item.click_content, 'ref_page_id');
      mkWebStoreLogger.track_pageview({
        page_type: 'channel_page',
        page_id: item.click_content,
        page_inst_id: item.name,
        ref_page_id: item.click_content,
      });
    }
  };

  const onChangeTab = (index: number) => {
    setTabIndex(index);
    setFilterId(hotWords[index]?.hot_word_meta[0].filter_id || 0);
    setPage(1);
    setLoading(false);
    setFinished(false);
    setTemplates([]);
    setSearchParams({});
    setFacetsUpdate(true);

    replaceUrlArg(hotWords[index]?.hot_word_tag || '', 'ref_page_id');
    replaceUrlArg(
      hotWords[index]?.hot_word_meta[0].hot_word || '',
      'hotword_floor_word_btn'
    );
  };

  const onChangeFilterId = (id: number) => {
    setFilterId(id);
    setPage(1);
    setLoading(false);
    setFinished(false);
    setTemplates([]);
    setSearchParams({});
    setFacetsUpdate(true);

    // if (window.scrollY >= 48) {
    //   window.scrollTo({
    //     top: 48,
    //   })
    // }

    const meta = hotWords[tabIndex]?.hot_word_meta.find(
      item => item.filter_id === id
    );
    replaceUrlArg(meta?.hot_word || '', 'hotword_floor_word_btn');
  };

  const toChannel = (item: Resource) => {
    const alias = item.click_content.split('&')[0].split('alias=')[1];

    store.push(`/maka/mobile/channel/topic?id=${alias}`);
  };

  const loadMore = () => {
    if (loading || finished) return;
    getTemplates();
  };

  const setSearchParamsHandler = (value: SearchParamsType) => {
    setSearchParams(value);
    setPage(1);
    setLoading(false);
    setFinished(false);
    setTemplates([]);
  };

  const toWorkOrder = () => {
    const queryObj = {
      // ---- 必要参数 ----
      form_id: '7',
      module: 'MAKA首页',
      form_type: '模版提需',
      uid: getUid(),
      appid: 'maka',
      // ----
      token: getToken(),
      default_type: '模版提需',
      is_full_screen: '1',
      env: 'prod',
      device: isMakaAppAndroid() ? 'Android' : 'iOS',
    };
    const queryStr = new URLSearchParams(queryObj).toString();
    const url = `https://jiantieapp.com/works-order?${queryStr}`;
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url,
        type: 'URL',
      });
    } else {
      window.location.href = url;
    }
  };

  const renderHotWord = () => {
    const defaultTemplates: any[] = [];
    const site = entrances.find(item => item.click_content === floorAlias);
    const item = hotWords[tabIndex]?.hot_word_meta.find(
      _item => _item.filter_id === filterId
    );
    if (!item) {
      return null;
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
      //   page_id: site?.click_content,
      //   page_type: site?.click_content,
      //   page_inst_id: site?.name,
      //   parent_id: item.id,
      //   parent_type: 'hotword_floor_word_btn',
      //   parent_inst_id: item.trackInstId,
      // }}
      />
    );
  };

  const renderWatetfallLayout = () => {
    const site = entrances.find(item => item.click_content === floorAlias);
    return (
      <>
        <div className='sticky top-[calc(var(--safe-area-inset-top)+88px)] z-[1]'>
          {hotWords.length > 1 && (
            <div
              className='bg-white py-3 px-3 pb-2 overflow-hidden'
              style={{
                borderRadius: resource.length ? 0 : '8px 8px 0 0',
              }}
            >
              <div className='flex items-center overflow-x-auto overflow-y-hidden gap-6'>
                {hotWords.map((item, index) => (
                  <BehaviorBox
                    behavior={{
                      object_type: 'hotword_floor_nav_btn',
                      // @ts-ignore
                      word_cn: item.hot_word_tag,
                      object_id: `${item.id}`,
                      object_inst_id: item.trackInstId,
                      object_order: `${index}`,
                      page_id: site?.click_content,
                      page_type: site?.click_content,
                      page_inst_id: site?.name,
                    }}
                    key={index}
                    className={cn([
                      'relative flex-shrink-0 h-[38px] text-[rgba(0,0,0,0.88)] text-sm font-normal leading-[38px]',
                      tabIndex === index &&
                      "text-[var(--theme-color)] after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[var(--theme-color)]",
                    ])}
                    onClick={() => onChangeTab(index)}
                  >
                    {item.hot_word_tag}
                  </BehaviorBox>
                ))}
              </div>
            </div>
          )}
          {hotWords[tabIndex]?.hot_word_meta?.length > 1 && (
            <div
              className='bg-white py-3 px-3 pb-2 overflow-hidden'
              style={{
                borderRadius:
                  resource.length || hotWords.length > 1 ? 0 : '8px 8px 0 0',
              }}
            >
              <div className='flex items-center overflow-x-auto overflow-y-hidden gap-2'>
                {hotWords[tabIndex].hot_word_meta.map((item, index) => {
                  const isActive = filterId === item.filter_id;
                  return (
                    <BehaviorBox
                      behavior={{
                        object_type: 'hotword_floor_word_btn',
                        object_id: `${item.id}`,
                        object_inst_id: `${item.trackInstId}`,
                        object_order: `${index}`,
                        parent_type: 'hotword_floor_nav_btn',
                        parent_id: `${hotWords[tabIndex].id}`,
                        parent_inst_id: hotWords[tabIndex].trackInstId,
                        // @ts-ignore
                        word_cn: item.hot_word,
                        page_id: site?.click_content,
                        page_type: site?.click_content,
                        page_inst_id: site?.name,
                      }}
                      key={index}
                      className={cn([
                        'relative flex-shrink-0 text-[rgba(0,0,0,0.8)] py-1 px-2 text-sm leading-5 border border-[rgba(0,0,0,0.06)] rounded-full font-semibold',
                        filterId === item.filter_id &&
                        'text-[var(--theme-color)] bg-white border-[var(--theme-color)] pointer-events-none',
                      ])}
                      onClick={() => onChangeFilterId(item.filter_id)}
                    >
                      {item.hot_word}
                    </BehaviorBox>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <SearchFacets
          facets={facets}
          searchParams={searchParams}
          setSearchParams={setSearchParamsHandler}
          track={{
            page_id: site?.click_content,
            page_type: site?.click_content,
            page_inst_id: site?.name,
          }}
        />

        <div className='px-3 min-h-screen bg-white'>{renderHotWord()}</div>
      </>
    );
  };

  const renderGalleryLayout = () => {
    const site = entrances.find(item => item.click_content === floorAlias);
    return (
      <div
        className='bg-white rounded-t-lg pb-4'
        style={{
          borderRadius: resource.length ? 0 : '8px 8px 0 0',
        }}
      >
        {hotWords.map((item, index) => (
          <TemplateFlatFloor
            color={bgColor}
            key={index}
            hotword={item}
            floorId={floorId}
            site={site}
          />
        ))}
      </div>
    );
  };

  useEffect(() => {
    getEntrances();

    // scrollRef.current?.addEventListener("scroll", throttleScroll)

    return () => {
      // scrollRef.current?.removeEventListener("scroll", throttleScroll)
    };
  }, []);

  useEffect(() => {
    if (floorAlias) {
      fetchResourceDetail();
      getChannelInfo();
      fetchFloors();
    }
  }, [floorAlias]);

  useEffect(() => {
    if (!searchParams || !floorId) return;
    getTemplates();
  }, [searchParams, floorId, filterId]);

  const site = entrances.find(item => item.click_content === floorAlias);

  // 构建打点信息
  const trackingValue: TrackingContextValue = useMemo(() => {
    if (floorAlias) {
      return {
        page_id: floorAlias,
        page_type: 'channel_page',
        ref_page_id: floorAlias,
        ref_page_type: 'channel_page',
      };
    }
    return {
      page_id: undefined,
      page_type: undefined,
      ref_page_id: undefined,
      ref_page_type: undefined,
    };
  }, [floorAlias]);

  return (
    <TrackingContext.Provider value={trackingValue}>
      <div
        className='flex flex-col h-full overflow-y-auto overscroll-none touch-pan-y'
        ref={scrollRef}
      >
        {/* {versionHelperCounter >= 6 && (
      // 暂时关闭测试入口
        <ExchangeWrapper
          activeTab='2026'
          onTabChange={() => {
            router.push('/maka/mobile/channel2');
          }}
        />
      )} */}

        {entrances.length > 0 && (
          <div className='flex-shrink-0 sticky top-[var(--safe-area-inset-top)] bg-[length:100%_180px] bg-no-repeat w-full overflow-x-auto overflow-y-hidden z-[9]'>
            <div className='flex-shrink-0 flex items-end overflow-x-auto overflow-y-hidden py-3 px-3 pb-2 gap-5'>
              {(() => {
                // Create a combined array with jiantieChannel inserted at position 2 (third position)
                const combinedItems = [...entrances];

                return combinedItems.map((item, index) => {
                  const isActive = floorAlias === item.click_content;

                  return (
                    <BehaviorBox
                      key={index}
                      behavior={
                        {
                          object_type: 'channel_tab_btn',
                          object_id: item.click_content,
                          page_id: site?.click_content,
                          page_type: site?.click_content,
                          page_inst_id: site?.name,
                        } as any
                      }
                      className={cn([
                        'channel_item relative flex-shrink-0 flex flex-col items-center',
                        isActive &&
                        "after:content-[''] after:absolute after:-bottom-[9px] after:left-1/2 after:-translate-x-1/2 after:w-4 after:h-[6px] after:bg-[url(https://img2.maka.im/cdn/webstore7/assets/mobile_tab_arrow.png)] after:bg-contain after:bg-no-repeat",
                      ])}
                      onClick={() => {
                        onChangeChannel(item, index);
                        if (isActive) {
                          setVersionHelperCounter(versionHelperCounter + 1);
                        } else {
                          setVersionHelperCounter(0);
                        }
                      }}
                    >
                      <div
                        className={cn([
                          'flex items-center justify-center w-9 h-9 rounded-full bg-[#f4f4f5dd] border border-[#ffffffdd] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]',
                          isActive &&
                          'w-10 h-10 bg-white border-white shadow-[0px_2px_4px_-2px_rgba(0,0,0,0.1),0px_4px_6px_-1px_rgba(0,0,0,0.1)]',
                        ])}
                      >
                        <img
                          src={item.image_active}
                          style={{
                            width: 20,
                            height: 20,
                          }}
                          alt=''
                        />
                      </div>
                      <span
                        className='mt-1 font-semibold text-base leading-6 text-center text-[#09090b]'
                        style={{ fontFamily: 'PingFang SC' }}
                      >
                        {item.name}
                      </span>
                    </BehaviorBox>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {resource.length > 0 && (
          <div className='bg-white flex items-center overflow-x-auto px-2 gap-2 pt-3 rounded-t-lg'>
            {resource.map((item, index) => (
              <div
                key={index}
                className='flex flex-col items-center py-2 px-[10px] flex-shrink-0 rounded-lg'
                style={{
                  backgroundColor: colors[index],
                }}
                onClick={() => toChannel(item)}
              >
                <img src={item.image} alt='' className='w-6 mb-2' />
                <span className='text-xs font-normal leading-5 text-[rgba(0,0,0,0.88)]'>
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        )}

        {floorLayout &&
          floorLayout &&
          floorLayout === 'waterfall_flow' &&
          renderWatetfallLayout()}
        {floorLayout &&
          floorLayout &&
          floorLayout === 'gallery' &&
          renderGalleryLayout()}

        {showFeedback && (
          <div className='fixed bottom-3 left-3 right-3 bg-[#f5f5f5] flex items-center justify-between py-2 px-4 text-[rgba(0,0,0,0.88)] z-[9] border border-white shadow-[0px_0px_12px_0px_rgba(93,93,93,0.4)] rounded-md'>
            <span className='flex-1 text-[13px] font-normal leading-5 text-left'>
              没有我想要的模版
            </span>
            <Button
              className='h-7 mr-2 bg-[#1a87ff]'
              size='xs'
              onClick={toWorkOrder}
            >
              点击反馈
            </Button>
            <div
              className='flex items-center justify-center p-1'
              onClick={() => setShowFeedback(false)}
            >
              <Icon name='close' size={16} />
            </div>
          </div>
        )}
      </div>
    </TrackingContext.Provider>
  );
};

export default ChannelIndex1;

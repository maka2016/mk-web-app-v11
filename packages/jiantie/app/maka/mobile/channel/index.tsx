'use client';
import TemplateChannelFloor from '@/app/mobile/channel/components/template-channel-floor';
import SVGRemoteIcon from '@/components/SVGRemoteIcon';
import { getCmsApiHost, getToken, getUid, requestCMS } from '@/services';
import { mkWebStoreLogger } from '@/utils/logger';
import APPBridge from '@mk/app-bridge';
import { isMakaAppAndroid, queryToObj, random } from '@mk/utils';
import { BehaviorBox } from '@workspace/ui/components/BehaviorTracker';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import cls from 'classnames';
import { useRouter, useSearchParams } from 'next/navigation';
import qs from 'qs';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import styles from './home.module.scss';

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

interface Channel {
  documentId: string;
  id: number;

  name: string;
  filters: any;

  icon?: {
    url: string;
  };
  children: Channel[];
}

const colors = [
  '#FFFBE6',
  '#F6FFED',
  '#E6F4FF',
  '#FFF1F0',
  '#F9F0FF',
  '#F0F5FF',
];

const jiantieChannelId = 'pqq4f4d6hcsba4ko66muhfbt';
// const jiantieChannelId = '';

const colorCache: Record<string, string> = {};

const Home = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [floorAlias, setFloorAlias] = useState<string>(
    jiantieChannelId || 'ST_9XDCPHX4'
  );
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
  const [jiantieChannel, setJiantieChannel] = useState<Channel>();
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

  const pageView = () => {
    const site = entrances.find(item => item.click_content === floorAlias);
    mkWebStoreLogger.track_pageview({
      page_type: floorAlias,
      page_id: floorAlias,
      page_inst_id: site?.name,
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
      const hasSession = sessionIndex && sessionIndex !== jiantieChannelId;
      if (hasSession) {
        index = +sessionIndex;
      }

      const list = res.data.app_home_site_cards.filter(
        (item: any) => item.click_content
      );
      const item = list[index] || list[0];

      setEntrances(list);
      setFloorAlias(hasSession ? item?.click_content : jiantieChannelId);
      setBgColor(colorCache[item?.click_content || '']);
      if (hasSession) {
        replaceUrlArg(item.click_content, 'parent_page_type');
        replaceUrlArg(item.name, 'page_inst_id');
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
        pageView();

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

  const toSearch = () => {
    const query = queryToObj();
    let parent_page_type = 'site_search_total';

    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}/maka/mobile/channel/search?parent_page_type=${parent_page_type}&ref_page_id=${query.ref_page_id
          }&page_inst_id=${decodeURIComponent(query.page_inst_id || '')}&hotword_floor_word_btn=${decodeURIComponent(
            query.hotword_floor_word_btn || ''
          )}&is_full_screen=1`,
        type: 'URL',
      });
    } else {
      location.href = `/maka/mobile/channel/search?parent_page_type=${parent_page_type}&ref_page_id=${query.ref_page_id
        }&page_inst_id=${decodeURIComponent(query.page_inst_id || '')}&hotword_floor_word_btn=${decodeURIComponent(
          query.hotword_floor_word_btn || ''
        )}`;
    }
  };

  const toChannel = (item: Resource) => {
    const alias = item.click_content.split('&')[0].split('alias=')[1];

    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}/maka/mobile/channel/topic?id=${alias}?is_full_screen=1&isStatusBarHidden=1`,
        type: 'URL',
      });
    } else {
      location.href = `/maka/mobile/channel/topic?id=${alias}`;
    }
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
      is_full_screen: '1',
      env: 'prod',
      device: isMakaAppAndroid() ? 'Android' : 'iOS',
    };
    const queryStr = new URLSearchParams(queryObj).toString();
    const url = `https://www.maka.im/mk-web-store-v7/mobile/work-order/common?${queryStr}`;
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url,
        type: 'URL',
      });
    } else {
      location.href = url;
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
        track={{
          page_name: item.filter_name,
          page_id: site?.click_content,
          page_type: site?.click_content,
          page_inst_id: site?.name,
          parent_id: item.id,
          parent_type: 'hotword_floor_word_btn',
          parent_inst_id: item.trackInstId,
        }}
      />
    );
  };

  const renderWatetfallLayout = () => {
    const site = entrances.find(item => item.click_content === floorAlias);
    return (
      <>
        <div className={styles.sticky}>
          {hotWords.length > 1 && (
            <div
              className={styles.hotwordWrap}
              style={{
                borderRadius: resource.length ? 0 : '8px 8px 0 0',
              }}
            >
              <div className={styles.hotwords}>
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
                    className={cls([
                      styles.hotwordItem,
                      tabIndex === index && styles.active,
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
              className={styles.tabsWrap}
              style={{
                borderRadius:
                  resource.length || hotWords.length > 1 ? 0 : '8px 8px 0 0',
              }}
            >
              <div className={styles.tabs}>
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
                      className={cls([
                        styles.tabItem,
                        filterId === item.filter_id && styles.active,
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

        <div className={styles.templateContainer}>{renderHotWord()}</div>
      </>
    );
  };

  const renderGalleryLayout = () => {
    const site = entrances.find(item => item.click_content === floorAlias);
    return (
      <div
        className={styles.templateFloorContainer}
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

  const getStoreChannelV1 = async () => {
    if (!jiantieChannelId) {
      return;
    }
    const query = qs.stringify(
      {
        populate: {
          children: {
            filters: {
              online: {
                $eq: true,
              },
            },
            populate: {
              children: {
                populate: '*',
                fields: [
                  'name',
                  'id',
                  'documentId',
                  'type',
                  'online',
                  'filters',
                  'sort',
                  'config',
                ],
                sort: ['sort:asc'],
                filters: {
                  online: {
                    $eq: true,
                  },
                },
              },
              icon: {
                fields: ['url'],
              },
            },
            fields: [
              'name',
              'id',
              'documentId',
              'type',
              'online',
              'filters',
              'sort',
              'config',
            ],
            sort: ['sort:asc'],
          },
          icon: {
            fields: ['url'],
          },
        },
        fields: ['name', 'id', 'documentId', 'type', 'sort'],

        filters: {
          documentId: {
            $eq: jiantieChannelId,
          },

          online: {
            $eq: true,
          },
        },

        pagination: {
          pageSize: 1000,
          page: 1,
        },
        sort: ['sort:asc'],
      },
      { encodeValuesOnly: true }
    );

    const promptGroupRes = (
      await requestCMS.get(`${getCmsApiHost()}/api/store-channel-v1s?${query}`)
    ).data.data;

    if (promptGroupRes.length) {
      setJiantieChannel(promptGroupRes[0]);
      console.log('promptGroupRes[0]', promptGroupRes[0]);
    }
  };

  useEffect(() => {
    getEntrances();
    getStoreChannelV1();

    // scrollRef.current?.addEventListener("scroll", throttleScroll)

    return () => {
      // scrollRef.current?.removeEventListener("scroll", throttleScroll)
    };
  }, []);

  useEffect(() => {
    if (floorAlias && floorAlias !== jiantieChannelId) {
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

  const backgroundImage = `linear-gradient(to right,#86dcff 0%,#1a86ff 100%)`;

  console.log('backgroundImage', backgroundImage);
  return (
    <div
      className={cls([styles.home])}
      ref={scrollRef}
      style={{
        backgroundImage,
      }}
    >
      <div
        className={styles.banner}
        style={{
          backgroundImage,
        }}
      ></div>
      <div className={styles.searchInput} id='searchInput'>
        <div className={styles.input} onClick={toSearch}>
          <div className={styles.icon}>
            <Icon name='search' size={20} />
            <span>搜海量免费海报模板</span>
          </div>
          <div className={styles.btn}>搜索</div>
        </div>
      </div>
      {(entrances.length > 0 || jiantieChannel) && (
        <div
          className={styles.entranceWrapper}
          style={{
            backgroundImage,
          }}
        >
          <div className={styles.channel}>
            {(() => {
              // Create a combined array with jiantieChannel inserted at position 2 (third position)
              const combinedItems = [...entrances];
              if (jiantieChannel) {
                combinedItems.splice(2, 0, {
                  click_content: jiantieChannelId,
                  name: jiantieChannel.name,
                  desc: '',
                  image: '',
                  image_active: jiantieChannel.icon?.url || '',
                  isJiantieChannel: true,
                });
              }

              return combinedItems.map((item, index) => {
                const isJiantieChannel = 'isJiantieChannel' in item;
                const isActive = floorAlias === item.click_content;

                if (isJiantieChannel) {
                  return (
                    <div
                      key={`jiantie-${index}`}
                      className={cls([
                        styles.channelItem,
                        floorAlias === jiantieChannelId && styles.active,
                      ])}
                      onClick={() => {
                        localStorage.setItem(
                          'home_v4_channel',
                          `${jiantieChannelId}`
                        );
                        setFloorAlias(jiantieChannelId);
                      }}
                    >
                      <div className={styles.icon}>
                        {jiantieChannel?.icon?.url &&
                          jiantieChannel.icon.url.indexOf('.svg') > -1 ? (
                          <SVGRemoteIcon
                            url={jiantieChannel.icon?.url || ''}
                            width={20}
                            height={20}
                            color={
                              floorAlias === jiantieChannelId
                                ? '#fff'
                                : '#D53933'
                            }
                          />
                        ) : (
                          <img
                            src={jiantieChannel?.icon?.url}
                            style={{
                              width: 20,
                              height: 20,
                              objectFit: 'contain',
                            }}
                            alt=''
                          />
                        )}
                      </div>
                      <span className={styles.name}>
                        {jiantieChannel?.name}
                      </span>
                    </div>
                  );
                }

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
                    className={`${styles.channelItem} ${isActive && styles.active}`}
                    onClick={() => onChangeChannel(item, index)}
                  >
                    <div className={styles.icon}>
                      <img
                        src={item.image_active}
                        style={{
                          width: 20,
                          height: 20,
                        }}
                        alt=''
                      />
                    </div>
                    <span className={styles.name}>{item.name}</span>
                  </BehaviorBox>
                );
              });
            })()}
          </div>
        </div>
      )}

      {resource.length > 0 && (
        <div className={styles.resources}>
          {resource.map((item, index) => (
            <div
              key={index}
              className={styles.resourceItem}
              style={{
                backgroundColor: colors[index],
              }}
              onClick={() => toChannel(item)}
            >
              <img src={item.image} alt='' />
              <span>{item.name}</span>
            </div>
          ))}
        </div>
      )}

      {floorAlias !== jiantieChannelId &&
        floorLayout &&
        floorLayout === 'waterfall_flow' &&
        renderWatetfallLayout()}
      {floorAlias !== jiantieChannelId &&
        floorLayout &&
        floorLayout === 'gallery' &&
        renderGalleryLayout()}

      {jiantieChannel && floorAlias === jiantieChannelId && (
        <div className='bg-white pt-3 pb-2 rounded-t-lg'>
          {jiantieChannel?.children
            ?.filter((item: any) => item.online === true)
            ?.sort((a: any, b: any) => (a.sort || 0) - (b.sort || 0))
            .map((item: Channel) => (
              <TemplateChannelFloor
                key={item.documentId}
                channel={item}
                color='var(--theme-color)'
                showMore={true}
              />
            ))}
        </div>
      )}

      {showFeedback && (
        <div className={styles.fankui}>
          <span>没有我想要的模版</span>
          <Button className={styles.btn} size='xs' onClick={toWorkOrder}>
            点击反馈
          </Button>
          <div className={styles.close} onClick={() => setShowFeedback(false)}>
            <Icon name='close' size={16} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;

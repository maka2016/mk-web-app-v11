'use client';

import { LazyImage } from '@/components/LazyImage';
import { PageTimeoutRefresh } from '@/components/PageTimeoutRefresh';
import { cdnApi, getUid } from '@/services';
// import { mkWebStoreLogger } from '@/services/logger';
// import V11MkWebStoreLogger from '@/services/loggerv11';
import { useStore } from '@/store';
import { trpc } from '@/utils/trpc';
import { TemplateMarketChannelEntity } from '@mk/jiantie/v11-database/generated/client/client';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { mkWebStoreLogger } from '../../../../../services/logger';
import {
  SortSelectModal,
  type SortType as SortSelectType,
} from './sort-select-modal';

interface Channel
  extends Omit<
    TemplateMarketChannelEntity,
    'children' | 'create_time' | 'update_time' | 'filter'
  > {
  children?: Channel[];
  create_time: string;
  update_time: string;
  filter?: {
    alias: string;
    templateIds: string[];
    config?: {
      tagFilterData?: Array<{
        id: string;
        name: string;
        type: string;
      }>;
    } | null;
  } | null;
}

interface CoverV3 {
  url: string;
  width: number;
  height: number;
}

interface Template {
  id: string;
  title: string;
  desc: string;
  cover: { url: string };
  coverV3: CoverV3 | null;
  spec: {
    id: string;
    preview_width: number | null;
    preview_height: number | null;
  } | null;
  template_id: string;
  cover_url: string;
  name: string;
}

type SortType = 'default' | 'time' | 'hot'; // 综合排序、时间、热度

const sortTypeToI18nKey: Record<SortType, '综合排序' | '最新排序' | '最热排序'> = {
  default: '综合排序',
  time: '最新排序',
  hot: '最热排序',
};

// 打点业务相关的 Context
interface TrackingContextValue {
  ref_page_id?: string;
  ref_page_type?: string;
  page_id?: string;
  page_type?: string;
}

const TrackingContext = createContext<TrackingContextValue>({
  ref_page_id: undefined,
  ref_page_type: undefined,
  page_id: undefined,
  page_type: undefined,
});

// Hook 用于在子组件中获取打点信息
export const useTracking = () => {
  return useContext(TrackingContext);
};

interface Props {
  appid?: string;
  headerWrapper?: React.ReactNode;
}

export default function Main({
  appid = 'janur',
  headerWrapper = null,
}: Props) {
  const nav = useStore();
  const t = useTranslations('ChannelHome');
  const [channels, setChannels] = useState<Channel[]>([]);
  const channelsLastFetchedAtRef = useRef<number | null>(null);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [activeHotWord, setActiveHotWord] = useState<Channel | null>(null);
  const [activeLevel4Tag, setActiveLevel4Tag] = useState<Channel | null>(null); // 选中的四级标签
  const [sortType, setSortType] = useState<SortType>('default');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [, setLoading] = useState(true);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [finished, setFinished] = useState(false);
  const [unread, setUnread] = useState(0);
  const [showSortModal, setShowSortModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  // 追踪每个四级标签是否已经打过 pageview log
  const loggedLevel4TagsRef = useRef<Set<string>>(new Set());

  const PAGE_SIZE = 20;

  // 获取未读通知数
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any)['freshPageData'] = () => {
        const fetchUnreadNotifications = async () => {
          try {
            const uid = getUid();
            if (!uid) {
              setUnread(0);
              return;
            }
            const res = await trpc.rsvp.getUnreadNotificationCount.query({
              user_id: uid,
            });
            setUnread(res.count || 0);
          } catch (error) {
            console.error('Failed to get RSVP notifications:', error);
            setUnread(0);
          }
        };
        fetchUnreadNotifications();
      };
    }
  }, []);

  // 获取频道数据
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        setLoading(true);
        const data = await trpc.channel.getChannels.query({
          env: 'production',
          appid: appid,
        }) as any;
        setChannels(data as Channel[]);
        channelsLastFetchedAtRef.current = Date.now();

        // 设置默认选中的一级栏目（选择第一个）
        const firstChannel = data[0];
        if (firstChannel && firstChannel.children) {
          // 尝试从 localStorage 读取用户上次选择的二级频道
          const storageKey = `channel2_homev2_selected_channel_${appid}`;
          const savedChannelId =
            typeof window !== 'undefined'
              ? localStorage.getItem(storageKey)
              : null;

          let selectedChannel: Channel | null = null;

          // 如果存在保存的频道ID，尝试找到对应的频道
          if (savedChannelId) {
            selectedChannel =
              firstChannel.children.find(
                (channel: Channel) => String(channel.id) === savedChannelId
              ) || null;
          }

          // 如果找不到保存的频道（可能已被删除或无效），使用默认的第一个频道
          if (!selectedChannel) {
            selectedChannel = firstChannel.children[0] || null;
          }

          setActiveChannel(selectedChannel);
        }
      } catch (err) {
        console.error('获取频道数据失败:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();
  }, [appid]);

  // 获取二级频道的三级热词
  useEffect(() => {
    const fetchHotWords = async () => {
      if (!activeChannel) return;

      // 如果已经有 children（三级热词），说明已经获取过了，不需要重复请求
      if (activeChannel.children && activeChannel.children.length > 0) {
        // 如果还没有选中热词，默认选中第一个
        if (!activeHotWord) {
          setActiveHotWord(activeChannel.children[0] as any);
        }
        return;
      }

      try {
        const channelDetail = await trpc.channel.getChannelDetail.query({
          id: activeChannel.id,

        });

        if (channelDetail && channelDetail.children) {
          console.log('获取到的三级热词:', channelDetail.children);
          // 更新 activeChannel 的 children（三级热词）
          setActiveChannel(prev => {
            if (!prev) return null;
            return {
              ...prev,
              children: channelDetail.children as any,
            };
          });

          // 默认选中第一个三级热词
          if (channelDetail.children.length > 0) {
            const firstHotWord = channelDetail.children[0] as any;
            console.log('选中的三级热词:', firstHotWord);
            console.log('三级热词的 filter:', firstHotWord.filter);
            setActiveHotWord(firstHotWord);
          }
        }
      } catch (err) {
        console.error('获取热词失败:', err);
      }
    };

    fetchHotWords();
    // 只依赖 activeChannel.id，避免因为更新 activeChannel 对象导致重复请求
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannel?.id]);

  // 监听 activeChannel 变化，自动重置子级数据
  useEffect(() => {
    if (activeChannel) {
      setActiveHotWord(null);
      // setActiveContentType('');
      setTemplates([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannel?.id]);

  // 监听 activeHotWord 变化，自动重置 activeLevel4Tag 和 templates
  useEffect(() => {
    if (activeHotWord) {
      // 默认选中第一个四级标签
      const level4Tags = (activeHotWord.children || []) as Channel[];
      if (level4Tags.length > 0) {
        // // 按照 sort_weight 从小到大排序
        setActiveLevel4Tag(level4Tags[0]);
      } else {
        setActiveLevel4Tag(null);
      }
      setTemplates([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHotWord?.id]);

  // 监听 activeLevel4Tag 变化，自动重置 templates 和分页
  useEffect(() => {
    if (activeLevel4Tag) {
      setTemplates([]);
      setPage(1);
      setFinished(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLevel4Tag?.id]);

  // 监听 sortType 变化，自动重置 templates 和分页
  useEffect(() => {
    setTemplates([]);
    setPage(1);
    setFinished(false);
  }, [sortType]);

  // 监听频道、热词变化，自动重置为默认排序
  useEffect(() => {
    setSortType('default');
    setTemplatesLoading(true);
  }, [activeChannel?.id, activeHotWord?.id]);

  // 获取模板列表
  useEffect(() => {
    const fetchTemplates = async () => {
      console.log('获取模板 - activeLevel4Tag:', activeLevel4Tag);

      if (!activeLevel4Tag) {
        console.log('缺少四级标签，清空模板列表');
        setTemplates([]);
        return;
      }

      try {
        console.log('开始请求模板，channelId:', activeLevel4Tag.id);
        setTemplatesLoading(true);
        setFinished(false);

        const result = await trpc.channel.getTemplatesByChannelId.query({
          channelId: activeLevel4Tag.id,
          skip: 0,
          take: PAGE_SIZE,
          sortBy: sortType,
        });

        console.log('获取到的模板数据:', result);

        // 转换模板数据格式，保留 coverV3
        const formattedTemplates: Template[] = result.templates.map(
          (t: any) => {
            const coverUrl = (t.coverV3 as { url: string; width: number; height: number } | null)?.url || '';
            return {
              ...t,
              template_id: t.id,
              name: t.title || '',
              desc: t.desc || '',
              cover_url: coverUrl,
              cover: { url: coverUrl },
              coverV3: t.coverV3 || null,
            };
          }
        );

        setTemplates(formattedTemplates);
        setPage(1);
        setFinished(result.templates.length < PAGE_SIZE);

        // 当模板内容第一次显示时，打 pageview log
        if (
          activeLevel4Tag?.id &&
          formattedTemplates.length > 0 &&
          !loggedLevel4TagsRef.current.has(`${activeLevel4Tag.id}`)
        ) {
          loggedLevel4TagsRef.current.add(`${activeLevel4Tag.id}`);

          // V11MkWebStoreLogger.track_pageview({
          //   page_type: 'tag_channel',
          //   page_id: `${activeLevel4Tag.id}`,
          //   object_type: 'tag_channel',
          //   object_id: activeLevel4Tag.id,
          // });
          mkWebStoreLogger.track_pageview(
            {
              page_type: 'tag_channel',
              page_id: `${activeLevel4Tag.id}`,
              object_type: 'tag_channel',
              object_id: activeLevel4Tag.id,
            },
            true
          );
        }
      } catch (err) {
        console.error('获取模板失败:', err);
        setTemplates([]);
      } finally {
        setTemplatesLoading(false);
      }
    };

    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLevel4Tag?.id, sortType]);

  // 加载更多模板
  const loadMore = async () => {
    if (templatesLoading || finished || !activeLevel4Tag) return;

    try {
      setTemplatesLoading(true);
      const result = await trpc.channel.getTemplatesByChannelId.query({
        channelId: activeLevel4Tag.id,
        skip: page * PAGE_SIZE,
        take: PAGE_SIZE,
        sortBy: sortType,
      });

      const formattedTemplates: Template[] = result.templates.map((t: any) => {
        const coverUrl = (t.coverV3 as any)?.url || '';
        return {
          ...t,
          template_id: t.id,
          name: t.title || '',
          desc: t.desc || '',
          cover_url: coverUrl,
          cover: { url: coverUrl },
          coverV3: t.coverV3 || null,
        };
      });

      setTemplates(prev => [...prev, ...formattedTemplates]);
      setPage(prev => prev + 1);
      setFinished(result.templates.length < PAGE_SIZE);
    } catch (err) {
      console.error('加载更多模板失败:', err);
    } finally {
      setTemplatesLoading(false);
    }
  };

  // scrollTop 通过 onScroll 属性直接更新，无需额外 useEffect

  // 滚动到底部加载更多
  useEffect(() => {
    const handleScroll = () => {
      if (!scrollRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      if (scrollHeight - scrollTop - clientHeight < 100) {
        loadMore();
      }
    };

    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll);
      return () => scrollElement.removeEventListener('scroll', handleScroll);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templatesLoading, finished, page, activeLevel4Tag]);

  // 获取当前一级栏目的二级频道（选择第一个一级栏目）
  const currentEditionChannels = channels[0]?.children || [];

  // 主题色（通过 CSS 变量，由 var.css 中按 appid class 定义）
  const themeColor = 'var(--theme-color)';
  const themeBgGradient = 'var(--theme-bg-gradient)';
  const textPrimary = 'var(--theme-text-primary)';
  const textSecondary = 'var(--theme-text-secondary)';
  const borderColor = 'var(--theme-border-color)';



  // 构建打点信息
  const trackingValue: TrackingContextValue = useMemo(() => {
    console.log('构建打点信息activeLevel4Tag', activeLevel4Tag);
    if (activeLevel4Tag?.id) {
      return {
        ref_page_id: String(activeLevel4Tag.id),
        ref_page_type: 'tag_channel',
        page_id: String(activeLevel4Tag.id),
        page_type: 'tag_channel',
      };
    }
    return {
      ref_page_id: undefined,
      ref_page_type: undefined,
    };
  }, [activeLevel4Tag?.id]);

  return (
    <TrackingContext.Provider value={trackingValue}>
      <PageTimeoutRefresh />
      <div
        className='flex flex-col h-dvh overflow-y-auto'
        style={{
          // paddingTop: 'var(--safe-area-inset-top)',
          background: themeBgGradient,
        }}
        ref={scrollRef}
        onScroll={(e) => {
          setScrollTop((e.target as HTMLDivElement).scrollTop);
        }}
      >
        {/* 状态栏占位 */}
        <div
          className='flex shrink-0 items-center sticky top-0 z-40 '
          style={{
            height: 'var(--safe-area-inset-top)',
            background: scrollTop >= 130 ? themeBgGradient : 'transparent',
            transition: 'background-color 0.3s ease',
          }}
        ></div>
        {headerWrapper}
        {/* 头部 */}

        {/* {appid === 'maka' && (
          <div className='px-3 pb-1  pt-2'>
            <div
              className='flex items-center gap-1.5 rounded-lg border border-white/70 bg-white/90 px-3 py-2 shadow-sm shadow-black/5 backdrop-blur cursor-pointer'
              onClick={() => {
                nav.push('/mobile/channel2/search');
              }}
            >
              <Search className='w-4 h-4 text-neutral-400' />
              <span className='text-sm text-neutral-500'>搜海量模板</span>
            </div>
          </div>
        )} */}
        {/* 二级频道导航 */}
        <div className='relative px-3 pt-2 shrink-0 z-30' style={{ background: themeBgGradient }}>
          <div className='flex gap-6 overflow-x-auto items-center'>
            {currentEditionChannels.map((channel: Channel) => {
              const isActive = activeChannel?.id === channel.id;
              return (
                <div
                  key={channel.id}
                  className='relative flex flex-col items-center shrink-0 cursor-pointer pb-2'
                  onClick={async () => {
                    if (channel.id === activeChannel?.id) {
                      return;
                    }
                    const now = Date.now();
                    const lastFetchedAt = channelsLastFetchedAtRef.current;
                    const needRefresh =
                      !!lastFetchedAt && now - lastFetchedAt > 30 * 1000;

                    let targetChannel: Channel | null = channel;

                    if (needRefresh) {
                      console.log('需要刷新儿频道数据');
                      try {
                        const data =
                          await trpc.channel.getChannels.query({
                            env: 'production',
                            appid: appid,
                          }) as any;
                        setChannels(data as Channel[]);
                        channelsLastFetchedAtRef.current = Date.now();

                        // 找到包含该频道的父级栏目
                        let refreshedChannel: Channel | null = null;
                        for (const parentChannel of data) {
                          const found = parentChannel.children?.find(
                            (item: Channel) => item.id === channel.id
                          );
                          if (found) {
                            refreshedChannel = found;
                            break;
                          }
                        }

                        if (refreshedChannel) {
                          targetChannel = refreshedChannel;
                        }
                      } catch (error) {
                        console.error('刷新频道数据失败:', error);
                      }
                    }

                    if (!targetChannel) {
                      return;
                    }

                    setActiveChannel(targetChannel);
                    // 保存用户选择的二级频道到 localStorage
                    if (typeof window !== 'undefined') {
                      const storageKey = `channel2_homev2_selected_channel_${appid}`;
                      localStorage.setItem(
                        storageKey,
                        String(targetChannel.id)
                      );
                    }
                  }}
                >
                  <span
                    className='text-base whitespace-nowrap transition-colors duration-200'
                    style={{
                      color: isActive ? textPrimary : textSecondary,
                      fontWeight: isActive ? 600 : 400,
                      fontFamily: '"PingFang SC"',
                    }}
                  >
                    {channel.display_name}
                  </span>
                  {isActive && (
                    <div
                      className='absolute bottom-0 h-[4px] rounded-full'
                      style={{
                        backgroundColor: themeColor,
                        width: '32px',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          {/* 分割线 */}
          <div className='absolute bottom-0 left-0 right-0 h-px bg-black/5' />
        </div>
        {/* 三级热词和筛选 */}
        <div
          className='p-3 shrink-0 sticky  z-30 rounded-tl-[12px] rounded-tr-[12px] bg'
          style={{
            // paddingTop: 'var(--safe-area-inset-top)',
            top: 'calc(var(--safe-area-inset-top) )',
            background: themeBgGradient,
          }}
        >
          {/* 三级热词标签，>1的时候才显示*/}
          {activeChannel?.children && activeChannel.children.length > 1 && (
            <div className='flex gap-2 mb-2 overflow-x-auto'>
              {activeChannel.children.map((hotWord: any) => {
                const isActive = activeHotWord?.id === hotWord.id;
                return (
                  <div
                    key={hotWord.id}
                    className='flex items-center gap-1 px-3 py-1 rounded-lg shrink-0 cursor-pointer transition-all duration-200'
                    style={{
                      border: isActive ? `1.5px solid ${themeColor}` : `1.5px solid ${borderColor}`,
                      backgroundColor: '#ffffff',
                    }}
                    onClick={() => {
                      if (hotWord.id === activeHotWord?.id) {
                        return;
                      }
                      setActiveHotWord(hotWord);
                    }}
                  >
                    {hotWord.thumb_path && (
                      <img
                        src={cdnApi(hotWord.thumb_path)}
                        alt={hotWord.display_name}
                        className='w-[16px] h-[16px] object-contain'
                      />
                    )}
                    <span
                      className='text-sm font-medium whitespace-nowrap'
                      style={{
                        color: isActive ? themeColor : textPrimary,
                        fontFamily: '"PingFang SC"',
                      }}
                    >
                      {hotWord.display_name}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* 四级标签筛选和排序 */}
          {
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2 py-1 overflow-x-auto'>
                {(() => {
                  // 获取四级标签
                  const level4Tags = (activeHotWord?.children ||
                    []) as Channel[];

                  return level4Tags.map(tag => {
                    const isActive = activeLevel4Tag?.id === tag.id;
                    return (
                      <div
                        key={tag.id}
                        className='flex items-center px-3 py-1 rounded-lg shrink-0 cursor-pointer transition-colors duration-200'
                        style={{
                          backgroundColor: isActive ? themeColor : '#ffffff',
                          border: isActive ? `1.5px solid ${themeColor}` : `1.5px solid ${borderColor}`,
                        }}
                        onClick={() => {
                          setActiveLevel4Tag(tag);
                        }}
                      >
                        <span
                          className='text-sm font-medium whitespace-nowrap'
                          style={{
                            color: isActive ? '#ffffff' : textPrimary,
                            fontFamily: '"PingFang SC"',
                          }}
                        >
                          {tag.display_name}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
              {/* 排序选择 */}
              {
                <div
                  className='flex items-center gap-1 cursor-pointer'
                  onClick={() => {
                    setShowSortModal(true);
                  }}
                >
                  <span
                    className='text-sm font-semibold'
                    style={{
                      fontFamily: '"PingFang SC"',
                      color: textPrimary,
                    }}
                  >
                    {t(sortTypeToI18nKey[sortType])}
                  </span>
                  <ChevronDown
                    className='w-3 h-3'
                    style={{ color: textPrimary }}
                  />
                </div>
              }
            </div>
          }
        </div>
        {/* 内容区域 */}
        <div className='flex flex-col' style={{ minHeight: '100%', background: themeBgGradient }}>
          {/* 模板瀑布流 */}
          <div className='px-3 pb-20' style={{ background: themeBgGradient }}>
            {templatesLoading && templates.length === 0 ? (
              <div className='flex items-center justify-center h-full pt-2'>
                <div className='text-center'>
                  <div
                    className='w-4 h-4 border-4 rounded-full animate-spin mx-auto mb-4'
                    style={{
                      borderColor: themeColor,
                      borderTopColor: 'transparent',
                    }}
                  />
                  <p className='text-gray-500'>{t('加载中')}</p>
                </div>
              </div>
            ) : !templatesLoading &&
              activeLevel4Tag &&
              templates.length === 0 ? (
              <div className='flex items-center justify-center h-full'>
                <div className='text-center text-gray-500'>
                  <p className='text-xl mb-2'>📭</p>
                  <p>{t('暂无模板')}</p>
                </div>
              </div>
            ) : templates.length > 0 ? (
              <TemplateWaterfall
                key={activeLevel4Tag?.id || 'template-waterfall'}
                templates={templates}
                appid={appid}
              />
            ) : null}

            {/* 加载更多指示器 */}
            {templatesLoading && templates.length > 0 && (
              <div className='flex items-center justify-center py-4'>
                <div
                  className='w-8 h-8 border-2 rounded-full animate-spin'
                  style={{
                    borderColor: themeColor,
                    borderTopColor: 'transparent',
                  }}
                />
              </div>
            )}

            {/* 底部提示 */}
            {finished && templates.length > 0 && !templatesLoading && (
              <div className='flex items-center justify-center py-4'>
                <span
                  className='text-sm'
                  style={{
                    color: textSecondary,
                    fontFamily: '"PingFang SC"',
                  }}
                >
                  - {t('已经到底部啦')} -
                </span>
              </div>
            )}
          </div>
        </div>
        {/* 排序选择弹窗 */}
        <SortSelectModal
          activeSort={sortType}
          open={showSortModal}
          onOpenChange={setShowSortModal}
          onSortChange={(sort: SortSelectType) => {
            setSortType(sort);
          }}
        />
      </div>
    </TrackingContext.Provider>
  );
}

// 模板瀑布流组件
interface TemplateWaterfallProps {
  templates: Template[];
  appid: string;
}

const TemplateWaterfall = ({
  templates,
  appid,
}: TemplateWaterfallProps) => {
  const store = useStore();
  const trackMeta = useTracking();
  const { ref_page_id, ref_page_type } = trackMeta;
  const [cardWidth, setCardWidth] = useState(0);
  const [columnCount, setColumnCount] = useState(3);
  const containerRef = useRef<HTMLDivElement>(null);
  const t = useTranslations('ChannelHome');

  // 从 CSS 变量读取实际 hex 值（LazyImage 的 JS 颜色计算需要）
  const [resolvedThemeColor, setResolvedThemeColor] = useState('');
  useEffect(() => {
    const color = getComputedStyle(document.documentElement)
      .getPropertyValue('--theme-color').trim();
    // eslint-disable-next-line -- 合理的一次性 DOM 读取，非级联渲染
    if (color) setResolvedThemeColor(color);
  }, []);

  // 计算列数和卡片宽度 - 移动端3列，桌面端6-8列
  useEffect(() => {
    const calculateLayout = () => {
      if (containerRef.current) {
        // 获取容器的实际宽度
        const containerWidth = containerRef.current.clientWidth;
        // 判断是否为移动端（< 768px）
        const isMobile = containerWidth < 768;

        let cols: number;
        if (isMobile) {
          // 移动端：固定3列
          cols = 3;
        } else {
          // 桌面端：根据容器宽度动态计算6-8列
          // 假设每列最小宽度约120px，最大宽度约200px
          // 容器宽度 = padding(24px) + gap(16px * (cols-1)) + cols * cardWidth
          // 简化计算：根据容器宽度决定列数
          if (containerWidth < 1024) {
            cols = 6;
          } else if (containerWidth < 1440) {
            cols = 7;
          } else {
            cols = 8;
          }
        }

        setColumnCount(cols);

        // 计算卡片宽度
        // 移动端：gap-2 = 8px * 2 = 16px
        // 桌面端：gap-4 = 16px * 2 = 32px（更大的间隙方便查看）
        const gap = isMobile ? 8 : 16; // gap-2 (移动端) 或 gap-4 (桌面端)
        const padding = 0; // px-3 = 12px * 2 = 24px
        const width = (containerWidth - padding - gap * (cols - 1)) / cols;
        setCardWidth(width);
      }
    };

    calculateLayout();

    // 使用 ResizeObserver 监听容器尺寸变化
    const resizeObserver = new ResizeObserver(() => {
      calculateLayout();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // 同时监听窗口大小变化（作为备用）
    window.addEventListener('resize', calculateLayout);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', calculateLayout);
    };
  }, []);

  // 将模板分配到多列中，实现真正的瀑布流
  const columns = useMemo(() => {
    if (!cardWidth || templates.length === 0 || columnCount === 0) {
      return Array(columnCount || 3)
        .fill(null)
        .map(() => []);
    }

    // 计算每个模板卡片的高度
    const getCardHeight = (template: Template) => {
      if (!template.coverV3) {
        // 如果没有 coverV3，使用默认宽高比 9:16
        return (cardWidth * 16) / 9;
      }

      const { width, height } = template.coverV3;
      if (width / height < 9 / 20) {
        return (cardWidth * 20) / 9;
      }
      return (cardWidth * height) / width;
    };

    // 初始化列数组
    const newColumns: Array<Array<Template>> = Array(columnCount)
      .fill(null)
      .map(() => []);
    // 记录每列的总高度
    const columnHeights = Array(columnCount).fill(0);

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
  }, [templates, cardWidth, columnCount]);

  // 计算每个模板卡片的高度（用于渲染）
  const getCardHeight = (template: Template) => {
    if (!cardWidth) return 0;

    if (!template.coverV3) {
      // 如果没有 coverV3，使用默认宽高比 9:16
      return (cardWidth * 16) / 9;
    }
    const { width, height } = template.coverV3;
    if (width / height < 9 / 20) {
      return (cardWidth * 20) / 9;
    }

    // //临时
    // if (height > 1400) {
    //   return (cardWidth * 20) / 9;
    // }

    return (cardWidth * height) / width;
  };

  const handleTemplateClick = (template: Template) => {
    const templateId = template.template_id || template.id;
    const templateName = template.name || template.title || '';

    // 统一构建 URL 参数
    const params = new URLSearchParams({
      id: templateId,
      appid: appid || '',
      template_name: templateName,
    });

    // 如果有打点信息，添加到参数中
    if (ref_page_id) {
      params.set('ref_page_id', ref_page_id);
    }
    if (ref_page_type) {
      params.set('ref_page_type', ref_page_type);
    }

    // 从当前 URL 获取 clickid 参数
    const currentParams = new URLSearchParams(window.location.search);
    const clickid = currentParams.get('clickid');
    if (clickid) {
      params.set('clickid', clickid);
    }

    mkWebStoreLogger.track_click({
      object_type: 'template_item',
      object_id: template.id,
      ...trackMeta,
      // page_type: 'tag_channel',
      // page_id: String(activeLevel4Tag.id),
    });

    // // App 内需要添加 is_full_screen 参数
    // if (APPBridge.judgeIsInApp()) {
    //   params.set('is_full_screen', '1');
    //   // App 内需要使用完整 URL
    //   const appUrl = new URL(
    //     `${location.origin}/mobile/template`,
    //     window.location.origin
    //   );
    //   appUrl.search = params.toString();
    //   APPBridge.navToPage({
    //     url: appUrl.toString(),
    //     type: 'URL',
    //   });
    // } else {
    //   // Web 端使用相对路径
    //   const url = `/mobile/template?${params.toString()}`;
    //   store.push(url);
    // }
    // App 和 Web 端统一使用
    // const url = `/mobile/template?${params.toString()}`;
    store.toTemplateDetail(templateId, {
      // to object
      query: Object.fromEntries(params.entries()),
    });
  };

  return (
    <div ref={containerRef} className='flex gap-2 md:gap-4'>
      {columns.map((column, columnIndex) => (
        <div key={columnIndex} className='flex-1 flex flex-col gap-2 md:gap-3'>
          {column.map(template => {
            const cardHeight = getCardHeight(template);
            const coverUrltemp =
              template.coverV3?.url || '';
            const coverUrl = cdnApi(coverUrltemp, {
              resizeWidth: cardWidth * 2,
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
                key={template.id}
                className='relative rounded-sm overflow-hidden cursor-pointer active:opacity-80 md:hover:scale-105 md:hover:shadow-lg transition-all duration-200'
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
                    alt={template.title || template.name || ''}
                    className='w-full h-full relative'
                    style={{ height: '100%' }}
                    edition={appid === 'jiantie' ? 'personal' : 'business'}
                    templateId={template.id}
                    themeColor={resolvedThemeColor}
                    onLoad={() => {
                      mkWebStoreLogger.track_show({
                        ...trackMeta,
                        object_type: 'template_item',
                        object_id: template.id,
                      });
                    }}
                  />
                ) : (
                  <div
                    className='w-full h-full flex items-center justify-center'
                    style={{ backgroundColor: 'var(--theme-card-bg)' }}
                  >
                    <span style={{ color: 'var(--theme-text-secondary)' }} className='text-xs'>{t('暂无封面')}</span>
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

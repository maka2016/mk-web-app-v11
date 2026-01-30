'use client';

import { PageTimeoutRefresh } from '@/components/PageTimeoutRefresh';
import { cdnApi, getUid } from '@/services';
import { useStore } from '@/store';
import { trpc } from '@/utils/trpc';
import { TemplateMarketChannelEntity } from '@mk/jiantie/v11-database/generated/client/client';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  TrackingContext,
  TrackingContextValue,
} from '../../../../components/TrackingContext';
import { mkWebStoreLogger } from '../../../../services/logger';
import { TemplateItem2026, TemplateWaterfall } from './TemplateWaterfall';

interface SortOption {
  value: SortType;
  label: string;
  description?: string;
}

const sortOptions: SortOption[] = [
  {
    value: 'default',
    label: '综合排序',
    description: '多因素综合排序',
  },
  {
    value: 'time',
    label: '最新排序',
    description: '按创建时间倒序',
  },
  {
    value: 'hot',
    label: '最热排序',
    description: '按受欢迎程度倒序',
  },
];

interface SortSelectModalProps {
  /** 当前选中的排序类型 */
  activeSort?: SortType;
  /** 排序改变时的回调 */
  onSortChange?: (sort: SortType) => void;
  /** 是否显示弹窗 */
  open?: boolean;
  /** 弹窗打开/关闭的回调 */
  onOpenChange?: (open: boolean) => void;
}

export const SortSelectModal = ({
  activeSort = 'default',
  onSortChange,
  open,
  onOpenChange,
}: SortSelectModalProps) => {
  const handleSelect = (sort: SortType) => {
    if (sort === activeSort) {
      if (onOpenChange) {
        onOpenChange(false);
      }
      return;
    }
    if (onSortChange) {
      onSortChange(sort);
    }
    // 延迟关闭弹窗，让用户看到选中反馈
    setTimeout(() => {
      if (onOpenChange) {
        onOpenChange(false);
      }
    }, 100);
  };

  return (
    <ResponsiveDialog
      isDialog
      isOpen={open}
      onOpenChange={onOpenChange}
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
        {/* 标题 */}
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

        {/* 排序选项 */}
        <div className='flex flex-col' style={{ gap: '4px' }}>
          {sortOptions.map(option => {
            const isActive = activeSort === option.value;
            return (
              <button
                key={option.value}
                className='flex items-center justify-between w-full px-4 py-3 cursor-pointer active:bg-gray-100'
                style={{
                  borderRadius: '8px',
                }}
                onClick={() => handleSelect(option.value)}
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
                  {option.description && (
                    <span
                      className='text-xs'
                      style={{
                        fontFamily: '"PingFang SC"',
                        color: '#94a3b8',
                      }}
                    >
                      {option.description}
                    </span>
                  )}
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
  );
};

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

type SortType = 'default' | 'time' | 'hot'; // 综合排序、时间、热度

// 排序类型显示文本映射
const sortTypeLabels: Record<SortType, string> = {
  default: '综合排序',
  time: '最新排序',
  hot: '最热排序',
};

// 导出 useTracking 供子组件使用
// export { useTracking };

interface Props {
  appid?: string;
  headerWrapper?: React.ReactNode;
}

export default function Channel2026({
  appid = 'maka',
  headerWrapper = null,
}: Props) {
  const nav = useStore();
  const [channels, setChannels] = useState<Channel[]>([]);
  const channelsLastFetchedAtRef = useRef<number | null>(null);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [activeHotWord, setActiveHotWord] = useState<Channel | null>(null);
  const [activeLevel4Tag, setActiveLevel4Tag] = useState<Channel | null>(null); // 选中的四级标签
  const [sortType, setSortType] = useState<SortType>('default');
  const [templates, setTemplates] = useState<TemplateItem2026[]>([]);
  const [, setLoading] = useState(true);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [finished, setFinished] = useState(false);
  const [unread, setUnread] = useState(0);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
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
        }) as any;
        setChannels(data as Channel[]);
        channelsLastFetchedAtRef.current = Date.now();

        // 固定使用商业版频道
        const editionChannel = data.find(
          (channel: Channel) => channel.display_name === '商业'
        );
        if (editionChannel && editionChannel.children) {
          // 尝试从 localStorage 读取用户上次选择的二级频道
          const storageKey = `channel2_homev2_selected_channel_business`;
          const savedChannelId =
            typeof window !== 'undefined'
              ? localStorage.getItem(storageKey)
              : null;

          let selectedChannel: Channel | null = null;

          // 如果存在保存的频道ID，尝试找到对应的频道
          if (savedChannelId) {
            selectedChannel =
              editionChannel.children.find(
                (channel: Channel) => String(channel.id) === savedChannelId
              ) || null;
          }

          // 如果找不到保存的频道（可能已被删除或无效），使用默认的第一个频道
          if (!selectedChannel) {
            selectedChannel = editionChannel.children[0] || null;
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
          locale: 'zh-CN',
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
        const formattedTemplates: TemplateItem2026[] = result.templates.map(
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
          mkWebStoreLogger.track_pageview({
            page_type: 'tag_channel',
            page_id: `${activeLevel4Tag.id}`,
            object_type: 'tag_channel',
            object_id: activeLevel4Tag.id,
          });
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

      const formattedTemplates: TemplateItem2026[] = result.templates.map(
        (t: any) => {
          const coverUrl = t.cover || t.coverV2 || '';
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

      setTemplates(prev => [...prev, ...formattedTemplates]);
      setPage(prev => prev + 1);
      setFinished(result.templates.length < PAGE_SIZE);
    } catch (err) {
      console.error('加载更多模板失败:', err);
    } finally {
      setTemplatesLoading(false);
    }
  };

  // 监听滚动位置，用于状态栏背景渐变
  useEffect(() => {
    const handleScroll = () => {
      if (!scrollRef.current) return;
      setScrollTop(scrollRef.current.scrollTop);
    };

    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll);
      return () => scrollElement.removeEventListener('scroll', handleScroll);
    }
  }, []);

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

  // 获取当前一级栏目的二级频道（固定使用商业版）
  const currentEditionChannels =
    channels.find((channel: Channel) => channel.display_name === '商业')
      ?.children || [];

  // 主题色（固定使用商业版蓝色）
  const themeColor = '#3358d4';
  const themeBgGradient =
    'linear-gradient(229.87deg, rgba(0, 120, 255, 0.8) 1.92%, rgba(255, 255, 255, 0.6) 38.84%), linear-gradient(135.77deg, rgba(0, 80, 255, 0.8) 17.08%, rgba(255, 255, 255, 0.6) 38.06%), linear-gradient(90deg, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 1) 100%)';

  // linear-gradient(to right, rgb(134, 220, 255) 0%, rgb(26, 134, 255) 100%)

  // 构建打点信息
  const trackingValue: TrackingContextValue = useMemo(() => {
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
      page_id: undefined,
      page_type: undefined,
    };
  }, [activeLevel4Tag?.id]);

  // 处理模版点击
  const handleTemplateClick = (template: TemplateItem2026) => {
    const templateId = template.template_id || template.id;
    setSelectedTemplateId(templateId);
    setShowTemplateDialog(true);
  };

  return (
    <TrackingContext.Provider value={trackingValue}>
      <PageTimeoutRefresh />
      <div className='flex flex-col h-dvh overflow-y-auto' ref={scrollRef}>
        {/* 状态栏占位 */}
        <div
          className='flex shrink-0 items-center  sticky top-0 z-40  '
          style={{
            height: 'var(--safe-area-inset-top)',
            backgroundColor: scrollTop >= 130 ? '#ffffff' : 'transparent',
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
        <div className='px-3 py-2 shrink-0 z-30  '>
          <div className='flex gap-5 overflow-x-auto items-center'>
            {currentEditionChannels.map((channel: Channel) => {
              const isActive = activeChannel?.id === channel.id;
              return (
                <div
                  key={channel.id}
                  className='flex flex-col items-center gap-1 shrink-0 cursor-pointer  '
                  style={{ width: isActive ? '52px' : '40px' }}
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
                          }) as any;
                        setChannels(data as Channel[]);
                        channelsLastFetchedAtRef.current = Date.now();

                        const editionChannel = data.find(
                          (item: Channel) => item.display_name === '商业'
                        );

                        const refreshedChannel =
                          editionChannel?.children?.find(
                            (item: Channel) => item.id === channel.id
                          ) || null;

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
                      const storageKey = `channel2_homev2_selected_channel_business`;
                      localStorage.setItem(
                        storageKey,
                        String(targetChannel.id)
                      );
                    }
                  }}
                >
                  {/* 频道图标 */}
                  <div
                    className='rounded-full flex items-center justify-center'
                    style={{
                      width: isActive ? '48px' : '36px',
                      height: isActive ? '48px' : '36px',
                      border: isActive ? '' : 'solid 1px white',
                      backgroundColor: isActive ? themeColor : '#f4f4f5',
                      boxShadow: isActive
                        ? '0px 4px 6px -1px rgba(0,0,0,0.1), 0px 2px 4px -2px rgba(0,0,0,0.1)'
                        : '0 1px 2px -1px rgba(0, 0, 0, 0.10), 0 1px 3px 0 rgba(0, 0, 0, 0.10)',
                    }}
                  >
                    {channel.thumb_path ? (
                      <img
                        src={cdnApi(channel.thumb_path)}
                        alt={channel.display_name}
                        className='w-[18px] h-[18px] object-contain'
                      />
                    ) : (
                      <span className='text-lg'>{channel.display_name[0]}</span>
                    )}
                  </div>
                  {/* 频道名称 */}
                  <span
                    className='text-base font-semibold whitespace-nowrap'
                    style={{
                      color: isActive ? themeColor : '#09090b',
                      fontFamily: '"PingFang SC"',
                    }}
                  >
                    {channel.display_name.substring(0, 3)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        {/* 三级热词和筛选 */}
        <div
          className='p-3 shrink-0 sticky  z-30 bg-white rounded-tl-[12px] rounded-tr-[12px]'
          style={{
            // paddingTop: 'var(--safe-area-inset-top)',
            top: 'calc(var(--safe-area-inset-top) )',
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
                    className='flex items-center gap-1 px-2 py-1 rounded-[6px] shrink-0 cursor-pointer'
                    style={{
                      backgroundColor: isActive ? themeColor : '#f4f4f5',
                      border: isActive ? 'none' : '1px solid white',
                    }}
                    onClick={() => {
                      if (hotWord.id === activeHotWord?.id) {
                        return;
                      }
                      setActiveHotWord(hotWord);
                    }}
                  >
                    <span
                      className='text-base font-semibold whitespace-nowrap'
                      style={{
                        color: isActive ? '#fafafa' : '#09090b',
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
              <div className='flex items-center gap-4 py-1'>
                {(() => {
                  // 获取四级标签
                  const level4Tags = (activeHotWord?.children ||
                    []) as Channel[];

                  return level4Tags.map(tag => {
                    const isActive = activeLevel4Tag?.id === tag.id;
                    return (
                      <span
                        key={tag.id}
                        className='relative text-sm font-semibold cursor-pointer'
                        style={{
                          color: isActive ? themeColor : '#09090b',
                          fontFamily: '"PingFang SC"',
                        }}
                        onClick={() => {
                          setActiveLevel4Tag(tag);
                        }}
                      >
                        {tag.display_name}
                        {isActive && (
                          <div
                            className='absolute bottom-0 left-0 right-0 h-0.5 rounded-full translate-y-1'
                            style={{
                              backgroundColor: themeColor,
                            }}
                          />
                        )}
                      </span>
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
                      color: 'rgba(1,7,13,0.8)',
                    }}
                  >
                    {sortTypeLabels[sortType]}
                  </span>
                  <ChevronDown
                    className='w-3 h-3'
                    style={{ color: 'rgba(1,7,13,0.8)' }}
                  />
                </div>
              }
            </div>
          }
        </div>
        {/* 内容区域 */}
        <div className='bg-white  flex flex-col ' style={{ minHeight: '100%' }}>
          {/* 模板瀑布流 */}
          <div className='px-3 pb-20 bg-white '>
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
                  <p className='text-gray-500'>加载中...</p>
                </div>
              </div>
            ) : !templatesLoading &&
              activeLevel4Tag &&
              templates.length === 0 ? (
              <div className='flex items-center justify-center h-full'>
                <div className='text-center text-gray-500'>
                  <p className='text-xl mb-2'>📭</p>
                  <p>暂无模板</p>
                </div>
              </div>
            ) : templates.length > 0 ? (
              <TemplateWaterfall
                key={activeLevel4Tag?.id || 'template-waterfall'}
                templates={templates}
                onTemplateClick={handleTemplateClick}
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
                    color: '#9ca3af',
                    fontFamily: '"PingFang SC"',
                  }}
                >
                  - 已经到底部啦 -
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
          onSortChange={(sort: SortType) => {
            setSortType(sort);
          }}
        />
      </div>
    </TrackingContext.Provider>
  );
}

//数据源说明
//第一层频道选择为template_market_channel_entity的class为二级频道的数据
//第二层频道选择为template_market_channel_entity的class为三级热词的数据
//三级频道会关联template_filter_entity
//模板从template_filter_entity中获取，再关联template_daily_statistics_entity获取数据

//综合评分要关联template_sort_metrics_entity
'use client';

import { cdnApi } from '@/services';
import { trpc } from '@/utils/trpc';
import {
  ArrowDown,
  ArrowUp,
  Download,
  Info,
  Layers,
  Tag,
  User,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ColumnSelector, renderMetricCell } from '../shared/components';
import { RANKING_METRICS } from '../shared/constants';

// 计算上架时间标签（基于上架天数）
const getPublishTimeTags = (
  publishDays: number | null | undefined
): string[] => {
  if (publishDays === null || publishDays === undefined) return [];

  const tags: string[] = [];
  if (publishDays <= 7) {
    tags.push('上架7天内');
  } else if (publishDays <= 14) {
    tags.push('上架14天内');
  } else if (publishDays <= 30) {
    tags.push('上架30天内');
  }

  return tags;
};

// 商城模板排序表格组件
const RankingTable = ({
  visibleMetrics,
  templates,
  isLoading,
}: {
  visibleMetrics: string[];
  templates: any[];
  isLoading: boolean;
}) => {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topScrollBarRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);

  // 处理表头点击
  const handleSort = (key: string) => {
    if (sortKey === key) {
      // 如果点击的是当前排序列，则反转排序方向
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      // 如果点击的是新列，则设置为降序
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  // 监听滚动事件
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateScrollInfo = () => {
      setScrollLeft(container.scrollLeft);
      setScrollWidth(container.scrollWidth);
      setClientWidth(container.clientWidth);
    };

    updateScrollInfo();
    container.addEventListener('scroll', updateScrollInfo);
    window.addEventListener('resize', updateScrollInfo);

    return () => {
      container.removeEventListener('scroll', updateScrollInfo);
      window.removeEventListener('resize', updateScrollInfo);
    };
  }, [templates]);

  // 处理顶部滚动条拖动
  const [isDragging, setIsDragging] = useState(false);

  const handleTopScrollMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const container = scrollContainerRef.current;
    const topBar = topScrollBarRef.current;
    if (!container || !topBar) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = topBar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const scrollRatio = Math.max(0, Math.min(1, clickX / rect.width));
      const maxScroll = container.scrollWidth - container.clientWidth;
      container.scrollLeft = scrollRatio * maxScroll;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleTopScrollClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) return;
    const container = scrollContainerRef.current;
    const topBar = topScrollBarRef.current;
    if (!container || !topBar) return;

    const rect = topBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const scrollRatio = Math.max(0, Math.min(1, clickX / rect.width));
    const maxScroll = container.scrollWidth - container.clientWidth;
    container.scrollLeft = scrollRatio * maxScroll;
  };

  // 将 Tailwind 宽度类转换为像素值
  const tailwindWidthToPx = (width: string): number => {
    const widthMap: Record<string, number> = {
      'w-24': 96, // 6rem
      'w-28': 112, // 7rem
      'w-32': 128, // 8rem
      'w-96': 384, // 24rem
    };
    return widthMap[width] || 128;
  };

  // 列宽调整功能
  const handleResizeStart = (
    e: React.MouseEvent<HTMLDivElement>,
    columnKey: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(columnKey);
    setResizeStartX(e.clientX);
    const currentWidth = columnWidths[columnKey];
    if (currentWidth) {
      setResizeStartWidth(currentWidth);
    } else {
      // 获取默认宽度
      const def = RANKING_METRICS.find(m => m.key === columnKey);
      const defaultWidthClass = def?.width || 'w-32';
      setResizeStartWidth(tailwindWidthToPx(defaultWidthClass));
    }
  };

  useEffect(() => {
    if (!resizingColumn) return;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - resizeStartX;
      const newWidth = Math.max(80, resizeStartWidth + diff); // 最小宽度80px
      setColumnWidths(prev => ({
        ...prev,
        [resizingColumn]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn, resizeStartX, resizeStartWidth]);

  // 获取列宽
  const getColumnWidth = (key: string): string => {
    if (columnWidths[key]) {
      return `${columnWidths[key]}px`;
    }
    const def = RANKING_METRICS.find(m => m.key === key);
    const defaultWidth = def?.width || 'w-32';
    return `${tailwindWidthToPx(defaultWidth)}px`;
  };

  // 排序后的数据
  const sortedTemplates = useMemo(() => {
    if (!sortKey) return templates;

    return [...templates].sort((a, b) => {
      const aValue = a.metrics?.[sortKey] ?? 0;
      const bValue = b.metrics?.[sortKey] ?? 0;

      if (sortDirection === 'desc') {
        return bValue - aValue;
      } else {
        return aValue - bValue;
      }
    });
  }, [templates, sortKey, sortDirection]);

  const scrollbarThumbWidth =
    clientWidth > 0 && scrollWidth > clientWidth
      ? (clientWidth / scrollWidth) * clientWidth
      : 0;
  const scrollbarThumbLeft =
    scrollWidth > clientWidth
      ? (scrollLeft / (scrollWidth - clientWidth)) *
      (clientWidth - scrollbarThumbWidth)
      : 0;
  const showScrollbar = scrollWidth > clientWidth;

  return (
    <>
      <style>{`
        .ranking-table-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .ranking-table-scroll::-webkit-scrollbar {
          display: none;
        }
        .top-scrollbar {
          position: sticky;
          top: 0;
          z-index: 101;
          height: 8px;
          background: #f1f5f9;
          border-radius: 4px 4px 0 0;
          cursor: pointer;
          margin-bottom: -8px;
        }
        .ranking-table thead {
          position: sticky;
          z-index: 100;
        }
        .ranking-table thead.sticky-with-scrollbar {
          top: 8px;
        }
        .ranking-table thead.sticky-without-scrollbar {
          top: 0;
        }
        .ranking-table thead th {
          background: #f8fafc;
        }
        .column-resizer {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          cursor: col-resize;
          user-select: none;
          z-index: 10;
        }
        .column-resizer:hover {
          background: #3b82f6;
        }
        .column-resizer.resizing {
          background: #3b82f6;
        }
        .ranking-table th {
          position: relative;
        }
        .ranking-table th.sticky-first-column {
          position: sticky;
          left: 0;
          z-index: 101;
        }
        .top-scrollbar-thumb {
          height: 100%;
          background: #cbd5e1;
          border-radius: 4px;
          transition: background 0.2s;
          cursor: grab;
          user-select: none;
        }
        .top-scrollbar-thumb:active {
          cursor: grabbing;
          background: #64748b;
        }
        .top-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
      <div className='bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden sticky top-[100px] '>
        {showScrollbar && (
          <div
            ref={topScrollBarRef}
            className='top-scrollbar'
            onClick={handleTopScrollClick}
          >
            <div
              className='top-scrollbar-thumb'
              style={{
                width: `${scrollbarThumbWidth}px`,
                marginLeft: `${scrollbarThumbLeft}px`,
              }}
              onMouseDown={handleTopScrollMouseDown}
            />
          </div>
        )}
        <div
          ref={scrollContainerRef}
          className='overflow-x-auto ranking-table-scroll sticky top-[100px] z-20'
        >
          <table className='w-full text-left text-sm ranking-table'>
            <thead
              className={`bg-slate-50 text-slate-500 font-medium border-b border-slate-200 ${showScrollbar
                  ? 'sticky-with-scrollbar'
                  : 'sticky-without-scrollbar'
                }`}
            >
              <tr>
                <th className='px-6 py-4 w-96 sticky-first-column bg-slate-50'>
                  模板信息 (Rank / Info)
                </th>
                {visibleMetrics.map(key => {
                  const def = RANKING_METRICS.find(m => m.key === key);
                  const isSorted = sortKey === key;
                  const width = getColumnWidth(key);
                  return (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      style={{ width, minWidth: width }}
                      className={`px-4 py-4 text-right whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors select-none ${isSorted ? 'bg-slate-100' : ''
                        }`}
                    >
                      <div className='flex items-center justify-end gap-1.5'>
                        <span>{def?.label}</span>
                        {isSorted ? (
                          sortDirection === 'desc' ? (
                            <ArrowDown size={14} className='text-blue-600' />
                          ) : (
                            <ArrowUp size={14} className='text-blue-600' />
                          )
                        ) : (
                          <div className='w-3.5 h-3.5 opacity-30'>
                            <ArrowDown size={14} />
                          </div>
                        )}
                      </div>
                      <div
                        className={`column-resizer ${resizingColumn === key ? 'resizing' : ''
                          }`}
                        onMouseDown={e => handleResizeStart(e, key)}
                        onClick={e => e.stopPropagation()}
                      />
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-100'>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={visibleMetrics.length + 1}
                    className='px-6 py-8 text-center text-slate-400'
                  >
                    加载中...
                  </td>
                </tr>
              ) : templates.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleMetrics.length + 1}
                    className='px-6 py-8 text-center text-slate-400'
                  >
                    暂无数据
                  </td>
                </tr>
              ) : (
                sortedTemplates.map((item: any) => (
                  <tr
                    key={item.id}
                    className='hover:bg-blue-50/10 transition-colors group cursor-pointer'
                    onClick={() => {
                      if (item.id) {
                        router.push(
                          `/dashboard/manager/data/template/${item.id}`
                        );
                      }
                    }}
                  >
                    <td className='px-6 py-4 sticky left-0 bg-white group-hover:bg-blue-50/10 z-10 border-r border-transparent group-hover:border-slate-100'>
                      <div className='flex gap-4 items-center'>
                        <div
                          className={`flex-shrink-0 w-2 text-center font-bold text-lg italic ${item.rank <= 3
                              ? 'text-yellow-500'
                              : 'text-slate-400'
                            }`}
                        >
                          {item.rank}
                        </div>
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.title}
                            className='w-14 h-14 rounded border border-slate-200 object-contain flex-shrink-0'
                          />
                        )}
                        <div className='min-w-0 flex-1'>
                          <div className='flex items-center gap-1 mb-1 flex-wrap'>
                            <h4
                              className='font-bold text-slate-800 truncate max-w-[180px]'
                              title={item.title}
                            >
                              {item.title || '模板标题'}
                            </h4>
                            {/* 上架时间标签 */}
                            {getPublishTimeTags(item.publish_days).map(
                              (tag: string) => (
                                <span
                                  key={tag}
                                  className='text-[10px] bg-blue-50 text-blue-600 px-1.5 rounded border border-blue-100 whitespace-nowrap'
                                >
                                  {tag}
                                </span>
                              )
                            )}
                            {/* 原有标签 */}
                            {item.tags && item.tags.length > 0 && (
                              <>
                                {item.tags.map((tag: string) => (
                                  <span
                                    key={tag}
                                    className='text-[10px] bg-red-50 text-red-500 px-1.5 rounded border border-red-100 whitespace-nowrap'
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </>
                            )}
                          </div>
                          <p className='text-xs text-slate-400 font-mono flex items-center gap-1.5'>
                            {item.code || 'ID: 0000000000'}{' '}
                            <span className='w-px h-3 bg-slate-300'></span>{' '}
                            <span className='flex items-center gap-0.5 text-slate-500'>
                              <User size={10} /> {item.designer || '设计师'}
                            </span>
                          </p>
                        </div>
                      </div>
                    </td>
                    {visibleMetrics.map(key => {
                      const width = getColumnWidth(key);
                      return (
                        <td
                          key={key}
                          style={{ width, minWidth: width }}
                          className='px-4 py-4 text-right align-middle'
                        >
                          {renderMetricCell(
                            item.metrics?.[key] || 0,
                            RANKING_METRICS.find(m => m.key === key)!
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

const STORAGE_KEY = 'ranking-page-selection';

// 保存选择到 localStorage
const saveSelection = (channelId: number | null, hotWordId: number | null) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ channelId, hotWordId }));
  } catch (error) {
    console.error('保存选择失败:', error);
  }
};

// 从 localStorage 读取选择
const loadSelection = (): {
  channelId: number | null;
  hotWordId: number | null;
} => {
  if (typeof window === 'undefined')
    return { channelId: null, hotWordId: null };
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        channelId: parsed.channelId || null,
        hotWordId: parsed.hotWordId || null,
      };
    }
  } catch (error) {
    console.error('读取选择失败:', error);
  }
  return { channelId: null, hotWordId: null };
};

export default function RankingPage() {
  const searchParams = useSearchParams();
  const typeapp = searchParams.get('typeapp');
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(
    null
  );
  const [selectedHotWordId, setSelectedHotWordId] = useState<number | null>(
    null
  );
  const [timeRange, setTimeRange] = useState<
    'today' | 'yesterday' | '7days' | '14days' | 'history'
  >(() => {
    const fromUrl = searchParams.get('timeRange');
    if (
      fromUrl === 'today' ||
      fromUrl === 'yesterday' ||
      fromUrl === '7days' ||
      fromUrl === '14days' ||
      fromUrl === 'history'
    ) {
      return fromUrl;
    }
    return '14days';
  });
  const [selectedDevice, setSelectedDevice] = useState<
    'all' | 'ios' | 'android' | 'web' | 'wap' | 'other'
  >('all');
  const [rankingVisibleMetrics, setRankingVisibleMetrics] = useState([
    'composite_score',
    'view_uv',
    'click_uv',
    'creation_pv',
    'intercept_uv',
    'order_count',
    'transaction_amount',
    'ctr',
    'view_value',
  ]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [secondaryChannels, setSecondaryChannels] = useState<
    Array<{
      id: number;
      alias: string;
      display_name: string;
      sort_weight: number;
      thumb_path: string | null;
      parent_id: number | null;
    }>
  >([]);
  const [hotWords, setHotWords] = useState<
    Array<{
      id: number;
      alias: string;
      display_name: string;
      sort_weight: number;
      filter: { alias: string } | null;
    }>
  >([]);
  const [floors, setFloors] = useState<
    Array<{
      id: number;
      alias: string;
      display_name: string;
      sort_weight: number;
    }>
  >([]);
  const [selectedFloorId, setSelectedFloorId] = useState<number | null>(null);
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [isLoadingHotWords, setIsLoadingHotWords] = useState(false);
  const [isLoadingFloors, setIsLoadingFloors] = useState(false);
  const [urlHotWordIdProcessed, setUrlHotWordIdProcessed] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // 从 URL 参数读取 hotWordId（仅在首次加载时处理）
  useEffect(() => {
    if (urlHotWordIdProcessed) return;

    const hotWordIdParam = searchParams.get('hotWordId');
    if (hotWordIdParam) {
      const hotWordId = parseInt(hotWordIdParam, 10);
      if (!isNaN(hotWordId)) {
        setUrlHotWordIdProcessed(true);
        // 获取该热词所属的二级频道
        trpc.channel.getChannelByHotWord
          .query({ hotWordId })
          .then(channelId => {
            if (channelId) {
              setSelectedChannelId(channelId);
              setSelectedHotWordId(hotWordId);
              // 保存到 localStorage
              saveSelection(channelId, hotWordId);
            }
          })
          .catch(error => {
            console.error('获取热词所属频道失败:', error);
            setUrlHotWordIdProcessed(true);
          });
      } else {
        setUrlHotWordIdProcessed(true);
      }
    } else {
      setUrlHotWordIdProcessed(true);
    }
  }, [searchParams, urlHotWordIdProcessed]);

  // 获取二级频道列表
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        setIsLoadingChannels(true);
        // 获取一级栏目及其子级
        const level1Channels = await trpc.channel.getChannels.query({
          env: 'production',
        });

        // 根据 typeapp 过滤一级栏目
        let filteredLevel1Channels = level1Channels || [];
        if (typeapp === 'jiantie') {
          filteredLevel1Channels = level1Channels.filter(
            (ch: any) => ch.display_name === '个人'
          );
        } else if (typeapp === 'maka') {
          filteredLevel1Channels = level1Channels.filter(
            (ch: any) => ch.display_name === '商业'
          );
        }

        // 提取所有符合条件的二级频道
        const allSecondaryChannels = filteredLevel1Channels.flatMap(
          (level1: any) => {
            return (level1.children || []).map((child: any) => ({
              id: child.id,
              alias: child.alias,
              display_name: child.display_name,
              sort_weight: child.sort_weight,
              thumb_path: child.thumb_path,
              parent_id: child.parent_id,
            }));
          }
        );

        setSecondaryChannels(allSecondaryChannels);
        // 如果没有从 URL 参数设置 channelId，尝试从 localStorage 恢复
        if (allSecondaryChannels && allSecondaryChannels.length > 0) {
          const saved = loadSelection();
          if (
            saved.channelId &&
            allSecondaryChannels.some((c: any) => c.id === saved.channelId)
          ) {
            setSelectedChannelId(saved.channelId);
          } else {
            setSelectedChannelId(prev => prev || allSecondaryChannels[0].id);
          }
        }
      } catch (error) {
        console.error('获取二级频道失败:', error);
        setSecondaryChannels([]);
      } finally {
        setIsLoadingChannels(false);
      }
    };

    fetchChannels();
  }, [typeapp]);

  // 获取三级热词列表
  useEffect(() => {
    if (!selectedChannelId) {
      setHotWords([]);
      return;
    }

    const fetchHotWords = async () => {
      try {
        setIsLoadingHotWords(true);
        const data = await trpc.channel.getHotWordsByChannel.query({
          channelId: selectedChannelId,
          locale: 'zh-CN',
        });
        setHotWords(data || []);
        setFloors([]);
        setSelectedFloorId(null);
        // 检查 URL 参数中是否有指定的 hotWordId
        const hotWordIdParam = searchParams.get('hotWordId');
        if (hotWordIdParam) {
          const hotWordId = parseInt(hotWordIdParam, 10);
          if (!isNaN(hotWordId) && data?.some(h => h.id === hotWordId)) {
            // 如果 URL 中指定的热词在当前频道的热词列表中，则选择它
            setSelectedHotWordId(hotWordId);
          } else if (data && data.length > 0) {
            // 否则默认选择第一个热词
            setSelectedHotWordId(data[0].id);
          } else {
            setSelectedHotWordId(null);
          }
        } else {
          // 没有 URL 参数时，尝试从 localStorage 恢复
          const saved = loadSelection();
          if (
            saved.hotWordId &&
            data?.some(h => h.id === saved.hotWordId) &&
            saved.channelId === selectedChannelId
          ) {
            // 如果保存的热词在当前频道的热词列表中，且频道匹配，则选择它
            setSelectedHotWordId(saved.hotWordId);
          } else if (data && data.length > 0) {
            // 否则默认选择第一个热词（二级切换时总是选中第一个三级）
            setSelectedHotWordId(data[0].id);
          } else {
            setSelectedHotWordId(null);
          }
        }
      } catch (error) {
        console.error('获取三级热词失败:', error);
        setHotWords([]);
        setSelectedHotWordId(null);
      } finally {
        setIsLoadingHotWords(false);
      }
    };

    fetchHotWords();
  }, [selectedChannelId, searchParams]);

  // 获取四级标签楼层列表
  useEffect(() => {
    if (!selectedHotWordId) {
      setFloors([]);
      setSelectedFloorId(null);
      return;
    }

    const fetchFloors = async () => {
      try {
        setIsLoadingFloors(true);
        const data = await trpc.channel.getFloorsByHotWord.query({
          hotWordId: selectedHotWordId,
          locale: 'zh-CN',
        });
        setFloors(data || []);
        if (data && data.length > 0) {
          // 检查 URL 参数中是否有指定的 floorId
          const floorIdParam = searchParams.get('floorId');
          if (floorIdParam) {
            const floorId = parseInt(floorIdParam, 10);
            if (!isNaN(floorId) && data.some(f => f.id === floorId)) {
              // 如果 URL 中指定的楼层在列表中，则选择它
              setSelectedFloorId(floorId);
            } else {
              // 否则默认选择第一个四级
              setSelectedFloorId(data[0].id);
            }
          } else {
            // 没有 URL 参数时，默认选择第一个四级
            setSelectedFloorId(data[0].id);
          }
        } else {
          setSelectedFloorId(null);
        }
      } catch (error) {
        console.error('获取四级标签楼层失败:', error);
        setFloors([]);
        setSelectedFloorId(null);
      } finally {
        setIsLoadingFloors(false);
      }
    };

    fetchFloors();
  }, [selectedHotWordId, searchParams]);

  // 保存选择到 localStorage
  useEffect(() => {
    if (selectedChannelId && selectedHotWordId) {
      saveSelection(selectedChannelId, selectedHotWordId);
    }
  }, [selectedChannelId, selectedHotWordId]);

  // 获取排名数据
  useEffect(() => {
    if (!selectedFloorId) {
      setTemplates([]);
      setIsLoading(false);
      return;
    }

    const fetchRanking = async () => {
      try {
        setIsLoading(true);
        const data = await trpc.channel.getTemplateRanking.query({
          channelId: selectedFloorId,
          device: selectedDevice,
          timeRange: timeRange,
          limit: 100,
        });

        // 计算环节指标
        const templatesWithCalculatedMetrics = (data || []).map((item: any) => {
          const metrics = item.metrics || {};
          const {
            view_pv = 0,
            click_pv = 0,
            creation_pv = 0,
            order_count = 0,
            transaction_amount = 0,
          } = metrics;

          // 计算转化率指标（百分比，保留到千分位）
          const roundTo3Decimals = (num: number) =>
            Math.round(num * 1000) / 1000;
          const ctr =
            view_pv > 0 ? roundTo3Decimals((click_pv / view_pv) * 100) : 0;
          const viewCreationRate =
            view_pv > 0 ? roundTo3Decimals((creation_pv / view_pv) * 100) : 0;
          const clickCreationRate =
            click_pv > 0 ? roundTo3Decimals((creation_pv / click_pv) * 100) : 0;
          const creationOrderRate =
            creation_pv > 0
              ? roundTo3Decimals((order_count / creation_pv) * 100)
              : 0;
          const viewOrderRate =
            view_pv > 0 ? roundTo3Decimals((order_count / view_pv) * 100) : 0;

          // 计算价值指标（金额）
          const viewValue = view_pv > 0 ? transaction_amount / view_pv : 0;
          const clickValue = click_pv > 0 ? transaction_amount / click_pv : 0;
          const creationValue =
            creation_pv > 0 ? transaction_amount / creation_pv : 0;

          return {
            ...item,
            metrics: {
              ...metrics,
              ctr,
              view_creation_rate: viewCreationRate,
              click_creation_rate: clickCreationRate,
              creation_order_rate: creationOrderRate,
              view_order_rate: viewOrderRate,
              view_value: viewValue,
              click_value: clickValue,
              creation_value: creationValue,
            },
          };
        });

        setTemplates(templatesWithCalculatedMetrics);
      } catch (error) {
        console.error('获取排名数据失败:', error);
        setTemplates([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRanking();
  }, [selectedFloorId, timeRange, selectedDevice]);

  // 获取当前选中的频道和热词名称
  const selectedChannel = secondaryChannels.find(
    c => c.id === selectedChannelId
  );
  const selectedHotWord = hotWords.find(h => h.id === selectedHotWordId);

  // 计算指标的函数（复用逻辑）
  const calculateMetrics = (item: any) => {
    const metrics = item.metrics || {};
    const {
      view_pv = 0,
      click_pv = 0,
      creation_pv = 0,
      order_count = 0,
      transaction_amount = 0,
    } = metrics;

    // 计算转化率指标（百分比，保留到千分位）
    const roundTo3Decimals = (num: number) => Math.round(num * 1000) / 1000;
    const ctr = view_pv > 0 ? roundTo3Decimals((click_pv / view_pv) * 100) : 0;
    const viewCreationRate =
      view_pv > 0 ? roundTo3Decimals((creation_pv / view_pv) * 100) : 0;
    const clickCreationRate =
      click_pv > 0 ? roundTo3Decimals((creation_pv / click_pv) * 100) : 0;
    const creationOrderRate =
      creation_pv > 0 ? roundTo3Decimals((order_count / creation_pv) * 100) : 0;
    const viewOrderRate =
      view_pv > 0 ? roundTo3Decimals((order_count / view_pv) * 100) : 0;

    // 计算价值指标（金额）
    const viewValue = view_pv > 0 ? transaction_amount / view_pv : 0;
    const clickValue = click_pv > 0 ? transaction_amount / click_pv : 0;
    const creationValue =
      creation_pv > 0 ? transaction_amount / creation_pv : 0;

    return {
      ...item,
      metrics: {
        ...metrics,
        ctr,
        view_creation_rate: viewCreationRate,
        click_creation_rate: clickCreationRate,
        creation_order_rate: creationOrderRate,
        view_order_rate: viewOrderRate,
        view_value: viewValue,
        click_value: clickValue,
        creation_value: creationValue,
      },
    };
  };

  // 导出所有频道和热词的CSV功能
  const handleExportAllCSV = async () => {
    if (secondaryChannels.length === 0) {
      return;
    }

    setIsExporting(true);
    try {
      const allData: any[] = [];

      // 遍历所有二级频道
      for (const channel of secondaryChannels) {
        try {
          // 获取该频道的所有热词
          const hotWordsData = await trpc.channel.getHotWordsByChannel.query({
            channelId: channel.id,
            locale: 'zh-CN',
          });

          if (!hotWordsData || hotWordsData.length === 0) {
            continue;
          }

          // 遍历该频道的所有热词
          for (const hotWord of hotWordsData) {
            try {
              // 获取该热词下的所有四级标签
              const floorsData = await trpc.channel.getFloorsByHotWord.query({
                hotWordId: hotWord.id,
                locale: 'zh-CN',
              });

              if (!floorsData || floorsData.length === 0) {
                continue;
              }

              // 遍历该热词下的所有四级标签
              for (const floor of floorsData) {
                try {
                  // 获取该四级标签的排名数据
                  const rankingData =
                    await trpc.channel.getTemplateRanking.query({
                      channelId: floor.id,
                      device: selectedDevice,
                      timeRange: timeRange,
                      limit: 100,
                    });

                  if (!rankingData || rankingData.length === 0) {
                    continue;
                  }

                  // 计算指标并添加频道、热词和四级标签信息
                  const templatesWithInfo = (rankingData || []).map(
                    (item: any) => {
                      const calculated = calculateMetrics(item);
                      return {
                        ...calculated,
                        channelName: channel.display_name,
                        channelId: channel.id,
                        hotWordName: hotWord.display_name,
                        hotWordId: hotWord.id,
                        floorName: floor.display_name,
                        floorId: floor.id,
                      };
                    }
                  );

                  allData.push(...templatesWithInfo);
                } catch (error) {
                  console.error(
                    `获取四级标签 ${floor.display_name} 的排名数据失败:`,
                    error
                  );
                }
              }
            } catch (error) {
              console.error(
                `获取热词 ${hotWord.display_name} 的四级标签失败:`,
                error
              );
            }
          }
        } catch (error) {
          console.error(`获取频道 ${channel.display_name} 的热词失败:`, error);
        }
      }

      if (allData.length === 0) {
        alert('没有可导出的数据');
        return;
      }

      // 构建表头
      const headers = [
        '频道',
        '热词',
        '四级标签',
        '排名',
        '模板标题',
        '模板ID',
        '设计师',
        '标签',
        ...rankingVisibleMetrics.map((key: string) => {
          const def = RANKING_METRICS.find(m => m.key === key);
          return def?.label || key;
        }),
      ];

      // 构建数据行（按频道、热词、四级标签、排名排序）
      const sortedData = [...allData].sort((a, b) => {
        // 先按频道ID排序
        if (a.channelId !== b.channelId) {
          return (a.channelId || 0) - (b.channelId || 0);
        }
        // 再按热词ID排序
        if (a.hotWordId !== b.hotWordId) {
          return (a.hotWordId || 0) - (b.hotWordId || 0);
        }
        // 再按四级标签ID排序
        if ((a.floorId || 0) !== (b.floorId || 0)) {
          return (a.floorId || 0) - (b.floorId || 0);
        }
        // 最后按排名排序
        return (a.rank || 0) - (b.rank || 0);
      });

      const rows = sortedData.map((item: any) => {
        // 合并上架时间标签和原有标签
        const publishTimeTags = getPublishTimeTags(item.publish_days);
        const allTags = [...publishTimeTags, ...(item.tags || [])];
        const tags = allTags.length > 0 ? allTags.join(';') : '';
        const row = [
          item.channelName || '',
          item.hotWordName || '',
          item.floorName || '',
          item.rank || '',
          item.title || '',
          item.code || '',
          item.designer || '',
          tags,
          ...rankingVisibleMetrics.map((key: string) => {
            const value = item.metrics?.[key] ?? 0;
            const def = RANKING_METRICS.find(m => m.key === key);

            // 根据格式类型格式化值
            if (def?.format === 'percent') {
              return `${value}%`;
            } else if (def?.format === 'currency') {
              return value.toFixed(2);
            } else if (def?.format === 'score') {
              return value.toFixed(2);
            } else {
              return value.toString();
            }
          }),
        ];
        return row;
      });

      // 转义CSV字段（处理包含逗号、引号或换行符的值）
      const escapeCSV = (value: string | number) => {
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      // 构建CSV内容
      const csvContent = [
        headers.map(escapeCSV).join(','),
        ...rows.map((row: any[]) => row.map(escapeCSV).join(',')),
      ].join('\n');

      // 添加BOM以支持中文
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // 生成文件名
      const timeRangeText =
        timeRange === 'today'
          ? '今天'
          : timeRange === 'yesterday'
            ? '昨天'
            : timeRange === '7days'
              ? '近7天'
              : timeRange === '14days'
                ? '近14天'
                : '历史全部';
      const deviceText =
        selectedDevice === 'all'
          ? '全部'
          : selectedDevice === 'ios'
            ? 'iOS'
            : selectedDevice === 'android'
              ? '安卓'
              : selectedDevice === 'web'
                ? 'Web'
                : selectedDevice === 'wap'
                  ? 'WAP'
                  : '其他';
      const fileName = `模板排名_全部频道_${deviceText}_${timeRangeText}_${new Date().toISOString().split('T')[0]}.csv`;

      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请稍后重试');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className=' animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6'>
      {/* Sticky Header */}
      <div className='bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden  top-20 z-[9999]'>
        <div className='flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-4 py-2'>
          <div className='flex py-1 gap-2 overflow-x-auto no-scrollbar'>
            {isLoadingChannels ? (
              <div className='px-4 py-2 text-sm text-slate-400'>加载中...</div>
            ) : secondaryChannels.length === 0 ? (
              <div className='px-4 py-2 text-sm text-slate-400'>
                暂无二级频道数据
              </div>
            ) : (
              [...secondaryChannels]
                .sort((a, b) => {
                  // 按照 parent_id 排序，null 值排在最后
                  if (a.parent_id === null && b.parent_id === null) return 0;
                  if (a.parent_id === null) return 1;
                  if (b.parent_id === null) return -1;
                  return a.parent_id - b.parent_id;
                })
                .map(channel => (
                  <button
                    key={channel.id}
                    onClick={() => setSelectedChannelId(channel.id)}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all min-w-[64px] ${selectedChannelId === channel.id
                        ? 'bg-white shadow-sm text-blue-600 ring-1 ring-slate-200'
                        : 'text-slate-500 hover:bg-white/60'
                      }`}
                  >
                    {channel.thumb_path ? (
                      <img
                        src={cdnApi(channel.thumb_path, {
                          resizeWidth: 36,
                          resizeHeight: 36,
                          format: 'webp',
                        })}
                        alt={channel.display_name}
                        className='w-9 h-9 object-cover rounded'
                      />
                    ) : (
                      <div
                        className={
                          selectedChannelId === channel.id
                            ? 'text-blue-600'
                            : 'text-slate-400'
                        }
                      >
                        <Tag size={18} />
                      </div>
                    )}
                    <span className='text-xs font-medium mt-1'>
                      {channel.display_name}
                    </span>
                  </button>
                ))
            )}
          </div>
        </div>
        <div className='px-4 py-3 bg-white flex flex-col gap-3'>
          {/* 当前展示信息 */}
          <div className='hidden sm:block text-xs text-slate-400'>
            当前展示：
            {selectedChannel?.display_name || '未选择'} /{' '}
            {selectedHotWord?.display_name || '未选择'} /
            {floors.length > 0
              ? floors.find(f => f.id === selectedFloorId)?.display_name ||
              '未选择楼层'
              : '无楼层'}
          </div>

          {/* 三级热词筛选 */}
          <div className='flex gap-2 flex-wrap items-center'>
            {isLoadingHotWords ? (
              <div className='px-3 py-1 text-xs text-slate-400'>加载中...</div>
            ) : hotWords.length === 0 ? (
              <div className='px-3 py-1 text-xs text-slate-400'>
                暂无三级热词数据
              </div>
            ) : (
              hotWords.map(hotWord => (
                <button
                  key={hotWord.id}
                  onClick={() => setSelectedHotWordId(hotWord.id)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${selectedHotWordId === hotWord.id
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  {hotWord.display_name}
                </button>
              ))
            )}
          </div>

          {/* 四级标签楼层筛选 */}
          <div className='flex flex-wrap gap-1 items-center'>
            {isLoadingFloors ? (
              <span className='px-2 py-0.5 rounded bg-slate-100 text-[11px] text-slate-500'>
                楼层加载中...
              </span>
            ) : floors.length === 0 ? (
              <span className='px-2 py-0.5 rounded bg-slate-50 text-[11px] text-slate-400'>
                暂无四级标签楼层
              </span>
            ) : (
              floors.map(floor => (
                <button
                  key={floor.id}
                  onClick={() => setSelectedFloorId(floor.id)}
                  className={`px-2 py-0.5 text-[11px] rounded-full border transition-colors ${selectedFloorId === floor.id
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  {floor.display_name}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className=''>
        <div className='flex items-center justify-between mb-4'>
          <div className='flex items-center gap-3'>
            <h2 className='font-bold text-slate-700 flex items-center gap-2'>
              <Layers size={18} /> 商城模板列表
            </h2>
            <div className='group relative flex items-center gap-1 text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded cursor-help'>
              <Info size={12} /> 统计范围：
              {timeRange === 'today'
                ? '今天'
                : timeRange === 'yesterday'
                  ? '昨天'
                  : timeRange === '7days'
                    ? '近7天'
                    : timeRange === '14days'
                      ? '近14天'
                      : '历史全部'}
              <div className='absolute left-0 bottom-full mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20'>
                {timeRange === 'today'
                  ? '数据每日更新，统计今天的累计数据。实时指标除外。'
                  : timeRange === 'yesterday'
                    ? '数据每日更新，统计昨天的累计数据。实时指标除外。'
                    : timeRange === '7days'
                      ? '数据每日更新，统计过去近7天的累计数据。实时指标除外。'
                      : timeRange === '14days'
                        ? '数据每日更新，统计过去近14天的累计数据。实时指标除外。'
                        : '数据每日更新，统计历史全部累计数据。实时指标除外。'}
              </div>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            {/* 设备筛选器 */}
            <div className='flex gap-1 border border-slate-200 rounded-lg p-1 bg-white'>
              <button
                onClick={() => setSelectedDevice('all')}
                className={`px-3 py-1 text-xs rounded transition-colors ${selectedDevice === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-transparent text-slate-600 hover:bg-slate-100'
                  }`}
              >
                全部
              </button>
              <button
                onClick={() => setSelectedDevice('ios')}
                className={`px-3 py-1 text-xs rounded transition-colors ${selectedDevice === 'ios'
                    ? 'bg-blue-600 text-white'
                    : 'bg-transparent text-slate-600 hover:bg-slate-100'
                  }`}
              >
                iOS
              </button>
              <button
                onClick={() => setSelectedDevice('android')}
                className={`px-3 py-1 text-xs rounded transition-colors ${selectedDevice === 'android'
                    ? 'bg-blue-600 text-white'
                    : 'bg-transparent text-slate-600 hover:bg-slate-100'
                  }`}
              >
                安卓
              </button>
              <button
                onClick={() => setSelectedDevice('web')}
                className={`px-3 py-1 text-xs rounded transition-colors ${selectedDevice === 'web'
                    ? 'bg-blue-600 text-white'
                    : 'bg-transparent text-slate-600 hover:bg-slate-100'
                  }`}
              >
                Web
              </button>
              <button
                onClick={() => setSelectedDevice('wap')}
                className={`px-3 py-1 text-xs rounded transition-colors ${selectedDevice === 'wap'
                    ? 'bg-blue-600 text-white'
                    : 'bg-transparent text-slate-600 hover:bg-slate-100'
                  }`}
              >
                WAP
              </button>
            </div>
            {/* 时间范围选择器 */}
            <div className='flex gap-1 border border-slate-200 rounded-lg p-1 bg-white'>
              <button
                onClick={() => setTimeRange('today')}
                className={`px-3 py-1 text-xs rounded transition-colors ${timeRange === 'today'
                    ? 'bg-blue-600 text-white'
                    : 'bg-transparent text-slate-600 hover:bg-slate-100'
                  }`}
              >
                今天
              </button>
              <button
                onClick={() => setTimeRange('yesterday')}
                className={`px-3 py-1 text-xs rounded transition-colors ${timeRange === 'yesterday'
                    ? 'bg-blue-600 text-white'
                    : 'bg-transparent text-slate-600 hover:bg-slate-100'
                  }`}
              >
                昨天
              </button>
              <button
                onClick={() => setTimeRange('7days')}
                className={`px-3 py-1 text-xs rounded transition-colors ${timeRange === '7days'
                    ? 'bg-blue-600 text-white'
                    : 'bg-transparent text-slate-600 hover:bg-slate-100'
                  }`}
              >
                近7天
              </button>
              <button
                onClick={() => setTimeRange('14days')}
                className={`px-3 py-1 text-xs rounded transition-colors ${timeRange === '14days'
                    ? 'bg-blue-600 text-white'
                    : 'bg-transparent text-slate-600 hover:bg-slate-100'
                  }`}
              >
                14天
              </button>
              {/* <button
                onClick={() => setTimeRange('history')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  timeRange === 'history'
                    ? 'bg-blue-600 text-white'
                    : 'bg-transparent text-slate-600 hover:bg-slate-100'
                }`}
              >
                历史
              </button> */}
            </div>
            <button
              onClick={handleExportAllCSV}
              disabled={
                secondaryChannels.length === 0 ||
                isLoadingChannels ||
                isExporting
              }
              className='flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <Download size={14} />
              {isExporting ? '导出中...' : '导出全部'}
            </button>
            <ColumnSelector
              definitions={RANKING_METRICS}
              visibleColumns={rankingVisibleMetrics}
              onChange={setRankingVisibleMetrics}
              label='排序指标配置'
            />
          </div>
        </div>
        <RankingTable
          visibleMetrics={rankingVisibleMetrics}
          templates={templates}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

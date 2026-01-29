import { useTracking } from '@/components/TrackingContext';
import { useStore } from '@/store';
import { Icon } from '@workspace/ui/components/Icon';
import { Loading } from '@workspace/ui/components/loading';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { mkWebStoreLogger } from '../../../../services/logger';
import TemplateDetail from '../../template';
import { getTemplatesByFilterId } from '../api/channel';
import HotwordMetaTab, { HotWord } from './HotwordMetaTab';
import TemplateCard, { TemplateCardData } from './TemplateCard';

interface Props {
  floorId: number;
  hotword: HotWord;
  site?: any;
  padding?: number;
  color: string;
  onTemplateClick?: (template: TemplateCardData) => void;
}

const TemplateFlatFloor = (props: Props) => {
  const { hotword, floorId, site, padding = 12, onTemplateClick } = props;
  const store = useStore();
  const [filterId, setFilterId] = useState(hotword.hot_word_meta[0].filter_id);
  const [templates, setTemplates] = useState<TemplateCardData[]>([]);
  const [columnWidth, setColumnWidth] = useState(117);
  const [loading, setLoading] = useState(true);
  const isMobile = store.environment.isMobile;

  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  const PAGE_SIZE = isMobile ? 6 : 12;
  const trackMeta = useTracking();

  // 计算卡片宽度
  useEffect(() => {
    const calculateColumnWidth = () => {
      if (!containerRef.current) return;

      const containerWidth = containerRef.current.clientWidth;
      if (isMobile) {
        // 移动端：3列布局
        const gap = 8; // gap-2 = 8px
        const totalGap = gap * 2; // 2个间隙
        setColumnWidth(Math.floor((containerWidth - totalGap) / 3));
      } else {
        // desktop：横向滚动，固定宽度
        setColumnWidth(180);
      }
    };

    calculateColumnWidth();

    const resizeObserver = new ResizeObserver(() => {
      calculateColumnWidth();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', calculateColumnWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', calculateColumnWidth);
    };
  }, [isMobile, padding]);

  // 检查是否可以滚动
  const checkScroll = useCallback(() => {
    if (!scrollRef.current || isMobile) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    // 检查是否可以向左滚动（scrollLeft > 0）
    setCanScrollLeft(scrollLeft > 1);
    // 检查是否可以向右滚动（未滚动到底部）
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  }, [isMobile]);

  // 监听滚动事件
  useEffect(() => {
    if (!scrollRef.current || isMobile) return;

    const scrollElement = scrollRef.current;
    checkScroll();

    scrollElement.addEventListener('scroll', checkScroll);
    // 监听窗口大小变化
    window.addEventListener('resize', checkScroll);

    return () => {
      scrollElement.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll, isMobile, templates]);

  // 向左滚动
  const scrollLeft = () => {
    if (!scrollRef.current) return;
    // 3个卡片宽度 + 2个gap (gap-2 = 8px)
    const scrollAmount = columnWidth * 3 + 8 * 2;
    scrollRef.current.scrollBy({
      left: -scrollAmount,
      behavior: 'smooth',
    });
  };

  // 向右滚动
  const scrollRight = () => {
    if (!scrollRef.current) return;
    // 3个卡片宽度 + 2个gap (gap-2 = 8px)
    const scrollAmount = columnWidth * 3 + 8 * 2;
    scrollRef.current.scrollBy({
      left: scrollAmount,
      behavior: 'smooth',
    });
  };

  /**
   * 热词楼层模版
   */
  const getTemplates = useCallback(async () => {
    setLoading(true);

    const res = await getTemplatesByFilterId(floorId, filterId, {
      p: 1,
      n: PAGE_SIZE,
      with_top_template: 1,
    });

    if (res?.data?.rows) {
      const templateList = res.data.rows.filter(
        (item: TemplateCardData) => item.template_id
      );
      setTemplates(templateList);
      setLoading(false);
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          left: 0,
        });
      }
    }
  }, [floorId, filterId, PAGE_SIZE]);

  useEffect(() => {
    getTemplates();
  }, [filterId]);

  const onChangeFilterId = (id: number) => {
    setFilterId(id);
  };

  const toTopic = (item: HotWord, word: string) => {
    const url = `/maka-v2/channel/topic?parent_page_type=${site?.click_content}&ref_page_id=${
      item.hot_word_tag
    }&hotword_floor_word_btn=${word}&id=${item.id}`;
    store.push(url);
  };

  const meta = hotword.hot_word_meta.find(item => item.filter_id === filterId);

  return (
    <>
      <div
        className='bg-white rounded-t-xl pb-2'
        id={`gallery_floor_${hotword.id}`}
        style={{
          paddingLeft: `${padding}px`,
          paddingRight: `${padding}px`,
          paddingTop: '12px',
        }}
        ref={containerRef}
      >
        {/* 标题栏 */}
        <div className='flex items-center justify-between mb-1.5'>
          <div
            className='font-semibold text-base leading-6 text-left'
            style={{
              fontFamily: 'PingFang SC',
              color: 'rgba(0, 0, 0, 0.88)',
            }}
          >
            {hotword.hot_word_tag_title || hotword.hot_word_tag}
          </div>

          <div
            className='flex items-center justify-center cursor-pointer'
            style={{ color: 'var(--theme-color)' }}
            onClick={() => toTopic(hotword, meta?.hot_word || '')}
          >
            <span className='text-sm font-semibold leading-5'>查看更多</span>
            <Icon name='right-bold' size={20} />
          </div>
        </div>

        {/* 热词标签 */}
        {hotword.hot_word_meta?.length > 1 && (
          <HotwordMetaTab
            hotWord={hotword}
            filterId={filterId}
            onChangeFilterId={onChangeFilterId}
            track={site}
            style={{
              paddingTop: 0,
            }}
          />
        )}

        {/* 模板列表 */}
        <div className='relative min-h-8 mt-3'>
          {isMobile ? (
            // 移动端：3列 grid 布局
            <div className='grid grid-cols-3 gap-2'>
              {templates.map(item => (
                <div key={item.template_id} className='flex-shrink-0'>
                  <TemplateCard
                    onClick={() => {
                      console.log('item', item);
                      setSelectedTemplateId(item.template_id);
                      if (onTemplateClick) {
                        onTemplateClick(item);
                      }
                    }}
                    objectFit={
                      item.height > templates[0].width / 2 ? 'contain' : 'cover'
                    }
                    template={{
                      ...item,
                      width: templates[0].width,
                      height: Math.max(
                        templates[0].height,
                        templates[0].width / 2
                      ),
                    }}
                    columnWidth={columnWidth}
                  />
                </div>
              ))}
            </div>
          ) : (
            // desktop：一行横向滚动
            <div className='relative'>
              <div
                ref={scrollRef}
                className='flex items-center gap-2 overflow-x-auto overflow-y-hidden px-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'
              >
                {templates.map(item => (
                  <div key={item.template_id} className='flex-shrink-0'>
                    <TemplateCard
                      onClick={() => {
                        mkWebStoreLogger.track_click({
                          ...trackMeta,
                          object_type: 'old_template_item',
                          object_id: item.template_id,
                        });
                        setSelectedTemplateId(item.template_id);
                        if (onTemplateClick) {
                          onTemplateClick(item);
                        }
                      }}
                      objectFit={
                        item.height > templates[0].width / 2
                          ? 'contain'
                          : 'cover'
                      }
                      template={{
                        ...item,
                        width: templates[0].width,
                        height: Math.max(
                          templates[0].height,
                          templates[0].width / 2
                        ),
                      }}
                      columnWidth={columnWidth}
                    />
                  </div>
                ))}
              </div>
              {/* 向左滚动按钮 */}
              {canScrollLeft && (
                <button
                  onClick={scrollLeft}
                  className='absolute left-2 top-1/2 -translate-y-1/2 z-1 flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-md border border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-colors'
                  aria-label='向左滚动'
                >
                  <ChevronLeft className='w-5 h-5 text-gray-600' />
                </button>
              )}
              {/* 向右滚动按钮 */}
              {canScrollRight && (
                <button
                  onClick={scrollRight}
                  className='absolute right-2 top-1/2 -translate-y-1/2 z-1 flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-md border border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-colors'
                  aria-label='向右滚动'
                >
                  <ChevronRight className='w-5 h-5 text-gray-600' />
                </button>
              )}
            </div>
          )}

          {loading && (
            <div className='absolute top-0 left-0 right-0 bottom-0 bg-white/80 p-4 flex items-start justify-center'>
              <Loading />
            </div>
          )}
        </div>
      </div>

      <ResponsiveDialog
        isOpen={!!selectedTemplateId}
        onOpenChange={nextOpen => {
          if (!nextOpen) {
            setSelectedTemplateId('');
          }
        }}
        title='预览'
        contentProps={{
          className: 'max-h-[90vh] md:w-[900px] max-w-full',
        }}
      >
        <TemplateDetail
          id={selectedTemplateId}
          hideHeader
          onClose={() => setSelectedTemplateId('')}
        />
      </ResponsiveDialog>
    </>
  );
};

export default TemplateFlatFloor;

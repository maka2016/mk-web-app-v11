import { LazyImage } from '@/components/LazyImage';
import { cdnApi } from '@/services';
import { mkWebStoreLogger } from '@/services/logger';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTracking } from '../../../../components/TrackingContext';
import { TemplatePreview } from './TemplatePreview';

interface CoverV3 {
  url: string;
  width: number;
  height: number;
}

export interface TemplateItem2026 {
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
// 模板瀑布流组件
interface TemplateWaterfallProps {
  templates: TemplateItem2026[];
  onTemplateClick?: (template: TemplateItem2026) => void;
}

export const TemplateWaterfall = ({
  templates,
  onTemplateClick,
}: TemplateWaterfallProps) => {
  const [cardWidth, setCardWidth] = useState(0);
  const [columnCount, setColumnCount] = useState(3);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );
  const trackMeta = useTracking();
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
          // 桌面端：根据容器宽度动态计算5-8列
          // md(768px+): 5列, lg(1024px+): 6列, xl(1280px+): 8列
          if (containerWidth < 1024) {
            cols = 5;
          } else if (containerWidth < 1280) {
            cols = 6;
          } else {
            cols = 8;
          }
        }

        setColumnCount(cols);

        // 计算卡片宽度
        // 移动端：gap-2 = 8px * 2 = 16px
        // 桌面端：gap-4 = 16px * 2 = 32px（更大的间隙方便查看）
        const gap = isMobile ? 0 : 0; // gap-2 (移动端) 或 gap-4 (桌面端)
        const padding = 24; // px-3 = 12px * 2 = 24px
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
    const getCardHeight = (template: TemplateItem2026) => {
      if (!template.coverV3) {
        // 如果没有 coverV3，使用默认宽高比 9:16
        return (cardWidth * 16) / 9;
      }

      const { width, height } = template.coverV3;

      return (cardWidth * height) / width;
    };

    // 初始化列数组
    const newColumns: Array<Array<TemplateItem2026>> = Array(columnCount)
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
  const getCardHeight = (template: TemplateItem2026) => {
    if (!cardWidth) return 0;

    if (!template.coverV3) {
      // 如果没有 coverV3，使用默认宽高比 9:16
      return (cardWidth * 16) / 9;
    }

    const { width, height } = template.coverV3;

    //临时
    if (height > 1400) {
      return (cardWidth * 20) / 9;
    }

    return (cardWidth * height) / width;
  };

  return (
    <>
      <div ref={containerRef} className='flex gap-2 md:gap-4'>
        {columns.map((column, columnIndex) => (
          <div
            key={columnIndex}
            className='flex-1 flex flex-col gap-2 md:gap-3'
          >
            {column.map(template => {
              const cardHeight = getCardHeight(template);
              const coverUrltemp =
                template.coverV3?.url || '';
              const coverUrl = cdnApi(coverUrltemp, {
                resizeWidth: cardWidth * 3,
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
                  onClick={() => {
                    mkWebStoreLogger.track_click({
                      object_type: 'template_item',
                      object_id: template.id,
                      ...trackMeta,
                    });
                    if (onTemplateClick) {
                      setSelectedTemplateId(template.id);
                      setShowTemplateDialog(true);
                    }
                  }}
                >
                  {coverUrl ? (
                    <LazyImage
                      src={coverUrl}
                      coverSrc={previewCoverUrl}
                      alt={template.title || template.name || ''}
                      className='w-full h-full relative'
                      style={{ height: '100%' }}
                      edition='business'
                      templateId={template.id}
                      onLoad={() => {
                        mkWebStoreLogger.track_show({
                          object_type: 'template_item',
                          object_id: template.id,
                        });
                      }}
                    />
                  ) : (
                    <div
                      className='w-full h-full flex items-center justify-center'
                      style={{ backgroundColor: '#f4f4f5' }}
                    >
                      <span className='text-gray-400 text-xs'>暂无封面</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {/* 模版详情弹窗 */}
      <ResponsiveDialog
        isOpen={showTemplateDialog}
        onOpenChange={setShowTemplateDialog}
        title='预览'
        contentProps={{
          className: 'h-[90vh] p-0 md:w-[900px] max-w-full',
        }}
      >
        <TemplatePreview
          selectedTemplate={templates.find(
            template => template.id === selectedTemplateId
          )}
          onSuccess={() => {
            setShowTemplateDialog(false);
          }}
        />
      </ResponsiveDialog>
    </>
  );
};

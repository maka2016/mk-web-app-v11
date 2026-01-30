import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { useEffect, useRef, useState } from 'react';
import InfiniteScroll from 'react-infinite-scroller';
import TemplateDetail from '../../template';
import TemplateCard, { TemplateCardData } from './TemplateCard';

interface Props {
  id?: string;
  template: any[];
  loading: boolean;
  finished: boolean;
  // track: any;
  gutter?: number;
  className?: string;
  onLoad: () => void;
  useWindow?: boolean;
  getScrollParent?: () => HTMLElement | null;
  onChange?: (template: TemplateCardData) => void;
}

interface ColumnData {
  height: number;
  data: any[];
}

export default function Waterfall({
  template,
  loading,
  finished,
  // track,
  gutter = 8,
  className,
  onLoad,
  useWindow,
  getScrollParent,
  onChange,
}: Props) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [columnCount, setColumnCount] = useState<number>(3);
  const [columnWidth, setColumnWidth] = useState<number>(180);
  const [dataColumns, setDataColumns] = useState<ColumnData[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevTemplateLengthRef = useRef<number>(0);

  // 计算列数和列宽
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

        // 计算每列的宽度：容器宽度 - (列数-1) * gap / 列数
        // gap 在移动端是 8px，桌面端是 16px
        const gap = isMobile ? 8 : 16;
        const calculatedWidth = (containerWidth - (cols - 1) * gap) / cols;

        setColumnCount(cols);
        setColumnWidth(calculatedWidth);
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

  // 分配数据到列中
  useEffect(() => {
    if (!columnWidth || !columnCount) return;

    setDataColumns(prevColumns => {
      const isReset = template.length <= prevTemplateLengthRef.current;
      const newItems = isReset
        ? template
        : template.slice(prevTemplateLengthRef.current);

      if (newItems.length === 0) {
        prevTemplateLengthRef.current = template.length;
        return prevColumns;
      }

      // 初始化或重置列数据
      let columns: ColumnData[] = isReset ? [] : [...prevColumns];

      // 确保始终有指定数量的列
      if (!columns.length || columns.length !== columnCount) {
        columns = Array.from({ length: columnCount }).map(() => ({
          height: 0,
          data: [],
        }));
      }

      // 将新数据分配到最短的列
      for (let i = 0; i < newItems.length; i++) {
        let minHeightIndex = 0;
        columns.forEach((v, index) => {
          if (v.height < columns[minHeightIndex].height) {
            minHeightIndex = index;
          }
        });

        const item = newItems[i];
        const page_height = +item.height || +item.page_height || 0;
        const page_width = +item.width || +item.page_width || columnWidth;

        let height = (page_height / page_width) * columnWidth;
        if (height > 4 * columnWidth) {
          height = 4 * columnWidth;
        }
        if (isNaN(height) || height <= 0) {
          height = 0;
        }

        columns[minHeightIndex].height += height;
        columns[minHeightIndex].data.push(item);
      }

      prevTemplateLengthRef.current = template.length;
      return columns;
    });
  }, [template, columnWidth, columnCount]);

  const renderColumns = () => {
    // 确保始终渲染指定数量的列，即使某些列为空
    const columns =
      dataColumns?.length === columnCount
        ? dataColumns
        : Array.from({ length: columnCount }).map(() => ({
            height: 0,
            data: [],
          }));

    const gap = columnCount === 3 ? 8 : 16; // 移动端8px，桌面端16px

    return (
      <div
        ref={containerRef}
        className={`flex w-full ${className || ''}`}
        style={{ gap: `${gap}px` }}
      >
        {columns.map((column, index) => (
          <div key={index} style={{ width: columnWidth, flexShrink: 0 }}>
            {column.data?.map((item: any) => (
              <TemplateCard
                key={item.template_id || item.id}
                template={item}
                columnWidth={columnWidth}
                gutter={gutter}
                // track={track}
                onClick={() => {
                  setSelectedTemplateId(item.template_id);
                  if (onChange) {
                    onChange(item);
                  }
                }}
              />
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <InfiniteScroll
        initialLoad={false}
        pageStart={0}
        useWindow={useWindow}
        loadMore={onLoad}
        hasMore={!finished}
        getScrollParent={getScrollParent}
      >
        {renderColumns()}
        {loading && (
          <div className='w-full py-4'>
            <div className='relative w-10 h-10 mx-auto flex items-center justify-center'>
              <img
                src='https://img2.maka.im/cdn/webstore7/assets/icon_loading_v1.svg'
                width={40}
                height={40}
                alt=''
                className='absolute top-0 left-0 right-0 bottom-0 animate-spin'
                style={{
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <img
                src='https://img2.maka.im/cdn/webstore7/assets/icon_makalogo.svg'
                width={22}
                height={20}
                alt=''
              />
            </div>
          </div>
        )}
      </InfiniteScroll>
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
}

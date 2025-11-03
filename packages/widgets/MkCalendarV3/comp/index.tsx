'use client';
import { EventEmitter } from '@mk/utils';
import { PlatformCompProps } from '@mk/widgets-bridge-sdk';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { Label } from '@workspace/ui/components/label';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import cls from 'classnames';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { useEffect, useMemo, useRef, useState } from 'react';
import { IMark, MkCalendarV3Props } from '../shared/types';
import { DEFAULT_STYLE, hexToRgba } from '../shared/utils';

const WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六'];

const MARKS = {
  holiday: ['休', '假', '节', '庆', '年', '事', '病', '婚'],
  work: ['班', '补', '调', '加', '工', '值'],
};

function MarkGroup({
  title,
  style,
  items,
  onSelect,
}: {
  title: string;
  style: React.CSSProperties;
  items: string[];
  onSelect: (mark: string) => void;
}) {
  return (
    <div className='mb-3'>
      <Label className='text-sm mb-2 font-semibold block'>{title}</Label>
      <div className='grid grid-cols-4 gap-2'>
        {items.map(m => (
          <div
            key={m}
            onClick={() => onSelect(m)}
            className='py-1 border rounded flex items-center justify-center cursor-pointer'
          >
            <div
              className='size-7 text-xs flex items-center justify-center'
              style={style}
            >
              {m}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const rowHeight = 40;

export default function YearCalendar(
  props: PlatformCompProps<MkCalendarV3Props>
) {
  const { id, controledValues, editorSDK } = props;
  const today = dayjs();
  const displayYear = today.year();
  const [mark1, setMark1] = useState<IMark[]>(controledValues?.mark1 || []);
  const [mark2, setMark2] = useState<IMark[]>(controledValues?.mark2 || []);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<MkCalendarV3Props['style']>(
    controledValues?.style || {}
  );

  // 生成 13 个月：当年1月到次年1月（包含次年1月）
  const months = useMemo(() => {
    const base = dayjs(`${displayYear}-01-01`);
    return Array.from({ length: 13 }).map((_, i) => base.add(i, 'month'));
  }, [displayYear]);

  // refs 用于滚动定位到当前月份
  const containerRef = useRef<HTMLDivElement | null>(null);
  const monthRefs = useRef<Array<HTMLDivElement | null>>([]);
  monthRefs.current = [];

  const handleClickDate = (dateKey: string) => {
    if (!editorSDK) {
      return;
    }
    setSelectedDate(dateKey);
    setOpen(true);
  };

  const handleSelectMark1 = (mark: string) => {
    if (selectedDate) {
      if (mark2.some(item => item.date === selectedDate)) {
        const filterVal = mark2.filter(item => item.date !== selectedDate);
        setMark2(filterVal);
        editorSDK?.changeCompAttr(id, {
          mark2: filterVal,
        });
      }
      if (mark1.some(item => item.date === selectedDate)) {
        const filterVal = mark1.filter(item => item.date !== selectedDate);
        const nextVal = [
          ...filterVal,
          { date: selectedDate, cornerText: mark },
        ];

        setMark1(nextVal);
        editorSDK?.changeCompAttr(id, {
          mark1: nextVal,
        });
      } else {
        const nextVal = [...mark1, { date: selectedDate, cornerText: mark }];
        setMark1(nextVal);
        editorSDK?.changeCompAttr(id, {
          mark1: nextVal,
        });
      }
    }
    setOpen(false);
  };

  const handleSelectMark2 = (mark: string) => {
    if (selectedDate) {
      if (mark1.some(item => item.date === selectedDate)) {
        const filterVal = mark1.filter(item => item.date !== selectedDate);
        setMark1(filterVal);
        editorSDK?.changeCompAttr(id, {
          mark1: filterVal,
        });
      }
      if (mark2.some(item => item.date === selectedDate)) {
        const filterVal = mark2.filter(item => item.date !== selectedDate);
        const nextVal = [
          ...filterVal,
          { date: selectedDate, cornerText: mark },
        ];

        setMark2(nextVal);
        editorSDK?.changeCompAttr(id, {
          mark2: nextVal,
        });
      } else {
        const nextVal = [...mark2, { date: selectedDate, cornerText: mark }];
        setMark2(nextVal);
        editorSDK?.changeCompAttr(id, {
          mark2: nextVal,
        });
      }
    }
    setOpen(false);
  };

  function setMonthRef(el: HTMLDivElement | null, idx: number) {
    monthRefs.current[idx] = el;
  }

  const onCalendarStyleChange = (newStyle: MkCalendarV3Props['style']) => {
    setStyle(newStyle);
  };

  useEffect(() => {
    EventEmitter.on('calendarStyleChange', onCalendarStyleChange);
    return () => {
      EventEmitter.rm('calendarStyleChange', onCalendarStyleChange);
    };
  }, []);

  // 滚动到当前月份（组件挂载后）
  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    let previousHeight = 0;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const currentHeight = entry.contentRect.height;
        // 检测高度从 0 变为非 0
        if (previousHeight === 0 && currentHeight > 0) {
          const now = dayjs();
          const idx = now.year() === displayYear ? now.month() : 0; // 如果不是当年，默认跳到一月
          const el = monthRefs.current[idx];
          if (el && containerRef.current) {
            // 将容器滚动到该 month 元素顶部（平滑）
            const top = el.offsetTop - (containerRef.current.offsetTop ?? 0);
            containerRef.current.scrollTo({ top: top - 40, behavior: 'auto' });
          }
          // 立即卸载观察器
          if (containerRef.current) {
            observer.unobserve(containerRef.current);
          }
          observer.disconnect();
        }

        previousHeight = currentHeight;
      }
    });

    observer.observe(containerRef.current);

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [containerRef]);

  const hasMark = () => {
    if (!selectedDate) {
      return false;
    }
    return (
      mark1.some(item => item.date === selectedDate) ||
      mark2.some(item => item.date === selectedDate)
    );
  };

  const handleRemoveMark = () => {
    if (!selectedDate) {
      return;
    }
    setMark1(mark1.filter(item => item.date !== selectedDate));
    setMark2(mark2.filter(item => item.date !== selectedDate));
    editorSDK?.changeCompAttr(id, {
      mark1: mark1.filter(item => item.date !== selectedDate),
      mark2: mark2.filter(item => item.date !== selectedDate),
    });
  };

  const visibleWeeks = style?.visibleWeeks ?? 6;
  const rows = Math.max(1, visibleWeeks);

  const visibleHeight =
    (rows + (visibleWeeks > 5 ? 3 : 2)) * rowHeight + rows * 8; // + header 行

  // const { style } = controledValues || {};
  const todayStyle = {
    color: style?.todayColor || DEFAULT_STYLE.todayColor,
    borderColor: style?.todayColor || DEFAULT_STYLE.todayColor,
    borderWidth: 1,
    borderStyle: 'solid',
  };

  const mark1Style = {
    backgroundColor:
      style?.mark1BackgroundColor || DEFAULT_STYLE.mark1BackgroundColor,
    color: style?.mark1TextColor || DEFAULT_STYLE.mark1TextColor,
  };

  const mark1CornerStyle = {
    backgroundColor:
      style?.mark1CornerBackgroundColor ||
      DEFAULT_STYLE.mark1CornerBackgroundColor,
    color: style?.mark1CornerTextColor || DEFAULT_STYLE.mark1CornerTextColor,
    borderRadius: style?.borderRadius || 4,
  };

  const mark2Style = {
    backgroundColor:
      style?.mark2BackgroundColor || DEFAULT_STYLE.mark2BackgroundColor,
    color: style?.mark2TextColor || DEFAULT_STYLE.mark2TextColor,
  };

  const mark2CornerStyle = {
    backgroundColor:
      style?.mark2CornerBackgroundColor ||
      DEFAULT_STYLE.mark2CornerBackgroundColor,
    color: style?.mark2CornerTextColor || DEFAULT_STYLE.mark2CornerTextColor,
    borderRadius: style?.borderRadius || 4,
  };

  const textStyle = {
    color: style?.textColor || DEFAULT_STYLE.textColor,
  };

  return (
    <div className='relative'>
      <div
        ref={containerRef}
        className={`overflow-y-auto px-2 pb-2 pointer-events-auto`}
        style={{
          height: visibleHeight,
          backgroundColor: style?.backgroundColor || 'white',
          borderRadius: style?.borderRadius || 4,
        }}
      >
        <div
          className='grid grid-cols-7 gap-1 text-sm text-center sticky top-0 z-10'
          style={{
            backgroundColor: style?.backgroundColor || 'white',
          }}
        >
          {WEEK_DAYS.map(d => (
            <div
              key={d}
              className='py-1 flex items-center justify-center h-10'
              style={textStyle}
            >
              {d}
            </div>
          ))}
        </div>
        {months.map((m, idx) => {
          const y = m.year();
          const mm = m.month() + 1; // 1-12

          const startOfMonth = m.startOf('month');
          const endOfMonth = m.endOf('month');

          // 从当月第一天所在的周开始，到最后一天所在的周结束
          const startOfCalendar = startOfMonth.startOf('week');
          const endOfCalendar = endOfMonth.endOf('week');
          const totalWeeks = endOfCalendar.diff(startOfCalendar, 'week') + 1;
          const weeks: dayjs.Dayjs[][] = [];

          for (let w = 0; w < totalWeeks; w++) {
            const weekStart = startOfCalendar.add(w, 'week');
            const days = Array.from({ length: 7 }, (_, d) =>
              // 从星期日开始
              weekStart.add(d - 1, 'day')
            );
            weeks.push(days);
          }

          return (
            <div
              key={`${y}-${mm}`}
              ref={el => setMonthRef(el, m.month())}
              className='flex flex-col gap-2'
            >
              <div className='flex items-center justify-center mt-2  gap-2'>
                <div
                  className='flex-1 h-px'
                  style={{
                    backgroundColor: hexToRgba(
                      style?.textColor || DEFAULT_STYLE.textColor,
                      0.063
                    ),
                  }}
                ></div>
                <div
                  className='text-sm px-3 py-1'
                  style={{
                    backgroundColor: hexToRgba(
                      style?.textColor || DEFAULT_STYLE.textColor,
                      0.063
                    ),
                    color: style?.textColor || DEFAULT_STYLE.textColor,
                    borderRadius: style?.borderRadius || 4,
                  }}
                >
                  {m.format('YYYY 年 MM 月')}
                </div>
                <div
                  className='flex-1 h-px'
                  style={{
                    backgroundColor: hexToRgba(
                      style?.textColor || DEFAULT_STYLE.textColor,
                      0.063
                    ),
                  }}
                ></div>
              </div>

              {weeks.map(week => (
                <div
                  key={week[0].format('YYYY-MM-DD')}
                  className='grid grid-cols-7 gap-1'
                >
                  {week.map((d, i) => {
                    const key = d.format('YYYY-MM-DD');
                    const mark1Item = mark1.find(item => item.date === key);
                    const mark2Item = mark2.find(item => item.date === key);
                    const isToday =
                      d.isSame(today, 'day') &&
                      d.isSame(today, 'month') &&
                      d.isSame(today, 'year');
                    const isInMonth = d.isSame(m, 'month');

                    if (!isInMonth) {
                      return <div key={`empty-${i}`} className={`h-10`} />;
                    }
                    return (
                      <div
                        key={key}
                        onClick={() => handleClickDate(key)}
                        className={cls([
                          'relative h-10 py-2 flex items-center justify-center text-sm transition-all cursor-pointer',
                        ])}
                        style={{
                          color: style?.textColor || DEFAULT_STYLE.textColor,
                          borderRadius:
                            style?.borderRadius || DEFAULT_STYLE.borderRadius,

                          ...(isToday && todayStyle),
                          ...(mark1Item && mark1Style),
                          ...(mark2Item && mark2Style),
                        }}
                      >
                        <span>{d.date()}</span>
                        {mark1Item && (
                          <span
                            className={cls([
                              'absolute -top-1 -right-1 text-xs p-[3px] font-semibold leading-none select-none',
                            ])}
                            style={mark1CornerStyle}
                          >
                            {mark1Item.cornerText || '假'}
                          </span>
                        )}
                        {mark2Item && (
                          <span
                            className={cls([
                              'absolute -top-1 -right-1 text-xs p-[3px]  font-semibold leading-none select-none',
                            ])}
                            style={mark2CornerStyle}
                          >
                            {mark2Item.cornerText || '班'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <ResponsiveDialog isOpen={open} onOpenChange={setOpen}>
        <div className='bg-white rounded-xl p-4 shadow-lg border'>
          <div className='flex justify-between items-center mb-2'>
            <span className='font-semibold text-gray-700'>选择标记类型</span>
            <Icon name='close' onClick={() => setOpen(false)} />
          </div>
          <div className='text-sm text-gray-500 mb-3'>日期：{selectedDate}</div>

          <MarkGroup
            title='放假日期'
            style={mark1CornerStyle}
            items={MARKS.holiday}
            onSelect={handleSelectMark1}
          />
          <MarkGroup
            title='补班日期'
            style={mark2CornerStyle}
            items={MARKS.work}
            onSelect={handleSelectMark2}
          />
          {hasMark() && (
            <Button
              variant='outline'
              className='w-full'
              onClick={handleRemoveMark}
            >
              移除标记
            </Button>
          )}
        </div>
      </ResponsiveDialog>
    </div>
  );
}

'use client';
import { EventEmitter } from '@/utils';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { Label } from '@workspace/ui/components/label';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { cn } from '@workspace/ui/lib/utils';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { useEffect, useMemo, useRef, useState } from 'react';
import { blockStyleFilter } from '../../utils';
import { useWorksStore } from '../../works-store/store/hook';
import { LayerElemItem } from '../../works-store/types';
import { IMark, MarkGroupConfig, MkCalendarV3Props } from './types';
import {
  DEFAULT_MARK_GROUPS,
  DEFAULT_STYLE,
  getLunarDateText,
  isGradient,
  safeHexToRgba,
} from './utils';

const WEEK_DAYS_SUNDAY = ['日', '一', '二', '三', '四', '五', '六'];
const WEEK_DAYS_MONDAY = ['一', '二', '三', '四', '五', '六', '日'];

function MarkGroup({
  title,
  cellStyle,
  cornerStyle,
  items,
  onSelect,
}: {
  title: string;
  cellStyle: React.CSSProperties;
  cornerStyle: React.CSSProperties;
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
            className='relative rounded flex items-center justify-center cursor-pointer transition-all'
            style={{
              ...cellStyle,
              ...blockStyleFilter({
                height: '40px', // h-10 转换为 height
                padding: '8px 0', // py-2 转换为 padding
              }),
            }}
          >
            <span className='text-sm'>1</span>
            <span
              className='absolute -top-1 -right-1 font-semibold leading-none select-none'
              style={{
                ...cornerStyle,
                ...blockStyleFilter({
                  fontSize: '12px', // text-xs 转换为 fontSize
                  padding: '3px', // p-[3px] 转换为 padding
                }),
              }}
            >
              {m}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 数据迁移函数：将旧的 mark1/mark2 格式转换为新的 marks 格式
function migrateMarks(attrs: MkCalendarV3Props | undefined): {
  marks: IMark[];
  markGroups: MarkGroupConfig[];
} {
  const markGroups = attrs?.markGroups || DEFAULT_MARK_GROUPS;

  let marks: IMark[] = [];

  // 如果已经有新的 marks 格式，直接使用
  if (attrs?.marks && attrs.marks.length > 0) {
    marks = attrs.marks;
  } else {
    // 迁移旧的 mark1 和 mark2 格式
    const oldMark1 = attrs?.mark1 || [];
    const oldMark2 = attrs?.mark2 || [];

    // 将 mark1 转换为新的格式
    marks = oldMark1.map(item => ({
      date: item.date,
      groupId: 'mark-group-1',
      cornerText: item.cornerText || '假',
    }));

    // 将 mark2 转换为新的格式，注意：如果同一日期已存在于 mark1，则保留 mark1 的标记（互斥）
    const mark1Dates = new Set(oldMark1.map(item => item.date));
    oldMark2.forEach(item => {
      if (!mark1Dates.has(item.date)) {
        marks.push({
          date: item.date,
          groupId: 'mark-group-2',
          cornerText: item.cornerText || '班',
        });
      }
    });
  }

  return { marks, markGroups };
}

export default function MkCalendarV3(props: {
  layer: LayerElemItem<MkCalendarV3Props>;
  isActive: boolean;
}) {
  const { layer, isActive } = props;
  const { attrs } = layer;
  const id = layer.elemId;
  const worksStore = useWorksStore();
  const today = dayjs();

  // 数据迁移和初始化
  const { marks: migratedMarks, markGroups: migratedMarkGroups } = useMemo(
    () => migrateMarks(attrs),
    [attrs]
  );

  const [marks, setMarks] = useState<IMark[]>(migratedMarks);
  // 直接使用 migratedMarkGroups，确保当 attrs 变化时自动更新
  const markGroups = migratedMarkGroups;

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  // 直接使用 attrs?.style，确保当 attrs 变化时自动更新
  // 同时支持通过 EventEmitter 实时更新（用于实时预览）
  const [styleFromEvent, setStyleFromEvent] = useState<
    MkCalendarV3Props['style'] | null
  >(null);

  // 使用 ref 来跟踪 attrs?.style 的序列化值，以便检测真正的变化
  const attrsStyleSerializedRef = useRef(JSON.stringify(attrs?.style || {}));

  // 当 attrs?.style 变化时，检查是否是真正的变化（不是来自实时预览）
  // 这样可以确保每个组件使用自己的样式，避免样式相互影响
  useEffect(() => {
    const currentSerialized = JSON.stringify(attrs?.style || {});
    // 如果 attrs?.style 发生了变化，且与当前的 styleFromEvent 不同，说明是外部更新，清空实时预览
    if (currentSerialized !== attrsStyleSerializedRef.current) {
      // 如果 styleFromEvent 存在且与新的 attrs?.style 不同，清空它
      if (
        styleFromEvent &&
        JSON.stringify(styleFromEvent) !== currentSerialized
      ) {
        setStyleFromEvent(null);
      }
      attrsStyleSerializedRef.current = currentSerialized;
    }
  }, [attrs?.style, styleFromEvent]);

  // 优先使用 EventEmitter 更新的样式（实时预览），否则使用 attrs 中的样式
  // 使用 useMemo 创建独立的 style 对象副本，避免引用共享，确保每个组件有独立的样式对象
  const style = useMemo(() => {
    const sourceStyle = styleFromEvent || attrs?.style || {};
    // 创建独立的副本，确保每个组件有完全独立的样式对象，避免样式相互影响
    // 特别是对于嵌套对象（如果有的话），都需要创建新对象
    return {
      ...sourceStyle,
    };
  }, [styleFromEvent, attrs?.style]);

  // 是否从周日开始（默认 false，从周一开始）
  const startFromSunday = attrs?.startFromSunday ?? false;
  const weekDays = startFromSunday ? WEEK_DAYS_SUNDAY : WEEK_DAYS_MONDAY;
  // 是否显示年月标题（默认 true）
  const showMonthTitle = attrs?.showMonthTitle ?? true;
  // 是否显示农历（默认 false）
  const showLunar = attrs?.showLunar ?? false;

  // 计算字体样式对象
  const fontStyle = useMemo(() => {
    const fontSize = style?.fontSize ?? DEFAULT_STYLE.fontSize ?? 14;
    const fontFamily = style?.fontFamily || '';
    const fontWeight = style?.fontWeight ?? DEFAULT_STYLE.fontWeight ?? 400;

    return {
      fontSize: `${fontSize}px`,
      fontFamily: fontFamily ? `"${fontFamily}"` : undefined,
      fontWeight: typeof fontWeight === 'number' ? fontWeight : fontWeight,
    };
  }, [style?.fontSize, style?.fontFamily, style?.fontWeight]);

  // 当 attrs 变化时，同步更新 marks
  useEffect(() => {
    setMarks(migratedMarks);
  }, [migratedMarks]);

  // 使用 useMemo 确保在 attrs 变化时重新计算日期范围
  const { startDate, endDate, months } = useMemo(() => {
    // 获取可视日期范围
    const visibleRange = attrs?.visibleDateRange;

    let start: dayjs.Dayjs;
    let end: dayjs.Dayjs;

    if (visibleRange?.startDate && visibleRange?.endDate) {
      // 如果有设置可视日期范围，使用设置的范围
      start = dayjs(visibleRange.startDate).startOf('day');
      end = dayjs(visibleRange.endDate).endOf('day');
    } else {
      // 如果没有设置，默认显示当天+前后7天（共15天）
      const today = dayjs();
      start = today.subtract(7, 'day').startOf('day');
      end = today.add(7, 'day').endOf('day');
    }

    // 生成需要显示的月份列表
    // 从 startDate 所在月份到 endDate 所在月份
    const startMonth = start.startOf('month');
    const endMonth = end.startOf('month');
    const monthsList: dayjs.Dayjs[] = [];

    let currentMonth = startMonth;
    while (
      currentMonth.isBefore(endMonth) ||
      currentMonth.isSame(endMonth, 'month')
    ) {
      monthsList.push(currentMonth);
      currentMonth = currentMonth.add(1, 'month');
    }

    return {
      startDate: start,
      endDate: end,
      months: monthsList,
    };
  }, [attrs]);

  const handleClickDate = (dateKey: string) => {
    if (!worksStore) {
      return;
    }

    // 检查该日期是否已有标记
    const existingMark = marks.find(item => item.date === dateKey);

    if (existingMark) {
      // 如果已有标记，直接取消标记
      const newMarks = marks.filter(item => item.date !== dateKey);
      setMarks(newMarks);
      worksStore?.changeCompAttr(id, {
        marks: newMarks,
      });
    } else {
      // 如果没有标记，打开弹窗选择标记
      setSelectedDate(dateKey);
      setOpen(true);
    }
  };

  const handleSelectMark = (groupId: string, mark: string) => {
    if (!selectedDate) {
      setOpen(false);
      return;
    }

    // 查找该日期是否已有标记
    const existingMarkIndex = marks.findIndex(
      item => item.date === selectedDate
    );

    if (existingMarkIndex >= 0) {
      const existingMark = marks[existingMarkIndex];
      // 如果点击的是同一个标记组和同一个标记项，则移除标记
      if (
        existingMark.groupId === groupId &&
        existingMark.cornerText === mark
      ) {
        const newMarks = marks.filter(item => item.date !== selectedDate);
        setMarks(newMarks);
        worksStore?.changeCompAttr(id, {
          marks: newMarks,
        });
      } else {
        // 如果点击的是不同的标记，则替换标记（互斥）
        const newMarks = [...marks];
        newMarks[existingMarkIndex] = {
          date: selectedDate,
          groupId,
          cornerText: mark,
        };
        setMarks(newMarks);
        worksStore?.changeCompAttr(id, {
          marks: newMarks,
        });
      }
    } else {
      // 如果没有标记，则添加新标记
      const newMarks = [
        ...marks,
        {
          date: selectedDate,
          groupId,
          cornerText: mark,
        },
      ];
      setMarks(newMarks);
      worksStore?.changeCompAttr(id, {
        marks: newMarks,
      });
    }
    setOpen(false);
  };

  const onCalendarStyleChange = (newStyle: MkCalendarV3Props['style']) => {
    // 创建新对象的副本，避免引用共享
    setStyleFromEvent({ ...newStyle });
  };

  // 使用包含组件ID的事件名，确保每个组件监听独立的事件
  useEffect(() => {
    const eventName = `calendarStyleChange:${id}`;
    EventEmitter.on(eventName, onCalendarStyleChange);
    return () => {
      EventEmitter.rm(eventName, onCalendarStyleChange);
    };
  }, [id]);

  const hasMark = () => {
    if (!selectedDate) {
      return false;
    }
    return marks.some(item => item.date === selectedDate);
  };

  const handleRemoveMark = () => {
    if (!selectedDate) {
      return;
    }
    const newMarks = marks.filter(item => item.date !== selectedDate);
    setMarks(newMarks);
    worksStore?.changeCompAttr(id, {
      marks: newMarks,
    });
  };

  // 计算描边样式
  const borderWidth =
    style?.borderWidth !== undefined
      ? style.borderWidth
      : DEFAULT_STYLE.borderWidth || 0;
  const borderColor = style?.borderColor || DEFAULT_STYLE.borderColor;

  const todayStyle = {
    color: style?.todayColor || DEFAULT_STYLE.todayColor,
    // 今日高亮边框：使用今日高亮颜色，但保持用户设置的描边粗细（如果有设置的话）
    borderColor: style?.todayColor || DEFAULT_STYLE.todayColor,
    borderWidth: borderWidth > 0 ? borderWidth : 1, // 如果用户没有设置描边，今日高亮默认使用1px边框
    borderStyle: 'solid' as const,
  };

  // 周数文字样式（将在下面合并到 filteredWeekDayStyle）
  const weekDayTextColor =
    style?.weekDayTextColor ||
    style?.textColor ||
    DEFAULT_STYLE.weekDayTextColor ||
    DEFAULT_STYLE.textColor;

  // 获取标记组的样式
  const getMarkGroupStyle = (groupId: string) => {
    const group = markGroups.find(g => g.id === groupId);
    if (!group) {
      return {
        cellStyle: {},
        cornerStyle: {},
      };
    }

    // 计算标记组的描边样式
    const groupBorderWidth = group.style.borderWidth ?? 0;
    const groupBorderColor = group.style.borderColor || 'transparent';

    // 判断背景颜色是否是渐变
    const isBgGradient = isGradient(group.style.backgroundColor);
    const isCornerBgGradient = isGradient(group.style.cornerBackgroundColor);

    // 使用 blockStyleFilter 一次性处理需要缩放的样式
    const filteredMarkGroupStyle = {
      borderWidth: groupBorderWidth > 0 ? `${groupBorderWidth}px` : undefined,
      borderRadius: style?.borderRadius || DEFAULT_STYLE.borderRadius,
    };

    return {
      cellStyle: {
        // 如果是渐变，使用 background，否则使用 backgroundColor
        ...(isBgGradient
          ? { background: group.style.backgroundColor }
          : { backgroundColor: group.style.backgroundColor }),
        color: group.style.textColor,
        // 描边样式：只有在 borderWidth > 0 且 borderColor 不为 transparent 时才应用
        ...(groupBorderWidth > 0 &&
          groupBorderColor &&
          groupBorderColor !== 'transparent'
          ? {
            borderWidth: filteredMarkGroupStyle.borderWidth,
            borderStyle: 'solid',
            borderColor: groupBorderColor,
          }
          : {}),
      },
      cornerStyle: {
        // 如果是渐变，使用 background，否则使用 backgroundColor
        ...(isCornerBgGradient
          ? { background: group.style.cornerBackgroundColor }
          : { backgroundColor: group.style.cornerBackgroundColor }),
        color: group.style.cornerTextColor,
        borderRadius: filteredMarkGroupStyle.borderRadius,
      },
    };
  };

  const filteredWeekRowGap = blockStyleFilter({
    gap: '4px', // gap-1 转换为 gap
  });

  return (
    <div
      className={cn(
        'relative CalendarV3_Container',
        isActive ? 'pointer-events-auto' : 'pointer-events-none'
      )}
    >
      <div
        className='grid grid-cols-7 text-center sticky top-0 z-10'
        style={{
          ...(() => {
            const bgColor =
              (style as any)?.backgroundColor ||
              (DEFAULT_STYLE as any).backgroundColor;
            const isBgGradient = isGradient(bgColor);
            return isBgGradient
              ? { background: bgColor }
              : { backgroundColor: bgColor };
          })(),
          ...blockStyleFilter({
            gap: '4px', // gap-1 转换为 gap
          }),
        }}
      >
        {weekDays.map(d => {
          // 使用 blockStyleFilter 一次性处理周数标题的所有样式
          const filteredWeekDayStyle = {
            height: '40px', // h-10 转换为 height
            padding: '4px 0', // py-1 转换为 padding
          };

          return (
            <div
              key={d}
              className='flex items-center justify-center'
              style={blockStyleFilter({
                color: weekDayTextColor,
                ...filteredWeekDayStyle,
                ...fontStyle,
              })}
            >
              {d}
            </div>
          );
        })}
      </div>
      {months.map(m => {
        const y = m.year();
        const mm = m.month() + 1; // 1-12

        const startOfMonth = m.startOf('month');
        const endOfMonth = m.endOf('month');

        // 计算日历开始日期
        let startOfCalendar: dayjs.Dayjs;
        if (startFromSunday) {
          // 从周日开始：使用 dayjs 默认的 startOf('week')
          startOfCalendar = startOfMonth.startOf('week');
        } else {
          // 从周一开始：找到当月第一天所在周的周一
          const firstDayOfMonth = startOfMonth.day(); // 0=周日, 1=周一, ..., 6=周六
          const daysToSubtract =
            firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // 如果是周日，需要减去6天；否则减去 (day-1) 天
          startOfCalendar = startOfMonth.subtract(daysToSubtract, 'day');
        }

        // 计算日历结束日期
        let endOfCalendar: dayjs.Dayjs;
        if (startFromSunday) {
          // 从周日开始：使用 dayjs 默认的 endOf('week')
          endOfCalendar = endOfMonth.endOf('week');
        } else {
          // 从周一开始：找到当月最后一天所在周的周日
          const lastDayOfMonth = endOfMonth.day(); // 0=周日, 1=周一, ..., 6=周六
          const daysToAdd = lastDayOfMonth === 0 ? 0 : 7 - lastDayOfMonth; // 如果是周日，不需要加；否则加到周日
          endOfCalendar = endOfMonth.add(daysToAdd, 'day');
        }
        const totalWeeks = endOfCalendar.diff(startOfCalendar, 'week') + 1;
        const weeks: dayjs.Dayjs[][] = [];

        for (let w = 0; w < totalWeeks; w++) {
          const weekStart = startOfCalendar.add(w, 'week');
          const days = Array.from({ length: 7 }, (_, d) =>
            startFromSunday
              ? // 从周日开始：weekStart 是周日，d 从 0 开始，所以是 weekStart.add(d - 1, 'day')
              weekStart.add(d - 1, 'day')
              : // 从周一开始：weekStart 是周一，d 从 0 开始，所以是 weekStart.add(d, 'day')
              weekStart.add(d, 'day')
          );
          weeks.push(days);
        }

        // 使用 blockStyleFilter 一次性处理月份相关的所有样式
        const filteredMonthContainerStyle = blockStyleFilter({
          gap: '8px', // gap-2 转换为 gap
        });

        const filteredMonthTitleStyle = blockStyleFilter({
          padding: '4px 12px 4px 12px', // px-3 py-1 转换为 padding
          borderRadius: style?.borderRadius || 4,
        });

        const filteredDividerStyle = blockStyleFilter({
          height: '1px', // h-px 转换为 height
        });

        const dividerBgColor = safeHexToRgba(
          style?.textColor || DEFAULT_STYLE.textColor,
          0.063
        );

        return (
          <div
            key={`${y}-${mm}`}
            className='flex flex-col'
            style={filteredMonthContainerStyle}
          >
            {showMonthTitle && (
              <div
                className='flex items-center justify-center mt-2'
                style={filteredMonthContainerStyle}
              >
                <div
                  className='flex-1'
                  style={{
                    backgroundColor: dividerBgColor,
                    ...filteredDividerStyle,
                  }}
                ></div>
                <div
                  className='text-sm'
                  style={{
                    backgroundColor: dividerBgColor,
                    color: style?.textColor || DEFAULT_STYLE.textColor,
                    ...filteredMonthTitleStyle,
                    ...fontStyle,
                  }}
                >
                  {m.format('YYYY 年 MM 月')}
                </div>
                <div
                  className='flex-1'
                  style={{
                    backgroundColor: dividerBgColor,
                    ...filteredDividerStyle,
                  }}
                ></div>
              </div>
            )}

            {weeks.map(week => (
              <div
                key={week[0].format('YYYY-MM-DD')}
                className='grid grid-cols-7'
                style={filteredWeekRowGap}
              >
                {week.map((d, i) => {
                  const key = d.format('YYYY-MM-DD');
                  const isInMonth = d.isSame(m, 'month');
                  // 判断日期是否在可视范围内（包含开始和结束日期）
                  const isInRange =
                    (d.isAfter(startDate, 'day') ||
                      d.isSame(startDate, 'day')) &&
                    (d.isBefore(endDate, 'day') || d.isSame(endDate, 'day'));

                  // 不在当前月份或不在显示范围内，都不显示
                  if (!isInMonth || !isInRange) {
                    return <div key={`empty-${i}`} />;
                  }

                  const markItem = marks.find(item => item.date === key);
                  const isToday =
                    d.isSame(today, 'day') &&
                    d.isSame(today, 'month') &&
                    d.isSame(today, 'year');

                  // 获取标记样式
                  const markStyles = markItem
                    ? getMarkGroupStyle(markItem.groupId)
                    : { cellStyle: {}, cornerStyle: {} };

                  // 使用 blockStyleFilter 一次性处理日期单元格的所有样式
                  const filteredCellStyle = {
                    padding: `${style?.padding ?? DEFAULT_STYLE.padding}px 0`,
                    borderRadius:
                      style?.borderRadius || DEFAULT_STYLE.borderRadius,
                    borderWidth:
                      borderWidth > 0 && !isToday
                        ? `${borderWidth}px`
                        : isToday && todayStyle.borderWidth
                          ? `${todayStyle.borderWidth}px`
                          : undefined,
                  };

                  // 获取农历文本
                  const lunarText = showLunar
                    ? getLunarDateText(d.year(), d.month() + 1, d.date())
                    : '';

                  // 计算农历字体大小
                  const lunarFontSize =
                    style?.lunarFontSize ?? DEFAULT_STYLE.lunarFontSize ?? 10;

                  // 使用 blockStyleFilter 一次性处理标记角标的所有样式
                  const filteredCornerStyle = blockStyleFilter({
                    fontSize: '12px', // text-xs 转换为 fontSize
                    padding: '3px',
                    top: '-4px',
                    right: '-4px',
                    ...(markStyles.cornerStyle || {}),
                  });

                  return (
                    <div
                      key={key}
                      onClick={() => handleClickDate(key)}
                      className={cn([
                        'relative flex flex-col items-center justify-center transition-all cursor-pointer',
                      ])}
                      style={blockStyleFilter({
                        color: style?.textColor || DEFAULT_STYLE.textColor,
                        ...filteredCellStyle,
                        ...fontStyle,
                        // 描边样式：只有在 borderWidth > 0 且 borderColor 不为 transparent 时才应用
                        // 注意：如果 isToday，todayStyle 会覆盖这里的描边样式
                        ...(filteredCellStyle.borderWidth &&
                          borderWidth > 0 &&
                          borderColor &&
                          borderColor !== 'transparent' &&
                          !isToday
                          ? {
                            borderWidth: filteredCellStyle.borderWidth,
                            borderStyle: 'solid',
                            borderColor: borderColor,
                          }
                          : {
                            ...todayStyle,
                            borderWidth: filteredCellStyle.borderWidth,
                          }),
                        ...(markItem && markStyles.cellStyle),
                      })}
                    >
                      <span>{d.date()}</span>
                      {showLunar && lunarText && (
                        <span
                          className='text-xs leading-tight opacity-70'
                          style={{
                            fontSize: `${lunarFontSize}px`,
                            fontFamily: fontStyle.fontFamily,
                            fontWeight: fontStyle.fontWeight,
                          }}
                        >
                          {lunarText}
                        </span>
                      )}
                      {markItem && (
                        <span
                          className={cn([
                            'absolute font-semibold leading-none select-none',
                          ])}
                          style={{
                            ...markStyles.cornerStyle,
                            ...filteredCornerStyle,
                          }}
                        >
                          {markItem.cornerText}
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

      <ResponsiveDialog isOpen={open} onOpenChange={setOpen}>
        <div className='bg-white rounded-xl p-4 shadow-lg border'>
          <div className='flex justify-between items-center mb-2'>
            <span className='font-semibold text-gray-700'>选择标记类型</span>
            <Icon name='close' onClick={() => setOpen(false)} />
          </div>
          <div className='text-sm text-gray-500 mb-3'>日期：{selectedDate}</div>

          {markGroups.map(group => {
            const styles = getMarkGroupStyle(group.id);
            return (
              <MarkGroup
                key={group.id}
                title={group.title}
                cellStyle={styles.cellStyle}
                cornerStyle={styles.cornerStyle}
                items={group.items}
                onSelect={mark => handleSelectMark(group.id, mark)}
              />
            );
          })}
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

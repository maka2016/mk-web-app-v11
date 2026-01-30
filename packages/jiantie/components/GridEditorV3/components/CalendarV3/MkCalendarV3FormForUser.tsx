import { useWorksStore } from '@/components/GridEditorV3/works-store/store/hook';
import { Calendar } from '@workspace/ui/components/calendar';
import { Icon } from '@workspace/ui/components/Icon';
import { Label } from '@workspace/ui/components/label';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import dayjs from 'dayjs';
import { observer } from 'mobx-react';
import React, { useMemo, useState } from 'react';
import { type DateRange } from 'react-day-picker';
import { zhCN } from 'react-day-picker/locale';
import { IMark, MarkGroupConfig, MkCalendarV3Props } from './types';
import { DEFAULT_MARK_GROUPS } from './utils';

interface Props {
  formControledValues: MkCalendarV3Props;
  onFormValueChange: any;
  elemId: string;
}
const MarkSetting = observer((props: Props) => {
  const { onFormValueChange, elemId } = props;
  const worksStore = useWorksStore();

  // 通过 observer 观察 layer 属性变化
  const layer = worksStore?.getLayer(elemId);
  const formControledValues = useMemo(
    () => (layer?.attrs || {}) as MkCalendarV3Props,
    [layer?.attrs]
  );

  // 数据迁移：将旧的 mark1/mark2 转换为新的 marks 格式
  const marks = useMemo(() => {
    if (formControledValues?.marks && formControledValues.marks.length > 0) {
      return formControledValues.marks;
    }
    // 迁移旧的 mark1 和 mark2
    const oldMark1 = formControledValues?.mark1 || [];
    const oldMark2 = formControledValues?.mark2 || [];
    const migrated: IMark[] = [];

    oldMark1.forEach(item => {
      migrated.push({
        date: item.date,
        groupId: 'mark-group-1',
        cornerText: item.cornerText || '假',
      });
    });

    const mark1Dates = new Set(oldMark1.map(item => item.date));
    oldMark2.forEach(item => {
      if (!mark1Dates.has(item.date)) {
        migrated.push({
          date: item.date,
          groupId: 'mark-group-2',
          cornerText: item.cornerText || '班',
        });
      }
    });

    return migrated;
  }, [formControledValues]);

  // 当 marks 变化时，同步更新本地状态（用于已标记日期列表显示）
  const [localMarks, setLocalMarks] = useState<IMark[]>(marks);

  // 获取标记组配置（用于已标记日期列表显示）
  const markGroups: MarkGroupConfig[] =
    formControledValues?.markGroups || DEFAULT_MARK_GROUPS;

  React.useEffect(() => {
    setLocalMarks(marks);
  }, [marks]);

  // 日期范围设置 - 通过 observer 实时获取最新值
  const visibleRange = formControledValues?.visibleDateRange;

  // 计算默认日期范围（当天前后7天，共15天）
  const defaultDateRange = useMemo(() => {
    const today = dayjs();
    const start = today.subtract(7, 'day');
    const end = today.add(7, 'day');
    return {
      from: start.toDate(),
      to: end.toDate(),
    };
  }, []);

  // 转换为 DateRange 格式供 DateRangePicker 使用
  const dateRange: DateRange = useMemo(() => {
    if (visibleRange?.startDate && visibleRange?.endDate) {
      return {
        from: new Date(visibleRange.startDate),
        to: new Date(visibleRange.endDate),
      };
    }
    return defaultDateRange;
  }, [visibleRange?.startDate, visibleRange?.endDate, defaultDateRange]);

  // 计算实际生效的日期范围（用于显示在说明文字中）
  const effectiveDateRange = useMemo(() => {
    if (dateRange.from && dateRange.to) {
      const start = dayjs(dateRange.from).format('YYYY-M-D');
      const end = dayjs(dateRange.to).format('YYYY-M-D');
      return `${start} 至 ${end}`;
    }
    return '';
  }, [dateRange]);

  // 计算默认显示月份（定位到开始日期）
  const defaultMonth = useMemo(() => {
    return dateRange.from || defaultDateRange.from;
  }, [dateRange.from, defaultDateRange.from]);

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (!range?.from || !range?.to) {
      // 如果清空了范围，可以设置默认值或清空
      return;
    }

    const startDate = dayjs(range.from).format('YYYY-MM-DD');
    const endDate = dayjs(range.to).format('YYYY-MM-DD');

    const newVisibleDateRange = {
      startDate,
      endDate,
    };

    if (worksStore && elemId) {
      worksStore.changeCompAttr(elemId, {
        visibleDateRange: newVisibleDateRange,
      });
    }
    onFormValueChange?.({
      ...formControledValues,
      visibleDateRange: newVisibleDateRange,
    });
  };

  return (
    <div className='p-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto'>
      <div className='flex flex-col gap-3'>
        <div className='flex flex-col gap-2'>
          <Label className='text-sm font-medium'>可视日期范围</Label>
          <div className='flex justify-center border rounded-lg p-2 shadow-lg m-4'>
            <Calendar
              mode='range'
              selected={dateRange}
              captionLayout='dropdown'
              onSelect={handleDateRangeChange}
              locale={zhCN}
              defaultMonth={defaultMonth}
            />
          </div>
          <div className='text-xs text-muted-foreground'>
            选择日历需要显示的日期范围，例如：
            {effectiveDateRange || '2026-1-1 至 2026-1-6'}
          </div>
        </div>
      </div>

      {/* <Separator /> */}

      {/* <div className='flex flex-col gap-2'>
        <div className='text-sm font-semibold'>已标记日期</div>
        {localMarks.map(mark => {
          // 查找标记所属的组
          const group = markGroups.find(g => g.id === mark.groupId);
          const groupTitle = group?.title || '未知标记组';
          const groupStyle = group?.style || {
            backgroundColor: '#FFFFFF',
            textColor: '#000000',
            cornerBackgroundColor: '#000000',
            cornerTextColor: '#FFFFFF',
          };

          return (
            <div
              key={mark.date}
              className='flex items-center gap-2 text-xs border rounded-lg p-2'
            >
              <div
                className='size-6 p-1 flex items-center justify-center'
                style={{
                  color: groupStyle.cornerTextColor,
                  backgroundColor: groupStyle.cornerBackgroundColor,
                  borderRadius:
                    formControledValues?.style?.borderRadius ||
                    DEFAULT_STYLE.borderRadius,
                }}
              >
                {mark.cornerText}
              </div>
              <div className='flex-1'>
                <div className='text-black font-semibold'>{mark.date}</div>
                <div className='text-gray-800'>{groupTitle}</div>
              </div>
              <Button
                size='xs'
                variant='ghost'
                onClick={() => {
                  const newMarks = localMarks.filter(m => m.date !== mark.date);
                  setLocalMarks(newMarks);
                  onFormValueChange({ marks: newMarks });
                  if (worksStore && elemId) {
                    worksStore.changeCompAttr(elemId, {
                      marks: newMarks,
                    });
                  }
                }}
              >
                移除
              </Button>
            </div>
          );
        })}
      </div> */}
    </div>
  );
});

const MkCalendarV3FormForUser: React.FC<Props> = props => {
  const { onFormValueChange, formControledValues } = props;
  const [open, setOpen] = useState(false);
  const worksStore = useWorksStore();
  const editingElemId = worksStore?.widgetStateV2?.editingElemId || '';

  return (
    <div className='flex items-center'>
      <div
        style={{
          padding: '0 12px',
        }}
        className='flex items-center gap-1'
        onClick={() => setOpen(true)}
      >
        <Icon name='shezhi' size={16} />
        <span className='text-xs flex-shrink-0'>设置</span>
      </div>
      <ResponsiveDialog
        isOpen={open}
        onOpenChange={setOpen}
        title='日历显示范围设置'
      >
        <MarkSetting
          formControledValues={formControledValues}
          onFormValueChange={onFormValueChange}
          elemId={editingElemId}
        />
      </ResponsiveDialog>
    </div>
  );
};

export default MkCalendarV3FormForUser;

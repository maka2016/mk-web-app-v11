import { EventEmitter } from '@/utils';
import { Button } from '@workspace/ui/components/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { Separator } from '@workspace/ui/components/separator';
import { Switch } from '@workspace/ui/components/switch';
import { cn } from '@workspace/ui/lib/utils';
import { ChevronDown, Copy, Palette, Trash2, Type } from 'lucide-react';
import { useState } from 'react';
import ColorPicker from '../ColorPicker';
import FontFamilySelector from '../FontFamilySelector';
import { MarkGroupConfig, MkCalendarV3Props } from './types';
import {
  DEFAULT_MARK_GROUPS,
  DEFAULT_STYLE,
  generateMarkGroupId,
} from './utils';

// 描边颜色设置组件
const BorderColorSetting = ({
  borderColor,
  borderWidth,
  onBorderColorChange,
  onBorderWidthChange,
  defaultBorderColor = 'transparent',
  defaultBorderWidth = 0,
}: {
  borderColor?: string;
  borderWidth?: number;
  onBorderColorChange: (color: string) => void;
  onBorderWidthChange: (width: number) => void;
  defaultBorderColor?: string;
  defaultBorderWidth?: number;
}) => {
  const currentBorderColor =
    borderColor !== undefined ? borderColor : defaultBorderColor;
  const currentBorderWidth =
    borderWidth !== undefined ? borderWidth : defaultBorderWidth;

  return (
    <div className='flex gap-2 items-center'>
      <Label className='text-xs whitespace-nowrap flex-shrink-0 min-w-[40px]'>
        描边颜色
      </Label>
      <div className='flex items-center gap-2 flex-1'>
        <ColorPicker
          value={currentBorderColor}
          useThemeColor={false}
          onChange={colorCode => {
            onBorderColorChange(colorCode?.hex || '');
          }}
        />

        <Input
          variantSize='xs'
          type='number'
          min={0}
          max={10}
          step={1}
          value={currentBorderWidth}
          style={{
            backgroundColor: '#f3f3f5',
            border: 'none',
          }}
          onChange={e => {
            const value = parseInt(e.target.value, 10);
            if (!isNaN(value) && value >= 0 && value <= 10) {
              onBorderWidthChange(value);
            }
          }}
        />
      </div>
    </div>
  );
};

const items1: Array<{
  label: string;
  value: keyof MkCalendarV3Props['style'];
}> = [
  {
    label: '基本文字',
    value: 'textColor',
  },
  {
    label: '今日高亮',
    value: 'todayColor',
  },
  {
    label: '周数文字',
    value: 'weekDayTextColor',
  },
];

const ItemSetting = ({
  item,
  styles,
  onChangeColor,
}: {
  item: {
    value: keyof MkCalendarV3Props['style'];
    label: string;
  };
  styles: MkCalendarV3Props['style'];
  onChangeColor: (newStyles: MkCalendarV3Props['style']) => void;
}) => {
  const currentColor = (styles?.[item.value] ||
    DEFAULT_STYLE[item.value]) as string;

  // 检测是否为透明色
  const isTransparent =
    currentColor === 'transparent' ||
    (currentColor.startsWith('#') &&
      currentColor.length === 9 &&
      parseInt(currentColor.slice(7, 9), 16) === 0) ||
    (currentColor.startsWith('rgba') &&
      currentColor.includes('0)') &&
      parseFloat(
        currentColor.match(/rgba?\([^)]+,\s*([\d.]+)\)/)?.[1] || '1'
      ) === 0);

  return (
    <div className='flex gap-2 items-center' key={item.value}>
      <Label className='text-xs whitespace-nowrap flex-shrink-0 min-w-[40px]'>
        {item.label}
      </Label>
      <div className='flex items-center gap-2 flex-1'>
        <ColorPicker
          value={currentColor}
          useThemeColor={false}
          onChange={colorCode => {
            onChangeColor({
              ...styles,
              [item.value]: colorCode?.hex || '',
            });
          }}
        />

        <Input
          variantSize='xs'
          value={currentColor}
          style={{
            backgroundColor: '#f3f3f5',
            border: 'none',
          }}
          onChange={e => {
            const newStyles = {
              ...styles,
              [item.value]: e.target.value,
            };
            onChangeColor(newStyles);
          }}
        />
      </div>
    </div>
  );
};

// 标记组样式配置组件
const MarkGroupStyleSetting = ({
  groupStyle,
  onStyleChange,
}: {
  groupStyle: MarkGroupConfig['style'];
  onStyleChange: (newStyle: MarkGroupConfig['style']) => void;
}) => {
  const colorItems: Array<{
    label: string;
    key: keyof MarkGroupConfig['style'];
  }> = [
    { label: '背景颜色', key: 'backgroundColor' },
    { label: '文字颜色', key: 'textColor' },
    { label: '角标背景', key: 'cornerBackgroundColor' },
    { label: '角标文字', key: 'cornerTextColor' },
  ];

  const handleColorChange = (
    key: keyof MarkGroupConfig['style'],
    color: string
  ) => {
    onStyleChange({
      ...groupStyle,
      [key]: color,
    });
  };

  return (
    <div className='flex flex-col gap-2'>
      {colorItems.map(item => {
        const currentColor = groupStyle[item.key] as string;
        const isTransparent =
          currentColor === 'transparent' ||
          (currentColor.startsWith('#') &&
            currentColor.length === 9 &&
            parseInt(currentColor.slice(7, 9), 16) === 0) ||
          (currentColor.startsWith('rgba') &&
            currentColor.includes('0)') &&
            parseFloat(
              currentColor.match(/rgba?\([^)]+,\s*([\d.]+)\)/)?.[1] || '1'
            ) === 0);

        return (
          <div className='flex gap-2 items-center' key={item.key}>
            <Label className='text-xs whitespace-nowrap flex-shrink-0 min-w-[40px]'>
              {item.label}
            </Label>
            <div className='flex items-center gap-2 flex-1'>
              <ColorPicker
                value={currentColor}
                useThemeColor={false}
                disableGradient={false}
                onChange={colorCode => {
                  // 支持渐变：如果是渐变类型，使用 value，否则使用 hex
                  const colorValue =
                    colorCode?.type === 'gradient'
                      ? colorCode.value || ''
                      : colorCode?.hex || '';
                  handleColorChange(item.key, colorValue);
                }}
              />

              <Input
                variantSize='xs'
                value={currentColor}
                style={{
                  backgroundColor: '#f3f3f5',
                  border: 'none',
                }}
                onChange={e => {
                  handleColorChange(item.key, e.target.value);
                }}
              />
            </div>
          </div>
        );
      })}

      <BorderColorSetting
        borderColor={groupStyle.borderColor}
        borderWidth={groupStyle.borderWidth}
        onBorderColorChange={color => {
          onStyleChange({
            ...groupStyle,
            borderColor: color,
          });
        }}
        onBorderWidthChange={width => {
          onStyleChange({
            ...groupStyle,
            borderWidth: width,
          });
        }}
      />
    </div>
  );
};

const CalendarV3DesignerSetting = ({
  onFormValueChange,
  formControledValues,
  elemId,
}: {
  onFormValueChange: (values: any) => void;
  formControledValues: MkCalendarV3Props;
  elemId: string;
}) => {
  const [styles, setStyles] = useState<MkCalendarV3Props['style']>(
    formControledValues.style || {}
  );
  const [markGroups, setMarkGroups] = useState<MarkGroupConfig[]>(
    formControledValues.markGroups || DEFAULT_MARK_GROUPS
  );
  const [startFromSunday, setStartFromSunday] = useState<boolean>(
    formControledValues.startFromSunday ?? false
  );
  const [showMonthTitle, setShowMonthTitle] = useState<boolean>(
    formControledValues.showMonthTitle ?? true
  );
  const [showLunar, setShowLunar] = useState<boolean>(
    formControledValues.showLunar ?? false
  );
  // 记录每个标记组的折叠状态
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set()
  );

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const onChangeColor = (newStyles: MkCalendarV3Props['style']) => {
    setStyles(newStyles);
    onFormValueChange({
      ...formControledValues,
      style: newStyles,
    });

    // 使用包含组件ID的事件名，确保只触发对应组件的事件
    EventEmitter.emit(`calendarStyleChange:${elemId}`, newStyles);
  };

  const handleMarkGroupsChange = (newMarkGroups: MarkGroupConfig[]) => {
    setMarkGroups(newMarkGroups);
    // 同步更新 markItemsInputs
    setMarkItemsInputs(prev => {
      const next = { ...prev };
      newMarkGroups.forEach(group => {
        // 如果组不存在于 prev 中，初始化它的输入值
        if (!(group.id in next)) {
          next[group.id] = formatMarkItems(group.items);
        }
      });
      // 移除已删除的组
      Object.keys(next).forEach(groupId => {
        if (!newMarkGroups.find(g => g.id === groupId)) {
          delete next[groupId];
        }
      });
      return next;
    });
    onFormValueChange({
      ...formControledValues,
      markGroups: newMarkGroups,
    });
  };

  const handleCopyMarkGroup = (groupIndex: number) => {
    const groupToCopy = markGroups[groupIndex];
    const newGroup: MarkGroupConfig = {
      id: generateMarkGroupId(),
      title: `${groupToCopy.title} 副本`,
      items: [...groupToCopy.items],
      style: { ...groupToCopy.style },
    };
    const newMarkGroups = [...markGroups, newGroup];
    handleMarkGroupsChange(newMarkGroups);
  };

  const handleDeleteMarkGroup = (groupIndex: number) => {
    if (markGroups.length <= 1) {
      return; // 至少保留一个标记组
    }
    const newMarkGroups = markGroups.filter((_, index) => index !== groupIndex);
    handleMarkGroupsChange(newMarkGroups);
  };

  const handleUpdateMarkGroup = (
    groupIndex: number,
    updates: Partial<MarkGroupConfig>
  ) => {
    const newMarkGroups = [...markGroups];
    newMarkGroups[groupIndex] = {
      ...newMarkGroups[groupIndex],
      ...updates,
    };
    handleMarkGroupsChange(newMarkGroups);
  };

  // 解析标记项字符串（支持逗号和空格分割）
  const parseMarkItems = (value: string): string[] => {
    if (!value.trim()) {
      return [];
    }
    // 先按逗号分割，再按空格分割，过滤空字符串
    return value
      .split(/[,，\s]+/)
      .map(item => item.trim())
      .filter(item => item.length > 0);
  };

  // 格式化标记项数组为字符串（用逗号连接）
  const formatMarkItems = (items: string[]): string => {
    return items.join('，');
  };

  // 保存每个标记组的原始输入值（用于保持用户输入的格式，包括空格）
  const [markItemsInputs, setMarkItemsInputs] = useState<
    Record<string, string>
  >(() => {
    const initial: Record<string, string> = {};
    markGroups.forEach(group => {
      initial[group.id] = formatMarkItems(group.items);
    });
    return initial;
  });

  const handleMarkItemsChange = (groupIndex: number, value: string) => {
    // 更新本地输入状态，保持原始格式
    const groupId = markGroups[groupIndex].id;
    setMarkItemsInputs(prev => ({
      ...prev,
      [groupId]: value,
    }));

    // 解析并更新实际的 items 数组
    const items = parseMarkItems(value);
    handleUpdateMarkGroup(groupIndex, { items });
  };

  return (
    <>
      <div className='p-2 py-4 flex flex-col gap-2'>
        {/* <div className='text-xs font-semibold flex items-center gap-1'>
          <Icon name='shezhi' size={14} />
          <span>基础样式</span>
        </div> */}
        {/* <div className='flex flex-col gap-2'>
          <Label className='text-xs'>
            圆角大小：{styles.borderRadius || 4}px
          </Label>
          <Slider
            value={[styles.borderRadius || 4]}
            min={0}
            max={20}
            step={1}
            onValueChange={values =>
              onChangeColor({ ...styles, borderRadius: values[0] })
            }
          />
        </div> */}
        {/* <div className='flex items-center justify-between'>
          <Label className='text-xs'>显示周数</Label>
          <Switch
            checked={showWeekNumber}
            onCheckedChange={checked => {
              setShowWeekNumber(checked);
              onFormValueChange({
                showWeekNumber: checked,
              });
            }}
          />
        </div> */}
        {/* <Separator /> */}
        {/* <div className='text-xs font-semibold flex items-center gap-1'>
          <Icon name='preview' size={14} />
          <span>显示控制</span>
        </div>
        <div className='flex flex-col gap-2'>
          <Label className='text-xs'>同时显示周数：{visibleWeeks}周</Label>
          <Slider
            value={[visibleWeeks]}
            min={3}
            max={8}
            step={1}
            onValueChange={values => {
              setVisibleWeeks(values[0]);
              const newStyles = {
                ...styles,
                visibleWeeks: values[0],
              };
              onChangeColor(newStyles);
            }}
          />
          <div className='text-xs text-gray-600'>
            控制日历同时显示多少周的内容，建议3-8周
          </div>
        </div>
        <Separator /> */}
        <div className='flex items-center justify-between'>
          <Label className='text-xs'>从周日开始</Label>
          <Switch
            checked={startFromSunday}
            onCheckedChange={checked => {
              setStartFromSunday(checked);
              onFormValueChange({
                ...formControledValues,
                startFromSunday: checked,
              });
            }}
          />
        </div>

        <div className='flex items-center justify-between'>
          <Label className='text-xs'>显示年月</Label>
          <Switch
            checked={showMonthTitle}
            onCheckedChange={checked => {
              setShowMonthTitle(checked);
              onFormValueChange({
                ...formControledValues,
                showMonthTitle: checked,
              });
            }}
          />
        </div>

        <div className='flex items-center justify-between'>
          <Label className='text-xs'>显示农历</Label>
          <Switch
            checked={showLunar}
            onCheckedChange={checked => {
              setShowLunar(checked);
              onFormValueChange({
                ...formControledValues,
                showLunar: checked,
              });
            }}
          />
        </div>

        {showLunar && (
          <div className='flex gap-2 items-center'>
            <Label className='text-xs whitespace-nowrap flex-shrink-0 min-w-[40px]'>
              农历字体大小
            </Label>
            <div className='flex items-center gap-2 flex-1'>
              <Input
                variantSize='xs'
                type='number'
                min={6}
                max={48}
                step={1}
                value={styles.lunarFontSize ?? DEFAULT_STYLE.lunarFontSize}
                style={{
                  backgroundColor: '#f3f3f5',
                  border: 'none',
                }}
                onChange={e => {
                  const value = parseInt(e.target.value, 10);
                  if (!isNaN(value) && value >= 6 && value <= 48) {
                    onChangeColor({ ...styles, lunarFontSize: value });
                  }
                }}
              />
              <span className='text-xs text-muted-foreground'>px</span>
            </div>
          </div>
        )}

        <Separator />
        <div className='text-xs font-semibold flex items-center gap-1'>
          <Type size={14} />
          <span>字体设置</span>
        </div>

        <div className='flex gap-2 items-center'>
          <Label className='text-xs whitespace-nowrap flex-shrink-0 min-w-[40px]'>
            字体大小
          </Label>
          <div className='flex items-center gap-2 flex-1'>
            <Input
              variantSize='xs'
              type='number'
              min={8}
              max={72}
              step={1}
              value={styles.fontSize ?? DEFAULT_STYLE.fontSize}
              style={{
                backgroundColor: '#f3f3f5',
                border: 'none',
              }}
              onChange={e => {
                const value = parseInt(e.target.value, 10);
                if (!isNaN(value) && value >= 8 && value <= 72) {
                  onChangeColor({ ...styles, fontSize: value });
                }
              }}
            />
            <span className='text-xs text-muted-foreground'>px</span>
          </div>
        </div>

        <div className='flex gap-2 items-center'>
          <Label className='text-xs whitespace-nowrap flex-shrink-0 min-w-[40px]'>
            字体
          </Label>
          <div className='flex items-center gap-2 flex-1'>
            <FontFamilySelector
              value={styles.fontFamily || ''}
              onChange={value => {
                onChangeColor({
                  ...styles,
                  fontFamily: value.fontFamily,
                });
              }}
            />
          </div>
        </div>

        <div className='flex gap-2 items-center'>
          <Label className='text-xs whitespace-nowrap flex-shrink-0 min-w-[40px]'>
            字体粗细
          </Label>
          <div className='flex items-center gap-2 flex-1'>
            <Input
              variantSize='xs'
              type='number'
              min={100}
              max={900}
              step={100}
              value={
                typeof styles.fontWeight === 'number'
                  ? styles.fontWeight
                  : styles.fontWeight === 'bold'
                    ? 700
                    : styles.fontWeight === 'normal'
                      ? 400
                      : DEFAULT_STYLE.fontWeight
              }
              style={{
                backgroundColor: '#f3f3f5',
                border: 'none',
              }}
              onChange={e => {
                const value = parseInt(e.target.value, 10);
                if (!isNaN(value) && value >= 100 && value <= 900) {
                  onChangeColor({ ...styles, fontWeight: value });
                }
              }}
            />
          </div>
        </div>

        <Separator />
        <div className='text-xs font-semibold flex items-center gap-1'>
          <Palette size={14} />
          <span>日历样式</span>
        </div>

        {items1.map(item => {
          return (
            <ItemSetting
              key={item.value}
              item={item}
              styles={styles}
              onChangeColor={onChangeColor}
            />
          );
        })}

        <div className='flex gap-2 items-center'>
          <Label className='text-xs whitespace-nowrap flex-shrink-0 min-w-[40px]'>
            圆角大小
          </Label>
          <div className='flex items-center gap-2 flex-1'>
            <Input
              variantSize='xs'
              type='number'
              min={0}
              max={200}
              step={1}
              value={styles.borderRadius ?? DEFAULT_STYLE.borderRadius}
              style={{
                backgroundColor: '#f3f3f5',
                border: 'none',
              }}
              onChange={e => {
                const value = parseInt(e.target.value, 10);
                if (!isNaN(value) && value >= 0 && value <= 20) {
                  onChangeColor({ ...styles, borderRadius: value });
                }
              }}
            />
          </div>
        </div>

        <div className='flex gap-2 items-center'>
          <Label className='text-xs whitespace-nowrap flex-shrink-0 min-w-[40px]'>
            内边距
          </Label>
          <div className='flex items-center gap-2 flex-1'>
            <Input
              variantSize='xs'
              type='number'
              min={0}
              max={20}
              step={1}
              value={styles.padding ?? DEFAULT_STYLE.padding}
              style={{
                backgroundColor: '#f3f3f5',
                border: 'none',
              }}
              onChange={e => {
                const value = parseInt(e.target.value, 10);
                if (!isNaN(value) && value >= 0 && value <= 20) {
                  onChangeColor({ ...styles, padding: value });
                }
              }}
            />
          </div>
        </div>

        <BorderColorSetting
          borderColor={styles.borderColor}
          borderWidth={styles.borderWidth}
          onBorderColorChange={color => {
            onChangeColor({
              ...styles,
              borderColor: color,
            });
          }}
          onBorderWidthChange={width => {
            onChangeColor({
              ...styles,
              borderWidth: width,
            });
          }}
          defaultBorderColor={DEFAULT_STYLE.borderColor}
          defaultBorderWidth={DEFAULT_STYLE.borderWidth}
        />

        <Separator />
        <div className='text-xs font-semibold flex items-center gap-1'>
          <Palette size={14} />
          <span>标记组配置</span>
        </div>

        {markGroups.map((group, groupIndex) => {
          const isCollapsed = collapsedGroups.has(group.id);
          return (
            <Collapsible
              key={group.id}
              open={!isCollapsed}
              onOpenChange={() => toggleGroupCollapse(group.id)}
            >
              <div className='border rounded-lg flex flex-col'>
                <CollapsibleTrigger className='flex items-center justify-between p-2 hover:bg-muted/50 transition-colors'>
                  <div className='flex items-center gap-2 flex-1'>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 text-muted-foreground transition-transform',
                        isCollapsed && '-rotate-90'
                      )}
                    />
                    <Input
                      variantSize='xs'
                      value={group.title}
                      onChange={e => {
                        e.stopPropagation();
                        handleUpdateMarkGroup(groupIndex, {
                          title: e.target.value,
                        });
                      }}
                      onClick={e => e.stopPropagation()}
                      placeholder='标记组标题'
                      className='flex-1'
                    />
                  </div>
                  <div
                    className='flex gap-1 ml-2'
                    onClick={e => e.stopPropagation()}
                  >
                    <Button
                      size='xs'
                      variant='ghost'
                      onClick={() => handleCopyMarkGroup(groupIndex)}
                      title='复制标记组'
                    >
                      <Copy className='h-3 w-3' />
                    </Button>
                    <Button
                      size='xs'
                      variant='ghost'
                      onClick={() => handleDeleteMarkGroup(groupIndex)}
                      disabled={markGroups.length <= 1}
                      title='删除标记组'
                    >
                      <Trash2 className='h-3 w-3' />
                    </Button>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className='px-3 pb-3 flex flex-col gap-3'>
                    <div className='flex flex-col gap-2'>
                      <Label className='text-xs text-gray-700'>标记项</Label>
                      <Input
                        variantSize='xs'
                        value={
                          markItemsInputs[group.id] ??
                          formatMarkItems(group.items)
                        }
                        onChange={e =>
                          handleMarkItemsChange(groupIndex, e.target.value)
                        }
                        placeholder='输入标记项，用逗号或空格分隔，例如：休，假，节'
                        className='w-full'
                      />
                      <div className='text-xs text-muted-foreground'>
                        使用逗号或空格分隔多个标记项
                      </div>
                    </div>

                    <Separator />

                    <div className='flex flex-col gap-2'>
                      <div className='text-xs text-gray-700'>样式配置</div>
                      <MarkGroupStyleSetting
                        groupStyle={group.style}
                        onStyleChange={newStyle =>
                          handleUpdateMarkGroup(groupIndex, { style: newStyle })
                        }
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>
      <Separator />
    </>
  );
};

export default CalendarV3DesignerSetting;

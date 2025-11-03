import { EventEmitter } from '@mk/utils';
import { Icon } from '@workspace/ui/components/Icon';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { Separator } from '@workspace/ui/components/separator';
import { Slider } from '@workspace/ui/components/slider';
import { Switch } from '@workspace/ui/components/switch';
import { Palette } from 'lucide-react';
import { useState } from 'react';
import { MkCalendarV3Props } from '../shared/types';
import { DEFAULT_STYLE } from '../shared/utils';
import CustomColorPanel2 from './ColorPanel/CustomColorPanel2';
import { rgbaToHex } from './ColorPanel/utils';

const items1: Array<{
  label: string;
  value: keyof MkCalendarV3Props['style'];
}> = [
  {
    label: '日历背景色',
    value: 'backgroundColor',
  },

  {
    label: '普通日期文字色',
    value: 'textColor',
  },

  {
    label: '今日高亮色',
    value: 'todayColor',
  },
];

const mark1: Array<{
  label: string;
  value: keyof MkCalendarV3Props['style'];
}> = [
  {
    label: '文字颜色',
    value: 'mark1TextColor',
  },
  {
    label: '背景颜色',
    value: 'mark1BackgroundColor',
  },
];

const mark2: Array<{
  label: string;
  value: keyof MkCalendarV3Props['style'];
}> = [
  {
    label: '文字颜色',
    value: 'mark2TextColor',
  },
  {
    label: '背景颜色',
    value: 'mark2BackgroundColor',
  },
];

const mark1Corner: Array<{
  label: string;
  value: keyof MkCalendarV3Props['style'];
}> = [
  {
    label: '汉字颜色',
    value: 'mark1CornerTextColor',
  },
  {
    label: '背景颜色',
    value: 'mark1CornerBackgroundColor',
  },
];

const mark2Corner: Array<{
  label: string;
  value: keyof MkCalendarV3Props['style'];
}> = [
  {
    label: '汉字颜色',
    value: 'mark2CornerTextColor',
  },
  {
    label: '背景颜色',
    value: 'mark2CornerBackgroundColor',
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
  return (
    <div className='flex flex-col gap-2' key={item.value}>
      <Label className='text-xs'>{item.label}</Label>
      <div className='flex items-center gap-2'>
        <Popover>
          <PopoverTrigger>
            <div
              className='w-10 h-6 px-2 py-2 rounded-sm'
              style={{
                backgroundColor: '#f3f3f5',
              }}
            >
              <div
                className='w-full h-full'
                style={{
                  backgroundColor: (styles?.[item.value] ||
                    DEFAULT_STYLE[item.value]) as string,
                }}
              ></div>
            </div>
          </PopoverTrigger>
          <PopoverContent className='p-0'>
            <CustomColorPanel2
              color={
                (styles?.[item.value] || DEFAULT_STYLE[item.value]) as string
              }
              onChange={(colorCode: any) => {
                const hex = rgbaToHex(colorCode.rgb);
                if (hex) {
                  const newStyles = {
                    ...styles,
                    [item.value]: hex,
                  };
                  onChangeColor(newStyles);
                }
              }}
            />
          </PopoverContent>
        </Popover>

        <Input
          variantSize='xs'
          value={(styles?.[item.value] || DEFAULT_STYLE[item.value]) as string}
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

const ColorSetting = ({
  onFormValueChange,
  formControledValues,
}: {
  onFormValueChange: (values: any) => void;
  formControledValues: MkCalendarV3Props;
}) => {
  const [styles, setStyles] = useState<MkCalendarV3Props['style']>(
    formControledValues.style || {}
  );
  const [showWeekNumber, setShowWeekNumber] = useState<boolean>(
    formControledValues.showWeekNumber || false
  );
  const [visibleWeeks, setVisibleWeeks] = useState<number>(
    formControledValues?.style?.visibleWeeks || 6
  );

  const onChangeColor = (newStyles: MkCalendarV3Props['style']) => {
    setStyles(newStyles);
    onFormValueChange({
      ...formControledValues,
      style: newStyles,
    });

    EventEmitter.emit('calendarStyleChange', newStyles);
  };

  return (
    <>
      <div className='p-2 py-4 flex flex-col gap-4'>
        <div className='text-xs font-semibold flex items-center gap-1'>
          <Icon name='shezhi' size={14} />
          <span>基础样式</span>
        </div>
        <div className='flex flex-col gap-2'>
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
        </div>
        <div className='flex items-center justify-between'>
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
        </div>
        <Separator />
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
        <div className='text-xs font-semibold flex items-center gap-1'>
          <Palette size={14} />
          <span>日历颜色</span>
        </div>

        {items1.map(item => {
          return (
            <ItemSetting
              item={item}
              styles={styles}
              onChangeColor={onChangeColor}
            />
          );
        })}

        <Separator />
        <div className='text-xs font-semibold flex items-center gap-1'>
          <Palette size={14} />
          <span>被标记日期颜色</span>
        </div>
        <div className='text-xs text-gray-700'>放假日期样式</div>
        {mark1.map(item => {
          return (
            <ItemSetting
              item={item}
              styles={styles}
              onChangeColor={onChangeColor}
            />
          );
        })}

        <div className='text-xs text-gray-700'>补班日期样式</div>
        {mark2.map(item => {
          return (
            <ItemSetting
              item={item}
              styles={styles}
              onChangeColor={onChangeColor}
            />
          );
        })}

        <Separator />
        <div className='text-xs font-semibold flex items-center gap-1'>
          <Palette size={14} />
          <span>标记汉字颜色</span>
        </div>
        <div className='text-xs text-gray-700'>放假汉字</div>
        {mark1Corner.map(item => {
          return (
            <ItemSetting
              item={item}
              styles={styles}
              onChangeColor={onChangeColor}
            />
          );
        })}

        <div className='text-xs text-gray-700'>补班汉字</div>
        {mark2Corner.map(item => {
          return (
            <ItemSetting
              item={item}
              styles={styles}
              onChangeColor={onChangeColor}
            />
          );
        })}
      </div>
      <Separator />
    </>
  );
};

export default ColorSetting;

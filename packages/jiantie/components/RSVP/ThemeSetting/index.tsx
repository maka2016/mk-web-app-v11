'use client';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { Separator } from '@workspace/ui/components/separator';
import { Slider } from '@workspace/ui/components/slider';
import cls from 'classnames';
import { Palette } from 'lucide-react';
import { useState } from 'react';
import ColorPickerPopover from '../../GridV3/shared/ColorPicker';
import { colorValueBuilder } from '../../GridV3/shared/ColorPicker/utils';
import { DEFAULT_RSVP_THEME, RSVP_THEME_PRESETS, RSVPTheme } from '../type';

interface RSVPThemeSettingProps {
  onFormValueChange: (values: any) => void;
  formControledValues: any;
}

// 主要配色设置项（应用于激活状态控件和容器）
const primaryColorItems: Array<{
  label: string;
  value: keyof RSVPTheme;
  type?: 'color' | 'number' | 'text';
}> = [
  {
    label: '容器背景',
    value: 'backgroundColor',
    type: 'color',
  },
  {
    label: '主题背景',
    value: 'primaryButtonColor',
    type: 'color',
  },
  {
    label: '主题边框',
    value: 'borderColor',
    type: 'color',
  },
  {
    label: '主题文字颜色',
    value: 'primaryButtonTextColor',
    type: 'color',
  },
  {
    label: '背景虚化',
    value: 'backdropFilter',
    type: 'text',
  },
];

// 控件配色设置项（应用于不参加按钮、输入框和标签）
const controlColorItems: Array<{
  label: string;
  value: keyof RSVPTheme;
  type?: 'color' | 'number';
}> = [
  {
    label: '控件背景',
    value: 'secondaryButtonColor',
    type: 'color',
  },
  {
    label: '控件文字',
    value: 'secondaryButtonTextColor',
    type: 'color',
  },
  {
    label: '控件边框',
    value: 'secondaryButtonBorderColor',
    type: 'color',
  },
  {
    label: '标签文字',
    value: 'labelColor',
    type: 'color',
  },
  {
    label: '圆角大小',
    value: 'borderRadius',
    type: 'number',
  },
  {
    label: '边框宽度',
    value: 'borderWidth',
    type: 'number',
  },
];

// 颜色设置项组件
const ColorItemSetting = ({
  item,
  theme,
  onChangeTheme,
}: {
  item: {
    value: keyof RSVPTheme;
    label: string;
  };
  theme: RSVPTheme;
  onChangeTheme: (newTheme: RSVPTheme) => void;
}) => {
  const currentValue =
    (theme?.[item.value] as string) ||
    (DEFAULT_RSVP_THEME[item.value] as string);

  return (
    <div className='flex items-center gap-2' key={item.value}>
      <Label
        className='text-xs w-[80px] flex-shrink-0'
        style={{ fontSize: 12 }}
      >
        {item.label}
      </Label>
      <ColorPickerPopover
        value={currentValue}
        useThemeColor={false}
        disableGradient={true}
        disableAlpha={false}
        onChange={value => {
          // 优先使用 valueRgba（支持透明度），否则使用 colorValueBuilder 返回的值
          // colorValueBuilder 会返回 value.value 或 value.hex
          const colorValue = value?.valueRgba || colorValueBuilder(value);
          if (colorValue) {
            const newTheme = {
              ...theme,
              [item.value]: colorValue,
            };
            onChangeTheme(newTheme);
          }
        }}
        wrapper={() => (
          <div
            className='w-8 h-6 rounded-sm cursor-pointer border border-gray-200 flex-shrink-0'
            style={{
              backgroundColor: '#f3f3f5',
            }}
          >
            <div
              className='w-full h-full rounded-sm'
              style={{
                backgroundColor: currentValue,
              }}
            />
          </div>
        )}
      />
      <Input
        variantSize='xs'
        value={currentValue}
        className='flex-1 h-6 text-xs'
        style={{
          backgroundColor: '#f3f3f5',
          border: 'none',
        }}
        onChange={e => {
          const newTheme = {
            ...theme,
            [item.value]: e.target.value,
          };
          onChangeTheme(newTheme);
        }}
      />
    </div>
  );
};

// 文本设置项组件（用于背景虚化等文本输入）
const TextItemSetting = ({
  item,
  theme,
  onChangeTheme,
  getValue,
}: {
  item: {
    value: keyof RSVPTheme;
    label: string;
  };
  theme: RSVPTheme;
  onChangeTheme: (newTheme: RSVPTheme) => void;
  getValue: (key: keyof RSVPTheme) => any;
}) => {
  const currentValue = (getValue(item.value) as string) || '';

  return (
    <div className='flex items-center gap-2'>
      <Label
        className='text-xs w-[80px] flex-shrink-0'
        style={{ fontSize: 12 }}
      >
        {item.label}
      </Label>
      <Input
        variantSize='xs'
        value={currentValue}
        className='flex-1 h-6 text-xs'
        style={{
          backgroundColor: '#f3f3f5',
          border: 'none',
        }}
        placeholder='例如: blur(16px) saturate(180%)'
        onChange={e => {
          const newTheme = {
            ...theme,
            [item.value]: e.target.value || 'none',
          };
          onChangeTheme(newTheme);
        }}
      />
    </div>
  );
};

// 数字设置项组件（用于圆角大小和边框宽度）
const NumberItemSetting = ({
  item,
  theme,
  onChangeTheme,
  min = 0,
  max = 30,
  draggingValue,
  setDraggingValue,
  getValue,
}: {
  item: {
    value: keyof RSVPTheme;
    label: string;
  };
  theme: RSVPTheme;
  onChangeTheme: (newTheme: RSVPTheme) => void;
  min?: number;
  max?: number;
  draggingValue: number | null;
  setDraggingValue: (value: number | null) => void;
  getValue: (key: keyof RSVPTheme) => any;
}) => {
  const currentValue = getValue(item.value) as number;

  return (
    <div className='flex items-center gap-2'>
      <Label
        className='text-xs w-[80px] flex-shrink-0'
        style={{ fontSize: 12 }}
      >
        {item.label}
      </Label>
      <div className='flex-1 flex items-center gap-2'>
        <Slider
          value={[draggingValue !== null ? draggingValue : currentValue]}
          min={min}
          max={max}
          step={1}
          onValueChange={values => {
            setDraggingValue(values[0]);
          }}
          onValueCommit={values => {
            setDraggingValue(null);
            onChangeTheme({ ...theme, [item.value]: values[0] });
          }}
          className='flex-1'
        />
        <span className='text-xs text-gray-600 w-[40px] flex-shrink-0 text-right'>
          {draggingValue !== null ? draggingValue : currentValue}px
        </span>
      </div>
    </div>
  );
};

export default function RSVPThemeSetting({
  onFormValueChange,
  formControledValues,
}: RSVPThemeSettingProps) {
  // 初始化主题，确保控件配色同步到输入框和占位符
  const initializeTheme = (themeValue: RSVPTheme = {}) => {
    const merged = { ...DEFAULT_RSVP_THEME, ...themeValue };
    // 如果输入框颜色未设置，使用控件配色
    if (!themeValue.inputBackgroundColor && merged.secondaryButtonColor) {
      merged.inputBackgroundColor = merged.secondaryButtonColor;
    }
    if (!themeValue.inputTextColor && merged.secondaryButtonTextColor) {
      merged.inputTextColor = merged.secondaryButtonTextColor;
    }
    if (!themeValue.inputBorderColor && merged.secondaryButtonBorderColor) {
      merged.inputBorderColor = merged.secondaryButtonBorderColor;
    }
    // 占位符颜色使用控件文字颜色
    if (!themeValue.inputPlaceholderColor && merged.secondaryButtonTextColor) {
      merged.inputPlaceholderColor = merged.secondaryButtonTextColor;
    }
    return merged;
  };

  const [theme, setTheme] = useState<RSVPTheme>(() =>
    initializeTheme(formControledValues?.theme)
  );

  // 用于拖动过程中的临时值
  const [draggingBorderRadius, setDraggingBorderRadius] = useState<
    number | null
  >(null);
  const [draggingBorderWidth, setDraggingBorderWidth] = useState<number | null>(
    null
  );

  // 检查当前主题是否匹配某个预设
  const getCurrentPreset = (themeToCheck: RSVPTheme = theme): string | null => {
    const currentTheme = { ...DEFAULT_RSVP_THEME, ...themeToCheck };
    for (const [presetKey, presetTheme] of Object.entries(RSVP_THEME_PRESETS)) {
      let isMatch = true;
      // 只比较预设主题中定义的字段
      for (const key in presetTheme) {
        const presetValue = presetTheme[key as keyof RSVPTheme];
        const currentValue = currentTheme[key as keyof RSVPTheme];

        // 对于占位符颜色，如果预设中定义了，需要精确匹配
        // 但如果当前主题中占位符颜色等于控件文字颜色（自动同步的结果），也应该视为匹配
        if (key === 'inputPlaceholderColor') {
          const expectedPlaceholder = presetValue;
          const actualPlaceholder = currentValue;
          const controlTextColor = currentTheme.secondaryButtonTextColor;

          // 匹配条件：精确匹配，或者等于控件文字颜色（自动同步的情况）
          if (
            actualPlaceholder !== expectedPlaceholder &&
            actualPlaceholder !== controlTextColor
          ) {
            isMatch = false;
            break;
          }
        } else {
          // 其他字段需要精确匹配
          if (currentValue !== presetValue) {
            isMatch = false;
            break;
          }
        }
      }
      if (isMatch) {
        return presetKey;
      }
    }
    return null;
  };

  const [selectedPreset, setSelectedPreset] = useState<string | null>(() =>
    getCurrentPreset()
  );

  // 获取当前值或默认值
  const getValue = (key: keyof RSVPTheme) => {
    return theme?.[key] ?? DEFAULT_RSVP_THEME[key];
  };

  // 应用预设主题
  const applyPreset = (presetKey: string) => {
    const presetTheme = RSVP_THEME_PRESETS[presetKey];
    if (presetTheme) {
      setSelectedPreset(presetKey);
      // 直接设置预设主题，不触发自动同步（因为预设主题已经包含所有字段）
      setTheme(presetTheme);
      onFormValueChange({
        ...formControledValues,
        theme: presetTheme,
      });
    }
  };

  const onChangeTheme = (newTheme: RSVPTheme) => {
    // 如果修改了控件配色，自动同步到输入框和占位符
    const syncedTheme = { ...newTheme };
    if (newTheme.secondaryButtonColor !== undefined) {
      syncedTheme.inputBackgroundColor = newTheme.secondaryButtonColor;
    }
    if (newTheme.secondaryButtonTextColor !== undefined) {
      syncedTheme.inputTextColor = newTheme.secondaryButtonTextColor;
      // 占位符颜色使用控件文字颜色
      syncedTheme.inputPlaceholderColor = newTheme.secondaryButtonTextColor;
    }
    if (newTheme.secondaryButtonBorderColor !== undefined) {
      syncedTheme.inputBorderColor = newTheme.secondaryButtonBorderColor;
    }

    setTheme(syncedTheme);
    // 检查是否匹配预设
    const currentPreset = getCurrentPreset(syncedTheme);
    setSelectedPreset(currentPreset);
    onFormValueChange({
      ...formControledValues,
      theme: syncedTheme,
    });
  };

  return (
    <div className='p-2 py-4 flex flex-col gap-4'>
      {/* 预设配色方案 */}
      <div>
        <div className='text-xs font-semibold flex items-center gap-1 mb-3'>
          <Palette size={14} />
          <span>预设配色</span>
        </div>
        <div className='grid grid-cols-3 gap-2'>
          <button
            onClick={() => applyPreset('white')}
            className={cls(
              'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all',
              selectedPreset === 'white'
                ? 'border-[#09090B] bg-[#f3f4f6]'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            )}
          >
            <div
              className='w-full h-12 rounded-md border border-gray-200'
              style={{
                backgroundColor: RSVP_THEME_PRESETS.white.backgroundColor,
              }}
            />
            <span className='text-xs font-medium'>白色</span>
          </button>
          <button
            onClick={() => applyPreset('glass')}
            className={cls(
              'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all',
              selectedPreset === 'glass'
                ? 'border-[#09090B] bg-[#f3f4f6]'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            )}
          >
            <div
              className='w-full h-12 rounded-[20px] relative overflow-hidden'
              style={{
                backgroundImage: `repeating-linear-gradient(
                  45deg,
                  #e5e5e5 0px,
                  #e5e5e5 8px,
                  #f5f5f5 8px,
                  #f5f5f5 16px
                )`,
                boxShadow:
                  '0 4px 20px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div
                className='absolute inset-0'
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.75)',
                  backdropFilter: RSVP_THEME_PRESETS.glass.backdropFilter,
                  WebkitBackdropFilter: RSVP_THEME_PRESETS.glass.backdropFilter,
                  border: '1px solid rgba(255, 255, 255, 0.6)',
                }}
              />
              {/* 预览按钮 */}
              <div className='absolute bottom-1 right-1'>
                <div
                  className='h-5 px-2 rounded-md flex items-center justify-center'
                  style={{
                    backgroundColor: 'rgba(0, 122, 255, 0.9)',
                  }}
                >
                  <span className='text-[8px] text-white font-medium'>
                    按钮
                  </span>
                </div>
              </div>
            </div>
            <span className='text-xs font-medium'>毛玻璃</span>
          </button>
          <button
            onClick={() => applyPreset('black')}
            className={cls(
              'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all',
              selectedPreset === 'black'
                ? 'border-[#09090B] bg-[#f3f4f6]'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            )}
          >
            <div
              className='w-full h-12 rounded-md border border-gray-700'
              style={{
                backgroundColor: RSVP_THEME_PRESETS.black.backgroundColor,
              }}
            />
            <span className='text-xs font-medium'>黑色</span>
          </button>
        </div>
      </div>

      <Separator />

      {/* 主要配色设置 */}
      <div>
        <div className='text-xs font-semibold flex items-center gap-1 mb-3'>
          <Palette size={14} />
          <span>主要配色</span>
        </div>
        <div className='flex flex-col gap-2'>
          {primaryColorItems.map(item => {
            if (item.type === 'number') {
              // 数字类型（目前没有，保留以备将来使用）
              return null;
            } else if (item.type === 'text') {
              // 文本类型：背景虚化
              return (
                <TextItemSetting
                  key={item.value}
                  item={item}
                  theme={theme}
                  onChangeTheme={onChangeTheme}
                  getValue={getValue}
                />
              );
            } else {
              // 颜色类型
              return (
                <ColorItemSetting
                  key={item.value}
                  item={item}
                  theme={theme}
                  onChangeTheme={onChangeTheme}
                />
              );
            }
          })}
        </div>
      </div>

      <Separator />

      {/* 控件配色设置 */}
      <div>
        <div className='text-xs font-semibold flex items-center gap-1 mb-3'>
          <Palette size={14} />
          <span>控件配色</span>
        </div>
        <div className='flex flex-col gap-2'>
          {controlColorItems.map(item => {
            if (item.type === 'number') {
              // 数字类型：圆角大小或边框宽度
              const isBorderRadius = item.value === 'borderRadius';
              return (
                <NumberItemSetting
                  key={item.value}
                  item={item}
                  theme={theme}
                  onChangeTheme={onChangeTheme}
                  min={isBorderRadius ? 0 : 0}
                  max={isBorderRadius ? 30 : 10}
                  draggingValue={
                    isBorderRadius ? draggingBorderRadius : draggingBorderWidth
                  }
                  setDraggingValue={
                    isBorderRadius
                      ? setDraggingBorderRadius
                      : setDraggingBorderWidth
                  }
                  getValue={getValue}
                />
              );
            } else {
              // 颜色类型
              return (
                <ColorItemSetting
                  key={item.value}
                  item={item}
                  theme={theme}
                  onChangeTheme={onChangeTheme}
                />
              );
            }
          })}
        </div>
      </div>
    </div>
  );
}

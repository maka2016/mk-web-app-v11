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
  { label: '主题背景', value: 'primaryButtonColor', type: 'color' },
  { label: '主题边框', value: 'borderColor', type: 'color' },
  { label: '主题文字', value: 'primaryButtonTextColor', type: 'color' },
  { label: '正文文字', value: 'textColor', type: 'color' },
  {
    label: '背景虚化',
    value: 'backdropFilter',
    type: 'text',
  },
  {
    label: '容器阴影',
    value: 'boxShadow',
    type: 'text',
  },
];

const buttonStyleItems: Array<{ label: string; value: keyof RSVPTheme }> = [
  { label: '按钮背景', value: 'secondaryButtonColor' },
  { label: '按钮文字', value: 'secondaryButtonTextColor' },
  { label: '按钮边框', value: 'secondaryButtonBorderColor' },
];

const inputFieldItems: Array<{ label: string; value: keyof RSVPTheme }> = [
  { label: '输入背景', value: 'inputBackgroundColor' },
  { label: '输入边框', value: 'inputBorderColor' },
  { label: '输入文字', value: 'inputTextColor' },
  { label: '占位符', value: 'inputPlaceholderColor' },
];

const textStyleItems: Array<{ label: string; value: keyof RSVPTheme }> = [
  { label: '标签文字', value: 'labelColor' },
];

const dimensionItems: Array<{
  label: string;
  value: keyof RSVPTheme;
  min?: number;
  max?: number;
  step?: number;
  presets?: number[];
}> = [
  {
    label: '控件字号',
    value: 'controlFontSize',
    min: 10,
    max: 28,
    step: 1,
    presets: [12, 14, 16, 18, 20],
  },
  {
    label: '圆角大小',
    value: 'borderRadius',
    min: 0,
    max: 30,
    step: 1,
  },
  {
    label: '边框宽度',
    value: 'borderWidth',
    min: 0,
    max: 10,
    step: 1,
  },
  {
    label: '控件内间距',
    value: 'controlPadding',
    min: 4,
    max: 32,
    step: 4,
    presets: [4, 8, 12, 16],
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
  onChangeTheme: (newTheme: RSVPTheme, changedKey: keyof RSVPTheme) => void;
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
            onChangeTheme(newTheme, item.value);
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
          onChangeTheme(newTheme, item.value);
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
  onChangeTheme: (newTheme: RSVPTheme, changedKey: keyof RSVPTheme) => void;
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
          onChangeTheme(newTheme, item.value);
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
  step = 1,
  suffix = 'px',
  presets,
  currentValue,
}: {
  item: {
    value: keyof RSVPTheme;
    label: string;
  };
  theme: RSVPTheme;
  onChangeTheme: (newTheme: RSVPTheme, changedKey: keyof RSVPTheme) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  presets?: number[];
  currentValue: number;
}) => {
  const [draftNumber, setDraftNumber] = useState<number | null>(null);
  const [inputText, setInputText] = useState<string>('');

  const clampValue = (value: number) =>
    Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

  const commitValue = (value: number) => {
    const clamped = clampValue(value);
    onChangeTheme({ ...theme, [item.value]: clamped }, item.value);
  };

  const effectiveNumber = draftNumber ?? currentValue;
  const displayText =
    inputText !== ''
      ? inputText
      : String(Math.round(effectiveNumber * 100) / 100);

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center gap-2'>
        <Label
          className='text-xs w-[80px] flex-shrink-0'
          style={{ fontSize: 12 }}
        >
          {item.label}
        </Label>
        <div className='flex-1 flex items-center gap-2'>
          <Slider
            value={[clampValue(effectiveNumber)]}
            min={min}
            max={max}
            step={step}
            onValueChange={values => {
              const next = values[0];
              setDraftNumber(next);
              setInputText(String(next));
            }}
            onValueCommit={values => {
              const next = clampValue(values[0]);
              commitValue(next);
              setDraftNumber(null);
              setInputText('');
            }}
            className='flex-1'
          />
          <div className='flex items-center gap-1 w-[80px]'>
            <Input
              variantSize='xs'
              type='number'
              inputMode='numeric'
              value={displayText}
              className='h-6 text-xs text-right'
              style={{
                backgroundColor: '#f3f3f5',
                border: 'none',
              }}
              min={min}
              max={max}
              step={step}
              onChange={e => {
                const raw = e.target.value;
                setInputText(raw);
                if (raw.trim() === '') {
                  setDraftNumber(null);
                  return;
                }
                const numeric = Number(raw);
                if (!Number.isNaN(numeric)) {
                  setDraftNumber(numeric);
                }
              }}
              onBlur={() => {
                if (inputText.trim() === '') {
                  setDraftNumber(null);
                  setInputText('');
                  return;
                }
                const numeric = Number(inputText);
                if (!Number.isNaN(numeric)) {
                  commitValue(numeric);
                }
                setDraftNumber(null);
                setInputText('');
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  if (inputText.trim() === '') {
                    setDraftNumber(null);
                    setInputText('');
                    return;
                  }
                  const numeric = Number(inputText);
                  if (!Number.isNaN(numeric)) {
                    commitValue(numeric);
                  }
                  setDraftNumber(null);
                  setInputText('');
                }
                if (e.key === 'Escape') {
                  setDraftNumber(null);
                  setInputText('');
                }
              }}
            />
            <span className='text-xs text-gray-600'>{suffix}</span>
          </div>
        </div>
      </div>
      {presets && presets.length > 0 ? (
        <div className='flex flex-wrap items-center gap-2 pl-[80px]'>
          {presets.map(presetValue => {
            const isActive = currentValue === presetValue;
            return (
              <button
                key={presetValue}
                type='button'
                className={cls(
                  'px-2 py-1 text-xs rounded border transition-colors',
                  isActive
                    ? 'border-[#09090B] bg-[#f3f4f6] text-[#09090B]'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-800'
                )}
                onClick={() => {
                  commitValue(presetValue);
                  setDraftNumber(null);
                  setInputText('');
                }}
              >
                {presetValue}
              </button>
            );
          })}
        </div>
      ) : null}
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

  const onChangeTheme = (newTheme: RSVPTheme, changedKey?: keyof RSVPTheme) => {
    const syncedTheme = { ...newTheme };

    if (changedKey === 'secondaryButtonColor') {
      syncedTheme.inputBackgroundColor = newTheme.secondaryButtonColor;
    }

    if (changedKey === 'secondaryButtonTextColor') {
      syncedTheme.inputTextColor = newTheme.secondaryButtonTextColor;
      syncedTheme.inputPlaceholderColor = newTheme.secondaryButtonTextColor;
    }

    if (changedKey === 'secondaryButtonBorderColor') {
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

      {/* 控件样式设置 */}
      <div>
        <div className='text-xs font-semibold flex items-center gap-1 mb-3'>
          <Palette size={14} />
          <span>控件样式</span>
        </div>
        <div className='flex flex-col gap-4'>
          <div>
            <div className='text-[11px] font-medium text-gray-500 mb-2'>
              按钮
            </div>
            <div className='flex flex-col gap-2'>
              {buttonStyleItems.map(item => (
                <ColorItemSetting
                  key={item.value}
                  item={item}
                  theme={theme}
                  onChangeTheme={onChangeTheme}
                />
              ))}
            </div>
          </div>
          <div>
            <div className='text-[11px] font-medium text-gray-500 mb-2'>
              输入框
            </div>
            <div className='flex flex-col gap-2'>
              {inputFieldItems.map(item => (
                <ColorItemSetting
                  key={item.value}
                  item={item}
                  theme={theme}
                  onChangeTheme={onChangeTheme}
                />
              ))}
            </div>
          </div>
          <div>
            <div className='text-[11px] font-medium text-gray-500 mb-2'>
              文本
            </div>
            <div className='flex flex-col gap-2'>
              {textStyleItems.map(item => (
                <ColorItemSetting
                  key={item.value}
                  item={item}
                  theme={theme}
                  onChangeTheme={onChangeTheme}
                />
              ))}
            </div>
          </div>
          <div>
            <div className='text-[11px] font-medium text-gray-500 mb-2'>
              布局
            </div>
            <div className='flex flex-col gap-2'>
              {dimensionItems.map(item => (
                <NumberItemSetting
                  key={`${item.value}-${getValue(item.value)}`}
                  item={{ value: item.value, label: item.label }}
                  theme={theme}
                  onChangeTheme={onChangeTheme}
                  min={item.min}
                  max={item.max}
                  step={item.step}
                  presets={item.presets}
                  currentValue={Number(getValue(item.value) ?? 0)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

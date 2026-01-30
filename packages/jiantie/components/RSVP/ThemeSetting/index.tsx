'use client';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import {
  RadioGroup,
  RadioGroupItem,
} from '@workspace/ui/components/radio-group';
import { Separator } from '@workspace/ui/components/separator';
import { Slider } from '@workspace/ui/components/slider';
import cls from 'classnames';
import { ChevronDown, Palette } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import ColorPickerPopover from '../../GridEditorV3/components/ColorPicker';
import { colorValueBuilder } from '../../GridEditorV3/components/ColorPicker/utils';
import { SettingItemFor4Value } from '../../GridEditorV3/componentsForEditor/ElementAttrsEditorV2/SettingItemFor4Value';
import {
  DEFAULT_RSVP_THEME,
  LEGACY_RSVP_DISPLAY_MODE,
  RSVP_THEME_PRESETS,
  RSVPDisplayMode,
  RSVPTheme,
} from '../type';

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

const displayModeOptions: Array<{
  value: RSVPDisplayMode;
  title: string;
}> = [
  {
    value: 'canvas_trigger',
    title: '触发按钮',
  },
  {
    value: 'inline',
    title: '内嵌画布',
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

// 通用 Padding 输入组件（支持 CSS padding 规则：1-4 个值）
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PaddingInputSetting = ({
  label,
  theme,
  onChangeTheme,
  // 读取值的函数：返回 padding 值的字符串表示（如 "8 16" 或 "16"）
  getPaddingValue,
  // 写入值的函数：根据 padding 字符串更新主题
  setPaddingValue,
  placeholder = '8 16',
}: {
  label: string;
  theme: RSVPTheme;
  onChangeTheme: (newTheme: RSVPTheme, changedKey: keyof RSVPTheme) => void;
  getPaddingValue: () => string;
  setPaddingValue: (value: string) => {
    newTheme: RSVPTheme;
    changedKey: keyof RSVPTheme;
  };
  placeholder?: string;
}) => {
  const initialValue = getPaddingValue();
  const [inputValue, setInputValue] = useState<string>(initialValue);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const prevValueRef = useRef<string>(initialValue);

  const handleChange = (value: string) => {
    setInputValue(value);
    setIsEditing(true);
  };

  const parseAndValidate = (value: string): number[] | null => {
    const parts = value
      .trim()
      .split(/\s+/)
      .filter(p => p !== '');
    if (parts.length === 0) return null;

    const numbers = parts.map(p => Number(p));
    // 检查是否所有值都是有效的数字且 >= 0
    if (numbers.some(n => Number.isNaN(n) || n < 0)) {
      return null;
    }

    // 根据 CSS padding 规则处理不同数量的值
    // 1个值: 所有方向相同
    // 2个值: 垂直 水平
    // 3个值: 上 水平 下
    // 4个值: 上 右 下 左
    if (numbers.length === 1) {
      return [numbers[0], numbers[0], numbers[0], numbers[0]];
    } else if (numbers.length === 2) {
      return [numbers[0], numbers[1], numbers[0], numbers[1]];
    } else if (numbers.length === 3) {
      return [numbers[0], numbers[1], numbers[2], numbers[1]];
    } else if (numbers.length === 4) {
      return numbers;
    } else {
      // 超过4个值，取前4个
      return numbers.slice(0, 4);
    }
  };

  const formatPaddingValue = (numbers: number[]): string => {
    // 如果所有值相同，返回单个值
    if (
      numbers.length === 4 &&
      numbers[0] === numbers[1] &&
      numbers[1] === numbers[2] &&
      numbers[2] === numbers[3]
    ) {
      return String(numbers[0]);
    }
    // 如果垂直方向相同，水平方向相同，返回 "垂直 水平"
    if (
      numbers.length === 4 &&
      numbers[0] === numbers[2] &&
      numbers[1] === numbers[3]
    ) {
      return `${numbers[0]} ${numbers[1]}`;
    }
    // 其他情况返回完整值
    return numbers.join(' ');
  };

  const handleBlur = () => {
    setIsEditing(false);
    const numbers = parseAndValidate(inputValue);
    if (numbers) {
      const formatted = formatPaddingValue(numbers);
      const { newTheme, changedKey } = setPaddingValue(formatted);
      onChangeTheme(newTheme, changedKey);
      setInputValue(formatted);
      prevValueRef.current = formatted;
    } else {
      // 无效输入，恢复原值
      setInputValue(prevValueRef.current);
    }
  };

  // 监听主题变化，同步输入框（仅在非编辑状态下）
  // 使用 JSON.stringify 来检测 theme 对象的深层变化
  const themeKey = JSON.stringify(theme);
  useLayoutEffect(() => {
    if (!isEditing) {
      const latestValue = getPaddingValue();
      if (latestValue !== prevValueRef.current) {
        prevValueRef.current = latestValue;
        setInputValue(latestValue);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeKey, isEditing]);

  return (
    <div className='flex items-center gap-2'>
      <Label
        className='text-xs w-[80px] flex-shrink-0'
        style={{ fontSize: 12 }}
      >
        {label}
      </Label>
      <div className='flex items-center gap-1 flex-1'>
        <Input
          variantSize='xs'
          value={inputValue}
          className='h-6 text-xs flex-1'
          style={{
            backgroundColor: '#f3f3f5',
            border: 'none',
          }}
          placeholder={placeholder}
          onChange={e => handleChange(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              handleBlur();
            }
          }}
        />
        <span className='text-xs text-gray-600'>px</span>
      </div>
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

  const currentDisplayMode: RSVPDisplayMode =
    (formControledValues?.displayMode as RSVPDisplayMode) ??
    LEGACY_RSVP_DISPLAY_MODE;

  const handleDisplayModeChange = (mode: RSVPDisplayMode) => {
    if (mode === currentDisplayMode) return;
    onFormValueChange({
      ...(formControledValues || {}),
      displayMode: mode,
    });
  };

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
      <div className='space-y-3'>
        <div>
          <div className='text-xs font-semibold text-[#09090B]'>显示模式</div>
          <p className='text-[11px] text-black/60 mt-1'>
            选择回执在画布中的展示与交互方式
          </p>
        </div>
        <RadioGroup
          value={currentDisplayMode}
          onValueChange={value =>
            handleDisplayModeChange(value as RSVPDisplayMode)
          }
          className='flex flex-row gap-2'
        >
          {displayModeOptions.map(option => (
            <label
              key={option.value}
              htmlFor={`display-mode-${option.value}`}
              className={cls(
                'flex-1 flex items-center gap-1 border rounded-lg p-2 cursor-pointer transition-colors',
                currentDisplayMode === option.value
                  ? 'border-[#09090B] bg-black/[0.02]'
                  : 'border-black/[0.08] hover:border-[#09090B]/40'
              )}
            >
              <RadioGroupItem
                id={`display-mode-${option.value}`}
                value={option.value}
              />
              <div className='flex flex-col'>
                <div className='text-xs text-[#09090B]'>{option.title}</div>
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>

      {/* 预设配色方案 */}
      <Collapsible defaultOpen={true}>
        <CollapsibleTrigger className='w-full flex items-center justify-between mb-3'>
          <div className='text-xs font-semibold flex items-center gap-1'>
            <Palette size={14} />
            <span>预设配色</span>
          </div>
          <ChevronDown
            size={14}
            className='text-gray-500 transition-transform duration-200 data-[state=open]:rotate-180'
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
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
                    WebkitBackdropFilter:
                      RSVP_THEME_PRESETS.glass.backdropFilter,
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
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* 主要配色设置 */}
      <Collapsible defaultOpen={true}>
        <CollapsibleTrigger className='w-full flex items-center justify-between mb-3'>
          <div className='text-xs font-semibold flex items-center gap-1'>
            <Palette size={14} />
            <span>主要配色</span>
          </div>
          <ChevronDown
            size={14}
            className='text-gray-500 transition-transform duration-200 data-[state=open]:rotate-180'
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
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
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* 控件样式设置 */}
      <Collapsible defaultOpen={true}>
        <CollapsibleTrigger className='w-full flex items-center justify-between mb-3'>
          <div className='text-xs font-semibold flex items-center gap-1'>
            <Palette size={14} />
            <span>控件样式</span>
          </div>
          <ChevronDown
            size={14}
            className='text-gray-500 transition-transform duration-200 data-[state=open]:rotate-180'
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className='flex flex-col gap-4'>
            <Collapsible defaultOpen={true}>
              <CollapsibleTrigger className='w-full flex items-center justify-between mb-2'>
                <div className='text-[11px] font-medium text-gray-500'>
                  按钮
                </div>
                <ChevronDown
                  size={12}
                  className='text-gray-400 transition-transform duration-200 data-[state=open]:rotate-180'
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
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
              </CollapsibleContent>
            </Collapsible>
            <Collapsible defaultOpen={true}>
              <CollapsibleTrigger className='w-full flex items-center justify-between mb-2'>
                <div className='text-[11px] font-medium text-gray-500'>
                  输入框
                </div>
                <ChevronDown
                  size={12}
                  className='text-gray-400 transition-transform duration-200 data-[state=open]:rotate-180'
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
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
              </CollapsibleContent>
            </Collapsible>
            <Collapsible defaultOpen={true}>
              <CollapsibleTrigger className='w-full flex items-center justify-between mb-2'>
                <div className='text-[11px] font-medium text-gray-500'>
                  文本
                </div>
                <ChevronDown
                  size={12}
                  className='text-gray-400 transition-transform duration-200 data-[state=open]:rotate-180'
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
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
              </CollapsibleContent>
            </Collapsible>
            <Collapsible defaultOpen={true}>
              <CollapsibleTrigger className='w-full flex items-center justify-between mb-2'>
                <div className='text-[11px] font-medium text-gray-500'>
                  布局
                </div>
                <ChevronDown
                  size={12}
                  className='text-gray-400 transition-transform duration-200 data-[state=open]:rotate-180'
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
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
              </CollapsibleContent>
            </Collapsible>
            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger className='w-full flex items-center justify-between mb-2'>
                <div className='text-[11px] font-medium text-gray-500'>
                  内边距
                </div>
                <ChevronDown
                  size={12}
                  className='text-gray-400 transition-transform duration-200 data-[state=open]:rotate-180'
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className='flex flex-col gap-2'>
                  <div className='text-[11px] font-medium text-gray-500 mb-2'>
                    标题内间距
                  </div>
                  <SettingItemFor4Value
                    value={String(getValue('headerPadding') ?? 0)}
                    label='标题内间距'
                    inputOnly={true}
                    // shortcutData={paddingData}
                    onChange={nextValue => {
                      onChangeTheme(
                        {
                          ...theme,
                          headerPadding: nextValue,
                        },
                        'headerPadding'
                      );
                    }}
                  />
                  <div className='text-[11px] font-medium text-gray-500 mb-2'>
                    内容内间距
                  </div>
                  <SettingItemFor4Value
                    value={String(getValue('contentPadding') ?? 0)}
                    label='内容内间距'
                    inputOnly={true}
                    // shortcutData={paddingData}
                    onChange={nextValue => {
                      onChangeTheme(
                        {
                          ...theme,
                          contentPadding: nextValue,
                        },
                        'contentPadding'
                      );
                    }}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

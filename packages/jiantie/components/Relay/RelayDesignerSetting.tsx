import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { Separator } from '@workspace/ui/components/separator';
import { cn } from '@workspace/ui/lib/utils';
import { ChevronDown, Palette } from 'lucide-react';
import { useEffect, useState } from 'react';
import ColorPicker from '../GridEditorV3/components/ColorPicker';
import {
  DEFAULT_RELAY_THEME,
  RELAY_THEME_PRESETS,
  RelayAttrs,
  RelayTheme,
} from './type';

// 颜色设置项组件
const ColorItemSetting = ({
  item,
  theme,
  onChange,
}: {
  item: {
    value: keyof RelayTheme;
    label: string;
  };
  theme: RelayTheme;
  onChange: (newTheme: RelayTheme) => void;
}) => {
  const currentColor =
    (theme?.[item.value] as string) ||
    (DEFAULT_RELAY_THEME[item.value] as string) ||
    '';

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
            onChange({
              ...theme,
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
            onChange({
              ...theme,
              [item.value]: e.target.value,
            });
          }}
        />
      </div>
    </div>
  );
};

// 数值设置项组件
const NumberItemSetting = ({
  item,
  theme,
  onChange,
  min,
  max,
  step = 1,
}: {
  item: {
    value: keyof RelayTheme;
    label: string;
  };
  theme: RelayTheme;
  onChange: (newTheme: RelayTheme) => void;
  min?: number;
  max?: number;
  step?: number;
}) => {
  const currentValue =
    (theme?.[item.value] as number) ??
    (DEFAULT_RELAY_THEME[item.value] as number) ??
    0;

  return (
    <div className='flex gap-2 items-center' key={item.value}>
      <Label className='text-xs whitespace-nowrap flex-shrink-0 min-w-[40px]'>
        {item.label}
      </Label>
      <div className='flex items-center gap-2 flex-1'>
        <Input
          variantSize='xs'
          type='number'
          min={min}
          max={max}
          step={step}
          value={currentValue}
          style={{
            backgroundColor: '#f3f3f5',
            border: 'none',
          }}
          onChange={e => {
            const value = parseFloat(e.target.value);
            if (!isNaN(value)) {
              if (min !== undefined && value < min) return;
              if (max !== undefined && value > max) return;
              onChange({
                ...theme,
                [item.value]: value,
              });
            }
          }}
        />
      </div>
    </div>
  );
};

interface RelayDesignerSettingProps {
  onFormValueChange: (values: any) => void;
  formControledValues: RelayAttrs & { theme?: RelayTheme };
  elemId: string;
}

const RelayDesignerSetting = ({
  onFormValueChange,
  formControledValues,
}: RelayDesignerSettingProps) => {
  // 检查当前主题是否匹配某个预设
  const getCurrentPreset = (themeToCheck: RelayTheme): string | null => {
    const currentTheme = { ...DEFAULT_RELAY_THEME, ...themeToCheck };
    for (const [presetKey, presetTheme] of Object.entries(RELAY_THEME_PRESETS)) {
      let isMatch = true;
      // 只比较预设主题中定义的字段
      for (const key in presetTheme) {
        const presetValue = presetTheme[key as keyof RelayTheme];
        const currentValue = currentTheme[key as keyof RelayTheme];

        // 需要精确匹配
        if (currentValue !== presetValue) {
          isMatch = false;
          break;
        }
      }
      if (isMatch) {
        return presetKey;
      }
    }
    return null;
  };

  const initialTheme = formControledValues.theme || DEFAULT_RELAY_THEME;
  const [theme, setTheme] = useState<RelayTheme>(initialTheme);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(() =>
    getCurrentPreset(initialTheme)
  );

  // 同步外部传入的 theme 更新
  useEffect(() => {
    if (formControledValues.theme) {
      setTheme(formControledValues.theme);
      // 更新预设选择状态
      const currentPreset = getCurrentPreset(formControledValues.theme);
      setSelectedPreset(currentPreset);
    }
  }, [formControledValues.theme]);

  // 应用预设主题
  const applyPreset = (presetKey: string) => {
    const presetTheme = RELAY_THEME_PRESETS[presetKey];
    if (presetTheme) {
      setSelectedPreset(presetKey);
      setTheme(presetTheme);
      onFormValueChange({
        ...formControledValues,
        theme: presetTheme,
      });
    }
  };

  const handleThemeChange = (newTheme: RelayTheme) => {
    setTheme(newTheme);
    // 检查是否匹配预设
    const currentPreset = getCurrentPreset(newTheme);
    setSelectedPreset(currentPreset);
    onFormValueChange({
      ...formControledValues,
      theme: newTheme,
    });
  };

  // 按钮相关颜色设置项
  const buttonColorItems: Array<{
    value: keyof RelayTheme;
    label: string;
  }> = [
    {
      label: '按钮背景',
      value: 'buttonColor',
    },
    {
      label: '按钮文字',
      value: 'buttonTextColor',
    },
    {
      label: '已接力背景',
      value: 'buttonDisabledColor',
    },
    {
      label: '已接力文字',
      value: 'buttonDisabledTextColor',
    },
  ];

  // 列表相关样式设置项
  const listColorItems: Array<{
    value: keyof RelayTheme;
    label: string;
  }> = [
    {
      label: '列表背景',
      value: 'listBackgroundColor',
    },
    {
      label: '列表项背景',
      value: 'listItemBackgroundColor',
    },
    {
      label: '列表文字',
      value: 'listTextColor',
    },
    {
      label: '列表边框',
      value: 'listBorderColor',
    },
  ];

  // 头像相关样式设置项
  const avatarColorItems: Array<{
    value: keyof RelayTheme;
    label: string;
  }> = [
    {
      label: '头像边框',
      value: 'avatarBorderColor',
    },
  ];

  // 文字相关颜色设置项
  const textColorItems: Array<{
    value: keyof RelayTheme;
    label: string;
  }> = [
    {
      label: '主要文字',
      value: 'textColor',
    },
    {
      label: '次要文字',
      value: 'secondaryTextColor',
    },
    {
      label: '标题文字',
      value: 'titleTextColor',
    },
  ];

  return (
    <>
      <div className='p-2 py-4 flex flex-col gap-4'>
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
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all',
                  selectedPreset === 'white'
                    ? 'border-[#09090B] bg-[#f3f4f6]'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                )}
              >
                <div
                  className='w-full h-12 rounded-md border border-gray-200'
                  style={{
                    backgroundColor: RELAY_THEME_PRESETS.white.listItemBackgroundColor,
                  }}
                />
                <span className='text-xs font-medium'>白色</span>
              </button>
              <button
                onClick={() => applyPreset('glass')}
                className={cn(
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
                      backgroundColor: RELAY_THEME_PRESETS.glass.listItemBackgroundColor,
                      backdropFilter: 'blur(16px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                      border: '1px solid rgba(255, 255, 255, 0.6)',
                    }}
                  />
                  {/* 预览按钮 */}
                  <div className='absolute bottom-1 right-1'>
                    <div
                      className='h-5 px-2 rounded-md flex items-center justify-center'
                      style={{
                        backgroundColor: RELAY_THEME_PRESETS.glass.buttonColor,
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
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all',
                  selectedPreset === 'black'
                    ? 'border-[#09090B] bg-[#f3f4f6]'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                )}
              >
                <div
                  className='w-full h-12 rounded-md border border-gray-700'
                  style={{
                    backgroundColor: RELAY_THEME_PRESETS.black.listItemBackgroundColor,
                  }}
                />
                <span className='text-xs font-medium'>黑色</span>
              </button>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* 按钮样式设置 */}
        <div className='text-xs font-semibold flex items-center gap-1'>
          <Palette size={14} />
          <span>按钮样式</span>
        </div>
        {buttonColorItems.map(item => (
          <ColorItemSetting
            key={item.value}
            item={item}
            theme={theme}
            onChange={handleThemeChange}
          />
        ))}

        <Separator />

        {/* 列表样式设置 */}
        <div className='text-xs font-semibold flex items-center gap-1'>
          <Palette size={14} />
          <span>列表样式</span>
        </div>
        {listColorItems.map(item => (
          <ColorItemSetting
            key={item.value}
            item={item}
            theme={theme}
            onChange={handleThemeChange}
          />
        ))}
        <NumberItemSetting
          item={{
            label: '列表圆角',
            value: 'listBorderRadius',
          }}
          theme={theme}
          onChange={handleThemeChange}
          min={0}
          max={50}
        />

        <Separator />

        {/* 头像样式设置 */}
        <div className='text-xs font-semibold flex items-center gap-1'>
          <Palette size={14} />
          <span>头像样式</span>
        </div>
        {avatarColorItems.map(item => (
          <ColorItemSetting
            key={item.value}
            item={item}
            theme={theme}
            onChange={handleThemeChange}
          />
        ))}
        <NumberItemSetting
          item={{
            label: '头像大小',
            value: 'avatarSize',
          }}
          theme={theme}
          onChange={handleThemeChange}
          min={20}
          max={100}
        />

        <Separator />

        {/* 文字样式设置 */}
        <div className='text-xs font-semibold flex items-center gap-1'>
          <Palette size={14} />
          <span>文字样式</span>
        </div>
        {textColorItems.map(item => (
          <ColorItemSetting
            key={item.value}
            item={item}
            theme={theme}
            onChange={handleThemeChange}
          />
        ))}
      </div>
      <Separator />
    </>
  );
};

export default RelayDesignerSetting;

import { Label } from '@workspace/ui/components/label';
import {
  RadioGroup,
  RadioGroupItem,
} from '@workspace/ui/components/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import React, { useState } from 'react';
import ColorPickerPopover from '../../ColorPicker';

import { showSelector } from '@/components/showSelector';
import { UploadHelper } from '@workspace/ui/components/Upload';
import { colorValueBuilder } from '../../ColorPicker/utils';
import {
  formatListStyle,
  LucideIcon,
  parseListStyle,
  regularListStyles,
  svgIconStyles,
  type IconName,
  type ListStyleMode,
} from './index';

interface ListStyleSelectorProps {
  listStyle?: string;
  onChange: (listStyle: string | undefined) => void;
}

export const ListStyleSelector: React.FC<ListStyleSelectorProps> = ({
  listStyle,
  onChange,
}) => {
  const parsed = parseListStyle(listStyle);
  const [mode, setMode] = useState<ListStyleMode>(parsed.type as ListStyleMode);
  const [iconColor, setIconColor] = useState<string>(parsed.color);

  // 初始化颜色
  React.useEffect(() => {
    const newParsed = parseListStyle(listStyle);
    setIconColor(newParsed.color);
  }, [listStyle]);

  const handleStyleChange = (value: string) => {
    const formatted = formatListStyle(
      mode,
      value,
      mode === 'svg' || mode === 'custom' ? iconColor : undefined
    );
    onChange(formatted);
  };

  const handleColorChange = (color: string) => {
    setIconColor(color);
    if (mode === 'svg') {
      const formatted = formatListStyle(mode, parsed.value, color);
      onChange(formatted);
    }
  };

  const handleModeChange = (newMode: ListStyleMode) => {
    setMode(newMode);
    if (newMode === 'regular') {
      onChange(formatListStyle('regular', 'disc'));
    } else if (newMode === 'svg') {
      onChange(formatListStyle('svg', 'check', iconColor));
    } else if (newMode === 'custom') {
      // 自定义模式不自动设置值，等待用户上传
      onChange(undefined);
    }
  };

  return (
    <div className='flex flex-col'>
      {/* 模式切换 - Radio */}
      <RadioGroup
        value={mode}
        onValueChange={val => handleModeChange(val as ListStyleMode)}
        className='flex items-center gap-2 mb-2'
      >
        <div className='flex items-center gap-1'>
          <RadioGroupItem value='regular' id='regular' />
          <Label
            htmlFor='regular'
            className='text-xs cursor-pointer select-none'
          >
            常规
          </Label>
        </div>
        <div className='flex items-center gap-1'>
          <RadioGroupItem value='svg' id='svg' />
          <Label htmlFor='svg' className='text-xs cursor-pointer select-none'>
            SVG
          </Label>
        </div>
        <div className='flex items-center gap-1'>
          <RadioGroupItem value='custom' id='custom' />
          <Label
            htmlFor='custom'
            className='text-xs cursor-pointer select-none'
          >
            自定义
          </Label>
        </div>
      </RadioGroup>

      {/* 样式选择器 */}
      {mode === 'regular' ? (
        <div>
          <Label className='text-xs' style={{ color: '#151515' }}>
            列表样式(渐变颜色不生效)
          </Label>
          <Select value={parsed.value} onValueChange={handleStyleChange}>
            <SelectTrigger className='w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {regularListStyles.map(style => (
                <SelectItem key={style.value} value={style.value}>
                  {style.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : mode === 'svg' ? (
        <div className='space-y-3'>
          <div>
            <Label className='text-xs' style={{ color: '#151515' }}>
              选择图标
            </Label>
            <Select value={parsed.value} onValueChange={handleStyleChange}>
              <SelectTrigger className='w-full'>
                <SelectValue>
                  <div className='flex items-center gap-2'>
                    <LucideIcon
                      iconName={parsed.value as IconName}
                      size={16}
                      color={iconColor}
                    />
                    <span>
                      {svgIconStyles.find(s => s.value === parsed.value)
                        ?.label || parsed.value}
                    </span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {svgIconStyles.map(icon => (
                  <SelectItem key={icon.value} value={icon.value}>
                    <div className='flex items-center gap-2'>
                      <LucideIcon
                        iconName={icon.value}
                        size={16}
                        color='#666'
                      />
                      <span>{icon.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className='text-xs' style={{ color: '#151515' }}>
              图标颜色
            </Label>
            <ColorPickerPopover
              disableGradient={true}
              value={iconColor}
              onChange={value => {
                handleColorChange(colorValueBuilder(value) || '#000000');
              }}
            />
          </div>
        </div>
      ) : (
        <div className='space-y-3'>
          <div>
            <Label className='text-xs' style={{ color: '#151515' }}>
              上传自定义图标
            </Label>
            <UploadHelper
              image={parsed.value || ''}
              label='上传SVG或PNG图标'
              onRemove={() => {
                handleStyleChange('');
              }}
              onUpload={() => {
                showSelector({
                  onSelected: (params: any) => {
                    const { url } = params;
                    console.log('params', params);
                    handleStyleChange(url);
                  },
                  type: 'picture',
                });
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

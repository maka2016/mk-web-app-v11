import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu';
import { ChevronDown } from 'lucide-react';

type WidthMode = 'auto' | 'fixed' | 'fixed-percent' | 'fill';
type HeightMode = 'min-height' | 'normal-height';
type Mode = WidthMode | HeightMode;

interface ResizingControlProps {
  dimension: 'width' | 'height';
  value: React.CSSProperties;
  onChange: (patch: React.CSSProperties) => void;
}

const widthModeOptions = [
  { value: 'auto', label: '适配' },
  { value: 'fixed', label: '固定px' },
  { value: 'fixed-percent', label: '固定%' },
  { value: 'fill', label: '填充' },
];

const heightModeOptions = [
  { value: 'auto', label: '适配' },
  // { value: "min-height", label: "最小px" },
  { value: 'normal-height', label: '固定px' },
];

export default function ResizingControl({
  dimension,
  value,
  onChange,
}: ResizingControlProps) {
  const currentValue = (() => {
    if (dimension === 'width') {
      return value.width;
    } else {
      return value.height;
      // if (value.minHeight) {
      //   return value.minHeight;
      // } else {
      //   return value.height;
      // }
    }
  })();

  // 确定当前模式
  const getCurrentMode = (): Mode => {
    if (dimension === 'width') {
      // 宽度保持原有逻辑
      if (value.flex) {
        return 'fill';
      }
      if (!currentValue || currentValue === 'auto') {
        return 'auto';
      }
      if (typeof currentValue === 'string' && currentValue.includes('%')) {
        return 'fixed-percent';
      }
      return 'fixed';
    } else {
      // 高度使用新的逻辑
      if (!currentValue || currentValue === 'auto') {
        return 'auto';
      }
      return 'normal-height';
    }
  };

  const mode = getCurrentMode();
  const prefixLabel = dimension === 'width' ? 'W' : 'H';

  // 获取当前维度的模式选项
  const getModeOptions = () => {
    return dimension === 'width' ? widthModeOptions : heightModeOptions;
  };

  // 模式切换处理
  const handleModeChange = (newMode: Mode) => {
    const newStyle = {} as React.CSSProperties;

    if (dimension === 'width') {
      // 宽度保持原有逻辑
      switch (newMode) {
        case 'auto':
          newStyle.width = 'auto';
          newStyle.flex = undefined;
          newStyle.minWidth = undefined;
          break;
        case 'fill':
          newStyle.width = '100%';
          /** 用于控制宽度自适应 */
          newStyle.flex = `0 1 0%`;
          newStyle.minWidth = undefined;
          break;
        case 'fixed':
          newStyle.width = 100;
          newStyle.flex = undefined;
          newStyle.minWidth = 100;
          break;
        case 'fixed-percent':
          newStyle.width = '50%';
          newStyle.flex = undefined;
          newStyle.minWidth = '50%';
          break;
      }
    } else {
      // 高度使用新的逻辑
      switch (newMode) {
        case 'min-height':
          newStyle.minHeight = 100;
          newStyle.height = undefined;
          newStyle.flex = `1 0 0%`;
          break;
        case 'normal-height':
          newStyle.height = 100;
          newStyle.minHeight = undefined;
          newStyle.flex = undefined;
          break;
        case 'auto':
          newStyle.height = 'auto';
          newStyle.minHeight = undefined;
          // newStyle.flex = `1 0 0%`;
          break;
      }
    }

    onChange({
      ...newStyle,
    });
  };

  // 固定值输入处理
  const handleFixedValueChange = (inputValue: string) => {
    console.log('inputValue', inputValue);
    if (dimension === 'width') {
      if (inputValue === '') {
        onChange({
          width: undefined,
          minWidth: undefined,
        });
        return;
      }

      const numValue = Number(inputValue);
      if (!isNaN(numValue)) {
        if (mode === 'fixed-percent') {
          const percentValue = `${numValue}%`;
          onChange({
            width: percentValue,
            minWidth: percentValue,
          });
        } else {
          onChange({
            width: numValue,
            minWidth: numValue,
          });
        }
      }
    } else {
      // if (mode === "normal-height") {
      // }
      onChange({
        minHeight: undefined,
        // minHeight: inputValue === "" ? undefined : Number(inputValue),
        height: Number(inputValue),
      });
    }
  };

  // 获取显示值
  const getDisplayValue = () => {
    return +String(currentValue)?.replace(/px|%/g, '') || '';
  };

  // 判断是否显示输入框
  const shouldShowInput = () => {
    if (dimension === 'width') {
      return mode === 'fixed' || mode === 'fixed-percent';
    } else {
      return mode !== 'auto';
    }
  };

  // 获取占位符文本
  const getPlaceholder = () => {
    return '请输入';
  };

  // 渲染当前模式选项
  const currentModeOptions = getModeOptions();
  const currentModeOption =
    currentModeOptions.find(opt => opt.value === mode) || currentModeOptions[0];

  return (
    <div className='flex flex-col gap-1'>
      <div className='relative'>
        {shouldShowInput() ? (
          // 显示输入框的模式
          <div className='relative flex items-center rounded-sm bg-custom-gray px-1 py-1 gap-1 h-7'>
            <div className='text-xs text-gray-500 font-medium'>
              {prefixLabel}
            </div>
            <input
              type='number'
              value={getDisplayValue()}
              className='flex-1 text-xs bg-transparent focus-visible:outline-none pr-12'
              onChange={e => handleFixedValueChange(e.target.value)}
              placeholder={getPlaceholder()}
            />

            {/* 模式切换按钮 */}
            <div className='absolute right-1 top-1/2 transform -translate-y-1/2'>
              <DropdownMenu>
                <DropdownMenuTrigger className='flex items-center px-1 py-0.5 text-xs bg-white hover:bg-gray-50 rounded-sm border-0'>
                  <span className='text-xs'>{currentModeOption.label}</span>
                  <ChevronDown size={8} className='ml-0.5' />
                </DropdownMenuTrigger>
                <DropdownMenuContent side='bottom' align='end' className='w-24'>
                  {currentModeOptions.map(option => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => handleModeChange(option.value as Mode)}
                      className={`text-xs ${
                        mode === option.value ? 'bg-blue-50 text-blue-600' : ''
                      }`}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ) : (
          // 显示标签的模式
          <div className='relative flex items-center rounded-sm bg-custom-gray px-1 py-1 gap-1 h-7'>
            <div className='text-xs text-gray-500 font-medium'>
              {prefixLabel}
            </div>
            <div className='flex-1 text-xs text-gray-600 pr-12'>
              {currentModeOption.label}
            </div>

            {/* 模式切换按钮 */}
            <div className='absolute right-1 top-1/2 transform -translate-y-1/2'>
              <DropdownMenu>
                <DropdownMenuTrigger className='flex items-center px-1 py-0.5 text-xs bg-white hover:bg-gray-50 rounded-sm border-0'>
                  <span className='text-xs'>{currentModeOption.label}</span>
                  <ChevronDown size={8} className='ml-0.5' />
                </DropdownMenuTrigger>
                <DropdownMenuContent side='bottom' align='end' className='w-24'>
                  {currentModeOptions.map(option => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => handleModeChange(option.value as Mode)}
                      className={`text-xs ${
                        mode === option.value ? 'bg-blue-50 text-blue-600' : ''
                      }`}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import ColorPickerPopover from '@/components/GridEditorV3/components/ColorPicker';
import { colorValueBuilder } from '@/components/GridEditorV3/components/ColorPicker/utils';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import {
  RadioGroup,
  RadioGroupItem,
} from '@workspace/ui/components/radio-group';
import { Slider } from '@workspace/ui/components/slider';
import { Switch } from '@workspace/ui/components/switch';
import { X } from 'lucide-react';
import { ChangeEvent, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import type {
  ConfettiBuiltinShape,
  ConfettiEffectType,
  ConfettiShapeSource,
  EnvelopeConfig,
} from '../types';
import {
  DEFAULT_CONFETTI_COLORS,
  DEFAULT_CONFETTI_EMOJI,
  normalizeConfettiSettings,
} from '../types';

const EFFECT_OPTIONS: {
  value: ConfettiEffectType;
  label: string;
  description: string;
}[] = [
  { value: 'wedding', label: '婚礼礼花', description: '左右两侧喷射祝福' },
  { value: 'fireworks', label: '烟花', description: '多点烟花连发' },
  { value: 'shower', label: '撒花', description: '从顶部缓缓飘落' },
  { value: 'explosion', label: '爆炸', description: '中心向外扩散' },
  { value: 'celebration', label: '庆祝', description: '多层次庆祝效果' },
  { value: 'heartRain', label: '爱心雨', description: '左右两侧飘落爱心' },
];

const SHAPE_SOURCE_OPTIONS: {
  value: ConfettiShapeSource;
  label: string;
  description: string;
}[] = [
  { value: 'builtin', label: '内置形状', description: '圆形、星形、丝带等' },
  { value: 'emoji', label: 'Emoji', description: '任意 Emoji 字符' },
  { value: 'custom', label: '自定义 SVG', description: '上传 Path 字符串' },
];

const SHAPE_OPTIONS: {
  value: ConfettiBuiltinShape;
  label: string;
}[] = [
  { value: 'circle', label: '圆形' },
  { value: 'square', label: '方形' },
  { value: 'star', label: '星形' },
  { value: 'heart', label: '爱心' },
  { value: 'ribbon', label: '丝带' },
];

const DEFAULT_COLOR_VALUE = DEFAULT_CONFETTI_COLORS[0] ?? '#F472B6';

// 预设配色方案
const COLOR_PRESETS: {
  name: string;
  colors: string[];
}[] = [
  {
    name: '婚礼',
    colors: ['#FFB6C1', '#FFC0CB', '#FFD700', '#FFFFFF', '#FF69B4'],
  },
  {
    name: '生日',
    colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'],
  },
  {
    name: '寿宴',
    colors: ['#DC143C', '#FF4500', '#FFD700', '#FF6347', '#CD5C5C'],
  },
  {
    name: '高端会议',
    colors: ['#4169E1', '#6A5ACD', '#4682B4', '#9370DB', '#1E90FF'],
  },
];

interface ConfettiEditorProps {
  config: EnvelopeConfig;
  onConfigChange: (nextConfig: EnvelopeConfig) => void;
  onPreview: (config?: EnvelopeConfig) => void;
}

const extractSvgPath = (svgContent: string): string | null => {
  if (typeof DOMParser === 'undefined') {
    return null;
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');
  if (doc.querySelector('parsererror')) {
    return null;
  }
  const pathElements = Array.from(doc.querySelectorAll('path[d]'));
  if (!pathElements.length) {
    return null;
  }
  const combinedPath = pathElements
    .map(el => el.getAttribute('d')?.trim())
    .filter(Boolean)
    .join(' ');
  return combinedPath || null;
};

const ConfettiEditor = ({
  config,
  onConfigChange,
  onPreview,
}: ConfettiEditorProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [svgError, setSvgError] = useState<string | null>(null);
  const normalized = normalizeConfettiSettings(config);
  const hasCustomShape = Boolean(normalized.customShapePath);
  const colors = normalized.colors;

  const updateConfig = (
    patch: Partial<EnvelopeConfig>,
    shouldPreview = false
  ) => {
    const nextConfig = { ...config, ...patch };
    onConfigChange(nextConfig);
    if (shouldPreview) {
      onPreview(nextConfig);
    }
  };

  const handleSvgFile = async (file: File) => {
    try {
      const svgText = await file.text();
      const path = extractSvgPath(svgText);
      if (!path) {
        throw new Error('SVG 中未找到有效的 path');
      }
      setSvgError(null);
      updateConfig(
        {
          confettiShapeSource: 'custom',
          confettiCustomShapePath: path,
        },
        true
      );
      toast.success('已解析 SVG 形状');
    } catch (error) {
      const message = error instanceof Error ? error.message : '解析 SVG 失败';
      setSvgError(message);
      toast.error(message);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void handleSvgFile(file);
    }
    // reset input so the same file can be uploaded again if needed
    event.target.value = '';
  };

  const handleCustomPathChange = (value: string) => {
    setSvgError(null);
    updateConfig(
      {
        confettiCustomShapePath: value,
        confettiShapeSource: 'custom',
      },
      false
    );
  };

  const handleShapeSourceChange = (value: string) => {
    const nextSource = value as ConfettiShapeSource;
    if (nextSource === 'custom' && !hasCustomShape) {
      toast.error('请先上传或输入 SVG 路径');
    }
    updateConfig(
      {
        confettiShapeSource: nextSource,
        confettiShape:
          nextSource === 'builtin' ? normalized.shape : config.confettiShape,
        confettiEmoji:
          nextSource === 'emoji'
            ? config.confettiEmoji || DEFAULT_CONFETTI_EMOJI
            : config.confettiEmoji,
      },
      nextSource !== 'custom' || hasCustomShape
    );
  };

  const handleColorRemove = (targetIndex: number) => {
    if (colors.length <= 1) {
      toast.error('至少保留一种颜色');
      return;
    }
    const nextColors = colors.filter((_, index) => index !== targetIndex);
    updateConfig({ confettiColors: nextColors }, true);
  };

  const handleColorChange = (index: number, newColor: any) => {
    if (newColor) {
      const colorValue = colorValueBuilder(newColor);
      if (!colorValue) return;

      const normalizedColor = colorValue.startsWith('#')
        ? colorValue.toUpperCase()
        : `#${colorValue.toUpperCase()}`;

      const nextColors = [...colors];
      nextColors[index] = normalizedColor;
      updateConfig({ confettiColors: nextColors }, true);
    }
  };

  const handleColorAdd = (newColor: any) => {
    if (newColor) {
      const colorValue = colorValueBuilder(newColor);
      if (!colorValue) return;

      const normalizedColor = colorValue.startsWith('#')
        ? colorValue.toUpperCase()
        : `#${colorValue.toUpperCase()}`;

      if (colors.includes(normalizedColor)) {
        toast.error('该颜色已存在');
        return;
      }
      updateConfig(
        {
          confettiColors: [...colors, normalizedColor],
        },
        true
      );
    }
  };

  const handleEmojiBlur = (value: string) => {
    updateConfig({ confettiEmoji: value || DEFAULT_CONFETTI_EMOJI }, true);
  };

  return (
    <div className='space-y-3'>
      <Label>撒花动画配置</Label>
      <div className='space-y-4 rounded-lg border border-gray-100 p-3'>
        <div className='flex items-center justify-between'>
          <Label className='text-xs'>启用撒花动画</Label>
          <Switch
            checked={normalized.enabled}
            onCheckedChange={checked => {
              updateConfig({ enableConfetti: checked });
            }}
          />
        </div>

        {normalized.enabled && (
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label className='text-xs font-semibold'>1、播放效果</Label>
              <RadioGroup
                value={normalized.effect}
                onValueChange={value => {
                  const nextEffect = value as ConfettiEffectType;
                  updateConfig({ confettiEffect: nextEffect }, true);
                }}
                className='grid gap-2 grid-cols-5'
              >
                {EFFECT_OPTIONS.map(option => {
                  const checked = normalized.effect === option.value;
                  return (
                    <Label
                      key={option.value}
                      htmlFor={`confetti-effect-${option.value}`}
                      className={`flex flex-col gap-1 rounded-lg border px-3 py-2 text-xs transition-colors ${
                        checked
                          ? 'border-blue-500 bg-blue-50 text-blue-600'
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      <RadioGroupItem
                        value={option.value}
                        id={`confetti-effect-${option.value}`}
                        className='sr-only'
                      />
                      <span className='text-sm font-semibold'>
                        {option.label}
                      </span>
                      <span className='text-xs'>{option.description}</span>
                    </Label>
                  );
                })}
              </RadioGroup>
            </div>

            <div className='space-y-3'>
              <Label className='text-xs font-semibold'>2、形状来源</Label>
              <RadioGroup
                value={normalized.shapeSource}
                onValueChange={handleShapeSourceChange}
                className='grid gap-2 sm:grid-cols-3'
              >
                {SHAPE_SOURCE_OPTIONS.map(option => {
                  const checked = normalized.shapeSource === option.value;
                  return (
                    <Label
                      key={option.value}
                      htmlFor={`confetti-content-${option.value}`}
                      className={`flex flex-col gap-1 rounded-lg border px-3 py-2 text-xs transition-colors ${
                        checked
                          ? 'border-blue-500 bg-blue-50 text-blue-600'
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      <RadioGroupItem
                        value={option.value}
                        id={`confetti-content-${option.value}`}
                        className='sr-only'
                      />
                      <span className='text-sm font-semibold'>
                        {option.label}
                      </span>
                      <span>{option.description}</span>
                    </Label>
                  );
                })}
              </RadioGroup>

              {normalized.shapeSource === 'builtin' && (
                <div className='space-y-2'>
                  <Label className='text-xs'>撒花形状</Label>
                  <RadioGroup
                    value={normalized.shape}
                    onValueChange={value => {
                      updateConfig(
                        {
                          confettiShape: value as ConfettiBuiltinShape,
                        },
                        true
                      );
                    }}
                    className='flex flex-wrap gap-2'
                  >
                    {SHAPE_OPTIONS.map(option => {
                      const checked = normalized.shape === option.value;
                      return (
                        <Label
                          key={option.value}
                          htmlFor={`confetti-shape-${option.value}`}
                          className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors ${
                            checked
                              ? 'border-blue-500 bg-blue-50 text-blue-600'
                              : 'border-gray-200 text-gray-600'
                          }`}
                        >
                          <RadioGroupItem
                            value={option.value}
                            id={`confetti-shape-${option.value}`}
                          />
                          <span className='text-sm font-medium'>
                            {option.label}
                          </span>
                        </Label>
                      );
                    })}
                  </RadioGroup>
                </div>
              )}

              {normalized.shapeSource === 'emoji' && (
                <div className='space-y-2'>
                  <Label className='text-xs'>Emoji 文本</Label>
                  <Input
                    value={config.confettiEmoji ?? DEFAULT_CONFETTI_EMOJI}
                    onChange={e => {
                      updateConfig({ confettiEmoji: e.target.value });
                    }}
                    onBlur={e => handleEmojiBlur(e.target.value)}
                    placeholder='例如 🎉'
                  />
                </div>
              )}

              <div className='space-y-2'>
                <Label className='text-xs'>自定义 SVG 形状</Label>
                <div className='flex flex-wrap gap-2'>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => fileInputRef.current?.click()}
                  >
                    上传 SVG
                  </Button>
                  {hasCustomShape && (
                    <Button
                      size='sm'
                      variant='ghost'
                      onClick={() => {
                        updateConfig(
                          {
                            confettiCustomShapePath: undefined,
                            confettiShapeSource: 'builtin',
                          },
                          false
                        );
                      }}
                    >
                      清除
                    </Button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='.svg'
                  className='hidden'
                  onChange={handleFileChange}
                  title='上传 SVG 形状'
                />
                {hasCustomShape && (
                  <textarea
                    className='w-full rounded-md border border-gray-200 bg-gray-50 p-2 text-xs text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
                    rows={4}
                    value={config.confettiCustomShapePath ?? ''}
                    onChange={event =>
                      handleCustomPathChange(event.target.value)
                    }
                    placeholder='请输入 SVG 路径'
                    onBlur={() => {
                      if (
                        (config.confettiCustomShapePath ?? '').trim().length > 0
                      ) {
                        onPreview({
                          ...config,
                          confettiShapeSource: 'custom',
                        });
                      }
                    }}
                  />
                )}
                {svgError && <p className='text-xs text-red-500'>{svgError}</p>}
                {normalized.shapeSource === 'custom' && !hasCustomShape && (
                  <p className='text-[11px] text-orange-500'>
                    当前未检测到有效的 SVG 路径，播放时会自动回退到内置形状
                  </p>
                )}
                <p className='text-[11px] text-gray-500'>
                  支持上传包含 path 的 SVG，将自动解析为 confetti 可用的路径。
                </p>
              </div>
            </div>

            <div className='space-y-2'>
              <Label className='text-xs font-semibold'>3、撒花颜色</Label>
              {/* 预设配色方案 */}
              <div className='space-y-2'>
                <Label className='text-[11px] text-gray-600'>
                  预设配色方案
                </Label>
                <div className='flex flex-wrap gap-2'>
                  {COLOR_PRESETS.map(preset => (
                    <Button
                      key={preset.name}
                      size='sm'
                      variant='outline'
                      className='h-8 text-xs'
                      onClick={() => {
                        updateConfig({ confettiColors: preset.colors }, true);
                      }}
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </div>
              {/* 当前颜色列表 */}
              <div className='flex flex-wrap gap-2'>
                {colors.map((color, index) => (
                  <div
                    key={`${color}-${index}`}
                    className='flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600'
                  >
                    <ColorPickerPopover
                      value={color}
                      useThemeColor={false}
                      onChange={newColor => {
                        handleColorChange(index, newColor);
                      }}
                      themeColors={[]}
                    />
                    <span className='font-medium'>{color}</span>
                    <Button
                      size='icon'
                      variant='ghost'
                      className='h-5 w-5'
                      disabled={colors.length <= 1}
                      onClick={() => handleColorRemove(index)}
                    >
                      <X className='h-3 w-3' />
                    </Button>
                  </div>
                ))}
              </div>
              {/* 添加新颜色 */}
              <div className='flex flex-wrap gap-2'>
                <ColorPickerPopover
                  value={DEFAULT_COLOR_VALUE}
                  useThemeColor={false}
                  onChange={handleColorAdd}
                  themeColors={[]}
                />
                <span className='text-xs text-gray-500 flex items-center'>
                  点击添加新颜色
                </span>
              </div>
              <p className='text-[11px] text-gray-500'>至少保留 1 种颜色。</p>
            </div>

            <div className='space-y-2'>
              <Label className='text-xs font-semibold'>
                4、持续时间: {normalized.durationSeconds.toFixed(1)} 秒
              </Label>
              <Slider
                value={[normalized.durationSeconds]}
                onValueChange={value => {
                  updateConfig(
                    {
                      confettiDuration: Number(value[0].toFixed(1)),
                    },
                    false
                  );
                }}
                min={0.5}
                max={30}
                step={0.5}
              />
            </div>

            <div className='space-y-2'>
              <Label className='text-xs font-semibold'>
                5、每次播放间隔: {normalized.intervalSeconds.toFixed(1)} 秒
              </Label>
              <Slider
                value={[normalized.intervalSeconds]}
                onValueChange={value => {
                  updateConfig(
                    {
                      confettiInterval: Number(value[0].toFixed(1)),
                    },
                    false
                  );
                }}
                min={0.1}
                max={5}
                step={0.1}
              />
            </div>

            <div className='space-y-2'>
              <Label className='text-xs font-semibold'>
                6、播放次数: {normalized.repeatCount} 次
              </Label>
              <Slider
                value={[normalized.repeatCount]}
                onValueChange={value => {
                  updateConfig(
                    { confettiRepeatCount: Math.round(value[0]) },
                    false
                  );
                }}
                min={1}
                max={5}
                step={1}
              />
            </div>

            <div className='space-y-2'>
              <Label className='text-xs font-semibold'>
                7、大小: {normalized.scalar.toFixed(1)}
              </Label>
              <Slider
                value={[normalized.scalar]}
                onValueChange={value => {
                  updateConfig(
                    {
                      confettiScalar: Number(value[0].toFixed(1)),
                    },
                    false
                  );
                }}
                min={0.5}
                max={5}
                step={0.1}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfettiEditor;

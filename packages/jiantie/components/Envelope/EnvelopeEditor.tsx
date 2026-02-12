'use client';

import ColorPickerPopover from '@/components/GridEditorV3/components/ColorPicker';
import { colorValueBuilder } from '@/components/GridEditorV3/components/ColorPicker/utils';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Slider } from '@workspace/ui/components/slider';
import { UploadHelper } from '@workspace/ui/components/Upload';
import { ChevronDown, ChevronUp, RotateCcw, Save, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { showSelector } from '../showSelector';
import ConfettiPlayer, { type ConfettiRef } from './Confetti';
import ConfettiEditor from './Confetti/Editor';
import {
  EnvelopeConfig,
  getDefaultTiming,
  isEnvelopeConfigComplete,
  normalizeConfettiSettings,
} from './types';

const normalizeConfig = (config?: EnvelopeConfig): EnvelopeConfig => {
  const defaultTiming = getDefaultTiming();
  const defaultConfetti = normalizeConfettiSettings();
  const fallback: EnvelopeConfig = {
    easing: 'ease-in-out',
    ...defaultTiming,
    guestNameFontSize: 24,
    guestNameColor: '#333',
    enableConfetti: defaultConfetti.enabled,
    confettiEffect: defaultConfetti.effect,
    confettiShapeSource: defaultConfetti.shapeSource,
    confettiShape: defaultConfetti.shape,
    confettiEmoji: defaultConfetti.emoji,
    confettiCustomShapePath: defaultConfetti.customShapePath,
    confettiColors: defaultConfetti.colors,
    confettiDuration: defaultConfetti.durationSeconds,
    confettiRepeatCount: defaultConfetti.repeatCount,
  };

  if (!config) {
    return fallback;
  }

  const restConfig = { ...config } as EnvelopeConfig & {
    videoBgConfig?: unknown;
    outerTexture?: string;
  };
  delete restConfig.videoBgConfig;
  const legacyOuterTexture = restConfig.outerTexture;

  const normalizedConfetti = normalizeConfettiSettings(restConfig);
  // 确保所有 timing 字段都有值，如果传入的 config 中某些字段是 undefined，使用默认值
  return {
    ...fallback,
    ...(restConfig as EnvelopeConfig),
    // 确保 timing 字段始终有值
    sealDisappearDuration:
      restConfig.sealDisappearDuration ?? defaultTiming.sealDisappearDuration,
    flapOpenStartDelay:
      restConfig.flapOpenStartDelay ?? defaultTiming.flapOpenStartDelay,
    leftFlapDuration:
      restConfig.leftFlapDuration ?? defaultTiming.leftFlapDuration,
    rightFlapDelay: restConfig.rightFlapDelay ?? defaultTiming.rightFlapDelay,
    rightFlapDuration:
      restConfig.rightFlapDuration ?? defaultTiming.rightFlapDuration,
    contentExpandDuration:
      restConfig.contentExpandDuration ?? defaultTiming.contentExpandDuration,
    // 确保嘉宾文字样式字段始终有值
    guestNameFontSize: restConfig.guestNameFontSize ?? 24,
    guestNameColor: restConfig.guestNameColor ?? '#333',
    // 确保撒花动画配置字段始终有值
    enableConfetti: normalizedConfetti.enabled,
    confettiEffect: normalizedConfetti.effect,
    confettiShapeSource: normalizedConfetti.shapeSource,
    confettiShape: normalizedConfetti.shape,
    confettiEmoji: normalizedConfetti.emoji,
    confettiCustomShapePath: normalizedConfetti.customShapePath,
    confettiColors: normalizedConfetti.colors,
    confettiDuration: normalizedConfetti.durationSeconds,
    confettiRepeatCount: normalizedConfetti.repeatCount,
    leftFlapOuterImage:
      restConfig.leftFlapOuterImage ??
      legacyOuterTexture ??
      restConfig.rightFlapOuterImage,
    rightFlapOuterImage:
      restConfig.rightFlapOuterImage ??
      legacyOuterTexture ??
      restConfig.leftFlapOuterImage,
  };
};

interface EnvelopeEditorProps {
  value?: EnvelopeConfig;
  onChange: (config: EnvelopeConfig) => Promise<void>;
  onRemove?: () => void;
}

const ENVELOPE_WIDTH_PX = 720;
const ENVELOPE_HEIGHT_PX = Math.round((16 / 9) * ENVELOPE_WIDTH_PX);

const IMAGE_FIELDS = [
  {
    key: 'backgroundImage',
    label: '作品背景图',
    sizeHint: '1440 x 1440',
    description: '整个加载页面的背景,PNG|JPG',
  },
  {
    key: 'leftFlapOuterImage',
    label: '左开口外侧图',
    sizeHint: `${ENVELOPE_WIDTH_PX} × ${ENVELOPE_HEIGHT_PX}px`,
    description: '左开口外侧完整样式,PNG',
  },
  {
    key: 'rightFlapOuterImage',
    label: '右开口外侧图',
    sizeHint: `${ENVELOPE_WIDTH_PX} × ${ENVELOPE_HEIGHT_PX}px`,
    description: '右开口外侧完整样式,PNG',
  },
  {
    key: 'innerTexture',
    label: '内侧材质贴纸',
    sizeHint: '2560 x 1440',
    description: '信封内页,PNG|JPG',
  },
  {
    key: 'envelopeSealImage',
    label: '信封印章',
    sizeHint: `150 x 150`,
    description: '引导用户点击开启,PNG',
  },
] as const;

export default function EnvelopeEditor(props: EnvelopeEditorProps) {
  const { onRemove } = props;
  const [saving, setSaving] = useState(false);
  const [isTimingExpanded, setIsTimingExpanded] = useState(false);
  const [isConfettiDialogOpen, setIsConfettiDialogOpen] = useState(false);
  const confettiRef = useRef<ConfettiRef | null>(null);
  // 本地状态
  const [localConfig, setLocalConfig] = useState<EnvelopeConfig>(
    normalizeConfig(props.value)
  );

  useEffect(() => {
    setLocalConfig(normalizeConfig(props.value));
  }, [props.value]);

  // 检查是否有未保存的更改
  const hasUnsavedChanges =
    JSON.stringify(localConfig) !== JSON.stringify(props.value);

  const isConfigComplete = isEnvelopeConfigComplete(localConfig);

  const playConfettiPreview = (configOverride?: EnvelopeConfig) => {
    if (!confettiRef.current) return;
    const settings = normalizeConfettiSettings(configOverride ?? localConfig);
    if (!settings.enabled) return;
    confettiRef.current.playWithContent({
      effect: settings.effect,
      shapeSource: settings.shapeSource,
      shape: settings.shape,
      emoji: settings.emoji,
      customShapePath: settings.customShapePath,
      colors: settings.colors,
      repeatCount: settings.repeatCount,
      durationMs: settings.durationSeconds * 1000,
      intervalMs: settings.intervalSeconds * 1000,
      scalar: settings.scalar,
    });
  };

  // 更新图片
  const handleImageChange = (key: string, url: string) => {
    const nextConfig: EnvelopeConfig = {
      ...localConfig,
      [key]: url,
    };

    setLocalConfig(nextConfig);
  };

  // 保存
  const handleSave = async () => {
    if (!isConfigComplete) {
      toast.error('请先上传信封所需的5张图片');
      return;
    }

    setSaving(true);
    try {
      await props.onChange(localConfig);
      // toast 提示由父组件处理，这里不再显示
    } catch (err) {
      console.error('保存失败:', err);
      // 错误提示由父组件处理，这里不再显示
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // 重置
  const handleReset = () => {
    setLocalConfig(normalizeConfig(props.value));
  };

  // 删除
  const handleRemove = () => {
    if (onRemove) {
      onRemove();
    }
  };

  return (
    <>
      <ConfettiPlayer ref={confettiRef} />
      <div className='space-y-4 p-4 max-h-[80vh] overflow-y-auto'>
        {/* 图片上传区域 */}
        <div className='space-y-3'>
          <Label>信封图片 (共5张)</Label>
          <div className='grid grid-cols-5 gap-2'>
            {IMAGE_FIELDS.map(({ key, label, sizeHint, description }) => (
              <div key={key} className='space-y-2'>
                <Label className='text-xs flex flex-col gap-1'>
                  <span className='font-medium'>{label}</span>
                  <span className='text-[10px] text-gray-400'>
                    {description}
                  </span>
                  <span className='text-[10px] text-gray-500'>{sizeHint}</span>
                </Label>
                <UploadHelper
                  image={localConfig[key as keyof EnvelopeConfig] as string}
                  onRemove={() => handleImageChange(key, '')}
                  onUpload={() => {
                    showSelector({
                      onSelected: (params: any) => {
                        const { url } = params;
                        handleImageChange(key, url);
                      },
                      type: 'picture',
                    });
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* 嘉宾文字样式设置 */}
        <div className='space-y-3'>
          <Label>嘉宾文字样式</Label>
          <div className='grid grid-cols-2 gap-2'>
            <div className='space-y-2'>
              <Label className='text-xs'>
                字号: {localConfig.guestNameFontSize}px
              </Label>
              <Slider
                value={[localConfig.guestNameFontSize ?? 24]}
                onValueChange={value => {
                  setLocalConfig({
                    ...localConfig,
                    guestNameFontSize: value[0],
                  });
                }}
                min={12}
                max={48}
                step={1}
              />
            </div>
            <div className='space-y-2'>
              <Label className='text-xs'>字体颜色</Label>
              <div className='flex items-center gap-2'>
                <ColorPickerPopover
                  value={localConfig.guestNameColor || '#333'}
                  onChange={value => {
                    const colorValue = colorValueBuilder(value);
                    setLocalConfig({
                      ...localConfig,
                      guestNameColor: colorValue || '#333',
                    });
                  }}
                />
                <Input
                  type='text'
                  value={localConfig.guestNameColor || '#333'}
                  onChange={e => {
                    setLocalConfig({
                      ...localConfig,
                      guestNameColor: e.target.value,
                    });
                  }}
                  className='flex-1'
                  variantSize='sm'
                  placeholder='#333'
                />
              </div>
            </div>
          </div>
        </div>

        {/* 动画参数 */}
        <div className='space-y-3'>
          <button
            type='button'
            onClick={() => setIsTimingExpanded(!isTimingExpanded)}
            className='flex items-center gap-2 w-full text-left hover:opacity-80 transition-opacity'
          >
            <Label className='cursor-pointer'>
              动画时序参数（按需要顺序执行）
            </Label>
            {isTimingExpanded ? (
              <ChevronUp className='w-4 h-4 text-gray-500' />
            ) : (
              <ChevronDown className='w-4 h-4 text-gray-500' />
            )}
          </button>

          {isTimingExpanded && (
            <div className='grid grid-cols-2 gap-2'>
              <div className='space-y-2'>
                <Label className='text-xs'>
                  1、印章消失持续时间: {localConfig.sealDisappearDuration}秒
                </Label>
                <Slider
                  value={[localConfig.sealDisappearDuration!]}
                  onValueChange={value => {
                    setLocalConfig({
                      ...localConfig,
                      sealDisappearDuration: value[0],
                    });
                  }}
                  min={0.1}
                  max={1.0}
                  step={0.05}
                />
              </div>

              <div className='space-y-2'>
                <Label className='text-xs'>
                  2、开口动画延迟: {localConfig.flapOpenStartDelay}秒
                </Label>
                <Slider
                  value={[localConfig.flapOpenStartDelay!]}
                  onValueChange={value => {
                    setLocalConfig({
                      ...localConfig,
                      flapOpenStartDelay: value[0],
                    });
                  }}
                  min={0}
                  max={1.0}
                  step={0.05}
                />
              </div>

              <div className='space-y-2'>
                <Label className='text-xs'>
                  3、左侧开口持续时间: {localConfig.leftFlapDuration}秒
                </Label>
                <Slider
                  value={[localConfig.leftFlapDuration!]}
                  onValueChange={value => {
                    setLocalConfig({
                      ...localConfig,
                      leftFlapDuration: value[0],
                    });
                  }}
                  min={0.5}
                  max={5.0}
                  step={0.1}
                />
              </div>

              <div className='space-y-2'>
                <Label className='text-xs'>
                  4、右侧开口延迟: {localConfig.rightFlapDelay}秒
                </Label>
                <Slider
                  value={[localConfig.rightFlapDelay!]}
                  onValueChange={value => {
                    setLocalConfig({
                      ...localConfig,
                      rightFlapDelay: value[0],
                    });
                  }}
                  min={0}
                  max={3.0}
                  step={0.1}
                />
              </div>

              <div className='space-y-2'>
                <Label className='text-xs'>
                  5、右侧开口持续时间: {localConfig.rightFlapDuration}秒
                </Label>
                <Slider
                  value={[localConfig.rightFlapDuration!]}
                  onValueChange={value => {
                    setLocalConfig({
                      ...localConfig,
                      rightFlapDuration: value[0],
                    });
                  }}
                  min={0.5}
                  max={5.0}
                  step={0.1}
                />
              </div>

              <div className='space-y-2'>
                <Label className='text-xs'>
                  6、内容展开持续时间: {localConfig.contentExpandDuration}秒
                </Label>
                <Slider
                  value={[localConfig.contentExpandDuration!]}
                  onValueChange={value => {
                    setLocalConfig({
                      ...localConfig,
                      contentExpandDuration: value[0],
                    });
                  }}
                  min={0.3}
                  max={3.0}
                  step={0.1}
                />
              </div>
            </div>
          )}
        </div>

        {/* 撒花动画设置 */}
        <div className='space-y-3'>
          <Button
            variant='outline'
            className='justify-start'
            onClick={() => setIsConfettiDialogOpen(true)}
          >
            撒花动画设置
          </Button>
          <ResponsiveDialog
            isOpen={isConfettiDialogOpen}
            onOpenChange={setIsConfettiDialogOpen}
            title='撒花动画设置'
            contentProps={{
              className: 'max-w-2xl max-h-[90vh] overflow-y-auto',
            }}
          >
            <div className='p-4'>
              <ConfettiEditor
                config={localConfig}
                onConfigChange={setLocalConfig}
                onPreview={playConfettiPreview}
              />
            </div>
          </ResponsiveDialog>
        </div>

        {/* 操作按钮 */}
        <div className='flex gap-2 pt-4 border-t'>
          {onRemove && (
            <Button variant='outline' onClick={handleRemove}>
              <Trash2 className='w-4 h-4 mr-1' />
              删除
            </Button>
          )}
          <span className='flex-1'></span>
          <Button
            variant='outline'
            onClick={handleReset}
            disabled={!hasUnsavedChanges}
          >
            <RotateCcw className='w-4 h-4 mr-1' />
            重置
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges || !isConfigComplete}
          >
            <Save className='w-4 h-4 mr-1' />
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </>
  );
}

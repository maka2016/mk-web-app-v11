'use client';

import { Button } from '@workspace/ui/components/button';
import { Label } from '@workspace/ui/components/label';
import { Slider } from '@workspace/ui/components/slider';
import { UploadHelper } from '@workspace/ui/components/Upload';
import { RotateCcw, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { EnvelopeConfig, isEnvelopeConfigComplete } from './types';

const normalizeConfig = (config?: EnvelopeConfig): EnvelopeConfig => {
  const fallback: EnvelopeConfig = {
    duration: 2000,
    delay: 500,
    easing: 'ease-in-out',
  };

  if (!config) {
    return fallback;
  }

  const restConfig = { ...config } as EnvelopeConfig & {
    videoBgConfig?: unknown;
  };
  delete restConfig.videoBgConfig;

  return {
    ...fallback,
    ...(restConfig as EnvelopeConfig),
  };
};

interface EnvelopeEditorProps {
  editorCtx: any;
  value?: EnvelopeConfig;
  onChange: (config: EnvelopeConfig) => Promise<void>;
  onRemove?: () => void;
}

const ENVELOPE_WIDTH_PX = 720;
const ENVELOPE_HEIGHT_PX = Math.round((162 / 114) * ENVELOPE_WIDTH_PX);

const IMAGE_FIELDS = [
  {
    key: 'backgroundImage',
    label: '作品背景图',
    sizeHint: '建议较大尺寸，用于平铺',
    description: '作为整个加载页面的背景',
  },
  {
    key: 'outerTexture',
    label: '外侧材质贴纸',
    sizeHint: '建议较大尺寸，用于平铺',
    description: '用于左右开口的外侧',
  },
  {
    key: 'innerTexture',
    label: '内侧材质贴纸',
    sizeHint: '建议较大尺寸，用于平铺',
    description: '用于左右开口的内侧和信封内页',
  },
  {
    key: 'envelopeSealImage',
    label: '信封印章',
    sizeHint: `${ENVELOPE_WIDTH_PX} × ${ENVELOPE_HEIGHT_PX}px`,
    description: '引导用户点击开启',
  },
] as const;

export default function EnvelopeEditor(props: EnvelopeEditorProps) {
  const { editorCtx, onRemove } = props;
  const [saving, setSaving] = useState(false);
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
      toast.error('请先上传信封所需的4张图片');
      return;
    }

    setSaving(true);
    try {
      await props.onChange(localConfig);
      toast.success('保存成功');
    } catch (err) {
      console.error('保存失败:', err);
      toast.error('保存失败');
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
    <div className='space-y-4 p-4 max-h-[80vh] overflow-y-auto'>
      {/* 图片上传区域 */}
      <div className='space-y-3'>
        <Label>信封图片 (共4张)</Label>
        <div className='grid grid-cols-2 gap-3'>
          {IMAGE_FIELDS.map(({ key, label, sizeHint, description }) => (
            <div key={key} className='space-y-2'>
              <Label className='text-xs flex flex-col gap-1'>
                <span className='font-medium'>{label}</span>
                <span className='text-[10px] text-gray-400'>{description}</span>
                <span className='text-[10px] text-gray-500'>{sizeHint}</span>
              </Label>
              <UploadHelper
                image={localConfig[key as keyof EnvelopeConfig] as string}
                onRemove={() => handleImageChange(key, '')}
                onUpload={() => {
                  editorCtx?.utils.showSelector({
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

      {/* 动画参数 */}
      <div className='space-y-3'>
        <Label>动画参数</Label>
        <div className='space-y-2'>
          <Label className='text-xs'>持续时间: {localConfig.duration}ms</Label>
          <Slider
            value={[localConfig.duration || 2000]}
            onValueChange={value => {
              setLocalConfig({
                ...localConfig,
                duration: value[0],
              });
            }}
            min={500}
            max={5000}
            step={100}
          />
        </div>
        <div className='space-y-2'>
          <Label className='text-xs'>延迟时间: {localConfig.delay}ms</Label>
          <Slider
            value={[localConfig.delay || 500]}
            onValueChange={value => {
              setLocalConfig({
                ...localConfig,
                delay: value[0],
              });
            }}
            min={0}
            max={3000}
            step={100}
          />
        </div>
      </div>

      {/* 操作按钮 */}
      <div className='flex gap-2 pt-4 border-t'>
        <Button
          onClick={handleSave}
          disabled={saving || !hasUnsavedChanges || !isConfigComplete}
          className='flex-1'
        >
          <Save className='w-4 h-4 mr-1' />
          {saving ? '保存中...' : '保存'}
        </Button>
        <Button
          variant='outline'
          onClick={handleReset}
          disabled={!hasUnsavedChanges}
        >
          <RotateCcw className='w-4 h-4 mr-1' />
          重置
        </Button>
        {onRemove && (
          <Button variant='destructive' onClick={handleRemove}>
            <Trash2 className='w-4 h-4 mr-1' />
            删除
          </Button>
        )}
      </div>
    </div>
  );
}

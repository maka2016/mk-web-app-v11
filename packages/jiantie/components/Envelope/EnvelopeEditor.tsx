import { uploadFile2 } from '@mk/services';
import { Button } from '@workspace/ui/components/button';
import { Label } from '@workspace/ui/components/label';
import { Slider } from '@workspace/ui/components/slider';
import { UploadHelper } from '@workspace/ui/components/Upload';
import { Play, RotateCcw, Save, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import EnvelopeAnimation, { EnvelopeAnimationRef } from './EnvelopeAnimation';
import { EnvelopeConfig, isEnvelopeConfigComplete } from './types';

interface EnvelopeEditorProps {
  editorCtx: any;
  value?: EnvelopeConfig;
  onChange: (config: EnvelopeConfig) => Promise<void>;
  onRemove?: () => void;
}

const IMAGE_FIELDS = [
  { key: 'backgroundImage', label: '加载页背景' },
  { key: 'envelopeFrontImage', label: '信封正面' },
  { key: 'envelopeLeftImage', label: '信封左侧' },
  { key: 'envelopeRightImage', label: '信封右侧' },
  { key: 'envelopeInnerImage', label: '信封内页' },
  { key: 'envelopeSealImage', label: '信封印章' },
] as const;

export default function EnvelopeEditor(props: EnvelopeEditorProps) {
  const { editorCtx, onRemove } = props;
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const animationRef = useRef<EnvelopeAnimationRef>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // 本地状态
  const [localConfig, setLocalConfig] = useState<EnvelopeConfig>(
    props.value || {
      duration: 2000,
      delay: 500,
      easing: 'ease-in-out',
    }
  );

  // 检查是否有未保存的更改
  const hasUnsavedChanges =
    JSON.stringify(localConfig) !== JSON.stringify(props.value);

  const isConfigComplete = isEnvelopeConfigComplete(localConfig);

  // 更新图片
  const handleImageChange = (key: string, url: string) => {
    setLocalConfig({
      ...localConfig,
      [key]: url,
    });
  };

  // 更新视频背景
  const handleVideoBgChange = (videoUrl: string) => {
    setLocalConfig({
      ...localConfig,
      videoBgConfig: {
        ...(localConfig.videoBgConfig || {}),
        videoUrl,
        loop: true,
        muted: true,
        objectFit: 'cover',
      },
    });
  };

  // 视频上传
  const handleVideoUpload = async (file: File) => {
    // 检查文件类型（仅支持 iOS/Android 浏览器支持的格式）
    const validTypes = ['video/mp4', 'video/webm'];
    if (!validTypes.includes(file.type)) {
      toast.error('仅支持 MP4 和 WebM 格式');
      return;
    }

    // 检查文件大小（15MB）
    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('视频文件不能超过 15MB');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const result = await uploadFile2(
        {
          file,
          type: 'video',
        },
        progress => {
          setUploadProgress(Math.round(progress * 100));
        }
      );

      handleVideoBgChange(result.url);
      toast.success('视频上传成功');
    } catch (error) {
      console.error('视频上传失败:', error);
      toast.error('视频上传失败');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // 播放预览
  const handlePlayPreview = () => {
    if (!isConfigComplete) {
      toast.error('请先上传所有6张信封图片');
      return;
    }
    if (isPlaying) return;
    setIsPlaying(true);
    animationRef.current?.startAnimation();
  };

  // 重置预览
  const handleResetPreview = () => {
    setIsPlaying(false);
    animationRef.current?.resetAnimation();
  };

  // 保存
  const handleSave = async () => {
    if (!isConfigComplete) {
      toast.error('请先上传所有6张信封图片');
      return;
    }

    setSaving(true);
    try {
      await props.onChange(localConfig);
      toast.success('保存成功');
    } catch (error) {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 重置
  const handleReset = () => {
    setLocalConfig(
      props.value || {
        duration: 2000,
        delay: 500,
        easing: 'ease-in-out',
      }
    );
  };

  // 删除
  const handleRemove = () => {
    if (onRemove) {
      onRemove();
    }
  };

  return (
    <div className='space-y-4 p-4 max-h-[80vh] overflow-y-auto'>
      {/* 预览区域 */}
      <div className='space-y-2'>
        <Label>预览</Label>
        <div className='relative w-full aspect-[16/9] bg-gray-100 rounded-lg overflow-hidden'>
          <EnvelopeAnimation
            ref={animationRef}
            config={localConfig}
            onComplete={() => setIsPlaying(false)}
          >
            <div className='w-full h-full flex items-center justify-center text-gray-400'>
              {isConfigComplete ? '点击播放预览动画' : '请先上传所有图片'}
            </div>
          </EnvelopeAnimation>
        </div>
        <div className='flex gap-2'>
          <Button
            size='sm'
            variant='outline'
            onClick={handlePlayPreview}
            disabled={!isConfigComplete || isPlaying}
          >
            <Play className='w-4 h-4 mr-1' />
            播放
          </Button>
          <Button
            size='sm'
            variant='outline'
            onClick={handleResetPreview}
            disabled={!isPlaying}
          >
            <RotateCcw className='w-4 h-4 mr-1' />
            重置
          </Button>
        </div>
      </div>

      {/* 图片上传区域 */}
      <div className='space-y-3'>
        <Label>信封图片 (共6张)</Label>
        <div className='grid grid-cols-2 gap-3'>
          {IMAGE_FIELDS.map(({ key, label }) => (
            <div key={key} className='space-y-2'>
              <Label className='text-xs'>{label}</Label>
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

      {/* 视频背景 */}
      <div className='space-y-2'>
        <Label>视频背景 (可选)</Label>
        <div className='space-y-2'>
          {localConfig.videoBgConfig?.videoUrl ? (
            <div className='relative'>
              <video
                src={localConfig.videoBgConfig.videoUrl}
                className='w-full aspect-video rounded-lg'
                controls
                muted
              />
              <Button
                size='sm'
                variant='destructive'
                className='absolute top-2 right-2'
                onClick={() => {
                  setLocalConfig({
                    ...localConfig,
                    videoBgConfig: undefined,
                  });
                }}
              >
                <Trash2 className='w-4 h-4' />
              </Button>
            </div>
          ) : (
            <div className='border-2 border-dashed border-gray-300 rounded-lg p-6'>
              <input
                type='file'
                accept='video/mp4,video/webm'
                className='hidden'
                id='video-upload'
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleVideoUpload(file);
                  }
                }}
              />
              <label
                htmlFor='video-upload'
                className='flex flex-col items-center cursor-pointer'
              >
                <Upload className='w-8 h-8 text-gray-400 mb-2' />
                <span className='text-sm text-gray-600'>
                  {uploading ? `上传中... ${uploadProgress}%` : '点击上传视频'}
                </span>
                <span className='text-xs text-gray-400 mt-1'>
                  支持 MP4/WebM，最大 15MB
                </span>
              </label>
            </div>
          )}
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

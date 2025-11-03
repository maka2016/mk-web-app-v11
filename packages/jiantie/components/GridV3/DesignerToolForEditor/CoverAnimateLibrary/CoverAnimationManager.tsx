import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import {
  RadioGroup,
  RadioGroupItem,
} from '@workspace/ui/components/radio-group';
import { Slider } from '@workspace/ui/components/slider';
import { UploadHelper } from '@workspace/ui/components/Upload';
import { Play, RotateCcw, Save, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import AnimateCover, {
  AnimateCoverRef,
} from '../../comp/components/AnimateCover';
import { useGridContext } from '../../comp/provider';
import { CoverAnimationConfig } from '../../shared/types';

// 预览组件
export function CoverPreview({
  coverAnimation,
  onSave,
}: {
  coverAnimation: CoverAnimationConfig;
  onSave: (coverAnimation: CoverAnimationConfig) => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const animateCoverRef = useRef<AnimateCoverRef>(null);

  const handlePlayPreview = () => {
    // 如果正在播放中，不允许重复播放
    if (isPlaying) return;

    setIsPlaying(true);
  };

  const handleResetPreview = () => {
    setIsPlaying(false);
  };

  useEffect(() => {
    if (isPlaying) {
      animateCoverRef.current?.startAnimation();
    } else {
      animateCoverRef.current?.resetAnimation();
    }
  }, [isPlaying]);

  return (
    <div
      className='relative w-full h-full overflow-hidden'
      style={{
        aspectRatio: '375/768',
      }}
    >
      {/* 使用AnimateCover组件进行预览 */}
      <div className='w-full h-full'>
        <AnimateCover
          ref={animateCoverRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
          coverAnimation={coverAnimation}
          onPlay={() => setIsPlaying(true)}
          onComplete={() => setIsPlaying(false)}
        >
          {/* 预览内容 */}
          <div className='w-full h-full flex items-center justify-center'>
            <div className='text-center'>
              <div className='text-2xl mb-1'>🎨</div>
              <div className='text-xs'>内容区域</div>
            </div>
          </div>
        </AnimateCover>
      </div>

      {/* 预览控制按钮 */}
      <div className='absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1 z-30'>
        <Button
          onClick={handlePlayPreview}
          disabled={
            isPlaying ||
            (!coverAnimation.coverUrl[0] && !coverAnimation.coverUrl[1])
          }
          variant='outline'
        >
          <Play className='h-3 w-3 mr-1' />
          预览
        </Button>

        <Button onClick={handleResetPreview} variant='outline'>
          <RotateCcw className='h-3 w-3 mr-1' />
          重置
        </Button>

        <Button onClick={() => onSave(coverAnimation)} variant='outline'>
          <Save className='h-3 w-3 mr-1' />
          应用到作品
        </Button>
      </div>

      {/* 播放状态指示器 */}
      {isPlaying && (
        <div className='absolute top-2 right-2 z-30'>
          <div className='bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs animate-pulse'>
            播放中...
          </div>
        </div>
      )}
    </div>
  );
}

interface CoverAnimationManagerProps {
  editorCtx: any;
  value?: CoverAnimationConfig;
  onChange: (coverAnimation: CoverAnimationConfig) => Promise<void>;
  onRemove?: () => void;
}

export default function CoverAnimationManager(
  props: CoverAnimationManagerProps
) {
  const { designerInfo } = useGridContext();
  const { editorCtx, onRemove } = props;
  const [saving, setSaving] = useState(false);

  // 本地状态，用于临时存储未保存的更改
  const [localCoverAnimation, setLocalCoverAnimation] =
    useState<CoverAnimationConfig>(
      props.value || {
        type: 'page_flip',
        coverUrl: ['', ''],
        duration: 1000,
        delay: 0,
        easing: 'ease-in-out',
        name: '',
        author: '',
      }
    );

  // 检查是否有未保存的更改
  const hasUnsavedChanges =
    JSON.stringify(localCoverAnimation) !== JSON.stringify(props.value);

  const handleCoverUrlChange = (index: number, url: string) => {
    const newUrls: [string, string] = [...localCoverAnimation.coverUrl] as [
      string,
      string,
    ];
    newUrls[index] = url;
    setLocalCoverAnimation({
      ...localCoverAnimation,
      coverUrl: newUrls,
    });
  };

  const handleDurationChange = (value: number[]) => {
    setLocalCoverAnimation({
      ...localCoverAnimation,
      duration: value[0],
    });
  };

  const handleDelayChange = (value: number[]) => {
    setLocalCoverAnimation({
      ...localCoverAnimation,
      delay: value[0],
    });
  };

  const handleEasingChange = (easing: string) => {
    setLocalCoverAnimation({
      ...localCoverAnimation,
      easing,
    });
  };

  const handleTypeChange = (type: 'page_flip' | 'vertical_split') => {
    setLocalCoverAnimation({
      ...localCoverAnimation,
      type,
    });
  };

  const handleNameChange = (name: string) => {
    setLocalCoverAnimation({
      ...localCoverAnimation,
      name,
    });
  };

  const handleAuthorChange = (author: string) => {
    setLocalCoverAnimation({
      ...localCoverAnimation,
      author,
    });
  };
  const handleSave = () => {
    setSaving(true);
    props.onChange(localCoverAnimation).then(() => {
      setSaving(false);
    });
  };

  const handleReset = () => {
    setLocalCoverAnimation(
      props.value || {
        type: 'page_flip',
        coverUrl: ['', ''],
        duration: 1000,
        delay: 0,
        easing: 'ease-in-out',
        name: '',
        author: '',
      }
    );
  };

  return (
    <div className='space-y-4 p-4'>
      <div className='space-y-3'>
        <div className='flex gap-2'>
          <div className='space-y-2'>
            <Label className='flex items-center gap-1 text-xs'>名称</Label>
            <Input
              type='text'
              placeholder='请输入动画名称'
              value={localCoverAnimation.name || ''}
              onChange={e => handleNameChange(e.target.value)}
              className='w-full'
            />
          </div>

          <div className='space-y-2'>
            <Label className='flex items-center gap-1 text-xs'>作者</Label>
            <Input
              placeholder='请输入动画作者'
              value={designerInfo.fullName}
              onChange={e => handleAuthorChange(e.target.value)}
              className='w-full'
            />
          </div>
        </div>
      </div>

      <div className='space-y-3'>
        {/* 动画类型选择 */}
        <div className='space-y-2'>
          <Label className='flex items-center gap-1 text-xs'>动画类型</Label>
          <RadioGroup
            value={localCoverAnimation.type || 'page_flip'}
            onValueChange={(value: 'page_flip' | 'vertical_split') =>
              handleTypeChange(value)
            }
            className='flex gap-6'
          >
            <div className='flex items-center space-x-2'>
              <RadioGroupItem value='page_flip' id='page_flip' />
              <Label htmlFor='page_flip' className='text-xs cursor-pointer'>
                左右打开
              </Label>
            </div>
            <div className='flex items-center space-x-2'>
              <RadioGroupItem value='vertical_split' id='vertical_split' />
              <Label
                htmlFor='vertical_split'
                className='text-xs cursor-pointer'
              >
                上下打开
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className='grid grid-cols-2 gap-3'>
          <div className='space-y-2'>
            <Label className='flex items-center gap-1 text-xs'>
              {localCoverAnimation.type === 'vertical_split'
                ? '上半部分'
                : '左边图片'}
            </Label>
            <UploadHelper
              image={localCoverAnimation.coverUrl[0]}
              onRemove={() => {
                handleCoverUrlChange(0, '');
              }}
              onUpload={() => {
                editorCtx?.utils.showSelector({
                  onSelected: (params: any) => {
                    const { url, type, ossPath } = params;
                    handleCoverUrlChange(0, url);
                  },
                  type: 'picture',
                });
              }}
            />
          </div>

          <div className='space-y-2'>
            <Label className='flex items-center gap-1 text-xs'>
              {localCoverAnimation.type === 'vertical_split'
                ? '下半部分'
                : '右边图片'}
            </Label>

            <UploadHelper
              image={localCoverAnimation.coverUrl[1]}
              onRemove={() => {
                handleCoverUrlChange(1, '');
              }}
              onUpload={() => {
                editorCtx?.utils.showSelector({
                  onSelected: (params: any) => {
                    const { url, type, ossPath } = params;
                    handleCoverUrlChange(1, url);
                  },
                  type: 'picture',
                });
              }}
            />
          </div>
        </div>
      </div>

      {/* 动画参数 */}
      <div className='space-y-3'>
        <div className='space-y-1'>
          <Label className='flex items-center gap-1 text-xs'>
            动画时长: {localCoverAnimation.duration || 1000}ms
          </Label>
          <Slider
            value={[localCoverAnimation.duration || 1000]}
            onValueChange={handleDurationChange}
            max={3000}
            min={200}
            step={100}
            className='w-full'
          />
        </div>

        <div className='space-y-1'>
          <Label className='flex items-center gap-1 text-xs'>
            延迟时间: {localCoverAnimation.delay || 0}ms
          </Label>
          <Slider
            value={[localCoverAnimation.delay || 0]}
            onValueChange={handleDelayChange}
            max={2000}
            min={0}
            step={100}
            className='w-full'
          />
        </div>

        <div className='space-y-2'>
          <Label className='text-xs'>缓动函数</Label>
          <RadioGroup
            value={localCoverAnimation.easing || 'ease-in-out'}
            onValueChange={value => handleEasingChange(value)}
            className='flex gap-2'
          >
            <div className='flex items-center space-x-1'>
              <RadioGroupItem value='ease-in-out' id='ease-in-out' />
              <Label htmlFor='ease-in-out' className='text-xs cursor-pointer'>
                ease-in-out
              </Label>
            </div>
            <div className='flex items-center space-x-1'>
              <RadioGroupItem value='ease-in' id='ease-in' />
              <Label htmlFor='ease-in' className='text-xs cursor-pointer'>
                ease-in
              </Label>
            </div>
            <div className='flex items-center space-x-1'>
              <RadioGroupItem value='ease-out' id='ease-out' />
              <Label htmlFor='ease-out' className='text-xs cursor-pointer'>
                ease-out
              </Label>
            </div>
            <div className='flex items-center space-x-1'>
              <RadioGroupItem value='linear' id='linear' />
              <Label htmlFor='linear' className='text-xs cursor-pointer'>
                linear
              </Label>
            </div>
            <div className='flex items-center space-x-1 col-span-2'>
              <RadioGroupItem
                value='cubic-bezier(0.68, -0.55, 0.265, 1.55)'
                id='bounce'
              />
              <Label htmlFor='bounce' className='text-xs cursor-pointer'>
                bounce
              </Label>
            </div>
          </RadioGroup>
        </div>
      </div>

      <div className='flex gap-2 pt-2 border-t justify-between'>
        <div className='flex gap-2 ml-auto'>
          {props.value && (
            <Button
              onClick={onRemove}
              variant='outline'
              size='sm'
              className='h-8'
            >
              <Trash2 className='h-3 w-3 mr-1' />
              删除动画
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={saving}
            size='sm'
            className='h-8'
          >
            <Save className='h-3 w-3 mr-1' />
            保存
          </Button>
          <Button
            onClick={handleReset}
            disabled={!hasUnsavedChanges}
            variant='outline'
            size='sm'
            className='h-8'
          >
            <RotateCcw className='h-3 w-3' />
          </Button>
        </div>
      </div>
    </div>
  );
}

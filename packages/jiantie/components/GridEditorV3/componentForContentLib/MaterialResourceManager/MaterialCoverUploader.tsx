import { cdnApi, uploadFile2 } from '@/services';
import { Button } from '@workspace/ui/components/button';
import { cn } from '@workspace/ui/lib/utils';
import { Image as ImageIcon, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';

interface MaterialCoverUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  /** 最大文件大小（MB） */
  maxSizeMb?: number;
}

export function MaterialCoverUploader({
  value,
  onChange,
  disabled,
  maxSizeMb = 20,
}: MaterialCoverUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const openPicker = () => {
    if (disabled || uploading) return;
    inputRef.current?.click();
  };

  const handleUpload = async (file: File) => {
    if (!file) return;

    if (!file.type?.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }

    const maxBytes = maxSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(`文件不能超过 ${maxSizeMb}MB`);
      return;
    }

    setUploading(true);
    setProgress(0);
    const toastId = toast.loading('封面上传中...');

    try {
      const result = await uploadFile2(
        {
          file,
          type: 'picture',
        },
        p => {
          const safe = Number.isFinite(p) ? Math.max(0, Math.min(1, p)) : 0;
          setProgress(safe);
        }
      );

      // 注意：这里回填的是 OSS 路径（如 `/cdn/xxx`），展示时用 cdnApi 包一层即可
      onChange(result.url);
      toast.success('封面上传成功', { id: toastId });
    } catch (error) {
      console.error('[MaterialCoverUploader] upload failed:', error);
      toast.error('封面上传失败，请重试', { id: toastId });
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <div className='flex items-start gap-3'>
      <input
        ref={inputRef}
        type='file'
        accept='image/*'
        className='hidden'
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) {
            void handleUpload(file);
          }
        }}
      />

      <button
        type='button'
        onClick={openPicker}
        disabled={disabled || uploading}
        className={cn(
          'relative w-24 h-24 rounded-lg overflow-hidden border border-input bg-muted/30 flex items-center justify-center',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          disabled || uploading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
        )}
        title={disabled ? '不可用' : '点击上传封面'}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cdnApi(value, { resizeWidth: 192, resizeHeight: 192 })}
            alt='封面'
            className='w-full h-full object-cover'
          />
        ) : (
          <div className='flex flex-col items-center justify-center text-muted-foreground'>
            <ImageIcon className='h-6 w-6' />
            <div className='mt-1 text-xs'>点击上传</div>
          </div>
        )}

        {uploading && (
          <div className='absolute inset-0 bg-black/50 text-white flex items-center justify-center text-xs'>
            {Math.round(progress * 100)}%
          </div>
        )}
      </button>

      <div className='flex flex-col gap-2'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={openPicker}
          disabled={disabled || uploading}
          className='justify-start'
        >
          <Upload className='h-4 w-4 mr-2' />
          选择图片
        </Button>

        {value ? (
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => onChange('')}
            disabled={disabled || uploading}
            className='justify-start'
          >
            <X className='h-4 w-4 mr-2' />
            清除
          </Button>
        ) : null}
      </div>
    </div>
  );
}


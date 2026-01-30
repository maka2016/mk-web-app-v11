import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import { uploadFile } from '@/services';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { Loading } from '@workspace/ui/components/loading';
import { useTranslations } from 'next-intl';
import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

interface Props {
  worksId: string;
  imageUrl: string;

  onClose: () => void;
  onChange: (url: string) => void;
}

const ImageCropper: React.FC<Props> = ({
  imageUrl,
  onClose,
  onChange,
  worksId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const cropBoxRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [cropBoxSize, setCropBoxSize] = useState({ width: 0, height: 0 });
  const [uploading, setUploading] = useState(false);
  const t = useTranslations('Share');

  // 初始化图片尺寸和裁剪框尺寸
  useEffect(() => {
    const img = imgRef.current;
    const cropBox = cropBoxRef.current;

    if (img && cropBox) {
      const updateSizes = () => {
        const screenWidth = window.innerWidth;
        // 计算图片的初始缩放比例，使其宽度适应屏幕
        const initialScale = screenWidth / img.naturalWidth;
        setImageSize({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });

        setCropBoxSize({
          width: cropBox.clientWidth,
          height: cropBox.clientHeight,
        });

        // 设置初始缩放比例
        setScale(initialScale);
      };

      img.onload = updateSizes;
      updateSizes();
    }
  }, [imageUrl]);

  // 计算图片在裁剪框中的实际尺寸和可移动范围
  const calculateBounds = (currentScale: number) => {
    const scaledWidth = imageSize.width * currentScale;
    const scaledHeight = imageSize.height * currentScale;

    // 计算可移动的最大范围
    const maxX = Math.max(0, (scaledWidth - cropBoxSize.width) / 2);
    const maxY = Math.max(0, (scaledHeight - cropBoxSize.height) / 2);

    return {
      maxX,
      maxY,
      scaledWidth,
      scaledHeight,
    };
  };

  // 处理拖拽开始
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    target.setPointerCapture(e.pointerId);

    setDragging(true);
    setStartPos({
      x: e.clientX,
      y: e.clientY,
    });
  };

  // 处理拖拽移动
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;

    const deltaX = e.clientX - startPos.x;
    const deltaY = e.clientY - startPos.y;

    const { maxX, maxY } = calculateBounds(scale);

    // 计算新的位置，确保不会超出边界
    const newX = clamp(position.x + deltaX, -maxX, maxX);
    const newY = clamp(position.y + deltaY, -maxY, maxY);

    setPosition({ x: newX, y: newY });
    setStartPos({ x: e.clientX, y: e.clientY });
  };

  // 处理拖拽结束
  const handlePointerUp = () => {
    setDragging(false);
  };

  // 辅助函数：限制值在范围内
  const clamp = (value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max);
  };

  // 处理缩放
  const handleZoom = (newScale: number) => {
    const { maxX, maxY } = calculateBounds(newScale);

    // 调整位置以确保图片不会超出边界
    const newX = clamp(position.x, -maxX, maxX);
    const newY = clamp(position.y, -maxY, maxY);

    setPosition({ x: newX, y: newY });
    setScale(newScale);
  };

  const handleZoomIn = () => handleZoom(Math.min(5, scale + 0.2));
  const handleZoomOut = () => {
    const minScale = Math.max(
      cropBoxSize.width / imageSize.width,
      cropBoxSize.height / imageSize.height
    );
    handleZoom(Math.max(minScale, scale - 0.2));
  };

  async function cropImageFromTransform(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = cropBoxSize.width;
        canvas.height = cropBoxSize.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Canvas context not available');

        const cropLeft = (imageSize.width * scale - cropBoxSize.width) / 2;
        const cropTop = (imageSize.height * scale - cropBoxSize.height) / 2;
        const x = Math.max(0, (cropLeft - position.x) / scale);
        const y = Math.max(0, (cropTop - position.y) / scale);
        const w = cropBoxSize.width / scale;
        const h = cropBoxSize.height / scale;

        ctx.drawImage(
          img,
          x,
          y,
          w,
          h, // 源图片裁剪区域
          0,
          0,
          cropBoxSize.width,
          cropBoxSize.height // canvas绘制区域
        );

        canvas.toBlob(blob => {
          if (blob) {
            // const croppedBlobUrl = URL.createObjectURL(blob);
            resolve(blob);
          } else {
            reject('Failed to convert canvas to blob');
          }
          canvas.remove();
        }, 'image/png');
      };
      img.onerror = reject;
      img.src = imageUrl;
    });
  }

  const uploadAction = async (file: File) => {
    const res = await uploadFile({
      file,
      worksId,
    });
    return res;
  };

  const handleSave = async () => {
    setUploading(true);
    try {
      const blob = await cropImageFromTransform();

      let mimeType = blob.type || 'application/octet-stream';

      // 创建默认选项
      const defaultOptions = {
        type: mimeType,
        lastModified: new Date().getTime(),
      };

      // 创建File对象
      const file = new File([blob], 'file', defaultOptions);
      const res = await uploadAction(file);
      if (res?.url) {
        onChange(res.url);
        onClose();
      }
    } catch (error: any) {
      toast.error(error?.message || '请求超时，请重试');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className='relative w-full h-[80vh] flex flex-col'>
      <MobileHeader title={'调整封面'} onClose={() => onClose()} />
      <div
        className='relative flex-1 bg-black overflow-hidden select-none touch-none'
        ref={containerRef}
      >
        <div className='absolute top-0 left-0 w-full h-full flex items-center justify-center overflow-hidden pointer-events-none'>
          <img
            src={imageUrl}
            alt='background preview'
            className='max-w-none max-h-none pointer-events-none will-change-transform'
            style={{
              opacity: 0.5,
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'center',
            }}
          />
        </div>
        <div
          className='absolute left-1/2 w-full text-white text-center z-[2]'
          style={{
            top: 'calc(50% - 174px)',
            transform: 'translate(-50%, -100%)',
            fontFamily: 'PingFang SC',
            fontSize: '16px',
            lineHeight: '24px',
            letterSpacing: '0px',
          }}
        >
          {t('cropTip')}
        </div>
        <div
          className='absolute left-1/2 border-2 border-white overflow-hidden z-[1]'
          style={{
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '300px',
            height: '300px',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.3)',
          }}
          ref={cropBoxRef}
        >
          <div
            className='absolute top-0 left-0 w-full h-full flex items-center justify-center overflow-hidden'
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              cursor: dragging ? 'grabbing' : 'grab',
              touchAction: 'none',
            }}
          >
            <img
              ref={imgRef}
              src={imageUrl}
              alt='crop preview'
              className='absolute max-w-none max-h-none pointer-events-none will-change-transform'
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transformOrigin: 'center',
              }}
              draggable={false}
            />
          </div>
        </div>
        <div
          className='absolute left-1/2 flex items-center bg-white/90 rounded-[20px] px-4 py-2 z-[2] shadow-[0_2px_8px_rgba(0,0,0,0.15)]'
          style={{
            top: 'calc(50% + 186px)',
            transform: 'translateX(-50%)',
          }}
        >
          <div
            className='flex items-center gap-1 px-2 cursor-pointer'
            onClick={handleZoomIn}
          >
            <Icon name='zoom-in' size={18} />
            <span className='whitespace-nowrap text-sm text-[#333]'>
              {t('zoomIn')}
            </span>
          </div>
          <div className='w-px h-4 bg-[#ddd] mx-2'></div>
          <div
            className='flex items-center gap-1 px-2 cursor-pointer'
            onClick={handleZoomOut}
          >
            <Icon name='zoom-out' size={18} />
            <span className='whitespace-nowrap text-sm text-[#333]'>
              {t('zoomOut')}
            </span>
          </div>
        </div>
      </div>
      <div className='w-full bg-white border-t border-border px-4 py-3 flex gap-3 z-10'>
        <Button
          variant='outline'
          size='lg'
          className='flex-1'
          onClick={() => onClose()}
          disabled={uploading}
        >
          取消
        </Button>
        <Button
          variant='default'
          size='lg'
          className='flex-1'
          onClick={() => {
            handleSave();
          }}
          disabled={uploading}
        >
          完成
        </Button>
      </div>
      {uploading && (
        <div className='absolute inset-0 z-10 bg-black/45 flex items-center justify-center'>
          <Loading size={30} />
        </div>
      )}
    </div>
  );
};

export default ImageCropper;

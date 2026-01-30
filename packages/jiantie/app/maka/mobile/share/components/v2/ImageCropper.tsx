import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import { uploadFile } from '@/services';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { Loading } from '@workspace/ui/components/loading';
import { useTranslations } from 'next-intl';
import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import styles from './index.module.scss';

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
  const handlePointerUp = (e: React.PointerEvent) => {
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
    try {
      const res = await uploadFile({
        file,
        worksId,
      });
      return res;
    } catch (error: any) {
      setUploading(false);
      toast.error(error?.message || '请求超时，请重试');
    }
  };

  const handleSave = async () => {
    setUploading(true);
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
    onChange(res?.url || '');
    // setUploading(false);
  };

  return (
    <div className={styles.imageCropperContainer}>
      <MobileHeader
        title={'调整封面'}
        onClose={() => onClose()}
        rightContent={
          <Button
            size='sm'
            onClick={() => {
              handleSave();
            }}
          >
            {t('done')}
          </Button>
        }
      />
      <div className={styles.imageCropper} ref={containerRef}>
        <div className={styles.imageContainer}>
          <img
            src={imageUrl}
            alt='background preview'
            style={{
              opacity: 0.5,
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'center',
              willChange: 'transform',
            }}
          />
        </div>
        <div className={styles.tip}>{t('cropTip')}</div>
        <div className={styles.cropBox} ref={cropBoxRef}>
          <div
            className={styles.cropImage}
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
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transformOrigin: 'center',
                willChange: 'transform',
              }}
              draggable={false}
            />
          </div>
        </div>
        {/* <div className={styles.mask} /> */}
        <div className={styles.zoomBtn}>
          <div className={styles.zoomBtnItem} onClick={handleZoomIn}>
            <Icon name='zoom-in' size={18} />
            <span>{t('zoomIn')}</span>
          </div>
          <div className={styles.line}></div>
          <div className={styles.zoomBtnItem} onClick={handleZoomOut}>
            <Icon name='zoom-out' size={18} />
            <span>{t('zoomOut')}</span>
          </div>
        </div>
      </div>
      {uploading && (
        <div className={styles.uploadLoading}>
          <Loading size={30} />
        </div>
      )}
    </div>
  );
};

export default ImageCropper;

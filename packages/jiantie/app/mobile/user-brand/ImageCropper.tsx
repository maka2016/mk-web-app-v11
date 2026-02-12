import React, { useRef, useState } from 'react';
import 'react-image-crop/dist/ReactCrop.css';
import styles from './ImageCropper.module.scss';

import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import { uploadFile } from '@/services';
import { Button } from '@workspace/ui/components/button';
import { Loading } from '@workspace/ui/components/loading';
import toast from 'react-hot-toast';
import ReactCrop, {
  Crop,
  PixelCrop,
  centerCrop,
  makeAspectCrop,
} from 'react-image-crop';

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

interface Props {
  imageUrl: string;
  onClose: () => void;
  onChange: (url: string) => void;
}

const ImageCropper = (props: Props) => {
  const imgRef = useRef<HTMLImageElement>(null);

  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();

  const [uploading, setUploading] = useState(false);
  const [scale, setScale] = useState(1);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1));

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    // 考虑图片的宽高比和屏幕尺寸
    const widthScale = screenWidth / width; // 减去左右边距
    const heightScale = (screenHeight - 44) / height; // 减去头部和底部边距

    // 选择较小的缩放比例，确保图片完全适应屏幕
    const initialScale = Math.min(widthScale, heightScale, 1);

    // 设置初始缩放比例
    setScale(initialScale);
  }

  // 获取剪裁后的图片的 blob 对象
  async function getCroppedImageBlob() {
    const image = imgRef.current;
    console.log('completedCrop', completedCrop);
    if (!image || !completedCrop?.width || !completedCrop?.height) {
      return '';
    }
    const canvas = document.createElement('canvas');
    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('No 2D context available');
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const pixelRatio = window.devicePixelRatio;

    canvas.width = Math.floor(completedCrop.width * scaleX * pixelRatio);
    canvas.height = Math.floor(completedCrop.height * scaleY * pixelRatio);

    ctx.scale(pixelRatio, pixelRatio);
    ctx.imageSmoothingQuality = 'high';

    const cropX = completedCrop.x * scaleX;
    const cropY = completedCrop.y * scaleY;

    const centerX = image.naturalWidth / 2;
    const centerY = image.naturalHeight / 2;

    ctx.save();

    ctx.translate(-cropX, -cropY);
    ctx.translate(centerX, centerY);

    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);
    ctx.drawImage(
      image,
      0,
      0,
      image.naturalWidth,
      image.naturalHeight,
      0,
      0,
      image.naturalWidth,
      image.naturalHeight
    );

    const offscreen = new OffscreenCanvas(
      completedCrop.width * scaleX,
      completedCrop.height * scaleY
    );
    const ctx1 = offscreen.getContext('2d');
    if (!ctx1) {
      throw new Error('No 2d context');
    }

    ctx1.drawImage(
      canvas,
      0,
      0,
      canvas.width,
      canvas.height,
      0,
      0,
      offscreen.width,
      offscreen.height
    );

    const blob = await offscreen.convertToBlob({
      type: 'image/png',
    });

    canvas.remove();
    return blob;
  }

  const uploadAction = async (file: File) => {
    try {
      const res = await uploadFile({
        file,
        worksId: '',
      });
      return res;
    } catch (error: any) {
      setUploading(false);
      toast.error(error?.message || '请求超时，请重试');
    }
  };

  const handleSave = async () => {
    setUploading(true);
    const blob = await getCroppedImageBlob();
    if (!blob) {
      setUploading(false);
      toast.dismiss();
      toast.error('请选择裁剪区域');
      return;
    }

    let mimeType = blob.type || 'application/octet-stream';

    // 创建默认选项
    const defaultOptions = {
      type: mimeType,
      lastModified: new Date().getTime(),
    };

    // 创建File对象
    const file = new File([blob], 'file', defaultOptions);
    const res = await uploadAction(file);
    props.onChange(res?.url || '');
    // setUploading(false);
  };

  return (
    <div className={styles.container}>
      <MobileHeader
        className='flex-shrink-0'
        title='图片裁剪'
        onClose={() => props.onClose()}
        rightContent={
          <Button
            size='sm'
            onClick={() => {
              handleSave();
            }}
          >
            完成
          </Button>
        }
      />
      <div className={styles.cropperContent}>
        {!!props.imageUrl && (
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={c => setCompletedCrop(c)}
            minHeight={20}
            minWidth={20}
            keepSelection={true}
          >
            <img
              ref={imgRef}
              alt='Crop me'
              src={props.imageUrl}
              style={{
                transform: `scale(${scale})`,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
              onLoad={onImageLoad}
            />
          </ReactCrop>
        )}
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

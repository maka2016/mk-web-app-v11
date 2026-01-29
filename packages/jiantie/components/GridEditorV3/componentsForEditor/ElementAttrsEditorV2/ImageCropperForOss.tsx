import React, { useState, useRef, useEffect } from 'react';

interface ImageCropperForOssProps {
  /**
   * url地址
   */
  value: string;
  onChange: (cropResult: CropResult) => void;
  /**
   * 是否显示裁剪控件
   */
  showCropControls?: boolean;
}

// 裁剪结果接口
interface CropResult {
  url: string;
  cropValues: CropValues;
  cropBox: CropBox;
  imageSize: {
    width: number;
    height: number;
  };
}

// 裁剪值接口
interface CropValues {
  x: number;
  y: number;
  width: number;
  height: number;
  gravity: string;
}

// 裁剪框位置接口
interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// 拖拽类型 - 移除 'move' 类型
type DragType = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se' | null;

// 解析OSS裁剪URL参数
export const parseCropUrl = (url?: string): CropValues => {
  if (!url) return { x: 0, y: 0, width: 0, height: 0, gravity: 'nw' };

  try {
    const urlObj = new URL(url);
    const processParam = urlObj.searchParams.get('x-oss-process');

    if (!processParam)
      return { x: 0, y: 0, width: 0, height: 0, gravity: 'nw' };

    // 检查是否包含 image/crop 参数
    if (!processParam.includes('image/crop')) {
      return { x: 0, y: 0, width: 0, height: 0, gravity: 'nw' };
    }

    // 解析裁剪参数
    const params = processParam.split(',');
    const cropValues: CropValues = {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      gravity: 'nw',
    };

    params.forEach(param => {
      if (param.startsWith('x_')) {
        cropValues.x = parseInt(param.substring(2)) || 0;
      } else if (param.startsWith('y_')) {
        cropValues.y = parseInt(param.substring(2)) || 0;
      } else if (param.startsWith('w_')) {
        cropValues.width = parseInt(param.substring(2)) || 0;
      } else if (param.startsWith('h_')) {
        cropValues.height = parseInt(param.substring(2)) || 0;
      } else if (param.startsWith('g_')) {
        cropValues.gravity = param.substring(2);
      }
    });

    return cropValues;
  } catch {
    return { x: 0, y: 0, width: 0, height: 0, gravity: 'nw' };
  }
};

// 构建OSS裁剪URL
export const buildCropUrl = (
  baseUrl: string,
  cropValues: CropValues
): string => {
  if (!baseUrl) return '';

  try {
    const urlObj = new URL(baseUrl);

    // 只有当有实际的裁剪参数时才添加裁剪处理
    const hasCropParams =
      cropValues.x > 0 ||
      cropValues.y > 0 ||
      cropValues.width > 0 ||
      cropValues.height > 0;

    let processParam = '';

    if (hasCropParams) {
      // 构建裁剪参数
      const cropParams = [];
      if (cropValues.x > 0) cropParams.push(`x_${Math.round(cropValues.x)}`);
      if (cropValues.y > 0) cropParams.push(`y_${Math.round(cropValues.y)}`);
      if (cropValues.width > 0)
        cropParams.push(`w_${Math.round(cropValues.width)}`);
      if (cropValues.height > 0)
        cropParams.push(`h_${Math.round(cropValues.height)}`);
      if (cropValues.gravity && cropValues.gravity !== 'nw') {
        cropParams.push(`g_${cropValues.gravity}`);
      }

      if (cropParams.length > 0) {
        processParam = `image/crop,${cropParams.join(',')}/format,webp`;
        urlObj.searchParams.set('x-oss-process', processParam);
      }
    } else {
      // 没有裁剪参数，直接加webp格式
      urlObj.searchParams.set('x-oss-process', 'image/format,webp');
    }

    return urlObj.toString();
  } catch (error) {
    console.error('buildCropUrl error:', error, 'baseUrl:', baseUrl);
    return baseUrl;
  }
};

// 获取基础图片URL（移除裁剪参数）
const getBaseImageUrl = (url?: string): string => {
  if (!url) return '';

  try {
    const urlObj = new URL(url);
    urlObj.searchParams.delete('x-oss-process');
    return urlObj.toString();
  } catch (error) {
    console.error('getBaseImageUrl error:', error, 'url:', url);
    return url;
  }
};

export default function ImageCropperForOss(props: ImageCropperForOssProps) {
  const { value, onChange, showCropControls = true } = props;

  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [showDetail, setShowDetail] = useState(false);
  const [cropBox, setCropBox] = useState<CropBox>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [isEditing, setIsEditing] = useState(false);

  const draggingPositionRef = useRef<CropBox>(null);
  const dragTypeRef = useRef<DragType>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cropBoxRef = useRef<HTMLDivElement>(null);

  const baseUrl = getBaseImageUrl(value);

  // 计算缩放比例
  const getScaleRatio = () => {
    if (!imageRef.current || !containerRef.current) return 1;
    const containerWidth = containerRef.current.offsetWidth;
    // 按照容器宽度与图片原始宽度的比例计算缩放比例
    return imageSize.width / containerWidth;
  };

  // 初始化裁剪框
  useEffect(() => {
    if (imageLoaded && imageSize.width > 0 && imageSize.height > 0) {
      const { width, height } = imageSize;

      // 从URL解析裁剪参数
      const parsedCropValues = parseCropUrl(value);

      // 如果URL中已经包含裁剪参数，使用解析出的值
      if (
        parsedCropValues.width > 0 ||
        parsedCropValues.height > 0 ||
        parsedCropValues.x > 0 ||
        parsedCropValues.y > 0
      ) {
        setCropBox({
          x: parsedCropValues.x || 0,
          y: parsedCropValues.y || 0,
          width: parsedCropValues.width || width,
          height: parsedCropValues.height || height,
        });
      } else {
        // 否则使用默认的全图裁剪框
        setCropBox({
          x: 0,
          y: 0,
          width: width,
          height: height,
        });
      }
    }
  }, [imageLoaded, imageSize]);

  // 当裁剪框初始化完成后，设置裁剪框的显示位置
  useEffect(() => {
    if (
      imageLoaded &&
      cropBoxRef.current &&
      containerRef.current &&
      cropBox.width > 0 &&
      cropBox.height > 0
    ) {
      const scaleRatio = getScaleRatio();
      cropBoxRef.current.style.left = cropBox.x / scaleRatio + 'px';
      cropBoxRef.current.style.top = cropBox.y / scaleRatio + 'px';
      cropBoxRef.current.style.width = cropBox.width / scaleRatio + 'px';
      cropBoxRef.current.style.height = cropBox.height / scaleRatio + 'px';
    }
  }, [imageLoaded, cropBox]);

  // 当容器宽度变化时，重新计算裁剪框显示位置
  useEffect(() => {
    if (imageLoaded && cropBoxRef.current && containerRef.current) {
      const scaleRatio = getScaleRatio();
      cropBoxRef.current.style.left = cropBox.x / scaleRatio + 'px';
      cropBoxRef.current.style.top = cropBox.y / scaleRatio + 'px';
      cropBoxRef.current.style.width = cropBox.width / scaleRatio + 'px';
      cropBoxRef.current.style.height = cropBox.height / scaleRatio + 'px';
    }
  }, [imageLoaded, cropBox]);

  // 监听容器尺寸变化，重新计算裁剪框位置
  useEffect(() => {
    const handleResize = () => {
      if (imageLoaded && cropBoxRef.current && containerRef.current) {
        const scaleRatio = getScaleRatio();
        cropBoxRef.current.style.left = cropBox.x / scaleRatio + 'px';
        cropBoxRef.current.style.top = cropBox.y / scaleRatio + 'px';
        cropBoxRef.current.style.width = cropBox.width / scaleRatio + 'px';
        cropBoxRef.current.style.height = cropBox.height / scaleRatio + 'px';
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [imageLoaded, cropBox]);

  // 图片加载完成
  const handleImageLoad = () => {
    if (imageRef.current) {
      const { naturalWidth, naturalHeight, width, height } = imageRef.current;
      setImageSize({ width: naturalWidth, height: naturalHeight });
      setImageLoaded(true);
    }
  };

  // 开始拖拽
  const handleMouseDown = (e: React.MouseEvent, type: DragType) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('开始拖拽:', type, {
      cropBox,
      imageSize,
      clientX: e.clientX,
      clientY: e.clientY,
    });

    dragTypeRef.current = type;
    isDraggingRef.current = true;
    setIsEditing(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  // 拖拽中
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current || !dragTypeRef.current) return;

    const scaleRatio = getScaleRatio();
    const deltaX = (e.clientX - dragStartRef.current.x) * scaleRatio;
    const deltaY = (e.clientY - dragStartRef.current.y) * scaleRatio;

    setCropBox(prev => {
      const newBox = { ...prev };

      switch (dragTypeRef.current) {
        case 'n':
          newBox.y = Math.max(
            0,
            Math.min(prev.y + prev.height - 50, prev.y + deltaY)
          );
          newBox.height = prev.height - (newBox.y - prev.y);
          break;
        case 's':
          newBox.height = Math.max(
            50,
            Math.min(imageSize.height - prev.y, prev.height + deltaY)
          );
          break;
        case 'e':
          newBox.width = Math.max(
            50,
            Math.min(imageSize.width - prev.x, prev.width + deltaX)
          );
          break;
        case 'w':
          newBox.x = Math.max(
            0,
            Math.min(prev.x + prev.width - 50, prev.x + deltaX)
          );
          newBox.width = prev.width - (newBox.x - prev.x);
          break;
        case 'nw':
          newBox.x = Math.max(
            0,
            Math.min(prev.x + prev.width - 50, prev.x + deltaX)
          );
          newBox.y = Math.max(
            0,
            Math.min(prev.y + prev.height - 50, prev.y + deltaY)
          );
          newBox.width = prev.width - (newBox.x - prev.x);
          newBox.height = prev.height - (newBox.y - prev.y);
          break;
        case 'ne':
          newBox.y = Math.max(
            0,
            Math.min(prev.y + prev.height - 50, prev.y + deltaY)
          );
          newBox.width = Math.max(
            50,
            Math.min(imageSize.width - prev.x, prev.width + deltaX)
          );
          newBox.height = prev.height - (newBox.y - prev.y);
          break;
        case 'sw':
          newBox.x = Math.max(
            0,
            Math.min(prev.x + prev.width - 50, prev.x + deltaX)
          );
          newBox.width = prev.width - (newBox.x - prev.x);
          newBox.height = Math.max(
            50,
            Math.min(imageSize.height - prev.y, prev.height + deltaY)
          );
          break;
        case 'se':
          newBox.width = Math.max(
            50,
            Math.min(imageSize.width - prev.x, prev.width + deltaX)
          );
          newBox.height = Math.max(
            50,
            Math.min(imageSize.height - prev.y, prev.height + deltaY)
          );
          break;
      }

      if (cropBoxRef.current) {
        const scaleRatio = getScaleRatio();
        cropBoxRef.current.style.left = newBox.x / scaleRatio + 'px';
        cropBoxRef.current.style.top = newBox.y / scaleRatio + 'px';
        cropBoxRef.current.style.width = newBox.width / scaleRatio + 'px';
        cropBoxRef.current.style.height = newBox.height / scaleRatio + 'px';
      }

      draggingPositionRef.current = newBox;
      const newUrl = buildCropUrl(baseUrl, {
        x: Math.round(newBox.x),
        y: Math.round(newBox.y),
        width: Math.round(newBox.width),
        height: Math.round(newBox.height),
        gravity: 'nw',
      });
      // 构建裁剪结果
      const cropResult: CropResult = {
        url: newUrl,
        cropValues: {
          x: Math.round(newBox.x),
          y: Math.round(newBox.y),
          width: Math.round(newBox.width),
          height: Math.round(newBox.height),
          gravity: 'nw',
        },
        cropBox: {
          x: Math.round(cropBox.x),
          y: Math.round(cropBox.y),
          width: Math.round(cropBox.width),
          height: Math.round(cropBox.height),
        },
        imageSize: imageSize,
      };

      // 使用防抖处理onChange，避免高频触发
      if (typeof window !== 'undefined') {
        if ((window as any).__imageCropperDebounceTimer) {
          clearTimeout((window as any).__imageCropperDebounceTimer);
        }
        (window as any).__imageCropperDebounceTimer = setTimeout(() => {
          onChange(cropResult);
        }, 100);
      } else {
        onChange(cropResult);
      }

      return newBox;
    });

    // 更新拖拽起始点，实现跟手拖拽
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  // 结束拖拽
  const handleMouseUp = () => {
    if (draggingPositionRef.current) {
      setCropBox(draggingPositionRef.current);
    }
    isDraggingRef.current = false;
    dragTypeRef.current = null;
    setIsEditing(false);
  };

  // 添加全局鼠标事件监听
  useEffect(() => {
    if (isDraggingRef.current) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isEditing]);

  // 应用裁剪
  const applyCrop = () => {
    if (cropBox.width > 0 && cropBox.height > 0) {
      const newCropValues: CropValues = {
        x: Math.round(cropBox.x),
        y: Math.round(cropBox.y),
        width: Math.round(cropBox.width),
        height: Math.round(cropBox.height),
        gravity: 'nw',
      };

      const newUrl = buildCropUrl(baseUrl, newCropValues);

      // 构建裁剪结果
      const cropResult: CropResult = {
        url: newUrl,
        cropValues: newCropValues,
        cropBox: {
          x: Math.round(cropBox.x),
          y: Math.round(cropBox.y),
          width: Math.round(cropBox.width),
          height: Math.round(cropBox.height),
        },
        imageSize: imageSize,
      };

      onChange(cropResult);
    }
  };

  // 重置裁剪
  const resetCrop = () => {
    // 重置时传递空的裁剪结果
    const cropResult: CropResult = {
      url: baseUrl,
      cropValues: { x: 0, y: 0, width: 0, height: 0, gravity: 'nw' },
      cropBox: { x: 0, y: 0, width: 0, height: 0 },
      imageSize: imageSize,
    };

    onChange(cropResult);

    // 重置裁剪框为全图
    if (imageSize.width > 0 && imageSize.height > 0) {
      setCropBox({
        x: 0,
        y: 0,
        width: imageSize.width,
        height: imageSize.height,
      });
    }
  };

  if (!baseUrl) {
    return (
      <div className='flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg'>
        <span className='text-gray-500'>请先选择图片</span>
      </div>
    );
  }

  const scaleRatio = getScaleRatio();

  return (
    <div className='mb-2'>
      <span className='text-xs'>裁剪</span>
      <div
        className='relative border border-gray-300 rounded-lg w-[135px] mx-auto'
        ref={containerRef}
      >
        <img
          ref={imageRef}
          src={baseUrl}
          alt='裁剪原图'
          className='w-full h-auto object-contain'
          onLoad={handleImageLoad}
          style={{ cursor: isEditing ? 'crosshair' : 'default' }}
        />

        {/* 裁剪框 */}
        {imageLoaded && showCropControls && (
          <div
            ref={cropBoxRef}
            className='absolute border-2 border-blue-500 bg-blue-500 bg-opacity-20'
            style={{
              left: cropBox.x / scaleRatio,
              top: cropBox.y / scaleRatio,
              width: cropBox.width / scaleRatio,
              height: cropBox.height / scaleRatio,
              cursor: isEditing ? 'crosshair' : 'default',
            }}
          >
            {/* 四角拖拽手柄 */}
            <div
              className='absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full -top-1.5 -left-1.5 cursor-nw-resize'
              onMouseDown={e => handleMouseDown(e, 'nw')}
            />
            <div
              className='absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full -top-1.5 -right-1.5 cursor-ne-resize'
              onMouseDown={e => handleMouseDown(e, 'ne')}
            />
            <div
              className='absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full -bottom-1.5 -left-1.5 cursor-sw-resize'
              onMouseDown={e => handleMouseDown(e, 'sw')}
            />
            <div
              className='absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full -bottom-1.5 -right-1.5 cursor-se-resize'
              onMouseDown={e => handleMouseDown(e, 'se')}
            />

            {/* 四边拖拽手柄 */}
            <div
              className='absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full -top-1.5 left-1/2 transform -translate-x-1/2 cursor-n-resize'
              onMouseDown={e => handleMouseDown(e, 'n')}
            />
            <div
              className='absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full -bottom-1.5 left-1/2 transform -translate-x-1/2 cursor-s-resize'
              onMouseDown={e => handleMouseDown(e, 's')}
            />
            <div
              className='absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-e-resize'
              onMouseDown={e => handleMouseDown(e, 'e')}
            />
            <div
              className='absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full -left-1.5 top-1/2 transform -translate-y-1/2 cursor-w-resize'
              onMouseDown={e => handleMouseDown(e, 'w')}
            />
          </div>
        )}
      </div>

      {/* 裁剪信息 */}
      {showDetail && imageLoaded && showCropControls && (
        <div className='p-3 bg-gray-50 rounded-lg'>
          <div className='grid grid-cols-2 gap-4 text-sm'>
            <div>
              <span className='text-gray-600'>裁剪位置: </span>
              <span className='font-mono'>
                ({Math.round(cropBox.x)}, {Math.round(cropBox.y)})
              </span>
            </div>
            <div>
              <span className='text-gray-600'>裁剪尺寸: </span>
              <span className='font-mono'>
                {Math.round(cropBox.width)} × {Math.round(cropBox.height)}
              </span>
            </div>
            <div>
              <span className='text-gray-600'>原图尺寸: </span>
              <span className='font-mono'>
                {imageSize.width} × {imageSize.height}
              </span>
            </div>
            <div>
              <span className='text-gray-600'>缩放比例: </span>
              <span className='font-mono'>{scaleRatio.toFixed(2)}x</span>
            </div>
            <div>
              <span className='text-gray-600'>OSS参数: </span>
              <span className='font-mono text-xs break-all'>
                {`x_${Math.round(cropBox.x)},y_${Math.round(cropBox.y)},w_${Math.round(cropBox.width)},h_${Math.round(cropBox.height)}`}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

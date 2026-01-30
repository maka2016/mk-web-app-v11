import React, { useEffect, useRef, useState } from 'react';
import './index.scss';

import { API, cdnApi, getUid, request } from '@/services';
import { queryToObj } from '@/utils';
import { Icon } from '@workspace/ui/components/Icon';
import { Loading } from '@workspace/ui/components/loading';

interface Props {
  worksId: string;
  imageUrl: string;

  size: {
    width: number;
    height: number;
  };
  onClose: () => void;
  onChange: (url: string) => void;
}

const blobUrlToFile = async (
  blobUrl: string,
  filename = 'file',
  options = {}
) => {
  try {
    // 验证输入是否是有效的Blob URL
    if (!blobUrl.startsWith('blob:')) {
      throw new Error('输入不是一个有效的Blob URL');
    }

    // 使用Fetch API获取Blob资源
    const response = await fetch(blobUrl);

    // 检查响应是否成功
    if (!response.ok) {
      throw new Error(`获取Blob失败，状态码: ${response.status}`);
    }

    // 从响应中获取Blob数据
    const blob = await response.blob();

    // 从Blob URL中解析出MIME类型（可选）
    const mimeType = blob.type || 'application/octet-stream';

    // 创建默认选项
    const defaultOptions = {
      type: mimeType,
      lastModified: new Date().getTime(),
      ...options,
    };

    // 创建File对象
    const file = new File([blob], filename, defaultOptions);

    return file;
  } catch (error) {
    console.error('blobUrlToFile 转换失败:', error);
    throw error;
  }
};

const removeOssParamRegex = (url: string) => {
  return (
    url
      // 步骤1：移除x-oss-process参数（含前后分隔符）
      .replace(
        /([?&])x-oss-process=[^&#]*(&|$)/g,
        (match, p1, p2) => (p2 === '&' ? p1 : '') // 动态保留分隔符
      )
      // 步骤2：清理残留的?或&符号
      .replace(/(\?|&)+$/, '') // 移除末尾的?或&
      .replace(/\?&/, '?') // 处理?a&b → ?a&b
      .replace(/&&+/g, '&')
  ); // 合并多个&
};

const ImageCropper: React.FC<Props> = ({
  imageUrl,
  onClose,
  onChange,
  worksId,
  size,
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
  const [loading, setLoading] = useState(false);
  const [cropImgUrl, setCropImgUrl] = useState(imageUrl);
  const [rotate, setRotate] = useState(0);
  const [scaleX, setScaleX] = useState(1);
  const _initialScale = useRef(1);
  const [isPinching, setIsPinching] = useState(false);
  const lastTouchDistance = useRef<number | null>(null);
  const lastScale = useRef<number>(1);

  useEffect(() => {
    // MkImageGroup_v2_
  }, []);

  // 初始化图片尺寸和裁剪框尺寸
  useEffect(() => {
    const img = imgRef.current;
    const cropBox = cropBoxRef.current;

    if (img && cropBox) {
      const updateSizes = () => {
        const screenWidth = window.innerWidth;
        // 计算图片的初始缩放比例，使其宽度适应屏幕
        const initialScale = screenWidth / img.naturalWidth;
        _initialScale.current = initialScale;
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
  const calculateBounds = (currentScale: number, currentRotate: number) => {
    // 判断是否旋转90或270度
    const isRotated = Math.abs(currentRotate % 180) === 90;
    const imgWidth = isRotated ? imageSize.height : imageSize.width;
    const imgHeight = isRotated ? imageSize.width : imageSize.height;
    const scaledWidth = imgWidth * currentScale;
    const scaledHeight = imgHeight * currentScale;

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

    const { maxX, maxY } = calculateBounds(scale, rotate);

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
    const { maxX, maxY } = calculateBounds(newScale, rotate);
    // 调整位置以确保图片不会超出边界
    const newX = clamp(position.x, -maxX, maxX);
    const newY = clamp(position.y, -maxY, maxY);
    setPosition({ x: newX, y: newY });
    setScale(newScale);
  };

  const handleZoomIn = () => handleZoom(Math.min(5, scale + 0.1));
  const handleZoomOut = () => {
    const minScale = Math.max(
      cropBoxSize.width / imageSize.width,
      cropBoxSize.height / imageSize.height
    );
    handleZoom(Math.max(minScale, scale - 0.1));
  };

  // 双指缩放辅助函数
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const [touch1, touch2] = [touches[0], touches[1]];
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // 获取两指中点
  const getTouchCenter = (touches: React.TouchList) => {
    if (touches.length < 2) return { x: 0, y: 0 };
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  // 双指缩放事件
  const pinchLastCenter = useRef<{ x: number; y: number } | null>(null);
  const pinchLastPosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      setIsPinching(true);
      lastTouchDistance.current = getTouchDistance(e.touches);
      lastScale.current = scale;
      pinchLastCenter.current = getTouchCenter(e.touches);
      pinchLastPosition.current = position;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (
      isPinching &&
      e.touches.length === 2 &&
      lastTouchDistance.current &&
      pinchLastCenter.current
    ) {
      const newDistance = getTouchDistance(e.touches);
      const scaleRatio = newDistance / lastTouchDistance.current;
      let newScale = lastScale.current * scaleRatio;
      // 限制缩放比例
      const minScale = Math.max(
        cropBoxSize.width / imageSize.width,
        cropBoxSize.height / imageSize.height
      );
      newScale = Math.max(minScale, Math.min(5, newScale));
      // 计算缩放中心
      const center = getTouchCenter(e.touches);
      // 裁剪框中心在页面上的坐标
      const cropBoxRect = cropBoxRef.current?.getBoundingClientRect();
      if (!cropBoxRect) return;
      const cropCenter = {
        x: cropBoxRect.left + cropBoxRect.width / 2,
        y: cropBoxRect.top + cropBoxRect.height / 2,
      };
      // 计算缩放前后 position 的修正量
      // 以图片中心为锚点，修正 position
      const lastPos = pinchLastPosition.current;
      const lastS = lastScale.current;
      const cx = pinchLastCenter.current.x - cropCenter.x;
      const cy = pinchLastCenter.current.y - cropCenter.y;
      // 新 position = 上次 position + (1 - scaleRatio) * (center点相对裁剪框中心的偏移)
      let newX = lastPos.x + (1 - newScale / lastS) * cx;
      let newY = lastPos.y + (1 - newScale / lastS) * cy;
      // 缩放后 clamp，防止超出边界
      const { maxX, maxY } = calculateBounds(newScale, rotate);
      newX = clamp(newX, -maxX, maxX);
      newY = clamp(newY, -maxY, maxY);
      setScale(newScale);
      setPosition({ x: newX, y: newY });
      e.preventDefault();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      setIsPinching(false);
      lastTouchDistance.current = null;
      pinchLastCenter.current = null;
    }
  };

  async function cropImageFromTransform(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const boxRatio = cropBoxSize.width / cropBoxSize.height;
        let outputW = imageSize.width;
        let outputH = Math.round(outputW / boxRatio);

        if (outputH > imageSize.height) {
          outputH = imageSize.height;
          outputW = Math.round(outputH * boxRatio);
        }
        const cropScale = outputW / cropBoxSize.width;
        const imgW = imageSize.width * cropScale * scale;
        const imgH = imageSize.height * cropScale * scale;
        const canvas = document.createElement('canvas');
        canvas.width = outputW;
        canvas.height = outputH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 水平翻转
        ctx.scale(scaleX, 1);
        if (rotate === 0 && scaleX < 0) {
          ctx.translate(-imgW, 0);
        } else if (rotate === 270 && scaleX < 0) {
          ctx.translate(-imgH, imgW);
        } else if (rotate === 90 && scaleX === 1) {
          ctx.translate(imgH, 0);
        } else if (rotate === 180 && scaleX === 1) {
          ctx.translate(imgW, imgH);
        } else if (rotate === 180 && scaleX < 0) {
          ctx.translate(0, imgH);
        } else if (rotate === 270 && scaleX === 1) {
          ctx.translate(0, imgW);
        }
        // 旋转
        ctx.rotate((rotate * Math.PI) / 180);
        const isRotated = Math.abs(rotate % 180) === 90;
        const cropLeft = isRotated
          ? (imgH - outputW) / 2
          : (imgW - outputW) / 2;
        const cropTop = isRotated ? (imgW - outputH) / 2 : (imgH - outputH) / 2;
        const offsetX = Math.max(0, cropLeft - position.x * cropScale);
        const offsetY = Math.max(0, cropTop - position.y * cropScale);
        let x = offsetX;
        let y = offsetY;
        if (rotate === 90) {
          x = offsetY;
          y = -offsetX;
          if (scaleX < 0) {
            x = -offsetY;
            y = offsetX;
          }
        } else if (rotate === 180) {
          x = -offsetX;
          y = -offsetY;
        } else if (rotate === 270) {
          x = -offsetY;
          y = offsetX;
          if (scaleX < 0) {
            x = offsetY;
            y = -offsetX;
          }
        }

        ctx.drawImage(img, -x / scaleX, -y, imgW, imgH);

        canvas.toBlob(blob => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to convert canvas to blob'));
          canvas.remove();
        }, 'image/png');
      };

      img.onerror = reject;
      img.src = cropImgUrl;
    });
  }

  const uploadAction = async (file: File) => {
    const uid = getUid();
    const formData = new FormData();

    formData.append('file', file);
    formData.append('worksId', worksId);

    const { appid } = queryToObj();
    try {
      const res = (await request.post(
        `${API('apiv10')}/oss/upload/${appid}/${uid}`,
        formData,
        {
          timeout: 60000,
          headers: {
            'content-type': 'multipart/form-data',
          },
        }
      )) as any;
      return res;
    } catch (error: any) {
      setUploading(false);
      // toast.error(error?.message || "请求超时，请重试")
    }
  };

  const requestAICrop = async () => {
    if (loading) {
      return;
    }
    setLoading(true);

    let uploadUrl = cropImgUrl;
    if (uploadUrl.startsWith('blob:')) {
      const file = await blobUrlToFile(cropImgUrl);
      const uploadRes = await uploadAction(file);
      uploadUrl = uploadRes.url;
    }
    const res = await request({
      url: `${API('根域名')}/node-api-server/segmentV1/commonImage`,
      method: 'post',
      data: {
        image_url: removeOssParamRegex(uploadUrl),
      },
    });
    if (res && res.data && res.data.image_url) {
      console.log(res.data.image_url);
      setCropImgUrl(cdnApi(res.data.image_url));
      setTimeout(() => {
        setLoading(false);
      }, 2000);
    } else {
      // toast("无法识别您的图片")
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setUploading(true);
    const blob = await cropImageFromTransform();

    const mimeType = blob.type || 'application/octet-stream';

    // 创建默认选项
    const defaultOptions = {
      type: mimeType,
      lastModified: new Date().getTime(),
    };

    // 创建File对象
    const file = new File([blob], 'file', defaultOptions);
    const res = await uploadAction(file);
    onChange(res.url);
    console.log(res.url);
    onClose();
  };

  const onReset = () => {
    setCropImgUrl(imageUrl);
    setPosition({ x: 0, y: 0 });
    setScale(_initialScale.current);
  };

  // 仅当图片位置超出边界时才自动修正图片位置
  useEffect(() => {
    const { maxX, maxY } = calculateBounds(scale, rotate);
    if (
      position.x < -maxX ||
      position.x > maxX ||
      position.y < -maxY ||
      position.y > maxY
    ) {
      setPosition({
        x: clamp(position.x, -maxX, maxX),
        y: clamp(position.y, -maxY, maxY),
      });
    }
  }, [rotate]);

  return (
    <div className='imageCropperContainer'>
      <div className='head'>
        <div className='back' onClick={() => onClose()}>
          <Icon name='left-bold' size={24} />
          <span>选择照片</span>
        </div>
        <div className='title'>调整照片</div>
        <div
          className='btnConfirm'
          onClick={() => {
            handleSave();
          }}
        >
          完成
        </div>
      </div>

      <div
        className='imageCropper'
        ref={containerRef}
        onPointerDown={isPinching ? undefined : handlePointerDown}
        onPointerMove={isPinching ? undefined : handlePointerMove}
        onPointerUp={isPinching ? undefined : handlePointerUp}
        onPointerCancel={isPinching ? undefined : handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          cursor: dragging ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
      >
        <div className='imageContainer'>
          <img
            src={cropImgUrl}
            alt='background preview'
            style={{
              opacity: 0.5,
              transform: `translate(${position.x}px, ${position.y}px) scaleX(${scaleX}) scale(${scale}) rotate(${rotate}deg)`,
              transformOrigin: 'center',
              willChange: 'transform',
            }}
          />
        </div>
        <div className='tip'>手指拖动图片调整图片位置</div>
        <div
          className='cropBox'
          ref={cropBoxRef}
          style={{
            width: size.width,
            height: size.height,
          }}
        >
          <div className='cropImage'>
            <img
              ref={imgRef}
              src={cropImgUrl}
              alt='crop preview'
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scaleX(${scaleX}) scale(${scale}) rotate(${rotate}deg)`,
                transformOrigin: 'center',
                willChange: 'transform',
              }}
              draggable={false}
            />
          </div>
        </div>
        {/* <div className={styles.mask} /> */}
        <div className='zoomBtn'>
          <div className='zoomBtnItem' onClick={handleZoomIn}>
            <Icon name='zoom-in' size={18} />
            <span>放大</span>
          </div>
          <div className='line'></div>
          <div className='zoomBtnItem' onClick={handleZoomOut}>
            <Icon name='zoom-out' size={18} />
            <span>缩小</span>
          </div>
        </div>

        {loading && (
          <div className='cropLoading'>
            <span>图片识别抠图中...</span>
          </div>
        )}
      </div>
      <div className='footer'>
        <div className='footer_btn' onClick={() => requestAICrop()}>
          <img
            draggable={false}
            src={cdnApi('/cdn/mk-widgets/assets/icon_koutu.png', {
              format: 'webp',
            })}
            style={{
              width: 24,
              height: 24,
            }}
            alt=''
          />
          <span>一键抠图</span>
        </div>
        <div className='footer_btn' onClick={() => setScaleX(-scaleX)}>
          <img
            draggable={false}
            src={cdnApi('/cdn/mk-widgets/assets/icon_flipHorizontal.png', {
              format: 'webp',
            })}
            style={{
              width: 24,
              height: 24,
            }}
            alt=''
          />
          <span>水平翻转</span>
        </div>

        <div
          className='footer_btn'
          onClick={() => {
            setRotate((rotate + 90) % 360);
          }}
        >
          <img
            draggable={false}
            src={cdnApi('/cdn/mk-widgets/assets/icon_rotate.png', {
              format: 'webp',
            })}
            style={{
              width: 24,
              height: 24,
            }}
            alt=''
          />
          <span>90度旋转</span>
        </div>

        <div className='footer_btn' onClick={() => onReset()}>
          <img
            draggable={false}
            src={cdnApi('/cdn/mk-widgets/assets/icon_return.png', {
              format: 'webp',
            })}
            style={{
              width: 24,
              height: 24,
            }}
            alt=''
          />
          <span>重置</span>
        </div>
      </div>
      {uploading && (
        <div className='uploadLoading'>
          <Loading />
        </div>
      )}
    </div>
  );
};

export default ImageCropper;

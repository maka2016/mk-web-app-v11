
import { API, cdnApi, request, uploadFile } from '@/services';
import { mergeDeep } from '@/utils';
import styled from '@emotion/styled';
import { Icon } from '@workspace/ui/components/Icon';
import { ShowDrawerV2 } from '@workspace/ui/components/ShowDrawerV2';
import { Loading } from '@workspace/ui/components/loading';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import axios from 'axios';
import cls from 'classnames';
import { observer } from 'mobx-react';
import React, { useEffect, useRef, useState } from 'react';
import i18nModule from '../../utils/i18n';
import { blockStyleFilter, removeOssParamRegex } from '../../utils/utils1';
import { useWorksStore } from '../../works-store/store/hook';
import { PictureData } from './types';

interface Props {
  attrs: any;
  onClose: () => void;
  onChange?: (attrs: any) => void;
}

const ImageConpDOM = styled.div`
  position: relative;
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  -webkit-user-select: none; /* Safari/iOS */
  -moz-user-select: none; /* Firefox */
  -ms-user-select: none; /* IE/Edge */
  user-select: none; /* Standard */
  .head {
    padding: 0 16px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    .cancel_btn {
      height: 32px;
      padding: 0 12px;
      font-size: 14px;
      line-height: 32px;
      color: #000;
    }
    .confirm_btn {
      color: #fff;
      font-size: 14px;
      line-height: 32px;
      height: 32px;
      padding: 0 12px;
      background: var(--theme-color);
      border-radius: 6px;
    }
  }
  .container {
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-image: url('https://img2.maka.im/cdn/mk-widgets/assets/image 2507.png');
    background-repeat: repeat;
    padding: 16px 72px;
    background-color: rgba(0, 0, 0, 0.9);

    .tip_text {
      position: absolute;
      top: 26px;
      font-family: PingFang SC;
      font-weight: 400;
      font-size: 16px;
      line-height: 24px;
      text-align: center;
      color: #fff;
      z-index: 1;
    }

    .use_tip {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background-color: rgba(0, 0, 0, 0.6);
      z-index: 1;
      img {
        width: 296px;
      }
      p {
        margin-top: 12px;
        font-family: PingFang SC;
        font-weight: 400;
        font-size: 16px;
        line-height: 24px;
        color: #fff;
        text-align: center;
      }
    }

    .loading {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      z-index: 10;
      background: rgba(0, 0, 0, 0.45);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      span {
        font-family: PingFang SC;
        font-weight: 600;
        font-size: 16px;
        line-height: 24px;
        letter-spacing: 0px;
        text-align: center;
        color: #ffffff;
      }
    }
    .mask_container {
      position: relative;
      user-select: none;
      touch-action: none;
      overflow: hidden;
      background-color: rgba(255, 255, 255, 0.5);
    }
    .background {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border-color: transparent;

      img {
        position: absolute;
        top: 0;
        left: 0;
        filter: brightness(30%);
      }
    }
    .img {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      cursor: move;
      touch-action: none;

      img {
        max-width: 100%;
        width: 100%;
        height: 100%;
        object-fit: cover;
        user-select: none;
        -webkit-user-select: none;
      }
    }
  }

  .zoom_btn {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    background: #fff;
    box-shadow: 0px 2px 12px 0px #0000001a;
    border-radius: 100px;
    height: 38px;
    z-index: 2;
    .line {
      width: 1px;
      height: 16px;
      background: rgba(0, 0, 0, 0.06);
    }
    .zoom_btn_item {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 0 12px;
      white-space: nowrap;
      span {
        font-family: PingFang SC;
        font-weight: 400;
        font-size: 14px;
        line-height: 22px;
        color: #000;
      }
      img {
        width: 18px;
        height: 18px;
      }
    }
  }
  .stroke {
    padding: 12px 16px;
    .color_list {
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      overflow-x: auto;
      gap: 8px;
      .color_item {
        flex-shrink: 0;
        width: 20px;
        height: 32px;
        border: 1px solid #01070d0f;
        border-radius: 2px;

        &.active {
          border: 2px solid var(--theme-color);
        }
      }
    }
    .stroke_list {
      display: flex;
      align-items: center;
      overflow-x: auto;
      gap: 8px;
    }
    .stroke_item {
      width: 60px;
      height: 80px;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
      overflow: hidden;
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      &.active {
        border: 2px solid var(--theme-color);
      }

      .none {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        img {
          width: 24px;
        }
        span {
          color: #00000073;
          font-family: PingFang SC;
          font-weight: 600;
          font-size: 11px;
          line-height: 100%;
        }
      }
    }
  }
  .footer {
    display: flex;
    align-items: center;
    padding: 8px 16px;
    gap: 8px;
    .footer_btn {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      padding: 6px 0;
      span {
        font-family: PingFang SC;
        font-weight: 400;
        font-size: 12px;
        line-height: 16px;
        letter-spacing: 0%;
        text-align: center;
        color: rgba(0, 0, 0, 0.88);
      }
      &.active {
        background-color: #f1f1f1;
        border-radius: 6px;
      }
    }
  }
  .uploadLoading {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 10;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    iconpark-icon {
      color: rgba(255, 255, 255, 0.8) !important;
    }
  }
`;

const SettingDom = styled.div`
  .title {
    padding: 12px 16px;
    font-family: PingFang SC;
    font-weight: 600;
    font-size: 18px;
    line-height: 26px;
    text-align: center;
    color: #000;
  }
  .close {
    position: absolute;
    top: 14px;
    right: 16px;
    width: 22px;
    height: 22px;
    cursor: pointer;
  }
  .setting_item {
    padding: 12px 16px;
    .setting_item_label {
      margin-bottom: 8px;
      font-family: PingFang SC;
      font-weight: 600;
      font-size: 16px;
      line-height: 24px;
      letter-spacing: 0px;
      text-align: left;
      color: #000;
    }
    .setting_item_content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      .setting_item_content_item {
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 4px;

        .setting_item_content_item_value {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .setting_item_content_item_label {
          font-weight: 600;
          font-size: 10px;
          line-height: 100%;
          text-align: center;
          color: rgba(0, 0, 0, 0.45);
        }

        &.active {
          .setting_item_content_item_label {
            color: #000;
          }
        }
      }
    }
  }
`;
const aspectRatioList = [
  {
    label: '无',
    value: 'auto',
    width: 18,
    height: 18,
  },
  {
    label: '1:1',
    value: '1 / 1',
    width: 18,
    height: 18,
  },
  {
    label: '3:4',
    value: '3/4',
    width: 18,
    height: 22,
  },
  {
    label: '4:3',
    value: '4 / 3',
    width: 20,
    height: 17,
  },
  {
    label: '2:3',
    value: '2 / 3',
    width: 17,
    height: 22,
  },
  {
    label: '3:2',
    value: '3 / 2',
    width: 22,
    height: 17,
  },
  {
    label: '9:16',
    value: '9 / 16',
    width: 12,
    height: 22,
  },
  {
    label: '16:9',
    value: '16 / 9',
    width: 22,
    height: 12,
  },
];

const SettingPanel = ({
  onChange,
  onClose,
}: {
  onChange: (value: string) => void;
  onClose: () => void;
}) => {
  const [aspectRatio, setAspectRatio] = useState('');
  return (
    <SettingDom>
      <div className='title'>裁剪</div>
      <img
        src={cdnApi('/cdn/mk-widgets/assets/icon_check.png')}
        className='close'
        onClick={onClose}
      />
      <div className='setting_item'>
        <div className='setting_item_label'>比例</div>
        <div className='setting_item_content'>
          {aspectRatioList.map((item, index) => {
            const isActive = aspectRatio === item.value;
            return (
              <div
                key={index}
                className={`setting_item_content_item ${isActive && 'active'}`}
                onClick={() => {
                  setAspectRatio(item.value);
                  onChange(item.value);
                }}
              >
                <div className='setting_item_content_item_value'>
                  <svg
                    width={item.width + 2}
                    height={item.height + 2}
                    viewBox={`0 0 ${item.width + 2} ${item.height + 2}`}
                    fill='none'
                    xmlns='http://www.w3.org/2000/svg'
                  >
                    <rect
                      x='1'
                      y='1'
                      width={item.width}
                      height={item.height}
                      rx='2'
                      ry='2'
                      stroke={isActive ? 'black' : 'rgba(0, 0, 0, 0.45)'}
                      stroke-width='2'
                      fill='none'
                    />
                  </svg>
                </div>
                <div className='setting_item_content_item_label'>
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SettingDom>
  );
};

function generateDropShadowStyle(color: string, style: string): string {
  switch (style) {
    case 'small solid':
      return `
        drop-shadow(4px 0 0 ${color})
        drop-shadow(-4px 0 0 ${color})
        drop-shadow(0 4px 0 ${color})
        drop-shadow(0 -4px 0 ${color})
      `.trim();
    case 'medium solid':
      return `
          drop-shadow(8px 0 0 ${color})
          drop-shadow(-8px 0 0 ${color})
          drop-shadow(0 8px 0 ${color})
          drop-shadow(0 -8px 0 ${color})
        `.trim();
    case 'large solid':
      return `
              drop-shadow(12px 0 0 ${color})
              drop-shadow(-12px 0 0 ${color})
              drop-shadow(0 12px 0 ${color})
              drop-shadow(0 -12px 0 ${color})
            `.trim();

    case 'left':
      return `
        drop-shadow(-16px 0 0px ${color})
      `.trim();
    case 'right':
      return `
          drop-shadow(16px 0 0px ${color})
        `.trim();
    default:
      return '';
  }
}

// 获取图片宽高
const getImageSize = async (ossPath: string) => {
  const isUrl = /https?/.test(ossPath);
  const res = await axios.get(
    `${isUrl ? ossPath : cdnApi(ossPath)}?x-oss-process=image/info`
  );
  const image = res.data as any;
  const width = Number(image.ImageWidth.value);
  const height = Number(image.ImageHeight.value);
  return {
    width,
    height,
  };
};

const strokeStyleList = [
  {
    label: '无描边',
    value: 'none',
    preview: 'https://img2.maka.im/cdn/mk-widgets/assets/禁用.png',
  },
  {
    label: '小描边',
    value: 'small solid',
    preview:
      'https://img2.maka.im/cdn/mk-widgets/assets/stroke_small_solid.png',
  },
  {
    label: '中描边',
    value: 'medium solid',
    preview:
      'https://img2.maka.im/cdn/mk-widgets/assets/stroke_medium_solid.png',
  },
  {
    label: '大描边',
    value: 'large solid',
    preview:
      'https://img2.maka.im/cdn/mk-widgets/assets/stroke_medium_solid.png',
  },
  {
    label: '左投影',
    value: 'left',
    preview:
      'https://img2.maka.im/cdn/mk-widgets/assets/stroke_left_solid.png?v=2',
  },
  {
    label: '右投影',
    value: 'right',
    preview:
      'https://img2.maka.im/cdn/mk-widgets/assets/stroke_right_solid.png',
  },
];

export const baseColors = [
  '#000000',
  '#5F5F5F',
  '#CFCFCF',
  '#FFFFFF',
  '#B61D1C',
  '#F72622',
  '#F58686',
  '#FFCCD1',
  '#AA4A36',
  '#FB6917',
  '#F79969',
  '#FFD9C5',
  '#AB7433',
  '#FEB804',
  '#F7E04A',
  '#FFF58A',
  '#52844E',
  '#7AC76D',
  '#97D9A7',
  '#CEF2D1',
  '#3B4E8B',
  '#4777EE',
  '#7DA8EC',
  '#B2CCF3',
  '#3F378F',
  '#8059ED',
  '#968FDE',
  '#C4C4F5',
  '#7A304B',
  '#D7507F',
  '#D984A6',
  '#F3DBE5',
];

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
    let mimeType = blob.type || 'application/octet-stream';

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

async function rotateBlobUrl(blobUrl: string, angle: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const radians = (angle * Math.PI) / 180;
      const rotate90 = angle % 180 !== 0;

      const canvas = document.createElement('canvas');
      canvas.width = rotate90 ? img.height : img.width;
      canvas.height = rotate90 ? img.width : img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('无法获取 canvas 上下文');

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(radians);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      canvas.toBlob(blob => {
        if (!blob) return reject('无法生成 Blob');
        const rotatedBlobUrl = URL.createObjectURL(blob);
        resolve(rotatedBlobUrl);
        canvas.remove();
      }, 'image/png');
    };

    img.onerror = reject;
    img.src = blobUrl;
  });
}

const getBlobUrlDimensions = (blobUrl: string) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = blobUrl;

    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };

    img.onerror = e => {
      reject(new Error('无法加载图片以获取尺寸'));
    };
  });
};

let rotateUrl: Record<number, string> = {};

const ImgLiteEditingPanel = (props: Props) => {
  const { attrs, onClose, onChange } = props;
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startObjectPos, setStartObjectPos] = useState({ x: 50, y: 0 });
  const [loading, setLoading] = useState(false);
  const [cropImgUrl, setCropImgUrl] = useState(attrs.ossPath);
  const [aspectRatio, setAspectRatio] = useState('');
  const [position, setPosition] = useState({
    x: attrs.objectPosition?.x === undefined ? 50 : attrs.objectPosition?.x,
    y: attrs.objectPosition?.y || 0,
  });
  const [zoom, setZoom] = useState(() => attrs?.objectPosition?.zoom ?? 1);
  const [initialPinchDistance, setInitialPinchDistance] = useState<
    number | null
  >(null);
  const [initialZoom, setInitialZoom] = useState<number | null>(null);
  const [activePointers, setActivePointers] = useState<
    Map<number, PointerEvent>
  >(new Map());
  const [isPinching, setIsPinching] = useState(false);
  const [backgroundSize, setBackgroundSize] = useState(
    attrs.objectPosition?.size || 'cover'
  );
  const [imageLoaded, setImageLoaded] = useState(false);
  const [flipHorizontal, setFlipHorizontal] = useState(
    attrs?.flipHorizontal || false
  );
  const [crop, setCrop] = useState(attrs.crop || false);
  const [strokeStyle, setStrokrStyle] = useState(attrs.strokeStyle || []);
  const [rotate, setRotate] = useState(attrs.rotate || 0);
  const [uploading, setUploading] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLImageElement>(null);
  const imgRef = useRef<HTMLDivElement>(null);

  const [imageSize, setImageSize] = useState({
    originalWidth: 0,
    originalHeight: 0,
    width: 0,
    height: 0,
    top: 0,
    left: 0,
  });

  useEffect(() => {
    const preventPinch = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const storage = localStorage.getItem('has_seen_image_tip');
    if (!storage) {
      setShowTip(true);
    }

    document.addEventListener('touchstart', preventPinch, { passive: false });
    document.addEventListener('touchmove', preventPinch, { passive: false });

    return () => {
      document.removeEventListener('touchstart', preventPinch);
      document.removeEventListener('touchmove', preventPinch);
    };
  }, []);

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
    const res = await request.post(`${API('根域名')}/node-api-server/segmentV1/commonImage`, {
      image_url: removeOssParamRegex(uploadUrl),
    });
    if (res && res.data && res.data.image_url) {
      console.log(res.data.image_url);
      setCropImgUrl(cdnApi(res.data.image_url));
      setTimeout(() => {
        setLoading(false);
        setCrop(true);
      }, 2000);
    } else {
      // toast("无法识别您的图片")
      setLoading(false);
    }
  };

  const layoutStyle = blockStyleFilter(
    mergeDeep(
      {
        justifySelf: 'center',
        alignSelf: 'center',
        margin: 0,
        padding: 0,
      },
      attrs.layoutStyle,
      {
        display: 'block',
        margin: 0,
        // width: "max-content",
        maxWidth: '100%',
        maxHeight: '100%',
        minWidth: 'unset',
        width: 'unset',
        height: 'unset',
        minHeight: 'unset',
        placeSelf: 'center',
        aspectRatio: aspectRatio || attrs.layoutStyle?.aspectRatio,
      }
    )
  );

  const calculateDistance = (
    pointer1: PointerEvent,
    pointer2: PointerEvent
  ) => {
    const dx = pointer1.clientX - pointer2.clientX;
    const dy = pointer1.clientY - pointer2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (backgroundSize === 'contain') {
      return;
    }
    e.preventDefault();
    const target = e.target as HTMLElement;
    target.setPointerCapture(e.pointerId);

    const newActivePointers = new Map(activePointers);
    newActivePointers.set(e.pointerId, e.nativeEvent);
    setActivePointers(newActivePointers);

    if (newActivePointers.size === 1) {
      setIsDragging(true);
      setStartPos({
        x: e.clientX,
        y: e.clientY,
      });
      setStartObjectPos({
        x: position.x,
        y: position.y,
      });
    } else if (newActivePointers.size === 2) {
      // 当检测到双指时，立即停止拖拽状态
      setIsDragging(false);
      setIsPinching(true);
      const pointers = Array.from(newActivePointers.values());
      const distance = calculateDistance(pointers[0], pointers[1]);
      setInitialPinchDistance(distance);
      setInitialZoom(zoom);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (backgroundSize === 'contain') {
      return;
    }
    e.preventDefault();

    const newActivePointers = new Map(activePointers);
    newActivePointers.set(e.pointerId, e.nativeEvent);
    setActivePointers(newActivePointers);

    // 如果当前是双指操作，强制设置为缩放模式
    if (newActivePointers.size === 2) {
      setIsDragging(false);
      setIsPinching(true);
    }

    if (isDragging && newActivePointers.size === 1) {
      const deltaX = (flipHorizontal ? -1 : 1) * (e.clientX - startPos.x);
      const deltaY = e.clientY - startPos.y;

      const containerWidth = imgRef.current?.clientWidth || 300;
      const containerHeight = imgRef.current?.clientHeight || 300;

      const moveFactorX =
        100 / Math.max(1, imageSize.width * zoom - containerWidth);
      const moveFactorY =
        100 / Math.max(1, imageSize.height * zoom - containerHeight);

      let newX = startObjectPos.x - deltaX * moveFactorX;
      let newY = startObjectPos.y - deltaY * moveFactorY;

      newX = clamp(newX, 0, 100);
      newY = clamp(newY, 0, 100);

      setPosition({ x: newX, y: newY });
    } else if (isPinching && newActivePointers.size === 2) {
      const pointers = Array.from(newActivePointers.values());
      if (initialPinchDistance !== null && initialZoom !== null) {
        const currentDistance = calculateDistance(pointers[0], pointers[1]);
        // 根据当前缩放比例调整缩放系数，使缩放速度更一致
        const zoomFactor = Math.max(0.3, 1 / zoom);
        const scale =
          1 + (currentDistance / initialPinchDistance - 1) * zoomFactor;
        const newZoom = clamp(initialZoom * scale, 1, 5);

        // 计算两指中心点
        const centerX = (pointers[0].clientX + pointers[1].clientX) / 2;
        const centerY = (pointers[0].clientY + pointers[1].clientY) / 2;

        const container = imgRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();

          // 计算两指中心点相对于容器的百分比位置
          const centerXPercent = ((centerX - rect.left) / rect.width) * 100;
          const centerYPercent = ((centerY - rect.top) / rect.height) * 100;

          // 计算缩放因子，并考虑当前缩放比例的影响
          const scaleFactor = newZoom / zoom;
          const positionFactor = (1 - scaleFactor) * (1 / Math.sqrt(zoom));

          // 基于两指中心点计算新的位置，并考虑缩放比例的影响
          const newX =
            position.x + (centerXPercent - position.x) * positionFactor;
          const newY =
            position.y + (centerYPercent - position.y) * positionFactor;

          setPosition({
            x: clamp(newX, 0, 100),
            y: clamp(newY, 0, 100),
          });
        }

        setZoom(newZoom);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (backgroundSize === 'contain') {
      return;
    }
    e.preventDefault();
    const newActivePointers = new Map(activePointers);
    newActivePointers.delete(e.pointerId);
    setActivePointers(newActivePointers);

    if (newActivePointers.size === 0) {
      // 保存当前状态，避免状态切换时的抖动
      const currentPosition = { ...position };
      const currentZoom = zoom;

      // 先重置所有状态
      setIsDragging(false);
      setIsPinching(false);
      setInitialPinchDistance(null);
      setInitialZoom(null);

      // 然后立即设置最终状态
      setPosition(currentPosition);
      setZoom(currentZoom);
    } else if (newActivePointers.size === 1) {
      // 保存当前状态
      const currentPosition = { ...position };
      const currentZoom = zoom;

      // 重置缩放相关状态
      setIsPinching(false);
      setInitialPinchDistance(null);
      setInitialZoom(null);

      // 如果是拖拽状态，更新拖拽起始点
      if (isDragging) {
        const remainingPointer = Array.from(newActivePointers.values())[0];
        setStartPos({
          x: remainingPointer.clientX,
          y: remainingPointer.clientY,
        });
        setStartObjectPos(currentPosition);
      }

      // 确保位置和缩放值保持不变
      setPosition(currentPosition);
      setZoom(currentZoom);
    }
  };

  const handleSave = async () => {
    if (onChange) {
      let ossPath = cropImgUrl;
      if (cropImgUrl.startsWith('blob:')) {
        setUploading(true);
        const file = await blobUrlToFile(cropImgUrl);
        const uploadRes = await uploadAction(file);
        ossPath = uploadRes.url;
      }

      onChange({
        objectPosition: {
          x: position.x,
          y: position.y,
          size: backgroundSize,
          zoom: zoom || 1,
        },
        originBaseH: imageSize.originalWidth,
        originBaseW: imageSize.originalHeight,
        ossPath,
        flipHorizontal,
        strokeStyle,
        crop,
        rotate,
        layoutStyle: {
          ...attrs.layoutStyle,
          aspectRatio: aspectRatio || attrs.layoutStyle?.aspectRatio,
        },
      });

      setUploading(false);
    }
    onClose();
  };

  const onReset = () => {
    setPosition({
      x: attrs.objectPosition?.left ?? 0,
      y: attrs.objectPosition?.top ?? 0,
    });
    setZoom(attrs.objectPosition?.zoom ?? 1);
    setCropImgUrl(attrs.ossPath);
    setCrop(attrs.crop);
    setFlipHorizontal(attrs?.flipHorizontal || false);
    setStrokrStyle(attrs.strokeStyle);
    setRotate(attrs.rotate || 0);
    setBackgroundSize(attrs.objectPosition?.size || 'cover');
  };

  const showAspectRatio = async () => {
    ShowDrawerV2({
      children: ({ close }) => (
        <SettingPanel
          onChange={(nextValue: string) => {
            setAspectRatio(nextValue);
            setPosition({
              x: 50,
              y: 0,
            });
          }}
          onClose={close}
        ></SettingPanel>
      ),
      title: '',
      showOverlay: false,
      handleOnly: true,
      contentProps: {
        style: {
          pointerEvents: 'auto',
        },
      },
    });
  };

  function getContainSize(
    containerWidth: number,
    containerHeight: number,
    imageWidth: number,
    imageHeight: number
  ): { width: number; height: number } {
    const imageRatio = imageWidth / imageHeight;
    const containerRatio = containerWidth / containerHeight;

    if (imageRatio > containerRatio) {
      // 图片更宽，以高度为基准
      const height = containerHeight;
      const width = imageRatio * height;
      return { width, height };
    } else {
      // 图片更高，以宽度为基准
      const width = containerWidth;
      const height = width / imageRatio;
      return { width, height };
    }
  }

  function getImageOffsetInMask({
    containerWidth,
    containerHeight,
    imageWidth,
    imageHeight,
    objectPositionXPercent,
    objectPositionYPercent,
  }: {
    containerWidth: number;
    containerHeight: number;
    imageWidth: number;
    imageHeight: number;
    objectPositionXPercent: number; // 0~100
    objectPositionYPercent: number; // 0~100
  }) {
    const xPercent = flipHorizontal
      ? 100 - objectPositionXPercent
      : objectPositionXPercent;

    const offsetX = (imageWidth - containerWidth) * (xPercent / 100);
    const offsetY =
      (imageHeight - containerHeight) * (objectPositionYPercent / 100);

    return {
      offsetLeft: -offsetX,
      offsetTop: -offsetY,
    };
  }

  const uploadAction = async (file: File) => {
    const res = await uploadFile({
      file: file,
      // worksId: works_id,
    });
    return res;
  };

  function getRelativeOffsetUsingRect(
    child: HTMLElement,
    parent: HTMLElement
  ): { top: number; left: number } {
    const childRect = child?.getBoundingClientRect();
    const parentRect = parent?.getBoundingClientRect();

    if (!childRect || !parentRect) {
      return {
        top: 0,
        left: 0,
      };
    }

    return {
      top: childRect.top - parentRect.top,
      left: childRect.left - parentRect.left,
    };
  }

  const formatImgUrl = (degree: number) => {
    if (cropImgUrl.startsWith('blob:')) {
      if (degree) {
        return rotateUrl[degree];
      }
      return cropImgUrl;
    }

    const url = cdnApi(cropImgUrl, {
      resizeWidth: 1200,
      format: 'webp',
    });

    let rotateParmas = degree ? `/rotate,${degree}` : '';

    if (!url.includes('x-oss-process')) {
      rotateParmas = `?x-oss-process=image${rotateParmas}`;
    }
    return `${url}${rotateParmas}`;
  };
  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const preloadImages = () => {
    if (cropImgUrl.indexOf('.gif') > -1) {
      return;
    }

    // 创建加载单个图片的Promise
    const loadImage = (url: string) => {
      return new Promise((resolve: any, reject) => {
        const img = new Image();
        img.src = url;
        img.onload = () => resolve();
        img.onerror = err =>
          reject(new Error(`Failed to load image at ${url}: ${err}`));
      });
    };

    if (cropImgUrl.startsWith('blob:')) {
      const urlsArray = [
        rotateBlobUrl(cropImgUrl, 90),
        rotateBlobUrl(cropImgUrl, 180),
        rotateBlobUrl(cropImgUrl, 270),
      ];

      Promise.all(urlsArray).then((res: any) => {
        rotateUrl = {
          90: res[0],
          180: res[1],
          270: res[2],
        };
        Promise.all(res.map(loadImage));
      });

      return;
    }
    const urlsArray = [
      formatImgUrl(0),
      formatImgUrl(90),
      formatImgUrl(180),
      formatImgUrl(270),
    ];

    // 使用Promise.all来并行加载所有图片
    Promise.all(urlsArray.map(loadImage));
  };

  useEffect(() => {
    if (imageLoaded) {
      preloadImages();
    }
  }, [imageLoaded]);

  useEffect(() => {
    if (imageLoaded) {
      const recalculateTransform = async () => {
        if (backgroundSize === 'contain') {
          return;
        }
        if (!imgRef.current || !imageLoaded) return;
        const maskWidth = imgRef.current.clientWidth;
        const maskHeight = imgRef.current.clientHeight;
        const isRotated = rotate % 180 !== 0;
        let imageWidth = imageSize.originalWidth;
        let imageHeight = imageSize.originalHeight;
        let originalWidth = imageSize.originalWidth;
        let originalHeight = imageSize.originalHeight;

        // 没有保存图片宽高的情况下，先去获取图片宽高
        if (!imageWidth || !imageHeight) {
          const res: any = await getBlobUrlDimensions(cropImgUrl);
          // const res = await getImageSize(cropImgUrl);
          if (res.width) {
            originalWidth = res.width;
            originalHeight = res.height;
            imageWidth = res.width;
            imageHeight = res.height;
          }
        }

        if (isRotated) {
          const temp = imageWidth;
          imageWidth = imageHeight;
          imageHeight = temp;
        }

        const containerAspect = maskWidth / maskHeight;
        const imgAspect = imageWidth / imageHeight;
        if (containerAspect > imgAspect) {
          setBackgroundSize(`${zoom * 100}% auto`); // 宽度填满
        } else {
          setBackgroundSize(`auto ${zoom * 100}%`);
        }

        const { width: imgW, height: imgH } = getContainSize(
          maskWidth,
          maskHeight,
          imageWidth,
          imageHeight
        );

        const rect = getRelativeOffsetUsingRect(
          imgRef.current,
          containerRef.current!
        );
        setImageSize({
          originalWidth: originalWidth,
          originalHeight: originalHeight,
          width: imgW,
          height: imgH,
          top: rect.top,
          left: rect.left,
        });

        const { offsetLeft, offsetTop } = getImageOffsetInMask({
          containerWidth: maskWidth,
          containerHeight: maskHeight,
          imageWidth: imgW * zoom,
          imageHeight: imgH * zoom,
          objectPositionXPercent: position.x,
          objectPositionYPercent: position.y,
        });

        if (backgroundRef.current) {
          backgroundRef.current.style.transform = `translate(${offsetLeft}px, ${offsetTop}px) scaleX(${flipHorizontal ? -1 : 1
            })`;
        }
      };

      recalculateTransform();
    }
  }, [
    imageLoaded,
    position,
    aspectRatio,
    zoom,
    flipHorizontal,
    rotate,
    cropImgUrl,
    crop,
  ]);

  const handleZoomIn = () => setZoom((prev: number) => Math.min(5, prev + 0.2));
  const handleZoomOut = () =>
    setZoom((prev: number) => Math.max(1, prev - 0.2));

  function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
  }

  return (
    <ImageConpDOM
      onClick={() => {
        setShowTip(false);
        localStorage.setItem('has_seen_image_tip', 'true');
      }}
    >
      <div className='head'>
        <div className='cancel_btn' onClick={() => onClose()}>
          取消
        </div>
        <span>{i18nModule.t('adjustImage')}</span>
        <div className='confirm_btn' onClick={handleSave}>
          完成
        </div>
      </div>
      <div
        className='container'
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {showTip && (
          <div className='use_tip'>
            <img src='https://img2.maka.im/cdn/webstore10/editor/imgLite_tip.png?v=1' />
            <p>
              手指拖动图片可调整图片位置
              <br />
              点击下方功能👇可对图片进行更多调整
            </p>
          </div>
        )}
        {loading && (
          <div className='loading'>
            <span>{i18nModule.t('removeBgTip')}</span>
          </div>
        )}

        {backgroundSize !== 'contain' && (
          <div className='tip_text'>手指拖动图片可调整图片位置</div>
        )}

        {backgroundSize !== 'contain' && (
          <div
            className='background'
            data-zoom={zoom}
            style={{
              width: imageSize.width * zoom,
              height: imageSize.height * zoom,
              top: imageSize.top,
              left: imageSize.left,
            }}
          >
            <img
              draggable={false}
              src={formatImgUrl(rotate)}
              ref={backgroundRef}
              alt=''
              style={{
                width: '100%',
                height: '100%',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                objectFit: 'contain',
                transform: `translate(0, 0) scaleX(${flipHorizontal ? -1 : 1})`,
              }}
            />
          </div>
        )}
        <div
          style={{
            position: 'relative',
            maxHeight: '100%',
            maxWidth: '100%',
            borderColor: 'transparent',
          }}
        >
          <div className='mask_container' style={layoutStyle}>
            <div
              className='img'
              ref={imgRef}
              style={{
                touchAction: 'none',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  backgroundImage: `url(${formatImgUrl(rotate)})`,
                  backgroundPosition: `${position.x}% ${position.y}%`,
                  backgroundSize,
                  backgroundRepeat: 'no-repeat',
                  transform: `scaleX(${flipHorizontal ? -1 : 1})`,
                  filter: strokeStyle?.value || 'none',
                }}
              ></div>
              <img
                draggable={false}
                src={formatImgUrl(rotate)}
                alt=''
                onLoad={handleImageLoad}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  opacity: 0,
                }}
              />
            </div>
          </div>
        </div>

        {backgroundSize !== 'contain' && (
          <div className='zoom_btn'>
            <div className='zoom_btn_item' onClick={handleZoomIn}>
              <img
                draggable={false}
                src={cdnApi('/cdn/mk-widgets/assets/zoom-in.png', {
                  format: 'webp',
                })}
                style={{
                  width: 24,
                  height: 24,
                }}
                alt=''
              />
              <span>{i18nModule.t('zoomIn')}</span>
            </div>
            <div className='line'></div>
            <div className='zoom_btn_item' onClick={handleZoomOut}>
              <img
                draggable={false}
                src={cdnApi('/cdn/mk-widgets/assets/zoom-out.png', {
                  format: 'webp',
                })}
                style={{
                  width: 24,
                  height: 24,
                }}
                alt=''
              />
              <span>{i18nModule.t('zoomOut')}</span>
            </div>
          </div>
        )}
      </div>
      {crop && (
        <div className='stroke'>
          <div className='color_list'>
            {baseColors.map(item => (
              <div
                key={item}
                className={`color_item ${item === strokeStyle.color ? 'active' : ''}`}
                style={{
                  backgroundColor: item,
                }}
                onClick={() => {
                  const value = generateDropShadowStyle(item, strokeStyle.type);
                  setStrokrStyle({
                    value,
                    type: strokeStyle.type,
                    color: item,
                  });
                }}
              ></div>
            ))}
          </div>
          <div className='stroke_list'>
            {strokeStyleList.map(item => {
              let isActive = item.value === strokeStyle.type;
              if (!strokeStyle.type && item.value === 'none') {
                isActive = true;
              }

              return (
                <div
                  key={item.value}
                  className={`stroke_item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    const color = strokeStyle.color || '#fff';
                    const value = generateDropShadowStyle(color, item.value);
                    setStrokrStyle({
                      value,
                      type: item.value,
                      color,
                    });
                  }}
                >
                  {item.value === 'none' ? (
                    <div className='none'>
                      <img src={item.preview} alt='' />
                      <span>无描边</span>
                    </div>
                  ) : (
                    <img src={item.preview} alt='' />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
          <span>{i18nModule.t('removeBg')}</span>
        </div>
        <div
          className='footer_btn'
          onClick={() => setFlipHorizontal(!flipHorizontal)}
        >
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
          <span>{i18nModule.t('flipHorizontal')}</span>
        </div>
        {cropImgUrl.indexOf('.gif') === -1 && (
          <div
            className='footer_btn'
            onClick={() => {
              setRotate((rotate + 90) % 360);
              setPosition({
                x: 50,
                y: backgroundSize === 'contain' ? 50 : 0,
              });
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
            <span>{i18nModule.t('rotate')}</span>
          </div>
        )}
        {(!attrs?.layoutStyle?.maskImage ||
          attrs?.layoutStyle?.maskImage?.indexOf('url') < 0) && (
            <div className='footer_btn' onClick={() => showAspectRatio()}>
              <img
                draggable={false}
                src={cdnApi('/cdn/mk-widgets/assets/icon_tailoring.png', {
                  format: 'webp',
                })}
                style={{
                  width: 24,
                  height: 24,
                }}
                alt=''
              />
              <span>{i18nModule.t('crop')}</span>
            </div>
          )}
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
          <span>{i18nModule.t('reset')}</span>
        </div>
        <div
          className={cls([
            'footer_btn',
            backgroundSize === 'contain' && 'active',
          ])}
          onClick={() => {
            if (backgroundSize === 'contain') {
              setBackgroundSize('cover');
              setPosition({
                x: 50,
                y: 0,
              });
              return;
            }
            setBackgroundSize('contain');
            setPosition({
              x: 50,
              y: 50,
            });
          }}
        >
          <Icon name='material-three' size={24} />
          <span>铺满</span>
        </div>
      </div>
      {uploading && (
        <div className='uploadLoading'>
          <Loading size={30} />
        </div>
      )}
    </ImageConpDOM>
  );
};

function ImageEditingPanelModal() {
  const worksStore = useWorksStore();
  const { widgetStateV2, setWidgetStateV2 } = worksStore;
  const { imageEditingOpen, editingElemId } = widgetStateV2;

  if (!editingElemId) return null;
  const layer = worksStore.getLayer(editingElemId);
  if (!layer || layer.elementRef !== 'Picture') return null;
  const attrs = layer.attrs as PictureData;

  return (
    <>
      <div
        id='hidden_edit_img_panel_trigger_btn'
        className='hidden absolute top-[-9999px] left-[-9999px]'
        onClick={() => setWidgetStateV2({ imageEditingOpen: true })}
      ></div>
      <ResponsiveDialog
        isOpen={imageEditingOpen}
        handleOnly={true}
        onOpenChange={nextVal => {
          setWidgetStateV2({
            imageEditingOpen: nextVal,
          });
        }}
        fullHeight={true}
      >
        <ImgLiteEditingPanel
          attrs={attrs}
          key={(attrs as any)._v}
          onClose={() => setWidgetStateV2({ imageEditingOpen: false })}
          onChange={nextVal => {
            console.log('nextVal', nextVal);
            worksStore.changeCompAttr(editingElemId, nextVal);
          }}
        />
      </ResponsiveDialog>
    </>
  );
}

export default observer(ImageEditingPanelModal);

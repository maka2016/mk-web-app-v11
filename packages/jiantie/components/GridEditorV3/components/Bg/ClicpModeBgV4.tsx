import { cdnApi } from '@/services';
import React, { useEffect, useRef, useState } from 'react';
import {
  buildCropUrl,
  parseCropUrl,
} from '../../componentsForEditor/ElementAttrsEditorV2/ImageCropperForOss';
import { blockStyleFilter } from '../../utils/styleHelper';
import { stringValueTo4Chunk } from '../../utils/utils';

export interface ClipModeBgProps {
  /**
   * 输入例子
   * border-image-slice:0 0 0 0;
   * border-image-width:20px 20px 20px 20px;
   * border-image-outset:0px 0px 0px 0px;
   * border-image-repeat:stretch stretch;
   * border-image-source:url("border-image-1.png");
   * border-style:solid;
   */
  value: React.CSSProperties;
  scale?: number;
}

// 解析CSS属性值，提取数字
const parseCSSValue = (value: string | number): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const match = value.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  }
  return 0;
};

// 获取border-image-slice的值
const getBorderImageSlice = (value: React.CSSProperties): number[] => {
  const borderImageSlice = value.borderImageSlice;
  if (typeof borderImageSlice === 'string') {
    // 解析 "0 0 0 0" 格式
    const values = borderImageSlice.split(' ').map(v => parseCSSValue(v));
    return values.length === 4 ? values : [0, 0, 0, 0];
  }
  return [0, 0, 0, 0]; // 默认值
};

// 获取border-image-width的值
const getBorderImageWidth = (value: React.CSSProperties, scaleProp: number) => {
  const borderWidth =
    blockStyleFilter({ borderWidth: String(value.borderWidth) }, scaleProp)
      ?.borderWidth || '';
  return stringValueTo4Chunk(String(borderWidth));
};

// 获取border-image-source的值
const getBorderImageSource = (value: React.CSSProperties): string => {
  const borderImageSource = value.borderImageSource;
  if (typeof borderImageSource === 'string') {
    // 解析 url("image.png") 格式
    const match = borderImageSource.match(/url\(["']?([^"']+)["']?\)/);
    if (match && match[1]) {
      return match[1];
    }
    return '';
  }
  return '';
};

export default function ClipModeBgV4(props: ClipModeBgProps) {
  const { value, scale: scaleProp = 1 } = props;
  const currentDOM = useRef<HTMLDivElement>(null);
  const [imageInfo, setImageInfo] = useState({
    width: 0,
    height: 0,
  });

  // 解析CSS属性
  const widthValues = getBorderImageWidth(value, scaleProp);
  const imageSource = getBorderImageSource(value);
  const [cropValues, setCropValues] = useState(parseCropUrl(imageSource));

  useEffect(() => {
    const getImageInfo = () => {
      const image = new Image();
      image.src = cdnApi(imageSource);
      image.onload = () => {
        setImageInfo({
          width: image.width,
          height: image.height,
        });

        if (cropValues.width === 0 || cropValues.height === 0) {
          setCropValues({
            x: 0,
            y: 0,
            width: image.width,
            height: image.height,
            gravity: 'nw',
          });
        }
      };
    };
    getImageInfo();

    return () => {};
  }, [imageSource]);

  // 如果没有图片源，返回null
  if (!imageSource) return null;

  // 计算9宫格的尺寸 - 使用border-image-width
  const [topWidth, rightWidth, bottomWidth, leftWidth] = widthValues || [
    0, 0, 0, 0,
  ];

  const imageSourceArr: string[] = [];

  const scale = imageInfo.width / (currentDOM.current?.offsetWidth || 1);

  return (
    <div
      className='clip_bg_container_v4'
      ref={currentDOM}
      style={{
        display: 'grid',
        gridTemplateColumns: `${leftWidth}px 1fr ${rightWidth}px`,
        gridTemplateRows: `${topWidth}px 1fr ${bottomWidth}px`,
        width: '100%',
        height: '100%',
        position: 'relative',
      }}
    >
      {/* 9宫格背景图片 */}
      {imageInfo.width !== 0 &&
        imageInfo.height !== 0 &&
        Array.from({ length: 9 }, (_, index) => {
          const row = Math.floor(index / 3);
          const col = index % 3;

          // 根据位置设置背景样式
          let backgroundSize = '';
          let backgroundRepeat = '';

          if (row === 0 && col === 0) {
            // 左上角 - 使用左上角的slice区域
            backgroundRepeat = 'no-repeat';

            imageSourceArr[index] = buildCropUrl(imageSource, {
              x: cropValues.x,
              y: cropValues.y,
              width: leftWidth * scale,
              height: topWidth * scale,
              gravity: 'nw',
            });
            backgroundSize = 'cover';
          } else if (row === 0 && col === 2) {
            // 右上角 - 使用右上角的slice区域
            backgroundRepeat = 'no-repeat';
            imageSourceArr[index] = buildCropUrl(imageSource, {
              x: imageInfo.width - cropValues.x - rightWidth * scale,
              y: cropValues.y,
              width: rightWidth * scale,
              height: topWidth * scale,
              gravity: 'nw',
            });
            backgroundSize = 'cover';
          } else if (row === 2 && col === 0) {
            // 左下角 - 使用左下角的slice区域
            backgroundRepeat = 'no-repeat';
            cropValues.height + cropValues.y;
            imageSourceArr[index] = buildCropUrl(imageSource, {
              x: cropValues.x,
              y: cropValues.y + cropValues.height - bottomWidth * scale,
              width: leftWidth * scale,
              height: bottomWidth * scale,
              gravity: 'nw',
            });
            backgroundSize = 'cover';
          } else if (row === 2 && col === 2) {
            // 右下角 - 使用右下角的slice区域
            backgroundRepeat = 'no-repeat';
            imageSourceArr[index] = buildCropUrl(imageSource, {
              x: imageInfo.width - cropValues.x - rightWidth * scale,
              y: cropValues.y + cropValues.height - bottomWidth * scale,
              width: rightWidth * scale,
              height: bottomWidth * scale,
              gravity: 'nw',
            });
            backgroundSize = 'cover';
          } else if (row === 0) {
            // 上边 - 水平拉伸，垂直居中
            backgroundRepeat = 'repeat-x';
            imageSourceArr[index] = buildCropUrl(imageSource, {
              x: cropValues.x + leftWidth * scale,
              y: cropValues.y,
              width: cropValues.width - (leftWidth + rightWidth) * scale,
              height: topWidth * scale,
              gravity: 'nw',
            });
            backgroundSize = 'contain';
          } else if (row === 2) {
            // 下边 - 水平拉伸，垂直居中
            backgroundRepeat = 'repeat';
            imageSourceArr[index] = buildCropUrl(imageSource, {
              x: cropValues.x + leftWidth * scale,
              y: cropValues.y + cropValues.height - bottomWidth * scale,
              width: cropValues.width - (leftWidth + rightWidth) * scale,
              height: bottomWidth * scale,
              gravity: 'nw',
            });
            backgroundSize = 'contain';
          } else if (col === 0) {
            // 左边 - 垂直拉伸，水平居中
            backgroundRepeat = 'repeat';
            imageSourceArr[index] = buildCropUrl(imageSource, {
              x: cropValues.x,
              y: cropValues.y + topWidth * scale,
              width: leftWidth * scale,
              height:
                cropValues.height - topWidth * scale - bottomWidth * scale,
              gravity: 'nw',
            });
            backgroundSize = 'contain';
          } else if (col === 2) {
            // 右边 - 垂直拉伸，水平居中
            backgroundRepeat = 'repeat';
            imageSourceArr[index] = buildCropUrl(imageSource, {
              x: cropValues.x + cropValues.width - rightWidth * scale,
              y: cropValues.y + topWidth * scale,
              width: rightWidth * scale,
              height:
                cropValues.height - topWidth * scale - bottomWidth * scale,
              gravity: 'nw',
            });
            backgroundSize = 'contain';
          } else {
            // 中心区域 - 完全填充
            backgroundRepeat = 'repeat';
            imageSourceArr[index] = buildCropUrl(imageSource, {
              x: cropValues.x + leftWidth * scale,
              y: cropValues.y + topWidth * scale,
              width:
                imageInfo.width -
                cropValues.x -
                (leftWidth + rightWidth) * scale,
              height:
                imageInfo.height -
                cropValues.y -
                (topWidth + bottomWidth) * scale,
              gravity: 'nw',
            });
            backgroundSize = 'contain';
          }

          return (
            <div
              key={index}
              className={`clip_bg_item idx_${index}`}
              style={{
                backgroundImage: `url("${imageSourceArr[index] || imageSource}")`,
                backgroundSize: backgroundSize
                  ? backgroundSize
                  : `${imageInfo.width / scale}px ${imageInfo.height / scale}px`,
                backgroundRepeat,
                // backgroundOrigin: "content-box",
                // backgroundPosition,
                width: '100%',
                height: '100%',
              }}
            />
          );
        })}
    </div>
  );
}

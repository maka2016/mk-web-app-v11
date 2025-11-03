import React, { useState, useRef, useEffect } from 'react';
import { Upload, Copy, Crop, Layers } from 'lucide-react';
import { Label } from '@workspace/ui/components/label';
import { IconInput } from '@workspace/ui/components/icon-input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu';
import { useGridContext } from '../../comp/provider';
import { SettingItemFor4Value } from './StyleSetting';
import { Button } from '@workspace/ui/components/button';
import ImageCropperForOss from './ImageCropperForOss';

interface BorderImageSliceEditorValue {
  borderWidth?: string;
  borderImageSlice?: string;
  borderImageOutset?: string;
  borderImageRepeat?: string;
  borderImageSource?: string;
  borderStyle?: string;
  borderImageWidth?: string;
  borderTopWidth?: string;
  borderRightWidth?: string;
  borderBottomWidth?: string;
  borderLeftWidth?: string;
  // 新增：图片裁剪相关属性
  cropParams?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    gravity?: string;
  };
}

interface BorderImageSliceEditorProps {
  targetDOM?: HTMLElement;
  /**
   * 输入例子
   * border-image-slice:27 27 27 27;
   * border-image-width:20px 20px 20px 20px;
   * border-image-outset:0px 0px 0px 0px;
   * border-image-repeat:stretch stretch;
   * border-image-source:url("border-image-1.png");
   * border-style:solid;
   */
  value: BorderImageSliceEditorValue;
  onChange: (value: BorderImageSliceEditorValue) => void;
  onConfirm?: (value: BorderImageSliceEditorValue) => void;
  onCancel?: () => void;
}

interface SliceValues {
  top: number;
  right: number;
  bottom: number;
  left: number;
  isPercentage?: boolean;
  fill?: boolean;
}

// 解析边框宽度值
const parseBorderWidth = (
  borderWidth?: string
): {
  top: number;
  right: number;
  bottom: number;
  left: number;
  unit: string;
} => {
  if (!borderWidth) return { top: 0, right: 0, bottom: 0, left: 0, unit: 'px' };

  const parts = borderWidth.split(/\s+/).filter(part => part.length > 0);
  const unit = parts[0].replace(/[\d.]/g, '') || 'px';

  const values = parts.map(val => parseFloat(val.replace(/[^\d.]/g, '')) || 0);

  if (values.length === 1) {
    return {
      top: values[0],
      right: values[0],
      bottom: values[0],
      left: values[0],
      unit,
    };
  } else if (values.length === 2) {
    return {
      top: values[0],
      right: values[1],
      bottom: values[0],
      left: values[1],
      unit,
    };
  } else if (values.length === 3) {
    return {
      top: values[0],
      right: values[1],
      bottom: values[2],
      left: values[1],
      unit,
    };
  } else if (values.length === 4) {
    return {
      top: values[0],
      right: values[1],
      bottom: values[2],
      left: values[3],
      unit,
    };
  }

  return { top: 0, right: 0, bottom: 0, left: 0, unit };
};

// 格式化边框宽度值
const formatBorderWidth = (widths: {
  top: number;
  right: number;
  bottom: number;
  left: number;
  unit: string;
}): string => {
  const { top, right, bottom, left, unit } = widths;
  if (top === right && right === bottom && bottom === left) {
    return `${top}${unit}`;
  }
  return `${top}${unit} ${right}${unit} ${bottom}${unit} ${left}${unit}`;
};

const parseSliceValue = (sliceValue?: string): SliceValues => {
  if (!sliceValue) return { top: 0, right: 0, bottom: 0, left: 0, fill: true };

  // 检查是否包含 fill 关键字
  const hasFill = sliceValue.includes('fill');

  // border-image-slice 不支持 px 单位，只支持数字和百分比
  const cleanValue = sliceValue.replace(/fill/g, '').trim();
  const parts = cleanValue.split(/\s+/).filter(part => part.length > 0);

  // 检查是否有百分比值
  const hasPercentage = parts.some(part => part.includes('%'));

  const values = parts.map(val => {
    return parseFloat(val); // 移除 % 符号并转换为数字
  });

  let result: SliceValues;

  if (values.length === 1) {
    result = {
      top: values[0],
      right: values[0],
      bottom: values[0],
      left: values[0],
      isPercentage: hasPercentage,
      fill: hasFill,
    };
  } else if (values.length === 2) {
    result = {
      top: values[0],
      right: values[1],
      bottom: values[0],
      left: values[1],
      isPercentage: hasPercentage,
      fill: hasFill,
    };
  } else if (values.length === 3) {
    result = {
      top: values[0],
      right: values[1],
      bottom: values[2],
      left: values[1],
      isPercentage: hasPercentage,
      fill: hasFill,
    };
  } else if (values.length === 4) {
    result = {
      top: values[0],
      right: values[1],
      bottom: values[2],
      left: values[3],
      isPercentage: hasPercentage,
      fill: hasFill,
    };
  } else {
    result = { top: 0, right: 0, bottom: 0, left: 0, fill: hasFill };
  }

  return result;
};

const formatSliceValue = (slices: SliceValues): string => {
  const suffix = slices.isPercentage ? '%' : '';
  const sliceValues = `${slices.top}${suffix} ${slices.right}${suffix} ${slices.bottom}${suffix} ${slices.left}${suffix}`;
  return slices.fill ? `${sliceValues} fill` : sliceValues;
};

const parseRepeatValue = (
  repeatValue?: string
): { horizontal: string; vertical: string } => {
  if (!repeatValue) return { horizontal: 'stretch', vertical: 'stretch' };

  const values = repeatValue.split(/\s+/);
  if (values.length === 1) {
    return { horizontal: values[0], vertical: values[0] };
  }
  return { horizontal: values[0], vertical: values[1] };
};

const extractImageUrl = (source?: string): string => {
  if (!source) return '';
  const match = source.match(/url\(['"]?([^'")]+)['"]?\)/);
  return match ? match[1] : '';
};

// 合并单独的边框宽度为统一的 borderWidth
const mergeBorderWidths = (styles: React.CSSProperties): string => {
  // 如果已经有 borderWidth，直接使用
  if (styles.borderWidth) {
    return String(styles.borderWidth);
  }

  // 收集单独的边框宽度
  const top = styles.borderTopWidth || '0';
  const right = styles.borderRightWidth || '0';
  const bottom = styles.borderBottomWidth || '0';
  const left = styles.borderLeftWidth || '0';

  // 如果所有值都相同，返回单一值
  if (top === right && right === bottom && bottom === left) {
    return String(top);
  }

  // 否则返回四个值的组合
  return `${top} ${right} ${bottom} ${left}`;
};

export default function BorderImageSliceEditor(
  props: BorderImageSliceEditorProps
) {
  const { value: defaultValue, onConfirm, onCancel, targetDOM } = props;
  const { editorCtx } = useGridContext();
  const [showDetail, setShowDetail] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const dragStartValuesRef = useRef<{
    top: number;
    right: number;
    bottom: number;
    left: number;
    mouseX: number;
    mouseY: number;
    cropX?: number;
    cropY?: number;
  } | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  // 内部状态管理 - 外部 value 只作为初始值，合并边框宽度
  const [internalValue, _setInternalValue] =
    useState<BorderImageSliceEditorValue>(defaultValue);
  const setInternalValue = (value = defaultValue) => {
    const mergedBorderWidth = mergeBorderWidths(value);
    _setInternalValue({
      ...value,
      borderWidth: mergedBorderWidth,
      // 清除单独的边框宽度，统一使用 borderWidth
      borderTopWidth: undefined,
      borderRightWidth: undefined,
      borderBottomWidth: undefined,
      borderLeftWidth: undefined,
    });
  };

  // 解析当前内部值
  const imageUrl = extractImageUrl(internalValue.borderImageSource as string);
  const sliceValues = parseSliceValue(internalValue.borderImageSlice as string);
  const repeatValues = parseRepeatValue(
    internalValue.borderImageRepeat as string
  );
  const borderWidths = parseBorderWidth(internalValue.borderWidth);

  // const {} = useCropper(imageUrl as string, containerRef, (cropResult) => {
  //   console.log("cropResult", cropResult);
  //   // setInternalValue({
  //   //   ...internalValue,
  //   //   borderImageSource: `url("${cropResult.url}")`,
  //   // });
  // });
  // 检查是否有变化 - 对比处理后的初始值
  const normalizedDefaultValue = {
    ...defaultValue,
    borderWidth: mergeBorderWidths(defaultValue),
    borderTopWidth: undefined,
    borderRightWidth: undefined,
    borderBottomWidth: undefined,
    borderLeftWidth: undefined,
  };
  const hasChanges =
    JSON.stringify(internalValue) !== JSON.stringify(normalizedDefaultValue);

  // 处理切片值变化
  const handleSliceChange = (
    direction: keyof SliceValues,
    newValue: number
  ) => {
    if (direction === 'isPercentage' || direction === 'fill') return; // 忽略这些属性的更改
    const newSlices = {
      ...sliceValues,
      [direction]: Math.max(0, newValue),
    };
    setInternalValue({
      ...internalValue,
      borderImageSlice: formatSliceValue(newSlices),
    });
  };

  // 处理填充模式切换
  const handleFillToggle = () => {
    const newSlices = {
      ...sliceValues,
      fill: !sliceValues.fill,
    };
    setInternalValue({
      ...internalValue,
      borderImageSlice: formatSliceValue(newSlices),
    });
  };

  const handleRepeatChange = (horizontal: string, vertical?: string) => {
    const newRepeat = `${horizontal} ${vertical || horizontal}`;
    setInternalValue({
      ...internalValue,
      borderImageRepeat: newRepeat,
    });
  };

  // 处理边框宽度变化
  const handleBorderWidthChange = (
    direction: keyof Pick<
      typeof borderWidths,
      'top' | 'right' | 'bottom' | 'left'
    >,
    newValue: number
  ) => {
    const newWidths = {
      ...borderWidths,
      [direction]: Math.max(0, newValue),
    };
    setInternalValue({
      ...internalValue,
      borderWidth: formatBorderWidth(newWidths),
    });
  };

  // 处理图片上传
  const handleImageUpload = () => {
    editorCtx?.utils.showSelector({
      onSelected: (params: any) => {
        if (params.ossPath || params.url) {
          const imageSource = params.url || params.ossPath;
          setInternalValue({
            ...internalValue,
            borderImageSource: `url("${imageSource}")`,
            borderStyle: 'solid',
            borderWidth: internalValue.borderWidth || '10px',
          });
        }
      },
      payload: {
        defaultAtUpload: true,
      },
      type: 'picture',
    });
  };

  // 计算切片线位置的辅助函数
  const getSlicePositions = () => {
    if (!imgRef.current || !imageLoaded) return null;

    const img = imgRef.current;
    let topSlice, rightSlice, bottomSlice, leftSlice;

    if (sliceValues.isPercentage) {
      topSlice = (sliceValues.top / 100) * img.naturalHeight;
      rightSlice = (sliceValues.right / 100) * img.naturalWidth;
      bottomSlice = (sliceValues.bottom / 100) * img.naturalHeight;
      leftSlice = (sliceValues.left / 100) * img.naturalWidth;
    } else {
      topSlice = sliceValues.top;
      rightSlice = sliceValues.right;
      bottomSlice = sliceValues.bottom;
      leftSlice = sliceValues.left;
    }

    // 计算百分比位置（相对于图片）
    const topPercent = Math.min((topSlice / img.naturalHeight) * 100, 50);
    const rightPercent = Math.min((rightSlice / img.naturalWidth) * 100, 50);
    const bottomPercent = Math.min((bottomSlice / img.naturalHeight) * 100, 50);
    const leftPercent = Math.min((leftSlice / img.naturalWidth) * 100, 50);

    return {
      top: topPercent,
      right: rightPercent,
      bottom: bottomPercent,
      left: leftPercent,
    };
  };

  // 计算切片位置
  const slicePositions = getSlicePositions();

  // 计算边框宽度指示器位置
  const getBorderWidthPositions = (containerWidth: number) => {
    if (!imageDimensions || !targetDOM) return null;

    const targetRect = targetDOM.getBoundingClientRect();

    // 使用统一的缩放比例，基于宽度计算
    const containerToTargetRatio = containerWidth / targetRect.width;

    // 边框宽度在画布上的像素位置 = 原始边框宽度 × 统一缩放比例
    const topWidth = borderWidths.top * containerToTargetRatio;
    const rightWidth = borderWidths.right * containerToTargetRatio;
    const bottomWidth = borderWidths.bottom * containerToTargetRatio;
    const leftWidth = borderWidths.left * containerToTargetRatio;

    return {
      top: topWidth,
      right: rightWidth,
      bottom: bottomWidth,
      left: leftWidth,
      // 返回统一的缩放比例，用于拖拽计算
      scale: containerToTargetRatio,
    };
  };

  // 计算画布尺寸 - 根据图片宽高比动态调整
  const getCanvasStyle = () => {
    if (!imageDimensions) {
      return { width: 300, height: 150 }; // 调整默认尺寸以适应侧边栏
    }

    const aspectRatio = imageDimensions.width / imageDimensions.height;
    const maxWidth = 200; // 调整最大宽度以适应侧边栏
    const maxHeight = 200; // 调整最大高度

    let width = maxWidth;
    let height = maxWidth / aspectRatio;

    // 如果高度超过最大值，则以高度为准重新计算
    if (height > maxHeight) {
      height = maxHeight;
      width = maxHeight * aspectRatio;
    }

    return {
      width: Math.round(width),
      height: Math.round(height),
    };
  };

  const canvasStyle = getCanvasStyle();
  const borderWidthPositions = getBorderWidthPositions(canvasStyle.width);

  // 拖拽开始处理
  const handleDragStart = (direction: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(direction);

    // 记录拖拽开始时的初始值和鼠标位置
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // 边框切片模式拖拽
      dragStartValuesRef.current = {
        top: borderWidths.top,
        right: borderWidths.right,
        bottom: borderWidths.bottom,
        left: borderWidths.left,
        mouseX,
        mouseY,
      };
    }
  };

  const handleDragEnd = () => {
    setIsDragging(null);
    dragStartValuesRef.current = null; // 清理拖拽开始时的值
  };

  // 使用 useEffect 管理拖拽事件监听器
  useEffect(() => {
    if (isDragging) {
      // 拖拽开始时添加全局事件监听器
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // 调用原有的拖拽移动逻辑
        handleDragMoveLogic(e.clientX, e.clientY, x, y, rect);
      };

      const handleGlobalMouseUp = () => {
        handleDragEnd();
      };

      // 添加全局事件监听器
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      // 清理函数
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging]);

  const borderWidthWithBorderSliceRatio =
    (targetDOM?.getBoundingClientRect().width || 0) /
      (imageDimensions?.width || 0) || 1;

  // 将原有的拖拽移动逻辑提取为独立函数
  const handleDragMoveLogic = (
    clientX: number,
    clientY: number,
    x: number,
    y: number,
    rect: DOMRect
  ) => {
    if (!isDragging || !containerRef.current || !imgRef.current) return;

    const img = imgRef.current;
    let newSliceValue = 0;
    let newBorderValue = 0;
    const newSlices = { ...sliceValues };
    const newBorderWidths = {
      ...borderWidths,
    };

    switch (isDragging) {
      case 'top':
        // 上边拖拽：从上边缘向下计算，y 越大，上边距越大
        const topPercent = Math.max(0, Math.min(50, (y / rect.height) * 100));
        newSliceValue = sliceValues.isPercentage
          ? topPercent
          : (topPercent / 100) * img.naturalHeight;
        newBorderValue = newSliceValue * borderWidthWithBorderSliceRatio;
        newSlices.top = Math.max(0, Math.round(newSliceValue));
        newBorderWidths.top = Math.max(0, Math.round(newBorderValue));
        break;
      case 'bottom':
        // 下边拖拽：从下边缘向上计算，y 越大，下边距越小
        const bottomPercent = Math.max(
          0,
          Math.min(50, ((rect.height - y) / rect.height) * 100)
        );
        newSliceValue = sliceValues.isPercentage
          ? bottomPercent
          : (bottomPercent / 100) * img.naturalHeight;
        newBorderValue = newSliceValue * borderWidthWithBorderSliceRatio;
        newSlices.bottom = Math.max(0, Math.round(newSliceValue));
        newBorderWidths.bottom = Math.max(0, Math.round(newBorderValue));
        break;
      case 'left':
        // 左边拖拽：从左边缘向右计算，x 越大，左边距越大
        const leftPercent = Math.max(0, Math.min(50, (x / rect.width) * 100));
        newSliceValue = sliceValues.isPercentage
          ? leftPercent
          : (leftPercent / 100) * img.naturalWidth;
        newBorderValue = newSliceValue * borderWidthWithBorderSliceRatio;
        newSlices.left = Math.max(0, Math.round(newSliceValue));
        newBorderWidths.left = Math.max(0, Math.round(newBorderValue));
        break;
      case 'right':
        // 右边拖拽：从右边缘向左计算，x 越大，右边距越小
        const rightPercent = Math.max(
          0,
          Math.min(50, ((rect.width - x) / rect.width) * 100)
        );

        newSliceValue = sliceValues.isPercentage
          ? rightPercent
          : (rightPercent / 100) * img.naturalWidth;
        newBorderValue = newSliceValue * borderWidthWithBorderSliceRatio;

        newSlices.right = Math.max(0, Math.round(newSliceValue));
        newBorderWidths.right = Math.max(0, Math.round(newBorderValue));
        break;
    }

    setInternalValue({
      ...internalValue,
      borderWidth: formatBorderWidth(newBorderWidths),
      borderImageSlice: formatSliceValue(newSlices),
    });
  };

  return (
    <div className='border-image-editor flex flex-col h-full max-h-[85vh]'>
      {/* 头部 - 图片上传 */}
      <div className='flex-shrink-0 px-2 py-1 border-b border-gray-200'>
        {!imageUrl ? (
          <div
            className='w-full h-20 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors'
            onClick={handleImageUpload}
          >
            <Upload size={16} className='text-gray-400 mb-1' />
            <span className='text-xs text-gray-600'>上传边框图片</span>
          </div>
        ) : (
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <img
                src={imageUrl}
                alt='Border'
                className='w-8 h-8 object-cover rounded border'
              />
            </div>
            <div className='flex gap-1'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setShowDetail(!showDetail)}
                className='h-6 px-2 text-xs'
              >
                参数
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={handleImageUpload}
                className='h-6 px-2 text-xs'
              >
                换图
              </Button>

              <Button
                className='h-6 px-2 text-xs'
                variant='outline'
                size='sm'
                onClick={onCancel}
              >
                取消
              </Button>
              {hasChanges && (
                <Button
                  variant={hasChanges ? 'default' : 'secondary'}
                  className='h-6 px-2 text-xs'
                  size='sm'
                  onClick={() => onConfirm?.(internalValue)}
                  disabled={!hasChanges}
                >
                  应用
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 拖拽操作画布区域 */}
      {imageUrl && (
        <div className='flex-shrink-0 p-2 border-b border-gray-200'>
          <ImageCropperForOss
            value={imageUrl}
            onChange={cropResult => {
              console.log('nextUrl', cropResult);
              setInternalValue({
                ...internalValue,
                borderImageSource: `url("${cropResult.url}")`,
                // borderImageSlice: formatSliceValue({
                //   ...sliceValues,
                //   top: cropResult?.cropValues.y || 0,
                //   right: cropResult?.cropValues.x || 0,
                //   bottom: cropResult?.cropValues.y || 0,
                //   left: cropResult?.cropValues.x || 0,
                // }),
              });
            }}
          />
          <div
            className='bg-white border border-gray-200 rounded overflow-hidden'
            // 拖拽监听范围扩大到父级容器，允许拖拽到边界外设置边框宽度为0
          >
            <div
              ref={containerRef}
              className='relative bg-gray-50 overflow-hidden mx-auto'
              style={canvasStyle}
            >
              {/* 背景图片 */}
              <img
                ref={imgRef}
                src={imageUrl}
                alt='Border'
                className='w-full h-full object-contain'
                onLoad={e => {
                  const img = e.target as HTMLImageElement;
                  setImageLoaded(true);
                  setImageDimensions({
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                  });
                }}
              />

              {/* 切片线覆盖层 - 边框切片功能 */}
              {imageLoaded && slicePositions && (
                <div className='absolute inset-0 pointer-events-none'>
                  {/* 上边线 */}
                  <div
                    className='absolute left-0 right-0 border-t-2 border-blue-500'
                    style={{ top: `${slicePositions.top}%` }}
                  />
                  {/* 下边线 */}
                  <div
                    className='absolute left-0 right-0 border-t-2 border-blue-500'
                    style={{ bottom: `${slicePositions.bottom}%` }}
                  />
                  {/* 左边线 */}
                  <div
                    className='absolute top-0 bottom-0 border-l-2 border-blue-500'
                    style={{ left: `${slicePositions.left}%` }}
                  />
                  {/* 右边线 */}
                  <div
                    className='absolute top-0 bottom-0 border-l-2 border-blue-500'
                    style={{ right: `${slicePositions.right}%` }}
                  />

                  {/* 拖拽控制点 - 错开排列避免重叠 */}
                  <div
                    className='absolute w-3 h-3 bg-blue-500 rounded-sm cursor-ns-resize pointer-events-auto transform -translate-x-1/2 -translate-y-1/2'
                    style={{ top: `${slicePositions.top}%`, left: '50%' }}
                    onMouseDown={handleDragStart('top')}
                  />
                  <div
                    className='absolute w-3 h-3 bg-blue-500 rounded-sm cursor-ns-resize pointer-events-auto transform -translate-x-1/2 translate-y-1/2'
                    style={{ bottom: `${slicePositions.bottom}%`, left: '50%' }}
                    onMouseDown={handleDragStart('bottom')}
                  />
                  <div
                    className='absolute w-3 h-3 bg-blue-500 rounded-sm cursor-ew-resize pointer-events-auto transform -translate-x-1/2 -translate-y-1/2'
                    style={{ top: '50%', left: `${slicePositions.left}%` }}
                    onMouseDown={handleDragStart('left')}
                  />
                  <div
                    className='absolute w-3 h-3 bg-blue-500 rounded-sm cursor-ew-resize pointer-events-auto transform translate-x-1/2 -translate-y-1/2'
                    style={{ top: '50%', right: `${slicePositions.right}%` }}
                    onMouseDown={handleDragStart('right')}
                    title={`右边切片: ${sliceValues.right}${sliceValues.isPercentage ? '%' : 'px'}`}
                  />
                </div>
              )}

              {/* 边框宽度指示器覆盖层 */}
              {imageLoaded && borderWidthPositions && (
                <div className='absolute inset-0 pointer-events-none'>
                  {/* 上边框宽度指示器 */}
                  <div
                    className='absolute left-0 right-0 bg-green-500 bg-opacity-30'
                    style={{
                      top: 0,
                      height: `${borderWidthPositions.top}px`,
                      borderBottom: '1px dashed #10b981',
                    }}
                  />
                  {/* 下边框宽度指示器 */}
                  <div
                    className='absolute left-0 right-0 bg-green-500 bg-opacity-30'
                    style={{
                      bottom: 0,
                      height: `${borderWidthPositions.bottom}px`,
                      borderTop: '1px dashed #10b981',
                    }}
                  />
                  {/* 左边框宽度指示器 */}
                  <div
                    className='absolute top-0 bottom-0 bg-green-500 bg-opacity-30'
                    style={{
                      left: 0,
                      width: `${borderWidthPositions.left}px`,
                      borderRight: '1px dashed #10b981',
                    }}
                  />
                  {/* 右边框宽度指示器 */}
                  <div
                    className='absolute top-0 bottom-0 bg-green-500 bg-opacity-30'
                    style={{
                      right: 0,
                      width: `${borderWidthPositions.right}px`,
                      borderLeft: '1px dashed #10b981',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showDetail && (
        <div className='flex-1 overflow-y-auto p-2 space-y-4'>
          {imageUrl && (
            <>
              {/* 边框图片切片设置 */}
              <div className='bg-white border border-gray-200 rounded-lg p-2'>
                <div className='flex items-center justify-between mb-3'>
                  <h4 className='font-medium text-sm'>边框图片切片</h4>
                  <button
                    className='px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded'
                    onClick={() => {
                      const newSlices = {
                        ...sliceValues,
                        isPercentage: !sliceValues.isPercentage,
                      };
                      setInternalValue({
                        ...internalValue,
                        borderImageSlice: formatSliceValue(newSlices),
                      });
                    }}
                  >
                    {sliceValues.isPercentage ? '%' : 'px'}
                  </button>
                </div>

                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <Label className='text-xs text-gray-600 mb-1 block'>
                      上边
                    </Label>
                    <IconInput
                      type='number'
                      value={sliceValues.top}
                      onChange={e =>
                        handleSliceChange('top', Number(e.target.value))
                      }
                      className='h-8 text-sm'
                    />
                  </div>
                  <div>
                    <Label className='text-xs text-gray-600 mb-1 block'>
                      右边
                    </Label>
                    <IconInput
                      type='number'
                      value={sliceValues.right}
                      onChange={e =>
                        handleSliceChange('right', Number(e.target.value))
                      }
                      className='h-8 text-sm'
                    />
                  </div>
                  <div>
                    <Label className='text-xs text-gray-600 mb-1 block'>
                      下边
                    </Label>
                    <IconInput
                      type='number'
                      value={sliceValues.bottom}
                      onChange={e =>
                        handleSliceChange('bottom', Number(e.target.value))
                      }
                      className='h-8 text-sm'
                    />
                  </div>
                  <div>
                    <Label className='text-xs text-gray-600 mb-1 block'>
                      左边
                    </Label>
                    <IconInput
                      type='number'
                      value={sliceValues.left}
                      onChange={e =>
                        handleSliceChange('left', Number(e.target.value))
                      }
                      className='h-8 text-sm'
                    />
                  </div>
                </div>

                {/* Fill 模式切换 */}
                <div className='mt-3 pt-3 border-t border-gray-100'>
                  <label className='flex items-center gap-2 text-xs text-gray-600 cursor-pointer'>
                    <input
                      type='checkbox'
                      checked={sliceValues.fill || false}
                      onChange={handleFillToggle}
                      className='w-3 h-3 rounded border-gray-300'
                    />
                    <span>Fill 模式</span>
                  </label>
                  <div className='text-xs text-gray-400 mt-1'>
                    启用后，中间区域将作为背景图像显示
                  </div>
                </div>
              </div>

              {/* Border Image Width 设置 */}
              <div className='bg-white border border-gray-200 rounded-lg p-2'>
                <h4 className='font-medium mb-3 text-sm'>边框宽度</h4>
                <div className='grid grid-cols-2 gap-3 mb-3'>
                  <div>
                    <Label className='text-xs text-gray-600 mb-1 block'>
                      上边框
                    </Label>
                    <IconInput
                      type='number'
                      value={borderWidths.top}
                      onChange={e =>
                        handleBorderWidthChange('top', Number(e.target.value))
                      }
                      className='h-8 text-sm'
                    />
                  </div>
                  <div>
                    <Label className='text-xs text-gray-600 mb-1 block'>
                      右边框
                    </Label>
                    <IconInput
                      type='number'
                      value={borderWidths.right}
                      onChange={e =>
                        handleBorderWidthChange('right', Number(e.target.value))
                      }
                      className='h-8 text-sm'
                    />
                  </div>
                  <div>
                    <Label className='text-xs text-gray-600 mb-1 block'>
                      下边框
                    </Label>
                    <IconInput
                      type='number'
                      value={borderWidths.bottom}
                      onChange={e =>
                        handleBorderWidthChange(
                          'bottom',
                          Number(e.target.value)
                        )
                      }
                      className='h-8 text-sm'
                    />
                  </div>
                  <div>
                    <Label className='text-xs text-gray-600 mb-1 block'>
                      左边框
                    </Label>
                    <IconInput
                      type='number'
                      value={borderWidths.left}
                      onChange={e =>
                        handleBorderWidthChange('left', Number(e.target.value))
                      }
                      className='h-8 text-sm'
                    />
                  </div>
                </div>
                <div className='text-xs text-gray-500'>
                  单位: {borderWidths.unit} (可在画布上拖拽绿色控制点调整)
                </div>
              </div>

              {/* Border Image Outset 设置 */}
              <div className='bg-white border border-gray-200 rounded-lg p-2'>
                <h4 className='font-medium mb-3 text-sm'>边框边距</h4>
                <SettingItemFor4Value
                  value={String(internalValue.borderImageOutset)}
                  label='边距'
                  inputOnly={true}
                  onChange={nextValue => {
                    setInternalValue({
                      ...internalValue,
                      borderImageOutset: nextValue,
                    });
                  }}
                />
              </div>

              {/* Border Image Repeat 设置 */}
              <div className='bg-white border border-gray-200 rounded-lg p-2'>
                <h4 className='font-medium mb-3 text-sm'>边框重复模式</h4>
                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <Label className='text-xs text-gray-600 mb-1 block'>
                      水平方向
                    </Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className='w-full h-8 px-2 text-xs text-left border border-gray-300 rounded bg-white hover:bg-gray-50 flex items-center justify-between'>
                          <span>{repeatValues.horizontal}</span>
                          <svg
                            className='w-3 h-3'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M19 9l-7 7-7-7'
                            />
                          </svg>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {['stretch', 'repeat', 'round', 'space'].map(repeat => (
                          <DropdownMenuItem
                            key={repeat}
                            onClick={() =>
                              handleRepeatChange(repeat, repeatValues.vertical)
                            }
                          >
                            {repeat}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div>
                    <Label className='text-xs text-gray-600 mb-1 block'>
                      垂直方向
                    </Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className='w-full h-8 px-2 text-xs text-left border border-gray-300 rounded bg-white hover:bg-gray-50 flex items-center justify-between'>
                          <span>{repeatValues.vertical}</span>
                          <svg
                            className='w-3 h-3'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M19 9l-7 7-7-7'
                            />
                          </svg>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {['stretch', 'repeat', 'round', 'space'].map(repeat => (
                          <DropdownMenuItem
                            key={repeat}
                            onClick={() =>
                              handleRepeatChange(
                                repeatValues.horizontal,
                                repeat
                              )
                            }
                          >
                            {repeat}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

import styled from '@emotion/styled';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { Slider } from '@workspace/ui/components/slider';
import { CheckIcon, ZoomIn } from 'lucide-react';
import { useRef, useState } from 'react';
import { getCanvaInfo2 } from '../../provider/utils';
import { BtnLiteColumn } from '../style-comps';

// 滑动条容器样式
const SizeSliderContainer = styled.div`
  padding: 24px 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-width: 240px;
`;

const SizeDisplay = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #333;
`;

const SliderWrapper = styled.div`
  display: flex;
  flex: 1;
  gap: 8px;
  padding: 0 8px;
`;

export const getImgWidth = (elemId: string) => {
  const imgDOM = document.querySelector(
    `[data-image-id="${elemId}"]`
  ) as HTMLImageElement;
  const scaleRate = getCanvaInfo2().canvaScale;
  const rect = imgDOM.getBoundingClientRect();
  return rect.width / scaleRate;
};

export const getImgHeight = (elemId: string) => {
  const imgDOM = document.querySelector(
    `[data-image-id="${elemId}"]`
  ) as HTMLImageElement;
  const scaleRate = getCanvaInfo2().canvaScale;
  const rect = imgDOM.getBoundingClientRect();
  return rect.height / scaleRate;
};
// 获取图片容器元素
export const getImageContainer = (elemId: string) => {
  return document.querySelector(`[data-elem-id="${elemId}"]`) as HTMLElement;
};

// 实时更新DOM样式（不提交数据）- 使用 transform 模拟缩放
const updateDOMSize = (
  elemId: string,
  nextWidth: number,
  initialWidth: number
) => {
  const container = getImageContainer(elemId);
  if (!container) return;

  // 计算缩放比例（基于初始宽度）
  const scale = nextWidth / initialWidth;

  // 使用 transform 来模拟大小变化，不影响布局
  const existingTransform = container.style.transform || '';
  // 保留原有的 transform（如 rotate 等），只更新 scale
  const transformMatch = existingTransform.match(/scale\([^)]*\)/);
  let newTransform = existingTransform;

  if (transformMatch) {
    // 如果已有 scale，替换它
    newTransform = existingTransform.replace(
      /scale\([^)]*\)/,
      `scale(${scale})`
    );
  } else {
    // 如果没有 scale，添加到 transform 末尾
    newTransform = existingTransform
      ? `${existingTransform} scale(${scale})`
      : `scale(${scale})`;
  }

  container.style.transform = newTransform;
  container.style.transformOrigin = 'left top';
};

// 清除 transform 样式
export const clearTransform = (elemId: string) => {
  const container = getImageContainer(elemId);
  if (!container) return;

  // 移除 scale，保留其他 transform
  const existingTransform = container.style.transform || '';
  const newTransform = existingTransform
    .replace(/\s*scale\([^)]*\)/g, '')
    .trim();

  if (newTransform) {
    container.style.transform = newTransform;
  } else {
    container.style.transform = '';
  }
  container.style.transformOrigin = '';
};

export default function ChangeScaleHelper({
  layer,
  trigger,
  onUpdate,
  onChange,
}: {
  layer: any;
  trigger?: React.ReactNode;
  onUpdate?: () => void;
  onChange: (elemId: string, nextVal: any) => void;
}) {
  const step = 2;
  const [showSizePopover, setShowSizePopover] = useState(false);
  const [tempWidth, setTempWidth] = useState(20);
  const initialWidthRef = useRef<number>(20);
  const initialHeightRef = useRef<number>(20);
  const hasCommittedRef = useRef<boolean>(false);
  const elemId = layer.elemId;

  // 处理 Popover 打开/关闭
  const handleSizePopoverChange = (open: boolean) => {
    if (open) {
      // 先清除可能存在的 transform，确保获取真实的宽度
      clearTransform(elemId);

      // 从数据源获取当前宽度，而不是从 DOM（因为 DOM 可能被 transform 影响）
      const dataWidth = getImgWidth(elemId);
      const dataHeight = getImgHeight(elemId);

      const width = Math.max(20, dataWidth || 20);
      const height = Math.max(20, dataHeight || 20);

      setTempWidth(width);
      initialWidthRef.current = width;
      initialHeightRef.current = height;
      hasCommittedRef.current = false;
    } else {
      // 如果已提交，清除 transform（因为数据已更新，React 会重新渲染）
      clearTransform(elemId);
    }
    setShowSizePopover(open);
  };

  // 更新图片大小的函数（提交数据）
  const updateImageSize = (nextWidth: number) => {
    // 先清除 transform，因为我们要提交实际的大小
    clearTransform(elemId);
    initialWidthRef.current = nextWidth;
    initialHeightRef.current =
      getImgHeight(elemId) * (nextWidth / getImgWidth(elemId));

    const nextVal: any = {
      width: nextWidth,
      minWidth: nextWidth,
      layoutStyle: {
        ...layer.attrs?.layoutStyle,
        width: nextWidth,
      },
    };
    const aspectRatio = initialHeightRef.current / initialWidthRef.current || 1;
    const nextHeight = Math.max(20, nextWidth * aspectRatio);
    nextVal.height = nextHeight;
    nextVal.layoutStyle.height = nextHeight;
    onChange(elemId, nextVal);
    hasCommittedRef.current = true;
    onUpdate?.();
  };

  return (
    <Popover open={showSizePopover} onOpenChange={handleSizePopoverChange}>
      <PopoverTrigger asChild>
        {trigger || (
          <BtnLiteColumn>
            <div className='border_icon'>
              <ZoomIn size={16} />
            </div>
            <span>大小</span>
          </BtnLiteColumn>
        )}
      </PopoverTrigger>
      <PopoverContent
        side='top'
        className='p-0 shadow-none rounded-b-none md:w-fit w-screen md:rounded-lg md:shadow-lg md:border-none overflow-hidden'
      >
        <SizeSliderContainer>
          <SliderWrapper>
            <Slider
              min={32}
              max={375}
              step={step}
              size='lg'
              value={[tempWidth]}
              onValueChange={values => {
                const newWidth = values[0];
                setTempWidth(newWidth);
                // 实时更新DOM，但不提交数据
                updateDOMSize(elemId, newWidth, initialWidthRef.current);
                onUpdate?.();
              }}
              onValueCommit={values => {
                // 确认时提交数据
                updateImageSize(values[0]);
              }}
            />
            <SizeDisplay>{Math.round(tempWidth)}px</SizeDisplay>
          </SliderWrapper>
          <CheckIcon
            size={24}
            onClick={() => {
              // updateImageSize(tempWidth);
              setShowSizePopover(false);
            }}
          />
        </SizeSliderContainer>
      </PopoverContent>
    </Popover>
  );
}

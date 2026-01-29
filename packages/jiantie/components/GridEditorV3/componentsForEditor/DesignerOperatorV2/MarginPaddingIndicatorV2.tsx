import styled from '@emotion/styled';
import React, { useEffect, useRef, useState } from 'react';
import { GridState } from '../../utils';
import { stringValueTo4Chunk } from '../../utils/utils';

const MarginPaddingContainer = styled.div<{
  targetRect: {
    top: number;
    left: number;
    width: number;
    height: number;
  } | null;
}>`
  position: absolute;
  top: ${({ targetRect }) => (targetRect ? targetRect.top : 0)}px;
  left: ${({ targetRect }) => (targetRect ? targetRect.left : 0)}px;
  width: ${({ targetRect }) => (targetRect ? targetRect.width : 0)}px;
  height: ${({ targetRect }) => (targetRect ? targetRect.height : 0)}px;
  z-index: 1;
  pointer-events: none;
`;

const TransformIndicator = styled.div<{
  offsetX: number;
  offsetY: number;
  isVisible: boolean;
}>`
  position: absolute;
  top: ${({ offsetY }) => -offsetY}px;
  left: ${({ offsetX }) => -offsetX}px;
  width: 100%;
  height: 100%;
  border: 1px dashed #9c27b0;
  pointer-events: none;
  opacity: ${({ isVisible }) => (isVisible ? 1 : 0)};
  z-index: 18;
`;

const MarginIndicator = styled.div<{
  top: number;
  right: number;
  bottom: number;
  left: number;
  isVisible: boolean;
}>`
  position: absolute;
  top: ${({ top }) => -Math.max(0, top)}px;
  left: ${({ left }) => -Math.max(0, left)}px;
  right: ${({ right }) => -Math.max(0, right)}px;
  bottom: ${({ bottom }) => -Math.max(0, bottom)}px;
  border: 1px dashed #ff6b6b;
  pointer-events: none;
  opacity: ${({ isVisible }) => (isVisible ? 1 : 0)};
  z-index: 20;

  /* 为每个方向的边距添加独立的背景色 - 只显示正值 */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background:
      /* 上边距区域 */
      linear-gradient(
        to bottom,
        rgba(255, 107, 107, 0.15) 0%,
        rgba(255, 107, 107, 0.15) ${({ top }) => Math.max(0, top)}px,
        transparent ${({ top }) => Math.max(0, top)}px
      ),
      /* 右边距区域 */
        linear-gradient(
          to left,
          rgba(255, 107, 107, 0.15) 0%,
          rgba(255, 107, 107, 0.15) ${({ right }) => Math.max(0, right)}px,
          transparent ${({ right }) => Math.max(0, right)}px
        ),
      /* 下边距区域 */
        linear-gradient(
          to top,
          rgba(255, 107, 107, 0.15) 0%,
          rgba(255, 107, 107, 0.15) ${({ bottom }) => Math.max(0, bottom)}px,
          transparent ${({ bottom }) => Math.max(0, bottom)}px
        ),
      /* 左边距区域 */
        linear-gradient(
          to right,
          rgba(255, 107, 107, 0.15) 0%,
          rgba(255, 107, 107, 0.15) ${({ left }) => Math.max(0, left)}px,
          transparent ${({ left }) => Math.max(0, left)}px
        ),
      /* 微妙的点状图案 - 只对正值显示 */
        ${({ top, right, bottom, left }) =>
          Math.max(0, top) > 0 ||
          Math.max(0, right) > 0 ||
          Math.max(0, bottom) > 0 ||
          Math.max(0, left) > 0
            ? `radial-gradient(
                circle at 10px 10px,
                rgba(255, 107, 107, 0.1) 1px,
                transparent 1px
              )`
            : 'none'};
    background-size:
      100% 100%,
      100% 100%,
      100% 100%,
      100% 100%,
      20px 20px;
    pointer-events: none;
  }
`;

const PaddingIndicator = styled.div<{
  top: number;
  right: number;
  bottom: number;
  left: number;
  isVisible: boolean;
}>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border: 1px solid #4ecdc4;
  pointer-events: none;
  opacity: ${({ isVisible }) => (isVisible ? 1 : 0)};
  z-index: 25;

  /* 为每个方向的内边距添加独立的背景色 - 只显示边界区域 */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background:
      /* 上内边距区域 */
      linear-gradient(
        to bottom,
        rgba(78, 205, 196, 0.15) 0%,
        rgba(78, 205, 196, 0.15) ${({ top }) => top}px,
        transparent ${({ top }) => top}px
      ),
      /* 右内边距区域 */
        linear-gradient(
          to left,
          rgba(78, 205, 196, 0.15) 0%,
          rgba(78, 205, 196, 0.15) ${({ right }) => right}px,
          transparent ${({ right }) => right}px
        ),
      /* 下内边距区域 */
        linear-gradient(
          to top,
          rgba(78, 205, 196, 0.15) 0%,
          rgba(78, 205, 196, 0.15) ${({ bottom }) => bottom}px,
          transparent ${({ bottom }) => bottom}px
        ),
      /* 左内边距区域 */
        linear-gradient(
          to right,
          rgba(78, 205, 196, 0.15) 0%,
          rgba(78, 205, 196, 0.15) ${({ left }) => left}px,
          transparent ${({ left }) => left}px
        );
    background-size:
      100% 100%,
      100% 100%,
      100% 100%,
      100% 100%,
      10px 10px;
    pointer-events: none;
  }
`;

const AbsolutePositionIndicator = styled.div<{
  top: number;
  right: number;
  bottom: number;
  left: number;
  isVisible: boolean;
}>`
  position: absolute;
  top: ${({ top }) => -Math.max(0, top)}px;
  left: ${({ left }) => -Math.max(0, left)}px;
  right: ${({ right }) => -Math.max(0, right)}px;
  bottom: ${({ bottom }) => -Math.max(0, bottom)}px;
  pointer-events: none;
  opacity: ${({ isVisible }) => (isVisible ? 1 : 0)};
  z-index: 15;

  /* 移除背景色，改用箭头指示 */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
  }

  /* 添加定位点标记 */
  &::before {
    content: '';
    position: absolute;
    top: -8px;
    left: -8px;
    width: 16px;
    height: 16px;
    background: #9c27b0;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    pointer-events: none;
  }
`;

// 添加箭头指示器组件
const ArrowIndicator = styled.div<{
  direction: 'top' | 'left';
  value: number;
  isVisible: boolean;
}>`
  position: absolute;
  pointer-events: none;
  opacity: ${({ isVisible }) => (isVisible ? 1 : 0)};
  z-index: 16;

  ${({ direction, value }) => {
    if (value === 0) return 'display: none;';

    const arrowSize = 8;
    const arrowColor = '#9c27b0';

    switch (direction) {
      case 'top':
        return `
          top: 20px;
          left: ${value}px;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: ${arrowSize}px solid transparent;
          border-right: ${arrowSize}px solid transparent;
          border-bottom: ${arrowSize}px solid ${arrowColor};

          &::after {
            content: "";
            position: absolute;
            top: ${arrowSize}px;
            left: -1px;
            width: 2px;
            height: ${value - arrowSize}px;
            background: ${arrowColor};
          }
        `;
      case 'left':
        return `
          top: 50%;
          left: 20px;
          transform: translateY(-50%);
          width: 0;
          height: 0;
          border-top: ${arrowSize}px solid transparent;
          border-bottom: ${arrowSize}px solid transparent;
          border-right: ${arrowSize}px solid ${arrowColor};

          &::after {
            content: "";
            position: absolute;
            top: -1px;
            left: ${arrowSize}px;
            width: ${value - arrowSize}px;
            height: 2px;
            background: ${arrowColor};
          }
        `;
    }
  }}
`;

const ValueLabel = styled.div<{
  position: 'top' | 'right' | 'bottom' | 'left';
  type: 'margin' | 'padding' | 'absolute' | 'transform';
}>`
  position: absolute;
  font-size: 10px;
  font-weight: 500;
  text-align: center;
  pointer-events: none;
  z-index: 30;
  background-color: #fff;
  padding: 0 2px;
  border-radius: 2px;
  color: ${({ type }) => {
    switch (type) {
      case 'margin':
        return '#a21010';
      case 'padding':
        return '#05a127';
      case 'absolute':
        return '#9c27b0';
      case 'transform':
        return '#9c27b0';
      default:
        return '#333';
    }
  }};

  ${({ position, type }) => {
    switch (position) {
      case 'top':
        return `
          top: 0;
          left: 50%;
          transform: translateX(-50%);
        `;
      case 'right':
        return `
          top: 50%;
          right: 0;
          transform: translateY(-50%);
        `;
      case 'bottom':
        return `
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
        `;
      case 'left':
        return `
          top: 50%;
          left: 0;
          transform: translateY(-50%);
        `;
    }
  }}
`;

// 宽高标签组件 - 合并显示
const SizeLabel = styled.div`
  position: absolute;
  top: 50%;
  left: -60px;
  transform: translateY(-50%);
  font-size: 10px;
  font-weight: 500;
  text-align: center;
  pointer-events: none;
  z-index: 36;
  background-color: #fff;
  padding: 2px 4px;
  border-radius: 2px;
  color: #333;
  border: 1px solid #ccc;
  white-space: nowrap;
`;

interface MarginPaddingIndicatorProps {
  targetElement: HTMLElement | null;
  widgetState: GridState;
}

const MarginPaddingIndicatorV2: React.FC<MarginPaddingIndicatorProps> = ({
  targetElement,
  widgetState,
}) => {
  // 使用v2版本的新属性，替代已废弃的属性
  const { editingElemId, activeRowDepth } = widgetState;

  const [marginValues, setMarginValues] = useState<
    [number, number, number, number]
  >([0, 0, 0, 0]);
  const [paddingValues, setPaddingValues] = useState<
    [number, number, number, number]
  >([0, 0, 0, 0]);

  const [transformOffsets, setTransformOffsets] = useState<[number, number]>([
    0, 0,
  ]);

  const [showSettings, setShowSettings] = useState(false);

  const [targetRect, setTargetRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // 获取当前元素的样式
  const getElementStyle = () => {
    if (!targetElement) {
      return {
        margin: '',
        padding: '',
        position: '',
        top: '',
        right: '',
        bottom: '',
        left: '',
        transform: '',
      };
    }
    const targetElementParent = targetElement.parentElement;
    const computedStyle = window.getComputedStyle(targetElement);
    const parentComputedStyle = targetElementParent
      ? window.getComputedStyle(targetElementParent)
      : null;

    // 安全地解析定位值
    const parsePositionValue = (value: string | undefined) => {
      if (!value || value === 'auto') return '0';
      return value.replace('px', '');
    };

    const style = {
      margin: computedStyle.margin,
      padding: computedStyle.padding,
      position: parentComputedStyle?.position || '',
      top: parsePositionValue(parentComputedStyle?.top),
      right: parsePositionValue(parentComputedStyle?.right),
      bottom: parsePositionValue(parentComputedStyle?.bottom),
      left: parsePositionValue(parentComputedStyle?.left),
      transform: targetElement.style.transform || '',
    };

    return style;
  };

  // 更新样式值
  const updateStyleValues = () => {
    const style = getElementStyle();
    const marginChunks = stringValueTo4Chunk(style.margin) || [0, 0, 0, 0];
    const paddingChunks = stringValueTo4Chunk(style.padding) || [0, 0, 0, 0];

    // 检查是否为绝对定位
    const isAbsolute = style.position === 'absolute';

    // 获取绝对定位值
    let absoluteChunks: [number, number, number, number] = [0, 0, 0, 0];
    if (isAbsolute) {
      const top = parseInt(style.top) || 0;
      const right = parseInt(style.right) || 0;
      const bottom = parseInt(style.bottom) || 0;
      const left = parseInt(style.left) || 0;
      absoluteChunks = [top, right, bottom, left];
    }

    setMarginValues(marginChunks);
    setPaddingValues(paddingChunks);

    // 解析 transform: translate(...) 或 matrix(...)
    const transformStr = style.transform || '';
    let tx = 0;
    let ty = 0;
    const translateMatch = transformStr.match(/translate\(([^)]+)\)/);
    if (translateMatch) {
      const [txStr, tyStr = '0'] = translateMatch[1]
        .split(',')
        .map(s => s.trim());
      tx = parseFloat(txStr.replace('px', '')) || 0;
      ty = parseFloat(tyStr.replace('px', '')) || 0;
    } else {
      const matrixMatch = transformStr.match(/matrix\(([^)]+)\)/);
      if (matrixMatch) {
        const parts = matrixMatch[1].split(',').map(s => parseFloat(s.trim()));
        if (parts.length === 6) {
          tx = parts[4] || 0;
          ty = parts[5] || 0;
        }
      }
    }
    setTransformOffsets([tx, ty]);
  };

  // 计算目标元素的位置和尺寸
  const updateTargetRect = () => {
    if (!targetElement) {
      setTargetRect(null);
      return;
    }

    const rect = targetElement.getBoundingClientRect();
    const container = document.querySelector('#designer_canvas_container');
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const newTargetRect = {
        top: rect.top - containerRect.top,
        left: rect.left - containerRect.left,
        width: rect.width,
        height: rect.height,
      };
      setTargetRect(newTargetRect);
    }
  };

  // 监听元素变化
  useEffect(() => {
    if (!targetElement) return;

    updateStyleValues();
    updateTargetRect();

    // 监听样式变化
    const observer = new MutationObserver(() => {
      updateStyleValues();
      updateTargetRect();
    });

    observer.observe(targetElement, {
      attributes: true,
      attributeFilter: ['style'],
    });

    // 监听窗口大小变化
    const handleResize = () => {
      updateTargetRect();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [targetElement, editingElemId, activeRowDepth]); // 使用activeRowDepth替代废弃的属性

  // 监听 widgetState 变化，处理拖拽排序后的重新渲染
  useEffect(() => {
    if (targetElement) {
      // 延迟更新，确保 DOM 已经完成排序
      const timer = setTimeout(() => {
        updateStyleValues();
        updateTargetRect();
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [editingElemId, activeRowDepth]); // 使用activeRowDepth替代废弃的属性

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!targetElement) return;

      // Alt + S: 切换设置面板
      if (e.altKey && e.key === 's') {
        e.preventDefault();
        setShowSettings(!showSettings);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [targetElement, marginValues, paddingValues, showSettings]);

  // 检查是否应该显示指示器
  const shouldShowIndicator = () => {
    // 在v2版本中，只要有editingElemId或activeRowDepth就应该显示
    return targetElement && (editingElemId || activeRowDepth);
  };

  if (!shouldShowIndicator()) {
    return null;
  }

  return (
    <MarginPaddingContainer
      ref={containerRef}
      targetRect={targetRect}
      data-tip='MarginPaddingContainer'
    >
      {/* Transform 平移参考框（参考 margin 的虚线框实现）*/}
      {(transformOffsets[0] !== 0 || transformOffsets[1] !== 0) && (
        <TransformIndicator
          offsetX={transformOffsets[0]}
          offsetY={transformOffsets[1]}
          isVisible={true}
        >
          {/* 顶部和左侧显示平移数值 */}
          {transformOffsets[1] !== 0 && (
            <ValueLabel position='top' type='transform'>
              {transformOffsets[1]}
            </ValueLabel>
          )}
          {transformOffsets[0] !== 0 && (
            <ValueLabel position='left' type='transform'>
              {transformOffsets[0]}
            </ValueLabel>
          )}
        </TransformIndicator>
      )}

      {/* 外边距指示器 - 显示所有非零值 */}
      {marginValues.some(v => v !== 0) && (
        <MarginIndicator
          top={marginValues[0]}
          right={marginValues[1]}
          bottom={marginValues[2]}
          left={marginValues[3]}
          isVisible={true}
        >
          {/* 外边距数值标签 - 显示所有非零值 */}
          {marginValues[0] !== 0 && (
            <ValueLabel position='top' type='margin'>
              {marginValues[0]}
            </ValueLabel>
          )}
          {marginValues[1] !== 0 && (
            <ValueLabel position='right' type='margin'>
              {marginValues[1]}
            </ValueLabel>
          )}
          {marginValues[2] !== 0 && (
            <ValueLabel position='bottom' type='margin'>
              {marginValues[2]}
            </ValueLabel>
          )}
          {marginValues[3] !== 0 && (
            <ValueLabel position='left' type='margin'>
              {marginValues[3]}
            </ValueLabel>
          )}
        </MarginIndicator>
      )}

      {/* 内边距指示器 */}
      {paddingValues.some(v => v > 0) && (
        <PaddingIndicator
          top={paddingValues[0]}
          right={paddingValues[1]}
          bottom={paddingValues[2]}
          left={paddingValues[3]}
          isVisible={true}
        >
          {/* 内边距数值标签 */}
          {paddingValues[0] !== 0 && (
            <ValueLabel position='top' type='padding'>
              {paddingValues[0]}
            </ValueLabel>
          )}
          {paddingValues[1] !== 0 && (
            <ValueLabel position='right' type='padding'>
              {paddingValues[1]}
            </ValueLabel>
          )}
          {paddingValues[2] !== 0 && (
            <ValueLabel position='bottom' type='padding'>
              {paddingValues[2]}
            </ValueLabel>
          )}
          {paddingValues[3] !== 0 && (
            <ValueLabel position='left' type='padding'>
              {paddingValues[3]}
            </ValueLabel>
          )}
        </PaddingIndicator>
      )}

      {/* 宽高指示器 - 合并显示在元素左侧 */}
      {targetRect && (
        <SizeLabel>
          {Math.round(targetRect.width)}×{Math.round(targetRect.height)}
        </SizeLabel>
      )}
    </MarginPaddingContainer>
  );
};

export default MarginPaddingIndicatorV2;

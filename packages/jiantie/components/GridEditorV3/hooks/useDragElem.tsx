import { useEffect, useRef, useState } from 'react';
import { getScaleRate } from '../utils';
import { calculateIndicatorPosition } from '../utils/indicatorPosition';
import { PositionAttrs } from '../works-store/types';

// 计算实际位置
const calculateActualPosition = (
  position: PositionAttrs | null,
  scale: number
) => {
  if (!position) return position;

  const newPosition = { ...(position || {}) };

  // 转换所有位置值为实际值
  if (typeof newPosition.left === 'number') {
    newPosition.left *= scale;
  }
  if (typeof newPosition.right === 'number') {
    newPosition.right *= scale;
  }
  if (typeof newPosition.top === 'number') {
    newPosition.top *= scale;
  }
  if (typeof newPosition.bottom === 'number') {
    newPosition.bottom *= scale;
  }

  return newPosition;
};

// 计算实际位置
const calculateSubmitPosition = (
  position: PositionAttrs | null,
  scale: number
) => {
  if (!position) return position;

  const newPosition = { ...(position || {}) };

  // 转换所有位置值为实际值
  if (typeof newPosition.left === 'number') {
    newPosition.left /= scale;
  }
  if (typeof newPosition.right === 'number') {
    newPosition.right /= scale;
  }
  if (typeof newPosition.top === 'number') {
    newPosition.top /= scale;
  }
  if (typeof newPosition.bottom === 'number') {
    newPosition.bottom /= scale;
  }

  return newPosition;
};

const snap = (_val: number) => {
  const val = Math.round(_val);
  const step = 10;
  const tolerance = 1; // 与目标差值 ≤1 时吸附
  const remainder = ((val % step) + step) % step; // 处理负数
  if (remainder <= tolerance) return val - remainder; // 向下吸附
  if (step - remainder <= tolerance) return val + (step - remainder); // 向上吸附
  return val;
};

export const useDragElem = ({
  elemId,
  rowDepth,
  needResize,
  needSetStyle = true,
  isSelected = false,
  isAbsoluteElem = false,
  onMouseDown,
  onMouseMove,
  onMoveEnd,
  onScale,
}: {
  elemId: string;
  rowDepth: number[];
  needResize: boolean;
  needSetStyle?: boolean;
  isSelected?: boolean;
  isAbsoluteElem?: boolean;
  onMouseDown?: (e: MouseEvent) => void;
  onMouseMove?: (position: PositionAttrs) => void;
  onMoveEnd?: (position: PositionAttrs | null, elemId: string) => void;
  onScale?: (scale: { width: number; height: number }) => void;
}) => {
  if (!isAbsoluteElem) {
    return {
      isDragging: false,
      isScaling: false,
      setContainerRef: () => {},
      setIsDragging: () => {},
    };
  }

  const [isDragging, setIsDragging] = useState(false);
  const [isScaling, setIsScaling] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const currentPositionRef = useRef<PositionAttrs>(null);
  const containerRef = useRef<HTMLElement>(null);
  const parentRef = useRef<HTMLElement | null>(null);
  const scale = getScaleRate();
  const isTouchRef = useRef<boolean>(false);
  const isSelectedRef = useRef<boolean>(isSelected);
  const scaleStartRef = useRef({ width: 0, height: 0, x: 0, y: 0 });

  const setContainerRef = (
    dom: HTMLElement | null,
    position: PositionAttrs | null
  ) => {
    if (containerRef.current) {
      containerRef.current.removeEventListener('mousedown', handleMouseDown);
      containerRef.current.removeEventListener('touchstart', handleTouchStart);
    }
    containerRef.current = dom || null;
    // setCurrentPosition(position || {});
    currentPositionRef.current = position;
    if (containerRef.current) {
      containerRef.current.addEventListener('mousedown', handleMouseDown);
      containerRef.current.addEventListener('touchstart', handleTouchStart, {
        passive: false,
      });
    }
  };

  // 同步 isSelected 到 ref
  useEffect(() => {
    isSelectedRef.current = isSelected;
  }, [isSelected]);

  const handleMouseDown = (e: MouseEvent) => {
    if (isTouchRef.current) return; // 避免触摸和鼠标事件冲突
    if (!containerRef.current) return;
    if (!isSelectedRef.current) return; // 只有被选中的元素才能拖拽

    setIsDragging(true);
    const rect = containerRef.current?.getBoundingClientRect();
    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    // 获取父元素
    parentRef.current = containerRef.current?.parentElement || null;
    onMouseDown?.(e);
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (!containerRef.current) return;
    if (!isSelectedRef.current) return; // 只有被选中的元素才能拖拽
    e.preventDefault();
    e.stopPropagation();
    isTouchRef.current = true;
    setIsDragging(true);
    const touch = e.touches[0];
    // 获取父元素（必须在计算偏移之前）
    parentRef.current = containerRef.current?.parentElement || null;
    const rect = containerRef.current?.getBoundingClientRect();
    dragOffsetRef.current = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
    // 使用第一个触摸点的坐标创建类似 MouseEvent 的对象
    const syntheticEvent = {
      clientX: touch.clientX,
      clientY: touch.clientY,
    } as MouseEvent;
    onMouseDown?.(syntheticEvent);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging || !parentRef.current || !containerRef.current) return;

    const parentRect = parentRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    // 计算相对于父元素的新位置
    let newLeft = snap(clientX - parentRect.left - dragOffsetRef.current.x);
    let newTop = snap(clientY - parentRect.top - dragOffsetRef.current.y);

    // 允许超出容器边界，移除边界限制
    // const maxLeft = parentRect.width - containerRect.width;
    // const maxTop = parentRect.height - containerRect.height;

    // newLeft = Math.max(0, Math.min(newLeft, maxLeft));
    // newTop = Math.max(0, Math.min(newTop, maxTop));

    // 根据定位约束设置位置
    const newPosition: any = {};
    const positionConstraint =
      currentPositionRef.current?.constraint || 'left-top';
    switch (positionConstraint) {
      case 'left-top':
        newPosition.left = newLeft;
        newPosition.top = newTop;
        break;
      case 'right-top':
        newPosition.right = parentRect.width - (newLeft + containerRect.width);
        newPosition.top = newTop;
        break;
      case 'left-bottom':
        newPosition.left = newLeft;
        newPosition.bottom = snap(
          parentRect.height - (newTop + containerRect.height)
        );
        break;
      case 'right-bottom':
        newPosition.right = parentRect.width - (newLeft + containerRect.width);
        newPosition.bottom = snap(
          parentRect.height - (newTop + containerRect.height)
        );
        break;
      default:
        newPosition.left = newLeft;
        newPosition.top = newTop;
        break;
    }

    if (needSetStyle) {
      if (containerRef.current) {
        if (/top/.test(positionConstraint)) {
          Object.assign(containerRef.current.style, {
            left: newPosition.left + 'px',
            top: newPosition.top + 'px',
          });
        } else if (/bottom/.test(positionConstraint)) {
          Object.assign(containerRef.current.style, {
            left: newPosition.left + 'px',
            bottom: newPosition.bottom + 'px',
          });
        }
      }
    }

    // setCurrentPosition(newPosition);
    currentPositionRef.current = newPosition;
    onMouseMove?.(newPosition);

    // 更新高亮框位置（使用 requestAnimationFrame 确保 DOM 已更新）
    requestAnimationFrame(() => {
      updateIndicatorPosition();
    });
  };

  // 更新高亮框位置
  const updateIndicatorPosition = () => {
    if (!containerRef.current) return;
    // 查询高亮框元素（通过 data-active-id 属性查找）
    const indicatorElement = document.querySelector(
      `.elem_indicator[data-active-id="${elemId}"]`
    ) as HTMLElement;
    if (indicatorElement) {
      calculateIndicatorPosition(containerRef.current, indicatorElement, false);
      indicatorElement.style.visibility = 'visible';
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isTouchRef.current) return; // 避免触摸和鼠标事件冲突
    handleMove(e.clientX, e.clientY);
  };

  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (touch) {
      handleMove(touch.clientX, touch.clientY);
    }
  };

  const handleMouseUp = () => {
    if (isTouchRef.current) return; // 避免触摸和鼠标事件冲突
    setIsDragging(false);
    onMoveEnd?.(
      calculateSubmitPosition(currentPositionRef.current || {}, scale),
      elemId
    );
  };

  const handleTouchEnd = (e?: TouchEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setIsDragging(false);
    isTouchRef.current = false;
    onMoveEnd?.(
      calculateSubmitPosition(currentPositionRef.current || {}, scale),
      elemId
    );
  };

  // 缩放相关处理
  const handleScaleStart = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    if (!isSelectedRef.current) return;

    setIsScaling(true);
    const rect = containerRef.current.getBoundingClientRect();
    scaleStartRef.current = {
      width: rect.width,
      height: rect.height,
      x: clientX,
      y: clientY,
    };
  };

  const handleScaleMove = (clientX: number, clientY: number) => {
    if (!isScaling || !containerRef.current) return;

    const deltaX = clientX - scaleStartRef.current.x;
    const deltaY = clientY - scaleStartRef.current.y;

    const newWidth = Math.max(20, scaleStartRef.current.width + deltaX);
    const newHeight = Math.max(20, scaleStartRef.current.height + deltaY);

    if (onScale) {
      onScale({
        width: newWidth / scale,
        height: newHeight / scale,
      });
    }
  };

  const handleScaleEnd = () => {
    setIsScaling(false);
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleMouseMove(e);
      }
      if (isScaling) {
        handleScaleMove(e.clientX, e.clientY);
      }
    };

    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleMouseUp();
      }
      if (isScaling) {
        handleScaleEnd();
      }
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        handleTouchMove(e);
      }
      if (isScaling && e.touches[0]) {
        handleScaleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleGlobalTouchEnd = (e?: TouchEvent) => {
      if (isDragging) {
        handleTouchEnd(e);
      }
      if (isScaling) {
        handleScaleEnd();
      }
    };

    if (isDragging || isScaling) {
      window.addEventListener('mousemove', handleGlobalMouseMove, false);
      window.addEventListener('mouseup', handleGlobalMouseUp, false);
      window.addEventListener('touchmove', handleGlobalTouchMove, {
        passive: false,
      });
      window.addEventListener('touchend', handleGlobalTouchEnd, {
        passive: false,
      });
      window.addEventListener('touchcancel', handleGlobalTouchEnd, {
        passive: false,
      });
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove, false);
      window.removeEventListener('mouseup', handleGlobalMouseUp, false);
      window.removeEventListener('touchmove', handleGlobalTouchMove, false);
      window.removeEventListener('touchend', handleGlobalTouchEnd, false);
      window.removeEventListener('touchcancel', handleGlobalTouchEnd, false);
    };
  }, [isDragging, isScaling]);

  // 监听窗口大小变化
  // useEffect(() => {
  //   if (!needResize) return;
  //   const handleResize = () => {
  //     const newPosition = calculateActualPosition(
  //       currentPositionRef.current || {},
  //       scaba
  //     );
  //     // setCurrentPosition(newPosition);
  //     currentPositionRef.current = newPosition;
  //   };

  //   window.addEventListener('resize', handleResize);
  //   // 初始化时计算一次
  //   handleResize();

  //   return () => {
  //     window.removeEventListener('resize', handleResize);
  //   };
  // }, []);

  return {
    isDragging,
    isScaling,
    setContainerRef,
    setIsDragging,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleScaleStart,
  };
};

import { SeparatorHorizontal } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { BtnLite } from '../../components/style-comps';

const DragToChangeMarginBtn = ({
  Icon,
  valueX,
  valueY,
  onChange,
  onDragDone,
  onDragStart,
  label,
}: {
  Icon?: React.ReactNode;
  valueX: number | string;
  valueY: number | string;
  onChange: (valueX: number, valueY: number) => void;
  onDragDone: (valueX: number, valueY: number) => void;
  onDragStart: () => void;
  label?: string;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragValueRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number>(0);
  const startY = useRef<number>(0);
  const startValueX = useRef<number>(0);
  const startValueY = useRef<number>(0);
  const dragValueX = useRef<number>(0);
  const dragValueY = useRef<number>(0);
  const startedX = useRef<boolean>(false);
  const startedY = useRef<boolean>(false);
  const isTouchRef = useRef<boolean>(false);

  const handleStart = (clientX: number, clientY: number) => {
    onDragStart();
    setIsDragging(true);
    startX.current = clientX;
    startY.current = clientY;
    startValueX.current =
      typeof valueX === 'number' ? valueX : parseInt(String(valueX), 10) || 0;
    startValueY.current =
      typeof valueY === 'number' ? valueY : parseInt(String(valueY), 10) || 0;

    // 防止文本选择
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'move';
  };

  const handleMove = (clientX: number, clientY: number) => {
    const deltaX = clientX - startX.current;
    const deltaY = clientY - startY.current;
    // 灵敏度（px → 单位）
    const sensitivity = 1;
    const thresholdX = 20; // 横向启动阈值
    const thresholdY = 20; // 纵向启动阈值

    // 只有在尚未正式开始拖动时才应用阈值；一旦超过阈值视为开始，后续不再限制
    // 判断是否正式进入各自方向的拖动
    if (!startedX.current && Math.abs(deltaX) >= thresholdX) {
      startedX.current = true;
    }
    if (!startedY.current && Math.abs(deltaY) >= thresholdY) {
      startedY.current = true;
    }

    const changeAmountX = startedX.current
      ? Math.round(deltaX / sensitivity)
      : 0;
    const changeAmountY = startedY.current
      ? Math.round(deltaY / sensitivity)
      : 0;
    let newValueX = startValueX.current + changeAmountX;
    let newValueY = startValueY.current + changeAmountY;

    // 吸附到接近的 10 的倍数（含 0）
    const snap = (val: number) => {
      const step = 10;
      const tolerance = 2; // 与目标差值 ≤1 时吸附
      const remainder = ((val % step) + step) % step; // 处理负数
      if (remainder <= tolerance) return val - remainder; // 向下吸附
      if (step - remainder <= tolerance) return val + (step - remainder); // 向上吸附
      return val;
    };

    newValueX = snap(newValueX);
    newValueY = snap(newValueY);

    dragValueX.current = newValueX;
    dragValueY.current = newValueY;
    if (dragValueRef.current) {
      dragValueRef.current.innerText = `${newValueX}px, ${newValueY}px`;
    }
    onChange(newValueX, newValueY);
  };

  const handleEnd = () => {
    setIsDragging(false);
    startedX.current = false;
    startedY.current = false;
    isTouchRef.current = false;

    // 恢复默认样式
    document.body.style.userSelect = '';
    document.body.style.cursor = '';

    onDragDone(dragValueX.current, dragValueY.current);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isTouchRef.current) return; // 避免触摸和鼠标事件冲突
    e.preventDefault();
    e.stopPropagation();
    handleStart(e.clientX, e.clientY);

    // 添加全局事件监听器
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isTouchRef.current = true;
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);

    // 添加全局事件监听器
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isTouchRef.current) return; // 避免触摸和鼠标事件冲突
    e.preventDefault();
    handleMove(e.clientX, e.clientY);
  };

  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (touch) {
      handleMove(touch.clientX, touch.clientY);
    }
  };

  const handleMouseUp = (e: any) => {
    if (isTouchRef.current) return; // 避免触摸和鼠标事件冲突
    e.stopPropagation();
    e.preventDefault();

    // 移除全局事件监听器
    document.removeEventListener('mousemove', handleMouseMove, false);
    document.removeEventListener('mouseup', handleMouseUp, false);

    handleEnd();
  };

  const handleTouchEnd = (e: TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // 移除全局事件监听器
    document.removeEventListener('touchmove', handleTouchMove, false);
    document.removeEventListener('touchend', handleTouchEnd, false);

    // 直接使用已有的 dragValueX.current 和 dragValueY.current
    // 这些值已经在最后一次 touchmove 时更新过了，无需重新计算
    // 这样可以确保最终位置与拖动最后的放置点一致
    handleEnd();
  };

  return (
    <BtnLite
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      className='relative'
      style={{
        padding: '4px',
        cursor: isDragging ? 'move' : 'pointer',
        backgroundColor: isDragging ? '#f0f0f0' : undefined,
        userSelect: 'none',
        touchAction: 'none', // 防止移动端的默认触摸行为
      }}
    >
      {Icon || <SeparatorHorizontal size={20} />}
      <span className='text-sm'>{label || '外边距'}</span>
      {isDragging && (
        <span
          className='absolute top-0 left-[120%] bg-white px-2 rounded-md whitespace-nowrap'
          id='drag_value'
          ref={dragValueRef}
        >
          {valueX}px, {valueY}px
        </span>
      )}
    </BtnLite>
  );
};

export default DragToChangeMarginBtn;

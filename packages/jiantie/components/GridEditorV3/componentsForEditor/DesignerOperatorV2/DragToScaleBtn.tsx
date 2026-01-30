import React, { useRef, useState } from 'react';

const DragToScaleBtn = ({
  value,
  onChange,
  onDragDone,
  onDragStart,
}: {
  value: number;
  onChange: (value: number) => void;
  onDragDone: (value: number) => void;
  onDragStart: () => void;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragValueRef = useRef<HTMLSpanElement>(null);
  const startX = useRef<number>(0);
  const startY = useRef<number>(0);
  const startValue = useRef<number>(0);
  const dragValue = useRef<number>(0);
  const started = useRef<boolean>(false);
  const isTouchRef = useRef<boolean>(false);

  const handleStart = (clientX: number, clientY: number) => {
    onDragStart();
    setIsDragging(true);
    startX.current = clientX;
    startY.current = clientY;
    startValue.current = value || 100;

    // 防止文本选择
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'nwse-resize';
  };

  const handleMove = (clientX: number) => {
    // 计算水平移动距离（跟随水平移动来计算缩放）
    const deltaX = clientX - startX.current;

    // 灵敏度（px → 百分比）
    const sensitivity = 2; // 每2px增加1%
    const threshold = 10; // 启动阈值

    // 只有在尚未正式开始拖动时才应用阈值
    if (!started.current && Math.abs(deltaX) >= threshold) {
      started.current = true;
    }

    const changeAmount = started.current ? Math.round(deltaX / sensitivity) : 0;
    let newValue = Math.max(
      50,
      Math.min(500, startValue.current + changeAmount)
    ); // 限制在50%-500%之间

    // 吸附到接近的 5 的倍数
    const snap = (val: number) => {
      const step = 5;
      const tolerance = 2;
      const remainder = ((val % step) + step) % step;
      if (remainder <= tolerance) return val - remainder;
      if (step - remainder <= tolerance) return val + (step - remainder);
      return val;
    };

    newValue = snap(newValue);

    dragValue.current = newValue;
    if (dragValueRef.current) {
      dragValueRef.current.innerText = `${newValue}%`;
    }
    onChange(newValue);
  };

  const handleEnd = () => {
    setIsDragging(false);
    started.current = false;
    isTouchRef.current = false;

    // 恢复默认样式
    document.body.style.userSelect = '';
    document.body.style.cursor = '';

    onDragDone(dragValue.current);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isTouchRef.current) return;
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
    if (isTouchRef.current) return;
    e.preventDefault();
    handleMove(e.clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (touch) {
      handleMove(touch.clientX);
    }
  };

  const handleMouseUp = (e: any) => {
    if (isTouchRef.current) return;
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

    handleEnd();
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      className='w-5 h-5 flex items-center justify-center bg-white rounded-full border border-blue-500 shadow-md'
      style={{
        padding: '4px',
        cursor: isDragging ? 'nwse-resize' : 'pointer',
        backgroundColor: isDragging ? '#f0f0f0' : undefined,
        userSelect: 'none',
        touchAction: 'none',
      }}
    ></div>
  );
};

export default DragToScaleBtn;

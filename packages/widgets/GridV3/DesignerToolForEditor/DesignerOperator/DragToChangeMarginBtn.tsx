import React, { useState, useRef, useEffect } from 'react';
import { BtnLite } from '../../shared/style-comps';
import { SeparatorHorizontal, Move } from 'lucide-react';

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

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragStart();
    setIsDragging(true);
    startX.current = e.clientX;
    startY.current = e.clientY;
    startValueX.current =
      typeof valueX === 'number' ? valueX : parseInt(String(valueX), 10) || 0;
    startValueY.current =
      typeof valueY === 'number' ? valueY : parseInt(String(valueY), 10) || 0;

    // 添加全局事件监听器
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // 防止文本选择
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'move';
  };

  const handleMouseMove = (e: MouseEvent) => {
    const deltaX = e.clientX - startX.current;
    const deltaY = e.clientY - startY.current;
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

  const handleMouseUp = (e: any) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(false);
    startedX.current = false;
    startedY.current = false;

    // 移除全局事件监听器
    document.removeEventListener('mousemove', handleMouseMove, false);
    document.removeEventListener('mouseup', handleMouseUp, false);

    // 恢复默认样式
    document.body.style.userSelect = '';
    document.body.style.cursor = '';

    onDragDone(dragValueX.current, dragValueY.current);
  };

  return (
    <BtnLite
      onMouseDown={handleMouseDown}
      className='relative'
      style={{
        padding: '4px',
        cursor: isDragging ? 'move' : 'pointer',
        backgroundColor: isDragging ? '#f0f0f0' : undefined,
        userSelect: 'none',
      }}
    >
      {Icon || <SeparatorHorizontal size={16} />}
      <span className='text-xs'>{label || '外边距'}</span>
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

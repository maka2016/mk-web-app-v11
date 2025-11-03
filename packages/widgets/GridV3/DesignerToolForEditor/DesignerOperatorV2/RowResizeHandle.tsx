import React, { useState, useRef } from 'react';
import clas from 'classnames';

interface RowResizeHandleProps {
  rowId: string;
  monitorDOM?: HTMLElement | null; // 监听拖拽事件的DOM元素
  onResizeStart?: (rowDepth: string) => void;
  onResizeMove?: (rowDepth: string, width: number, percentage: number) => void;
  onResizeEnd?: (
    rowDepth: string,
    finalWidth: number,
    finalPercentage: number
  ) => void;
  minWidth?: number;
  maxWidth?: number; // 最大宽度限制
  usePercentage?: boolean; // 是否使用百分比模式
  className?: string;
  style?: React.CSSProperties;
}

const RowResizeHandle: React.FC<RowResizeHandleProps> = ({
  rowId,
  monitorDOM,
  onResizeStart,
  onResizeMove,
  onResizeEnd,
  minWidth = 10,
  maxWidth = 375,
  usePercentage = true,
  className = '',
  style = {},
}) => {
  const isResizing = useRef<boolean>(false);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);
  const hasMoved = useRef<boolean>(false); // 新增：标记是否真正移动了鼠标

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    isResizing.current = true;
    hasMoved.current = false; // 重置移动标记
    resizeStartX.current = e.clientX;

    // 调用外部回调
    onResizeStart?.(rowId);

    // 添加事件监听器到monitorDOM或window
    const targetDOM = monitorDOM || window;
    targetDOM.addEventListener('mousemove', handleMouseMove);
    targetDOM.addEventListener('mouseup', handleMouseUp);

    // 防止文本选择
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = (e: Event) => {
    if (!isResizing.current) return;

    // 类型断言为MouseEvent
    const mouseEvent = e as MouseEvent;
    const deltaX = mouseEvent.clientX - resizeStartX.current;

    // 只有当鼠标移动超过一定距离时才认为是真正的拖拽
    if (!hasMoved.current && Math.abs(deltaX) < 3) {
      return;
    }

    // 标记已经开始移动
    if (!hasMoved.current) {
      hasMoved.current = true;

      // 在真正开始拖拽时才获取当前行的宽度
      const rowDOM = document.querySelector(
        `#editor_row_${rowId}`
      ) as HTMLElement;
      if (rowDOM) {
        // 使用 getBoundingClientRect 获取更准确的宽度
        const rect = rowDOM.getBoundingClientRect();
        resizeStartWidth.current = rect.width;
      }
    }

    const newWidth = Math.max(
      minWidth,
      Math.min(maxWidth, resizeStartWidth.current + deltaX)
    );

    // 获取行DOM元素
    const rowDOM = document.querySelector(
      `#editor_row_${rowId}`
    ) as HTMLElement;

    if (rowDOM) {
      // 获取父容器
      const parentContainer = rowDOM.parentElement;
      let parentContainerWidth = window.innerWidth; // 默认值

      if (parentContainer) {
        // 使用 getBoundingClientRect 获取父容器的实际宽度
        const parentRect = parentContainer.getBoundingClientRect();
        parentContainerWidth = parentRect.width;
      }

      // 计算百分比 - 基于目标宽度和父容器的宽度
      const percentage =
        Math.round((newWidth / parentContainerWidth) * 100 * 100) / 100;

      // 实时更新DOM显示
      if (usePercentage) {
        rowDOM.style.width = `${percentage}%`;
      } else {
        rowDOM.style.width = `${newWidth}px`;
      }

      // 调用外部回调
      const rowDepth = rowDOM.dataset.rowDepth;
      if (rowDepth) {
        onResizeMove?.(rowDepth, newWidth, percentage);
      }
    }
  };

  const handleMouseUp = () => {
    if (!isResizing.current) return;

    // 如果没有真正移动，则不触发任何宽度变化
    if (!hasMoved.current) {
      isResizing.current = false;

      // 移除事件监听器
      const targetDOM = monitorDOM || window;
      targetDOM.removeEventListener('mousemove', handleMouseMove);
      targetDOM.removeEventListener('mouseup', handleMouseUp);

      // 恢复样式
      document.body.style.userSelect = '';
      return;
    }

    isResizing.current = false;

    // 获取当前行的DOM元素
    const rowDOM = document.querySelector(
      `#editor_row_${rowId}`
    ) as HTMLElement;

    if (rowDOM) {
      // 使用 getBoundingClientRect 获取当前实际宽度
      const rect = rowDOM.getBoundingClientRect();
      const actualPixelWidth = rect.width;

      // 获取父容器宽度
      const parentContainer = rowDOM.parentElement;
      let parentContainerWidth = window.innerWidth;

      if (parentContainer) {
        const parentRect = parentContainer.getBoundingClientRect();
        parentContainerWidth = parentRect.width;
      }

      // 计算最终百分比
      const finalPercentage =
        Math.round((actualPixelWidth / parentContainerWidth) * 100 * 100) / 100;

      // 获取行深度
      const rowDepth = rowDOM.dataset.rowDepth;
      if (rowDepth) {
        // 调用外部回调
        onResizeEnd?.(rowDepth, actualPixelWidth, finalPercentage);
      }
    }

    // 移除事件监听器
    const targetDOM = monitorDOM || window;
    targetDOM.removeEventListener('mousemove', handleMouseMove);
    targetDOM.removeEventListener('mouseup', handleMouseUp);

    // 恢复样式
    document.body.style.userSelect = '';
  };

  return (
    <div
      className={clas(
        `absolute -right-1 top-1/2 -translate-y-1/2 -translate-x-1/2`,
        `w-1 h-5 bg-blue-500 rounded-sm`,
        `cursor-ew-resize pointer-events-auto z-10`,
        `flex items-center justify-center`,
        `transition-all duration-200 ease-in-out`,
        `hover:bg-blue-600 hover:scale-110`,
        `active:bg-blue-700 active:scale-95`,
        className
      )}
      style={style}
      onMouseDown={handleMouseDown}
      title='拖拽调整行宽度'
    >
      <div className='w-0.5 h-3 rounded-sm' />
    </div>
  );
};

export default RowResizeHandle;

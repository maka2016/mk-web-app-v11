import React, { useState, useRef, useEffect, useCallback } from 'react';
import styled from '@emotion/styled';
import { useGridContext } from '../../comp/provider';

// 插入位置指示器
const InsertIndicator = styled.div<{
  position: 'top' | 'bottom' | null;
  themeColor?: string;
}>`
  position: absolute;
  left: 0;
  right: 0;
  height: 3px;
  background: ${({ themeColor }) => themeColor || '#fc39ae'};
  z-index: 9999;
  /* transition: all 0.2s ease; */
  opacity: ${({ position }) => (position ? 1 : 0)};

  ${({ position }) =>
    position === 'top' &&
    `
    top: -2px;
  `}

  ${({ position }) =>
    position === 'bottom' &&
    `
    bottom: -2px;
  `}
`;

// 内置的 option_handler 样式
const OptionHandler = styled.div<{
  isDragging: boolean;
  position?: 'left' | 'top';
  isActive?: boolean;
  themeColor?: string;
}>`
  user-select: none;
  position: absolute;
  border-radius: 2px;
  display: flex;
  width: fit-content;
  font-size: 10px;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  cursor: pointer;
  padding: 2px;
  // 扩大热区
  &::after {
    content: '';
    position: absolute;
    left: -4px;
    right: -4px;
    top: -4px;
    bottom: -4px;
  }
  opacity: ${({ isDragging, isActive }) => (isDragging ? 0.5 : 1)};
  cursor: ${({ isDragging }) => (isDragging ? 'grabbing' : 'grab')};
  top: ${({ position }) => (position === 'top' ? '0' : '4px')};
  left: 0;
  transform: ${({ position, isDragging }) => {
    return `
    ${isDragging ? 'scale(0.95)' : ''}
    ${position === 'top' ? 'translateY(-100%)' : 'translateX(-100%)'}`;
  }};
  transform-origin: center center;
  align-self: center;
  pointer-events: auto;
  padding: ${({ position }) => (position === 'top' ? '0 2px' : '0')};
  background: ${({ isActive, themeColor }) =>
    isActive ? themeColor || '#1a87ff' : '#fff'};
  color: ${({ isActive }) => (isActive ? '#fff' : '#000')};
`;

interface DragSortHandlerProps {
  type: 'grid' | 'cell' | 'element';
  targetId: string;
  // DOM查询规则
  domSelector: (id: string) => string;
  onSortEnd?: (payload: {
    dragId: string;
    actualTargetIndex: number;
    targetId: string;
    position: 'top' | 'bottom';
  }) => void;
  // 新增的 option_handler 相关属性
  optionHandlerText?: string;
  optionHandlerPosition?: 'left' | 'top';
  optionHandlerStyle?: React.CSSProperties;
  onOptionHandlerClick?: (e: React.MouseEvent) => void;
  isActive?: boolean;
  /** 主题色（用于自由元素时替换） */
  themeColor?: string;
}

interface DragState {
  isDragging: boolean;
  dragType: 'grid' | 'cell' | 'element' | null;
  dragId: string | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface InsertPosition {
  targetId: string;
  position: 'top' | 'bottom';
}

export const DragSortHandler: React.FC<DragSortHandlerProps> = ({
  type,
  targetId,
  domSelector,
  onSortEnd,
  isActive,
  optionHandlerText,
  optionHandlerPosition = 'left',
  optionHandlerStyle,
  onOptionHandlerClick,
  themeColor,
}) => {
  const { cellsMap, widgetState } = useGridContext();
  const { activeRowId, activeCellId, editingElemId } = widgetState;

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragType: null,
    dragId: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });

  const [insertPosition, setInsertPosition] = useState<InsertPosition | null>(
    null
  );
  const insertPositionRef = useRef<InsertPosition | null>(null);
  const dragPreviewRef = useRef<HTMLDivElement>(null);

  // 获取同类型的元素列表
  const getSiblingElements = useCallback(() => {
    switch (type) {
      case 'grid':
        return cellsMap.map((row, index) => ({
          id: row.id,
          index,
          element: row,
        }));

      case 'cell':
        if (!activeRowId) {
          console.error('没有activeRowId，无法获取Cell元素');
          return [];
        }
        const activeRow = cellsMap.find(row => row.id === activeRowId);
        if (!activeRow) {
          console.error('找不到activeRow:', activeRowId);
          return [];
        }
        return activeRow.cells.map((cell, index) => ({
          id: cell.id,
          index,
          element: cell,
        }));

      case 'element':
        if (!activeCellId) {
          console.error('没有activeCellId，无法获取Element元素');
          return [];
        }
        const activeCell = cellsMap
          .find(row => row.id === activeRowId)
          ?.cells.find(cell => cell.id === activeCellId);
        if (!activeCell?.childrenIds) {
          console.error('找不到activeCell或没有childrenIds:', {
            activeRowId,
            activeCellId,
            activeCell: !!activeCell,
            childrenIds: activeCell?.childrenIds,
          });
          return [];
        }
        return activeCell.childrenIds
          .filter(elemId => elemId && elemId.trim() !== '')
          .map((elemId, index) => ({
            id: elemId,
            index,
            element: elemId,
          }));

      default:
        console.error('未知类型:', type);
        return [];
    }
  }, [type, cellsMap, activeRowId, activeCellId]);

  // 处理拖拽开始
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();

    // 立即设置拖拽状态
    const newDragState = {
      isDragging: true,
      dragType: type,
      dragId: targetId,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
    };

    setDragState(newDragState);

    // 显示拖拽预览
    if (dragPreviewRef.current) {
      dragPreviewRef.current.style.display = 'block';
    }
  };

  // 处理拖拽移动
  const handleMouseMove = (e: MouseEvent) => {
    // 简单更新拖拽状态
    setDragState(prev => ({
      ...prev,
      currentX: e.clientX,
      currentY: e.clientY,
    }));

    // 更新拖拽预览位置
    if (dragPreviewRef.current) {
      dragPreviewRef.current.style.left = `${e.clientX}px`;
      dragPreviewRef.current.style.top = `${e.clientY}px`;
    }

    // 检测插入位置
    const siblingElements = getSiblingElements();
    let newInsertPosition: InsertPosition | null = null;

    for (const { id } of siblingElements) {
      if (id === dragState.dragId) continue;

      // 使用传入的DOM查询规则
      const selector = domSelector(id);
      const element = document.querySelector(selector);

      if (!element) continue;

      const rect = element.getBoundingClientRect();
      const isOver =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      if (isOver) {
        // 判断插入位置（上方或下方）
        const elementCenterY = rect.top + rect.height / 2;
        const position = e.clientY < elementCenterY ? 'top' : 'bottom';

        newInsertPosition = {
          targetId: id,
          position,
        };
        break;
      }
    }

    setInsertPosition(newInsertPosition);
    insertPositionRef.current = newInsertPosition;
  };

  // 处理拖拽结束
  const handleMouseUp = () => {
    // 获取当前状态用于排序
    const currentDragState = dragState;
    const currentInsertPosition = insertPositionRef.current;

    if (currentDragState.isDragging && currentInsertPosition) {
      const siblingElements = getSiblingElements();
      const dragIndex = siblingElements.findIndex(
        item => item.id === currentDragState.dragId
      );
      const targetIndex = siblingElements.findIndex(
        item => item.id === currentInsertPosition.targetId
      );

      if (dragIndex !== -1 && targetIndex !== -1 && dragIndex !== targetIndex) {
        // 计算实际的目标位置
        let actualTargetIndex = targetIndex;
        if (
          dragIndex > targetIndex &&
          currentInsertPosition.position === 'bottom'
        ) {
          // 插入到目标元素下方，实际位置是目标元素的下一个位置
          // 例如：e1 移到 e2 下方，应该插入到 e2 和 e3 之间，即 e3 的位置
          actualTargetIndex = targetIndex + 1;
        }
        if (
          dragIndex < targetIndex &&
          currentInsertPosition.position === 'top'
        ) {
          // 插入到目标元素下方，实际位置是目标元素的下一个位置
          // 例如：e1 移到 e2 下方，应该插入到 e2 和 e3 之间，即 e3 的位置
          actualTargetIndex = targetIndex - 1;
        }
        console.log('handleMouseUp', {
          dragIndex,
          actualTargetIndex,
          currentDragState,
          currentInsertPosition,
        });

        // 检查是否需要移动
        if (dragIndex === actualTargetIndex) {
          // 位置相同，无需移动
        } else {
          // 对于所有类型，都直接移动到目标位置
          // switch (currentDragState.dragType) {
          //   case "grid":
          //     console.log("first", currentDragState.dragId, actualTargetIndex);
          //     moveRowByIndex(currentDragState.dragId!, actualTargetIndex);
          //     break;
          //   case "cell":
          //     moveCellByIndex(currentDragState.dragId!, actualTargetIndex);
          //     break;
          //   case "element":
          //     moveElemByIndex(currentDragState.dragId!, actualTargetIndex);
          //     break;
          // }
          onSortEnd?.({
            dragId: currentDragState.dragId!,
            actualTargetIndex,
            targetId: currentInsertPosition.targetId,
            position: currentInsertPosition.position,
          });
        }
      }
    }

    // 强制清理状态，不管当前状态如何
    setDragState({
      isDragging: false,
      dragType: null,
      dragId: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    });

    setInsertPosition(null);
    insertPositionRef.current = null;

    if (dragPreviewRef.current) {
      dragPreviewRef.current.style.display = 'none';
    }
  };

  // 添加全局事件监听
  useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState.isDragging]);

  // 获取默认的 option_handler 文本
  const getDefaultOptionHandlerText = () => {
    if (optionHandlerText) return optionHandlerText;
    switch (type) {
      case 'grid':
        return 'Grid';
      case 'cell':
        return 'Cell';
      case 'element':
        return 'Elem';
      default:
        return '';
    }
  };

  // 处理 option_handler 点击
  const handleOptionHandlerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOptionHandlerClick?.(e);
  };

  return (
    <>
      <OptionHandler
        isDragging={dragState.isDragging}
        isActive={isActive}
        position={optionHandlerPosition}
        themeColor={themeColor}
        onMouseDown={handleMouseDown}
        onClick={handleOptionHandlerClick}
        className='option_handler'
        style={optionHandlerStyle}
      >
        <span>{getDefaultOptionHandlerText()}</span>
      </OptionHandler>

      {/* 插入位置指示器 */}
      {insertPosition &&
        (() => {
          const selector = domSelector(insertPosition.targetId);
          const targetElement = document.querySelector(selector);
          if (!targetElement) {
            console.log('❌ 插入指示器找不到目标元素:', {
              targetId: insertPosition.targetId,
              selector,
            });
            return null;
          }

          const rect = targetElement.getBoundingClientRect();

          return (
            <InsertIndicator
              position={insertPosition.position}
              style={{
                position: 'fixed',
                top:
                  insertPosition.position === 'top'
                    ? rect.top - 2
                    : rect.bottom,
                left: rect.left,
                width: rect.width,
                zIndex: 10001,
              }}
              themeColor={themeColor}
            />
          );
        })()}
    </>
  );
};

export default DragSortHandler;

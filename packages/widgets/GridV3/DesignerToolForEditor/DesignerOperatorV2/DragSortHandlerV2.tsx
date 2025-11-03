import React, { useState, useRef, useEffect, useCallback } from 'react';
import styled from '@emotion/styled';
import { useGridContext } from '../../comp/provider';

/**
 * DragSortHandlerV2 - 拖拽排序处理器 v2 版本
 *
 * 适配新的 v2 数据结构，支持无限嵌套的 Row 结构：
 * - 移除了 cell 概念，改为无限嵌套的 Row
 * - 使用 gridsData 替代 cellsMap
 * - 使用 activeRowDepth 替代 activeRowId 和 activeCellId
 *
 * 主要功能：
 * 1. Row 拖拽：只能在同一级内进行排序
 * 2. Element 拖拽：可以跨 Row 放入
 *
 * 使用示例：
 *
 * // Row 拖拽排序
 * <DragSortHandlerV2
 *   type="row"
 *   targetId={rowId}
 *   currentRowDepth={[0, 1]} // 当前行的深度路径
 *   domSelector={(id) => `#editor_row_${id}`}
 *   onSortEnd={(payload) => {
 *     console.log('拖拽到位置:', payload.actualTargetIndex);
 *     console.log('目标行深度:', payload.targetRowDepth);
 *   }}
 * />
 *
 * // Element 跨行拖拽
 * <DragSortHandlerV2
 *   type="element"
 *   targetId={elemId}
 *   currentRowDepth={[0, 1]} // 当前元素所在行的深度路径
 *   domSelector={(id) => `#layer_root_${id}`}
 *   onSortEnd={(payload) => {
 *     console.log('拖拽到行:', payload.targetRowDepth);
 *     // 实现跨行拖拽逻辑
 *   }}
 * />
 */

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
  position?: 'left-top' | 'top-left' | 'left-bottom' | 'bottom-left';
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
  box-shadow: 0 0 2px 1px rgba(0, 0, 0, 0.1);

  /* 位置样式 */
  ${({ position }) => {
    switch (position) {
      case 'left-top':
        return `
          left: 0;
          top: 0;
          transform: translateY(-100%);
        `;
      case 'top-left':
        return `
          top: 0;
          left: 0;
          transform: translateX(-100%);
        `;
      case 'left-bottom':
        return `
          left: 0;
          bottom: 0;
          transform: translateY(100%);
        `;
      case 'bottom-left':
        return `
          bottom: 0;
          left: 0;
          transform: translateX(-100%);
        `;
      default:
        return `
          left: 0;
          top: 0;
          transform: translateX(-100%);
        `;
    }
  }}

  transform-origin: center center;
  align-self: center;
  pointer-events: auto;
  padding: 2px;
  background: ${({ isActive, themeColor }) =>
    isActive ? themeColor || '#1a87ff' : '#fff'};
  color: ${({ isActive }) => (isActive ? '#fff' : '#000')};
`;

interface DragSortHandlerProps {
  type: 'row' | 'element';
  targetId: string;
  // DOM查询规则
  domSelector: (id: string) => string;
  onSortEnd?: (payload: {
    dragId: string;
    actualTargetIndex: number;
    targetId: string;
    position: 'top' | 'bottom';
    targetRowDepth?: number[];
  }) => void;
  // 新增的 option_handler 相关属性
  optionHandlerText?: string;
  optionHandlerPosition?:
    | 'left-top'
    | 'top-left'
    | 'left-bottom'
    | 'bottom-left';
  optionHandlerStyle?: React.CSSProperties;
  onOptionHandlerClick?: (e: React.MouseEvent) => void;
  isActive?: boolean;
  /** 主题色（用于自由元素时替换） */
  themeColor?: string;
  /** 当前行的深度路径，用于确定拖拽目标 */
  currentRowDepth?: number[];
  handlerText?: string;
}

interface DragState {
  isDragging: boolean;
  dragType: 'row' | 'element' | null;
  dragId: string | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface InsertPosition {
  targetId: string;
  position: 'top' | 'bottom';
  targetRowDepth?: number[];
}

const DragSortHandlerV2: React.FC<DragSortHandlerProps> = ({
  type,
  handlerText,
  targetId,
  domSelector,
  onSortEnd,
  isActive,
  optionHandlerText,
  optionHandlerPosition = 'left-top',
  optionHandlerStyle,
  onOptionHandlerClick,
  themeColor,
  currentRowDepth,
}) => {
  const { gridsData } = useGridContext();

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

  // 递归获取所有行，用于跨行拖拽
  const getAllRows = useCallback(
    (
      rows: any[],
      depth: number[] = []
    ): Array<{ id: string; depth: number[]; element: any }> => {
      const result: Array<{ id: string; depth: number[]; element: any }> = [];

      rows.forEach((row: any, index: number) => {
        const currentDepth = [...depth, index];
        result.push({
          id: row.id,
          depth: currentDepth,
          element: row,
        });

        // 递归处理子行
        if (row.children && Array.isArray(row.children)) {
          result.push(...getAllRows(row.children, currentDepth));
        }
      });

      return result;
    },
    []
  );

  // 获取同级的行列表（用于行拖拽排序）
  const getSiblingRows = useCallback(
    (parentDepth: number[] = []) => {
      if (parentDepth.length === 0) {
        // 根级别
        return gridsData.map((row: any, index: number) => ({
          id: row.id,
          index,
          element: row,
          depth: [index],
        }));
      }

      // 获取父行
      const parentRow = getRowByDepth(parentDepth);
      if (!parentRow?.children) {
        return [];
      }

      return parentRow.children.map((row: any, index: number) => ({
        id: row.id,
        index,
        element: row,
        depth: [...parentDepth, index],
      }));
    },
    [gridsData]
  );

  // 根据深度路径获取行
  const getRowByDepth = useCallback(
    (depth: number[]) => {
      if (!depth || depth.length === 0) {
        return undefined;
      }

      let current: any = gridsData;
      for (let i = 0; i < depth.length; i++) {
        const index = depth[i];
        if (!current || !current[index]) {
          return undefined;
        }
        current = current[index];
      }
      return current;
    },
    [gridsData]
  );

  // 获取同类型的元素列表
  const getSiblingElements = useCallback(() => {
    switch (type) {
      case 'row':
        // 获取当前行的父级深度
        const parentDepth = currentRowDepth?.slice(0, -1) || [];
        return getSiblingRows(parentDepth);

      case 'element':
        // 获取当前行下的所有元素
        if (!currentRowDepth) {
          console.error('没有currentRowDepth，无法获取Element元素');
          return [];
        }
        const currentRow = getRowByDepth(currentRowDepth);
        if (!currentRow?.childrenIds) {
          console.error('找不到当前行或没有childrenIds:', {
            currentRowDepth,
            currentRow: !!currentRow,
            childrenIds: currentRow?.childrenIds,
          });
          return [];
        }
        return currentRow.childrenIds
          .filter((elemId: string) => elemId && elemId.trim() !== '')
          .map((elemId: string, index: number) => ({
            id: elemId,
            index,
            element: elemId,
          }));

      default:
        console.error('未知类型:', type);
        return [];
    }
  }, [type, currentRowDepth, getSiblingRows, getRowByDepth]);

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
    let newInsertPosition: InsertPosition | null = null;

    if (type === 'row') {
      // 行拖拽：只能在同一级内排序
      const siblingRows = getSiblingElements();

      for (const { id, depth } of siblingRows) {
        if (id === dragState.dragId) continue;

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
          const elementCenterY = rect.top + rect.height / 2;
          const position = e.clientY < elementCenterY ? 'top' : 'bottom';

          newInsertPosition = {
            targetId: id,
            position,
            targetRowDepth: depth,
          };
          break;
        }
      }
    } else if (type === 'element') {
      // 元素拖拽：可以跨行放入
      const allRows = getAllRows(gridsData);

      for (const { id, depth } of allRows) {
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
          const elementCenterY = rect.top + rect.height / 2;
          const position = e.clientY < elementCenterY ? 'top' : 'bottom';

          newInsertPosition = {
            targetId: id,
            position,
            targetRowDepth: depth,
          };
          break;
        }
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
        (item: any) => item.id === currentDragState.dragId
      );
      const targetIndex = siblingElements.findIndex(
        (item: any) => item.id === currentInsertPosition.targetId
      );

      if (dragIndex !== -1 && targetIndex !== -1 && dragIndex !== targetIndex) {
        // 计算实际的目标位置
        let actualTargetIndex = targetIndex;
        if (
          dragIndex > targetIndex &&
          currentInsertPosition.position === 'bottom'
        ) {
          actualTargetIndex = targetIndex + 1;
        }
        if (
          dragIndex < targetIndex &&
          currentInsertPosition.position === 'top'
        ) {
          actualTargetIndex = targetIndex - 1;
        }

        console.log('handleMouseUp', {
          dragIndex,
          actualTargetIndex,
          currentDragState,
          currentInsertPosition,
        });

        // 检查是否需要移动
        if (dragIndex !== actualTargetIndex) {
          onSortEnd?.({
            dragId: currentDragState.dragId!,
            actualTargetIndex,
            targetId: currentInsertPosition.targetId,
            position: currentInsertPosition.position,
            targetRowDepth: currentInsertPosition.targetRowDepth,
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
      case 'row':
        return 'Row';
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
        <span>{handlerText || getDefaultOptionHandlerText()}</span>
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

export default DragSortHandlerV2;

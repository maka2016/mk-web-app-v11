import styled from '@emotion/styled';
import { ChevronDown, ChevronUp, GripHorizontal } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

const SplitViewRoot = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  position: relative;
`;

const PaneContainer = styled.div<{ isCollapsed?: boolean }>`
  overflow: ${props => (props.isCollapsed ? 'hidden' : 'auto')};
  display: ${props => (props.isCollapsed ? 'none' : 'flex')};
  flex-direction: column;
  background-color: #fff;
`;

const ResizeHandle = styled.div<{ isDragging?: boolean }>`
  height: 4px;
  background-color: transparent;
  cursor: row-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
  user-select: none;
  transition: background-color 0.1s ease;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background-color: #e5e7eb;
    transform: translateY(-50%);
  }

  &:hover {
    background-color: rgba(59, 130, 246, 0.1);

    &::before {
      background-color: #3b82f6;
      height: 2px;
    }

    .handle-icon {
      opacity: 1;
    }
  }

  ${props =>
    props.isDragging &&
    `
    background-color: rgba(59, 130, 246, 0.15);

    &::before {
      background-color: #3b82f6;
      height: 2px;
    }
  `}

  .handle-icon {
    position: absolute;
    color: #9ca3af;
    opacity: 0;
    transition: opacity 0.15s ease;
    pointer-events: none;
    background-color: #fff;
    padding: 0 4px;
    z-index: 1;
  }
`;

const CollapsedHeader = styled.div`
  height: 24px;
  background-color: #f9fafb;
  border-top: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #6b7280;
  user-select: none;
  transition: all 0.15s ease;

  &:hover {
    background-color: #f3f4f6;
    color: #374151;
    border-color: #d1d5db;

    .expand-icon {
      color: #3b82f6;
    }
  }

  .expand-icon {
    transition: color 0.15s ease;
  }

  .header-text {
    font-weight: 500;
    margin: 0 8px;
  }
`;

interface SplitViewProps {
  topChildren: React.ReactNode;
  bottomChildren: React.ReactNode;
  topTitle?: string; // 上方面板标题
  bottomTitle?: string; // 下方面板标题
  defaultTopHeight?: number;
  minTopHeight?: number;
  minBottomHeight?: number;
  onHeightChange?: (topHeight: number, bottomHeight: number) => void;
  storageKey?: string; // 用于localStorage存储位置
}

interface StorageState {
  topHeight: number;
  topCollapsed: boolean;
  bottomCollapsed: boolean;
  beforeCollapseHeight: number;
}

export const SplitView: React.FC<SplitViewProps> = ({
  topChildren,
  bottomChildren,
  topTitle = '上方面板',
  bottomTitle = '下方面板',
  defaultTopHeight = 60,
  minTopHeight = 100,
  minBottomHeight = 100,
  onHeightChange,
  storageKey = 'splitview-height',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 从 localStorage 读取保存的状态
  const loadStorageState = (): StorageState => {
    const defaultState: StorageState = {
      topHeight: defaultTopHeight,
      topCollapsed: false,
      bottomCollapsed: false,
      beforeCollapseHeight: defaultTopHeight,
    };

    if (!storageKey) return defaultState;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<StorageState>;
        return {
          topHeight: parsed.topHeight ?? defaultTopHeight,
          topCollapsed: parsed.topCollapsed ?? false,
          bottomCollapsed: parsed.bottomCollapsed ?? false,
          beforeCollapseHeight: parsed.beforeCollapseHeight ?? defaultTopHeight,
        };
      }
    } catch (error) {
      console.warn('Failed to load SplitView state from localStorage:', error);
    }

    return defaultState;
  };

  const initialState = loadStorageState();

  const [topHeight, setTopHeight] = useState<number>(initialState.topHeight);
  const [topCollapsed, setTopCollapsed] = useState(initialState.topCollapsed);
  const [bottomCollapsed, setBottomCollapsed] = useState(
    initialState.bottomCollapsed
  );
  const [beforeCollapseHeight, setBeforeCollapseHeight] = useState(
    initialState.beforeCollapseHeight
  );

  // 保存状态到 localStorage
  useEffect(() => {
    if (!storageKey) return;

    try {
      const state: StorageState = {
        topHeight,
        topCollapsed,
        bottomCollapsed,
        beforeCollapseHeight,
      };
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save SplitView state to localStorage:', error);
    }
  }, [
    topHeight,
    topCollapsed,
    bottomCollapsed,
    beforeCollapseHeight,
    storageKey,
  ]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // 只响应左键点击
    if (e.button !== 0) return;
    setIsDragging(true);
  }, []);

  const handleDoubleClick = useCallback(() => {
    // 双击切换折叠状态，优先收起下方
    if (!topCollapsed && !bottomCollapsed) {
      setBeforeCollapseHeight(topHeight);
      setBottomCollapsed(true);
    } else if (bottomCollapsed) {
      setBottomCollapsed(false);
    } else if (topCollapsed) {
      setTopCollapsed(false);
    }
  }, [topCollapsed, bottomCollapsed, topHeight]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const containerHeight = containerRect.height;

      // 计算鼠标相对于容器顶部的位置
      const mouseY = e.clientY - containerRect.top;

      // 计算百分比
      let newTopHeightPercent = (mouseY / containerHeight) * 100;

      // 根据最小高度限制百分比
      const minTopPercent = (minTopHeight / containerHeight) * 100;
      const minBottomPercent = (minBottomHeight / containerHeight) * 100;
      const maxTopPercent = 100 - minBottomPercent;

      newTopHeightPercent = Math.max(
        minTopPercent,
        Math.min(maxTopPercent, newTopHeightPercent)
      );

      // 拖动到边缘自动收起（距离边缘小于 30px）
      const edgeThreshold = 30;
      if (mouseY < edgeThreshold) {
        // 接近顶部，收起上方
        setBeforeCollapseHeight(topHeight);
        setTopCollapsed(true);
        setIsDragging(false);
        return;
      } else if (containerHeight - mouseY < edgeThreshold) {
        // 接近底部，收起下方
        setBeforeCollapseHeight(topHeight);
        setBottomCollapsed(true);
        setIsDragging(false);
        return;
      }

      setTopHeight(newTopHeightPercent);

      // 通知父组件高度变化
      if (onHeightChange) {
        onHeightChange(newTopHeightPercent, 100 - newTopHeightPercent);
      }
    },
    [isDragging, minTopHeight, minBottomHeight, onHeightChange, topHeight]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const expandTop = useCallback(() => {
    setTopCollapsed(false);
    if (bottomCollapsed) {
      setBottomCollapsed(false);
    }
    // 恢复之前的高度
    if (beforeCollapseHeight !== topHeight) {
      setTopHeight(beforeCollapseHeight);
    }
  }, [bottomCollapsed, beforeCollapseHeight, topHeight]);

  const expandBottom = useCallback(() => {
    setBottomCollapsed(false);
    if (topCollapsed) {
      setTopCollapsed(false);
    }
    // 恢复之前的高度
    if (beforeCollapseHeight !== topHeight) {
      setTopHeight(beforeCollapseHeight);
    }
  }, [topCollapsed, beforeCollapseHeight, topHeight]);

  const getTopHeight = () => {
    if (topCollapsed) return 0;
    if (bottomCollapsed) return 100;
    return topHeight;
  };

  const getBottomHeight = () => {
    if (bottomCollapsed) return 0;
    if (topCollapsed) return 100;
    return 100 - topHeight;
  };

  return (
    <SplitViewRoot ref={containerRef}>
      {/* 顶部面板 */}
      <PaneContainer
        isCollapsed={topCollapsed}
        style={{ height: `${getTopHeight()}%` }}
      >
        {topChildren}
      </PaneContainer>

      {/* 分隔条 */}
      {!topCollapsed && !bottomCollapsed && (
        <ResizeHandle
          isDragging={isDragging}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          title='拖动调整高度，双击收起下方面板'
        >
          <GripHorizontal className='handle-icon' size={14} />
        </ResizeHandle>
      )}

      {/* 折叠的头部（当顶部折叠时） */}
      {topCollapsed && (
        <CollapsedHeader onClick={expandTop} title='点击展开'>
          <ChevronDown className='expand-icon' size={14} />
          <span className='header-text'>{topTitle}</span>
        </CollapsedHeader>
      )}

      {/* 底部面板 */}
      <PaneContainer
        isCollapsed={bottomCollapsed}
        style={{ height: `${getBottomHeight()}%` }}
      >
        {bottomChildren}
      </PaneContainer>

      {/* 折叠的头部（当底部折叠时） */}
      {bottomCollapsed && (
        <CollapsedHeader onClick={expandBottom} title='点击展开'>
          <ChevronUp className='expand-icon' size={14} />
          <span className='header-text'>{bottomTitle}</span>
        </CollapsedHeader>
      )}
    </SplitViewRoot>
  );
};

export default SplitView;

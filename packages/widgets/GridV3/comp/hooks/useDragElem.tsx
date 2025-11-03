import { getPermissionData } from '@mk/services';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getScaleRate } from '../../shared/styleHelper';
import { useGridContext } from '../provider';

type PositionConstraint =
  | 'left-top'
  | 'right-top'
  | 'left-bottom'
  | 'right-bottom';

export interface PositionAttrs {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  constraint?: PositionConstraint;
  relativeTo?: 'parent' | 'block';
}

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
  onMouseDown,
  onMouseMove,
  onMoveEnd,
}: {
  elemId: string;
  rowDepth: number[];
  needResize: boolean;
  needSetStyle?: boolean;
  onMouseDown: (e: MouseEvent) => void;
  onMouseMove: (position: PositionAttrs) => void;
  onMoveEnd: (position: PositionAttrs | null, elemId: string) => void;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const currentPositionRef = useRef<PositionAttrs | null>(null);
  const containerRef = useRef<HTMLElement>(null);
  const positionConstraint =
    currentPositionRef.current?.constraint || 'left-top';
  const parentRef = useRef<HTMLElement | null>(null);
  const scale = getScaleRate();

  const setContainerRef = (
    dom: HTMLElement | null,
    position: PositionAttrs | null
  ) => {
    if (containerRef.current) {
      containerRef.current.removeEventListener('mousedown', handleMouseDown);
    }
    containerRef.current = dom || null;
    // setCurrentPosition(position || {});
    currentPositionRef.current = position;
    if (containerRef.current) {
      containerRef.current.addEventListener('mousedown', handleMouseDown);
    }
  };

  const handleMouseDown = (e: MouseEvent) => {
    if (!containerRef.current) return;

    setIsDragging(true);
    const rect = containerRef.current?.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    // 获取父元素
    parentRef.current = containerRef.current?.parentElement || null;
    onMouseDown?.(e);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!getPermissionData().materialProduct) {
      return;
    }
    if (!isDragging || !parentRef.current || !containerRef.current) return;

    const parentRect = parentRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    // 计算相对于父元素的新位置
    let newLeft = snap(e.clientX - parentRect.left - dragOffset.x);
    let newTop = snap(e.clientY - parentRect.top - dragOffset.y);

    // 允许超出容器边界，移除边界限制
    // const maxLeft = parentRect.width - containerRect.width;
    // const maxTop = parentRect.height - containerRect.height;

    // newLeft = Math.max(0, Math.min(newLeft, maxLeft));
    // newTop = Math.max(0, Math.min(newTop, maxTop));

    // 根据定位约束设置位置
    const newPosition: any = {};
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
    onMouseMove(newPosition);
  };

  const handleMouseUp = (e?: any) => {
    if (!getPermissionData().materialProduct) {
      return;
    }
    setIsDragging(false);
    // e?.stopPropagation();
    // e?.preventDefault();
    onMoveEnd(currentPositionRef.current || {}, elemId);
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleMouseMove(e);
      }
    };

    const handleGlobalMouseUp = (e?: MouseEvent) => {
      if (isDragging) {
        handleMouseUp(e);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleGlobalMouseMove, false);
      window.addEventListener('mouseup', handleGlobalMouseUp, false);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove, false);
      window.removeEventListener('mouseup', handleGlobalMouseUp, false);
    };
  }, [isDragging]);

  // 监听窗口大小变化
  useEffect(() => {
    if (!needResize) return;
    const handleResize = () => {
      const newPosition = calculateActualPosition(
        currentPositionRef.current || {},
        scale
      );
      // setCurrentPosition(newPosition);
      currentPositionRef.current = newPosition;
    };

    window.addEventListener('resize', handleResize);
    // 初始化时计算一次
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return {
    isDragging,
    setContainerRef,
    setIsDragging,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
};

interface AbsoluteElemContainerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  elemId: string;
  rowDepth: number[];
  position: PositionAttrs;
  onMouseDown2: (e: MouseEvent) => void;
  onMouseMove2: (newPosition: PositionAttrs) => void;
  onMoveEnd2: (nextPosition: PositionAttrs | null, operatorId: string) => void;
  needResize?: boolean;
  editable?: boolean;
}

export const AbsoluteElemContainer = ({
  children,
  elemId,
  rowDepth,
  position,
  editable = true,
  needResize = false,
  onMouseDown2,
  onMouseMove2,
  onMoveEnd2,
  ...rest
}: AbsoluteElemContainerProps) => {
  const { editorSDK } = useGridContext();
  const { setContainerRef, handleMouseDown, handleMouseUp } = useDragElem({
    elemId,
    rowDepth,
    needResize: needResize,
    onMouseDown: e => {
      onMouseDown2?.(e);
    },
    onMouseMove: newPosition => {
      onMouseMove2?.(newPosition);
    },
    onMoveEnd: (nextPosition, operatorId) => {
      onMoveEnd2?.(nextPosition, operatorId);
    },
  });
  useEffect(() => {
    // 没有约束关系时，给默认left top
    if (position && editorSDK) {
      const defaultAtBot = typeof position.bottom !== 'undefined';
      const newPosition = defaultAtBot
        ? {
            left: position.left,
            bottom: position.bottom,
            constraint: 'left-bottom',
          }
        : {
            left: position.left,
            top: position.top,
            constraint: 'left-top',
          };
      if (newPosition.constraint === position.constraint) {
        return;
      }
      editorSDK.changeCompAttr(elemId, {
        position: newPosition,
      });
    }
  }, []);

  const setRef = useCallback((node: HTMLElement | null) => {
    setContainerRef(node, position);
  }, []);

  return (
    <div {...rest} ref={setRef}>
      {children}
    </div>
  );
};

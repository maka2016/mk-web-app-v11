import styled from '@emotion/styled';
import { getPermissionData } from '@mk/services';
import { EditorSDK, LayerElemItem } from '@mk/works-store/types';
import clas from 'classnames';
import { Move } from 'lucide-react';
import React, {
  ForwardedRef,
  HTMLAttributes,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { getScaleRate } from '../../shared/styleHelper';
import { GridProps, GridState } from '../../shared/types';

const AbsoluteElemContainerRoot = styled.div`
  position: absolute;
  cursor: grab;
  user-select: none;
  img {
    pointer-events: none;
  }
  &.disabled {
    user-select: none;
    pointer-events: none !important;
  }
`;

const ContextMenu = styled.div<{ x: number; y: number }>`
  position: fixed;
  left: ${props => props.x}px;
  top: ${props => props.y}px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 9999;
`;

const MenuItem = styled.div<{ active?: boolean }>`
  padding: 8px 16px;
  cursor: pointer;
  &:hover {
    background: #f5f5f5;
  }
  ${props =>
    props.active &&
    `
    background: #e6f7ff;
    color: #1890ff;
  `}
`;

const DragHandleWrapper = styled.div`
  position: absolute;
  top: -12px;
  left: -12px;
  right: -12px;
  bottom: -12px;
  display: flex;
  align-items: center;
  justify-content: center;
`;
const DragHandle = styled.div`
  padding: 2px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  cursor: grab;
  pointer-events: auto;
  user-select: none;
  z-index: 111;

  &:active {
    cursor: grabbing;
  }
`;

type PositionConstraint =
  | 'left-top'
  | 'right-top'
  | 'left-bottom'
  | 'right-bottom';

interface AbsoluteElemContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  editorSDK?: EditorSDK<GridProps, GridState>;
  widgetState: GridState;
  layer: LayerElemItem;
  editable?: boolean;
  needResize?: boolean;
}

export interface PositionAttrs {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  constraint?: PositionConstraint;
}

export default forwardRef<HTMLDivElement, AbsoluteElemContainerProps>(
  function AbsoluteElemContainer(
    {
      children,
      editorSDK,
      widgetState,
      layer,
      editable = true,
      needResize = true,
      ...props
    },
    ref: ForwardedRef<HTMLDivElement>
  ) {
    const { editingElemId } = widgetState;
    const fullStack = getPermissionData().materialProduct;
    const isActiveElem = layer.elemId === editingElemId;
    const position = layer.attrs.position as PositionAttrs;
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const currentPositionRef = useRef(position);
    const [currentPosition, setCurrentPosition] = useState(position);
    const [positionConstraint, setPositionConstraint] =
      useState<PositionConstraint>(position.constraint || 'left-top');
    const containerRef = useRef<HTMLDivElement>(null);
    const parentRef = useRef<HTMLElement | null>(null);
    const scale = getScaleRate();

    // 合并内部ref和外部ref，让它们指向同一个DOM元素
    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        // 设置内部ref
        (containerRef as any).current = node;
        // 设置外部ref
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          (ref as any).current = node;
        }
      },
      [ref]
    );

    // 计算实际位置
    const calculateActualPosition = (position: PositionAttrs) => {
      if (!position) return position;

      const newPosition = { ...position };

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

    // 监听窗口大小变化
    useEffect(() => {
      if (!needResize) return;
      const handleResize = () => {
        const newPosition = calculateActualPosition(position);
        setCurrentPosition(newPosition);
        currentPositionRef.current = newPosition;
      };

      window.addEventListener('resize', handleResize);
      // 初始化时计算一次
      handleResize();

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }, []);

    useEffect(() => {
      // 没有约束关系时，给默认left top
      if (!position.constraint) {
        setPositionConstraint('left-top');
        if (editorSDK) {
          editorSDK.changeCompAttr(layer.elemId, {
            position: {
              ...position,
              constraint: 'left-top',
            },
          });
        }
      }
    }, []);

    // useEffect(() => {
    //   console.log("position", position);
    // }, [position]);

    const handleContextMenu = (e: React.MouseEvent) => {
      if (!getPermissionData().materialProduct) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
    };

    const handleMouseDown = (e: React.MouseEvent) => {
      if (!isActiveElem || !getPermissionData().materialProduct) {
        return;
      }
      if (e.button !== 0) return; // 只响应左键点击

      setIsDragging(true);
      const rect = e.currentTarget.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      // 获取父元素
      parentRef.current = containerRef.current?.parentElement || null;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!getPermissionData().materialProduct) {
        return;
      }
      if (!isDragging || !parentRef.current || !containerRef.current) return;

      const parentRect = parentRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();

      // 计算相对于父元素的新位置
      let newLeft = e.clientX - parentRect.left - dragOffset.x;
      let newTop = e.clientY - parentRect.top - dragOffset.y;

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
          newPosition.right =
            parentRect.width - (newLeft + containerRect.width);
          newPosition.top = newTop;
          break;
        case 'left-bottom':
          newPosition.left = newLeft;
          newPosition.bottom =
            parentRect.height - (newTop + containerRect.height);
          break;
        case 'right-bottom':
          newPosition.right =
            parentRect.width - (newLeft + containerRect.width);
          newPosition.bottom =
            parentRect.height - (newTop + containerRect.height);
          break;
        default:
          newPosition.left = newLeft;
          newPosition.top = newTop;
          break;
      }

      setCurrentPosition(newPosition);
      currentPositionRef.current = newPosition;
    };

    const handleMouseUp = (e?: any) => {
      props.onClick?.(e);
      if (!getPermissionData().materialProduct) {
        return;
      }
      setIsDragging(false);
      // e?.stopPropagation();
      // e?.preventDefault();
      if (editorSDK) {
        editorSDK.changeCompAttr(layer.elemId, {
          position: currentPositionRef.current,
        });
      }
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

    const defaultZIndex =
      typeof layer.attrs?.layoutStyle?.zIndex === 'number'
        ? layer.attrs?.layoutStyle?.zIndex
        : 1;

    return (
      <>
        <AbsoluteElemContainerRoot
          ref={setRefs}
          data-position-constraint={positionConstraint}
          {...props}
          className={clas(
            'AbsoluteElemContainerRoot',
            !editable ? 'disabled' : '',
            props.className
          )}
          style={{
            ...(props.style || {}),
            ...currentPositionRef.current,
            // transform: `scale(${scale})`,
            position: 'absolute',
            // transformOrigin: "left top",
            pointerEvents: editorSDK ? 'auto' : 'none',
            zIndex: defaultZIndex,
            // zIndex: isActiveElem ? 2222 : defaultZIndex,
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
          onContextMenu={handleContextMenu}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
        >
          {fullStack && isActiveElem && (
            <DragHandleWrapper className='DragHandleWrapper'>
              <DragHandle aria-label='drag-handle'>
                <Move size={20} />
              </DragHandle>
            </DragHandleWrapper>
          )}
          {children}
        </AbsoluteElemContainerRoot>
      </>
    );
  }
);

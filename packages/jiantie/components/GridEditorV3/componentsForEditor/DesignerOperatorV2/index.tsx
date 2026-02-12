import styled from '@emotion/styled';
import { cn } from '@workspace/ui/lib/utils';
import { Move, Plus } from 'lucide-react';
import { observer } from 'mobx-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { isPc } from '../../../../utils';
import { calcViewerHeight } from '../../AppV2/utils';
import Watermark from '../../EditorCanvas/Watermark';
import {
  clearTransform,
  getImageContainer,
  getImgHeight,
  getImgWidth,
} from '../../components/Picture/ChangeScaleHelper';
import { BtnLite } from '../../components/style-comps';
import { useHideOnScroll } from '../../hooks/useHideOnScroll';
import { getCanvaInfo2 } from '../../provider/utils';
import { GridRow } from '../../types';
import { getRowName, getScaleRate } from '../../utils';
import { calculateIndicatorPosition } from '../../utils/indicatorPosition';
import { useWorksStore } from '../../works-store/store/hook';
import SettingElemDesigner from '../SettingPopoverDesigner/SettingElemDesigner';
import SettingRow from '../SettingPopoverDesigner/SettingRow';
import ChangeComponentTriggerDialog from '../SettingPopoverUser/ChangeComponentTrigger';
import { SettingElemV3Pop } from '../SettingPopoverUser/SettingElemV3Pop';
import SettingRowV3Pop from '../SettingPopoverUser/SettingRowV3Pop';
import SettingWidgetV4 from '../SettingPopoverUser/SettingWidgetV4';
import DragToChangeMarginBtn from './DragToChangeMarginBtn';
import DragToScaleBtn from './DragToScaleBtn';
import Guidelines from './Guidelines/Guidelines';
import MarginPaddingIndicatorV2 from './MarginPaddingIndicatorV2';

const SettingElemWrapper = styled.div`
  display: flex;
  overflow: hidden;
  background-color: #fff;
  border-radius: 100px;
  box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.2);
  pointer-events: auto;
  /* margin-bottom: 4px; */
  padding: 4px 8px;
  align-items: center;
  gap: 4px;
`;

const dottedColor1 = 'rgba(53, 71, 90, 0.2)';
const dottedColor2 = 'rgba(57, 76, 96, 0.15)';
const dottedWidth = '1px';

const IndicatorRoot = styled.div<{ color: string; opacity: number }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  pointer-events: none;
  /* border: 2px solid ${({ color }) => color}; */
  /* border-radius: 2px; */
  display: inline-block;
  opacity: ${({ opacity }) => opacity};

  &.use_bg {
    /* border-color: #1a87ff; */
    /* border-width: 1px; */
    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: ${({ color }) => color};
      opacity: 0.1;
      z-index: 111;
      pointer-events: none;
    }
  }

  .use_border {
    /* border-color: #1a87ff; */
    /* border-width: 1px; */
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: 12px solid ${({ color }) => color};
      opacity: 0.1;
      z-index: 111;
      pointer-events: none;
    }
  }

  .indicator_outline_container {
    position: absolute;
    pointer-events: none;
    /* color: #fff; */
    /* background-color: #1a87ff09; */
    visibility: hidden;

    &.status_hidden {
      visibility: hidden !important;
      * {
        visibility: hidden !important;
      }
    }

    &.hide_operator {
      visibility: hidden !important;
    }
    &.selected {
      visibility: visible;
      &.block_indicator,
      &.row_indicator {
        z-index: 10;
        &::after {
          position: absolute;
          content: '';
          /* box-shadow: none; */
          /* box-shadow: 1px dashed #ff005f; */
          box-shadow: inset 0 0 0 1px rgba(57, 76, 96, 0.15);
          // border: 2px dotted #fff;
          // box-shadow: none;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          outline: none;
          border: none;
          background-image:
            linear-gradient(90deg, #fff 60%, rgba(53, 71, 90, 0.2) 0),
            linear-gradient(180deg, #fff 60%, rgba(53, 71, 90, 0.2) 0),
            linear-gradient(90deg, #fff 60%, rgba(53, 71, 90, 0.2) 0),
            linear-gradient(180deg, #fff 60%, rgba(53, 71, 90, 0.2) 0),
            linear-gradient(
              90deg,
              rgba(57, 76, 96, 0.15),
              rgba(57, 76, 96, 0.15)
            ),
            linear-gradient(
              180deg,
              rgba(57, 76, 96, 0.15),
              rgba(57, 76, 96, 0.15)
            ),
            linear-gradient(
              90deg,
              rgba(57, 76, 96, 0.15),
              rgba(57, 76, 96, 0.15)
            ),
            linear-gradient(
              180deg,
              rgba(57, 76, 96, 0.15),
              rgba(57, 76, 96, 0.15)
            );
          background-position:
            top,
            100%,
            bottom,
            1px,
            center 0,
            calc(100% - 1px),
            center calc(100% - 1px),
            1px;
          background-repeat:
            repeat-x, repeat-y, repeat-x, repeat-y, no-repeat, no-repeat,
            no-repeat, no-repeat;
          background-size:
            6px ${dottedWidth},
            ${dottedWidth} 6px,
            6px ${dottedWidth},
            ${dottedWidth} 6px,
            calc(100% - 6px) 1px,
            1px calc(100% - 4px),
            calc(100% - 6px) 1px,
            1px calc(100% - 4px);
        }
        // box-shadow: none;
      }
    }
    &.active {
      outline: none;
      visibility: visible;
      &::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-image: none !important;
        box-shadow: inset 0 0 0 2px #1a87ff !important;
      }
      .indicator_content {
        visibility: visible;
      }

      &.block_indicator,
      &.row_indicator {
        /* box-shadow: none; */
        outline: none;
        background-image: none;
        z-index: 13;
        &::after {
          box-shadow: inset 0 0 0 2px #1a87ff;
          background-image: none !important;
        }
      }
      &.block_indicator {
        z-index: 9;
      }
    }
    &.hover_indicator {
      box-shadow: inset 0 0 0 2px #1a87ff;
      z-index: 12;
    }

    &.component_indicator {
      &::after {
        box-shadow: inset 0 0 0 2px #9747ff !important;
        outline: 12px solid rgba(151, 71, 255, 0.2) !important;
        background-image: none !important;
        /* pointer-events: auto !important; */
      }
      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        box-shadow: inset 0 0 0 12px rgba(151, 71, 255, 0.2) !important;
        z-index: 111;
        pointer-events: none;
      }
    }

    &.use_bg {
      /* border-color: #1a87ff; */
      /* border-width: 1px; */
      &::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: ${({ color }) => color};
        opacity: 0.1;
        z-index: 111;
        pointer-events: none;
      }
    }

    .indicator_fill {
      position: relative;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1;
      pointer-events: none;
    }
  }

  .indicator_tip {
    font-size: 10px;
    position: absolute;
    z-index: 1;
    padding: 0 2px;
    pointer-events: none;
    background-color: #1a87ff;
    color: #fff;
    &.elem_tip {
      top: 100%;
    }
    &.row_tip {
      top: 0;
      left: 0;
      transform: translateX(-100%);
    }
  }
  /* .block_indicator {
    box-shadow: inset 0px 1px 1px #1a87ff;
  } */

  .child_cells_indicators {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 5; /* Ensure it's below the main row indicator_outline_container but above content */
    overflow: hidden;
  }

  .child_elems_indicators {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 5; /* Ensure it's below the main row indicator_outline_container but above content */
    overflow: hidden;
  }

  .cell_child_indicator {
    visibility: visible !important;
  }
  .elem_indicator {
    z-index: 99 !important;
  }
  /* 自由元素选中/激活时的边框颜色覆盖 */
  .elem_indicator.free.active,
  .elem_indicator.free.selected {
    outline: 1px solid #ff9f0a;
  }
  .indicator_content {
    position: absolute;
    z-index: 222;
    left: 50%;
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: fit-content;
    pointer-events: none;
    visibility: hidden;
    &.at_top {
      top: 0;
      transform: translate(-50%, -110%);
    }
    &.at_half_top {
      top: 0;
      transform: translate(-50%, calc(50% - 36px));
    }
    &.at_bottom {
      bottom: 0;
      transform: translate(-50%, calc(100% - 12px));
      &.sticky {
        position: sticky;
        top: 105%;
        transform: translate(-50%, 18px);
      }
    }
  }
`;

interface Props {
  color?: string;
  opacity?: number;
}

// 递归查找所有行，扁平化处理
const getAllRowsFromGridsData = (data: GridRow[]): GridRow[] => {
  const result: GridRow[] = [];
  const traverse = (rows: GridRow[]) => {
    for (const row of rows) {
      result.push(row);
      if (row.children && row.children.length > 0) {
        traverse(row.children);
      }
    }
  };
  traverse(data);
  return result;
};

const HighlightItem = ({
  children,
  targetDOM,
  hideOperator,
  parentDOM,
  className,
}: {
  children?: React.ReactNode;
  targetDOM: HTMLElement;
  parentDOM?: HTMLElement;
  hideOperator: boolean;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        'cell_child_indicator indicator_outline_container row_indicator selected',
        className,
        hideOperator && 'status_hidden'
      )}
      ref={el => {
        if (el && targetDOM) {
          const elemRect = targetDOM.getBoundingClientRect();
          const rootDOMRect = parentDOM?.getBoundingClientRect();
          el.style.top = `${Math.floor(elemRect.top) - (rootDOMRect?.top || 0)}px`;
          el.style.left = `${Math.floor(elemRect.left) - (rootDOMRect?.left || 0)}px`;
          el.style.width = `${Math.ceil(elemRect.width)}px`;
          el.style.height = `${Math.ceil(elemRect.height)}px`;
        }
      }}
    >
      {children}
    </div>
  );
};

const IndicatorContent = ({
  sticky = true,
  visiable = true,
  children,
  className,
  position = 'top',
  onClick,
  onMouseDown,
  ...otherProps
}: {
  sticky?: boolean;
  visiable?: boolean;
  children?: React.ReactNode;
  className?: string;
  position?: 'top' | 'bottom';
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
} & React.HTMLAttributes<HTMLDivElement>) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [leftStyle, setLeftStyle] = useState<string | undefined>(undefined);
  const [transformStyle, setTransformStyle] = useState<string | undefined>(
    undefined
  );

  useEffect(() => {
    if (!visiable || !contentRef.current) {
      return;
    }

    const getTransformY = () => {
      // 根据 position 和 sticky 状态确定 transform Y 值
      if (position === 'top') {
        return '-110%';
      } else if (position === 'bottom') {
        if (sticky) {
          return '18px';
        }
        return 'calc(100% - 12px)';
      }
      return '0';
    };

    // 等待下一帧，确保元素已完全渲染
    requestAnimationFrame(() => {
      const element = contentRef.current;
      if (!element) return;

      // 查找 .IndicatorContainerForUser 容器
      const container = element.closest(
        '.IndicatorContainerForUser'
      ) as HTMLElement;
      if (!container) return;

      const rect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const containerLeft = containerRect.left;
      const containerRight = containerRect.right;

      const transformY = getTransformY();

      // 检查是否超出左边可视区域（相对于容器）
      if (rect.left < containerLeft) {
        setLeftStyle('0');
        setTransformStyle(`translate(0, ${transformY})`);
      }
      // 检查是否超出右边可视区域（相对于容器）
      else if (rect.right > containerRight) {
        setLeftStyle('100%');
        setTransformStyle(`translate(-100%, ${transformY})`);
      }
      // 正常情况，居中显示
      else {
        setLeftStyle('50%');
        setTransformStyle(`translate(-50%, ${transformY})`);
      }
    });
  }, [visiable, position, sticky]);

  if (!visiable) {
    return null;
  }
  return (
    <div
      ref={contentRef}
      className={cn(
        'indicator_content',
        className,
        `at_${position}`,
        sticky && 'sticky'
      )}
      style={{
        ...(leftStyle !== undefined && { left: leftStyle }),
        ...(transformStyle !== undefined && { transform: transformStyle }),
        transition: 'left 0.2s ease, transform 0.2s ease',
      }}
      onClick={e => {
        e.stopPropagation();
        e.preventDefault();
        onClick?.(e);
      }}
      onMouseDown={e => {
        e.stopPropagation();
        onMouseDown?.(e);
      }}
      {...otherProps}
    >
      {children}
    </div>
  );
};

const IndicatorDesignerV2 = (props: Props) => {
  const t = useTranslations('GridEditor');
  const worksStore = useWorksStore();
  const { widgetStateV2, clearActiveStatus, setWidgetStateV2 } = worksStore;
  const { worksDetail, fullStack } = worksStore;
  const { getActiveRow, getActiveRootRow, setRowAttrsV2 } =
    worksStore.gridPropsOperator;
  const { editingElemId, activeRowDepth } = widgetStateV2;
  const canvaInfo = getCanvaInfo2();
  const currRow = getActiveRow();
  const currRootRow = getActiveRootRow();
  const activeRowId = currRow?.id;
  const [isDragging, setIsDragging] = useState(false);
  const [rootDOM, setRootDOM] = useState<HTMLElement | null>(null);
  const [scrollContainer, setScrollContainer] = useState<HTMLElement | null>(
    null
  );
  const mouseDownRef = useRef<{
    target: HTMLElement;
  }>(null);
  const isDraggingTransformRef = useRef<boolean>(false);
  const initialSizeRef = useRef<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const rootDOM = document.querySelector<HTMLElement>(
      '#designer_canvas_container'
    );
    const scrollContainer = document.querySelector<HTMLElement>(
      '#designer_scroll_container'
    );
    setRootDOM(rootDOM);
    setScrollContainer(scrollContainer);
  }, []);

  // 监听滚动状态，滚动时隐藏 Popover
  // 支持长滚动回调：当用户滚动超过半个屏幕高度时触发
  useHideOnScroll({
    delay: 200,
    // 设计师不需要监听
    scrollContainer: fullStack ? null : scrollContainer,
    longScrollThreshold: typeof window !== 'undefined' ? window.innerHeight : 0,
    onLongScroll: () => {
      // 用户滚动了半个屏幕高度，可以在这里执行相关逻辑
      // 例如：自动保存、记录用户行为、加载更多内容等
      console.log('用户执行了长滚动');
      clearActiveStatus();
    },
  });

  const { color = '#1a87ff', opacity = 1 } = props;

  /** 用于hover状态 */
  const hoverRef = useRef<any>(null);
  const hoverTargetRef = useRef<any>(null);

  /** 用于选中 */
  const blockRef = useRef<any>(null);
  const rowRef = useRef<any>(null);
  const elemRef = useRef<any>(null);

  const updateRefStyle = (targetDomId: string, updateRef: any) => {
    const targetDOM = rootDOM?.querySelector(`${targetDomId}`);
    if (targetDOM && updateRef.current) {
      // 指示器是独立元素，使用独立元素模式
      calculateIndicatorPosition(
        targetDOM as HTMLElement,
        updateRef.current,
        false
      );
      updateRef.current.style.visibility = 'visible';
    } else {
      if (updateRef.current) {
        updateRef.current.style.visibility = 'hidden';
      }
    }
  };

  const updateHoverRefStyle = (targetDomId: string, updateRef: any) => {
    if (document.body.style.pointerEvents === 'none') {
      // 弹窗打开时停止响应
      return;
    }
    const targetDOM = rootDOM?.querySelector(`#id-canvas ${targetDomId}`);
    if (targetDOM && updateRef.current) {
      // 指示器是独立元素，使用独立元素模式
      calculateIndicatorPosition(
        targetDOM as HTMLElement,
        updateRef.current,
        false
      );
      updateRef.current.style.visibility = 'visible';
    } else {
      if (updateRef.current) {
        updateRef.current.style.visibility = 'hidden';
      }
    }
  };

  useEffect(() => {
    const domRoot = rootDOM?.querySelector('.Grid_container');
    if (!domRoot) {
      return;
    }

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const height = calcViewerHeight();
        if (height && height !== canvaInfo.canvaH) {
          resetRefStyle();
        }
      }
    });

    resizeObserver.observe(domRoot);

    // iOS键盘事件处理
    const handleKeyboardChange = () => {
      // 延迟执行，确保键盘动画完成后再重置样式
      setTimeout(() => {
        resetRefStyle();
      }, 100);
    };

    // 使用 visualViewport API 检测键盘状态（更准确）
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleKeyboardChange);
    }

    const handleResize = () => {
      resetRefStyle();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (domRoot) {
        resizeObserver.disconnect();
      }
      window.removeEventListener('resize', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener(
          'resize',
          handleKeyboardChange
        );
      }
    };
  }, [JSON.stringify(widgetStateV2), rootDOM]);

  const resetRefStyle = (
    {
      blockId,
      rowId,
      elemId,
    }: {
      blockId?: string;
      rowId?: string;
      elemId?: string;
    } = {
        blockId: currRootRow?.id,
        rowId: activeRowId,
        elemId: editingElemId,
      }
  ) => {
    if (blockId) {
      // 设置block
      updateRefStyle(`#editor_block_${blockId}`, blockRef);
    }
    // console.log(document.querySelector(`#editor_row_${activeRowId}`));
    // 设置row
    updateRefStyle(`#editor_row_${rowId}`, rowRef);
    // 设置elem
    updateRefStyle(`#elem_wrapper_${elemId}`, elemRef);
  };

  const getOperateTargetDOM = () => {
    if (editingElemId) {
      return rootDOM?.querySelector<HTMLElement>(
        `#elem_wrapper_${editingElemId}`
      );
    } else if (activeRowId) {
      return (
        rootDOM?.querySelector<HTMLElement>(`#editor_row_${activeRowId}`) ||
        rootDOM?.querySelector<HTMLElement>(`#editor_block_${currRootRow?.id}`)
      );
    }
    return null;
  };

  /** 设置当前元素 */
  useEffect(() => {
    resetRefStyle();

    const selectElem = (e: MouseEvent | TouchEvent) => {
      const targetElem = (e.target as HTMLElement).closest(
        '.ElemWrapper.hover_elem'
      ) as HTMLElement;
      const isAbsoluteElem = targetElem?.dataset.absoluteElem === 'true';
      const targetRow = (e.target as HTMLElement).closest(
        '.Row.hover_elem'
      ) as HTMLElement;
      const elemId = targetElem?.dataset.elemId;
      if (!targetRow && elemId === editingElemId) {
        return;
      }
      if (targetElem && elemId !== editingElemId) {
        e.stopPropagation();
        e.preventDefault();
      }
      if (targetRow) {
        // console.log('targetRow', targetRow);
        // console.log('targetElem', targetElem);
        // 始终使用 targetRow 的 rowDepth，因为它是元素实际所在的容器
        // targetElem 的 rowDepth 可能和它实际所在的 Row 不一致
        const rowDepthStr = targetRow?.dataset?.rowDepth;
        const rowDepthStrFromElem = targetElem?.dataset?.rowDepth;
        let useRowDepth = rowDepthStrFromElem;
        if (!isAbsoluteElem && rowDepthStr !== rowDepthStrFromElem) {
          // 如果 targetRow 没有 rowDepth，尝试从 targetElem 获取（向后兼容）
          useRowDepth = rowDepthStr;
        }
        let rowDepth: number[] = [];
        if (useRowDepth) {
          try {
            rowDepth = JSON.parse(useRowDepth);
          } catch (error) {
            console.log('targetRowError', error);
            rowDepth = [];
          }
        }
        setWidgetStateV2({
          editingElemId: elemId,
          activeRowDepth: rowDepth,
          hideOperator: false,
        });
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      setIsDragging(false);
      handleRootClick(e);
      // 如果正在拖拽平移按钮，不执行元素选择
      if (!isDraggingTransformRef.current) {
        selectElem(e);
      }
      resetRefStyle();
    };

    const handleMouseDown = (e: MouseEvent | TouchEvent) => {
      // 检查是否点击的是indicator_content元素或其子元素
      const target = e.target as HTMLElement;
      if (target.closest('.indicator_content')) {
        return; // 如果是indicator_content，不设置拖拽状态
      }
      setIsDragging(true);
      mouseDownRef.current = {
        target: e.target as HTMLElement,
      };
      const targetElem = (e.target as HTMLElement).closest(
        '.ElemWrapper'
      ) as HTMLElement;
      if (targetElem && targetElem.dataset.absoluteElem === 'true') {
        selectElem(e);
      }
    };

    const handleClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.indicator_content')) {
        return; // 如果是indicator_content，不设置拖拽状态
      }
      const targetElem = (e.target as HTMLElement).closest(
        '.ElemWrapper'
      ) as HTMLElement;
      if (targetElem && targetElem.dataset.absoluteElem === 'true') {
        selectElem(e);
      }
    };

    const handleRootClick = (e: any) => {
      const target = e.target as HTMLElement;
      // 确保点击的是canvas容器，而不是canvas容器内的元素
      if (
        mouseDownRef.current?.target.id === 'designer_canvas_container' &&
        target.id === 'designer_canvas_container'
      ) {
        setWidgetStateV2({
          activeRowDepth: [widgetStateV2.activeRowDepth?.[0] || 0],
          editingElemId: undefined,
          hideOperator: true,
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const targetHover = target.closest('.hover_elem') as HTMLElement;
      if (!isDragging) {
        if (targetHover) {
          // hoverRef.current.style.visibility = "visible";
          // console.log("targetHover", targetHover);
          if (targetHover.id && hoverTargetRef.current !== targetHover.id) {
            updateHoverRefStyle(`#${targetHover.id}`, hoverRef);
            hoverTargetRef.current = targetHover.id;
          }
        }
      }
      if (isDragging || target?.id === 'designer_canvas_container') {
        // 清除hover状态
        hoverTargetRef.current = null;
        if (hoverRef.current && hoverRef.current.style) {
          hoverRef.current.style.visibility = 'hidden';
        }
      }
      if (isDragging && isEditingFreeElem) {
        // 自由元素拖动
        updateRefStyle(`#elem_wrapper_${editingElemId}`, elemRef);
      }
    };

    const handleKeyUp = () => {
      if (editingElemId) {
        resetRefStyle();
      }
    };

    /** 移动端需要使用click事件 */
    document.addEventListener('click', handleClick);
    /** PC使用mouseup和mousedown事件 */
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keyup', handleKeyUp);
    // document.addEventListener('touchend', handleKeyUp);
    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keyup', handleKeyUp);
      // document.removeEventListener('touchend', handleKeyUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [
    widgetStateV2.activeRowDepth,
    editingElemId,
    rootDOM,
    activeRowId,
    worksStore.focusUpdateVersion,
  ]);

  const getEditingItemStyle = () => {
    if (editingElemId) {
      const layer = worksStore.getLayer(editingElemId);
      if (layer) {
        return layer.attrs?.layoutStyle || {};
      }
    } else if (currRow) {
      if (currRow?.isRepeatList) {
        return currRow.repeatItemTemplate?.style || {};
      }
      return currRow.style;
    }
    return {};
  };

  const parseTranslate = (transformStr: string | undefined) => {
    const str = transformStr || '';
    const match = str.match(/translate\(([^)]+)\)/);
    let x = 0;
    let y = 0;
    if (match) {
      const [tx, ty] = match[1]
        .split(',')
        .map(v => parseFloat(v.trim().replace('px', '')) || 0);
      x = tx || 0;
      y = ty || 0;
    }
    return { x, y, hasTranslate: !!match };
  };

  const buildTransformWithTranslate = (
    prev: string | undefined,
    x: number,
    y: number
  ) => {
    const prevStr = prev || '';
    const translateStr = `translate(${x}px, ${y}px)`;
    if (/translate\([^)]+\)/.test(prevStr)) {
      return prevStr.replace(/translate\([^)]+\)/, translateStr);
    }
    const result = prevStr ? `${prevStr} ${translateStr}` : translateStr;
    return result;
  };

  const renderElemTransformBtn = () => {
    const layer = worksStore.getLayer(editingElemId || '');
    if (layer?.attrs?.absoluteElem) {
      return null;
    }
    const style = getEditingItemStyle();
    const { x, y } = parseTranslate(style?.transform);
    const _x = x;
    const _y = y;
    return (
      <DragToChangeMarginBtn
        label={t('移动')}
        Icon={<Move size={16} />}
        valueX={_x}
        valueY={_y}
        onChange={(valueX, valueY) => {
          const targetDOM = getOperateTargetDOM();
          if (targetDOM) {
            // valueX和valueY已经是绝对值，直接使用它们构建transform
            // 这样可以确保拖拽过程中的位置与最终位置一致
            const finalTransform = `translate(${valueX}px, ${valueY}px)`;
            Object.assign(targetDOM.style, {
              transform: finalTransform,
            });
            // 平移过程中需要重新计算激活外框的位置
            requestAnimationFrame(() => {
              resetRefStyle();
            });
          }
        }}
        onDragDone={(valueX, valueY) => {
          const targetDOM = getOperateTargetDOM();
          // 对元素（editingElemId）使用DOM的实际transform作为基准，与onChange保持一致
          if (editingElemId) {
            // 但是valueX和valueY已经是最终值了，不需要再计算增量
            // 直接使用valueX和valueY构建新的transform
            const newTransform = `translate(${valueX}px, ${valueY}px)`;
            // 确保DOM上的transform是正确的，防止React重新渲染时被覆盖
            if (targetDOM) {
              targetDOM.style.transform = newTransform;
            }
            setEditingItemStyle({ transform: newTransform });
            // 在下一个渲染周期再次确保DOM transform正确，防止被React覆盖
            requestAnimationFrame(() => {
              if (targetDOM) {
                targetDOM.style.transform = newTransform;
              }
            });
            setIsDragging(false);
            // 延迟重置拖拽状态，避免触发元素选择
            setTimeout(() => {
              isDraggingTransformRef.current = false;
            }, 0);
            return;
          }
          // 行/格子的实时 DOM transform 作为基准更准确
          // valueX和valueY已经是最终值，直接使用它们构建transform
          const next = `translate(${valueX}px, ${valueY}px)`;
          // 确保DOM上的transform是正确的，防止React重新渲染时被覆盖
          if (targetDOM) {
            targetDOM.style.transform = next;
          }
          setEditingItemStyle({ transform: next });
          // 在下一个渲染周期再次确保DOM transform正确，防止被React覆盖
          requestAnimationFrame(() => {
            if (targetDOM) {
              targetDOM.style.transform = next;
            }
          });
          setIsDragging(false);
          // 延迟重置拖拽状态，避免触发元素选择
          setTimeout(() => {
            isDraggingTransformRef.current = false;
          }, 0);
        }}
        onDragStart={() => {
          setIsDragging(true);
          isDraggingTransformRef.current = true;
        }}
      />
    );
  };

  const renderElemScaleBtn = () => {
    if (!editingElemId) {
      return null;
    }
    const layer = worksStore.getLayer(editingElemId);
    if (!layer) {
      return null;
    }

    // 只支持图片和文字
    const elementRef = layer.elementRef || '';
    const isPicture = /picture/gi.test(elementRef);
    const isText = /text/gi.test(elementRef);
    if (!isPicture && !isText) {
      return null;
    }

    const targetDOM = getOperateTargetDOM();
    if (!targetDOM) {
      return null;
    }

    // 获取文字的当前字号
    const getTextFontSize = () => {
      const layer = worksStore.getLayer(editingElemId);
      const fontSize = layer?.attrs?.fontSize;
      if (typeof fontSize === 'number') {
        return fontSize;
      }
      if (typeof fontSize === 'string') {
        const numericValue = parseFloat(fontSize.replace(/[^\d.-]/g, ''));
        return isNaN(numericValue) ? 16 : numericValue;
      }
      return 16;
    };

    // 获取文字容器元素
    const getTextContainer = () => {
      return document.querySelector(
        `#layer_root_${editingElemId}`
      ) as HTMLElement;
    };

    // 获取容器元素（图片或文字）
    const getContainer = () => {
      if (isText) {
        return getTextContainer();
      } else {
        return getImageContainer(editingElemId);
      }
    };

    // 清除 transform 样式（区分图片和文字）
    const clearTransformForElement = () => {
      const container = getContainer();
      if (!container) return;

      const existingTransform = container.style.transform || '';
      const newTransform = existingTransform
        .replace(/\s*scale\([^)]*\)/g, '')
        .trim();

      if (newTransform) {
        container.style.transform = newTransform;
      } else {
        container.style.transform = '';
      }
      container.style.transformOrigin = '';
    };

    // 实时更新DOM样式（参考 ChangeScaleHelper）
    const updateDOMSize = (scale: number) => {
      const container = getContainer();
      if (!container) return;

      const existingTransform = container.style.transform || '';
      const transformMatch = existingTransform.match(/scale\([^)]*\)/);
      let newTransform = existingTransform;

      if (transformMatch) {
        newTransform = existingTransform.replace(
          /scale\([^)]*\)/,
          `scale(${scale})`
        );
      } else {
        newTransform = existingTransform
          ? `${existingTransform} scale(${scale})`
          : `scale(${scale})`;
      }

      container.style.transform = newTransform;
      container.style.transformOrigin = 'left top';
      requestAnimationFrame(() => {
        resetRefStyle();
      });
    };

    // 计算当前缩放百分比
    const getCurrentScale = () => {
      if (isText) {
        if (!initialSizeRef.current) {
          const fontSize = getTextFontSize();
          initialSizeRef.current = { width: fontSize, height: fontSize };
          return 100;
        }
        const currentFontSize = getTextFontSize();
        const scale = (currentFontSize / initialSizeRef.current.width) * 100;
        return Math.round(scale);
      } else {
        // 图片
        if (!initialSizeRef.current) {
          const width = getImgWidth(editingElemId);
          const height = getImgHeight(editingElemId);
          initialSizeRef.current = { width, height };
          return 100;
        }
        const currentWidth = getImgWidth(editingElemId);
        const scale = (currentWidth / initialSizeRef.current.width) * 100;
        return Math.round(scale);
      }
    };

    return (
      <DragToScaleBtn
        value={getCurrentScale()}
        onChange={scalePercent => {
          if (!initialSizeRef.current) {
            if (isText) {
              const fontSize = getTextFontSize();
              initialSizeRef.current = { width: fontSize, height: fontSize };
            } else {
              const width = getImgWidth(editingElemId);
              const height = getImgHeight(editingElemId);
              initialSizeRef.current = { width, height };
            }
          }

          const scale = scalePercent / 100;
          updateDOMSize(scale);
        }}
        onDragDone={scalePercent => {
          if (!initialSizeRef.current) {
            if (isText) {
              const fontSize = getTextFontSize();
              initialSizeRef.current = { width: fontSize, height: fontSize };
            } else {
              const width = getImgWidth(editingElemId);
              const height = getImgHeight(editingElemId);
              initialSizeRef.current = { width, height };
            }
          }

          if (!initialSizeRef.current) {
            return;
          }

          const scale = scalePercent / 100;

          // 清除 transform scale（参考 ChangeScaleHelper）
          if (isText) {
            clearTransformForElement();
          } else {
            clearTransform(editingElemId);
          }

          if (isText) {
            // 文字：更新字号
            const newFontSize = Math.round(
              initialSizeRef.current.width * scale * getScaleRate()
            );
            worksStore.changeCompAttr(editingElemId, {
              fontSize: Math.max(10, Math.min(200, newFontSize)), // 限制在 10-200 之间
            });
          } else {
            // 图片：更新 width 和 height（参考 ChangeScaleHelper）
            const newWidth = initialSizeRef.current.width * scale;
            const aspectRatio =
              initialSizeRef.current.height / initialSizeRef.current.width || 1;
            const nextHeight = Math.max(20, newWidth * aspectRatio);

            const nextVal: any = {
              width: newWidth,
              minWidth: newWidth,
              layoutStyle: {
                ...layer.attrs?.layoutStyle,
                width: newWidth,
              },
            };
            nextVal.height = nextHeight;
            nextVal.layoutStyle.height = nextHeight;
            worksStore.changeCompAttr(editingElemId, nextVal);
          }

          // 重置初始大小引用
          initialSizeRef.current = null;

          // 更新高亮框位置
          setTimeout(() => {
            resetRefStyle();
          }, 100);
        }}
        onDragStart={() => {
          if (isText) {
            const fontSize = getTextFontSize();
            initialSizeRef.current = { width: fontSize, height: fontSize };
            // 先清除可能存在的 transform，确保获取真实的字号
            clearTransformForElement();
          } else {
            // 先清除可能存在的 transform，确保获取真实的宽度
            clearTransform(editingElemId);
            const width = getImgWidth(editingElemId);
            const height = getImgHeight(editingElemId);
            initialSizeRef.current = { width, height };
          }
          setIsDragging(true);
          isDraggingTransformRef.current = true;
        }}
      />
    );
  };

  const renderRowTransformBtn = () => {
    // 只在 row 激活且没有元素编辑时显示
    if (!isActiveRow || editingElemId) {
      return null;
    }
    const style = getEditingItemStyle();
    const { x, y } = parseTranslate(style?.transform);
    const _x = x;
    const _y = y;
    return (
      <DragToChangeMarginBtn
        label={t('移动')}
        Icon={<Move size={16} />}
        valueX={_x}
        valueY={_y}
        onChange={(valueX, valueY) => {
          const targetDOM = getOperateTargetDOM();
          if (targetDOM) {
            // valueX和valueY已经是绝对值，直接使用它们构建transform
            // 这样可以确保拖拽过程中的位置与最终位置一致
            const finalTransform = `translate(${valueX}px, ${valueY}px)`;
            Object.assign(targetDOM.style, {
              transform: finalTransform,
            });
            // 平移过程中需要重新计算激活外框的位置
            requestAnimationFrame(() => {
              resetRefStyle();
            });
          }
        }}
        onDragDone={(valueX, valueY) => {
          // 行/格子的实时 DOM transform 作为基准更准确
          const targetDOM = getOperateTargetDOM();
          const persistedTransform = targetDOM?.style?.transform;
          const next = persistedTransform
            ? persistedTransform
            : buildTransformWithTranslate(style?.transform, valueX, valueY);
          setEditingItemStyle({ transform: next });
          setIsDragging(false);
          // 延迟重置拖拽状态，避免触发元素选择
          setTimeout(() => {
            isDraggingTransformRef.current = false;
          }, 0);
        }}
        onDragStart={() => {
          setIsDragging(true);
          isDraggingTransformRef.current = true;
        }}
      />
    );
  };

  const setEditingItemStyle = (nextStyle: any) => {
    const style = getEditingItemStyle();
    if (editingElemId) {
      worksStore.changeCompAttr(editingElemId, {
        layoutStyle: {
          ...style,
          ...nextStyle,
        },
      });
      setTimeout(() => {
        resetRefStyle();
      }, 100);
    } else if (activeRowId && currRow) {
      // 更新 row 的样式
      setRowAttrsV2({
        style: {
          ...style,
          ...nextStyle,
        },
      });
      setTimeout(() => {
        resetRefStyle();
      }, 100);
    }
  };

  const isSelectedBlock = !!currRootRow && (activeRowDepth || [])?.length > 1;
  const isComponent = !!currRow?.componentGroupRefId;
  const isTableOrList = currRow?.isTableView || currRow?.isRepeatList;
  const isActiveBlock = !!currRootRow && activeRowDepth?.length === 1;
  const isSelectedRow = !!activeRowId || !!editingElemId;
  const isActiveRow = !isActiveBlock && !!activeRowId && !editingElemId;

  const isEditingFreeElem = !!(
    editingElemId && worksStore.getLayer(editingElemId)?.attrs?.absoluteElem
  );

  const renderChildElemsIndicators = () => {
    if (!currRow || !currRootRow) {
      return null;
    }
    const activeRootRowDOM = rootDOM?.querySelector<HTMLDivElement>(
      `#editor_block_${currRootRow.id}`
    );
    let activeRowDOM: HTMLDivElement | undefined | null;
    if (editingElemId) {
      activeRowDOM = rootDOM
        ?.querySelector<HTMLDivElement>(`#elem_wrapper_${editingElemId}`)
        ?.closest('.editor_row_wrapper');
    } else {
      activeRowDOM = rootDOM?.querySelector<HTMLDivElement>(
        `#editor_row_${currRow.id}`
      );
    }
    const allElemInRow = activeRowDOM?.querySelectorAll<HTMLDivElement>(
      '.ElemWrapper.editable'
    );
    if (!allElemInRow || !activeRootRowDOM) {
      return null;
    }
    return (
      <div className='child_elems_indicators'>
        {Array.from(allElemInRow).map(elem => {
          if (elem.dataset.elemId === editingElemId) {
            return null;
          }
          return (
            <HighlightItem
              key={elem.dataset.elemId}
              targetDOM={elem}
              hideOperator={widgetStateV2.hideOperator || false}
              parentDOM={activeRootRowDOM}
            />
          );
        })}
      </div>
    );
  };

  const renderRowsOnlyInComponentIndicators = () => {
    if (!currRootRow) {
      return null;
    }
    const rowDOM = rootDOM?.querySelector<HTMLDivElement>(
      `#editor_block_${currRootRow.id}`
    );
    const componentRows =
      rowDOM?.querySelectorAll<HTMLDivElement>(`.row_type_Component`);
    if (!componentRows || !rowDOM) {
      return null;
    }
    const componentRow = Array.from(componentRows)
      .map(cr => {
        if (
          JSON.stringify(activeRowDepth).includes(
            cr.dataset?.rowDepth?.replace(']', '') || 'none'
          )
        ) {
          return cr;
        }
      })
      .filter(Boolean) as HTMLDivElement[];
    return (
      <div className='child_cells_indicators'>
        {componentRow.map(cr => {
          return (
            <HighlightItem
              className='active component_indicator'
              key={cr.id}
              targetDOM={cr}
              hideOperator={widgetStateV2.hideOperator || false}
              parentDOM={rowDOM}
            >
            </HighlightItem>
          );
        })}
      </div>
    );
  };

  const renderChildrenIndicators = (
    targetRow?: GridRow,
    showGuidelines = true
  ) => {
    if (!targetRow) {
      return null;
    }
    return (
      <div
        className={cn(
          'block_indicator indicator_outline_container',
          widgetStateV2.hideOperator && 'status_hidden',
          isSelectedBlock ? 'selected' : '',
          isActiveBlock ? 'active' : ''
        )}
        ref={blockRef}
      >
        {showGuidelines && <Guidelines worksDetail={worksDetail} />}
        {targetRow && (
          <div className='child_cells_indicators'>
            {(() => {
              const rootParentDOM = rootDOM?.querySelector<HTMLDivElement>(
                `#editor_block_${currRootRow?.id}`
              );
              const rowDOM = rootDOM?.querySelector<HTMLDivElement>(
                `[data-row-id="${targetRow.id}"]`
              );
              if (!rowDOM || !rootParentDOM) {
                return null;
              }
              const rows = getAllRowsFromGridsData(targetRow.children || []);
              return rows.map(row => {
                const cellDOM = rootDOM?.querySelector<HTMLDivElement>(
                  `[data-row-id="${row.id}"]`
                );
                if (cellDOM) {
                  return (
                    <HighlightItem
                      key={row.id}
                      targetDOM={cellDOM}
                      hideOperator={widgetStateV2.hideOperator || false}
                      parentDOM={rootParentDOM}
                    />
                  );
                }
                return null;
              });
            })()}
          </div>
        )}
      </div>
    );
  };

  const renderUserIndicator = () => {
    const userEditorSetting = worksStore.worksData.gridProps.userEditorSetting;
    const { blockSelectable = false } = userEditorSetting || {};
    const isWebsite = canvaInfo.isWebsite;
    // 普通用户
    return (
      <IndicatorRoot
        className={cn('IndicatorContainerForUser')}
        color={color}
        opacity={opacity}
      >
        {!isWebsite && <Watermark worksId={worksDetail?.id || ''} />}
        <div
          className={cn(
            'block_indicator indicator_outline_container use_border',
            (!blockSelectable || widgetStateV2.hideOperator) && 'status_hidden',
            isSelectedBlock ? 'active' : '',
            !editingElemId ? 'active' : '',
            'component_indicator'
            // 'hide_operator'
          )}
          ref={blockRef}
          data-active-id={currRootRow?.id}
        >
          {blockSelectable && typeof activeRowDepth?.[0] === 'number' && (
            <IndicatorContent
              position='top'
              visiable={isActiveBlock && !editingElemId}
              key={currRootRow?.id || 'block'}
            >
              <SettingElemWrapper>
                <SettingRowV3Pop showBtnText={true} />
              </SettingElemWrapper>
            </IndicatorContent>
          )}
          {renderRowsOnlyInComponentIndicators()}
          {renderChildElemsIndicators()}

          {canvaInfo.isFlatPage && (
            <IndicatorContent
              position='bottom'
              visiable={isActiveBlock && !editingElemId}
              key={currRootRow?.id || 'block'}
            >
              <SettingElemWrapper>
                <>
                  <ChangeComponentTriggerDialog
                    activeRow={currRootRow}
                    clickToActiveRow={false}
                    replaceCurrentRow={false}
                    showAllComponent={true}
                    dataType='blocks'
                    dialogTitle={t('插入版式')}
                    trigger={(open, setOpen) => {
                      return (
                        <BtnLite
                          onClick={e => {
                            setOpen(true);
                          }}
                        >
                          <Plus size={20} />
                          {t('插入版式')}
                        </BtnLite>
                      );
                    }}
                  />
                </>
              </SettingElemWrapper>
            </IndicatorContent>
          )}
        </div>
        <div
          className={cn(
            'parent_row_indicator row_indicator indicator_outline_container ',
            ((!isComponent && !isTableOrList) || widgetStateV2.hideOperator) &&
            'status_hidden',
            isSelectedRow ? 'selected' : '',
            isActiveRow ? 'active' : '',
            (isComponent || isTableOrList) && 'component_indicator'
          )}
          ref={rowRef}
          data-active-id={activeRowId}
        >
          <IndicatorContent position='top' key={activeRowId || 'row'}>
            <SettingElemWrapper>
              <SettingRowV3Pop showBtnText={true} />
            </SettingElemWrapper>
          </IndicatorContent>
          {/* {isComponent && (
            <div
              className={cn('indicator_content at_bottom')}
              onClick={e => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onMouseDown={e => {
                e.stopPropagation();
              }}
            >
              <SettingElemWrapper>
                <>
                  <ChangeComponentTriggerDialog
                    clickToActiveRow={false}
                    replaceCurrentRow={false}
                    showAllComponent={true}
                    dialogTitle={t('插入版式')}
                    trigger={(open, setOpen) => {
                      return (
                        <BtnLite
                          onClick={e => {
                            setOpen(true);
                          }}
                        >
                          <Plus size={20} />
                          {t('插入版式')}
                        </BtnLite>
                      );
                    }}
                  />
                </>
              </SettingElemWrapper>
            </div>
          )} */}
        </div>
        <div
          className={cn(
            'elem_indicator indicator_outline_container',
            widgetStateV2.hideOperator && 'status_hidden',
            isEditingFreeElem ? 'free' : '',
            !!editingElemId ? 'selected active' : ''
          )}
          ref={elemRef}
          data-active-id={editingElemId}
        >
          <IndicatorContent position='top' key={editingElemId || 'elem'}>
            <SettingElemWrapper>
              <SettingElemV3Pop
                onUpdate={() => {
                  setTimeout(() => {
                    resetRefStyle();
                  }, 10);
                }}
              />
              {renderElemTransformBtn()}
            </SettingElemWrapper>
          </IndicatorContent>
          {/* 右下角缩放按钮 */}
          {/* {editingElemId && (
            <div
              className='absolute bottom-0 right-0 pointer-events-auto z-[223]'
              style={{
                transform: 'translate(50%, 50%)',
              }}
              onClick={e => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onMouseDown={e => {
                e.stopPropagation();
              }}
            >
              {renderElemScaleBtn()}
            </div>
          )} */}
          {/* <IndicatorContent position='bottom' sticky={false}>
            <AddElementPopover />
          </IndicatorContent> */}
        </div>

        {worksStore.inEditor &&
          ReactDOM.createPortal(
            <SettingWidgetV4
              onUpdate={() => {
                setTimeout(() => {
                  resetRefStyle();
                }, 10);
              }}
            />,
            document.body
          )}
      </IndicatorRoot>
    );
  };

  const renderUserIndicatorForPc = () => {
    const userEditorSetting = worksStore.worksData.gridProps.userEditorSetting;
    const { blockSelectable = false } = userEditorSetting || {};
    const isWebsite = canvaInfo.isWebsite;
    const activeRow = getActiveRow();
    // 普通用户
    return (
      <IndicatorRoot
        className={cn('IndicatorContainerForUser')}
        color={color}
        opacity={opacity}
      >
        {!isWebsite && <Watermark worksId={worksDetail?.id || ''} />}
        <div
          className={cn('hover_indicator indicator_outline_container')}
          ref={hoverRef}
        ></div>
        <div
          className={cn(
            'block_indicator indicator_outline_container use_border',
            (!blockSelectable || widgetStateV2.hideOperator) && 'status_hidden',
            isSelectedBlock ? 'active' : '',
            !editingElemId ? 'active' : '',
            'component_indicator'
            // 'hide_operator'
          )}
          ref={blockRef}
          data-active-id={currRootRow?.id}
        >
          {blockSelectable && typeof activeRowDepth?.[0] === 'number' && (
            <IndicatorContent
              position='top'
              visiable={isActiveBlock && !editingElemId}
              key={currRootRow?.id || 'block'}
            >
              <SettingElemWrapper>
                <SettingRowV3Pop showBtnText={true} />
              </SettingElemWrapper>
            </IndicatorContent>
          )}
          {renderRowsOnlyInComponentIndicators()}
          {renderChildElemsIndicators()}

          {canvaInfo.isFlatPage && (
            <IndicatorContent
              position='bottom'
              visiable={isActiveBlock && !editingElemId}
              key={currRootRow?.id || 'block'}
            >
              <SettingElemWrapper>
                <>
                  <ChangeComponentTriggerDialog
                    activeRow={currRootRow}
                    clickToActiveRow={false}
                    replaceCurrentRow={false}
                    showAllComponent={true}
                    dataType='blocks'
                    dialogTitle={t('插入版式')}
                    trigger={(open, setOpen) => {
                      return (
                        <BtnLite
                          onClick={e => {
                            setOpen(true);
                          }}
                        >
                          <Plus size={20} />
                          {t('插入版式')}
                        </BtnLite>
                      );
                    }}
                  />
                </>
              </SettingElemWrapper>
            </IndicatorContent>
          )}
        </div>
        <div
          className={cn(
            'parent_row_indicator row_indicator indicator_outline_container ',
            ((!isComponent && !isTableOrList) || widgetStateV2.hideOperator) &&
            'status_hidden',
            isSelectedRow ? 'selected' : '',
            isActiveRow ? 'active' : '',
            (isComponent || isTableOrList) && 'component_indicator'
          )}
          ref={rowRef}
          data-active-id={activeRowId}
        >
          <IndicatorContent position='top' key={activeRowId || 'row'}>
            <SettingElemWrapper>
              <SettingRowV3Pop showBtnText={true} />
              {/* {renderRowTransformBtn()} */}
            </SettingElemWrapper>
          </IndicatorContent>
        </div>
        <div
          className={cn(
            'parent_row_indicator row_indicator indicator_outline_container',
            widgetStateV2.hideOperator && 'status_hidden',
            isSelectedRow ? 'selected' : '',
            isActiveRow ? 'active' : '',
            isComponent && 'component_indicator'
          )}
          ref={rowRef}
          data-active-id={activeRowId}
        >
          {isActiveRow && (
            <div
              className='row_tip indicator_tip'
              style={{ backgroundColor: isComponent ? '#9747ff' : '' }}
            >
              <span>{t('组合')}</span>
            </div>
          )}

          <IndicatorContent position='top'>
            <SettingElemWrapper>
              {/* {renderAddBtn()} */}
              {activeRowId && <SettingRow currRowId={activeRowId} title={t('行')} />}
              {/* {renderRowTransformBtn()} */}
            </SettingElemWrapper>
          </IndicatorContent>
        </div>
        {/* {renderChildrenIndicators(activeRow, false)} */}
        <div
          className={cn(
            'elem_indicator indicator_outline_container',
            widgetStateV2.hideOperator && 'status_hidden',
            isEditingFreeElem ? 'free' : '',
            !!editingElemId ? 'selected active' : ''
          )}
          ref={elemRef}
          data-active-id={editingElemId}
        >
          <IndicatorContent position='top' key={editingElemId || 'elem'}>
            <SettingElemWrapper>
              <SettingElemV3Pop
                onUpdate={() => {
                  setTimeout(() => {
                    resetRefStyle();
                  }, 10);
                }}
              />
              {renderElemTransformBtn()}
            </SettingElemWrapper>
          </IndicatorContent>
          {/* <IndicatorContent position='bottom' sticky={false}>
            <AddElementPopover />
          </IndicatorContent> */}
        </div>

        {worksStore.inEditor &&
          ReactDOM.createPortal(
            <SettingWidgetV4
              onUpdate={() => {
                setTimeout(() => {
                  resetRefStyle();
                }, 10);
              }}
            />,
            document.body
          )}
      </IndicatorRoot>
    );
  };
  const renderIndicatorForDesigner = () => {
    const getLayerName = (elementRef: string) => {
      if (/picture/gi.test(elementRef)) {
        return t('图片');
      }
      if (/text/gi.test(elementRef)) {
        return t('文字');
      }
      return elementRef;
    };
    const renderElemTip = () => {
      if (!editingElemId) {
        return null;
      }
      const layer = worksStore.getLayer(editingElemId);
      const isPictire = /picture/gi.test(layer?.elementRef || '');
      return (
        <div className='elem_tip indicator_tip whitespace-nowrap'>
          <span>{getLayerName(layer?.elementRef || '')}</span>
          {isPictire && (
            <span>
              {layer?.attrs?.originBaseW}x{layer?.attrs?.originBaseH}px
            </span>
          )}
        </div>
      );
    };
    return (
      <IndicatorRoot
        className={cn(
          'IndicatorContainerForDesigner',
          widgetStateV2.hideOperator && 'status_hidden'
        )}
        color={color}
        opacity={opacity}
      >
        {!widgetStateV2.hideOperator && (
          <MarginPaddingIndicatorV2
            key={`MarginPaddingIndicator_${activeRowId || ''}_${editingElemId || ''}`}
            targetElement={getOperateTargetDOM() || null}
            widgetState={widgetStateV2}
          />
        )}
        <div
          className={cn('hover_indicator indicator_outline_container')}
          ref={hoverRef}
        ></div>
        {renderChildrenIndicators(currRootRow)}
        <div
          className={cn(
            'parent_row_indicator row_indicator indicator_outline_container',
            widgetStateV2.hideOperator && 'status_hidden',
            isSelectedRow ? 'selected' : '',
            isActiveRow ? 'active' : '',
            isComponent && 'component_indicator'
          )}
          ref={rowRef}
          data-active-id={activeRowId}
        >
          {isActiveRow && (
            <div
              className='row_tip indicator_tip'
              style={{ backgroundColor: isComponent ? '#9747ff' : '' }}
            >
              <span>{getRowName(currRow, activeRowDepth)}</span>
            </div>
          )}

          <IndicatorContent position='top'>
            <SettingElemWrapper>
              {/* {renderAddBtn()} */}
              {activeRowId && <SettingRow currRowId={activeRowId} title={t('行')} />}
            </SettingElemWrapper>
          </IndicatorContent>
        </div>
        <div
          className={cn(
            'elem_indicator indicator_outline_container',
            widgetStateV2.hideOperator && 'status_hidden',
            isEditingFreeElem ? 'free' : '',
            !!editingElemId ? 'selected active' : ''
          )}
          ref={elemRef}
          data-active-id={editingElemId}
        >
          {renderElemTip()}
          <IndicatorContent position='top'>
            {!isDragging && (
              <SettingElemWrapper>
                <SettingElemDesigner />
                {fullStack && renderElemTransformBtn()}
              </SettingElemWrapper>
            )}
            <div className='flex items-center justify-center pointer-events-none'>
              <div className='flex items-center justify-center pointer-events-auto gap-2'></div>
            </div>
          </IndicatorContent>
        </div>
      </IndicatorRoot>
    );
  };

  if (!fullStack) {
    if (isPc()) {
      return renderUserIndicatorForPc();
    }
    return renderUserIndicator();
  }

  return rootDOM ? (
    ReactDOM.createPortal(renderIndicatorForDesigner(), rootDOM)
  ) : (
    <></>
  );
};

export default observer(IndicatorDesignerV2);

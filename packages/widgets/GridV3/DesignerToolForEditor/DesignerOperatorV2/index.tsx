import styled from '@emotion/styled';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import clas from 'classnames';
import {
  Columns2,
  Component,
  Heading,
  ImageIcon,
  Move,
  Plus,
  Type,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { toast } from 'react-hot-toast';
import { useHideOnScroll } from '../../comp/hooks/useHideOnScroll';
import { useGridContext } from '../../comp/provider';
import { getCanvaInfo2 } from '../../comp/provider/utils';
import { calcViewerHeight } from '../../comp/utils';
import { calculateIndicatorPosition } from '../../comp/utils/indicatorPosition';
import { getRowName } from '../../shared';
import { BtnLite } from '../../shared/style-comps';
import { GridRow } from '../../shared/types';
import DragToChangeMarginBtn from './DragToChangeMarginBtn';
import Guidelines from './Guidelines/Guidelines';
import MarginPaddingIndicatorV2 from './MarginPaddingIndicatorV2';
import { SettingElemDesigner } from './SettingPopoverV2/SettingElemDesigner';
import { SettingRow } from './SettingPopoverV2/SettingRow';
import { ChangeComponentTriggerDialog } from './SettingPopoverV3/ChangeComponentTrigger';
import { SettingElemV3Pop } from './SettingPopoverV3/SettingElemV3Pop';
import { SettingRowV3Pop } from './SettingPopoverV3/SettingRowV3Pop';
import SettingWidgetV4 from './SettingPopoverV3/SettingWidgetV4';
import { addPictureDataFor2Pic } from './const';

const SettingElemWrapper = styled.div`
  display: flex;
  overflow: hidden;
  background-color: #fff;
  border-radius: 100px;
  box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.2);
  pointer-events: auto;
  /* margin-bottom: 4px; */
  padding: 0 8px;
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

// 添加元素按钮菜单
const AddElementPopover = () => {
  const [open, setOpen] = useState(false);
  const {
    addComponentV2,
    widgetStateV2,
    editorCtx,
    themeConfig,
    setWidgetStateV2,
    addRowFromTemplateV2,
  } = useGridContext();

  const handleAddElement = (item: {
    elementRef: string;
    attrs: any;
    link: any;
    action?: () => void;
  }) => {
    const { elementRef, attrs, link, action } = item;
    // 检查是否可以添加元素
    if (
      !widgetStateV2.activeRowDepth ||
      widgetStateV2.activeRowDepth.length <= 1
    ) {
      toast.error('不能直接添加元素到画布');
      return;
    }
    if (action) {
      action();
      setOpen(false);
      return;
    }

    if (elementRef === 'Text') {
      const compId = addComponentV2({
        layer: {
          elementRef,
          attrs,
        },
        link,
      });
      setWidgetStateV2({
        editingElemId: compId,
      });
      setOpen(false);
    } else if (elementRef === 'Picture') {
      editorCtx?.utils.showSelector({
        onSelected: (params: any) => {
          const { url, type, ossPath } = params;
          const compId = addComponentV2({
            layer: {
              elementRef,
              attrs: {
                ...attrs,
                ossPath,
              },
            },
            link,
          });
          setWidgetStateV2({
            editingElemId: compId,
          });
          setOpen(false);
        },
        type: 'picture',
      } as any);
    }
  };

  const menuItems = [
    {
      title: '标题',
      elementRef: 'Text',
      icon: <Heading size={20} />,
      attrs: {
        text: '标题',
        lineHeight: 1.5,
        textAlign: 'center',
      },
      displayStyle: themeConfig?.text_heading1,
      link: { tag: 'text_heading1' },
    },
    {
      title: '正文',
      elementRef: 'Text',
      icon: <Type size={20} />,
      attrs: {
        text: '正文',
        lineHeight: 1.5,
        textAlign: 'left',
      },
      displayStyle: themeConfig?.text_body,
      link: { tag: 'text_body' },
    },
    {
      title: '大图',
      elementRef: 'Picture',
      icon: <ImageIcon size={20} />,
      attrs: addPictureDataFor2Pic,
      displayStyle: themeConfig?.photo1,
      link: { tag: 'photo1' },
    },
    {
      title: '小图',
      elementRef: 'Picture',
      icon: <Columns2 size={20} />,
      attrs: addPictureDataFor2Pic,
      displayStyle: themeConfig?.photo2,
      link: { tag: 'photo2' },
      action: () => {
        const { copiedElemId, copiedRowDepth } = addRowFromTemplateV2(
          addPictureDataFor2Pic,
          {
            activeRowDepth: widgetStateV2.activeRowDepth,
            editingElemId: undefined,
          }
        );
        if (copiedElemId) {
          setWidgetStateV2({
            editingElemId: copiedElemId,
            activeRowDepth: copiedRowDepth,
          });
        }
      },
    },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <BtnLite
          className='sm'
          style={{
            padding: 0,
            backgroundColor: 'transparent',
            pointerEvents: 'auto',
          }}
        >
          <div className='border_icon sm bg-white'>
            <Plus size={20} />
          </div>
        </BtnLite>
      </PopoverTrigger>
      <PopoverContent className='w-auto p-2' align='center' side='bottom'>
        <div className='flex flex-col gap-1 min-w-[120px]'>
          {menuItems.map(item => (
            <BtnLite
              key={item.title}
              onClick={() => {
                handleAddElement(item);
              }}
            >
              <div className=''>{item.icon}</div>
              <span>{item.title}</span>
            </BtnLite>
          ))}
          <ChangeComponentTriggerDialog
            autoScroll={false}
            clickToActiveRow={false}
            widgetStateV2={{
              ...widgetStateV2,
              // 最多2层
              activeRowDepth: widgetStateV2.activeRowDepth?.slice(0, 2),
              editingElemId: undefined,
            }}
            showAllComponent={true}
            replaceCurrentRow={false}
            onChange={() => {
              setOpen(false);
            }}
            trigger={(open, setOpen) => {
              return (
                <BtnLite
                  onClick={() => {
                    setOpen(true);
                  }}
                >
                  <div className=''>
                    <Component size={20} />
                  </div>
                  <span>组合</span>
                </BtnLite>
              );
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
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
      className={clas(
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
  if (!visiable) {
    return null;
  }
  return (
    <div
      className={clas(
        'indicator_content',
        className,
        `at_${position}`,
        sticky && 'sticky'
      )}
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
  const {
    widgetStateV2,
    editorSDK,
    fullStack,
    getActiveRow,
    getActiveRootRow,
    clearActiveStatus,
    setWidgetStateV2,
    getRowByDepth,
  } = useGridContext();
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
    longScrollThreshold:
      typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
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
      const targetRow = (e.target as HTMLElement).closest(
        '.Row.hover_elem'
      ) as HTMLElement;
      const elemId = targetElem?.dataset.elemId;
      if (!targetRow && elemId === editingElemId) {
        return;
      }
      // console.log('targetElem', targetElem);
      if (targetElem && elemId !== editingElemId) {
        e.stopPropagation();
        e.preventDefault();
      }
      if (targetRow) {
        let rowDepth =
          targetElem?.dataset?.rowDepth ||
          (targetRow?.dataset?.rowDepth as any);
        try {
          rowDepth = JSON.parse(rowDepth);
        } catch (error) {
          console.log('targetRowError', error);
          rowDepth = [];
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
      selectElem(e);
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
  }, [JSON.stringify(widgetStateV2), rootDOM, activeRowId]);

  const getEditingItemStyle = () => {
    if (editingElemId) {
      const layer = editorSDK?.getLayer(editingElemId);
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

  const renderTransformBtn = () => {
    const layer = editorSDK?.getLayer(editingElemId || '');
    if (layer?.attrs?.absoluteElem) {
      return null;
    }
    const style = getEditingItemStyle();
    const { x, y } = parseTranslate(style?.transform);
    const _x = x;
    const _y = y;
    return (
      <DragToChangeMarginBtn
        label='平移'
        Icon={<Move size={16} />}
        valueX={_x}
        valueY={_y}
        onChange={(valueX, valueY) => {
          const targetDOM = getOperateTargetDOM();
          if (targetDOM) {
            const liveTransform =
              targetDOM.style.transform || style?.transform || '';
            Object.assign(targetDOM.style, {
              transform: buildTransformWithTranslate(
                liveTransform,
                valueX,
                valueY
              ),
            });
          }
        }}
        onDragDone={(valueX, valueY) => {
          // 对元素（editingElemId）使用样式为基准，避免读取实时 DOM 引起偏差
          if (editingElemId) {
            const newTransform = buildTransformWithTranslate(
              style?.transform,
              valueX,
              valueY
            );
            setEditingItemStyle({ transform: newTransform });
            setIsDragging(false);
            return;
          }
          // 行/格子的实时 DOM transform 作为基准更准确
          const targetDOM = getOperateTargetDOM();
          const persistedTransform = targetDOM?.style?.transform;
          const next = persistedTransform
            ? persistedTransform
            : buildTransformWithTranslate(style?.transform, valueX, valueY);
          setEditingItemStyle({ transform: next });
          setIsDragging(false);
        }}
        onDragStart={() => {
          setIsDragging(true);
        }}
      />
    );
  };

  const setEditingItemStyle = (nextStyle: any) => {
    const style = getEditingItemStyle();
    if (editingElemId) {
      editorSDK?.changeCompAttr(editingElemId, {
        layoutStyle: {
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
    editingElemId && editorSDK?.getLayer(editingElemId)?.attrs?.absoluteElem
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
              {/* <div
                className='absolute top-0 left-0 pointer-events-auto'
                onClick={() => {
                  console.log('换版式');
                }}
              >
                换版式
              </div> */}
            </HighlightItem>
          );
        })}
      </div>
    );
  };

  const renderUserIndicator = () => {
    // 普通用户
    return (
      <IndicatorRoot
        className={clas('IndicatorContainerForUser')}
        color={color}
        opacity={opacity}
      >
        <div
          className={clas(
            'block_indicator indicator_outline_container use_border',
            widgetStateV2.hideOperator && 'status_hidden',
            isSelectedBlock ? 'active' : '',
            !editingElemId ? 'active' : '',
            'component_indicator'
            // 'hide_operator'
          )}
          ref={blockRef}
          data-active-id={currRootRow?.id}
        >
          {typeof activeRowDepth?.[0] === 'number' && (
            <IndicatorContent
              position='top'
              visiable={isActiveBlock && !editingElemId}
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
            >
              <SettingElemWrapper>
                <>
                  <ChangeComponentTriggerDialog
                    activeRow={currRootRow}
                    clickToActiveRow={false}
                    replaceCurrentRow={false}
                    showAllComponent={true}
                    dataType='blocks'
                    dialogTitle='插入版式'
                    trigger={(open, setOpen) => {
                      return (
                        <BtnLite
                          onClick={e => {
                            setOpen(true);
                          }}
                        >
                          <Plus size={20} />
                          插入版式
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
          className={clas(
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
          <IndicatorContent position='top'>
            <SettingElemWrapper>
              <SettingRowV3Pop showBtnText={true} />
            </SettingElemWrapper>
          </IndicatorContent>
          {/* {isComponent && (
            <div
              className={clas('indicator_content at_bottom')}
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
                    dialogTitle='插入版式'
                    trigger={(open, setOpen) => {
                      return (
                        <BtnLite
                          onClick={e => {
                            setOpen(true);
                          }}
                        >
                          <Plus size={20} />
                          插入版式
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
          className={clas(
            'elem_indicator indicator_outline_container',
            widgetStateV2.hideOperator && 'status_hidden',
            isEditingFreeElem ? 'free' : '',
            !!editingElemId ? 'selected active' : ''
          )}
          ref={elemRef}
          data-active-id={editingElemId}
        >
          <IndicatorContent position='top'>
            <SettingElemWrapper>
              <SettingElemV3Pop />
            </SettingElemWrapper>
          </IndicatorContent>
          <IndicatorContent position='bottom' sticky={false}>
            <AddElementPopover />
          </IndicatorContent>
        </div>
        {!widgetStateV2.hideOperator &&
          ReactDOM.createPortal(
            <SettingWidgetV4
              onUpdate={() => {
                setTimeout(() => {
                  resetRefStyle();
                }, 10);
              }}
            />,
            document.querySelector('#editor_container') || document.body
          )}
      </IndicatorRoot>
    );
  };

  if (!fullStack) {
    return renderUserIndicator();
  }

  const getLayerName = (elementRef: string) => {
    if (/picture/gi.test(elementRef)) {
      return '图片';
    }
    if (/text/gi.test(elementRef)) {
      return '文字';
    }
    return elementRef;
  };
  const renderElemTip = () => {
    if (!editingElemId) {
      return null;
    }
    const layer = editorSDK?.getLayer(editingElemId);
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

  return rootDOM ? (
    ReactDOM.createPortal(
      <>
        <IndicatorRoot
          className={clas(
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
            className={clas('hover_indicator indicator_outline_container')}
            ref={hoverRef}
          ></div>
          <div
            className={clas(
              'block_indicator indicator_outline_container',
              widgetStateV2.hideOperator && 'status_hidden',
              isSelectedBlock ? 'selected' : '',
              isActiveBlock ? 'active' : ''
            )}
            ref={blockRef}
          >
            <Guidelines />
            {currRootRow && (
              <div className='child_cells_indicators'>
                {(() => {
                  const rows = getAllRowsFromGridsData(
                    currRootRow.children || []
                  );
                  const rowDOM = rootDOM?.querySelector<HTMLDivElement>(
                    `#editor_block_${currRootRow.id}`
                  );
                  return rows.map(row => {
                    const cellDOM = rootDOM?.querySelector<HTMLDivElement>(
                      `#editor_row_${row.id}`
                    );
                    if (cellDOM && rowDOM) {
                      return (
                        <HighlightItem
                          key={row.id}
                          targetDOM={cellDOM}
                          hideOperator={widgetStateV2.hideOperator || false}
                          parentDOM={rowDOM}
                        />
                      );
                    }
                    return null;
                  });
                })()}
              </div>
            )}
          </div>
          <div
            className={clas(
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
                {activeRowId && (
                  <SettingRow currRowId={activeRowId} title='行' />
                )}
              </SettingElemWrapper>
            </IndicatorContent>
          </div>
          <div
            className={clas(
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
                  {fullStack && renderTransformBtn()}
                </SettingElemWrapper>
              )}
              <div className='flex items-center justify-center pointer-events-none'>
                <div className='flex items-center justify-center pointer-events-auto gap-2'></div>
              </div>
            </IndicatorContent>
          </div>
        </IndicatorRoot>
      </>,
      rootDOM
    )
  ) : (
    <></>
  );
};

export default IndicatorDesignerV2;

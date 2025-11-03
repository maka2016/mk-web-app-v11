import React, { useState, useRef, useEffect } from 'react';
// import { AlignLines } from "./AlignLines";
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';
import clas from 'classnames';
import { calculateIndicatorPosition } from '../../comp/utils/indicatorPosition';
import { SettingElemDesigner } from './SettingPopover/SettingElemDesigner';
import { useGridContext } from '../../comp/provider';
import { SettingRow } from './SettingPopover/SettingRow';
import { SettingCell } from './SettingPopover/SettingCell';
import { BtnLite } from '../../shared/style-comps';
import { SeparatorHorizontal, Plus, Move } from 'lucide-react';
import {
  numberChunkValueToString,
  stringValueTo4Chunk,
} from '../ElementAttrsEditor/utils';
import MarginPaddingIndicator from './MarginPaddingIndicator';
import DragSortHandler from './DragSortHandler';
import Guidelines from './Guidelines/Guidelines';

const SettingElemWrapper = styled.div`
  display: flex;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.1);
  pointer-events: auto;
  margin-bottom: 4px;
`;

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

  .indicator {
    position: absolute;
    pointer-events: none;
    /* color: #fff; */
    /* background-color: #1a87ff09; */
    visibility: hidden;
    &.active {
      outline: 1px solid #1a87ff;
      visibility: visible;
      .indicator_content {
        visibility: visible;
      }
    }
    &.selected {
      outline: 1px solid #1a87ff;
      visibility: visible;
    }
  }
  .block_indicator {
    box-shadow: inset 0px 1px 1px #1a87ff;
  }

  .child_cells_indicators {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 5; /* Ensure it's below the main row indicator but above content */
  }

  .cell_child_indicator {
    visibility: visible !important;
    background-color: rgba(26, 135, 255, 0.03); /* Light blue background */
  }
  /* 自由元素选中/激活时的边框颜色覆盖 */
  .elem_indicator.free.active,
  .elem_indicator.free.selected {
    outline: 1px solid #ff9f0a;
  }
  .indicator_content {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translate(-50%, -110%);
    z-index: 20;
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: fit-content;
    pointer-events: none;
    visibility: hidden;
    .at_left {
      left: 0;
      transform: translate(-100%, -110%);
    }
  }
`;

interface Props {
  useBg?: boolean;
  color?: string;
  opacity?: number;
}

const AddItemV3 = () => {
  const { editorSDK } = useGridContext();

  return (
    <>
      <BtnLite
        className='action_btn pointer-events-auto'
        style={{
          padding: '2px',
        }}
        onClick={() => {
          editorSDK?.changeWidgetState({
            isAddModalShow: true,
          });
        }}
      >
        <Plus size={20} />
      </BtnLite>
    </>
  );
};

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

const IndicatorDesigner = (props: Props) => {
  const {
    widgetState,
    editorSDK,
    cellsMap,
    clearActiveStatus,
    changeCellAttrs,
    changeRowAttrs,
    moveElemByIndex,
    moveRowByIndex,
    moveCellByIndex,
  } = useGridContext();
  const { activeRowId, activeCellId, editingElemId } = widgetState;
  const [isDragging, setIsDragging] = useState(false);
  // const [focusTick, _focusUpdate] = useState(0);
  // const focusUpdate = () => _focusUpdate((prev) => prev + 1);
  const currBlockId = cellsMap.find(
    row => row.id === activeRowId
  )?.groupByRowId;
  const {
    useBg = false,
    // color = "var(--theme-color, #1a87ff)",
    color = '#1a87ff',
    opacity = 1,
  } = props;

  const blockRef = useRef<any>(null);
  const rowRef = useRef<any>(null);
  const cellRef = useRef<any>(null);
  const elemRef = useRef<any>(null);

  const updateRefStyle = (targetDomId: string, updateRef: any) => {
    const targetDOM = document.querySelector(`#id-canvas ${targetDomId}`);
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

  const resetRefStyle = React.useCallback(() => {
    // 设置row
    updateRefStyle(`#block_${currBlockId}`, blockRef);
    // 设置row
    updateRefStyle(`#editor_row_${activeRowId}`, rowRef);
    // 设置cell
    updateRefStyle(`#editor_cell_${activeCellId}`, cellRef);
    // 设置elem
    updateRefStyle(`#layer_root_${editingElemId}`, elemRef);

    // No need for extra handling here as we're calculating positions directly in the render function
  }, [currBlockId, activeRowId, activeCellId, editingElemId]);

  const getOperateTargetDOM = () => {
    if (editingElemId) {
      return document.querySelector<HTMLElement>(
        `#layer_root_${editingElemId}`
      );
    } else if (activeCellId) {
      return document.querySelector<HTMLElement>(
        `#editor_cell_${activeCellId}`
      );
    } else if (activeRowId) {
      return document.querySelector<HTMLElement>(`#editor_row_${activeRowId}`);
    }
    return null;
  };
  const targetRootDOM = document.querySelector<HTMLElement>(
    '#designer_canvas_container'
  );

  /** 设置当前元素 */
  useEffect(() => {
    resetRefStyle();
    const handleMouseUp = (e: any) => {
      handleRootClick(e);
      setIsDragging(false);
      resetRefStyle();
    };
    const handleMouseDown = (e: MouseEvent) => {
      // 检查是否点击的是indicator_content元素或其子元素
      const target = e.target as HTMLElement;
      if (target.closest('.indicator_content')) {
        return; // 如果是indicator_content，不设置拖拽状态
      }
      setIsDragging(true);
    };
    const handleRootClick = (e: any) => {
      const target = e.target as HTMLElement;
      if (target.id === 'designer_canvas_container') {
        clearActiveStatus();
      }
    };
    const rootDOM = document.querySelector<HTMLElement>(
      '#designer_canvas_container'
    );
    if (rootDOM) {
      rootDOM.addEventListener('mouseup', handleMouseUp);
      rootDOM.addEventListener('mousedown', handleMouseDown);
      rootDOM.addEventListener('keyup', handleMouseUp);
    }
    return () => {
      rootDOM?.removeEventListener('mouseup', handleMouseUp);
      rootDOM?.removeEventListener('mousedown', handleMouseDown);
      rootDOM?.removeEventListener('keyup', handleMouseUp);
    };
  }, [cellsMap, widgetState, clearActiveStatus, resetRefStyle]);

  const getEditingItemStyle = () => {
    if (editingElemId) {
      const layer = editorSDK?.getLayer(editingElemId);
      if (layer) {
        return layer.attrs?.layoutStyle || {};
      }
    } else if (activeCellId) {
      const row = cellsMap.find(row => row.id === activeRowId);
      if (row?.isRepeatList) {
        return row.repeatItemTemplate?.style || {};
      }
      const cell = row?.cells.find(cell => cell.id === activeCellId);
      if (cell) {
        return cell.style || {};
      }
    } else if (activeRowId) {
      const row = cellsMap.find(row => row.id === activeRowId);
      if (row) {
        return row.style || {};
      }
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
    return (
      <DragToChangeMarginBtn
        label='平移'
        Icon={<Move size={16} />}
        valueX={x}
        valueY={y}
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
    } else if (activeCellId && activeRowId) {
      const row = cellsMap.find(row => row.id === activeRowId);
      if (row?.isRepeatList) {
        changeRowAttrs({
          repeatItemTemplate: {
            style: {
              ...(row?.repeatItemTemplate?.style || {}),
              ...nextStyle,
            },
          },
        });
      } else {
        changeCellAttrs({
          style: {
            ...style,
            ...nextStyle,
          },
        });
      }
      setTimeout(() => {
        resetRefStyle();
      }, 100);
    } else if (activeRowId) {
      changeRowAttrs({
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

  const renderMarginBtn = () => {
    const style = getEditingItemStyle();
    const layer = editorSDK?.getLayer(editingElemId || '');
    if (layer?.attrs?.absoluteElem) {
      return null;
    }
    const [marginTop, marginRight, marginBottom, marginLeft] =
      stringValueTo4Chunk(style?.margin || '') || [];
    return (
      <DragToChangeMarginBtn
        valueX={marginLeft || 0}
        valueY={marginTop || 0}
        onDragStart={() => {
          setIsDragging(true);
        }}
        onChange={(valueX, valueY) => {
          const targetDOM = getOperateTargetDOM();
          if (targetDOM) {
            // calculateIndicatorPosition(targetDOM, targetDOM, false);
            Object.assign(targetDOM.style, {
              margin: numberChunkValueToString([
                valueY,
                marginRight ?? 0,
                marginBottom ?? 0,
                valueX,
              ]),
            });
          }
        }}
        onDragDone={(valueX, valueY) => {
          setEditingItemStyle({
            margin: numberChunkValueToString([
              valueY,
              marginRight ?? 0,
              marginBottom ?? 0,
              valueX,
            ]),
          });
          setIsDragging(false);
        }}
      />
    );
  };
  const isSelectedRow = !!activeRowId || !!editingElemId || !!activeCellId;
  const isSelectedCell = !!activeCellId || !!editingElemId;
  // const isSelectedElem = !editingElemId;

  const isActiveRow = !!activeRowId && !editingElemId && !activeCellId;
  const isActiveCell = !!activeCellId && !editingElemId;
  const isActiveElem = !!editingElemId;
  const isEditingFreeElem = !!(
    editingElemId && editorSDK?.getLayer(editingElemId)?.attrs?.absoluteElem
  );

  return targetRootDOM ? (
    ReactDOM.createPortal(
      <>
        {/* <AlignLines target={alignTarget} /> */}
        <IndicatorRoot
          className={clas(
            'DesignerIndicatorContainerForActive',
            useBg ? 'use_bg' : ''
          )}
          color={color}
          opacity={opacity}
        >
          {/* 外边距内边距显示外挂 */}
          <MarginPaddingIndicator
            key={`MarginPaddingIndicator_${activeRowId || ''}_${activeCellId || ''}_${editingElemId || ''}`}
            targetElement={getOperateTargetDOM()}
            widgetState={widgetState}
          />
          <div className={clas('block_indicator indicator')} ref={blockRef}>
            <Guidelines />
          </div>
          <div
            className={clas(
              'row_indicator indicator',
              isSelectedRow ? 'selected' : '',
              isActiveRow ? 'active' : ''
            )}
            ref={rowRef}
            data-active-id={activeRowId}
          >
            <DragSortHandler
              type='grid'
              targetId={activeRowId || ''}
              domSelector={id => `#editor_row_${id}`}
              onSortEnd={({ dragId, actualTargetIndex }) => {
                const targetBlockId = cellsMap[actualTargetIndex]?.groupByRowId;
                moveRowByIndex(dragId, actualTargetIndex, targetBlockId);
              }}
              isActive={isActiveRow}
              optionHandlerPosition='left'
              themeColor={isEditingFreeElem ? '#ff9f0a' : undefined}
              onOptionHandlerClick={() => {
                editorSDK?.changeWidgetState({
                  activeRowId: activeRowId,
                  activeCellId: undefined,
                  editingElemId: undefined,
                });
              }}
            />
            {/* Render indicators for all child cells when row is selected */}
            {isActiveRow && currBlockId && activeRowId && (
              <div className='child_cells_indicators'>
                {cellsMap
                  .find(row => row.id === activeRowId)
                  ?.cells.map(cell => {
                    const cellDOM = document.querySelector(
                      `#editor_cell_${cell.id}`
                    );
                    if (cellDOM) {
                      return (
                        <div
                          key={cell.id}
                          className='cell_child_indicator indicator'
                          style={{
                            position: 'absolute',
                            outline: '1px dashed #1a87ff',
                            pointerEvents: 'none',
                          }}
                          ref={el => {
                            if (el) {
                              const rowDOM = document.querySelector(
                                `#editor_row_${activeRowId}`
                              ) as HTMLElement;
                              const cellRect = cellDOM.getBoundingClientRect();
                              const rowRect = rowDOM?.getBoundingClientRect();

                              if (rowRect && cellRect) {
                                // Calculate position relative to the row with pixel-perfect adjustment
                                // Apply 1px offset correction for exact alignment
                                el.style.top = `${Math.floor(cellRect.top - rowRect.top)}px`;
                                el.style.left = `${Math.floor(cellRect.left - rowRect.left)}px`;
                                el.style.width = `${Math.ceil(cellRect.width)}px`;
                                el.style.height = `${Math.ceil(cellRect.height)}px`;
                              }
                            }
                          }}
                        />
                      );
                    }
                    return null;
                  })}
              </div>
            )}
            <div
              className={clas('indicator_content at_left')}
              onClick={e => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onMouseDown={e => {
                e.stopPropagation();
              }}
            >
              <SettingElemWrapper>
                {activeRowId && (
                  <SettingRow currRowId={activeRowId} title='行' />
                )}
              </SettingElemWrapper>
              <div className='flex items-center justify-center pointer-events-none'>
                <div className='flex items-center justify-center pointer-events-auto gap-2'>
                  <AddItemV3 />
                  {renderMarginBtn()}
                  {renderTransformBtn()}
                </div>
              </div>
            </div>
          </div>
          <div
            className={clas(
              'cell_indicator indicator',
              isSelectedCell ? 'selected' : '',
              isActiveCell ? 'active' : ''
            )}
            ref={cellRef}
            data-active-id={activeCellId}
          >
            <DragSortHandler
              type='cell'
              targetId={activeCellId || ''}
              domSelector={id => `#editor_cell_${id}`}
              onSortEnd={({ dragId, actualTargetIndex }) => {
                moveCellByIndex(dragId, actualTargetIndex);
              }}
              isActive={isActiveCell}
              optionHandlerPosition='top'
              themeColor={isEditingFreeElem ? '#ff9f0a' : undefined}
              onOptionHandlerClick={() => {
                editorSDK?.changeWidgetState({
                  activeRowId: activeRowId,
                  activeCellId: activeCellId,
                  editingElemId: undefined,
                });
              }}
            />
            <div
              className={clas('indicator_content')}
              onClick={e => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onMouseDown={e => {
                e.stopPropagation();
              }}
            >
              <SettingElemWrapper>
                <SettingCell />
              </SettingElemWrapper>
              <div className='flex items-center justify-center pointer-events-none'>
                <div className='flex items-center justify-center pointer-events-auto gap-2'>
                  <AddItemV3 />
                  {renderMarginBtn()}
                  {renderTransformBtn()}
                </div>
              </div>
            </div>
          </div>
          <div
            className={clas(
              'elem_indicator indicator',
              isEditingFreeElem ? 'free' : '',
              !isDragging && !!editingElemId ? 'selected active' : ''
            )}
            ref={elemRef}
            data-active-id={editingElemId}
          >
            <DragSortHandler
              type='element'
              targetId={editingElemId || ''}
              domSelector={id => `#layer_root_${id}`}
              onSortEnd={({ dragId, actualTargetIndex }) => {
                moveElemByIndex(dragId, actualTargetIndex);
              }}
              isActive={isActiveElem}
              optionHandlerPosition='left'
              themeColor={isEditingFreeElem ? '#ff9f0a' : undefined}
              onOptionHandlerClick={() => {
                editorSDK?.changeWidgetState({
                  activeRowId: activeRowId,
                  activeCellId: activeCellId,
                  editingElemId: editingElemId,
                });
              }}
            />
            <div
              className={clas('indicator_content')}
              onClick={e => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onMouseDown={e => {
                e.stopPropagation();
              }}
            >
              <SettingElemWrapper>
                <SettingElemDesigner />
              </SettingElemWrapper>
              <div className='flex items-center justify-center pointer-events-none'>
                <div className='flex items-center justify-center pointer-events-auto gap-2'>
                  <AddItemV3 />
                  {renderMarginBtn()}
                  {renderTransformBtn()}
                </div>
              </div>
            </div>
          </div>
        </IndicatorRoot>
      </>,
      targetRootDOM
    )
  ) : (
    <></>
  );
};

/**
 * 网格v1版本指示器，2025年8月14日已归档，不再修改
 * @deprecated
 */
export default IndicatorDesigner;

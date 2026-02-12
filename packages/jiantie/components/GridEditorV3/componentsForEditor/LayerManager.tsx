import { LayerElemItem } from '@/components/GridEditorV3/works-store/types';
import { cdnApi } from '@/services';
import styled from '@emotion/styled';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { ScrollArea } from '@workspace/ui/components/scroll-area';
import cls from 'classnames';
import {
  ChevronDown,
  ChevronRight,
  Columns2,
  Component,
  Edit2,
  File,
  ImageIcon,
  LayoutGrid,
  LayoutList,
  Lock,
  SquareDashedMousePointer,
  Table,
} from 'lucide-react';
import { observer } from 'mobx-react';
import React, { useEffect, useRef, useState } from 'react';
import { type GridRow } from '../types';
import { getElementDisplayName } from '../utils/const';
import {
  getRowName,
  scrollToActiveRow,
  toggleAbsoluteElemAttrs,
} from '../utils/utils1';
import { useWorksStore } from '../works-store/store/hook';

const LayerManagerRoot = styled.div`
  user-select: none;
  .layer_item {
    user-select: none;
  }
`;

// 可编辑的名称组件
interface EditableNameProps {
  value: string;
  onSave: (newValue: string) => void;
  placeholder?: string;
  color?: string;
}

const EditableName: React.FC<EditableNameProps> = ({
  value,
  onSave,
  placeholder = 'Grid',
  color,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    if (editValue.trim() !== value) {
      onSave(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Input
        type='text'
        value={editValue}
        className='h-5 w-auto'
        onChange={e => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            handleSave();
          } else if (e.key === 'Escape') {
            handleCancel();
          }
        }}
        placeholder={placeholder}
        title={placeholder}
        aria-label={placeholder}
        autoFocus
      />
    );
  }

  return (
    <div className='flex items-center gap-1 group'>
      <span className='flex-1 min-w-0 truncate' style={{ color }}>
        {value || placeholder}
      </span>
      <button
        onClick={() => setIsEditing(true)}
        className='opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded'
        title='编辑名称'
        aria-label='编辑名称'
      >
        <Edit2 className='w-3 h-3' />
      </button>
    </div>
  );
};

// 元素内容渲染组件
interface ElementContentProps {
  layer?: LayerElemItem;
}

// 过滤HTML标签的工具函数
const stripHtmlTags = (text: string): string => {
  if (typeof text !== 'string') return text;
  // 将<br>、<br/>、<br />等标签替换为空格，然后移除所有其他HTML标签
  return text
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const ElementContent: React.FC<ElementContentProps> = ({ layer }) => {
  // 获取元素的真实数据
  const getElementContent = () => {
    try {
      if (!layer) {
        return { type: 'unknown', content: '未知元素' };
      }

      const isAbsoluteElem = layer.attrs?.absoluteElem;

      const elementRef = layer.elementRef || '';

      // 根据elementRef判断元素类型
      if (/text/gi.test(elementRef)) {
        // 文字元素
        const textAttrs = layer.attrs || {};
        const textContent = textAttrs.text || '空文字';
        // 过滤掉HTML标签
        const cleanTextContent = stripHtmlTags(textContent);

        return {
          type: 'text',
          content: cleanTextContent,
          isAbsoluteElem,
          attrs: {
            fontFamily: textAttrs.fontFamily || 'inherit',
            fontSize: textAttrs.fontSize || 'inherit',
            color: textAttrs.color || 'inherit',
          },
        };
      } else if (/picture/gi.test(elementRef)) {
        // 图片元素
        const imageAttrs = layer.attrs || {};
        const imageUrl = imageAttrs.ossPath || '';

        return {
          type: 'image',
          content: imageUrl,
          isAbsoluteElem,
          attrs: {
            width: imageAttrs.width || 100,
            height: imageAttrs.height || 100,
          },
        };
      } else {
        // 其他组件
        return {
          type: 'component',
          content: layer.attrs?.name || layer.attrs?.title || '组件',
          isAbsoluteElem,
          attrs: {},
        };
      }
    } catch (error) {
      console.warn('获取元素内容失败:', error);
      return { type: 'error', content: '获取失败' };
    }
  };

  const elementData = getElementContent();

  if (elementData.type === 'text') {
    return (
      <div className='flex items-center gap-2'>
        <span className='text-xs text-gray-600 dark:text-gray-400 truncate max-w-48'>
          {elementData.content}
        </span>
      </div>
    );
  } else if (elementData.type === 'image') {
    return (
      <div className='flex items-center gap-2'>
        {elementData.content ? (
          <img
            src={cdnApi(elementData.content, {
              resizeWidth: 48,
            })}
            alt='元素图片'
            className='w-6 h-6 object-cover rounded border'
            onError={e => {
              // 图片加载失败时显示占位符
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : (
          <ImageIcon />
        )}
        <span className='text-xs text-gray-400 hidden'>图片</span>
      </div>
    );
  } else {
    return (
      <div className='flex items-center gap-2'>
        <Component className='w-3 h-3 text-purple-500' />
        <span className='text-xs text-gray-600 dark:text-gray-400'>
          {elementData.content}
        </span>
      </div>
    );
  }
};

interface DragState {
  isDragging: boolean;
  dragType?: 'row' | 'element';
  targetElemId?: string;
  sourceRowDepth: number[];
  dropTargetRowDepth?: number[];
}

interface LayerTreeNodeProps {
  node: GridRow;
  parentRow?: GridRow;
  level: number;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onSelect: (
    rowDepth: number[],
    { nodeId, elemId }: { nodeId?: string; elemId?: string }
  ) => void;
  editingElemId?: string;
  expandedIds: Set<string>;
  activeRowDepth?: number[];
  nodeDepth: number[]; // 当前节点在gridsData中的深度路径
  isAltKeyPressed: boolean; // Alt键是否被按下
  dragStateRef: React.MutableRefObject<DragState>; // 共享的拖拽状态
}

const LayerTreeNodeItem = styled.div`
  .icon_btn {
    cursor: pointer;
    display: none;
    &.active {
      display: block;
      color: #1a87ff;
    }
    &:hover {
      color: #1a87ff;
    }
  }
  .layer_item {
    &:hover {
      .icon_btn {
        display: block;
      }
    }
  }
`;

const LayerTreeNode: React.FC<LayerTreeNodeProps> = ({
  node,
  parentRow,
  level,
  isExpanded,
  onToggleExpand,
  onSelect,
  editingElemId,
  expandedIds,
  activeRowDepth,
  nodeDepth,
  isAltKeyPressed,
  dragStateRef,
}) => {
  const worksStore = useWorksStore();
  const { widgetStateV2, setWidgetStateV2 } = worksStore;
  const {
    moveElemToGroupV2,
    moveElemByIndexV2,
    moveRowToTargetV2,
    setRowAttrsV2,
  } = worksStore.gridPropsOperator;
  const hasChildren = node.children && node.children.length > 0;
  const hasElements = node.childrenIds && node.childrenIds.length > 0;
  const isSelectedElem = editingElemId === node.id;
  const tag = node.tag as any;

  // 判断当前节点是否激活
  const isSelectedRow = JSON.stringify(activeRowDepth)?.includes(
    JSON.stringify(nodeDepth).replace(']', '')
  );
  const isActiveRow = !editingElemId && isSelectedRow;

  const getNodeIcon = (rowName: string) => {
    switch (rowName) {
      case 'Comp':
        return <Component size={14} color='#9747ff' />;
      case 'List':
        return <LayoutList size={14} />;
      case 'Table':
        return <Table size={14} />;
      case 'Grid':
        return <LayoutGrid size={14} />;
      case 'Cell':
        return <Columns2 size={14} />;
      default:
        return <File size={14} />;
    }
  };

  const rowName = getRowName(node, nodeDepth);
  const isComponentEntity = !!node.componentGroupRefId;

  return (
    <LayerTreeNodeItem>
      <div
        draggable
        data-layer-element-id={node.id}
        data-layer-row-depth={JSON.stringify(nodeDepth)}
        className={cls(
          `flex items-center gap-1 px-2 py-1 text-sm cursor-move`,
          `hover:bg-gray-50 dark:hover:bg-gray-800`,
          `${isSelectedElem ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`,
          `${isSelectedRow ? 'bg-gray-100 dark:bg-gray-900/30' : ''}`,
          `${isActiveRow ? 'bg-blue-100 dark:bg-gray-900/30' : ''}`
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        title='拖拽移动Row（默认：平行层级，按住Alt：移动到Row内）或将Element拖到此处'
        onClick={() =>
          onSelect(nodeDepth, { nodeId: node.id, elemId: undefined })
        }
        onDragStart={e => {
          dragStateRef.current = {
            isDragging: true,
            dragType: 'row',
            sourceRowDepth: nodeDepth,
            dropTargetRowDepth: undefined,
          };
          e.dataTransfer.setData(
            'text/plain',
            JSON.stringify(dragStateRef.current)
          );
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragEnd={e => {
          // 立即重置拖拽状态，提升响应速度
          const dragType = dragStateRef.current.dragType;
          const sourceRowDepth = dragStateRef.current.sourceRowDepth;
          const targetRowDepth = dragStateRef.current.dropTargetRowDepth;
          const shouldMoveToGroup = e.altKey || isAltKeyPressed;

          dragStateRef.current.isDragging = false;
          dragStateRef.current.dropTargetRowDepth = undefined;

          // 清除所有Row元素的拖拽高亮背景色
          const allRowElements = document.querySelectorAll(
            '[data-layer-row-depth]'
          );
          allRowElements.forEach(el => {
            (el as HTMLElement).style.backgroundColor = '';
          });

          // 使用 requestAnimationFrame 异步执行移动逻辑，避免阻塞拖拽结束动画
          if (dragType === 'row' && targetRowDepth) {
            // 防止移动到自己
            const isSameTarget =
              sourceRowDepth.length === targetRowDepth.length &&
              sourceRowDepth.every((v, i) => v === targetRowDepth[i]);

            if (!isSameTarget) {
              requestAnimationFrame(() => {
                // 创建临时的widgetState，包含源Row的activeRowDepth
                const tempWidgetState = {
                  ...widgetStateV2,
                  activeRowDepth: sourceRowDepth,
                };

                // 按住Alt键：移动到目标Row内部（作为children）
                // 默认：移动到与目标Row平行的层级（作为sibling）
                const nextRowDepth = moveRowToTargetV2(
                  tempWidgetState,
                  targetRowDepth,
                  shouldMoveToGroup ? 'group' : 'sibling'
                );

                if (nextRowDepth) {
                  setWidgetStateV2({
                    activeRowDepth: nextRowDepth,
                    hideOperator: false,
                  });
                }
              });
            }
          }
        }}
        onDragOver={e => {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = 'move';

          // 记录拖拽目标Row
          dragStateRef.current.dropTargetRowDepth = nodeDepth;

          const dragType = dragStateRef.current.dragType;

          // 处理Row拖拽
          if (dragType === 'row') {
            // 检查是否是非法目标（自己或自己的子节点）
            const sourceRowDepth = dragStateRef.current.sourceRowDepth;
            const isSelf =
              sourceRowDepth.length === nodeDepth.length &&
              sourceRowDepth.every((v, i) => v === nodeDepth[i]);
            const isOwnChild =
              nodeDepth.length > sourceRowDepth.length &&
              sourceRowDepth.every((v, i) => v === nodeDepth[i]);
            const isInvalidTarget = isSelf || isOwnChild;

            // 只有在有效目标时才显示高亮
            if (isInvalidTarget) {
              // 非法目标，显示禁止状态
              e.dataTransfer.dropEffect = 'none';
              if (e.currentTarget.style.backgroundColor !== '') {
                e.currentTarget.style.backgroundColor = '';
              }
            } else {
              // 合法目标，根据是否按住Alt键显示不同的视觉反馈
              e.dataTransfer.dropEffect = 'move';
              const currentAltKey = e.altKey || isAltKeyPressed;
              const bgColor = currentAltKey ? '#e9d5ff' : '#ffe4ea';

              // 只在颜色变化时更新样式，减少DOM操作
              if (e.currentTarget.style.backgroundColor !== bgColor) {
                e.currentTarget.style.backgroundColor = bgColor;
              }
            }
          }
          // 处理Element拖拽 - 允许Element移动到Row下
          else if (dragType === 'element') {
            // Element拖拽到Row上，显示紫色高亮表示将成为Row的子元素
            const bgColor = '#e9d5ff';
            if (e.currentTarget.style.backgroundColor !== bgColor) {
              e.currentTarget.style.backgroundColor = bgColor;
            }
          }
        }}
        onDragLeave={e => {
          // 清除拖拽高亮（Row和Element都需要清除）
          e.currentTarget.style.backgroundColor = '';
        }}
        onDrop={e => {
          e.preventDefault();
          e.stopPropagation();
          e.currentTarget.style.backgroundColor = '';

          // 只处理Element拖拽到Row上的情况
          if (dragStateRef.current.dragType === 'element') {
            const targetElemId = dragStateRef.current.targetElemId;
            const sourceRowDepth = dragStateRef.current.sourceRowDepth;

            // 检查是否已经在同一个Row下，如果是则阻止操作
            const isSameRow =
              JSON.stringify(sourceRowDepth) === JSON.stringify(nodeDepth);

            if (isSameRow) {
              // Element已经在这个Row下，不需要移动
              return;
            }

            if (targetElemId) {
              // 将Element移动到该Row下
              const resRowDepth = moveElemToGroupV2(widgetStateV2, nodeDepth);
              setWidgetStateV2({
                activeRowDepth: resRowDepth,
                editingElemId: targetElemId,
                hideOperator: false,
              });
            }
          }
          // Row的拖拽在onDragEnd中处理
        }}
      >
        {/* 展开/折叠按钮 */}
        {(hasChildren || hasElements) && (
          <button
            className='p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded'
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onToggleExpand(node.id);
            }}
            onDragStart={e => e.preventDefault()}
          >
            {isExpanded ? (
              <ChevronDown className='w-3 h-3' />
            ) : (
              <ChevronRight className='w-3 h-3' />
            )}
          </button>
        )}
        {!(hasChildren || hasElements) && <div className='w-4' />}

        {/* 节点图标 */}
        <div className='text-gray-600 dark:text-gray-400'>
          {getNodeIcon(rowName)}
        </div>

        {/* 节点名称 */}
        <EditableName
          placeholder={rowName}
          value={node.name || node.alias || ''}
          color={isComponentEntity ? '#9747ff' : undefined}
          onSave={newValue => {
            setRowAttrsV2(
              {
                name: newValue,
              },
              {
                activeRowDepth: nodeDepth,
              }
            );
            // TODO: 通过editorSDK更新节点名称
            console.log('更新节点名称:', node.id, newValue);
          }}
        />
        <span
          className='text-xs text-gray-400 flex items-center gap-1 ml-auto'
          onClick={e => {
            e.stopPropagation();
            e.preventDefault();
            setWidgetStateV2({
              isTagPickerOpen: true,
              activeRowDepth: nodeDepth,
              editingElemId: undefined,
              hideOperator: false,
            });
          }}
        >
          {getElementDisplayName(tag)}
        </span>
      </div>

      {/* 子节点 */}
      {(hasChildren || hasElements) && isExpanded && (
        <div className='w-full'>
          {/* 渲染子行（文件夹） */}
          {hasChildren &&
            node.children!.map((child, childIndex) => {
              // 计算子节点的深度路径
              const childDepth = [...nodeDepth, childIndex];

              return (
                <LayerTreeNode
                  key={child.id}
                  node={child}
                  parentRow={node}
                  level={level + 1}
                  isExpanded={expandedIds.has(child.id)}
                  onToggleExpand={onToggleExpand}
                  onSelect={onSelect}
                  editingElemId={editingElemId}
                  expandedIds={expandedIds}
                  activeRowDepth={activeRowDepth}
                  nodeDepth={childDepth}
                  isAltKeyPressed={isAltKeyPressed}
                  dragStateRef={dragStateRef}
                />
              );
            })}

          {/* 渲染子元素（文件） */}
          {hasElements &&
            node.childrenIds!.map(elemId => {
              const layer = worksStore.getLayer(elemId);
              const isDisabledToEdit = layer?.attrs?.disabledToEdit;
              const isAbsoluteElem = layer?.attrs?.absoluteElem;
              const layerTag = layer?.tag as any;
              const isSelectedElem = editingElemId === elemId;

              return (
                <div
                  draggable
                  key={elemId}
                  data-element-id={elemId}
                  className={cls(
                    'layer_item flex items-center gap-1 px-2 py-1.5 text-sm cursor-pointer relative user-select-none',
                    'hover:bg-gray-100 dark:hover:bg-gray-800 rounded-sm',
                    {
                      'bg-blue-100 dark:bg-blue-900/30': isSelectedElem,
                    }
                  )}
                  style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }}
                  onClick={() =>
                    onSelect(nodeDepth, { nodeId: node.id, elemId })
                  }
                  onMouseDown={() => {
                    setWidgetStateV2({
                      activeRowDepth: nodeDepth,
                      editingElemId: elemId,
                      hideOperator: false,
                    });
                  }}
                  onDragStart={e => {
                    dragStateRef.current = {
                      isDragging: true,
                      dragType: 'element',
                      targetElemId: elemId,
                      sourceRowDepth: nodeDepth,
                    };
                    e.dataTransfer.setData(
                      'text/plain',
                      JSON.stringify(dragStateRef.current)
                    );
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={e => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    Object.assign(e.currentTarget.style, {
                      backgroundColor: '#ffe4ea',
                    });
                  }}
                  onDragLeave={e => {
                    Object.assign(e.currentTarget.style, {
                      backgroundColor: '',
                    });
                  }}
                  onDrop={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    Object.assign(e.currentTarget.style, {
                      backgroundColor: '',
                    });

                    try {
                      const dragState = dragStateRef.current;

                      // 只处理Element拖拽，不处理Row拖拽
                      if (
                        dragState.dragType === 'element' &&
                        dragState.targetElemId
                      ) {
                        // 检查是否拖拽到自己，如果是则阻止操作
                        if (dragState.targetElemId === elemId) {
                          return;
                        }

                        // 检查是否在同一个Row下
                        const isSameRow =
                          JSON.stringify(dragState.sourceRowDepth) ===
                          JSON.stringify(nodeDepth);

                        if (isSameRow) {
                          // 在同一个Row下，交换位置
                          const currentIndex =
                            node.childrenIds?.indexOf(elemId) || 0;

                          moveElemByIndexV2(
                            dragState.targetElemId,
                            currentIndex
                          );
                        } else {
                          // 不在同一个Row下，先移动到目标Row，再调整位置
                          const resRowDepth = moveElemToGroupV2(
                            widgetStateV2,
                            nodeDepth
                          );

                          // 移动完成后，再调整到目标元素的位置
                          setTimeout(() => {
                            const currentIndex =
                              node.childrenIds?.indexOf(elemId) || 0;
                            moveElemByIndexV2(
                              dragState.targetElemId!,
                              currentIndex
                            );
                          }, 50);

                          setWidgetStateV2({
                            activeRowDepth: resRowDepth,
                            editingElemId: dragState.targetElemId,
                            hideOperator: false,
                          });
                        }
                      }
                    } catch (error) {
                      console.error('Failed to handle element drop:', error);
                    }
                  }}
                >
                  <div className='w-4' />
                  <span className='flex-1 flex items-center gap-1 min-w-0 truncate'>
                    <ElementContent
                      layer={layer}
                      key={`ElementContent_${layer?.attrs?._v}`}
                    />
                  </span>
                  <div className='action_btns flex items-center gap-1 px-2'>
                    <Lock
                      size={14}
                      className={cls('text-gray-400 icon_btn', {
                        active: isDisabledToEdit,
                      })}
                      onClick={e => {
                        e.stopPropagation();
                        worksStore.changeCompAttr(elemId, {
                          disabledToEdit: !isDisabledToEdit,
                        });
                      }}
                    />
                    <SquareDashedMousePointer
                      size={16}
                      className={cls('text-gray-400 icon_btn', {
                        active: isAbsoluteElem,
                      })}
                      onClick={e => {
                        if (!layer) return;
                        e.stopPropagation();
                        worksStore.changeCompAttr(elemId, {
                          ...toggleAbsoluteElemAttrs(layer),
                        });
                      }}
                    />
                    <span
                      className='text-xs text-gray-400 flex items-center gap-1 ml-1 hover:text-blue-500'
                      onClick={e => {
                        e.stopPropagation();
                        e.preventDefault();
                        setWidgetStateV2({
                          isTagPickerOpen: true,
                          editingElemId: elemId,
                          hideOperator: false,
                        });
                      }}
                    >
                      {getElementDisplayName(layerTag)}
                    </span>
                  </div>

                  {/* 拖拽处理器 */}
                  <div
                    className='drag-handle absolute left-0 top-0 w-4 h-full cursor-grab hover:bg-blue-100 dark:hover:bg-blue-900/30 flex items-center justify-center text-xs text-gray-500'
                    draggable
                    // onDragStart={e => {
                    //   e.dataTransfer.setData('text/plain', elemId);
                    //   e.dataTransfer.effectAllowed = 'move';
                    // }}
                    // onDragEnd={() => {}}
                    // onClick={e => {
                    //   e.stopPropagation();
                    //   console.log('Drag handle click for element:', elemId);
                    //   setWidgetStateV2({
                    //     activeRowDepth: nodeDepth,
                    //     editingElemId: elemId,
                    //   });
                    // }}
                    title='拖拽移动元素'
                  >
                    ⋮⋮
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </LayerTreeNodeItem>
  );
};

function LayerManager() {
  const worksStore = useWorksStore();
  const { widgetStateV2, setWidgetStateV2, worksData } = worksStore;
  const { deleteElemV2, getActiveRootRow, getRowByDepth, addBlankBlock } =
    worksStore.gridPropsOperator;
  const { gridsData } = worksData.gridProps;

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // 跟踪Alt键状态（在顶层组件中）
  const [isAltKeyPressed, setIsAltKeyPressed] = useState(false);

  // 共享的拖拽状态（在顶层组件中）
  const dragStateRef = useRef<DragState>({
    isDragging: false,
    dragType: undefined,
    sourceRowDepth: [],
    dropTargetRowDepth: undefined,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt' || e.altKey) {
        setIsAltKeyPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        setIsAltKeyPressed(false);
      }
    };

    const handleBlur = () => {
      setIsAltKeyPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const { activeRowDepth, editingElemId, onlyRenderActiveBlock } =
    widgetStateV2 || {};

  // 自动展开节点到指定路径
  const autoExpandToPath = (path: string[]) => {
    if (path.length === 0) return;

    const newExpandedIds = new Set(expandedIds);
    path.forEach(id => {
      newExpandedIds.add(id);
    });
    setExpandedIds(newExpandedIds);
  };

  // 滚动到指定元素
  const scrollToElement = (elementId: string) => {
    setTimeout(() => {
      const element = document.querySelector(
        `[data-element-id="${elementId}"]`
      ) as HTMLElement;
      if (element && scrollAreaRef.current) {
        // 找到ScrollArea内部的Viewport组件
        const viewport = scrollAreaRef.current.querySelector(
          '[data-radix-scroll-area-viewport]'
        ) as HTMLElement;
        if (viewport) {
          // 检查元素是否已经在可视区域内
          const elementRect = element.getBoundingClientRect();
          const viewportRect = viewport.getBoundingClientRect();

          // 判断元素是否在可视区域内（考虑100px的顶部间距）
          const isElementVisible =
            elementRect.top >= viewportRect.top + 100 &&
            elementRect.bottom <= viewportRect.bottom;

          // 如果元素已经在可视区域内，不需要滚动
          if (isElementVisible) {
            return;
          }

          // 计算元素相对于滚动容器的偏移量
          const elementOffsetTop = element.offsetTop;

          // 计算需要滚动的距离，确保元素在视口中央偏上位置
          const targetScrollTop = elementOffsetTop - 100; // 100px的顶部间距

          // 确保滚动位置在有效范围内
          const maxScrollTop = viewport.scrollHeight - viewport.clientHeight;
          const finalScrollTop = Math.max(
            0,
            Math.min(targetScrollTop, maxScrollTop)
          );

          viewport.scrollTo({
            top: finalScrollTop,
            behavior: 'smooth',
          });
        }
      }
    }, 10);
  };

  useEffect(() => {
    // 根据activeRowDepth找到所有父级节点并展开
    if (!activeRowDepth || activeRowDepth.length === 0) {
      return;
    }

    // 收集所有父级节点的ID
    const parentIds: string[] = [];

    // 遍历所有父级路径（包括当前节点，因为需要展开到当前节点）
    for (let i = 1; i <= activeRowDepth.length; i++) {
      const parentDepth = activeRowDepth.slice(0, i);
      const parentRow = getRowByDepth?.(parentDepth);
      if (parentRow?.id) {
        parentIds.push(parentRow.id);
      }
    }

    // 使用 requestAnimationFrame 异步展开，避免在 effect 中同步调用 setState
    if (parentIds.length > 0) {
      requestAnimationFrame(() => {
        autoExpandToPath(parentIds);
      });
    }

    if (editingElemId) {
      // 滚动到对应的元素
      scrollToElement(editingElemId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(activeRowDepth), editingElemId]);

  const openExpand = (id: string) => {
    const newExpandedIds = new Set(expandedIds);
    if (newExpandedIds.has(id)) {
    } else {
      newExpandedIds.add(id);
    }
    setExpandedIds(newExpandedIds);
  };

  // 切换节点展开状态
  const toggleExpand = (id: string) => {
    const newExpandedIds = new Set(expandedIds);
    if (newExpandedIds.has(id)) {
      newExpandedIds.delete(id);
    } else {
      newExpandedIds.add(id);
    }
    setExpandedIds(newExpandedIds);
  };

  // 选择节点
  const selectNode = (
    rowDepth: number[],
    { nodeId, elemId }: { nodeId?: string; elemId?: string }
  ) => {
    setWidgetStateV2({
      editingElemId: elemId,
      activeRowDepth: rowDepth,
      hideOperator: false,
    });
    if (nodeId) {
      openExpand(nodeId);
    }
    setTimeout(() => {
      const rootRow = getActiveRootRow();
      if (rootRow) scrollToActiveRow(rootRow.id);
    }, 100);
  };

  return (
    <LayerManagerRoot className='w-full h-full flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700'>
      {/* 头部 */}
      <div className='p-2 border-b border-gray-200 dark:border-gray-700'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-1'>
            <Button
              variant='outline'
              className='text-xs'
              size='sm'
              onClick={() => {
                const { insertIdx, blankBlock } = addBlankBlock();
                setWidgetStateV2({
                  activeRowDepth: [insertIdx],
                  hideOperator: false,
                });
                scrollToActiveRow(blankBlock.id);
              }}
            >
              +1画布
            </Button>
            <Button
              variant='outline'
              className={cls('text-xs', {
                'text-blue-500': onlyRenderActiveBlock,
              })}
              size='sm'
              onClick={() => {
                setWidgetStateV2({
                  onlyRenderActiveBlock: !onlyRenderActiveBlock,
                });
              }}
            >
              只显示当前画布内容
            </Button>
            {/* <Button
              variant="outline"
              className="text-xs"
              size="sm"
              onClick={collapseAll}
            >
              折叠
            </Button> */}
          </div>
        </div>
      </div>

      {/* 图层树 */}
      <div className='flex-1 overflow-hidden'>
        <ScrollArea className='h-full' ref={scrollAreaRef}>
          {gridsData.length === 0 ? (
            <div className='text-center py-8 text-gray-500 dark:text-gray-400'>
              暂无图层
            </div>
          ) : (
            gridsData.map((group, groupIndex) => {
              // 找到该组的所有行
              const isActiveGroup = groupIndex === (activeRowDepth?.[0] || 0);

              return (
                <div key={group.id} className=''>
                  {/* 模块标题 */}
                  <div
                    className='px-2 py-1 flex items-center gap-1 cursor-pointer text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800'
                    onClick={() => {
                      setWidgetStateV2({
                        activeRowDepth: [groupIndex],
                        hideOperator: false,
                      });
                      scrollToActiveRow(group.id);
                    }}
                  >
                    画布 {groupIndex + 1}
                    <span className='text-gray-400'> - {group.name}</span>
                    <ChevronRight
                      size={14}
                      className={cls({
                        'rotate-90': isActiveGroup,
                      })}
                    />
                  </div>

                  {/* 模块内容 */}
                  {isActiveGroup &&
                    group.children?.map((node, nodeIndex) => {
                      // 计算当前节点在gridsData中的深度路径
                      const nodeDepth = [groupIndex, nodeIndex];

                      return (
                        <LayerTreeNode
                          key={node.id}
                          node={node}
                          level={0}
                          isExpanded={expandedIds.has(node.id)}
                          onToggleExpand={toggleExpand}
                          onSelect={selectNode}
                          editingElemId={editingElemId}
                          expandedIds={expandedIds}
                          activeRowDepth={activeRowDepth}
                          nodeDepth={nodeDepth}
                          isAltKeyPressed={isAltKeyPressed}
                          dragStateRef={dragStateRef}
                        />
                      );
                    })}
                  {group.childrenIds?.map(elemId => {
                    const layer = worksStore.getLayer(elemId);
                    return (
                      <div key={elemId} className='text-red-500 text-xs p-2'>
                        错误元素 {layer?.tag} {layer?.attrs?.text}
                        <span
                          className='text-blue-500 cursor-pointer'
                          onClick={() => {
                            deleteElemV2(
                              {
                                activeRowDepth: [groupIndex],
                                editingElemId: elemId,
                              },
                              false
                            );
                          }}
                        >
                          删除
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </ScrollArea>
      </div>
    </LayerManagerRoot>
  );
}
export default observer(LayerManager);

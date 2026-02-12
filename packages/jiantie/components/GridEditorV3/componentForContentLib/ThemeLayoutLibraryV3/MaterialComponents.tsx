import {
  IWorksData,
  LayerElemItemMap,
} from '@/components/GridEditorV3/works-store/types';
import { random } from '@/utils';
import styled from '@emotion/styled';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import { cn } from '@workspace/ui/lib/utils';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Edit2,
  GripVertical,
  LayoutGrid,
  Plus,
  Trash2,
} from 'lucide-react';
import { observer } from 'mobx-react';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import LongPageRowEditorV2 from '../../AppV2/RowRendererV2/LongPageRowEditorV2';
import {
  ComponentData,
  ComponentGroupData,
  ComponentGroupDataItem,
  deepClone,
  GridRow,
} from '../../utils';
import { useWorksStore } from '../../works-store/store/hook';

// Context 定义
interface MaterialComponentsContextValue {
  // 基础信息
  manager: boolean;
  allGroups: { id: string; name: string }[];
  zoom: string;
  activeComponentId?: string;
  itemAspectRatio: string;
  gridColumns: number;
  isTemplate: boolean;

  // 组件操作
  handleComponentRename: (componentId: string, newName: string) => void;
  handleComponentMove: (componentId: string, targetGroupId: string) => void;
  handleComponentCopy: (componentId: string) => void;
  handleComponentDelete: (componentId: string) => void;
  handleComponentAdd: (componentId: string) => void;
  handleComponentClick: (component: ComponentData) => void;

  // 分组操作
  handleGroupRename: (groupId: string, newName: string) => void;
  handleGroupDelete: (groupId: string) => void;
  handleGroupCreate: (groupName: string) => void;
}

const MaterialComponentsContext =
  createContext<MaterialComponentsContextValue | null>(null);

function useMaterialComponentsContext() {
  const context = useContext(MaterialComponentsContext);
  if (!context) {
    throw new Error(
      'useMaterialComponentsContext must be used within MaterialComponentsProvider'
    );
  }
  return context;
}

const RowRoot = styled.div<{ columns?: number; aspectRatio?: string }>`
  width: 100%;
  padding: 8px;
  padding-bottom: 16px;
  .editor_row_wrapper {
    min-height: auto !important;
    height: auto !important;
  }
  .comp_group_name {
    padding: 8px;
  }
  .vertical_scroll_view {
    column-count: ${props => props.columns || 2};
    column-gap: 8px;
    padding-bottom: 8px;
  }
  .row_wrapper {
    position: relative;
    outline: 1px solid #eee;
    border-radius: 4px;
    overflow: hidden;
    break-inside: avoid;
    margin-bottom: 8px;
    display: block;
    width: 100%;
    /* background-color: #fff; */
    &:hover {
      outline: 2px solid #b8b8b8;
      .edit_button {
        opacity: 1;
      }
    }
    &.active {
      outline: 3px solid #9747ff;
      box-shadow:
        0 0 0 3px rgba(151, 71, 255, 0.15),
        0 4px 12px rgba(151, 71, 255, 0.2);
      background-color: rgba(151, 71, 255, 0.02);
    }
    .row_content {
      position: relative;
      width: 100%;
      * {
        pointer-events: none !important;
      }
    }
    .edit_button {
      position: absolute;
      top: 4px;
      right: 4px;
      z-index: 10;
      opacity: 0;
      transition: opacity 0.2s;
    }
  }
  .page_name {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: rgba(0, 0, 0, 0.6);
    color: #fff;
    font-size: 12px;
    text-align: center;
    padding: 2px 0;
  }
`;

const CateView = styled.div`
  position: sticky;
  top: 0;
  background-color: #fff;
  z-index: 1;
  display: flex;
  flex-direction: row;
  gap: 8px;
  padding: 8px;
  .scroll_view {
    width: fit-content;
    display: flex;
    flex-direction: row;
    gap: 8px;
    overflow-x: auto;
  }
  .cate_item {
    padding: 2px 6px;
    border: 1px solid #e5e5e5;
    border-radius: 6px;
    cursor: pointer;
    white-space: nowrap;
    font-size: 12px;
    &.active {
      border-color: #1a87ff;
      color: #1a87ff;
      background-color: #e6f4ff;
    }
  }
`;

const ComponentGroupWrapper = styled.div`
  .component_group {
    &.active {
      outline: 1px solid #9747ff;
    }
    &.user_mode {
      outline: none !important;
      border: none !important;
    }
  }
`;

const GroupNavigationWrapper = styled.div`
  width: 80px;
  flex-shrink: 0;
  border-right: 1px solid #e5e5e5;
  background-color: #fafafa;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 6px;

  .nav_item {
    padding: 8px 6px;
    margin-bottom: 4px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    color: #666;
    transition: all 0.2s;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    text-align: center;
    min-height: 48px;
    justify-content: center;

    /* 移动端适配 */
    @media (max-width: 768px) {
      padding: 6px 4px;
      font-size: 11px;
      min-height: 40px;
      gap: 2px;
    }

    &:hover {
      background-color: #f0f0f0;
      color: #333;
    }

    &.active {
      background-color: #e6f4ff;
      color: #1a87ff;
      font-weight: 500;
    }

    .nav_text {
      font-size: 12px;
      line-height: 1.3;
      word-break: break-all;
      max-width: 100%;
      font-weight: 500;

      @media (max-width: 768px) {
        font-size: 11px;
      }
    }

    .count {
      font-size: 10px;
      color: #999;
      font-weight: normal;

      @media (max-width: 768px) {
        font-size: 9px;
      }
    }
  }
`;

// 分组导航组件
function GroupNavigation({
  groups,
  activeGroupId,
  onNavigate,
}: {
  groups: { id: string; name: string; count: number }[];
  activeGroupId?: string;
  onNavigate: (groupId: string) => void;
}) {
  return (
    <GroupNavigationWrapper>
      {groups.map(group => (
        <div
          key={group.id}
          className={cn('nav_item', {
            active: activeGroupId === group.id,
          })}
          onClick={() => onNavigate(group.id)}
          title={group.name}
        >
          <div className='nav_text'>{group.name}</div>
          <div className='count'>({group.count})</div>
        </div>
      ))}
    </GroupNavigationWrapper>
  );
}

// 组件编辑和操作按钮组
function ComponentEditDropdown({
  component,
  groupId,
}: {
  component: ComponentData;
  groupId: string;
}) {
  const {
    allGroups,
    handleComponentMove,
    handleComponentCopy,
    handleComponentDelete,
    handleComponentAdd,
    isTemplate,
  } = useMaterialComponentsContext();

  const [showEditPopover, setShowEditPopover] = useState(false);
  const [targetGroupId, setTargetGroupId] = useState(groupId);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = () => {
    // 保存分组
    if (targetGroupId && targetGroupId !== groupId) {
      handleComponentMove(component.compId, targetGroupId);
      toast.success('分组已更新');
    }
    setShowEditPopover(false);
  };

  const onAdd = () => {
    handleComponentAdd(component.compId);
  };

  const onDelete = () => {
    handleComponentDelete(component.compId);
    setShowDeleteConfirm(false);
  };

  const onCopy = () => {
    handleComponentCopy(component.compId);
  };

  return (
    <div className='edit_button flex gap-1'>
      {/* 编辑按钮 - 模板模式下隐藏 */}
      {!isTemplate && (
        <Popover open={showEditPopover} onOpenChange={setShowEditPopover}>
          <PopoverTrigger asChild>
            <Button
              size='sm'
              variant='outline'
              className='h-7 w-7 p-0 shadow-sm'
              onClick={e => {
                e.stopPropagation();
                setTargetGroupId(groupId);
              }}
              title='编辑'
            >
              <Edit2 className='h-3.5 w-3.5' />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className='w-64'
            onClick={e => e.stopPropagation()}
            align='end'
          >
            <div className='space-y-3'>
              <div className='font-medium text-sm'>修改分组</div>

              {/* 修改分组 */}
              <Select value={targetGroupId} onValueChange={setTargetGroupId}>
                <SelectTrigger className='h-8'>
                  <SelectValue placeholder='选择分组' />
                </SelectTrigger>
                <SelectContent>
                  {allGroups.map(group => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 操作按钮 */}
              <div className='flex gap-2 justify-end'>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => setShowEditPopover(false)}
                >
                  取消
                </Button>
                <Button
                  size='sm'
                  onClick={handleSave}
                  disabled={!targetGroupId || targetGroupId === groupId}
                >
                  保存
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* 添加按钮 - 模板模式下保留 */}
      <Button
        size='sm'
        variant='outline'
        className='h-7 w-7 p-0 shadow-sm'
        onClick={e => {
          e.stopPropagation();
          onAdd();
        }}
        title='添加'
      >
        <Plus className='h-3.5 w-3.5' />
      </Button>

      {/* 复制按钮 - 模板模式下隐藏 */}
      {!isTemplate && (
        <Button
          size='sm'
          variant='outline'
          className='h-7 w-7 p-0 shadow-sm'
          onClick={e => {
            e.stopPropagation();
            onCopy();
          }}
          title='复制'
        >
          <Copy className='h-3.5 w-3.5' />
        </Button>
      )}

      {/* 删除按钮 - 模板模式下隐藏 */}
      {!isTemplate && (
        <Popover open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <PopoverTrigger asChild>
            <Button
              size='sm'
              variant='outline'
              className='h-7 w-7 p-0 shadow-sm'
              onClick={e => {
                e.stopPropagation();
              }}
              title='删除'
            >
              <Trash2 className='h-3.5 w-3.5 text-red-600' />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className='w-64'
            onClick={e => e.stopPropagation()}
            align='end'
          >
            <div className='space-y-3'>
              <div className='font-medium text-sm'>确认删除</div>
              <div className='text-sm text-gray-600'>
                确定要删除{' '}
                <span className='font-medium text-gray-900'>
                  {component.compName || '未命名'}
                </span>{' '}
                吗？
              </div>
              <div className='flex gap-2 justify-end'>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  取消
                </Button>
                <Button
                  size='sm'
                  variant='destructive'
                  onClick={e => {
                    e.preventDefault();
                    onDelete();
                  }}
                >
                  删除
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

// 新建分组按钮
function CreateGroupButton() {
  const { handleGroupCreate } = useMaterialComponentsContext();
  const [showCreatePopover, setShowCreatePopover] = useState(false);
  const [groupName, setGroupName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 打开弹窗时自动聚焦
  useEffect(() => {
    if (showCreatePopover && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showCreatePopover]);

  const handleCreate = () => {
    if (!groupName.trim()) {
      toast.error('请输入分组名称');
      return;
    }
    handleGroupCreate(groupName.trim());
    toast.success('分组已创建');
    setGroupName('');
    setShowCreatePopover(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreate();
    } else if (e.key === 'Escape') {
      setGroupName('');
      setShowCreatePopover(false);
    }
  };

  return (
    <Popover open={showCreatePopover} onOpenChange={setShowCreatePopover}>
      <PopoverTrigger asChild>
        <Button
          size='sm'
          variant='outline'
          onClick={() => {
            setGroupName('');
            setShowCreatePopover(true);
          }}
        >
          新建分组
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className='w-64'
        onClick={e => e.stopPropagation()}
        align='center'
      >
        <div className='space-y-3'>
          <div className='font-medium text-sm'>新建分组</div>

          {/* 分组名称输入 */}
          <Input
            ref={inputRef}
            placeholder='请输入分组名称'
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
            onKeyDown={handleKeyDown}
            className='h-8'
          />

          {/* 操作按钮 */}
          <div className='flex gap-2 justify-end'>
            <Button
              size='sm'
              variant='outline'
              onClick={() => {
                setGroupName('');
                setShowCreatePopover(false);
              }}
            >
              取消
            </Button>
            <Button
              size='sm'
              onClick={handleCreate}
              disabled={!groupName.trim()}
            >
              创建
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// 一键展开/收起全部分组按钮
function ToggleAllGroupsButton({
  expandedGroups,
  componentGroupData,
  onToggleAll,
}: {
  expandedGroups: Record<string, boolean>;
  componentGroupData: ComponentGroupData;
  onToggleAll: (expand: boolean) => void;
}) {
  // 计算是否全部展开
  const allExpanded =
    componentGroupData?.every(
      group => expandedGroups[group.groupId] !== false
    ) ?? false;

  const handleToggle = () => {
    onToggleAll(!allExpanded);
  };

  return (
    <Button
      size='sm'
      variant='outline'
      onClick={handleToggle}
      title={allExpanded ? '收起' : '展开'}
    >
      {allExpanded ? <>收起</> : <>展开</>}
    </Button>
  );
}

// 调整分组顺序按钮组
function SortModeButtons({
  isSortMode,
  onEnter,
  onSave,
  onCancel,
}: {
  isSortMode: boolean;
  onEnter: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  if (!isSortMode) {
    return (
      <Button size='sm' variant='outline' onClick={onEnter} title='调整顺序'>
        调整顺序
      </Button>
    );
  }

  return (
    <>
      <Button size='sm' variant='outline' onClick={onCancel} title='取消调整'>
        取消
      </Button>
      <Button size='sm' variant='outline' onClick={onSave} title='保存顺序'>
        保存
      </Button>
    </>
  );
}

// 可拖拽的分组项
function DraggableGroupItem({
  group,
  index,
  children,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  isDragging,
  isActiveGroup,
}: {
  group: ComponentGroupDataItem;
  index: number;
  children: React.ReactNode;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  isDragging: boolean;
  isActiveGroup: boolean;
}) {
  return (
    <div
      draggable
      data-component-group-id={group.groupId}
      onDragStart={() => onDragStart(index)}
      onDragOver={e => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      onDrop={e => onDrop(e, index)}
      className={cn(
        'flex flex-col border border-gray-200 m-2 rounded-md component_group',
        {
          'opacity-30': isDragging,
          active: isActiveGroup,
        }
      )}
      style={{ cursor: 'move' }}
    >
      {children}
    </div>
  );
}

// 分组头部组件
function GroupHeader({
  group,
  isExpanded,
  onToggle,
  isSortMode,
  dragHandleProps,
}: {
  group: { id: string; name: string; count: number };
  isExpanded: boolean;
  onToggle: () => void;
  isSortMode?: boolean;
  dragHandleProps?: any;
}) {
  const { manager, handleGroupRename, handleGroupDelete, isTemplate } =
    useMaterialComponentsContext();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(group.name || '默认分组');
  const inputRef = useRef<HTMLInputElement>(null);

  // 同步外部名称变化
  useEffect(() => {
    setEditName(group.name || '默认分组');
  }, [group.name]);

  // 编辑时自动聚焦
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (editName.trim() && editName !== group.name) {
      handleGroupRename(group.id, editName.trim());
      toast.success('分组名称已更新');
    } else {
      // 恢复原名称
      setEditName(group.name || '默认分组');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setEditName(group.name || '默认分组');
      setIsEditing(false);
    }
  };

  const onDelete = () => {
    handleGroupDelete(group.id);
    toast.success('分组已删除');
    setShowDeleteDialog(false);
  };

  return (
    <div className='p-1 flex items-center justify-between bg-gray-50 border-b border-gray-200 hover:bg-gray-100 sticky top-0 z-10'>
      {/* 拖拽手柄 - 仅在排序模式显示 */}
      {isSortMode && (
        <div
          {...dragHandleProps}
          className='flex items-center justify-center px-1 cursor-move'
          title='拖动排序'
        >
          <GripVertical size={16} className='text-gray-400' />
        </div>
      )}

      {/* 展开/收起按钮 - 排序模式下隐藏 */}
      {!isSortMode && (
        <Button
          size='xs'
          variant='ghost'
          onClick={onToggle}
          className='h-7 w-7 p-0'
          title={isExpanded ? '收起' : '展开'}
        >
          {isExpanded ? (
            <ChevronUp size={16} className='text-gray-500' />
          ) : (
            <ChevronDown size={16} className='text-gray-500' />
          )}
        </Button>
      )}

      <div className='flex items-center gap-2 flex-1 min-w-0'>
        <LayoutGrid size={16} className='text-gray-600 flex-shrink-0' />
        {isEditing && !isSortMode && !isTemplate ? (
          <Input
            ref={inputRef}
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className='h-7 text-sm font-medium flex-1'
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <div
            className='flex items-center gap-2 flex-1 min-w-0 cursor-pointer'
            onClick={e => {
              if (manager && !isSortMode && !isTemplate) {
                e.stopPropagation();
                setIsEditing(true);
              } else if (!isSortMode) {
                onToggle();
              }
            }}
          >
            <div className='text-sm font-medium text-gray-800 truncate'>
              {group.name || '默认分组'}
            </div>
            <div className='text-xs text-gray-500'>({group.count})</div>
          </div>
        )}
      </div>

      {/* 删除按钮 - 排序模式和模板模式下隐藏 */}
      {!isSortMode && (
        <div className='flex items-center gap-1'>
          {manager && !isTemplate && (
            <Popover open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <PopoverTrigger asChild>
                <Button
                  size='xs'
                  variant='ghost'
                  onClick={e => {
                    e.stopPropagation();
                  }}
                  className='h-7 w-7 p-0'
                  title='删除分组'
                >
                  <Trash2 size={14} className='text-red-600' />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className='w-72'
                onClick={e => e.stopPropagation()}
                align='end'
              >
                <div className='space-y-3'>
                  <div className='font-medium text-sm'>确认删除</div>
                  <div className='text-sm text-gray-600'>
                    确定要删除分组{' '}
                    <span className='font-medium text-gray-900'>
                      {group.name || '默认分组'}
                    </span>{' '}
                    吗？ 该分组内的所有内容也将被删除。
                  </div>
                  <div className='flex gap-2 justify-end'>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => setShowDeleteDialog(false)}
                    >
                      取消
                    </Button>
                    <Button size='sm' variant='destructive' onClick={onDelete}>
                      删除
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      )}
    </div>
  );
}

const genWorksDataByComponentData = (component: ComponentData) => {
  const newData: IWorksData = {
    _version: 0,
    layersMap: component.data.elemComps.reduce((acc, item) => {
      acc[item.elemId] = item;
      return acc;
    }, {} as LayerElemItemMap),
    music: {},
    gridProps: {
      id: random(),
      version: 'v2',
      gridsData: component.data.rows,
    },
    isGridMode: true,
  };
  return newData;
};

// 可编辑的组件名称
function ComponentNameEditor({ component }: { component: ComponentData }) {
  const { manager, handleComponentRename, isTemplate } =
    useMaterialComponentsContext();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(component.compName || '未命名');
  const inputRef = useRef<HTMLInputElement>(null);

  // 同步外部名称变化
  useEffect(() => {
    setEditName(component.compName || '未命名');
  }, [component.compName]);

  // 编辑时自动聚焦
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (editName.trim() && editName !== component.compName) {
      handleComponentRename(component.compId, editName.trim());
      toast.success('组件名称已更新');
    } else {
      // 恢复原名称
      setEditName(component.compName || '未命名');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setEditName(component.compName || '未命名');
      setIsEditing(false);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (manager && !isTemplate) {
      e.stopPropagation();
      setIsEditing(true);
    }
  };

  return isEditing ? (
    <Input
      ref={inputRef}
      value={editName}
      onChange={e => setEditName(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onClick={e => e.stopPropagation()}
      className='absolute bottom-0 left-0 right-0 h-5 text-xs px-2 rounded-none border-0 border-t bg-black/60 text-white focus-visible:ring-0'
    />
  ) : (
    <div
      className={`page_name h-5 text-xs ${manager && !isTemplate ? 'cursor-text hover:bg-black/70' : ''}`}
      onClick={handleClick}
    >
      {component.compName || '未命名'}
    </div>
  );
}

// 组件包装器 - 处理缩放后的高度
function ComponentItemWrapper({
  component,
  groupId,
  rowDOM,
  zoom,
}: {
  component: ComponentData;
  groupId: string;
  rowDOM: React.ReactNode;
  zoom: string;
}) {
  const { manager, activeComponentId, handleComponentClick } =
    useMaterialComponentsContext();
  const contentRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 延迟计算，确保内容完全渲染
    const timer = setTimeout(() => {
      if (contentRef.current && wrapperRef.current) {
        // 获取内容的实际高度
        const actualHeight = contentRef.current.scrollHeight;
        // 查找底部名称元素并获取其实际高度
        const nameElement =
          wrapperRef.current.querySelector('.page_name, input');
        const nameHeight = nameElement
          ? (nameElement as HTMLElement).offsetHeight
          : 20;
        // 设置 wrapper 的高度为缩放后的高度 + 底部名称高度 + 额外的间距
        wrapperRef.current.style.height = `${actualHeight * parseFloat(zoom) + nameHeight + 2}px`;
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [zoom]);

  return (
    <div
      ref={wrapperRef}
      data-component-id={component.compId}
      className={cn('row_wrapper relative', {
        active: activeComponentId === component.compId,
      })}
      onClick={e => {
        handleComponentClick(component);
      }}
      key={component.compId}
    >
      {/* 编辑按钮 */}
      {manager && (
        <ComponentEditDropdown component={component} groupId={groupId} />
      )}
      {/* 组件内容 */}
      <div
        ref={contentRef}
        className='row_content relative z-0'
        style={{
          zoom,
          // transform: `scale(${zoom})`,
          transformOrigin: '0 0',
          width: '375px',
        }}
      >
        {rowDOM}
      </div>
      {/* 组件名称 */}
      <ComponentNameEditor component={component} />
    </div>
  );
}

// 组件内容渲染
function ComponentGroupContent({
  groupId,
  components,
}: {
  groupId: string;
  components: ComponentData[];
}) {
  const { zoom, itemAspectRatio, gridColumns } = useMaterialComponentsContext();
  const [activeCate, setActiveCate] = useState<string>();

  // 当 components 变化时，重置分类筛选
  useEffect(() => {
    setActiveCate(undefined);
  }, [components.length]);

  // 从组件名称中提取分类
  const getCategories = () => {
    const categories = new Set<string>();
    components.forEach(comp => {
      const nameParts = comp.compName?.split('-');
      if (nameParts && nameParts.length > 1) {
        categories.add(nameParts[0]);
      }
    });
    return categories;
  };

  const categories = getCategories();

  // 根据分类筛选组件
  const getFilteredComponents = () => {
    if (activeCate) {
      return components.filter(
        comp => comp.compName?.split('-')[0] === activeCate
      );
    }
    return components;
  };

  const filteredComponents = getFilteredComponents();

  // 渲染组件列表
  const renderComponentList = () => {
    return filteredComponents.map(component => {
      const worksDataForLongPageRowEditorV2 =
        genWorksDataByComponentData(component);
      const gridsData: GridRow[] = component.data.rows;
      if (component.compId === 'BdGr_CTutd') {
        console.log('component', component);
      }
      return (
        <LongPageRowEditorV2
          key={component.compId}
          gridsData={gridsData}
          worksData={worksDataForLongPageRowEditorV2}
          readonly={true}
          blockStyle={{
            width: '375px',
            maxWidth: 'unset',
            boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            height: 'auto',
          }}
          blockWrapper={rowDOM => (
            <ComponentItemWrapper
              key={component.compId}
              component={component}
              groupId={groupId}
              rowDOM={rowDOM}
              zoom={zoom}
            />
          )}
        />
      );
    });
  };

  return (
    <>
      {/* 分类筛选 */}
      {categories.size > 0 && (
        <CateView className='cate_view'>
          <div className='scroll_view'>
            <div
              className={cn('cate_item', activeCate === undefined && 'active')}
              onClick={() => setActiveCate(undefined)}
            >
              全部
            </div>
            {Array.from(categories).map(cate => (
              <div
                key={cate}
                className={cn('cate_item', activeCate === cate && 'active')}
                onClick={() => setActiveCate(cate)}
              >
                {cate}
              </div>
            ))}
          </div>
        </CateView>
      )}

      {/* 组件列表 - 垂直瀑布流布局 */}
      <RowRoot columns={gridColumns} aspectRatio={itemAspectRatio}>
        <div className='vertical_scroll_view'>{renderComponentList()}</div>
      </RowRoot>
    </>
  );
}

export type ComponentResourceDataType = 'components' | 'blocks';
type ViewMode = 'vertical' | 'horizontal';

interface MaterialComponentsProps {
  manager?: boolean;
  onAdd?: (component: ComponentData, group: ComponentGroupDataItem) => void;
  onAddAll?: () => void;
  onComponentClick?: (component: ComponentData) => void;
  /** 是否显示所有组件，默认 false */
  showAllComponent?: boolean;
  /** 如果有值时，则只渲染对应的分组 */
  activeComponentGroupId?: string;
  /** 数据类型：components 表示组件，blocks 表示区块 */
  dataType?: ComponentResourceDataType;
  /** 每个item的宽高比，默认 1/1 */
  itemAspectRatio?: string;
  /** 一行的列数，默认 2 列 */
  gridColumns?: number;
  /** 是否自动滚动到激活的组件/分组，默认 false */
  autoScroll?: boolean;
  /** 是否显示分组导航，默认 false */
  showGroupNavigation?: boolean;
  /** 是否只渲染激活的分组内容（性能优化），默认 false */
  renderOnlyActiveGroup?: boolean;
  /** 导航激活的分组 ID，用于外部控制激活状态 */
  activeNavigationGroupId?: string;
  /** 导航分组切换回调 */
  onNavigationGroupChange?: (groupId: string) => void;
}

function MaterialComponents({
  manager = true,
  onAdd,
  onAddAll,
  activeComponentGroupId,
  onComponentClick,
  dataType = 'components',
  itemAspectRatio = '1/1',
  gridColumns = 2,
  showAllComponent = false,
  autoScroll = false,
  showGroupNavigation = false,
  renderOnlyActiveGroup = false,
  activeNavigationGroupId,
  onNavigationGroupChange,
}: MaterialComponentsProps) {
  const worksStore = useWorksStore();
  const { widgetStateV2, isTemplate: isTemplateFromStore } = worksStore;
  const isTemplate = isTemplateFromStore ?? false;
  const {
    getRowByDepth,
    setRowAttrsByIdV2,
    ublinkComponent,
    ublinkComponentByGroup,
  } = worksStore.gridPropsOperator;
  const { themePackV3Operator } = worksStore;
  const { activeRowDepth } = widgetStateV2;

  // 最多取2层，即 [0] 或 [0,1]
  const targetRowDepth = activeRowDepth?.slice(0, 2) || [];

  const activeRow = getRowByDepth(targetRowDepth);
  const componentGroupRefId = activeRow?.componentGroupRefId;
  const sourceComponentId = activeRow?.sourceComponentId;

  // 根据 dataType 获取对应的数据源
  const rawGroupData =
    dataType === 'components'
      ? themePackV3Operator.componentGroupData
      : themePackV3Operator.blockGroupData;

  const componentGroupData: ComponentGroupData = (() => {
    const d = rawGroupData;
    if (Array.isArray(d)) {
      return d;
    }
    return Object.values((d || {}) as any);
  })();

  // 根据 dataType 获取对应的操作方法
  const setGroupData =
    dataType === 'components'
      ? themePackV3Operator.setComponentGroupData
      : themePackV3Operator.setBlockGroupData;

  const deleteGroupData =
    dataType === 'components'
      ? themePackV3Operator.deleteComponentGroupData
      : themePackV3Operator.deleteBlockGroupData;

  const moveComponentToGroup =
    dataType === 'components'
      ? themePackV3Operator.moveComponentToGroup
      : themePackV3Operator.moveBlockToGroup;

  // 根据数据类型获取显示文本
  const getDisplayText = (key: 'component' | 'group' | 'empty') => {
    const texts = {
      components: {
        component: '组件',
        group: '组件分组',
        empty: '暂无组件',
      },
      blocks: {
        component: '区块',
        group: '区块分组',
        empty: '暂无区块',
      },
    };
    return texts[dataType][key];
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [itemWidth, setItemWidth] = useState(160);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {}
  );
  const [updateKey, setUpdateKey] = useState(0);
  const [isSortMode, setIsSortMode] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [originalGroupData, setOriginalGroupData] =
    useState<ComponentGroupData | null>(null);
  const [internalActiveNavGroupId, setInternalActiveNavGroupId] =
    useState<string>();
  const groupRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const userHasManuallySelectedRef = useRef(false); // 标记用户是否手动选择过分组
  const prevActiveComponentGroupIdRef = useRef<string | undefined>(
    activeComponentGroupId
  ); // 记录上一次的 activeComponentGroupId

  // 使用外部传入的激活分组ID或内部状态
  const activeNavGroupId = activeNavigationGroupId ?? internalActiveNavGroupId;

  // 根据 activeComponentGroupId 或 componentGroupRefId 初始化/更新默认激活的导航分组
  useEffect(() => {
    // 如果有外部控制，则不自动更新
    if (activeNavigationGroupId !== undefined) {
      return;
    }

    // 如果 activeComponentGroupId 发生了变化，重置手动选择标记
    if (
      activeComponentGroupId &&
      activeComponentGroupId !== prevActiveComponentGroupIdRef.current
    ) {
      userHasManuallySelectedRef.current = false;
      prevActiveComponentGroupIdRef.current = activeComponentGroupId;
    }

    // 如果用户已经手动选择过，则不再自动更新
    if (userHasManuallySelectedRef.current) {
      return;
    }

    // 优先使用 activeComponentGroupId，其次使用 componentGroupRefId
    const targetGroupId = activeComponentGroupId || componentGroupRefId;

    if (targetGroupId && targetGroupId !== internalActiveNavGroupId) {
      setInternalActiveNavGroupId(targetGroupId);
    }
  }, [
    activeComponentGroupId,
    componentGroupRefId,
    activeNavigationGroupId,
    internalActiveNavGroupId,
  ]);

  useEffect(() => {
    if (containerRef) {
      const itemDO = containerRef.current?.querySelector('.row_wrapper');
      if (itemDO) {
        setItemWidth(itemDO.clientWidth);
      }
    }
  }, [containerRef]);

  const zoom = (itemWidth / 375).toFixed(2);

  // 获取所有分组列表（用于移动组件）
  const getAllGroupsList = () => {
    if (!componentGroupData) return [];
    return Object.values(componentGroupData).map(group => ({
      id: group.groupId,
      name: group.groupName,
    }));
  };

  const allGroupsList = getAllGroupsList();

  // 初始化展开状态（默认全部展开）
  useEffect(() => {
    const initialExpanded: Record<string, boolean> = {};
    componentGroupData?.forEach(group => {
      if (expandedGroups[group.groupId] === undefined) {
        initialExpanded[group.groupId] = true;
      }
    });
    if (Object.keys(initialExpanded).length > 0) {
      setExpandedGroups(prev => ({ ...prev, ...initialExpanded }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [componentGroupData?.length]);

  // 根据 activeComponentGroupId 和 sourceComponentId 滚动到对应位置
  useEffect(() => {
    // 如果未开启自动滚动，则直接返回
    if (!autoScroll) {
      return;
    }

    if (scrollContainerRef.current) {
      // 如果有激活的组件，需要确保其所在分组是展开的
      if (sourceComponentId && activeComponentGroupId) {
        setExpandedGroups(prev => ({
          ...prev,
          [activeComponentGroupId]: true,
        }));
      }

      // 延迟执行以确保 DOM 已经渲染完成
      setTimeout(() => {
        let targetElement: Element | null = null;

        // 优先定位到具体的组件
        if (sourceComponentId && scrollContainerRef.current) {
          targetElement =
            scrollContainerRef.current.querySelector(
              `[data-component-id="${sourceComponentId}"]`
            ) || null;
        }

        // 如果没有具体组件，再定位到分组
        if (
          !targetElement &&
          activeComponentGroupId &&
          scrollContainerRef.current
        ) {
          targetElement =
            scrollContainerRef.current.querySelector(
              `[data-component-group-id="${activeComponentGroupId}"]`
            ) || null;
        }

        if (targetElement) {
          targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      }, 150);
    }
  }, [activeComponentGroupId, sourceComponentId, autoScroll]);

  const handleToggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // 一键展开/收起全部分组
  const handleToggleAllGroups = (expand: boolean) => {
    const newExpandedGroups: Record<string, boolean> = {};
    componentGroupData?.forEach(group => {
      newExpandedGroups[group.groupId] = expand;
    });
    setExpandedGroups(newExpandedGroups);
  };

  // 进入排序模式
  const handleEnterSortMode = () => {
    // 保存当前顺序
    if (componentGroupData) {
      setOriginalGroupData(deepClone(componentGroupData));
    }
    setIsSortMode(true);
    // 收起所有分组
    handleToggleAllGroups(false);
  };

  // 保存排序
  const handleSaveSortMode = () => {
    setIsSortMode(false);
    setOriginalGroupData(null);
    toast.success('分组顺序已保存');
  };

  // 取消排序
  const handleCancelSortMode = () => {
    // 恢复原始顺序
    if (originalGroupData) {
      setGroupData(originalGroupData);
      setUpdateKey(prev => prev + 1);
    }
    setIsSortMode(false);
    setOriginalGroupData(null);
    toast.success('已取消调整');
  };

  // 拖拽开始
  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  // 拖拽经过
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
  };

  // 拖拽结束
  const handleDragEnd = () => {
    setDragIndex(null);
  };

  // 放置完成
  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIdx) {
      handleDragEnd();
      return;
    }

    // 重新排序分组
    if (!componentGroupData) return;
    const newData = deepClone(componentGroupData);
    const [removed] = newData.splice(dragIndex, 1);
    newData.splice(dropIdx, 0, removed);

    setGroupData(newData);
    setUpdateKey(prev => prev + 1);
    handleDragEnd();
  };

  // 查找组件所在的分组
  const findComponentGroup = (componentId: string) => {
    if (!componentGroupData) return null;
    for (const group of componentGroupData) {
      if (group.datas.some(c => c.compId === componentId)) {
        return deepClone(group);
      }
    }
    return null;
  };

  // 组件操作方法
  const handleComponentRename = (componentId: string, newName: string) => {
    if (!componentGroupData) return;
    const group = findComponentGroup(componentId);
    if (!group) return;

    const newData = deepClone(componentGroupData);
    const groupIdx = newData.findIndex(g => g.groupId === group.groupId);
    if (groupIdx !== -1) {
      const componentIdx = newData[groupIdx].datas.findIndex(
        c => c.compId === componentId
      );
      if (componentIdx !== -1) {
        newData[groupIdx].datas[componentIdx].compName = newName;
        setGroupData(newData);
        setUpdateKey(prev => prev + 1);
      }
    }
  };

  const handleComponentDelete = (componentId: string) => {
    if (!componentGroupData) return;
    const group = findComponentGroup(componentId);
    if (!group) return;

    const newData = deepClone(componentGroupData);
    const groupIdx = newData.findIndex(g => g.groupId === group.groupId);
    if (groupIdx !== -1) {
      newData[groupIdx].datas = newData[groupIdx].datas.filter(
        c => c.compId !== componentId
      );
      setGroupData(newData);
      setUpdateKey(prev => prev + 1);
      ublinkComponent(componentId);
    }
  };

  const handleComponentMove = (componentId: string, targetGroupId: string) => {
    if (!componentGroupData) return;
    const moveRes = moveComponentToGroup(componentId, targetGroupId);

    if (moveRes?.sourceRowId) {
      setRowAttrsByIdV2(moveRes?.sourceRowId, {
        componentGroupRefId: targetGroupId,
      });
    }
    setUpdateKey(prev => prev + 1);
  };

  const handleComponentCopy = (componentId: string) => {
    if (!componentGroupData) return;
    const group = findComponentGroup(componentId);
    if (!group) return;

    const newData = deepClone(componentGroupData);
    const groupIdx = newData.findIndex(g => g.groupId === group.groupId);
    if (groupIdx === -1) return;

    const componentIdx = newData[groupIdx].datas.findIndex(
      c => c.compId === componentId
    );
    if (componentIdx !== -1) {
      const newComponent = deepClone(newData[groupIdx].datas[componentIdx]);
      newComponent.compId = random();
      newComponent.compSourceRowId = undefined;
      newComponent.data.rows[0].sourceComponentId = newComponent.compId;
      newData[groupIdx].datas.push(newComponent);
      setGroupData(newData);
      setUpdateKey(prev => prev + 1);
      toast.success('复制成功');
    }
  };

  const handleComponentAdd = (componentId: string) => {
    if (!componentGroupData) return;
    const group = findComponentGroup(componentId);
    if (!group) return;

    const component = group.datas.find(c => c.compId === componentId);
    if (component) {
      onAdd?.(component, group);
    }
  };

  const handleComponentClick = (component: ComponentData) => {
    onComponentClick?.(component);
  };

  // 分组操作方法
  const handleGroupRename = (groupId: string, newName: string) => {
    if (!componentGroupData) return;

    const newData = deepClone(componentGroupData);
    const group = newData.find(g => g.groupId === groupId);
    if (group) {
      group.groupName = newName;
      setGroupData(newData);
    }
  };

  const handleGroupDelete = (groupId: string) => {
    if (!componentGroupData) return;
    deleteGroupData(groupId);
    ublinkComponentByGroup(groupId);
  };

  const handleGroupCreate = (groupName: string) => {
    if (!componentGroupData) return;

    const newGroup: ComponentGroupDataItem = {
      groupId: random(),
      groupName: groupName,
      datas: [],
    };

    const newData = deepClone(componentGroupData);
    newData.push(newGroup);
    setGroupData(newData);

    // 默认展开新创建的分组
    setExpandedGroups(prev => ({
      ...prev,
      [newGroup.groupId]: true,
    }));
  };

  // 导航到指定分组
  const handleNavigateToGroup = (groupId: string) => {
    // 标记为用户手动选择
    userHasManuallySelectedRef.current = true;

    // 如果有外部回调，调用它
    if (onNavigationGroupChange) {
      onNavigationGroupChange(groupId);
    } else {
      // 否则更新内部状态
      setInternalActiveNavGroupId(groupId);
    }

    const groupElement = groupRefs.current.get(groupId);
    if (groupElement && scrollContainerRef.current) {
      // 确保分组是展开的
      setExpandedGroups(prev => ({
        ...prev,
        [groupId]: true,
      }));

      // 延迟滚动以确保展开动画完成
      setTimeout(() => {
        groupElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100);
    }
  };

  // 监听滚动事件，更新激活的导航项（仅在没有外部控制时）
  useEffect(() => {
    if (
      !scrollContainerRef.current ||
      !showGroupNavigation ||
      activeNavigationGroupId !== undefined // 如果外部控制了激活状态，不自动更新
    )
      return;

    const handleScroll = () => {
      if (!scrollContainerRef.current) return;

      const containerTop =
        scrollContainerRef.current.getBoundingClientRect().top;

      // 找到当前可见的第一个分组
      for (const [groupId, element] of groupRefs.current.entries()) {
        const rect = element.getBoundingClientRect();
        const relativeTop = rect.top - containerTop;

        // 如果分组的顶部在视口上半部分，认为它是当前激活的分组
        if (relativeTop >= -50 && relativeTop <= 200) {
          // 标记为用户操作（用户通过滚动改变了分组）
          userHasManuallySelectedRef.current = true;

          if (onNavigationGroupChange) {
            onNavigationGroupChange(groupId);
          } else {
            setInternalActiveNavGroupId(groupId);
          }
          break;
        }
      }
    };

    const scrollContainer = scrollContainerRef.current;
    scrollContainer.addEventListener('scroll', handleScroll);
    // 初始化时也执行一次（但不标记为用户操作）
    const initScroll = () => {
      if (!scrollContainerRef.current) return;

      const containerTop =
        scrollContainerRef.current.getBoundingClientRect().top;

      for (const [groupId, element] of groupRefs.current.entries()) {
        const rect = element.getBoundingClientRect();
        const relativeTop = rect.top - containerTop;

        if (relativeTop >= -50 && relativeTop <= 200) {
          if (onNavigationGroupChange) {
            onNavigationGroupChange(groupId);
          } else {
            setInternalActiveNavGroupId(groupId);
          }
          break;
        }
      }
    };
    initScroll();

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [
    componentGroupData?.length,
    showGroupNavigation,
    activeNavigationGroupId,
    onNavigationGroupChange,
  ]);

  if (themePackV3Operator.loading) {
    return (
      <div className='flex items-center justify-center h-full text-gray-400'>
        加载中...
      </div>
    );
  }

  // Context 值
  const contextValue: MaterialComponentsContextValue = {
    manager,
    allGroups: allGroupsList,
    zoom,
    activeComponentId: sourceComponentId,
    itemAspectRatio,
    gridColumns,
    isTemplate: isTemplate ?? false,
    handleComponentRename,
    handleComponentMove,
    handleComponentCopy,
    handleComponentDelete,
    handleComponentAdd,
    handleComponentClick,
    handleGroupRename,
    handleGroupDelete,
    handleGroupCreate,
  };

  // 准备导航数据
  const navigationGroups =
    componentGroupData?.map(group => ({
      id: group.groupId,
      name: group.groupName,
      count: group.datas.length,
    })) || [];

  return (
    <MaterialComponentsContext.Provider value={contextValue}>
      <ComponentGroupWrapper
        ref={containerRef}
        className='h-full flex flex-col bg-white overflow-hidden'
      >
        {/* 操作按钮区域 */}
        {manager && !activeComponentGroupId && (
          <div className='flex items-center gap-1 border-b border-gray-200 px-2 pb-2'>
            {/* 创建分组按钮 - 模板模式下隐藏 */}
            {!isTemplate && <CreateGroupButton />}
            <span className='flex-1'></span>
            {onAddAll && (
              <Button
                size='sm'
                variant='outline'
                onClick={onAddAll}
                title='添加全部'
              >
                添加全部
              </Button>
            )}
            {componentGroupData && componentGroupData.length > 0 && (
              <>
                {!isSortMode && (
                  <ToggleAllGroupsButton
                    expandedGroups={expandedGroups}
                    componentGroupData={componentGroupData}
                    onToggleAll={handleToggleAllGroups}
                  />
                )}
                {/* 调整顺序按钮 - 模板模式下隐藏 */}
                {!isTemplate && (
                  <SortModeButtons
                    isSortMode={isSortMode}
                    onEnter={handleEnterSortMode}
                    onSave={handleSaveSortMode}
                    onCancel={handleCancelSortMode}
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* 主内容区域 */}
        <div className='flex-1 flex overflow-hidden'>
          {/* 左侧导航 - 通过 props 控制是否显示 */}
          {showGroupNavigation &&
            showAllComponent &&
            navigationGroups.length > 0 && (
              <GroupNavigation
                groups={navigationGroups}
                activeGroupId={activeNavGroupId}
                onNavigate={handleNavigateToGroup}
              />
            )}

          <div ref={scrollContainerRef} className='flex-1 overflow-y-auto pb-4'>
            {!Array.isArray(componentGroupData) ||
              componentGroupData?.length === 0 ? (
              <div className='flex flex-col items-center justify-center h-full text-gray-400 py-12'>
                <LayoutGrid size={48} className='mb-2' />
                <p className='text-sm'>{getDisplayText('empty')}</p>
              </div>
            ) : (
              componentGroupData?.map((group, index) => {
                if (
                  !showAllComponent &&
                  activeComponentGroupId &&
                  activeComponentGroupId !== group.groupId
                ) {
                  return null;
                }

                // 性能优化：只渲染激活的分组
                if (
                  renderOnlyActiveGroup &&
                  activeNavGroupId &&
                  activeNavGroupId !== group.groupId
                ) {
                  return null;
                }

                const isActiveGroup = componentGroupRefId === group.groupId;
                const isExpanded = isSortMode
                  ? false
                  : (expandedGroups[group.groupId] ?? true);
                const isDraggingThis = dragIndex === index;

                const groupContent = (
                  <>
                    {/* 分组头部 */}
                    {(showAllComponent || !activeComponentGroupId) && (
                      <GroupHeader
                        group={{
                          id: group.groupId,
                          name: group.groupName,
                          count: group.datas.length,
                        }}
                        isExpanded={isExpanded}
                        onToggle={() => handleToggleGroup(group.groupId)}
                        isSortMode={isSortMode}
                      />
                    )}

                    {/* 组件内容 - 排序模式下隐藏 */}
                    {isExpanded && !isSortMode && (
                      <ComponentGroupContent
                        key={`${group.groupId}_${updateKey}_${group.datas.map(c => c.compId).join('_')}`}
                        groupId={group.groupId}
                        components={group.datas}
                      />
                    )}
                  </>
                );

                // 排序模式下使用可拖拽组件
                if (isSortMode) {
                  return (
                    <DraggableGroupItem
                      key={group.groupId}
                      group={group}
                      index={index}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDragEnd={handleDragEnd}
                      onDrop={handleDrop}
                      isDragging={isDraggingThis}
                      isActiveGroup={isActiveGroup}
                    >
                      {groupContent}
                    </DraggableGroupItem>
                  );
                }

                // 普通模式下使用普通 div
                return (
                  <div
                    key={group.groupId}
                    ref={el => {
                      if (el) {
                        groupRefs.current.set(group.groupId, el);
                      } else {
                        groupRefs.current.delete(group.groupId);
                      }
                    }}
                    data-component-group-id={group.groupId}
                    className={cn(
                      'flex flex-col border border-gray-200 m-2 rounded-md component_group',
                      {
                        active: isActiveGroup,
                        user_mode: activeComponentGroupId,
                      }
                    )}
                  >
                    {groupContent}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </ComponentGroupWrapper>
    </MaterialComponentsContext.Provider>
  );
}
export default observer(MaterialComponents);

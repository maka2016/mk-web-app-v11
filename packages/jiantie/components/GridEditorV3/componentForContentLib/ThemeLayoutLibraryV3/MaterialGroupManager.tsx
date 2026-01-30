import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { cn } from '@workspace/ui/lib/utils';
import { ChevronDown, ChevronUp, FolderPlus, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  GridProps,
  MaterialGroup,
  MaterialResourceItem,
  MaterialResourcesGroup,
} from '../../types';

type GroupType = keyof MaterialResourcesGroup;

interface MaterialGroupManagerProps {
  // 分组数据
  groups: MaterialGroup<MaterialResourceItem>[];
  groupType: GroupType;
  materialResourcesGroup: GridProps['materialResourcesGroup'];
  onUpdate: (
    updatedResourcesGroup: GridProps['materialResourcesGroup']
  ) => void;

  // 素材渲染
  renderItem: (
    item: MaterialResourceItem,
    groupId: string,
    itemIndex: number,
    onEdit: () => void
  ) => React.ReactNode;

  // 素材操作
  onItemAdd?: (groupId: string) => void;
  onItemEdit?: (
    item: MaterialResourceItem,
    groupId: string,
    itemIndex: number
  ) => void;

  // UI配置
  gridLayout?: boolean;
  emptyText?: string;
  addItemButtonText?: string;
  className?: string;
  readOnlyGroupIds?: string[];
}

// 单个分组组件
function GroupItem({
  group,
  allGroups,
  groupType,
  materialResourcesGroup,
  onUpdate,
  renderItem,
  gridLayout,
  onItemAdd,
  onItemEdit,
  addItemButtonText,
  isReadOnly = false,
}: {
  group: MaterialGroup<MaterialResourceItem>;
  allGroups: MaterialGroup<MaterialResourceItem>[];
  groupType: GroupType;
  materialResourcesGroup: GridProps['materialResourcesGroup'];
  onUpdate: (
    updatedResourcesGroup: GridProps['materialResourcesGroup']
  ) => void;
  renderItem: MaterialGroupManagerProps['renderItem'];
  gridLayout: boolean;
  onItemAdd?: (groupId: string) => void;
  onItemEdit?: (
    item: MaterialResourceItem,
    groupId: string,
    itemIndex: number
  ) => void;
  addItemButtonText: string;
  isReadOnly?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const inputRef = useRef<HTMLInputElement>(null);

  // 同步外部名称变化
  useEffect(() => {
    setEditName(group.name);
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
      const updatedGroup = {
        ...group,
        name: editName.trim(),
        items: group.items.map(item => ({
          ...item,
          tag: editName.trim(),
        })),
      };

      const updatedGroups = allGroups.map(g =>
        g.id === group.id ? updatedGroup : g
      );

      onUpdate({
        ...materialResourcesGroup,
        [groupType]: updatedGroups,
      });
    } else {
      // 恢复原名称
      setEditName(group.name);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setEditName(group.name);
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    if (
      confirm(
        `确定要删除分组"${group.name}"吗？${group.items.length > 0 ? '分组内的素材也将被删除。' : ''}`
      )
    ) {
      const updatedGroups = allGroups.filter(g => g.id !== group.id);
      onUpdate({
        ...materialResourcesGroup,
        [groupType]: updatedGroups,
      });
    }
  };

  return (
    <div className='flex flex-col border border-gray-200 m-2 rounded-md'>
      {/* 分组标题栏 */}
      <div
        className={cn(
          'p-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100',
          !isExpanded && 'border-b-0'
        )}
      >
        <div
          className='p-1 cursor-pointer'
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronUp size={16} className='text-gray-500' />
          ) : (
            <ChevronDown size={16} className='text-gray-500' />
          )}
        </div>

        <div className='flex items-center gap-2 flex-1 min-w-0 h-7'>
          {isEditing && !isReadOnly ? (
            <Input
              ref={inputRef}
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className='h-full text-sm font-medium px-2 py-0'
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <div
              className='flex items-center gap-2 cursor-pointer h-full'
              onClick={e => {
                if (!isReadOnly) {
                  e.stopPropagation();
                  setIsEditing(true);
                } else {
                  setIsExpanded(!isExpanded);
                }
              }}
            >
              <div className='text-sm font-medium text-gray-800'>
                {group.name}
              </div>
              <div className='text-xs text-gray-500'>
                ({group.items.length})
              </div>
            </div>
          )}
        </div>

        <div className='flex items-center gap-1'>
          {onItemAdd && !isReadOnly && (
            <button
              onClick={e => {
                e.stopPropagation();
                onItemAdd(group.id);
              }}
              className='p-1 hover:bg-gray-200 rounded transition-colors'
              title={addItemButtonText}
            >
              <Plus size={16} />
            </button>
          )}
          {!isReadOnly && (
            <button
              onClick={e => {
                e.stopPropagation();
                handleDelete();
              }}
              className='p-1 hover:bg-gray-200 rounded transition-colors'
              title='删除分组'
            >
              <Trash2 size={16} className='text-red-600' />
            </button>
          )}
        </div>
      </div>

      {/* 分组内容区 */}
      {isExpanded && (
        <div className='p-2'>
          {/* 素材列表 */}
          {group.items.length === 0 ? (
            <div className='py-8 text-center text-sm text-gray-400'>
              暂无素材
            </div>
          ) : gridLayout ? (
            // 网格布局 - 一行3列
            <div className='grid grid-cols-3 gap-2'>
              {group.items.map((item, index) => (
                <div key={`${group.id}-${index}`}>
                  {renderItem(item, group.id, index, () =>
                    onItemEdit?.(item, group.id, index)
                  )}
                </div>
              ))}
            </div>
          ) : (
            // 列表布局
            <div className='flex flex-col gap-1'>
              {group.items.map((item, index) => (
                <div key={`${group.id}-${index}`} className='w-full'>
                  {renderItem(item, group.id, index, () =>
                    onItemEdit?.(item, group.id, index)
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 主组件：完整的分组+素材管理系统
export default function MaterialGroupManager({
  groups,
  groupType,
  materialResourcesGroup,
  onUpdate,
  renderItem,
  onItemAdd,
  onItemEdit,
  gridLayout = false,
  emptyText = '暂无分组',
  addItemButtonText = '添加素材',
  className,
  readOnlyGroupIds = [],
}: MaterialGroupManagerProps) {
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const handleAddGroup = () => {
    if (!newGroupName.trim()) return;

    const newGroup: MaterialGroup<MaterialResourceItem> = {
      id: `group-${Date.now()}`,
      name: newGroupName.trim(),
      items: [],
    };

    onUpdate({
      ...materialResourcesGroup,
      [groupType]: [...groups, newGroup],
    });

    setNewGroupName('');
    setShowAddGroup(false);
  };

  return (
    <div className={cn('h-full flex flex-col bg-white', className)}>
      {/* 顶部添加分组按钮 */}
      <div className='flex-shrink-0 p-2 border-b border-gray-200'>
        <Popover open={showAddGroup} onOpenChange={setShowAddGroup}>
          <PopoverTrigger asChild>
            <Button variant='outline' size='sm'>
              <FolderPlus size={16} className='mr-2' />
              添加分组
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-80'>
            <div className='space-y-3'>
              <div className='text-sm font-medium'>添加分组</div>
              <Input
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                placeholder='请输入分组名称'
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleAddGroup();
                  }
                }}
                autoFocus
              />
              <div className='flex gap-2 justify-end'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setShowAddGroup(false)}
                >
                  取消
                </Button>
                <Button
                  size='sm'
                  onClick={handleAddGroup}
                  disabled={!newGroupName.trim()}
                >
                  确定
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* 分组列表 */}
      <div className='flex-1 overflow-y-auto'>
        {groups.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-full text-gray-400'>
            <FolderPlus size={48} className='mb-2' />
            <p className='text-sm'>{emptyText}</p>
            <p className='text-xs mt-1'>点击上方按钮添加分组</p>
          </div>
        ) : (
          groups.map(group => (
            <GroupItem
              key={group.id}
              group={group}
              allGroups={groups}
              groupType={groupType}
              materialResourcesGroup={materialResourcesGroup}
              onUpdate={onUpdate}
              renderItem={renderItem}
              gridLayout={gridLayout}
              onItemAdd={onItemAdd}
              onItemEdit={onItemEdit}
              addItemButtonText={addItemButtonText}
              isReadOnly={readOnlyGroupIds.includes(group.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

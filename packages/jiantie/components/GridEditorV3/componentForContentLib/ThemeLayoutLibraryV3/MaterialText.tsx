import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Edit2 } from 'lucide-react';
import { observer } from 'mobx-react';
import { useState } from 'react';
import { MaterialResourceItemForText } from '../../types';
import { useWorksStore } from '../../works-store/store/hook';
import MaterialGroupManager from './MaterialGroupManager';
import MaterialItemEditor from './MaterialItemEditor';

function MaterialText() {
  const worksStore = useWorksStore();
  const { gridProps } = worksStore.worksData;
  const { materialResourcesGroup } = gridProps;
  const textGroups = materialResourcesGroup?.text || [];

  const [editingItem, setEditingItem] = useState<{
    item: MaterialResourceItemForText;
    groupId: string;
    itemIndex: number;
  } | null>(null);

  const [showAddText, setShowAddText] = useState(false);
  const [addingGroupId, setAddingGroupId] = useState<string>('');
  const [newTextContent, setNewTextContent] = useState('');
  const [newTextName, setNewTextName] = useState('');

  // 渲染单个文字素材
  const renderTextItem = (
    item: MaterialResourceItemForText,
    groupId: string,
    itemIndex: number,
    onEdit: () => void
  ) => {
    if (item.type !== 'text') return null;
    return (
      <div className='group relative p-2 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0'>
        <div className='flex items-start gap-2'>
          {/* 文字内容 */}
          <div className='flex-1 min-w-0'>
            <div className='text-sm text-gray-900 line-clamp-2 break-words'>
              {item.content}
            </div>
            {item.name && (
              <div className='text-xs text-gray-500 mt-1 truncate'>
                {item.name}
              </div>
            )}
          </div>

          {/* 编辑按钮 */}
          <button
            className='opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded flex-shrink-0'
            onClick={e => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Edit2 size={12} className='text-gray-600' />
          </button>
        </div>
      </div>
    );
  };

  // 统一的更新处理
  const handleUpdate = (
    updatedResourcesGroup: typeof materialResourcesGroup
  ) => {
    worksStore.setGridProps({
      materialResourcesGroup: updatedResourcesGroup,
    });
  };

  // 添加文字到指定分组
  const handleAddTextToGroup = (groupId: string) => {
    setAddingGroupId(groupId);
    setNewTextContent('');
    setNewTextName('');
    setShowAddText(true);
  };

  // 保存新文字
  const handleSaveNewText = () => {
    if (!newTextContent.trim()) return;

    const targetGroup = textGroups.find(g => g.id === addingGroupId);
    if (!targetGroup) return;

    const newTextItem: MaterialResourceItemForText = {
      tag: targetGroup.name,
      type: 'text',
      content: newTextContent.trim(),
      name: newTextName.trim() || '未命名文字',
    };

    const updatedGroups = textGroups.map(group => {
      if (group.id === addingGroupId) {
        return {
          ...group,
          items: [...group.items, newTextItem],
        };
      }
      return group;
    }) as typeof textGroups;

    worksStore.setGridProps({
      materialResourcesGroup: {
        ...materialResourcesGroup,
        text: updatedGroups,
      },
    });

    setShowAddText(false);
    setNewTextContent('');
    setNewTextName('');
  };

  // 保存编辑
  const handleSaveEdit = (data: {
    name: string;
    tag: string;
    content?: any;
  }) => {
    if (!editingItem) return;

    const { groupId, itemIndex } = editingItem;
    const targetGroup = textGroups.find(g => g.id === groupId);
    if (!targetGroup) return;

    const updatedItem = {
      ...editingItem.item,
      name: data.name,
      tag: data.tag,
    };

    const newGroupId = textGroups.find(g => g.name === data.tag)?.id || groupId;

    if (newGroupId === groupId) {
      const updatedGroups = textGroups.map(group => {
        if (group.id === groupId) {
          const newItems = [...group.items];
          newItems[itemIndex] = updatedItem as any;
          return { ...group, items: newItems };
        }
        return group;
      });

      worksStore.setGridProps({
        materialResourcesGroup: {
          ...materialResourcesGroup,
          text: updatedGroups as typeof textGroups,
        },
      });
    } else {
      const updatedGroups = textGroups.map(group => {
        if (group.id === groupId) {
          const newItems = group.items.filter((_, idx) => idx !== itemIndex);
          return { ...group, items: newItems };
        } else if (group.id === newGroupId) {
          return { ...group, items: [...group.items, updatedItem as any] };
        }
        return group;
      });

      worksStore.setGridProps({
        materialResourcesGroup: {
          ...materialResourcesGroup,
          text: updatedGroups as typeof textGroups,
        },
      });
    }

    setEditingItem(null);
  };

  // 删除文字
  const handleDeleteText = () => {
    if (!editingItem) return;

    const { groupId, itemIndex } = editingItem;
    const updatedGroups = textGroups.map(group => {
      if (group.id === groupId) {
        const newItems = group.items.filter((_, idx) => idx !== itemIndex);
        return { ...group, items: newItems };
      }
      return group;
    }) as typeof textGroups;

    worksStore.setGridProps({
      materialResourcesGroup: {
        ...materialResourcesGroup,
        text: updatedGroups,
      },
    });

    setEditingItem(null);
  };

  return (
    <>
      <MaterialGroupManager
        groups={textGroups as any}
        groupType='text'
        materialResourcesGroup={materialResourcesGroup}
        onUpdate={handleUpdate}
        renderItem={(item, groupId, itemIndex, onEdit) => {
          // 类型断言，确保 item 为 MaterialResourceItemForText（避免类型不兼容）
          if (item.type !== 'text') return null;
          // 注意 renderTextItem 的参数限定为 MaterialResourceItemForText
          return renderTextItem(
            item as MaterialResourceItemForText,
            groupId,
            itemIndex,
            onEdit
          );
        }}
        onItemAdd={handleAddTextToGroup}
        onItemEdit={(item, groupId, itemIndex) => {
          // 只在类型为 text 时才允许编辑
          if (item.type === 'text') {
            setEditingItem({
              item: item as MaterialResourceItemForText,
              groupId,
              itemIndex,
            });
          }
        }}
        gridLayout={false}
        emptyText='暂无文字分组'
        addItemButtonText='添加文字'
      />

      {/* 添加文字对话框 */}
      <ResponsiveDialog
        isOpen={showAddText}
        onOpenChange={setShowAddText}
        title='添加文字'
      >
        <div className='p-4 space-y-2'>
          <div className='space-y-1'>
            <Label htmlFor='text-content' className='text-xs'>
              文字内容
            </Label>
            <Input
              id='text-content'
              value={newTextContent}
              onChange={e => setNewTextContent(e.target.value)}
              placeholder='请输入文字内容'
              className='h-8'
              autoFocus
            />
          </div>
          <div className='space-y-1'>
            <Label htmlFor='text-name' className='text-xs'>
              文字名称（可选）
            </Label>
            <Input
              id='text-name'
              value={newTextName}
              onChange={e => setNewTextName(e.target.value)}
              placeholder='请输入文字名称'
              className='h-8'
            />
          </div>
          <div className='flex gap-2 justify-end pt-2'>
            <Button
              variant='outline'
              onClick={() => setShowAddText(false)}
              size='sm'
            >
              取消
            </Button>
            <Button
              onClick={handleSaveNewText}
              disabled={!newTextContent.trim()}
              size='sm'
            >
              确定
            </Button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* 编辑文字对话框 */}
      <MaterialItemEditor
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        item={editingItem?.item || null}
        availableGroups={textGroups}
        onSave={handleSaveEdit}
        onDelete={handleDeleteText}
        title='编辑文字'
        renderPreview={item => (
          <div className='w-full p-2 rounded border bg-gray-50'>
            <div className='text-sm text-gray-900 break-words'>
              {item.content}
            </div>
          </div>
        )}
      />
    </>
  );
}
export default observer(MaterialText);

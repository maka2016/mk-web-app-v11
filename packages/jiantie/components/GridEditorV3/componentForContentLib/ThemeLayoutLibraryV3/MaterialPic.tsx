import { Edit2 } from 'lucide-react';
import { observer } from 'mobx-react';
import { useState } from 'react';
import { showSelector } from '../../../showSelector';
import { MaterialResourceItemForPic } from '../../types';
import { useWorksStore } from '../../works-store/store/hook';
import MaterialGroupManager from './MaterialGroupManager';
import MaterialItemEditor from './MaterialItemEditor';

function MaterialPic() {
  const worksStore = useWorksStore();
  const { gridProps } = worksStore.worksData;
  const { materialResourcesGroup } = gridProps;
  const picGroups = materialResourcesGroup?.pic || [];

  const [editingItem, setEditingItem] = useState<{
    item: MaterialResourceItemForPic;
    groupId: string;
    itemIndex: number;
  } | null>(null);

  // 渲染单个图片素材
  const renderPicItem = (
    item: MaterialResourceItemForPic,
    groupId: string,
    itemIndex: number,
    onEdit: () => void
  ) => {
    if (item.type !== 'pic') return null;
    return (
      <div className='group relative'>
        {/* 图片容器 */}
        <div
          className='relative aspect-square rounded border overflow-hidden bg-gray-100 cursor-pointer hover:shadow-sm transition-shadow'
          onClick={() => handlePicClick(item)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.content}
            alt={item.name || item.tag}
            className='w-full h-full object-cover'
            loading='lazy'
          />

          {/* 编辑按钮 - 右上角 */}
          <button
            className='absolute top-1 right-1 p-1 bg-white/90 hover:bg-white rounded opacity-0 group-hover:opacity-100 transition-opacity shadow-sm'
            onClick={e => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Edit2 size={12} className='text-gray-700' />
          </button>
        </div>

        {/* 图片名称 */}
        <div className='mt-1'>
          <div className='text-xs text-gray-900 truncate text-center'>
            {item.name || '未命名'}
          </div>
        </div>
      </div>
    );
  };

  // 处理图片点击
  const handlePicClick = (item: MaterialResourceItemForPic) => {
    // 这里可以根据实际需求实现点击逻辑
    // 例如：应用到当前选中的元素、预览图片等
    console.log('Picture clicked:', item);
  };

  // 保存编辑
  const handleSaveEdit = (data: {
    name: string;
    tag: string;
    content?: any;
  }) => {
    if (!editingItem) return;

    const { groupId, itemIndex } = editingItem;

    // 找到目标分组
    const targetGroup = picGroups.find(g => g.id === groupId);
    if (!targetGroup) return;

    // 更新素材
    const updatedItem: MaterialResourceItemForPic = {
      ...editingItem.item,
      name: data.name,
      tag: data.tag,
      type: 'pic',
    };

    // 检查是否需要移动到其他分组
    const newGroupId = picGroups.find(g => g.name === data.tag)?.id || groupId;

    if (newGroupId === groupId) {
      // 同一分组内更新
      const updatedGroups = picGroups.map(group => {
        if (group.id === groupId) {
          const newItems = [...group.items];
          newItems[itemIndex] = updatedItem;
          return { ...group, items: newItems };
        }
        return group;
      });

      worksStore.setGridProps({
        materialResourcesGroup: {
          ...materialResourcesGroup,
          pic: updatedGroups,
        },
      });
      worksStore.themePackV3Operator.syncContentToMaterialItem();
    } else {
      // 移动到其他分组
      const updatedGroups = picGroups.map(group => {
        if (group.id === groupId) {
          // 从原分组删除
          const newItems = group.items.filter((_, idx) => idx !== itemIndex);
          return { ...group, items: newItems };
        } else if (group.id === newGroupId) {
          // 添加到新分组
          return { ...group, items: [...group.items, updatedItem] };
        }
        return group;
      });

      worksStore.setGridProps({
        materialResourcesGroup: {
          ...materialResourcesGroup,
          pic: updatedGroups,
        },
      });
      worksStore.themePackV3Operator.syncContentToMaterialItem();
    }

    setEditingItem(null);
  };

  // 删除图片
  const handleDeletePic = () => {
    if (!editingItem) return;

    const { groupId, itemIndex } = editingItem;

    const updatedGroups = picGroups.map(group => {
      if (group.id === groupId) {
        const newItems = group.items.filter((_, idx) => idx !== itemIndex);
        return { ...group, items: newItems };
      }
      return group;
    }) as typeof picGroups;

    worksStore.setGridProps({
      materialResourcesGroup: {
        ...materialResourcesGroup,
        pic: updatedGroups,
      },
    });
    worksStore.themePackV3Operator.syncContentToMaterialItem();
    setEditingItem(null);
  };

  // 统一的更新处理
  const handleUpdate = (
    updatedResourcesGroup: typeof materialResourcesGroup
  ) => {
    worksStore.setGridProps({
      materialResourcesGroup: updatedResourcesGroup,
    });
    worksStore.themePackV3Operator.syncContentToMaterialItem();
  };

  // 添加图片到指定分组
  const handleAddPictureToGroup = (groupId: string) => {
    showSelector({
      type: 'picture',
      onSelected: selectedItem => {
        const targetGroup = picGroups.find(g => g.id === groupId);
        if (!targetGroup) return;

        const newPicItem: MaterialResourceItemForPic = {
          tag: targetGroup.name,
          type: 'pic',
          content: selectedItem.url,
          name: selectedItem.name || '未命名图片',
        };

        const updatedGroups = picGroups.map(group => {
          if (group.id === groupId) {
            return {
              ...group,
              items: [...group.items, newPicItem],
            };
          }
          return group;
        });

        worksStore.setGridProps({
          materialResourcesGroup: {
            ...materialResourcesGroup,
            pic: updatedGroups,
          },
        });
        worksStore.themePackV3Operator.syncContentToMaterialItem();
      },
    });
  };

  return (
    <>
      <MaterialGroupManager
        groups={picGroups}
        groupType='pic'
        materialResourcesGroup={materialResourcesGroup}
        onUpdate={handleUpdate}
        renderItem={(item, groupId, itemIndex, onEdit) => {
          // 类型断言，确保 item 为 MaterialResourceItemForPic（避免类型不兼容）
          if (item.type !== 'pic') return null;
          // 注意 renderPicItem 的参数限定为 MaterialResourceItemForPic
          return renderPicItem(
            item as MaterialResourceItemForPic,
            groupId,
            itemIndex,
            onEdit
          );
        }}
        onItemAdd={handleAddPictureToGroup}
        onItemEdit={(item, groupId, itemIndex) => {
          // 只在类型为 pic 时才允许编辑
          if (item.type === 'pic') {
            setEditingItem({
              item: item as MaterialResourceItemForPic,
              groupId,
              itemIndex,
            });
          }
        }}
        gridLayout={true}
        emptyText='暂无图片分组'
        addItemButtonText='添加图片'
      />

      {/* 编辑素材对话框 */}
      <MaterialItemEditor
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        item={editingItem?.item || null}
        availableGroups={picGroups}
        onSave={handleSaveEdit}
        onDelete={handleDeletePic}
        title='编辑图片'
        renderPreview={item => (
          <div className='w-24 h-24 rounded border overflow-hidden bg-gray-100'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.content}
              alt={item.name || item.tag}
              className='w-full h-full object-cover'
            />
          </div>
        )}
      />
    </>
  );
}
export default observer(MaterialPic);

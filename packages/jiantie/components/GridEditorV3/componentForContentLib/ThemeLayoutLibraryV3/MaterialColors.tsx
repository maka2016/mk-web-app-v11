import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Edit2 } from 'lucide-react';
import { observer } from 'mobx-react';
import { useState } from 'react';
import ColorPickerPopover from '../../components/ColorPicker';
import { MaterialResourceItem, ThemeColorType } from '../../types';
import { useWorksStore } from '../../works-store/store/hook';
import MaterialGroupManager from './MaterialGroupManager';
import MaterialItemEditor from './MaterialItemEditor';

function MaterialColors() {
  const worksStore = useWorksStore();
  const { gridProps } = worksStore.worksData;
  const { themeConfig2 } = gridProps;
  const themeConfig = themeConfig2 || ({} as any);
  const { materialResourcesGroup } = gridProps;
  const colorGroups = materialResourcesGroup?.color || [];
  const systemColors = themeConfig?.themeColors || [];

  const [editingItem, setEditingItem] = useState<{
    item: MaterialResourceItem;
    groupId: string;
    itemIndex: number;
  } | null>(null);

  const [showAddColor, setShowAddColor] = useState(false);
  const [addingGroupId, setAddingGroupId] = useState<string>('');
  const [newColorName, setNewColorName] = useState('');
  const [newThemeColors, setNewThemeColors] = useState<ThemeColorType[]>([]);

  // 编辑时的颜色状态
  const [editColors, setEditColors] = useState<ThemeColorType[]>([]);
  const [editingColorIndex, setEditingColorIndex] = useState<number | null>(
    null
  );
  const [editingColorName, setEditingColorName] = useState('');

  // 获取包含系统配色的完整分组列表
  const getAllColorGroups = () => {
    // 如果已经有系统配色分组，直接返回
    const hasSystemGroup = colorGroups.some(g => g.id === 'system-color-group');
    if (hasSystemGroup || systemColors.length === 0) {
      return colorGroups;
    }

    // 构建系统配色分组
    const systemGroup = {
      id: 'system-color-group',
      name: '系统配色',
      items: [
        {
          tag: '系统配色',
          type: 'color' as const,
          content: systemColors,
          name: '当前主题配色',
        },
      ],
    };

    return [systemGroup, ...colorGroups] as typeof colorGroups;
  };

  const allColorGroups = getAllColorGroups();

  // 初始化8个默认主题颜色
  const initDefaultColors = (): ThemeColorType[] => {
    return [
      {
        colorId: 'color_ref_id_0',
        tag: 'primary',
        type: 'color',
        name: '主题色',
        value: '#3B82F6',
      },
      {
        colorId: 'color_ref_id_1',
        tag: 'custom',
        type: 'color',
        name: '辅助色1',
        value: '#8B5CF6',
      },
      {
        colorId: 'color_ref_id_2',
        tag: 'custom',
        type: 'color',
        name: '辅助色2',
        value: '#EC4899',
      },
      {
        colorId: 'color_ref_id_3',
        tag: 'custom',
        type: 'color',
        name: '辅助色3',
        value: '#10B981',
      },
      {
        colorId: 'color_ref_id_4',
        tag: 'custom',
        type: 'color',
        name: '中性色1',
        value: '#6B7280',
      },
      {
        colorId: 'color_ref_id_5',
        tag: 'custom',
        type: 'color',
        name: '中性色2',
        value: '#9CA3AF',
      },
      {
        colorId: 'color_ref_id_6',
        tag: 'custom',
        type: 'color',
        name: '背景色1',
        value: '#F3F4F6',
      },
      {
        colorId: 'color_ref_id_7',
        tag: 'custom',
        type: 'color',
        name: '背景色2',
        value: '#FFFFFF',
      },
    ];
  };

  // 渲染单个颜色方案素材
  const renderColorItem = (
    item: MaterialResourceItem,
    groupId: string,
    itemIndex: number,
    onEdit: () => void
  ) => {
    if (item.type !== 'color') return null;

    const colors = item.content as ThemeColorType[];
    const displayColors = colors.slice(0, 8); // 最多显示8个颜色

    return (
      <div
        className='group relative'
        onClick={() => {
          worksStore.setGridProps({
            themeConfig2: {
              ...(themeConfig || {}),
              themeColors: colors,
            },
            _updateVersion: (gridProps._updateVersion || 0) + 1,
          });
          worksStore.themePackV3Operator.syncContentToMaterialItem();
        }}
      >
        {/* 颜色方案容器 */}
        <div className='relative rounded border overflow-hidden bg-white hover:shadow-sm transition-shadow'>
          {/* 颜色网格 - 2行4列 */}
          <div className='grid grid-cols-4 gap-0'>
            {displayColors.map((color, idx) => (
              <div
                key={color.colorId || idx}
                className='aspect-square'
                style={{ background: color.value }}
                title={`${color.name}: ${color.value}`}
              />
            ))}
          </div>

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

        {/* 颜色方案名称 */}
        <div className='mt-1'>
          <div className='text-xs text-gray-900 truncate text-center'>
            {item.name || '未命名'}
          </div>
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
    worksStore.themePackV3Operator.syncContentToMaterialItem();
  };

  // 添加颜色方案到指定分组
  const handleAddColorToGroup = (groupId: string) => {
    setAddingGroupId(groupId);
    setNewColorName('');
    setNewThemeColors(initDefaultColors());
    setShowAddColor(true);
  };

  // 更新新颜色方案中的某个颜色
  const handleUpdateNewColor = (
    index: number,
    colorValue: { value: string; type: string }
  ) => {
    const updatedColors = [...newThemeColors];
    updatedColors[index] = {
      ...updatedColors[index],
      value: colorValue.value,
      type: colorValue.type as 'color' | 'gradient',
    };
    setNewThemeColors(updatedColors);
  };

  // 保存新颜色方案
  const handleSaveNewColor = () => {
    if (!newColorName.trim()) return;

    const targetGroup = colorGroups.find(g => g.id === addingGroupId);
    if (!targetGroup) return;

    const newColorItem: MaterialResourceItem = {
      tag: targetGroup.name,
      type: 'color',
      content: newThemeColors,
      name: newColorName.trim(),
    };

    const updatedGroups = colorGroups.map(group => {
      if (group.id === addingGroupId) {
        return {
          ...group,
          items: [...group.items, newColorItem],
        };
      }
      return group;
    }) as typeof colorGroups;

    worksStore.setGridProps({
      materialResourcesGroup: {
        ...materialResourcesGroup,
        color: updatedGroups,
      },
    });
    worksStore.themePackV3Operator.syncContentToMaterialItem();
    setShowAddColor(false);
    setNewColorName('');
  };

  // 更新编辑中的颜色值
  const handleEditColorChange = (
    index: number,
    colorValue: { value: string; type: string }
  ) => {
    const updatedColors = [...editColors];
    updatedColors[index] = {
      ...updatedColors[index],
      value: colorValue.value,
      type: colorValue.type as 'color' | 'gradient',
    };
    setEditColors(updatedColors);
  };

  // 更新颜色名称
  const handleColorNameChange = (index: number, newName: string) => {
    const updatedColors = [...editColors];
    updatedColors[index] = {
      ...updatedColors[index],
      name: newName,
    };
    setEditColors(updatedColors);
    setEditingColorIndex(null);
  };

  // 保存编辑
  const handleSaveEdit = (data: { name: string; tag: string }) => {
    if (!editingItem) return;

    const { groupId, itemIndex } = editingItem;

    // 如果是系统配色，直接更新 themeConfig
    if (groupId === 'system-color-group') {
      worksStore.setGridProps({
        themeConfig2: {
          ...themeConfig,
          themeColors: editColors,
        },
        _updateVersion: (gridProps._updateVersion || 0) + 1,
      });
      worksStore.themePackV3Operator.syncContentToMaterialItem();
      setEditingItem(null);
      return;
    }

    const targetGroup = colorGroups.find(g => g.id === groupId);
    if (!targetGroup) {
      setEditingItem(null);
      return;
    }

    const updatedItem = {
      ...editingItem.item,
      name: data.name,
      tag: data.tag,
      content: editColors, // 保存修改后的颜色
    };

    const newGroupId =
      colorGroups.find(g => g.name === data.tag)?.id || groupId;

    if (newGroupId === groupId) {
      const updatedGroups = colorGroups.map(group => {
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
          color: updatedGroups as typeof colorGroups,
        },
      });
      worksStore.themePackV3Operator.syncContentToMaterialItem();
    } else {
      const updatedGroups = colorGroups.map(group => {
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
          color: updatedGroups as typeof colorGroups,
        },
      });
      worksStore.themePackV3Operator.syncContentToMaterialItem();
    }

    setEditingItem(null);
  };

  // 删除颜色方案
  const handleDeleteColor = () => {
    if (!editingItem) return;

    const { groupId, itemIndex } = editingItem;

    // 系统配色不允许删除
    if (groupId === 'system-color-group') {
      setEditingItem(null);
      return;
    }

    const updatedGroups = colorGroups.map(group => {
      if (group.id === groupId) {
        const newItems = group.items.filter((_, idx) => idx !== itemIndex);
        return { ...group, items: newItems };
      }
      return group;
    }) as typeof colorGroups;

    worksStore.setGridProps({
      materialResourcesGroup: {
        ...materialResourcesGroup,
        color: updatedGroups,
      },
    });
    worksStore.themePackV3Operator.syncContentToMaterialItem();
    setEditingItem(null);
  };

  return (
    <>
      <MaterialGroupManager
        groups={allColorGroups as any}
        groupType='color'
        materialResourcesGroup={materialResourcesGroup}
        onUpdate={handleUpdate}
        renderItem={renderColorItem}
        onItemAdd={handleAddColorToGroup}
        onItemEdit={(item, groupId, itemIndex) => {
          setEditingItem({ item, groupId, itemIndex });
          // 初始化编辑状态
          if (item.type === 'color') {
            setEditColors((item.content as ThemeColorType[]) || []);
          }
        }}
        gridLayout={true}
        emptyText='暂无颜色分组'
        addItemButtonText='添加颜色方案'
        readOnlyGroupIds={['system-color-group']}
      />

      {/* 添加颜色方案对话框 */}
      <ResponsiveDialog
        isOpen={showAddColor}
        onOpenChange={setShowAddColor}
        title='添加颜色方案'
      >
        <div className='p-4 space-y-2'>
          <div className='space-y-1'>
            <Label htmlFor='color-name' className='text-xs'>
              方案名称
            </Label>
            <Input
              id='color-name'
              value={newColorName}
              onChange={e => setNewColorName(e.target.value)}
              placeholder='请输入颜色方案名称'
              className='h-8'
              autoFocus
            />
          </div>

          {/* 颜色列表 */}
          <div className='space-y-1'>
            <Label className='text-xs'>配色方案（8色）</Label>
            <div className='grid grid-cols-2 gap-2'>
              {newThemeColors.map((color, index) => (
                <div key={color.colorId} className='flex items-center gap-2'>
                  <ColorPickerPopover
                    value={color.value}
                    useThemeColor={false}
                    onChange={newColor => {
                      if (newColor) {
                        handleUpdateNewColor(index, newColor);
                      }
                    }}
                  />
                  <span className='text-xs text-gray-600 flex-1 truncate'>
                    {color.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className='flex gap-2 justify-end pt-2'>
            <Button
              variant='outline'
              onClick={() => setShowAddColor(false)}
              size='sm'
            >
              取消
            </Button>
            <Button
              onClick={handleSaveNewColor}
              disabled={!newColorName.trim()}
              size='sm'
            >
              确定
            </Button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* 编辑颜色方案对话框 */}
      <MaterialItemEditor
        isOpen={!!editingItem}
        onClose={() => {
          setEditingItem(null);
          setEditingColorIndex(null);
        }}
        item={editingItem?.item || null}
        availableGroups={colorGroups}
        onSave={handleSaveEdit}
        onDelete={handleDeleteColor}
        title='编辑颜色方案'
        renderPreview={item => {
          if (item.type !== 'color') return null;

          return (
            <div className='w-full space-y-2'>
              <Label className='text-xs'>配色方案（点击色块修改）</Label>
              <div className='grid grid-cols-2 gap-2'>
                {editColors.map((color, index) => (
                  <div
                    key={color.colorId}
                    className='flex items-center gap-2 p-2 rounded border border-gray-100 hover:bg-gray-50'
                  >
                    <ColorPickerPopover
                      value={color.value}
                      useThemeColor={false}
                      onChange={newColor => {
                        if (newColor) {
                          handleEditColorChange(index, newColor);
                        }
                      }}
                    />

                    <div className='flex-1 min-w-0'>
                      {editingColorIndex === index ? (
                        <div className='flex items-center gap-1'>
                          <Input
                            value={editingColorName}
                            onChange={e => setEditingColorName(e.target.value)}
                            className='h-6 text-xs'
                            placeholder='颜色名称'
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                handleColorNameChange(index, editingColorName);
                              }
                              if (e.key === 'Escape') {
                                setEditingColorIndex(null);
                              }
                            }}
                            autoFocus
                          />
                          <Button
                            size='sm'
                            variant='ghost'
                            className='h-6 w-6 p-0'
                            onClick={() =>
                              handleColorNameChange(index, editingColorName)
                            }
                          >
                            ✓
                          </Button>
                          <Button
                            size='sm'
                            variant='ghost'
                            className='h-6 w-6 p-0'
                            onClick={() => setEditingColorIndex(null)}
                          >
                            ✗
                          </Button>
                        </div>
                      ) : (
                        <div className='flex items-center justify-between'>
                          <span className='text-xs text-gray-900'>
                            {color.name}
                          </span>
                          <Button
                            size='sm'
                            variant='ghost'
                            className='h-6 w-6 p-0'
                            onClick={() => {
                              setEditingColorIndex(index);
                              setEditingColorName(color.name);
                            }}
                          >
                            <Edit2 className='w-3 h-3' />
                          </Button>
                        </div>
                      )}
                      <div className='text-xs text-gray-500'>{color.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }}
      />
    </>
  );
}
export default observer(MaterialColors);

import { random } from '@mk/utils';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Check, Edit2, X } from 'lucide-react';
import { useState } from 'react';
import ColorPickerPopover from '.';
import { useGridContext } from '../../comp/provider';
import { ThemeColorType } from '../types';

export default function ColorSetting() {
  const { themeConfig, editorSDK, gridProps } = useGridContext();
  const { themeColors = [] } = themeConfig;

  // 主要颜色（第一个颜色）
  const primaryColor = themeColors.find(color => color.tag === 'primary') || {
    tag: 'primary' as const,
    type: 'color' as const,
    name: '主要颜色',
    value: '#3B82F6',
  };

  // 自定义颜色（除了主要颜色之外的颜色）
  const customColors = themeColors.filter(color => color.tag === 'custom');

  // 编辑状态
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // 更新主题配置
  const updateThemeConfig = (updates: { themeColors: any[] }) => {
    editorSDK?.onFormValueChange({
      themeConfig2: {
        ...themeConfig,
        ...updates,
      },
      // _updateVersion: (gridProps._updateVersion || 0) + 1,
    });
  };

  // 更新主要颜色
  const updatePrimaryColor = (color: { value: string; type: string }) => {
    const updatedColors = themeColors.filter(c => c.tag !== 'primary');
    updatedColors.unshift({
      colorId: random(),
      tag: 'primary',
      type: color.type as 'color' | 'gradient',
      name: '主要颜色',
      value: color.value,
    });
    updateThemeConfig({ themeColors: updatedColors });
  };

  // 添加自定义颜色
  const addCustomColor = (color: { value: string; type: string }) => {
    const newColor = {
      colorId: random(),
      tag: 'custom' as const,
      type: color.type as 'color' | 'gradient',
      name: `自定义颜色 ${customColors.length + 1}`,
      value: color.value,
    };
    updateThemeConfig({
      themeColors: [...themeColors, newColor],
    });
  };

  // 更新自定义颜色
  const updateCustomColor = (id: string, updates: Partial<ThemeColorType>) => {
    const updatedColors = themeColors.map(color =>
      color.tag === 'custom' && color.name === id
        ? { ...color, ...updates }
        : color
    );
    updateThemeConfig({ themeColors: updatedColors });
  };

  // 删除自定义颜色
  const deleteCustomColor = (id: string) => {
    const updatedColors = themeColors.filter(
      color => !(color.tag === 'custom' && color.name === id)
    );
    updateThemeConfig({ themeColors: updatedColors });
  };

  // 开始编辑
  const startEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  // 保存编辑
  const saveEdit = () => {
    if (editingId && editingName.trim()) {
      updateCustomColor(editingId, { name: editingName.trim() });
      setEditingId(null);
      setEditingName('');
    }
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  return (
    <div className='p-4 space-y-6'>
      {/* 主要颜色区域 */}
      {/* <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900">主要颜色</h3>
        <div className="flex items-center gap-3">
          <ColorPickerPopover
            value={primaryColor.value}
            useThemeColor={false}
            onChange={(color) => updatePrimaryColor(color)}
            // wrapper={(children: React.ReactNode) => (
            //   <div className="w-12 h-8 rounded border border-gray-200 cursor-pointer overflow-hidden">
            //     {children}
            //   </div>
            // )}
          />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">
              {primaryColor.name}
            </div>
            <div className="text-xs text-gray-500">{primaryColor.value}</div>
          </div>
        </div>
      </div> */}

      {/* 自定义颜色区域 */}
      <div className='space-y-3'>
        {/* <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">自定义颜色</h3>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={() => addCustomColor({ value: "#000000", type: "color" })}
          >
            <Plus className="w-3 h-3 mr-1" />
            添加颜色
          </Button>
        </div> */}

        <div className='space-y-2'>
          {customColors.map((color, index) => (
            <div
              key={`${color.name}-${index}`}
              className='flex items-center gap-3 p-2 rounded border border-gray-100 hover:bg-gray-50'
            >
              <ColorPickerPopover
                value={color.value}
                useThemeColor={false}
                onChange={newColor => {
                  if (newColor) {
                    updateCustomColor(color.name, {
                      value: newColor.value,
                      type: newColor.type as 'color' | 'gradient',
                    });
                  }
                }}
                themeColors={themeColors}
                // wrapper={(children: React.ReactNode) => (
                //   <div className="w-8 h-8 rounded border border-gray-200 cursor-pointer overflow-hidden flex-shrink-0">
                //     {children}
                //   </div>
                // )}
              />

              <div className='flex-1 min-w-0'>
                {editingId === color.name ? (
                  <div className='flex items-center gap-2'>
                    <Input
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      className='h-8 text-sm'
                      placeholder='输入颜色名称'
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      autoFocus
                    />
                    <Button
                      size='sm'
                      variant='ghost'
                      className='h-8 w-8 p-0'
                      onClick={saveEdit}
                    >
                      <Check className='w-3 h-3' />
                    </Button>
                    <Button
                      size='sm'
                      variant='ghost'
                      className='h-8 w-8 p-0'
                      onClick={cancelEdit}
                    >
                      <X className='w-3 h-3' />
                    </Button>
                  </div>
                ) : (
                  <div
                    className='text-sm font-medium text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded -mx-2 -my-1'
                    onDoubleClick={() => startEdit(color.name, color.name)}
                  >
                    {color.name}
                  </div>
                )}
                <div className='text-xs text-gray-500'>{color.value}</div>
              </div>

              <div className='flex items-center gap-1'>
                <Button
                  size='sm'
                  variant='ghost'
                  className='h-8 w-8 p-0'
                  onClick={() => startEdit(color.name, color.name)}
                >
                  <Edit2 className='w-3 h-3' />
                </Button>
                {/* <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                  onClick={() => deleteCustomColor(color.name)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button> */}
              </div>
            </div>
          ))}

          {customColors.length === 0 && (
            <div className='text-center py-8 text-gray-500 text-sm'>
              暂无自定义颜色，点击&ldquo;添加颜色&rdquo;开始创建
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

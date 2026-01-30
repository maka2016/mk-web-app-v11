import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import { useEffect, useState } from 'react';
import { MaterialResourceItem } from '../../types';

export interface MaterialItemEditorProps {
  isOpen: boolean;
  onClose: () => void;
  item: MaterialResourceItem | null;
  availableGroups: { id: string; name: string }[];
  onSave: (updatedItem: { name: string; tag: string }) => void;
  onDelete: () => void;
  title?: string;
  renderPreview?: (item: MaterialResourceItem) => React.ReactNode;
}

export default function MaterialItemEditor({
  isOpen,
  onClose,
  item,
  availableGroups,
  onSave,
  onDelete,
  title = '编辑素材',
  renderPreview,
}: MaterialItemEditorProps) {
  const [editName, setEditName] = useState('');
  const [editTag, setEditTag] = useState('');

  // 当 item 变化时更新表单
  useEffect(() => {
    if (item) {
      setEditName(item.name || '');
      setEditTag(item.tag);
    }
  }, [item]);

  const handleSave = () => {
    onSave({
      name: editName,
      tag: editTag,
    });
  };

  const handleDelete = () => {
    onDelete();
  };

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onOpenChange={open => !open && onClose()}
      title={title}
    >
      <div className='space-y-2 p-4'>
        {/* 素材预览 */}
        {item && renderPreview && (
          <div className='flex justify-center pb-2'>{renderPreview(item)}</div>
        )}

        {/* 素材名称 */}
        <div className='space-y-1'>
          <Label htmlFor='material-name' className='text-xs'>
            素材名称
          </Label>
          <Input
            id='material-name'
            value={editName}
            onChange={e => setEditName(e.target.value)}
            placeholder='请输入素材名称'
            className='h-8'
          />
        </div>

        {/* 分组选择 */}
        <div className='space-y-1'>
          <Label htmlFor='material-tag' className='text-xs'>
            所属分组
          </Label>
          <Select value={editTag} onValueChange={setEditTag}>
            <SelectTrigger id='material-tag' className='h-8'>
              <SelectValue placeholder='选择分组' />
            </SelectTrigger>
            <SelectContent>
              {availableGroups.map(group => (
                <SelectItem key={group.id} value={group.name}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 操作按钮 */}
        <div className='flex gap-2 pt-2'>
          <Button variant='destructive' onClick={handleDelete} size='sm'>
            删除
          </Button>
          <span className='flex-1'></span>
          <Button variant='outline' onClick={onClose} size='sm'>
            取消
          </Button>
          <Button onClick={handleSave} size='sm'>
            保存
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
}

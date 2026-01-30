import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useMaterialResources } from '../MaterialResourceManager/hook';
import MaterialFloorManager from '../MaterialResourceManager/MaterialFloorManager';
import { MaterialFloor } from '../MaterialResourceManager/services';
import { envelopeManager } from './services';

interface EnvelopeBasicInfoFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName?: string;
  defaultCategoryId?: string;
  onConfirm: (data: { name: string; categoryId: string }) => void;
}

export default function EnvelopeBasicInfoForm({
  isOpen,
  onOpenChange,
  defaultName = '',
  defaultCategoryId = '',
  onConfirm,
}: EnvelopeBasicInfoFormProps) {
  const [name, setName] = useState(defaultName);
  const [selectedCategoryId, setSelectedCategoryId] =
    useState(defaultCategoryId);
  const [selectedCategory, setSelectedCategory] =
    useState<MaterialFloor | null>(null);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);

  // 信封资源管理
  const { categories } = useMaterialResources({
    materialManager: envelopeManager,
    mountToLoadData: true,
    pageSize: 20,
  });

  useEffect(() => {
    if (isOpen) {
      setName(defaultName);
      setSelectedCategoryId(defaultCategoryId);
      setSelectedCategory(null);
    }
  }, [isOpen, defaultName, defaultCategoryId]);

  // 递归查找分类
  const findCategory = (
    id: string,
    categoryList: MaterialFloor[]
  ): MaterialFloor | null => {
    for (const category of categoryList) {
      if (category.documentId === id) {
        return category;
      }
      if (category.children_floor && category.children_floor.length > 0) {
        const found = findCategory(id, category.children_floor);
        if (found) return found;
      }
    }
    return null;
  };

  // 当分类ID变化时，更新选中的分类对象
  useEffect(() => {
    if (selectedCategoryId && categories.length > 0) {
      const category = findCategory(selectedCategoryId, categories);
      setSelectedCategory(category);
    } else {
      setSelectedCategory(null);
    }
  }, [selectedCategoryId, categories]);

  const handleConfirm = () => {
    if (!name.trim()) {
      return;
    }
    if (!selectedCategoryId) {
      return;
    }
    onConfirm({
      name: name.trim(),
      categoryId: selectedCategoryId,
    });
    onOpenChange(false);
  };

  const getCategoryName = (): string => {
    if (selectedCategory) {
      return selectedCategory.name;
    }
    if (selectedCategoryId) {
      const category = findCategory(selectedCategoryId, categories);
      return category?.name || '请选择分类';
    }
    return '请选择分类';
  };

  return (
    <>
      <ResponsiveDialog
        disableBackNavigation={true}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        title='新建信封'
        contentProps={{
          className: 'max-w-[500px] w-full',
        }}
      >
        <div className='space-y-4 p-4'>
          <div className='space-y-2'>
            <Label>
              名称 <span className='text-red-500'>*</span>
            </Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder='请输入信封名称'
              autoFocus
            />
          </div>

          <div className='space-y-2'>
            <Label>
              所属分类 <span className='text-red-500'>*</span>
            </Label>
            <Button
              type='button'
              variant='outline'
              className='w-full justify-between'
              onClick={() => setIsCategoryDialogOpen(true)}
            >
              <span className={selectedCategoryId ? '' : 'text-gray-400'}>
                {getCategoryName()}
              </span>
              <ChevronDown className='h-4 w-4 opacity-50' />
            </Button>
            {categories.length === 0 && (
              <p className='text-sm text-gray-500'>暂无分类，请先创建分类</p>
            )}
          </div>

          <div className='flex justify-end gap-2 pt-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button
              size='sm'
              onClick={handleConfirm}
              disabled={!name.trim() || !selectedCategoryId}
            >
              下一步
            </Button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* 分类选择弹窗 */}
      <ResponsiveDialog
        disableBackNavigation={true}
        isOpen={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        title='选择分类'
        contentProps={{
          className: 'max-w-[600px] w-full max-h-[90vh] h-full overflow-y-auto',
        }}
      >
        <div className='p-4'>
          <MaterialFloorManager
            mode='selector'
            selectedFloorId={selectedCategoryId}
            materialManager={envelopeManager}
            onFloorSelect={(floorId, floor) => {
              setSelectedCategoryId(floorId);
              setSelectedCategory(floor);
              setIsCategoryDialogOpen(false);
            }}
            className='w-full'
            placeholder='搜索分类...'
            showSearch={true}
            showRefresh={false}
            showCreateEdit={false}
          />
        </div>
      </ResponsiveDialog>
    </>
  );
}

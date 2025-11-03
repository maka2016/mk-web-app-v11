import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useGridContext } from '../../comp/provider';
import LayoutTemplateRender from '../MaterialResourceManager/LayoutTemplateRender';
import { CategorySelect } from '../MaterialResourceManager/UpdateMaterialItemForm';
import { useMaterialResources } from '../MaterialResourceManager/hook';
import { MaterialItem } from '../ThemePackManager/services';
import CoverAnimationManager, { CoverPreview } from './CoverAnimationManager';
import { coverAnimateCateId, coverAnimateManager } from './services';

const pageSize = 20;

export default function CoverAnimateLibraryList() {
  const { editorCtx, gridProps, editorSDK } = useGridContext();
  const [showLayoutForm, setShowLayoutForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MaterialItem | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  const {
    list: layouts,
    selectedCategory,
    setPage,
    setCategory,
    reloadList,
    page,
    loading,
    total,
    categories,
    loadCategories,
  } = useMaterialResources({
    materialManager: coverAnimateManager,
    pageSize,
  });

  useEffect(() => {
    loadCategories();
  }, []);

  // 新增版式
  const handleAddLayout = () => {
    setEditingItem(null);
    setShowLayoutForm(true);
  };

  return (
    <div className='h-full flex flex-col bg-white overflow-hidden'>
      {/* 头部 */}
      <div className='flex-shrink-0 p-2 pt-0 border-b border-gray-200'>
        {/* 操作按钮 */}
        <div className='flex gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={handleAddLayout}
            className=''
          >
            新建
          </Button>
        </div>
      </div>

      <LayoutTemplateRender
        onItemClick={materialItem => {
          setEditingItem(materialItem);
          setShowPreview(true);
        }}
        onSettingMaterial={materialItem => {
          setEditingItem(materialItem);
          setShowLayoutForm(true);
        }}
        onRemoveMaterial={materialItem => {
          coverAnimateManager.removeItem(materialItem.documentId);
        }}
        onChangeFloor={id => {
          setCategory(id);
        }}
        activeFloorId={selectedCategory}
        floors={[...categories]}
        materials={layouts}
        loading={loading}
        currentPage={page}
        pageSize={pageSize}
        total={total}
        onPageChange={page => {
          setPage(page);
        }}
      />
      {/* 版式表单弹窗 */}
      <ResponsiveDialog
        isOpen={showLayoutForm}
        onOpenChange={setShowLayoutForm}
        title={editingItem ? '编辑' : '新增'}
      >
        <CategorySelect
          defaultValue={selectedCategoryId}
          categories={categories}
          onCategoryChange={categoryId => {
            setSelectedCategoryId(categoryId);
          }}
        />
        <CoverAnimationManager
          editorCtx={editorCtx}
          value={
            editingItem
              ? {
                  name: editingItem.name,
                  author: editingItem.author,
                  ...editingItem.content,
                }
              : {
                  type: 'page_flip',
                  coverUrl: ['', ''],
                  duration: 1000,
                  delay: 0,
                  easing: 'ease-in-out',
                  name: '',
                  author: '',
                }
          }
          onChange={async payload => {
            console.log('payload', payload);
            const { name, author, ...content } = payload;
            if (editingItem) {
              await coverAnimateManager.updateItem(editingItem.documentId, {
                name,
                content,
                author,
                cover_url: content.coverUrl[0],
                ...(selectedCategoryId
                  ? {
                      material_tags: {
                        set: [selectedCategoryId || ''],
                      },
                    }
                  : {}),
              });
            } else {
              await coverAnimateManager.createItem({
                name,
                content,
                author,
                cover_url: content.coverUrl[0],
                ...(selectedCategoryId
                  ? {
                      material_tags: {
                        set: [selectedCategoryId || ''],
                      },
                    }
                  : {}),
                material_class: {
                  set: [coverAnimateCateId],
                },
              });
            }
            setShowLayoutForm(false);
            reloadList();
          }}
        />
      </ResponsiveDialog>

      <ResponsiveDialog
        isOpen={showPreview}
        onOpenChange={open => setShowPreview(open)}
        contentProps={{
          className: 'w-[375px] h-[768px]',
        }}
      >
        <CoverPreview
          coverAnimation={editingItem?.content || {}}
          onSave={coverAnimation => {
            editorSDK?.onFormValueChange({
              coverAnimation,
            });
            toast.success('应用成功');
            setShowPreview(false);
          }}
        />
      </ResponsiveDialog>
    </div>
  );
}

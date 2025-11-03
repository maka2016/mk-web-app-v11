import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { useEffect, useState } from 'react';
import { useGridContext } from '../../comp/provider';
import { CopyRowData } from '../../comp/provider/operator';
import { scrollToActiveRow } from '../../shared';
import { useMaterialResources } from '../MaterialResourceManager/hook';
import LayoutTemplateRender from '../MaterialResourceManager/LayoutTemplateRender';
import UpdateMaterialItemForm from '../MaterialResourceManager/UpdateMaterialItemForm';
import { MaterialItem } from '../ThemePackManager/services';
import { useThemePackContext } from '../ThemePackManager/ThemeProvider';
import { layoutCateId, layoutManager } from './services';

const removeLeyerStyle = (content: CopyRowData) => {
  content.elemComps.forEach(item => {
    if (/Text/gi.test(item.elementRef)) {
      const compLink = content.positionLink[item.elemId];
      if (compLink.tag !== 'text_free') {
        delete item.attrs.color;
        delete item.attrs.fontSize;
        delete item.attrs.fontWeight;
        delete item.attrs.fontFamily;
        delete item.attrs.fontUrl;
        delete item.attrs.lineHeight;
        delete item.attrs.letterSpacing;
        delete item.attrs.layoutStyle?.lineHeight;
        delete item.attrs.layoutStyle?.letterSpacing;
        delete item.attrs.layoutStyle?.fontSize;
        delete item.attrs.layoutStyle?.fontWeight;
        delete item.attrs.layoutStyle?.fontFamily;
        delete item.attrs.layoutStyle?.fontUrl;
      }
    }
    // if (item.elementRef === "Picture") {
    //   delete item.attrs.layoutStyle;
    // }
  });
  return content;
};

const pageSize = 20;

export default function LayoutLibraryPublished() {
  const { selectedMaterialChannel } = useThemePackContext();
  const {
    editorSDK,
    addRowFromTemplate,
    addRowFromTemplateV2,
    getRowByDepth,
    useGridV2,
    widgetState,
    getCopyRowCodeV2,
  } = useGridContext();
  const [showLayoutForm, setShowLayoutForm] = useState(false);
  const [editingLayout, setEditingLayout] = useState<MaterialItem | null>(null);

  const {
    list: layouts,
    selectedCategory,
    setPage,
    setCategory,
    page,
    loading,
    total,
    loadCategories,
    categories,
  } = useMaterialResources({
    materialManager: layoutManager,
    pageSize,
  });

  useEffect(() => {
    loadCategories();
  }, []);

  // 新增版式
  const handleAddLayout = () => {
    if (!selectedMaterialChannel) {
      editorSDK?.changeWidgetState({
        showThemeChannelSelector: true,
      });
      return;
    }
    setEditingLayout(null);
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
            新建版式
          </Button>
        </div>
      </div>

      <LayoutTemplateRender
        materialManager={layoutManager}
        onItemClick={materialItem => {
          if (useGridV2) {
            const { copiedRowDepth } = addRowFromTemplateV2(
              removeLeyerStyle(materialItem.content),
              {
                activeRowDepth: [widgetState.activeRowDepth?.[0] || 0],
              }
            );
            if (copiedRowDepth) {
              const newRowId = getRowByDepth(copiedRowDepth);
              scrollToActiveRow(newRowId?.id);
            }
          } else {
            const newRowId = addRowFromTemplate(
              removeLeyerStyle(materialItem.content)
            );
            editorSDK?.changeWidgetState({
              editingElemId: undefined,
              activeCellId: undefined,
              activeRowId: newRowId?.[0],
            });
            scrollToActiveRow(newRowId?.[0]);
          }
        }}
        onSettingMaterial={materialItem => {
          setEditingLayout(materialItem);
          setShowLayoutForm(true);
        }}
        onRemoveMaterial={materialItem => {
          layoutManager.removeItem(materialItem.documentId);
        }}
        onChangeFloor={id => {
          setCategory(id);
        }}
        activeFloorId={selectedCategory}
        floors={[
          ...categories,
          ...(selectedMaterialChannel?.material_tags || []),
        ]}
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
        title={editingLayout ? '编辑版式' : '新增版式'}
      >
        <UpdateMaterialItemForm
          defaultContent={
            widgetState.activeRowDepth?.[0]
              ? getCopyRowCodeV2({
                  activeRowDepth: [widgetState.activeRowDepth?.[0]],
                })
              : undefined
          }
          materialItem={editingLayout}
          categories={[
            ...categories,
            ...(selectedMaterialChannel?.material_tags || []),
          ]}
          onClose={() => setShowLayoutForm(false)}
          onSubmit={async submitData => {
            if (editingLayout) {
              await layoutManager.updateItem(
                editingLayout.documentId,
                submitData
              );
            } else {
              await layoutManager.createItem({
                ...submitData,
                material_class: {
                  set: [layoutCateId],
                },
              });
            }
            setPage(1);
            setShowLayoutForm(false);
          }}
          selectedCategory={selectedCategory}
        />
      </ResponsiveDialog>
    </div>
  );
}

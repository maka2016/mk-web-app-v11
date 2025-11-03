import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useGridContext } from '../../comp/provider';
import { scrollToActiveRow } from '../../shared';
import LayoutTemplateRender from '../MaterialResourceManager/LayoutTemplateRender2';
import { useMaterialResources } from '../MaterialResourceManager/hook';
import SyncAllBlockToCms from './SyncAllBlockToCms';
import { themePackV2Manager } from './services';

const pageSize = 20;

export default function LayoutLibraryPublished() {
  const {
    editorSDK,
    addRowFromTemplate,
    addRowFromTemplateV2,
    useGridV2,
    widgetState,
    getRowByDepth,
  } = useGridContext();
  const [showLayoutForm, setShowLayoutForm] = useState(false);

  const {
    list: layouts,
    selectedCategory,
    setPage,
    setCategory,
    page,
    loading,
    total,
    reloadList,
    loadCategories,
    categories,
    setSearch,
    clearSearch,
  } = useMaterialResources({
    materialManager: themePackV2Manager,
    mountToLoadData: false,
    pageSize,
  });

  useEffect(() => {
    loadCategories().then(() => {
      const themePackDocumentV2 = new URL(
        window.location.href
      ).searchParams.get('themePackDocumentV2');
      if (themePackDocumentV2) {
        setCategory(themePackDocumentV2);
      }
    });
  }, []);

  // 新增版式
  const handleAddLayout = () => {
    if (!selectedCategory) {
      toast.error('请先选择分类');
      return;
    }
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
            同步主题卡片
          </Button>
        </div>
      </div>

      <LayoutTemplateRender
        // needRemove={false}
        materialManager={themePackV2Manager}
        onItemClick={materialItem => {
          if (useGridV2) {
            const { copiedRowDepth } = addRowFromTemplateV2(
              materialItem.content,
              {
                activeRowDepth: [widgetState.activeRowDepth?.[0] || 0],
              }
            );
            if (copiedRowDepth) {
              const newRowId = getRowByDepth(copiedRowDepth);
              scrollToActiveRow(newRowId?.id);
            }
          } else {
            const newRowId = addRowFromTemplate(materialItem.content);
            editorSDK?.changeWidgetState({
              editingElemId: undefined,
              activeCellId: undefined,
              activeRowId: newRowId?.[0],
            });
            scrollToActiveRow(newRowId?.[0]);
          }
        }}
        onSettingMaterial={() => {
          setShowLayoutForm(true);
        }}
        onRemoveMaterial={async materialItem => {
          await themePackV2Manager.removeItem(materialItem.documentId);
          reloadList();
          // toast.error("删除功能暂不开放");
        }}
        onChangeFloor={(nextCateId, nextCate) => {
          setCategory(nextCateId);
          // 设置url的themePackDocumentV2=nextCateId
          const url = new URL(window.location.href);
          url.searchParams.set('themePackDocumentV2', nextCateId);
          window.history.replaceState({}, '', url.toString());
          /** 关联整个作品的id */
          editorSDK?.onFormValueChange({
            themePackV2: {
              documentId: nextCateId,
              name: nextCate?.name || '',
            },
          });
          toast.success(
            `切换分类成功，作品将以 ${nextCate?.name} 分类添加页面。`
          );
        }}
        activeFloorId={selectedCategory}
        floors={categories}
        materials={layouts}
        loading={loading}
        currentPage={page}
        pageSize={pageSize}
        total={total}
        onPageChange={page => {
          setPage(page);
        }}
        showSearch={true}
        searchPlaceholder='搜索版式...'
        onSearch={searchTerm => {
          if (searchTerm.trim()) {
            setSearch(searchTerm);
          } else {
            clearSearch();
          }
        }}
      />
      {/* 版式表单弹窗 */}
      <ResponsiveDialog
        isOpen={showLayoutForm}
        onOpenChange={setShowLayoutForm}
        title='同步主题卡片'
        contentProps={{
          className: 'max-w-[800px] w-full h-[75vh]',
        }}
      >
        <SyncAllBlockToCms
          selectedCategory={selectedCategory}
          categories={categories}
          onChange={() => {
            reloadList();
          }}
        />
      </ResponsiveDialog>
    </div>
  );
}

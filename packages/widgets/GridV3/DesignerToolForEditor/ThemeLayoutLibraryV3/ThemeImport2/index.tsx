import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useGridContext } from '../../../comp/provider';
import { useMaterialResources } from '../../MaterialResourceManager/hook';
import LayoutTemplateRender from '../../MaterialResourceManager/LayoutTemplateRender2';
import { getGridProps, getWorksData2, themePackV3Manager } from '../services';

const pageSize = 20;

export default function ThemeImport2() {
  const { editorSDK, gridProps, addRowFromTemplateV2 } = useGridContext();
  const [showLayoutForm, setShowLayoutForm] = useState(false);
  const [showList, setShowList] = useState(false);

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
    setSearch,
    clearSearch,
    categories,
  } = useMaterialResources({
    materialManager: themePackV3Manager,
    mountToLoadData: true,
    pageSize,
  });

  useEffect(() => {
    loadCategories().then(() => {});
  }, []);

  return (
    <div className='h-full overflow-hidden'>
      <Button
        size={'xs'}
        variant={'outline'}
        onClick={e => {
          setShowList(true);
        }}
      >
        导入主题包
      </Button>
      {/* {gridProps.themePackV3RefId?.worksId ? (
        // <ThemePackHelper needSyncAllCards={true} />
        <MaterialComponents
          manager={false}
          dataType='blocks'
          onComponentClick={c => {
            // console.log('c', c);
            // return;
            const component = deepClone(c);
            try {
              const addRes = addRowFromTemplateV2(
                component.data,
                undefined,
                false
              );
              const blockId =
                gridProps.gridsData[addRes.copiedRowDepth?.[0] || 0];
              scrollToActiveRow(blockId?.id);
              toast.success(`添加成功`);
            } catch (error) {
              console.error('添加组件失败', error);
              toast.error('切换失败');
            }
          }}
        />
      ) : (
        <ThemePackHelper needSyncAllCards={true} />
      )} */}
      <ResponsiveDialog
        isOpen={showList}
        onOpenChange={setShowList}
        title='导入主题包'
        direction='left'
      >
        <LayoutTemplateRender
          style={{
            width: '400px',
          }}
          needAction={false}
          materialManager={themePackV3Manager}
          onItemClick={async materialItem => {
            console.log('materialItem', materialItem);
            const themePackWorksId = materialItem.content.worksId;
            if (themePackWorksId) {
              const themeWorksData = await getWorksData2(themePackWorksId);
              const gridProps = getGridProps(
                themeWorksData.data.work_data,
                themePackWorksId
              );
              editorSDK?.onFormValueChange({
                themePackV3RefId: {
                  documentId: materialItem.documentId,
                  worksId: themePackWorksId,
                  version:
                    (materialItem.content.componentsBlocks || []).length > 0
                      ? 'v3'
                      : 'v2',
                },
                themeConfig2: gridProps?.themeConfig2,
                _updateVersion: (gridProps?._updateVersion || 0) + 1,
              });
              toast.success('已绑定主题包，并应用风格');
            } else {
              toast.success('主题包数据错误，无法绑定，请检查');
            }
            setShowList(false);
            // 设置主题包ID，用于多为表格
            const url = new URL(window.location.href);
            url.searchParams.set('themePackV3', themePackWorksId);
            window.history.replaceState({}, '', url.toString());
          }}
          onSettingMaterial={() => {
            setShowLayoutForm(true);
          }}
          onRemoveMaterial={async materialItem => {
            await themePackV3Manager.removeItem(materialItem.documentId);
            reloadList();
            // toast.error("删除功能暂不开放");
          }}
          onChangeFloor={(nextCateId, nextCate) => {
            setCategory(nextCateId);
            // 设置url的themePackDocumentV2=nextCateId
            const url = new URL(window.location.href);
            url.searchParams.set('themePackDocumentV3', nextCateId);
            window.history.replaceState({}, '', url.toString());
            /** 关联整个作品的id */
            editorSDK?.onFormValueChange({
              themePackV2: undefined,
            });
            // toast.success(`切换分类成功`);
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
          searchPlaceholder='搜索主题包...'
          onSearch={searchTerm => {
            if (searchTerm.trim()) {
              setSearch(searchTerm);
            } else {
              clearSearch();
            }
          }}
        />
      </ResponsiveDialog>
    </div>
  );
}

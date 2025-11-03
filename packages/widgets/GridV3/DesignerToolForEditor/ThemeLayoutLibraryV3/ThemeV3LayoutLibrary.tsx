import { getWorksId } from '@mk/services';
import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useGridContext } from '../../comp/provider';
import { mergeDeep2 } from '../../comp/provider/utils';
import { useMaterialResources } from '../MaterialResourceManager/hook';
import LayoutTemplateRender from '../MaterialResourceManager/LayoutTemplateRender2';
import MaterialFloorManager from '../MaterialResourceManager/MaterialFloorManager';
import UpdateMaterialItemForm from '../MaterialResourceManager/UpdateMaterialItemForm';
import {
  getGridProps,
  getWorksData2,
  themePackV3CateId,
  themePackV3Manager,
} from './services';

const pageSize = 20;

function ThemeImportForTheme({ onError }: { onError?: () => void }) {
  const { themePackV3Data, editorSDK, gridProps } = useGridContext();
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
    fields: [
      'documentId',
      'name',
      'desc',
      'author',
      'cover_url',
      'createdAt',
      'updatedAt',
    ],
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
          if (!gridProps.themePackV3) {
            onError?.();
            return;
          }
          setShowList(true);
        }}
      >
        导入主题
      </Button>
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
            toast.loading('加载主题包...');
            const materialItemFull = await themePackV3Manager.getItem(
              materialItem.documentId
            );
            const content = materialItemFull?.content;
            if (content) {
              if (!content.componentsBlocks || !content.componentsGrids) {
                toast.error('该主题包没有添加组件和页面，请检查原主题包');
                return;
              }
              const worksIdFromThemePack = content.worksId;
              if (worksIdFromThemePack) {
                const worksDataFromTheme =
                  await getWorksData2(worksIdFromThemePack);
                const gridPropsFromTheme = getGridProps(
                  worksDataFromTheme.data.work_data,
                  worksIdFromThemePack
                );
                if (gridPropsFromTheme) {
                  editorSDK?.onFormValueChange({
                    materialResourcesGroup:
                      gridPropsFromTheme.materialResourcesGroup,
                    themeConfig2: gridPropsFromTheme.themeConfig2,
                    _updateVersion: (gridProps?._updateVersion || 0) + 1,
                  });
                }
              }
              themePackV3Data.setBlockGroupData(content.componentsBlocks || []);
              themePackV3Data.setComponentGroupData(
                content.componentsGrids || []
              );
              toast.dismiss();
              toast.success('导入成功');
            } else {
              toast.dismiss();
              toast.success('导入失败，请检查');
            }
            setShowList(false);
          }}
          onSettingMaterial={() => {}}
          onRemoveMaterial={async materialItem => {
            await themePackV3Manager.removeItem(materialItem.documentId);
            reloadList();
            // toast.error("删除功能暂不开放");
          }}
          onChangeFloor={(nextCateId, nextCate) => {
            setCategory(nextCateId);
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

export default function ThemeV3LayoutLibrary() {
  const { editorSDK, gridProps, worksDetail, themePackV3Data } =
    useGridContext();
  const [showLayoutForm, setShowLayoutForm] = useState(false);
  const [showFinder, setShowFinder] = useState(false);

  const { setCategory, categories, reloadList, loadCategories } =
    useMaterialResources({
      materialManager: themePackV3Manager,
      mountToLoadData: false,
      pageSize,
    });

  useEffect(() => {
    loadCategories().then(res => {});
    if (gridProps.themePackV3?.content?.worksId !== getWorksId()) {
      /** 数据一致性检查 */
      editorSDK?.onFormValueChange({
        themePackV3RefId: undefined,
        themePackV3: undefined,
      });
    }
  }, []);

  // 新增版式
  const handleAddLayout = () => {
    setShowLayoutForm(true);
  };

  return (
    <div className='h-full flex flex-col overflow-hidden'>
      <div className='flex-shrink-0 border-gray-200'>
        <div className='flex gap-2'>
          <Button
            variant='outline'
            id='save_theme_btn'
            size='xs'
            onClick={handleAddLayout}
            className=''
          >
            {gridProps.themePackV3 ? '更新主题' : '保存主题'}
          </Button>
          {/* <Button
            variant='outline'
            size='xs'
            onClick={() => {
              setShowCreator(true);
            }}
            className=''
          >
            风格设置
          </Button> */}
          <Button
            variant='outline'
            size='xs'
            onClick={() => {
              setShowFinder(true);
            }}
            className=''
          >
            分类管理
          </Button>
          <ThemeImportForTheme
            onError={() => {
              toast('请先保存主题');
              setShowLayoutForm(true);
            }}
          />
        </div>
      </div>

      {/* {gridProps.themePackV3?.documentId && (
        <ThemePackInfoCard documentId={gridProps.themePackV3.documentId} />
      )} */}

      <ResponsiveDialog
        isOpen={showFinder}
        onOpenChange={setShowFinder}
        direction='left'
        title='分类管理'
      >
        <MaterialFloorManager
          materialManager={themePackV3Manager}
          allCategories={categories}
          mode='selector'
          selectedFloorId={
            gridProps.themePackV3?.material_tags?.[0]?.documentId
          }
          onFloorSelect={(floorId, floor) => {
            setCategory(floorId);
            setShowFinder(false);
          }}
          placeholder={'搜索分类...'}
          showSearch={true}
          showRefresh={false}
          loadCategories={loadCategories}
          // showCreateEdit={false}
        />
      </ResponsiveDialog>
      <ResponsiveDialog
        isOpen={showLayoutForm}
        onOpenChange={setShowLayoutForm}
        title='保存主题包'
        contentProps={{
          className: 'max-w-[800px] w-full h-[75vh]',
        }}
      >
        <UpdateMaterialItemForm
          selectedCategory={
            gridProps.themePackV3?.material_tags?.[0]?.documentId
          }
          defaultContent={{
            worksId: getWorksId(),
          }}
          materialItem={
            {
              ...gridProps.themePackV3,
              name: worksDetail.title,
              content: {
                worksId: getWorksId(),
              },
            } as any
          }
          categories={categories || []}
          onClose={() => {
            setShowLayoutForm(false);
          }}
          onSubmit={async submitData => {
            const nextCateId = submitData.material_tags?.set?.[0];
            let themePackDID = gridProps.themePackV3?.documentId;
            if (themePackDID) {
              await themePackV3Manager.updateItem(themePackDID, {
                ...submitData,
                content: {
                  worksId: getWorksId(),
                  componentsBlocks: themePackV3Data.blockGroupData,
                  componentsGrids: themePackV3Data.componentGroupData,
                },
                material_class: {
                  set: [themePackV3CateId],
                },
              });
            } else {
              const res = await themePackV3Manager.createItem({
                ...submitData,
                content: {
                  worksId: getWorksId(),
                  componentsBlocks: themePackV3Data.blockGroupData,
                  componentsGrids: themePackV3Data.componentGroupData,
                },
                material_class: {
                  set: [themePackV3CateId],
                },
              });
              themePackDID = res.data.documentId;
            }
            const commitData = {
              themePackV3: mergeDeep2({
                ...gridProps.themePackV3,
                ...submitData,
                material_tags: [
                  {
                    documentId: nextCateId,
                  },
                ],
                documentId: themePackDID,
              }),
            };
            editorSDK?.onFormValueChange(commitData);
            setShowLayoutForm(false);
            reloadList();
            // 设置主题包ID，用于多为表格
            const url = new URL(window.location.href);
            url.searchParams.set('themePackV3', getWorksId());
            window.history.replaceState({}, '', url.toString());
          }}
        />
      </ResponsiveDialog>
    </div>
  );
}

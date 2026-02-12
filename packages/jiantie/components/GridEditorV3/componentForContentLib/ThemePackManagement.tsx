import { getWorksId } from '@/services';
import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { toJS } from 'mobx';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { mergeDeep2 } from '../provider/utils';
import { MaterialResourcesGroup } from '../types';
import { useWorksStore } from '../works-store/store/hook';
import LayoutTemplateRender from './MaterialResourceManager/LayoutTemplateRender';
import UpdateMaterialItemForm from './MaterialResourceManager/UpdateMaterialItemForm';
import {
  themePackV3CateId,
  themePackV3Manager,
} from './ThemeLayoutLibraryV3/services';
import ThemePackInfoCard from './ThemeLayoutLibraryV3/ThemePackInfoCard';

/**
 * 主题包管理组件
 * 包含两个功能：
 * 1. 关联主题包 - 用于上架模版时关联其他设计师的主题包
 * 2. 主题包管理 - 用于设计师制作主题时，将自身保存为主题包
 */
function ThemePackManagement() {
  const worksStore = useWorksStore();
  const { themePackV3Operator, isTemplate } = worksStore;
  const gridProps = worksStore.worksData.gridProps;
  const worksDetail = worksStore.worksDetail;

  // 关联主题包相关状态
  const [showConnectList, setShowConnectList] = useState(false);

  // 主题包管理相关状态
  const [showLayoutForm, setShowLayoutForm] = useState(false);
  const [showImportList, setShowImportList] = useState(false);

  // 数据一致性检查和加载主题包信息
  useEffect(() => {
    if (gridProps.themePackV3RefId?.documentId) {
      console.log('已关联主题包，除非手动解绑');
    } else if (gridProps.themePackV3?.content?.worksId !== getWorksId()) {
      /** 数据一致性检查 */
      worksStore.setGridProps({
        themePackV3RefId: undefined,
        themePackV3: undefined,
      });
    }
  }, []);

  // 关联主题包相关变量
  const hasThemePack = !!gridProps.themePackV3?.documentId;
  const hasConnectedThemePack = !!gridProps.themePackV3RefId?.documentId;

  // 关联主题包 - 打开列表
  const handleOpenConnectList = () => {
    setShowConnectList(true);
  };

  // 关联主题包 - 仅用素材项 content，不依赖作品
  const handleConnectThemePack = async (materialItem: any) => {
    const content = materialItem.content;
    worksStore.setGridProps({
      themePackV3RefId: {
        documentId: materialItem.documentId,
      },
      themePackV3: undefined,
      materialResourcesGroup:
        content?.materialResourcesGroup != null
          ? (toJS(content.materialResourcesGroup) as Partial<MaterialResourcesGroup>)
          : undefined,
      themeConfig2:
        content?.themeConfig2 != null ? toJS(content.themeConfig2) : undefined,
      _updateVersion: (gridProps?._updateVersion || 0) + 1,
    });
    toast.success('已绑定主题包，并应用风格');
    themePackV3Operator.setComponentGroupData(content.componentsGrids || []);
    themePackV3Operator.setBlockGroupData(content.componentsBlocks || []);
    setShowConnectList(false);
  };

  // 关联主题包 - 解绑
  const handleUnbindConnectThemePack = () => {
    worksStore.setGridProps({
      themePackV3RefId: undefined,
    });
  };

  // 主题包管理 - 保存/更新主题
  const handleAddLayout = () => {
    setShowLayoutForm(true);
  };

  // 主题包管理 - 保存主题包提交
  const handleSaveThemePack = async (submitData: any) => {
    const nextCateId = submitData.material_tags?.set?.[0];
    let themePackDID = gridProps.themePackV3?.documentId;
    const themePackContent = {
      worksId: getWorksId(),
      componentsBlocks: themePackV3Operator.blockGroupData,
      componentsGrids: themePackV3Operator.componentGroupData,
      materialResourcesGroup: toJS(gridProps.materialResourcesGroup),
      themeConfig2: toJS(gridProps.themeConfig2),
    };
    if (themePackDID) {
      await themePackV3Manager.updateItem(themePackDID, {
        ...submitData,
        content: themePackContent,
        material_class: {
          set: [themePackV3CateId],
        },
      });
    } else {
      const res = await themePackV3Manager.createItem({
        ...submitData,
        content: themePackContent,
        material_class: {
          set: [themePackV3CateId],
        },
      });
      themePackDID = res.documentId;
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
    worksStore.setGridProps(commitData);
    setShowLayoutForm(false);
    // 设置主题包ID，用于多为表格
    const url = new URL(window.location.href);
    url.searchParams.set('themePackV3', getWorksId());
    window.history.replaceState({}, '', url.toString());
  };

  // 主题包管理 - 解绑
  const handleUnbindThemePack = () => {
    worksStore.setGridProps({
      themePackV3: undefined,
    });
  };

  // 主题包管理 - 导入主题包（仅用素材项 content，不依赖作品）
  const handleImportThemePack = async (materialItem: any) => {
    toast.loading('加载主题包...');
    const materialItemFull = await themePackV3Manager.getItem(
      materialItem.documentId
    );
    const content = materialItemFull?.content;
    if (content) {
      if (!content.componentsBlocks || !content.componentsGrids) {
        toast.error('该主题包没有添加组件和页面，请检查原主题包');
        setShowImportList(false);
        return;
      }
      if (
        content.materialResourcesGroup != null ||
        content.themeConfig2 != null
      ) {
        worksStore.setGridProps({
          materialResourcesGroup:
            content.materialResourcesGroup != null
              ? (toJS(content.materialResourcesGroup) as Partial<MaterialResourcesGroup>)
              : undefined,
          themeConfig2:
            content.themeConfig2 != null ? toJS(content.themeConfig2) : undefined,
          _updateVersion: (gridProps?._updateVersion || 0) + 1,
        });
      }
      themePackV3Operator.setBlockGroupData(content.componentsBlocks || []);
      themePackV3Operator.setComponentGroupData(content.componentsGrids || []);
      toast.dismiss();
      toast.success('导入成功');
    } else {
      toast.dismiss();
      toast.success('导入失败，请检查');
    }
    setShowImportList(false);
  };

  return (
    <div className='flex flex-col gap-4 p-2'>
      {/* 关联主题包区域 */}
      <div className='flex flex-col gap-2 border rounded-md p-2'>
        <h2 className='text-base font-bold'>关联主题包</h2>
        <div className='desc text-sm text-gray-500'>
          <p className='text-red-500'>上架模版时使用</p>
          <p>
            关联设计师的主题包作品，主题包修改后实时同步组件、版式内容，关联后会清除主题包设置
          </p>
        </div>
        <div className='flex gap-2'>
          <Button
            size={'sm'}
            variant={'outline'}
            onClick={handleOpenConnectList}
            disabled={hasThemePack}
          >
            {hasConnectedThemePack ? '已关联主题包，点击切换' : '关联主题包'}
          </Button>
          {hasConnectedThemePack && (
            <>
              <Button
                size={'sm'}
                variant={'outline'}
                onClick={handleUnbindConnectThemePack}
              >
                解绑
              </Button>
              <Button
                size={'sm'}
                variant={'outline'}
                onClick={() => {
                  window.open(
                    `/desktop/editor-designer?works_id=${themePackV3Operator.themePackWorksId}&designer_tool=1&no_save=1`
                  );
                }}
              >
                查看
              </Button>
            </>
          )}
        </div>
        <ThemePackInfoCard materialId={gridProps.themePackV3RefId?.documentId || ''} />
      </div>

      {/* 主题包管理区域 */}
      {!isTemplate && <div className='flex flex-col gap-2 border rounded-md p-2'>
        <h2 className='text-base font-bold'>主题包管理</h2>
        <div className='desc text-sm text-gray-500'>
          <p className='text-red-500'>设计师制作主题时使用</p>
          <p>将本作品保存为主题包，提供给其他作品关联使用</p>
        </div>
        <div className='flex gap-2'>
          <Button
            variant='outline'
            id='save_theme_btn'
            size='sm'
            onClick={handleAddLayout}
            disabled={hasConnectedThemePack}
          >
            {gridProps.themePackV3 ? '更新主题' : '保存主题'}
          </Button>
          <Button
            size={'sm'}
            variant={'outline'}
            onClick={() => {
              if (!gridProps.themePackV3) {
                toast('请先保存主题');
                setShowLayoutForm(true);
                return;
              }
              setShowImportList(true);
            }}
            disabled={hasConnectedThemePack}
          >
            导入主题
          </Button>
          {hasThemePack && (
            <Button
              size={'sm'}
              variant={'outline'}
              onClick={handleUnbindThemePack}
            >
              解绑
            </Button>
          )}
        </div>
        <ThemePackInfoCard materialId={gridProps.themePackV3?.documentId || ''} />
      </div>}

      {/* 关联主题包 - 选择列表弹窗 */}
      <ResponsiveDialog
        isOpen={showConnectList}
        onOpenChange={setShowConnectList}
        title='关联主题包'
        direction='left'
      >
        <LayoutTemplateRender
          style={{
            width: '720px',
          }}
          needAction={false}
          materialManager={themePackV3Manager}
          onItemClick={handleConnectThemePack}
          onSettingMaterial={() => {
            setShowLayoutForm(true);
          }}
          onRemoveMaterial={async materialItem => {
            await themePackV3Manager.removeItem(materialItem.documentId);
          }}
          onChangeFloor={(nextCateId, nextCate) => {
          }}
          activeFloorId={gridProps.themePackV3RefId?.documentId || ''}
          showSearch={true}
          searchPlaceholder='搜索主题包...'
        />
      </ResponsiveDialog>

      {/* 主题包管理 - 保存主题包弹窗 */}
      <ResponsiveDialog
        isOpen={showLayoutForm}
        onOpenChange={setShowLayoutForm}
        title='保存主题包'
        contentProps={{
          className: 'max-w-[500px] w-full max-h-[90vh]',
        }}
      >
        <UpdateMaterialItemForm
          selectedCategory={
            gridProps.themePackV3?.material_tags?.[0]?.documentId
          }
          activeBlockId={worksStore.gridPropsOperator.getActiveRootRow()?.id}
          defaultContent={{
            worksId: getWorksId(),
          }}
          materialManager={themePackV3Manager}
          materialItem={
            {
              ...gridProps.themePackV3,
              name: worksDetail.title,
              content: {
                worksId: getWorksId(),
              },
            } as any
          }
          onClose={() => {
            setShowLayoutForm(false);
          }}
          onSubmit={handleSaveThemePack}
        />
      </ResponsiveDialog>

      {/* 主题包管理 - 导入主题包弹窗 */}
      <ResponsiveDialog
        isOpen={showImportList}
        onOpenChange={setShowImportList}
        title='导入主题包'
        direction='left'
      >
        <LayoutTemplateRender
          style={{
            width: '720px',
          }}
          needAction={false}
          materialManager={themePackV3Manager}
          onItemClick={handleImportThemePack}
          onSettingMaterial={() => { }}
          onRemoveMaterial={async materialItem => {
            await themePackV3Manager.removeItem(materialItem.documentId);
          }}
          onChangeFloor={(nextCateId, nextCate) => { }}
          activeFloorId={
            gridProps.themePackV3?.material_tags?.[0]?.documentId || ''
          }
          showSearch={true}
          searchPlaceholder='搜索主题包...'
        />
      </ResponsiveDialog>
    </div>
  );
}
export default observer(ThemePackManagement);

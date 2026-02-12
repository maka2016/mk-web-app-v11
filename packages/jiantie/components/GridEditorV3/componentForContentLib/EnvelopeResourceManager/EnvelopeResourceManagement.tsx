import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { useState } from 'react';
import toast from 'react-hot-toast';
import EnvelopeEditor from '../../../Envelope/EnvelopeEditor';
import { EnvelopeConfig } from '../../../Envelope/types';
import { useWorksStore } from '../../works-store/store/hook';
import { useMaterialResources } from '../MaterialResourceManager/hook';
import LayoutTemplateRender from '../MaterialResourceManager/LayoutTemplateRender';
import { MaterialItem } from '../MaterialResourceManager/services';
import EnvelopeBasicInfoForm from './EnvelopeBasicInfoForm';
import EnvelopeInfoCard from './EnvelopeInfoCard';
import { envelopeManager } from './services';

const pageSize = 20;

/**
 * 信封资源管理组件
 * 用于设计师管理信封分类和信封项
 */
export default function EnvelopeResourceManagement() {
  const worksStore = useWorksStore();
  const { designerInfo } = worksStore;

  // 信封列表相关状态
  const [showEnvelopeList, setShowEnvelopeList] = useState(false);
  const [showEnvelopeForm, setShowEnvelopeForm] = useState(false);
  const [showBasicInfoForm, setShowBasicInfoForm] = useState(false);
  const [currentEnvelopeItem, setCurrentEnvelopeItem] =
    useState<MaterialItem<EnvelopeConfig> | null>(null);
  const [appliedEnvelopeItem, setAppliedEnvelopeItem] =
    useState<MaterialItem<EnvelopeConfig> | null>(null);
  // 新建信封时的基本信息
  const [newEnvelopeBasicInfo, setNewEnvelopeBasicInfo] = useState<{
    name: string;
    categoryId: string;
  } | null>(null);

  // 信封资源管理
  const envelopeResources = useMaterialResources({
    materialManager: envelopeManager,
    mountToLoadData: true,
    pageSize,
  });

  // 获取当前作品的信封配置
  const worksDetail = worksStore.worksDetail;
  const currentEnvelopeConfig = worksDetail?.envelope_config as
    | EnvelopeConfig
    | undefined;
  const envelopeEnabled = worksDetail?.envelope_enabled || false;

  // 打开信封列表
  const handleOpenEnvelopeList = () => {
    setShowEnvelopeList(true);
  };

  // 创建新信封
  const handleCreateEnvelope = () => {
    setShowBasicInfoForm(true);
  };

  // 确认基本信息后打开信封编辑器
  const handleBasicInfoConfirm = (data: {
    name: string;
    categoryId: string;
  }) => {
    setNewEnvelopeBasicInfo(data);
    setShowEnvelopeForm(true);
  };

  // 编辑信封
  const handleEditEnvelope = (materialItem: MaterialItem<EnvelopeConfig>) => {
    setCurrentEnvelopeItem(materialItem);
    setShowEnvelopeForm(true);
  };

  // 保存信封
  const handleSaveEnvelope = async (config: EnvelopeConfig) => {
    try {
      if (currentEnvelopeItem) {
        // 更新现有信封
        await envelopeManager.updateItem(currentEnvelopeItem.documentId, {
          name: currentEnvelopeItem.name,
          content: config,
          author: designerInfo?.fullName || '设计师',
          cover_url: currentEnvelopeItem.cover_url,
          material_tags: {
            set:
              currentEnvelopeItem.material_tags?.map(tag => tag.documentId) ||
              [],
          },
        });
        toast.success('更新成功');

        // 重新加载更新后的信封项
        setTimeout(async () => {
          const updatedItem = await envelopeManager.getItem(
            currentEnvelopeItem.documentId
          );
          setCurrentEnvelopeItem(updatedItem as MaterialItem<EnvelopeConfig>);
          // 延迟关闭弹窗和重置保存状态
          setTimeout(() => {
            setShowEnvelopeForm(false);
          }, 100);
        }, 100);

        return;
      } else {
        // 创建新信封
        if (!newEnvelopeBasicInfo) {
          toast.error('请先填写基本信息');
          setShowEnvelopeForm(false);
          setShowBasicInfoForm(true);
          return;
        }

        // 使用背景图作为封面，如果没有则使用印章图
        const coverUrl =
          config.backgroundImage || config.envelopeSealImage || '';

        const newItem = await envelopeManager.createItem({
          name: newEnvelopeBasicInfo.name,
          content: config,
          author: designerInfo?.fullName || '设计师',
          cover_url: coverUrl,
          material_tags: {
            set: [newEnvelopeBasicInfo.categoryId],
          },
        });

        toast.success('创建成功');

        // 将新创建的信封项设置为当前编辑项，并应用到当前作品
        setTimeout(async () => {
          const fullItem = await envelopeManager.getItem(newItem.documentId);
          setCurrentEnvelopeItem(fullItem as MaterialItem<EnvelopeConfig>);
          setNewEnvelopeBasicInfo(null);

          // 自动应用到当前作品
          try {
            const envelopeConfig = fullItem.content as EnvelopeConfig;

            await worksStore.api.updateWorksDetail({
              envelope_enabled: true,
              envelope_config: envelopeConfig as any,
            });

            // 更新已应用的信封项
            setAppliedEnvelopeItem(fullItem);
          } catch (error) {
            console.error('应用信封失败:', error);
            toast.error('应用信封失败');
          }

          // 延迟关闭弹窗和重置保存状态
          setTimeout(() => {
            setShowEnvelopeForm(false);
          }, 100);
        }, 100);

        return;
      }
    } catch (error) {
      console.error('保存信封失败:', error);
      toast.error('保存失败');
      throw error;
    } finally {
    }
  };

  // 删除信封
  const handleRemoveEnvelope = async () => {
    if (!currentEnvelopeItem) return;

    try {
      await envelopeManager.removeItem(currentEnvelopeItem.documentId);
      toast.success('删除成功');
      setShowEnvelopeForm(false);
      setCurrentEnvelopeItem(null);
    } catch (error) {
      console.error('删除信封失败:', error);
      toast.error('删除失败');
    }
  };

  // 选择信封应用到当前作品
  const handleSelectEnvelope = async (
    materialItem: MaterialItem<EnvelopeConfig>
  ) => {
    console.log('materialItem', materialItem);
    try {
      const envelopeConfig = materialItem.content as EnvelopeConfig;
      await worksStore.api.updateWorksDetail({
        envelope_enabled: true,
        envelope_config: envelopeConfig as any,
      });

      toast.success('已应用信封配置');
      setShowEnvelopeList(false);
      // 更新已应用的信封项
      setAppliedEnvelopeItem(materialItem);
    } catch (error) {
      console.error('应用信封失败:', error);
      toast.error('应用失败');
    }
  };

  // 解绑信封
  const handleUnbindEnvelope = async () => {
    try {
      await worksStore.api.updateWorksDetail({
        envelope_enabled: false,
        envelope_config: null,
      });

      setAppliedEnvelopeItem(null);
      toast.success('已解绑信封');
    } catch (error) {
      console.error('解绑信封失败:', error);
      toast.error('解绑失败');
    }
  };

  return (
    <div className='flex flex-col gap-4 p-2'>
      {/* 已应用信封信息 */}
      <div className='flex flex-col gap-2 border rounded-md p-2'>
        <h2 className='text-base font-bold'>已应用信封</h2>
        <EnvelopeInfoCard
          envelopeConfig={currentEnvelopeConfig}
          envelopeEnabled={envelopeEnabled}
          envelopeName={appliedEnvelopeItem?.name}
          envelopeAuthor={appliedEnvelopeItem?.author}
          envelopeCover={appliedEnvelopeItem?.cover_url}
        />
        {envelopeEnabled && (
          <div className='flex gap-2 mt-2'>
            <Button
              size={'sm'}
              variant={'outline'}
              onClick={() => {
                if (appliedEnvelopeItem) {
                  handleEditEnvelope(appliedEnvelopeItem);
                } else {
                  // 如果是从作品直接配置的信封，打开编辑器
                  setCurrentEnvelopeItem(null);
                  setShowEnvelopeForm(true);
                }
              }}
            >
              编辑配置
            </Button>
            <Button
              size={'sm'}
              variant={'outline'}
              onClick={handleUnbindEnvelope}
            >
              解绑
            </Button>
          </div>
        )}
      </div>

      {/* 信封管理区域 */}
      <div className='flex flex-col gap-2 border rounded-md p-2'>
        <h2 className='text-base font-bold'>信封管理</h2>
        <div className='desc text-sm text-gray-500'>
          <p>管理信封分类和信封项，可以创建、编辑和删除信封配置</p>
        </div>
        <div className='flex gap-2'>
          <Button
            size={'sm'}
            variant={'outline'}
            onClick={handleCreateEnvelope}
          >
            新建信封
          </Button>
          <Button
            size={'sm'}
            variant={'outline'}
            onClick={handleOpenEnvelopeList}
          >
            导入信封
          </Button>
        </div>
      </div>

      {/* 信封库 - 选择列表弹窗 */}
      <ResponsiveDialog
        isOpen={showEnvelopeList}
        onOpenChange={setShowEnvelopeList}
        title='信封库'
        direction='left'
        disableBackNavigation={true}
      >
        <LayoutTemplateRender
          style={{
            width: '720px',
          }}
          needAction={true}
          materialManager={envelopeManager}
          onItemClick={handleSelectEnvelope}
          onSettingMaterial={materialItem => {
            handleEditEnvelope(materialItem as MaterialItem<EnvelopeConfig>);
          }}
          onRemoveMaterial={async materialItem => {
            await envelopeManager.removeItem(materialItem.documentId);
          }}
          onChangeFloor={(nextCateId, nextCate) => {}}
          showSearch={true}
          searchPlaceholder='搜索信封...'
        />
      </ResponsiveDialog>

      {/* 基本信息表单 */}
      <EnvelopeBasicInfoForm
        isOpen={showBasicInfoForm}
        onOpenChange={setShowBasicInfoForm}
        onConfirm={handleBasicInfoConfirm}
      />

      {/* 信封编辑弹窗 */}
      <ResponsiveDialog
        isOpen={showEnvelopeForm}
        onOpenChange={setShowEnvelopeForm}
        title={
          currentEnvelopeItem
            ? '编辑信封'
            : currentEnvelopeConfig && envelopeEnabled
              ? '编辑当前信封配置'
              : newEnvelopeBasicInfo
                ? `新建信封 - ${newEnvelopeBasicInfo.name}`
                : '新建信封'
        }
        contentProps={{
          style: { width: '70vw', maxWidth: '800px' },
        }}
      >
        <EnvelopeEditor
          value={
            // 编辑现有信封时，使用信封项的内容
            currentEnvelopeItem
              ? (currentEnvelopeItem.content as EnvelopeConfig)
              : // 新建信封时，传递 undefined（空白内容）
                newEnvelopeBasicInfo
                ? undefined
                : // 编辑当前应用的信封配置时（不是新建，也不是编辑库中的信封），使用当前作品的配置
                  currentEnvelopeConfig && envelopeEnabled
                  ? currentEnvelopeConfig
                  : undefined
          }
          onChange={async (config: EnvelopeConfig) => {
            // 如果是编辑素材库中的信封或新建信封，保存到素材库
            if (currentEnvelopeItem || newEnvelopeBasicInfo) {
              await handleSaveEnvelope(config);
            } else if (
              // 如果是编辑当前应用的信封配置（不是从库中选择的，也不是新建）
              !currentEnvelopeItem &&
              !newEnvelopeBasicInfo &&
              currentEnvelopeConfig &&
              envelopeEnabled
            ) {
              try {
                await worksStore.api.updateWorksDetail({
                  envelope_enabled: true,
                  envelope_config: config as any,
                });

                toast.success('更新成功');
                setShowEnvelopeForm(false);
              } catch (error) {
                console.error('更新信封配置失败:', error);
                toast.error('更新失败');
                throw error;
              }
            } else {
              // 其他情况也保存到素材库（兜底逻辑）
              await handleSaveEnvelope(config);
            }
          }}
          onRemove={
            currentEnvelopeItem
              ? handleRemoveEnvelope
              : currentEnvelopeConfig && envelopeEnabled
                ? handleUnbindEnvelope
                : undefined
          }
        />
      </ResponsiveDialog>
    </div>
  );
}

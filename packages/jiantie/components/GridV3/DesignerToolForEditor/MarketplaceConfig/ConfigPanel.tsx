import { Button } from '@workspace/ui/components/button';
import { observer } from 'mobx-react';
import React from 'react';
import toast from 'react-hot-toast';
import { useGridContext } from '../../comp/provider';
import { DescriptionEditor } from './DescriptionEditor';
import { PreviewImageManager } from './PreviewImageManager';
import { TitleEditor } from './TitleEditor';

interface ConfigPanelProps {
  onClose: () => void;
}

/**
 * 商城展示配置面板
 * 集成所有配置子组件
 * 使用 observer 监听 WorksStore 的变化
 */
export const ConfigPanel: React.FC<ConfigPanelProps> = observer(
  ({ onClose }) => {
    // 获取 WorksStore
    const { editorSDK } = useGridContext();
    const worksStore = editorSDK?.fullSDK;

    // 读取配置 - observer 会自动监听这些值的变化
    const showcaseInfo = worksStore?.templateShowcase.getShowcaseInfo();
    const config =
      showcaseInfo || worksStore?.templateShowcase.getDefaultInfo();

    // 验证并启用商城展示
    const handleEnable = () => {
      if (!worksStore) return;

      // 验证配置
      const validation = worksStore.templateShowcase.validate();

      if (!validation.valid) {
        toast.error(validation.errors[0]);
        return;
      }

      // 启用商城展示
      worksStore.templateShowcase.setEnabled(true);
      toast.success('已启用商城展示');
      onClose();
    };

    // 预览商城展示页面
    const handlePreview = () => {
      if (!worksStore) return;

      const worksId = worksStore.config.worksId?.();
      if (!worksId) {
        toast.error('无法获取作品ID');
        return;
      }

      // 打开新窗口预览
      window.open(`/mobile/marketplace?id=${worksId}`, '_blank');
    };

    if (!worksStore || !config) {
      return <div className='flex justify-center p-8'>加载中...</div>;
    }

    return (
      <div className='space-y-3 max-h-[80vh] overflow-y-auto p-1'>
        {/* 预览图管理 */}
        <PreviewImageManager
          worksStore={worksStore}
          images={config.previewImages}
        />

        {/* 标题编辑 */}
        <TitleEditor worksStore={worksStore} title={config.displayTitle} />

        {/* 描述编辑 */}
        <DescriptionEditor
          worksStore={worksStore}
          description={config.displayDescription}
        />

        {/* 操作按钮 */}
        <div className='flex justify-between items-center pt-3 border-t'>
          <span className='text-xs text-gray-500'>
            {worksStore.isSaved ? '✓ 已保存' : '保存中...'}
          </span>
          <div className='flex gap-2'>
            <Button variant='outline' size='sm' onClick={handlePreview}>
              预览
            </Button>
            <Button variant='outline' size='sm' onClick={onClose}>
              关闭
            </Button>
            <Button size='sm' onClick={handleEnable} disabled={config.enabled}>
              {config.enabled ? '已启用' : '启用展示'}
            </Button>
          </div>
        </div>
      </div>
    );
  }
);

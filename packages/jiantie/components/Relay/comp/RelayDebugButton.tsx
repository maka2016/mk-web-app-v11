'use client';

import { delCookie } from '@/utils';
import { trpc } from '@/utils/trpc';
import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Bug } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { DebugStep, RelayDebugPanel } from './RelayDebugPanel';

interface RelayDebugButtonProps {
  /** 作品ID */
  worksId: string;
  /** 用户OpenID */
  userOpenid?: string;
  /** 当前配置数据 */
  configData: any;
  /** 当前列表数据 */
  listData: any;
  /** 当前检查数据 */
  checkData: any;
  /** 是否正在提交 */
  submitting: boolean;
  /** 是否显示分享弹窗 */
  showShareDialog: boolean;
  /** 接力人数 */
  relayCount: number;
  /** 当前用户是否已接力 */
  currentUserRelayed: boolean;
  /** 加载配置的回调 */
  onLoadConfig: () => Promise<void>;
  /** 加载列表的回调 */
  onLoadList: () => Promise<void>;
  /** 检查状态的回调 */
  onLoadCheck: () => Promise<void>;
  /** 执行接力的回调 */
  onTriggerRelay: () => Promise<void>;
  /** 打开分享弹窗的回调 */
  onOpenShareDialog: () => void;
  /** 设置分享弹窗显示状态 */
  onSetShareDialog: (open: boolean) => void;
}

/**
 * 接力流程调试按钮组件
 * 仅在非生产环境下显示，提供逐步调试接力流程的功能
 */
export function RelayDebugButton({
  worksId,
  userOpenid,
  configData,
  listData,
  checkData,
  submitting,
  showShareDialog,
  relayCount,
  currentUserRelayed,
  onLoadConfig,
  onLoadList,
  onLoadCheck,
  onTriggerRelay,
  onOpenShareDialog,
  onSetShareDialog,
}: RelayDebugButtonProps) {
  const [debugStep, setDebugStep] = useState<DebugStep>(DebugStep.VIEW_UI);
  const [showDebugDialog, setShowDebugDialog] = useState(false);

  // 调试模式：处理步骤变更
  useEffect(() => {
    const handleDebugStep = async () => {
      switch (debugStep) {
        case DebugStep.VIEW_UI:
          // 步骤1：确保配置和列表已加载
          if (!configData) {
            await onLoadConfig();
          }
          if (configData?.config?.enabled && !listData) {
            await onLoadList();
          }
          break;
        case DebugStep.SHARE_DIALOG:
          // 步骤3：自动打开分享弹窗（如果用户已接力）
          if (currentUserRelayed && !showShareDialog) {
            onSetShareDialog(true);
          }
          break;
        case DebugStep.VIEW_STATUS:
          // 步骤4：重新加载所有数据查看状态
          await Promise.all([onLoadConfig(), onLoadList(), onLoadCheck()]);
          break;
      }
    };

    handleDebugStep();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debugStep]);

  // 调试模式：处理下一步
  const handleDebugNextStep = async () => {
    switch (debugStep) {
      case DebugStep.VIEW_UI:
        // 从步骤1到步骤2：确保数据已加载，然后进入下一步
        if (!configData) await onLoadConfig();
        if (configData?.config?.enabled && !listData) await onLoadList();
        setDebugStep(DebugStep.CLICK_RELAY);
        break;
      case DebugStep.CLICK_RELAY:
        // 从步骤2到步骤3：执行接力，成功后自动进入下一步
        await onTriggerRelay();
        // onTriggerRelay 成功后会自动打开分享弹窗，这里手动进入下一步
        if (currentUserRelayed || checkData?.relayed) {
          setDebugStep(DebugStep.SHARE_DIALOG);
        }
        break;
      case DebugStep.SHARE_DIALOG:
        // 从步骤3到步骤4：已经打开分享弹窗，继续下一步
        setDebugStep(DebugStep.VIEW_STATUS);
        break;
      case DebugStep.VIEW_STATUS:
        // 步骤4：重新加载数据查看最终状态
        await Promise.all([onLoadConfig(), onLoadList(), onLoadCheck()]);
        break;
    }
  };

  // 调试模式：重置状态
  const handleDebugReset = async () => {
    setDebugStep(DebugStep.VIEW_UI);
    onSetShareDialog(false);

    try {
      // 1. 删除微信授权信息（清除cookie）
      const wechatCookies = ['nickname', 'thumb', 'openId', 'unionId'];
      wechatCookies.forEach(cookieKey => {
        delCookie(cookieKey);
      });
      console.log('已清除微信授权信息');

      // 2. 删除当前用户的接力记录
      if (userOpenid && worksId) {
        try {
          // 删除接力记录
          await trpc.relay.deleteRecord.mutate({
            works_id: worksId,
            openid: userOpenid,
          });
          console.log('已删除接力记录');
        } catch (error: any) {
          console.error('删除接力记录失败:', error);
          // 如果记录不存在，不算错误
          if (error?.message && !error.message.includes('不存在')) {
            toast.error('删除接力记录失败: ' + (error.message || '未知错误'));
          }
        }
      }

      // 3. 重新加载所有数据
      await Promise.all([onLoadConfig(), onLoadList(), onLoadCheck()]);

      toast.success('重置完成：已清除微信授权信息和接力记录，请刷新页面');
    } catch (error) {
      console.error('Failed to reset debug state:', error);
      toast.error('重置失败，请重试');
    }
  };

  // 仅在非生产环境下显示
  if (process.env.ENV === 'prod') {
    return null;
  }

  return (
    <>
      <Button
        variant='outline'
        size='icon'
        className='fixed bottom-4 right-4 z-50 shadow-lg'
        onClick={() => setShowDebugDialog(true)}
        title='接力流程调试'
      >
        <Bug className='h-4 w-4' />
      </Button>

      {/* 调试面板 Dialog */}
      <ResponsiveDialog
        isOpen={showDebugDialog}
        onOpenChange={setShowDebugDialog}
        title='接力流程调试'
        description='逐步调试接力流程，模拟用户完整操作'
        showCloseIcon={true}
      >
        <RelayDebugPanel
          currentStep={debugStep}
          onStepChange={setDebugStep}
          onNextStep={handleDebugNextStep}
          onReset={handleDebugReset}
          onLoadConfig={onLoadConfig}
          onLoadList={onLoadList}
          onLoadCheck={onLoadCheck}
          onTriggerRelay={onTriggerRelay}
          onOpenShareDialog={onOpenShareDialog}
          state={{
            configData,
            listData,
            checkData,
            submitting,
            showShareDialog,
            userOpenid,
            relayCount,
            currentUserRelayed,
          }}
        />
      </ResponsiveDialog>
    </>
  );
}

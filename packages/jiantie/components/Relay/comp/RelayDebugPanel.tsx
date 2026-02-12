'use client';

import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import { CheckCircle2, Circle, Play, RefreshCw, RotateCcw } from 'lucide-react';

// 调试流程步骤
export enum DebugStep {
  VIEW_UI = 1, // 看到UI
  CLICK_RELAY = 2, // 点击接力
  SHARE_DIALOG = 3, // 分享给好友
  VIEW_STATUS = 4, // 看接力状态
}

interface RelayDebugPanelProps {
  /** 当前调试步骤 */
  currentStep: DebugStep;
  /** 步骤变更回调 */
  onStepChange: (step: DebugStep) => void;
  /** 执行下一步 */
  onNextStep: () => void;
  /** 重置到初始状态 */
  onReset: () => void;
  /** 手动触发加载配置 */
  onLoadConfig: () => void;
  /** 手动触发加载列表 */
  onLoadList: () => void;
  /** 手动触发检查状态 */
  onLoadCheck: () => void;
  /** 手动触发接力 */
  onTriggerRelay: () => void;
  /** 手动打开分享弹窗 */
  onOpenShareDialog: () => void;
  /** 当前状态数据 */
  state: {
    configData: any;
    listData: any;
    checkData: any;
    submitting: boolean;
    showShareDialog: boolean;
    userOpenid?: string;
    relayCount: number;
    currentUserRelayed: boolean;
  };
}

const STEP_LABELS: Record<DebugStep, string> = {
  [DebugStep.VIEW_UI]: '1. 看到UI',
  [DebugStep.CLICK_RELAY]: '2. 点击接力',
  [DebugStep.SHARE_DIALOG]: '3. 分享给好友',
  [DebugStep.VIEW_STATUS]: '4. 看接力状态',
};

const STEP_DESCRIPTIONS: Record<DebugStep, string> = {
  [DebugStep.VIEW_UI]: '初始状态：显示配置和用户列表',
  [DebugStep.CLICK_RELAY]: '模拟用户点击接力按钮',
  [DebugStep.SHARE_DIALOG]: '自动打开分享弹窗',
  [DebugStep.VIEW_STATUS]: '查看接力后的状态变化',
};

export function RelayDebugPanel({
  currentStep,
  onStepChange,
  onNextStep,
  onReset,
  onLoadConfig,
  onLoadList,
  onLoadCheck,
  onTriggerRelay,
  onOpenShareDialog,
  state,
}: RelayDebugPanelProps) {
  const handleStepClick = (step: DebugStep) => {
    onStepChange(step);
  };

  const handleNextStep = () => {
    if (currentStep < DebugStep.VIEW_STATUS) {
      onStepChange((currentStep + 1) as DebugStep);
    }
    onNextStep();
  };

  const isStepCompleted = (step: DebugStep) => {
    return step < currentStep;
  };

  const isStepActive = (step: DebugStep) => {
    return step === currentStep;
  };

  return (
    <div className='space-y-4 p-4'>
      {/* 步骤指示器 */}
      <div className='space-y-2'>
        <div className='text-xs font-medium text-muted-foreground mb-2'>
          当前步骤
        </div>
        {Object.entries(STEP_LABELS).map(([step, label]) => {
          const stepNum = Number(step) as DebugStep;
          const completed = isStepCompleted(stepNum);
          const active = isStepActive(stepNum);

          return (
            <div
              key={stepNum}
              className='flex items-center gap-2 cursor-pointer'
              onClick={() => handleStepClick(stepNum)}
            >
              {completed ? (
                <CheckCircle2 className='h-4 w-4 text-green-500' />
              ) : active ? (
                <Circle className='h-4 w-4 text-primary fill-primary' />
              ) : (
                <Circle className='h-4 w-4 text-muted-foreground' />
              )}
              <span
                className={`text-xs ${
                  active
                    ? 'font-semibold text-primary'
                    : completed
                      ? 'text-muted-foreground line-through'
                      : 'text-muted-foreground'
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* 当前步骤描述 */}
      <div className='p-2 bg-muted rounded-md'>
        <div className='text-xs text-muted-foreground'>
          {STEP_DESCRIPTIONS[currentStep]}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className='flex flex-col gap-2'>
        <Button
          variant='default'
          size='sm'
          onClick={handleNextStep}
          disabled={currentStep >= DebugStep.VIEW_STATUS}
          className='w-full'
        >
          <Play className='h-3 w-3 mr-2' />
          下一步
        </Button>
        <Button
          variant='outline'
          size='sm'
          onClick={onReset}
          className='w-full'
        >
          <RotateCcw className='h-3 w-3 mr-2' />
          重置
        </Button>
      </div>

      {/* 手动操作 */}
      <div className='space-y-2'>
        <div className='text-xs font-medium text-muted-foreground'>
          手动操作
        </div>
        <div className='grid grid-cols-2 gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={onLoadConfig}
            className='text-xs'
          >
            <RefreshCw className='h-3 w-3 mr-1' />
            加载配置
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={onLoadList}
            className='text-xs'
          >
            <RefreshCw className='h-3 w-3 mr-1' />
            加载列表
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={onLoadCheck}
            className='text-xs'
          >
            <RefreshCw className='h-3 w-3 mr-1' />
            检查状态
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={onTriggerRelay}
            disabled={state.submitting || state.currentUserRelayed}
            className='text-xs'
          >
            <Play className='h-3 w-3 mr-1' />
            执行接力
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={onOpenShareDialog}
            className='text-xs col-span-2'
          >
            打开分享弹窗
          </Button>
        </div>
      </div>

      {/* 状态信息 */}
      <div className='space-y-2'>
        <div className='text-xs font-medium text-muted-foreground'>
          当前状态
        </div>
        <div className='space-y-1 text-xs'>
          <div className='flex justify-between'>
            <span className='text-muted-foreground'>配置已加载:</span>
            <Badge
              variant={state.configData ? 'success' : 'secondary'}
              className='text-xs'
            >
              {state.configData ? '是' : '否'}
            </Badge>
          </div>
          <div className='flex justify-between'>
            <span className='text-muted-foreground'>列表已加载:</span>
            <Badge
              variant={state.listData ? 'success' : 'secondary'}
              className='text-xs'
            >
              {state.listData ? '是' : '否'}
            </Badge>
          </div>
          <div className='flex justify-between'>
            <span className='text-muted-foreground'>状态已检查:</span>
            <Badge
              variant={state.checkData ? 'success' : 'secondary'}
              className='text-xs'
            >
              {state.checkData ? '是' : '否'}
            </Badge>
          </div>
          <div className='flex justify-between'>
            <span className='text-muted-foreground'>接力人数:</span>
            <Badge variant='default' className='text-xs'>
              {state.relayCount}
            </Badge>
          </div>
          <div className='flex justify-between'>
            <span className='text-muted-foreground'>已接力:</span>
            <Badge
              variant={state.currentUserRelayed ? 'success' : 'secondary'}
              className='text-xs'
            >
              {state.currentUserRelayed ? '是' : '否'}
            </Badge>
          </div>
          <div className='flex justify-between'>
            <span className='text-muted-foreground'>用户OpenID:</span>
            <span className='text-xs font-mono text-muted-foreground truncate max-w-[150px]'>
              {state.userOpenid || '未登录'}
            </span>
          </div>
          <div className='flex justify-between'>
            <span className='text-muted-foreground'>提交中:</span>
            <Badge
              variant={state.submitting ? 'warning' : 'secondary'}
              className='text-xs'
            >
              {state.submitting ? '是' : '否'}
            </Badge>
          </div>
          <div className='flex justify-between'>
            <span className='text-muted-foreground'>分享弹窗:</span>
            <Badge
              variant={state.showShareDialog ? 'default' : 'secondary'}
              className='text-xs'
            >
              {state.showShareDialog ? '打开' : '关闭'}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

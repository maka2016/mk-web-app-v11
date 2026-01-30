import { Progress } from '@workspace/ui/components/progress';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { useEffect, useRef, useState } from 'react';

interface DownloadProgressDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  expectedCount: number; // 预期数量
  completedCount: number; // 实际完成数量
}

export function DownloadProgressDialog({
  isOpen,
  onOpenChange,
  expectedCount,
  completedCount,
}: DownloadProgressDialogProps) {
  const [progress, setProgress] = useState(0);
  const progressTimerRef = useRef<any>(null);
  const completedCountRef = useRef(completedCount);
  const expectedCountRef = useRef(expectedCount);

  // 同步 ref 值，用于在定时器中访问最新值
  useEffect(() => {
    completedCountRef.current = completedCount;
    expectedCountRef.current = expectedCount;
  }, [completedCount, expectedCount]);

  useEffect(() => {
    if (!isOpen) {
      // 关闭时重置进度并清理定时器
      setProgress(0);
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      return;
    }

    // 打开时初始化进度
    setProgress(0);

    // 启动模拟进度（半真半假）
    progressTimerRef.current = setInterval(() => {
      setProgress(prev => {
        // 使用 ref 获取最新的值，避免闭包问题
        const currentCompleted = completedCountRef.current;
        const currentExpected = expectedCountRef.current;

        if (currentExpected === 0) {
          return prev;
        }

        // 如果已完成所有图片，直接到100%
        if (currentCompleted >= currentExpected) {
          clearInterval(progressTimerRef.current);
          progressTimerRef.current = null;
          return 100;
        }

        // 计算每张图片对应的进度段
        const segmentSize = 100 / currentExpected;

        // 计算目标进度
        // 当前正在生成第 (currentCompleted + 1) 张
        // 第n张生成中时，目标进度应该是：(n-1)段的终点 + 该段的98% = (n-1) * segmentSize + segmentSize * 0.98
        // 例如：2张图片，segmentSize = 50
        // 第一张生成中：目标 = 0 + 50 * 0.98 = 49%
        // 第二张生成中：目标 = 50 + 50 * 0.98 = 99%
        const currentSegmentStart = currentCompleted * segmentSize;
        // 目标进度：当前段的起点 + 该段的98%（即49%位置，因为每段是50%）
        const adjustedTarget = currentSegmentStart + segmentSize * 0.98;

        // 平滑增长到目标进度，但不超过目标
        // 根据距离目标的远近调整增长速度
        const distance = adjustedTarget - prev;
        const step = distance > 10 ? 1.5 : distance > 5 ? 1 : 0.5;
        const simulatedProgress = Math.min(prev + step, adjustedTarget);

        // 确保进度不会倒退，且不超过当前段的49%
        const finalProgress = Math.min(
          Math.max(simulatedProgress, prev),
          adjustedTarget
        );

        return finalProgress;
      });
    }, 60);

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, [isOpen]);

  // 当完成数量变化时，确保进度能及时更新
  useEffect(() => {
    if (isOpen && expectedCount > 0) {
      // 如果已完成，确保进度到达100%
      if (completedCount >= expectedCount) {
        setProgress(100);
        if (progressTimerRef.current) {
          clearInterval(progressTimerRef.current);
          progressTimerRef.current = null;
        }
      } else {
        // 计算每张图片对应的进度段
        const segmentSize = 100 / expectedCount;
        // 当完成n张图片时，进度应该跳到第(n+1)段的51%位置
        // 例如：2张图片，segmentSize = 50
        // 完成第一张时，跳到第二段的51% = 50 + 50 * 0.02 = 51%
        // 完成第二张时，跳到100%
        const nextSegmentStart = completedCount * segmentSize;
        const targetProgress = nextSegmentStart + segmentSize * 0.02; // 跳到下一段的2%位置（即51%）

        // 立即跳到目标进度
        setProgress(targetProgress);
      }
    }
  }, [isOpen, completedCount, expectedCount]);

  return (
    <ResponsiveDialog
      isDialog
      isOpen={isOpen}
      // onOpenChange={onOpenChange}
      title='图片生成中...'
      showCloseIcon={false}
      contentProps={{
        className: 'rounded-[20px] max-w-full w-[80%] p-0 z-50',
      }}
    >
      <div className='p-6 max-h-full overflow-y-auto'>
        <div className='flex flex-col gap-4'>
          <div className='flex items-center justify-between mb-2'>
            <span className='text-sm text-gray-600'>
              已完成 {completedCount} / {expectedCount} 张图片
            </span>
            <span className='text-sm font-medium text-gray-800'>
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} className='w-full h-2' />
          <div className='text-center text-xs text-gray-500 mt-2'>
            正在生成图片，请稍候...
          </div>
        </div>
      </div>
    </ResponsiveDialog>
  );
}

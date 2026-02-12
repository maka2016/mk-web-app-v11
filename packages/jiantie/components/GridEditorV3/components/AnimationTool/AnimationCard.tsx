import { Button } from '@workspace/ui/components/button';
import { cn } from '@workspace/ui/lib/utils';
import { ChevronRight, Trash2 } from 'lucide-react';
import type { AnimationPresetItem } from './animation2Data';

interface AnimationCardProps {
  animation: AnimationPresetItem | null;
  changeButton?: React.ReactNode; // 接收一个自定义的更改按钮（可能是 Popover 触发器）
  onDeleteClick: () => void;
  onPreviewClick: () => void;
  onAddClick?: () => void; // 添加动画时的回调
  type: 'entrance' | 'exit' | 'emphasis';
  className?: string;
}

export function AnimationCard({
  animation,
  changeButton,
  onDeleteClick,
  onPreviewClick,
  onAddClick,
  type,
  className,
}: AnimationCardProps) {
  if (!animation) {
    // 未选择动画时显示添加按钮（用 changeButton 包裹）
    if (changeButton) {
      return <div className={className}>{changeButton}</div>;
    }
    return (
      <div
        className={cn(
          'flex items-center justify-center p-4 border border-dashed border-border rounded-md bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors',
          className
        )}
        onClick={onAddClick}
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <span className="text-2xl">+</span>
          </div>
          <span className="text-sm">添加动画</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 border border-border rounded-md bg-card',
        className
      )}
    >
      {/* 左侧：动画图标 */}
      <div className="flex-shrink-0">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          {/* 这里可以根据动画类型显示不同的图标 */}
          <div className="text-muted-foreground text-xs text-center">
            {animation.name.slice(0, 2)}
          </div>
        </div>
      </div>

      {/* 中间：动画名称和操作按钮 */}
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium text-foreground truncate">
            {animation.name}
          </h4>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0 -mt-1 -mr-1"
            onClick={onDeleteClick}
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {changeButton || (
            <Button variant="outline" size="xs">
              更改
            </Button>
          )}
          <Button
            variant="outline"
            size="xs"
            onClick={onPreviewClick}
          >
            预览
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

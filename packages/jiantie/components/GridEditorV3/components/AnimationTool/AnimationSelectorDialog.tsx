import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { cn } from '@workspace/ui/lib/utils';
import { Ban } from 'lucide-react';
import { animation2Data, commonEntranceForSelector, type AnimationPresetItem } from './animation2Data';

interface AnimationSelectorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'entrance' | 'exit';
  selectedAnimationId?: string;
  onSelect: (animation: AnimationPresetItem | null) => void;
  elementRef?: string;
}

export function AnimationSelectorDialog({
  isOpen,
  onOpenChange,
  type,
  selectedAnimationId,
  onSelect,
  elementRef,
}: AnimationSelectorDialogProps) {
  const isTextElement = elementRef === 'Text';
  
  // 获取动画列表
  const textAnimations = type === 'entrance' 
    ? animation2Data.text.entrance 
    : animation2Data.text.exit;
  
  const commonAnimations = type === 'entrance'
    ? commonEntranceForSelector
    : commonEntranceForSelector; // 退场动画使用相同的列表（去重后），只是参数会反转

  const handleSelect = (animation: AnimationPresetItem | null) => {
    onSelect(animation);
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={type === 'entrance' ? '进场动画' : '退场动画'}
      showCloseIcon={true}
    >
      <div className="p-4 space-y-6">
        {/* 无动画选项 */}
        <div>
          <div className="grid grid-cols-4 gap-3">
            <button
              onClick={() => handleSelect(null)}
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all',
                !selectedAnimationId
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Ban className="h-6 w-6 text-muted-foreground" />
              </div>
              <span className="text-xs text-center">无</span>
            </button>
          </div>
        </div>

        {/* 文字动画（仅文本元素） */}
        {isTextElement && textAnimations.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">
              文字动画
            </h3>
            <div className="grid grid-cols-4 gap-3">
              {textAnimations.map((animation) => {
                const isSelected = selectedAnimationId === animation.id;
                return (
                  <button
                    key={animation.id}
                    onClick={() => handleSelect(animation as AnimationPresetItem)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">
                        {animation.name.slice(0, 2)}
                      </span>
                    </div>
                    <span className="text-xs text-center line-clamp-2">
                      {animation.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 常规动画 */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">
            {isTextElement ? '常规动画' : '动画列表'}
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {commonAnimations.map((animation) => {
              const isSelected = selectedAnimationId === animation.id;
              return (
                <button
                  key={animation.id}
                  onClick={() => handleSelect(animation as AnimationPresetItem)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">
                      {animation.name.slice(0, 2)}
                    </span>
                  </div>
                  <span className="text-xs text-center line-clamp-2">
                    {animation.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </ResponsiveDialog>
  );
}

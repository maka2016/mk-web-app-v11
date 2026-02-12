import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { cn } from '@workspace/ui/lib/utils';
import { Ban, Check } from 'lucide-react';
import { animation2Data, commonEmphasisForSelector, commonEntranceForSelector, type AnimationPresetItem } from './animation2Data';

interface AnimationSelectorPopoverProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'entrance' | 'exit' | 'emphasis';
  selectedAnimationId?: string;
  /** add 模式下已存在的动画 id 列表（显示已添加标记） */
  existingAnimationIds?: string[];
  /** replace（默认）：选择后替换并关闭；add：选择后追加并关闭 */
  mode?: 'replace' | 'add';
  onSelect: (animation: AnimationPresetItem | null) => void;
  onPreview?: (animation: AnimationPresetItem) => void;
  elementRef?: string;
  children: React.ReactNode;
}

export function AnimationSelectorPopover({
  isOpen,
  onOpenChange,
  type,
  selectedAnimationId,
  existingAnimationIds = [],
  mode = 'replace',
  onSelect,
  onPreview,
  elementRef,
  children,
}: AnimationSelectorPopoverProps) {
  const isTextElement = elementRef === 'Text';
  const isAddMode = mode === 'add';
  const existingIdSet = new Set(existingAnimationIds);
  
  // 获取动画列表
  const textAnimations = type === 'entrance' 
    ? animation2Data.text.entrance 
    : type === 'exit'
    ? animation2Data.text.exit
    : [];
  
  const commonAnimations = type === 'emphasis'
    ? commonEmphasisForSelector
    : type === 'entrance'
    ? commonEntranceForSelector
    : commonEntranceForSelector; // 退场动画使用相同的列表（去重后），只是参数会反转

  const handleSelect = (animation: AnimationPresetItem | null) => {
    onSelect(animation);
    onOpenChange(false);
  };

  const renderAnimationButton = (animation: AnimationPresetItem) => {
    const animId = animation.id ?? '';
    const isSelected = selectedAnimationId === animId;
    const isExisting = isAddMode && existingIdSet.has(animId);

    return (
      <button
        key={animId}
        onClick={() => handleSelect(animation)}
        onMouseEnter={() => onPreview?.(animation)}
        className={cn(
          'flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all relative',
          isSelected
            ? 'border-primary bg-primary/5'
            : isExisting
              ? 'border-primary/30 bg-primary/5'
              : 'border-border hover:border-primary/50'
        )}
      >
        {isExisting && (
          <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
            <Check className="h-2.5 w-2.5 text-primary-btn" />
          </div>
        )}
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <span className="text-xs text-muted-foreground">
            {animation.name.slice(0, 2)}
          </span>
        </div>
        <span className="text-xs text-center line-clamp-2">
          {animation.name}
        </span>
      </button>
    );
  };

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent 
        className="w-[400px] p-3 max-h-[500px] overflow-y-auto"
        align="start"
      >
        <div className="space-y-4">
          {/* 标题 */}
          <h3 className="text-sm font-medium text-foreground">
            {isAddMode
              ? '添加进场动画'
              : type === 'entrance' ? '进场动画' : type === 'exit' ? '退场动画' : '强调动画'}
          </h3>

          {/* 无动画选项（仅 replace 模式下显示） */}
          {type !== 'emphasis' && !isAddMode && (
            <div>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => handleSelect(null)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all',
                    !selectedAnimationId
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Ban className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <span className="text-xs text-center">无</span>
                </button>
              </div>
            </div>
          )}

          {/* 文字动画（仅文本元素） */}
          {isTextElement && textAnimations.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">
                文字动画
              </h4>
              <div className="grid grid-cols-4 gap-2">
                {textAnimations.map((animation) =>
                  renderAnimationButton(animation as AnimationPresetItem)
                )}
              </div>
            </div>
          )}

          {/* 常规动画 */}
          <div>
            {isTextElement && textAnimations.length > 0 && (
              <h4 className="text-xs font-medium text-muted-foreground mb-2">
                常规动画
              </h4>
            )}
            <div className="grid grid-cols-4 gap-2">
              {commonAnimations.map((animation) =>
                renderAnimationButton(animation as AnimationPresetItem)
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

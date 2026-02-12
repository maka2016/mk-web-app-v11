'use client';

import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import { Settings } from 'lucide-react';
import { useState } from 'react';
import type { TimelineNode } from './timelineData';

export interface BatchApplyConfig {
  mode: 'incrementDelay' | 'unifyDelay' | 'unifyDuration';
  animationType: 'entrance' | 'emphasis' | 'exit';
  value: number;
}

interface BatchAnimationSettingsProps {
  nodes: TimelineNode[];
  multiSelectedElemIds: string[];
  onApplyBatch: (config: BatchApplyConfig) => void;
}

export default function BatchAnimationSettings({
  nodes,
  multiSelectedElemIds,
  onApplyBatch,
}: BatchAnimationSettingsProps) {
  // 延迟递增设置
  const [incrementDelayType, setIncrementDelayType] = useState<'entrance' | 'emphasis' | 'exit'>('entrance');
  const [incrementDelayValue, setIncrementDelayValue] = useState(100);

  // 延迟统一设置
  const [unifyDelayType, setUnifyDelayType] = useState<'entrance' | 'emphasis' | 'exit'>('entrance');
  const [unifyDelayValue, setUnifyDelayValue] = useState(0);

  // 时长统一设置
  const [unifyDurationType, setUnifyDurationType] = useState<'entrance' | 'emphasis' | 'exit'>('entrance');
  const [unifyDurationValue, setUnifyDurationValue] = useState(1000);

  const handleApplyIncrementDelay = () => {
    onApplyBatch({
      mode: 'incrementDelay',
      animationType: incrementDelayType,
      value: incrementDelayValue,
    });
  };

  const handleApplyUnifyDelay = () => {
    onApplyBatch({
      mode: 'unifyDelay',
      animationType: unifyDelayType,
      value: unifyDelayValue,
    });
  };

  const handleApplyUnifyDuration = () => {
    onApplyBatch({
      mode: 'unifyDuration',
      animationType: unifyDurationType,
      value: unifyDurationValue,
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="flex items-center gap-1"
          title="批量设置延迟和时长"
        >
          <Settings className="h-3.5 w-3.5" />
          批量设置
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[280px] p-3 flex flex-col gap-2.5"
        align="start"
        side="bottom"
        sideOffset={8}
      >
        {/* 延迟递增设置 */}
        <div className="space-y-2 pb-2 border-b border-border">
          <h4 className="text-xs font-medium">延迟递增</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="increment-delay-type" className="text-[11px] text-muted-foreground">
                类型
              </Label>
              <Select
                value={incrementDelayType}
                onValueChange={(v) => setIncrementDelayType(v as 'entrance' | 'emphasis' | 'exit')}
              >
                <SelectTrigger id="increment-delay-type" className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrance">进场</SelectItem>
                  <SelectItem value="emphasis">强调</SelectItem>
                  <SelectItem value="exit">退场</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="increment-delay-value" className="text-[11px] text-muted-foreground">
                递增(ms)
              </Label>
              <Input
                id="increment-delay-value"
                type="number"
                min={0}
                step={10}
                className="h-7 text-xs"
                value={incrementDelayValue}
                onChange={(e) => setIncrementDelayValue(Number(e.target.value))}
              />
            </div>
          </div>
          <Button
            type="button"
            variant="default"
            size="xs"
            className="w-full h-7"
            onClick={handleApplyIncrementDelay}
          >
            应用
          </Button>
        </div>

        {/* 延迟统一设置 */}
        <div className="space-y-2 pb-2 border-b border-border">
          <h4 className="text-xs font-medium">延迟统一</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="unify-delay-type" className="text-[11px] text-muted-foreground">
                类型
              </Label>
              <Select
                value={unifyDelayType}
                onValueChange={(v) => setUnifyDelayType(v as 'entrance' | 'emphasis' | 'exit')}
              >
                <SelectTrigger id="unify-delay-type" className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrance">进场</SelectItem>
                  <SelectItem value="emphasis">强调</SelectItem>
                  <SelectItem value="exit">退场</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="unify-delay-value" className="text-[11px] text-muted-foreground">
                延迟(ms)
              </Label>
              <Input
                id="unify-delay-value"
                type="number"
                min={0}
                step={10}
                className="h-7 text-xs"
                value={unifyDelayValue}
                onChange={(e) => setUnifyDelayValue(Number(e.target.value))}
              />
            </div>
          </div>
          <Button
            type="button"
            variant="default"
            size="xs"
            className="w-full h-7"
            onClick={handleApplyUnifyDelay}
          >
            应用
          </Button>
        </div>

        {/* 时长统一设置 */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium">时长统一</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="unify-duration-type" className="text-[11px] text-muted-foreground">
                类型
              </Label>
              <Select
                value={unifyDurationType}
                onValueChange={(v) => setUnifyDurationType(v as 'entrance' | 'emphasis' | 'exit')}
              >
                <SelectTrigger id="unify-duration-type" className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrance">进场</SelectItem>
                  <SelectItem value="emphasis">强调</SelectItem>
                  <SelectItem value="exit">退场</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="unify-duration-value" className="text-[11px] text-muted-foreground">
                时长(ms)
              </Label>
              <Input
                id="unify-duration-value"
                type="number"
                min={100}
                step={100}
                className="h-7 text-xs"
                value={unifyDurationValue}
                onChange={(e) => setUnifyDurationValue(Number(e.target.value))}
              />
            </div>
          </div>
          <Button
            type="button"
            variant="default"
            size="xs"
            className="w-full h-7"
            onClick={handleApplyUnifyDuration}
          >
            应用
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

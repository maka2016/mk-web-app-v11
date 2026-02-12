import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import { Separator } from '@workspace/ui/components/separator';
import { Switch } from '@workspace/ui/components/switch';
import { MousePointerClick } from 'lucide-react';
import { observer } from 'mobx-react';
import { useWorksStore } from '../../works-store/store/hook';

interface ClickActionSettingProps {
  elemId: string;
}

function ClickActionSetting({ elemId }: ClickActionSettingProps) {
  const worksStore = useWorksStore();
  const layer = worksStore.getLayer(elemId);
  const gridsData = worksStore.worksData.gridProps.gridsData || [];
  const action = layer?.action;
  const enabled = !!action?.enable;

  const updateAction = (
    patch: Partial<NonNullable<typeof action>>
  ) => {
    worksStore.setLayer(elemId, {
      action: {
        enable: action?.enable ?? false,
        type: action?.type ?? 'link',
        actionAttrs: action?.actionAttrs ?? {},
        ...patch,
      },
    });
  };

  return (
    <div className="px-2 py-2">
      <Separator className="mb-2" />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <MousePointerClick size={14} className="text-muted-foreground" />
          <Label className="text-xs font-medium">点击动作</Label>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(checked) => {
            updateAction({ enable: checked });
          }}
        />
      </div>

      {enabled && (
        <div className="flex flex-col gap-2 pl-0.5">
          {/* 动作类型选择 */}
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">动作类型</Label>
            <Select
              value={action?.type || 'link'}
              onValueChange={(value: 'link' | 'goToPage' | 'playAnimation') => {
                const defaultAttrs: Record<string, Record<string, unknown>> = {
                  link: { link: action?.actionAttrs?.link || '', openInNewTab: true },
                  goToPage: { pageIndex: action?.actionAttrs?.pageIndex ?? 0 },
                  playAnimation: {},
                };
                updateAction({
                  type: value,
                  actionAttrs: defaultAttrs[value] ?? {},
                });
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="link">跳转链接</SelectItem>
                <SelectItem value="goToPage">内部页面跳转</SelectItem>
                <SelectItem value="playAnimation">播放动画</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 跳转链接配置 */}
          {action?.type === 'link' && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">链接地址</Label>
                <Input
                  variantSize="sm"
                  placeholder="https://"
                  value={(action.actionAttrs?.link as string) || ''}
                  onChange={(e) => {
                    updateAction({
                      actionAttrs: {
                        ...action.actionAttrs,
                        link: e.target.value,
                      },
                    });
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id={`open_new_tab_${elemId}`}
                  checked={action.actionAttrs?.openInNewTab !== false}
                  onCheckedChange={(checked) => {
                    updateAction({
                      actionAttrs: {
                        ...action.actionAttrs,
                        openInNewTab: checked,
                      },
                    });
                  }}
                />
                <Label
                  htmlFor={`open_new_tab_${elemId}`}
                  className="text-xs text-muted-foreground"
                >
                  新窗口打开
                </Label>
              </div>
            </div>
          )}

          {/* 内部页面跳转配置 */}
          {action?.type === 'goToPage' && (
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">目标页面</Label>
              <Select
                value={String(action.actionAttrs?.pageIndex ?? 0)}
                onValueChange={(value) => {
                  updateAction({
                    actionAttrs: {
                      ...action.actionAttrs,
                      pageIndex: Number(value),
                    },
                  });
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {gridsData.map((_row, index) => (
                    <SelectItem key={index} value={String(index)}>
                      第 {index + 1} 页
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 播放动画提示 */}
          {action?.type === 'playAnimation' && (
            <p className="text-xs text-muted-foreground">
              点击后触发播放所有元素的动画。需在「作品」设置中开启「禁用动画自动播放」配合使用。
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default observer(ClickActionSetting);

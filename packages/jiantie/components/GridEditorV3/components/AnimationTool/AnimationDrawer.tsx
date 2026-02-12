'use client';

import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { observer } from 'mobx-react';
import RowRendererV2 from '../../AppV2/RowRendererV2';
import type { PageAnimationConfig } from '../../utils';
import { useWorksStore } from '../../works-store/store/hook';
import PageFlipEffectManager from './PageFlipEffectManager';

interface AnimationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // 翻页动画相关
  pageFlipValue?: PageAnimationConfig;
  onPageFlipChange?: (value: PageAnimationConfig) => void;
  onApplyToAllPages?: () => void;
  activePageIndex?: number;
  flipPreviewKey?: number;
}

const AnimationDrawer = observer(function AnimationDrawer({
  open,
  onOpenChange,
  pageFlipValue,
  onPageFlipChange,
  onApplyToAllPages,
  activePageIndex,
  flipPreviewKey,
}: AnimationDrawerProps) {
  const worksStore = useWorksStore();
  const worksData = worksStore?.worksData;
  const widgetStateV2 = worksStore?.widgetStateV2;

  return (
    <ResponsiveDialog
      isOpen={open}
      onOpenChange={onOpenChange}
      title="翻页动画设置"
      direction='right'
      fullHeight
      showOverlay={false}
      dismissible={false}
      contentProps={{
        style: { width: '300px' },
      }}
    >
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex flex-row flex-1 min-h-0 min-w-0">
          <div className="flex-1 min-w-0 overflow-auto p-3 flex flex-col gap-3">
            <PageFlipEffectManager
              value={pageFlipValue}
              onChange={(val) => {
                if (onPageFlipChange) {
                  onPageFlipChange(val);
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full shrink-0"
              onClick={() => {
                if (onApplyToAllPages) {
                  onApplyToAllPages();
                }
              }}
            >
              应用到全部页面
            </Button>
          </div>
          <div className="flex flex-col flex-shrink-0 w-[140px] border-l border-border p-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 w-full"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('preview_flip_animation_next'));
              }}
              disabled={(worksData?.gridProps?.gridsData?.length ?? 0) <= 1}
              title={
                (worksData?.gridProps?.gridsData?.length ?? 0) <= 1
                  ? '至少两页时可播放翻页'
                  : '在右侧预览区播放翻页动画'
              }
            >
              播放翻页
            </Button>
            <div
              className="w-[120px] rounded-md border border-border overflow-hidden bg-muted/30 shrink-0"
              style={{ aspectRatio: '375/667' }}
            >
              <div className="w-full h-full overflow-hidden">
                {worksStore && worksData && widgetStateV2 && activePageIndex !== undefined && (
                  <RowRendererV2
                    key={`flip-preview-${flipPreviewKey}-${activePageIndex}-${JSON.stringify(pageFlipValue ?? {})}`}
                    readonly={true}
                    isFlipPage={true}
                    isPlayFlipPage={false}
                    firstPageCover={worksData.gridProps?.firstPageCover}
                    previewFlipEventKey="preview_flip_animation_next"
                    activeRowDepth={widgetStateV2.activeRowDepth ?? []}
                    onlyRenderActiveBlock={false}
                    blockStyle={{
                      width: '375px',
                      zoom: 120 / 375,
                      boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.1)',
                      overflow: 'hidden',
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ResponsiveDialog>
  );
});

export default AnimationDrawer;

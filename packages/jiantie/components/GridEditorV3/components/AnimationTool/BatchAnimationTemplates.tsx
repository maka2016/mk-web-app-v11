/**
 * 批量动画模板统一组件：合并场景式与功能式模板，统一「当前页/所有页」应用与清除的交互逻辑
 */
import { LayerElemItem } from '@/components/GridEditorV3/works-store/types';
import type { AnimateQueue2, AnimationState } from '@/components/GridEditorV3/works-store/types/animate2';
import { Button } from '@workspace/ui/components/button';
import { cn } from '@workspace/ui/lib/utils';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { Layers } from 'lucide-react';
import { observer } from 'mobx-react';
import { useRef, useState } from 'react';
import { GridRow } from '../../utils';
import { useWorksStore } from '../../works-store/store/hook';
import { getAnimationById } from './animation2Data';
import type { BatchTemplateItem, SceneAnimationIds } from './batchAnimationTemplateData';
import { batchAnimationTemplateList } from './batchAnimationTemplateData';
import { ANIMATION_CLEAR_PROPS, convertAnimeParamsToGsap, msToSeconds } from './gsapHelpers';
import { resolveTarget } from './playAnimationUtils';

// 注册 GSAP 插件
gsap.registerPlugin(SplitText);

const sceneTemplates = batchAnimationTemplateList.filter((t) => t.group === 'scene');
const commonTemplates = batchAnimationTemplateList.filter((t) => t.group === 'common');

function collectLayersFromRows(
  rows: GridRow[],
  allLayerMap: Record<string, LayerElemItem>,
  out: LayerElemItem[] = []
): LayerElemItem[] {
  rows.forEach((row) => {
    if (!row) return;
    row.childrenIds?.forEach((elemId: string) => {
      const layer = allLayerMap[elemId];
      if (layer) out.push(layer);
    });
    if (row.children?.length) {
      collectLayersFromRows(row.children, allLayerMap, out);
    }
  });
  return out;
}

function collectBlockLayers(
  block: GridRow,
  allLayerMap: Record<string, LayerElemItem>
): LayerElemItem[] {
  const layers: LayerElemItem[] = [];
  const walk = (rows: GridRow[]) => {
    rows.forEach((row) => {
      if (!row) return;
      row.childrenIds?.forEach((elemId: string) => {
        const layer = allLayerMap[elemId];
        if (layer) layers.push(layer);
      });
      if (row.children?.length) walk(row.children);
    });
  };
  walk([block]);
  return layers;
}

function pickAnimationIds(
  template: BatchTemplateItem,
  layer: LayerElemItem,
  index: number
): { entrance: string; emphasis?: string; exit?: string } {
  const t = template.type;
  let value: string | SceneAnimationIds;
  if (layer.elementRef === 'Text' && t.Text) {
    value = t.Text;
  } else if (layer?.attrs?.absoluteElem && t.absoluteElem) {
    value = t.absoluteElem;
  } else if (t.odd && index % 2 === 0) {
    value = t.odd;
  } else if (t.even && index % 2 === 1) {
    value = t.even;
  } else {
    value = t.default;
  }
  if (typeof value === 'string') {
    return { entrance: value };
  }
  return {
    entrance: value.entrance,
    emphasis: value.emphasis,
    exit: value.exit,
  };
}

function toAnimationState(
  preset: { id: string; name: string; parameters: Record<string, unknown>; delay?: number; type: string },
  durationMs: number,
  delayMs: number
): AnimationState {
  return {
    id: preset.id,
    name: preset.name,
    type: preset.type,
    delay: preset.delay ?? 0,
    parameters: {
      ...preset.parameters,
      duration: durationMs,
      delay: delayMs,
    },
  };
}

const BatchAnimationTemplates = () => {
  const worksStore = useWorksStore();
  const { worksData, gridPropsOperator } = worksStore;
  const { getActiveRootRow } = gridPropsOperator;
  const gridsData = worksData.gridProps.gridsData;
  const isFlipPage = worksStore?.worksDetail?.specInfo?.is_flip_page === true;
  const activeRootRow = getActiveRootRow();
  const layers = activeRootRow
    ? collectLayersFromRows([activeRootRow], worksData.layersMap)
    : [];

  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const splitsRef = useRef<SplitText[]>([]);
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const stopPreview = () => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }
    if (timelineRef.current) {
      timelineRef.current.kill();
      timelineRef.current = null;
    }
    splitsRef.current.forEach((split) => {
      try {
        split.revert();
      } catch {
        // ignore if already reverted
      }
    });
    splitsRef.current = [];
    layers.forEach((layer) => {
      const target = resolveTarget(layer.elemId);
      if (target) gsap.set(target, { clearProps: ANIMATION_CLEAR_PROPS });
    });
  };

  const getDelayMsForLayer = (layer: LayerElemItem, template: BatchTemplateItem, index: number): number => {
    const fallbackDelay = index * template.delayTime;
    if (isFlipPage) return fallbackDelay;
    const target = document.getElementById(`layer_root_${layer.elemId}`);
    if (!target) return fallbackDelay;
    const blockContainer = target.closest<HTMLElement>('[data-name="editor_block_container"]');
    if (!blockContainer) return fallbackDelay;
    const targetRect = target.getBoundingClientRect();
    const blockRect = blockContainer.getBoundingClientRect();
    const relativeTop = targetRect.top - blockRect.top;
    return relativeTop >= 800 ? 0 : fallbackDelay;
  };

  const applyTemplateToLayer = (layer: LayerElemItem, template: BatchTemplateItem, index: number) => {
    const ids = pickAnimationIds(template, layer, index);
    const delayMs = getDelayMsForLayer(layer, template, index);

    const entrancePreset = ids.entrance ? getAnimationById(ids.entrance) : null;
    const emphasisPreset = ids.emphasis ? getAnimationById(ids.emphasis) : null;

    const entrance: AnimationState[] = [];
    if (entrancePreset) {
      entrance.push(toAnimationState(entrancePreset, template.duration, delayMs));
    }
    const emphasis: AnimationState[] = [];
    if (emphasisPreset) {
      const state = toAnimationState(emphasisPreset, template.duration, 0);
      state.parameters = { ...state.parameters, loop: 3 };
      emphasis.push(state);
    }

    const animateQueue2: AnimateQueue2 = {};
    if (entrance.length) animateQueue2.entrance = entrance;
    if (emphasis.length) animateQueue2.emphasis = emphasis;

    worksStore.setLayer(layer.elemId, {
      animateQueue2,
      animateQueue: undefined,
    });
  };

  const setLayoutAnimation = (template: BatchTemplateItem) => {
    layers.forEach((layer, i) => {
      applyTemplateToLayer(layer, template, i);
    });
  };

  const setAllPagesAnimation = (template: BatchTemplateItem) => {
    gridsData.forEach((block) => {
      const blockLayers = collectBlockLayers(block, worksData.layersMap);
      blockLayers.forEach((layer, layerIndex) => {
        applyTemplateToLayer(layer, template, layerIndex);
      });
    });
  };

  const applyTemplateByMode = (template: BatchTemplateItem) => {
    // if (isFlipPage) {
    //   setLayoutAnimation(template);
    //   return;
    // }
    setAllPagesAnimation(template);
  };

  const removeAllAnimation = () => {
    layers.forEach((layer) => {
      worksStore.setLayer(layer.elemId, {
        animateQueue2: { entrance: [], emphasis: [], exit: [] },
        animateQueue: undefined,
      });
    });
    setActiveId(null);
  };

  const removeAllPagesAnimation = () => {
    gridsData.forEach((block) => {
      const blockLayers = collectBlockLayers(block, worksData.layersMap);
      blockLayers.forEach((layer) => {
        worksStore.setLayer(layer.elemId, {
          animateQueue2: { entrance: [], emphasis: [], exit: [] },
          animateQueue: undefined,
        });
      });
    });
    setActiveId(null);
  };

  const playPreview = (template: BatchTemplateItem) => {
    if (timelineRef.current) {
      timelineRef.current.kill();
    }
    splitsRef.current = [];

    const timeline = gsap.timeline({ paused: true });
    const splits: SplitText[] = [];

    layers.forEach((layer, i) => {
      const target = resolveTarget(layer.elemId);
      if (!target) return;

      const ids = pickAnimationIds(template, layer, i);
      const preset = ids.entrance ? getAnimationById(ids.entrance) : null;
      if (!preset) return;

      const { from, to } = convertAnimeParamsToGsap(preset.parameters);
      const staggerDelay = msToSeconds(template.delayTime);

      if (preset.type === 'text') {
        const split = new SplitText(target, { type: 'chars' });
        splits.push(split);
        gsap.set(split.chars, { opacity: 0 });
        timeline.fromTo(
          split.chars,
          from,
          {
            ...to,
            stagger: msToSeconds(preset.delay ?? 0),
            onComplete: () => {
              split.revert();
              gsap.set(split.chars, { clearProps: ANIMATION_CLEAR_PROPS });
            },
          },
          i === 0 ? 0 : `<+=${staggerDelay}`
        );
      } else {
        if (from.opacity !== undefined) {
          gsap.set(target, { opacity: from.opacity as number });
        }
        timeline.fromTo(
          target,
          from,
          {
            ...to,
            onComplete: () => {
              gsap.set(target, { clearProps: ANIMATION_CLEAR_PROPS });
            },
          },
          i === 0 ? 0 : `<+=${staggerDelay}`
        );
      }
    });

    splitsRef.current = splits;
    timelineRef.current = timeline;
    timeline.play().then(() => {
      timeline.kill();
      splits.forEach((split) => split.revert());
      splitsRef.current = [];
      timelineRef.current = null;
    });
  };

  const activeTemplate = activeId
    ? batchAnimationTemplateList.find((t) => t.id === activeId)
    : null;

  const HOVER_PREVIEW_DELAY_MS = 250;

  const renderTemplateGrid = (templates: BatchTemplateItem[]) => (
    <div className="grid grid-cols-4 gap-1.5">
      {templates.map((template) => (
        <div
          key={template.id}
          className="relative flex flex-col items-center gap-0.5 group"
          onMouseEnter={() => {
            if (previewTimeoutRef.current) {
              clearTimeout(previewTimeoutRef.current);
            }
            previewTimeoutRef.current = setTimeout(() => {
              previewTimeoutRef.current = null;
              playPreview(template);
            }, HOVER_PREVIEW_DELAY_MS);
          }}
          onMouseLeave={stopPreview}
          onClick={() => {
            stopPreview();
            applyTemplateByMode(template);
            setActiveId(template.id);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              stopPreview();
              applyTemplateByMode(template);
              setActiveId(template.id);
            }
          }}
        >
          <div
            className={cn(
              'relative flex items-center justify-center w-14 h-14 border border-border rounded shrink-0 overflow-hidden cursor-pointer transition-all duration-200',
              'group-hover:ring-2 group-hover:ring-primary group-hover:border-primary',
              activeId === template.id && 'ring-2 ring-primary border-primary'
            )}
          >
            {template.preview ? (
              <img
                src={activeId === template.id ? template.activePreview : template.preview}
                alt=""
                className="w-full h-full object-contain"
              />
            ) : (
              <Layers className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            )}
          </div>
          <span className="text-[11px] text-muted-foreground group-hover:text-foreground text-center line-clamp-1 w-full transition-colors">
            {template.name}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-2 p-1.5">
      <div className="flex flex-col gap-1.5">
        <div className="text-xs font-medium text-foreground px-0.5">场景动画</div>
        {renderTemplateGrid(sceneTemplates)}
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="text-xs font-medium text-foreground px-0.5">通用</div>
        {renderTemplateGrid(commonTemplates)}
      </div>
      <div className="flex flex-col gap-1.5 pt-1.5 border-t border-border">
        {activeTemplate && (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={() => applyTemplateByMode(activeTemplate)}
          >
            将「{activeTemplate.name}」应用到所有页面
          </Button>
        )}
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={removeAllAnimation}>
            清除当前页
          </Button>
          <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={removeAllPagesAnimation}>
            清除所有页
          </Button>
        </div>
      </div>
    </div>
  );
};

export default observer(BatchAnimationTemplates);

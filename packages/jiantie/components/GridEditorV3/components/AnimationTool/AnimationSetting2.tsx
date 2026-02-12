import { useEffect, useRef, useState } from 'react';

import {
  AnimateQueue2,
  AnimationState,
  Direction,
  Easing,
  TransformOrigin,
} from '@/components/GridEditorV3/works-store/types/animate2';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import { Switch } from '@workspace/ui/components/switch';
import { cn } from '@workspace/ui/lib/utils';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronDown, ChevronRight, ClipboardPaste, Copy, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  applyExitAmplitude,
  applyScaleFromTo,
  applyScalePreset,
  easingOptions,
  emphasisAmplitudeAppliers,
  entranceAmplitudeAppliers,
  getAnimationById,
  getEmphasisAmplitudeConfig,
  getEmphasisAmplitudeValue,
  getEmphasisDirection,
  getEmphasisDirectionConfig,
  getEntranceAmplitudeConfig,
  getEntranceExitAmplitudeValue,
  getExitAmplitudeConfig,
  getScaleFromTo,
  reverseAnimationParameters,
  transformOriginMap,
  type AnimationPresetItem,
} from './animation2Data';
import { AnimationSelectorPopover } from './AnimationSelectorPopover';
import {
  buildTimelineFromAnimateQueue,
  playAnimation as playAnimationUtil,
  playBrushAnimation,
  playEmphasisAnimation as playEmphasisAnimationUtil,
  resolveEmphasisTarget,
  resolveRowTarget,
  resolveTarget,
  type BrushPathType,
} from './playAnimationUtils';

const ANIMATION_CLIPBOARD_KEY = 'grid_animation_clipboard';

interface AnimationClipboardData {
  type: 'animation';
  timestamp: number;
  data: AnimateQueue2;
}

/** JSON 深拷贝（动画数据均为 JSON 可序列化结构，避免 structuredClone 对特殊对象报错） */
function deepCloneJSON<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/** 将动画数据写入剪贴板（localStorage） */
function writeAnimationClipboard(queue: AnimateQueue2) {
  const clipboardData: AnimationClipboardData = {
    type: 'animation',
    timestamp: Date.now(),
    data: deepCloneJSON(queue),
  };
  localStorage.setItem(ANIMATION_CLIPBOARD_KEY, JSON.stringify(clipboardData));
}

/** 从剪贴板读取动画数据，无效时返回 null */
function readAnimationClipboard(): AnimateQueue2 | null {
  try {
    const raw = localStorage.getItem(ANIMATION_CLIPBOARD_KEY);
    if (!raw) return null;
    const parsed: AnimationClipboardData = JSON.parse(raw);
    if (parsed.type !== 'animation' || !parsed.data) return null;
    return deepCloneJSON(parsed.data);
  } catch {
    return null;
  }
}

/** 判断 AnimateQueue2 是否有至少一个动画 */
function hasAnyAnimation(queue: AnimateQueue2): boolean {
  return (
    (queue.entrance != null && queue.entrance.length > 0) ||
    (queue.emphasis != null && queue.emphasis.length > 0) ||
    (queue.exit != null && queue.exit.length > 0)
  );
}

interface AnimationSettingProps {
  elementRef?: string;
  targetId: string;
  /** 当前编辑目标为行（Grid 布局/卡片/格子）时为 true，预览需用 editor_row_ 容器 */
  isRowTarget?: boolean;
  value?: AnimateQueue2;
  onChange: (value: AnimateQueue2) => void;
  /** 多选的元素 ID 列表（用于批量设置动画） */
  multiSelectedElemIds?: string[];
  /** 多选时的批量更新回调 */
  onMultiChange?: (elemId: string, value: AnimateQueue2) => void;
}

export default function AnimationSetting({
  targetId,
  value = {},
  onChange,
  elementRef,
  isRowTarget = false,
  multiSelectedElemIds = [],
  onMultiChange,
}: AnimationSettingProps) {
  const isMultiSelect = multiSelectedElemIds.length > 1;
  // 使用 value prop 作为动画队列的来源，不需要本地状态
  const animationQueue = value;
  const animateRef = useRef<gsap.core.Tween | gsap.core.Timeline | null>(null);

  // 进场动画：多动画叠加，不再维护单动画本地状态，直接从 animationQueue.entrance 数组读取
  /** 正在替换的进场动画索引，-1 表示未打开替换弹窗 */
  const [entranceReplaceIndex, setEntranceReplaceIndex] = useState(-1);
  /** "添加更多动画"弹窗 */
  const [entranceAddPopoverOpen, setEntranceAddPopoverOpen] = useState(false);

  // 退场动画状态
  const [exitAnimation, setExitAnimation] = useState<AnimationPresetItem | null>(null);
  const [exitDirection, setExitDirection] = useState<Direction>('up');
  const [exitTransformOrigin, setExitTransformOrigin] = useState<TransformOrigin>('center-center');
  const [exitEasing, setExitEasing] = useState<Easing>('outQuad');

  // 强调动画状态（共享配置）
  const [emphasisTransformOrigin, setEmphasisTransformOrigin] = useState<TransformOrigin>('center-center');
  const [emphasisEasing, setEmphasisEasing] = useState<Easing>('outQuad');
  const [emphasisDirection, setEmphasisDirection] = useState<Direction>('right');

  // 弹窗控制
  const [entrancePopoverOpen, setEntrancePopoverOpen] = useState(false);
  const [exitPopoverOpen, setExitPopoverOpen] = useState(false);
  const [emphasisPopoverOpen, setEmphasisPopoverOpen] = useState(false);
  /** 更换强调时打开的选择器（替换当前项） */
  const [emphasisReplacePopoverOpen, setEmphasisReplacePopoverOpen] = useState(false);

  // 面板展开/收起状态（默认收起）
  const [entranceExpanded, setEntranceExpanded] = useState(true);
  const [emphasisExpanded, setEmphasisExpanded] = useState(true);
  const [exitExpanded, setExitExpanded] = useState(true);

  useEffect(() => {
    return () => {
      if (animateRef.current) {
        animateRef.current.kill();
        animateRef.current = null;
      }
    };
  }, []);

  // 同步外部 value 到内部状态
  useEffect(() => {
    // 进场动画不再维护本地状态，直接从 value.entrance 数组读取

    // 同步退场动画状态
    const exit = value.exit?.[0];
    if (exit && exit.type !== 'text') {
      const preset = getAnimationById(exit.id);
      if (preset) {
        setExitAnimation(preset as AnimationPresetItem);
        if (exit.direction != null) setExitDirection(exit.direction);
        if (exit.transformOrigin != null) setExitTransformOrigin(exit.transformOrigin);
        if (exit.easing != null) setExitEasing(exit.easing);
      }
    } else {
      setExitAnimation(null);
    }

    // 同步强调动画状态
    const emphasis = value.emphasis?.[0];
    if (emphasis) {
      if (emphasis.transformOrigin != null) setEmphasisTransformOrigin(emphasis.transformOrigin);
      if (emphasis.easing != null) setEmphasisEasing(emphasis.easing);
      // 同步方向：优先读取已存储的 direction，否则从 parameters 推断
      if (emphasis.direction != null) {
        setEmphasisDirection(emphasis.direction);
      } else {
        setEmphasisDirection(getEmphasisDirection(emphasis.id, emphasis.parameters));
      }
    }
  }, [value]);

  const getPreviewTarget = (forEmphasis: boolean) =>
    isRowTarget
      ? resolveRowTarget(targetId)
      : forEmphasis
        ? resolveEmphasisTarget(targetId)
        : resolveTarget(targetId);

  const playAnimation = (
    id: string,
    animation: AnimationState
  ) => {
    const el = getPreviewTarget(false);

    // 检测是否为笔刷动画（通过 id 或 parameters.brushPathType 判断）
    const isBrushAnimation = animation.id?.startsWith('common-entrance-brush-') ||
      animation.parameters?.brushPathType;

    if (isBrushAnimation && animation.parameters?.brushPathType) {
      const next = playBrushAnimation(
        el ?? id,
        {
          pathType: animation.parameters.brushPathType as BrushPathType,
          duration: (animation.parameters.duration as number) || 1000,
          strokeWidth: (animation.parameters.strokeWidth as number) || 20,
          ease: (animation.parameters.ease as string) || 'power2.out',
        },
        animateRef.current
      );
      animateRef.current = next ?? null;
    } else {
      const next = playAnimationUtil(el ?? id, animation, animateRef.current);
      animateRef.current = next ?? null;
    }
  };

  const playEmphasisAnimation = (id: string, animateQueue: AnimateQueue2) => {
    const el = getPreviewTarget(true);
    const next = playEmphasisAnimationUtil(
      el ?? id,
      animateQueue,
      animateRef.current
    );
    animateRef.current = next ?? null;
  };

  // 根据方向获取动画参数
  const getParametersForDirection = (preset: AnimationPresetItem, dir: Direction): Record<string, any> => {
    if (preset.directional && preset.directionParams?.[dir]) {
      return preset.directionParams[dir] as Record<string, any>;
    }
    return preset.parameters as Record<string, any>;
  };

  // ─── 进场动画多效果叠加 handlers ───

  /** 构建单个入场动画 AnimationState */
  const buildEntranceState = (
    preset: AnimationPresetItem,
    dir: Direction = 'up',
    origin: TransformOrigin = 'center-center',
    easingValue: Easing = 'outQuad'
  ): AnimationState => {
    let params = getParametersForDirection(preset, dir);
    params = {
      ...params,
      transformOrigin: transformOriginMap[origin],
      ease: easingValue,
    };
    return {
      ...structuredClone(preset),
      id: preset.id || '',
      name: preset.name,
      type: 'common',
      parameters: params,
      direction: dir,
      transformOrigin: origin,
      easing: easingValue,
    };
  };

  /** 添加一个新的进场动画（追加到数组末尾） */
  const handleAddEntranceAnimation = (animation: AnimationPresetItem | null) => {
    if (!animation) return;
    const newState = buildEntranceState(animation);
    const updatedValue: AnimateQueue2 = { ...animationQueue };
    updatedValue.entrance = [...(updatedValue.entrance ?? []), newState];
    handleChange(updatedValue);
    setTimeout(() => playAnimation(targetId, newState), 100);
  };

  /** 空状态下选择第一个进场动画（兼容旧的 replace 语义） */
  const handleFirstEntranceSelect = (animation: AnimationPresetItem | null) => {
    if (!animation) {
      const updatedValue: AnimateQueue2 = { ...animationQueue };
      delete updatedValue.entrance;
      handleChange(updatedValue);
      return;
    }
    handleAddEntranceAnimation(animation);
  };

  /** 替换指定索引的进场动画，保留原延迟和时长 */
  const handleReplaceEntranceAnimation = (index: number, animation: AnimationPresetItem | null) => {
    if (!animation || !animationQueue.entrance?.length || index < 0 || index >= animationQueue.entrance.length) return;
    const oldItem = animationQueue.entrance[index];
    const dir = oldItem.direction ?? 'up';
    const origin = oldItem.transformOrigin ?? 'center-center';
    const easing = oldItem.easing ?? 'outQuad';
    const newState = buildEntranceState(animation, dir, origin, easing);
    // 保留原动画的延时和时长
    if (oldItem.parameters) {
      if (oldItem.parameters.delay != null) newState.parameters.delay = oldItem.parameters.delay;
      if (oldItem.parameters.duration != null) newState.parameters.duration = oldItem.parameters.duration;
    }
    const updatedValue: AnimateQueue2 = { ...animationQueue };
    updatedValue.entrance = [...(updatedValue.entrance ?? [])];
    updatedValue.entrance[index] = newState;
    handleChange(updatedValue);
    setTimeout(() => playAnimation(targetId, newState), 100);
  };

  /** 删除指定索引的进场动画 */
  const handleDeleteEntranceByIndex = (index: number) => {
    const updatedValue: AnimateQueue2 = { ...animationQueue };
    if (!updatedValue.entrance?.length) return;
    updatedValue.entrance = updatedValue.entrance.filter((_, i) => i !== index);
    if (updatedValue.entrance.length === 0) delete updatedValue.entrance;
    handleChange(updatedValue);
  };

  /** 更新指定索引的入场动画（通用更新器） */
  const updateEntranceAtIndex = (index: number, updater: (state: AnimationState) => void) => {
    const updatedValue: AnimateQueue2 = { ...animationQueue };
    if (!updatedValue.entrance?.[index]) return;
    updatedValue.entrance = [...updatedValue.entrance];
    updater(updatedValue.entrance[index]);
    handleChange(updatedValue);
    return updatedValue;
  };

  /** 修改指定入场动画的方向 */
  const handleEntranceDirectionChangeAt = (index: number, dir: Direction) => {
    const item = animationQueue.entrance?.[index];
    if (!item) return;
    const preset = getAnimationById(item.id);
    if (!preset) return;
    const origin = item.transformOrigin ?? 'center-center';
    const easing = item.easing ?? 'outQuad';
    let params = getParametersForDirection(preset as AnimationPresetItem, dir);
    params = { ...params, transformOrigin: transformOriginMap[origin], ease: easing };
    // 保留时长和延迟
    if (item.parameters.delay != null) params.delay = item.parameters.delay;
    if (item.parameters.duration != null) params.duration = item.parameters.duration;
    const updatedValue: AnimateQueue2 = { ...animationQueue };
    updatedValue.entrance = [...(updatedValue.entrance ?? [])];
    updatedValue.entrance[index] = { ...item, parameters: params, direction: dir };
    handleChange(updatedValue);
    setTimeout(() => playAnimation(targetId, updatedValue.entrance![index]), 100);
  };

  /** 预览全部入场动画（叠加播放） */
  const handlePreviewAllEntrance = () => {
    if (!animationQueue.entrance?.length) return;
    const el = getPreviewTarget(false);
    if (!el) return;
    if (animateRef.current) {
      animateRef.current.kill();
      animateRef.current = null;
    }
    const previewQueue: AnimateQueue2 = { entrance: animationQueue.entrance };
    const { timeline } = buildTimelineFromAnimateQueue(el, previewQueue);
    timeline.play(0);
    animateRef.current = timeline;
  };

  /** 预览单个入场动画 */
  const handlePreviewSingleEntrance = (index: number) => {
    const item = animationQueue.entrance?.[index];
    if (!item) return;
    playAnimation(targetId, item);
  };

  /** hover 预览入场动画（选择器中） */
  const handlePreviewEntranceAnimation = (animation: AnimationPresetItem) => {
    const previewState = buildEntranceState(animation);
    playAnimation(targetId, previewState);
  };

  // 应用退场动画
  const applyExitAnimation = (
    preset: AnimationPresetItem,
    dir: Direction,
    origin: TransformOrigin,
    easingValue: Easing
  ) => {
    const updatedValue: AnimateQueue2 = { ...animationQueue };

    let baseParams = getParametersForDirection(preset, dir);
    baseParams = {
      ...baseParams,
      transformOrigin: transformOriginMap[origin],
      ease: easingValue,
    };

    // 退场动画需要反转参数
    const exitParams = reverseAnimationParameters(baseParams);
    // 替换时保留原退场动画的延时和时长
    const currentExit = animationQueue.exit?.[0];
    if (currentExit?.parameters) {
      if (currentExit.parameters.delay != null) exitParams.delay = currentExit.parameters.delay;
      if (currentExit.parameters.duration != null) exitParams.duration = currentExit.parameters.duration;
    }

    const exitAnimation: AnimationState = {
      ...structuredClone(preset),
      id: preset.id || '',
      name: preset.name,
      type: 'common',
      parameters: exitParams,
      direction: dir,
      transformOrigin: origin,
      easing: easingValue,
    };

    updatedValue.exit = [exitAnimation];

    handleChange(updatedValue);

    // 预览动画
    setTimeout(() => {
      playAnimation(targetId, exitAnimation);
    }, 100);
  };

  // 处理退场动画选择
  const handleExitAnimationSelect = (animation: AnimationPresetItem | null) => {
    if (!animation) {
      // 删除退场动画
      const updatedValue: AnimateQueue2 = { ...animationQueue };
      delete updatedValue.exit;
      handleChange(updatedValue);
      return;
    }

    applyExitAnimation(animation, exitDirection, exitTransformOrigin, exitEasing);
  };

  // 退场动画方向改变
  const handleExitDirectionChange = (dir: Direction) => {
    setExitDirection(dir);
    if (exitAnimation) {
      applyExitAnimation(exitAnimation, dir, exitTransformOrigin, exitEasing);
    }
  };

  // 退场动画支点改变
  const handleExitTransformOriginChange = (origin: TransformOrigin) => {
    setExitTransformOrigin(origin);
    if (exitAnimation) {
      applyExitAnimation(exitAnimation, exitDirection, origin, exitEasing);
    }
  };

  // 退场动画缓动改变
  const handleExitEasingChange = (easingValue: Easing) => {
    setExitEasing(easingValue);
    if (exitAnimation) {
      applyExitAnimation(exitAnimation, exitDirection, exitTransformOrigin, easingValue);
    }
  };

  // 预览退场动画（用于 hover）
  const handlePreviewExitAnimation = (animation: AnimationPresetItem) => {
    let baseParams = getParametersForDirection(animation, exitDirection);
    baseParams = {
      ...baseParams,
      transformOrigin: transformOriginMap[exitTransformOrigin],
      ease: exitEasing,
    };

    const exitParams = reverseAnimationParameters(baseParams);

    const previewAnimation: AnimationState = {
      ...structuredClone(animation),
      id: animation.id || '',
      name: animation.name,
      type: 'common',
      parameters: exitParams,
      direction: exitDirection,
      transformOrigin: exitTransformOrigin,
      easing: exitEasing,
    };

    playAnimation(targetId, previewAnimation);
  };

  // 预览强调动画（用于 hover）
  const handlePreviewEmphasisAnimation = (animation: AnimationPresetItem) => {
    const params: Record<string, unknown> = {
      ...animation.parameters,
      ease: emphasisEasing,
      transformOrigin: transformOriginMap[emphasisTransformOrigin],
    };

    // 应用方向到预览参数
    const animId = animation.id ?? '';
    const dirConfig = getEmphasisDirectionConfig(animId);
    if (dirConfig) {
      const applier = emphasisAmplitudeAppliers[animId];
      if (applier) {
        const amp = (params.amplitude as number) || 8;
        applier(params, amp, emphasisDirection);
      }
    }

    const previewAnimation: AnimationState = {
      ...structuredClone(animation),
      id: animation.id || '',
      name: animation.name,
      type: 'common',
      parameters: params,
      easing: emphasisEasing,
      transformOrigin: emphasisTransformOrigin,
      direction: dirConfig ? emphasisDirection : undefined,
    };

    // 为强调动画创建一个临时队列用于预览
    const previewQueue: AnimateQueue2 = {
      emphasis: [previewAnimation],
    };
    playEmphasisAnimation(targetId, previewQueue);
  };

  // 删除退场动画
  const handleDeleteExit = () => {
    const updatedValue: AnimateQueue2 = { ...animationQueue };
    delete updatedValue.exit;
    handleChange(updatedValue);
  };

  /** 构建单个强调动画状态 */
  const buildEmphasisAnimationState = (animation: AnimationPresetItem, directionOverride?: Direction): AnimationState => {
    const params: Record<string, unknown> = {
      ...animation.parameters,
      ease: emphasisEasing,
      transformOrigin: transformOriginMap[emphasisTransformOrigin],
    };

    // 如果该动画支持方向，应用方向参数
    const animId = animation.id ?? '';
    const dirConfig = getEmphasisDirectionConfig(animId);
    const dir = directionOverride ?? (dirConfig ? emphasisDirection : undefined);
    if (dirConfig && dir) {
      const applier = emphasisAmplitudeAppliers[animId];
      if (applier) {
        const amp = (params.amplitude as number) || 8;
        applier(params, amp, dir);
      }
    }

    return {
      ...structuredClone(animation),
      id: animation.id || '',
      name: animation.name,
      type: 'common',
      parameters: params,
      easing: emphasisEasing,
      transformOrigin: emphasisTransformOrigin,
      direction: dirConfig ? (dir ?? dirConfig.default) : undefined,
    };
  };

  /** 设置强调动画（仅支持一个，空状态选择时调用） */
  const handleEmphasisAnimationSet = (animation: AnimationPresetItem | null) => {
    if (!animation) return;
    // 新选择动画时重置方向为默认值
    const dirConfig = getEmphasisDirectionConfig(animation.id ?? '');
    const defaultDir = dirConfig?.default ?? 'right';
    if (dirConfig) setEmphasisDirection(defaultDir);
    const updatedValue = { ...animationQueue };
    updatedValue.emphasis = [buildEmphasisAnimationState(animation, defaultDir)];
    handleChange(updatedValue);
    setTimeout(() => playEmphasisAnimation(targetId, updatedValue), 0);
  };

  /** 替换指定索引的强调动画（保留原动画的延时和时长） */
  const handleEmphasisAnimationReplace = (index: number, animation: AnimationPresetItem | null) => {
    if (!animation || !animationQueue.emphasis?.length || index < 0 || index >= animationQueue.emphasis.length) return;
    // 替换动画时重置方向为默认值
    const dirConfig = getEmphasisDirectionConfig(animation.id ?? '');
    const defaultDir = dirConfig?.default ?? 'right';
    if (dirConfig) setEmphasisDirection(defaultDir);
    const updatedValue = { ...animationQueue };
    updatedValue.emphasis = [...(updatedValue.emphasis ?? [])];
    const newState = buildEmphasisAnimationState(animation, defaultDir);
    const oldItem = animationQueue.emphasis[index];
    if (oldItem?.parameters) {
      if (oldItem.parameters.delay != null) newState.parameters.delay = oldItem.parameters.delay;
      if (oldItem.parameters.duration != null) newState.parameters.duration = oldItem.parameters.duration;
    }
    updatedValue.emphasis[index] = newState;
    handleChange(updatedValue);
    setTimeout(() => playEmphasisAnimation(targetId, updatedValue), 0);
  };


  // 预览退场动画（点击预览按钮）
  const handlePreviewExit = () => {
    if (animationQueue.exit?.[0]) {
      playAnimation(targetId, animationQueue.exit[0]);
    }
  };

  // 预览强调动画（点击预览按钮）
  const handlePreviewEmphasis = () => {
    if (animationQueue.emphasis && animationQueue.emphasis.length > 0) {
      playEmphasisAnimation(targetId, animationQueue);
    }
  };

  // 删除所有强调动画
  const handleDeleteEmphasis = () => {
    const updatedValue: AnimateQueue2 = { ...animationQueue };
    delete updatedValue.emphasis;
    handleChange(updatedValue);
  };

  // 统一的 onChange 处理，支持多选时批量更新
  const handleChange = (newValue: AnimateQueue2) => {
    if (isMultiSelect && onMultiChange) {
      // 多选时，给所有选中的元素应用相同的动画设置
      multiSelectedElemIds.forEach((elemId) => {
        onMultiChange(elemId, newValue);
      });
    } else {
      // 单选时，正常调用 onChange
      onChange(newValue);
    }
  };

  return (
    <div>
      {/* 多选提示 */}
      {isMultiSelect && (
        <div className="flex-col px-3 py-2 text-sm text-amber-700 bg-amber-50 border-b border-amber-200 flex gap-2">
          <span className="font-medium">批量设置</span>
          <span className="text-amber-600">已选中 {multiSelectedElemIds.length} 个元素，将统一应用动画</span>
        </div>
      )}
      <div className="p-1.5 flex flex-col h-full overflow-y-auto gap-1.5 w-full text-foreground">
        {/* 复制/粘贴动画工具栏 */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="xs"
            disabled={!hasAnyAnimation(animationQueue)}
            onClick={() => {
              writeAnimationClipboard(animationQueue);
              toast.success('动画已复制');
            }}
          >
            <Copy className="h-3.5 w-3.5 mr-1" />
            复制动画
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => {
              const clipboardData = readAnimationClipboard();
              if (!clipboardData) {
                toast.error('剪贴板中没有动画数据');
                return;
              }
              handleChange(clipboardData);
              toast.success('动画已粘贴');
            }}
          >
            <ClipboardPaste className="h-3.5 w-3.5 mr-1" />
            粘贴动画
          </Button>
        </div>

        {/* 进场动画（支持多动画叠加） */}
        <div className="flex flex-col gap-1 p-2 border border-border rounded-md bg-card">
          <div className="flex justify-between items-center pb-1">
            <h3 className="text-xs font-medium text-foreground m-0">进场动画</h3>
            {(animationQueue.entrance?.length ?? 0) > 0 && (
              <div className="flex items-center gap-1">
                <Button variant="outline" size="xs" onClick={handlePreviewAllEntrance}>
                  预览全部
                  <ChevronRight className="h-3 w-3 ml-0.5" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-1">
            {/* 空状态：添加第一个动画 */}
            {(!animationQueue.entrance || animationQueue.entrance.length === 0) && (
              <AnimationSelectorPopover
                isOpen={entrancePopoverOpen}
                onOpenChange={setEntrancePopoverOpen}
                type="entrance"
                selectedAnimationId={undefined}
                onSelect={handleFirstEntranceSelect}
                onPreview={handlePreviewEntranceAnimation}
                elementRef={elementRef}
              >
                <div
                  className={cn(
                    'flex items-center justify-center p-3 border border-dashed border-border rounded-md bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors',
                    'w-full'
                  )}
                >
                  <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-xl">+</span>
                    </div>
                    <span className="text-xs">添加动画</span>
                  </div>
                </div>
              </AnimationSelectorPopover>
            )}

            {/* 动画列表 */}
            {animationQueue.entrance && animationQueue.entrance.length > 0 && (
              <>
                {animationQueue.entrance.map((entranceItem, idx) => {
                  const preset = getAnimationById(entranceItem.id);
                  const itemDir = entranceItem.direction ?? 'up';
                  const itemOrigin = entranceItem.transformOrigin ?? 'center-center';
                  const itemEasing = entranceItem.easing ?? 'outQuad';
                  return (
                    <div key={`entrance-${idx}-${entranceItem.id}`} className="flex flex-col gap-1">
                      {/* 动画卡片 */}
                      <div className="flex items-center gap-2 p-1.5 rounded-md bg-muted/30">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-muted-foreground text-[10px]">{entranceItem.name.slice(0, 2)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium text-foreground truncate block">{entranceItem.name}</span>
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <AnimationSelectorPopover
                            isOpen={entranceReplaceIndex === idx}
                            onOpenChange={(open) => setEntranceReplaceIndex(open ? idx : -1)}
                            type="entrance"
                            selectedAnimationId={entranceItem.id}
                            onSelect={(anim) => handleReplaceEntranceAnimation(idx, anim)}
                            onPreview={handlePreviewEntranceAnimation}
                            elementRef={elementRef}
                          >
                            <Button variant="ghost" size="xs" className="h-6 px-1.5 text-[10px]">换</Button>
                          </AnimationSelectorPopover>
                          <Button variant="ghost" size="xs" className="h-6 px-1.5 text-[10px]" onClick={() => handlePreviewSingleEntrance(idx)}>
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteEntranceByIndex(idx)}>
                            <Trash2 className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>

                      {/* 每个动画的详细配置 */}
                      <div
                        className="flex items-center gap-1 cursor-pointer hover:bg-muted/50 -mx-1 px-1 py-0.5 rounded text-xs text-muted-foreground"
                        onClick={() => setEntranceExpanded(!entranceExpanded)}
                      >
                        {entranceExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        <span>配置</span>
                        {!entranceExpanded && (
                          <span className="ml-auto">
                            {(entranceItem.parameters?.duration as number || 500) / 1000}s
                            {preset?.directional && ` · ${itemDir === 'up' ? '↑' : itemDir === 'down' ? '↓' : itemDir === 'left' ? '←' : '→'}`}
                          </span>
                        )}
                      </div>

                      {entranceExpanded && (
                        <div className="flex flex-col gap-2 pl-2 border-l-2 border-muted ml-1">
                          {/* 方向选择器 */}
                          {preset?.directional && (
                            <div className="flex items-center gap-2">
                              <Label className="text-xs whitespace-nowrap min-w-[3rem]">方向</Label>
                              <div className="grid grid-cols-4 gap-1 flex-1">
                                {(['left', 'right', 'up', 'down'] as Direction[]).map(d => (
                                  <Button key={d} variant={itemDir === d ? 'default' : 'outline'} size="xs" className="h-7" onClick={() => handleEntranceDirectionChangeAt(idx, d)}>
                                    {d === 'left' ? <ArrowLeft className="h-3.5 w-3.5" /> : d === 'right' ? <ArrowRight className="h-3.5 w-3.5" /> : d === 'up' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 时长和延迟 */}
                          <div className="flex gap-2 items-center">
                            <Label className="text-xs whitespace-nowrap min-w-[3rem]">时长</Label>
                            <Input step={0.1} type="number" variantSize="sm" className="flex-1 h-7" placeholder="秒"
                              value={(entranceItem.parameters.duration as number || 500) / 1000}
                              onChange={e => {
                                updateEntranceAtIndex(idx, s => { s.parameters.duration = Number(e.target.value) * 1000; });
                              }}
                            />
                            <Label className="text-xs whitespace-nowrap">延迟</Label>
                            <Input step={0.1} type="number" variantSize="sm" className="flex-1 h-7" placeholder="秒"
                              value={(entranceItem.parameters.delay as number || 0) / 1000}
                              onChange={e => {
                                updateEntranceAtIndex(idx, s => { s.parameters.delay = Number(e.target.value) * 1000; });
                              }}
                            />
                          </div>

                          {/* 幅度（非缩放） */}
                          {(() => {
                            const id = entranceItem.id ?? '';
                            if (id === 'common-entrance-scale') return null;
                            const ampConfig = getEntranceAmplitudeConfig(id);
                            if (!ampConfig) return null;
                            const ampValue = Math.min(ampConfig.max, Math.max(ampConfig.min, getEntranceExitAmplitudeValue(id, entranceItem.parameters ?? {})));
                            const applier = entranceAmplitudeAppliers[id];
                            return (
                              <div className="flex gap-2 items-center">
                                <Label className="text-xs whitespace-nowrap min-w-[3rem]">幅度</Label>
                                <Input step={ampConfig.step} min={ampConfig.min} max={ampConfig.max} type="number" variantSize="sm" className="flex-1 h-7" placeholder={ampConfig.unit}
                                  value={ampValue}
                                  onChange={e => {
                                    const v = Math.min(ampConfig.max, Math.max(ampConfig.min, Number(e.target.value) || ampConfig.min));
                                    const uv = updateEntranceAtIndex(idx, s => {
                                      if (applier) applier(s.parameters, v, itemDir);
                                    });
                                    if (uv?.entrance?.[idx]) {
                                      setTimeout(() => playAnimation(targetId, uv.entrance![idx]), 100);
                                    }
                                  }}
                                />
                                <span className="text-xs text-muted-foreground">{ampConfig.unit}</span>
                              </div>
                            );
                          })()}

                          {/* 缩放专用控件 */}
                          {entranceItem.id === 'common-entrance-scale' && (() => {
                            const { from: sf, to: st } = getScaleFromTo(entranceItem.parameters);
                            return (
                              <div className="flex flex-col gap-2">
                                <div className="flex gap-2 items-center">
                                  <Label className="text-xs whitespace-nowrap min-w-[3rem]">预设</Label>
                                  <div className="flex gap-1 flex-1">
                                    <Button variant={sf < st ? 'default' : 'outline'} size="xs" className="flex-1 h-7"
                                      onClick={() => {
                                        const uv = updateEntranceAtIndex(idx, s => applyScalePreset(s.parameters, 'zoomIn'));
                                        if (uv?.entrance?.[idx]) setTimeout(() => playAnimation(targetId, uv.entrance![idx]), 100);
                                      }}>放大</Button>
                                    <Button variant={sf > st ? 'default' : 'outline'} size="xs" className="flex-1 h-7"
                                      onClick={() => {
                                        const uv = updateEntranceAtIndex(idx, s => applyScalePreset(s.parameters, 'zoomOut'));
                                        if (uv?.entrance?.[idx]) setTimeout(() => playAnimation(targetId, uv.entrance![idx]), 100);
                                      }}>缩小</Button>
                                  </div>
                                </div>
                                <div className="flex gap-2 items-center">
                                  <Label className="text-xs whitespace-nowrap min-w-[3rem]">从</Label>
                                  <Input step={10} min={0} max={300} type="number" variantSize="sm" className="flex-1 h-7" value={sf}
                                    onChange={e => {
                                      const v = Math.min(300, Math.max(0, Number(e.target.value) || 0));
                                      const uv = updateEntranceAtIndex(idx, s => applyScaleFromTo(s.parameters, v, st));
                                      if (uv?.entrance?.[idx]) setTimeout(() => playAnimation(targetId, uv.entrance![idx]), 100);
                                    }} />
                                  <Label className="text-xs whitespace-nowrap">到</Label>
                                  <Input step={10} min={0} max={300} type="number" variantSize="sm" className="flex-1 h-7" value={st}
                                    onChange={e => {
                                      const v = Math.min(300, Math.max(0, Number(e.target.value) || 100));
                                      const uv = updateEntranceAtIndex(idx, s => applyScaleFromTo(s.parameters, sf, v));
                                      if (uv?.entrance?.[idx]) setTimeout(() => playAnimation(targetId, uv.entrance![idx]), 100);
                                    }} />
                                  <span className="text-xs text-muted-foreground">%</span>
                                </div>
                              </div>
                            );
                          })()}

                          {/* 缓动 */}
                          <div className="flex items-center gap-2">
                            <Label className="text-xs whitespace-nowrap min-w-[3rem]">缓动</Label>
                            <Select value={itemEasing} onValueChange={(val) => {
                              const uv = updateEntranceAtIndex(idx, s => {
                                s.parameters.ease = val;
                                s.easing = val as Easing;
                              });
                              if (uv?.entrance?.[idx]) setTimeout(() => playAnimation(targetId, uv.entrance![idx]), 100);
                            }}>
                              <SelectTrigger className="h-7 flex-1">
                                <SelectValue placeholder="选择缓动" />
                              </SelectTrigger>
                              <SelectContent>
                                {easingOptions.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* 支点 */}
                          <div className="flex items-center gap-2">
                            <Label className="text-xs whitespace-nowrap min-w-[3rem]">支点</Label>
                            <div className="grid grid-cols-3 gap-0.5 flex-1">
                              {(['top-left', 'top-center', 'top-right', 'center-left', 'center-center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right'] as TransformOrigin[]).map(origin => (
                                <Button key={origin} variant={itemOrigin === origin ? 'default' : 'outline'} size="xs" className="h-6 w-full"
                                  onClick={() => {
                                    const uv = updateEntranceAtIndex(idx, s => {
                                      s.parameters.transformOrigin = transformOriginMap[origin];
                                      s.transformOrigin = origin;
                                    });
                                    if (uv?.entrance?.[idx]) setTimeout(() => playAnimation(targetId, uv.entrance![idx]), 100);
                                  }}>
                                  <div className={cn("w-1.5 h-1.5 rounded-full", itemOrigin === origin ? "bg-primary-btn" : "bg-muted-foreground")} />
                                </Button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 分隔线（非最后一项） */}
                      {idx < (animationQueue.entrance?.length ?? 0) - 1 && (
                        <div className="border-b border-border/50 my-0.5" />
                      )}
                    </div>
                  );
                })}

                {/* 添加更多动画按钮 */}
                <AnimationSelectorPopover
                  isOpen={entranceAddPopoverOpen}
                  onOpenChange={setEntranceAddPopoverOpen}
                  type="entrance"
                  mode="add"
                  existingAnimationIds={animationQueue.entrance?.map(e => e.id) ?? []}
                  onSelect={handleAddEntranceAnimation}
                  onPreview={handlePreviewEntranceAnimation}
                  elementRef={elementRef}
                >
                  <button className="flex items-center justify-center gap-1.5 p-2 border border-dashed border-border rounded-md bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors w-full text-muted-foreground text-xs">
                    <Plus className="h-3.5 w-3.5" />
                    叠加动画
                  </button>
                </AnimationSelectorPopover>
              </>
            )}
          </div>
        </div>

        {/* 强调动画 */}
        <div className="flex flex-col gap-1 p-2 border border-border rounded-md bg-card">
          <div className="flex justify-between items-center pb-1">
            <h3 className="text-xs font-medium text-foreground m-0">强调动画</h3>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            {/* 动画卡片 - 用 Popover 包裹 */}
            {!animationQueue.emphasis || animationQueue.emphasis.length === 0 ? (
              <AnimationSelectorPopover
                isOpen={emphasisPopoverOpen}
                onOpenChange={setEmphasisPopoverOpen}
                type="emphasis"
                selectedAnimationId={undefined}
                onSelect={handleEmphasisAnimationSet}
                onPreview={handlePreviewEmphasisAnimation}
                elementRef={elementRef}
              >
                <div
                  className={cn(
                    'flex items-center justify-center p-3 border border-dashed border-border rounded-md bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors',
                    'w-full'
                  )}
                >
                  <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-xl">+</span>
                    </div>
                    <span className="text-xs">添加动画</span>
                  </div>
                </div>
              </AnimationSelectorPopover>
            ) : (
              <>
                <div className="flex items-start gap-2 p-2 rounded-md bg-muted/30">
                  {/* 左侧：动画图标 */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <div className="text-muted-foreground text-xs text-center">
                        {animationQueue.emphasis?.map(e => e.name.slice(0, 1)).join('') || ''}
                      </div>
                    </div>
                  </div>

                  {/* 中间：动画名称和操作按钮 */}
                  <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-medium text-foreground truncate">
                        {animationQueue.emphasis?.map(e => e.name).join('、') || ''}
                      </h4>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 flex-shrink-0 -mt-0.5 -mr-0.5"
                        onClick={handleDeleteEmphasis}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <AnimationSelectorPopover
                        isOpen={emphasisReplacePopoverOpen}
                        onOpenChange={setEmphasisReplacePopoverOpen}
                        type="emphasis"
                        selectedAnimationId={animationQueue.emphasis?.[0]?.id}
                        onSelect={(animation) => {
                          if (animation) handleEmphasisAnimationReplace(0, animation);
                        }}
                        onPreview={handlePreviewEmphasisAnimation}
                        elementRef={elementRef}
                      >
                        <Button variant="outline" size="xs">
                          更换
                        </Button>
                      </AnimationSelectorPopover>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={handlePreviewEmphasis}
                      >
                        预览
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 强调动画配置 */}
                <div
                  className="flex items-center gap-1 cursor-pointer hover:bg-muted/50 -mx-1 px-1 py-0.5 rounded text-xs text-muted-foreground"
                  onClick={() => setEmphasisExpanded(!emphasisExpanded)}
                >
                  {emphasisExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  <span>详细配置</span>
                  {!emphasisExpanded && (
                    <span className="ml-auto">
                      {(animationQueue.emphasis?.[0]?.parameters?.duration as number || 500) / 1000}s
                      {(() => {
                        const eId = animationQueue.emphasis?.[0]?.id ?? '';
                        const dc = getEmphasisDirectionConfig(eId);
                        if (!dc) return null;
                        const label = dc.options.find(o => o.value === emphasisDirection)?.label;
                        return label ? ` · ${label}` : null;
                      })()}
                      {` · ${animationQueue.emphasis?.[0]?.parameters?.loop || 1}次`}
                    </span>
                  )}
                </div>
                {emphasisExpanded && <div className="flex flex-col gap-2">
                  {/* 动画速度和缓动 - 压缩为一行 */}
                  <div className="flex gap-2 items-center">
                    <Label className="text-xs whitespace-nowrap min-w-[3rem]">速度</Label>
                    <Input
                      step={0.1}
                      type="number"
                      variantSize="sm"
                      className="flex-1 h-7"
                      placeholder="秒"
                      value={
                        animationQueue.emphasis?.[0].parameters.duration / 1000 ||
                        0
                      }
                      onChange={e => {
                        const updatedValue = { ...animationQueue };
                        if (!updatedValue?.emphasis?.length) {
                          return;
                        }
                        if (Number(e.target.value) < 0) {
                          return;
                        }
                        updatedValue.emphasis?.forEach(item => {
                          item.parameters.duration =
                            Number(e.target.value) * 1000;
                        });
                        handleChange(updatedValue);
                        playEmphasisAnimation(targetId, updatedValue);
                      }}
                    />
                  </div>

                  {/* 强调动画方向选择器（仅支持方向的动画显示） */}
                  {animationQueue.emphasis && animationQueue.emphasis.length > 0 && (() => {
                    const first = animationQueue.emphasis[0];
                    const id = first?.id ?? '';
                    const dirConfig = getEmphasisDirectionConfig(id);
                    if (!dirConfig) return null;
                    return (
                      <div className="flex items-center gap-2">
                        <Label className="text-xs whitespace-nowrap min-w-[3rem]">方向</Label>
                        <div className="flex gap-1 flex-1">
                          {dirConfig.options.map(opt => (
                            <Button
                              key={opt.value}
                              variant={emphasisDirection === opt.value ? 'default' : 'outline'}
                              size="xs"
                              className="flex-1 h-7"
                              onClick={() => {
                                setEmphasisDirection(opt.value);
                                const updatedValue = { ...animationQueue };
                                if (!updatedValue?.emphasis?.length) return;
                                updatedValue.emphasis.forEach(item => {
                                  const applier = emphasisAmplitudeAppliers[item.id];
                                  if (applier) {
                                    const amp = (item.parameters.amplitude as number) || 8;
                                    applier(item.parameters, amp, opt.value);
                                  }
                                  item.direction = opt.value;
                                });
                                handleChange(updatedValue);
                                playEmphasisAnimation(targetId, updatedValue);
                              }}
                            >
                              {opt.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* 强调动画幅度（有强调即显示，配置与写回逻辑来自 animation2Data） */}
                  {animationQueue.emphasis && animationQueue.emphasis.length > 0 && (() => {
                    const first = animationQueue.emphasis[0];
                    const id = first?.id ?? '';
                    const config = getEmphasisAmplitudeConfig(id);
                    const value = Math.min(config.max, Math.max(config.min, getEmphasisAmplitudeValue(id, first?.parameters ?? {})));
                    const applier = emphasisAmplitudeAppliers[id];
                    return (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex gap-2 items-center">
                          <Label className="text-xs whitespace-nowrap min-w-[3rem]">幅度</Label>
                          <Input
                            step={config.step}
                            min={config.min}
                            max={config.max}
                            type="number"
                            variantSize="sm"
                            className="flex-1 h-7"
                            placeholder={config.unit}
                            value={value}
                            onChange={e => {
                              const v = Math.min(config.max, Math.max(config.min, Number(e.target.value) || config.min));
                              const updatedValue = { ...animationQueue };
                              if (!updatedValue?.emphasis?.length || !applier) return;
                              const targetIdForApply = first?.id;
                              updatedValue.emphasis.forEach(item => {
                                if (item.id === targetIdForApply) {
                                  applier(item.parameters, v, emphasisDirection);
                                }
                              });
                              handleChange(updatedValue);
                              playEmphasisAnimation(targetId, updatedValue);
                            }}
                          />
                          <span className="text-xs text-muted-foreground">{config.unit}</span>
                        </div>
                        {config.hint && (
                          <div className="flex gap-2 items-center">
                            <div className="min-w-[3rem]" />
                            <span className="text-[10px] text-muted-foreground">影响：{config.hint}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* 缓动选择器（强调动画） */}
                  <div className="flex items-center gap-2">
                    <Label className="text-xs whitespace-nowrap min-w-[3rem]">缓动</Label>
                    <Select value={emphasisEasing} onValueChange={(value) => {
                      const easingValue = value as Easing;
                      setEmphasisEasing(easingValue);
                      const updatedValue = { ...animationQueue };
                      if (!updatedValue?.emphasis?.length) return;
                      updatedValue.emphasis?.forEach(item => {
                        item.parameters.ease = easingValue;
                        item.easing = easingValue;
                      });
                      handleChange(updatedValue);
                      playEmphasisAnimation(targetId, updatedValue);
                    }}>
                      <SelectTrigger className="h-7 flex-1">
                        <SelectValue placeholder="选择缓动" />
                      </SelectTrigger>
                      <SelectContent>
                        {easingOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 支点选择器（强调动画）- 缩小按钮 */}
                  <div className="flex items-center gap-2">
                    <Label className="text-xs whitespace-nowrap min-w-[3rem]">支点</Label>
                    <div className="grid grid-cols-3 gap-0.5 flex-1">
                      {(['top-left', 'top-center', 'top-right', 'center-left', 'center-center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right'] as TransformOrigin[]).map(origin => (
                        <Button
                          key={origin}
                          variant={emphasisTransformOrigin === origin ? 'default' : 'outline'}
                          size="xs"
                          className="h-6 w-full"
                          onClick={() => {
                            setEmphasisTransformOrigin(origin);
                            const updatedValue = { ...animationQueue };
                            if (!updatedValue?.emphasis?.length) return;
                            updatedValue.emphasis?.forEach(item => {
                              item.parameters.transformOrigin = transformOriginMap[origin];
                              item.transformOrigin = origin;
                            });
                            handleChange(updatedValue);
                            playEmphasisAnimation(targetId, updatedValue);
                          }}
                        >
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            emphasisTransformOrigin === origin ? "bg-primary-btn" : "bg-muted-foreground"
                          )} />
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* 往返动画和循环次数 - 压缩为一行 */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs !mb-0 whitespace-nowrap">往返</Label>
                      <Switch
                        checked={
                          animationQueue.emphasis?.[0].parameters.yoyo === true
                        }
                        onCheckedChange={(value: boolean) => {
                          const updatedValue = { ...animationQueue };
                          if (!updatedValue?.emphasis?.length) return;
                          updatedValue.emphasis?.forEach(item => {
                            item.parameters.yoyo = value;
                          });
                          handleChange(updatedValue);
                          setTimeout(() => {
                            playEmphasisAnimation(targetId, updatedValue);
                          }, 0);
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs !mb-0 whitespace-nowrap">无限</Label>
                      <Switch
                        checked={
                          animationQueue.emphasis?.[0].parameters.loop === true
                        }
                        onCheckedChange={(value: boolean) => {
                          const updatedValue = { ...animationQueue };
                          if (!updatedValue?.emphasis?.length) return;
                          updatedValue.emphasis?.forEach(item => {
                            item.parameters.loop = value ? value : 0;
                          });
                          handleChange(updatedValue);
                          playEmphasisAnimation(targetId, updatedValue);
                        }}
                      />
                    </div>
                    {animationQueue.emphasis?.[0].parameters.loop !== true && (
                      <Input
                        step={1}
                        min={0}
                        type="number"
                        variantSize="sm"
                        className="w-16 h-7"
                        placeholder="次数"
                        value={
                          animationQueue.emphasis?.[0].parameters.loop || 0
                        }
                        onChange={e => {
                          const updatedValue = { ...animationQueue };
                          if (!updatedValue?.emphasis?.length) return;
                          if (Number(e.target.value) < 1) return;
                          updatedValue.emphasis?.forEach(item => {
                            item.parameters.loop = Number(e.target.value);
                          });
                          handleChange(updatedValue);
                          playEmphasisAnimation(targetId, updatedValue);
                        }}
                      />
                    )}
                  </div>
                </div>}
              </>
            )}
          </div>
        </div>

        {/* 退场动画 */}
        <div className="flex flex-col gap-1 p-2 border border-border rounded-md bg-card">
          <div className="flex justify-between items-center pb-1">
            <h3 className="text-xs font-medium text-foreground m-0">退场动画</h3>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            {/* 动画卡片 - 用 Popover 包裹 */}
            {!exitAnimation ? (
              <AnimationSelectorPopover
                isOpen={exitPopoverOpen}
                onOpenChange={setExitPopoverOpen}
                type="exit"
                selectedAnimationId={undefined}
                onSelect={handleExitAnimationSelect}
                onPreview={handlePreviewExitAnimation}
                elementRef={elementRef}
              >
                <div
                  className={cn(
                    'flex items-center justify-center p-3 border border-dashed border-border rounded-md bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors',
                    'w-full'
                  )}
                >
                  <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-xl">+</span>
                    </div>
                    <span className="text-xs">添加动画</span>
                  </div>
                </div>
              </AnimationSelectorPopover>
            ) : (
              <>
                <div className="flex items-start gap-2 p-2 rounded-md bg-muted/30">
                  {/* 左侧：动画图标 */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <div className="text-muted-foreground text-xs text-center">
                        {exitAnimation.name.slice(0, 2)}
                      </div>
                    </div>
                  </div>

                  {/* 中间：动画名称和操作按钮 */}
                  <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-medium text-foreground truncate">
                        {exitAnimation.name}
                      </h4>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 flex-shrink-0 -mt-0.5 -mr-0.5"
                        onClick={handleDeleteExit}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <AnimationSelectorPopover
                        isOpen={exitPopoverOpen}
                        onOpenChange={setExitPopoverOpen}
                        type="exit"
                        selectedAnimationId={exitAnimation?.id}
                        onSelect={handleExitAnimationSelect}
                        onPreview={handlePreviewExitAnimation}
                        elementRef={elementRef}
                      >
                        <Button variant="outline" size="xs">
                          更改
                        </Button>
                      </AnimationSelectorPopover>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={handlePreviewExit}
                      >
                        预览
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 退场动画配置 */}
                <div
                  className="flex items-center gap-1 cursor-pointer hover:bg-muted/50 -mx-1 px-1 py-0.5 rounded text-xs text-muted-foreground"
                  onClick={() => setExitExpanded(!exitExpanded)}
                >
                  {exitExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  <span>详细配置</span>
                  {!exitExpanded && (
                    <span className="ml-auto">
                      {(animationQueue.exit?.[0]?.parameters?.duration as number || 1000) / 1000}s
                      {exitAnimation.directional && ` · ${exitDirection === 'up' ? '↑' : exitDirection === 'down' ? '↓' : exitDirection === 'left' ? '←' : '→'}`}
                    </span>
                  )}
                </div>
                {exitExpanded && <div className="flex flex-col gap-2">
                  {/* 方向选择器（仅方向性动画显示） */}
                  {exitAnimation.directional && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs whitespace-nowrap min-w-[3rem]">方向</Label>
                      <div className="grid grid-cols-4 gap-1 flex-1">
                        <Button
                          variant={exitDirection === 'left' ? 'default' : 'outline'}
                          size="xs"
                          className="h-7"
                          onClick={() => handleExitDirectionChange('left')}
                        >
                          <ArrowLeft className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant={exitDirection === 'right' ? 'default' : 'outline'}
                          size="xs"
                          className="h-7"
                          onClick={() => handleExitDirectionChange('right')}
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant={exitDirection === 'up' ? 'default' : 'outline'}
                          size="xs"
                          className="h-7"
                          onClick={() => handleExitDirectionChange('up')}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant={exitDirection === 'down' ? 'default' : 'outline'}
                          size="xs"
                          className="h-7"
                          onClick={() => handleExitDirectionChange('down')}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* 动画时长和延迟 - 压缩为一行 */}
                  <div className="flex gap-2 items-center">
                    <Label className="text-xs whitespace-nowrap min-w-[3rem]">时长</Label>
                    <Input
                      step={0.1}
                      type="number"
                      variantSize="sm"
                      className="flex-1 h-7"
                      placeholder="秒"
                      value={
                        (animationQueue.exit?.[0]?.parameters.duration || 500) / 1000
                      }
                      onChange={e => {
                        const updatedValue = { ...animationQueue };
                        if (updatedValue.exit?.[0]) {
                          updatedValue.exit[0].parameters.duration =
                            Number(e.target.value) * 1000;
                        }
                        handleChange(updatedValue);
                      }}
                    />
                    <Label className="text-xs whitespace-nowrap">延迟</Label>
                    <Input
                      step={0.1}
                      type="number"
                      variantSize="sm"
                      className="flex-1 h-7"
                      placeholder="秒"
                      value={
                        (animationQueue.exit?.[0]?.parameters.delay || 0) / 1000
                      }
                      onChange={e => {
                        const updatedValue = { ...animationQueue };
                        if (updatedValue.exit?.[0]) {
                          updatedValue.exit[0].parameters.delay =
                            Number(e.target.value) * 1000;
                        }
                        handleChange(updatedValue);
                      }}
                    />
                  </div>

                  {/* 退场动画幅度（非缩放动画） */}
                  {animationQueue.exit && animationQueue.exit.length > 0 && (() => {
                    const first = animationQueue.exit[0];
                    const id = first?.id ?? '';
                    // 缩放动画使用专用控件，跳过通用幅度
                    if (id === 'common-entrance-scale') return null;
                    const config = getExitAmplitudeConfig(id);
                    if (!config) return null;
                    const value = Math.min(config.max, Math.max(config.min, getEntranceExitAmplitudeValue(id, first?.parameters ?? {})));
                    return (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex gap-2 items-center">
                          <Label className="text-xs whitespace-nowrap min-w-[3rem]">幅度</Label>
                          <Input
                            step={config.step}
                            min={config.min}
                            max={config.max}
                            type="number"
                            variantSize="sm"
                            className="flex-1 h-7"
                            placeholder={config.unit}
                            value={value}
                            onChange={e => {
                              const v = Math.min(config.max, Math.max(config.min, Number(e.target.value) || config.min));
                              const updatedValue = { ...animationQueue };
                              if (!updatedValue?.exit?.length) return;
                              applyExitAmplitude(id, updatedValue.exit[0].parameters, v, exitDirection);
                              handleChange(updatedValue);
                              // 预览动画
                              setTimeout(() => {
                                playAnimation(targetId, updatedValue.exit![0]);
                              }, 100);
                            }}
                          />
                          <span className="text-xs text-muted-foreground">{config.unit}</span>
                        </div>
                        {config.hint && (
                          <div className="flex gap-2 items-center">
                            <div className="min-w-[3rem]" />
                            <span className="text-[10px] text-muted-foreground">影响：{config.hint}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* 退场缩放动画专用控件 */}
                  {animationQueue.exit?.[0]?.id === 'common-entrance-scale' && (() => {
                    const first = animationQueue.exit[0];
                    const { from, to } = getScaleFromTo(first.parameters);
                    return (
                      <div className="flex flex-col gap-2">
                        {/* 快捷选项 */}
                        <div className="flex gap-2 items-center">
                          <Label className="text-xs whitespace-nowrap min-w-[3rem]">预设</Label>
                          <div className="flex gap-1 flex-1">
                            <Button
                              variant={from > to ? 'default' : 'outline'}
                              size="xs"
                              className="flex-1 h-7"
                              onClick={() => {
                                const updatedValue = { ...animationQueue };
                                if (!updatedValue?.exit?.length) return;
                                // 退场放大：从 100% 到 0%
                                applyScaleFromTo(updatedValue.exit[0].parameters, 100, 0);
                                handleChange(updatedValue);
                                setTimeout(() => {
                                  playAnimation(targetId, updatedValue.exit![0]);
                                }, 100);
                              }}
                            >
                              缩小消失
                            </Button>
                            <Button
                              variant={from < to ? 'default' : 'outline'}
                              size="xs"
                              className="flex-1 h-7"
                              onClick={() => {
                                const updatedValue = { ...animationQueue };
                                if (!updatedValue?.exit?.length) return;
                                // 退场缩小：从 100% 到 150%
                                applyScaleFromTo(updatedValue.exit[0].parameters, 100, 150);
                                handleChange(updatedValue);
                                setTimeout(() => {
                                  playAnimation(targetId, updatedValue.exit![0]);
                                }, 100);
                              }}
                            >
                              放大消失
                            </Button>
                          </div>
                        </div>
                        {/* From / To 输入 */}
                        <div className="flex gap-2 items-center">
                          <Label className="text-xs whitespace-nowrap min-w-[3rem]">从</Label>
                          <Input
                            step={10}
                            min={0}
                            max={300}
                            type="number"
                            variantSize="sm"
                            className="flex-1 h-7"
                            value={from}
                            onChange={e => {
                              const v = Math.min(300, Math.max(0, Number(e.target.value) || 0));
                              const updatedValue = { ...animationQueue };
                              if (!updatedValue?.exit?.length) return;
                              applyScaleFromTo(updatedValue.exit[0].parameters, v, to);
                              handleChange(updatedValue);
                              setTimeout(() => {
                                playAnimation(targetId, updatedValue.exit![0]);
                              }, 100);
                            }}
                          />
                          <Label className="text-xs whitespace-nowrap">到</Label>
                          <Input
                            step={10}
                            min={0}
                            max={300}
                            type="number"
                            variantSize="sm"
                            className="flex-1 h-7"
                            value={to}
                            onChange={e => {
                              const v = Math.min(300, Math.max(0, Number(e.target.value) || 100));
                              const updatedValue = { ...animationQueue };
                              if (!updatedValue?.exit?.length) return;
                              applyScaleFromTo(updatedValue.exit[0].parameters, from, v);
                              handleChange(updatedValue);
                              setTimeout(() => {
                                playAnimation(targetId, updatedValue.exit![0]);
                              }, 100);
                            }}
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 缓动选择器 */}
                  <div className="flex items-center gap-2">
                    <Label className="text-xs whitespace-nowrap min-w-[3rem]">缓动</Label>
                    <Select value={exitEasing} onValueChange={(value) => handleExitEasingChange(value as Easing)}>
                      <SelectTrigger className="h-7 flex-1">
                        <SelectValue placeholder="选择缓动" />
                      </SelectTrigger>
                      <SelectContent>
                        {easingOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 支点选择器 - 缩小按钮 */}
                  <div className="flex items-center gap-2">
                    <Label className="text-xs whitespace-nowrap min-w-[3rem]">支点</Label>
                    <div className="grid grid-cols-3 gap-0.5 flex-1">
                      {(['top-left', 'top-center', 'top-right', 'center-left', 'center-center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right'] as TransformOrigin[]).map(origin => (
                        <Button
                          key={origin}
                          variant={exitTransformOrigin === origin ? 'default' : 'outline'}
                          size="xs"
                          className="h-6 w-full"
                          onClick={() => handleExitTransformOriginChange(origin)}
                        >
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            exitTransformOrigin === origin ? "bg-primary-btn" : "bg-muted-foreground"
                          )} />
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useWorksStore } from '@/components/GridEditorV3/works-store/store/hook';
import { deepClone } from '@/utils';
import { Button } from '@workspace/ui/components/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { cn } from '@workspace/ui/lib/utils';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BookOpen, BoxSelect, ChevronDown, ChevronRight, ChevronUp, Eraser, FolderOpen, GripVertical, Group, Infinity, Layers, Pause, Play, RotateCcw, Settings, Ungroup } from 'lucide-react';
import { nanoid } from 'nanoid';
import { observer } from 'mobx-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import type { WorksStore } from '../../works-store/store';
import type { AnimationGroup } from '../../works-store/types/interface';
import type { AnimateQueue2 } from '../../works-store/types/animate2';
import AnimationDrawer from './AnimationDrawer';
import BatchAnimationSettings from './BatchAnimationSettings';
import BatchAnimationTemplates from './BatchAnimationTemplates';
import { ANIMATION_CLEAR_PROPS, msToSeconds } from './gsapHelpers';
import {
  buildTimelineFromAnimateQueue,
  resolveEmphasisTarget,
  resolveRowTarget,
  resolveTarget,
} from './playAnimationUtils';
import {
  buildOrderedDisplayItems,
  buildSortableIds,
  collectRowIdsWithChildren,
  displayItemsToOrder,
  type DisplayItem,
  findNodeInTree,
  flattenElementNodesOnly,
  getAnimationTimelineData,
  getDelayMs,
  getRowAndElemIdsUnderRow,
  maxEndFromNodes,
  type AnimationTimelineData,
  type TimelineNode,
  type TimelineStrip,
} from './timelineData';

// 注册 GSAP 插件
gsap.registerPlugin(SplitText);

/** 递归收集树中所有有 strips 的节点 */
function collectNodesWithStrips(nodes: TimelineNode[]): TimelineNode[] {
  const out: TimelineNode[] = [];
  for (const n of nodes) {
    if (n.strips.length > 0) out.push(n);
    out.push(...collectNodesWithStrips(n.children));
  }
  return out;
}

function applyStripChange(
  worksStore: WorksStore,
  elemId: string,
  type: 'entrance' | 'emphasis' | 'exit',
  animationStateId: string,
  updates: { delay?: number; duration?: number }
) {
  const layer = worksStore.getLayer(elemId);
  if (!layer?.animateQueue2) return;
  const queue = deepClone(layer.animateQueue2) as AnimateQueue2;
  const list = queue[type];
  if (!list) return;
  const item = list.find(s => s.id === animationStateId);
  if (!item) return;
  if (updates.delay !== undefined) {
    if (!item.parameters) item.parameters = {};
    item.parameters.delay = updates.delay;
  }
  if (updates.duration !== undefined) {
    if (!item.parameters) item.parameters = {};
    item.parameters.duration = updates.duration;
  }
  worksStore.setLayer(elemId, { animateQueue2: queue });
}

function applyStripChangeForRow(
  worksStore: WorksStore,
  rowId: string,
  type: 'entrance' | 'emphasis' | 'exit',
  animationStateId: string,
  updates: { delay?: number; duration?: number }
) {
  const row = worksStore.gridPropsOperator.getRowById(rowId);
  if (!row?.animateQueue2) return;
  const queue = deepClone(row.animateQueue2) as AnimateQueue2;
  const list = queue[type];
  if (!list) return;
  const item = list.find(s => s.id === animationStateId);
  if (!item) return;
  if (updates.delay !== undefined) {
    if (!item.parameters) item.parameters = {};
    item.parameters.delay = updates.delay;
  }
  if (updates.duration !== undefined) {
    if (!item.parameters) item.parameters = {};
    item.parameters.duration = updates.duration;
  }
  worksStore.gridPropsOperator.setRowAttrsByIdV2(rowId, { animateQueue2: queue });
}

const ROW_HEIGHT = 28;
const STRIP_HEIGHT = 18;
const STRIP_TOP_PAD = 4;
/** 每个子轨道的高度（条带高度 + 间距） */
const SUB_TRACK_HEIGHT = STRIP_HEIGHT + 4;
const LABEL_WIDTH = 160;
const RULER_HEIGHT = 24;
const MIN_PX_PER_MS = 0.02;
const MAX_PX_PER_MS = 0.2;
const DEFAULT_PX_PER_MS = 0.08;
const MIN_TICK_SPACING_PX = 64;
const MIN_DURATION_MS = 100;
const RESIZE_HANDLE_WIDTH = 6;

const STRIP_COLORS = {
  entrance: 'bg-primary/80',
  emphasis: 'bg-amber-500/80',
  exit: 'bg-muted-foreground/80',
} as const;

function TimelineRuler({
  totalDurationMs,
  pxPerMs,
  className,
  onRulerClick,
}: {
  totalDurationMs: number;
  pxPerMs: number;
  className?: string;
  onRulerClick?: (clientX: number) => void;
}) {
  const widthPx = totalDurationMs * pxPerMs;
  const stepMs = Math.max(500, Math.ceil(MIN_TICK_SPACING_PX / pxPerMs));
  const ticks: number[] = [];
  for (let t = 0; t <= totalDurationMs; t += stepMs) {
    ticks.push(t);
  }
  if (ticks[ticks.length - 1] !== totalDurationMs && totalDurationMs > 0) {
    ticks.push(totalDurationMs);
  }
  return (
    <div
      className={cn('flex border-b border-border bg-muted/50 text-muted-foreground', className)}
      style={{ width: LABEL_WIDTH + widthPx, minWidth: '100%' }}
    >
      <div
        className="flex-shrink-0 flex items-end px-2 text-xs"
        style={{ width: LABEL_WIDTH, height: RULER_HEIGHT }}
      >
        时间
      </div>
      <div
        className="relative flex-1 overflow-visible cursor-pointer"
        style={{ height: RULER_HEIGHT }}
        onClick={e => onRulerClick?.(e.clientX)}
      >
        {ticks.map(ms => (
          <div
            key={ms}
            className="absolute bottom-0 border-l border-border text-xs whitespace-nowrap"
            style={{ left: ms * pxPerMs, paddingLeft: 4 }}
          >
            {ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`}
          </div>
        ))}
      </div>
    </div>
  );
}

function StripBar({
  strip,
  pxPerMs,
  elemName,
  elemId,
  isRow,
  isSelected,
  onSelect,
  onStripChange,
  liveDragOffset,
  onStripDragMove,
  onStripDragEnd,
  subTrackIndex = 0,
}: {
  strip: TimelineStrip;
  pxPerMs: number;
  elemName: string;
  elemId: string;
  isRow?: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onStripChange?: (
    elemId: string,
    type: 'entrance' | 'emphasis' | 'exit',
    animationStateId: string,
    updates: { delay?: number; duration?: number }
  ) => void;
  liveDragOffset?: { deltaDelayMs: number; deltaDurationMs: number };
  /** 子轨道索引，用于多条同类型条带分层显示 */
  subTrackIndex?: number;
  onStripDragMove?: (
    targetElemId: string,
    isRow: boolean,
    type: 'entrance' | 'emphasis' | 'exit',
    animationStateId: string,
    mode: 'delay' | 'duration',
    deltaMs: number
  ) => void;
  onStripDragEnd?: () => void;
}) {
  const [dragState, setDragState] = useState<{
    mode: 'delay' | 'duration';
    startX: number;
    startStartMs: number;
    startEndMs: number;
    currentX: number;
  } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      const startX = e.clientX;
      const startStartMs = strip.start;
      const startEndMs = strip.end;
      setDragState({ mode: 'delay', startX, startStartMs, startEndMs, currentX: startX });
    },
    [strip.start, strip.end]
  );

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      const startX = e.clientX;
      const startStartMs = strip.start;
      const startEndMs = strip.end;
      setDragState({ mode: 'duration', startX, startStartMs, startEndMs, currentX: startX });
    },
    [strip.start, strip.end]
  );

  useEffect(() => {
    if (!dragState) return;
    const onMove = (e: MouseEvent) => {
      const deltaMs = (e.clientX - dragState.startX) / pxPerMs;
      onStripDragMove?.(elemId, isRow ?? false, strip.type, strip.animationState.id, dragState.mode, deltaMs);
      setDragState(prev => (prev ? { ...prev, currentX: e.clientX } : null));
    };
    const onUp = () => {
      if (!dragState || !onStripChange) {
        onStripDragEnd?.();
        setDragState(null);
        return;
      }
      const deltaMs = (dragState.currentX - dragState.startX) / pxPerMs;
      if (dragState.mode === 'delay') {
        const newStart = Math.max(0, dragState.startStartMs + deltaMs);
        const duration = dragState.startEndMs - dragState.startStartMs;
        const baseOffset = dragState.startStartMs - getDelayMs(strip.animationState);
        const newDelay = Math.max(0, newStart - baseOffset);
        onStripChange(elemId, strip.type, strip.animationState.id, {
          delay: newDelay,
          duration,
        });
      } else {
        const newDuration = Math.max(
          MIN_DURATION_MS,
          dragState.startEndMs - dragState.startStartMs + deltaMs
        );
        const baseOffset = dragState.startStartMs - getDelayMs(strip.animationState);
        onStripChange(elemId, strip.type, strip.animationState.id, {
          delay: Math.max(0, dragState.startStartMs - baseOffset),
          duration: newDuration,
        });
      }
      onStripDragEnd?.();
      setDragState(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragState, elemId, isRow, strip.type, strip.animationState, strip.animationState.id, pxPerMs, onStripChange, onStripDragMove, onStripDragEnd]);

  const typeLabel = strip.type === 'entrance' ? '入场' : strip.type === 'emphasis' ? '强调' : '退场';
  const delay = getDelayMs(strip.animationState);
  const duration = strip.end - strip.start;
  const isInfiniteLoop =
    strip.type === 'emphasis' && strip.animationState.parameters?.loop === true;
  const title = `${elemName} · ${typeLabel}\n延迟 ${delay}ms，时长 ${duration}ms${isInfiniteLoop ? '\n无限循环' : ''}`;

  let leftPx: number;
  let widthPx: number;
  if (dragState) {
    const deltaMs = (dragState.currentX - dragState.startX) / pxPerMs;
    if (dragState.mode === 'delay') {
      const newStart = Math.max(0, dragState.startStartMs + deltaMs);
      leftPx = newStart * pxPerMs;
      widthPx = Math.max((dragState.startEndMs - dragState.startStartMs) * pxPerMs, 4);
    } else {
      leftPx = dragState.startStartMs * pxPerMs;
      const newDurationMs = Math.max(
        MIN_DURATION_MS,
        dragState.startEndMs - dragState.startStartMs + deltaMs
      );
      widthPx = Math.max(newDurationMs * pxPerMs, 4);
    }
  } else if (liveDragOffset && (liveDragOffset.deltaDelayMs !== 0 || liveDragOffset.deltaDurationMs !== 0)) {
    const startMs = strip.start + liveDragOffset.deltaDelayMs;
    const durationMs = Math.max(MIN_DURATION_MS, (strip.end - strip.start) + liveDragOffset.deltaDurationMs);
    leftPx = Math.max(0, startMs) * pxPerMs;
    widthPx = Math.max(durationMs * pxPerMs, 4);
  } else {
    leftPx = strip.start * pxPerMs;
    widthPx = Math.max((strip.end - strip.start) * pxPerMs, 4);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'absolute rounded cursor-pointer border select-none',
        STRIP_COLORS[strip.type],
        isSelected && 'ring-2 ring-primary',
        dragState && 'cursor-grabbing',
        isInfiniteLoop ? 'border-dashed border-foreground/40' : 'border-transparent hover:border-foreground/30'
      )}
      style={{
        left: leftPx,
        width: widthPx,
        minWidth: 4,
        top: STRIP_TOP_PAD + subTrackIndex * SUB_TRACK_HEIGHT,
        height: STRIP_HEIGHT,
      }}
      title={title}
      onClick={() => {
        if (!dragState) onSelect?.();
      }}
      onMouseDown={handleMouseDown}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') onSelect?.();
      }}
    >
      {isInfiniteLoop && widthPx > 24 && !dragState && (
        <span className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center text-[10px] text-foreground/90">
          <Infinity className="h-3 w-3" />
        </span>
      )}
      {widthPx > RESIZE_HANDLE_WIDTH * 2 && !dragState && (
        <div
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize rounded-r bg-black/20"
          onMouseDown={handleResizeMouseDown}
        />
      )}
    </div>
  );
}

const GROUP_COLORS = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6'];

function depthEquals(a: number[] | undefined, b: number[] | undefined): boolean {
  if (a == null || b == null) return a === b;
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

function TimelineTrack({
  label,
  elemId,
  strips,
  pxPerMs,
  totalDurationMs,
  isTrackSelected,
  selectedStripKey,
  onSelectStrip,
  onStripSelect,
  onTrackLabelClick,
  onStripChange,
  trackRef,
  groupColor,
  isRow,
  paddingLeftPx,
  labelLeftSlot,
  onOpenSettings,
  multiSelectedElemIds,
  liveDrag,
  onStripDragMove,
  onStripDragEnd,
}: {
  label: string;
  elemId: string;
  strips: TimelineStrip[];
  pxPerMs: number;
  totalDurationMs: number;
  isTrackSelected: boolean;
  selectedStripKey: string | null;
  onSelectStrip: (key: string) => void;
  onStripSelect?: (elemId: string) => void;
  onTrackLabelClick?: (e: React.MouseEvent, elemId: string) => void;
  onStripChange?: (
    targetId: string,
    isRow: boolean,
    type: 'entrance' | 'emphasis' | 'exit',
    animationStateId: string,
    updates: { delay?: number; duration?: number }
  ) => void;
  trackRef?: React.RefObject<HTMLDivElement | null>;
  groupColor?: string;
  isRow?: boolean;
  paddingLeftPx?: number;
  labelLeftSlot?: React.ReactNode;
  onOpenSettings?: (elemId: string, label: string, isRow: boolean) => void;
  multiSelectedElemIds?: string[];
  liveDrag?: {
    targetElemId: string;
    isRow: boolean;
    type: 'entrance' | 'emphasis' | 'exit';
    animationStateId: string;
    mode: 'delay' | 'duration';
    deltaMs: number;
  } | null;
  onStripDragMove?: (
    targetElemId: string,
    isRow: boolean,
    type: 'entrance' | 'emphasis' | 'exit',
    animationStateId: string,
    mode: 'delay' | 'duration',
    deltaMs: number
  ) => void;
  onStripDragEnd?: () => void;
}) {
  const widthPx = totalDurationMs * pxPerMs;
  const isRowSelected = isTrackSelected;

  // 计算同类型条带的子轨道索引，使重叠条带分层显示
  const typeCounters: Record<string, number> = {};
  const subTrackIndices = strips.map(strip => {
    const idx = typeCounters[strip.type] ?? 0;
    typeCounters[strip.type] = idx + 1;
    return idx;
  });
  const maxSubTracks = Math.max(1, ...Object.values(typeCounters));
  const dynamicRowHeight = ROW_HEIGHT + (maxSubTracks - 1) * SUB_TRACK_HEIGHT;

  return (
    <div
      ref={trackRef}
      className={cn(
        'flex border-b border-border/50 hover:bg-muted/30 border-l-2 border-l-transparent group/track',
        isRowSelected && 'bg-primary/10 border-l-2 border-l-primary'
      )}
      style={{
        height: dynamicRowHeight,
        minWidth: LABEL_WIDTH + widthPx,
        borderLeftColor: groupColor ?? undefined,
      }}
    >
      <div
        role="button"
        tabIndex={0}
        className={cn(
          'flex-shrink-0 flex items-center px-2 text-xs truncate border-r border-border/50 text-left w-full hover:bg-muted/50 cursor-pointer',
          isRowSelected && 'bg-primary/10 font-medium hover:bg-primary/20'
        )}
        style={{
          width: LABEL_WIDTH,
          height: dynamicRowHeight,
          paddingLeft: paddingLeftPx ?? 8,
        }}
        title={`${label}\n顺序：进场 → 强调 → 退场`}
        onClick={e => {
          if (onTrackLabelClick) onTrackLabelClick(e, elemId);
          else onStripSelect?.(elemId);
        }}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (onTrackLabelClick) onTrackLabelClick(e as unknown as React.MouseEvent, elemId);
            else onStripSelect?.(elemId);
          }
        }}
      >
        {labelLeftSlot}
        <span className="flex-1 min-w-0 truncate">{label}</span>
        {onOpenSettings && (
          <button
            className="ml-1 p-0.5 rounded hover:bg-accent opacity-0 group-hover/track:opacity-100 transition-opacity shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onOpenSettings(elemId, label, isRow ?? false);
            }}
            title="设置动画"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="relative flex-1" style={{ width: widthPx }}>
        {strips.map((strip, i) => {
          const stripKey = `${strip.type}-${strip.animationState.id}-${i}`;
          const isInMultiSelect = multiSelectedElemIds?.includes(elemId) ?? false;
          const isDragTarget =
            liveDrag &&
            liveDrag.targetElemId === elemId &&
            liveDrag.type === strip.type &&
            liveDrag.animationStateId === strip.animationState.id;
          const liveDragOffset =
            liveDrag && isInMultiSelect && !isDragTarget && liveDrag.type === strip.type
              ? {
                deltaDelayMs: liveDrag.mode === 'delay' ? liveDrag.deltaMs : 0,
                deltaDurationMs: liveDrag.mode === 'duration' ? liveDrag.deltaMs : 0,
              }
              : undefined;
          return (
            <StripBar
              key={stripKey}
              strip={strip}
              pxPerMs={pxPerMs}
              elemName={label}
              elemId={elemId}
              isRow={isRow ?? false}
              isSelected={
                isRowSelected && selectedStripKey === stripKey
              }
              onSelect={() => {
                onSelectStrip(stripKey);
                onStripSelect?.(elemId);
              }}
              onStripChange={
                onStripChange
                  ? (_, type, animationStateId, updates) =>
                    onStripChange(elemId, isRow ?? false, type, animationStateId, updates)
                  : undefined
              }
              liveDragOffset={liveDragOffset}
              subTrackIndex={subTrackIndices[i]}
              onStripDragMove={onStripDragMove}
              onStripDragEnd={onStripDragEnd}
            />
          );
        })}
      </div>
    </div>
  );
}

function TimelineTreeNode({
  node,
  level,
  expandedIds,
  onToggleExpand,
  editingElemId,
  activeRowDepth,
  multiSelectedElemIds,
  selectedStripKey,
  onSelectStrip,
  onNodeSelect,
  onTrackLabelClick,
  onStripChange,
  selectedTrackRef,
  groupColorForNode,
  pxPerMs,
  totalDurationMs,
  onOpenSettings,
  liveDrag,
  onStripDragMove,
  onStripDragEnd,
}: {
  node: TimelineNode;
  level: number;
  expandedIds: Set<string>;
  onToggleExpand: (rowId: string) => void;
  editingElemId: string | undefined;
  activeRowDepth: number[] | undefined;
  multiSelectedElemIds: string[];
  selectedStripKey: string | null;
  onSelectStrip: (key: string) => void;
  onNodeSelect: (node: TimelineNode) => void;
  onTrackLabelClick: (e: React.MouseEvent, nodeId: string) => void;
  onStripChange: (
    targetId: string,
    isRow: boolean,
    type: 'entrance' | 'emphasis' | 'exit',
    animationStateId: string,
    updates: { delay?: number; duration?: number }
  ) => void;
  selectedTrackRef: React.RefObject<HTMLDivElement | null>;
  groupColorForNode: string | undefined;
  pxPerMs: number;
  totalDurationMs: number;
  onOpenSettings?: (elemId: string, label: string, isRow: boolean) => void;
  liveDrag?: {
    targetElemId: string;
    isRow: boolean;
    type: 'entrance' | 'emphasis' | 'exit';
    animationStateId: string;
    mode: 'delay' | 'duration';
    deltaMs: number;
  } | null;
  onStripDragMove?: (
    targetElemId: string,
    isRow: boolean,
    type: 'entrance' | 'emphasis' | 'exit',
    animationStateId: string,
    mode: 'delay' | 'duration',
    deltaMs: number
  ) => void;
  onStripDragEnd?: () => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = node.type === 'row' && expandedIds.has(node.id);
  const paddingLeftPx = level * 16 + 8;
  const isPrimarySelected =
    (node.type === 'row' && editingElemId == null && depthEquals(activeRowDepth, node.depth)) ||
    (node.type === 'element' && editingElemId === node.id);
  const isTrackSelected =
    isPrimarySelected ||
    (node.type === 'element' && multiSelectedElemIds.includes(node.id));

  const labelLeftSlot =
    node.type === 'row' && hasChildren ? (
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className="flex-shrink-0 h-6 w-6 mr-0.5"
        onClick={e => {
          e.stopPropagation();
          onToggleExpand(node.id);
        }}
        aria-label={isExpanded ? '折叠' : '展开'}
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        )}
      </Button>
    ) : undefined;

  return (
    <>
      <TimelineTrack
        label={node.displayName}
        elemId={node.id}
        strips={node.strips}
        pxPerMs={pxPerMs}
        totalDurationMs={totalDurationMs}
        isTrackSelected={isTrackSelected}
        selectedStripKey={selectedStripKey}
        onSelectStrip={onSelectStrip}
        onStripSelect={() => onNodeSelect(node)}
        onTrackLabelClick={e => onTrackLabelClick(e, node.id)}
        onStripChange={onStripChange}
        trackRef={isPrimarySelected ? selectedTrackRef : undefined}
        groupColor={groupColorForNode}
        isRow={node.type === 'row'}
        paddingLeftPx={paddingLeftPx}
        labelLeftSlot={labelLeftSlot}
        onOpenSettings={onOpenSettings}
        multiSelectedElemIds={multiSelectedElemIds}
        liveDrag={liveDrag}
        onStripDragMove={onStripDragMove}
        onStripDragEnd={onStripDragEnd}
      />
      {node.type === 'row' && hasChildren && isExpanded &&
        node.children.map(child => (
          <TimelineTreeNode
            key={child.id}
            node={child}
            level={level + 1}
            expandedIds={expandedIds}
            onToggleExpand={onToggleExpand}
            editingElemId={editingElemId}
            activeRowDepth={activeRowDepth}
            multiSelectedElemIds={multiSelectedElemIds}
            selectedStripKey={selectedStripKey}
            onSelectStrip={onSelectStrip}
            onNodeSelect={onNodeSelect}
            onTrackLabelClick={onTrackLabelClick}
            onStripChange={onStripChange}
            selectedTrackRef={selectedTrackRef}
            groupColorForNode={groupColorForNode}
            pxPerMs={pxPerMs}
            totalDurationMs={totalDurationMs}
            onOpenSettings={onOpenSettings}
            liveDrag={liveDrag}
            onStripDragMove={onStripDragMove}
            onStripDragEnd={onStripDragEnd}
          />
        ))}
    </>
  );
}

/** 虚拟分组头部轨道 */
function TimelineVirtualGroupHeader({
  groupName,
  childCount,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
  onUngroup,
  pxPerMs,
  totalDurationMs,
  groupColor,
}: {
  groupId: string;
  groupName: string;
  childCount: number;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onUngroup: () => void;
  pxPerMs: number;
  totalDurationMs: number;
  groupColor?: string;
}) {
  const widthPx = totalDurationMs * pxPerMs;
  return (
    <div
      className={cn(
        'flex border-b border-border/50 hover:bg-muted/30 border-l-2 group/track bg-muted/20',
        isSelected && 'bg-primary/10 border-l-primary'
      )}
      style={{
        height: ROW_HEIGHT,
        minWidth: LABEL_WIDTH + widthPx,
        borderLeftColor: groupColor ?? 'transparent',
      }}
    >
      <div
        role="button"
        tabIndex={0}
        className={cn(
          'flex-shrink-0 flex items-center px-2 text-xs truncate border-r border-border/50 text-left w-full hover:bg-muted/50 cursor-pointer font-medium',
          isSelected && 'bg-primary/10'
        )}
        style={{ width: LABEL_WIDTH, height: ROW_HEIGHT, paddingLeft: 8 }}
        onClick={onSelect}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect();
          }
        }}
      >
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="flex-shrink-0 h-6 w-6 mr-0.5"
          onClick={e => {
            e.stopPropagation();
            onToggle();
          }}
          aria-label={isExpanded ? '折叠' : '展开'}
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
        </Button>
        <FolderOpen className="h-3.5 w-3.5 flex-shrink-0 mr-1 text-muted-foreground" />
        <span className="flex-1 min-w-0 truncate">{groupName}</span>
        <span className="text-muted-foreground ml-1 text-[10px]">{childCount}</span>
        <button
          className="ml-1 p-0.5 rounded hover:bg-accent opacity-0 group-hover/track:opacity-100 transition-opacity shrink-0"
          onClick={e => {
            e.stopPropagation();
            onUngroup();
          }}
          title="解散分组"
        >
          <Ungroup className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="relative flex-1" style={{ width: widthPx }} />
    </div>
  );
}

/** 可拖拽的轨道包裹层（用于 @dnd-kit） */
function SortableItem({
  id,
  children,
  disabled,
}: {
  id: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="flex items-stretch">
        {!disabled && (
          <div
            className="flex items-center justify-center w-4 flex-shrink-0 cursor-grab active:cursor-grabbing hover:bg-muted/50"
            {...listeners}
          >
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground text-sm px-4">
      <p className="font-medium">暂无动画</p>
      <p className="mt-1">在右侧为元素添加动画后，将在此统一展示与调整。</p>
    </div>
  );
}

function AnimationTimelinePanelInner() {
  const worksStore = useWorksStore();
  const { setWidgetStateV2, worksData, widgetStateV2 } = worksStore;
  const collapsed = !(widgetStateV2?.showAnimationTimeline ?? false);
  const { editingElemId, activeRowDepth, multiSelectedElemIds = [] } =
    widgetStateV2;
  const selectedRowByDepth =
    activeRowDepth != null && activeRowDepth.length > 0 && worksStore
      ? worksStore.gridPropsOperator.getRowByDepth(activeRowDepth)
      : null;

  const [pxPerMs, setPxPerMs] = useState(DEFAULT_PX_PER_MS);
  const [selectedStripKey, setSelectedStripKey] = useState<string | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const currentTimeRef = useRef(0);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const selectedTrackRef = useRef<HTMLDivElement | null>(null);
  const timelineContainerRef = useRef<HTMLDivElement | null>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  /** 仅显示元素时间轴（隐藏 grid 组合轨道） */
  const [elementOnlyView, setElementOnlyView] = useState(true);
  /** 应用到全部页面后递增，用于重置预览区 FlipWrapper 状态 */
  const [flipPreviewKey, setFlipPreviewKey] = useState(0);
  /** 多选拖动时，当前拖动的 delta（用于其他选中轨道条带同步展示） */
  const [liveDrag, setLiveDrag] = useState<{
    targetElemId: string;
    isRow: boolean;
    type: 'entrance' | 'emphasis' | 'exit';
    animationStateId: string;
    mode: 'delay' | 'duration';
    deltaMs: number;
  } | null>(null);

  /** 虚拟分组中展开的 groupId */
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());

  // 翻页动画 Drawer 状态管理
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerConfig, setDrawerConfig] = useState<{
    type: 'pageFlip';
    id: string;
    name: string;
  } | null>(null);

  // DnD sensors（仅元素模式使用）
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const toggleExpand = useCallback((rowId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }, []);

  const toggleGroupExpand = useCallback((groupId: string) => {
    setExpandedGroupIds(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  /** 每个有动画的元素的 timeline（GSAP 版本） */
  const timelinesRef = useRef<Map<string, { timeline: gsap.core.Timeline; split: SplitText | null }>>(new Map());

  const timelineData: AnimationTimelineData | null = worksData
    ? getAnimationTimelineData(worksData)
    : null;

  /** 只渲染当前激活页：activeRowDepth[0] 为页索引 */
  const activePageIndex = activeRowDepth?.[0] ?? 0;
  const activePage =
    timelineData?.pages[activePageIndex] ?? timelineData?.pages[0] ?? null;

  const isFlipPage =
    worksStore?.worksDetail?.specInfo?.is_flip_page === true ||
    worksData?.gridProps?.firstPageCover === true;
  /** 当前选中的是页根（翻页模式下选中「翻页设置」） */
  const isPageRowSelected =
    isFlipPage &&
    activeRowDepth?.length === 1 &&
    activeRowDepth[0] === activePageIndex &&
    !editingElemId;

  // 当前页的分组默认全部展开（切页或节点变化时重置为全部展开）
  useEffect(() => {
    if (activePage?.nodes?.length) {
      setExpandedIds(collectRowIdsWithChildren(activePage.nodes));
    }
    // 仅依赖页索引与节点数量，避免 nodes 引用每次变化都触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage?.pageIndex, activePage?.nodes?.length]);

  const displayNodes = useMemo(
    () =>
      activePage
        ? elementOnlyView
          ? flattenElementNodesOnly(activePage.nodes ?? [])
          : activePage.nodes ?? []
        : [],
    [activePage, elementOnlyView]
  );

  // 元素模式下：根据 order + groups 构建带虚拟分组的有序列表
  const animationGroups = useMemo(
    () => worksStore?.getAnimationGroups() ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [worksStore?.getAnimationGroups()]
  );
  const timelineOrder = useMemo(
    () => worksStore?.getAnimationTimelineOrder() ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [worksStore?.getAnimationTimelineOrder()]
  );
  const displayItems: DisplayItem[] = useMemo(() => {
    if (!elementOnlyView || displayNodes.length === 0) return [];
    return buildOrderedDisplayItems(displayNodes, timelineOrder, animationGroups);
  }, [elementOnlyView, displayNodes, timelineOrder, animationGroups]);

  // DnD 排序 ID 列表
  const sortableIds = useMemo(
    () => (elementOnlyView ? buildSortableIds(displayItems, expandedGroupIds) : []),
    [elementOnlyView, displayItems, expandedGroupIds]
  );

  const hasAnyStrips = activePage != null && displayNodes.length > 0;

  const handleStripChange = useCallback(
    (
      targetId: string,
      isRow: boolean,
      type: 'entrance' | 'emphasis' | 'exit',
      animationStateId: string,
      updates: { delay?: number; duration?: number }
    ) => {
      if (!worksStore) return;
      if (isRow) {
        applyStripChangeForRow(worksStore, targetId, type, animationStateId, updates);
        return;
      }
      const layer = worksStore.getLayer(targetId);
      const list = layer?.animateQueue2?.[type];
      const indexInType = list?.findIndex(s => s.id === animationStateId) ?? -1;
      const currentItem = list?.[indexInType];
      const currentDelay = currentItem?.parameters?.delay ?? 0;
      const currentDuration = currentItem?.parameters?.duration ?? 500;

      applyStripChange(worksStore, targetId, type, animationStateId, updates);

      // 多选时：拖动轨道时用相同 delta 同步修改所有选中轨道的延时（和时长）
      if (multiSelectedElemIds.length > 1 && indexInType >= 0 && multiSelectedElemIds.includes(targetId)) {
        const deltaDelay = updates.delay !== undefined ? updates.delay - currentDelay : undefined;
        const deltaDuration = updates.duration !== undefined ? updates.duration - currentDuration : undefined;
        if (deltaDelay === undefined && deltaDuration === undefined) return;
        for (const otherId of multiSelectedElemIds) {
          if (otherId === targetId) continue;
          const otherLayer = worksStore.getLayer(otherId);
          const otherList = otherLayer?.animateQueue2?.[type];
          const otherItem = otherList?.[indexInType];
          if (!otherItem) continue;
          const otherUpdates: { delay?: number; duration?: number } = {};
          if (deltaDelay !== undefined) {
            const raw = (otherItem.parameters?.delay ?? 0) + deltaDelay;
            otherUpdates.delay = Math.max(0, raw);
          }
          if (deltaDuration !== undefined) {
            const raw = (otherItem.parameters?.duration ?? 500) + deltaDuration;
            otherUpdates.duration = Math.max(MIN_DURATION_MS, raw);
          }
          if (Object.keys(otherUpdates).length > 0)
            applyStripChange(worksStore, otherId, type, otherItem.id, otherUpdates);
        }
      }
    },
    [worksStore, multiSelectedElemIds]
  );

  const handleStripDragMove = useCallback(
    (
      targetElemId: string,
      isRow: boolean,
      type: 'entrance' | 'emphasis' | 'exit',
      animationStateId: string,
      mode: 'delay' | 'duration',
      deltaMs: number
    ) => {
      if (isRow || multiSelectedElemIds.length <= 1 || !multiSelectedElemIds.includes(targetElemId)) {
        setLiveDrag(null);
        return;
      }
      setLiveDrag({ targetElemId, isRow, type, animationStateId, mode, deltaMs });
    },
    [multiSelectedElemIds]
  );

  const handleStripDragEnd = useCallback(() => {
    setLiveDrag(null);
  }, []);

  /** 打组：将多选的元素创建为虚拟分组 */
  const handleCreateGroup = useCallback(() => {
    if (!worksStore || multiSelectedElemIds.length < 2) return;
    const groupId = nanoid(8);
    const existingGroups = worksStore.getAnimationGroups();
    const groupName = `组 ${existingGroups.length + 1}`;

    // 先从已有分组中移除这些元素
    for (const eid of multiSelectedElemIds) {
      const oldGid = worksStore.getAnimationGroupIdByElemId(eid);
      if (oldGid) worksStore.removeElemFromAnimationGroup(oldGid, eid);
    }

    // 创建新分组
    const newGroup: AnimationGroup = { id: groupId, name: groupName, elemIds: [...multiSelectedElemIds] };
    worksStore.addAnimationGroup(newGroup);

    // 更新 timeline order：将选中元素替换为 group:id
    const currentOrder = worksStore.getAnimationTimelineOrder();
    const selectedSet = new Set(multiSelectedElemIds);
    if (currentOrder.length > 0) {
      const newOrder: string[] = [];
      let groupInserted = false;
      for (const entry of currentOrder) {
        if (selectedSet.has(entry)) {
          if (!groupInserted) {
            newOrder.push(`group:${groupId}`);
            groupInserted = true;
          }
          // 跳过被分组的独立元素
        } else {
          newOrder.push(entry);
        }
      }
      if (!groupInserted) newOrder.push(`group:${groupId}`);
      worksStore.setAnimationTimelineOrder(newOrder);
    } else {
      // 当前没有自定义顺序，从 displayItems 中构建
      const newOrder = displayItemsToOrder(displayItems);
      // 将选中元素替换为 group
      const finalOrder: string[] = [];
      let inserted = false;
      for (const entry of newOrder) {
        if (selectedSet.has(entry)) {
          if (!inserted) {
            finalOrder.push(`group:${groupId}`);
            inserted = true;
          }
        } else {
          finalOrder.push(entry);
        }
      }
      if (!inserted) finalOrder.push(`group:${groupId}`);
      worksStore.setAnimationTimelineOrder(finalOrder);
    }

    // 展开新组
    setExpandedGroupIds(prev => {
      const next = new Set(prev);
      next.add(groupId);
      return next;
    });

    // 清除多选
    setWidgetStateV2?.({ multiSelectedElemIds: [] });
    toast.success(`已创建分组「${groupName}」`);
  }, [worksStore, multiSelectedElemIds, displayItems, setWidgetStateV2]);

  /** 解组：删除虚拟分组，将组内元素恢复为独立元素 */
  const handleUngroup = useCallback(
    (groupId: string) => {
      if (!worksStore) return;
      const groups = worksStore.getAnimationGroups();
      const group = groups.find(g => g.id === groupId);
      if (!group) return;

      // 更新 order：将 group:xxx 替换为组内元素列表
      const currentOrder = worksStore.getAnimationTimelineOrder();
      const groupEntry = `group:${groupId}`;
      if (currentOrder.length > 0) {
        const newOrder: string[] = [];
        for (const entry of currentOrder) {
          if (entry === groupEntry) {
            newOrder.push(...group.elemIds);
          } else {
            newOrder.push(entry);
          }
        }
        worksStore.setAnimationTimelineOrder(newOrder);
      }

      // 删除分组
      worksStore.removeAnimationGroup(groupId);

      // 从展开列表中移除
      setExpandedGroupIds(prev => {
        const next = new Set(prev);
        next.delete(groupId);
        return next;
      });

      toast.success('已解散分组');
    },
    [worksStore]
  );

  /** DnD 拖拽结束处理 */
  const handleDndDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !worksStore) return;

      const activeId = String(active.id);
      const overId = String(over.id);

      // 检查是否为组内元素拖拽
      const activeIsInGroup = activeId.startsWith('ingroup:');
      const overIsInGroup = overId.startsWith('ingroup:');

      if (activeIsInGroup && overIsInGroup) {
        // 组内重排：更新 AnimationGroup.elemIds 顺序
        const [, activeGroupId, activeElemId] = activeId.split(':');
        const [, overGroupId, overElemId] = overId.split(':');
        if (activeGroupId !== overGroupId) return; // 不支持跨组拖拽
        const groups = worksStore.getAnimationGroups();
        const group = groups.find(g => g.id === activeGroupId);
        if (!group) return;
        const oldIndex = group.elemIds.indexOf(activeElemId);
        const newIndex = group.elemIds.indexOf(overElemId);
        if (oldIndex < 0 || newIndex < 0) return;
        const newElemIds = arrayMove(group.elemIds, oldIndex, newIndex);
        worksStore.updateAnimationGroup(activeGroupId, { elemIds: newElemIds });
        return;
      }

      // 顶层重排：更新 animationTimelineOrder
      const oldIndex = sortableIds.indexOf(activeId);
      const newIndex = sortableIds.indexOf(overId);
      if (oldIndex < 0 || newIndex < 0) return;

      // 从 sortableIds 视角重排后映射回 order
      const newSortableIds = arrayMove(sortableIds, oldIndex, newIndex);
      // 过滤掉 ingroup: 项（它们不在 order 中），保留顶层项
      const newOrder = newSortableIds.filter(id => !id.startsWith('ingroup:'));
      worksStore.setAnimationTimelineOrder(newOrder);
    },
    [worksStore, sortableIds]
  );

  const handleNodeSelect = useCallback(
    (node: TimelineNode) => {
      if (!setWidgetStateV2 || !worksData) return;
      if (node.type === 'row') {
        setWidgetStateV2({
          editingElemId: undefined,
          activeRowDepth: node.depth,
        });
      } else {
        setWidgetStateV2({
          editingElemId: node.id,
          activeRowDepth: node.depth,
        });
      }
    },
    [setWidgetStateV2, worksData]
  );

  /** 轨道标签点击：选中该轨道（组或元素）；Shift+点击元素轨道为时间轴内多选 */
  const handleTrackLabelClick = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      if (!activePage) return;
      const node = findNodeInTree(activePage.nodes, nodeId);
      if (!node) return;
      const shiftKey = e.nativeEvent?.shiftKey ?? false;
      if (shiftKey && node.type === 'element') {
        const prev = widgetStateV2.multiSelectedElemIds ?? [];
        // 当已有激活元素 A 但多选列表为空时，把 A 视为已选，这样 Shift+点 B/C/D 会得到 [A,B] / [A,B,C] 等
        const baseIds =
          prev.length > 0
            ? prev
            : editingElemId && findNodeInTree(activePage.nodes, editingElemId)?.type === 'element'
              ? [editingElemId]
              : [];
        const nextIds = baseIds.includes(node.id)
          ? baseIds.filter(id => id !== node.id)
          : [...baseIds, node.id];
        setWidgetStateV2({
          multiSelectedElemIds: nextIds,
          editingElemId: node.id,
          activeRowDepth: node.depth,
          hideOperator: false,
        });
      } else {
        setWidgetStateV2({ multiSelectedElemIds: [] });
        handleNodeSelect(node);
      }
    },
    [activePage, editingElemId, handleNodeSelect, setWidgetStateV2, widgetStateV2.multiSelectedElemIds]
  );

  // 依赖 worksData 而非 timelineData；仅当编辑目标在当前激活页时同步选中条
  useEffect(() => {
    const rowAtDepth =
      activeRowDepth != null && activeRowDepth.length > 0 && worksStore
        ? worksStore.gridPropsOperator.getRowByDepth(activeRowDepth)
        : null;
    const editingId = editingElemId ?? rowAtDepth?.id;
    if (!editingId || !activePage) return;
    const node = findNodeInTree(activePage.nodes, editingId);
    if (node?.strips.length) {
      const firstStrip = node.strips[0];
      const key = `${firstStrip.type}-${firstStrip.animationState.id}-0`;
      queueMicrotask(() => {
        setSelectedStripKey(key);
        selectedTrackRef.current?.scrollIntoView?.({ block: 'nearest' });
      });
    }
  }, [editingElemId, activeRowDepth, activePage, worksStore]);

  /** 当前激活页的时间轴总时长（树节点 strips） */
  const totalDurationMs =
    activePage?.nodes?.length
      ? Math.max(1000, maxEndFromNodes(activePage.nodes))
      : 1000;

  // 播放时用 GSAP timeline，与 useAnimate2 共用同一套编排逻辑
  useEffect(() => {
    if (!isPlaying) return;

    lastTimeRef.current = performance.now();
    const tick = (now: number) => {
      let delta = now - lastTimeRef.current;
      if (delta < 0) {
        lastTimeRef.current = now;
        delta = 0;
      } else {
        lastTimeRef.current = now;
      }

      // 计算新的播放时间（毫秒）
      const nextMs = Math.max(0, Math.min(currentTimeRef.current + delta, totalDurationMs));
      currentTimeRef.current = nextMs;
      setCurrentTimeMs(nextMs);

      // 更新所有 timeline 的播放进度（GSAP 使用秒）
      const nextSeconds = msToSeconds(nextMs);
      for (const { timeline } of timelinesRef.current.values()) {
        // GSAP: 使用 time() 方法设置播放进度
        const clampedTime = Math.max(0, Math.min(nextSeconds, timeline.duration()));
        timeline.time(clampedTime);
      }

      // 派发全局事件
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('timeline-playback-tick', {
            detail: { currentTimeMs: nextMs, isPlaying: nextMs < totalDurationMs },
          })
        );
      }

      // 检查是否播放完成
      if (nextMs >= totalDurationMs) {
        setIsPlaying(false);
        if (playRef.current != null) {
          cancelAnimationFrame(playRef.current);
          playRef.current = null;
        }
        return;
      }

      playRef.current = requestAnimationFrame(tick);
    };

    playRef.current = requestAnimationFrame(tick);

    return () => {
      if (playRef.current != null) {
        cancelAnimationFrame(playRef.current);
        playRef.current = null;
      }
    };
  }, [isPlaying, totalDurationMs]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      // 暂停播放，停在当前位置
      for (const { timeline } of timelinesRef.current.values()) {
        timeline.pause();
      }
      setIsPlaying(false);
    } else {
      // 开始播放
      if (!activePage || !worksStore) return;

      // 清理之前的 timelines
      for (const { timeline, split } of timelinesRef.current.values()) {
        timeline.kill(); // GSAP: 彻底停止并清理
        if (split) {
          split.revert();
        }
      }
      timelinesRef.current.clear();

      // 构建新的 timelines
      const nodesWithStrips = collectNodesWithStrips(activePage.nodes ?? []);
      for (const node of nodesWithStrips) {
        if (node.strips.length === 0) continue;

        const targetId = node.id;
        let animateQueue2: AnimateQueue2 | undefined;

        if (node.type === 'row') {
          const row = worksStore.gridPropsOperator.getRowById(targetId);
          animateQueue2 = row?.animateQueue2 as AnimateQueue2 | undefined;
        } else {
          const layer = worksStore.getLayer(targetId);
          animateQueue2 = layer?.animateQueue2 as AnimateQueue2 | undefined;
        }

        const element =
          node.type === 'row'
            ? resolveRowTarget(targetId)
            : resolveEmphasisTarget(targetId) ?? resolveTarget(targetId);

        if (element && animateQueue2) {
          const { timeline, split } = buildTimelineFromAnimateQueue(
            element,
            animateQueue2
          );
          timelinesRef.current.set(targetId, { timeline, split });
        }
      }

      // 从当前播放头位置开始播放（用户可能已拖动播放头到某个位置）
      const startMs = currentTimeRef.current;
      const startSeconds = msToSeconds(startMs);
      for (const { timeline } of timelinesRef.current.values()) {
        timeline.pause();
        timeline.time(Math.max(0, Math.min(startSeconds, timeline.duration())));
      }
      setIsPlaying(true);
    }
  }, [isPlaying, activePage, worksStore]);

  /** 重置：停止播放、清理 GSAP timelines、恢复元素状态、播放头归零 */
  const handleReset = useCallback(() => {
    if (isPlaying) setIsPlaying(false);
    for (const { timeline, split } of timelinesRef.current.values()) {
      const children = timeline.getChildren(true, true, false);
      const targets: unknown[] = [];
      for (const child of children) {
        if (child && typeof (child as gsap.core.Tween).targets === 'function') {
          targets.push(...(child as gsap.core.Tween).targets());
        }
      }
      timeline.pause();
      timeline.time(0);
      timeline.kill();
      if (targets.length) {
        gsap.set(targets as gsap.TweenTarget, { clearProps: ANIMATION_CLEAR_PROPS });
      }
      if (split) {
        split.revert();
      }
    }
    timelinesRef.current.clear();
    currentTimeRef.current = 0;
    setCurrentTimeMs(0);
  }, [isPlaying]);

  /** 确保 timelines 存在并 seek 到指定时间（用于拖动播放头）；若 timelines 为空会先构建 */
  const seekTo = useCallback(
    (timeMs: number) => {
      const clamped = Math.max(0, Math.min(timeMs, totalDurationMs));
      if (!activePage || !worksStore) return;
      if (timelinesRef.current.size === 0) {
        const nodesWithStrips = collectNodesWithStrips(activePage.nodes ?? []);
        for (const node of nodesWithStrips) {
          if (node.strips.length === 0) continue;
          const targetId = node.id;
          let animateQueue2: AnimateQueue2 | undefined;
          if (node.type === 'row') {
            const row = worksStore.gridPropsOperator.getRowById(targetId);
            animateQueue2 = row?.animateQueue2 as AnimateQueue2 | undefined;
          } else {
            const layer = worksStore.getLayer(targetId);
            animateQueue2 = layer?.animateQueue2 as AnimateQueue2 | undefined;
          }
          const element =
            node.type === 'row'
              ? resolveRowTarget(targetId)
              : resolveEmphasisTarget(targetId) ?? resolveTarget(targetId);
          if (element && animateQueue2) {
            const { timeline, split } = buildTimelineFromAnimateQueue(element, animateQueue2);
            timelinesRef.current.set(targetId, { timeline, split });
          }
        }
      }
      const seconds = msToSeconds(clamped);
      for (const { timeline } of timelinesRef.current.values()) {
        timeline.pause();
        timeline.time(Math.max(0, Math.min(seconds, timeline.duration())));
      }
      currentTimeRef.current = clamped;
      setCurrentTimeMs(clamped);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('timeline-playback-tick', {
            detail: { currentTimeMs: clamped, isPlaying: false },
          })
        );
      }
    },
    [activePage, worksStore, totalDurationMs]
  );

  // 拖动播放头时根据鼠标位置 seek
  useEffect(() => {
    if (!isDraggingPlayhead || !timelineContainerRef.current) return;
    const onMove = (e: MouseEvent) => {
      const el = timelineContainerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const timePx = e.clientX - rect.left - LABEL_WIDTH;
      const timeMs = (timePx / pxPerMs);
      seekTo(timeMs);
    };
    const onUp = () => setIsDraggingPlayhead(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDraggingPlayhead, pxPerMs, seekTo]);

  if (!timelineData) return null;

  const widthPx = totalDurationMs * pxPerMs;

  /** 清除当前选中组（行）内所有行、元素的动画 */
  const clearGroupAnimations = useCallback(() => {
    if (!worksStore || !activeRowDepth?.length || !selectedRowByDepth) return;
    const row = worksStore.gridPropsOperator.getRowByDepth(activeRowDepth);
    if (!row) return;
    const { rowIds, elemIds } = getRowAndElemIdsUnderRow(row);
    const emptyQueue = { entrance: [], emphasis: [], exit: [] };
    for (const rowId of rowIds) {
      worksStore.gridPropsOperator.setRowAttrsByIdV2(rowId, { animateQueue2: emptyQueue });
    }
    for (const elemId of elemIds) {
      worksStore.setLayer(elemId, { animateQueue2: emptyQueue });
    }
  }, [worksStore, activeRowDepth, selectedRowByDepth]);

  /** 批量应用延迟递增 */
  const applyIncrementDelay = useCallback(
    (nodes: TimelineNode[], type: 'entrance' | 'emphasis' | 'exit', increment: number) => {
      if (!worksStore) return;
      nodes.forEach((node, index) => {
        if (node.type !== 'element') return;
        const layer = worksStore.getLayer(node.id);
        if (!layer?.animateQueue2) return;

        const queue = deepClone(layer.animateQueue2) as AnimateQueue2;
        const list = queue[type];
        if (!list?.length) return;

        list.forEach(state => {
          if (!state.parameters) state.parameters = {};
          state.parameters.delay = index * increment;
        });

        worksStore.setLayer(node.id, { animateQueue2: queue });
      });
    },
    [worksStore]
  );

  /** 批量应用统一延迟 */
  const applyUnifyDelay = useCallback(
    (nodes: TimelineNode[], type: 'entrance' | 'emphasis' | 'exit', delay: number) => {
      if (!worksStore) return;
      nodes.forEach(node => {
        if (node.type !== 'element') return;
        const layer = worksStore.getLayer(node.id);
        if (!layer?.animateQueue2) return;

        const queue = deepClone(layer.animateQueue2) as AnimateQueue2;
        const list = queue[type];
        if (!list?.length) return;

        list.forEach(state => {
          if (!state.parameters) state.parameters = {};
          state.parameters.delay = delay;
        });

        worksStore.setLayer(node.id, { animateQueue2: queue });
      });
    },
    [worksStore]
  );

  /** 批量应用统一时长 */
  const applyUnifyDuration = useCallback(
    (nodes: TimelineNode[], type: 'entrance' | 'emphasis' | 'exit', duration: number) => {
      if (!worksStore) return;
      nodes.forEach(node => {
        if (node.type !== 'element') return;
        const layer = worksStore.getLayer(node.id);
        if (!layer?.animateQueue2) return;

        const queue = deepClone(layer.animateQueue2) as AnimateQueue2;
        const list = queue[type];
        if (!list?.length) return;

        list.forEach(state => {
          if (!state.parameters) state.parameters = {};
          state.parameters.duration = duration;
        });

        worksStore.setLayer(node.id, { animateQueue2: queue });
      });
    },
    [worksStore]
  );

  /** 批量应用处理函数 */
  const handleBatchApply = useCallback(
    (config: { mode: 'incrementDelay' | 'unifyDelay' | 'unifyDuration'; animationType: 'entrance' | 'emphasis' | 'exit'; value: number }) => {
      if (!worksStore || !activePage) return;

      const targetNodes = multiSelectedElemIds.length > 0
        ? flattenElementNodesOnly(activePage.nodes).filter(n => multiSelectedElemIds.includes(n.id))
        : flattenElementNodesOnly(activePage.nodes).filter(n => n.strips.length > 0);

      if (targetNodes.length === 0) {
        toast.error('没有可应用的元素');
        return;
      }

      switch (config.mode) {
        case 'incrementDelay':
          applyIncrementDelay(targetNodes, config.animationType, config.value);
          break;
        case 'unifyDelay':
          applyUnifyDelay(targetNodes, config.animationType, config.value);
          break;
        case 'unifyDuration':
          applyUnifyDuration(targetNodes, config.animationType, config.value);
          break;
      }

      toast.success('批量设置成功');
    },
    [worksStore, activePage, multiSelectedElemIds, applyIncrementDelay, applyUnifyDelay, applyUnifyDuration]
  );

  /** 打开翻页动画 Drawer */
  const openPageFlipDrawer = useCallback(() => {
    setDrawerConfig({
      type: 'pageFlip',
      id: 'page-flip',
      name: '翻页动画',
    });
    setDrawerOpen(true);
  }, []);

  const showEmptyState = !activePage || !hasAnyStrips;

  return (
    <div
      className={cn(
        'flex flex-col border-t border-border bg-background shadow-[0_-4px_12px_rgba(0,0,0,0.08)] z-20 relative pointer-events-auto',
        collapsed ? 'h-auto' : 'h-[320px]'
      )}
    >
      <div className="flex flex-col h-full overflow-hidden text-foreground relative flex-1 min-h-0">
        <div className="flex flex-col border-b border-border">
          <div className="flex items-center justify-between gap-2 px-2 py-2">
            <span className="text-sm font-medium">
              动画时间轴{activePage ? ` · ${activePage.pageName}` : ''}
            </span>
            <div className="flex items-center gap-1 text-xs">
              <Button
                type="button"
                variant="outline"
                size="xs"
                className="flex items-center gap-1"
                onClick={handlePlayPause}
                title={isPlaying ? '停止' : '播放'}
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-3.5 w-3.5" />
                    暂停
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    播放
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="xs"
                className="flex items-center gap-1"
                onClick={handleReset}
                title="重置动画状态，播放头归零"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                重置
              </Button>
              {!collapsed && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() =>
                      setPxPerMs(v => Math.max(MIN_PX_PER_MS, Math.min(MAX_PX_PER_MS, v - 0.02)))
                    }
                  >
                    缩小
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() =>
                      setPxPerMs(v => Math.max(MIN_PX_PER_MS, Math.min(MAX_PX_PER_MS, v + 0.02)))
                    }
                  >
                    放大
                  </Button>
                  <Button
                    type="button"
                    variant={elementOnlyView ? 'default' : 'outline'}
                    size="xs"
                    className="flex items-center gap-1"
                    onClick={() => setElementOnlyView(v => !v)}
                    title="仅显示元素时间轴，隐藏组合轨道"
                  >
                    <BoxSelect className="h-3.5 w-3.5" />
                    仅元素
                  </Button>
                </>
              )}
              {elementOnlyView && multiSelectedElemIds.length >= 2 && (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="flex items-center gap-1"
                  onClick={handleCreateGroup}
                  title="将选中元素打组（虚拟分组）"
                >
                  <Group className="h-3.5 w-3.5" />
                  打组
                </Button>
              )}
              {!elementOnlyView && selectedRowByDepth && activeRowDepth != null && !isPageRowSelected ? (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="flex items-center gap-1"
                  onClick={clearGroupAnimations}
                  title="清除本组及所有子组、子元素的进场/强调/退场动画"
                >
                  <Eraser className="h-3.5 w-3.5" />
                  清除组内动画
                </Button>
              ) : null}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    className="flex items-center gap-1"
                    title="批量动画"
                  >
                    <Layers className="h-3.5 w-3.5" />
                    批量动画
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="max-w-[360px] w-[360px] p-0 flex flex-col max-h-[50vh] overflow-hidden"
                  align="start"
                  side="bottom"
                  sideOffset={8}
                >
                  <div className="flex flex-col min-h-0 overflow-y-auto overflow-x-hidden">
                    <BatchAnimationTemplates />
                  </div>
                </PopoverContent>
              </Popover>
              <BatchAnimationSettings
                nodes={displayNodes}
                multiSelectedElemIds={multiSelectedElemIds}
                onApplyBatch={handleBatchApply}
              />
              {isFlipPage && (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="flex items-center gap-1"
                  onClick={openPageFlipDrawer}
                  title="翻页动画设置"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  翻页设置
                </Button>
              )}
              {setWidgetStateV2 && (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="flex items-center gap-1"
                  onClick={() =>
                    setWidgetStateV2({ showAnimationTimeline: collapsed })}
                  title={collapsed ? '展开面板' : '收起面板'}
                >
                  {collapsed ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5" />
                      展开面板
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3.5 w-3.5" />
                      收起面板
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
        {!collapsed && (
          <div className="flex-1 flex min-h-0">
            {showEmptyState ? (
              <div className="flex-1 min-w-0 overflow-auto flex flex-col">
                <EmptyState />
              </div>
            ) : (
              <div className="flex-1 min-w-0 overflow-auto">
                <div
                  ref={timelineContainerRef}
                  className="relative"
                  style={{ width: LABEL_WIDTH + widthPx, minWidth: '100%' }}
                >
                  <TimelineRuler
                    totalDurationMs={totalDurationMs}
                    pxPerMs={pxPerMs}
                    className="sticky top-0 z-10"
                    onRulerClick={clientX => {
                      if (isPlaying) setIsPlaying(false);
                      const el = timelineContainerRef.current;
                      if (!el) return;
                      const rect = el.getBoundingClientRect();
                      const timeMs = (clientX - rect.left - LABEL_WIDTH) / pxPerMs;
                      seekTo(timeMs);
                    }}
                  />
                  <div
                    role="slider"
                    aria-label="时间轴播放头"
                    aria-valuemin={0}
                    aria-valuemax={totalDurationMs}
                    aria-valuenow={currentTimeMs}
                    className="absolute top-0 z-20 cursor-ew-resize select-none touch-none"
                    style={{
                      height: '100%',
                      left: LABEL_WIDTH + currentTimeMs * pxPerMs - 5,
                      width: 10,
                    }}
                    onMouseDown={e => {
                      if (e.button !== 0) return;
                      e.preventDefault();
                      if (isPlaying) setIsPlaying(false);
                      setIsDraggingPlayhead(true);
                    }}
                  >
                    <div
                      className="absolute left-1/2 top-0 w-0.5 -translate-x-px bg-primary"
                      style={{ height: '100%' }}
                    />
                  </div>
                  {isFlipPage && (
                    <div
                      className={cn(
                        'flex border-b border-border/50 hover:bg-muted/30 border-l-2 border-l-transparent group/track',
                        isPageRowSelected && 'bg-primary/10 border-l-2 border-l-primary'
                      )}
                      style={{
                        height: ROW_HEIGHT,
                        minWidth: LABEL_WIDTH + widthPx,
                      }}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        className={cn(
                          'flex-shrink-0 flex items-center px-2 text-xs truncate border-r border-border/50 text-left w-full hover:bg-muted/50 cursor-pointer',
                          isPageRowSelected && 'bg-primary/10 font-medium'
                        )}
                        style={{ width: LABEL_WIDTH, height: ROW_HEIGHT, paddingLeft: 8 }}
                        title="当前页的翻页动画设置"
                        onClick={() => {
                          setWidgetStateV2?.({
                            editingElemId: undefined,
                            activeRowDepth: [activePageIndex],
                          });
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setWidgetStateV2?.({
                              editingElemId: undefined,
                              activeRowDepth: [activePageIndex],
                            });
                          }
                        }}
                      >
                        <BookOpen className="h-3.5 w-3.5 flex-shrink-0 mr-1.5 text-muted-foreground" />
                        <span className="flex-1 min-w-0 truncate">翻页设置</span>
                        <button
                          className="ml-1 p-0.5 rounded hover:bg-accent opacity-0 group-hover/track:opacity-100 transition-opacity shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            openPageFlipDrawer();
                          }}
                          title="设置翻页动画"
                        >
                          <Settings className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="relative flex-1" style={{ width: widthPx }} />
                    </div>
                  )}
                  {elementOnlyView ? (
                    <DndContext
                      sensors={dndSensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDndDragEnd}
                    >
                      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                        {displayItems.map(item => {
                          if (item.kind === 'group') {
                            const gIdx = animationGroups.findIndex(g => g.id === item.groupId);
                            const gColor = gIdx >= 0 ? GROUP_COLORS[gIdx % GROUP_COLORS.length] : undefined;
                            const isGrpExpanded = expandedGroupIds.has(item.groupId);
                            const sortId = `group:${item.groupId}`;
                            return (
                              <SortableItem key={sortId} id={sortId}>
                                <TimelineVirtualGroupHeader
                                  groupId={item.groupId}
                                  groupName={item.groupName}
                                  childCount={item.children.length}
                                  isExpanded={isGrpExpanded}
                                  isSelected={item.children.length > 0 && item.children.every(c => multiSelectedElemIds.includes(c.id))}
                                  onToggle={() => toggleGroupExpand(item.groupId)}
                                  onSelect={() => {
                                    const childIds = item.children.map(c => c.id);
                                    setWidgetStateV2?.({
                                      multiSelectedElemIds: childIds,
                                      editingElemId: childIds[0],
                                      activeRowDepth: item.children[0]?.depth,
                                      hideOperator: false,
                                    });
                                    // 确保组是展开的
                                    if (!isGrpExpanded) toggleGroupExpand(item.groupId);
                                  }}
                                  onUngroup={() => handleUngroup(item.groupId)}
                                  pxPerMs={pxPerMs}
                                  totalDurationMs={totalDurationMs}
                                  groupColor={gColor}
                                />
                                {isGrpExpanded && item.children.map(child => {
                                  const inGroupSortId = `ingroup:${item.groupId}:${child.id}`;
                                  return (
                                    <SortableItem key={inGroupSortId} id={inGroupSortId}>
                                      <TimelineTrack
                                        label={child.displayName}
                                        elemId={child.id}
                                        strips={child.strips}
                                        pxPerMs={pxPerMs}
                                        totalDurationMs={totalDurationMs}
                                        isTrackSelected={editingElemId === child.id || multiSelectedElemIds.includes(child.id)}
                                        selectedStripKey={selectedStripKey}
                                        onSelectStrip={setSelectedStripKey}
                                        onStripSelect={() => handleNodeSelect(child)}
                                        onTrackLabelClick={e => handleTrackLabelClick(e, child.id)}
                                        onStripChange={handleStripChange}
                                        trackRef={editingElemId === child.id ? selectedTrackRef : undefined}
                                        groupColor={gColor}
                                        isRow={false}
                                        paddingLeftPx={32}
                                        multiSelectedElemIds={multiSelectedElemIds}
                                        liveDrag={liveDrag}
                                        onStripDragMove={handleStripDragMove}
                                        onStripDragEnd={handleStripDragEnd}
                                      />
                                    </SortableItem>
                                  );
                                })}
                              </SortableItem>
                            );
                          }
                          // 独立元素
                          const node = item.node;
                          const gid = worksStore?.getAnimationGroupIdByElemId(node.id);
                          const groups = worksStore?.getAnimationGroups() ?? [];
                          const gIdx = groups.findIndex(g => g.id === gid);
                          const gColor = gIdx >= 0 ? GROUP_COLORS[gIdx % GROUP_COLORS.length] : undefined;
                          return (
                            <SortableItem key={node.id} id={node.id}>
                              <TimelineTrack
                                label={node.displayName}
                                elemId={node.id}
                                strips={node.strips}
                                pxPerMs={pxPerMs}
                                totalDurationMs={totalDurationMs}
                                isTrackSelected={editingElemId === node.id || multiSelectedElemIds.includes(node.id)}
                                selectedStripKey={selectedStripKey}
                                onSelectStrip={setSelectedStripKey}
                                onStripSelect={() => handleNodeSelect(node)}
                                onTrackLabelClick={e => handleTrackLabelClick(e, node.id)}
                                onStripChange={handleStripChange}
                                trackRef={editingElemId === node.id ? selectedTrackRef : undefined}
                                groupColor={gColor}
                                isRow={false}
                                multiSelectedElemIds={multiSelectedElemIds}
                                liveDrag={liveDrag}
                                onStripDragMove={handleStripDragMove}
                                onStripDragEnd={handleStripDragEnd}
                              />
                            </SortableItem>
                          );
                        })}
                      </SortableContext>
                    </DndContext>
                  ) : (
                    displayNodes.map(node => (
                      <TimelineTreeNode
                        key={node.id}
                        node={node}
                        level={0}
                        expandedIds={expandedIds}
                        onToggleExpand={toggleExpand}
                        editingElemId={editingElemId}
                        activeRowDepth={activeRowDepth}
                        multiSelectedElemIds={multiSelectedElemIds}
                        selectedStripKey={selectedStripKey}
                        onSelectStrip={setSelectedStripKey}
                        onNodeSelect={handleNodeSelect}
                        onTrackLabelClick={handleTrackLabelClick}
                        onStripChange={handleStripChange}
                        selectedTrackRef={selectedTrackRef}
                        groupColorForNode={
                          node.type === 'element'
                            ? (() => {
                              const gid = worksStore?.getAnimationGroupIdByElemId(node.id);
                              const groups2 = worksStore?.getAnimationGroups() ?? [];
                              const idx = groups2.findIndex(g => g.id === gid);
                              return idx >= 0
                                ? GROUP_COLORS[idx % GROUP_COLORS.length]
                                : undefined;
                            })()
                            : undefined
                        }
                        pxPerMs={pxPerMs}
                        totalDurationMs={totalDurationMs}
                        liveDrag={liveDrag}
                        onStripDragMove={handleStripDragMove}
                        onStripDragEnd={handleStripDragEnd}
                      />
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 翻页动画设置 Drawer */}
      {drawerConfig && (
        <AnimationDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          pageFlipValue={activePage?.pageRow?.animationType}
          onPageFlipChange={(payload) => {
            worksStore?.gridPropsOperator.setRowAttrsV2(
              { animationType: payload },
              { ...widgetStateV2, activeRowDepth: [activePageIndex] }
            );
          }}
          onApplyToAllPages={() => {
            const animationType = activePage?.pageRow?.animationType;
            if (!animationType) {
              toast.error('请先选择动画类型');
              return;
            }
            const gridsData = worksData?.gridProps?.gridsData ?? [];
            const nextGridData = deepClone(gridsData);
            nextGridData.forEach((row, idx) => {
              nextGridData[idx] = { ...row, animationType };
            });
            worksStore?.setGridProps({ gridsData: nextGridData });
            setFlipPreviewKey(k => k + 1);
            toast.success('已应用到全部页面');
          }}
          activePageIndex={activePageIndex}
          flipPreviewKey={flipPreviewKey}
        />
      )}
    </div>
  );
}

export const AnimationTimelinePanel = observer(AnimationTimelinePanelInner);

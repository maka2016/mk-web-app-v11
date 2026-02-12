import type { GridRow } from '@/components/GridEditorV3/types';
import { getRowName } from '@/components/GridEditorV3/utils/utils1';
import type { IWorksData, LayerElemItem } from '@/components/GridEditorV3/works-store/types';
import type { AnimateQueue2, AnimationState } from '@/components/GridEditorV3/works-store/types/animate2';

/** 单条动画在时间轴上的条带：start/end 为毫秒 */
export interface TimelineStrip {
  type: 'entrance' | 'emphasis' | 'exit';
  animationState: AnimationState;
  start: number;
  end: number;
}

/** 时间轴上的一行（一个元素） */
export interface TimelineElementRow {
  elemId: string;
  /** 元素展示名（图层名或占位） */
  displayName: string;
  strips: TimelineStrip[];
}

/** 时间轴树节点：行（GridRow）或元素（layer） */
export interface TimelineNode {
  type: 'row' | 'element';
  /** 行节点时为 row.id，元素节点为 elemId */
  id: string;
  rowId?: string;
  elemId?: string;
  /** 展示名 */
  displayName: string;
  strips: TimelineStrip[];
  children: TimelineNode[];
  /** 在 gridsData 中的深度路径（行节点有效） */
  depth: number[];
}

/** 时间轴上的一页（gridsData 第一层的一项） */
export interface TimelinePage {
  pageIndex: number;
  /** 页/块 row（第一层） */
  pageRow: GridRow;
  /** 页展示名 */
  pageName: string;
  elements: TimelineElementRow[];
  /** 树形轨道（行 + 元素，可折叠） */
  nodes: TimelineNode[];
}

/** 全作品时间轴数据 */
export interface AnimationTimelineData {
  pages: TimelinePage[];
  /** 全剧时间轴总时长（ms），用于画布宽度 */
  totalDurationMs: number;
}

/** 根据 elemId 查找其所在 row 的深度路径（gridsData 中的索引路径） */
export function getRowDepthByElemId(gridsData: GridRow[], elemId: string): number[] | undefined {
  function findDepth(rows: GridRow[], path: number[]): number[] | undefined {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.childrenIds?.includes(elemId)) return [...path, i];
      if (row.children?.length) {
        const found = findDepth(row.children, [...path, i]);
        if (found) return found;
      }
    }
    return undefined;
  }
  return findDepth(gridsData, []);
}

/** 递归收集 row 及其所有子孙中的 childrenIds */
function collectElemIdsFromRow(row: GridRow): string[] {
  const ids: string[] = [];
  if (row.childrenIds && row.childrenIds.length > 0) {
    ids.push(...row.childrenIds);
  }
  if (row.children && row.children.length > 0) {
    for (const child of row.children) {
      ids.push(...collectElemIdsFromRow(child));
    }
  }
  return ids;
}

/** 递归收集 row 及其所有子孙行的 id（含自身） */
export function collectRowIdsFromRow(row: GridRow): string[] {
  const ids = [row.id];
  if (row.children?.length) {
    for (const child of row.children) {
      ids.push(...collectRowIdsFromRow(child));
    }
  }
  return ids;
}

/** 收集指定行（组）内所有行 id 与元素 id，用于批量清除组内动画 */
export function getRowAndElemIdsUnderRow(row: GridRow): {
  rowIds: string[];
  elemIds: string[];
} {
  return {
    rowIds: collectRowIdsFromRow(row),
    elemIds: collectElemIdsFromRow(row),
  };
}

/** 从 AnimationState 计算 duration（ms），优先 parameters.duration */
function getDurationMs(state: AnimationState): number {
  const p = state.parameters;
  if (p && typeof p.duration === 'number') return p.duration;
  return 0;
}

/**
 * 从 AnimationState 得到「动画在时间轴上的起始延迟」ms，与 buildTimelineFromAnimateQueue 一致：
 * 使用 parameters.delay（动画开始前等待）；state.delay 仅用于文字字间 stagger，不参与条带 start
 */
export function getDelayMs(state: AnimationState): number {
  const p = state.parameters;
  if (p != null && typeof p.delay === 'number') return p.delay;
  return 0;
}

const MAX_DISPLAY_NAME_LEN = 24;

function stripHtmlForDisplay(text: string): string {
  if (typeof text !== 'string') return '';
  return text
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 获取图层/元素的可读展示名（不暴露 elemId） */
export function getLayerDisplayName(layer: LayerElemItem): string {
  if (layer.name && String(layer.name).trim()) return String(layer.name).trim();
  const attrs = layer.attrs ?? {};
  const elementRef = (layer.elementRef ?? '').toLowerCase();
  const tag = (layer.tag ?? '').toString();
  if (elementRef.includes('text')) {
    const raw = (attrs as { text?: string }).text;
    const clean = stripHtmlForDisplay(raw ?? '');
    const str = clean || '文字';
    return str.length > MAX_DISPLAY_NAME_LEN ? str.slice(0, MAX_DISPLAY_NAME_LEN) + '…' : str;
  }
  if (elementRef.includes('picture') || elementRef.includes('img')) {
    return '图片';
  }
  if (elementRef.includes('gridv2') || tag === 'grid_style') return '卡片';
  if (tag === 'row_style') return '布局';
  if (tag === 'cell_style') return '格子';
  const name = (attrs as { name?: string; title?: string }).name ?? (attrs as { name?: string; title?: string }).title;
  if (name && String(name).trim()) return String(name).trim();
  if (elementRef.includes('calendar')) return '日历';
  if (elementRef.includes('map')) return '地图';
  if (elementRef.includes('rsvp')) return '邀请函';
  if (elementRef.includes('relay')) return '接力';
  return '图层';
}

/** 从 AnimateQueue2 计算 strips（行与元素共用） */
function buildStripsFromQueue(queue: AnimateQueue2): TimelineStrip[] {
  const strips: TimelineStrip[] = [];
  let cursorMs = 0;

  const entranceList = queue.entrance;
  if (entranceList?.length) {
    entranceList.forEach((state) => {
      // 叠加模式：多个入场动画共享起始时间，仅用各自的 delay 做偏移
      const delayMs = getDelayMs(state);
      const start = cursorMs + delayMs;
      const duration = getDurationMs(state);
      const end = start + duration;
      strips.push({ type: 'entrance', animationState: state, start, end });
    });
    cursorMs = Math.max(...strips.filter(s => s.type === 'entrance').map(s => s.end), 0);
  }

  const emphasisList = queue.emphasis;
  const emphasisInfinite = emphasisList?.some(s => s.parameters?.loop === true) ?? false;
  if (emphasisList?.length) {
    emphasisList.forEach(state => {
      const delayMs = getDelayMs(state);
      const start = cursorMs + delayMs;
      const duration = getDurationMs(state);
      const end = start + duration;
      strips.push({ type: 'emphasis', animationState: state, start, end });
    });
    cursorMs = Math.max(...strips.filter(s => s.type === 'emphasis').map(s => s.end), cursorMs);
  }

  if (!emphasisInfinite && queue.exit?.length) {
    queue.exit.forEach((state, index) => {
      const baseOffset = index * 100;
      const delayMs = getDelayMs(state);
      const start = cursorMs + baseOffset + delayMs;
      const duration = getDurationMs(state);
      const end = start + duration;
      strips.push({ type: 'exit', animationState: state, start, end });
    });
  }

  return strips;
}

/** 行展示名：row.name / row.alias / getRowName */
function getRowDisplayName(row: GridRow, depth: number[]): string {
  const name = (row as GridRow & { name?: string }).name ?? row.alias;
  if (name && String(name).trim()) return String(name).trim();
  return getRowName(row, depth);
}

/** 递归构建单行的树节点（行用 row.animateQueue2，元素用 layer.animateQueue2） */
function buildNodesFromRow(row: GridRow, depth: number[], layersMap: Record<string, LayerElemItem>): TimelineNode[] {
  const nodes: TimelineNode[] = [];

  // 子行（children）
  if (row.children?.length) {
    row.children.forEach((child, i) => {
      const childDepth = [...depth, i];
      const rowStrips = child.animateQueue2 ? buildStripsFromQueue(child.animateQueue2) : [];
      const childNodes = buildNodesFromRow(child, childDepth, layersMap);
      const hasStrips = rowStrips.length > 0;
      const hasDescendants = childNodes.length > 0;
      const hasAnimateQueue2 = child.animateQueue2 != null;
      if (hasStrips || hasDescendants || hasAnimateQueue2) {
        nodes.push({
          type: 'row',
          id: child.id,
          rowId: child.id,
          displayName: getRowDisplayName(child, childDepth),
          strips: rowStrips,
          children: childNodes,
          depth: childDepth,
        });
      }
    });
  }

  // 直接子元素（childrenIds）
  if (row.childrenIds?.length) {
    row.childrenIds.forEach(elemId => {
      const layer = layersMap[elemId];
      if (!layer?.animateQueue2) return;
      const strips = buildStripsFromQueue(layer.animateQueue2);
      if (strips.length === 0) return;
      nodes.push({
        type: 'element',
        id: elemId,
        elemId,
        displayName: getLayerDisplayName(layer),
        strips,
        children: [],
        depth: [...depth],
      });
    });
  }

  return nodes;
}

/** 从树节点收集所有 strip 的 end，用于计算 totalDurationMs */
export function maxEndFromNodes(nodes: TimelineNode[]): number {
  let max = 0;
  function walk(ns: TimelineNode[]) {
    for (const n of ns) {
      for (const s of n.strips) {
        if (s.end > max) max = s.end;
      }
      walk(n.children);
    }
  }
  walk(nodes);
  return max;
}

/** 深度优先收集树中所有节点 id（用于多选范围等） */
export function flattenNodeIds(nodes: TimelineNode[]): string[] {
  const ids: string[] = [];
  function walk(ns: TimelineNode[]) {
    for (const n of ns) {
      ids.push(n.id);
      walk(n.children);
    }
  }
  walk(nodes);
  return ids;
}

/** 在树中根据 id 查找节点 */
export function findNodeInTree(nodes: TimelineNode[], id: string): TimelineNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findNodeInTree(n.children, id);
    if (found) return found;
  }
  return null;
}

/** 递归收集树中仅元素节点（扁平列表），用于「仅显示元素时间轴」时隐藏组合轨道 */
export function flattenElementNodesOnly(nodes: TimelineNode[]): TimelineNode[] {
  const out: TimelineNode[] = [];
  for (const n of nodes) {
    if (n.type === 'element') out.push(n);
    out.push(...flattenElementNodesOnly(n.children));
  }
  return out;
}

/** 收集树中所有有子节点的行 id（用于默认展开全部分组） */
export function collectRowIdsWithChildren(nodes: TimelineNode[]): Set<string> {
  const ids = new Set<string>();
  function walk(ns: TimelineNode[]) {
    for (const n of ns) {
      if (n.type === 'row' && n.children.length > 0) {
        ids.add(n.id);
        walk(n.children);
      }
    }
  }
  walk(nodes);
  return ids;
}

/** 时间轴显示项：可以是独立元素或虚拟分组 */
export type DisplayItem =
  | { kind: 'element'; node: TimelineNode }
  | { kind: 'group'; groupId: string; groupName: string; children: TimelineNode[] };

const GROUP_PREFIX = 'group:';

/**
 * 根据 animationTimelineOrder + animationGroups 构建带虚拟分组和排序的显示列表。
 * - order 中的 "group:xxx" 项渲染为可折叠分组头 + 组内元素
 * - order 中的 elemId 项渲染为独立元素
 * - order 为空时退回原始顺序（无分组）
 */
export function buildOrderedDisplayItems(
  flatNodes: TimelineNode[],
  order: string[],
  groups: { id: string; name?: string; elemIds: string[] }[]
): DisplayItem[] {
  const nodeMap = new Map<string, TimelineNode>();
  for (const n of flatNodes) nodeMap.set(n.id, n);

  // 所有被分组包含的 elemId 集合（用于检测孤立元素）
  const groupedElemIds = new Set<string>();
  const groupMap = new Map<string, { id: string; name?: string; elemIds: string[] }>();
  for (const g of groups) {
    groupMap.set(g.id, g);
    for (const eid of g.elemIds) groupedElemIds.add(eid);
  }

  if (order.length === 0) {
    // 没有自定义顺序：按原始顺序，但如果存在分组则按分组合并
    if (groups.length === 0) {
      return flatNodes.map(n => ({ kind: 'element' as const, node: n }));
    }
    // 有分组但没有 order：按原始顺序，首次遇到分组内元素时插入分组
    const items: DisplayItem[] = [];
    const renderedGroups = new Set<string>();
    for (const n of flatNodes) {
      const gid = groups.find(g => g.elemIds.includes(n.id))?.id;
      if (gid && !renderedGroups.has(gid)) {
        renderedGroups.add(gid);
        const g = groupMap.get(gid)!;
        const children = g.elemIds.map(eid => nodeMap.get(eid)).filter(Boolean) as TimelineNode[];
        if (children.length > 0) {
          items.push({ kind: 'group', groupId: g.id, groupName: g.name ?? `组 ${items.length + 1}`, children });
        }
      } else if (!gid) {
        items.push({ kind: 'element', node: n });
      }
      // 如果 gid 已渲染过则跳过（组内元素已在组中显示）
    }
    return items;
  }

  const items: DisplayItem[] = [];
  const consumed = new Set<string>(); // 已渲染过的 elemId

  for (const entry of order) {
    if (entry.startsWith(GROUP_PREFIX)) {
      const gid = entry.slice(GROUP_PREFIX.length);
      const g = groupMap.get(gid);
      if (!g) continue;
      const children = g.elemIds.map(eid => nodeMap.get(eid)).filter(Boolean) as TimelineNode[];
      if (children.length === 0) continue;
      items.push({ kind: 'group', groupId: g.id, groupName: g.name ?? `组`, children });
      for (const c of children) consumed.add(c.id);
    } else {
      if (consumed.has(entry)) continue;
      const node = nodeMap.get(entry);
      if (!node) continue;
      // 如果元素属于某个分组但不是以 group: 形式出现，跳过（组会整体渲染）
      if (groupedElemIds.has(entry)) continue;
      items.push({ kind: 'element', node });
      consumed.add(entry);
    }
  }

  // 追加 order 中缺失的新元素
  for (const n of flatNodes) {
    if (consumed.has(n.id)) continue;
    if (groupedElemIds.has(n.id)) continue; // 分组内但组未出现，不单独渲染
    items.push({ kind: 'element', node: n });
    consumed.add(n.id);
  }

  return items;
}

/**
 * 根据 DisplayItem[] 构建用于 DnD 的排序 ID 列表。
 * - 独立元素 ID = elemId
 * - 分组头 ID = "group:groupId"
 * - 分组内元素 ID = "ingroup:groupId:elemId"
 */
export function buildSortableIds(items: DisplayItem[], expandedGroupIds: Set<string>): string[] {
  const ids: string[] = [];
  for (const item of items) {
    if (item.kind === 'element') {
      ids.push(item.node.id);
    } else {
      ids.push(`${GROUP_PREFIX}${item.groupId}`);
      if (expandedGroupIds.has(item.groupId)) {
        for (const child of item.children) {
          ids.push(`ingroup:${item.groupId}:${child.id}`);
        }
      }
    }
  }
  return ids;
}

/**
 * 从 DisplayItem[] + groups 反推出 animationTimelineOrder（用于持久化）。
 */
export function displayItemsToOrder(items: DisplayItem[]): string[] {
  const order: string[] = [];
  for (const item of items) {
    if (item.kind === 'element') {
      order.push(item.node.id);
    } else {
      order.push(`${GROUP_PREFIX}${item.groupId}`);
    }
  }
  return order;
}

/** 从 layersMap + gridsData 按页收集动画（扁平 elements + 树形 nodes），计算每条动画的 start/end（ms） */
export function getAnimationTimelineData(worksData: IWorksData): AnimationTimelineData {
  const layersMap = worksData.layersMap ?? {};
  const gridsData = worksData.gridProps?.gridsData ?? [];
  const pages: TimelinePage[] = [];
  let totalDurationMs = 0;

  // 第一层 = pages = block
  for (let pageIndex = 0; pageIndex < gridsData.length; pageIndex++) {
    const pageRow = gridsData[pageIndex];
    const elemIds = collectElemIdsFromRow(pageRow);
    const elements: TimelineElementRow[] = [];

    for (const elemId of elemIds) {
      const layer: LayerElemItem | undefined = layersMap[elemId];
      if (!layer?.animateQueue2) continue;

      const displayName = getLayerDisplayName(layer);
      const strips = buildStripsFromQueue(layer.animateQueue2);

      for (const s of strips) {
        if (s.end > totalDurationMs) totalDurationMs = s.end;
      }
      if (strips.length > 0) {
        elements.push({ elemId, displayName: String(displayName), strips });
      }
    }

    // 树形轨道：行用 row.animateQueue2，元素用 layer.animateQueue2
    const nodes = buildNodesFromRow(pageRow, [pageIndex], layersMap);
    const nodeMax = maxEndFromNodes(nodes);
    if (nodeMax > totalDurationMs) totalDurationMs = nodeMax;

    const pageName = (pageRow as GridRow & { name?: string }).name ?? pageRow.alias ?? `页 ${pageIndex + 1}`;
    pages.push({
      pageIndex,
      pageRow,
      pageName: String(pageName),
      elements,
      nodes,
    });
  }

  return { pages, totalDurationMs };
}

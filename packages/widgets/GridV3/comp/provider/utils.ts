import { getWorksDetailStatic } from '@mk/services/src';
import { deepClone, isObject } from '@mk/utils';
import { IWorksData } from '@mk/works-store/types';
import { getMobileWidth, GridProps, isEditor } from '../../shared';

export const getGroupRows = (
  cellsMap: GridProps['cellsMap'],
  options: { maxBlockCount?: number } = {}
) => {
  const { maxBlockCount = 50 } = options;
  const nextCellsMap = deepClone(cellsMap);
  nextCellsMap.map((row, idx) => {
    const { groupByRowId } = row;
    const isGroupByRowIdExist = nextCellsMap.find(r => r.id === groupByRowId);
    if (!groupByRowId || !isGroupByRowIdExist) {
      /** 如果没有，则自身成为一个组 */
      nextCellsMap[idx].groupByRowId = row.id;
    }
  });
  const rowsGroup = getStableBlockGroups(nextCellsMap, maxBlockCount);
  return {
    rowsGroup,
    cellsMap: nextCellsMap,
  };
};

// 新的分组数据结构
export interface BlockGroup {
  groupId: string; // 根节点的 groupByRowId
  rootRowId: string; // 根节点的 id
  rowIds: string[]; // 该组内所有 row 的 id，按在 cellsMap 中的顺序排列
  startIndex: number; // 在 cellsMap 中的起始索引
  endIndex: number; // 在 cellsMap 中的结束索引
}

// 生成稳定的分组数据
export const getStableBlockGroups = (
  cellsMap: GridProps['cellsMap'],
  maxBlockCount: number = 50
): BlockGroup[] => {
  // 确保所有 row 都有 groupByRowId
  const normalizedCellsMap = deepClone(cellsMap);
  normalizedCellsMap.forEach((row, idx) => {
    if (!row.groupByRowId) {
      normalizedCellsMap[idx].groupByRowId = row.id;
    }
  });

  // 按 groupByRowId 分组
  const groupMap = new Map<string, BlockGroup>();

  normalizedCellsMap.forEach((row, index) => {
    const groupId = row.groupByRowId!;

    if (!groupMap.has(groupId)) {
      // 创建新的组
      groupMap.set(groupId, {
        groupId,
        rootRowId: row.id, // 第一个遇到的 row 作为根节点
        rowIds: [row.id],
        startIndex: index,
        endIndex: index,
      });
    } else {
      // 添加到现有组
      const group = groupMap.get(groupId)!;
      group.rowIds.push(row.id);
      group.endIndex = index;

      // 如果这个 row 的 id 等于 groupByRowId，说明它是真正的根节点
      if (row.id === groupId) {
        group.rootRowId = row.id;
      }
    }
  });

  // 转换为数组并按在 cellsMap 中的顺序排序
  let blockGroups = Array.from(groupMap.values()).sort(
    (a, b) => a.startIndex - b.startIndex
  );

  // 如果 block 数量超过 maxBlockCount，将超出的 block 合并到最后一个 block
  if (blockGroups.length > maxBlockCount) {
    const lastBlock = blockGroups[maxBlockCount - 1];
    const remainingBlocks = blockGroups.slice(maxBlockCount);

    // 合并所有剩余 block 的行到最后一个 block
    remainingBlocks.forEach(block => {
      lastBlock.rowIds.push(...block.rowIds);
      // 更新结束索引为最后一个 block 的结束索引
      lastBlock.endIndex = Math.max(lastBlock.endIndex, block.endIndex);
    });

    // 只保留前 maxBlockCount 个 block
    blockGroups = blockGroups.slice(0, maxBlockCount);
  }

  return blockGroups;
};

export interface CanvaInfo2 {
  /** 编辑器画布宽度 */
  canvaW: number;
  /** 编辑器画布高度 */
  canvaH: number | 'auto';
  /** viewer画布宽度 */
  viewportWidth: number;
  /** 编辑器画布缩放比例，用于不同尺寸的手机屏幕适配 */
  canvaScale: number;
  deviceWidth: number;
  /**
   * 实际 viewport 的 width 与编辑器画布 width 的缩放比率: viewportScale = viewportWidth / canvaW
   */
  viewportScale: number;
  canvaVisualHeight?: number;
  maxPageCount: number;
  isWebsite: boolean;
  /** 是否多页平铺 */
  isFlatPage: boolean;
  /** 是否铺满屏幕高度，适用于翻页H5规格 */
  fillScreen: boolean;
  useMusic: boolean;
  shareInfo: {
    websiteSupport: boolean;
    videoSupport: boolean;
    posterSupport: boolean;
  };
  isFixedHeight: boolean;
}

export const getCanvaInfo2 = (
  worksDetail = getWorksDetailStatic(),
  worksData?: IWorksData
) => {
  const {
    width,
    height,
    is_flat_page,
    max_page_count,
    viewport_width,
    fixed_height,
    export_format,
  } = worksDetail.specInfo;
  const canvaVisualHeight = worksData?.canvasData.height;
  const isWebsite = export_format?.includes('html');
  const useMusic = ['html', 'video'].some(format =>
    export_format?.includes(format)
  );
  const isFlatPage = is_flat_page;
  const isInEditor = isEditor();
  const isFixedHeight = !!fixed_height;
  const deviceWidth = typeof window !== 'undefined' ? getMobileWidth() : 0;
  const canvaScale = deviceWidth / width;
  const viewportScale = viewport_width / width;
  const canvaHDisplay = !fixed_height ? 'auto' : height;
  const maxPageCount = max_page_count;
  const fillScreen = !isInEditor && isFixedHeight && isWebsite;
  const ret: CanvaInfo2 = {
    canvaW: width,
    /** 导出时的画布宽度 */
    viewportWidth: viewport_width,
    canvaH: canvaHDisplay,
    isFixedHeight,
    isFlatPage,
    deviceWidth,
    canvaScale,
    viewportScale,
    canvaVisualHeight,
    maxPageCount,
    isWebsite,
    fillScreen,
    useMusic,
    shareInfo: getShareInfo(worksDetail),
  };
  // console.log("getCanvaInfo2", ret);
  return ret;
};

export const getShareInfo = (worksDetail = getWorksDetailStatic()) => {
  const { export_format } = worksDetail?.specInfo || {};
  const isWebsite = !!export_format?.includes('html');
  return {
    websiteSupport: isWebsite,
    videoSupport: isWebsite || export_format?.includes('video'),
    posterSupport: isWebsite || export_format?.includes('image'),
  };
};

export const getLink = (worksData: IWorksData, elemId: string) => {
  return worksData.positionLink[elemId];
};

export const countChild = (
  cellsMap: GridProps['cellsMap'],
  worksData: IWorksData
) => {
  let count = 0;
  cellsMap.forEach(row => {
    row.cells.forEach(col => {
      col.childrenIds?.forEach(childId => {
        const layer = getLink(worksData, childId);
        if (layer) {
          count++;
        }
      });
    });
  });
  return count;
};

export const getChildCountV2 = (
  gridsData: GridProps['gridsData'],
  positionLink: IWorksData['positionLink']
) => {
  let count = 0;

  const countRecursively = (rows: GridProps['gridsData']) => {
    rows.forEach(row => {
      // 处理当前行的 childrenIds
      row.childrenIds?.forEach(childId => {
        const layer = positionLink[childId];
        if (layer) {
          count++;
        }
      });

      // 递归处理嵌套的 children
      if (row.children && row.children.length > 0) {
        countRecursively(row.children);
      }
    });
  };

  countRecursively(gridsData);
  return count;
};

export const defaultGridStyle = {
  padding: '12px',
  // minHeight: 48,
  gap: 8,
};

/**
 * Deep merge two objects.
 * @param target
 * @param ...sources
 */
export function mergeDeep2(target: any, ...sources: any[]) {
  if (!sources.length || !target) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key as keyof any])
          Object.assign(target, { [key]: {} as any });
        mergeDeep2(target[key as keyof any], source[key] as any);
      } else {
        Object.assign(target, { [key]: source[key] as any });
      }
    }
  }

  return mergeDeep2(target, ...sources);
}

/**
 * Deep merge two objects with array support.
 * - If both target and source are arrays, source replaces target
 * - Arrays inside objects will be replaced instead of merged
 * @param target - The target object/array to merge into
 * @param sources - The source objects/arrays to merge from
 * @returns The merged result
 */
export function mergeDeepArr<T>(target: T, ...sources: any[]): T {
  if (!sources.length) return target;
  const source = sources.shift();

  // If source is null/undefined, continue with next source
  if (source == null) return mergeDeepArr(target, ...sources);

  // If target is null/undefined, use source as new target
  if (target == null) return mergeDeepArr(source, ...sources);

  // If both are arrays, replace target with source
  if (Array.isArray(target) && Array.isArray(source)) {
    return mergeDeepArr(source as T, ...sources);
  }

  // If both are objects (but not arrays), deep merge
  if (
    isObject(target) &&
    isObject(source) &&
    !Array.isArray(target) &&
    !Array.isArray(source)
  ) {
    for (const key in source) {
      // Handle arrays - replace instead of merge
      if (Array.isArray(source[key])) {
        Object.assign(target, { [key]: source[key] as any });
      }
      // Handle objects - deep merge recursively
      else if (isObject(source[key])) {
        if (!target[key as keyof T]) {
          Object.assign(target, { [key]: {} as any });
        }
        mergeDeepArr(target[key as keyof T], source[key] as any);
      }
      // Handle primitive values - direct assignment
      else {
        Object.assign(target, { [key]: source[key] as any });
      }
    }
    return mergeDeepArr(target, ...sources);
  }

  // For other cases (primitive, different types), use source
  return mergeDeepArr(source as T, ...sources);
}

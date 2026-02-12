import { deepClone, isObject, SerializedWorksEntity } from '@/utils';

import { getMobileWidth, isEditor } from '../utils';

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
  maxPageCount: number;
  isWebsite: boolean;
  /** 是否多页平铺 */
  isFlatPage: boolean;
  /** 是否铺满屏幕高度，适用于翻页H5规格 */
  fillScreen: boolean;
  useMusic: boolean;
  useAnimation: boolean;
  shareInfo: {
    websiteSupport: boolean;
    videoSupport: boolean;
    posterSupport: boolean;
  };
  isFixedHeight: boolean;
}

export const getCanvaInfo2 = (worksDetail: SerializedWorksEntity | undefined = (window as any).__worksDetail) => {
  if (!worksDetail) {
    throw new Error('必须设置worksDetail');
  }
  const { width, height, is_flat_page, max_page_count, viewport_width, fixed_height, export_format } =
    worksDetail.specInfo;
  const isWebsite = !!export_format?.includes('html');
  const useMusic = ['html', 'video'].some(format => export_format?.includes(format));
  const isFlatPage = !!is_flat_page;
  const isInEditor = typeof window !== 'undefined' ? isEditor() : false;
  const isFixedHeight = !!fixed_height;
  const deviceWidth = typeof window !== 'undefined' ? getMobileWidth() : 0;
  const canvaScale = deviceWidth / (width || 0);
  const viewportScale = (viewport_width || 0) / (width || 0);
  const canvaHDisplay = !fixed_height ? 'auto' : height || 0;
  const maxPageCount = max_page_count || 0;
  const fillScreen = !isInEditor && isFixedHeight && isWebsite;
  const useAnimation = ['html', 'video'].some(format => export_format?.includes(format));

  const ret: CanvaInfo2 = {
    canvaW: width || 0,
    /** 导出时的画布宽度 */
    viewportWidth: viewport_width || 0,
    canvaH: canvaHDisplay,
    isFixedHeight,
    isFlatPage,
    deviceWidth,
    canvaScale,
    viewportScale,
    maxPageCount,
    isWebsite,
    fillScreen,
    useMusic,
    useAnimation,
    shareInfo: getShareInfo(worksDetail),
  };
  return ret;
};

export const getShareInfo = (worksDetail: SerializedWorksEntity) => {
  const { export_format } = worksDetail?.specInfo || {};
  const isWebsite = !!export_format?.includes('html');
  return {
    websiteSupport: isWebsite,
    videoSupport: isWebsite || !!export_format?.includes('video'),
    posterSupport: isWebsite || !!export_format?.includes('image'),
  };
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

  // 只在最外层执行一次深拷贝
  const result = deepClone(target);

  // 内部递归函数，直接修改 result，不再进行深拷贝
  function merge(obj: any, ...srcs: any[]): any {
    if (!srcs.length) return obj;
    const src = srcs.shift();

    if (isObject(obj) && isObject(src)) {
      for (const key in src) {
        if (isObject(src[key])) {
          if (!obj[key as keyof any]) {
            obj[key] = {};
          }
          merge(obj[key as keyof any], src[key] as any);
        } else {
          obj[key] = src[key];
        }
      }
    }

    return merge(obj, ...srcs);
  }

  return merge(result, ...sources);
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
  if (isObject(target) && isObject(source) && !Array.isArray(target) && !Array.isArray(source)) {
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

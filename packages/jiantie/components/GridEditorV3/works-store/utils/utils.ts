import { mergeDeep } from '@/utils';
import { IWorksData } from '../types';

/**
 * 清理 themeConfig2 / materialResourcesGroup 中因历史代码缺陷产生的 nextVal 链
 * 检查 2 层：当前对象 + 1 层 nextVal，合并后删除 nextVal 节点
 * 例如 block.nextVal.nextVal 仅合并 block 与 block.nextVal，忽略更深层
 */
export function cleanNextValChains<T extends null | undefined>(obj: T): T;
export function cleanNextValChains<T extends object>(obj: T): T;
export function cleanNextValChains<T>(obj: T): T {
  if (obj == null) return obj;
  if (typeof obj !== 'object' || Array.isArray(obj)) return obj;

  const record = obj as Record<string, unknown>;
  let current: Record<string, unknown> = { ...record };
  delete current.nextVal;

  const nextVal = record.nextVal;
  if (nextVal != null && typeof nextVal === 'object' && !Array.isArray(nextVal)) {
    const nextValObj = nextVal as Record<string, unknown>;
    const nextValRest = { ...nextValObj };
    delete nextValRest.nextVal;
    current = { ...current, ...nextValRest };
  }

  const result: Record<string, unknown> = {};
  for (const key of Object.keys(current)) {
    const val = current[key];
    if (val != null && typeof val === 'object' && !Array.isArray(val)) {
      result[key] = cleanNextValChains(val);
    } else {
      result[key] = val;
    }
  }

  return result as T;
}

// = getUrlSearchParams({ target: "works_type" }) || "poster"
/**
 * 获得页面初始数据
 *
 * @static
 * @param {string} pageId 页面id
 * @param {number} scale 画布缩放比例
 * @return {*}  {TWorksData}
 */
export const getDefaultWorksData = (override?: Partial<IWorksData>): IWorksData => {
  const defaultWorksData: IWorksData = {
    isGridMode: true,
    gridProps: {} as any,
    layersMap: {},
    music: {
      title: '',
      materialId: '',
      type: 'maka',
      duration: 0,
      url: '',
      preview: '',
    },
  };
  return mergeDeep(defaultWorksData, override);
};

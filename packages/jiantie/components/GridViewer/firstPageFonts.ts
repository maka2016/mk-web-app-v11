/**
 * 从作品数据中收集第一页文字使用的裁剪字体 URL，供 SSR 预加载使用。
 * 纯函数，可在服务端执行。
 */
import type { GridRow } from '@/components/GridEditorV3/types';
import { computeCroppedFontId, getResolvedFontAttrs } from '@/components/GridEditorV3/utils/font-utils';
import type { IWorksData, LayerElemItem } from '@/components/GridEditorV3/works-store/types';

/** 递归收集 row 及其所有子孙中的 childrenIds */
function collectElemIdsFromRow(row: GridRow): string[] {
  const ids: string[] = [];
  if (row.childrenIds?.length) {
    ids.push(...row.childrenIds);
  }
  if (row.children?.length) {
    for (const child of row.children) {
      ids.push(...collectElemIdsFromRow(child));
    }
  }
  return ids;
}

/**
 * 收集第一页（第一个 row）内所有文字图层使用的裁剪字体 URL（去重）。
 * 仅在 exportFormat 包含 html 时返回非空数组，否则返回 []。
 */
export function collectFirstPageFontUrls(worksData: IWorksData): string[] {
  const gridsData = worksData?.gridProps?.gridsData;
  const layersMap = worksData?.layersMap;
  if (!Array.isArray(gridsData) || gridsData.length === 0 || !layersMap) {
    return [];
  }

  const firstRow = gridsData[0];
  const elemIds = collectElemIdsFromRow(firstRow);
  const urlSet = new Set<string>();

  for (const elemId of elemIds) {
    const layer = layersMap[elemId] as LayerElemItem | undefined;
    if (!layer || !/text/gi.test(layer.elementRef)) continue;

    const attrs = layer.attrs as { text?: string; fontFamily?: string; fontUrl?: string };
    const text = attrs?.text;
    const fontFamily = attrs?.fontFamily;
    const fontUrl = attrs?.fontUrl ?? '';
    if (!text || !fontFamily) continue;

    const { fontFamily: resolvedFamily } = getResolvedFontAttrs(fontFamily, fontUrl);
    const { url } = computeCroppedFontId(text, resolvedFamily);
    urlSet.add(url);
  }

  return Array.from(urlSet);
}

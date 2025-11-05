import { deepClone } from '@mk/utils';
import { IWorksData, LayerElemItem } from '@mk/works-store/types';
import { deepLayers } from '@mk/works-store/utils/deepLayers';
import { getCanvaInfo2 } from './provider/utils';

const allLayerMapWithCacheId: Record<
  string,
  Record<string, LayerElemItem>
> = {};

export const getAllLayers = (
  worksData: IWorksData,
  withFixedLayer = false,
  cacheId = 'default'
) => {
  if (!worksData) {
    return {};
  }
  const allLayerMap = allLayerMapWithCacheId[cacheId] || {};
  const { pages, fixedLayer } = worksData.canvasData.content;
  for (const page of pages) {
    const { layers } = page;
    deepLayers(layers, item => {
      allLayerMap[item.elemId] = deepClone(item);
    });
  }
  if (withFixedLayer) {
    deepLayers(fixedLayer, item => {
      allLayerMap[item.elemId] = deepClone(item);
    });
  }
  allLayerMapWithCacheId[cacheId] = allLayerMap;
  return allLayerMap;
};

export const getAllLayersArr = (
  worksData: IWorksData,
  withFixedLayer = false
) => {
  const { pages, fixedLayer } = worksData.canvasData.content;
  const allLayerArr: LayerElemItem[] = [];
  for (const page of pages) {
    const { layers } = page;
    deepLayers(layers, item => {
      allLayerArr.push(item);
    });
  }
  if (withFixedLayer) {
    deepLayers(fixedLayer, item => {
      allLayerArr.push(item);
    });
  }
  return allLayerArr;
};

export const getAllElementRef = (
  worksData: IWorksData,
  withFixedLayer = false
) => {
  const allElementRefMap: Record<string, string[]> = {};
  if (!worksData) {
    return allElementRefMap;
  }
  const { pages, fixedLayer } = worksData.canvasData.content;
  for (const page of pages) {
    const { layers } = page;
    deepLayers(layers, item => {
      if (!allElementRefMap[item.elementRef]) {
        allElementRefMap[item.elementRef] = [];
      }
      allElementRefMap[item.elementRef].push(item.elemId);
    });
  }
  if (withFixedLayer) {
    deepLayers(fixedLayer, item => {
      if (!allElementRefMap[item.elementRef]) {
        allElementRefMap[item.elementRef] = [];
      }
      allElementRefMap[item.elementRef].push(item.elemId);
    });
  }
  return allElementRefMap;
};

const compLoadedList: Record<number, Record<string, boolean>> = {};

export const handleWidgetDidLoaded = ({
  pageIndex,
  compId,
  compType = '',
  shouldLoadedCount,
  onAllWidgetLoaded,
}: {
  pageIndex: number;
  compId: string;
  compType?: string;
  shouldLoadedCount: number;
  onAllWidgetLoaded: () => void;
}) => {
  if (typeof compLoadedList[pageIndex] === 'undefined') {
    compLoadedList[pageIndex] = {};
  }
  if (!compLoadedList[pageIndex][compId]) {
    compLoadedList[pageIndex][compId] = true;
    // console.log(`page ${pageIndex} loaded comp: `, Object.keys(compLoadedList[pageIndex]).length)
    if (Object.keys(compLoadedList[pageIndex]).length === shouldLoadedCount) {
      onAllWidgetLoaded();
    }
  }
};

export const clearUndefinedKey = (style: React.CSSProperties = {}) => {
  const escapeKeys = ['zIndex'];
  Object.keys(style).forEach(key => {
    const val = style[key as keyof typeof style];
    // if (escapeKeys.includes(key)) {
    //   return;
    // }
    if (
      val === undefined ||
      val === null ||
      (!escapeKeys.includes(key) && +val === 0) ||
      val === ''
    ) {
      delete style[key as keyof typeof style];
    }
  });
  return style;
};

export const calcViewerHeight = () => {
  const { canvaScale } = getCanvaInfo2();
  let totalHeight = 0;
  const blockItems = document.querySelectorAll<HTMLDivElement>(
    '.Grid_container .editor_row_wrapper'
  );
  if (!blockItems) {
    console.log(
      'calcViewerHeightError',
      '找不到.Grid_container .editor_row_wrapper'
    );
    return 0;
  }
  Array.from(blockItems).forEach(item => {
    if (item) {
      // const height = item.clientHeight / canvaScale;
      const height = (item.getBoundingClientRect()?.height || 1) / canvaScale;
      // console.log("height", height);
      totalHeight += height;
    }
  });
  return totalHeight;
};

export const calcBlockHeight = (blockId: string) => {
  const { canvaScale } = getCanvaInfo2();
  const blockItems = document.querySelector<HTMLDivElement>(
    `#id-canvas .Grid_container #editor_block_${blockId}`
  );
  if (!blockItems) {
    console.log(
      'calcViewerHeightError',
      '找不到.Grid_container .editor_row_wrapper'
    );
    return 0;
  }
  const height = (blockItems.getBoundingClientRect()?.height || 1) / canvaScale;
  return height;
};

export const calcBlockHeight2 = () => {
  const { canvaScale } = getCanvaInfo2();
  const blockItems = document.querySelectorAll<HTMLDivElement>(
    `#id-canvas .block_wrapper`
  );
  if (!blockItems.length) {
    console.log(
      'calcViewerHeightError',
      '找不到.Grid_container .editor_row_wrapper'
    );
    return {};
  }
  const blockHeight: Record<string, number> = {};
  Array.from(blockItems).forEach(item => {
    blockHeight[item.dataset.rowId || ''] =
      (item.getBoundingClientRect()?.height || 1) / canvaScale;
  });
  return blockHeight as Record<string, number>;
};

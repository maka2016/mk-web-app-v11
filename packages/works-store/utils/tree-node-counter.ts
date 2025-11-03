import { IWorksData, LayerElemItem } from '../types/interface';

const widgetRelyFilter = (widgetRely: WidgetRely) => {
  delete widgetRely.MkCombination;
  delete widgetRely.GridV3;
  delete widgetRely.MkWatermark;
  delete widgetRely.MkMapV4;
  delete widgetRely.MkImageGroup_v2;
};

export type WidgetRely = Record<string, boolean>;

export const treeNodeCounter = (
  worksData: IWorksData,
  pageIndex?: number,
  defaultWidgetRely?: WidgetRely
) => {
  const { pages, fixedLayer } = worksData.canvasData.content;
  const allWidgetRely: WidgetRely =
    defaultWidgetRely ||
    {
      /** 内置组件 */
      // MkBg: true,
      // MkText: true,
      // MkPicture: true,
      // MKsvg: true,
    };
  const hasPageIndex = typeof pageIndex !== 'undefined';
  const pageCompCounter: Record<string, any> = {};
  const groupCounter: Record<string, any> = {};

  if (pages) {
    pages.forEach((pages, pageIdx) => {
      const { widgetCountInLayers, widgetRely, groupCountInLayers } =
        countPageElements(pages.layers || []);

      pageCompCounter[pageIdx] = widgetCountInLayers;
      groupCounter[pageIdx] = groupCountInLayers;

      // widgetCount += widgetCountInLayers
      Object.assign(allWidgetRely, widgetRely);
    });
  }

  // if (Array.isArray(fixedLayer)) {
  //   const { widgetCountInLayers, widgetRely, groupCountInLayers } =
  //     countPageElements(fixedLayer);

  //   pageCompCounter.fixedLayer = widgetCountInLayers;
  //   groupCounter.fixedLayer = groupCountInLayers;

  //   // widgetCount += widgetCountInLayers
  //   Object.assign(allWidgetRely, widgetRely);
  // }

  const countAllPage = (_pageCompCounter: Record<string, any>) => {
    let res = 0;
    Object.keys(_pageCompCounter).forEach(p => {
      res += _pageCompCounter[p];
    });
    return res;
  };

  widgetRelyFilter(allWidgetRely);

  return {
    widgetCount: hasPageIndex
      ? pageCompCounter[pageIndex]
      : countAllPage(pageCompCounter),
    groupCounter: hasPageIndex
      ? groupCounter[pageIndex]
      : countAllPage(groupCounter),
    pageCounter: pageCompCounter,
    allWidgetRely,
  };
};

const isArray = (arr: any[]) => Array.isArray(arr) && arr.length > 0;

export const countPageElements = (layers: LayerElemItem[]) => {
  if (!layers) {
    return {
      widgetCountInLayers: 0,
      groupCountInLayers: 0,
      widgetRely: {},
    };
  }
  let widgetCountInLayers = 0;
  let groupCountInLayers = 0;
  const widgetRely: WidgetRely = {};

  const recursive = (currLayers: LayerElemItem[]) => {
    if (isArray(currLayers)) {
      // widgetCountInLayers += currLayers.length
      currLayers.forEach(layer => {
        if (layer.elementRef != null) {
          widgetRely[layer.elementRef] = true;
          widgetCountInLayers += 1;

          if (layer.body && isArray(layer.body)) {
            // widgetCountInLayers -= 1;
            groupCountInLayers += 1;
            recursive(layer.body);
          }
        }
      });
    }
  };

  recursive(layers);
  return { widgetCountInLayers, groupCountInLayers, widgetRely };
};

const hasChild = (arr: any[]) => Array.isArray(arr) && arr.length > 0;

export const countPageElem = (layers: LayerElemItem[]) => {
  let widgetCountInLayers = 0;
  const widgetRely: WidgetRely = {};
  const recursive = (currLayers: LayerElemItem[]) => {
    if (hasChild(currLayers)) {
      widgetCountInLayers += currLayers.length;
      currLayers.forEach(layer => {
        if (layer.elementRef) {
          widgetRely[layer.elementRef] = true;
          if (layer.body && hasChild(layer.body)) {
            recursive(layer.body);
          }
        }
      });
    }
  };
  recursive(layers);
  return { widgetCountInLayers, widgetRely };
};

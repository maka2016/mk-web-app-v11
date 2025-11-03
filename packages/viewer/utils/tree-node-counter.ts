import { IWorksData, LayerElemItem, WorksPage } from '@mk/works-store/types';

const widgetRelyFilter = (widgetRely: any) => {
  delete widgetRely['MkCombination'];
};

export const treeNodeCounter = (worksData: IWorksData, pageIndex?: number) => {
  const { pages } = worksData.canvasData.content;
  let widgetCount = 0;
  let allWidgetRely = {
    Bg: true,
  };
  const hasPageIndex = typeof pageIndex !== 'undefined';
  const pageCounter: any = {};

  if (pages) {
    pages.forEach((page, pageIdx) => {
      const { widgetCountInLayers, widgetRely } = countPageElements(page);

      pageCounter[pageIdx] = widgetCountInLayers;

      // widgetCount += widgetCountInLayers
      Object.assign(allWidgetRely, widgetRely);
    });
  }

  const countAllPage = () => {
    let res = 0;
    Object.keys(pageCounter).forEach(p => {
      res += pageCounter[p];
    });
    return res;
  };

  widgetRelyFilter(allWidgetRely);

  return {
    widgetCount: hasPageIndex ? pageCounter[pageIndex] : countAllPage(),
    pageCounter,
    allWidgetRely,
  };
};

const isArray = (arr: any) => Array.isArray(arr) && arr.length > 0;

export const countPageElements = (pageData: WorksPage) => {
  if (!pageData) {
    return {
      widgetCountInLayers: 1,
      widgetRely: {},
    };
  }
  const { layers } = pageData;
  /** 默认有一个背景 */
  let widgetCountInLayers = 1;
  let widgetRely: Record<string, any> = {};

  const recursive = (currLayers: LayerElemItem[]) => {
    if (isArray(currLayers)) {
      // widgetCountInLayers += currLayers.length
      currLayers.forEach(layer => {
        if (layer.elementRef != null) {
          widgetRely[layer.elementRef] = true;
          widgetCountInLayers += 1;

          if (layer.body && isArray(layer.body)) {
            // widgetCountInLayers -= 1;
            recursive(layer.body);
          }
        }
      });
    }
  };

  recursive(layers);
  return { widgetCountInLayers, widgetRely };
};

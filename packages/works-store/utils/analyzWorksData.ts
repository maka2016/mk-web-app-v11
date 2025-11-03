import { IPositionLink, IWorksData } from '../types';
import { treeNodeCounter } from './tree-node-counter';

export interface WorksAnalyzeInfo {
  getBgData: () => any;
  widgetRelyInfo: {
    widgetCount: any;
    groupCounter: any;
    pageCounter: {};
    allWidgetRely: {};
  };
  compArr: any;
  getContainerInfo: (id: any) => IPositionLink;
}

const compLoadedList: Record<string, boolean> = {};
let worksInfo: WorksAnalyzeInfo | null = null;
let widgetLoaded = false;
let loadedWidgetCount = 0;
let analyzeCallback: ((worksInfo: WorksAnalyzeInfo) => void) | undefined;
export const initAnalyzWorksData = (
  worksData: IWorksData,
  pIdx: number,
  cb?: (worksInfo: WorksAnalyzeInfo) => void
): WorksAnalyzeInfo => {
  if (widgetLoaded) return worksInfo as WorksAnalyzeInfo;
  analyzeCallback = cb;
  if (!worksInfo) {
    worksInfo = analyzWorksData(worksData, pIdx);
  }
  return worksInfo;
};
export const didWidgetMount = (compId: string) => {
  if (!worksInfo) return;
  if (!compLoadedList[compId]) {
    compLoadedList[compId] = true;

    loadedWidgetCount += 1;
    if (loadedWidgetCount >= worksInfo.widgetRelyInfo.widgetCount - 1) {
      widgetLoaded = true;
      analyzeCallback?.(worksInfo);
    }
  }
};

const getCurrPageData = (worksData: IWorksData, pageIndex: number) => {
  if (!worksData) return {};
  const { pages } = worksData.canvasData.content;
  return pages[pageIndex] || pages[0];
};

const analyzWorksData = (
  worksData: IWorksData,
  pageIndex: number
): WorksAnalyzeInfo => {
  const getContainerInfo = (id: string) => worksData.positionLink[id];

  const widgetRelyInfo = treeNodeCounter(worksData, pageIndex);

  const getCompArr = () => {
    const { pages } = worksData.canvasData.content;
    const index = pageIndex;
    const layersDict = pages[index] || {
      layers: [],
      opacity: 1,
      background: {},
    };
    const result = ((layersDict.layers as any) || []).map(
      (item: any, idx: number) => {
        return {
          idx,
          type: item.elementRef,
          attrs: item.attrs,
          id: item.elemId,
          body: item.body,
        };
      }
    );

    return result;
  };

  const compArr = getCompArr();

  const getBgData = () => {
    const pages = getCurrPageData(worksData, pageIndex) as any;
    return pages.background;
  };

  return {
    getBgData,
    widgetRelyInfo,
    compArr,
    getContainerInfo,
  };
};

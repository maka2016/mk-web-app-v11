import { IWorksData } from '@mk/works-store/types';
import { getCurrPageData } from './tools';
import { treeNodeCounter } from './tree-node-counter';
import { ContainerInfo } from '@mk/widgets-bridge-sdk';

export const getCanvasInfo = (worksData: IWorksData) => {
  const { visualHeight, height, width } = worksData?.canvasData;

  const canvaInfo = {
    canvaH: Math.max(visualHeight, height),
    canvaW: width,
    scaleRate: 1,
    scaleZommRate: 1,
  };

  return canvaInfo;
};

export const getViewerDataHelper = (
  worksData: IWorksData,
  pageIndex: number
) => {
  const canvaInfo = getCanvasInfo(worksData);
  const getContainerInfo = (id: string) =>
    worksData.positionLink[id] as ContainerInfo;
  // const isModule = (worksData.modules || []).length > 0

  const widgetRelyInfo = treeNodeCounter(worksData, pageIndex);
  const { pages } = worksData.canvasData.content;
  const index = pageIndex;
  const pageData = pages[index] || {
    layers: [],
    opacity: 1,
    background: {},
    width: canvaInfo.canvaW,
    height: canvaInfo.canvaH,
  };

  const getCompArr = () => {
    const result = [...((pageData.layers as any) || [])].map((item, idx) => {
      return {
        idx,
        type: item.elementRef,
        attrs: item.attrs,
        id: item.elemId,
        body: item.body,
      };
    });

    return result;
  };

  const compArr = getCompArr();

  const getBgData = () => {
    const pages = getCurrPageData(worksData, pageIndex);
    return pages['background'];
  };

  return {
    canvaInfo,
    getBgData,
    widgetRelyInfo,
    compArr,
    getContainerInfo,
    width: pageData.width,
    height: pageData.height,
  };
};

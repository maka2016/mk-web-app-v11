import { IWorksData } from '@mk/works-store/types';

export const getCurrPageData = (worksData: IWorksData, pageIndex: number) => {
  const { pages } = worksData.canvasData.content;
  return pages[pageIndex] || { layers: [], opacity: 1, background: {} };
};

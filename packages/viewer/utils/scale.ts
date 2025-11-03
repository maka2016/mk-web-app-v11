import { IWorksData } from '@mk/works-store/types';

let canvasScale = 1;
export const setCanvasScale = (worksData: IWorksData) => {
  const vw = Math.max(
    document.documentElement.clientWidth || 0,
    window.innerWidth || 0
  );
  const vh = Math.max(
    document.documentElement.clientHeight || 0,
    window.innerHeight || 0
  );
  const scale = vw / worksData.canvasData.width;
  canvasScale = scale;
  return scale;
};
export const getCanvasScale = () => {
  return canvasScale;
};

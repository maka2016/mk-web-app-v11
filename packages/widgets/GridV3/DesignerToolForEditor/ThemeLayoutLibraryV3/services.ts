import { WorksDetailEntity } from '@mk/services';
import { IWorksData } from '@mk/works-store/types';
import axios from 'axios';
import { getAllLayers } from '../../comp/utils';
import { ComponentContent, GridProps } from '../../shared';
import { MaterialResourceManagerAPI } from '../MaterialResourceManager/services';

export const themePackV3CateId = 'gsds5y0ap0ss0c83lxv9chy2';

export const themePackV3Manager =
  new MaterialResourceManagerAPI<ComponentContent>(themePackV3CateId);

export const getWorksData2 = async (worksId: string) => {
  return axios.get<{
    work_data: IWorksData;
    detail: WorksDetailEntity;
  }>(`https://works-server-v2.maka.im/works/v2/data/${worksId}`);
};

export const getGridProps = (worksData: IWorksData, id: string) => {
  const allLayers = getAllLayers(worksData, false, id);
  // const layerIds = Object.keys(allLayers);
  for (const layer in allLayers) {
    const currLayer = allLayers[layer];
    if (currLayer.elementRef.includes('GridV3')) {
      if (currLayer.attrs.cellsMap) {
        // v1模版直接返回
        return;
      } else if (currLayer.attrs.gridsData) {
        return currLayer.attrs as GridProps;
      }
    }
  }
};

export const getGridPropsByWorksId = async (worksId: string) => {
  const res = await getWorksData2(worksId);
  return getGridProps(res.data.work_data, worksId || 'getGridPropsByWorksId');
};

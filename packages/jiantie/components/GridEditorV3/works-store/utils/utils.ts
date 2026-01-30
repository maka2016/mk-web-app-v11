import { mergeDeep } from '@/utils';
import { IWorksData } from '../types';

// = getUrlSearchParams({ target: "works_type" }) || "poster"
/**
 * 获得页面初始数据
 *
 * @static
 * @param {string} pageId 页面id
 * @param {number} scale 画布缩放比例
 * @return {*}  {TWorksData}
 */
export const getDefaultWorksData = (
  override?: Partial<IWorksData>
): IWorksData => {
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

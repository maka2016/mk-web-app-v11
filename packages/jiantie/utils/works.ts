import { IWorksData } from '@mk/works-store/types/interface';
import { treeNodeCounter } from '@mk/works-store/utils/tree-node-counter';

export const treeNodeCounter2 = (worksData: IWorksData, pageIndex?: number) => {
  return treeNodeCounter(worksData, pageIndex, {
    // MkBg: true,
    // MKsvg: true,
    // MkGift: true,
    // MkBulletScreen_v2: true,
    // MkHuiZhi: true
    // MkMapV3: true
  });
};

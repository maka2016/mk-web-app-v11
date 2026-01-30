import { WorksStore } from '../store';
import { AddComponentParams, IWorksData, LayerElemItem } from './interface';

export interface EditorSDK<CompProps = any, S = Record<string, any>> {
  fullSDK: WorksStore;
  getWorksData: () => IWorksData;
  changeWidgetState: (val: S) => void;
  changeCompAttr: (
    compEntityId: string,
    attrVal: Record<string, any>,
    takeSnapshot?: boolean | string,
    replace?: boolean
  ) => void;
  addComponent: (eleItem: AddComponentParams) => string;
  deleteCompEntity: (elemId: string | string[], pageIndex?: number) => void;
  onFormValueChange: (allValues: Partial<CompProps>) => void;
  duplicateComp: (
    targetId: string | string[],
    needToSelect?: boolean
  ) => string | string[];
  /** -------- get --------- */
  getLayer: (compEntityId: string) => LayerElemItem | undefined;
}

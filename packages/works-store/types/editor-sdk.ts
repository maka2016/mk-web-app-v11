import { WorksStore } from '../store';
import {
  AddComponentParams,
  ChangeCompAttrMultiParams,
  CompDidMountEmitData,
  IPositionLink,
  IWorksData,
  LayerElemItem,
  OperatorHandle,
  PositionLinkMap,
  WorksPage,
} from './interface';

export interface ChangeContainerParams {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  rotate?: number;
  opacity?: number;
}

export type ChangeContainer = (
  nextContainerInfo: ChangeContainerParams
) => void;
export type ChangeOperatorHandle = (nextVal: OperatorHandle) => void;
export type GetOperatorHandle = () => OperatorHandle;

interface StaticResParams {
  type: 'link' | 'script' | 'img' | 'File';
  url: string;
  priority?: number;
}

export interface EditorSDK<CompProps = any, S = Record<string, any>> {
  fullSDK: WorksStore;
  setWorksStyle: WorksStore['setWorksStyle'];
  didMount: (elemId: string, didMountData: CompDidMountEmitData) => void;
  getWorksData: () => IWorksData;
  setActivePageIdx: (nextIdx: number) => void;
  /** 设置图层禁用状态 */
  setLayerDisableStateBatch: (
    payload: Array<{ compEntityId: string; option: { disabled: boolean } }>
  ) => void;
  addPage: (
    index?: number,
    pageData?: WorksPage,
    positionLink?: PositionLinkMap,
    needSelectBG?: boolean
  ) => void;
  getLink: (elemId: string) => IPositionLink;
  setLinkBatch: WorksStore['setLinkBatch'];
  changeWidgetState: (val: S) => void;
  changeCompAttrMulti: (params: ChangeCompAttrMultiParams) => void;
  changeCompAttr: (compEntityId: string, attrVal: Record<string, any>) => void;
  addComponent: (
    eleItem: AddComponentParams,
    link?: IPositionLink,
    activeItem?: boolean
  ) => string;
  deleteCompEntity: (elemId: string | string[], pageIndex?: number) => void;
  onFormValueChange: (allValues: Partial<CompProps>) => void;
  duplicateComp: (
    targetId: string | string[],
    needToSelect?: boolean
  ) => string | string[];
  /** -------- get --------- */
  getLayer: (compEntityId: string) => LayerElemItem | undefined;
}

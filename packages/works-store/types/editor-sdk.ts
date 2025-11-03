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
  WorksBackground,
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
  selectLayer: (elemId: string) => void;
  didMount: (elemId: string, didMountData: CompDidMountEmitData) => void;
  copyPage: (key: number, needSelectBG: boolean) => any | undefined;
  getPageData: (pageIndex: number) => WorksPage;
  getWorksData: () => IWorksData;
  getActivePageIdx: () => number;
  setActivePageIdx: (nextIdx: number) => void;
  setPageBackground: (pageIndex: number, background: WorksBackground) => void;
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
  delPage: (index: number) => void;
  setPageOptions: (pageIdx: number, pageOptions: WorksPage['options']) => void;
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
  changePageScale: (
    pageIndex: number,
    scale: { width?: number; height?: number }
  ) => void;
  /** 更改容器大小信息 */
  changeContainer: ChangeContainer;
  changePageAndContainer: (
    nextPageInfo: {
      pageIndex: number;
      scale: { width?: number; height?: number };
    },
    nextContainerInfo: {
      id: string;
      scale: { width?: number; height?: number; x?: number; y?: number };
    }
  ) => void;
  /** 更改操作区的把手的信息 */
  changeOperatorHandle: ChangeOperatorHandle;
  /** -------- get --------- */
  getLayer: (compEntityId: string) => LayerElemItem | undefined;
  /** 获取操作区的把手信息 */
  getOperatorHandle: () => OperatorHandle;
  /** 此方法会添加到编辑器的资源请求队列，将会根据优先级发起请求，此方法会将结果缓存到cache或者indexdb，下次请求时将迅速返回 */
  getStaticResource: (info: StaticResParams) => Promise<string>;
  disableDeleteModule: (pageIndex: number, status: boolean) => void;
  hasWatermark: () => boolean;
  watermarkVersion: () => string;
}

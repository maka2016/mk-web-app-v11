import {
  CompDidMountEmitData,
  EditorSDK,
  IWorksData,
  WorksPage,
} from '@mk/works-store/types';
import { CanvaInfo, ContainerInfo } from './common';
import { EditorContext } from './editor-ctx';
import { ViewerSDKProps } from './viewer-sdk';
import { WidgetCommonAttrs } from './widget-common-attrs';

/**
 * 组件接口
 */
export interface PlatformCompProps<
  CompProps = Record<string, any>,
  WS = Record<string, any>,
> {
  /** 打点实体 */
  logger?: any;
  /** 如果是编辑器，则需要传入 */
  editorCtx?: EditorContext;
  /** 组件的实例 id */
  id: string;
  /** 组件实例的值，包含共用属性 effect */
  controledValues: WidgetCommonAttrs & CompProps;
  /** 画布信息 */
  canvaInfo: CanvaInfo;
  /** 组件和表单共享的运行时状态 */
  widgetState: WS;
  /**
   * 模块信息
   */
  pageInfo: WorksPage & { pageIndex: number };
  /** 包裹组件的容器的信息 */
  containerInfo: ContainerInfo;
  /** 生命周期 */
  lifecycle: {
    /** 响应组件 didMount 的回调 */
    didMount: (emitData: CompDidMountEmitData<Partial<CompProps>>) => void;
    /** 组件的资源完全加载完成后的回调 */
    didLoaded: () => void;
  };
  getWorksData: () => IWorksData;
  /** 编辑器 sdk */
  editorSDK?: EditorSDK<CompProps, WS>;
  /** 是否只读 */
  readonly?: boolean;
  /** viewer 传入的 sdk，海报品类不存在该属性 */
  viewerSDK?: ViewerSDKProps;
  /**
   * @deprecated
   * 废弃api，不再使用
   * 等待编辑器加载完成 ，此生命周期必须在组件didmount后调用
   */
  editorLoad?: (action: () => void) => void;
  /** 组件是否在显示页 */
  isActivePage?: boolean;
  worksType?: string;
  /** 作品规格 */
  worksSpec?: string;
  /** 是否当前展示的页面 */
  isShowPage?: boolean;
}

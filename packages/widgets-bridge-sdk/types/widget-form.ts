import React from 'react';

import {
  ChangeContainer,
  ChangeOperatorHandle,
  EditorSDK,
  LayerElemItem,
  OperatorHandle,
  WorksPage,
} from '@mk/works-store/types';
import { CanvaInfo, ContainerInfo } from './common';
import { EditorContext } from './editor-ctx';
import { WidgetCommonAttrs } from './widget-common-attrs';

type FormControledValues = Record<string, any>;

/**
 * 组件自定义表单的接口
 */
export interface CommonFormProps<
  T = FormControledValues,
  WS = Record<string, any>,
> {
  /** 打点实体 */
  logger?: any;
  /** 实例信息 */
  entityInfo: {
    /** 组件实例 id */
    id: string;
  };
  /** 组件和表单共享的运行时状态 */
  widgetState: WS;
  canvaInfo: CanvaInfo;
  pageInfo: WorksPage & { pageIndex: number };
  /** 包裹组件的容器的信息 */
  containerInfo: ContainerInfo;
  /** 受控表单的值 */
  formControledValues: WidgetCommonAttrs & T;
  /** 与编辑器的接口上下文 */
  editorCtx: EditorContext;
  /** 批量操作模式 */
  batchAttrs?: LayerElemItem[];
  editorSDK: EditorSDK<T, WS>;
  /**
   * 组件表单的值的回调 */
  onFormValueChange: (allValues: Partial<T>, layerInfo?: LayerElemItem) => void;
  /**
   * 更改容器大小信息 */
  changeContainer: ChangeContainer;
  /** 更改操作区的把手的信息 */
  changeOperatorHandle: ChangeOperatorHandle;
  /** 获取操作区的把手信息 */
  getOperatorHandle: () => OperatorHandle;
  changeModuleHeight: (nextHeight: number) => void;
  addComponentNormal?: (data: any, link?: any) => string;
  selectComp?: (compId: string) => void;
}

/**
 * 组件自定义表单的接口
 */
export interface EditableFormProps<T = FormControledValues, S = any>
  extends React.HTMLAttributes<HTMLElement>,
    CommonFormProps<T, S> {
  /**
   * @deprecated
   * 进入编辑状态（已废弃）
   */
  enterEditing?: () => void;
}

export interface EditingStateForm<T = FormControledValues>
  extends CommonFormProps<T> {
  /**
   * @deprecated
   * 退出编辑态（已废弃）
   */
  exitEditing?: () => void;
}

export interface OnContainerChangeParams {
  /** 打点实体 */
  logger?: any;
  /** 画布缩放值 */
  scale: number;
  /** 下一个 attrs 的值 */
  nextAttr: FormControledValues;
  /** 鼠标点击时的组件 attrs 快照 */
  attrSnapshot: FormControledValues;
  /** 容器变化时下一个 containerInfo */
  nextContainerInfo: ContainerInfo;
  /** 鼠标点击时的容器信息快照 */
  containerInfoSnapshot: ContainerInfo;
  /** 改组件的 id */
  widgetID: string;
  /** 操作信息 */
  scaleControlInfo: {
    direction: 'left' | 'right' | 'top' | 'bottom';
    isScaling: boolean;
  };
  onCommitChange: (nextData: {
    nextFormValue?: FormControledValues;
    nextContainerInfo?: Partial<ContainerInfo>;
  }) => void;
  /** 画布提供给组件表单的工具函数 */
  canvaUtils: {
    /** 操作编辑器的 DOM 元素 */
    setDOMStyle: (domSelector: string, style: React.CSSProperties) => void;
  };
}

export type OnContainerChangeEndParams = OnContainerChangeParams;

/**
 * 容器更改中
 */
export type OnContainerChange = (params: OnContainerChangeParams) => void;

/**
 * 容器完成更改
 */
export type OnContainerChangeEnd = (params: OnContainerChangeEndParams) => void;

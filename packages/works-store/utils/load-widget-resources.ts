import React from 'react';
import { LoadScript, getUrlSearchParams, hasUrlParam } from '@mk/utils';
import { WidgetResItem } from '@mk/widgets-bridge-sdk';
import { WidgetRely } from './tree-node-counter';

const LoadedWidgetCache: Record<string, any> = {};

let cdnPath = 'https://res.maka.im';
export const setCdnPath = (path: string) => {
  cdnPath = path;
};

export type ResourceMode = 'editor-web' | 'editor-wap' | 'viewer';
type ResourceTypes = 'comp' | 'form' | 'template';

const getLocalWidgetResource = (resource = '') => {
  const devDllUrl =
    getUrlSearchParams({ target: 'dev_dll' }) || 'http://localhost:22111';
  return `${devDllUrl}/${resource}.js`;
};

const resGateway = (ref: string, remoteResPath: string) => {
  // 移除remoteResPath第一个/，避免重复
  const _remoteResPath = remoteResPath.replace(/^\//, '');
  const _cdnPath = cdnPath.replace(/\/$/, '');
  const isUseLocalWidget = getIsUseLocalWidget();
  return isUseLocalWidget
    ? getLocalWidgetResource(ref)
    : `${_cdnPath}/${_remoteResPath}`;
};

/**
 * 加载组件 js 资源的实现，根据运行模式、资源类型返回对应的加载地址
 */
export const getWidgetResUrl = (
  widgetItem: WidgetResItem,
  type: ResourceTypes,
  mode: ResourceMode
) => {
  const { cdnPath, ref, componentMeta } = widgetItem;
  const isEditorWeb = mode === 'editor-web';
  const isViewerMode = mode === 'viewer';
  let remoteResPath = '';
  let localResPath = '';
  switch (type) {
    case 'comp':
      remoteResPath = `${cdnPath}comp.js`;
      return resGateway(ref, remoteResPath);
    case 'form':
      /** 如果是 viewer 模式，则不需要表单 */
      if (isViewerMode) return null;

      remoteResPath = `${cdnPath}${isEditorWeb ? 'form.js' : 'form-wap.js'}`;
      localResPath = isEditorWeb
        ? componentMeta.editorApply.webFormRef
        : componentMeta.editorApply.wapFormRef;
      return localResPath ? resGateway(localResPath, remoteResPath) : null;
    case 'template':
      /** 如果是 viewer 模式，则不需要表单 */
      if (isViewerMode) return null;

      const { templatesRef } = componentMeta.editorApply;
      if (!templatesRef) return null;
      remoteResPath = `${cdnPath}templates.js`;
      return remoteResPath ? resGateway(templatesRef, remoteResPath) : null;
    default:
      break;
  }
};

const getIsUseLocalWidget = () => {
  return hasUrlParam('dev_dll');
};

export interface LoadWidgetResourceParams {
  /** 组件的 meta 定义 */
  widgetMetadataColl: Record<string, WidgetResItem>;
  /** 外部缓存 */
  loadedWidgetCache: Record<string, any>;
  /** 需要加载的组件依赖 */
  widgetRely: WidgetRely;
  /** 加载模式，editor-web | editor-wap | viewer */
  mode: ResourceMode;
}

export const loadWidgetResource = (params: LoadWidgetResourceParams) => {
  const {
    loadedWidgetCache,
    widgetMetadataColl,
    widgetRely = {},
    mode,
  } = params;
  return new Promise<any>((resolve, reject) => {
    if (!widgetMetadataColl) return;

    const isEditorMode = mode !== 'viewer';

    // // 收集使用到的组件，统一加载
    const widgetResourcesColl: Record<string, boolean> = {};

    Object.keys(widgetRely).forEach(type => {
      if (type && !loadedWidgetCache[type]) {
        widgetResourcesColl[type] = true;
      }
    });

    const loadFunc = Object.keys(widgetResourcesColl).map(elementRef => {
      if (!elementRef) return Promise.all([]);
      const metaItem = widgetMetadataColl[elementRef];
      if (!metaItem) {
        console.warn(`找不到 metaItem ${elementRef}`);
        return Promise.all([]);
      }

      /** 编辑态的组件 */
      const compUrl = getWidgetResUrl(metaItem, 'comp', mode);
      const formUrl = getWidgetResUrl(metaItem, 'form', mode);
      const promiseQueue = [
        /** 加载组件实例 */
        LoadScript({ src: `${compUrl}`, id: `script_${elementRef}Comp` }),
        /** 如果是编辑器模式，加载组件的表单实例 */
        isEditorMode && formUrl
          ? LoadScript({ src: `${formUrl}`, id: `script_${elementRef}Form` })
          : null,
      ].filter(Boolean);

      return Promise.all(promiseQueue);
    });

    const registerWidget = (LoadedWidgetCache: Record<string, any>) => {
      Object.keys(LoadedWidgetCache).forEach(widgetRef => {
        // ;(window as any)['widgetRef'] =
        const remoteModule = (window as any)[widgetRef]?.default;
        if (typeof remoteModule === 'function') {
          // console.log(widgetRef, remoteModule, typeof remoteModule)
          (window as any)[widgetRef] = React.memo(remoteModule);
          // console.log(widgetRef,(window as any)[widgetRef])
        }
      });
    };

    if (loadFunc.length > 0) {
      Promise.all(loadFunc)
        .then(() => {
          Object.assign(
            LoadedWidgetCache,
            widgetRely,
            widgetResourcesColl,
            loadedWidgetCache
          );
          // console.log('LoadedWidgetCache :>> ', LoadedWidgetCache)
          registerWidget(LoadedWidgetCache);
          resolve(Object.assign({}, LoadedWidgetCache)); // 需要切断原型，否则影响外层的 state
        })
        .catch(err => {
          console.error('loadWidgetResource error', err);
          reject(err);
        });
    } else {
      reject(new Error('没有需要加载的组件')); // 需要切断原型，否则影响外层的 state
    }
  });
};

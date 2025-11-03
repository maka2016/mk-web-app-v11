import { EditorContext } from '@mk/widgets-bridge-sdk/types';
import appBridge from '@mk/app-bridge';
import React, { useEffect, useState } from 'react';
import { getPageId, getWorksDetailStatic, WebBridge } from '@mk/services';
import { toJS } from 'mobx';
import { getStore } from '../useStore';
import { showSelector } from '@/components/showSelector';

export interface UseEditorContextRes {
  /** 是否已准备好 */
  ready: boolean;
  /** platform ctx, 作用于编辑器与插件的数据通讯 */
  EditorContext: EditorContext;
}

export const editorContext = new EditorContext({
  ui: {
    ShadowForm: () => <></>,
    ColorPicker: () => <></>,
    BorderRadiusForm: () => <></>,
    FontFamilySelector: () => <></>,
    ColorInput: () => <></>,
    ColorSelector: () => <></>,
    MaskForm: () => <></>,
    ContentForm: () => <></>,
    EffectForm: () => <></>,
    PhoneAlbum: () => <></>,
  },
  utils: {
    showSelector: selectorParams => {
      // console.log(`showSelectorEvent`, selectorParams)
      // EventEmitter.emit("showSelectorEvent", selectorParams);
      showSelector(selectorParams as any);
    },
    scaleToggle: (status: boolean) => {
      getStore().setScaleStatus(status);
      return true;
    },
    getWorksID: () => getPageId(),
    deleteElem: () => {
      // getStore().escCurrentControl()
      const { controlComp, activeLayerId, worksData } = getStore();
      const { positionLink } = worksData;
      if (controlComp !== activeLayerId) {
        getStore().setActivItemByID(controlComp);
        getStore().setAreaComps([]);
      } else {
        const controlDict = positionLink[controlComp];
        if (!controlDict) return;
        if (controlDict.parentId) {
          getStore().setActivItemByID(controlDict.parentId);
          getStore().setControlComp(controlDict.parentId);
        } else {
          // store.setActivItemByID("")
          // store.setControlComp("")
        }
      }
      getStore().deleteActiveCompEntity();
    },
    saveImgToSystem: url => {
      appBridge.appCall({
        type: 'MKSaveImage',
        params: {
          url,
        },
      });
    },
    getPagesLength: () => {
      const { pages } = getStore().worksData.canvasData.content;
      const arr = Object.keys(toJS(pages));
      return arr.length;
    },
    getCurrentPage: () => {
      return getStore().pageIndex;
    },
    navToPage: url => {
      WebBridge.getShell()?.call('topage', {
        url,
      });
      appBridge.navToPage({ url: url, type: 'URL' });
    },
  },
});

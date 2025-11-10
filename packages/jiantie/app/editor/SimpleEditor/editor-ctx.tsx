import { showSelector } from '@/components/showSelector';
import appBridge from '@mk/app-bridge';
import { getPageId, WebBridge } from '@mk/services';
import { EditorContext } from '@mk/widgets-bridge-sdk/types';
import { toJS } from 'mobx';
import { getStore } from '../useStore';

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
    getWorksID: () => getPageId(),
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

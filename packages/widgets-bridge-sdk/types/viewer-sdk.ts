import axios from 'axios';
import { HasWatermark } from './common';

export interface wechatShareInfo {
  title?: string;
  desc?: string;
  url?: string;
  thumb?: string;
}

/** viewer能力接口 */
export interface ViewerSDKProps<CompProps = Record<string, any>> {
  sendLog: (p: any) => void;
  viewerController?: {
    gotoPage?: (n: number) => void;
    lockPagePan?: () => void;
    unlockPagePan?: () => void;
    stopBgMusic?: () => void;
    resumeBgMusic?: () => void;
    playSoundEffect?: () => void;
    reconfigWechatShare?: (config: wechatShareInfo) => void;
  };
  workInfo?: {
    getWorksID?: () => string;
    getUID?: () => string;
    getType?: () => string;
    getWorksTitle?: () => string;
  };
  // server层需要根据cookie做策略
  wechatInfo?: {
    getOpenID?: () => string;
    getWxAvatarThumb?: () => string;
    getUnionId?: () => string;
    getNickname?: () => string;
    getClientMakaUid?: () => string;
    getHasAuth?: () => boolean;
  };
  network?: {
    request: typeof axios;
    /** 请求的地址 */
    api: string;
  };
  ui: {
    notify: (
      msg: string,
      options?: {
        type: 'info' | 'success' | 'error' | 'promise' | 'base';
      }
    ) => void;
  };
  appBridge?: {
    userInfo: () => any;
    navToPage: (params: Record<string, any>) => void;
  };
  emitMsg?: (msgType: string, payload: any) => void;
  getTrackInfo?: (eventType: string) => any;
  urlQueryHasChange?: () => void;
  watermarkVersion: () => string;
  hasWatermark: HasWatermark;
  handleWatermarkEvent: (eventType: 'click' | 'show') => void;
}

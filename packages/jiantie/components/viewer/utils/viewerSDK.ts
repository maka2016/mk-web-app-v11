import CommonLogger from '@mk/loggerv7/logger';
import { watermarkVersion } from '@mk/services';
import { EventEmitter, isMakaAppClient } from '@mk/utils';
import { ViewerSDKProps, wechatShareInfo } from '@mk/widgets-bridge-sdk/types';
import { IWorksData } from '@mk/works-store/types';
import React from 'react';
import toast from 'react-hot-toast';
import { getWechatInfo, updateWechatShare } from '../components/wechat';

const viewerSDKCTX = React.createContext<ViewerSDKProps | null>(null);

export interface CreateViewerSDKCTXerOptions {
  uid: string;
  worksId: string;
  worksTitle: string;
  hasWorksWatermark: boolean;
  worksData: IWorksData;
}

class ViewerSDKClass {
  options: CreateViewerSDKCTXerOptions;
  get wechatInfo() {
    return getWechatInfo();
  }
  constructor(options: CreateViewerSDKCTXerOptions) {
    this.options = options;
  }
  maTrack = () => {
    console.log(`mama maTrack`);
  };
  getWorksData = () => {
    return this.options.worksData;
  };
  viewerController = {
    gotoPage: (num: number) => {
      // toPageCall(num)
      const objStr = JSON.stringify({ type: 'showPageForce', index: num });
      window.postMessage(objStr, '*');
    },
    lockPagePan: () => {},
    unlockPagePan: () => {},
    reconfigWechatShare: (obj: wechatShareInfo) => {
      //viewerSDKCTX.viewerController.reconfigWechatShare @陈工
      const newConfig: Record<string, string> = {};
      if (obj?.title) {
        newConfig.title = obj?.title;
      }
      if (obj?.desc) {
        newConfig.content = obj?.desc;
      }
      if (obj?.thumb) {
        newConfig.wxThumb = obj?.thumb;
      }
      if (obj?.url) {
        newConfig.link = obj?.url;
      }
      updateWechatShare(newConfig);
    },
    stopBgMusic: () => {
      EventEmitter.emit('stopMusic', '');
    },
    resumeBgMusic: () => {
      EventEmitter.emit('resumeMusic', '');
    },
  };
  hasWatermark = () => {
    return !!this.options.hasWorksWatermark;
  };
  watermarkVersion = () => watermarkVersion();
  handleWatermarkEvent = (eventType: 'click' | 'show') => {
    if (!isMakaAppClient()) {
    }
  };
  sendLog = CommonLogger.track;
  workInfo = {
    getUID: () => {
      return this.options.uid;
    },
    getWorksID: () => {
      return this.options.worksId;
    },
    getType: () => {
      return 'h5';
    },
    getWorksTitle: () => {
      return this.options.worksTitle;
    },
  };

  ui = {
    notify: (msg: string, options: any) => {
      let _t;
      let _msg = msg;
      let _options = {};
      switch (options?.type) {
        case 'success':
          _t = toast.success;
          break;
        case 'error':
          _t = toast.error;
          break;
        case 'info':
          _t = toast;
          _msg = toast(msg);
          _options = {
            style: {
              borderRadius: '8px',
              background: 'rgba(0, 0, 0, 0.88)',
              color: '#fff',
            },
          };
          break;
        default:
          _t = toast;
          break;
      }

      _t(() => _msg, _options);
    },
  };
  appBridge = {
    userInfo: () => {
      return {};
    },
    navToPage: (params: Record<string, any>) => {},
  };
  emitMsg = (msgType: string) => {
    console.log('表单提交了', msgType);
  };
  getTrackInfo = () => {
    // return this.options.trackInfo?.(eventType as EventType, {})
  };
  urlQueryHasChange = () => {
    EventEmitter.emit('urlQueryHasChange', {});
  };
}

let viewerSDK: ViewerSDKClass;

export const getViewerSDK = () => {
  return viewerSDK;
};

export const createViewerSDKCTXer = (options: CreateViewerSDKCTXerOptions) => {
  viewerSDK = new ViewerSDKClass(options);

  return viewerSDK;
};

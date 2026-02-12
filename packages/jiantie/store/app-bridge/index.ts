// import './style'
import { queryToObj, setCookie } from '@/utils';
import { isMakaAppAndroid, isMakaAppClient, isMakaAppIOS } from './devices';

type invokeType =
  | 'MKBack'
  | 'MKRouter'
  | 'MKUserInfo'
  | 'MKAppVersion'
  | 'MKPageClose'
  | 'MKReloadUserInfo'
  | 'MKLog'
  | 'MKLogOut'
  | 'MKSaveImage'
  | 'MKAlbumList'
  | 'MKPhotoList'
  | 'MKPhotoSelected'
  | 'MKAlbumAuthStatus'
  | 'MKAlbumAuthSetting'
  | 'MKTypeCheck'
  | 'MKCamera'
  | 'MKVibrate'
  | 'MKUserTrialVip'
  | 'MKShare'
  | 'MKReloadWorkList'
  | 'MKUserWakeOpenNotiPermission'
  | 'MKFeatureSupportList'
  | 'MkVideoDownload'
  | 'MKUserAPPPermission'
  | 'MkFileDownload'
  | 'MKSupportAi'
  | 'MKCheckPhoneNum'
  | 'MkOpenAppKefu'
  | 'MKLogBaseInfoBack'
  | 'MKLogin'
  | 'MKPageRefreshFnName'
  | 'MKPageRefreshPageWhenNeeded'
  | 'MKLanguageInfo'
  | 'MKGooglePay'
  | 'MKShareMiniP'
  | 'MkShareDouyinVideo'
  | 'MKAPPModal'
  | 'MKAPPCloseModal'
  | 'MkShareWechatVideo'
  | 'MKDeviceInfo';

type appRuntime = 'ANDROID' | 'IOS' | 'MINIPROGRAM'; // ?runtime=ANDROID

interface appInvokeParamsType {
  type: invokeType;
  appid?: string;
  params?: Record<string, any>;
  jsCbFnName?: string;
}
interface QueryObj {
  runtime?: appRuntime;
}

interface navDataType {
  type: 'NATIVE' | 'URL' | 'REFRESH_URL';
  url: string;
}

let appFeatureSupportList: string[] | null = null;

const logInfo: any = {};

export default class APPBridge {
  static setLogInfo(nextData: Record<string, any>) {
    Object.assign(logInfo, nextData);
  }

  static isRN(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    return typeof window !== 'undefined' && (window as any)?.ReactNativeWebView !== undefined;
  }

  static gotoMyWorksList() {
    APPBridge.navToPage({
      url: `maka://home/works/worksActivity`,
      type: 'NATIVE',
    });
  }

  static getAppFeatureSupportList() {
    return appFeatureSupportList;
  }

  static featureDetect(featureKeys: string[]) {
    return new Promise<Record<string, boolean>>((resolve, reject) => {
      const checkIsEnable = (cbParams: string[]) => {
        if (!appFeatureSupportList) {
          appFeatureSupportList = cbParams;
        }
        const result: Record<string, boolean> = {};
        featureKeys.forEach(key => {
          if (Array.isArray(cbParams) && cbParams?.includes(key)) {
            result[key] = true;
          }
        });
        resolve(result);
      };

      if (appFeatureSupportList) {
        checkIsEnable(appFeatureSupportList);
      } else {
        if (!APPBridge.judgeIsInApp()) {
          checkIsEnable([]);
        } else {
          APPBridge.appCall(
            {
              type: 'MKFeatureSupportList',
              appid: 'jiantie',
              params: {},
              jsCbFnName: 'appBridgeOnFeatureDetectCb',
            },
            (cbParams: string[]) => {
              console.log('111111111');
              checkIsEnable(cbParams);
            },
            1000
          );
        }
      }
    });
  }

  static judgeIsInApp(): boolean {
    // return true
    const urlParams: QueryObj = queryToObj();
    if (urlParams?.runtime) {
      return urlParams?.runtime === 'ANDROID' || urlParams?.runtime === 'IOS';
    } else if (isMakaAppClient()) {
      return true;
    } else {
      return false;
    }
  }

  static judgeIsInMiniP(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    return (window as any)?.__wxjs_environment === 'miniprogram';
  }

  static setShareInfo2MiniP(info: { title: string; imageUrl: string; path: string }): void {
    if (!APPBridge.judgeIsInMiniP()) {
      return;
    }
    const wx = (window as any).wx;

    wx.miniProgram.postMessage({
      data: {
        type: 'setShareData',
        ...info,
      },
    });
  }

  static setUtmInfo(utmInfo: {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
  }): void {
    if (APPBridge.judgeIsInMiniP()) {
      const wx = (window as any).wx;

      wx?.miniProgram?.postMessage({
        data: {
          type: 'setUtmInfo',
          utmInfo: {
            ...utmInfo,
          },
        },
      });
      return;
    }
    setCookie('utmInfo', JSON.stringify(utmInfo));
  }

  static getRuntime(): appRuntime | false {
    const urlParams: QueryObj = queryToObj();
    if (urlParams?.runtime === 'ANDROID' || urlParams?.runtime === 'IOS') {
      return urlParams?.runtime;
    } else if (isMakaAppIOS()) {
      return 'IOS';
    } else if (isMakaAppAndroid()) {
      return 'ANDROID';
    } else if (APPBridge.judgeIsInMiniP()) {
      return 'MINIPROGRAM';
    } else return false;
  }

  static minipNav(type: 'redirect' | 'navigate', url: string) {
    if (!APPBridge.judgeIsInMiniP()) {
      return;
    }

    const wx = (window as any).wx;
    if (type === 'navigate') {
      wx.miniProgram.navigateTo({ url: url });
    } else if (type === 'redirect') {
      wx.miniProgram.redirectTo({ url: url });
    }
  }

  static miniPlogin(encodedUrl?: string): void {
    if (!APPBridge.judgeIsInMiniP()) {
      return;
    }
    // 监听小程序返回的数据
    if (encodedUrl) {
      APPBridge.minipNav('navigate', `/pages/login/index?webUrl=${encodedUrl}`);
    } else {
      APPBridge.minipNav('navigate', `/pages/login/index`);
    }
  }

  static navToPage(params: Record<string, any>) {
    return APPBridge.appCall({
      type: 'MKRouter',
      params,
    });
  }

  static navAppBack() {
    return APPBridge.appCall({
      type: 'MKBack',
    });
  }

  static vibrate() {
    // const WINDOW = window as any
    // if(!this.judgeIsInApp()){
    //      return null
    // }
    // else if (!WINDOW?.nativeApi) {
    //     console.warn(`do not have nativeApi`)
    // }
    // else if (WINDOW?.nativeApi?.onBridgeVibrate) {
    //     WINDOW?.nativeApi?.onBridgeVibrate()
    // }
  }

  static async init() {
    const WINDOW = window as any;
    if (!APPBridge.judgeIsInApp()) {
      return false;
    }
    await this.prepareToken();
    this.featureDetect([]);
    WINDOW.onJSBridgeBack = () => {
      return false;
    };
    return true;
  }

  static regAppBackCb(fn: () => void) {
    if (!APPBridge.judgeIsInApp()) {
      return false;
    }
    // 注册返回劫持
    const WINDOW = window as any;
    WINDOW.onJSBridgeBack = fn;
  }

  static async prepareToken() {
    return APPBridge.appCall(
      {
        type: 'MKUserInfo',
        params: {},
        jsCbFnName: 'appBridgeOnUserInfoCb',
      },
      cbParams => {
        const urlParams: QueryObj = queryToObj();
        const userInfo = cbParams;
        if (userInfo.token) {
          sessionStorage.setItem('editor_token', userInfo.token);
          if (isMakaAppAndroid() || urlParams?.runtime === 'ANDROID') {
            // 新判断
            if (!userInfo.vipInfo) {
              sessionStorage.setItem('editor_vip', '0');
            } else {
              sessionStorage.setItem('editor_vip', userInfo?.vipInfo && userInfo?.vipInfo?.level > 0 ? '1' : '0');
            }
          } else if (isMakaAppIOS() || urlParams?.runtime === 'IOS') {
            if (!userInfo.vipInfo) {
              sessionStorage.setItem('editor_vip', '0');
            } else {
              sessionStorage.setItem('editor_vip', userInfo && userInfo.vipInfo ? '1' : '0');
            }
          }
        }
      },
      1000
    );
  }

  // APP异步回调方法大一统封装，流程为JS调用app方法，传入参数和cb方法名，app响应后再调用cb方法作为异步回调
  static async appCall(appParams: appInvokeParamsType, jsFn?: (params?: any | null) => void, timeout = 1000) {
    if (!APPBridge.judgeIsInApp()) {
      return false;
    }
    const WINDOW = window as any;
    const jsCbFnName = appParams?.jsCbFnName;
    let timer: NodeJS.Timeout;
    const isInRN = typeof WINDOW?.ReactNativeWebView !== 'undefined';

    const appInvoke = () => {
      if ((this.getRuntime() === 'IOS' || isMakaAppIOS()) && WINDOW?.webkit?.messageHandlers?.APP_INVOKE?.postMessage) {
        // console.log('调用bridge',appParams.type)
        WINDOW?.webkit?.messageHandlers?.APP_INVOKE?.postMessage(JSON.stringify(appParams));
      } else if ((this.getRuntime() === 'ANDROID' || isMakaAppAndroid()) && WINDOW?.nativeApi?.APP_INVOKE) {
        WINDOW?.nativeApi?.APP_INVOKE(JSON.stringify(appParams));
      } else if (isInRN) {
        // alert(JSON.stringify(appParams));
        // console.log("RN call");
        WINDOW?.ReactNativeWebView?.postMessage(JSON.stringify(appParams));
      } else {
        console.warn('no invoke fn');
      }
    };
    if (!jsCbFnName) {
      // 不需要回调函数时直接调用
      appInvoke();
      return true;
    } else {
      // 有回调函数时设置超时
      const cbTimeout = new Promise((resolve, reject) => {
        timer = setTimeout(() => {
          resolve(false);
          if (jsCbFnName) {
            // console.log(`${jsCbFnName}重置为null`)
            WINDOW[jsCbFnName] = null;
          }
          console.log('cbTimeout');
          jsFn?.(null);
        }, timeout);
      });

      const appCb = new Promise((resolve, reject) => {
        if (jsCbFnName) {
          WINDOW[jsCbFnName] = (cbParams: any) => {
            // console.log(`调用${jsCbFnName}`)
            let params = cbParams;
            if (typeof cbParams === 'string') {
              params = JSON.parse(cbParams);
            } else if (typeof cbParams === 'object') {
              params = cbParams;
            }
            jsFn?.(params);
            resolve(params);
            clearTimeout(timer);
          };
        }
        appInvoke();
      });
      return await Promise.race([appCb, cbTimeout]);
    }
  }
}

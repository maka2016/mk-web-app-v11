import { getDistinctId } from '@mk/loggerv7/logger';
import { WechatClientInfo } from '../../types/interface';
import { getCookie } from '../../utils/helper';
import { isWechat } from '@mk/utils';

const defaultAvatar =
  'https://makapicture.oss-cn-beijing.aliyuncs.com/cdn/viewer/default_wx_avatar.png';

class WechatInfo {
  // ma?:MA
  isReady: boolean;
  isNeedWxAuth: boolean;
  private wechatClientInfo: WechatClientInfo;

  constructor() {
    this.isReady = false;
    this.isNeedWxAuth = false;
    this.wechatClientInfo = {
      wechatName: '微信昵称',
      wxAvatar: defaultAvatar,
      openId: getDistinctId(),
    };
  }

  /**
   * 跳转到微信授权
   */
  init() {
    this.clinetInit();
  }
  clinetInit = () => {
    const _isReady = !!getCookie('nickname') && isWechat();
    if (_isReady) {
      this.isReady = _isReady;
    }
    if (this.isNeedWxAuth && !this.isReady) {
      /** 如果需要微信授权，但是又没有登陆，需要等待被主动调用 */
      console.error(
        'viewer需要微信授权，请通过 jumpToAuth 方法跳转到微信授权页。'
      );
      return;
    }

    this.wechatClientInfo = {
      wechatName: decodeURIComponent(getCookie('nickname') || '微信昵称'),
      wxAvatar: decodeURIComponent(getCookie('thumb') || defaultAvatar),
      openId: getCookie('openId') || getDistinctId(),
      unionId: getCookie('unionId') || getDistinctId(),
    };

    // this.isReady = true
    /** 如果已经授权过了 */
    // if (this.isReady) return
    // if (!getCookie('nickname') && isWechat()) {
    //   this.jumpToAuth()
    //   return
    // } else {
    // }
  };

  getWechatClientInfo = () => {
    return this.wechatClientInfo;
  };

  jumpToAuth() {
    const authHost = `https://works.maka.im/works/api/v1/wechat/oauth`;
    console.log('wxpreset url参数(decode前)', location.href);
    console.log(
      'wxpreset url参数(decode后)',
      encodeURIComponent(location.href)
    );
    const wxpresetUrl = `${location.origin}/wxpreset?url=${encodeURIComponent(location.href)}`;
    const authUrl = `${authHost}?url=${encodeURIComponent(wxpresetUrl)}&config=maka_gzh`;
    window.location.href = authUrl;
    //https://works.maka.im/works/api/v1/wechat/oauth?url=https%3A%2F%2Fu601373011.viewer.maka.im%2Fwx%2Fpreset%2F601373011%2FZL6GDT6LW601373011%2Fu601373011.viewer.maka.im%3Ftime%3D1636542209478&config=maka_gzh
  }

  setNeedAuth = (nextVal: boolean) => {
    this.isNeedWxAuth = nextVal;
  };

  /** 给组件使用的 */
  getNickname = () => {
    if (this.isNeedWxAuth && !this.isReady) {
      this.setNeedAuth(true);
      this.clinetInit();
    }
    return this.wechatClientInfo?.wechatName;
  };
  getWxAvatarThumb = () => {
    if (this.isNeedWxAuth && !this.isReady) {
      this.setNeedAuth(true);
      this.clinetInit();
    }
    return this.wechatClientInfo?.wxAvatar;
  };
  getOpenID = () => {
    if (this.isNeedWxAuth && !this.isReady) {
      this.setNeedAuth(true);
      this.clinetInit();
    }
    return this.wechatClientInfo?.openId;
  };
  getHasAuth = () => {
    return this.isReady;
  };
  /** 给组件使用的 */
}

let wechatInfo: WechatInfo;

export const getWechatInfo = () => {
  if (!wechatInfo) {
    wechatInfo = new WechatInfo();
    wechatInfo.init();
  }
  return wechatInfo;
};

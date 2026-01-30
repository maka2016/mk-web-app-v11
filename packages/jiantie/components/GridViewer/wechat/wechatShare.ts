import { API, cdnApi } from '@/services';
import { isWechat, queryToObj } from '@/utils';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface WxConfig {
  appId: string;
  signature: string;
  nonceStr: string;
  timestamp: number;
  url: string;
}

const getWXkey = (config: string, url: string) => {
  return axios.get<WxConfig>(
    `${API('apiv10')}/wechat/jsapi-signature?config=${config}&url=${url}`
    // `https://wxsign.maka.im/wechatsign`
  );
};

interface IShare {
  shareType: 'WT' | 'WF';
}

function getWxThumb(thumb: string) {
  return cdnApi(thumb, {
    resizeWidth: 120,
    resizeHeight: 120,
  });
  // return transformImgUrl(thumb, {
  //   width: 120,
  //   height: 120,
  //   fit: "cover"
  // })
}

/**
 * 移除 URL 中的 page 参数
 */
function removePageParam(url: string): string {
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.delete('page');
    return urlObj.toString();
  } catch {
    // 如果 URL 解析失败，尝试简单的字符串替换
    return url.replace(/[?&]page=\d+/g, '').replace(/&page=\d+/g, '');
  }
}

interface Wxconfig {
  title?: string;
  desc?: string;
  wxThumb?: string;
  link?: string;
}

type Cb = (obj: IShare) => any;

interface WechatShareOptions {
  shortLink?: string;
  specialQuery?: Record<string, any>;
  currHash?: string;
}

export const wechatShare = (
  worksDetail: {
    title: string;
    desc: string;
    cover: string;
  },
  options?: WechatShareOptions
) => {
  const { shortLink, specialQuery, currHash } = options || {};
  return new Promise<IShare>(resolve => {
    const { title, desc, cover } = worksDetail;

    const wxThumb = getWxThumb(cover || '');
    const params = queryToObj();
    let link = `${window.location.origin}${window.location.pathname}`;

    if (currHash) {
      link += `?pre_hash=${currHash}`;
    }
    for (let i in params) {
      // 排除 pre_hash 和 page 参数
      if (i !== 'pre_hash' && i !== 'page') {
        if (link.indexOf('?') === -1) {
          link += `?${i}=${params[i]}`;
        } else {
          link += `&${i}=${params[i]}`;
        }
      }
    }

    configWechat(
      { title, desc, wxThumb, link },
      obj => {
        resolve(obj);
      },
      shortLink,
      specialQuery
    );
  });
};

let tempConfig: Wxconfig = {};
let wxKeyStatus: 'init' | 'loading' | 'loaded' | 'error' = 'init';
let wxReadyPromise: Promise<void> | null = null;

function getWx() {
  return (window as any)?.wx as
    | {
        config: (args: any) => void;
        ready: (cb: () => void) => void;
        error: (cb: (err: any) => void) => void;
        updateAppMessageShareData: (args: any) => void;
        updateTimelineShareData: (args: any) => void;
      }
    | undefined;
}

function ensureWechatReady(): Promise<void> {
  if (!isWechat()) return Promise.resolve();
  if (wxReadyPromise) return wxReadyPromise;

  wxReadyPromise = new Promise<void>((resolve, _reject) => {
    const wx = getWx();
    if (!wx) {
      wxKeyStatus = 'error';
      _reject(new Error('window.wx 不存在（微信 JS-SDK 未注入）'));
      return;
    }

    // 如果之前已 load 过，直接等 ready（避免重复请求签名）
    if (wxKeyStatus === 'loaded') {
      wx.ready(() => resolve());
      return;
    }

    wxKeyStatus = 'loading';
    const url = encodeURIComponent(location.href.split('#')[0]);
    const candidateConfigs = ['jiantie', 'maka_gzh'];

    const attemptConfig = async (configName: string) => {
      const wxRes = await getWXkey(configName, url);
      const wxdata = wxRes.data;
      if (!wxdata) {
        throw new Error(`微信签名接口返回为空（config=${configName}）`);
      }

      if (wxDebug()) {
        alert(JSON.stringify(wxRes));
        alert('wx:');
        alert(JSON.stringify(wx));
      }

      await new Promise<void>((attemptResolve, attemptReject) => {
        let settled = false;

        wx.error(err => {
          if (settled) return;
          settled = true;
          attemptReject(err);
        });

        wx.ready(() => {
          if (settled) return;
          settled = true;
          attemptResolve();
        });

        wx.config({
          debug: wxDebug(),
          appId: wxdata.appId,
          timestamp: wxdata.timestamp,
          nonceStr: wxdata.nonceStr,
          signature: wxdata.signature,
          jsApiList: [
            'openLocation',
            'getLocation',
            'onMenuShareTimeline',
            'onMenuShareAppMessage',
            'onMenuShareQQ',
            'onMenuShareWeibo',
            'onMenuShareQZone',
            'updateAppMessageShareData',
            'updateTimelineShareData',
          ],
          openTagList: ['wx-open-launch-weapp'],
        });
      });
    };

    (async () => {
      let lastErr: any = null;
      for (const configName of candidateConfigs) {
        try {
          await attemptConfig(configName);
          wxKeyStatus = 'loaded';
          resolve();
          return;
        } catch (err) {
          lastErr = err;
          console.error(
            `[wechatShare] wx init failed (config=${configName})`,
            err
          );
        }
      }

      wxKeyStatus = 'error';
      _reject(lastErr || new Error('微信初始化失败'));
    })();
  });

  return wxReadyPromise;
}

export const configWechat = (
  wxconfig: Wxconfig,
  cb?: Cb,
  shortLink?: string,
  specialQuery?: Record<string, any>
) => {
  tempConfig = Object.assign(tempConfig, wxconfig);
  const { title, desc: content, wxThumb, link } = tempConfig;

  // 兼容：configWechat 不再手写一套签名+ready 流程，统一走 ensureWechatReady
  if (!isWechat()) return;

  void ensureWechatReady()
    .then(() => {
      const wx = getWx();
      if (!wx) return;

      const q = specialQuery || {};
      const queryStr = Object.keys(q).length
        ? `?${Object.keys(q)
            .map(k => `${k}=${q[k]}`)
            .join('&')}`
        : '';

      wx.updateAppMessageShareData({
        title: title, // 分享标题
        desc: content, // 分享描述
        link: shortLink ? `${shortLink}-WF${queryStr}` : link, // 分享链接
        imgUrl: cdnApi(wxThumb || '', {
          resizeWidth: 120,
          resizeHeight: 120,
        }), // 分享图标
        success: function () {
          cb?.({ shareType: 'WF' });
        },
        fail: function (err: any) {
          console.error('[wechatShare] updateAppMessageShareData fail:', err);
        },
      });

      wx.updateTimelineShareData({
        title: title, // 分享标题
        desc: content, // 分享描述
        link: shortLink ? `${shortLink}-WT${queryStr}` : link, // 分享链接
        imgUrl: cdnApi(wxThumb || '', {
          resizeWidth: 120,
          resizeHeight: 120,
        }), // 分享图标
        success: function () {
          cb?.({ shareType: 'WT' });
        },
        fail: function (err: any) {
          console.error('[wechatShare] updateTimelineShareData fail:', err);
        },
      });
    })
    .catch(err => {
      console.error('[wechatShare] configWechat ensureWechatReady error:', err);
    });
};

export const updateWechatShare = (wxconfig: Wxconfig) => {
  tempConfig = Object.assign(tempConfig, wxconfig);
  const { title, desc: content, wxThumb, link } = tempConfig;
  // 移除 link 中的 page 参数
  const linkWithoutPage = link ? removePageParam(link) : link;

  if (isWechat()) {
    // 关键：update 前确保已 wx.config 且 ready
    void ensureWechatReady()
      .then(() => {
        const wx = getWx();
        if (!wx) return;

        wx.updateAppMessageShareData({
          title: title, // 分享标题
          desc: content, // 分享描述
          link: linkWithoutPage, // 分享链接（已移除 page 参数）
          imgUrl: cdnApi(wxThumb || '', {
            resizeWidth: 120,
            resizeHeight: 120,
          }), // 分享图标
          success: function () {
            console.log('分享朋友更新成功');
          },
          fail: function (err: any) {
            console.error('[wechatShare] updateAppMessageShareData fail:', err);
            toast.error('更新微信分享信息失败（好友）');
          },
        });

        wx.updateTimelineShareData({
          title: title, // 分享标题
          desc: content, // 分享描述（部分版本可忽略，但传了更稳）
          link: linkWithoutPage, // 分享链接（已移除 page 参数）
          imgUrl: cdnApi(wxThumb || '', {
            resizeWidth: 120,
            resizeHeight: 120,
          }), // 分享图标
          success: function () {
            console.log('分享朋友圈更新成功');
          },
          fail: function (err: any) {
            console.error('[wechatShare] updateTimelineShareData fail:', err);
            toast.error('更新微信分享信息失败（朋友圈）');
          },
        });
      })
      .catch(err => {
        console.error('[wechatShare] ensureWechatReady error:', err);
        const msg =
          err?.errMsg || err?.message || (typeof err === 'string' ? err : '');
        toast.error(
          msg
            ? `微信初始化失败，无法更新分享信息：${msg}`
            : '微信初始化失败，无法更新分享信息'
        );
      });
  }
};

function wxDebug() {
  const params = queryToObj();
  return !!(params && params.wxdebug);
}

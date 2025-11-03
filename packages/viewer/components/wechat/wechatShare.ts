import { API, WorksDetailEntity } from '@mk/services';
import { isWechat, queryToObj } from '@mk/utils';
import axios from 'axios';

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
  return thumb;
  // return transformImgUrl(thumb, {
  //   width: 120,
  //   height: 120,
  //   fit: "cover"
  // })
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
  worksDetail: WorksDetailEntity,
  options: WechatShareOptions
) => {
  const { shortLink, specialQuery, currHash } = options;
  return new Promise<IShare>((resolve, reject) => {
    const { title, desc, cover, id } = worksDetail as any;

    const wxThumb = getWxThumb(cover || '');
    const params = queryToObj();
    let link = `${window.location.origin}${window.location.pathname}`;

    if (currHash) {
      link += `?pre_hash=${currHash}`;
    }
    for (let i in params) {
      if (i !== 'pre_hash') {
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
export const configWechat = (
  wxconfig: Wxconfig,
  cb?: Cb,
  shortLink?: string,
  specialQuery?: Record<string, any>
) => {
  tempConfig = Object.assign(tempConfig, wxconfig);
  const { title, desc: content, wxThumb, link } = tempConfig;

  const wxDebug = () => {
    const params = queryToObj();
    if (params && params.wxdebug) {
      return true;
    } else return false;
  };

  if (isWechat() && wxKeyStatus !== 'loading' && wxKeyStatus !== 'loaded') {
    wxKeyStatus = 'loading';
    getWXkey('jiantie', encodeURIComponent(location.href.split('#')[0]))
      .then(wxRes => {
        const wxdata = wxRes.data;
        console.log('wxdata', wxdata);
        if (!wxdata) return;
        const wx = (window as any)?.wx;

        if (wxDebug()) {
          alert(JSON.stringify(wxRes));
          alert('wx:');
          alert(JSON.stringify(wx));
        }
        if (!wxRes.data) return;
        wx?.config({
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
        let queryStr = '';
        for (const k in specialQuery) {
          queryStr += `&${k}=${specialQuery[k]}`;
        }
        queryStr = queryStr.replace('&', '?');
        wx?.ready(function () {
          wx.updateAppMessageShareData({
            title: title, // 分享标题
            desc: content, // 分享描述
            link: shortLink ? `${shortLink}-WF${queryStr}` : link, // 分享链接
            imgUrl: wxThumb, // 分享图标
            success: function () {
              // shareCallback('appMessage')
              console.log('分享朋友成功');
              wxKeyStatus = 'loaded';
              cb?.({
                shareType: 'WF',
              });
            },
            cancel: function () {
              // 用户取消分享后执行的回调函数
            },
          });

          wx.updateTimelineShareData({
            title: title, // 分享标题
            desc: content, // 分享描述
            link: shortLink ? `${shortLink}-WT${queryStr}` : link, // 分享链接
            imgUrl: wxThumb, // 分享图标
            success: function () {
              // shareCallback('timeline')
              console.log('分享朋友圈成功');
              wxKeyStatus = 'loaded';
              cb?.({
                shareType: 'WF',
              });
            },
            cancel: function () {
              // 用户取消分享后执行的回调函数
            },
          });
        });
      })
      .catch(err => {
        console.log('err', err);
        wxKeyStatus = 'error';
      });
  }
};

export const updateWechatShare = (wxconfig: Wxconfig) => {
  tempConfig = Object.assign(tempConfig, wxconfig);
  const { title, desc: content, wxThumb, link } = tempConfig;

  if (isWechat()) {
    const wx = (window as any)?.wx;
    wx.onMenuShareAppMessage({
      title: title, // 分享标题
      desc: content, // 分享描述
      link: link, // 分享链接
      imgUrl: wxThumb, // 分享图标
      type: '', // 分享类型,music、video或link，不填默认为link
      configUrl: '', // 如果type是music或video，则要提供数据链接，默认为空
      success: function () {
        console.log('分享朋友成功');
      },
      cancel: function () {
        // 用户取消分享后执行的回调函数
      },
    });

    wx.onMenuShareTimeline({
      title: title, // 分享标题
      link: link, // 分享链接
      imgUrl: wxThumb, // 分享图标
      success: function () {
        console.log('分享朋友圈成功');
      },
      cancel: function () {
        // 用户取消分享后执行的回调函数
      },
    });
  }
};

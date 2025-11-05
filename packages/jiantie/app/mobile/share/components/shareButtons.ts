import APPBridge from '@mk/app-bridge';
import { imageUrlToBase64, toOssMiniPCoverUrl } from '@/utils';
import toast from 'react-hot-toast';
import { onScreenShot } from '@/components/GridV3/shared';
import { CanvaInfo2 } from '@/components/GridV3/comp/provider/utils';
import { isAndroid } from '@mk/utils';

export type ShareEnv = {
  // runtime & capability
  isApp: boolean;
  isOversea: boolean;
  isMiniP: boolean;
  appCanShareMiniP: boolean;

  // content support
  websiteSupport?: boolean;
  posterSupport?: boolean;
  videoSupport?: boolean;
  showVideoDowload: boolean;

  // work info
  appid: string;
  workId: string;
  canvaInfo2?: CanvaInfo2;

  // share data
  shareTitle: string;
  shareContent: string;
  shareLink: string;
  shareIcon: string;

  // external helpers
  popupShareTips: (type: string) => void | Promise<void>;
  popupMiniPTips: (type: string) => void | Promise<void>;
  onExportVideo: () => void | Promise<void>;
  checkShare: (worksId: string) => boolean | Promise<boolean>;
};

export type ShareButton = {
  key: string;
  label: string;
  icon: string;
  onClick: () => Promise<void>;
  enable: boolean;
  async?: boolean;
  object_type: string;
  object_id: string;
};

const isSupportSharePosterFunc = async () => {
  if (isAndroid()) {
    let APPLETSV2Enable = await APPBridge.featureDetect(['WechatSharePoster']);
    return APPLETSV2Enable.WechatSharePoster;
  } else {
    return true;
  }
};
export function buildShareButtons(env: ShareEnv): ShareButton[] {
  const {
    isApp,
    isOversea,
    isMiniP,
    appCanShareMiniP,
    websiteSupport,
    posterSupport,
    videoSupport,
    showVideoDowload,
    appid,
    workId,
    canvaInfo2,
    shareTitle,
    shareContent,
    shareLink,
    shareIcon,
    popupShareTips,
    popupMiniPTips,
    onExportVideo,
  } = env;

  const generatePosterImages = async (): Promise<string[] | undefined> => {
    if (!canvaInfo2) {
      toast.error('画布信息获取失败');
      return;
    }
    toast.loading('图片生成中');
    const { viewportWidth, canvaVisualHeight = 1, viewportScale } = canvaInfo2;
    const screenshotWidth = viewportWidth;
    const screenshotHeight = viewportScale * canvaVisualHeight;
    const res = await onScreenShot({
      id: workId,
      width: screenshotWidth,
      height: screenshotHeight,
      appid,
    }).catch(() => {
      toast.error('图片生成失败');
    });
    toast.dismiss();
    return res;
  };

  const shareWechat = async (to: 'wechat' | 'wechatTimeline') => {
    const isSupportPosterImgShare = await isSupportSharePosterFunc();
    if (!shareTitle) {
      toast.error('请填写作品主题');
      return;
    }
    // 全局执行锁在外层 main.tsx 维护，这里仅返回 Promise
    if (websiteSupport) {
      APPBridge.appCall({
        type: 'MKShare',
        appid: 'jiantie',
        params: {
          title: shareTitle,
          content: shareContent,
          thumb: shareIcon,
          type: 'link',
          shareType: to,
          url: shareLink,
        },
      });
      return;
    }

    if (posterSupport) {
      if (isSupportPosterImgShare) {
        // APP支持海报分享的情况;
        const urls = await generatePosterImages();
        if (!urls || urls.length === 0) return;
        APPBridge.appCall({
          type: 'MKShare',
          appid: 'jiantie',
          params: {
            title: shareTitle,
            type: 'images',
            shareType: to,
            urls,
          },
        });
        return;
      } else {
        //降级为链接分享
        APPBridge.appCall({
          type: 'MKShare',
          appid: 'jiantie',
          params: {
            title: shareTitle,
            content: shareContent,
            thumb: shareIcon,
            type: 'link',
            shareType: to,
            url: shareLink,
          },
        });
      }
    }

    if (videoSupport) {
      await onExportVideo();
      return;
    }
    toast.error('当前内容不支持分享');
  };

  const shareViaMiniProgram = async () => {
    // 全局执行锁在外层 main.tsx 维护，这里仅返回 Promise
    const base64 = await imageUrlToBase64(toOssMiniPCoverUrl(shareIcon));
    APPBridge.appCall({
      type: 'MKRouter',
      appid: 'jiantie',
      params: {
        type: 'APPLETSV2',
        path: `pages/viewer/index?url=${encodeURIComponent(shareLink)}&works_id=${workId}`,
        userName: appid === 'xueji' ? 'gh_63de5d64f1cd' : 'gh_8255ff6e659c',
        title: shareTitle,
        description: shareContent,
        imageUrl: toOssMiniPCoverUrl(shareIcon),
        hdImageData: base64,
        webpageUrl: shareLink,
        withShareTicket: 'true',
        miniprogramType: '0',
        scene: '0',
      },
    });
  };

  const openMiniPTimeline = () => {
    // 全局执行锁在外层 main.tsx 维护，这里仅返回 Promise
    if (appid === 'xueji') {
      const url = `/pages/viewer/index?url=${encodeURIComponent(shareLink)}&works_id=${workId}&from=share`;
      APPBridge.minipNav('navigate', url);
      return;
    }
    const url = `/pages/timeline/index?title=${encodeURIComponent(shareTitle)}&desc=${encodeURIComponent(shareContent)}&cover=${encodeURIComponent(shareIcon)}&url=${encodeURIComponent(shareLink)}`;
    APPBridge.minipNav('navigate', url);
  };

  return [
    // App 内微信好友
    {
      key: 'wechat',
      label: '微信',
      icon: 'https://img2.maka.im/cdn/webstore10/jiantie/icon_weixin.png',
      onClick: async () => {
        await shareWechat('wechat');
      },
      enable: isApp && !isOversea && !isMiniP,
      async: true,
      object_type: 'share_wechat_btn',
      object_id: workId,
    },

    // App 内朋友圈
    {
      key: 'wechat_timeline',
      label: '朋友圈',
      icon: 'https://img2.maka.im/cdn/webstore10/jiantie/icon_pengyouquan.png',
      onClick: async () => {
        await shareWechat('wechatTimeline');
      },
      enable: isApp && !isOversea && !isMiniP,
      async: true,
      object_type: 'share_wechat_timeline_btn',
      object_id: workId,
    },

    // App 内小程序卡片分享（当支持 APPLETSV2）
    {
      key: 'wechat_applet',
      label: '小程序',
      icon: 'https://res.maka.im/cdn/webstore10/jiantie/%E5%BE%AE%E4%BF%A1%E5%B0%8F%E7%A8%8B%E5%BA%8F.png',
      onClick: async () => {
        await shareViaMiniProgram();
      },
      enable:
        isApp && !isOversea && !isMiniP && appCanShareMiniP && appid !== 'maka',
      async: true,
      object_type: 'share_wechat_applet_btn',
      object_id: workId,
    },
    // 小程序内分享（触发右上角）
    {
      key: 'minip_share',
      label: '分享',
      icon: 'https://img2.maka.im/cdn/webstore10/jiantie/icon_weixin.png',
      onClick: async () => {
        await Promise.resolve(popupMiniPTips('wechat'));
      },
      enable: isMiniP,
      async: false,
      object_type: 'share_minip_share_btn',
      object_id: workId,
    },
    // 小程序内朋友圈（跳转到对应页面）
    {
      key: 'minip_timeline',
      label: '朋友圈',
      icon: 'https://img2.maka.im/cdn/webstore10/jiantie/icon_pengyouquan.png',
      onClick: async () => {
        await Promise.resolve(openMiniPTimeline());
      },
      enable: isMiniP,
      async: false,
      object_type: 'share_minip_timeline_btn',
      object_id: workId,
    },

    // 复制链接（非小程序）
    {
      key: 'copy_link',
      label: '复制链接',
      icon: 'https://img2.maka.im/cdn/webstore10/jiantie/icon_lianjie.png',
      onClick: async () => {
        await Promise.resolve(popupShareTips('copyLink'));
      },
      enable: !isMiniP && !!websiteSupport,
      async: false,
      object_type: 'share_copy_link_btn',
      object_id: workId,
    },
    // 系统更多分享（仅海外 App）
    {
      key: 'system_more',
      label: '更多',
      icon: '',
      onClick: async () => {
        await Promise.resolve(popupShareTips('system'));
      },
      enable: isApp && isOversea,
      async: false,
      object_type: 'share_system_more_btn',
      object_id: workId,
    },
  ];
}

export function buildExportButtons(env: ShareEnv): ShareButton[] {
  const {
    isMiniP,

    posterSupport,
    videoSupport,
    showVideoDowload,
    workId,

    popupShareTips,
    onExportVideo,
  } = env;

  return [
    // 海报下载（非小程序，需支持图片导出）
    {
      key: 'poster_download',
      label: '长图',
      icon: 'https://res.maka.im/cdn/webstore10/jiantie/icon_poster.png',
      onClick: async () => {
        await Promise.resolve(popupShareTips('sreenshot'));
      },
      enable: !isMiniP && !!posterSupport,
      async: true,
      object_type: 'share_poster_download_btn',
      object_id: workId,
    },
    // 导出视频（非小程序，需支持视频导出且客户端支持下载能力）
    {
      key: 'export_video',
      label: '导出视频',
      icon: 'https://img2.maka.im/cdn/webstore10/jiantie/icon_video_v2.png',
      onClick: async () => {
        await onExportVideo();
      },
      enable: !!videoSupport && !!showVideoDowload,
      async: false,
      object_type: 'share_export_video_btn',
      object_id: workId,
    },
  ];
}

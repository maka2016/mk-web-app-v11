import { riskCheck } from '@/services';
import APPBridge from '@/store/app-bridge';
import { toOssMiniPCoverUrl } from '@/utils';
import toast from 'react-hot-toast';

export type ShareEnv = {
  // runtime & capability
  isApp: boolean;
  showVideoDowload: boolean;
  // work info
  appid: string;
  workId: string;

  // share data
  shareTitle: string;
  shareContent: string;
  shareLink: string;
  shareIcon: string;
  // external helpers
  popupShareTips: (type: string) => void | Promise<void>;
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

export function buildShareButtons(env: ShareEnv): ShareButton[] {
  const { isApp, workId, shareTitle, shareContent, shareLink, shareIcon, popupShareTips } = env;

  const shareWechat = async (to: 'wechat' | 'wechatTimeline') => {
    if (!shareTitle) {
      toast.error('请填写作品主题');
      return;
    }

    riskCheck({
      works_id: workId,
    });

    // 全局执行锁在外层 main.tsx 维护，这里仅返回 Promise
    APPBridge.appCall({
      type: 'MKShare',
      params: {
        title: shareTitle,
        content: shareContent,
        thumb: toOssMiniPCoverUrl(shareIcon),
        type: 'link',
        shareType: to,
        url: shareLink,
      },
    });
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
      enable: isApp,
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
      enable: isApp,
      async: true,
      object_type: 'share_wechat_timeline_btn',
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
      enable: true,
      async: false,
      object_type: 'share_copy_link_btn',
      object_id: workId,
    },
    // 系统更多分享（仅海外 App）
    // {
    //   key: "system_more",
    //   label: "更多",
    //   icon: "",
    //   onClick: async () => {
    //     await Promise.resolve(popupShareTips("system"));
    //   },
    //   enable: isApp,
    //   async: false,
    //   object_type: "share_system_more_btn",
    //   object_id: workId,
    // },
  ];
}

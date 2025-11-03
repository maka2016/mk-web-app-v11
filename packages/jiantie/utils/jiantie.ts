import { activitiveStore } from '@/store';
import APPBridge from '@mk/app-bridge';
import { isIOS, isMakaAppAndroid, isMakaAppIOS, queryToObj } from '@mk/utils';
import { getUrlWithParam, isClient } from '.';
import { getAppId, getUid } from '@/services';
import router from 'next/router';

function gotoShoppingList({
  workId,
  previewUrl = '',
  isVideo = false,
  hideExport = false,
  showPosterWatermark = false,
  templateType = 'poster',
  forward_page_name = `${isIOS() ? 'ios_v7_' : 'android_v7_'}editor`,
  share_panel_title = '',
  share_with_wm_btn_text = '带水印分享',
  up_to_vip_btn_text = '升级会员去水印',
  worksType = 'poster',
  appid = 'jiantie',
}: {
  workId: string;
  previewUrl?: string;
  isVideo?: boolean;
  hideExport?: boolean;
  showPosterWatermark?: boolean;
  templateType?: string;
  forward_page_name?: string;
  share_panel_title?: string;
  share_with_wm_btn_text?: string;
  up_to_vip_btn_text?: string;
  worksType?: string;
  appid?: string;
}) {
  const query = queryToObj();

  switch (worksType) {
    case 'longH5':
    case 'h5':
      // share_panel_title = "会员链接长期有效"
      share_with_wm_btn_text = '发布临时链接';
      up_to_vip_btn_text = '升级会员获取长期链接';
      templateType = 'maka';
      break;

    default:
      break;
  }

  const queryObj = {
    workId,
    previewUrl,
    isVideo: isVideo ? '1' : '0',
    hideExport: hideExport ? '1' : '0',
    forward_page_name,
    templateType,
    share_panel_title,
    share_with_wm_btn_text,
    up_to_vip_btn_text,
    parent_page_type: query.parent_page_type || '',
    ref_page_id: query.ref_page_id || '',
    showPosterWatermark: showPosterWatermark ? '1' : '0',
    appid,
  };
  const queryStr = new URLSearchParams(queryObj).toString();
  console.log(
    'gotoShoppingList url:',
    `maka://materialShoppingList?${queryStr}`
  );
  APPBridge.navToPage({
    url: `maka://materialShoppingList?${queryStr}`,
    type: 'NATIVE',
  });
}

export const toVipPage = async (payload?: any) => {
  try {
    if (isClient() === false) {
      return;
    }
    const IAPPAYCheck = await APPBridge.featureDetect(['RNIAPPAY']);
    // ✅ 如果原生支持 IAPPAY
    if (IAPPAYCheck?.RNIAPPAY) {
      activitiveStore.setVipShow(true, payload);
      return;
    } else if (getAppId() === 'maka' && !APPBridge.isRN()) {
      console.log('maka vip----');
      gotoShoppingList({
        workId: payload?.works_id,
        worksType: payload?.vipType,
        appid: payload?.editor_version === 7 ? 'maka' : 'jiantie',
      });
      return;
    }
    // ✅ Maka App 中的 iOS 原生跳转
    else if (isMakaAppIOS?.()) {
      const shareUrl = payload?.works_id
        ? `${location.origin}/mobile/share?works_id=${payload.works_id}&uid=${getUid()}`
        : '';
      APPBridge.navToPage({
        url: `maka://home/vip/vipActivity?templateType=poster&worksId=${payload?.works_id}&ref_object_id=${payload?.ref_object_id}&shareUrl=${shareUrl}`,
        type: 'NATIVE',
      });
      return;
    }
    // ✅ iOS 小程序用户，引导跳转
    else if (
      getAppId() !== 'jiantie' &&
      isIOS?.() &&
      APPBridge.judgeIsInMiniP()
    ) {
      APPBridge.minipNav('navigate', `/pages/iosguide/index`);
      return;
    } else {
      // ✅ 其他情况：H5 或 Android 小程序
      activitiveStore.setVipShow(true, payload);
    }
  } catch (error) {
    console.error('跳转 VIP 页面失败:', error);
    activitiveStore.setVipShow(true, payload);
  }
};

export const navigateToVipPage = async (payload?: any) => {
  try {
    if (isClient() === false) {
      return;
    }

    //RN环境下，打开网页
    const isInRN = typeof (window as any)?.ReactNativeWebView !== 'undefined';
    if (isInRN) {
      // toVipPage()
      APPBridge.navToPage({
        url: `${location.origin}/mobile/vip?is_full_screen=1`,
        type: 'URL',
      });
    } else if (isMakaAppIOS?.()) {
      const shareUrl = payload?.works_id
        ? `${location.origin}/mobile/share?works_id=${payload.works_id}&uid=${getUid()}`
        : '';
      APPBridge.navToPage({
        url: `maka://home/vip/vipActivity?templateType=poster&worksId=${payload?.works_id}&ref_object_id=${payload?.template_id}&shareUrl=${shareUrl}`,
        type: 'NATIVE',
      });
      return;
    }
    // ✅ iOS 小程序用户，引导跳转
    else if (
      getAppId() !== 'jiantie' &&
      isIOS?.() &&
      APPBridge.judgeIsInMiniP()
    ) {
      APPBridge.minipNav('navigate', `/pages/iosguide/index`);
      return;
    } else if (isMakaAppAndroid()) {
      APPBridge.navToPage({
        url: `${location.origin}/mobile/vip?is_full_screen=1`,
        type: 'URL',
      });
      return;
    } else {
      // ✅ 其他情况：H5 或 Android 小程序
      // activitiveStore.setVipShow(true, payload);
      location.href = `${location.origin}/mobile/vip?appid=${getAppId()}`;
    }
  } catch (error) {
    console.error('跳转 VIP 页面失败:', error);
    location.href = `${location.origin}/mobile/vip?appid=${getAppId()}`;
  }
};

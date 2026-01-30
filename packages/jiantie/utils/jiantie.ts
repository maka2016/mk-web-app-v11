import { getAppId, getUid } from '@/services';
import { activitiveStore, getShareUrl, type VipShowData } from '@/store';
import APPBridge from '@/store/app-bridge';
import { isIOS, queryToObj } from '@/utils';
import axios from 'axios';
import { isClient } from '.';

interface GotoShoppingListParams {
  workId: string;
  previewUrl?: string;
  isVideo?: boolean;
  hideExport?: boolean;
  showPosterWatermark?: boolean;
  /**
   * poster: 海报
   * maka: 全站会员
   */
  templateType?: 'poster' | 'maka';
  forward_page_name?: string;
  share_panel_title?: string;
  share_with_wm_btn_text?: string;
  up_to_vip_btn_text?: string;
  worksType?: 'h5' | 'longH5' | 'video' | 'poster';
  appid?: string;
}

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
}: GotoShoppingListParams) {
  const query = queryToObj();

  switch (worksType) {
    case 'longH5':
    case 'h5':
      // share_panel_title = "会员链接长期有效"
      share_with_wm_btn_text = '发布临时链接';
      up_to_vip_btn_text = '升级会员获取长期链接';
      // 用于显示全站会员？
      templateType = 'maka';
      break;

    default:
      break;
  }

  const queryObj = {
    workId,
    previewUrl,
    isVideo: isVideo ? '1' : '0',
    hideExport: '1',
    forward_page_name,
    templateType,
    share_panel_title,
    share_with_wm_btn_text: '',
    up_to_vip_btn_text,
    parent_page_type: query.parent_page_type || '',
    ref_page_id: query.ref_page_id || '',
    showPosterWatermark: showPosterWatermark ? '1' : '0',
    appid,
  };
  const queryStr = new URLSearchParams(queryObj).toString();
  console.log(
    'gotoShoppingListUrl:',
    `maka://materialShoppingList?${queryStr}`
  );
  APPBridge.navToPage({
    url: `maka://materialShoppingList?${queryStr}`,
    type: 'NATIVE',
  });
}

export const toVipPage = async (payload?: VipShowData) => {
  try {
    if (!isClient()) {
      return;
    }

    const IAPPAYCheck = await APPBridge.featureDetect(['RNIAPPAY']);
    // ✅ 如果原生支持 IAPPAY
    if (IAPPAYCheck?.RNIAPPAY) {
      activitiveStore.setVipShow(true, payload);
      return;
    }
    if (
      getAppId() === 'maka' &&
      !APPBridge.isRN() &&
      APPBridge.judgeIsInApp()
    ) {
      //临时处理关键行为打点
      try {
        const url = `https://apiv10.maka.im/promotion/v1/conversion/unified/user/${getUid()}/game-addiction`;
        axios.post(url, {
          timeout: 2000,
          verify: false,
          json: [],
        });
      } catch (error) {}

      console.log('maka vip----');
      gotoShoppingList({
        previewUrl: payload?.previewUrl || getShareUrl(payload?.works_id || ''),
        // `https://www.jiantieapp.com/viewer2/${payload?.works_id || ''}?appid=${getAppId()}`,
        workId: payload?.works_id || '',
        worksType: payload?.works_type || 'h5',
        appid: payload?.editor_version === 7 ? 'maka' : 'jiantie',
      });
      return;
    }
    if (
      // ✅ iOS 小程序用户，引导跳转
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

'use client';

import { getAppId, getUid } from '@/services';
import APPBridge from '@/store/app-bridge';
import { useRouter } from 'next/navigation';

/**
 * 分享相关路由跳转 Hook
 * 统一封装作品分享、视频分享、海报分享的跳转逻辑（区分 App / H5 / 小程序）
 */
export function useShareNavigation() {
  const router = useRouter();

  /**
   * 跳转到视频分享页
   * App 内使用 APPBridge 打开，剪贴小程序内走 minipNav，其他场景走 H5 路由
   * @param worksId 作品 ID
   */
  const toVideoShare = (worksId: string) => {
    const appid = getAppId();
    const uid = getUid();
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}/mobile/video-share?works_id=${worksId}&is_full_screen=1`,
        type: 'URL',
      });
    } else if (appid === 'jiantie' && APPBridge.judgeIsInMiniP()) {
      APPBridge.minipNav(
        'navigate',
        `/pages/videoshare/index?works_id=${worksId}&uid=${uid}`
      );
    } else {
      router.push(`/mobile/video-share?works_id=${worksId}&appid=${appid}`);
    }
  };

  /**
   * 跳转到海报分享页
   * App 内使用 APPBridge 打开，剪贴小程序内走 minipNav，其他场景走 H5 路由
   * @param worksId 作品 ID
   */
  const toPosterShare = (worksId: string) => {
    const uid = getUid();
    const appid = getAppId();

    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}/mobile/poster-share?works_id=${worksId}&is_full_screen=1`,
        type: 'URL',
      });
    } else if (appid === 'jiantie' && APPBridge.judgeIsInMiniP()) {
      APPBridge.minipNav(
        'navigate',
        `/pages/imageshare/index?works_id=${worksId}&uid=${uid}`
      );
    } else {
      router.push(`/mobile/poster-share?works_id=${worksId}&appid=${appid}`);
    }
  };

  return { toVideoShare, toPosterShare };
}

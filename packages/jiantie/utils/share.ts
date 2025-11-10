'use client';

import { getAppId, getUid } from '@/services';
import APPBridge from '@mk/app-bridge';
import { useRouter } from 'next/navigation';
import { getUrlWithParam } from '.';

export function useShareNavigation() {
  const router = useRouter();

  const toShare = (works_id: string, isRsvp = false) => {
    const appid = getAppId();
    const uid = getUid();
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}/mobile/share?works_id=${works_id}&uid=${uid}&is_full_screen=1&back=true`,
        type: 'URL',
      });
    } else {
      router.push(
        getUrlWithParam(
          `/mobile/share?works_id=${works_id}&uid=${uid}&appid=${appid}`,
          'clickid'
        )
      );
    }
  };

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

  return { toVideoShare, toPosterShare, toShare };
}

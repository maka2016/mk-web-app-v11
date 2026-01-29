import APPBridge from '@/store/app-bridge';

export interface RouterLike {
  push: (href: string) => void;
  replace: (href: string) => void;
  back?: () => void;
}

export interface NavigateWithBridgeOptions {
  path: string;
  router: RouterLike;
  replace?: boolean;
  fullScreen?: boolean;
}

export const navigateWithBridge = ({
  path,
  router,
  replace,
  fullScreen = true,
}: NavigateWithBridgeOptions) => {
  if (APPBridge.judgeIsInApp() && typeof window !== 'undefined') {
    const url = new URL(path, window.location.origin);
    if (fullScreen && !url.searchParams.has('is_full_screen')) {
      url.searchParams.set('is_full_screen', '1');
    }
    APPBridge.navToPage({
      url: url.toString(),
      type: 'URL',
    });
    return;
  }

  if (replace) {
    router.replace(path);
  } else {
    router.push(path);
  }
};

export const backWithBridge = (router: { back: () => void }) => {
  if (APPBridge.judgeIsInApp()) {
    APPBridge.navAppBack();
    return;
  }
  router.back();
};

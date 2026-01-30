export const isMakaAppClient = () => {
  const ua = window.navigator.userAgent;
  if (isIOS() || isAndroid()) {
    return /MAKA_IOS/i.test(ua) || /MAKA_Android/i.test(ua);
  }
  return false;
};

export const isMakaAppAndroid = () => {
  const ua = window.navigator.userAgent;
  if (isAndroid()) {
    return /MAKA_Android/i.test(ua);
  }
  return false;
};

export const isMiniProgram = () => {
  const ua = window.navigator.userAgent;
  return /miniprogram/i.test(ua.toLowerCase());
};

export const isMakaAppIOS = () => {
  const ua = window.navigator.userAgent;
  if (isIOS()) {
    return /MAKA_IOS/i.test(ua);
  }
  return false;
};

export const isAndroid = () => {
  const ua = window.navigator.userAgent;
  return /Android/i.test(ua);
};

export const isAlipay = () => {
  const ua = window.navigator.userAgent;
  return /Alipay/i.test(ua);
};

export const isUCBrowser = () => {
  const ua = window.navigator.userAgent;
  return /UCWEB|UCBrowser/i.test(ua);
};

export const setDocumentTitle = (title: string) => {
  if (!navigator || !navigator.userAgent) {
    return;
  }
  document.title = title;
  const ua = navigator.userAgent;
  if (/\bMicroMessenger\/([\d\\.]+)/.test(ua) && /ip(hone|od|ad)/i.test(ua)) {
    const i = document.createElement('iframe');
    i.src = '/favicon.ico';
    i.style.display = 'none';
    i.onload = function () {
      setTimeout(() => {
        i.remove();
      }, 9);
    };
    document.body.appendChild(i);
  }
};
export function isIOS() {
  if (typeof window === 'undefined') {
    return false;
  }
  const ua = window.navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) {
    return true;
  } else {
    return isIPadOS();
    // return navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /MacIntel/.test(navigator.platform);
  }
}

export function isIPadOS() {
  return (
    navigator.maxTouchPoints &&
    navigator.maxTouchPoints > 2 &&
    /MacIntel/.test(navigator.platform)
  );
}
/**
 * 判断浏览器环境，只能在客户端环境判断
 * @returns
 */
export const isWechat = () => {
  const ua = window.navigator.userAgent;
  return /MicroMessenger/i.test(ua);
};

export const getRuntime = () => {
  return isIOS() ? 'IOS' : 'ANDROID';
};

/**
 * 根据 userAgent 判断是否为PC端（SSR安全）
 * 支持鸿蒙手机检测，基于最佳实践实现
 * @param userAgent - User Agent 字符串
 * @returns {boolean} true表示PC端，false表示移动端
 */
export const isPcByUA = (userAgent?: string): boolean => {
  // 没有 userAgent，默认认为是PC
  if (!userAgent) {
    return true;
  }

  // 移动设备 User Agent 特征模式
  const mobilePatterns = [
    /Android/i,
    /webOS/i,
    /iPhone/i,
    /iPad/i,
    /iPod/i,
    /BlackBerry/i,
    /IEMobile/i,
    /Opera Mini/i,
    /Mobile/i,
    /Phone/i,
    // 鸿蒙手机
    /HarmonyOS/i,
    // 其他移动设备
    /Windows Phone/i,
    /Kindle/i,
    /Silk/i,
    /mobi/i,
  ];

  // 检查 User Agent 是否匹配移动设备
  const isMobileUA = mobilePatterns.some(pattern => pattern.test(userAgent));

  return !isMobileUA;
};

/**
 * 判断当前设备是否为PC端
 * 支持鸿蒙手机检测，基于最佳实践实现
 * @returns {boolean} true表示PC端，false表示移动端
 */
export const isPc = () => {
  // 服务器端渲染或非浏览器环境，默认认为是PC
  if (typeof navigator === 'undefined' || !navigator.userAgent) {
    return true;
  }

  const ua = navigator.userAgent;

  // 使用 isPcByUA 进行基础判断
  const isPcUA = isPcByUA(ua);

  if (!isPcUA) {
    return false;
  }

  // 使用现代 API 辅助判断
  if (
    typeof navigator.maxTouchPoints !== 'undefined' &&
    navigator.maxTouchPoints > 0
  ) {
    // 触摸设备可能是移动端，但需要结合屏幕尺寸判断
    // 小屏幕触摸设备很可能是移动端
    if (typeof window !== 'undefined' && window.screen) {
      const screenWidth = window.screen.width;
      const screenHeight = window.screen.height;
      const minDimension = Math.min(screenWidth, screenHeight);

      // 屏幕最小边小于768px且支持触摸，很可能是移动设备
      if (minDimension < 768) {
        return false;
      }
    }
  }

  return true;
};

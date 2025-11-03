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

import { getCookie, queryToObj } from '@/utils';
import en from './en.json';
import zh from './zh-CN.json';

const i18nModule = (() => {
  let initialized = false;
  const namespace = 'GridV3';

  const loadScript = (src: string) => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  const addResourceBundle = async (namespace: string, zh: any, en: any) => {
    const { i18next } = window as any;

    if (!i18next?.isInitialized) {
      setTimeout(() => {
        addResourceBundle(namespace, zh, en);
      }, 200);
      return;
    }

    await Promise.all([
      i18next.addResourceBundle('zh-CN', namespace, zh, true, true),
      i18next.addResourceBundle('en', namespace, en, true, true),
    ]);
  };

  const initI18next = async () => {
    if (initialized) {
      return;
    }

    const { __i18nextInitialized } = window as any;
    (window as any).__i18nextInitialized = true;

    if (!(window as any).i18next && !__i18nextInitialized) {
      await Promise.all([
        loadScript('https://res.maka.im/cdn/mori-store/js/i18next.js'),
      ]);
    }

    const language = queryToObj().lang || getCookie('NEXT_LOCALE') || 'zh-CN';
    const { i18next } = window as any;

    if (!i18next?.isInitialized && !__i18nextInitialized) {
      await i18next.init({
        lng: language,
        fallbackLng: 'zh-CN',
        debug: false,
        interpolation: {
          escapeValue: false,
        },
      });
    }

    await addResourceBundle(namespace, zh, en);

    initialized = true;
  };

  const translate = (key: string) => {
    const { i18next } = window as any;
    return i18next?.t(key, { ns: namespace });
  };

  const changeLanguage = (lng: string) => {
    const { i18next } = window as any;
    i18next.changeLanguage(lng);
  };

  return {
    init: initI18next,
    changeLanguage,
    t: translate,
    get initialized() {
      return initialized;
    },
  };
})();

// 导出模块
export default i18nModule;

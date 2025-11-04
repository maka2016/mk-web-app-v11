import { EventEmitter } from '@mk/utils';

/** 本地组件列表 @type {string[]} */
export const components: string[] = [];

/**
 * 扩展本地组件
 *
 * @param {string} name
 * @param {React.ReactNode} Com
 */
export const extendLocalComponent = (name: string, Com: any) => {
  if (components.includes(name)) {
    console.error(`${name} 已存在`, components);
  }
  (global as any)[name] = {
    default: Com,
  };
};

export const emitPageTrunFinish = (pageIndex: number) => {
  EventEmitter.emit(`__page_animation_finish__${pageIndex}`, {});
  document.dispatchEvent(new Event('PageAnimated'));
  window?.parent?.postMessage(
    {
      type: 'event',
      event: 'PageAnimated',
      pageIndex,
    },
    '*'
  );
};

export const wrapPageID = (id: string | number) => {
  return `__page_content_${id}__`;
};

/**
 * 广播页面加载完成事件，用于 headless 浏览器截图
 */
export const emitLoaded = (msg: string = 'page loaded', payload = {}) => {
  if (typeof window === 'undefined') return;
  console.log('___emitLoaded___');
  console.log(msg);
  document.dispatchEvent(new Event('ViewerLoaded'));
  window?.parent?.postMessage(
    {
      type: 'event',
      event: 'ViewerLoaded',
      payload: payload,
    },
    '*'
  );
};

/**
 * 是否截屏模式
 * @returns
 */
export const isScreenMode = (screenshot: string) => {
  return !!screenshot;
};

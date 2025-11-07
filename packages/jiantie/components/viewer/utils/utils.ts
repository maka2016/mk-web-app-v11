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

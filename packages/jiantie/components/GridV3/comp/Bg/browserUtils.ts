// 检测是否为Chrome浏览器
export const isChrome = () => {
  return (
    /Chrome/.test(navigator.userAgent) && !/Edge/.test(navigator.userAgent)
  );
};

// 检测是否为Safari浏览器
export const isSafari = () => {
  return (
    /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
  );
};

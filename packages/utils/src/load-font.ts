const internalUrl = 'https://fontservice.oss-cn-beijing-internal.aliyuncs.com';

const fontLoadedList: Record<string, boolean> = {};
const fontLoadingState: Record<string, boolean> = {};

export const loadFontAction = async ({
  fontFamily,
  fontUrl: fontUrlOrigin,
}: {
  fontFamily: string;
  fontUrl: string;
}) => {
  let fontUrl = fontUrlOrigin;
  if (/MAKAInternal/.test(window.navigator.userAgent)) {
    fontUrl = fontUrl.replace(/https?:\/\/font\.maka\.im/, internalUrl);
  }
  if (fontLoadedList[fontUrl] || fontLoadingState[fontUrl]) return;
  fontLoadingState[fontUrl] = true;
  const fontFace = new FontFace(fontFamily, `url("${fontUrl}")`);
  await fontFace.load();
  fontLoadingState[fontUrl] = false;
  fontLoadedList[fontUrl] = true;
  (document.fonts as any).add(fontFace);
};

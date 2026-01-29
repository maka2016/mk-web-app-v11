import axios from 'axios';

let fontCache: any = null;

export const getFontList = async () => {
  if (fontCache) return fontCache;
  const res = await axios.get(`https://apiv5.maka.im/store/fonts`);
  fontCache = res;
  return res;
};

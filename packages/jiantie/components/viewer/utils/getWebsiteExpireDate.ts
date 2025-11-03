export const getExpireTime = (appid: string) => {
  switch (appid) {
    default:
      return getExpireHover(appid) * 60 * 60 * 1000;
  }
};
export const getExpireHover = (appid: string) => {
  switch (appid) {
    default:
      return 1;
  }
};

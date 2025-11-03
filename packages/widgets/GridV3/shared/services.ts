import { getUid, request } from '@mk/services';

export const onScreenShot = async (workInfo: {
  id: string;
  width: number;
  height: number;
  appid: string;
  screenshot_block?: string;
  surfix?: string;
}) => {
  const {
    id,
    width,
    height,
    appid,
    screenshot_block,
    surfix = Date.now(),
  } = workInfo;
  if (Number.isNaN(+width) || Number.isNaN(+height)) {
    // return [];
    throw new Error('width or height is not a number');
  }

  const origin =
    process.env.ENV === 'prod'
      ? 'https://jiantieapp.com'
      : 'https://staging-jiantie-web.maka.im';

  const urlParams = {
    works_id: id,
    uid: getUid(),
    format: 'png',
    type: 'longH5',
    pageCount: '1',
    url: `${origin}/viewer2/${id}?appid=${appid}&screenshot=true&${screenshot_block ? `screenshot_block=${screenshot_block}` : ''}`,
    width: String(width),
    height: String(height),
    appid,
  };
  const downloadUrl = `https://www.maka.im/mk-gif-generator/screenshot/v2/export?${new URLSearchParams(urlParams).toString()}&surfix=${surfix}`;
  const screenshotRes = await request.get(downloadUrl, {
    timeout: 60000,
  });
  return screenshotRes.data.fullUrls;
};

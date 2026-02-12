import { getUid, request } from '@/services';
import { getShareUrl } from '../../../store';

const originDefault =
  process.env.BASEORIGIN ||
  (process.env.ENV === 'prod' ? 'https://jiantieapp.com' : 'https://staging-jiantie-web.maka.im');

export const onScreenShot = async (workInfo: {
  id: string;
  width: number;
  height: number;
  appid: string;
  screenshot_block?: string;
  surfix?: string;
  query?: Record<string, string>;
}) => {
  const { id, width, height, appid, screenshot_block, surfix = Date.now(), query = {} } = workInfo;
  if (Number.isNaN(+width) || Number.isNaN(+height)) {
    // return [];
    throw new Error('width or height is not a number');
  }
  console.log('NEXT_PUBLIC_BASEORIGIN:', process.env.NEXT_PUBLIC_BASEORIGIN);
  console.log('BASEORIGIN:', process.env.BASEORIGIN);
  console.log('ENV:', process.env.ENV);
  console.log('process.env', process.env);

  const queryForViewer = {
    ...query,
    appid: appid,
    screenshot: 'true',
    ...(screenshot_block ? { screenshot_block: screenshot_block } : {}),
  };

  const viewerUrl = getShareUrl(id, queryForViewer, originDefault);

  console.log('viewerUrl222', viewerUrl);
  // const viewerUrl = `${origin}/viewer2/${id}?${new URLSearchParams(queryForViewer).toString()}`;

  const urlParams = {
    works_id: id,
    uid: getUid(),
    format: 'png',
    type: 'longH5',
    pageCount: '1',
    url: viewerUrl,
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

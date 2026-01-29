import { getQueryString } from '@/utils';
import Vip from './components/main';
import VipPageWrapper from './components/vip-page-wrapper';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const appid = getQueryString(params.appid);

  const trk_str = getQueryString(params.trk_str);

  const vipTrackData = trk_str ? JSON.parse(decodeURIComponent(trk_str)) : {};

  if (appid === 'jiantie') {
    return <VipPageWrapper appid={appid} vipTrackData={vipTrackData} />;
  }
  return <Vip appid={appid}></Vip>;
}

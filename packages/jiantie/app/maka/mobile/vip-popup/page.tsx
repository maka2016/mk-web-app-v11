import { getQueryString } from '../../../../utils';
import Home from './index';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const works_type = getQueryString(params.works_type);
  const works_id = getQueryString(params.works_id);
  const showPosterWatermark = getQueryString(params.showPosterWatermark);
  const share_with_wm_btn_text = getQueryString(params.share_with_wm_btn_text);
  const up_to_vip_btn_text = getQueryString(params.up_to_vip_btn_text);

  return (
    <Home
      urlParams={{
        works_type,
        works_id,
        up_to_vip_btn_text,
        showPosterWatermark,
        share_with_wm_btn_text,
      }}
    ></Home>
  );
}

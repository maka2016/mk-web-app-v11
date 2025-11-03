import { generateMetadataFac } from '@mk/viewer/components/getMeta';
import WebsiteApp from '@mk/viewer/components/website';
import { getInitialPropsCommonAppRouter } from '@mk/viewer/utils/getInitialPropsCommon2';
import { headers } from 'next/headers';

import MiniPShare from '@/components/MiniPShare';
import JiantieExpired from '@/components/ViewerComp/JiantieExpired';
import { worksServerV2 } from '@/services/jiantie-services';
import { toOssMiniPCoverUrl } from '@/utils';
import { treeNodeCounter2 } from '@/utils/works';
import { API, getAppId } from '@mk/services';
import { getShareInfo } from '@mk/widgets/GridV3/comp/provider/utils';

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{
    worksId: string;
    uid: string;
  }>;
}) => {
  const { worksId, uid } = await params;
  const res = await generateMetadataFac({
    uid,
    worksId,
    type: 'event',
  });

  return res;
};

const checkCanShare = async (paramsRes: {
  worksId: string;
  uid: string;
  appid: string;
}) => {
  const appid = paramsRes.appid || 'jiantie';
  // https://staging-works-server-v2.maka.im/works/{appid}/{uid}/{worksId}/can-export-share-without-watermark'
  const { uid, worksId } = paramsRes;
  try {
    const res = await fetch(
      `${worksServerV2()}/works/${appid}/${uid}/${worksId}/can-export-share-without-watermark`
    );
    const data = await res.json();
    return !!data?.canExportShare;
  } catch (err) {
    console.error('get canView err', err);
    return false;
  }
};

const checkCanExport = async (paramsRes: {
  worksId: string;
  uid: string;
  appid: string;
}) => {
  const appid = paramsRes.appid || 'jiantie';
  const { uid, worksId } = paramsRes;
  try {
    const res = await fetch(
      `${worksServerV2()}/works/${appid}/${uid}/${worksId}/can-export-share-without-watermark`
    );
    const data = await res.json();
    return !!data?.canExportShare;
  } catch (err) {
    console.error('get canView err', err);
    return false;
  }
};

const getUserBand = async (paramsRes: { uid: string; appid: string }) => {
  try {
    const res = await fetch(
      `${API('apiv10', `/user-brand/${paramsRes.appid}/${paramsRes.uid}`, process.env.ENV)}`
    );

    const data = await res.json();
    return data;
  } catch (error) {
    console.log('get user band err', error);
    return null;
  }
};

async function getWorksData(paramsRes: {
  worksId: string;
  uid: string;
  appid: string;
}) {
  if (!paramsRes.worksId) {
    return null;
  }
  const head = await headers();
  const headObj = Object.fromEntries(head.entries()) as any;
  const pathname = headObj['x-pathname'] || '';
  const uid = paramsRes.worksId.split('_')[1];

  const [initData] = await Promise.all([
    getInitialPropsCommonAppRouter({
      headers: headObj,
      pathname: pathname,
      query: paramsRes,
    }),
  ]);
  paramsRes.uid = initData.worksDetail.uid;

  if (initData.permissionData?.custom_logo) {
    const userBrand = await getUserBand(paramsRes);

    if (userBrand) {
      initData.websiteControl.brandLogoUrl = userBrand?.brandLogoUrl;
      initData.websiteControl.brandText = userBrand?.brandText;
    }
  }

  if (initData.query.back_door) {
    initData.websiteControl.isTempLink = false;
    initData.websiteControl.isExpire = false;
    initData.websiteControl.showWatermark = false;
  } else if (initData.worksDetail.template_id) {
    const { websiteSupport, videoSupport, posterSupport } = getShareInfo(
      initData.worksDetail
    );

    if (websiteSupport) {
      const canShare = await checkCanShare(paramsRes);
      if (canShare) {
        initData.websiteControl.showWatermark = false;
        initData.websiteControl.isExpire = false;
        initData.websiteControl.isTempLink = false;
        initData.websiteControl.floatAD = false;
      } else {
        initData.websiteControl.showWatermark = false;
        initData.websiteControl.isExpire = true;
        initData.websiteControl.isTempLink = true;
        initData.websiteControl.floatAD = true;
      }
    } else {
      const canExport = await checkCanExport(paramsRes);
      if (videoSupport) {
        if (canExport) {
          initData.websiteControl.showWatermark = false;
          initData.websiteControl.isExpire = false;
          initData.websiteControl.isTempLink = false;
          initData.websiteControl.floatAD = false;
        } else {
          initData.websiteControl.showWatermark = false;
          initData.websiteControl.isExpire = false;
          initData.websiteControl.isTempLink = false;
          initData.websiteControl.floatAD = true;
        }
      } else if (posterSupport) {
        if (canExport) {
          initData.websiteControl.showWatermark = false;
          initData.websiteControl.isExpire = false;
          initData.websiteControl.isTempLink = false;
          initData.websiteControl.floatAD = false;
        } else {
          initData.websiteControl.showWatermark = true;
          initData.websiteControl.isExpire = false;
          initData.websiteControl.isTempLink = false;
          initData.websiteControl.floatAD = false;
        }
      }
    }
  }
  initData.websiteControl.viewMode = 'viewer';
  return initData;
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{
    uid: string;
    worksId: string;
    appid: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // if (!canView) {
  //   // 未发布作品
  //   return <JiantieExpired />
  // }
  const paramsRes = await params;
  const queryRes = await searchParams;
  const initProps = await getWorksData({ ...paramsRes, ...queryRes });
  // if (!initProps || !initProps?.worksData.canvasData) {
  //   return <EventNotFound />;
  // }

  // 下线
  if (
    !initProps ||
    !initProps?.worksData.canvasData ||
    initProps.worksDetail.offline
  ) {
    return (
      <JiantieExpired
        label={
          initProps?.worksDetail.offline ? '作品仅作者可见' : '作品已删除或下线'
        }
      />
    );
  }
  const widgetRely = treeNodeCounter2(initProps?.worksData);

  return (
    <>
      <MiniPShare
        title={initProps.worksDetail?.title || '详情'}
        imageUrl={toOssMiniPCoverUrl(initProps.worksDetail?.cover)}
        serverPath={{
          miniPath: '/pages/viewer/index',
          urlPath: `/viewer2/${(await params).worksId}?appid=${queryRes.appid || getAppId()}`,
        }}
      />
      <WebsiteApp widgetRely={widgetRely.allWidgetRely as any} {...initProps} />
    </>
  );
}

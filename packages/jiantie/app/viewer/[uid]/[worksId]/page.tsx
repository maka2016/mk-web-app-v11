import { getInitialPropsCommonAppRouter } from '@mk/viewer/utils/getInitialPropsCommon2';
import { headers } from 'next/headers';
import React from 'react';
import WebsiteApp from '@mk/viewer/components/website';
import { generateMetadataFac } from '@mk/viewer/components/getMeta';
import EventNotFound from '@/components/EventNotFound';
import { worksServerV2 } from '@/services/jiantie-services';
import JiantieExpired from '@/components/ViewerComp/JiantieExpired';
import axios from 'axios';
import { treeNodeCounter2 } from '@/utils/works';
import { redirect } from 'next/navigation';

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

const checkCanView = async (paramsRes: { worksId: string; uid: string }) => {
  const appid = 'jiantie';
  try {
    const res: any = await axios.get(
      `${worksServerV2()}/works/${appid}/${paramsRes.uid}/${paramsRes.worksId}/can-view`
    );
    return res.data.canView;
  } catch (err) {
    console.error('get canView err', err);
    return false;
  }
};

async function getWorksData(paramsRes: { worksId: string; uid: string }) {
  if (!paramsRes.worksId) {
    return null;
  }
  const head = await headers();
  const headObj = Object.fromEntries(head.entries()) as any;
  const pathname = headObj['x-pathname'] || '';

  const [initData, canView] = await Promise.all([
    getInitialPropsCommonAppRouter({
      headers: headObj,
      pathname: pathname,
      query: paramsRes,
    }),
    checkCanView(paramsRes),
  ]);

  if (initData.worksDetail.template_id) {
    if (!canView) {
      initData.websiteControl.isTempLink = true;
      if (
        Date.now() -
          new Date((initData.worksDetail as any).update_time).getTime() >
        1 * 60 * 60 * 1000
      ) {
        initData.websiteControl.isExpire = true;
      }
    }
  }
  return initData;
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{
    uid: string;
    worksId: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // if (!canView) {
  //   // 未发布作品
  //   return <JiantieExpired />
  // }
  const paramsRes = await params;
  const queryRes = await searchParams;
  const apiVersion = /_/.test(paramsRes.worksId) ? 'v2' : 'v1';
  if (apiVersion === 'v2') {
    const searchParamsStr = new URLSearchParams(
      queryRes as Record<string, string>
    ).toString();
    redirect(
      `/viewer2/${paramsRes.worksId}${searchParamsStr ? `?${searchParamsStr}` : ''}`
    );
  }
  const initProps = await getWorksData({ ...paramsRes, ...queryRes });
  if (!initProps || !initProps?.worksData.canvasData) {
    return <EventNotFound />;
  }

  // 下线
  if ([-1, -2, -3, -10].includes(initProps.worksDetail.status)) {
    return <JiantieExpired />;
  }
  const widgetRely = treeNodeCounter2(initProps?.worksData);

  return (
    <>
      <WebsiteApp widgetRely={widgetRely.allWidgetRely as any} {...initProps} />
    </>
  );
}

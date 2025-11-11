import { EnvelopeConfig } from '@/components/Envelope/types';
import { getShareInfo } from '@/components/GridV3/comp/provider/utils';
import MiniPShare from '@/components/MiniPShare';
import { generateMetadataFac } from '@/components/viewer/components/getMeta';
import WebsiteApp from '@/components/viewer/components/website';
import {
  getUserPermissions,
  getViewerData,
} from '@/components/viewer/utils/getViewerData';
import JiantieExpired from '@/components/ViewerComp/JiantieExpired';
import { worksServerV2 } from '@/services/jiantie-services';
import { toOssMiniPCoverUrl } from '@/utils';
import { API, getAppId } from '@mk/services';
import { headers } from 'next/headers';

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
  uid?: string;
  appid: string;
  version?: string;
  back_door?: string;
}) {
  if (!paramsRes.worksId) {
    return null;
  }

  // 1. 获取基础数据（纯数据层）
  const viewerData = await getViewerData({
    worksId: paramsRes.worksId,
    uid: paramsRes.uid,
    version: paramsRes.version,
  });

  // 更新 uid（从作品详情中获取）
  paramsRes.uid = viewerData.worksDetail.uid.toString();

  // 2. 获取用户权限
  const permissionData = await getUserPermissions({
    uid: viewerData.worksDetail.uid,
    worksId: paramsRes.worksId,
    appid: paramsRes.appid,
  });

  // 3. 初始化网站控制参数
  const websiteControl = {
    isTempLink: false,
    isExpire: false,
    viewMode: 'viewer' as const,
    showWatermark: false,
    floatAD: false,
    brandLogoUrl: undefined as string | undefined,
    brandText: undefined as string | undefined,
  };

  // 4. 处理品牌信息（核心业务逻辑）
  if (permissionData?.custom_logo) {
    const userBrand = await getUserBand(paramsRes as any);
    if (userBrand) {
      websiteControl.brandLogoUrl = userBrand?.brandLogoUrl;
      websiteControl.brandText = userBrand?.brandText;
    }
  }

  // 5. 处理权限控制（核心业务逻辑）
  if (paramsRes.back_door) {
    // 后门模式：无限制
    websiteControl.isTempLink = false;
    websiteControl.isExpire = false;
    websiteControl.showWatermark = false;
    websiteControl.floatAD = false;
  } else if (viewerData.worksDetail.template_id) {
    // 从模板创建的作品：根据分享类型判断权限
    const { websiteSupport, videoSupport, posterSupport } = getShareInfo(
      viewerData.worksDetail as any
    );

    if (websiteSupport) {
      const canShare = await checkCanShare(paramsRes as any);
      if (canShare) {
        // 有分享权限：无水印、无限制
        websiteControl.showWatermark = false;
        websiteControl.isExpire = false;
        websiteControl.isTempLink = false;
        websiteControl.floatAD = false;
      } else {
        // 无分享权限：显示广告、临时链接
        websiteControl.showWatermark = false;
        websiteControl.isExpire = true;
        websiteControl.isTempLink = true;
        websiteControl.floatAD = true;
      }
    } else {
      const canExport = await checkCanExport(paramsRes as any);
      if (videoSupport) {
        // 视频类型
        websiteControl.showWatermark = false;
        websiteControl.isExpire = false;
        websiteControl.isTempLink = false;
        websiteControl.floatAD = !canExport; // 有导出权限则无广告
      } else if (posterSupport) {
        // 海报类型
        websiteControl.showWatermark = !canExport; // 有导出权限则无水印
        websiteControl.isExpire = false;
        websiteControl.isTempLink = false;
        websiteControl.floatAD = false;
      }
    }
  }

  // 6. 构造返回数据
  const head = await headers();
  const headObj = Object.fromEntries(head.entries()) as any;

  return {
    ...viewerData,
    // 平铺 websiteControl 字段
    viewMode: websiteControl.viewMode,
    isExpire: websiteControl.isExpire,
    trialExpired: false, // 如果需要可以从其他地方获取
    floatAD: websiteControl.floatAD,
    showWatermark: websiteControl.showWatermark,
    brandLogoUrl: websiteControl.brandLogoUrl,
    brandText: websiteControl.brandText,
    // 平铺 permissionData 字段
    removeProductIdentifiers: !!permissionData?.remove_product_identifiers,
    customLogo: !!permissionData?.custom_logo,
    userAgent: headObj['user-agent'] || '',
    pathname: headObj['x-pathname'] || '',
    query: {
      uid: paramsRes.uid || viewerData.worksDetail.uid.toString(),
      version: paramsRes.version || '',
      host: '',
      screenshot: '',
      type: '',
      ...paramsRes,
      worksId: paramsRes.worksId, // 确保 worksId 在最后，覆盖可能的值
    },
  };
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

  // 获取信封配置（如果启用）
  const envelopeConfig = initProps.worksDetail.envelope_enabled
    ? (initProps.worksDetail.envelope_config as EnvelopeConfig)
    : undefined;

  return (
    <>
      {/* 服务端渲染的信封 Loading */}
      {/* <EnvelopeLoading config={envelopeConfig} /> */}

      <MiniPShare
        title={initProps.worksDetail?.title || '详情'}
        imageUrl={toOssMiniPCoverUrl(initProps.worksDetail?.cover || '')}
        serverPath={{
          miniPath: '/pages/viewer/index',
          urlPath: `/viewer2/${(await params).worksId}?appid=${queryRes.appid || getAppId()}`,
        }}
      />
      <WebsiteApp {...initProps} />
    </>
  );
}

import { EnvelopePreload } from '@/components/Envelope/EnvelopePreload';
import { EnvelopeConfig } from '@/components/Envelope/types';
import { getShareInfo } from '@/components/GridEditorV3/provider/utils';
import { generateMetadataFac } from '@/components/GridViewer/getMeta';
import JiantieExpired from '@/components/GridViewer/JiantieExpired';
import MiniPShare from '@/components/MiniPShare';
import { getWorksDataWithOSS } from '@/server';
import { checkCanShareWithoutWatermark } from '@/server/utils/permission-check';
import { API, getAppId } from '@/services';
import { worksServerV2 } from '@/services/jiantie-services';
import { toOssMiniPCoverUrl } from '@/utils';
import { prisma } from '@mk/jiantie/v11-database';
import { headers } from 'next/headers';
import TrackerV11 from '../../../../work-stat/V11WorkTracker/component/TrackerV11';
import EventNotFound from '../../../components/EventNotFound';
import DesktopViewerWrapper from './DesktopViewerWrapper';

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
  const { uid, worksId } = paramsRes;
  
  // 检查是否使用 v11 API
  const useV11API = process.env.APIV11 === 'true';
  
  if (useV11API) {
    try {
      return await checkCanShareWithoutWatermark(Number(uid), worksId);
    } catch (err) {
      console.error('检查分享权限失败（v11 API）:', err);
      return false;
    }
  }
  
  // 使用旧的 API
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
  
  // 检查是否使用 v11 API
  const useV11API = process.env.APIV11 === 'true';
  
  if (useV11API) {
    try {
      return await checkCanShareWithoutWatermark(Number(uid), worksId);
    } catch (err) {
      console.error('检查导出权限失败（v11 API）:', err);
      return false;
    }
  }
  
  // 使用旧的 API
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
  const viewerData = await getWorksDataWithOSS({
    prisma,
    worksId: paramsRes.worksId,
    version: paramsRes.version,
  });

  // 更新 uid（从作品详情中获取）
  paramsRes.uid = viewerData.detail.uid.toString();
  paramsRes.appid = viewerData.detail.appid || getAppId();

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

  // 5. 处理权限控制（核心业务逻辑）
  if (paramsRes.back_door) {
    // 后门模式：无限制
    websiteControl.isTempLink = false;
    websiteControl.isExpire = false;
    websiteControl.showWatermark = false;
    websiteControl.floatAD = false;
  } else if (viewerData.detail.template_id) {
    // 从模板创建的作品：根据分享类型判断权限
    const { websiteSupport, videoSupport, posterSupport } = getShareInfo(
      viewerData.detail as any
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
        websiteControl.isTempLink = true;
        websiteControl.floatAD = true;

        // 根据作品创建时间计算3天有效期
        const createTime = new Date(viewerData.detail.create_time);
        const now = new Date();
        const daysDiff =
          (now.getTime() - createTime.getTime()) / (1000 * 60 * 60 * 24);
        websiteControl.isExpire = daysDiff > 3;
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
    backdoor: paramsRes.back_door,
    // 平铺 websiteControl 字段
    viewMode: websiteControl.viewMode,
    isExpire: websiteControl.isExpire,
    trialExpired: false, // 如果需要可以从其他地方获取
    isTempLink: websiteControl.isTempLink,
    floatAD: websiteControl.floatAD,
    showWatermark: websiteControl.showWatermark,
    userAgent: headObj['user-agent'] || '',
    pathname: headObj['x-pathname'] || '',
    query: {
      uid: paramsRes.uid || viewerData.detail.uid.toString(),
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
  try {
    const initProps = await getWorksData({ ...paramsRes, ...queryRes });

    // 下线
    if (!initProps || !initProps?.work_data || initProps.detail.offline) {
      return (
        <JiantieExpired
          label={
            initProps?.detail.offline ? '作品仅作者可见' : '作品已删除或下线'
          }
        />
      );
    }

    // 获取信封配置（如果启用）
    const envelopeConfig = initProps.detail.envelope_enabled
      ? (initProps.detail.envelope_config as EnvelopeConfig)
      : undefined;

    return (
      <>
        {/* 服务端预加载信封图片资源 - 在 SSR 阶段输出 preload 标签 */}
        <EnvelopePreload config={envelopeConfig} />
        <MiniPShare
          title={initProps.detail?.title || '详情'}
          imageUrl={toOssMiniPCoverUrl(initProps.detail?.cover || '')}
          serverPath={{
            miniPath: '/pages/viewer/index',
            urlPath: `/viewer2/${(await params).worksId}?appid=${queryRes.appid || getAppId()}`,
          }}
        />
        {/* 链接过期不再统计浏览量 */}
        {!initProps.backdoor && !queryRes?.screenshot && (
          <TrackerV11
            workId={initProps.detail.id}
            appId={`${queryRes.appid || getAppId()}`}
            worksData={initProps.work_data}
            heartbeatInterval={10000}
            enableHeartbeat={true}
          />
        )}
        <DesktopViewerWrapper
          worksData={initProps.work_data}
          worksDetail={initProps.detail as any}
          {...initProps}
        />
      </>
    );
  } catch (err) {
    console.error('get works data err', err);
    return <EventNotFound />;
  }
}

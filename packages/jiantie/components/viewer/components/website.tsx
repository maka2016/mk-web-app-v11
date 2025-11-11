'use client';
import { WorksDetailEntity } from '@mk/services';
import { IWorksData } from '@mk/works-store/types';
import clas from 'classnames';
import React, { useEffect, useRef, useState } from 'react';
import { AppContext } from '../types';
// import Head from "next/head"
import { getAppId } from '@/services';
import APPBridge from '@mk/app-bridge';
import CommonLogger from '@mk/loggerv7/logger';
import { request } from '@mk/services';
import { isPcByUA, isWechat, LoadScript } from '@mk/utils';
import dayjs from 'dayjs';
import { EnvelopeClientAnimation } from '../../Envelope/EnvelopeClientAnimation';
import { EnvelopeConfig } from '../../Envelope/types';
import { useWorksData } from '../utils';
import { emitLoaded } from '../utils/utils';
import LongViewerContainer from './AnimationViewer/LongViewerContainer';
import PreloadPage, { PreloadPageHandle } from './PreloadPage';
import './styles/index.scss';
import SuspendButton from './SuspendButton';
import Watermark from './SuspendButton/Watermark';
import { useWxEnv } from './wechat';
import WxAuth from './WxAuth';

interface WebsiteAppProps {
  // 作品数据
  worksData: IWorksData;
  worksDetail: WorksDetailEntity;

  // 查询参数
  query: AppContext['query'];

  // 网站控制
  viewMode?: 'viewer' | 'preview' | 'store';
  isExpire?: boolean;
  trialExpired?: boolean;
  floatAD?: boolean;
  showWatermark?: boolean;
  brandLogoUrl?: string;
  brandText?: string;

  // 权限数据
  removeProductIdentifiers?: boolean;
  customLogo?: boolean;

  // 其他
  userAgent: string;
  pathname: string;

  // 回调
  onViewerLoaded?: () => void;
  style?: React.CSSProperties;
}

/**
 * 互动网页容器
 */
export default function WebsiteApp(props: WebsiteAppProps) {
  const {
    worksData: initialWorksData,
    worksDetail,
    query,
    viewMode,
    isExpire,
    trialExpired,
    floatAD,
    showWatermark,
    brandLogoUrl,
    brandText,
    removeProductIdentifiers,
    customLogo,
    userAgent,
    pathname,
    onViewerLoaded,
    style,
  } = props;

  // 构建 useWorksData 需要的参数
  const worksDataParams = {
    worksData: initialWorksData,
    worksDetail,
    query,
  };
  const worksData = useWorksData(worksDataParams);
  const H5ViewerContainerRef = useRef<any>(null);
  const [mountInBrowser, setMountInBrowser] = useState(false);
  const isScreenshot = !!query.screenshot;

  // 使用服务端传递的 userAgent 来判断是否为 PC，确保 SSR 和客户端一致
  const isPcDevice = isPcByUA(userAgent);

  // 从 worksDetail 中获取规格信息
  const specInfo = worksDetail.specInfo;
  const {
    is_flip_page,
    width: specWidth,
    height: specHeight,
    viewport_width,
    fixed_height,
    export_format,
  } = specInfo;
  const isWebsite = export_format?.includes('html');
  const [preloadEnd, setPreloadEnd] = useState(isScreenshot || !isWebsite);
  const PreloadPageRef = React.useRef<PreloadPageHandle | null>(null);

  const [showFloatAD, setShowFloatAD] = useState(false);
  const [showTrialExpired, setShowTrialExpired] = useState(false);
  const [showExpired, setShowExpired] = useState(false);

  // 从 worksDetail 中获取信封配置
  const envelopeEnabled = worksDetail.envelope_enabled;
  const envelopeConfig = envelopeEnabled
    ? (worksDetail.envelope_config as EnvelopeConfig)
    : undefined;

  console.log('[WebsiteApp] 信封配置:', {
    envelope_enabled: envelopeEnabled,
    hasEnvelopeConfig: !!envelopeConfig,
    config: envelopeConfig,
  });

  const inviteVisit = () => {
    const personId = query.inviteId;
    request.post(
      `https://works-server-v2.maka.im/invite-person/${personId}/visit`
    );
  };

  const onPageViewerLoaded = () => {
    console.log('onPageViewerLoaded');
    /** 通知 preload page 可以结束 */
    handlePreloadEnd();
    emitLoaded(`WorksLoader_loaded`);

    //pup开始录屏
    (window as any)?.onPlayStart?.();
    PreloadPageRef.current?.terminate?.();
    if (query.inviteId) {
      inviteVisit();
    }
  };

  useWxEnv(
    {
      onInit: () => {},
      worksDetail,
    },
    worksData
  );

  useEffect(() => {
    // 打点
    if (typeof window === 'undefined') return;
    const init = async () => {
      if (isWechat()) {
        await LoadScript({
          src: 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js',
        });
        console.log('加载微信jssdk成功');
      }

      setMountInBrowser(true);
      document.title = worksDetail?.title || 'Untitled';
      CommonLogger.track_pageview({
        page_type: 'viewer',
        page_id: worksDetail?.id,
        page_inst_id: worksDetail?.id,
        page_name: worksDetail?.title,
        page_url: window.location.href,
        page_referrer: document.referrer,
      });

      // APPBridge.minipPostMessage({
      //   type: "setUtm",
      //   utm_source: 'jiantie',
      //   utm_medium: 'viewer',
      // });

      // const isTemplate = /^T_/.test(query.worksId);
      if (viewMode === 'viewer') {
        APPBridge.setUtmInfo({
          utmSource: 'virus',
          utmMedium: 'minip_viewer',
          utmContent: worksDetail?.id,
        });
      }
    };
    init();

    if (getAppId() === 'jiantie' && isWebsite) {
      //老作品不做过期提示,仅出现广告
      const isOldwork = dayjs(worksDetail.create_time).isBefore(
        '2025-08-11 11:20:00'
      );

      if (isExpire) {
        if (isOldwork) {
          console.log('old work expired，show ad');
          setShowFloatAD(true); //expired
        } else {
          console.log('new work expired，show offline');
          console.log('expired');
          setShowExpired(true);
          // 试用过期
          setShowTrialExpired(!!trialExpired);
        }
      }
    }

    if (getAppId() === 'maka' && isWebsite) {
      setShowExpired(!!isExpire);
    }

    setShowFloatAD(!!floatAD);

    setTimeout(() => {
      onViewerLoaded?.();
    }, 1700);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeof window]); // 只在组件挂载时执行一次

  const handlePreloadEnd = () => {
    setTimeout(() => {
      H5ViewerContainerRef.current?.playAnimationsInPage?.(0);
    }, 300);
  };

  return (
    <>
      {/* 客户端接管的信封动画，否则用原来的加载页 */}
      {!!envelopeConfig ? (
        <EnvelopeClientAnimation
          key={worksDetail.id}
          config={envelopeConfig}
          onComplete={() => {
            setPreloadEnd(true);
          }}
        />
      ) : (
        <PreloadPage
          needLoading={isWebsite}
          ref={PreloadPageRef}
          key={worksDetail.id}
          worksCover={(worksDetail as any)?.cover || ''}
          worksId={worksDetail.id}
          hasWorksData={!!worksData}
          appid={query.appid}
          pathname={pathname}
          userAgent={userAgent}
          isScreenshot={!!query.screenshot}
          isVideoMode={!!query.video_mode}
          removeProductIdentifiers={!!removeProductIdentifiers}
          customLogo={!!customLogo}
          brandLogoUrl={brandLogoUrl}
          brandText={brandText}
          loadEndCb={() => {
            setPreloadEnd(true);
          }}
        />
      )}

      <div
        id='auto-scroll-container'
        className={clas(
          `flex-1 h-full max-h-full w-full overflow-y-auto mx-auto viewer_page_root`,
          isWebsite ? 'overflow-x-hidden' : 'overflow-x-auto',
          isWebsite && !isScreenshot && isPcDevice && 'md:max-w-[375px]'
        )}
        style={{
          ...(!isWebsite && {
            width: viewport_width,
            maxWidth: '100%',
          }),
          ...(fixed_height && !isWebsite
            ? {
                aspectRatio: `${specWidth} / ${specHeight}`,
                // 确保 aspect-ratio 生效
                height: 'auto',
                minHeight: 0,
              }
            : {}),
          ...style,
        }}
      >
        {mountInBrowser && worksData && (
          <div
            className={clas(
              'website_root',
              isPcDevice && 'pc',
              is_flip_page && 'flip_page h-full overflow-hidden'
              // !preloadEnd && 'hidden'
            )}
          >
            <LongViewerContainer
              ref={H5ViewerContainerRef}
              query={query}
              onPageLoaded={onPageViewerLoaded}
              worksData={worksData}
            />
            <Watermark visible={!!showWatermark} query={query} />
            <SuspendButton
              query={query}
              isVideoMode={false}
              adConfig={{
                floatAD: showFloatAD,
                trialExpired: showTrialExpired,
                showExpired: showExpired,
              }}
              musicVisible={
                !!worksData?.canvasData?.music?.url &&
                !worksData.canvasData.music.disabled
              }
              worksData={worksData!}
            />
            <WxAuth />
          </div>
        )}
      </div>
    </>
  );
}

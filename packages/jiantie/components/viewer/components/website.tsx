'use client';
import clas from 'classnames';
import React, { useEffect, useRef, useState } from 'react';
import { PageComponentProps } from '../types';
// import Head from "next/head"
import APPBridge from '@mk/app-bridge';
import CommonLogger from '@mk/loggerv7/logger';
import { request } from '@mk/services';
import { isPc, isWechat, LoadScript } from '@mk/utils';
import { loadWidgetResource, setCdnPath } from '@mk/works-store';
import dayjs from 'dayjs';
import { getAppId } from '@/services';
import { useWorksData } from '../utils';
import '../utils/react-dom-adapter';
import { emitLoaded } from '../utils/utils';
import { getWidgetMetaColl } from '../utils/widget-metadata';
import LongViewerContainer from './AnimationViewer/LongViewerContainer';
import PreloadPage, { PreloadPageHandle } from './PreloadPage';
import './styles/index.scss';
import SuspendButton from './SuspendButton';
import Watermark from './SuspendButton/Watermark';
import { useWxEnv } from './wechat';
import WxAuth from './WxAuth';

interface WebsiteAppProps extends PageComponentProps {
  widgetRely: any;
  tracking?: boolean;
  useAutoScrollByDefault?: boolean;
  onViewerLoaded?: () => void;
  style?: React.CSSProperties;
}

/**
 * 互动网页容器
 */
export default function WebsiteApp(props: WebsiteAppProps) {
  const {
    worksDetail,
    websiteControl,
    widgetRely,
    query,
    tracking = true,
    userAgent,
    pathname,
    permissionData,
  } = props;

  const worksData = useWorksData(props);
  const H5ViewerContainerRef = useRef<any>(null);
  const [mountInBrowser, setMountInBrowser] = useState(false);
  const isScreenshot = !!query.screenshot;
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
      setCdnPath('https://res.maka.im');
      await loadWidgetResource({
        mode: 'viewer',
        widgetRely,
        loadedWidgetCache: {},
        widgetMetadataColl: getWidgetMetaColl(),
      }).catch(e => {
        console.warn('loadWidgetResource error', e);
      });

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
      if (websiteControl?.viewMode === 'viewer') {
        APPBridge.setUtmInfo({
          utmSource: 'virus',
          utmMedium: 'minip_viewer',
          utmContent: worksDetail?.id,
        });
      }

      if (tracking && /https/.test(window.location.href)) {
        setInterval(() => {
          CommonLogger.track(
            {
              object_type: 'tracking',
              event_type: 'tracking',
            },
            true
          );
        }, 5000);
      }
    };
    init();

    if (getAppId() === 'jiantie' && isWebsite) {
      //老作品不做过期提示,仅出现广告
      const isOldwork = dayjs(worksDetail.create_time).isBefore(
        '2025-08-11 11:20:00'
      );

      if (websiteControl?.isExpire) {
        if (isOldwork) {
          console.log('old work expired，show ad');
          setShowFloatAD(true); //expired
        } else {
          console.log('new work expired，show offline');
          console.log('expired');
          setShowExpired(true);
          // 试用过期
          setShowTrialExpired(!!websiteControl.trialExpired);
        }
      }
    }

    if (getAppId() === 'maka' && isWebsite) {
      setShowExpired(websiteControl?.isExpire);
    }

    setShowFloatAD(!!websiteControl.floatAD);

    setTimeout(() => {
      props.onViewerLoaded?.();
    }, 1700);
  }, [typeof window]);

  const handlePreloadEnd = () => {
    setTimeout(() => {
      H5ViewerContainerRef.current?.playAnimationsInPage?.(0);
    }, 300);
  };

  return (
    <div
      id='auto-scroll-container'
      className={clas(
        `flex-1 h-full max-h-full w-full overflow-y-auto mx-auto viewer_page_root`,
        isWebsite ? 'overflow-x-hidden' : 'overflow-x-auto',
        isWebsite && !isScreenshot && isPc() && 'md:max-w-[375px]'
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
        ...props.style,
      }}
    >
      {mountInBrowser && worksData && (
        <div
          className={clas(
            'website_root',
            isPc() && 'pc',
            is_flip_page && 'flip_page h-full overflow-hidden',
            !preloadEnd && 'hidden'
          )}
        >
          <LongViewerContainer
            ref={H5ViewerContainerRef}
            query={query}
            onPageLoaded={onPageViewerLoaded}
            worksData={worksData}
          />
          <Watermark visible={!!websiteControl.showWatermark} query={query} />
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
      <PreloadPage
        needLoading={isWebsite}
        ref={PreloadPageRef}
        key={worksDetail.id}
        worksDetail={worksDetail}
        worksData={worksData!}
        userAgent={userAgent}
        query={query}
        permissionData={permissionData}
        websiteControl={websiteControl}
        pathname={pathname}
        loadEndCb={() => {
          setPreloadEnd(true);
        }}
      />
    </div>
  );
}

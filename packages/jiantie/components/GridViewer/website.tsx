'use client';
import { IWorksData } from '@/components/GridEditorV3/works-store/types';
import { getAppId, request } from '@/services';
import APPBridge from '@/store/app-bridge';
import { SerializedWorksEntity, isPcByUA } from '@/utils';
import clas from 'classnames';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EnvelopeClientAnimation } from '../Envelope/EnvelopeClientAnimation';
import { EnvelopeConfig } from '../Envelope/types';
import CanvasAutoLayoutForViewer from './CanvasAutoLayoutForViewer';
import PreloadPage, { PreloadPageHandle } from './PreloadPage';
import SuspendButton from './SuspendButton';
import { AppContext } from './types';
import { WechatInfoProvider } from './wechat/wechatInfo';

interface Payload {
  viewport: {
    width: number;
    height: number;
  };
}

const emitLoaded = (msg: string = 'page loaded', payload?: Payload) => {
  if (typeof window === 'undefined') return;
  console.log('___emitLoaded___');
  console.log(msg);
  document.dispatchEvent(new Event('ViewerLoaded'));
  window?.parent?.postMessage(
    {
      type: 'event',
      event: 'ViewerLoaded',
      payload: payload,
    },
    '*'
  );
};

interface WebsiteAppProps {
  isTempLink?: boolean;
  // 作品数据
  worksData: IWorksData;
  worksDetail: SerializedWorksEntity;

  // 查询参数
  query: AppContext['query'];

  // 网站控制
  viewMode?: 'viewer' | 'preview' | 'store';
  isExpire?: boolean;
  trialExpired?: boolean;
  floatAD?: boolean;
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
    isTempLink,
    worksData,
    worksDetail,
    query,
    viewMode,
    isExpire,
    trialExpired,
    floatAD,
    userAgent,
    onViewerLoaded,
    style,
  } = props;

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

  const disableAutoPlayAnimation = !!worksData?.gridProps?.disableAutoPlayAnimation;

  const handlePreloadEnd = useCallback(() => {
    // 确保加载页完全消失后再播放动画
    // 延迟时间已经在上层调用中处理，这里直接播放

    // 如果配置了禁用自动播放，则不自动触发动画，等待用户手动点击「播放动画」按钮
    if (disableAutoPlayAnimation) {
      return;
    }

    // 设置全局标志，通知所有动画可以开始播放
    (window as any).__animationReadyToPlay = true;
    window.dispatchEvent(new Event('animation-ready-to-play'));

    H5ViewerContainerRef.current?.playAnimationsInPage?.(0);
  }, [disableAutoPlayAnimation]);

  const onPageViewerLoaded = useCallback(() => {
    console.log('___onPageViewerLoaded___');

    const realViewerDOM = document.querySelector<HTMLDivElement>('.GridV2Comp');

    if (realViewerDOM) {
      const realViewport = {
        width: realViewerDOM.clientWidth,
        height: Math.floor(realViewerDOM.clientHeight),
      };
      console.log('realViewport', realViewport, realViewport);
      // 设置viewport，通知截图服务重置viewport
      emitLoaded(`WorksLoader_loaded`, { viewport: realViewport });
    } else {
      emitLoaded(`WorksLoader_loaded`);
    }

    //pup开始录屏
    console.log('onPlayStart');
    (window as any)?.onPlayStart?.();

    // 先终止加载页，等待加载页完全消失后再播放动画
    if (PreloadPageRef.current) {
      PreloadPageRef.current.terminate?.().then(() => {
        // 加载页的 terminate 需要 300ms，fade-out 动画还需要额外时间
        // 等待加载页完全消失后再播放动画
        setTimeout(() => {
          handlePreloadEnd();
        }, 200); // 额外等待 200ms 确保加载页完全消失
      });
    } else {
      // 如果没有加载页，直接播放动画
      handlePreloadEnd();
    }

    if (query.inviteId) {
      const personId = query.inviteId;
      request.post(
        `https://works-server-v2.maka.im/invite-person/${personId}/visit`
      );
    }
  }, [handlePreloadEnd, query.inviteId]);

  // 截图模式下，等待所有资源（图片、CSS、视频等）加载完成
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 等待所有视频元素加载完成
    const waitForVideos = (): Promise<void> => {
      return new Promise(resolve => {
        const videos = document.querySelectorAll('video');

        if (videos.length === 0) {
          resolve();
          return;
        }

        let loadedCount = 0;
        const totalVideos = videos.length;
        const timeout = setTimeout(() => {
          console.warn('视频加载超时，继续截图流程');
          resolve();
        }, 10000); // 10秒超时

        const checkAllLoaded = () => {
          loadedCount++;
          if (loadedCount >= totalVideos) {
            clearTimeout(timeout);
            console.log(`所有视频加载完成 (${loadedCount}/${totalVideos})`);
            resolve();
          }
        };

        videos.forEach(video => {
          // 如果视频已经加载了元数据，直接计数
          if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
            checkAllLoaded();
          } else {
            // 监听 loadedmetadata 事件（至少加载了第一帧）
            const handleLoadedMetadata = () => {
              video.removeEventListener('loadedmetadata', handleLoadedMetadata);
              video.removeEventListener('canplay', handleCanPlay);
              video.removeEventListener('error', handleError);
              checkAllLoaded();
            };

            // 也可以监听 canplay 事件（可以播放第一帧）
            const handleCanPlay = () => {
              video.removeEventListener('loadedmetadata', handleLoadedMetadata);
              video.removeEventListener('canplay', handleCanPlay);
              video.removeEventListener('error', handleError);
              checkAllLoaded();
            };

            // 处理视频加载错误
            const handleError = () => {
              video.removeEventListener('loadedmetadata', handleLoadedMetadata);
              video.removeEventListener('canplay', handleCanPlay);
              video.removeEventListener('error', handleError);
              console.warn('视频加载失败，跳过该视频');
              checkAllLoaded();
            };

            video.addEventListener('loadedmetadata', handleLoadedMetadata);
            video.addEventListener('canplay', handleCanPlay);
            video.addEventListener('error', handleError);

            // 确保视频开始加载
            if (video.preload === 'none') {
              video.preload = 'metadata';
            }
            if (!video.src && video.getAttribute('data-src')) {
              video.src = video.getAttribute('data-src') || '';
            }
          }
        });
      });
    };

    // 等待所有图片元素加载完成
    const waitForImages = (): Promise<void> => {
      return new Promise(resolve => {
        // 先等待一段时间，确保 React 组件已经渲染完成
        setTimeout(() => {
          // 获取所有 img 元素，包括那些可能有 data-src 的懒加载图片
          const images = Array.from(document.querySelectorAll('img'));

          // 过滤掉那些没有 src 或 data-src 的图片，以及已经加载完成的图片
          const imagesToLoad = images.filter(img => {
            const src =
              img.src ||
              img.getAttribute('data-src') ||
              img.getAttribute('srcset');
            // 检查图片是否有有效的 src，且未完成加载（或加载失败后重试）
            if (!src || src === 'about:blank') {
              return false;
            }
            // blob: 协议的图片无法加载，无需等待
            if (src.startsWith('blob:')) {
              return false;
            }
            // 如果图片已完成加载且自然尺寸不为0，说明已成功加载
            if (img.complete && img.naturalHeight !== 0) {
              return false;
            }
            return true;
          });

          if (imagesToLoad.length === 0) {
            console.log('没有需要等待加载的图片');
            resolve();
            return;
          }

          console.log(`发现 ${imagesToLoad.length} 张图片需要等待加载`);

          let loadedCount = 0;
          const totalImages = imagesToLoad.length;
          const timeout = setTimeout(() => {
            console.warn(
              `图片加载超时，已加载 ${loadedCount}/${totalImages}，继续截图流程`
            );
            resolve();
          }, 15000); // 15秒超时

          const checkAllLoaded = () => {
            loadedCount++;
            console.log(`图片加载进度: ${loadedCount}/${totalImages}`);
            if (loadedCount >= totalImages) {
              clearTimeout(timeout);
              console.log(`所有图片加载完成 (${loadedCount}/${totalImages})`);
              resolve();
            }
          };

          imagesToLoad.forEach(img => {
            // 如果图片已经加载完成（可能在检查期间已经加载完成）
            if (img.complete && img.naturalHeight !== 0) {
              checkAllLoaded();
              return;
            }

            // 如果有 data-src 但还没有 src，设置 src 以触发加载
            const dataSrc = img.getAttribute('data-src');
            if (dataSrc && !img.src) {
              img.src = dataSrc;
            }

            // 监听图片加载完成
            const handleLoad = () => {
              img.removeEventListener('load', handleLoad);
              img.removeEventListener('error', handleError);
              checkAllLoaded();
            };

            // 处理图片加载错误
            const handleError = () => {
              img.removeEventListener('load', handleLoad);
              img.removeEventListener('error', handleError);
              console.warn('图片加载失败，跳过该图片:', img.src || dataSrc);
              checkAllLoaded();
            };

            img.addEventListener('load', handleLoad);
            img.addEventListener('error', handleError);

            // 如果图片已经有 src 但还没有开始加载，尝试触发加载
            if (img.src && !img.complete) {
              // 重新设置 src 可能会触发加载
              const currentSrc = img.src;
              img.src = '';
              img.src = currentSrc;
            }
          });
        }, 300); // 等待300ms让 React 组件渲染完成
      });
    };

    const handleLoad = async () => {
      console.log('页面资源加载完成，等待图片、视频和字体加载...');

      // 等待所有图片加载完成
      await waitForImages();

      // 等待所有视频加载完成
      await waitForVideos();

      // 等待所有字体加载完成（包括通过 loadFontAction 动态加载的字体）
      try {
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
          console.log('所有字体加载完成');
        }
      } catch (err) {
        console.warn('等待字体加载时出错:', err);
      }

      // 额外等待一小段时间，确保样式完全渲染
      await new Promise(resolve => setTimeout(resolve, 200));

      console.log('所有资源（包括图片、视频和字体）加载完成，可以开始截图');
      // 触发截图服务可以开始截图的信号
      (window as any).__screenshotReady = true;

      setTimeout(() => {
        onPageViewerLoaded();
      }, isWebsite ? 1000 : 500);
    };

    // 检查文档是否已经加载完成
    if (document.readyState === 'complete') {
      // 如果已经加载完成，直接处理
      handleLoad();
    } else {
      // 否则监听 load 事件
      window.addEventListener('load', handleLoad);
      return () => {
        window.removeEventListener('load', handleLoad);
      };
    }
  }, [onPageViewerLoaded]);

  useEffect(() => {
    // 打点
    if (typeof window === 'undefined') return;
    const init = async () => {
      setMountInBrowser(true);
      document.title = worksDetail?.title || 'Untitled';
      // mkWebStoreLogger.track_pageview({
      //   page_type: 'viewer',
      //   page_id: worksDetail?.id,
      //   page_inst_id: worksDetail?.id,
      //   page_name: worksDetail?.title,
      //   page_url: window.location.href,
      //   page_referrer: document.referrer,
      // });

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

  // 监听 preloadEnd 状态变化，确保在信封动画完成时也能正确触发动画播放
  useEffect(() => {
    if (preloadEnd && envelopeConfig) {
      // 信封动画完成，等待动画完全消失后再播放
      // EnvelopeClientAnimation 的消失动画通常很快，但为了保险起见，等待一小段时间
      setTimeout(() => {
        handlePreloadEnd();
      }, 300);
    }
  }, [preloadEnd, envelopeConfig, handlePreloadEnd]);

  return (
    <div
      id='auto-scroll-container'
      className={clas(
        `flex-1 h-full max-h-full w-full overflow-y-auto mx-auto viewer_page_root`,
        isWebsite ? 'overflow-x-hidden' : 'overflow-x-auto',
        isWebsite && !isScreenshot && isPcDevice && 'md:max-w-[375px]'
      )}
      style={{
        ...(!isWebsite && {
          width: viewport_width ?? 0,
          maxWidth: '100%',
        }),
        ...(fixed_height && !isWebsite
          ? {
            aspectRatio: `${specWidth ?? 0} / ${specHeight ?? 0}`,
            // 确保 aspect-ratio 生效
            height: 'unset', //安卓旧设备奇怪的修复
            minHeight: 0,
          }
          : {}),
        ...style,
      }}
    >
      {/* viewer 模式下预加载第一页文字字体，使 document.fonts.ready 可正确等待 */}
      {/* <FirstPageFontPreload
        worksData={props.worksData}
        worksDetail={worksDetail as any}
      /> */}
      {mountInBrowser && worksData && (
        <WechatInfoProvider worksData={worksData} worksDetail={worksDetail}>
          <div
            className={clas(
              'website_root bg-gray-50 h-full relative',
              isPcDevice && 'pc',
              is_flip_page && 'flip_page h-full overflow-hidden'
              // !preloadEnd && 'hidden'
            )}
          >
            {/* 客户端接管的信封动画，否则用原来的加载页 */}
            {!!envelopeConfig ? (
              !query.screenshot && (
                <EnvelopeClientAnimation
                  key={worksDetail.id}
                  config={envelopeConfig}
                  onComplete={() => {
                    setPreloadEnd(true);
                  }}
                />
              )
            ) : (
              <PreloadPage
                ref={PreloadPageRef}
                key={worksDetail.id}
                worksCover={(worksDetail as any)?.cover || ''}
                worksId={worksDetail.id}
                appid={query.appid}
                userAgent={userAgent}
                needLoading={
                  isWebsite && !query.screenshot && !query.video_mode
                }
                loadEndCb={() => {
                  setPreloadEnd(true);
                }}
              />
            )}
            <CanvasAutoLayoutForViewer
              worksData={worksData}
              worksDetail={worksDetail}
            />
            <SuspendButton
              query={query}
              worksDetail={worksDetail}
              isVideoMode={false}
              isTempLink={!!isTempLink}
              adConfig={{
                floatAD: showFloatAD,
                trialExpired: showTrialExpired,
                showExpired: showExpired,
              }}
              musicVisible={
                !!worksData?.music?.url && !worksData.music.disabled
              }
              worksData={worksData!}
            />
          </div>
        </WechatInfoProvider>
      )}
    </div>
  );
}

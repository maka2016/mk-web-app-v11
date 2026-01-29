'use client';
import { onScreenShot } from '@/components/GridEditorV3/utils';
import { getAppId, getWorksId } from '@/services';
import { getShareUrl } from '@/store';
import { sendFeishuMessage } from '@/utils/feishu';
import { SerializedWorksEntity } from '@/utils/trpc';
import { cn } from '@workspace/ui/lib/utils';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

export interface DownloadQueue {
  url: string;
  filename: string;
}

interface PosterPreviewProps {
  viewerQuery?: Record<string, string>;
  /** 作品详情 */
  worksDetail?: SerializedWorksEntity;
  /** 是否在 iframe 加载完成后自动执行下载 */
  autoDownload?: boolean;
  /** 下载完成的回调函数，参数为图片 URL 数组 */
  onDownloadComplete?: (downloadQueue: DownloadQueue[]) => void;
  pageWidth?: number;
  aspectRatio?: number;
  containerClassName?: string;
}

const topColor = '#0000FF';
const bottomColor = '#FF00B7';

const downloadMultiplePage2 = async (
  blocks: HTMLElement[],
  query?: Record<string, string>
) => {
  const downloadQueue: DownloadQueue[] = [];
  const concurrency = 2; // 并发数量

  // 分批处理，每批最多2个并发请求
  for (let i = 0; i < Array.from(blocks).length; i += concurrency) {
    const batch = Array.from(blocks).slice(i, i + concurrency);

    // 并发处理当前批次
    const batchPromises = batch.map(async (blockElement, batchIndex) => {
      const globalIndex = i + batchIndex;
      const { width, height } = blockElement.getBoundingClientRect();
      const blockId = blockElement.dataset.rowId;
      const screenshotRes = await onScreenShot({
        id: getWorksId(),
        width: width,
        height: height,
        appid: getAppId(),
        screenshot_block: blockId,
        surfix: blockId,
        query: query,
      }).catch(() => {
        return null;
      });
      if (screenshotRes) {
        downloadQueue.push({
          url: screenshotRes[0],
          filename: `页面${globalIndex + 1}.png`,
        });
      }
    });

    // 等待当前批次完成
    await Promise.all(batchPromises);
  }

  return downloadQueue;
};

export const PosterPreview = ({
  viewerQuery,
  worksDetail,
  autoDownload = false,
  onDownloadComplete,
  pageWidth = 182,
  aspectRatio = 9 / 16,
  containerClassName = '',
}: PosterPreviewProps) => {
  const pageHeight = Math.floor(pageWidth / aspectRatio);
  const worksId = worksDetail?.id;
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const timer = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { viewport_width } = worksDetail?.specInfo || {};
  const innerWidth = viewport_width || 1080;
  const borderWidth = 4 / (pageWidth / innerWidth);
  const appid = getAppId();

  // 设置 iframe 的 viewport
  const setIframeViewport = (viewportWidth: number) => {
    const iframe = iframeRef.current;
    if (iframe) {
      const iframeDoc =
        iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        // 查找或创建 viewport meta 标签
        let viewportMeta = iframeDoc.querySelector(
          'meta[name="viewport"]'
        ) as HTMLMetaElement;

        if (!viewportMeta) {
          // 如果不存在，创建新的 viewport meta 标签
          viewportMeta = iframeDoc.createElement('meta');
          viewportMeta.setAttribute('name', 'viewport');
          const head =
            iframeDoc.head || iframeDoc.getElementsByTagName('head')[0];
          if (head) {
            head.appendChild(viewportMeta);
          }
        }

        // 设置 viewport 内容
        viewportMeta.setAttribute(
          'content',
          `width=${viewportWidth}, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no`
        );
        console.log(`已设置 iframe viewport 为 ${viewportWidth}`);
      }
    }
  };

  const onProgress = () => {
    timer.current = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 1;
        // 最多到99%，只有真正完成后才设置为100%
        if (newProgress >= 99) {
          clearInterval(timer.current);
          timer.current = null;
          return 99;
        }
        return newProgress;
      });
    }, 60);
  };

  const onScreenshotPoster = async (query = viewerQuery || {}) => {
    if (downloading) {
      return;
    }
    setDownloading(true);
    // 重置进度并开始进度条动画
    setProgress(0);
    onProgress();

    const iframe = iframeRef.current;
    let gridContainer: Element | null = null;

    if (iframe) {
      // 通过 contentDocument 访问 iframe 内部的文档
      const iframeDoc =
        iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        gridContainer = iframeDoc.querySelector('.Grid_container');
      }
    }

    const isFlatPage = worksDetail?.specInfo?.is_flat_page;

    let allBlocks = isFlatPage
      ? gridContainer?.querySelectorAll<HTMLElement>('.GridV2Comp')
      : gridContainer?.querySelectorAll<HTMLElement>(
          '.block_wrapper .editor_row_wrapper'
        );

    //！！！临时兼容旧数据，h5实现的海报脏数据？？临时修复作品脏数据导出问题
    if (!allBlocks || allBlocks.length < 1) {
      allBlocks = !isFlatPage
        ? gridContainer?.querySelectorAll<HTMLElement>('.GridV2Comp')
        : gridContainer?.querySelectorAll<HTMLElement>(
            '.block_wrapper .editor_row_wrapper'
          );
    }
    //！！！临时兼容旧数据，h5实现的海报脏数据？？临时修复作品脏数据导出问题

    const downloadQueue = await downloadMultiplePage2(
      Array.from(allBlocks || []),
      query || {}
    ).catch(error => {
      toast.error('图片生成失败');
      sendFeishuMessage(
        '图片下载',
        `网页图片生成失败`,
        `${error}-work:${worksId}`
      );
      return [];
    });

    // 清除定时器，确保进度条不再自动增长
    clearInterval(timer.current);
    timer.current = null;

    // 只有在真正完成后才设置为100%
    setProgress(100);
    setDownloading(false);

    if (onDownloadComplete && downloadQueue.length > 0) {
      onDownloadComplete(downloadQueue);
    }
  };

  // 监听 iframe 的加载完成事件
  useEffect(() => {
    if (!worksDetail) {
      return;
    }
    const handleMessage = (event: MessageEvent) => {
      // 验证消息来源（可选，根据实际需求）
      // if (event.origin !== window.location.origin) return;

      if (
        event.data &&
        event.data.type === 'event' &&
        event.data.event === 'ViewerLoaded'
      ) {
        console.log('收到 iframe ViewerLoaded 事件，可以开始截图');

        const { viewport_width } = worksDetail.specInfo;
        if (viewport_width) {
          setIframeViewport(viewport_width);
        }

        // 根据 autoDownload prop 决定是否自动下载
        if (autoDownload && !downloading) {
          onScreenshotPoster();
        }
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDownload, worksId, downloading, worksDetail]);

  useEffect(() => {
    return () => {
      clearInterval(timer.current);
      timer.current = null;
    };
  }, []);

  const clamp = (n: number, min = 0, max = 100) =>
    Math.max(min, Math.min(max, n));
  const p = clamp(progress) / 100;

  const iframeStyle = {
    width: innerWidth,
    height: Math.floor(pageHeight / (pageWidth / innerWidth)),
    transform: `scale(${pageWidth / innerWidth})`,
  };
  // 计算四边填充长度
  const w = +(iframeStyle.width || 0) + borderWidth;
  const h = +(iframeStyle.height || 0) + borderWidth;
  const P = 2 * (w + h) + borderWidth * 4;
  const L = P * p; // 需要被"点亮"的总长度
  const fillTop = Math.max(0, Math.min(L, w));
  const fillRight = Math.max(0, Math.min(Math.max(L - w, 0), h));
  const fillBottom = Math.max(0, Math.min(Math.max(L - w - h, 0), w));
  const fillLeft = Math.max(0, Math.min(Math.max(L - w - h - w, 0), h));

  const iframeUrl = getShareUrl(worksId || '', {
    ...(viewerQuery || {}),
    screenshot: 'true',
  });

  if (!worksDetail) {
    // 占位
    return (
      <div
        className={cn(
          'h-[340px] flex items-center justify-center relative pointer-events-none',
          containerClassName
        )}
      >
        <div className='relative flex items-center justify-center origin-center'>
          <div className='relative bg-[#f4f4f5]' style={iframeStyle}>
            <div className='w-full h-full border-none bg-white block relative z-[3] origin-center shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]'></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'h-[340px] flex items-center justify-center relative',
        containerClassName
      )}
    >
      <div className='relative flex items-center justify-center origin-center pointer-events-none'>
        <div className='relative bg-[#f4f4f5]' style={iframeStyle}>
          <iframe
            ref={iframeRef}
            className='w-full h-full border-none bg-white block relative z-[3] origin-center shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]'
            style={{
              width: '100%',
              height: '100%',
            }}
            src={iframeUrl}
          />

          {progress < 100 && (
            <>
              {/* 上边（从左→右） */}
              <div
                className='absolute pointer-events-none z-[4]'
                style={{
                  position: 'absolute',
                  left: 0,
                  top: -borderWidth,
                  height: borderWidth,
                  width: fillTop,
                  pointerEvents: 'none',
                  background: topColor, // 顶部纯蓝
                }}
              />
              {/* 右边（从上→下） */}
              <div
                className='absolute pointer-events-none z-[4]'
                style={{
                  position: 'absolute',
                  top: 0,
                  right: -borderWidth,
                  width: borderWidth,
                  height: fillRight,
                  pointerEvents: 'none',
                  // 竖向渐变：上蓝下粉
                  background: `linear-gradient(to bottom, ${topColor}, ${bottomColor})`,
                }}
              />
              {/* 下边（从右→左 填充，所以放在左侧，通过宽度表现；想从左到右可改逻辑） */}
              <div
                className='absolute pointer-events-none z-[4]'
                style={{
                  position: 'absolute',
                  left: -borderWidth + (w - fillBottom),
                  bottom: -borderWidth,
                  height: borderWidth,
                  width: fillBottom,
                  pointerEvents: 'none',
                  background: bottomColor, // 底部纯粉
                }}
              />
              {/* 左边（从下→上） */}
              <div
                className='absolute pointer-events-none z-[4]'
                style={{
                  position: 'absolute',
                  left: -borderWidth,
                  bottom: 0,
                  width: borderWidth,
                  height: fillLeft,
                  pointerEvents: 'none',
                  background: `linear-gradient(to bottom, ${topColor}, ${bottomColor})`,
                }}
              />
            </>
          )}
        </div>
      </div>

      {progress < 100 && (
        <div
          className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[3] font-semibold text-[48px] leading-[58px] text-center text-[#fafafa] [text-shadow:0px_4px_6px_rgba(0,0,0,0.1),0px_10px_15px_rgba(0,0,0,0.1)]'
          style={{ fontFamily: 'PingFang SC' }}
        >
          {progress.toFixed(2)}%
        </div>
      )}
    </div>
  );
};

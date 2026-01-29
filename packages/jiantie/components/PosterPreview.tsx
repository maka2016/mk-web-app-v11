'use client';
import { onScreenShot } from '@/components/GridEditorV3/utils';
import { getAppId } from '@/services';
import { sendFeishuMessage } from '@/utils/feishu';
import { SerializedWorksEntity } from '@/utils/trpc';
import { cn } from '@workspace/ui/lib/utils';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { getShareUrl } from '../store';

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

const topColor = '#eb97e7';
const bottomColor = '#f34cc1';

const downloadMultiplePage2 = async (
  blocks: HTMLElement[],
  worksId: string,
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
      const blockId = blockElement.dataset.rowId;
      const screenshotRes = await onScreenShot({
        id: worksId,
        width: 1080,
        height: 1080,
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
  const worksId = worksDetail?.id || '';
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const timer = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const cloneContainerRef = useRef<HTMLDivElement>(null);
  const [useCloneIndicator, setUseCloneIndicator] = useState(false);
  const isScreenshotInProgressRef = useRef(false); // 使用 ref 防止重复调用
  const { viewport_width } = worksDetail?.specInfo || {};
  const innerWidth = viewport_width || 1080;
  const borderWidth = 4 / (pageWidth / innerWidth);
  const appid = getAppId();

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

  const onScreenshotPoster = async (
    worksId: string,
    query = viewerQuery || {}
  ) => {
    // 使用 ref 进行同步检查，防止重复调用
    if (isScreenshotInProgressRef.current || downloading) {
      console.log('截图已在进行中，跳过重复调用');
      return;
    }
    isScreenshotInProgressRef.current = true;
    setDownloading(true);
    // 重置进度并开始进度条动画
    setProgress(0);
    onProgress();

    let gridContainer: Element | null = null;

    // 优先从当前 DOM 获取 .Grid_container
    gridContainer = document.querySelector('.Grid_container');

    // 如果当前 DOM 没有，才从 iframe 获取
    if (!gridContainer) {
      const iframe = iframeRef.current;
      if (iframe) {
        // 通过 contentDocument 访问 iframe 内部的文档
        const iframeDoc =
          iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          gridContainer = iframeDoc.querySelector('.Grid_container');
        }
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

    try {
      const downloadQueue = await downloadMultiplePage2(
        Array.from(allBlocks || []),
        worksId,
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
    } finally {
      // 确保在函数结束时重置标记
      isScreenshotInProgressRef.current = false;
    }
  };
  const gridContainer =
    document.querySelector<HTMLDivElement>('.Grid_container');

  // 检查 DOM 是否有 .Grid_container，如果有就使用 clone 作为指示器
  useEffect(() => {
    if (!worksDetail) {
      return;
    }

    if (gridContainer) {
      setUseCloneIndicator(true);
    } else {
      setUseCloneIndicator(false);
    }
  }, [worksDetail]);

  // 当 cloneContainer 渲染后，执行 clone 操作
  useEffect(() => {
    if (!useCloneIndicator) {
      return;
    }

    const cloneContainer = cloneContainerRef.current;

    if (gridContainer && cloneContainer) {
      // Clone 节点作为指示器
      const clonedNode = gridContainer.cloneNode(true) as HTMLElement;
      cloneContainer.innerHTML = '';
      cloneContainer.appendChild(clonedNode);
    }
  }, [useCloneIndicator]);

  // 当 autoDownload 为 true 时开始截图
  useEffect(() => {
    if (
      !worksDetail ||
      !autoDownload ||
      downloading ||
      isScreenshotInProgressRef.current
    ) {
      return;
    }

    // 如果使用 clone 指示器（DOM 中有 .Grid_container），立即开始截图
    if (useCloneIndicator) {
      onScreenshotPoster(worksId);
      return;
    }

    // 如果使用 iframe，需要等待 iframe 加载完成
    const iframe = iframeRef.current;
    if (!iframe) {
      return;
    }

    let timeoutId: NodeJS.Timeout | null = null;
    let isCleanedUp = false;

    const checkAndScreenshot = () => {
      // 如果已经清理或正在下载，不再继续
      if (isCleanedUp || isScreenshotInProgressRef.current || downloading) {
        return;
      }

      const iframeDoc =
        iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        const gridContainer = iframeDoc.querySelector('.Grid_container');
        if (gridContainer) {
          // iframe 加载完成且有 .Grid_container，开始截图
          onScreenshotPoster(worksId);
        } else if (!isCleanedUp) {
          // 如果还没加载完成，继续等待
          timeoutId = setTimeout(checkAndScreenshot, 100);
        }
      } else if (!isCleanedUp) {
        // iframe 文档还没准备好，继续等待
        timeoutId = setTimeout(checkAndScreenshot, 100);
      }
    };

    // 监听 iframe 的 load 事件
    const handleLoad = () => {
      if (!isCleanedUp && !isScreenshotInProgressRef.current) {
        // 延迟一点时间确保内容渲染完成
        timeoutId = setTimeout(checkAndScreenshot, 200);
      }
    };

    iframe.addEventListener('load', handleLoad);

    // 如果 iframe 已经加载完成，立即检查
    if (iframe.contentDocument && !isScreenshotInProgressRef.current) {
      checkAndScreenshot();
    }

    return () => {
      isCleanedUp = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      iframe.removeEventListener('load', handleLoad);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDownload, worksId, worksDetail, useCloneIndicator]);

  useEffect(() => {
    return () => {
      clearInterval(timer.current);
      timer.current = null;
    };
  }, []);

  const clamp = (n: number, min = 0, max = 100) =>
    Math.max(min, Math.min(max, n));
  const p = clamp(progress) / 100;

  const iframeStyle =
    useCloneIndicator && gridContainer
      ? {
          width: gridContainer.getBoundingClientRect().width,
          height: gridContainer.getBoundingClientRect().height,
          transform: `scale(${gridContainer.getBoundingClientRect().width / innerWidth})`,
        }
      : {
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

  const iframeUrl = getShareUrl(worksId, {
    ...(viewerQuery || {}),
    screenshot: 'true',
  });

  if (!worksDetail) {
    // 占位
    return (
      <div
        className={cn(
          'h-[440px] flex items-center justify-center relative pointer-events-none',
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
        'h-[440px] flex items-center justify-center relative overflow-hidden',
        containerClassName
      )}
    >
      <div className='relative flex items-center justify-center origin-center pointer-events-none'>
        <div className='relative bg-[#f4f4f5]' style={iframeStyle}>
          {useCloneIndicator ? (
            <div
              ref={cloneContainerRef}
              className='w-full h-full border-none bg-white relative z-[3] origin-center shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] overflow-hidden'
            />
          ) : (
            <iframe
              ref={iframeRef}
              className='w-full h-full border-none bg-white block relative z-[3] origin-center shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]'
              style={{
                width: '100%',
                height: '100%',
              }}
              src={iframeUrl}
            />
          )}

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

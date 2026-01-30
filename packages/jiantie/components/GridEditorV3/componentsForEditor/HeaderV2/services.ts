import { getAppId, getWorksId } from '@/services';
import { SerializedWorksEntity } from '@/utils';
import { downloadZip } from 'client-zip';
import FileSaver from 'file-saver';
import { getCanvaInfo2 } from '../../provider/utils';
import { GridRow, onScreenShot } from '../../utils';

export const downloadMultiplePage = async (
  blocks: GridRow[],
  /** 默认的高度 */
  defaultHeight?: number,
  worksDetail?: SerializedWorksEntity
) => {
  const downloadQueue: { url: string; filename: string }[] = [];
  const concurrency = 2; // 并发数量

  // 分批处理，每批最多2个并发请求
  for (let i = 0; i < blocks.length; i += concurrency) {
    const batch = blocks.slice(i, i + concurrency);

    // 并发处理当前批次
    const batchPromises = batch.map(async (block, batchIndex) => {
      const globalIndex = i + batchIndex;
      const blockId = block.id;
      console.log('blockId', blockId);
      const currPageUrl = await downloadOneBlock(block, defaultHeight, worksDetail);
      if (currPageUrl) {
        return {
          url: currPageUrl,
          filename: `页面${globalIndex + 1}.png`,
        };
      }
      return null;
    });

    // 等待当前批次完成
    const batchResults = await Promise.all(batchPromises);

    // 将结果添加到下载队列
    batchResults.forEach(result => {
      if (result) {
        downloadQueue.push(result);
      }
    });
  }

  return downloadQueue;
};

const downloadOneBlock = async (block: GridRow, defaultHeight?: number, worksDetail?: SerializedWorksEntity) => {
  const blockId = block.id;
  if (typeof blockId === 'undefined') {
    throw new Error('blockId is undefined');
  }

  try {
    const canvaInfo2 = getCanvaInfo2(worksDetail);
    let pageHeight = 0;
    if (canvaInfo2.isFixedHeight) {
      pageHeight = canvaInfo2.canvaH as number;
    } else if (block.canvasHeight) {
      pageHeight = block.canvasHeight;
    } else {
      const blockDOM = document.querySelector<HTMLDivElement>(`#designer_scroll_container #editor_block_${block.id}`);
      if (blockDOM) {
        // return;
        pageHeight = blockDOM.getBoundingClientRect().height;
      } else if (defaultHeight) {
        pageHeight = defaultHeight;
      } else {
        throw new Error(`找不到blockDOM: ${blockId}`);
      }
    }
    const { viewportWidth, viewportScale } = canvaInfo2;
    const screenshotWidth = viewportWidth;
    const screenshotHeight = (pageHeight || 1) * viewportScale;

    const screenshotRes = await onScreenShot({
      id: getWorksId(),
      width: screenshotWidth,
      height: screenshotHeight,
      appid: getAppId(),
      screenshot_block: blockId,
      surfix: blockId,
    }).catch(() => {
      return null;
    });

    return screenshotRes && screenshotRes[0] ? screenshotRes[0] : null;
  } catch (error) {
    console.error('downloadOneBlock error:', error);
  }
};

export const zipImageFromUrl = async (downloadQueue: { url: string; filename: string }[]) => {
  try {
    // 下载所有图片并准备zip内容
    const zipContents = [];
    for (let i = 0; i < downloadQueue.length; i++) {
      const { url, filename } = downloadQueue[i];
      try {
        const response = await fetch(url);
        if (!response.ok) {
          continue;
        }
        const blob = await response.blob();
        zipContents.push({
          name: filename,
          input: blob,
        });
      } catch (error) {
        console.error(`下载 ${filename} 失败:`, error);
      }
    }

    if (zipContents.length === 0) {
      return;
    }

    // 创建并下载zip文件
    const zipBlob = await downloadZip(zipContents).blob();
    const zipFilename = `页面集合_${downloadQueue.length}页.zip`;
    FileSaver.saveAs(zipBlob, zipFilename);

    return zipBlob;
  } catch (error) {
    console.error('打包下载失败:', error);
  }
};

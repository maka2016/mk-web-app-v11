import { getAppId, getWorksId } from '@mk/services';
import axios from 'axios';
import { downloadZip } from 'client-zip';
import FileSaver from 'file-saver';
import qs from 'qs';
import { getCanvaInfo2 } from '../../comp/provider/utils';
import { GridRow, onScreenShot } from '../../shared';

const promptToken = `d4db37673366976ea41b8daa6e17862e526b939e81f5768718ba5cd3f501a46f9203ebc16815d123f2da5577de6935efe58d797d2558dde34aae38f65a6724cf525c93f75d8f2df9e90b06783ec9d72191f28538df49d7409eabb4c072d34fd12896dd2254ab7fe998987939d135595b734c92ccd1b12a2decd00dfca8582438`;

export const requestCMSDesigner = axios.create({
  baseURL: 'https://prompt.maka.im',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + promptToken,
  },
});

const getTemplateCmsDocumentId = async (templateId: string) => {
  const queryStr = {
    filters: {
      template_id: {
        $eq: templateId,
      },
    },
    pagination: {
      page: 1,
      pageSize: 1,
    },
    sort: ['sort_score:desc'],
  };

  const templateCmsDocumentId = await requestCMSDesigner.get(
    `/api/template-items?${qs.stringify(queryStr, {
      encode: false,
    })}`
  );

  // 添加更详细的日志
  // console.log("Response data.data:", templateCmsDocumentId.data.data);

  // 添加错误处理
  if (!templateCmsDocumentId.data?.data) {
    console.error('No data found for templateId:', templateId);
    throw new Error(`No template found with ID: ${templateId}`);
  }

  return templateCmsDocumentId.data.data?.[0]?.documentId;
};

export const genTemplateCover = async (
  templateId: string,
  designer_uid: string,
  coverType: '动态' | '静态' = '动态'
) => {
  console.log('templateId', templateId);
  const templateUrl = `https://www.jiantieapp.com/mobile/template?id=${templateId}&screenshot=true`;
  const apiUrl =
    coverType === '动态'
      ? 'https://www.maka.im/mk-gif-generator/screenshot-v2/v3/make-gif-url-sync'
      : 'https://www.maka.im/mk-gif-generator/screenshot/v2/export';
  const apiUrlFinal = `${apiUrl}?url=${encodeURIComponent(
    templateUrl
  )}&width=540&height=960&works_id=${templateId}&uid=${designer_uid}&mode=template&watermark=0&setpts=0.5&pageCount=1`;
  console.log('apiUrlFinal', apiUrlFinal);
  const coverRes = await axios.get(apiUrlFinal, {
    timeout: 60000,
  });

  const coverUrl =
    coverType === '动态'
      ? coverRes.data.fullUrls[0]
      : coverRes.data?.data?.fullUrls?.[0];
  console.log('coverUrl', coverUrl);

  return coverUrl;
};

export const updateTemplateCoverUrl = async (
  templateId: string,
  coverUrl: string
) => {
  await axios.put(`https://works-server-v2.maka.im/template/v1/${templateId}`, {
    cover: coverUrl,
  });

  const templateCmsDocumentId = await getTemplateCmsDocumentId(templateId);

  await requestCMSDesigner.put(`/api/template-items/${templateCmsDocumentId}`, {
    data: {
      cover_url: coverUrl,
    },
  });
};

export const downloadMultiplePage = async (
  blocks: GridRow[],
  /** 默认的高度 */
  defaultHeight?: number
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
      const currPageUrl = await downloadOneBlock(block, defaultHeight);
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

const downloadOneBlock = async (block: GridRow, defaultHeight?: number) => {
  const blockId = block.id;
  if (typeof blockId === 'undefined') {
    throw new Error('blockId is undefined');
  }

  try {
    const canvaInfo2 = getCanvaInfo2();
    let pageHeight = 0;
    if (canvaInfo2.isFixedHeight) {
      pageHeight = canvaInfo2.canvaH as number;
    } else if (block.canvasHeight) {
      pageHeight = block.canvasHeight;
    } else {
      const blockDOM = document.querySelector<HTMLDivElement>(
        `#designer_scroll_container #editor_block_${block.id}`
      );
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

export const zipImageFromUrl = async (
  downloadQueue: { url: string; filename: string }[]
) => {
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

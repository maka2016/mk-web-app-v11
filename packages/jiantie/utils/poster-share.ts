/**
 * 海报分享工具函数
 * 提供统一的海报生成和分享功能
 */

import { getCanvaInfo2 } from '@/components/GridEditorV3/provider/utils';
import { onScreenShot } from '@/components/GridEditorV3/utils';
import { cdnApi, getAppId, getWorkData2 } from '@/services';
import APPBridge from '@/store/app-bridge';
import { isAndroid } from '@/utils';
import toast from 'react-hot-toast';
import { getShareUrl } from '../store';

/**
 * 检测设备是否支持海报分享功能
 * @returns Promise<boolean> 是否支持海报分享
 */
export async function checkSupportSharePoster(): Promise<boolean> {
  if (APPBridge.isRN()) {
    const features = await APPBridge.featureDetect(['MKShare']);
    return features?.MKShare || false;
  } else if (isAndroid()) {
    const features = await APPBridge.featureDetect(['WechatSharePoster']);
    return features?.WechatSharePoster || false;
  } else {
    return true;
  }
}

/**
 * 生成作品海报
 * @param worksId 作品ID
 * @param options 配置选项
 * @returns Promise<{ urls: string[], fileUri?: string }> 生成的图片URLs和fileUri
 */
export async function generateWorkPoster(
  worksId: string,
  options?: {
    onProgress?: (progress: number) => void;
    saveToApp?: boolean; // 是否在APP中保存图片获取fileUri
  }
): Promise<{ urls: string[]; fileUri?: string } | undefined> {
  try {
    // 获取作品数据和画布信息
    const res = await getWorkData2(worksId);
    const detail = res?.detail;
    const worksData = res?.work_data;

    if (!detail || !worksData) {
      toast.error('获取作品信息失败');
      return;
    }

    const canvaInfo2 = getCanvaInfo2(detail);
    if (!canvaInfo2) {
      toast.error('画布信息获取失败');
      return;
    }

    // 生成截图
    const urls = await onScreenShot({
      id: worksId,
      width: 1080,
      height: 1920,
      appid: getAppId(),
    });

    let fileUri: string | undefined;

    // 如果需要保存到APP并且在APP环境中
    if (options?.saveToApp !== false && APPBridge.judgeIsInApp()) {
      fileUri = await new Promise<string | undefined>(resolve => {
        APPBridge.appCall(
          {
            type: 'MKSaveImage',
            appid: 'jiantie',
            params: {
              urls: urls,
            },
            jsCbFnName: 'appBridgeOnSaveImagedCb',
          },
          (e: any) => {
            resolve(e?.fileuri);
          },
          3000000
        );
      });
    }

    return { urls, fileUri };
  } catch (error: any) {
    console.error('生成海报失败:', error);
    toast.error('生成失败，请重试');
    return;
  }
}

/**
 * 分享参数配置
 */
export interface SharePosterParams {
  /** 作品ID */
  worksId: string;
  /** 作品标题 */
  title: string;
  /** 作品描述（link类型分享需要） */
  desc?: string;
  /** 作品封面（link类型分享需要） */
  cover?: string | null;
  /** 分享类型 */
  shareType: 'wechat' | 'wechatTimeline' | 'system' | 'copyLink' | 'qrCode';
  /** 海报URLs */
  urls: string[];
  /** fileUri（如果有） */
  fileUri?: string;
  /** 是否支持海报分享 */
  isSupportSharePoster: boolean;
}

/**
 * 执行海报分享
 * 根据设备支持情况智能选择分享方式（images或link）
 * @param params 分享参数
 */
export async function sharePoster(params: SharePosterParams): Promise<void> {
  const { worksId, title, desc, cover, shareType, urls, fileUri, isSupportSharePoster } = params;

  const appid = getAppId();

  // 系统分享特殊处理
  if (shareType === 'system') {
    // Web环境：使用 navigator.share
    if (navigator.share) {
      try {
        // 检查是否支持分享文件
        const canShareFiles =
          navigator.canShare &&
          navigator.canShare({
            files: [new File([''], 'test.png', { type: 'image/png' })] as any,
          });

        if (canShareFiles && urls && urls.length > 0) {
          // 支持文件分享，转换URLs为File对象
          const files = await Promise.all(
            urls.map(async (url, index) => {
              const response = await fetch(url);
              const blob = await response.blob();
              return new File([blob], `poster-${index + 1}.png`, {
                type: 'image/png',
              });
            })
          );

          await navigator.share({
            title: title || '邀请函',
            text: desc || '',
            files,
          });
        } else {
          // 不支持文件分享，降级为链接分享
          const shareUrl = getShareUrl(worksId);
          await navigator.share({
            title: title || '邀请函',
            text: desc || '',
            url: shareUrl,
          });
        }
      } catch (error: any) {
        // 用户取消无需提示
        if (error && error.name !== 'AbortError') {
          console.error('系统分享失败:', error);
          toast.error('系统分享失败');
        }
      }
      return;
    }
  }

  // 其他分享类型根据支持情况选择
  if (isSupportSharePoster) {
    // 支持海报分享，使用 images 类型
    APPBridge.appCall({
      type: 'MKShare',
      appid: 'jiantie',
      params: {
        title: title || '邀请函',
        type: 'images',
        shareType: shareType,
        urls: urls,
        fileuri: fileUri,
      },
    });
  } else {
    // 不支持海报分享，使用 link 类型降级方案
    APPBridge.appCall({
      type: 'MKShare',
      appid: 'jiantie',
      params: {
        title: title || '邀请函',
        content: desc || '',
        thumb: cdnApi(cover || undefined, {
          resizeWidth: 120,
          format: 'webp',
        }),
        type: 'link',
        shareType: shareType,
        url: getShareUrl(worksId),
      },
    });
  }
}

/**
 * 一键分享海报（包含生成和分享）
 * 这是最简化的使用方式，适合大多数场景
 * @param params 分享参数
 * @returns Promise<boolean> 是否分享成功
 */
export async function generateAndSharePoster(
  params: Omit<SharePosterParams, 'urls' | 'fileUri' | 'isSupportSharePoster'>
): Promise<boolean> {
  try {
    // 检测支持情况
    const isSupportSharePoster = await checkSupportSharePoster();

    // 生成海报
    const result = await generateWorkPoster(params.worksId, {
      saveToApp: isSupportSharePoster, // 只有支持海报分享时才需要保存
    });

    if (!result || !result.urls || result.urls.length === 0) {
      return false;
    }

    // 执行分享
    await sharePoster({
      ...params,
      urls: result.urls,
      fileUri: result.fileUri,
      isSupportSharePoster,
    });

    return true;
  } catch (error) {
    console.error('分享失败:', error);
    return false;
  }
}

/**
 * 权限检查服务
 * 统一处理分享、导出等权限检查
 */

import { getAppId, getUid, request, worksServerV2 } from '@/services';

/**
 * 检查是否可以无水印分享
 * @param worksId 作品 ID
 * @returns 是否有分享权限
 */
export async function canShareWithoutWatermark(
  worksId: string
): Promise<boolean> {
  try {
    const appid = getAppId();
    const uid = getUid();

    const res: any = await request.get(
      `${worksServerV2()}/works/${appid}/${uid}/${worksId}/can-export-share-without-watermark`
    );

    return !!res?.canExportShare;
  } catch (error) {
    console.error('检查分享权限失败:', error);
    return false;
  }
}

/**
 * 检查是否可以无水印导出
 * @param worksId 作品 ID
 * @returns 是否有导出权限
 */
export async function canExportWithoutWatermark(
  worksId: string
): Promise<boolean> {
  try {
    const appid = getAppId();
    const uid = getUid();

    const res: any = await request.get(
      `${worksServerV2()}/works/${appid}/${uid}/${worksId}/can-view-without-watermark`
    );

    return !!res?.canView;
  } catch (error) {
    console.error('检查导出权限失败:', error);
    return false;
  }
}

// hooks/useWatermarkStatus.ts
'use client';

import { checkPurchased, getAppId, getPermissionList, getUid, request, worksServerV2 } from '@/services';
import { trpc } from '@/utils/trpc';

export function useCheckPublish() {
  const getPermissions = async () => {
    const appid = getAppId();
    const uid = getUid();
    try {
      const res = (await getPermissionList(appid, uid)) as any;
      if (res.permissions) {
        const ret: Record<string, any> = {};
        res.permissions.forEach((item: any) => {
          ret[item.alias] = item.value || 'true';
        });

        return ret;
      }
    } catch (error) {
      console.error(error);
      return {};
    }
  };

  const removeWatermark = async (works_id: string) => {
    const appid = getAppId();
    const uid = getUid();
    const permissions = await getPermissions();

    let purchased = await checkPurchased(works_id, uid, appid);

    return !!(purchased || permissions?.remove_watermarks);
  };

  const h5Share = async (works_id: string) => {
    const appid = getAppId();
    const uid = getUid();
    const permissions = await getPermissions();
    let purchased = await checkPurchased(works_id, uid, appid);

    return !!(purchased || permissions?.tiantianhuodong_sharing || permissions?.H5_wenzhangH5_work_sharing);
  };

  const canShareWithoutWatermark = async (works_id: string) => {
    // 检查是否使用 v11 API
    const useV11API = typeof process !== 'undefined' && process.env.APIV11 === 'true';

    if (useV11API) {
      try {
        // 使用新的 tRPC 接口
        const res = await trpc.works.canShareWithoutWatermark.query({
          worksId: works_id,
        });
        return !!res?.canExportShare;
      } catch (error) {
        console.error('检查分享权限失败（v11 API）:', error);
        return false;
      }
    }

    // 使用旧的 API
    const appid = getAppId();
    const uid = getUid();
    let res: any = await request.get(
      `${worksServerV2()}/works/${appid}/${uid}/${works_id}/can-export-share-without-watermark`
    );

    return !!res?.canExportShare;
  };

  const canExportWithoutWatermark = async (works_id: string) => {
    // const appid = getAppId();
    // const uid = getUid();
    // let res: any = await request.get(`${worksServerV2()}/works/${appid}/${uid}/${works_id}/can-view-without-watermark`);
    return await canShareWithoutWatermark(works_id);
  };

  return {
    removeWatermark,
    h5Share,
    canShareWithoutWatermark,
    canExportWithoutWatermark,
  };
}

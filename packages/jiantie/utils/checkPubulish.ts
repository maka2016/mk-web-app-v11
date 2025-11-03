// hooks/useWatermarkStatus.ts
'use client';

import {
  checkPurchased,
  getAppId,
  getPermissionList,
  getUid,
  request,
  worksServerV2,
} from '@/services';

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

    return !!(
      purchased ||
      permissions?.tiantianhuodong_sharing ||
      permissions?.H5_wenzhangH5_work_sharing
    );
  };

  const canShareWithoutWatermark = async (works_id: string) => {
    const appid = getAppId();
    const uid = getUid();
    let res: any = await request.get(
      `${worksServerV2()}/works/${appid}/${uid}/${works_id}/can-export-share-without-watermark`
    );

    return !!res?.canExportShare;
  };

  const canExportWithoutWatermark = async (works_id: string) => {
    const appid = getAppId();
    const uid = getUid();
    let res: any = await request.get(
      `${worksServerV2()}/works/${appid}/${uid}/${works_id}/can-view-without-watermark`
    );

    return res.canView;
  };

  return {
    removeWatermark,
    h5Share,
    canShareWithoutWatermark,
    canExportWithoutWatermark,
  };
}

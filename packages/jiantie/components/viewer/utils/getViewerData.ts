import { API } from '@mk/services';
import { IWorksData } from '@mk/works-store/types';
import { prisma } from '@workspace/database';
import { getTemplateDataFromOSS, getWorksDataFromOSS } from '@workspace/server';

/**
 * 服务端专用：获取查看器数据
 * 支持作品和模板两种类型
 */
export async function getViewerData(params: {
  worksId: string;
  uid?: string;
  version?: string;
  isTemplate?: boolean;
}) {
  const { worksId, version = 'latest', isTemplate: isTemplateParam } = params;
  const isTemplate = isTemplateParam ?? /^T_/.test(worksId);

  let worksDetail: any;
  let actualUid: number;
  let actualVersion: string | number = version;

  if (isTemplate) {
    // 1. 获取模板详情
    const templateDetail = await prisma.templateEntity.findUnique({
      where: { id: worksId },
    });

    if (!templateDetail) {
      throw new Error('模板不存在');
    }

    if (templateDetail.deleted) {
      throw new Error('模板已删除');
    }

    worksDetail = templateDetail;
    actualUid = templateDetail.designer_uid;
    actualVersion = templateDetail.version || 1;
  } else {
    // 1. 获取作品详情
    worksDetail = await prisma.worksEntity.findUnique({
      where: { id: worksId },
    });

    if (!worksDetail) {
      throw new Error('作品不存在');
    }

    if (worksDetail.deleted) {
      throw new Error('作品已删除');
    }

    actualUid = worksDetail.uid;
    actualVersion = version === 'latest' ? worksDetail.version : version;
  }

  // 2. 获取规格信息
  let specInfo = null;
  if (worksDetail.spec_id) {
    try {
      specInfo = await prisma.worksSpecEntity.findUnique({
        where: { id: worksDetail.spec_id },
      });
    } catch (error) {
      console.error('[getViewerData] Failed to get spec info:', error);
    }
  }

  // 3. 并行获取作品数据和 widget metadata
  const [worksData] = await Promise.all([
    isTemplate
      ? getTemplateDataFromOSS(worksId)
      : getWorksDataFromOSS(worksId, actualUid, actualVersion as string),
  ]);

  return {
    worksDetail: {
      ...worksDetail,
      specInfo,
      uid: actualUid, // 统一添加 uid 字段
    },
    worksData: worksData as IWorksData,
  };
}

/**
 * 获取用户权限列表
 */
export async function getUserPermissions(params: {
  uid: string | number;
  worksId: string;
  appid?: string;
}) {
  const { uid, worksId, appid = 'jiantie' } = params;
  const isTemplate = /^T_/.test(worksId);

  if (isTemplate) {
    return {};
  }

  try {
    const response = await fetch(
      API('apiv10', `/user-permissions/${appid}/${uid}`),
      { method: 'GET' }
    );

    const res = await response.json();
    if (res.permissions) {
      const ret: Record<string, any> = {};
      res.permissions.forEach((item: any) => {
        ret[item.alias] = item.value || 'true';
      });
      return ret;
    }
    return {};
  } catch (error) {
    console.error('[getUserPermissions] Error:', error);
    return {};
  }
}

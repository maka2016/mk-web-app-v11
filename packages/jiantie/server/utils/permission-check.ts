/**
 * 服务端权限检查工具
 * 用于 SSR 或服务端 API 中检查用户权限
 */

import { prisma } from '@mk/jiantie/v11-database';

/**
 * 检查用户是否可以无水印分享/导出作品
 * 判断条件：
 * 1. 用户的角色权限包含 base_template_use
 * 2. 用户对该作品拥有有效的 user_resource 记录
 * 
 * @param uid 用户 ID
 * @param worksId 作品 ID
 * @returns 是否有权限
 */
export async function checkCanShareWithoutWatermark(
  uid: number,
  worksId: string
): Promise<boolean> {
  const now = new Date();

  try {
    // 1. 检查用户角色是否包含 base_template_use 权限
    const userRoles = await prisma.userRole.findMany({
      where: {
        uid,
        OR: [
          { expires_at: null }, // 永久有效
          { expires_at: { gte: now } }, // 未过期
        ],
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    // 检查角色权限中是否包含 base_template_use
    const hasBaseTemplateUse = userRoles.some(userRole =>
      userRole.role.rolePermissions.some(
        rp => rp.permission.alias === 'base_template_use'
      )
    );

    if (hasBaseTemplateUse) {
      return true;
    }

    // 2. 检查用户是否对该作品拥有有效的 user_resource 记录
    const userResources = await prisma.userResource.findMany({
      where: {
        uid,
        resource_id: worksId,
        OR: [
          { expires_at: null }, // 永久有效
          { expires_at: { gte: now } }, // 未过期
        ],
      },
    });

    return userResources.length > 0;
  } catch (error) {
    console.error('检查分享权限失败:', error);
    return false;
  }
}

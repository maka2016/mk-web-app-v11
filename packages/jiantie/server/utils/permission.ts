/**
 * 权限检查工具函数
 */

import {
  DASHBOARD_MENU_CATEGORIES,
  type DashboardMenuCategoryConfig,
  type DashboardMenuItemConfig,
} from '../../config/dashboardMenu';

/**
 * 路由路径到菜单分组的映射规则
 * 从统一的菜单配置中动态生成
 */
const ROUTE_TO_MENU_GROUP_MAP: Array<{
  pattern: string | RegExp;
  group: string;
}> = DASHBOARD_MENU_CATEGORIES.flatMap(
  (category: DashboardMenuCategoryConfig) =>
    category.items.map((item: DashboardMenuItemConfig) => {
      const basePath =
        item.routePattern ?? item.url.split('?')[0];
      return {
        pattern: new RegExp(`^${basePath}`),
        group: category.label,
      };
    })
);

/**
 * 根据路由路径获取所属的菜单分组
 * @param route 路由路径
 * @returns 菜单分组标识，如果未匹配则返回 null
 */
export function getMenuGroupByRoute(route: string): string | null {
  for (const { pattern, group } of ROUTE_TO_MENU_GROUP_MAP) {
    if (typeof pattern === 'string') {
      if (route.startsWith(pattern)) {
        return group;
      }
    } else {
      if (pattern.test(route)) {
        return group;
      }
    }
  }
  return null;
}

/**
 * 获取用户的所有权限（通过角色，返回菜单分组标识列表）
 * @param prisma Prisma 客户端实例
 * @param adminUserId 管理员用户ID
 * @returns 菜单分组标识数组
 */
export async function getUserPermissions(
  prisma: unknown,
  adminUserId: string
): Promise<string[]> {
  try {
    const p = prisma as {
      adminUserRole: {
        findMany: (args: unknown) => Promise<
          Array<{
            menu_groups: unknown | null;
          }>
        >;
      };
    };

    // 获取管理员的所有角色分配（从 AdminUserRole 读取权限快照 menu_groups）
    const adminUserRoles = await p.adminUserRole.findMany({
      where: {
        admin_user_id: adminUserId,
        // 检查角色是否在有效期内
        OR: [
          { start_at: null },
          { start_at: { lte: new Date() } },
        ],
        AND: [
          {
            OR: [
              { expires_at: null },
              { expires_at: { gte: new Date() } },
            ],
          },
        ],
      },
      select: {
        menu_groups: true,
      },
    });

    const permissions = new Set<string>();

    for (const row of adminUserRoles) {
      const groups = row.menu_groups;
      if (Array.isArray(groups)) {
        for (const g of groups) {
          if (typeof g === 'string' && g.trim()) permissions.add(g);
        }
      }
    }

    // 兼容历史数据：
    // 之前「基础数据管理」涵盖了现在拆分出的「平台资源管理」，
    // 为了不影响老角色的权限，这里做一次向后兼容映射。
    if (permissions.has('基础数据管理')) {
      permissions.add('平台资源管理');
    }

    return Array.from(permissions);
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
}

/**
 * 检查用户是否有访问某个菜单分组的权限
 * @param prisma Prisma 客户端实例
 * @param adminUserId 管理员用户ID
 * @param menuGroup 菜单分组标识
 * @returns 是否有权限
 */
export async function checkGroupPermission(
  prisma: unknown,
  adminUserId: string,
  menuGroup: string
): Promise<boolean> {
  try {
    const userPermissions = await getUserPermissions(prisma, adminUserId);
    return userPermissions.includes(menuGroup);
  } catch (error) {
    console.error('Error checking group permission:', error);
    return false;
  }
}

/**
 * 检查用户是否有访问某个路由的权限
 * @param prisma Prisma 客户端实例
 * @param adminUserId 管理员用户ID
 * @param route 路由路径
 * @returns 是否有权限
 */
export async function checkRoutePermission(
  prisma: unknown,
  adminUserId: string,
  route: string
): Promise<boolean> {
  const menuGroup = getMenuGroupByRoute(route);
  if (!menuGroup) {
    // 如果路由没有匹配到任何菜单分组，默认允许访问（可能是新页面还未配置）
    return true;
  }
  return checkGroupPermission(prisma, adminUserId, menuGroup);
}

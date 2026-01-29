import { log } from '@/server/logger';
import { Prisma } from '@mk/jiantie/v11-database/generated/client/client';

/**
 * 发货服务
 *
 * 根据订单的商品配置和 trace_metadata（可能包含作品id），
 * 为用户发放有效期角色或有效期资源。
 */

// 有效期配置类型
interface ValidityConfig {
  type: 'days' | 'months' | 'years' | 'forever';
  value: number; // 当 type 为 forever 时，此字段无效
}

// 发货配置类型
interface ShippingConfig {
  /**
   * 角色别名数组（Role.alias），而不是角色 ID
   * 便于在配置中使用可读性更好的标识，例如 "jiantie_vip_year"
   */
  roles?: string[];
  permissions?: number[]; // 权限ID数组（可选）
  validity?: ValidityConfig; // 有效期配置
  resource?: Array<{
    permission_id?: number; // 权限ID（可选）
    resource_type: string; // 资源类型：template、works等
  }>;
}

// 资源权限配置类型
interface ResourceConfig {
  permission_id?: number;
  resource_type: string;
  action_url?: string; // 权限动作URL（可选）
}

/**
 * 从 trace_metadata 中解析作品id（works_id 或 workId）
 * @param traceMetadata trace_metadata 字段（可能是 JSON 对象或字符串）
 * @returns 作品id，如果不存在则返回 null
 */
export function parseWorkIdFromTraceMetadata(
  traceMetadata: string | Prisma.JsonValue | null | undefined
): string | null {
  if (!traceMetadata) return null;

  try {
    // 如果已经是对象，直接使用；如果是字符串，则解析
    let metadata: any;
    if (typeof traceMetadata === 'string') {
      metadata = JSON.parse(traceMetadata);
    } else {
      metadata = traceMetadata;
    }

    if (typeof metadata !== 'object' || metadata === null) return null;

    // 优先使用 works_id，如果没有则使用 workId
    return metadata.works_id || metadata.workId || null;
  } catch {
    // JSON解析失败，返回null
    return null;
  }
}

/**
 * 根据有效期配置计算过期时间
 * @param validity 有效期配置
 * @param startDate 开始时间（默认为当前时间）
 * @returns 过期时间，如果为永久则返回 null
 */
export function calculateExpiryDate(
  validity: ValidityConfig | null | undefined,
  startDate: Date = new Date()
): Date | null {
  if (!validity) return null;

  if (validity.type === 'forever') {
    return null;
  }

  const expiryDate = new Date(startDate);

  switch (validity.type) {
    case 'days':
      expiryDate.setDate(expiryDate.getDate() + validity.value);
      break;
    case 'months':
      expiryDate.setMonth(expiryDate.getMonth() + validity.value);
      break;
    case 'years':
      expiryDate.setFullYear(expiryDate.getFullYear() + validity.value);
      break;
    default:
      return null;
  }

  return expiryDate;
}

/** shipRoles 返回值 */
export interface ShipRolesResult {
  success: boolean;
  rolesShipped: number;
  error?: string;
}

/**
 * 为用户发放角色
 * @param tx Prisma 事务客户端
 * @param uid 用户ID
 * @param roleAliases 角色别名数组（Role.alias）
 * @param validity 有效期配置
 * @param shippedAt 发货时间
 * @param appid 应用ID，查询角色时必须传入（Role 按 appid 区分）
 * @returns 发货结果（成功与否、发放数量、失败时的错误信息）
 */
export async function shipRoles(
  tx: any,
  uid: number,
  roleAliases: string[],
  validity: ValidityConfig | null | undefined,
  shippedAt: Date,
  appid: string
): Promise<ShipRolesResult> {
  if (!roleAliases || roleAliases.length === 0) {
    log.error({ uid, roleAliases, validity, shippedAt }, '没有角色别名，跳过发货');
    return { success: false, rolesShipped: 0, error: '没有角色别名，跳过发货' };
  }

  // 先根据别名 + appid 查出实际角色 ID
  const roles = await tx.role.findMany({
    where: {
      alias: { in: roleAliases },
      appid,
    },
  });

  if (!roles || roles.length === 0) {
    log.error({ uid, roleAliases, validity, shippedAt }, '没有找到角色，跳过发货');
    return { success: false, rolesShipped: 0, error: '没有找到对应角色' };
  }

  const expiresAt = calculateExpiryDate(validity, shippedAt);
  const startAt = shippedAt;

  try {
    // 为每个角色创建或更新用户角色关联
    for (const role of roles) {
      const roleId = role.id;
      // 查询是否已存在该角色（使用 findFirst 因为复合唯一约束）
      const existingUserRole = await tx.userRole.findFirst({
        where: {
          uid,
          role_id: roleId,
        },
      });

      if (existingUserRole) {
        // 如果已存在，需要判断是否需要更新过期时间
        // 如果新的是永久，设置为永久；如果现有是永久，不更新
        // 如果现有未过期，从现有过期时间追加时间；如果现有已过期，从发货时间开始计算
        let shouldUpdate = false;
        let newExpiresAt = expiresAt;

        if (expiresAt === null) {
          // 新的是永久，直接更新
          shouldUpdate = true;
          newExpiresAt = null;
        } else if (existingUserRole.expires_at === null) {
          // 现有的已经是永久，不需要更新
          shouldUpdate = false;
        } else {
          // 现有过期时间
          const existingExpiresAt = new Date(existingUserRole.expires_at);
          const now = new Date();

          if (existingExpiresAt > now) {
            // 现有未过期：从现有过期时间追加时间
            newExpiresAt = calculateExpiryDate(validity, existingExpiresAt);
            shouldUpdate = true;
          } else {
            // 现有已过期：从发货时间开始计算（相当于重新开始）
            if (expiresAt > existingExpiresAt) {
              shouldUpdate = true;
              newExpiresAt = expiresAt;
            }
          }
        }

        if (shouldUpdate) {
          log.info({ uid, roleId, newExpiresAt }, '更新用户角色信息');
          await tx.userRole.update({
            where: {
              id: existingUserRole.id,
            },
            data: {
              expires_at: newExpiresAt,
              update_time: new Date(),
            },
          });
        }
      } else {
        // 如果不存在，创建新的用户角色关联
        log.info({ uid, roleId, expiresAt }, '创建新的用户角色关联');
        await tx.userRole.create({
          data: {
            uid,
            role_id: roleId,
            start_at: startAt,
            expires_at: expiresAt,
          },
        });
      }
    }
    return { success: true, rolesShipped: roles.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ uid, roleAliases, err }, '发放角色失败');
    return { success: false, rolesShipped: 0, error: msg };
  }
}

/**
 * 为用户发放资源权限
 * @param tx Prisma 事务客户端
 * @param uid 用户ID
 * @param resources 资源权限配置数组
 * @param resourceId 资源ID（通常是作品id）
 * @param validity 有效期配置
 * @param shippedAt 发货时间
 */
export async function shipResources(
  tx: any,
  uid: number,
  resources: ResourceConfig[],
  resourceId: string,
  validity: ValidityConfig | null | undefined,
  shippedAt: Date
): Promise<void> {
  log.info({ uid, resources, resourceId, validity, shippedAt }, '开始发放资源');
  if (!resources || resources.length === 0) {
    log.info({ uid, resources, resourceId, validity, shippedAt }, '没有资源配置，跳过发放');
  }
  if (!resourceId) {
    throw new Error('资源ID不能为空');
  }

  const expiresAt = calculateExpiryDate(validity, shippedAt);
  const startAt = shippedAt;
  log.info({ expiresAt, startAt }, '计算过期时间和开始时间');

  // 为每个资源配置创建或更新用户资源权限
  for (const resourceConfig of resources) {
    const { permission_id, resource_type, action_url } = resourceConfig;
    // 默认 action_url 为 "get"
    const finalActionUrl = action_url || 'get';

    // 查找是否已存在相同的资源权限
    // UserResource 没有唯一约束，所以需要手动查询
    const existingUserResource = await tx.userResource.findFirst({
      where: {
        uid,
        resource_id: resourceId,
        resource_type,
        permission_id: permission_id || null,
        action_url: finalActionUrl,
      },
    });

    if (existingUserResource) {
      // 如果已存在，判断是否需要更新过期时间
      // 如果新的是永久，设置为永久；如果现有是永久，不更新
      // 如果现有未过期，从现有过期时间追加时间；如果现有已过期，从发货时间开始计算
      let shouldUpdate = false;
      let newExpiresAt = expiresAt;

      if (expiresAt === null) {
        // 新的是永久，直接更新
        shouldUpdate = true;
        newExpiresAt = null;
      } else if (existingUserResource.expires_at === null) {
        // 现有的已经是永久，不需要更新
        shouldUpdate = false;
      } else {
        // 现有过期时间
        const existingExpiresAt = new Date(existingUserResource.expires_at);
        const now = new Date();

        if (existingExpiresAt > now) {
          // 现有未过期：从现有过期时间追加时间
          newExpiresAt = calculateExpiryDate(validity, existingExpiresAt);
          shouldUpdate = true;
        } else {
          // 现有已过期：从发货时间开始计算（相当于重新开始）
          if (expiresAt > existingExpiresAt) {
            shouldUpdate = true;
            newExpiresAt = expiresAt;
          }
        }
      }

      if (shouldUpdate) {
        await tx.userResource.update({
          where: {
            id: existingUserResource.id,
          },
          data: {
            expires_at: newExpiresAt,
            update_time: new Date(),
          },
        });
      }
    } else {
      // 如果不存在，创建新的用户资源权限
      await tx.userResource.create({
        data: {
          uid,
          resource_id: resourceId,
          resource_type,
          permission_id: permission_id || undefined,
          action_url: finalActionUrl,
          start_at: startAt,
          expires_at: expiresAt,
        },
      });
    }
  }
}

/**
 * shipOrder 的入参：从订单可得到的发货上下文。
 * 当同时传入 order_no、shipping_type、source 时，会在内部创建并更新发货日志。
 */
export interface ShipOrderContext {
  uid: number;
  meta: Prisma.JsonValue;
  appid?: string;
  product: {
    id: string;
    shipping_config: Prisma.JsonValue;
    appid?: string;
  } | null;
  shipped_at: Date;
  order_no?: string;
  shipping_type?: string;
  source?: string;
  shipping_data?: Record<string, unknown>;
}

/**
 * 主发货函数
 * 根据订单的商品配置，为用户发放角色或资源权限。
 * 当 context 中带 order_no、shipping_type、source 时，会在内部创建发货日志并更新为 success/failed。
 *
 * @param tx Prisma 事务客户端
 * @param context 发货上下文（由订单得到：uid、meta、appid、product、shipped_at；写日志时再带 order_no/shipping_type/source/shipping_data）
 * @returns 发货结果，若写了发货日志则带 shippingLogId
 */
export async function shipOrder(
  tx: any,
  context: ShipOrderContext
): Promise<{
  success: boolean;
  rolesShipped?: number;
  resourcesShipped?: number;
  error?: string;
  shippingLogId?: string;
}> {
  const { uid, meta, appid, product, shipped_at: shippedAt } = context;

  const finish = async (
    res: { success: boolean; rolesShipped?: number; resourcesShipped?: number; error?: string },
    logRecord: { id: string; shipping_data: unknown } | null
  ) => {
    if (logRecord) {
      const baseData = (logRecord.shipping_data as Record<string, unknown>) || {};
      await tx.shippingLog.update({
        where: { id: logRecord.id },
        data: {
          status: res.success ? 'success' : 'failed',
          error_message: res.error ?? undefined,
          shipping_data: res.success
            ? {
                ...baseData,
                shipment_result: { roles_shipped: res.rolesShipped ?? 0, resources_shipped: res.resourcesShipped ?? 0 },
              }
            : baseData,
        },
      });
    }
    return { ...res, shippingLogId: logRecord?.id };
  };

  if (!product) {
    return { success: false, error: '商品不存在' };
  }

  let shippingConfig: ShippingConfig;
  try {
    const config =
      typeof product.shipping_config === 'string' ? JSON.parse(product.shipping_config) : product.shipping_config;
    log.info({ config }, '发货配置');
    if (!config || typeof config !== 'object') {
      return { success: false, error: '发货配置为空或格式错误' };
    }
    shippingConfig = config as ShippingConfig;
  } catch (error) {
    return {
      success: false,
      error: `解析发货配置失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  if (
    (!shippingConfig.roles || shippingConfig.roles.length === 0) &&
    (!shippingConfig.resource || shippingConfig.resource.length === 0)
  ) {
    return { success: true, error: '发货配置中未包含角色或资源权限配置' };
  }

  let logRecord: { id: string; shipping_data: unknown } | null = null;
  const needLog = context.order_no && context.shipping_type && context.source;
  if (needLog) {
    const logAppid = appid ?? (product && 'appid' in product ? product.appid : '');
    const row = await tx.shippingLog.create({
      data: {
        order_no: context.order_no,
        appid: logAppid,
        uid,
        shipping_type: context.shipping_type,
        source: context.source,
        shipping_data: (context.shipping_data ?? {}) as Prisma.JsonValue,
        status: 'pending',
        shipped_at: shippedAt,
      },
    });
    logRecord = { id: row.id, shipping_data: context.shipping_data ?? {} };
  }

  const validity = shippingConfig.validity;
  let rolesShipped = 0;
  let resourcesShipped = 0;

  try {
    if (shippingConfig.roles && shippingConfig.roles.length > 0) {
      const roleAppid = appid ?? (product && 'appid' in product ? product.appid : undefined);
      if (!roleAppid) {
        return await finish(
          { success: false, rolesShipped: 0, resourcesShipped: 0, error: '查询角色需要 appid' },
          logRecord
        );
      }
      const rolesResult = await shipRoles(tx, uid, shippingConfig.roles, validity, shippedAt, roleAppid);
      rolesShipped = rolesResult.rolesShipped;
      if (!rolesResult.success) {
        return await finish(
          { success: false, rolesShipped: rolesResult.rolesShipped, resourcesShipped: 0, error: rolesResult.error },
          logRecord
        );
      }
    }

    if (shippingConfig.resource && shippingConfig.resource.length > 0) {
      const metaObj = meta as Record<string, unknown> | null;
      const traceMetadata = metaObj?.trace_metadata ?? null;
      const workId = parseWorkIdFromTraceMetadata(traceMetadata);
      log.info({ workId }, '作品id');
      if (!workId) {
        return await finish(
          {
            success: false,
            rolesShipped,
            resourcesShipped: 0,
            error: '需要资源发货但订单的 trace_metadata 中未找到作品id（works_id 或 workId）',
          },
          logRecord
        );
      }
      await shipResources(tx, uid, shippingConfig.resource, workId, validity, shippedAt);
      resourcesShipped = shippingConfig.resource.length;
    }

    return await finish({ success: true, rolesShipped, resourcesShipped }, logRecord);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return await finish({ success: false, rolesShipped, resourcesShipped, error: errMsg }, logRecord);
  }
}

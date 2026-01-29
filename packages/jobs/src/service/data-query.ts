// 数据查询服务 - 封装常用的数据查询逻辑
import { getBiAdb, getOrderDB, getUsercenterDB } from './db-connections';
import { normalizeDevice } from './device-utils';
import { parseWorksIdFromUrl } from '../utils/utils';
import { innerUids } from '../jiantie/entry/innerUids';

/**
 * VIP拦截事件信息
 */
export interface VipInterceptEvent {
  url: string;
  distinct_id: string;
  platform?: string;
  appid?: string;
}

/**
 * 查询VIP拦截事件
 * @param startTime 开始时间
 * @param endTime 结束时间
 * @param options 查询选项
 * @returns VIP拦截事件列表
 */
export async function queryVipInterceptEvents(
  startTime: Date,
  endTime: Date,
  options: {
    appids?: string[];
    selectFields?: string[];
  } = {}
): Promise<VipInterceptEvent[]> {
  const biAdb = getBiAdb();
  const {
    appids = ['jiantie', 'maka'],
    selectFields = ['url', 'distinct_id'],
  } = options;

  let query = biAdb('mk_datawork_sls_events')
    .whereBetween('event_time', [startTime, endTime])
    .whereNotIn('uid', innerUids)
    .where(function () {
      this.where({
        page_type: 'vip_intercept_page',
        page_id: 'vip_intercept_page',
      })
        .orWhere({
          object_type: 'vip_intercept_pay',
        })
        // 兼容 maka 新版付费弹窗：event_type=page_view, page_type = vip_intercept_page_v2024q2
        .orWhere({
          page_type: 'vip_intercept_page_v2024q2',
          event_type: 'page_view',
        });
    });

  // 如果指定了appids，则添加条件
  if (appids.length > 0) {
    query = query.whereIn('appid', appids);
  }

  // 添加select字段
  const fieldsToSelect = [...selectFields];
  if (
    selectFields.includes('platform') &&
    !fieldsToSelect.includes('platform')
  ) {
    fieldsToSelect.push('platform');
  }
  if (selectFields.includes('appid') && !fieldsToSelect.includes('appid')) {
    fieldsToSelect.push('appid');
  }

  const events = await query.select(...fieldsToSelect);

  return events as VipInterceptEvent[];
}

/**
 * 从VIP拦截事件中解析works_id并聚合统计
 * @param events VIP拦截事件列表
 * @returns works_id到统计信息的Map
 */
export function aggregateVipInterceptByWorks(
  events: VipInterceptEvent[]
): Map<string, { pv: number; distinctIds: Set<string> }> {
  const statsMap = new Map<string, { pv: number; distinctIds: Set<string> }>();

  for (const event of events) {
    const worksId = parseWorksIdFromUrl(event.url);
    if (!worksId) continue;

    if (!statsMap.has(worksId)) {
      statsMap.set(worksId, { pv: 0, distinctIds: new Set<string>() });
    }

    const stats = statsMap.get(worksId)!;
    stats.pv++;
    if (event.distinct_id) {
      stats.distinctIds.add(event.distinct_id);
    }
  }

  return statsMap;
}

/**
 * 订单查询结果
 */
export interface OrderQueryResult {
  id: number;
  order_no: string;
  uid: number;
  amount: number;
  created_at: Date;
  trace_metadata: string;
}

/**
 * 查询订单数据
 * @param startTime 开始时间
 * @param endTime 结束时间
 * @param options 查询选项
 * @returns 订单列表
 */
export async function queryOrdersByDateRange(
  startTime: Date,
  endTime: Date,
  options: {
    appids?: string[];
    orderStatus?: string;
    useCreatedAt?: boolean; // true使用created_at，false使用payments.paid_at
  } = {}
): Promise<OrderQueryResult[]> {
  const orderDB = getOrderDB();
  const {
    appids = ['maka'],
    orderStatus = 'paid',
    useCreatedAt = true,
  } = options;

  let query = orderDB('orders')
    .join('order_extra_info', 'orders.order_no', 'order_extra_info.order_no')
    .whereIn('orders.appid', appids)
    .where('orders.order_status', orderStatus);

  // 根据useCreatedAt决定使用哪个时间字段
  if (useCreatedAt) {
    query = query.whereBetween('orders.created_at', [startTime, endTime]);
  } else {
    // 需要join payments表
    query = query
      .join('payments', 'orders.order_no', 'payments.order_no')
      .whereNotNull('payments.paid_at')
      .whereBetween('payments.paid_at', [startTime, endTime]);
  }

  const orders = await query.select(
    'orders.id',
    'orders.order_no',
    'orders.uid',
    'orders.amount',
    'orders.created_at',
    'order_extra_info.trace_metadata'
  );

  return orders as OrderQueryResult[];
}

/**
 * 查询用户设备信息
 * @param uids 用户ID列表
 * @param options 查询选项
 * @returns uid到device的Map
 */
export async function queryUserDevices(
  uids: number[],
  options: {
    appids?: string[];
  } = {}
): Promise<Map<number, string>> {
  const usercenterDB = getUsercenterDB();
  const { appids = ['jiantie', 'maka'] } = options;

  if (uids.length === 0) {
    return new Map();
  }

  const userRegSources = await usercenterDB('user_reg_sources')
    .whereIn('uid', uids)
    .whereIn('appid', appids)
    .whereNotIn('uid', innerUids)
    .select('uid', 'device');

  const deviceMap = new Map<number, string>();
  for (const source of userRegSources as any[]) {
    if (!deviceMap.has(source.uid)) {
      deviceMap.set(source.uid, normalizeDevice(source.device));
    }
  }

  return deviceMap;
}

/**
 * 从works metadata中过滤符合条件的works
 * @param works works列表，每个work需要有metadata字段
 * @param filter 过滤条件
 * @returns 符合条件的works列表
 */
export function filterWorksByMetadata<T extends { metadata: any }>(
  works: T[],
  filter: {
    ref_page_type?: string;
    ref_page_id?: string | string[];
  }
): T[] {
  return works.filter(work => {
    if (!work.metadata || typeof work.metadata !== 'object') return false;

    const meta = work.metadata as any;

    if (filter.ref_page_type && meta.ref_page_type !== filter.ref_page_type) {
      return false;
    }

    if (filter.ref_page_id !== undefined) {
      const refPageId = meta.ref_page_id;
      if (Array.isArray(filter.ref_page_id)) {
        if (!refPageId || !filter.ref_page_id.includes(refPageId)) {
          return false;
        }
      } else {
        if (refPageId !== filter.ref_page_id) {
          return false;
        }
      }
    }

    return true;
  });
}

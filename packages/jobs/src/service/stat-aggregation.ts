// 统计聚合服务 - 封装常用的数据聚合逻辑
import { normalizeDevice } from './device-utils';

/**
 * 按设备端聚合的PV/UV统计
 */
export interface DeviceStats {
  pv: number;
  uv: number;
}

/**
 * 按设备端聚合统计数据
 * @param events 事件列表，每个事件需要有platform/distinct_id字段
 * @returns 设备端到统计信息的Map
 */
export function aggregateByDevice<T extends { platform?: string; distinct_id?: string }>(
  events: T[],
  options: {
    getDevice?: (event: T) => string;
    countPV?: (event: T) => boolean;
    countUV?: (event: T) => boolean;
  } = {}
): Map<string, DeviceStats> {
  const { getDevice, countPV, countUV } = options;
  const statsMap = new Map<string, DeviceStats>();

  for (const event of events) {
    const device = getDevice
      ? normalizeDevice(getDevice(event))
      : normalizeDevice(event.platform);

    if (!statsMap.has(device)) {
      statsMap.set(device, { pv: 0, uv: 0 });
    }

    const stats = statsMap.get(device)!;

    // 计算PV
    if (!countPV || countPV(event)) {
      stats.pv++;
    }

    // 计算UV
    if (event.distinct_id && (!countUV || countUV(event))) {
      // 这里需要在外部维护distinctIds Set，或者返回更详细的结构
      // 简化版本：只统计PV，UV需要调用方单独处理
    }
  }

  return statsMap;
}

/**
 * 按设备端聚合订单统计
 */
export interface OrderDeviceStats {
  count: number;
  amount: number; // 金额，单位为分
}

/**
 * 按设备端聚合订单数据
 * @param orders 订单列表
 * @param uidToDevice uid到device的映射
 * @param options 聚合选项
 * @returns 设备端到订单统计的Map
 */
export function aggregateOrdersByDevice(
  orders: Array<{ uid: number; amount: number }>,
  uidToDevice: Map<number, string>,
  options: {
    defaultDevice?: string;
  } = {}
): Map<string, OrderDeviceStats> {
  const { defaultDevice = 'other' } = options;
  const statsMap = new Map<string, OrderDeviceStats>();

  for (const order of orders) {
    const device = uidToDevice.get(order.uid) || defaultDevice;

    if (!statsMap.has(device)) {
      statsMap.set(device, { count: 0, amount: 0 });
    }

    const stats = statsMap.get(device)!;
    stats.count++;
    stats.amount += Number(order.amount) || 0;
  }

  return statsMap;
}

/**
 * 收集所有出现的设备端
 * @param sources 多个设备端来源
 * @returns 设备端Set
 */
export function collectAllDevices(...sources: Array<string | Map<string, any> | Array<{ platform?: string }>>): Set<string> {
  const devices = new Set<string>();

  for (const source of sources) {
    if (typeof source === 'string') {
      devices.add(normalizeDevice(source));
    } else if (source instanceof Map) {
      for (const device of source.keys()) {
        devices.add(normalizeDevice(device));
      }
    } else if (Array.isArray(source)) {
      for (const item of source) {
        if (item.platform) {
          devices.add(normalizeDevice(item.platform));
        }
      }
    }
  }

  return devices;
}

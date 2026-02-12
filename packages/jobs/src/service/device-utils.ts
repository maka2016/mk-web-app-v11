// 设备工具函数 - 设备类型标准化等

/**
 * 标准化设备类型
 * 将各种设备类型转换为标准格式：web、ios、android、wap、mini_program、other
 * @param device 原始设备类型
 * @returns 标准化后的设备类型
 */
export function normalizeDevice(device: string | null | undefined): string {
  if (!device) return 'other';
  const normalized = device.toLowerCase().trim();

  // 直接匹配标准类型
  if (
    ['web', 'ios', 'android', 'wap', 'miniprogram', 'other'].includes(
      normalized
    )
  ) {
    return normalized;
  }

  // 匹配iOS相关
  if (
    normalized.includes('ios') ||
    normalized.includes('iphone') ||
    normalized.includes('ipad')
  ) {
    return 'ios';
  }

  // 匹配Android相关
  if (normalized.includes('android')) {
    return 'android';
  }

  // 匹配Web相关
  if (
    normalized.includes('web') ||
    normalized.includes('pc') ||
    normalized.includes('desktop')
  ) {
    return 'web';
  }

  // 匹配WAP相关
  if (
    normalized.includes('wap') ||
    normalized.includes('mobile') ||
    normalized.includes('h5')
  ) {
    return 'wap';
  }

  // 匹配小程序相关
  if (
    normalized.includes('mini_program') ||
    normalized.includes('miniprogram')
  ) {
    return 'miniprogram';
  }

  // 其他情况返回other
  return 'other';
}

// 通用工具函数：日期处理、worksId 解析等

/**
 * 解析日期参数，默认今天
 * @param dateStr 日期字符串，格式：YYYY-MM-DD
 * @returns 日期对象
 */
export function parseDate(dateStr?: string): Date {
  if (dateStr) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new Error(`无效的日期格式: ${dateStr}，请使用 YYYY-MM-DD 格式`);
    }
    return date;
  }
  return new Date();
}

/**
 * 获取日期的开始时间（00:00:00）
 */
export function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * 获取日期的结束时间（23:59:59.999）
 */
export function getEndOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * 将 Date 转成 YYYY-MM-DD 字符串
 */
export function toDateString(input: Date): string {
  const y = input.getFullYear();
  const m = String(input.getMonth() + 1).padStart(2, '0');
  const d = String(input.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 从URL中解析works_id参数
 */
export function parseWorksIdFromUrl(
  url: string | null | undefined
): string | null {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('works_id');
  } catch {
    // 如果不是完整URL，尝试正则匹配
    const match = url.match(/[?&]works_id=([^&]+)/);
    return match ? match[1] : null;
  }
}

/**
 * 从trace_metadata中解析works_id或workId
 */
export function parseWorksIdFromTraceMetadata(
  traceMetadata: string | null | undefined
): string | null {
  if (!traceMetadata) return null;
  try {
    const metadata = JSON.parse(traceMetadata);
    if (typeof metadata !== 'object' || metadata === null) return null;
    // 优先使用works_id，如果没有则使用workId
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj: any = metadata;
    return obj.works_id || obj.workId || null;
  } catch {
    // JSON解析失败，返回null
    return null;
  }
}

/**
 * 从works metadata中解析ref_page_type和ref_page_id
 * @param metadata works实体的metadata字段（可能是JSON对象或字符串）
 * @returns ref_page_type和ref_page_id
 */
export function parseRefPageFromMetadata(metadata: any): {
  ref_page_type: string | null;
  ref_page_id: string | null;
} {
  if (!metadata || typeof metadata !== 'object') {
    return { ref_page_type: null, ref_page_id: null };
  }

  const ref_page_type =
    typeof metadata.ref_page_type === 'string' ? metadata.ref_page_type : null;
  const ref_page_id =
    typeof metadata.ref_page_id === 'string' ? metadata.ref_page_id : null;

  return { ref_page_type, ref_page_id };
}

/**
 * 从订单trace_metadata中解析ref_page_type和ref_page_id
 * @param traceMetadata 订单的trace_metadata字段（JSON字符串）
 * @returns ref_page_type和ref_page_id
 */
export function parseRefPageFromTraceMetadata(
  traceMetadata: string | null | undefined
): { ref_page_type: string | null; ref_page_id: string | null } {
  if (!traceMetadata) return { ref_page_type: null, ref_page_id: null };
  try {
    const metadata = JSON.parse(traceMetadata);
    if (typeof metadata !== 'object' || metadata === null) {
      return { ref_page_type: null, ref_page_id: null };
    }
    return {
      ref_page_type: metadata.ref_page_type || null,
      ref_page_id: metadata.ref_page_id || null,
    };
  } catch {
    // JSON解析失败，返回null
    return { ref_page_type: null, ref_page_id: null };
  }
}

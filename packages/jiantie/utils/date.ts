/**
 * 将本地日期字符串（YYYY-MM-DD）转换为 UTC 日期字符串
 * @param dateStr 日期字符串，格式为 YYYY-MM-DD
 * @returns UTC 日期字符串，格式为 YYYY-MM-DD，如果输入为空则返回 undefined
 */
export function convertToUtcDate(
  dateStr: string | undefined
): string | undefined {
  if (!dateStr) {
    return undefined;
  }
  return new Date(dateStr + 'T00:00:00').toISOString().split('T')[0];
}

// export function utcToLocalDateString(utc: string | Date): string {
//   const date = typeof utc === 'string' ? new Date(utc) : utc;
//   return new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000)
//     .toISOString()
//     .split('T')[0];
// }

export function utcToLocalDateString(utc: string): string {
  const d = new Date(utc);
  const local = new Date(d.getTime() + 24 * 60 * 60000);
  return local.toISOString().split('T')[0];
}

import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { defaultLocale, locales } from './config';

/**
 * 解析 locale 字符串为语言和地区
 * 例如: "zh-CN" → { language: "zh", region: "CN" }
 *       "en" → { language: "en", region: undefined }
 */
function parseLocale(raw: string): { language: string; region?: string } {
  const parts = raw.split('-');
  return {
    language: parts[0]?.toLowerCase() ?? '',
    region: parts[1]?.toUpperCase(),
  };
}

// zh 繁体地区列表
const zhTraditionalRegions = ['HK', 'MO', 'TW'];

/**
 * 根据原始 locale 值匹配最合适的消息文件 locale
 * 匹配策略（优先级从高到低）：
 * 1. 精确匹配（忽略大小写）
 * 2. 按语言匹配（zh 特殊处理繁简体，其他语言取第一个匹配项）
 * 3. 回退到 defaultLocale
 */
function resolveLocale(raw: string): string {
  if (!raw) return defaultLocale;

  const { language, region } = parseLocale(raw);
  if (!language) return defaultLocale;

  // 1. 精确匹配
  const exactMatch = locales.find(l => l.toLowerCase() === raw.toLowerCase());
  if (exactMatch) return exactMatch;

  // 2. 按语言匹配
  if (language === 'zh') {
    // 港澳台地区 → 繁体(zh-TW)，其余 → 简体(zh-CN)
    return zhTraditionalRegions.includes(region ?? '') ? 'zh-TW' : 'zh-CN';
  }

  const langMatch = locales.find(l => parseLocale(l).language === language);
  if (langMatch) return langMatch;

  // 3. 回退到 default
  return defaultLocale;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get('NEXT_LOCALE')?.value ?? '';

  const resolvedLocale = resolveLocale(rawLocale);
  // 消息文件使用大写命名（如 ZH-CN.json、EN.json）
  const messageLocale = resolvedLocale.toUpperCase();

  return {
    locale: rawLocale.toUpperCase() || defaultLocale.toUpperCase(),
    messages: (await import(`../messages/${messageLocale}.json`)).default,
  };
});

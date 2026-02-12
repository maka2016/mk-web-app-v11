import { SolarDay } from 'tyme4ts';
import { MarkGroupConfig, MkCalendarV3Props } from './types';

export const DEFAULT_STYLE: MkCalendarV3Props['style'] = {
  todayColor: '#EF4444',
  textColor: '#1F2937',
  borderRadius: 4,
  padding: 2, // 日历项内边距（px）
  visibleWeeks: 6,
  borderColor: 'transparent', // 描边颜色，默认透明
  borderWidth: 0, // 描边粗细（px），默认0
  weekDayTextColor: '#1F2937', // 周数文字颜色，默认与文字颜色相同
  fontSize: 14, // 字体大小（px），默认14
  fontFamily: '', // 字体族，默认空（使用系统默认字体）
  fontWeight: 400, // 字体粗细，默认400
  lunarFontSize: 10, // 农历字体大小（px），默认10
  // 兼容旧样式配置
};

export const DEFAULT_MARK_GROUPS: MarkGroupConfig[] = [
  {
    id: 'mark-group-1',
    title: '放假日期',
    items: ['休', '假', '节', '庆', '年', '事', '病', '婚'],
    style: {
      backgroundColor: '#10B981',
      textColor: '#FFFFFF',
      cornerBackgroundColor: '#EF4444',
      cornerTextColor: '#FFFFFF',
      borderColor: 'transparent', // 描边颜色，默认透明
      borderWidth: 0, // 描边粗细（px），默认0
    },
  },
  {
    id: 'mark-group-2',
    title: '补班日期',
    items: ['班', '补', '调', '加', '工', '值'],
    style: {
      backgroundColor: '#F59E0B',
      textColor: '#FFFFFF',
      cornerBackgroundColor: '#3B82F6',
      cornerTextColor: '#FFFFFF',
      borderColor: 'transparent', // 描边颜色，默认透明
      borderWidth: 0, // 描边粗细（px），默认0
    },
  },
];

export function generateMarkGroupId(): string {
  return `mark-group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function hexToRgba(hex: string, alpha = 1) {
  // 验证透明度范围
  if (alpha < 0 || alpha > 1) {
    throw new Error('透明度必须在0到1之间');
  }

  if (!hex) {
    return '';
  }

  // 移除可能存在的#前缀
  hex = hex.replace(/^#/, '');

  // 验证十六进制格式
  if (!/^(?:[0-9a-fA-F]{3}){1,2}$/.test(hex)) {
    throw new Error('无效的十六进制颜色格式');
  }

  // 处理3位简写格式
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map(char => char + char)
      .join('');
  }

  // 解析RGB值
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // 返回RGBA字符串
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** 默认分隔条回退色：DEFAULT_STYLE.textColor #1F2937 对应 rgba */
const DEFAULT_DIVIDER_FALLBACK = 'rgba(31, 41, 55, 0.063)';

/**
 * 安全调用 hexToRgba：无效 hex（如渐变、空、格式错误）时返回 fallback，避免抛错导致整页崩溃
 */
export function safeHexToRgba(
  hex: string,
  alpha: number,
  fallback = DEFAULT_DIVIDER_FALLBACK
): string {
  try {
    return hexToRgba(hex || '', alpha);
  } catch {
    return fallback;
  }
}

/**
 * 判断颜色值是否是渐变
 */
export function isGradient(value?: string): boolean {
  if (!value) return false;
  return /^linear-gradient\(/.test(value.trim());
}

/**
 * 将公历日期转换为农历显示文本
 * @param year 公历年份
 * @param month 公历月份（1-12）
 * @param day 公历日期
 * @returns 农历日期字符串，格式如 "正月初一"，tyme4ts 已自动使用简化格式（如"廿三"）
 */
export function getLunarDateText(
  year: number,
  month: number,
  day: number
): string {
  try {
    // 动态导入 tyme4ts，避免 SSR 问题
    // 在客户端使用时才导入
    if (typeof window === 'undefined') {
      return '';
    }

    // 使用 SolarDay 创建公历日期，然后转换为农历
    const solar = SolarDay.fromYmd(year, month, day);
    const lunar = solar.getLunarDay();

    // 获取农历日期（数字 1-30）
    const lunarDayNum = lunar.getDay();

    // 农历日期名称数组（tyme4ts 内部使用的格式，已包含简化格式）
    const dayNames = [
      '初一', '初二', '初三', '初四', '初五',
      '初六', '初七', '初八', '初九', '初十',
      '十一', '十二', '十三', '十四', '十五',
      '十六', '十七', '十八', '十九', '二十',
      '廿一', '廿二', '廿三', '廿四', '廿五',
      '廿六', '廿七', '廿八', '廿九', '三十'
    ];

    const lunarDay = dayNames[lunarDayNum - 1] || '';

    return `${lunarDay}`;
  } catch (error) {
    // 如果转换失败，返回空字符串
    console.warn('农历转换失败:', error);
    return '';
  }
}

import { MkCalendarV3Props } from './types';

export const DEFAULT_STYLE: MkCalendarV3Props['style'] = {
  backgroundColor: '#FFFFFF',
  todayColor: '#EF4444',
  textColor: '#1F2937',
  borderRadius: 4,
  mark1BackgroundColor: '#10B981',
  mark1TextColor: '#FFFFFF',
  mark1CornerBackgroundColor: '#EF4444',
  mark1CornerTextColor: '#FFFFFF',
  mark2BackgroundColor: '#F59E0B',
  mark2TextColor: '#FFFFFF',
  mark2CornerBackgroundColor: '#3B82F6',
  mark2CornerTextColor: '#FFFFFF',
  visibleWeeks: 6,
};

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

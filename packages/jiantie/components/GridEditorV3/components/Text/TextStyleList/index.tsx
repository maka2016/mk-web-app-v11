import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  Check,
  CheckCheck,
  CircleCheck,
  ArrowRight,
  MoveRight,
  Moon,
  MoonStar,
  Flag,
  Zap,
  Heart,
  Phone,
  Bell,
  ThumbsUp,
  Gift,
  Gem,
} from 'lucide-react';

// 图标映射配置
export const LUCIDE_ICONS = {
  check: Check,
  'check-check': CheckCheck,
  'circle-check': CircleCheck,
  'arrow-right': ArrowRight,
  'move-right': MoveRight,
  moon: Moon,
  'moon-star': MoonStar,
  flag: Flag,
  zap: Zap,
  heart: Heart,
  phone: Phone,
  bell: Bell,
  'thumbs-up': ThumbsUp,
  gift: Gift,
  gem: Gem,
} as const;

export type IconName = keyof typeof LUCIDE_ICONS;

// SVG图标列表样式配置
export const svgIconStyles = [
  { value: 'check' as IconName, label: '勾选' },
  { value: 'check-check' as IconName, label: '双勾选' },
  { value: 'circle-check' as IconName, label: '圆圈勾选' },
  { value: 'arrow-right' as IconName, label: '右箭头' },
  { value: 'move-right' as IconName, label: '向右移动' },
  { value: 'moon' as IconName, label: '月亮' },
  { value: 'moon-star' as IconName, label: '月亮星星' },
  { value: 'flag' as IconName, label: '旗帜' },
  { value: 'zap' as IconName, label: '闪电' },
  { value: 'heart' as IconName, label: '心形' },
  { value: 'phone' as IconName, label: '电话' },
  { value: 'bell' as IconName, label: '铃铛' },
  { value: 'thumbs-up' as IconName, label: '点赞' },
  { value: 'gift' as IconName, label: '礼物' },
  { value: 'gem' as IconName, label: '宝石' },
];

// 常规列表样式配置
export const regularListStyles = [
  { value: 'disc', label: '实心圆点' },
  { value: 'circle', label: '空心圆点' },
  { value: 'square', label: '方块' },
  { value: 'decimal', label: '数字' },
  { value: 'lower-roman', label: '小写罗马数字' },
  { value: 'upper-roman', label: '大写罗马数字' },
  { value: 'lower-alpha', label: '小写字母' },
  { value: 'upper-alpha', label: '大写字母' },
  { value: 'none', label: '无标记' },
];

// Lucide图标组件
export const LucideIcon: React.FC<{
  iconName: IconName;
  size?: number;
  color?: string;
  className?: string;
}> = ({ iconName, size = 16, color = 'currentColor', className }) => {
  const IconComponent = LUCIDE_ICONS[iconName];

  if (!IconComponent) {
    return null;
  }

  return <IconComponent size={size} color={color} className={className} />;
};

// 解析listStyle字符串的工具函数
export const parseListStyle = (listStyle?: string) => {
  if (!listStyle) {
    return { type: 'regular', value: 'disc', color: '#000000' };
  }

  if (listStyle.startsWith('svg-icon:')) {
    const match = listStyle.match(/svg-icon:\s*([^\s]+)(?:\s+(.+))?/);
    return {
      type: 'svg' as const,
      value: (match?.[1] || 'check') as IconName,
      color: match?.[2] || '#000000',
    };
  }

  if (listStyle.startsWith('custom-icon:')) {
    const match = listStyle.match(/custom-icon:\s*([^\s]+)(?:\s+(.+))?/);
    return {
      type: 'custom' as const,
      value: match?.[1] || '',
      color: match?.[2] || '#000000',
    };
  }

  if (listStyle.startsWith('url(')) {
    return {
      type: 'custom' as const,
      value: listStyle.replace('url(', '').replace(')', ''),
      color: '#000000',
    };
  }

  return {
    type: 'regular' as const,
    value: listStyle.replace('list-style-type: ', '') || 'disc',
    color: '#000000',
  };
};
export type ListStyleMode = 'regular' | 'svg' | 'custom';

// 格式化listStyle字符串的工具函数
export const formatListStyle = (
  type: ListStyleMode,
  value: string,
  color?: string
): string | undefined => {
  if (type === 'svg') {
    return `svg-icon: ${value} ${color || '#000000'}`;
  } else if (type === 'custom') {
    return `custom-icon: ${value} ${color || '#000000'}`;
  } else {
    return value === 'none' ? undefined : `list-style-type: ${value}`;
  }
};

// 获取图标的SVG字符串 (用于在HTML中嵌入)
export const getIconSvgString = (
  iconName: IconName,
  color: string,
  fontSize?: number | string
): string => {
  const IconComponent = LUCIDE_ICONS[iconName];

  // 计算图标大小：与文字fontSize一致，未提供则默认12px
  let iconSize = 12;
  if (typeof fontSize !== 'undefined' && fontSize !== null) {
    const fontSizeNum =
      typeof fontSize === 'string' ? parseFloat(fontSize) : fontSize;
    if (!isNaN(fontSizeNum as number)) {
      iconSize = Math.max(6, Math.min(256, Number(fontSizeNum)));
    }
  }

  if (!IconComponent) {
    // Fallback到check图标
    const FallbackIcon = LUCIDE_ICONS.check;
    const iconHtml = renderToStaticMarkup(
      <FallbackIcon
        size={iconSize}
        color={color}
        style={{
          flexShrink: 0,
        }}
      />
    );
    return iconHtml;
  }

  const iconHtml = renderToStaticMarkup(
    <IconComponent
      size={iconSize}
      color={color}
      style={{
        flexShrink: 0,
      }}
    />
  );

  return iconHtml;
};

// 获取自定义图标的SVG字符串 (用于在HTML中嵌入)
export const getCustomIconSvgString = (
  iconUrl: string,
  color: string,
  fontSize?: number | string
): string => {
  // 计算图标大小：与文字fontSize一致，未提供则默认12px
  let iconSize = 12;
  if (typeof fontSize !== 'undefined' && fontSize !== null) {
    const fontSizeNum =
      typeof fontSize === 'string' ? parseFloat(fontSize) : fontSize;
    if (!isNaN(fontSizeNum as number)) {
      iconSize = Math.max(6, Math.min(256, Number(fontSizeNum)));
    }
  }

  // 对于自定义图标，统一使用img标签，不支持颜色修改
  const iconHtml = renderToStaticMarkup(
    <img
      src={iconUrl}
      alt='custom icon'
      width={iconSize}
      height={iconSize}
      style={{
        flexShrink: 0,
      }}
    />
  );

  return iconHtml;
};

// 通用的列表图标SVG字符串生成函数
export const getListIconSvgString = (
  listStyle: string,
  defaultColor?: string,
  fontSize?: number | string
): string => {
  const parsed = parseListStyle(listStyle);

  if (parsed.type === 'svg') {
    return getIconSvgString(
      parsed.value as IconName,
      parsed.color || defaultColor || '#000000',
      fontSize
    );
  } else if (parsed.type === 'custom') {
    return getCustomIconSvgString(
      parsed.value,
      '#000000', // 自定义图标不支持颜色修改
      fontSize
    );
  } else {
    // 对于常规样式，返回空字符串，让CSS处理
    return '';
  }
};

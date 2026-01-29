import { RGB } from './types';

// EyeDropper API 类型定义
interface EyeDropperResult {
  sRGBHex: string;
}

declare global {
  interface Window {
    EyeDropper: new () => {
      open: () => Promise<EyeDropperResult>;
    };
  }
}

/**
 * 验证颜色值格式
 */
export const isValidColorValue = (value: string): boolean => {
  if (!value) return false;

  // 检查hex格式
  if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value)) return true;

  // 检查rgba格式
  if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/.test(value))
    return true;

  // 检查渐变格式
  if (/^linear-gradient\(/.test(value)) return true;

  return false;
};

/**
 * 标准化颜色值
 */
export const normalizeColorValue = (value?: string): string | undefined => {
  if (!value) return;

  // 如果是有效的颜色值，直接返回
  if (isValidColorValue(value)) return value;

  // 尝试修复常见的颜色值格式问题
  const trimmed = value.trim();

  // 如果只是数字，转换为hex
  if (/^\d+$/.test(trimmed)) {
    const num = parseInt(trimmed, 10);
    if (num >= 0 && num <= 16777215) {
      return `#${num.toString(16).padStart(6, '0')}`;
    }
  }

  // 默认返回黑色
  return '#000000';
};

// 基础颜色列表
export const baseColors = [
  '#15ABFF',
  '#A27AFF',
  '#FFEC3C',
  '#E51C22',
  '#14E815',
  '#FFFFFF',
  '#999999',
  '#000000',
];

export const rgbaToHex = (rgba: RGB): string => {
  // 将RGB值转换为十六进制
  const r = rgba.r.toString(16).padStart(2, '0');
  const g = rgba.g.toString(16).padStart(2, '0');
  const b = rgba.b.toString(16).padStart(2, '0');

  // 处理透明度
  if (rgba.a === 1) {
    // a为1时返回6位HEX
    return `#${r}${g}${b}`.toUpperCase();
  } else {
    // 将透明度从0-1转换为0-255范围，再转为十六进制
    const a = Math.round(rgba.a * 255)
      .toString(16)
      .padStart(2, '0');
    return `#${r}${g}${b}${a}`.toUpperCase();
  }
};

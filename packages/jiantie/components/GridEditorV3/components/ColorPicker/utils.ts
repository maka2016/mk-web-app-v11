import { hex2Rgb } from '@/utils';
import { Color, ColorPickerChangeValue, RGB, ThemeColorType } from './types';

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

/**
 * 构建颜色值字符串
 */
export const colorValueBuilder = (
  value?: ColorPickerChangeValue
): string | undefined => {
  if (!value) return;

  if (value.colorRefId) {
    return JSON.stringify(value);
  }

  return value.value || value.hex;
};

/**
 * 解析颜色值字符串
 */
export const colorValueParser = (
  value: string,
  themeColors: ThemeColorType[] = []
): string | undefined => {
  if (!value) return;

  if (value.startsWith('#')) {
    return value;
  }

  // 如果是JSON格式的主题颜色引用
  if (value.startsWith('{')) {
    try {
      const valObj = JSON.parse(value);
      const themeColor = themeColors.find(
        themeColor => themeColor.colorId === valObj.colorRefId
      );
      return themeColor?.value || valObj.hex || valObj.value || undefined;
    } catch (e) {
      console.warn('Failed to parse color value:', value, e);
      return value;
    }
  }

  return value;
};

/**
 * 创建默认颜色对象
 */
export const createDefaultColor = (value: string = '#000000'): Color => {
  return {
    hex: value,
    rgb: { r: 0, g: 0, b: 0, a: 1 },
    type: 'color',
    value: value,
    elementId: '',
    elementRef: 'ColorPicker',
    colorType: 'preset',
  };
};

/**
 * 创建颜色变更值对象
 */
export const createColorChangeValue = (
  color: Partial<Color>,
  rgb?: RGB
): ColorPickerChangeValue => {
  const defaultRgb = rgb || { r: 0, g: 0, b: 0, a: 1 };

  return {
    colors: null,
    type: 'color',
    hex: color.hex || '#000000',
    rgb: color.rgb || defaultRgb,
    value:
      color.value ||
      `rgba(${defaultRgb.r},${defaultRgb.g},${defaultRgb.b},${defaultRgb.a})`,
    colorRefId: color.colorRefId,
    opacity: color.opacity,
  };
};

/**
 * 验证RGB值
 */
export const isValidRGB = (rgb: RGB): boolean => {
  return (
    typeof rgb.r === 'number' &&
    typeof rgb.g === 'number' &&
    typeof rgb.b === 'number' &&
    typeof rgb.a === 'number' &&
    rgb.r >= 0 &&
    rgb.r <= 255 &&
    rgb.g >= 0 &&
    rgb.g <= 255 &&
    rgb.b >= 0 &&
    rgb.b <= 255 &&
    rgb.a >= 0 &&
    rgb.a <= 1
  );
};

/**
 * 解析颜色值字符串并返回Color对象
 * 支持普通颜色值和JSON.stringify后的主题颜色引用
 */
export const parseValueToColor = (
  value: string,
  themeColors: ThemeColorType[] = []
): Color => {
  if (!value) {
    return createDefaultColor('#000000');
  }

  // 如果是JSON格式的主题颜色引用
  if (value.startsWith('{')) {
    try {
      const valObj = JSON.parse(value);
      if (valObj.colorRefId) {
        // 查找对应的主题颜色
        const themeColor = themeColors.find(
          themeColor => themeColor.colorId === valObj.colorRefId
        );

        if (themeColor) {
          const normalizedValue = normalizeColorValue(themeColor.value);
          if (!normalizedValue) {
            return createDefaultColor('#000000');
          }
          try {
            const rgb = hex2Rgb(normalizedValue || '#000000').rgb;
            return {
              colorRefId: themeColor.colorId,
              colors: null,
              type: themeColor.type,
              hex: normalizedValue,
              rgb,
              value: normalizedValue,
              elementId: themeColor.colorId,
              elementRef: 'ThemeColor',
              colorType: 'theme',
              name: themeColor.name,
            };
          } catch (error) {
            console.warn('Failed to process theme color:', themeColor, error);
            return createDefaultColor(normalizedValue);
          }
        } else {
          // 如果找不到对应的主题颜色，使用valObj中的值
          const normalizedValue = normalizeColorValue(
            valObj.hex || valObj.value || '#000000'
          );
          return createDefaultColor(normalizedValue);
        }
      } else {
        // 如果不是主题颜色引用，使用valObj中的值
        const normalizedValue = normalizeColorValue(
          valObj.hex || valObj.value || '#000000'
        );
        return createDefaultColor(normalizedValue);
      }
    } catch (error) {
      console.warn('Failed to parse JSON color value:', value, error);
      return createDefaultColor('#000000');
    }
  }

  // 普通颜色值
  const normalizedValue = normalizeColorValue(value);
  return createDefaultColor(normalizedValue);
};

/**
 * 从Color对象中提取colorRefId
 */
export const extractColorRefId2 = (color: string): string | undefined => {
  if (color.startsWith('{')) {
    const valObj = JSON.parse(color);
    return valObj.colorRefId;
  }
  return undefined;
};

/**
 * 检查颜色是否为主题颜色
 */
export const isThemeColor = (color: Color): boolean => {
  return color.colorType === 'theme' && !!color.colorRefId;
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

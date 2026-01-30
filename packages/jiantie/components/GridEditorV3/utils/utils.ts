export const loadImg = (url: string) => {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const img = new Image();
    img.src = url;
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
      });
    };
  });
};

export const formatPaddingValue = (value: string): string => {
  return numberChunkValueToString(stringValueTo4Chunk(value)) || value;
};

export function isObject(item: any) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * 从 filter 字符串中提取所有 drop-shadow 参数
 * @param filterStr - CSS filter 字符串
 * @returns drop-shadow 参数数组，如 ["10px 10px red", "-5px -5px yellow"]
 */
export function extractDropShadow(filterStr: string): string[] {
  if (!filterStr || typeof filterStr !== 'string') return [];
  // 匹配所有 drop-shadow(...)，提取括号内内容
  const matches = filterStr?.match(/drop-shadow\(([^)]+)\)/g);
  if (!matches) return [];
  return matches.map(m => m.replace(/^drop-shadow\(([^)]+)\)$/, '$1').trim());
}

/**
 * 从 filter 字符串中提取非 drop-shadow 的 filter 片段
 */
export function extractOtherFilters(filterStr: string): string {
  if (!filterStr || typeof filterStr !== 'string') return '';
  return filterStr
    .replace(/drop-shadow\([^)]+\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 将 CSS padding 字符串解析为上、右、下、左四个方向的纯数字数组（单位统一为 px）
 * @param paddingValue - CSS padding 字符串（支持 '1px', '0 1', '1px 2px 3px' 等格式）
 * @returns 包含四个方向数字值的元组，如 `[0, 10, 0, 10]`
 * @throws 当输入格式无效或单位无法转换时抛出错误
 */
export function stringValueTo4Chunk(
  paddingValue: string
): [number, number, number, number] | undefined {
  if (!paddingValue || !String(paddingValue)?.trim()) {
    return undefined;
  }

  const parts = String(paddingValue)
    .trim()
    .replace(/px/gi, '')
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0 || parts.length > 4) {
    console.log('parts', parts);
    return undefined;
  }

  // 映射为四方向值（字符串）
  const [topStr, rightStr, bottomStr, leftStr] = ((): string[] => {
    switch (parts.length) {
      case 1:
        return [parts[0], parts[0], parts[0], parts[0]];
      case 2:
        return [parts[0], parts[1], parts[0], parts[1]];
      case 3:
        return [parts[0], parts[1], parts[2], parts[1]];
      case 4:
        return parts;
      default:
        return [];
    }
  })();

  // 将带单位的字符串转换为纯数字（单位统一视为 px）
  const parseNumber = (val: string): number => {
    // 移除单位（如 '10px' → 10, '0.5em' → 0.5）
    const num = parseFloat(val);
    if (isNaN(num)) {
      // console.error(`Invalid number: "${val}"`);
      return 0;
    }
    return num;
  };

  return [
    parseNumber(topStr),
    parseNumber(rightStr),
    parseNumber(bottomStr),
    parseNumber(leftStr),
  ];
}

/**
 * 将四方向数字值转换为CSS padding简写字符串
 * @param top - 上方向数值（单位默认为px）
 * @param right - 右方向数值
 * @param bottom - 下方向数值
 * @param left - 左方向数值
 * @returns 符合CSS规范的padding简写字符串
 */
export function numberChunkValueToString(
  values?: number[]
): string | undefined {
  if (!values) {
    return undefined;
  }
  const [top, right, bottom, left] = values;
  // 数字转带单位字符串（0省略单位，非0添加px）
  const formatValue = (val: number): string => (val === 0 ? '0' : `${val}px`);

  const topStr = formatValue(top);
  const rightStr = formatValue(right);
  const bottomStr = formatValue(bottom);
  const leftStr = formatValue(left);

  // 简写规则（按CSS规范优化）
  if (topStr === bottomStr && rightStr === leftStr) {
    if (topStr === rightStr) {
      return topStr; // 四边相同 → 单值
    }
    return `${topStr} ${rightStr}`; // 上下相同 + 左右相同 → 双值
  }

  if (rightStr === leftStr) {
    return `${topStr} ${rightStr} ${bottomStr}`; // 左右相同 → 三值
  }

  return `${topStr} ${rightStr} ${bottomStr} ${leftStr}`; // 四边不同 → 四值
}

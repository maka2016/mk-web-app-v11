import { queryToObj } from '@/utils';

// 系统变量定义
export const SYSTEM_VARIABLES = {
  guestName: {
    key: 'guestName',
    label: '嘉宾名称',
    urlParam: 'guest_name', // URL参数名
    placeholder: '{{guestName}}', // 在文本中使用的占位符
  },
  // 未来可以扩展更多变量
  // example: {
  //   key: 'example',
  //   label: '示例变量',
  //   urlParam: 'example_param',
  //   placeholder: '{{example}}',
  // },
} as const;

// 变量类型
export type SystemVariableKey = keyof typeof SYSTEM_VARIABLES;

// 系统变量值类型
export type SystemVariableValues = Record<SystemVariableKey, string>;

/**
 * 从URL获取系统变量的值
 */
export const getSystemVariableValues = (): SystemVariableValues => {
  const urlParams = queryToObj();
  const values: Partial<SystemVariableValues> = {};

  // 遍历所有系统变量，从URL中获取对应的值
  Object.entries(SYSTEM_VARIABLES).forEach(([key, config]) => {
    const urlValue = urlParams[config.urlParam];
    if (urlValue) {
      // URL参数值需要解码
      values[key as SystemVariableKey] = decodeURIComponent(urlValue);
    } else {
      // 如果URL中没有对应参数，使用空字符串
      values[key as SystemVariableKey] = '';
    }
  });

  return values as SystemVariableValues;
};

/**
 * 获取单个系统变量的值（支持默认值）
 * @param key 变量key
 * @param defaultValue 默认值（当URL中没有对应参数时使用）
 * @returns 变量值或默认值
 */
export const getSystemVariableValue = (
  key: SystemVariableKey,
  defaultValue: string = ''
): string => {
  const values = getSystemVariableValues();
  const urlValue = values[key];
  // 如果URL中有值，使用URL的值；否则使用默认值
  return urlValue || defaultValue;
};

/**
 * 替换文本中的系统变量引用
 * @param text 原始文本
 * @returns 替换后的文本
 */
export const replaceSystemVariables = (text: string): string => {
  if (!text) return text;

  const values = getSystemVariableValues();
  let result = text;

  // 替换所有系统变量引用 {{变量名}}
  Object.entries(SYSTEM_VARIABLES).forEach(([key, config]) => {
    const placeholder = config.placeholder;
    const value = values[key as SystemVariableKey];
    // 使用全局替换，支持多个相同的变量引用
    result = result.replace(
      new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'),
      value || ''
    );
  });

  return result;
};

/**
 * 获取所有可用的系统变量列表（用于UI选择）
 */
export const getSystemVariableList = () => {
  return Object.entries(SYSTEM_VARIABLES).map(([key, config]) => ({
    key: key as SystemVariableKey,
    label: config.label,
    placeholder: config.placeholder,
  }));
};

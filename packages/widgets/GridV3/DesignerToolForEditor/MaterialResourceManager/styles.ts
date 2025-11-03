// MaterialResourceManager 统一样式配置
export const materialStyles = {
  // 颜色方案
  colors: {
    primary: '#1a87ff',
    primaryHover: '#1670d9',
    primaryLight: 'rgba(26, 135, 255, 0.1)',

    background: {
      primary: '#ffffff',
      secondary: '#f9fafb',
      tertiary: '#f3f4f6',
      hover: '#e5e7eb',
    },

    border: {
      primary: '#e5e7eb',
      secondary: '#d1d5db',
      hover: '#9ca3af',
    },

    text: {
      primary: '#374151',
      secondary: '#6b7280',
      tertiary: '#9ca3af',
      white: '#ffffff',
    },

    shadow: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      lg: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    },
  },

  // 圆角
  borderRadius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
  },

  // 间距
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
  },

  // 字体
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',

  // 过渡动画
  transition: 'all 0.2s ease',

  // 组件样式
  components: {
    button: {
      height: '32px',
      padding: '0 12px',
      fontSize: '14px',
      fontWeight: '400',
    },

    input: {
      height: '32px',
      padding: '6px 12px',
      fontSize: '14px',
    },

    card: {
      borderWidth: '1px',
      borderRadius: '6px',
      padding: '8px',
    },
  },
} as const;

// 生成样式对象的工具函数
export const createStyledProps = (
  component: keyof typeof materialStyles.components
) => {
  return materialStyles.components[component];
};

// 生成颜色变量的工具函数
export const getColor = (path: string) => {
  const keys = path.split('.');
  let value: any = materialStyles.colors;

  for (const key of keys) {
    value = value[key];
    if (value === undefined) {
      console.warn(`Color path "${path}" not found`);
      return '#000000';
    }
  }

  return value;
};

import {
  Prisma,
  RelayConfigEntity
} from '@mk/jiantie/v11-database/generated/client/client';

export type RelayDisplayMode = 'inline';

export const DEFAULT_RELAY_DISPLAY_MODE: RelayDisplayMode = 'inline';

export interface RelayAttrs {
  /** 接力配置ID（可选，如果不提供则通过worksId查询） */
  configId?: string;
  /**
   * 关联的作品ID（可选，如果不提供则从当前页面获取）
   * 注意：接力配置现在直接关联到作品
   */
  worksId?: string;
  /**
   * 组件呈现模式：
   * - inline：直接在画布内嵌展示
   */
  displayMode?: RelayDisplayMode;
}

/**
 * 接力配置数据类型（用于UI）
 */
export interface RelayConfigEntityForUi
  extends Partial<
    Omit<
      RelayConfigEntity,
      'theme' | 'create_time' | 'update_time'
    >
  > {
  theme?: RelayTheme | null; // 主题配置
}

/**
 * 接力记录类型
 */
export interface RelayRecord {
  id: string;
  config_id: string;
  works_id: string;
  user_openid: string;
  user_unionid?: string | null;
  user_nickname: string;
  user_avatar?: string | null;
  relay_time: Date | string;
  share_source?: string | null;
  user_message?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  deleted: boolean;
  create_time: Date | string;
  update_time: Date | string;
}

/**
 * 主题配置类型
 */
export interface RelayTheme {
  // 按钮相关
  buttonColor?: string; // 按钮背景色
  buttonTextColor?: string; // 按钮文字颜色
  buttonDisabledColor?: string; // 已接力按钮背景色
  buttonDisabledTextColor?: string; // 已接力按钮文字颜色

  // 列表相关
  listBackgroundColor?: string; // 列表背景颜色
  listItemBackgroundColor?: string; // 列表项背景颜色
  listTextColor?: string; // 列表文字颜色
  listBorderColor?: string; // 列表边框颜色
  listBorderRadius?: number; // 列表圆角（px）

  // 头像相关
  avatarSize?: number; // 头像大小（px）
  avatarBorderColor?: string; // 头像边框颜色

  // 文字相关
  textColor?: string; // 主要文字颜色
  secondaryTextColor?: string; // 次要文字颜色（时间等）
  titleTextColor?: string; // 标题文字颜色
}

/**
 * 默认主题设置
 */
export const DEFAULT_RELAY_THEME: RelayTheme = {
  buttonColor: '#09090B',
  buttonTextColor: '#ffffff',
  buttonDisabledColor: '#f3f4f6',
  buttonDisabledTextColor: '#9ca3af',
  listBackgroundColor: 'transparent',
  listItemBackgroundColor: '#ffffff',
  listTextColor: '#09090B',
  listBorderColor: '#e5e7ec',
  listBorderRadius: 8,
  avatarSize: 40,
  avatarBorderColor: '#e5e7ec',
  textColor: '#09090B',
  secondaryTextColor: '#6b7280',
  titleTextColor: '#09090B',
};

/**
 * 将 RelayTheme 转换为 Prisma.JsonValue
 */
export function toRelayThemeJson(
  theme: RelayTheme | null | undefined
): Prisma.InputJsonValue | null {
  if (!theme) return null;
  return theme as unknown as Prisma.InputJsonValue;
}

/**
 * 从 Prisma.JsonValue 解析 RelayTheme
 */
export function parseRelayTheme(jsonValue: any): RelayTheme | null {
  if (!jsonValue || typeof jsonValue !== 'object') {
    return null;
  }
  return {
    buttonColor: jsonValue.buttonColor ?? undefined,
    buttonTextColor: jsonValue.buttonTextColor ?? undefined,
    buttonDisabledColor: jsonValue.buttonDisabledColor ?? undefined,
    buttonDisabledTextColor: jsonValue.buttonDisabledTextColor ?? undefined,
    listBackgroundColor: jsonValue.listBackgroundColor ?? undefined,
    listItemBackgroundColor: jsonValue.listItemBackgroundColor ?? undefined,
    listTextColor: jsonValue.listTextColor ?? undefined,
    listBorderColor: jsonValue.listBorderColor ?? undefined,
    listBorderRadius: jsonValue.listBorderRadius ?? undefined,
    avatarSize: jsonValue.avatarSize ?? undefined,
    avatarBorderColor: jsonValue.avatarBorderColor ?? undefined,
    textColor: jsonValue.textColor ?? undefined,
    secondaryTextColor: jsonValue.secondaryTextColor ?? undefined,
    titleTextColor: jsonValue.titleTextColor ?? undefined,
  };
}

/**
 * 预设配色方案
 */
export const RELAY_THEME_PRESETS: Record<string, RelayTheme> = {
  white: {
    buttonColor: '#09090B',
    buttonTextColor: '#ffffff',
    buttonDisabledColor: '#f3f4f6',
    buttonDisabledTextColor: '#9ca3af',
    listBackgroundColor: 'transparent',
    listItemBackgroundColor: '#ffffff',
    listTextColor: '#09090B',
    listBorderColor: '#e5e7ec',
    listBorderRadius: 8,
    avatarSize: 40,
    avatarBorderColor: '#e5e7ec',
    textColor: '#09090B',
    secondaryTextColor: '#6b7280',
    titleTextColor: '#09090B',
  },
  glass: {
    buttonColor: 'rgba(0, 122, 255, 0.9)',
    buttonTextColor: '#ffffff',
    buttonDisabledColor: 'rgba(255, 255, 255, 0.5)',
    buttonDisabledTextColor: 'rgba(0, 0, 0, 0.6)',
    listBackgroundColor: 'transparent',
    listItemBackgroundColor: 'rgba(255, 255, 255, 0.75)',
    listTextColor: '#1d1d1f',
    listBorderColor: 'rgba(255, 255, 255, 0.6)',
    listBorderRadius: 20,
    avatarSize: 40,
    avatarBorderColor: 'rgba(0, 0, 0, 0.1)',
    textColor: '#1d1d1f',
    secondaryTextColor: 'rgba(0, 0, 0, 0.6)',
    titleTextColor: '#1d1d1f',
  },
  black: {
    buttonColor: '#ffffff',
    buttonTextColor: '#09090B',
    buttonDisabledColor: '#27272a',
    buttonDisabledTextColor: '#a1a1aa',
    listBackgroundColor: 'transparent',
    listItemBackgroundColor: '#18181b',
    listTextColor: '#ffffff',
    listBorderColor: '#27272a',
    listBorderRadius: 8,
    avatarSize: 40,
    avatarBorderColor: '#27272a',
    textColor: '#ffffff',
    secondaryTextColor: '#a1a1aa',
    titleTextColor: '#ffffff',
  },
};

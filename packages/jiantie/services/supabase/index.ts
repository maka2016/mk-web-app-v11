import APPBridge from '@mk/app-bridge';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

/**
 * Supabase 配置
 */
const SUPABASE_CONFIG = {
  url: 'https://ccndommonsjorpxscuhm.supabase.co',
  anonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjbmRvbW1vbnNqb3JweHNjdWhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1Njc2MjksImV4cCI6MjA3NjE0MzYyOX0.fvqeMAF00BzkEHCBRzPAmXdXXMj_N4LbGVOURIH6VWM',
} as const;

/**
 * Supabase 客户端创建选项
 */
interface SupabaseClientOptions {
  persistSession?: boolean;
  autoRefreshToken?: boolean;
}

/**
 * 统一的返回类型
 */
interface Result<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

/**
 * Supabase 服务类
 * 单例模式，维护一个全局的 Supabase client
 */
class SupabaseService {
  private static instance: SupabaseService;
  private client: SupabaseClient | null = null;
  private clientOptions: SupabaseClientOptions = {
    persistSession: true,
    autoRefreshToken: true,
  };

  private constructor() {}

  /**
   * 获取 SupabaseService 单例
   */
  static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  /**
   * 获取或创建 Supabase 客户端
   */
  getClient(options?: SupabaseClientOptions): SupabaseClient {
    // 如果配置变化，重新创建客户端
    const needRecreate =
      !this.client ||
      (options &&
        (options.persistSession !== this.clientOptions.persistSession ||
          options.autoRefreshToken !== this.clientOptions.autoRefreshToken));

    if (needRecreate && options) {
      this.clientOptions = { ...this.clientOptions, ...options };
      this.client = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
        auth: {
          persistSession: this.clientOptions.persistSession,
          autoRefreshToken: this.clientOptions.autoRefreshToken,
        },
      });
    } else if (!this.client) {
      this.client = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
        auth: {
          persistSession: this.clientOptions.persistSession,
          autoRefreshToken: this.clientOptions.autoRefreshToken,
        },
      });
    }

    return this.client;
  }

  /**
   * 获取价格包信息
   * @param module - 模块ID
   * @param lang - 语言代码
   */
  async getProductPackages(module: number, lang: string = 'zh-CN') {
    try {
      const client = this.getClient();

      // 1. 获取 product_packages，根据 module 过滤
      const { data: packages, error: packagesError } = await client
        .from('product_packages')
        .select('*')
        .eq('module', module);

      if (packagesError) {
        console.error('[Supabase] 获取 product_packages 失败:', packagesError);
        throw packagesError;
      }

      if (!packages || packages.length === 0) {
        return {
          success: true,
          data: [],
          error: null,
        };
      }

      // 2. 获取所有 sku_alias
      const allSkuAliases = packages.flatMap(pkg => pkg.sku_alias);

      if (allSkuAliases.length === 0) {
        return {
          success: true,
          data: [],
          error: null,
        };
      }

      // 3. 获取 sku 信息，根据 alias 过滤
      const { data: skus, error: skusError } = await client
        .from('sku')
        .select('*')
        .in('alias', allSkuAliases);

      if (skusError) {
        console.error('[Supabase] 获取 sku 失败:', skusError);
        throw skusError;
      }

      // 4. 获取 sku_display_i18n 信息，根据 sku_alias 和 locale 过滤
      const { data: i18nData, error: i18nError } = await client
        .from('sku_display_i18n')
        .select('*')
        .in('sku_alias', allSkuAliases)
        .eq('locale', lang);

      if (i18nError) {
        console.error('[Supabase] 获取 sku_display_i18n 失败:', i18nError);
        throw i18nError;
      }

      // 5. 组合数据
      const skuMap = new Map((skus || []).map(sku => [sku.alias, sku]));
      const i18nMap = new Map(
        (i18nData || []).map(item => [item.sku_alias, item])
      );

      const result = packages.map(pkg => ({
        ...pkg,
        skus: pkg.sku_alias
          .map((alias: string) => {
            const sku = skuMap.get(alias);
            const i18n = i18nMap.get(alias);
            return sku
              ? {
                  ...sku,
                  i18n: i18n?.data || null,
                }
              : null;
          })
          .filter((sku: any) => sku !== null),
      }));

      return {
        success: true,
        data: result,
        error: null,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      console.error('[Supabase] 获取价格包异常:', err);
      return {
        success: false,
        data: null,
        error: errorMessage,
      };
    }
  }

  // 使用 refreshToken 登录
  async signInWithRefreshToken() {
    console.log('signInWithRefreshToken');
    const client = this.getClient();
    const session = await client.auth.getSession();
    if (session?.data?.session) {
      console.log('User is logged in:', session);
      return;
    }

    //从appbridge获取refreshToken和accessToken
    const info = (await APPBridge.appCall({
      type: 'MKUserInfo',
      jsCbFnName: 'appBridgeOnUserInfoCb',
    })) as any;

    const { refreshToken, token } = info;

    // console.log('refreshToken:', refreshToken);
    // console.log('token:', token);

    if (!refreshToken || !token) {
      console.error('refreshToken or token is not found');
      return;
    }
    // 检查是否已经登录

    console.log('[Supabase] setSession', token, refreshToken);

    const { error } = await client.auth.setSession({
      access_token: token,
      refresh_token: refreshToken,
    });

    if (error) {
      console.error('[Supabase] 设置会话失败:', error);
      throw error;
    }

    console.log('[Supabase] 登录成功');
  }

  /**
   * 获取当前登录用户
   */
  async getCurrentUser(): Promise<Result<User>> {
    try {
      const client = this.getClient();
      const {
        data: { user },
        error,
      } = await client.auth.getUser();

      if (error) {
        console.error('[Supabase] 获取用户失败:', error);
        return {
          success: false,
          data: null,
          error: error.message,
        };
      }

      return {
        success: true,
        data: user,
        error: null,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      console.error('[Supabase] 获取用户异常:', err);
      return {
        success: false,
        data: null,
        error: errorMessage,
      };
    }
  }

  /**
   * 使用 Access Token 获取用户信息
   * @param accessToken - Supabase access token
   */

  /**
   * 退出登录
   */
  async signOut(): Promise<Result<null>> {
    try {
      const client = this.getClient();
      const { error } = await client.auth.signOut();

      if (error) {
        console.error('[Supabase] 退出登录失败:', error);
        return {
          success: false,
          data: null,
          error: error.message,
        };
      }

      console.log('[Supabase] 退出登录成功');
      return {
        success: true,
        data: null,
        error: null,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      console.error('[Supabase] 退出登录异常:', err);
      return {
        success: false,
        data: null,
        error: errorMessage,
      };
    }
  }

  /**
   * 监听认证状态变化
   */
  onAuthStateChange(callback: (event: string, session: any) => void): {
    unsubscribe: () => void;
  } {
    const client = this.getClient({
      persistSession: true,
      autoRefreshToken: true,
    });
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(callback);

    return {
      unsubscribe: () => subscription.unsubscribe(),
    };
  }

  /**
   * 查询当前用户的角色和有效期
   */
  async getUserRoles(): Promise<Result<any[]>> {
    try {
      const client = this.getClient();

      // 先获取当前用户
      const {
        data: { user },
        error: userError,
      } = await client.auth.getUser();

      if (userError || !user) {
        console.error('[Supabase] 获取用户失败:', userError);
        return {
          success: false,
          data: null,
          error: userError?.message || '未登录',
        };
      }

      // 查询用户的角色，并关联 roles 表获取角色详情
      const { data: userRoles, error: rolesError } = await client
        .from('user_roles')
        .select(
          `
          role_id,
          start_at,
          expires_at,
          roles:role_id (
            id,
            name,
            description,
            alias
          )
        `
        )
        .eq('user_id', user.id);

      if (rolesError) {
        console.error('[Supabase] 查询用户角色失败:', rolesError);
        return {
          success: false,
          data: null,
          error: rolesError.message,
        };
      }

      console.log('[Supabase] 查询用户角色成功:', userRoles);
      return {
        success: true,
        data: userRoles || [],
        error: null,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      console.error('[Supabase] 查询用户角色异常:', err);
      return {
        success: false,
        data: null,
        error: errorMessage,
      };
    }
  }

  /**
   * 查询当前用户的资源权限
   */
  async getUserResourcePermissions(): Promise<Result<any[]>> {
    try {
      const client = this.getClient();

      // 先获取当前用户
      const {
        data: { user },
        error: userError,
      } = await client.auth.getUser();

      if (userError || !user) {
        console.error('[Supabase] 获取用户失败:', userError);
        return {
          success: false,
          data: null,
          error: userError?.message || '未登录',
        };
      }

      console.log('[Supabase] 查询用户资源权限:', user.id);

      // 查询用户的资源权限，并关联 permissions 表获取权限详情
      const { data: resourcePermissions, error: permissionsError } =
        await client
          .from('resource_permissions')
          .select('*')
          .eq('user_id', user.id);

      console.log('[Supabase] 查询资源权限:', resourcePermissions);
      if (permissionsError) {
        console.error('[Supabase] 查询资源权限失败:', permissionsError);
        return {
          success: false,
          data: null,
          error: permissionsError.message,
        };
      }

      console.log('[Supabase] 查询资源权限成功:', resourcePermissions);
      return {
        success: true,
        data: resourcePermissions || [],
        error: null,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      console.error('[Supabase] 查询资源权限异常:', err);
      return {
        success: false,
        data: null,
        error: errorMessage,
      };
    }
  }

  /**
   * 根据资源ID查询用户的资源权限
   * @param resourceId - 作品/资源ID
   */
  async getUserResourcePermissionsByResourceId(
    resourceId: string
  ): Promise<Result<any[]>> {
    try {
      const client = this.getClient();

      // 先获取当前用户
      const {
        data: { user },
        error: userError,
      } = await client.auth.getUser();

      if (userError || !user) {
        console.error('[Supabase] 获取用户失败:', userError);
        return {
          success: false,
          data: null,
          error: userError?.message || '未登录',
        };
      }

      console.log('[Supabase] 查询资源权限:', user.id, resourceId);

      // 查询指定资源ID的用户权限，并关联 permissions 表获取权限详情
      const { data: resourcePermissions, error: permissionsError } =
        await client
          .from('resource_permissions')
          .select(
            `
            *,
            permissions:permission_id (
              id,
              action_url,
              alias,
              description,
              value
            )
          `
          )
          .eq('user_id', user.id)
          .eq('resource_id', resourceId);

      if (permissionsError) {
        console.error('[Supabase] 查询资源权限失败:', permissionsError);
        return {
          success: false,
          data: null,
          error: permissionsError.message,
        };
      }

      console.log('[Supabase] 查询资源权限成功:', resourcePermissions);
      return {
        success: true,
        data: resourcePermissions || [],
        error: null,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      console.error('[Supabase] 查询资源权限异常:', err);
      return {
        success: false,
        data: null,
        error: errorMessage,
      };
    }
  }
}

// 导出单例实例
const supabaseService = SupabaseService.getInstance();

export const getUid = async () => {
  const client = supabaseService.getClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  return user?.id;
};

export const getToken = async () => {
  const client = supabaseService.getClient();
  const {
    data: { session },
  } = await client.auth.getSession();
  return session?.access_token;
};
export default supabaseService;

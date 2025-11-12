import { getUid } from '@/services';
import APPBridge from '@mk/app-bridge';
import { makeAutoObservable } from 'mobx';
import { EnvironmentStore } from './environment';

export interface NavigationOptions {
  /** 是否使用 replace 而非 push */
  replace?: boolean;
  /** 是否全屏显示（APP内） */
  fullScreen?: boolean;
  /** 是否启用 pop 手势（APP内） */
  popEnable?: boolean;
  /** 额外的查询参数 */
  query?: Record<string, any>;
}

/**
 * 导航路由 Store
 * 统一处理 Web 和 APP 的路由跳转
 */
export class NavigationStore {
  private environment: EnvironmentStore;

  constructor(environment: EnvironmentStore) {
    this.environment = environment;
    makeAutoObservable(this);
  }

  /**
   * 构建完整的 URL
   */
  private buildUrl(path: string, options?: NavigationOptions): string {
    if (typeof window === 'undefined') return path;

    // 处理绝对路径
    let url: URL;
    if (path.startsWith('http://') || path.startsWith('https://')) {
      url = new URL(path);
    } else {
      // 相对路径转绝对路径
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      url = new URL(cleanPath, window.location.origin);
    }

    // 如果是 APP 内，添加 APP 专用参数
    if (this.environment.isInApp) {
      // 全屏参数
      if (options?.fullScreen !== false) {
        url.searchParams.set('is_full_screen', '1');
      }
      // pop 手势参数
      if (options?.popEnable === false) {
        url.searchParams.set('popEnable', '0');
      }
    }

    // 添加额外查询参数
    if (options?.query) {
      Object.entries(options.query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    return url.toString();
  }

  /**
   * 页面跳转（push）
   * 自动判断 APP 内/外，选择合适的跳转方式
   */
  push = (path: string, options?: NavigationOptions) => {
    const url = this.buildUrl(path, options);

    if (this.environment.isInApp) {
      // APP 内使用 Bridge 跳转
      APPBridge.navToPage({
        url,
        type: 'URL',
      });
    } else if (this.environment.isInMiniP) {
      // 小程序内跳转
      try {
        const wx = (window as any).wx;
        const urlObj = new URL(url);
        wx.miniProgram.navigateTo({
          url: urlObj.pathname + urlObj.search,
        });
      } catch (error) {
        console.error('小程序跳转失败:', error);
        // 降级到普通跳转
        window.location.href = url;
      }
    } else {
      // Web 跳转
      if (typeof window !== 'undefined' && (window as any).__NEXT_ROUTER__) {
        // 使用 Next.js router
        const router = (window as any).__NEXT_ROUTER__;
        router.push(path);
      } else {
        // 降级到原生跳转
        window.location.href = url;
      }
    }
  };

  /**
   * 页面替换（replace）
   */
  replace = (path: string, options?: NavigationOptions) => {
    const url = this.buildUrl(path, { ...options, replace: true });

    if (this.environment.isInApp) {
      // APP 内使用 Bridge 跳转（目前 Bridge 不区分 push/replace）
      APPBridge.navToPage({
        url,
        type: 'URL',
      });
    } else if (this.environment.isInMiniP) {
      // 小程序内跳转
      try {
        const wx = (window as any).wx;
        const urlObj = new URL(url);
        wx.miniProgram.redirectTo({
          url: urlObj.pathname + urlObj.search,
        });
      } catch (error) {
        console.error('小程序跳转失败:', error);
        window.location.replace(url);
      }
    } else {
      // Web 跳转
      if (typeof window !== 'undefined' && (window as any).__NEXT_ROUTER__) {
        const router = (window as any).__NEXT_ROUTER__;
        router.replace(path);
      } else {
        window.location.replace(url);
      }
    }
  };

  /**
   * 返回上一页
   */
  back = () => {
    if (this.environment.isInApp) {
      // APP 内使用 Bridge 返回
      APPBridge.navAppBack();
    } else if (this.environment.isInMiniP) {
      // 小程序返回
      try {
        const wx = (window as any).wx;
        wx.miniProgram.navigateBack();
      } catch (error) {
        console.error('小程序返回失败:', error);
        window.history.back();
      }
    } else {
      // Web 返回
      if (typeof window !== 'undefined') {
        window.history.back();
      }
    }
  };

  /**
   * 跳转到编辑器
   */
  toEditor = (worksId: string, uid: string, options?: NavigationOptions) => {
    this.push(`/editor`, {
      ...options,
      fullScreen: true,
      popEnable: false,
      query: {
        works_id: worksId,
        uid,
        // APP 内不需要 appid，APP 会自动添加
        ...(!this.environment.isInApp && { appid: this.getAppId() }),
        ...options?.query,
      },
    });
  };

  /**
   * 跳转到视频分享页
   * @param worksId 作品 ID
   * @param uid 用户 ID（可选，不传则自动获取）
   * @param options 导航配置
   */
  toVideoShare = (
    worksId: string,
    uid?: string,
    options?: NavigationOptions
  ) => {
    const appid = this.getAppId();
    const userId = uid || getUid(); // 自动获取 uid

    if (this.environment.isInMiniP && appid === 'jiantie') {
      // 小程序特殊处理
      APPBridge.minipNav(
        'navigate',
        `/pages/videoshare/index?works_id=${worksId}&uid=${userId}`
      );
    } else {
      this.push(`/mobile/video-share`, {
        ...options,
        fullScreen: true,
        query: {
          works_id: worksId,
          // APP 内不需要 appid，APP 会自动添加
          ...(!this.environment.isInApp && { appid }),
          ...options?.query,
        },
      });
    }
  };

  /**
   * 跳转到海报分享页
   * @param worksId 作品 ID
   * @param uid 用户 ID（可选，不传则自动获取）
   * @param options 导航配置
   */
  toPosterShare = (
    worksId: string,
    uid?: string,
    options?: NavigationOptions
  ) => {
    const appid = this.getAppId();
    const userId = uid || getUid(); // 自动获取 uid

    if (this.environment.isInMiniP && appid === 'jiantie') {
      // 小程序特殊处理
      APPBridge.minipNav(
        'navigate',
        `/pages/imageshare/index?works_id=${worksId}&uid=${userId}`
      );
    } else {
      this.push(`/mobile/poster-share`, {
        ...options,
        fullScreen: true,
        query: {
          works_id: worksId,
          // APP 内不需要 appid，APP 会自动添加
          ...(!this.environment.isInApp && { appid }),
          ...options?.query,
        },
      });
    }
  };

  /**
   * 获取当前 AppId
   */
  private getAppId = (): string => {
    if (typeof document === 'undefined') return 'jiantie';
    return document.documentElement.className || 'jiantie';
  };
}

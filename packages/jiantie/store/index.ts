import { cdnApi, getAppId, getUid } from '@/services';
import { canShareWithoutWatermark } from '@/services/permission';
import APPBridge from '@/store/app-bridge';
import { EventEmitter, deepClone, isPc, toVipPage } from '@/utils';
import { makeAutoObservable } from 'mobx';
import { useLocalObservable } from 'mobx-react';
import { EnvironmentStore, environmentStore } from './environment';
import {
  ShareImagesParams,
  ShareLinkParams,
  ShareMiniProgramParams,
  SharePermissionOptions,
  ShareType,
  ShareVideoParams,
  VipShowData,
  WorksDetailLike,
} from './share';
import { mkWebStoreLogger } from '../services/logger';

export interface NavigationOptions {
  newWindow?: boolean;
  /** 是否使用 replace 而非 push */
  replace?: boolean;
  /** 是否全屏显示（APP内） */
  fullScreen?: boolean;
  /** 是否启用 pop 手势（APP内） */
  popEnable?: boolean;
  /** 额外的查询参数 */
  query?: Record<string, any>;
  /** 模板 ID（用于权限检查的埋点数据） */
  templateId?: string;
  worksDetail?: WorksDetailLike;
}

/**
 * 获取 Next.js basePath
 * @returns basePath 字符串，如果未设置则返回空字符串（兼容未配置 basePath 的情况）
 */
function getBasePath(): string {
  // 在浏览器环境中，优先从 Next.js 的全局数据获取（这是 Next.js 的标准方式）
  if (typeof window !== 'undefined') {
    try {
      // 检查 __NEXT_DATA__ 是否存在（可能在某些环境下是 undefined）
      const nextData = (window as any).__NEXT_DATA__;
      if (nextData && typeof nextData === 'object' && nextData.basePath) {
        return nextData.basePath;
      }
    } catch (error) {
      // 某些环境下访问 __NEXT_DATA__ 可能会报错，忽略错误继续降级
      console.warn('[getBasePath] 无法访问 __NEXT_DATA__:', error);
    }

    // 如果 __NEXT_DATA__ 中获取不到，尝试从 Next.js 构建时注入的环境变量获取
    // 注意：process.env.BASEPATH 在浏览器中只有在 next.config.ts 的 env 中配置了才会可用
    if (typeof process !== 'undefined' && process.env.BASEPATH) {
      return process.env.BASEPATH;
    }
  }

  // 服务端渲染时，从环境变量获取
  if (typeof process !== 'undefined' && process.env.BASEPATH) {
    return process.env.BASEPATH;
  }

  // 未设置 basePath 时返回空字符串，确保兼容性
  return '';
}

/**
 * 包装URL，自动添加basePath前缀
 * 主要用于iframe src、链接跳转等场景，确保在配置了basePath的环境下正常工作
 * @param url - 相对路径URL（如 `/viewer2/123`）或绝对URL（如 `https://example.com/path`）
 * @returns 拼接了basePath的完整URL，如果是绝对URL则直接返回
 * @example
 * // 如果basePath为 `/base`，url为 `/viewer2/123`
 * // 返回: `/base/viewer2/123`
 * wrapUrl('/viewer2/123')
 */
export function resolveUrl(url: string): string {
  // 如果是绝对URL（http://或https://开头），直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  const basePath = getBasePath() || '';

  // 如果没有basePath，直接返回原URL
  if (!basePath) {
    return url;
  }

  // 确保basePath以/结尾，url以/开头（或已经是/开头）
  // 避免出现 /base/viewer2 或 /base//viewer2 的情况
  const normalizedBasePath = basePath.endsWith('/')
    ? basePath.slice(0, -1)
    : basePath;
  const normalizedUrl = url.startsWith('/') ? url : `/${url}`;

  return `${normalizedBasePath}${normalizedUrl}`;
}

export const getShareUrl = (
  worksId: string,
  query?: Record<string, string>,
  origin?: string,
  options?: {
    workType?: string | null;
    uid?: number;
  }
) => {
  // v5maka 作品使用不同的 URL 格式
  if (options?.workType === 'v5' && options?.uid) {
    return `https://www.maka.im/mk-viewer-7/website/${options.uid}/${worksId}?isbackDoor=1`;
  }

  // v11 作品使用默认格式
  const params = new URLSearchParams();
  params.set('appid', getAppId());

  // 添加额外的查询参数
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, value);
      }
    });
  }

  const queryString = params.toString();
  const uri = resolveUrl(
    `/viewer2/${worksId}${queryString ? `?${queryString}` : ''}`
  );
  if (typeof window === 'undefined') return uri;
  return `${origin || window.location.origin}${uri}`;
};

class ActivitiveStore {
  loginShow: boolean = false;
  vipShow: boolean = false;
  vipType: string = 'senior';

  vipTrackData: VipShowData = {};
  profile: Record<string, any> | null = null;
  customerVips: any[] = [];
  permissions: Record<string, string> = {};

  bindPhoneShow: boolean = false;
  vipABTest: 'default' | 'test' = 'default';
  appVersion: string = '';
  activeTab: 'full_site_vips' | 'post_vips' = 'post_vips';

  // ===== 统一基建 Store =====
  /** 环境信息 Store */
  environment: EnvironmentStore;

  // ===== 分享相关状态 =====
  /** 分享权限是否启用（目前默认启用，保留字段便于后续扩展开关） */
  sharePermissionEnabled: boolean = true;

  get userProfile() {
    // 直接返回 profile，保持 MobX 响应式
    // 如果需要普通对象，在组件中使用 toJS
    return this.profile;
  }

  get isVip() {
    return this.customerVips?.length > 0;
  }

  get isSVip() {
    return this.customerVips.some(
      item => item.roleAlias === 'jiantie_svip_super'
    );
  }
  /** 待执行的分享任务（付费成功后自动执行） */
  private sharePendingTask: {
    method: 'shareLink' | 'shareImages' | 'shareWork';
    params: any;
    resolve: () => void;
    reject: (error: Error) => void;
  } | null = null;
  /** 是否已监听付费成功事件 */
  private sharePaySuccessListenerRegistered: boolean = false;

  constructor() {
    // 初始化基建 Store
    this.environment = environmentStore;
    this.setupSharePaySuccessListener();

    makeAutoObservable(this);
  }

  /**
   * 构建完整的 URL
   */
  private buildUrl(path: string, options?: NavigationOptions): string {
    if (typeof window === 'undefined') return path;
    const { fullScreen = true, popEnable = false, query = {} } = options || {};
    const appid = query.appid || getAppId();

    console.log('appid>>', appid);

    // 处理绝对路径
    let url: URL;
    if (path.startsWith('http://') || path.startsWith('https://')) {
      url = new URL(path);
    } else {
      // 相对路径转绝对路径，需要包含 basePath
      const basePath = getBasePath();
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      // 如果配置了 basePath，需要将其添加到路径前
      // 如果未设置 basePath（空字符串），则直接使用 cleanPath，确保兼容性
      const fullPath = basePath ? `${basePath}${cleanPath}` : cleanPath;
      url = new URL(fullPath, window.location.origin);
    }

    // 如果是 APP 内，添加 APP 专用参数
    if (this.environment.isInApp) {
      // 全屏参数
      url.searchParams.set('is_full_screen', fullScreen ? '1' : '0');
      url.searchParams.set('popEnable', popEnable ? '1' : '0');
    }

    url.searchParams.set('appid', appid);

    // 添加额外查询参数
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    return url.toString();
  }

  toLogin = () => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.appCall({
        type: 'MKLogOut',
        jsCbFnName: '', // 回传方法 Json值：
      });
    } else if (APPBridge.judgeIsInMiniP()) {
      APPBridge.miniPlogin();
    } else {
      this.loginShow = true;
    }
  };

  /**
   * 页面跳转（push）
   * 自动判断 APP 内/外，选择合适的跳转方式
   */
  push = (path: string, options?: NavigationOptions) => {
    const { newWindow = false } = options || {};
    const url = this.buildUrl(path, options);

    if (this.environment.isInApp) {
      // APP 内使用 Bridge 跳转
      APPBridge.navToPage({
        url,
        type: 'URL',
      });
    } else {
      if (newWindow) {
        window.open(url, '_blank');
        return;
      }
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
    }

    // else if (this.environment.isInMiniP) {
    //   // 小程序返回
    //   try {
    //     const wx = (window as any).wx;
    //     wx.miniProgram.navigateBack();
    //   } catch (error) {
    //     console.error('小程序返回失败:', error);
    //     window.history.back();
    //   }
    // }
    else {
      // Web 返回
      if (typeof window !== 'undefined') {
        window.history.back();
      }
    }
  };

  /**
   * 跳转到编辑器
   */
  toMobileEditor = (
    worksId: string,
    uid: string,
    options?: NavigationOptions
  ) => {
    this.push(`/mobile/editor`, {
      ...options,
      fullScreen: true,
      popEnable: false,
      query: {
        works_id: worksId,
        uid,
        // APP 内不需要 appid，APP 会自动添加
        ...(!this.environment.isInApp && { appid: getAppId() }),
        ...options?.query,
      },
    });
  };

  toTemplateDetail = (templateId: string, options?: NavigationOptions) => {
    const isDesktop = isPc();
    let uri = `/mobile/template`;
    // if (getAppId() === 'maka') {
    //   uri = `/maka-v2/template2026`;
    // }
    this.push(uri, {
      ...options,
      fullScreen: true,
      newWindow: isDesktop,
      query: {
        id: templateId,
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
  toVideoShare = async (
    worksId: string,
    uid?: string,
    options?: NavigationOptions
  ) => {
    const appid = getAppId();
    const userId = uid || getUid(); // 自动获取 uid

    // 先检查分享权限
    const hasPermission = await this.checkSharePermission(worksId, {
      trackData: {
        works_id: worksId,
        ref_object_id: options?.templateId || '',
        tab: 'personal',
        works_type: 'video',
        vipType: 'share',
      },
    });

    // 权限检查失败，不跳转（VIP 弹窗已由 checkSharePermission 处理）
    if (!hasPermission) {
      return;
    }

    if (false && this.environment.isInMiniP && appid === 'jiantie') {
      // 小程序特殊处理
      //小程序不要在这里跳转
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
  toPosterShare = async (worksId: string, options?: NavigationOptions) => {
    const appid = getAppId();
    const userId = getUid(); // 自动获取 uid

    // 先检查分享权限
    const hasPermission = await this.checkSharePermission(worksId, {
      trackData: {
        works_id: worksId,
        ref_object_id: options?.templateId || '',
        tab: 'personal',
        works_type: 'poster',
        vipType: 'share',
      },
    });

    // 权限检查失败，不跳转（VIP 弹窗已由 checkSharePermission 处理）
    if (!hasPermission) {
      return;
    }

    if (false && this.environment.isInMiniP) {
      //小程序不要在这里跳转
    } else {
      const { worksDetail } = options || {};
      const { share_type } = worksDetail || {};
      if (share_type === 'invite') {
        this.push(`/mobile/poster-share/invite`, {
          ...options,
          fullScreen: true,
          query: {
            works_id: worksId,
            // APP 内不需要 appid，APP 会自动添加
            ...(!this.environment.isInApp && { appid }),
            ...options?.query,
          },
        });
        return;
      }
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

  toHome = () => {
    if (getAppId() === 'maka') {
      if (APPBridge.isRN()) {
        APPBridge.navAppBack();
        // this.push(`/maka/mobile/channel`, {
        //   query: {
        //     appid: getAppId(),
        //   },
        // });
      } else if (APPBridge.judgeIsInApp()) {
        APPBridge.navToPage({
          url: 'maka://main/mainActivity',
          type: 'NATIVE',
        });
      } else {
        this.push(`/maka/mobile/channel`, {
          query: {
            appid: getAppId(),
          },
        });
      }
    } else {
      if (APPBridge.isRN()) {
        APPBridge.navAppBack();
        // this.push(`/mobile/home`, {
        //   query: {
        //     default_tab: '1',
        //     appid: getAppId(),
        //   },
        // });
      } else if (APPBridge.judgeIsInApp()) {
        APPBridge.navToPage({
          url: 'maka://home/activity/activityPage?default_tab=1',
          type: 'NATIVE',
        });
      } else {
        this.push(`/mobile/home`, {
          query: {
            default_tab: '0',
            appid: getAppId(),
          },
        });
      }
    }
  };

  // ================================
  // 分享功能：权限检查 & 付费后自动重试
  // ================================

  /**
   * 统一的分享权限检查
   * 供业务组件直接调用
   */
  checkSharePermission = async (
    worksId: string,
    options?: SharePermissionOptions
  ): Promise<boolean> => {
    const { showVipModal = true, trackData } = options || {};

    // 未开启权限检查时，直接通过
    if (!this.sharePermissionEnabled) {
      return true;
    }

    // VIP 直接有权限
    if (this.isVip) {
      return true;
    }

    try {
      const hasPermission = await canShareWithoutWatermark(worksId);

      if (!hasPermission && this.environment.isInApp && getAppId() === 'maka') {
        mkWebStoreLogger.track_pageview({
          page_type: 'vip_page_block',
          page_id: worksId || '',
          object_type: 'vip_page_block',
          object_id: worksId || '',
        });
        toVipPage({
          works_id: worksId,
          ref_object_id: trackData?.ref_object_id || '',
          editor_version: trackData?.editor_version || 10, // 兼容maka会员页
          works_type: trackData?.works_type || 'h5',
          vipType: trackData?.vipType || 'h5',
          tab: trackData?.tab || 'personal',
        });
        return false;
      }

      if (!hasPermission && showVipModal) {
        mkWebStoreLogger.track_pageview({
          page_type: 'vip_page_block',
          page_id: worksId || '',
          object_type: 'vip_page_block',
          object_id: worksId || '',
        });
        // 统一 VIP 弹窗入口
        this.setVipShow(true, trackData || {});
      }

      return hasPermission;
    } catch (error) {
      console.error('[ActivitiveStore] 分享权限检查失败:', error);
      // 检查失败时默认无权限
      return false;
    }
  };

  /**
   * 监听付费成功事件，自动重试待执行的分享任务
   */
  private setupSharePaySuccessListener = () => {
    if (this.sharePaySuccessListenerRegistered) return;

    EventEmitter.on('paySuccess', async () => {
      console.log('[ActivitiveStore] 收到付费成功事件');

      // 如果有待执行的分享任务
      if (this.sharePendingTask) {
        console.log(
          '[ActivitiveStore] 开始执行待分享任务:',
          this.sharePendingTask.method
        );

        try {
          const { method, params } = this.sharePendingTask;

          if (method === 'shareWork') {
            await this.shareWork(params);
          } else if (method === 'shareLink') {
            await this.shareLink(params);
          } else if (method === 'shareImages') {
            await this.shareImages(params);
          }

          this.sharePendingTask.resolve();
          this.sharePendingTask = null;
        } catch (error) {
          console.error('[ActivitiveStore] 付费后分享失败:', error);
          this.sharePendingTask?.reject(error as Error);
          this.sharePendingTask = null;
        }
      }
    });

    this.sharePaySuccessListenerRegistered = true;
  };

  /**
   * 保存待执行的分享任务
   * 用于权限拦截后，用户付费成功自动重试
   */
  private saveSharePendingTask = (
    method: 'shareLink' | 'shareImages' | 'shareWork',
    params: any
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      this.sharePendingTask = { method, params, resolve, reject };
      console.log('[ActivitiveStore] 保存待执行分享任务:', method);
    });
  };

  setLoginShow = (nextData: boolean) => {
    if (this.environment.isInApp) {
      APPBridge.appCall({
        type: 'MKLogOut',
        jsCbFnName: '', // 回传方法 Json值：
      });
    } else if (this.environment.isInMiniP) {
      APPBridge.miniPlogin();
    } else {
      this.loginShow = nextData;
    }
  };

  /**
   * 设置 VIP 弹窗显示状态
   * @param nextData - 是否显示 VIP 弹窗
   * @param data - VIP 弹窗追踪数据，用于埋点和业务逻辑判断
   */
  setVipShow = (nextData: boolean, data?: VipShowData) => {
    this.vipShow = nextData;
    this.vipTrackData = data || {};
    // 根据 works_type 自动设置 activeTab
    if (data?.works_type === 'h5' || data?.works_type === 'longH5') {
      this.activeTab = 'full_site_vips';
    } else if (data?.works_type) {
      this.activeTab = 'post_vips';
    }
    EventEmitter.emit('VIP_MODAL_OPEN_CHANGE', nextData);
  };

  setActiveTab = (nextData: 'full_site_vips' | 'post_vips') => {
    this.activeTab = nextData;
  };

  setBindPhoneShow = (nextData: boolean) => {
    this.bindPhoneShow = nextData;
  };

  setProfile = (nextData: Record<string, any> | null) => {
    this.profile = nextData;
  };

  setCustomerVips = (nextData: any[]) => {
    this.customerVips = nextData;
  };

  setPermissions = (nextData: Record<string, string>) => {
    this.permissions = nextData;
  };

  setVipABTest = (nextData: 'default' | 'test') => {
    this.vipABTest = nextData;
  };

  setAppVersion = (nextData: string) => {
    this.appVersion = nextData;
  };

  // ================================
  // 分享功能：对外分享方法
  // ================================

  /**
   * 处理缩略图 URL
   */
  private formatShareThumb = (thumb?: string): string => {
    if (!thumb) return '';
    return cdnApi(thumb, {
      resizeWidth: 500,
      resizeHeight: 400,
      format: 'webp',
      quality: 85,
      mode: 'lfit',
    });
  };

  /**
   * 分享链接
   * 适用于分享网页链接、H5 作品等
   * 自动进行权限检查
   */
  shareLink = async (
    params: ShareLinkParams & {
      worksId?: string;
      templateId?: string;
      worksDetail?: WorksDetailLike;
      checkPermission?: boolean; // 是否需要权限检查，默认 false
    }
  ) => {
    const {
      title,
      content = '',
      thumb = '',
      url,
      shareType = 'system',
      appid = getAppId(),
      worksId,
      templateId,
      worksDetail,
      checkPermission: needCheck = false,
    } = params;

    // 如果需要权限检查
    if (needCheck && worksId) {
      const hasPermission = await this.checkSharePermission(worksId, {
        trackData: {
          vipWorksDetail: worksDetail,
          works_id: worksId,
          ref_object_id: templateId || '',
          tab: appid === 'xueji' ? 'business' : 'personal',
          works_type: 'h5',
          editor_version: 10,
          vipType: 'share',
        },
      });

      if (!hasPermission) {
        // 没有权限，保存待执行任务，等待付费成功后自动重试
        await this.saveSharePendingTask('shareLink', params);
        return;
      }
    }

    if (shareType === 'system') {
      console.log('系统分享 Web 环境，参数', deepClone(params));
      // Web 环境使用系统分享
      this.shareSystemShare({
        title,
        text: content,
        url,
      });
      return;
    }

    // APP 内使用 Bridge 分享
    const paramsForWechat = {
      title,
      content,
      thumb: this.formatShareThumb(thumb),
      type: 'link',
      shareType,
      url,
    };
    console.log('微信分享，参数', deepClone(paramsForWechat));

    if (this.environment.isInMiniP) {
      APPBridge.minipNav(
        'navigate',
        `/pages/timeline/index?title=${encodeURIComponent(title)}&desc=${encodeURIComponent(content)}&cover=${encodeURIComponent(thumb)}&url=${encodeURIComponent(url)}`
      );
      return;
    }

    APPBridge.appCall({
      type: 'MKShare',
      appid: 'jiantie',
      params: paramsForWechat,
    });
  };

  /**
   * 分享图片
   * 适用于分享海报、多图等
   * 自动进行权限检查
   */
  shareImages = async (
    params: ShareImagesParams & {
      worksId?: string;
      templateId?: string;
      worksDetail?: WorksDetailLike;
      checkPermission?: boolean; // 是否需要权限检查，默认 false
    }
  ) => {
    const {
      title,
      urls,
      fileUri,
      shareType = 'system',
      appid = getAppId(),
      worksId,
      templateId,
      worksDetail,
      checkPermission: needCheck = false,
    } = params;

    // 如果需要权限检查
    if (needCheck && worksId) {
      const hasPermission = await this.checkSharePermission(worksId, {
        trackData: {
          vipWorksDetail: worksDetail,
          works_id: worksId,
          ref_object_id: templateId || '',
          tab: appid === 'xueji' ? 'business' : 'personal',
          works_type: 'poster',
          editor_version: 10,
          vipType: 'share',
        },
      });

      if (!hasPermission) {
        // 没有权限，保存待执行任务，等待付费成功后自动重试
        await this.saveSharePendingTask('shareImages', params);
        return;
      }
    }

    if (!this.environment.isInApp) {
      // Web 环境使用系统分享（降级到链接分享）
      console.warn('Web 环境不支持图片分享，请使用 shareLink');
      return;
    }

    // APP 内使用 Bridge 分享
    APPBridge.appCall({
      type: 'MKShare',
      appid: 'jiantie',
      params: {
        title,
        type: 'images',
        shareType,
        urls,
        fileuri: fileUri,
      },
    });
  };

  /**
   * 分享视频到微信
   * 仅支持 APP 内使用
   */
  shareWechatVideo = (params: ShareVideoParams) => {
    const {
      title,
      content = '',
      thumb = '',
      url,
      scene = '0',
      appid = getAppId(),
    } = params;

    if (!this.environment.isInApp) {
      console.warn('分享微信视频仅在 APP 内支持');
      return;
    }

    APPBridge.appCall({
      type: 'MkShareWechatVideo',
      appid: 'jiantie',
      params: {
        scene, // 0-好友，1-朋友圈
        thumb,
        content,
        url: this.prefixUrl(url),
        title,
      },
    });
  };

  /**
   * 分享到抖音
   * 仅支持 APP 内使用
   */
  shareDouyinVideo = () => {
    if (!this.environment.isInApp) {
      console.warn('分享抖音视频仅在 APP 内支持');
      return;
    }

    APPBridge.appCall({
      type: 'MkShareDouyinVideo',
    });
  };

  /**
   * 分享小程序
   * 仅支持 APP 内使用
   */
  shareMiniProgram = (params: ShareMiniProgramParams) => {
    const {
      webpageUrl,
      path,
      title,
      description = '',
      thumb = '',
      appid = getAppId(),
    } = params;

    if (!this.environment.isInApp) {
      console.warn('分享小程序仅在 APP 内支持');
      return;
    }
  };

  /**
   * 系统原生分享（Web API）
   */
  private shareSystemShare = async (data: {
    title?: string;
    text?: string;
    url?: string;
  }) => {
    if (typeof navigator === 'undefined' || !navigator.share) {
      console.warn('当前浏览器不支持系统分享');
      return;
    }

    try {
      await navigator.share(data);
    } catch (error: any) {
      // 用户取消分享不算错误
      if (error.name !== 'AbortError') {
        console.error('系统分享失败:', error);
      }
    }
  };

  /**
   * 确保 URL 有协议前缀
   */
  private prefixUrl = (url: string): string => {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // 如果是相对路径，添加 origin
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${url.startsWith('/') ? url : `/${url}`}`;
    }
    return url;
  };

  /**
   * 快捷方法：分享作品链接
   * 自动进行权限检查
   *
   * @example
   * // 使用 worksDetail 对象（推荐）
   * await store.shareWork({
   *   worksDetail: worksInfo,
   *   shareType: 'wechat',
   * });
   *
   * // 或使用独立参数
   * await store.shareWork({
   *   workId: '123',
   *   title: '标题',
   *   desc: '描述',
   *   cover: 'https://...',
   * });
   */
  shareWork = async (params: {
    /** 作品详情对象（推荐使用，会自动提取 title/desc/cover 等字段） */
    worksDetail?: WorksDetailLike;
    /** 自定义分享 URL（可选，不传则自动生成 viewer2 URL） */
    url?: string;
    /** 作品 ID（当不传 worksDetail 时必填） */
    workId?: string;
    /** 分享标题（当不传 worksDetail 时必填） */
    title?: string;
    /** 分享描述（可选） */
    desc?: string;
    /** 分享封面（可选） */
    cover?: string;
    /** 模板 ID（可选） */
    templateId?: string;
    /** 分享类型（默认 system） */
    shareType?: ShareType;
    /** 是否需要权限检查（默认 true） */
    checkPermission?: boolean;
  }) => {
    const {
      worksDetail,
      url,
      workId: paramWorkId,
      title: paramTitle,
      desc: paramDesc,
      cover: paramCover,
      templateId: paramTemplateId,
      shareType = 'system',
      checkPermission = true,
    } = params;

    // 从 worksDetail 或独立参数中提取数据
    const workId = worksDetail?.id || paramWorkId;
    const title = worksDetail?.title || paramTitle;
    const desc = worksDetail?.desc || paramDesc;
    const cover = worksDetail?.cover || paramCover;
    const templateId = worksDetail?.template_id || paramTemplateId;

    // 必填字段校验
    if (!workId || !title) {
      console.error('[shareWork] 缺少必填参数 workId 或 title');
      throw new Error('分享失败：缺少作品信息');
    }

    const appid = getAppId();

    try {
      await this.shareLink({
        title,
        content: desc || '',
        thumb: cover,
        url: url || getShareUrl(workId),
        shareType,
        appid,
        worksId: workId,
        worksDetail,
        templateId,
        checkPermission,
      });
    } catch (error) {
      // 如果是权限拦截，任务已保存，等待付费成功
      if (checkPermission) {
        await this.saveSharePendingTask('shareWork', params);
      }
      throw error;
    }
  };
}

export const activitiveStore = new ActivitiveStore();

export { environmentStore };
export type { VipShowData, WorksDetailLike };

/**
 * 统一的 Store Hook
 * 提供所有全局状态和功能
 */
export const useStore = () => {
  const store = useLocalObservable(() => activitiveStore);
  return store;
};

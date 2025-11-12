import APPBridge from '@mk/app-bridge';
import { cdnApi } from '@mk/services';
import { EventEmitter } from '@mk/utils';
import { makeAutoObservable } from 'mobx';
import { EnvironmentStore } from './environment';

export type ShareType =
  | 'wechat'
  | 'wechatTimeline'
  | 'system'
  | 'douyin'
  | 'miniprogram';

/**
 * 权限检查函数类型
 * @param worksId 作品 ID
 * @returns 是否有分享权限
 */
export type CheckPermissionFn = (worksId: string) => Promise<boolean>;

/**
 * 待执行的分享任务
 */
interface PendingShareTask {
  method: 'shareLink' | 'shareImages' | 'shareWork';
  params: any;
  resolve: () => void;
  reject: (error: Error) => void;
}

export interface ShareLinkParams {
  /** 分享标题 */
  title: string;
  /** 分享内容描述 */
  content?: string;
  /** 缩略图 URL */
  thumb?: string;
  /** 分享链接 */
  url: string;
  /** 分享类型 */
  shareType?: ShareType;
  /** APP ID */
  appid?: string;
}

export interface ShareImagesParams {
  /** 分享标题 */
  title: string;
  /** 图片 URLs */
  urls: string[];
  /** 文件 URI（可选） */
  fileUri?: string;
  /** 分享类型 */
  shareType?: ShareType;
  /** APP ID */
  appid?: string;
}

export interface ShareVideoParams {
  /** 视频标题 */
  title: string;
  /** 视频描述 */
  content?: string;
  /** 缩略图 */
  thumb?: string;
  /** 视频 URL */
  url: string;
  /** 分享场景：0-好友，1-朋友圈 */
  scene?: '0' | '1';
  /** APP ID */
  appid?: string;
}

export interface ShareMiniProgramParams {
  /** 网页链接（兼容低版本） */
  webpageUrl: string;
  /** 小程序路径 */
  path: string;
  /** 标题 */
  title: string;
  /** 描述 */
  description?: string;
  /** 缩略图 */
  thumb?: string;
  /** APP ID */
  appid?: string;
}

/**
 * 分享功能 Store
 * 统一处理各种分享场景，自动处理权限检查，支持付费成功后自动重试
 */
export class ShareStore {
  private environment: EnvironmentStore;

  /** 权限检查函数（由外部注入） */
  private checkPermission?: CheckPermissionFn;

  /** VIP 拦截弹窗回调（由外部注入） */
  private showVipModal?: (trackData?: Record<string, any>) => void;

  /** 是否已初始化权限检查 */
  isPermissionCheckEnabled: boolean = false;

  /** 待执行的分享任务（付费成功后自动执行） */
  private pendingShareTask: PendingShareTask | null = null;

  /** 是否已监听付费成功事件 */
  private isPaySuccessListenerRegistered: boolean = false;

  constructor(environment: EnvironmentStore) {
    this.environment = environment;
    makeAutoObservable(this);
    this.setupPaySuccessListener();
  }

  /**
   * 设置权限检查函数和 VIP 弹窗回调
   * 应该在应用启动时由 ActivitiveStore 调用
   */
  setPermissionCheck = (
    checkFn: CheckPermissionFn,
    showVipModalFn: (trackData?: Record<string, any>) => void
  ) => {
    this.checkPermission = checkFn;
    this.showVipModal = showVipModalFn;
    this.isPermissionCheckEnabled = true;
  };

  /**
   * 监听付费成功事件
   * 付费成功后自动重试待执行的分享任务
   */
  private setupPaySuccessListener = () => {
    if (this.isPaySuccessListenerRegistered) return;

    EventEmitter.on('paySuccess', async () => {
      console.log('[ShareStore] 收到付费成功事件');

      // 如果有待执行的分享任务
      if (this.pendingShareTask) {
        console.log(
          '[ShareStore] 开始执行待分享任务:',
          this.pendingShareTask.method
        );

        try {
          // 重新执行分享（此时用户已是 VIP，权限检查会通过）
          const { method, params } = this.pendingShareTask;

          // 根据方法名调用对应的分享方法
          if (method === 'shareWork') {
            await this.shareWork(params);
          } else if (method === 'shareLink') {
            await this.shareLink(params);
          } else if (method === 'shareImages') {
            await this.shareImages(params);
          }

          // 执行成功，清除待执行任务
          this.pendingShareTask.resolve();
          this.pendingShareTask = null;
        } catch (error) {
          console.error('[ShareStore] 付费后分享失败:', error);
          this.pendingShareTask?.reject(error as Error);
          this.pendingShareTask = null;
        }
      }
    });

    this.isPaySuccessListenerRegistered = true;
  };

  /**
   * 保存待执行的分享任务
   * 用于权限拦截后，用户付费成功自动重试
   */
  private savePendingShareTask = (
    method: 'shareLink' | 'shareImages' | 'shareWork',
    params: any
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      this.pendingShareTask = { method, params, resolve, reject };
      console.log('[ShareStore] 保存待执行分享任务:', method);
    });
  };

  /**
   * 检查分享权限（公共方法）
   * @param worksId 作品 ID
   * @param options 配置选项
   * @param options.showVipModal 是否自动显示 VIP 弹窗（默认 true）
   * @param options.trackData VIP 弹窗的埋点数据
   * @returns Promise<boolean> 是否有分享权限
   *
   * @example
   * ```typescript
   * // 基础使用
   * const hasPermission = await share.checkSharePermission(workId);
   * if (hasPermission) {
   *   // 执行分享逻辑
   * }
   *
   * // Promise 链式调用
   * share.checkSharePermission(workId)
   *   .then(hasPermission => {
   *     if (hasPermission) {
   *       // 执行分享逻辑
   *     }
   *   })
   *   .catch(error => {
   *     console.error('权限检查失败:', error);
   *   });
   *
   * // 不自动弹出 VIP 弹窗
   * const hasPermission = await share.checkSharePermission(workId, {
   *   showVipModal: false
   * });
   *
   * // 自定义埋点数据
   * const hasPermission = await share.checkSharePermission(workId, {
   *   trackData: {
   *     works_id: workId,
   *     ref_object_id: templateId,
   *     vipType: 'share'
   *   }
   * });
   * ```
   */
  checkSharePermission = async (
    worksId: string,
    options?: {
      showVipModal?: boolean;
      trackData?: Record<string, any>;
    }
  ): Promise<boolean> => {
    const { showVipModal = true, trackData } = options || {};

    // 如果未启用权限检查，默认通过
    if (!this.isPermissionCheckEnabled || !this.checkPermission) {
      return true;
    }

    try {
      const hasPermission = await this.checkPermission(worksId);

      if (!hasPermission && showVipModal && this.showVipModal) {
        // 没有权限，弹出 VIP 拦截页
        this.showVipModal(trackData);
      }

      return hasPermission;
    } catch (error) {
      console.error('[ShareStore] 权限检查失败:', error);
      // 检查失败时默认无权限
      return false;
    }
  };

  /**
   * 内部权限检查方法（用于分享方法内部调用）
   * @param worksId 作品 ID
   * @param trackData 埋点数据（用于 VIP 弹窗）
   * @returns 是否有权限继续
   */
  private async checkSharePermissionInternal(
    worksId?: string,
    trackData?: Record<string, any>
  ): Promise<boolean> {
    // 如果未启用权限检查，默认通过
    if (!this.isPermissionCheckEnabled || !this.checkPermission) {
      return true;
    }

    // 如果没有 worksId，默认通过（某些分享场景不需要 worksId）
    if (!worksId) {
      return true;
    }

    try {
      const hasPermission = await this.checkPermission(worksId);

      if (!hasPermission && this.showVipModal) {
        // 没有权限，弹出 VIP 拦截页
        this.showVipModal(trackData);
      }

      return hasPermission;
    } catch (error) {
      console.error('权限检查失败:', error);
      // 检查失败时，默认不通过
      return false;
    }
  }

  /**
   * 获取默认 AppId
   */
  private getAppId = (): string => {
    if (typeof document === 'undefined') return 'jiantie';
    return document.documentElement.className || 'jiantie';
  };

  /**
   * 处理缩略图 URL
   */
  private formatThumb = (thumb?: string): string => {
    if (!thumb) return '';
    return cdnApi(thumb, {
      resizeWidth: 120,
      format: 'webp',
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
      checkPermission?: boolean; // 是否需要权限检查，默认 false
    }
  ) => {
    const {
      title,
      content = '',
      thumb = '',
      url,
      shareType = 'system',
      appid = this.getAppId(),
      worksId,
      templateId,
      checkPermission: needCheck = false,
    } = params;

    // 如果需要权限检查
    if (needCheck && worksId) {
      const hasPermission = await this.checkSharePermissionInternal(worksId, {
        works_id: worksId,
        ref_object_id: templateId || '',
        tab: appid === 'xueji' ? 'business' : 'personal',
        vipType: 'share',
      });

      if (!hasPermission) {
        // 没有权限，保存待执行任务，等待付费成功后自动重试
        await this.savePendingShareTask('shareLink', params);
        return;
      }
    }

    if (!this.environment.isInApp) {
      // Web 环境使用系统分享
      this.systemShare({
        title,
        text: content,
        url,
      });
      return;
    }

    // APP 内使用 Bridge 分享
    APPBridge.appCall({
      type: 'MKShare',
      appid,
      params: {
        title,
        content,
        thumb: this.formatThumb(thumb),
        type: 'link',
        shareType,
        url,
      },
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
      checkPermission?: boolean; // 是否需要权限检查，默认 false
    }
  ) => {
    const {
      title,
      urls,
      fileUri,
      shareType = 'system',
      appid = this.getAppId(),
      worksId,
      templateId,
      checkPermission: needCheck = false,
    } = params;

    // 如果需要权限检查
    if (needCheck && worksId) {
      const hasPermission = await this.checkSharePermissionInternal(worksId, {
        works_id: worksId,
        ref_object_id: templateId || '',
        tab: appid === 'xueji' ? 'business' : 'personal',
        vipType: 'share',
      });

      if (!hasPermission) {
        // 没有权限，保存待执行任务，等待付费成功后自动重试
        await this.savePendingShareTask('shareImages', params);
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
      appid,
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
      appid = this.getAppId(),
    } = params;

    if (!this.environment.isInApp) {
      console.warn('分享微信视频仅在 APP 内支持');
      return;
    }

    APPBridge.appCall({
      type: 'MkShareWechatVideo',
      appid,
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
      appid = this.getAppId(),
    } = params;

    if (!this.environment.isInApp) {
      console.warn('分享小程序仅在 APP 内支持');
      return;
    }

    APPBridge.appCall({
      type: 'MKShareMiniP',
      appid,
      params: {
        webpageUrl: this.prefixUrl(webpageUrl),
        path,
        title,
        description,
        thumb: this.formatThumb(thumb),
      },
    });
  };

  /**
   * 系统原生分享（Web API）
   */
  private systemShare = async (data: {
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
   */
  shareWork = async (params: {
    workId: string;
    title: string;
    desc?: string;
    cover?: string;
    templateId?: string;
    shareType?: ShareType;
    checkPermission?: boolean; // 是否需要权限检查，默认 true
  }) => {
    const {
      workId,
      title,
      desc,
      cover,
      templateId,
      shareType = 'system',
      checkPermission = true, // 默认开启权限检查
    } = params;
    const appid = this.getAppId();

    try {
      await this.shareLink({
        title,
        content: desc || '',
        thumb: cover,
        url: `${typeof window !== 'undefined' ? window.location.origin : ''}/viewer2/${workId}?appid=${appid}`,
        shareType,
        appid,
        worksId: workId,
        templateId,
        checkPermission,
      });
    } catch (error) {
      // 如果是权限拦截，任务已保存，等待付费成功
      if (checkPermission) {
        await this.savePendingShareTask('shareWork', params);
      }
      throw error;
    }
  };
}

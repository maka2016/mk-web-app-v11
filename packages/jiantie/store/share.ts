export type ShareType =
  | 'wechat'
  | 'wechatTimeline'
  | 'system'
  | 'douyin'
  | 'miniprogram';

/**
 * 作品详情类型（支持序列化后的版本）
 * 允许日期字段为 Date 或 string
 */
export type WorksDetailLike = {
  id?: string;
  title?: string;
  desc?: string | null;
  cover?: string | null;
  template_id?: string | null;
  [key: string]: any;
};

/**
 * VIP 弹窗追踪数据
 */
export interface VipShowData {
  /** 作品详情（用于 VIP 弹窗展示作品信息） */
  vipWorksDetail?: WorksDetailLike;
  /** 作品 ID */
  works_id?: string;
  /** 引用对象 ID（通常是模板 ID） */
  ref_object_id?: string | null;
  /** 标签页类型 */
  tab?: 'business' | 'personal';
  /** 作品类型 */
  works_type?: 'video' | 'poster' | 'h5' | 'longH5';
  /** VIP 类型 */
  vipType?: 'share' | 'vip' | 'senior' | string;
  /** 编辑器版本 */
  editor_version?: number;
  /** 父页面类型 */
  parent_page_type?: string;
  /** 预览 URL */
  previewUrl?: string;
  /** 模板 ID（同 ref_object_id） */
  template_id?: string;
  /** 引用页面 ID */
  ref_page_id?: string;
  /** 其他额外数据 */
  [key: string]: any;
}

/**
 * 分享权限检查的可选参数
 */
export interface SharePermissionOptions {
  /** 是否自动弹出 VIP 弹窗（默认 true） */
  showVipModal?: boolean;
  /** 透传给 VIP 弹窗的埋点数据 */
  trackData?: VipShowData;
}

/**
 * 权限检查函数类型
 * 具体实现由 `ActivitiveStore` 注入
 */
export type CheckSharePermissionFn = (
  worksId: string,
  options?: SharePermissionOptions
) => Promise<boolean>;

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

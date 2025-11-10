export interface VideoBgConfig {
  /** 视频 URL */
  videoUrl: string;
  /** 对象适应方式（默认 cover） */
  objectFit?: 'cover' | 'contain' | 'fill';
  /** 是否循环播放（默认 true） */
  loop?: boolean;
  /** 是否静音（默认 true） */
  muted?: boolean;
  /** 不透明度（0-1，默认 1） */
  opacity?: number;
}

export interface VideoBgConfig {
  /** MP4 格式视频 URL（用于非透明通道） */
  mp4VideoUrl?: string;
  /** MOV 格式视频 URL（用于透明通道，Safari/iOS） */
  movVideoUrl?: string;
  /** WebM 格式视频 URL（用于透明通道，Chrome/Firefox/Edge） */
  webmVideoUrl?: string;
  /** 视频封面图片 URL */
  posterUrl?: string;
  /** 对象适应方式（默认 cover） */
  objectFit?: 'cover' | 'contain' | 'fill';
  /** 是否循环播放（默认 true） */
  loop?: boolean;
  /** 是否静音（默认 true） */
  muted?: boolean;
  /** 不透明度（0-1，默认 1） */
  opacity?: number;
}

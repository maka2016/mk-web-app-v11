export interface AppContext {
  query: {
    uid: string;
    worksId: string;
    version: string;
    host: string;
    /** 截图模式 */
    screenshot: string;
    /** 作品类型 */
    type: string;
    editor_preview?: any;
    env?: any;
    open_by?: any;
    view_type?: any;
    backDoor?: string;
    back_door?: string;
    /** 画布缩放比例 */
    canvasScale?: string;
    /** 元素id */
    elemId?: string;
    /** 水印 */
    watermark?: string;
    /** 默认第几页 */
    page?: string;
    /** 是否平铺所有页面的模式 */
    flatPageRenderMode?: string;
    /** 是否视频模式 */
    video_mode?: string;
    /** 动画播放完成后延时 */
    auto_play_after_animation?: string;
    /** 动画播放速度 */
    animation_speed?: string;
    appid?: string;
    inviteId?: string;
  };
}

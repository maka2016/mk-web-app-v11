export interface WorksDetail {
  thumbUrl?: string;
  workId?: string;
  uid?: number | string;
  workType?: string;
  title?: string;
  content?: string;
  templateId?: string;
  viewerUrl?: string;
  thumb?: string;
  first_img?: string;
}

export interface WechatClientInfo {
  wechatName: string;
  wxAvatar: string;
  openId: string;
  unionId?: string;
}

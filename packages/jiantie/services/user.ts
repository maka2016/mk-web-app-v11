import { API } from '@mk/services';
import request from './request';
/**
 * 获取用户信息
 * @param uid
 * @returns
 */
export const getUserProfile = (uid: number) => {
  return request.get(`${API('主服务API')}/api/plat/v1/users/${uid}/profile`);
};

/**
 * 获取用户已购会员信息
 * @param uid
 * @returns
 */
export const getCustomerVips = (uid: number) => {
  return request.get(`${API('查询服务API')}/api/v1/users/${uid}/customer_vips`);
};

export const getUserRole = (appid: string, uid: string) => {
  return request.get(
    `${API('apiv10')}/user-roles/vip/${appid}/${uid}?incRole=1`
  );
};

/**
 * 用户权限点
 * @param uid
 * @returns
 */
export const getPermissionList = (appid: string, uid: number) => {
  return request.get(`${API('apiv10')}/user-permissions/${appid}/${uid}`);
};

export const getOSSUploadInfo = async (uid: number) => {
  return request.get(`${API('主服务API')}/api/plat/v1/users/${uid}/stss`);
};

export const getVerifyCodeV10 = async (data: any) => {
  return request.post(`${API('apiv10')}/verify-code/v2/send`, data);
};

export const userLogin = async (data: any) => {
  return request.post(`${API('apiv10')}/auths/sessions`, data);
};

export const wechatSignature = async (config: string, url: string) => {
  return request.get(
    `${API('apiv10')}/wechat/jsapi-signature?config=${config}&url=${url}`
  );
};

export const createWeixinBaseUrl = (callbackUrl: string) => {
  return `${API('公开服务API')}/wechat/api/v1/login?config=maka_gzh&url=${encodeURIComponent(callbackUrl)}`;
};

export const getUserProfileV10 = (appid: string, uid: string) => {
  return request.get(`${API('apiv10')}/users/${appid}/${uid}`);
};

export const checkPurchased = async (
  worksId: string,
  uid: string,
  appid: string
) => {
  if (!worksId) {
    return false;
  }

  try {
    // 检查是否能发布
    const res = (await request.get(
      `${API('apiv10')}/user-resources/${appid}/${uid}/work/${worksId}/purchased`
    )) as any;

    if (res) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
};

// 检查是否绑定手机（兼容maka）
export const checkBindPhone = async (uid: string, appid: string) => {
  const res: any = await request.get(
    `${API('apiv10')}/auths/${appid}/${uid}/phone-binded`
  );

  return res?.binded;
};

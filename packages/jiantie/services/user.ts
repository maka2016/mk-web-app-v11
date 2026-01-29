import { API } from '@/services';
import qs from 'qs';
import request from './request';

export const getUserRole = (appid: string, uid: string) => {
  return request.get(`${API('apiv10')}/user-roles/vip/${appid}/${uid}?incRole=1`);
};

/**
 * 用户权限点
 * @param uid
 * @returns
 */
export const getPermissionList = (appid: string, uid: number) => {
  if (appid === 'maka') {
    return request.get(`${API('apiv10')}/user-permissions/${appid}/${uid}`);
  } else {
    return {
      appid,
      permissions: [],
    };
  }
};

export const getOSSUploadInfo = async (uid: number) => {
  return request.get(`${API('主服务API')}/api/plat/v1/users/${uid}/stss`);
};

export const getVerifyCodeV10 = async (data: any) => {
  return request.post(`${API('apiv10')}/verify-code/v2/send`, data);
};

export const userLogin = async (data: Record<string, any>) => {
  return request.post(`${API('查询服务API')}/api/v1/sessions`, qs.stringify(data));
};

export const userLoginV10 = async (data: any) => {
  return request.post(`${API('apiv10')}/auths/sessions`, data);
};

export const wechatSignature = async (config: string, url: string) => {
  return request.get(`${API('apiv10')}/wechat/jsapi-signature?config=${config}&url=${url}`);
};

export const getUserProfileV10 = (appid: string, uid: string) => {
  return request.get(`${API('apiv10')}/users/${appid}/${uid}`);
};

export const checkPurchased = async (worksId: string, uid: string, appid: string) => {
  console.log('checkPurchased', worksId, uid, appid);
  if (!worksId) {
    return false;
  }

  try {
    // 检查是否能发布
    const res = (await request.get(`${API('apiv10')}/user-resources/${appid}/${uid}/work/${worksId}/purchased`)) as any;

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
  const res: any = await request.get(`${API('apiv10')}/auths/${appid}/${uid}/phone-binded`);

  return res?.binded;
};

// 获取微信登录二维码
export const getLoginQrcode = async (data?: any) => {
  return request.post(`${API('查询服务API')}/api/v1/public/wechat_qrcodes`, qs.stringify(data), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    withCredentials: true,
  });
};

// 第三方登录（QQ等）
export const thirdOauth = async (data: { source: string; state: string }) => {
  return request.get(`${API('查询服务API')}/api/v1/public/oauth`, {
    params: data,
  });
};

// 获取图形验证码
export const getCaptchaCode = async (params: { type: string; w: string; h: string }) => {
  return request.get(`${API('主服务API')}/api/plat/v1/captcha`, {
    params,
  });
};

// 获取重置密码验证码
export const getResetVerifyCode = async (mobile: string) => {
  return request.post(`${API('主服务API').replace('apiv5', 'api')}/api/verifycode/reset`, qs.stringify({ mobile }), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
  });
};

// 校验重置密码验证码
export const checkResetVerifyCode = async (data: { mobile: string; code: string }) => {
  return request.post(`${API('主服务API').replace('apiv5', 'api')}/api/user/verify_reset_code`, qs.stringify(data), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
  });
};

// 重置密码
export const resetPassword = async (data: { mobile: string; token: string; password: string }) => {
  return request.post(`${API('主服务API').replace('apiv5', 'api')}/api/v4/user/password`, qs.stringify(data), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
  });
};

// 邮箱找回密码
export const findPassword = async (data: { email: string; captcha: string; CAPTCHA_LOGIN: string }) => {
  return request.post(`${API('主服务API').replace('apiv5', 'api')}/api/user/password`, qs.stringify(data), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
  });
};

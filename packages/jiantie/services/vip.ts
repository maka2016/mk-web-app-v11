import { API } from '@mk/services';
import { isMakaAppAndroid, isMakaAppIOS, isPc } from '@mk/utils';
import { getJiantieApiHost } from './jiantie-services';
import request from './request';

const getPlatform = () => {
  if (isPc()) {
    return 'PC';
  } else if (isMakaAppAndroid()) {
    return 'android';
  } else if (isMakaAppIOS()) {
    return 'ios';
  } else {
    return 'wap';
  }
};

/**
 *
 * @param data 创建作品
 * @returns
 */
export const getVipPackages = (modulo = 160) => {
  return request.get(
    `${API('主服务API')}/vips/-/packages:search?modulo=${modulo}`,
    {
      headers: {
        device: getPlatform(),
      },
    }
  );
};

/**
 * 移动端创建订单
 * @param uid
 * @param vipId
 * @param params
 * @returns
 */
export const createOrder = async (uid: number, vipId: number, params: any) => {
  return request.post(
    `${API('主服务API')}/api/v1/users/${uid}/orders/customer_vips/${vipId}`,
    params
  );
};

export const checkOrderStatus = (uid: number, orderId: string) => {
  return request.get(
    `${API('查询服务API')}/api/v1/users/${uid}/orders/${orderId}`
  );
};

export const getWorkPricePackage = (modulo: number) => {
  return request.get(
    `${getJiantieApiHost()}/work-price-packages?modulo=${modulo}`
  );
};

export const getWorkPricePackageV2 = (modulo: number, worksId?: string) => {
  return request.get(
    `${API('apiv10')}/products?modulo=${modulo}&workId=${worksId}`
  );
};

export const createOrderV2 = async (uid: number, params: any) => {
  return request.post(
    `${API('主服务API')}/api/v1/users/${uid}/orders`,
    params,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
    }
  );
};

export const createOrderV3 = async (params: any) => {
  return request.post(`${API('apiv10')}/orders/by-sku`, params);
};

export const checkOrderStatusV3 = async (orderId: string) => {
  return request.get(`${API('apiv10')}/orders/${orderId}/payment-status`);
};

export const wechatPay = async (data: any) => {
  return request.post(`${API('公开服务API')}/wechat/api/v1/pays`, data);
};

export const aliPay = (data: any) => {
  return request.post(`${API('apiv10')}/alipay/wap-pay/jiantie`, data);
};

export const h5WxPay = (data: any) => {
  return request.post(`${API('apiv10')}/wechat-pay/h5-pay/jiantie`, data);
};

import { API } from '@/services';
import { isMakaAppAndroid, isMakaAppIOS, isPc } from '../utils';
import request from './request';

export const getVipPackagesV4 = (module = 195) => {
  const getPlatform2 = () => {
    if (isPc()) {
      return 'pc';
    } else if (isMakaAppAndroid()) {
      return 'android';
    } else if (isMakaAppIOS()) {
      return 'ios';
    } else {
      return 'wap';
    }
  };
  return request.get(`${API('主服务API')}/vips/v4/packages:search?modulo=${module}`, {
    headers: {
      device: getPlatform2(),
    },
  });
};

export const getShortUrl = (url: string) => {
  return request.get(`${API('主服务API')}/common/short-url?url=${encodeURIComponent(url)}`);
};

export const getOrderInfo = (uid: number, orderId: string) => {
  return request.get(`${API('查询服务API')}/api/v1/users/${uid}/orders/${orderId}`);
};

export const checkPayOrder = (ticket: string) => {
  return request.get(`${API('资源位服务API')}/pay/v1/order/info/ticket/${ticket}`, {
    headers: { device: 'PC', platformtype: 'web' },
  });
};

/**
 *  检查微信订阅订单
 * @param uid
 * @param data
 * @returns
 */
export const checkWechatpayOrder = (uid: number, data: any) => {
  return request.post(`${API('主服务API')}/api/plat/v1/wechatpay/${uid}/checkorder`, data);
};

export const wechatPayEntrustWeb = async (uid: number, data: any) => {
  return request.post(`${API('主服务API')}/api/plat/v1/wechatpay/${uid}/entrustweb`, data);
};

export const checkOrderStatus = (uid: number, orderId: string) => {
  return request.get(`${API('查询服务API')}/api/v1/users/${uid}/orders/${orderId}`);
};

// 产品 SKU 类型定义
export interface ProductSku {
  skuCode: string;
  appid: string;
  price: number;
  originalPrice: number;
  currency: string;
  duration: string;
  isSubscription: boolean;
  trialPeriod: string | null;
  name: string;
  desc: string;
  locale: string;
  style: Record<string, any>;
  attribute: Record<string, string>;
  // IAP 商品 ID（例如苹果内购用的 product id）
  iapProductId?: string;
  // 原始第三方商品元信息（包含 appleid 等）
  thirdProductMeta?: Record<string, unknown>;
}

// 产品类型定义
export interface ProductItem {
  appid: string;
  type: string;
  spuCode: string;
  name: string;
  desc: string;
  locale: string;
  attribute: Record<string, string>;
  privileges: string;
  productSkus: ProductSku[];
}

// 价格套餐响应类型定义
export interface WorkPricePackageV2Response {
  modulo: number;
  packCode: string;
  appid: string;
  products: ProductItem[];
}

export const getWorkPricePackageV2 = (modulo: number, worksId?: string): Promise<WorkPricePackageV2Response> => {
  return request.get(`${API('apiv10')}/products?modulo=${modulo}&workId=${worksId}`);
};

export const createOrderV3 = async (params: any) => {
  return request.post(`${API('apiv10')}/orders/by-sku`, params);
};

export const aliPay = (data: any) => {
  return request.post(`${API('apiv10')}/alipay/wap-pay/jiantie`, data);
};

export const h5WxPay = (data: any) => {
  return request.post(`${API('apiv10')}/wechat-pay/h5-pay/jiantie`, data);
};

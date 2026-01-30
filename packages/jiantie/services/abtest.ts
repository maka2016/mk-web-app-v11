import { getAppId } from '@/services';
import { isClient, queryToObj } from '@/utils';
import { getUid } from './request';

export const abtest = (name: string, tUid?: string) => {
  if (!isClient()) return false;

  let uid;
  if (tUid) {
    uid = +tUid;
  } else {
    uid = uid || getUid();
  }
  const params = queryToObj();
  const map: any = {
    freeAD: uid % 10 < 3,
    // newVip1: true, //4900
    // newVip2: false, //6900

    // newVip1: uid % 10 < 6 && uid % 10 > 2, //3，4，5
    // newVip2: uid % 10 < 3, //0，1，2
    // lifeVip: true,
    // lifeVip79: uid % 10 > 5,
    monthVip: false,
  };

  if (params[name] !== undefined) {
    return params[name] > 0;
  } else {
    return map[name] || false;
  }
};

export const getVipABTest = (uid: string | number) => {
  const appid = getAppId();
  if (appid === 'jiantie') {
    // if (+uid % 7 < 3) {
    return 'test';
    // }
    // return 'default';
  }

  if (!uid) {
    return 'default';
  }
  // xueji: 0-4 是 新灰度 5-9 是 旧灰度
  if (+uid % 10 < 5) {
    return 'test';
  } else {
    return 'default';
  }
};

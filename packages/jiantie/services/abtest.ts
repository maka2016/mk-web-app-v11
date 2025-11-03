import { isClient } from '@/utils';
import { getAppId } from '@mk/services';
import { queryToObj } from '@mk/utils';
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

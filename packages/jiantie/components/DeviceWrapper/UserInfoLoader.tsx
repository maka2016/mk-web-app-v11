'use client';

import {
  API,
  getAppId,
  getPermissionList,
  getToken,
  getUid,
  getUserProfileV10,
  getUserRole,
  request,
} from '@/services';
import { getVipABTest } from '@/services/abtest';
import { useStore } from '@/store';
import APPBridge from '@/store/app-bridge';
import {
  delCookie,
  isMakaAppAndroid,
  isMakaAppClient,
  isWechat,
  queryToObj,
  setCookie,
  setCookieExpire,
} from '@/utils';
import { trpc } from '@/utils/trpc';
import Script from 'next/script';
import { useEffect, useState } from 'react';

export const UserInfoLoader = () => {
  const appid = getAppId();
  const [loadDebugScript, setLoadDebugScript] = useState(false);
  const {
    setProfile,
    setCustomerVips,
    setPermissions,
    setVipABTest,
    setAppVersion,
  } = useStore();
  // adid=__AID__&creativeid=__CID__&creativetype=__CTYPE__&clickid=__CLICKID__

  const pageView = async () => {
    const { projectid, promotionid, creativetype, clickid } =
      queryToObj() || {};
    // const { adid, creativeid, creativetype, clickid } = queryToObj()
    if (clickid) {
      await request.post(
        `${API('api_v7')}/promotion/v1/conversion/douyin/page-view`,
        {
          projectid,
          promotionid,
          creativetype,
          clickid,
        }
      );
    }
  };

  useEffect(() => {
    pageView();
    if (isMakaAppAndroid()) {
      document.documentElement.style.setProperty(
        '--safe-area-inset-top',
        '44px'
      );
    }
  }, []);

  const getProfile = async () => {
    const uid = getUid();
    const token = getToken();
    if (uid && token) {
      try {
        // 如果环境变量 APIV11 为 true，则使用 tRPC 获取用户信息
        const useV11API =
          typeof process !== 'undefined' && process.env.APIV11 === 'true';

        if (useV11API) {
          // 使用 tRPC 获取 userProfile 和 role
          const uidNum = Number(uid);
          if (isNaN(uidNum)) {
            console.error('无效的 uid:', uid);
            setProfile(null);
            setCustomerVips([]);
            return;
          }

          try {
            const [profileRes, roleRes] = await Promise.all([
              trpc.user.getProfile.query({ uid: uidNum, appid }),
              trpc.user.getRole.query({ uid: uidNum, appid }),
            ]);

            setProfile(profileRes);
            setCustomerVips(roleRes || []);
          } catch (error) {
            console.error('tRPC 获取用户信息失败:', error);
            setProfile(null);
            setCustomerVips([]);
          }
        } else {
          // 使用 v10 API 获取用户信息
          const [res, vipRes]: any = await Promise.all([
            getUserProfileV10(appid, uid),
            getUserRole(appid, uid),
          ]);

          setProfile(res);
          setCustomerVips(vipRes || []);
        }
      } catch (error) {
        console.error('获取用户信息失败:', error);
        // API 调用失败时，清空 profile，避免一直显示加载中
        setProfile(null);
        setCustomerVips([]);
      }
    } else {
      // 如果没有 uid 或 token，确保 profile 为 null
      setProfile(null);
      setCustomerVips([]);
    }
  };

  const getUserPremissionsV5 = async () => {
    const uid = getUid();
    const appid = getAppId();
    if (uid) {
      try {
        const res = (await getPermissionList(appid, uid)) as any;
        if (res.permissions) {
          const ret: Record<string, any> = {};
          res.permissions.forEach((item: any) => {
            ret[item.alias] = item.value || 'true';
          });
          setPermissions(ret);
        }
      } catch (error) {
        console.error(error);
      }
    }
  };

  const getABTest = async () => {
    const uid = getUid();
    if (!uid) {
      return;
    }

    const abtest = getVipABTest(uid);
    setVipABTest(abtest);
  };

  const initUserInfo = () => {
    getProfile();
    getUserPremissionsV5();
    getABTest();
  };

  const initAppUserInfo = () => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.appCall(
        {
          type: 'MKUserInfo',
          jsCbFnName: 'appBridgeOnUserInfoCb',
        },
        p => {
          console.log('appBridgeOnUserInfoCb', p);
          if (p?.uid) {
            setCookieExpire(`${appid}_token`, p?.token, 3 * 60 * 60 * 1000);
            setCookieExpire(`${appid}_uid`, p.uid, 3 * 60 * 60 * 1000);
            initUserInfo();
          } else {
            // delCookie(`${appid}_token`);
            // delCookie(`${appid}_uid`);
          }
        }
      );
      initUserInfo();
    } else {
      initUserInfo();
    }
  };

  const getAppversion = async () => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.appCall(
        {
          type: 'MKAppVersion',
          params: {},
          jsCbFnName: 'appBridgeOnAppVersionCb',
        },
        cbParams => {
          console.log('getAppversion', cbParams);
          if (cbParams && cbParams?.version) {
            setAppVersion(cbParams?.version);
          }
        },
        1000
      );
    }
  };

  useEffect(() => {
    initAppUserInfo();
    getAppversion();
    if (typeof window !== 'undefined') {
      (window as any)['freshPageData'] = () => {
        initUserInfo();
      };
      (window as any)['logOutSignalFromApp'] = () => {
        const logout = () => {
          setTimeout(() => {
            setCookie(`${appid}_token`, '');
            setCookie(`${appid}_uid`, '');
            delCookie(`${appid}_uid`);
            delCookie(`${appid}_token`);
            // location.reload();
          }, 200);
        };
        logout();
      };
    }
    if (process.env.ENV !== 'prod' && (isWechat() || isMakaAppClient())) {
      setLoadDebugScript(true);
    }
  }, []);

  return (
    <>
      {loadDebugScript && (
        <Script
          src='https://res.maka.im/assets/jiantie/eruda.js'
          onLoad={() => {
            if (
              typeof window !== 'undefined' &&
              window &&
              (window as any).eruda
            ) {
              (window as any).eruda.init();
            }
          }}
        ></Script>
      )}
    </>
  );
};

import {
  API,
  getAppId,
  getPermissionList,
  getUid,
  getUserProfileV10,
  getUserRole,
  request,
} from '@/services';
import { useStore } from '@/store';
import { Button } from '@workspace/ui/components/button';
import { useState } from 'react';
import toast from 'react-hot-toast';
const VipConvert = () => {
  const [code, setCode] = useState('');

  const { setProfile, setCustomerVips, setPermissions } = useStore();

  const getProfile = async () => {
    const uid = getUid();
    const appid = getAppId();
    if (uid) {
      const [res, vipRes]: any = await Promise.all([
        getUserProfileV10(appid, uid),
        getUserRole(appid, uid),
      ]);

      setProfile(res);
      setCustomerVips(vipRes || []);
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

  const initUserInfo = async () => {
    getProfile();
    getUserPremissionsV5();
  };

  const toConvert = async () => {
    const uid = getUid();

    if (!code || !uid) {
      return;
    }

    const res = (await request.post(
      `${API('查询服务API')}/api/v1/users/${getUid()}/gift_codes`,
      { code }
    )) as any;
    if (res.code === 200) {
      initUserInfo();
      // onClosePopup()
      // Toast({
      toast.success('领取成功');
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className='text-center'>
      <div className='rounded-[20px] bg-white px-6 pt-[50px] pb-14'>
        <div className='w-full border border-[#0000000f] rounded-[6px] bg-white px-4 py-3 my-9'>
          <input
            className='w-full h-[22px] text-[14px] font-normal leading-[22px] text-center border-none outline-none'
            placeholder='请输入邀请码'
            value={code}
            onChange={e => setCode(e.target.value)}
          />
        </div>
        <Button className='w-full' onClick={() => toConvert()}>
          确认
        </Button>
      </div>
    </div>
  );
};

export default VipConvert;

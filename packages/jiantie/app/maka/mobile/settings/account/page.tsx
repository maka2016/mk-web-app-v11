'use client';
import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import { checkBindPhone, getAppId, getUid } from '@/services';
import { useStore } from '@/store';
import APPBridge from '@/store/app-bridge';
import { maskPhoneNumber } from '@/utils';
import { Icon } from '@workspace/ui/components/Icon';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { observer } from 'mobx-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import KefuQrcode from '../components/KefuQrcode';
import ResetPassword from '../components/ResetPassword';
import styles from '../index.module.scss';

const AccountSetting = () => {
  const { setBindPhoneShow, userProfile } = useStore();
  const [resetPasswordDialog, setResetPasswordDialog] = useState(false);
  const [kefuDialog, setKefuDialog] = useState(false);
  const [hasBindPhone, setHasBindPhone] = useState(false);
  const router = useRouter();

  const onCheckBindPhone = async () => {
    const hasBind = await checkBindPhone(getUid(), getAppId());
    setHasBindPhone(hasBind);
  };

  useEffect(() => {
    onCheckBindPhone();
  }, []);

  return (
    <div className='h-full bg-white'>
      <MobileHeader title='账号与安全' />
      <div className='p-4 flex flex-col gap-2'>
        <div className={styles.menus}>
          <div
            className={styles.menuItem}
            onClick={() => setResetPasswordDialog(true)}
          >
            <div className='flex-1'>
              <div className={styles.tit}>重置密码</div>
            </div>
            <Icon name='right' />
          </div>
          <div
            className={styles.menuItem}
            onClick={() => {
              if (!hasBindPhone) {
                setBindPhoneShow(true);
              } else {
                if (APPBridge.judgeIsInApp()) {
                  APPBridge.navToPage({
                    url: `${location.origin}/maka/mobile/settings/change-phone?is_full_screen=1`,
                    type: 'URL',
                  });
                } else {
                  router.push(`/maka/mobile/settings/change-phone`);
                }
              }
            }}
          >
            <div className='flex-1'>
              <div className={styles.tit}>绑定手机</div>
            </div>
            <span className={styles.loginid}>
              {hasBindPhone
                ? userProfile?.auths?.phone?.loginid
                  ? maskPhoneNumber(userProfile?.auths?.phone?.loginid)
                  : ' 已绑定'
                : '未绑定'}
            </span>
            <Icon name='right' />
          </div>
          <div className={styles.menuItem} onClick={() => setKefuDialog(true)}>
            <div className='flex-1'>
              <div className={styles.tit}>解除第三方账号</div>
            </div>
            <Icon name='right' />
          </div>
        </div>
      </div>
      <ResponsiveDialog
        isOpen={resetPasswordDialog}
        onOpenChange={setResetPasswordDialog}
        title='重置密码'
      >
        <ResetPassword onClose={() => setResetPasswordDialog(false)} />
      </ResponsiveDialog>
      <ResponsiveDialog
        isDialog
        isOpen={kefuDialog}
        onOpenChange={setKefuDialog}
        title='联系我的客服'
        description='微信扫码'
        contentProps={{
          className: 'w-[300px]',
        }}
      >
        <KefuQrcode />
      </ResponsiveDialog>
    </div>
  );
};

export default observer(AccountSetting);

'use client';
import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import { checkBindPhone, getAppId, getUid } from '@/services';
import { useStore } from '@/store';
import { maskPhoneNumber } from '@/utils';
import { Icon } from '@workspace/ui/components/Icon';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import ChangePhone from '../components/ChangePhone';
import KefuQrcode from '../components/KefuQrcode';
import ResetPassword from '../components/ResetPassword';
import cls from 'classnames';

const AccountSetting = () => {
  const store = useStore();
  const isMobile = store.environment.isMobile;
  const { setBindPhoneShow, userProfile } = store;
  const [resetPasswordDialog, setResetPasswordDialog] = useState(false);
  const [kefuDialog, setKefuDialog] = useState(false);
  const [changePhoneDialog, setChangePhoneDialog] = useState(false);
  const [hasBindPhone, setHasBindPhone] = useState(false);

  const onCheckBindPhone = async () => {
    const hasBind = await checkBindPhone(getUid(), getAppId());
    setHasBindPhone(hasBind);
  };

  useEffect(() => {
    // 初始化时检查绑定状态
    void onCheckBindPhone();
  }, []);

  return (
    <div className='h-full bg-white'>
      {isMobile && <MobileHeader title='账号与安全' />}
      {!isMobile && (
        <div className='px-6 py-4 border-b'>
          <h1 className='text-2xl font-semibold text-[#09090b]'>账号与安全</h1>
        </div>
      )}
      <div
        className={cls([
          'flex flex-col',
          isMobile ? 'p-4 gap-2' : 'p-6 gap-4 max-w-2xl mx-auto w-full',
        ])}
      >
        <div className='border border-[#e4e4e7] rounded-[10px]'>
          <div
            className={cls([
              'px-4 py-3 flex items-center gap-3 border-b border-[#e4e4e7] last:border-b-0 transition-colors cursor-pointer',
              !isMobile && 'hover:bg-gray-50',
            ])}
            onClick={() => setResetPasswordDialog(true)}
          >
            <div className='flex-1'>
              <div
                className={cls([
                  'font-semibold text-[#09090b]',
                  isMobile ? 'text-sm leading-5' : 'text-base leading-6',
                ])}
              >
                重置密码
              </div>
            </div>
            <Icon name='right' />
          </div>
          <div
            className={cls([
              'px-4 py-3 flex items-center gap-3 border-b border-[#e4e4e7] last:border-b-0 transition-colors cursor-pointer',
              !isMobile && 'hover:bg-gray-50',
            ])}
            onClick={() => {
              if (!hasBindPhone) {
                setBindPhoneShow(true);
              } else {
                setChangePhoneDialog(true);
              }
            }}
          >
            <div className='flex-1'>
              <div
                className={cls([
                  'font-semibold text-[#09090b]',
                  isMobile ? 'text-sm leading-5' : 'text-base leading-6',
                ])}
              >
                绑定手机
              </div>
            </div>
            <span
              className={cls([
                'border border-[#e4e4e7] rounded-full h-[22px] px-2 font-semibold text-xs leading-[22px] text-center text-[#09090b]',
                !isMobile && 'h-6 px-3 text-sm leading-6',
              ])}
            >
              {hasBindPhone
                ? userProfile?.auths?.phone?.loginid
                  ? maskPhoneNumber(userProfile?.auths?.phone?.loginid)
                  : ' 已绑定'
                : '未绑定'}
            </span>
            <Icon name='right' />
          </div>
          <div
            className={cls([
              'px-4 py-3 flex items-center gap-3 border-b border-[#e4e4e7] last:border-b-0 transition-colors cursor-pointer',
              !isMobile && 'hover:bg-gray-50',
            ])}
            onClick={() => setKefuDialog(true)}
          >
            <div className='flex-1'>
              <div
                className={cls([
                  'font-semibold text-[#09090b]',
                  isMobile ? 'text-sm leading-5' : 'text-base leading-6',
                ])}
              >
                解除第三方账号
              </div>
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
      <ResponsiveDialog
        isOpen={changePhoneDialog}
        onOpenChange={setChangePhoneDialog}
        title='更换手机'
        contentProps={{
          className: isMobile ? '' : 'max-w-2xl',
        }}
      >
        <ChangePhone
          onSuccess={() => {
            onCheckBindPhone();
          }}
          onClose={() => setChangePhoneDialog(false)}
        />
      </ResponsiveDialog>
    </div>
  );
};

export default observer(AccountSetting);

'use client';
import { ResponsiveDialog } from '@/components/Drawer';
import { useStore } from '@/store';
import { observer } from 'mobx-react';

import MakaVip from '@/app/maka/mobile/vip-popup';

const VipModal = () => {
  const { vipShow, setVipShow } = useStore();

  return (
    <>
      <ResponsiveDialog
        isOpen={vipShow}
        handleOnly
        contentProps={{
          className: 'rounded-t-xl',
          style: {
            willChange: 'auto',
          },
        }}
        onOpenChange={value => {
          setVipShow(value);
        }}
      >
        <MakaVip />
      </ResponsiveDialog>
    </>
  );
};

export default observer(VipModal);

'use client';
import { useStore } from '@/store';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { observer } from 'mobx-react';

import MakaVip from './MakaVipPop';
import VipModalForMakaPc from './VipModalForMakaPc';

const VipModalForMobile = () => {
  const { vipShow, setVipShow, environment } = useStore();

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
        {environment.isMobile ? <MakaVip /> : <VipModalForMakaPc />}
      </ResponsiveDialog>
    </>
  );
};

export default observer(VipModalForMobile);

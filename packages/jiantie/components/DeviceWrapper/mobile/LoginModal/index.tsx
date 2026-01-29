'use client';
import Login from '@/app/mobile/login/components/main';
import { useStore } from '@/store';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { observer } from 'mobx-react';

const VipModal = () => {
  const { loginShow, setLoginShow } = useStore();
  return (
    <ResponsiveDialog
      isOpen={loginShow}
      onOpenChange={setLoginShow}
      contentProps={{
        onPointerDownOutside: (e: any) => {
          e.preventDefault();
        },
      }}
    >
      <Login />
    </ResponsiveDialog>
  );
};

export default observer(VipModal);

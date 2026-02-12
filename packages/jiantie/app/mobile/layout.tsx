import { UserInfoLoader } from '@/components/DeviceWrapper/UserInfoLoader';
import BindPhoneModal from '@/components/DeviceWrapper/mobile/BindPhoneModal';
import LoginModal from '@/components/DeviceWrapper/mobile/LoginModal';
import VipModalForJiantie from '@/components/DeviceWrapper/mobile/VipModalForJiantie';
import DesignerTool from '../../components/DesignerTool';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <UserInfoLoader />
      <VipModalForJiantie />
      <LoginModal></LoginModal>
      <BindPhoneModal></BindPhoneModal>
      <div className='h-dvh overflow-y-auto'>{children}</div>
      <DesignerTool />
    </>
  );
}

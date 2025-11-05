import { UserInfoLoader } from '@/components/DeviceWrapper/UserInfoLoader';
import BindPhoneModal from '@/components/DeviceWrapper/mobile/BindPhoneModal';
import LoginModal from '@/components/DeviceWrapper/mobile/LoginModal';
import VipModal from '@/components/DeviceWrapper/mobile/VipModal';
import WebProMonitor from '@/components/webProMonitor';
import DesignerTool from '../designer-tool';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <WebProMonitor />
      <UserInfoLoader />
      <VipModal></VipModal>
      <LoginModal></LoginModal>
      <BindPhoneModal></BindPhoneModal>
      <div className='md:max-w-[375px] mx-auto h-dvh overflow-y-auto'>
        {children}
      </div>
      <DesignerTool />
    </>
  );
}

import BindPhoneModal from '@/components/DeviceWrapper/mobile/BindPhoneModal';
import LoginModal from '@/components/DeviceWrapper/mobile/LoginModal';
import VipModal from '@/components/DeviceWrapper/mobile/VipModal';
import { UserInfoLoader } from '@/components/DeviceWrapper/UserInfoLoader';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <UserInfoLoader />
      <VipModal></VipModal>
      <LoginModal></LoginModal>
      <BindPhoneModal></BindPhoneModal>
      {children}
    </>
  );
}

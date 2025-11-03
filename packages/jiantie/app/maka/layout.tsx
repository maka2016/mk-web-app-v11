import BindPhoneModal from '@/components/DeviceWrapper/mobile/BindPhoneModal';
import LoginModal from '@/components/DeviceWrapper/mobile/LoginModal';
import MakaVipModal from '@/components/DeviceWrapper/mobile/MakaVipModal';
import { UserInfoLoader } from '@/components/DeviceWrapper/UserInfoLoader';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <UserInfoLoader />
      <MakaVipModal></MakaVipModal>
      <LoginModal></LoginModal>
      <BindPhoneModal></BindPhoneModal>
      <div className='md:max-w-[375px] mx-auto h-dvh overflow-y-auto'>
        {children}
      </div>
    </>
  );
}

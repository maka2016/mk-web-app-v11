import { UserInfoLoader } from '@/components/DeviceWrapper/UserInfoLoader';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <UserInfoLoader />

      {children}
    </>
  );
}

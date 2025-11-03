import { ConfigProvider } from 'antd';
import SideNavBar from './components/PC/SideNavBar';
import styles from './index.module.scss';
import { Button } from '@workspace/ui/components/button';
import Header from './components/header';
import LoginModal from '@/components/DeviceWrapper/mobile/LoginModal';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // const isMobile = await isMobileDevice();
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: 'rgba(21, 94, 239, 1)',
        },
        components: {
          Button: {
            paddingInline: 11,
            primaryShadow: 'none',
            dangerShadow: 'none',
            defaultShadow: 'none',
          },
        },
      }}
    >
      <Header />
      <div className={`${styles.layout} flex justify-center items-center`}>
        <div className={`${styles.container} flex-grow flex`}>
          <div
            className={`flex-initial flex-shrink-0 overflow-y-auto ${styles.leftContainer}`}
          >
            <SideNavBar />
          </div>
          <div className={`flex-1 overflow-y-auto`}>{children}</div>
        </div>
      </div>
      <LoginModal></LoginModal>
    </ConfigProvider>
  );
}

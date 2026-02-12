import LoginModal from '@/components/DeviceWrapper/mobile/LoginModal';
import Header from './components/header';
import SideNavBar from './components/PC/SideNavBar';
import styles from './index.module.scss';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <div className={styles.layout}>
        <div className={styles.container}>
          <div className={styles.leftContainer}>
            <SideNavBar />
          </div>
          <div className={styles.rightContainer}>{children}</div>
        </div>
      </div>
      <LoginModal></LoginModal>
    </>
  );
}

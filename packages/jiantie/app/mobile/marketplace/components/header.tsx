'use client';
import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import APPBridge from '@mk/app-bridge';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const Header = (props: {
  title: string;
  pre_works_id?: string;
  rightText?: string;
  worksDetail: any;
  id: string;
}) => {
  const { pre_works_id, rightText, worksDetail, id, title } = props;
  const router = useRouter();

  useEffect(() => {
    document.body?.style.setProperty('--preview-header-height', '44px');
    return () => {
      document.body?.style.setProperty('--preview-header-height', '0px');
    };
  }, []);

  return (
    <MobileHeader
      title={title}
      style={{
        zIndex: 9999,
        flexShrink: 0,
      }}
      rightText={rightText ? rightText : pre_works_id ? '回首页' : ''}
      onRightClick={() => {
        if (!pre_works_id) {
          return;
        }
        if (APPBridge.judgeIsInApp()) {
          APPBridge.navToPage({
            url: 'maka://home/activity/activityPage',
            type: 'NATIVE',
          });
        } else {
          router.push('/mobile/home');
        }
      }}
      isWebPage={!!pre_works_id}
      rightContent={''}
    />
  );
};

export default Header;

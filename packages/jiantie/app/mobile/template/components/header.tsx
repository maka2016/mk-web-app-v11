'use client';
import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import { useEffect } from 'react';
import CreateBtn from './createBtn';

const Header = (props: {
  rightText?: string;
  worksDetail: any;
  id: string;
}) => {
  const { rightText, worksDetail, id } = props;
  useEffect(() => {
    document.body?.style.setProperty('--preview-header-height', '44px');
    return () => {
      document.body?.style.setProperty('--preview-header-height', '0px');
    };
  }, []);

  return (
    <MobileHeader
      title={''}
      style={{
        zIndex: 9999,
        flexShrink: 0,
      }}
      rightText={rightText || ''}
      rightContent={<CreateBtn templateDetail={worksDetail} templateId={id} />}
    />
  );
};

export default Header;

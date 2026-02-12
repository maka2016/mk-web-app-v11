'use client';
import MobileHeader from '@/components/DeviceWrapper/mobile/Header';

const Header = (props: {
  rightText?: string;
  worksDetail: any;
  id: string;
}) => {
  const { rightText, worksDetail, id } = props;

  return (
    <MobileHeader
      title={worksDetail?.title || ''}
      style={{
        zIndex: 9999,
        flexShrink: 0,
      }}
      // rightText={rightText || ''}
      // rightContent={<CreateBtn templateDetail={worksDetail} templateId={id} />}
    />
  );
};

export default Header;

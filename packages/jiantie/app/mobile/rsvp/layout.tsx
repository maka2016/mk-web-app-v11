'use client';
import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import APPBridge from '@mk/app-bridge';
import { useRouter } from 'next/navigation';
import { RSVPLayoutProvider, useRSVPLayout } from './RSVPLayoutContext';

interface RSVPLayoutProps {
  children: React.ReactNode;
}

function RSVPLayoutContent({ children }: RSVPLayoutProps) {
  const router = useRouter();
  const { title } = useRSVPLayout();

  // 统一返回逻辑
  const handleBack = () => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navAppBack();
    } else {
      router.back();
    }
  };

  return (
    <div className='relative bg-gray-50 min-h-screen flex flex-col'>
      <MobileHeader title={title} rightText='' onClose={handleBack} />
      <div className='flex-1 overflow-y-auto'>{children}</div>
    </div>
  );
}

export default function RSVPLayout({ children }: RSVPLayoutProps) {
  return (
    <RSVPLayoutProvider>
      <RSVPLayoutContent>{children}</RSVPLayoutContent>
    </RSVPLayoutProvider>
  );
}

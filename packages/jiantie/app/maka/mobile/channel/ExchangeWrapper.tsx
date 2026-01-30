'use client';

import { BehaviorBox } from '@/components/BehaviorTracker';
import { useStore } from '@/store';
import { cn } from '@workspace/ui/lib/utils';
import { useState } from 'react';

interface Props {
  activeTab: 'classic' | '2026';
  onTabChange: (tab: 'classic' | '2026') => void;
}

export default function ExchangeWrapper(props: Props) {
  const { activeTab, onTabChange } = props;
  const store = useStore();
  const [backDoorCount, setBackDoorCount] = useState(0);
  // const router = useRouter();

  const handleTabChange = (tab: 'classic' | '2026') => {
    onTabChange(tab);
    // router.push(`/maka/mobile/channel2?tab=${tab}`);
  };

  return (
    <div className='flex items-center p-0.5 m-3 mb-1 gap-3 rounded-md relative z-[2] bg-white/60'>
      {['classic', '2026'].map(tab => (
        <BehaviorBox
          key={tab}
          behavior={{
            object_type: 'exchange_version_2026_btn',
            object_id: tab,
          }}
          className={cn(
            'flex-1 flex items-center justify-center rounded-md backdrop-blur-sm text-sm font-medium text-black/60 cursor-pointer py-2 px-3 text-black/88',
            activeTab === tab && 'text-black/88 bg-white'
          )}
          onClick={() => {
            handleTabChange(tab as 'classic' | '2026');
            if (tab !== activeTab) {
              setBackDoorCount(0);
              return;
            }
            if (backDoorCount >= 6) {
              store.replace(
                'https://staging-jiantie-web.maka.im/maka/mobile/home'
              );
              setBackDoorCount(0);
            } else {
              setBackDoorCount(backDoorCount + 1);
            }
          }}
        >
          {tab === 'classic' ? '经典旧版' : '2026新版'}
        </BehaviorBox>
      ))}
    </div>
  );
}

'use client';

import { DataView } from '@/components/DataView';
import MobileHeader from '@/components/DeviceWrapper/mobile/Header';

interface Props {
  worksId: string;
}

export default function DataViewPage({ worksId }: Props) {
  if (!worksId) {
    return (
      <div className='flex flex-col h-screen'>
        <MobileHeader title='数据统计' />
        <div className='flex-1 flex items-center justify-center text-slate-500'>
          缺少作品ID参数
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col h-screen bg-white'>
      <MobileHeader title='数据统计' />
      <div className='flex-1 overflow-auto'>
        <DataView worksId={worksId} />
      </div>
    </div>
  );
}

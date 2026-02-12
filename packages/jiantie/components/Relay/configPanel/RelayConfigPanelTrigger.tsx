'use client';

import { BtnLite } from '@/components/GridEditorV3/components/style-comps';
import { useWorksStore } from '@/components/GridEditorV3/works-store/store/hook';
import { Settings } from 'lucide-react';
import { useState } from 'react';
import RelayConfigPanel from './index';

export default function RelayConfigPanelTrigger() {
  const worksStore = useWorksStore();
  const { worksDetail } = worksStore;
  const [open, setOpen] = useState(false);

  if (!worksDetail?.id) {
    return null;
  }

  return (
    <>
      <BtnLite
        title='接力设置'
        onClick={() => {
          setOpen(true);
        }}
      >
        <Settings size={16} />
        <span>接力设置</span>
      </BtnLite>

      <RelayConfigPanel
        worksId={worksDetail.id}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

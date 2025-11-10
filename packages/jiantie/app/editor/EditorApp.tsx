'use client';
import { getToken, getUid } from '@/services';
import { WorksStore } from '@mk/works-store/store';
import { useEffect, useState } from 'react';
import MobileEditor from './mobile2/main';

import { createWorksStore, initWidgetEnv } from '@/services/worksStoreHelper';
import CommonLogger from '@mk/loggerv7/logger';
import { getWorksDetailStatic } from '@mk/services';
import { Loading } from '@workspace/ui/components/loading';
import { observer, Provider } from 'mobx-react';
import { useSearchParams } from 'next/navigation';
import { setStore } from './useStore';

const EditorApp = () => {
  const searchParams = useSearchParams();
  const worksId = searchParams.get('works_id');
  const [worksStore, setWorksStore] = useState<WorksStore>();

  const worksDetail = getWorksDetailStatic();

  useEffect(() => {
    sessionStorage.setItem('editor_uid', getUid());
    sessionStorage.setItem('editor_token', getToken());
  }, []);

  useEffect(() => {
    const initWorksData = async () => {
      await initWidgetEnv();
      const _worksStore = createWorksStore({
        worksId: () => worksId as string,
        autoSaveFreq: 2,
      });
      await _worksStore.prepareData();
      setStore(_worksStore);
      setWorksStore(_worksStore);
    };
    if (worksId) {
      initWorksData();
    }

    return () => {};
  }, [worksId]);

  useEffect(() => {
    if (worksDetail) {
      CommonLogger.track_pageview({
        page_type: 'editor_page',
        page_id: worksId,
        ref_object_id: worksDetail.template_id,
      });
    }
  }, [worksDetail]);

  if (!worksStore || !worksId) {
    return (
      <div className='flex items-center justify-center p-4'>
        <Loading />
      </div>
    );
  }

  return (
    <Provider worksStore={worksStore}>
      <div className='h-dvh root_editor_container overflow-hidden md:m-auto md:max-w-[375px]'>
        <MobileEditor worksId={worksId} onCreate={() => {}} />
      </div>
    </Provider>
  );
};

export default observer(EditorApp);

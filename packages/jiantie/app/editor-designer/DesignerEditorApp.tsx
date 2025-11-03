'use client';
import React, { useEffect, useRef, useState } from 'react';
import { getUid, getToken } from '@/services';
import { WorksStore } from '@mk/works-store/store';
import { useRouter, useSearchParams } from 'next/navigation';
import { observer, Provider } from 'mobx-react';
import { Loading } from '@workspace/ui/components/loading';
import { isAndroid, isPc } from '@mk/utils';
import { createWorksStore, initWidgetEnv } from '@/services/worksStoreHelper';
import { setStore, useWorksStore } from '../editor/useStore';
import CanvasAutoLayout from '../editor/SimpleEditor/CanvasAutoLayout';
import toast from 'react-hot-toast';

const EditorApp = () => {
  const searchParams = useSearchParams();
  const worksId = searchParams.get('works_id');
  const isTemplate = searchParams.get('is_template') === 'true';
  const [worksStore, setWorksStore] = useState<WorksStore>();

  useEffect(() => {
    sessionStorage.setItem('editor_uid', getUid());
    sessionStorage.setItem('editor_token', getToken());
  }, []);

  useEffect(() => {
    const initWorksData = async () => {
      await initWidgetEnv();
      const worksStore = createWorksStore({
        worksId: () => worksId as string,
        autoSaveFreq: isTemplate ? -1 : 2,
        appMode: isPc() ? 'editor-web' : 'editor-wap',
        isTemplate,
      });
      try {
        await worksStore.prepareData();
        setStore(worksStore);
        setWorksStore(worksStore);
      } catch (err: any) {
        toast.error(err.message);
      }
    };
    if (worksId) {
      initWorksData();
    }

    return () => {};
  }, [worksId]);

  if (!worksStore || !worksId) {
    return (
      <div className='flex items-center justify-center p-4'>
        <Loading />
      </div>
    );
  }

  return (
    <Provider worksStore={worksStore}>
      <div
        className='h-dvh root_editor_container flex flex-col'
        id='designer_canvas_container_layout'
      >
        <CanvasAutoLayout readonly={false} />
      </div>
    </Provider>
  );
};

export default observer(EditorApp);

'use client';
import { setStore } from '@/app/editor/useStore';
import WebsiteApp from '@/components/viewer/components/website';
import { createWorksStore, getToken, getUid, initWidgetEnv } from '@/services';
import { getAppId, getWorksDetailStatic } from '@mk/services';
import { WorksStore } from '@mk/works-store/store';
import { useEffect, useState } from 'react';

import MiniPShare from '@/components/MiniPShare';
import APPBridge from '@mk/app-bridge';
import PreviewHeader from './header';

interface Props {
  worksId: string;
  query: any;
}

const Preview = (props: Props) => {
  const { worksId, query } = props;
  const [worksStore, setWorksStore] = useState<WorksStore>();
  const worksDetail = getWorksDetailStatic();

  const appid = getAppId();

  useEffect(() => {
    sessionStorage.setItem('editor_uid', getUid());
    sessionStorage.setItem('editor_token', getToken());

    document.body?.style.setProperty('--preview-header-height', '44px');
    return () => {
      document.body?.style.setProperty('--preview-header-height', '0px');
    };
  }, []);

  useEffect(() => {
    const initWorksData = async () => {
      await initWidgetEnv();
      const worksStore = createWorksStore({
        worksId: () => worksId as string,
        autoSaveFreq: 2,
      });
      await worksStore.prepareData();
      setStore(worksStore);
      setWorksStore(worksStore);
    };
    if (worksId) {
      initWorksData();
    }

    return () => {};
  }, [worksId]);

  if (!worksStore) {
    return <></>;
  }

  return (
    <>
      <PreviewHeader
        worksId={worksId}
        worksStore={worksStore}
        workDetail={worksDetail}
      />
      {APPBridge.judgeIsInMiniP() && (
        <MiniPShare
          title={worksDetail.title}
          imageUrl={worksDetail.cover}
          path={`/pages/viewer/index?url=${encodeURIComponent(
            `${location.origin}/viewer2/${worksId}?appid=${appid}`
          )}`}
        />
      )}

      <WebsiteApp
        userAgent={''}
        worksData={worksStore.worksData}
        worksDetail={worksStore.worksDetail}
        query={query}
        pathname={''}
      />
    </>
  );
};

export default Preview;

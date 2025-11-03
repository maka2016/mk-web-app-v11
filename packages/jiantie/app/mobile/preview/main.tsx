'use client';
import { createWorksStore, getToken, getUid, initWidgetEnv } from '@/services';
import { useEffect, useRef, useState } from 'react';
import { WorksStore } from '@mk/works-store/store';
import WebsiteApp from '@mk/viewer/components/website';
import { toJS } from 'mobx';
import { getAppId, getWorksDetailStatic } from '@mk/services';
import { setStore } from '@/app/editor/useStore';

import PreviewHeader from './header';
import MiniPShare from '@/components/MiniPShare';
import APPBridge from '@mk/app-bridge';

interface ToolItem {
  name: string;
  elementRef: string;
  disabledSetting?: boolean;
  icon: string;
  activeIcon: string;
  type?: string;
}

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
        appMode: 'editor-wap',
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
        widgetRely={worksStore.widgetRely}
        userAgent={''}
        worksData={worksStore.worksData}
        worksDetail={worksStore.worksDetail}
        websiteControl={{
          isTempLink: false,
          isExpire: false,
        }}
        onViewerLoaded={() => {}}
        query={query}
        pathname={''}
        widgetMetadatas={Object.values(
          toJS(worksStore.widgetMetadataColl || {})
        )}
      />
    </>
  );
};

export default Preview;

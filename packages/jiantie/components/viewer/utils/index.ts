'use client';

import { AppContext } from '@/components/viewer/types';
import { WorksDetailEntity, setWorksDetail } from '@mk/services';
import { IWorksData } from '@mk/works-store/types';
import { useEffect, useState } from 'react';
import { registerEnv } from './runtime-env';
import { createViewerSDKCTXer } from './viewerSDK';
import { setWidgetMetaColl } from './widget-metadata';

export const useWorksData = (params: {
  worksData: IWorksData;
  worksDetail: WorksDetailEntity;
  query: AppContext['query'];
  widgetMetadatas: any[];
}) => {
  const { worksData, worksDetail, query, widgetMetadatas } = params;
  const [worksDataRef, setWorksDataRef] = useState<IWorksData>(worksData);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const init = () => {
      const { worksId, backDoor } = query;
      registerEnv();
      setWorksDetail(worksDetail);

      let hasWorksWatermark = false;

      setWidgetMetaColl(widgetMetadatas);
      setWorksDetail(worksDetail);

      createViewerSDKCTXer({
        uid: worksDetail.uid?.toString() ?? '',
        worksId: params.query.worksId,
        worksData: worksData,
        worksTitle: worksDetail.title,
        hasWorksWatermark: hasWorksWatermark,
      });
      setWorksDataRef(worksData);
    };

    init();
  }, [
    worksData,
    worksDetail,
    query,
    widgetMetadatas,
    params.query.uid,
    params.query.worksId,
  ]);

  return worksDataRef;
};

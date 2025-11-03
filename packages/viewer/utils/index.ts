'use client';

import { setWorksDetail } from '@mk/services';
import { IWorksData } from '@mk/works-store/types';
import { useEffect, useState } from 'react';
import { IGetInitialPropsCommonAppRouter } from './getInitialPropsCommon2';
import { registerEnv } from './runtime-env';
import { createViewerSDKCTXer } from './viewerSDK';
import { setWidgetMetaColl } from './widget-metadata';

export const useWorksData = (params: IGetInitialPropsCommonAppRouter) => {
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
        uid: worksDetail.uid,
        worksId: params.query.worksId,
        worksData: worksData,
        worksType: 'h5',
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

import { getToken, getUid } from '@/services';
import { SerializedWorksEntity } from '@/utils';
import { Provider } from 'mobx-react';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { WorksStore, WorksStoreConfig } from '../works-store/store';
import { setWorksStore } from '../works-store/store/hook';
import { IWorksData } from '../works-store/types';

interface GridProviderProps {
  children: React.ReactNode | ((worksStore: WorksStore) => React.ReactNode);
  worksId: string;
  readonly: boolean;
  worksData?: IWorksData;
  worksDetail?: SerializedWorksEntity;
}

const createWorksStore = (config: Partial<WorksStoreConfig>) => {
  const {
    worksId,
    autoSaveFreq = 2,
    noSave = false,
    isTemplate = false,
    readonly = false,
    worksData,
    worksDetail,
  } = config;

  const worksStore = new WorksStore({
    worksId: worksId || (() => ''),
    readonly: readonly || false,
    autoSaveFreq,
    noSave: noSave,
    isTemplate,
    worksData,
    worksDetail,
  });
  setWorksStore(worksStore);
  return worksStore;
};

const useWorksStoreBase = ({
  worksId,
  readonly,
  worksData,
  worksDetail,
}: {
  worksId: string;
  readonly: boolean;
  worksData?: IWorksData;
  worksDetail?: SerializedWorksEntity;
}) => {
  const [worksStore, setWorksStore] = useState<WorksStore>();

  useEffect(() => {
    sessionStorage.setItem('editor_uid', getUid());
    sessionStorage.setItem('editor_token', getToken());
  }, []);

  useEffect(() => {
    const initWorksData = async () => {
      const isTemplate = /^T_/gi.test(worksId);
      const _worksStore = createWorksStore({
        readonly: readonly || false,
        worksData: worksData,
        worksDetail: worksDetail,
        worksId: () => worksId as string,
        autoSaveFreq: isTemplate ? -1 : 2,
        isTemplate,
      });
      await _worksStore.prepareData();
      setWorksStore(_worksStore);
    };
    if (worksId) {
      initWorksData();
    } else {
      toast.error('作品ID不能为空');
      return;
    }

    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worksId]);

  return worksStore;
};

export const WorksStoreProvider = ({
  children,
  ...other
}: GridProviderProps & {
  children: React.ReactNode;
}) => {
  const worksStore = useWorksStoreBase({
    worksId: other.worksId,
    readonly: other.readonly,
    worksData: other.worksData,
    worksDetail: other.worksDetail,
  });
  if (!worksStore) {
    return null;
  }

  Object.assign(window, {
    __worksDetail: worksStore.worksDetail,
  });

  return <Provider worksStore={worksStore}>{children}</Provider>;
};

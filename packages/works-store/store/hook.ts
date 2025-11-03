import { useLocalObservable } from 'mobx-react';
import { WorksStore } from './WorksStore';

let worksStore: WorksStore;

/**
 * Set the worksStore
 */
export const setWorksStore = (nextStore: WorksStore) => {
  worksStore = nextStore;
};

/**
 * mobx store hook
 */
export const useWorksStore = () => {
  if (!worksStore) {
    throw new Error('worksStore is not initialized, setWorksStore first');
  }
  const store = useLocalObservable(() => worksStore);
  return store;
};

export const getWidgetMeta = (elemRef?: string) => {
  return worksStore?.getWidgetMeta(elemRef) || null;
};

import { WorksStore, undoManager } from '@mk/works-store/store';
import { useLocalObservable } from 'mobx-react';

let worksStore: WorksStore;

export const setStore = (store: WorksStore) => {
  worksStore = store;

  // 在开发环境中导出到 window 对象，方便调试
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    (window as any).worksStore = worksStore;
    (window as any).undoManager = undoManager;
    console.info('🔧 开发模式：worksStore 和 undoManager 已导出到 window 对象');
    console.info('💡 可在控制台运行 window.undoManager.log() 查看撤销重做状态');
  }
};

export const getStore = () => worksStore;

/**
 */
export const useWorksStore = () => {
  if (!worksStore) {
    throw new Error('store not set');
  }
  const store = useLocalObservable(() => worksStore) as WorksStore;
  return store;
};

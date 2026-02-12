import { useLocalObservable } from 'mobx-react';
import { WorksStore } from './WorksStore';

let worksStore: WorksStore;

/**
 * Set the worksStore
 */
export const setWorksStore = (nextStore: WorksStore) => {
  worksStore = nextStore;

  // 在开发环境中导出到 window 对象，方便调试
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    (window as any).worksStore = worksStore;
    // 通过 worksStore 访问 undoManager（用于调试）
    (window as any).undoManager = (worksStore as any).undoManager;
    console.info('🔧 开发模式：worksStore 和 undoManager 已导出到 window 对象');
    console.info('💡 可在控制台运行 window.undoManager.log() 查看撤销重做状态');
  }
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

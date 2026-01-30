'use client';

import {
  ResponsiveDialog,
  ResponsiveDialogProps,
} from '@workspace/ui/components/responsive-dialog';
import React, { createContext, ReactNode, useContext, useState } from 'react';

export type ModalID = string | number;

export interface ShowModalParams extends ResponsiveDialogProps {
  id?: any;
}

interface ModalsState {
  [key: string]: ResponsiveDialogProps;
}

interface ModalsContextValue {
  show: (id: ModalID, options: Partial<ResponsiveDialogProps>) => void;
  set: (id: ModalID, options: Partial<ResponsiveDialogProps>) => void;
  close: (id: ModalID) => void;
  closeAll: () => void;
  getOpenModalIds: () => ModalID[];
  getAllModalIds: () => ModalID[];
}

const ModalsContext = createContext<ModalsContextValue | null>(null);

/**
 * ModalsProvider - 提供全局 Modal 管理的 Context
 */
export function ModalsProvider({ children }: { children: ReactNode }) {
  const [modals, setModals] = useState<ModalsState>({});

  const show = (id: ModalID, options: Partial<ResponsiveDialogProps>) => {
    setModals(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...options,
        isOpen: true,
      } as ResponsiveDialogProps,
    }));
  };

  const set = (id: ModalID, options: Partial<ResponsiveDialogProps>) => {
    setModals(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...options,
      } as ResponsiveDialogProps,
    }));
  };

  const close = (id: ModalID) => {
    setModals(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        isOpen: false,
      } as ResponsiveDialogProps,
    }));
  };

  const closeAll = () => {
    setModals(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(id => {
        updated[id] = {
          ...updated[id],
          isOpen: false,
        } as ResponsiveDialogProps;
      });
      return updated;
    });
  };

  const getOpenModalIds = (): ModalID[] => {
    return Object.keys(modals).filter(id => modals[id]?.isOpen);
  };

  const getAllModalIds = (): ModalID[] => {
    return Object.keys(modals);
  };

  const contextValue: ModalsContextValue = {
    show,
    set,
    close,
    closeAll,
    getOpenModalIds,
    getAllModalIds,
  };

  return (
    <ModalsContext.Provider value={contextValue}>
      {children}
      {Object.keys(modals).map(id => (
        <ResponsiveDialog
          key={id}
          {...modals[id]}
          onOpenChange={nextOpen => {
            if (!nextOpen) {
              close(id);
            } else {
              set(id, { isOpen: true });
            }
            modals[id]?.onOpenChange?.(nextOpen);
          }}
        >
          {modals[id]?.children}
        </ResponsiveDialog>
      ))}
    </ModalsContext.Provider>
  );
}

/**
 * useModals - 获取 Modal 管理方法的 Hook
 */
export function useModals() {
  const context = useContext(ModalsContext);
  if (!context) {
    throw new Error('useModals must be used within ModalsProvider');
  }
  return context;
}

/**
 * 生成唯一 ID
 */
const GenerateID = () => String(Date.now());

/**
 * ShowDrawerV2 - 显示全局 Modal（命令式 API）
 *
 * 注意：此函数需要在 ModalsProvider 内部使用。
 * 如果在 Provider 外部调用，将会抛出错误。
 */
export function ShowDrawerV2(params: Partial<ShowModalParams>) {
  const options = { ...params } as ShowModalParams;
  const { id } = options;

  const entityId = (id || GenerateID()) as ModalID;
  options.id = entityId;

  // 从 window 上获取全局的 modals context（通过 ref 设置）
  const modalsContext = (window as any).__modalsContext as ModalsContextValue;

  if (!modalsContext) {
    console.error(
      'ShowDrawerV2: ModalsProvider not found. Please wrap your app with ModalsProvider.'
    );
    return;
  }

  modalsContext.show(entityId, {
    ...options,
    isOpen: true,
  });
}

/**
 * CloseDrawer - 关闭指定 Modal
 */
export function CloseDrawer(id: ModalID) {
  const modalsContext = (window as any).__modalsContext as ModalsContextValue;

  if (!modalsContext) {
    console.error(
      'CloseDrawer: ModalsProvider not found. Please wrap your app with ModalsProvider.'
    );
    return;
  }

  modalsContext.close(id);
}

/**
 * CloseAllModals - 关闭所有 Modal
 */
export function CloseAllModals() {
  const modalsContext = (window as any).__modalsContext as ModalsContextValue;

  if (!modalsContext) {
    console.error(
      'CloseAllModals: ModalsProvider not found. Please wrap your app with ModalsProvider.'
    );
    return;
  }

  modalsContext.closeAll();
}

/**
 * GetOpenModalIds - 获取所有打开的 Modal ID
 */
export function GetOpenModalIds(): ModalID[] {
  const modalsContext = (window as any).__modalsContext as ModalsContextValue;

  if (!modalsContext) {
    console.error(
      'GetOpenModalIds: ModalsProvider not found. Please wrap your app with ModalsProvider.'
    );
    return [];
  }

  return modalsContext.getOpenModalIds();
}

/**
 * ModalsProviderWithGlobal - 带全局访问能力的 Provider
 *
 * 这个组件会将 context 方法暴露到 window 对象上，
 * 以支持命令式 API（ShowDrawerV2 和 CloseDrawer）
 */
export function ModalsProviderWithGlobal({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ModalsProvider>
      <GlobalContextBridge />
      {children}
    </ModalsProvider>
  );
}

/**
 * GlobalContextBridge - 桥接 Context 到全局对象
 */
function GlobalContextBridge() {
  const modalsContext = useModals();

  React.useEffect(() => {
    (window as any).__modalsContext = modalsContext;

    return () => {
      delete (window as any).__modalsContext;
    };
  }, [modalsContext]);

  return null;
}

'use client';

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog';
import { Drawer, DrawerContent } from '@workspace/ui/components/drawer';
import { Icon } from '@workspace/ui/components/Icon';
import VaulDrawer from '@workspace/ui/components/side-drawer';
import { cn } from '@workspace/ui/lib/utils';
import React, { useEffect, useRef } from 'react';
import useIsMobile from '../hooks/use-mobile';

export interface ResponsiveDialogProps {
  fullHeight?: boolean;
  title?: string;
  description?: string;
  triggerText?: string;
  direction?: 'left' | 'right';
  children:
    | React.ReactNode
    | ((params: { close: () => void }) => React.ReactNode);
  isOpen?: boolean;
  contentProps?: React.ComponentProps<typeof DialogContent>;
  onOpenChange?: (isOpen: boolean) => void;
  showCloseIcon?: boolean;
  isDialog?: boolean;
  handleOnly?: boolean;
  showOverlay?: boolean;
  showHandler?: boolean;
  overlayClassName?: string;
  className?: string;
  dismissible?: boolean;
  disableBackNavigation?: boolean;
}

const randomId = () => {
  return Math.random().toString(36).substring(2, 15);
};

// 全局弹窗状态管理器，用于处理多个弹窗的 history 状态
class DialogHistoryManager {
  private openDialogs = new Map<
    string,
    { stateKey: string; onClose: () => void }
  >();
  private lastStateSnapshot: Record<string, any> = {}; // 保存最后一次 pushState 时的状态快照

  // 注册打开的弹窗
  register(stateKey: string, onClose: () => void): string {
    const id = stateKey;
    this.openDialogs.set(id, { stateKey, onClose });
    this.updateHistoryState();
    return id;
  }

  // 注销弹窗
  unregister(stateKey: string) {
    this.openDialogs.delete(stateKey);
    // 如果还有其他弹窗打开，更新 state；否则清理
    if (this.openDialogs.size > 0) {
      this.updateHistoryState();
    } else {
      // 没有弹窗了，清理 history state
      this.cleanupAll();
    }
  }

  // 更新 history state，合并所有打开的弹窗状态
  private updateHistoryState() {
    const currentState = window.history.state || {};
    const dialogStates: Record<string, boolean> = {};

    // 收集所有打开的弹窗状态
    this.openDialogs.forEach(({ stateKey }) => {
      dialogStates[stateKey] = true;
    });

    // 合并到当前 state 中
    const newState = {
      ...currentState,
      ...dialogStates,
    };

    // 保存状态快照，用于后续 popstate 比较
    this.lastStateSnapshot = { ...newState };

    // 如果当前 state 中已经有弹窗相关的 key，需要更新
    // 否则 push 新的 state
    const hasDialogState = Object.keys(currentState).some(key =>
      key.startsWith('dialog-state-')
    );

    if (hasDialogState) {
      // 替换当前 state
      window.history.replaceState(newState, '', window.location.href);
    } else {
      // push 新的 state
      window.history.pushState(newState, '', window.location.href);
    }
  }

  // 处理 popstate 事件
  handlePopState(event: PopStateEvent) {
    const newState = event.state || {};
    const previousState = this.lastStateSnapshot;

    // 找出哪些弹窗的 state 被移除了
    this.openDialogs.forEach(({ stateKey, onClose }) => {
      const wasInPreviousState = previousState[stateKey] === true;
      const isInNewState = newState[stateKey] === true;

      // 如果之前在 state 中，现在不在 state 中了，说明这个弹窗的 state 被弹出了
      if (wasInPreviousState && !isInNewState) {
        onClose();
      }
    });

    // 更新状态快照
    this.lastStateSnapshot = { ...newState };
  }

  // 清理：移除所有弹窗的 state
  private cleanupAll() {
    const currentState = window.history.state || {};
    const hasDialogState = Object.keys(currentState).some(key =>
      key.startsWith('dialog-state-')
    );

    if (hasDialogState) {
      // 移除所有 dialog-state- 开头的 key
      const newState = { ...currentState };
      Object.keys(newState).forEach(key => {
        if (key.startsWith('dialog-state-')) {
          delete newState[key];
        }
      });
      window.history.replaceState(newState, '', window.location.href);
      this.lastStateSnapshot = { ...newState };
    }
  }

  // 清理：移除指定弹窗的 state（已废弃，使用 cleanupAll）
  cleanup(stateKey: string) {
    // 这个方法保留是为了兼容，但实际不再需要单独清理
    // 因为 unregister 会统一处理
  }
}

const dialogHistoryManager = new DialogHistoryManager();

// 全局 popstate 监听器（只注册一次）
let popStateListenerAttached = false;
if (typeof window !== 'undefined' && !popStateListenerAttached) {
  window.addEventListener('popstate', event => {
    dialogHistoryManager.handlePopState(event);
  });
  popStateListenerAttached = true;
}

export function ResponsiveDialog({
  title,
  description,
  triggerText,
  direction,
  children,
  fullHeight = false,
  isOpen = false,
  dismissible = true,
  contentProps = {},
  onOpenChange,
  showCloseIcon = true,
  isDialog,
  handleOnly = false,
  showHandler = false,
  showOverlay = true,
  overlayClassName,
  className,
  disableBackNavigation = false,
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile();
  const historyStateKeyRef = useRef<string>(`dialog-state-${randomId()}`);
  // 使用 ref 保存最新的 onOpenChange，避免 effect 依赖导致无限循环
  const onOpenChangeRef = useRef(onOpenChange);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  // 拦截返回键（浏览器和安卓返回键）
  useEffect(() => {
    if (!isOpen || disableBackNavigation) return;

    const stateKey = historyStateKeyRef.current;

    // 注册弹窗到全局管理器
    dialogHistoryManager.register(stateKey, () => {
      // 当这个弹窗的 state 被弹出时，关闭弹窗
      if (onOpenChangeRef.current) {
        onOpenChangeRef.current(false);
      }
    });

    return () => {
      // 清理：从全局管理器中注销（会自动清理 history state）
      dialogHistoryManager.unregister(stateKey);
    };
  }, [isOpen, disableBackNavigation]);

  if (direction) {
    return (
      <VaulDrawer
        showCloseIcon={showCloseIcon}
        title={title}
        description={description}
        contentProps={contentProps}
        trigger={triggerText}
        direction={direction}
        isOpen={isOpen}
        showOverlay={showOverlay}
        onOpenChange={onOpenChange}
        dismissible={dismissible}
      >
        {typeof children === 'function'
          ? children({ close: () => onOpenChange?.(false) })
          : children}
      </VaulDrawer>
    );
  }
  const _isDialog = typeof isDialog === 'undefined' ? !isMobile : !!isDialog;
  if (_isDialog) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent
          {...contentProps}
          className={cn(
            contentProps.className,
            fullHeight && 'h-screen overflow-hidden rounded-none'
          )}
        >
          {title && (
            <DialogHeader className='p-4 border-b border-b-slate-200 max-h-[56px]'>
              <DialogTitle>{title}</DialogTitle>
              {showCloseIcon && (
                <Icon
                  name='close'
                  size={24}
                  className='absolute right-4 top-2 cursor-pointer'
                  color='#A5A6A7'
                  onClick={() => onOpenChange?.(false)}
                />
              )}
            </DialogHeader>
          )}
          <VisuallyHidden>
            <DialogTitle>{title}</DialogTitle>
          </VisuallyHidden>
          {typeof children === 'function'
            ? children({ close: () => onOpenChange?.(false) })
            : children}
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Drawer
      open={isOpen}
      onOpenChange={onOpenChange}
      handleOnly={handleOnly}
      dismissible={dismissible}
      repositionInputs={false}
    >
      <DrawerContent
        {...contentProps}
        className={cn(
          contentProps.className,
          className,
          fullHeight && 'h-screen overflow-hidden rounded-none'
        )}
        showHandler={showHandler}
        showOverlay={showOverlay}
        overlayClassName={overlayClassName}
      >
        {title ? (
          <DialogHeader className='py-4'>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
        ) : (
          <VisuallyHidden>
            <DialogTitle>{title}</DialogTitle>
          </VisuallyHidden>
        )}
        {title && showCloseIcon && (
          <Icon
            name='check'
            size={24}
            className='absolute right-4 top-[16px] cursor-pointer'
            color='#000'
            onClick={() => onOpenChange?.(false)}
          />
        )}
        {typeof children === 'function'
          ? children({ close: () => onOpenChange?.(false) })
          : children}
      </DrawerContent>
    </Drawer>
  );
}

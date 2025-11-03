'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@workspace/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@workspace/ui/components/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@workspace/ui/components/drawer';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Icon } from '@workspace/ui/components/Icon';
import { cn } from '@workspace/ui/lib/utils';
import VaulDrawer from '@workspace/ui/components/side-drawer';
import { random } from '@mk/utils';

export interface ResponsiveDialogProps {
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
}

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768); // 假设小于 768px 为移动设备
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  return isMobile;
};

export function ResponsiveDialog({
  title,
  description,
  triggerText,
  direction,
  children,
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
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile();
  const dialogIdRef = useRef<string>(`dialog-${random(10)}`);

  // DialogManager 相关逻辑
  useEffect(() => {
    const open = () => onOpenChange?.(true);
    const close = () => onOpenChange?.(false);
    // @ts-ignore
    import('../lib/dialog-manager').then(({ default: DialogManager }) => {
      DialogManager.register(dialogIdRef.current, {
        id: dialogIdRef.current,
        isOpen,
        open,
        close,
      });
      return () => DialogManager.unregister(dialogIdRef.current);
    });
  }, [isOpen, onOpenChange]);

  if (direction) {
    return (
      <VaulDrawer
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
        <DialogContent {...contentProps}>
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
        className={cn(contentProps.className, className)}
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

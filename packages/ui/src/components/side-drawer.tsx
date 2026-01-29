'use client';

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import clas from 'classnames';
import { X } from 'lucide-react';
import { Drawer } from 'vaul';

export default function VaulDrawer({
  children,
  title,
  description,
  trigger,
  contentProps,
  direction = 'right',
  isOpen = false,
  showCloseIcon = true,
  dismissible = true,
  onOpenChange,
  showOverlay = true,
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
  trigger?: React.ReactNode;
  contentProps?: React.ComponentProps<typeof Drawer.Content>;
  direction?: 'left' | 'right';
  isOpen?: boolean;
  showCloseIcon?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  dismissible?: boolean;
  showOverlay?: boolean;
}) {
  const { style, className, ...rest } = contentProps || {};
  return (
    <Drawer.Root
      direction={direction}
      open={isOpen}
      onOpenChange={onOpenChange}
      dismissible={dismissible}
    >
      {/* <Drawer.Trigger className="relative flex h-10 flex-shrink-0 items-center justify-center gap-2 overflow-hidden rounded-full bg-white px-4 text-sm font-medium shadow-sm transition-all hover:bg-[#FAFAFA] dark:bg-[#161615] dark:hover:bg-[#1A1A19] dark:text-white">
        {trigger}
      </Drawer.Trigger> */}
      <Drawer.Portal>
        {showOverlay && (
          <Drawer.Overlay className='fixed inset-0 bg-black/40 z-10' />
        )}
        <Drawer.Content
          className={clas(
            'top-0 bottom-0 fixed z-10 outline-none flex shadow-lg',
            direction === 'left' ? 'left-0' : 'right-0',
            className
          )}
          // The gap between the edge of the screen and the drawer is 8px in this case.
          style={
            {
              ...style,
              '--initial-transform': 'calc(100% + 8px)',
            } as React.CSSProperties
          }
          {...rest}
        >
          <div className='bg-zinc-50 h-full w-full grow flex flex-col'>
            {title ? (
              <div className='max-w-md mx-auto'>
                <Drawer.Title className='font-medium my-2 text-zinc-900'>
                  {title}
                </Drawer.Title>
                <Drawer.Description className='text-zinc-600 mb-2'>
                  {description}
                </Drawer.Description>
                {showCloseIcon && (
                  <X
                    className='absolute right-2 top-2 cursor-pointer'
                    size={24}
                    onClick={() => onOpenChange?.(false)}
                  />
                )}
              </div>
            ) : (
              <VisuallyHidden>
                <Drawer.Title>{title}</Drawer.Title>
              </VisuallyHidden>
            )}
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

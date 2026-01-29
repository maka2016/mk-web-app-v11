import * as React from 'react';

import { cn } from '@workspace/ui/lib/utils';
import { Icon } from '@workspace/ui/components/Icon';

export const IconInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<'input'> & {
    icon?: string;
    icon2?: React.ReactNode;
  }
>(({ className, type, icon, icon2, style, ...props }, ref) => {
  return (
    <div
      style={style}
      className={cn(
        'flex w-full items-center rounded-sm overflow-hidden bg-custom-gray px-1 py-1 gap-1',
        className
      )}
    >
      {icon && <Icon name={icon} size={12} color='#000' />}
      {icon2}
      <input
        type={type}
        className={cn(
          'flex h-4 w-full text-xs color-[#151515] ring-offset-background file:border-0 bg-transparent file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
        )}
        ref={ref}
        {...props}
      />
    </div>
  );
});
IconInput.displayName = 'IconInput';

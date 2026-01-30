'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@workspace/ui/components/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';

import { TooltipArrow } from '@radix-ui/react-tooltip';
import { PopoverArrow } from '@radix-ui/react-popover';
import { useEffect, useState } from 'react';

interface ResponsiveTooltipProps {
  defaultOpen?: boolean;
  trigger?: 'click' | 'hover';
  arrow?: boolean;
  arrowClassName?: string;
  children: React.ReactNode;
  content: React.ReactNode;
  contentProps?: React.ComponentProps<typeof TooltipContent>;
}

export function ResponsiveTooltip({
  children,
  content,
  contentProps,
  arrow,
  arrowClassName,
  trigger = 'click',
  defaultOpen,
}: ResponsiveTooltipProps) {
  if (trigger === 'hover') {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={10}>
          <TooltipTrigger>{children}</TooltipTrigger>
          <TooltipContent {...contentProps}>
            {arrow && <TooltipArrow className={arrowClassName} />}
            {content}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Popover defaultOpen={defaultOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent {...contentProps}>
        {arrow && <PopoverArrow className={arrowClassName} />}
        {content}
      </PopoverContent>
    </Popover>
  );
}

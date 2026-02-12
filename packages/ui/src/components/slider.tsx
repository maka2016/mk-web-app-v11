'use client';

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';

import { cn } from '@workspace/ui/lib/utils';
import { cva, VariantProps } from 'class-variance-authority';

const trackVariants = cva(
  'bg-[#E6E7E7] relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-[3px] data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5',
  {
    variants: {
      size: {
        sm: 'h-3px',
        lg: 'data-[orientation=horizontal]:h-2',
      },
    },
    defaultVariants: {
      size: 'sm',
    },
  }
);

const ThumbVariants = cva(
  'border-primary bg-background ring-ring/50 block size-[10px] shrink-0 rounded-full border shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      size: {
        sm: 'size-[10px]',
        lg: 'size-6',
      },
    },
    defaultVariants: {
      size: 'sm',
    },
  }
);

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  size = 'sm',
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & {
  size?: 'sm' | 'lg';
}) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  );

  return (
    <SliderPrimitive.Root
      data-slot='slider'
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        'relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col',
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot='slider-track'
        className={cn(trackVariants({ size }))}
      >
        <SliderPrimitive.Range
          data-slot='slider-range'
          className={cn(
            'bg-primary absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full'
          )}
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot='slider-thumb'
          key={index}
          className={cn(ThumbVariants({ size }))}
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };

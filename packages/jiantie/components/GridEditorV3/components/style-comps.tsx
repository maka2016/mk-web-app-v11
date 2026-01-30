import styled from '@emotion/styled';
import { cn } from '@workspace/ui/lib/utils';
import * as React from 'react';

const BtnLiteBase = styled.div`
  .border_icon {
    border: 1px solid rgba(0, 0, 0, 0.2);
    border-radius: 50%;
    padding: 8px;
  }
`;

export const BtnLiteColumnBase = styled(BtnLiteBase)`
  @media (min-width: 768px) {
    flex-direction: row;
    gap: 8px;

    .border_icon {
      border: none;
      padding: 2px;
    }

    &:hover {
      background-color: #f0f0f0;
    }

    &:active {
      background-color: #ccc;
    }
  }
`;

interface BtnLiteProps extends React.HTMLAttributes<HTMLDivElement> {
  isActive?: boolean;
  activeColor?: string;
  direction?: 'row' | 'column';
  disabled?: boolean;
}

export const BtnLite = React.forwardRef<HTMLDivElement, BtnLiteProps>(
  (
    {
      isActive,
      activeColor = '#1a87ff',
      direction = 'row',
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    // 检查 className 中是否包含 'col' 或 'active'
    const hasColClass = className?.includes('col');
    const hasActiveClass = className?.includes('active');
    const finalDirection = hasColClass ? 'column' : direction;
    const finalIsActive = hasActiveClass || isActive;

    return (
      <BtnLiteBase
        ref={ref}
        className={cn(
          'flex items-center rounded bg-white text-sm cursor-pointer select-none whitespace-nowrap px-2 py-1 gap-2 font-bold active:bg-[#eee]',
          finalDirection === 'column' ? 'flex-col' : 'flex-row',
          finalIsActive && 'text-[#1a87ff]',
          disabled && 'opacity-40 cursor-not-allowed',
          className
        )}
        style={
          finalIsActive
            ? {
                color: activeColor,
              }
            : undefined
        }
        {...props}
      />
    );
  }
);
BtnLite.displayName = 'BtnLite';

interface BtnLiteColumnProps extends React.HTMLAttributes<HTMLDivElement> {
  isActive?: boolean;
  activeColor?: string;
  direction?: 'row' | 'column';
  disabled?: boolean;
}

export const BtnLiteColumn = React.forwardRef<
  HTMLDivElement,
  BtnLiteColumnProps
>(
  (
    { isActive, activeColor = '#1a87ff', disabled, className, ...props },
    ref
  ) => {
    // 检查 className 中是否包含 'active'
    const hasActiveClass = className?.includes('active');
    const finalIsActive = hasActiveClass || isActive;

    return (
      <BtnLiteColumnBase
        ref={ref}
        className={cn(
          'flex flex-col w-auto text-xs gap-0.5 font-bold justify-center items-center whitespace-nowrap py-1 px-2 active:bg-[#eee]',
          'md:flex-row md:gap-1 md:hover:bg-[#f0f0f0]',
          finalIsActive && 'text-[#1a87ff]',
          disabled && 'opacity-40 cursor-not-allowed',
          className
        )}
        style={
          finalIsActive
            ? {
                color: activeColor,
              }
            : undefined
        }
        {...props}
      />
    );
  }
);
BtnLiteColumn.displayName = 'BtnLiteColumn';

export const Sep = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('m-0 bg-[#f0f0f0] w-px h-3', className)}
      {...props}
    />
  );
});
Sep.displayName = 'Sep';

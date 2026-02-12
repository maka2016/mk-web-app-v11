import { cn } from '@workspace/ui/lib/utils';
import { Minus, Plus } from 'lucide-react';
import * as React from 'react';

export type IconInput2Size = 'sm' | 'lg';

export const IconInput2 = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<'input'>, 'size'> & {
    icon2?: React.ReactNode;
    showNumberControls?: boolean;
    size?: IconInput2Size;
  }
>(
  (
    {
      className,
      type,
      icon2,
      style,
      value,
      onChange,
      showNumberControls = true,
      size = 'sm',
      ...props
    },
    ref
  ) => {
    const isNumberType = type === 'number' && showNumberControls;

    const handleIncrement = () => {
      if (isNumberType && onChange) {
        const currentValue = Number(value) || 0;
        const newValue = currentValue + 1;
        onChange({
          target: { value: newValue.toString() },
        } as React.ChangeEvent<HTMLInputElement>);
      }
    };

    const handleDecrement = () => {
      if (isNumberType && onChange) {
        const currentValue = Number(value) || 0;
        const newValue = currentValue - 1;
        onChange({
          target: { value: newValue.toString() },
        } as React.ChangeEvent<HTMLInputElement>);
      }
    };

    // 根据size配置高度和图标大小
    const sizeConfig: Record<
      IconInput2Size,
      {
        containerHeight: string;
        iconSize: number;
        buttonPadding: string;
        buttonSize: string;
        inputHeight: string;
      }
    > = {
      sm: {
        containerHeight: 'h-6', // 24px
        iconSize: 14,
        buttonPadding: 'p-1',
        buttonSize: 'w-6 h-6', // 20px
        inputHeight: 'h-5', // 20px
      },
      lg: {
        containerHeight: 'h-12', // 48px
        iconSize: 20,
        buttonPadding: 'p-2',
        buttonSize: 'w-[38px] h-[38px]', // 38px
        inputHeight: 'h-8', // 32px
      },
    };

    const config = sizeConfig[size as IconInput2Size];

    return (
      <div
        style={style}
        className={cn(
          'flex w-full items-center rounded-sm overflow-hidden gap-1 font-bold',
          config.containerHeight,
          className
        )}
      >
        {isNumberType && (
          <div
            onClick={handleDecrement}
            style={{ padding: 4 }}
            tabIndex={-1}
            className={cn(
              'rounded-full flex items-center justify-center border border-gray-200',
              config.buttonSize
            )}
          >
            <div className='border_icon sm'>
              <Minus
                size={config.iconSize}
                className='text-gray-600 font-bold'
              />
            </div>
          </div>
        )}
        <div
          className={cn(
            'flex flex-nowrap border rounded-sm px-2 items-center flex-1',
            config.inputHeight
          )}
        >
          <span>{value}</span>
          <span>{props.placeholder}</span>
        </div>

        {isNumberType && (
          <div
            onClick={handleIncrement}
            style={{ padding: 4 }}
            tabIndex={-1}
            className={cn(
              'rounded-full flex items-center justify-center border border-gray-200',
              config.buttonSize
            )}
          >
            <div className='border_icon sm'>
              <Plus
                size={config.iconSize}
                className='text-gray-600 font-bold'
              />
            </div>
          </div>
        )}
      </div>
    );
  }
);
IconInput2.displayName = 'IconInput2';

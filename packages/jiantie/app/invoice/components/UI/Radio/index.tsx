'use client';
import { Icon } from '@workspace/ui/components/Icon';
import styles from './index.module.scss';
import cls from 'classnames';
import React from 'react';
import { Label } from '@workspace/ui/components/label';
import { Circle } from 'lucide-react';

interface RadioProps {
  checked?: boolean;
  onChange?: (e: { target: { checked: boolean } }) => void;
  value?: string | number;
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const Radio: React.FC<RadioProps> = props => {
  const { checked, onChange, value, disabled, children, className } = props;
  const id = `radio-${value}`;

  return (
    <div className={cls(styles.main, className, 'flex items-center gap-2')}>
      <button
        type='button'
        role='radio'
        aria-checked={checked}
        disabled={disabled}
        className={cls(
          'aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center',
          checked && 'bg-primary'
        )}
        onClick={() => {
          if (!disabled) {
            onChange?.({ target: { checked: !checked } });
          }
        }}
        id={id}
      >
        {checked && (
          <Circle className='h-2.5 w-2.5 fill-current text-current text-white' />
        )}
      </button>
      {children && (
        <Label
          htmlFor={id}
          className='cursor-pointer'
          onClick={() => {
            if (!disabled && !checked) {
              onChange?.({ target: { checked: true } });
            }
          }}
        >
          {children}
        </Label>
      )}
    </div>
  );
};

export default Radio;

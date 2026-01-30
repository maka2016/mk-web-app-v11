import { Label } from '@workspace/ui/components/label';
import { Minus, Plus } from 'lucide-react';
import React from 'react';

export const ToggleItem = ({
  hasValue,
  title,
  onAdd,
  onRemove,
  children,
}: {
  hasValue: boolean;
  title: string;
  onAdd: () => void;
  onRemove: () => void;
  children: React.ReactNode;
}) => {
  return (
    <div className='flex flex-col gap-2 bg-custom-gray rounded-sm py-1'>
      <div className='px-2 flex items-center justify-between'>
        <Label className='text-xs'>{title}</Label>
        <div className='flex items-center gap-2'>
          {hasValue ? (
            <Minus
              className='cursor-pointer'
              size={14}
              onClick={() => {
                onRemove();
              }}
            />
          ) : (
            <Plus
              size={14}
              className='cursor-pointer'
              onClick={() => onAdd()}
            />
          )}
        </div>
      </div>
      {hasValue && children}
    </div>
  );
};

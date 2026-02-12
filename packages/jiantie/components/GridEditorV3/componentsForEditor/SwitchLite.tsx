import { Icon } from '@workspace/ui/components/Icon';
import React from 'react';

export default function SwitchLite({
  active,
  onChange,
}: {
  active: boolean;
  onChange: (active: boolean) => void;
}) {
  return (
    <>
      {active ? (
        <Icon
          name='minus'
          className='cursor-pointer'
          size={16}
          color='#151515'
          onClick={() => {
            onChange(false);
          }}
        />
      ) : (
        <Icon
          name='plus'
          className='cursor-pointer'
          size={16}
          color='#151515'
          onClick={() => {
            onChange(true);
          }}
        />
      )}
    </>
  );
}

import { Icon } from '@workspace/ui/components/Icon';
import { IconInput } from '@workspace/ui/components/icon-input';
import { Label } from '@workspace/ui/components/label';
import { Minus, Plus } from 'lucide-react';
import React, { useEffect } from 'react';
import {
  numberChunkValueToString,
  stringValueTo4Chunk,
} from '../../utils/utils';

export const SettingItemFor4Value = ({
  value,
  label,
  shortcutData,
  inputOnly = false,
  useNegative = true,
  onChange,
}: {
  value: string;
  label: string;
  inputOnly?: boolean;
  shortcutData?: { text: string; value: any }[];
  useNegative?: boolean;
  onChange: (nextVal?: string) => void;
}) => {
  const [valueChunk, setValueChunk] = React.useState(
    stringValueTo4Chunk(value)
  );

  const hasValue = !!valueChunk;

  const handleSideChangePadding = (value: number, index: number) => {
    const newValues: [number, number, number, number] = [
      ...(valueChunk || [0, 0, 0, 0]),
    ];
    newValues[index] = value;

    setValueChunk(newValues);
  };

  const handleChange = (value: string) => {
    const values = stringValueTo4Chunk(value);
    console.log('values', values);
    setValueChunk(values);
  };

  useEffect(() => {
    if (
      JSON.stringify(valueChunk) === JSON.stringify(stringValueTo4Chunk(value))
    ) {
      return;
    }
    const commitData = numberChunkValueToString(valueChunk);
    onChange(commitData);
  }, [valueChunk]);

  useEffect(() => {
    const nextChunk = stringValueTo4Chunk(value);
    if (nextChunk && JSON.stringify(nextChunk) !== JSON.stringify(valueChunk)) {
      setValueChunk(nextChunk);
    }
  }, [value]);

  const renderInput = () => {
    return (
      <div className='grid grid-cols-1 gap-1'>
        <div className='grid grid-cols-2 gap-1'>
          <IconInput
            icon2={<Icon name='dingjianju' size={12} />}
            type='number'
            value={valueChunk?.[0]}
            min={useNegative ? undefined : 0}
            onChange={e => {
              const value = e.target.value;
              handleSideChangePadding(+value, 0);
            }}
            style={{
              backgroundColor: '#FCFCFC',
            }}
          />
          <IconInput
            icon2={<Icon name='youjianju' size={12} />}
            type='number'
            value={valueChunk?.[1]}
            min={useNegative ? undefined : 0}
            onChange={e => {
              const value = e.target.value;
              handleSideChangePadding(+value, 1);
            }}
            style={{
              backgroundColor: '#FCFCFC',
            }}
          />
          <IconInput
            icon2={<Icon name='dijianju' size={12} />}
            type='number'
            value={valueChunk?.[2]}
            min={useNegative ? undefined : 0}
            onChange={e => {
              const value = e.target.value;
              handleSideChangePadding(+value, 2);
            }}
            style={{
              backgroundColor: '#FCFCFC',
            }}
          />
          <IconInput
            icon2={<Icon name='zuojianju' size={12} />}
            type='number'
            value={valueChunk?.[3]}
            min={useNegative ? undefined : 0}
            onChange={e => {
              const value = e.target.value;
              handleSideChangePadding(+value, 3);
            }}
            style={{
              backgroundColor: '#FCFCFC',
            }}
          />
        </div>
        <div className='flex items-center gap-1'>
          <IconInput
            icon2={<Icon name='xiantiaocuxi' size={12} />}
            type='number'
            value={valueChunk?.[0]}
            className='flex-1'
            min={useNegative ? undefined : 0}
            onChange={e => {
              const value = e.target.value;
              handleChange(value);
            }}
            style={{
              backgroundColor: '#FCFCFC',
            }}
          />
          {shortcutData?.map((item, index) => (
            <div
              key={index}
              className='px-2 text-gray-500 h-6 flex justify-center items-center rounded-sm bg-white text-xs cursor-pointer'
              onClick={() => {
                const values = stringValueTo4Chunk(item.value);
                setValueChunk(values);
              }}
            >
              {item.text}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (inputOnly) {
    return renderInput();
  }

  return (
    <div className='flex flex-col gap-2 bg-custom-gray rounded-sm py-1'>
      <div className='px-2 flex items-center justify-between'>
        <Label className='text-xs'>{label}</Label>
        {hasValue ? (
          <Minus
            className='cursor-pointer'
            size={14}
            onClick={() => {
              onChange(undefined);
              setValueChunk(undefined);
            }}
          />
        ) : (
          <Plus
            size={14}
            className='cursor-pointer'
            onClick={() => {
              setValueChunk([0, 0, 0, 0]);
            }}
          />
        )}
      </div>
      {hasValue ? <div className='px-2'>{renderInput()}</div> : null}
    </div>
  );
};

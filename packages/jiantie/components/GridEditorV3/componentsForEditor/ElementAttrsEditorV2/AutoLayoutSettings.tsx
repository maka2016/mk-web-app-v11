import React from 'react';
import RowLayout from './RowLayout';
import ResizingControl from './ResizingControl';
import { SettingItemFor4Value } from './SettingItemFor4Value';
import { ToggleItem } from './ToggleItem';
import toast from 'react-hot-toast';

interface AutoLayoutSettingsProps {
  useAlign?: boolean;
  usePadding?: boolean;
  style: any;
  showAutoLayout?: boolean;
  isList?: boolean;
  onChange: (value: React.CSSProperties) => void;
}

export default function AutoLayoutSettings({
  useAlign,
  usePadding = true,
  style,
  showAutoLayout = false,
  isList = false,
  onChange,
}: AutoLayoutSettingsProps) {
  return (
    <>
      {showAutoLayout && (
        <RowLayout
          useAlign={useAlign}
          value={style || {}}
          gridOnly={isList}
          flexOnly={!isList}
          onChange={nextVal => {
            onChange(nextVal);
          }}
        />
      )}

      <div className='grid grid-cols-2 gap-2'>
        <ResizingControl
          dimension='width'
          value={style}
          onChange={patch => onChange(patch)}
        />
        <ResizingControl
          dimension='height'
          value={style}
          onChange={patch => onChange(patch)}
        />
      </div>

      {usePadding && (
        <ToggleItem
          hasValue={!!style.padding}
          title='内边距'
          onAdd={() => {
            onChange({
              padding: '12px',
            });
          }}
          onRemove={() => {
            onChange({
              padding: undefined,
            });
          }}
        >
          <div className='px-2'>
            <SettingItemFor4Value
              value={style.padding}
              useNegative={false}
              label='内边距'
              inputOnly={true}
              // shortcutData={paddingData}
              onChange={nextValue => {
                onChange({
                  padding: nextValue,
                });
              }}
            />
          </div>
        </ToggleItem>
      )}
      {style.margin && (
        <ToggleItem
          hasValue={!!style.margin}
          title='外边距'
          onAdd={() => {
            toast.error('不再支持设置外边距，请手动删除！');
            onChange({
              margin: '0',
            });
          }}
          onRemove={() => {
            onChange({
              margin: undefined,
            });
          }}
        >
          <div className='px-2'>
            <SettingItemFor4Value
              value={style.margin}
              label='外边距'
              inputOnly={true}
              // shortcutData={paddingData}
              onChange={nextValue => {
                toast.error('不再支持设置外边距');
                // onChange({
                //   margin: nextValue,
                // });
              }}
            />
          </div>
        </ToggleItem>
      )}
      {/* <EdgesControl
        label="内边距"
        property="padding"
        useShorthandString
        value={style}
        onChange={(patch) => {
          onChange(patch as any);
        }}
      /> */}

      {/* <EdgesControl
        label="外边距"
        property="margin"
        useShorthandString
        value={style}
        onChange={(patch) => {
          onChange(patch as any);
        }}
      /> */}
    </>
  );
}

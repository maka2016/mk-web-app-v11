import React from 'react';
import RowLayout from './RowLayout';
import EdgesControl from './EdgesControl';
import FigmaResizingControl from './FigmaResizingControl';

interface AutoLayoutSettingsProps {
  style: any;
  showAutoLayout?: boolean;
  isList?: boolean;
  onChange: (value: React.CSSProperties) => void;
}

export default function AutoLayoutSettings({
  style,
  showAutoLayout = false,
  isList = false,
  onChange,
}: AutoLayoutSettingsProps) {
  return (
    <>
      {showAutoLayout && (
        <RowLayout
          value={style || {}}
          gridOnly={isList}
          flexOnly={!isList}
          onChange={nextVal => {
            onChange(nextVal);
          }}
        />
      )}

      <div className='grid grid-cols-2 gap-2'>
        <FigmaResizingControl
          dimension='width'
          value={style}
          onChange={patch => onChange(patch)}
        />
        <FigmaResizingControl
          dimension='height'
          value={style}
          onChange={patch => onChange(patch)}
        />
      </div>

      <EdgesControl
        label='内边距'
        property='padding'
        useShorthandString
        value={style}
        onChange={patch => {
          onChange(patch as any);
        }}
      />

      <EdgesControl
        label='外边距'
        property='margin'
        useShorthandString
        value={style}
        onChange={patch => {
          onChange(patch as any);
        }}
      />
    </>
  );
}

import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { Separator } from '@workspace/ui/components/separator';
import { useState } from 'react';
import { MkHuiZhiProps } from '../shared/types';
import { ColorItems } from './ColorPanel/ColorItems';
import CustomColorPanel2 from './ColorPanel/CustomColorPanel2';
import { baseColors, rgbaToHex } from './ColorPanel/utils';

const items: Array<{
  label: string;
  value: keyof MkHuiZhiProps['style'];
  type: 'string' | 'number';
}> = [
  {
    label: '背景颜色',
    value: 'backgroundColor',
    type: 'string',
  },
  {
    label: '边框颜色',
    value: 'borderColor',
    type: 'string',
  },
  {
    label: '文字颜色',
    value: 'valueColor',
    type: 'string',
  },

  {
    label: '标签颜色',
    value: 'labelColor',
    type: 'string',
  },
  {
    label: '圆角大小',
    value: 'borderRadius',
    type: 'number',
  },
  {
    label: '按钮背景颜色',
    value: 'buttonBackgroundColor',
    type: 'string',
  },
  {
    label: '按钮文字颜色',
    value: 'buttonColor',
    type: 'string',
  },
  {
    label: '按钮边框颜色',
    value: 'buttonBorderColor',
    type: 'string',
  },
  {
    label: '按钮圆角大小',
    value: 'buttonBorderRadius',
    type: 'number',
  },
];

const ColorSetting = ({
  onFormValueChange,
  formControledValues,
}: {
  onFormValueChange: (values: any) => void;
  formControledValues: MkHuiZhiProps;
}) => {
  const [styles, setStyles] = useState({
    labelColor: formControledValues.style?.labelColor || '#000',
    valueColor: formControledValues.style?.valueColor || '#000',
    backgroundColor: formControledValues.style?.backgroundColor || '#fff',
    borderColor: formControledValues.style?.borderColor || '#ff4667',
    borderRadius: formControledValues.style?.borderRadius || 6,
    buttonBorderRadius: formControledValues.style?.buttonBorderRadius || 6,
    buttonBackgroundColor:
      formControledValues.style?.buttonBackgroundColor || '#ff4667',
    buttonColor: formControledValues.style?.buttonColor || '#fff',
    buttonBorderColor: formControledValues.style?.buttonBorderColor || '',
  });

  const onChangeColor = (newStyles: any) => {
    setStyles(newStyles);
    onFormValueChange({
      ...formControledValues,
      style: newStyles,
    });
  };
  return (
    <>
      <div className='p-2 py-4 flex flex-col gap-4'>
        {items.map(item => {
          if (item.type === 'number') {
            return (
              <div className='flex flex-col gap-2' key={item.value}>
                <Label className='text-xs'>{item.label}</Label>
                <Input
                  type='number'
                  variantSize='xs'
                  value={styles?.[item.value]}
                  style={{
                    backgroundColor: '#f3f3f5',
                    border: 'none',
                  }}
                  onChange={e => {
                    const newStyles = {
                      ...styles,
                      [item.value]: Number(e.target.value),
                    };
                    onChangeColor(newStyles);
                  }}
                />
              </div>
            );
          }
          return (
            <div className='flex flex-col gap-2' key={item.value}>
              <Label className='text-xs'>{item.label}</Label>
              <div className='flex items-center gap-2'>
                <Popover>
                  <PopoverTrigger>
                    <div
                      className='w-10 h-6 px-2 py-2 rounded-sm'
                      style={{
                        backgroundColor: '#f3f3f5',
                      }}
                    >
                      <div
                        className='w-full h-full'
                        style={{
                          backgroundColor:
                            (styles?.[item.value] as string) || '#000',
                        }}
                      ></div>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className='p-0'>
                    <CustomColorPanel2
                      color={(styles?.[item.value] as string) || '#000'}
                      onChange={(colorCode: any) => {
                        const hex = rgbaToHex(colorCode.rgb);
                        if (hex) {
                          const newStyles = {
                            ...styles,
                            [item.value]: hex,
                          };
                          onChangeColor(newStyles);
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>

                <Input
                  variantSize='xs'
                  value={styles?.[item.value] as string}
                  style={{
                    backgroundColor: '#f3f3f5',
                    border: 'none',
                  }}
                  onChange={e => {
                    const newStyles = {
                      ...styles,
                      [item.value]: e.target.value,
                    };
                    onChangeColor(newStyles);
                  }}
                />
              </div>
              <ColorItems
                colorList={baseColors}
                selectedColor={undefined}
                onClick={color => {
                  const newStyles = {
                    ...styles,
                    [item.value]: color,
                  };
                  onChangeColor(newStyles);
                }}
              />
            </div>
          );
        })}
      </div>
      <Separator />
    </>
  );
};

export default ColorSetting;

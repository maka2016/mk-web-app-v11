import { Label } from '@workspace/ui/components/label';
import { Minus, Plus, Settings } from 'lucide-react';
import { useState } from 'react';
import LottieSetting from '../../components/LottieComp/LottieSetting';
import { LottieConfig } from '../../types';
import BorderImageSliceEditor from './BorderImageSliceEditor';
import { ToggleItem } from './ToggleItem';

interface HistoryFeaturesGroupProps {
  style: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  targetDOM?: HTMLElement;
  lottieBgConfig?: LottieConfig;
  lottieFgConfig?: LottieConfig;
  onLottieBgChange?: (config?: LottieConfig) => void;
  onLottieFgChange?: (config?: LottieConfig) => void;
}

export default function HistoryFeaturesGroup({
  style,
  onChange,
  targetDOM,
  lottieBgConfig,
  lottieFgConfig,
  onLottieBgChange,
  onLottieFgChange,
}: HistoryFeaturesGroupProps) {
  const [borderImageDialogOpen1, setBorderImageDialogOpen1] = useState(
    !!style.borderImageSource
  );
  const [borderImageDialogOpen2, setBorderImageDialogOpen2] = useState(
    !!(style as Record<string, unknown>).borderImage2
  );

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex flex-col gap-2 bg-custom-gray rounded-sm py-1'>
        <div className='px-2 flex items-center justify-between'>
          <Label className='text-xs'>边框图片（旧）</Label>
          <div className='flex items-center gap-2'>
            {!!style.borderImageSource && (
              <Settings
                size={14}
                className='cursor-pointer'
                onClick={() =>
                  setBorderImageDialogOpen1(!borderImageDialogOpen1)
                }
              />
            )}
            {style.borderImageSource ? (
              <Minus
                className='cursor-pointer'
                size={14}
                onClick={() => {
                  onChange({
                    borderImageSource: undefined,
                    borderImageWidth: undefined,
                    borderImageSlice: undefined,
                    borderImageRepeat: undefined,
                    borderImageOutset: undefined,
                    borderImage: undefined,
                    borderWidth: undefined,
                    borderTopWidth: undefined,
                    borderRightWidth: undefined,
                    borderBottomWidth: undefined,
                    borderLeftWidth: undefined,
                    borderColor: undefined,
                  });
                }}
              />
            ) : (
              <Plus
                size={14}
                className='cursor-pointer'
                onClick={() => setBorderImageDialogOpen1(true)}
              />
            )}
          </div>
        </div>
        {borderImageDialogOpen1 && (
          <div>
            <BorderImageSliceEditor
              targetDOM={targetDOM}
              value={style}
              onChange={value => {
                onChange({ ...value });
              }}
              onConfirm={value => {
                onChange({ ...value });
              }}
              onCancel={() => {
                setBorderImageDialogOpen1(false);
              }}
            />
          </div>
        )}
      </div>

      <div className='flex flex-col gap-2 bg-custom-gray rounded-sm py-1'>
        <div className='px-2 flex items-center justify-between'>
          <Label className='text-xs'>9宫格背景(废弃)</Label>
          <div className='flex items-center gap-2'>
            {!!(style as Record<string, unknown>).borderImage2 && (
              <Settings
                size={14}
                className='cursor-pointer'
                onClick={() =>
                  setBorderImageDialogOpen2(!borderImageDialogOpen2)
                }
              />
            )}
            {(style as Record<string, unknown>).borderImage2 ? (
              <Minus
                className='cursor-pointer'
                size={14}
                onClick={() => {
                  onChange({
                    borderImage2: undefined,
                  });
                }}
              />
            ) : (
              <Plus
                size={14}
                className='cursor-pointer'
                onClick={() => setBorderImageDialogOpen2(true)}
              />
            )}
          </div>
        </div>
        {borderImageDialogOpen2 && (
          <div>
            <BorderImageSliceEditor
              targetDOM={targetDOM}
              value={
                ((style as Record<string, unknown>).borderImage2 as Record<
                  string,
                  unknown
                >) || {}
              }
              onChange={value => {
                onChange({ borderImage2: value });
              }}
              onConfirm={value => {
                onChange({ borderImage2: value });
              }}
              onCancel={() => {
                setBorderImageDialogOpen2(false);
              }}
            />
          </div>
        )}
      </div>

      {onLottieBgChange && onLottieFgChange && (
        <ToggleItem
          title='Lottie动画'
          hasValue={!!lottieBgConfig || !!lottieFgConfig}
          onAdd={() => {
            if (!lottieBgConfig && !lottieFgConfig) {
              onLottieBgChange({
                url: '',
                loop: true,
                autoplay: true,
                speed: 1,
              });
            }
          }}
          onRemove={() => {
            onLottieBgChange?.(undefined);
            onLottieFgChange?.(undefined);
          }}
        >
          <div className='px-2 pb-2'>
            <LottieSetting
              lottieBgConfig={lottieBgConfig}
              lottieFgConfig={lottieFgConfig}
              onChangeBg={onLottieBgChange}
              onChangeFg={onLottieFgChange}
            />
          </div>
        </ToggleItem>
      )}
    </div>
  );
}

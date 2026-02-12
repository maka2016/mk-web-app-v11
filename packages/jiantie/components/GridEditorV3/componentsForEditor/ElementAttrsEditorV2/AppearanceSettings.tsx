import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu';
import { Icon } from '@workspace/ui/components/Icon';
import { Label } from '@workspace/ui/components/label';
import { Check, ChevronDown, Minus, Plus } from 'lucide-react';
import ColorPickerPopover from '../../components/ColorPicker';
import {
  colorValueBuilder,
  colorValueParser,
} from '../../components/ColorPicker/utils';
import { SettingItemFor4Value } from './SettingItemFor4Value';
import { SingleValueStyleSettingItem } from './StyleSetting';

const borderRadiusData = [
  {
    text: '全圆',
    value: '1000',
  },
  {
    text: '24',
    value: '24',
  },
  {
    text: '12',
    value: '12',
  },
  {
    text: '4',
    value: '4',
  },
];

const paddingData = [
  {
    text: '无',
    value: '0',
  },
  {
    text: '24',
    value: '24',
  },
  {
    text: '12',
    value: '12',
  },
  {
    text: '4',
    value: '4',
  },
];

const boderStyles = [
  {
    text: '实线',
    value: 'solid',
  },
  {
    text: '虚线',
    value: 'dashed',
  },
  {
    text: '点线',
    value: 'dotted',
  },
  {
    text: '双线',
    value: 'double',
  },
];

const getOpacityData = () => {
  return [
    {
      text: '0',
      value: '0',
    },
    {
      text: '0.5',
      value: '0.5',
    },
    {
      text: '1',
      value: '1',
    },
  ];
};

const blendModeData = [
  {
    text: '正常',
    value: 'normal',
  },
  {
    text: '正片叠底',
    value: 'multiply',
  },
  {
    text: '滤色',
    value: 'screen',
  },
  {
    text: '叠加',
    value: 'overlay',
  },
  {
    text: '变暗',
    value: 'darken',
  },
  {
    text: '变亮',
    value: 'lighten',
  },
  {
    text: '颜色减淡',
    value: 'color-dodge',
  },
  {
    text: '颜色加深',
    value: 'color-burn',
  },
  {
    text: '强光',
    value: 'hard-light',
  },
  {
    text: '柔光',
    value: 'soft-light',
  },
  {
    text: '差值',
    value: 'difference',
  },
  {
    text: '排除',
    value: 'exclusion',
  },
  {
    text: '色相',
    value: 'hue',
  },
  {
    text: '饱和度',
    value: 'saturation',
  },
  {
    text: '颜色',
    value: 'color',
  },
  {
    text: '明度',
    value: 'luminosity',
  },
];

interface AppearanceSettingsProps {
  style: React.CSSProperties & Record<string, unknown>;
  onChange: (value: React.CSSProperties & Record<string, unknown>) => void;
}

export default function AppearanceSettings({
  style,
  onChange,
}: AppearanceSettingsProps) {
  return (
    <>
      <SettingItemFor4Value
        value={String(style.borderRadius ?? '')}
        label='圆角'
        shortcutData={borderRadiusData}
        onChange={nextValue => {
          onChange({
            borderRadius: nextValue,
          });
        }}
      />

      <div className='flex flex-col gap-2 bg-custom-gray rounded-sm py-1'>
        <div className=' px-2 flex items-center justify-between'>
          <Label className='text-xs'>描边</Label>
          {!!style.borderColor ? (
            <Minus
              className='cursor-pointer'
              size={14}
              onClick={() => {
                onChange({
                  borderWidth: undefined,
                  borderTopWidth: undefined,
                  borderBottomWidth: undefined,
                  borderLeftWidth: undefined,
                  borderRightWidth: undefined,
                  borderColor: undefined,
                });
              }}
            />
          ) : (
            <Plus
              size={14}
              className='cursor-pointer'
              onClick={() => {
                onChange({
                  borderWidth: 1,
                  borderColor: '#3C3C3D',
                  borderTopWidth: undefined,
                  borderBottomWidth: undefined,
                  borderLeftWidth: undefined,
                  borderRightWidth: undefined,
                  borderImageSource: undefined,
                  borderImageWidth: undefined,
                  borderImageSlice: undefined,
                  borderImageRepeat: undefined,
                  borderImageOutset: undefined,
                  borderImage: undefined,
                });
              }}
            />
          )}
        </div>
        {!!style.borderColor && (
          <>
            <div className='flex items-center px-2'>
              <ColorPickerPopover
                value={String(style.borderColor ?? '')}
                onChange={value => {
                  onChange({
                    borderColor: colorValueBuilder(value),
                  });
                }}
              />
              <div
                className='text-xs p-1'
                style={{
                  marginLeft: 2,
                  minWidth: 70,
                }}
              >
                {colorValueParser(String(style.borderColor ?? ''))}
              </div>
            </div>

            <div className='flex items-center gap-1  px-2'>
              <DropdownMenu>
                <DropdownMenuTrigger className='text-xs flex items-center gap-1'>
                  <span>
                    {boderStyles.find(item => style.borderStyle === item.value)
                      ?.text || '实线'}
                  </span>
                  <ChevronDown size={12} />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side='bottom'
                  align='start'
                  style={{
                    width: 120,
                    boxShadow: '0px 2px 14px 0px #55555526',
                    padding: '8px 0px',
                  }}
                >
                  {boderStyles.map(item => (
                    <DropdownMenuItem
                      key={item.value}
                      onClick={() => {
                        onChange({
                          borderStyle: item.value,
                        });
                      }}
                    >
                      <div className='flex items-center gap-2'>
                        {(style.borderStyle || 'solid') === item.value ? (
                          <Check color='#3C3C3D' size={16} />
                        ) : (
                          <div style={{ width: 16, height: 16 }} />
                        )}
                        <span>{item.text}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Icon name='xiantiaocuxi' size={12} />
              <label className='sr-only' htmlFor='border-width-input'>
                边框宽度
              </label>
              <input
                id='border-width-input'
                title='边框宽度'
                placeholder='宽度'
                className='bg-transparent p-1 text-xs w-10'
                type='number'
                min={0}
                value={String(style.borderWidth)
                  ?.split(' ')[0]
                  ?.replace(/px/gi, '')}
                onChange={e => {
                  const value = e.target.value;
                  onChange({
                    borderWidth: value,
                    borderTopWidth: undefined,
                    borderBottomWidth: undefined,
                    borderLeftWidth: undefined,
                    borderRightWidth: undefined,
                  });
                }}
              />
            </div>
            <SettingItemFor4Value
              value={String(style.borderWidth ?? '')}
              label='边框'
              inputOnly={true}
              shortcutData={paddingData}
              onChange={nextValue => {
                onChange({
                  borderWidth: nextValue,
                });
              }}
            />
          </>
        )}
      </div>

      <SingleValueStyleSettingItem
        title='透明度'
        value={style.opacity as string | undefined}
        options={getOpacityData()}
        onAddByDefault={() => {
          onChange({
            opacity: '1',
          });
        }}
        onRemove={() => {
          onChange({
            opacity: undefined,
          });
        }}
        onChange={value => {
          onChange({
            opacity: value,
          });
        }}
      />

      <SingleValueStyleSettingItem
        title='混合模式'
        value={style.mixBlendMode as string | undefined}
        options={blendModeData}
        onAddByDefault={() => {
          onChange({
            mixBlendMode: 'normal',
          });
        }}
        onRemove={() => {
          onChange({
            mixBlendMode: undefined,
          });
        }}
        onChange={value => {
          onChange({
            mixBlendMode: value,
          });
        }}
      />

      {/* <ShadowSetting
        title="元素阴影"
        shadowType="drop-shadow"
        cssValue={extractDropShadow(style?.filter || "").join(", ")}
        onCssChange={(cssValue) => {
          // cssValue 可能是 "10px 10px red, -5px -5px yellow"
          const dropShadowArr = cssValue
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          const dropShadowStr = dropShadowArr
            .map((s) => `drop-shadow(${s})`)
            .join(" ");
          const otherFilter = extractOtherFilters(style?.filter || "");
          const filterValue = [otherFilter, dropShadowStr]
            .filter(Boolean)
            .join(" ")
            .trim();
          onChange({
            filter: filterValue,
          });
        }}
      /> */}
    </>
  );
}

import {
  ToggleGroup,
  ToggleGroupItem,
} from '@workspace/ui/components/toggle-group';
import React from 'react';
import { StretchHorizontal, StretchVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu';
import { Icon } from '@workspace/ui/components/Icon';

const selfVerticalAlignIcons = {
  'flex-start': <Icon name='alignvt' size={16} />,
  center: <Icon name='alignvc' size={16} />,
  'flex-end': <Icon name='alignvb' size={16} />,
  // stretch: <StretchVertical size={16} />,
};

const selfAlignIcons = {
  'flex-start': <Icon name='align' size={16} />,
  center: <Icon name='alignhc' size={16} />,
  'flex-end': <Icon name='alignhr' size={16} />,
  // stretch: <StretchHorizontal size={16} />,
};

const stretchIcons = [
  {
    icon: <StretchHorizontal size={16} />,
    label: '水平铺满',
    value: {
      justifySelf: 'stretch',
    },
  },
  {
    icon: <StretchVertical size={16} />,
    label: '垂直铺满',
    value: {
      alignSelf: 'stretch',
    },
  },
];

export default function SelfAlign({
  reverse = false,
  value,
  onChange,
}: {
  reverse?: boolean;
  value: any;
  onChange: (value: any) => void;
}) {
  const _onChange = (nextValue: any) => {
    const commitVal = {
      ...value,
      ...nextValue,
    };
    commitVal.placeSelf = `${commitVal.alignSelf || ''} ${commitVal.justifySelf || ''}`;
    // console.log("commitVal", commitVal);
    onChange(commitVal);
  };

  // 自身对齐设置
  const alignSelf = value.alignSelf as
    | 'flex-start'
    | 'center'
    | 'flex-end'
    | 'stretch'
    | undefined;
  const justifySelf = value.justifySelf as
    | 'flex-start'
    | 'center'
    | 'flex-end'
    | 'stretch'
    | undefined;

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex gap-2 items-center flex-1'>
        <ToggleGroup
          type='single'
          size='sm'
          className='gap-1'
          value={justifySelf}
          onValueChange={(val: string) =>
            val && _onChange({ justifySelf: val as any })
          }
        >
          {Object.entries(selfAlignIcons).map(([key, icon]) => (
            <ToggleGroupItem key={key} value={key} aria-label={key}>
              {React.cloneElement(icon as React.ReactElement<any>, {
                className:
                  'text-black group-data-[state=on]:text-[#1890ff] ' +
                  (reverse ? 'rotate-90' : ''),
              })}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <ToggleGroup
          type='single'
          size='sm'
          className='gap-1'
          value={alignSelf}
          onValueChange={(val: string) =>
            val && _onChange({ alignSelf: val as any })
          }
        >
          {Object.entries(selfVerticalAlignIcons).map(([key, icon]) => (
            <ToggleGroupItem key={key} value={key} aria-label={key}>
              {React.cloneElement(icon as React.ReactElement<any>, {
                className:
                  'text-black group-data-[state=on]:text-[#1890ff] ' +
                  (reverse ? 'rotate-[270deg]' : ''),
              })}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <div className='p-1 bg-[#f5f5f5] rounded-sm'>
              {justifySelf === 'stretch' ? (
                <StretchHorizontal size={16} />
              ) : (
                <StretchVertical size={16} />
              )}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className='min-w-2 py-2'>
            {stretchIcons.map((item, index) => (
              <DropdownMenuItem
                key={index}
                onClick={() => _onChange(item.value)}
              >
                {item.icon}
                <span>{item.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <span
          className='text-[#1890ff] cursor-pointer text-xs justify-end'
          onClick={() => {
            _onChange({
              alignSelf: null,
              justifySelf: null,
              placeSelf: null,
            });
          }}
        >
          清除
        </span>
      </div>
    </div>
  );
}

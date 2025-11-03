import styled from '@emotion/styled';
import { cdnApi } from '@mk/services';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import cls from 'classnames';
import ColorPickerPopover from '../../shared/ColorPicker';
import FrontgroundSelector from '../../shared/LibContent/FrontgroundSelector';
import MaskSetting from './MaskSetting';
// removed unused Switch import
import { Label } from '@workspace/ui/components/label';
import { ResponsiveTooltip } from '@workspace/ui/components/responsive-tooltip';
import {
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Expand,
  Layers,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  Repeat,
} from 'lucide-react';
import React, { useState } from 'react';

interface BackgroundSettingFactoryProps {
  title?: string;
  bgUrl: string;
  itemStyle: React.CSSProperties & {
    type?: 'normal' | 'stack';
  };
  onChange: (value: React.CSSProperties) => void;
  editorCtx: any;
  children?: React.ReactNode;
  useColorPicker?: boolean;
  useMask?: boolean;
}

interface BackgroundSettingProps {
  editorCtx: any;
  useFrontground: boolean;
  itemStyle: React.CSSProperties & {
    foregroundStyle?: React.CSSProperties & {
      name?: string;
    };
    type?: 'normal' | 'stack';
  };
  onChange: (
    value: React.CSSProperties & {
      foregroundStyle?: React.CSSProperties & {
        name?: string;
      };
    }
  ) => void;
}

const BackgroundDiv = styled.div`
  padding: 0.5rem;
  .label {
    font-weight: 600;
    font-size: 12px;
    line-height: 20px;
    color: #000;
    margin-bottom: 8px;
  }
  .preview {
    position: relative;
    width: 100%;
    height: 200px;
    border: 1px solid #0000000f;
    border-radius: 4px;
    background-image: url('https://img2.maka.im/cdn/mk-widgets/assets/image 2507.png');
    background-repeat: repeat;
    overflow: hidden;
    background-color: #fff;

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .upload_btn {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-family: PingFang SC;
      border: 1px solid #00000026;
      font-family: PingFang SC;
      font-weight: 400;
      font-size: 12px;
      line-height: 16px;
      border-radius: 6px;
      padding: 4px 8px;
      cursor: pointer;
      &:hover {
        opacity: 0.8;
      }
      &.active {
        border-color: #000;
        color: #fff;
        background-color: #000;
      }
    }
    .preview_btns {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      gap: 4px;
      display: flex;
      justify-content: center;
      align-items: center;
      background: rgba(0, 0, 0, 0.25);
      height: 40px;
      .btn {
        display: flex;
        justify-content: center;
        align-items: center;
        font-family: PingFang SC;
        font-weight: 400;
        font-size: 12px;
        line-height: 16px;
        color: #151515;
        border-radius: 4px;
        background: #f5f5f5;
        padding: 0 12px;
        height: 32px;
        gap: 4px;
        cursor: pointer;
        &:hover {
          opacity: 0.8;
        }

        .split {
          width: 1px;
          height: 16px;
          background: #e6e6e6;
        }
      }
    }
  }

  .btn_group {
    margin-top: 8px;
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    padding: 4px;
    gap: 4px;
    background: #f5f5f5;
    border-radius: 4px;
    .btn_group_item {
      font-family: PingFang SC;
      font-weight: 400;
      font-size: 12px;
      line-height: 24px;
      text-align: center;
      border-radius: 4px;
      padding: 2px 4px;
      cursor: pointer;
      &:hover,
      &.active {
        background: #ffffff;
      }
    }
  }
`;

const bgLayoutMode = (url: string, otherStyle: React.CSSProperties) => [
  {
    label: '填充',
    value: {
      backgroundSize: 'cover',
    },
  },
  {
    label: '拉伸',
    value: {
      backgroundSize: '100% 100%',
    },
  },
  {
    label: '铺满',
    value: {
      backgroundSize: 'contain',
    },
  },
  {
    label: '重复',
    value: {
      backgroundRepeat:
        otherStyle.backgroundRepeat !== 'repeat' ? 'repeat' : 'no-repeat',
    },
  },
];

// 解析 backgroundPosition 为 [x, y]
const parseBackgroundPosition = (position?: string): [string, string] => {
  const trimmed = (position || '').trim();
  if (!trimmed) return ['center', 'center'];
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return [parts[0], parts[1]] as [string, string];
  }
  const only = parts[0];
  if (only === 'center') return ['center', 'center'];
  if (only === 'top' || only === 'bottom') return ['center', only];
  // 其它均视为横向值（left/right/百分比/长度），纵向居中
  return [only, 'center'];
};

const joinBackgroundPosition = (x: string, y: string) => `${x} ${y}`.trim();

const bgLayoutMode2 = (url: string, otherStyle: React.CSSProperties) => {
  const [posX, posY] = parseBackgroundPosition(
    otherStyle.backgroundPosition as string
  );
  return [
    {
      label: '水平左对齐',
      value: {
        backgroundPosition: joinBackgroundPosition('left', posY),
      },
    },
    {
      label: '水平居中',
      value: {
        backgroundPosition: joinBackgroundPosition('center', posY),
      },
    },
    {
      label: '水平右对齐',
      value: {
        backgroundPosition: joinBackgroundPosition('right', posY),
      },
    },
    {
      label: '垂直上对齐',
      value: {
        backgroundPosition: joinBackgroundPosition(posX, 'top'),
      },
    },
    {
      label: '垂直居中',
      value: {
        backgroundPosition: joinBackgroundPosition(posX, 'center'),
      },
    },
    {
      label: '垂直下对齐',
      value: {
        backgroundPosition: joinBackgroundPosition(posX, 'bottom'),
      },
    },
  ];
};

const BackgroundSettingFactory = (props: BackgroundSettingFactoryProps) => {
  const {
    bgUrl,
    itemStyle,
    editorCtx,
    title = '背景',
    onChange,
    useColorPicker = true,
    useMask = true,
  } = props;

  return (
    <>
      <BackgroundDiv>
        <div className='label'>{title}</div>
        <div
          className='preview'
          style={{
            backgroundImage: (itemStyle.backgroundImage ||
              itemStyle.background) as string,
            backgroundSize: itemStyle.backgroundSize,
            backgroundPosition: itemStyle.backgroundPosition,
            backgroundRepeat: itemStyle.backgroundRepeat,
          }}
        >
          <div
            className={cls(['upload_btn', bgUrl && 'active'])}
            onClick={() => {
              editorCtx?.utils.showSelector({
                onSelected: (params: any) => {
                  if (params.type === 'color') {
                    onChange({
                      background: params.value,
                      backgroundImage: undefined,
                    });
                  }
                  if (params.ossPath) {
                    const fullPath = cdnApi(params.ossPath);
                    onChange({
                      background: undefined,
                      // background: `url("${fullPath}") center center / cover no-repeat`,
                      backgroundImage: `url("${fullPath}")`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center center',
                      backgroundRepeat: 'no-repeat',
                    });
                  }
                },
                payload: {
                  defaultAtUpload: true,
                },
                type: 'picture',
              });
            }}
          >
            {bgUrl ? '替换图片' : '添加图片'}
          </div>
          <div className='preview_btns'>
            <div
              className='btn'
              onClick={() => {
                onChange({
                  background: undefined,
                  backgroundImage: undefined,
                  backgroundSize: undefined,
                  backgroundRepeat: undefined,
                  backgroundPosition: undefined,
                });
              }}
            >
              <Icon name='delete' color='#151515' size={14} />
              <span>移除</span>
            </div>
          </div>
        </div>
        <div className='btn_group'>
          {bgLayoutMode(bgUrl, itemStyle).map(item => {
            const value = item.value as any;
            const label = item.label;
            const isActive = (() => {
              switch (label) {
                case '填充':
                  return itemStyle.backgroundSize === 'cover';
                case '拉伸':
                  return itemStyle.backgroundSize === '100% 100%';
                case '铺满':
                  return itemStyle.backgroundSize === 'contain';
                case '重复':
                  return itemStyle.backgroundRepeat === 'repeat';
                default:
                  return Object.keys(value).every(v => {
                    return (
                      value[v] === itemStyle[v as keyof React.CSSProperties]
                    );
                  });
              }
            })();

            const icon = (() => {
              switch (item.label) {
                case '填充':
                  return <Maximize2 size={16} />;
                case '拉伸':
                  return <Expand size={16} />;
                case '铺满':
                  return <Minimize2 size={16} />;
                case '重复':
                  return <Repeat size={16} />;
                default:
                  return <Maximize2 size={16} />;
              }
            })();

            return (
              <ResponsiveTooltip
                key={item.label}
                trigger='hover'
                content={item.label}
              >
                <div
                  className={cls('btn_group_item', isActive && 'active')}
                  data-key={item.label}
                  onClick={() => {
                    const nextValue: any = { ...itemStyle };
                    switch (label) {
                      case '填充':
                        nextValue.backgroundSize = isActive
                          ? undefined
                          : 'cover';
                        break;
                      case '拉伸':
                        nextValue.backgroundSize = isActive
                          ? undefined
                          : '100% 100%';
                        break;
                      case '铺满':
                        nextValue.backgroundSize = isActive
                          ? undefined
                          : 'contain';
                        break;
                      case '重复':
                        // 取消重复应显式设为 no-repeat（CSS 默认是 repeat，置空无效）
                        nextValue.backgroundRepeat = isActive
                          ? 'no-repeat'
                          : 'repeat';
                        break;
                      default:
                        Object.assign(nextValue, item.value);
                    }
                    console.log('nextValue', nextValue);
                    onChange(nextValue);
                  }}
                >
                  {icon}
                </div>
              </ResponsiveTooltip>
            );
          })}
          <ResponsiveTooltip trigger='hover' content='层叠'>
            <div
              className={cls(
                'btn_group_item',
                itemStyle.type === 'stack' && 'active'
              )}
              onClick={() => {
                const isActive = itemStyle.type === 'stack';
                const nextValue: any = {
                  ...itemStyle,
                  type: isActive ? undefined : ('stack' as any),
                };
                console.log('nextValue', nextValue);
                onChange(nextValue);
              }}
            >
              <Layers size={16} />
            </div>
          </ResponsiveTooltip>
        </div>
        <div className='btn_group'>
          {bgLayoutMode2(bgUrl, itemStyle).map(item => {
            const value = item.value as any;
            const [currX, currY] = parseBackgroundPosition(
              itemStyle.backgroundPosition as string
            );
            const [valX, valY] = parseBackgroundPosition(
              value.backgroundPosition as string
            );
            const isHorizontal = [
              '水平左对齐',
              '水平居中',
              '水平右对齐',
            ].includes(item.label);
            const isActive = isHorizontal ? valX === currX : valY === currY;

            return (
              <ResponsiveTooltip
                key={item.label}
                trigger='hover'
                content={item.label}
              >
                <div
                  className={cls('btn_group_item', isActive && 'active')}
                  data-key={item.label}
                  onClick={() => {
                    const [currX2, currY2] = parseBackgroundPosition(
                      itemStyle.backgroundPosition as string
                    );
                    let nextX: string | undefined = currX2;
                    let nextY: string | undefined = currY2;
                    if (isActive) {
                      if (isHorizontal) {
                        nextX = undefined;
                      } else {
                        nextY = undefined;
                      }
                    } else {
                      // 应用新的值到对应轴
                      if (isHorizontal) {
                        nextX = valX;
                      } else {
                        nextY = valY;
                      }
                    }

                    // 规范化：若轴为 center 视为未设置
                    if (nextX === 'center') nextX = undefined;
                    if (nextY === 'center') nextY = undefined;

                    let nextBackgroundPosition: string | undefined;
                    if (!nextX && !nextY) {
                      nextBackgroundPosition = undefined;
                    } else if (nextX && nextY) {
                      nextBackgroundPosition = `${nextX} ${nextY}`;
                    } else if (nextX && !nextY) {
                      nextBackgroundPosition = nextX;
                    } else if (!nextX && nextY) {
                      nextBackgroundPosition = nextY;
                    }

                    const nextValue = {
                      ...itemStyle,
                      backgroundPosition: nextBackgroundPosition,
                      // 移除非标准属性，避免持久化
                      backgroundPositionX: undefined as any,
                      backgroundPositionY: undefined as any,
                    } as any;
                    console.log('nextValue', nextValue);
                    onChange(nextValue);
                  }}
                >
                  {(() => {
                    switch (item.label) {
                      case '水平居中':
                        return <AlignHorizontalJustifyCenter size={16} />;
                      case '水平左对齐':
                        return <AlignHorizontalJustifyStart size={16} />;
                      case '水平右对齐':
                        return <AlignHorizontalJustifyEnd size={16} />;
                      case '垂直上对齐':
                        return <AlignVerticalJustifyStart size={16} />;
                      case '垂直居中':
                        return <AlignVerticalJustifyCenter size={16} />;
                      case '垂直下对齐':
                        return <AlignVerticalJustifyEnd size={16} />;
                      default:
                        return <AlignHorizontalJustifyCenter size={16} />;
                    }
                  })()}
                </div>
              </ResponsiveTooltip>
            );
          })}
        </div>
        {useColorPicker && (
          <div className='flex items-center justify-between mt-2'>
            <span
              className='mr-2 w-[60px]'
              style={{
                fontSize: 12,
                whiteSpace: 'nowrap',
              }}
            >
              背景颜色
            </span>
            <ColorPickerPopover
              value={itemStyle.background as string}
              onChange={value => {
                onChange({
                  background: value ? value.value : undefined,
                });
              }}
            />
          </div>
        )}
        {useMask && (
          <MaskSetting
            itemStyle={itemStyle}
            onChangeStyle={nextStyle => {
              onChange({
                ...itemStyle,
                ...nextStyle,
              });
            }}
          />
        )}
      </BackgroundDiv>
      {props.children}
    </>
  );
};

const ToggleItem = ({
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

const BackgroundSetting = (props: BackgroundSettingProps) => {
  const { itemStyle, editorCtx, onChange } = props;

  const bgUrl = String(itemStyle.backgroundImage)
    ?.match(/url\((.*)\)/)?.[1]
    ?.replace(/['"]/g, '');

  const frontgroundUrl =
    String(
      itemStyle.foregroundStyle?.backgroundImage ||
        itemStyle.foregroundStyle?.background
    )
      ?.match(/url\((.*)\)/)?.[1]
      ?.replace(/['"]/g, '') || undefined;

  const [isExpandedBg, setIsExpandedBg] = useState(
    !!(bgUrl || itemStyle.background)
  );
  const [isExpandedFrontground, setIsExpandedFrontground] =
    useState(!!frontgroundUrl);
  return (
    <div className='flex flex-col gap-2'>
      <ToggleItem
        hasValue={isExpandedBg}
        title='背景'
        onAdd={() => {
          setIsExpandedBg(true);
        }}
        onRemove={() => {
          setIsExpandedBg(false);
        }}
      >
        <BackgroundSettingFactory
          title='背景'
          bgUrl={bgUrl || ''}
          itemStyle={itemStyle}
          editorCtx={editorCtx}
          onChange={onChange}
          useMask={false}
        />
      </ToggleItem>
      {props.useFrontground && (
        <ToggleItem
          hasValue={isExpandedFrontground}
          title='氛围前景'
          onAdd={() => {
            setIsExpandedFrontground(true);
          }}
          onRemove={() => {
            setIsExpandedFrontground(false);
          }}
        >
          <BackgroundSettingFactory
            title='氛围前景'
            useColorPicker={false}
            bgUrl={frontgroundUrl || ''}
            itemStyle={(itemStyle.foregroundStyle as any) || {}}
            editorCtx={editorCtx}
            useMask={true}
            onChange={nextVal => {
              onChange({
                ...itemStyle,
                foregroundStyle: nextVal,
              });
            }}
          >
            <Popover>
              <PopoverTrigger asChild>
                <div className='p-4'>
                  <Button className='mb-4' variant='outline'>
                    <Icon name='plus' size={16} />
                    <span>氛围前景</span>
                  </Button>
                </div>
              </PopoverTrigger>
              <PopoverContent side='left' className='w-[420px] p-0'>
                <FrontgroundSelector
                  onChange={(value, name) => {
                    onChange({
                      foregroundStyle: {
                        background: undefined,
                        backgroundImage: `url("${value}")`,
                        backgroundSize: 'contain',
                        backgroundPosition: 'top',
                        backgroundRepeat: 'no-repeat',
                        name: name,
                      },
                    } as any);
                  }}
                />
              </PopoverContent>
            </Popover>
          </BackgroundSettingFactory>
        </ToggleItem>
      )}
    </div>
  );
};

export default BackgroundSetting;

import FontFamilySelector from '../../shared/LibContent/FontFamilySelector';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Underline,
  TextQuote,
  Bold,
  Italic,
  Strikethrough,
  AArrowDown,
} from 'lucide-react';

import { IconInput } from '@workspace/ui/components/icon-input';
import { Icon } from '@workspace/ui/components/Icon';
import { Label } from '@workspace/ui/components/label';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@workspace/ui/components/toggle-group';
import ColorPickerPopover from '../../shared/ColorPicker';
import React, { useState } from 'react';
import styled from '@emotion/styled';
import ShadowSetting from './ShadowSetting';
import { Switch } from '@workspace/ui/components/switch';
import { ListStyleSelector } from '../../shared/TextStyleList/ListStyleSelector';
import SwitchLite from '../SwitchLite';
import { colorValueBuilder } from '../../shared/ColorPicker/utils';

const textAlign = [
  {
    value: 'left',
    icon: AlignLeft,
  },
  {
    value: 'center',
    icon: AlignCenter,
  },
  {
    value: 'right',
    icon: AlignRight,
  },
  {
    value: 'justify',
    icon: AlignJustify,
  },
];

/**
 * 颜色标准化（统一为十六进制）
 * @param colorStr - 原始颜色字符串
 * @returns 标准十六进制颜色（如 #558abb）
 */
function normalizeColor(colorStr: string): string {
  // 输入验证
  if (!colorStr || typeof colorStr !== 'string') {
    return '#000000';
  }

  // 处理关键字颜色
  const colorMap: Record<string, string> = {
    red: '#ff0000',
    blue: '#0000ff',
    green: '#00ff00',
    black: '#000000',
    white: '#ffffff',
    purple: '#800080',
  };
  if (colorMap[colorStr.toLowerCase()]) {
    return colorMap[colorStr.toLowerCase()];
  }

  // 处理RGB/RGBA（如 rgb(85,138,187)）
  const rgbMatch = colorStr.match(
    /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?$/i
  );
  if (rgbMatch) {
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(Number(rgbMatch[1]))}${toHex(Number(rgbMatch[2]))}${toHex(Number(rgbMatch[3]))}`;
  }

  // 简写HEX转完整（如 #abc → #aabbcc）
  if (/^#[\da-f]{3}$/i.test(colorStr)) {
    return `#${colorStr[1]}${colorStr[1]}${colorStr[2]}${colorStr[2]}${colorStr[3]}${colorStr[3]}`;
  }

  // 如果输入的是有效的十六进制颜色，返回小写格式
  if (/^#[0-9a-f]{6}$/i.test(colorStr)) {
    return colorStr.toLowerCase();
  }

  // 默认返回黑色
  return '#000000';
}

function isValidColor(colorStr: string): boolean {
  // 检查十六进制格式（#RGB或#RRGGBB）
  if (/^#([0-9A-Fa-f]{3}){1,2}$/.test(colorStr)) return true;

  // 检查颜色关键字（如red, blue等）
  const colorKeywords = [
    'red',
    'blue',
    'green',
    'black',
    'white',
    'yellow',
    'purple',
  ];
  if (colorKeywords.includes(colorStr.toLowerCase())) return true;

  // 检查RGB/RGBA格式
  if (/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/.test(colorStr))
    return true;

  return false;
}

function parseStyleToValues(styleStr: string): {
  value: number;
  color: string;
} {
  // 1. 清理输入并分割字符串
  const cleaned = styleStr.trim().replace(/\s+/g, ' ');
  const parts = cleaned.split(' ');

  // 2. 验证输入格式 - 如果格式不正确，返回默认值
  if (parts.length < 2) {
    return {
      value: 1,
      color: '#000000',
    };
  }

  // 3. 提取并转换数值部分
  const valuePart = parts[0];
  const numericValue = parseFloat(valuePart);

  if (isNaN(numericValue)) {
    return {
      value: 1,
      color: '#000000',
    };
  }

  // 4. 提取并验证颜色部分
  const colorPart = parts[parts.length - 1];
  if (!isValidColor(colorPart)) {
    return {
      value: numericValue,
      color: '#000000',
    };
  }

  return {
    value: numericValue,
    color: normalizeColor(colorPart),
  };
}

/**
 * 解析letterSpacing值，移除px单位并返回数字
 * @param letterSpacing - CSS letterSpacing值（如 "2px" 或 2）
 * @returns 数字值
 */
function parseLetterSpacing(
  letterSpacing: string | number | undefined
): number {
  if (!letterSpacing) return 0;
  if (typeof letterSpacing === 'number') return letterSpacing;
  return parseFloat(letterSpacing.replace('px', '')) || 0;
}

interface Props {
  attrs: Record<string, any>;
  onChange: (nextVal: {
    textAlign?: string;
    fontSize?: number;
    lineHeight?: number;
    letterSpacing?: number;
    fontWeight?: string;
    fontStyle?: string;
    textDecoration?: string;
    textIndent?: string;
    writingMode?: string;
    fontFamily?: string;
    fontUrl?: string;
    color?: string;
    WebkitTextStroke?: string;
    textShadow?: string;
    isList?: boolean;
    listStyle?: string;
  }) => void;
}

const TextSettingDiv = styled.div`
  .title {
    font-family: PingFang SC;
    font-weight: 600;
    font-size: 12px;
    line-height: 20px;
    color: #000;
  }
  span,
  input {
    color: #151515;
  }
`;

const TextSetting = (props: Props) => {
  const { attrs } = props;
  const itemStyle = attrs || {};

  const [stroke, setStroke] = useState<
    { value: number; color: string } | undefined
  >(
    itemStyle?.WebkitTextStroke
      ? parseStyleToValues(itemStyle.WebkitTextStroke)
      : undefined
  );

  const onChange = (nextVal: any) => {
    props.onChange?.(nextVal);
  };

  const onChangeStyle = (nextStyle: any) => {
    props.onChange?.({
      ...attrs,
      ...nextStyle,
    });
  };

  return (
    <TextSettingDiv className='flex flex-col gap-1.5 p-2'>
      {/* <div className="title">字体样式</div> */}
      <ToggleGroup
        type='single'
        size='sm'
        value={attrs?.textAlign || 'left'}
        onValueChange={value => value && onChange({ textAlign: value })}
        className='gap-0 p-0.5 h-6'
      >
        {textAlign.map(item => (
          <ToggleGroupItem
            key={item.value}
            value={item.value}
            className='h-5 px-1 min-w-5'
          >
            <item.icon size={12} />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <ToggleGroup
        type='multiple'
        size='sm'
        value={[
          ...(attrs?.fontWeight === 'bold' ? ['bold'] : []),
          ...(attrs?.fontStyle === 'italic' ? ['italic'] : []),
          ...(attrs?.textDecoration === 'underline' ? ['underline'] : []),
          ...(attrs?.textDecoration === 'line-through'
            ? ['strikethrough']
            : []),
          ...(attrs?.textIndent === '2em' ? ['indent'] : []),
          ...(attrs?.writingMode === 'vertical-lr' ? ['vertical'] : []),
        ]}
        onValueChange={values => {
          const changes: any = {};

          // Handle font weight
          changes.fontWeight = values.includes('bold') ? 'bold' : 'normal';

          // Handle font style
          changes.fontStyle = values.includes('italic') ? 'italic' : 'normal';

          // Handle text decoration (mutually exclusive)
          // If both underline and strikethrough are present, prioritize the last one clicked
          const hasUnderline = values.includes('underline');
          const hasStrikethrough = values.includes('strikethrough');

          if (hasUnderline && hasStrikethrough) {
            // If both are selected, keep only the one that wasn't previously active
            const wasUnderline = attrs?.textDecoration === 'underline';
            changes.textDecoration = wasUnderline
              ? 'line-through'
              : 'underline';
          } else if (hasUnderline) {
            changes.textDecoration = 'underline';
          } else if (hasStrikethrough) {
            changes.textDecoration = 'line-through';
          } else {
            changes.textDecoration = 'none';
          }

          // Handle text indent
          changes.textIndent = values.includes('indent') ? '2em' : 0;

          // Handle writing mode
          changes.writingMode = values.includes('vertical')
            ? 'vertical-lr'
            : 'horizontal-tb';

          onChange(changes);
        }}
        className='gap-0.5 p-0.5 h-6'
      >
        <ToggleGroupItem value='bold' className='h-5 px-1 min-w-5'>
          <Bold size={12} />
        </ToggleGroupItem>
        <ToggleGroupItem value='italic' className='h-5 px-1 min-w-5'>
          <Italic size={12} />
        </ToggleGroupItem>
        <ToggleGroupItem value='underline' className='h-5 px-1 min-w-5'>
          <Underline size={12} />
        </ToggleGroupItem>
        <ToggleGroupItem value='strikethrough' className='h-5 px-1 min-w-5'>
          <Strikethrough size={12} />
        </ToggleGroupItem>
        <ToggleGroupItem value='indent' className='h-5 px-1 min-w-5'>
          <TextQuote size={12} />
        </ToggleGroupItem>
        <ToggleGroupItem value='vertical' className='h-5 px-1 min-w-5'>
          <AArrowDown size={12} />
        </ToggleGroupItem>
      </ToggleGroup>
      <div className='flex items-center gap-2'>
        <IconInput
          icon='fontsize'
          type='number'
          value={attrs?.fontSize || 16}
          onChange={e => {
            const value = e.target.value;
            onChange({
              fontSize: +value,
            });
          }}
        />
        <IconInput
          icon='hanggao'
          type='number'
          step={0.1}
          value={itemStyle?.lineHeight}
          onChange={e => {
            const value = e.target.value;
            onChangeStyle({
              lineHeight: +value,
            });
          }}
        />
        <IconInput
          icon='zijianju'
          type='number'
          step={0.1}
          value={parseLetterSpacing(itemStyle?.letterSpacing)}
          onChange={e => {
            const value = e.target.value;
            onChangeStyle({
              letterSpacing: +value,
            });
          }}
        />
      </div>

      <div className='flex items-center gap-2'>
        <FontFamilySelector
          value={attrs.fontFamily}
          onChange={value => {
            onChange({
              fontFamily: value.fontFamily,
              fontUrl: value.fontUrl,
            });
          }}
        />
        <ColorPickerPopover
          value={attrs.color}
          onChange={value => {
            // console.log("value", value);
            // console.log("colorValueBuilder(value)", colorValueBuilder(value));
            onChange({
              color: colorValueBuilder(value),
            });
          }}
        />
      </div>

      <div className='flex flex-col bg-custom-gray px-2 py-1 rounded-sm gap-2'>
        <div className='flex items-center justify-between'>
          <Label className='text-xs' style={{ color: '#151515' }}>
            文字描边
          </Label>
          <SwitchLite
            active={!!stroke}
            onChange={active => {
              if (active) {
                setStroke({
                  value: 1,
                  color: '#000000',
                });
                onChangeStyle({
                  WebkitTextStroke: `1px #000000`,
                });
              } else {
                setStroke(undefined);
                onChangeStyle({
                  WebkitTextStroke: '',
                });
              }
            }}
          />
        </div>
        {stroke && (
          <div className='flex items-center gap-1'>
            <ColorPickerPopover
              value={stroke.color}
              onChange={value => {
                setStroke({
                  ...stroke,
                  color: colorValueBuilder(value) || '#000000',
                });
                onChangeStyle({
                  WebkitTextStroke: value
                    ? `${stroke.value}px ${value ? value.hex || value.value : '#000000'}`
                    : undefined,
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
              {stroke.color}
            </div>
            <Icon name='xiantiaocuxi' size={12} />
            <input
              placeholder='1px'
              className='bg-transparent p-1 text-xs w-10'
              type='number'
              min={0}
              value={stroke.value}
              onChange={e => {
                const value = +e.target.value;
                setStroke({
                  ...stroke,
                  value,
                });
                onChangeStyle({
                  WebkitTextStroke: `${value}px ${stroke.color}`,
                });
              }}
            />
          </div>
        )}
      </div>

      {/* 列表设置 */}
      <div className='flex flex-col bg-custom-gray px-2 py-1 rounded-sm gap-2'>
        <div className='flex items-center justify-between'>
          <Label className='text-xs' style={{ color: '#151515' }}>
            文字列表
          </Label>
          <SwitchLite
            active={!!attrs?.isList}
            onChange={checked => {
              onChange({
                isList: checked,
                listStyle: checked ? 'list-style-type: disc' : undefined,
              });
            }}
          />
        </div>
        {attrs?.isList && (
          <ListStyleSelector
            listStyle={attrs?.listStyle}
            onChange={listStyle => onChange({ listStyle })}
          />
        )}
      </div>

      <ShadowSetting
        title='文字阴影'
        shadowType='text-shadow'
        cssValue={itemStyle?.textShadow}
        onCssChange={cssValue => {
          onChangeStyle({
            textShadow: cssValue,
          });
        }}
      />
    </TextSettingDiv>
  );
};

export default TextSetting;
